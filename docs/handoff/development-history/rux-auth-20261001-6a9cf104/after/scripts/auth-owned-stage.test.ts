import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
await test('actual Runtime parser rejects a Worker claiming Main credential persistence or connected state',async()=>{
 for(const stage of ['preparing-local-storage','persisting-credentials','connected-plan','connected-identity']){
  let commits=0;const child:any=new EventEmitter();child.pid=123;child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{queueMicrotask(()=>{child.emit('exit',1);child.emit('close',1)});return true}
  const host=createPiRuntimeHost({root:path.resolve('pi-runtime'),spawn:()=>{queueMicrotask(()=>{child.stdout.write(JSON.stringify({type:'ready',nodeVersion:'24.21.0',piVersion:'0.99.1'})+'\n');child.stdout.write(JSON.stringify({type:'auth-stage',stage})+'\n')});return child}})
  await assert.rejects(host.execute({kind:'login'},AbortSignal.timeout(10000),{credential:async()=>{commits++}}),/AI_PROTOCOL_INVALID/);assert.equal(commits,0);assert.equal(host.inspect().unknown,0)
 }
})
