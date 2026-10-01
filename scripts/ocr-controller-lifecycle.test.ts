import assert from 'node:assert/strict'
import {test} from 'node:test'
import sharp from 'sharp'
import {createOcrController} from '../src/main/ocr/ocr-controller'
import {OcrProcessUnconfirmedError} from '../src/main/ocr/local-ocr-process'
import {ShutdownCoordinator} from '../src/main/app-shutdown/shutdown-coordinator'
import type {OcrObservation} from '../src/shared/contracts/asset-ocr.contract'
const observation:OcrObservation={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:10,height:10,elapsedMs:1,threshold:.5,blocks:[]}
const scope={libraryIdentity:'synthetic',generation:'generation'},request={...scope,assetIds:['asset']}
const tick=()=>new Promise(r=>setImmediate(r))
function deferred<T=void>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return{promise,resolve}}
async function fixture(){
 const png=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer(),started=deferred(),result=deferred<OcrObservation>()
 let generation='generation',commits=0,runs=0,currentGate:Promise<void>|undefined,configureGate:Promise<void>|undefined,readGate:Promise<void>|undefined,commitGate:Promise<void>|undefined
 let run=async()=>{runs++;started.resolve();return result.promise}
 const snapshot={sessionToken:'session',revision:7,requiresUpgrade:false,evidence:null,editedText:'user correction'}
 const host={inspect:()=>({state:'ready',identity:'synthetic',generation}),readAssetContext:async()=>({assets:[{id:'asset',revision:'rev',thumbnailRef:'preview'}]}),readPreview:async()=>png,readOcr:async()=>{await readGate;return snapshot},commitOcr:async(_:unknown,signal:AbortSignal)=>{await commitGate;if(signal.aborted)throw Error('OCR_SCOPE_EXPIRED');commits++;return snapshot},correctOcr:async()=>snapshot}
 const runtime={configure:async()=>{await configureGate},current:async()=>{await currentGate;return{label:'synthetic',fingerprint:'same',run:()=>run()}}}
 const c=createOcrController({host:host as any,runtime,changed:()=>{},drainTimeoutMs:40})
 return{c,started,result,snapshot,get commits(){return commits},get runs(){return runs},set generation(v:string){generation=v},set currentGate(v:Promise<void>|undefined){currentGate=v},set configureGate(v:Promise<void>|undefined){configureGate=v},set readGate(v:Promise<void>|undefined){readGate=v},set commitGate(v:Promise<void>|undefined){commitGate=v},set run(v:typeof run){run=v}}
}
async function start(f:Awaited<ReturnType<typeof fixture>>){const p=await f.c.prepare(request);await f.c.run(p.receipt);await f.started.promise}
test('cancel keeps maintenance busy and drain pending until runtime settles; late output never commits',async()=>{
 const f=await fixture();await start(f);f.c.cancel();f.c.cancel();assert.throws(()=>f.c.holdForMaintenance(),/OCR_BUSY/)
 let done=false;const d=f.c.suspendAndDrain().then(()=>{done=true});await tick();assert.equal(done,false);await assert.rejects(f.c.prepare(request),/OCR_BUSY/)
 f.result.resolve(observation);await d;assert.equal(f.commits,0);assert.equal((await f.c.status()).job?.state,'cancelled');f.c.resume();const unlock=f.c.holdForMaintenance();unlock();assert.equal(f.snapshot.editedText,'user correction')
})
test('normal completion commits exactly once then releases maintenance',async()=>{
 const f=await fixture();await start(f);f.result.resolve(observation);await tick();await tick();assert.equal(f.commits,1);assert.equal((await f.c.status()).job?.state,'completed');const unlock=f.c.holdForMaintenance();unlock();f.c.cancel();assert.equal(f.commits,1)
})
test('UNKNOWN remains blocked beyond terminal job and bounded drain; late close requires retry/resume',async()=>{
 const f=await fixture(),released=deferred();f.run=async()=>{throw new OcrProcessUnconfirmedError(released.promise)}
 const p=await f.c.prepare(request);await f.c.run(p.receipt);await tick();assert.equal((await f.c.status()).job?.state,'failed');assert.match((await f.c.status()).job!.items[0].error!,/尚未确认/)
 assert.throws(()=>f.c.holdForMaintenance(),/OCR_BUSY/);await assert.rejects(f.c.configure(),/OCR_PROCESS_EXIT_UNCONFIRMED/);await assert.rejects(f.c.suspendAndDrain(),/OCR_DRAIN_BLOCKED/);f.c.resume();await assert.rejects(f.c.prepare(request),/OCR_PROCESS_EXIT_UNCONFIRMED/)
 released.resolve();await tick();await assert.rejects(f.c.prepare(request),/OCR_BUSY/);await f.c.suspendAndDrain();f.c.resume();assert.ok(await f.c.prepare(request));assert.equal(f.commits,0)
})
for(const phase of ['configure','prepare','run verification'] as const){test('drain covers pending '+phase+' without resurrecting reviews',async()=>{
 const f=await fixture(),gate=deferred();let op:Promise<unknown>
 if(phase==='configure'){f.configureGate=gate.promise;op=f.c.configure()}
 else if(phase==='prepare'){f.currentGate=gate.promise;op=f.c.prepare(request)}
 else{const p=await f.c.prepare(request);f.currentGate=gate.promise;op=f.c.run(p.receipt)}
 const outcome=op.catch(e=>e);await tick();assert.throws(()=>f.c.holdForMaintenance(),/OCR_BUSY/);await assert.rejects(f.c.suspendAndDrain(),/OCR_DRAIN_BLOCKED/);f.c.resume();await assert.rejects(f.c.configure(),/OCR_BUSY/)
 gate.resolve();const result=await outcome;if(phase!=='configure')assert.equal(result.message,'OCR_SCOPE_EXPIRED');f.currentGate=undefined;await f.c.suspendAndDrain();f.c.resume();assert.equal(f.runs,0);assert.equal(f.commits,0)
})}
test('maintenance holds are independent and invalidate old reviews',async()=>{
 const f=await fixture(),p=await f.c.prepare(request),a=f.c.holdForMaintenance(),b=f.c.holdForMaintenance();a();a();await assert.rejects(f.c.run(p.receipt),/OCR_BUSY/);await assert.rejects(f.c.configure(),/OCR_BUSY/);b();await assert.rejects(f.c.run(p.receipt),/OCR_SCOPE_EXPIRED/)
})
test('scope change while runtime runs rejects late writes even without explicit cancel',async()=>{
 const f=await fixture();await start(f);f.generation='next';f.result.resolve(observation);await tick();await tick();assert.equal(f.commits,0);assert.equal((await f.c.status()).job,null)
})
test('commit in flight is awaited and revoked through the supplied abort signal',async()=>{
 const f=await fixture(),gate=deferred();f.commitGate=gate.promise;await start(f);f.result.resolve(observation);await tick();let done=false;const d=f.c.suspendAndDrain().then(()=>{done=true});await tick();assert.equal(done,false);gate.resolve();await d;assert.equal(f.commits,0)
})
test('shutdown never closes storage or requests quit when resource exit is unknown; retry can succeed',async()=>{
 const f=await fixture(),release=deferred();f.run=async()=>{throw new OcrProcessUnconfirmedError(release.promise)};const p=await f.c.prepare(request);await f.c.run(p.receipt);await tick()
 let closed=0,quit=0;const shutdown=new ShutdownCoordinator({drain:async()=>{await f.c.suspendAndDrain();closed++},requestQuit:()=>{quit++}}),event={preventDefault(){}}
 shutdown.handleBeforeQuit(event);shutdown.handleBeforeQuit(event);await new Promise(r=>setTimeout(r,60));assert.equal(shutdown.state,'failed');assert.equal(closed,0);assert.equal(quit,0)
 release.resolve();await tick();shutdown.handleBeforeQuit(event);await tick();await tick();assert.equal(shutdown.state,'completed');assert.equal(closed,1);assert.equal(quit,1)
})
test('overlapping drains cannot be resumed early or release a separate maintenance hold',async()=>{
 const f=await fixture();await start(f);const a=f.c.suspendAndDrain(),b=f.c.suspendAndDrain();f.c.resume();await assert.rejects(f.c.prepare(request),/OCR_BUSY/);f.result.resolve(observation);await Promise.all([a,b]);f.c.resume();const unlock=f.c.holdForMaintenance();await f.c.suspendAndDrain();f.c.resume();await assert.rejects(f.c.configure(),/OCR_BUSY/);unlock();await f.c.configure()
})

import fs from 'node:fs/promises'
import {transform} from 'esbuild'
test('actual Main authority completion cannot resume OCR after shutdown has started',async()=>{
 const source=await fs.readFile('src/main/index.ts','utf8'),start=source.indexOf('onAuthorityDidChange:async()=>{'),end=source.indexOf('\n      onAssetsChanged:',start)
 assert.ok(start>0&&end>start)
 // Execute the actual production callback with explicit surrounding adapters, not a copied equivalent.
 const expression=source.slice(start+'onAuthorityDidChange:'.length,end).trim().replace(/,$/,'')
 const compiled=await transform(`(${expression})`,{loader:'ts',target:'node20'})
 const f=await fixture();f.c.suspend();let released=0
 const args={authorityBarrierRelease:()=>{released++},authorityBusinessRelease:()=>{released++},activeLibraryHost:{inspect:()=>({state:'ready',identity:'synthetic',generation:'generation'}),readVisualSession:async()=>{}},visualAi:{resume(){}},tagExecution:{resume(){}},tagBatches:{resume(){}},ocr:f.c,shutdownCoordinator:{state:'draining'},tagRecovery:{flush:async()=>{}}}
 const callback=new Function(...Object.keys(args),`return ${compiled.code}`)(...Object.values(args));await callback();assert.equal(released,2);await assert.rejects(f.c.prepare(request),/OCR_BUSY/)
})
