import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {existsSync} from 'node:fs'
import {runLocalOcr} from '../src/main/ocr/local-ocr-process'
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
const python=process.env.DAM_TEST_PYTHON??(process.platform==='win32'
 ? path.join(os.homedir(),'AppData/Local/Programs/Python/Python311/python.exe')
 : '/usr/bin/python3')
assert.ok(existsSync(python),'Lifecycle checks need an installed Python interpreter')
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-exit-'))
const waitFile=async(file:string)=>{for(let i=0;i<200;i++){try{return await fs.readFile(file,'utf8')}catch{await sleep(10)}}throw Error('fixture did not become ready')}
test('abort retains ownership until the actual child exits',async()=>{
 const ready=path.join(root,'ready'),runner=path.join(root,'delayed.py')
 await fs.writeFile(runner,`import os,sys,time,signal\ndef stop(*args):\n time.sleep(0.15)\n sys.exit(0)\nsignal.signal(signal.SIGTERM,stop)\nopen(${JSON.stringify(ready)},'w').write(str(os.getpid()))\nsys.stdin.buffer.read()\ntime.sleep(30)\n`)
 const abort=new AbortController(),pending=runLocalOcr({python,runner,preview:new Uint8Array([1]),signal:abort.signal})
 // Attach rejection immediately so a fixture assertion cannot leak an unhandled rejection.
 const outcome=pending.then(()=>null,e=>e)
 const pid=Number(await waitFile(ready));abort.abort()
 const error=await outcome
 assert.equal(error.message,'OCR_CANCELLED')
 assert.throws(()=>process.kill(pid,0),{code:'ESRCH'},'settled cancellation must prove the owned child has exited')
})

const empty={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:100,height:100,elapsedMs:1,threshold:.5,blocks:[]}
let seq=0
async function fixture(body:string){const id=++seq,runner=path.join(root,`runner-${id}.py`),ready=path.join(root,`ready-${id}`);await fs.writeFile(runner,`import os,sys,time,signal,json\n${body.replaceAll('READY',JSON.stringify(ready))}\n`);return{runner,ready}}
const input=(runner:string,signal=new AbortController().signal)=>({python,runner,signal,preview:new Uint8Array([1])})
const assertExited=(pid:number)=>assert.throws(()=>process.kill(pid,0),{code:'ESRCH'})
test('valid output does not release a live process; normal close resolves once',async()=>{
 const f=await fixture(`sys.stdin.buffer.read()\nprint(${JSON.stringify(JSON.stringify({ok:true,value:empty}))},flush=True)\nopen(READY,'w').write(str(os.getpid()))\ntime.sleep(0.2)`)
 let settled=0;const p=runLocalOcr(input(f.runner)).then(v=>{settled++;return v});const pid=Number(await waitFile(f.ready));await sleep(30);assert.equal(settled,0);process.kill(pid,0)
 assert.deepEqual(await p,empty);assertExited(pid);assert.equal(settled,1)
})
test('ignored SIGTERM escalates only the owned child; repeated abort stays idempotent',async()=>{
 const f=await fixture(`signal.signal(signal.SIGTERM,signal.SIG_IGN)\nsys.stdin.buffer.read()\nopen(READY,'w').write(str(os.getpid()))\ntime.sleep(30)`)
 const other=await fixture(`sys.stdin.buffer.read()\nopen(READY,'w').write(str(os.getpid()))\ntime.sleep(30)`)
 const a=new AbortController(),b=new AbortController(),p=runLocalOcr(input(f.runner,a.signal)).catch(e=>e),q=runLocalOcr(input(other.runner,b.signal)).catch(e=>e)
 const pid=Number(await waitFile(f.ready)),otherPid=Number(await waitFile(other.ready));const start=Date.now();a.abort();a.abort();assert.equal((await p).message,'OCR_CANCELLED');if(process.platform!=='win32')assert.ok(Date.now()-start>=200);assertExited(pid);process.kill(otherPid,0);b.abort();await q;assertExited(otherPid)
})
test('timeout rejects only after physical exit',async()=>{
 const f=await fixture(`signal.signal(signal.SIGTERM,signal.SIG_IGN)\nsys.stdin.buffer.read()\nopen(READY,'w').write(str(os.getpid()))\ntime.sleep(30)`)
 const p=runLocalOcr({...input(f.runner),timeoutMs:300}).catch(e=>e),pid=Number(await waitFile(f.ready));assert.equal((await p).message,'OCR_TIMEOUT');assertExited(pid)
})
for(const [name,body,code] of [
 ['malformed',`print('{bad-json')`,'OCR_RESULT_INVALID'],
 ['nonzero',`print(${JSON.stringify(JSON.stringify({ok:true,value:empty}))})\nsys.exit(3)`,'OCR_EXECUTION_FAILED'],
 ['worker error',`print('{"ok":false,"error":"OCR_MODEL_MISSING"}')`,'OCR_MODEL_MISSING'],
 ['oversized stdout',`sys.stdout.write('x'*1100000)\nsys.stdout.flush()\ntime.sleep(30)`,'OCR_OUTPUT_TOO_LARGE'],
 ['oversized stderr',`sys.stderr.write('x'*1100000)\nsys.stderr.flush()\ntime.sleep(30)`,'OCR_OUTPUT_TOO_LARGE']]){
 test(name+' settles and reaps the owned process',async()=>{const f=await fixture(`sys.stdin.buffer.read()\nopen(READY,'w').write(str(os.getpid()))\n${body}`);const p=runLocalOcr(input(f.runner)).catch(e=>e),pid=Number(await waitFile(f.ready));assert.equal((await p).message,code);assertExited(pid)})
}
test('spawn failure and pre-abort are explicit',async()=>{
 await assert.rejects(runLocalOcr({...input('/nonexistent/runner'),python:'/nonexistent/python'}),/OCR_RUNTIME_UNAVAILABLE/)
 const a=new AbortController();a.abort();await assert.rejects(runLocalOcr(input('/nonexistent/runner',a.signal)),/OCR_CANCELLED/)
})

// Fault injection covers events which cannot safely be induced on a real OS child.
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import type {spawn} from 'node:child_process'
import {createLocalOcrRunner,OcrProcessUnconfirmedError} from '../src/main/ocr/local-ocr-process'
function fakeRunner(){
 const child=Object.assign(new EventEmitter(),{pid:123,stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:(signal:string)=>{signals.push(signal);return false}})
 const signals:string[]=[];let spawns=0
 const run=createLocalOcrRunner({spawn:(()=>{spawns++;return child}) as unknown as typeof spawn,graceMs:10,closeMs:25})
 return{child,signals,run,get spawns(){return spawns}}
}
test('unconfirmed close is bounded, quarantines future spawns, and late close releases exactly once',async()=>{
 const f=fakeRunner(),a=new AbortController();const p=f.run(input('/fixture',a.signal)).catch(e=>e);a.abort();a.abort()
 const error=await p;assert.ok(error instanceof OcrProcessUnconfirmedError);assert.deepEqual(f.signals,['SIGTERM','SIGKILL'])
 let releases=0;void error.released.then(()=>{releases++});assert.ok(await f.run(input('/fixture')).catch(e=>e) instanceof OcrProcessUnconfirmedError);assert.equal(f.spawns,1);assert.equal(releases,0)
 f.child.emit('exit',null,'SIGKILL');f.child.emit('close',null,'SIGKILL');await sleep(0);assert.equal(releases,1)
 const again=f.run(input('/fixture'));f.child.stdout.emit('data',Buffer.from(JSON.stringify({ok:true,value:empty})));f.child.emit('close',0);assert.deepEqual(await again,empty);assert.equal(f.spawns,2);assert.equal(releases,1)
})
test('physical exit with delayed streams does not signal an exited child',async()=>{
 const f=fakeRunner();const p=f.run(input('/fixture')).catch(e=>e)
 f.child.emit('exit',0);const error=await p;assert.ok(error instanceof OcrProcessUnconfirmedError);assert.deepEqual(f.signals,[]);assert.equal(f.child.stdout.destroyed,true);f.child.emit('close',0);await error.released
})
for(const stream of ['stdin','stdout','stderr'] as const){test(stream+' error drains before rejecting',async()=>{
 const f=fakeRunner();const p=f.run(input('/fixture')).catch(e=>e);let done=false;void p.then(()=>{done=true});f.child[stream].emit('error',Error('fixture sensitive transport'))
 await sleep(1);assert.equal(done,false);f.child.emit('exit',1);f.child.emit('close',1);assert.equal((await p).message,'OCR_STREAM_FAILED');assert.deepEqual(f.signals,['SIGTERM'])
})}
test('post-spawn error does not claim a failed spawn released an existing child',async()=>{
 const f=fakeRunner();const p=f.run(input('/fixture')).catch(e=>e);f.child.emit('error',Error('fixture'));const error=await p;assert.ok(error instanceof OcrProcessUnconfirmedError);f.child.emit('close',1);await error.released
})
test('two unknown owned handles retain independent quarantine until both close',async()=>{
 const children:Array<ReturnType<typeof fakeRunner>['child']>=[]
 const run=createLocalOcrRunner({spawn:(()=>{const f=fakeRunner();children.push(f.child);return f.child}) as unknown as typeof spawn,graceMs:5,closeMs:10})
 const a=new AbortController(),b=new AbortController(),p=run(input('/fixture',a.signal)).catch(e=>e),q=run(input('/fixture',b.signal)).catch(e=>e);a.abort();b.abort();const [one,two]=await Promise.all([p,q]);assert.ok(one instanceof OcrProcessUnconfirmedError);assert.ok(two instanceof OcrProcessUnconfirmedError)
 children[0].emit('close',1);await one.released;await tickRelease();assert.ok(await run(input('/fixture')).catch(e=>e) instanceof OcrProcessUnconfirmedError);assert.equal(children.length,2)
 children[1].emit('close',1);await two.released;await tickRelease();const success=run(input('/fixture'));children[2].stdout.emit('data',Buffer.from(JSON.stringify({ok:true,value:empty})));children[2].emit('close',0);await success;assert.equal(children.length,3)
})
const tickRelease=()=>new Promise(r=>setImmediate(r))
