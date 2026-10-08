import assert from 'node:assert/strict'
import {test} from 'node:test'
import sharp from 'sharp'
import {createOcrController} from '../src/main/ocr/ocr-controller'
import {OcrProcessUnconfirmedError} from '../src/main/ocr/local-ocr-process'
import {ShutdownCoordinator} from '../src/main/app-shutdown/shutdown-coordinator'
import {createLibraryQuiescence} from '../src/main/library-quiescence'
import type {OcrObservation} from '../src/shared/contracts/asset-ocr.contract'
const observation:OcrObservation={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:10,height:10,elapsedMs:1,threshold:.5,blocks:[]}
const scope={libraryIdentity:'synthetic',generation:'generation'},request={...scope,assetIds:['asset']}
const tick=()=>new Promise(r=>setImmediate(r))
function deferred<T=void>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return{promise,resolve}}
test('automatic runtime qualification stays readable and shutdown waits for its actual drain',async()=>{
 const exit=deferred();let suspended=0,resumed=0;
 const c=createOcrController({host:{inspect:()=>({state:'ready',identity:scope.libraryIdentity,generation:scope.generation})} as any,runtime:{current:async()=>null,configure:async()=>{},unavailabilityReason:()=> '正在真实复核本地 OCR，等待共享资源或识别挑战完成。',suspendAndDrain:async()=>{suspended++;await exit.promise},resume:()=>{resumed++}},changed:()=>{},drainTimeoutMs:30});
 const status=await c.status();assert.equal(status.configured,false);assert.match(status.label,/等待共享资源/);
 await assert.rejects(c.suspendAndDrain(),/OCR_DRAIN_BLOCKED/);c.resume();
 assert.equal(suspended,1); // No permit is released by the controller's timeout.
 exit.resolve();await c.suspendAndDrain();c.resume();assert.equal(resumed,2);
});
async function fixture(options:{runtimeChanged?():void}={}){
 const png=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer(),started=deferred(),result=deferred<OcrObservation>()
 let generation='generation',commits=0,runs=0,configures=0,runtimeFingerprint:string|null='same',configureEffect:()=>void|Promise<void>=()=>{},currentGate:Promise<void>|undefined,configureGate:Promise<void>|undefined,readGate:Promise<void>|undefined,commitGate:Promise<void>|undefined
 let run=async()=>{runs++;started.resolve();return result.promise}
 const snapshot={sessionToken:'session',revision:7,requiresUpgrade:false,evidence:null,editedText:'user correction'}
 const host={inspect:()=>({state:'ready',identity:'synthetic',generation}),readAssetContext:async()=>({assets:[{id:'asset',revision:'rev',thumbnailRef:'preview'}]}),readPreview:async()=>png,readOcr:async()=>{await readGate;return snapshot},commitOcr:async(_:unknown,signal:AbortSignal)=>{await commitGate;if(signal.aborted)throw Error('OCR_SCOPE_EXPIRED');commits++;return snapshot},correctOcr:async()=>snapshot}
 const runtime={configure:async()=>{configures++;await configureGate;await configureEffect()},current:async()=>{await currentGate;return runtimeFingerprint===null?null:{label:'synthetic',fingerprint:runtimeFingerprint,run:()=>run()}}}
 const c=createOcrController({host:host as any,runtime,changed:()=>{},runtimeChanged:options.runtimeChanged,drainTimeoutMs:40})
 return{c,started,result,snapshot,get commits(){return commits},get runs(){return runs},get configures(){return configures},get runtimeFingerprint(){return runtimeFingerprint},set runtimeFingerprint(v:string|null){runtimeFingerprint=v},set configureEffect(v:()=>void|Promise<void>){configureEffect=v},set generation(v:string){generation=v},set currentGate(v:Promise<void>|undefined){currentGate=v},set configureGate(v:Promise<void>|undefined){configureGate=v},set readGate(v:Promise<void>|undefined){readGate=v},set commitGate(v:Promise<void>|undefined){commitGate=v},set run(v:typeof run){run=v}}
}
async function start(f:Awaited<ReturnType<typeof fixture>>){const p=await f.c.prepare(request);await f.c.run(p.receipt);await f.started.promise}

test('configuration notifies exactly once after a changed fingerprint is committed and observed',async()=>{
 const events:string[]=[],gate=deferred();let notifications=0
 const f=await fixture({runtimeChanged:()=>{notifications++;events.push('notified:'+f.runtimeFingerprint)}})
 f.configureGate=gate.promise;f.configureEffect=()=>{events.push('committed');f.runtimeFingerprint='changed'}
 const configuring=f.c.configure();await tick();assert.equal(f.configures,1);assert.equal(notifications,0);assert.equal(f.runtimeFingerprint,'same');assert.throws(()=>f.c.holdForMaintenance(),/OCR_BUSY/)
 gate.resolve();await configuring;assert.deepEqual(events,['committed','notified:changed']);assert.equal(notifications,1);assert.equal((await f.c.status()).configured,true);assert.equal(f.runs,0);assert.equal(f.commits,0)
 const unlock=f.c.holdForMaintenance();unlock()
})

test('first environment configuration notifies once per new fingerprint, never per reread or equivalent selection',async()=>{
 const fingerprints:Array<string|null>=[]
 const f=await fixture({runtimeChanged:()=>{fingerprints.push(f.runtimeFingerprint)}});f.runtimeFingerprint=null
 f.configureEffect=()=>{f.runtimeFingerprint='first'};await f.c.configure();assert.deepEqual(fingerprints,['first'])
 await f.c.status();await f.c.status();await f.c.configure();assert.deepEqual(fingerprints,['first'])
 f.configureEffect=()=>{f.runtimeFingerprint='second'};await f.c.configure();assert.deepEqual(fingerprints,['first','second']);assert.equal(f.configures,3);assert.equal(f.runs,0);assert.equal(f.commits,0)
})

for(const fingerprint of [null,'same'])test('cancelled environment selection preserves '+(fingerprint===null?'unconfigured':'configured')+' status without notifying',async()=>{
 let notifications=0;const f=await fixture({runtimeChanged:()=>{notifications++}});f.runtimeFingerprint=fingerprint
 const before=await f.c.status();await f.c.configure();assert.deepEqual(await f.c.status(),before);assert.equal(f.runtimeFingerprint,fingerprint);assert.equal(f.configures,1);assert.equal(notifications,0);assert.equal(f.runs,0);assert.equal(f.commits,0)
 const unlock=f.c.holdForMaintenance();unlock()
})

test('failed environment configuration preserves the prior environment, releases admission and does not notify',async()=>{
 let notifications=0;const f=await fixture({runtimeChanged:()=>{notifications++}})
 f.configureEffect=()=>{throw Error('OCR_RUNTIME_INVALID')};await assert.rejects(f.c.configure(),/OCR_RUNTIME_INVALID/)
 assert.equal(f.runtimeFingerprint,'same');assert.equal((await f.c.status()).configured,true);assert.equal(f.configures,1);assert.equal(notifications,0);assert.equal(f.runs,0);assert.equal(f.commits,0)
 const unlock=f.c.holdForMaintenance();unlock();f.configureEffect=()=>{f.runtimeFingerprint='valid'};await f.c.configure();assert.equal(notifications,1)
})
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

test('Main quiescence completion cannot resume actual OCR after shutdown has started',async()=>{
 const f=await fixture();let released=0,idle=true
 const quiescence=createLibraryQuiescence({
  current:()=>({visualAdmission:{hold:()=>()=>{released++}},activeLibraryHost:{inspect:()=>({state:'ready',identity:'synthetic',generation:'generation'}),readVisualSession:async()=>({sessionToken:'session',leaseIdentity:'lease'}),holdBusinessAdmission:()=>()=>{released++},close:async()=>{}},ocr:f.c}),
  isShutdownIdle:()=>idle,confirmSwitchDraftDiscard:()=>{}
 })
 await quiescence.onAuthorityWillChange();idle=false
 await quiescence.onAuthorityDidChange();assert.equal(released,2);await assert.rejects(f.c.prepare(request),/OCR_BUSY/)
})
