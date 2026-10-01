import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createBackgroundOcrController} from '../src/main/background-ocr/background-ocr-controller'

// Controller-level regression; Host persistence/OCR/telemetry are explicit substitutes.
// Keep the real Host integration and Electron suites as separate acceptance gates.
function deferred<T=void>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return{promise,resolve}}
function fixture(){
 const scope={libraryIdentity:'synthetic-library',generation:'same-generation'}
 const snapshot={schemaVersion:13,sessionToken:'session-1',permissionRevision:0,authorized:false,runtimeFingerprint:'',attempts:[]}
 let fingerprint:string|null='A',qualified=true,revokeCalls=0,dispatches=0,claims=0,sent=0,busy=false
 let delayCount=1;let nextRuntime:(()=>Promise<any>)|undefined,heldWork:ReturnType<typeof deferred<void>>|undefined,activeSignal:AbortSignal|undefined
 const timers:Array<{callback:()=>void,cancelled:boolean}>=[]
 const handle=(value:string|null)=>value===null?null:{fingerprint:value,label:'synthetic-runtime',run:async()=>({})}
 const runtime={configure:async()=>{},current:async()=>{if(nextRuntime&&--delayCount<=0){const read=nextRuntime;nextRuntime=undefined;return read()}return handle(fingerprint)}}
 const host={
  readBackgroundOcr:async()=>({...snapshot,attempts:[]}),
  configureBackgroundOcr:async(input:any,signal?:AbortSignal)=>{signal?.throwIfAborted();assert.equal(input.sessionToken,snapshot.sessionToken);assert.equal(input.expectedRevision,snapshot.permissionRevision);snapshot.permissionRevision++;snapshot.authorized=input.enabled;snapshot.runtimeFingerprint=input.runtimeFingerprint;return{...snapshot}},
  revokeBackgroundOcr:()=>{revokeCalls++;snapshot.authorized=false},
  claimBackgroundOcr:async()=>{assert.equal(snapshot.authorized,true);claims++;return{synthetic:true}},
  markBackgroundOcrSent:async()=>{assert.equal(snapshot.authorized,true);sent++},
  commitBackgroundOcr:async()=>{throw Error('Test must not commit real OCR')},finishBackgroundOcr:async()=>{}
 }
 const ocr={holdForMaintenance:()=>()=>{},backgroundAvailability:()=>({busy,unconfirmed:false}),suspendAndDrain:async()=>{},runBackground:async(input:any)=>{busy=true;activeSignal=input.signal;try{const claim=await input.claim();await input.sent(claim);dispatches++;if(heldWork)await heldWork.promise;return true}finally{busy=false}}}
 const known=<T>(value:T)=>({kind:'known' as const,value,sampledAt:1000})
 const controller=createBackgroundOcrController({host:host as any,ocr:ocr as any,runtime:runtime as any,now:()=>1000,
  schedule:callback=>{const timer={callback,cancelled:false};timers.push(timer);return()=>{timer.cancelled=true}},
  telemetry:()=>({memory:known({free:8*1024**3,total:16*1024**3}),battery:known(false),lowPower:known(false),thermal:known('nominal' as const),idle:known('idle' as const),visible:known(true),gpuFree:{kind:'unknown'}}),
  qualify:value=>qualified?{runtimeFingerprint:value.fingerprint,evidenceId:'synthetic-unit-only',envelope:{ownership:'host-owned',verified:true,peakRamBytes:768*1048576,accelerator:'cpu',lightOnBattery:false}}:null})
 const authorize=async()=>controller.confirm((await controller.prepare(scope)).receipt)
 return{scope,controller,snapshot,timers,authorize,set fingerprint(value:string|null){fingerprint=value},set qualified(value:boolean){qualified=value},get revokeCalls(){return revokeCalls},get dispatches(){return dispatches},get claims(){return claims},get sent(){return sent},get busy(){return busy},get activeSignal(){return activeSignal},
  delayRuntime(value:string|null,afterCalls=1){delayCount=afterCalls;const entered=deferred(),released=deferred();nextRuntime=async()=>{entered.resolve();await released.promise;return handle(value)};return{entered:entered.promise,release:()=>released.resolve()}},
  holdWork(){heldWork=deferred();return()=>heldWork!.resolve()},close(){heldWork?.resolve();controller.invalidate()}}
}
test('read observes A-B-A: old grant stays revoked even when B is unqualified',async()=>{
 const f=fixture();try{await f.authorize();f.qualified=false;f.fingerprint='B';const view=await f.controller.read(f.scope);assert.equal(view.authorized,false);assert.ok(view.reasons.includes('runtime-changed'));assert.ok(view.reasons.includes('permission-required'));f.fingerprint='A';f.qualified=true;await f.controller.tick();assert.equal(f.dispatches,0);assert.equal(f.claims,0);assert.equal(f.snapshot.authorized,false)}finally{f.close()}
})
test('same Runtime read neither revokes nor reconfigures nor dispatches',async()=>{
 const f=fixture();try{await f.authorize();const revision=f.snapshot.permissionRevision;const view=await f.controller.read(f.scope);assert.equal(view.authorized,true);assert.equal(f.revokeCalls,0);assert.equal(f.snapshot.permissionRevision,revision);assert.equal(f.dispatches,0)}finally{f.close()}
})
test('new explicit confirmation can authorize after an observed mismatch',async()=>{
 const f=fixture();try{await f.authorize();f.fingerprint='B';await f.controller.read(f.scope);f.fingerprint='A';assert.equal(f.snapshot.authorized,false);await f.authorize();await f.controller.tick();assert.equal(f.dispatches,1);assert.equal(f.sent,1)}finally{f.close()}
})
test('missing Runtime revokes without rewriting persisted choice or revision',async()=>{
 const f=fixture();try{await f.authorize();const revision=f.snapshot.permissionRevision;f.fingerprint=null;const view=await f.controller.read(f.scope);assert.equal(view.authorized,false);assert.ok(view.reasons.includes('runtime-unavailable'));assert.equal(f.snapshot.permissionRevision,revision);assert.equal(f.snapshot.runtimeFingerprint,'A');assert.equal(f.revokeCalls,1)}finally{f.close()}
})
test('unpermitted read performs zero revoke, configure, claim and dispatch',async()=>{
 const f=fixture();try{f.fingerprint='B';const view=await f.controller.read(f.scope);assert.equal(view.authorized,false);assert.equal(f.revokeCalls,0);assert.equal(f.snapshot.permissionRevision,0);assert.equal(f.claims,0);assert.equal(f.dispatches,0)}finally{f.close()}
})
test('delayed read after invalidate cannot report old authority or revoke new grant',async()=>{
 const f=fixture();let release=()=>{};try{await f.authorize();const pending=f.delayRuntime('B');release=pending.release;const outcome=f.controller.read(f.scope).catch(error=>error);await pending.entered;f.controller.invalidate();await f.authorize();const count=f.revokeCalls;release();assert.match(String(await outcome),/BACKGROUND_OCR_SCOPE_EXPIRED/);assert.equal(f.snapshot.authorized,true);assert.equal(f.revokeCalls,count)}finally{release();f.close()}
})
test('delayed read cannot revoke same-session replacement with newer permission revision',async()=>{
 const f=fixture();let release=()=>{};try{await f.authorize();const pending=f.delayRuntime('B');release=pending.release;const outcome=f.controller.read(f.scope).catch(error=>error);await pending.entered;await f.authorize();const revision=f.snapshot.permissionRevision;release();assert.match(String(await outcome),/BACKGROUND_OCR_SCOPE_EXPIRED/);assert.equal(f.snapshot.authorized,true);assert.equal(f.snapshot.permissionRevision,revision);assert.equal(f.revokeCalls,0)}finally{release();f.close()}
})
test('same persistent generation with new Host session invalidates old read',async()=>{
 const f=fixture();let release=()=>{};try{await f.authorize();const pending=f.delayRuntime('A');release=pending.release;const outcome=f.controller.read(f.scope).catch(error=>error);await pending.entered;f.snapshot.sessionToken='session-2';f.snapshot.authorized=false;release();assert.match(String(await outcome),/BACKGROUND_OCR_SCOPE_EXPIRED/);assert.equal(f.revokeCalls,0)}finally{release();f.close()}
})
test('read mismatch clears old review receipts and scheduled callbacks',async()=>{
 const f=fixture();try{await f.authorize();const old=await f.controller.prepare(f.scope);f.fingerprint='B';await f.controller.read(f.scope);f.fingerprint='A';await assert.rejects(f.controller.confirm(old.receipt),/BACKGROUND_OCR_REVIEW_EXPIRED/);assert.ok(f.timers.every(timer=>timer.cancelled));assert.equal(f.dispatches,0)}finally{f.close()}
})
test('read mismatch cancels owned work but never asserts premature release',async()=>{
 const f=fixture(),release=f.holdWork();let work:Promise<void>|undefined
 try{await f.authorize();work=f.controller.tick();for(let i=0;i<30&&f.dispatches===0;i++)await new Promise<void>(done=>setImmediate(done));assert.equal(f.dispatches,1);f.fingerprint='B';await f.controller.read(f.scope);assert.equal(f.activeSignal?.aborted,true);assert.equal(f.busy,true);release();await work;assert.equal(f.busy,false);assert.equal(f.snapshot.authorized,false)}finally{release();await work;f.close()}
})
test('prepare observing B revokes A even when new review is discarded',async()=>{
 const f=fixture();try{await f.authorize();f.fingerprint='B';const proposed=await f.controller.prepare(f.scope);assert.equal(f.snapshot.authorized,false);f.controller.discard(proposed.receipt);f.fingerprint='A';await f.controller.tick();assert.equal(f.dispatches,0);await f.authorize();await f.controller.tick();assert.equal(f.dispatches,1)}finally{f.close()}
})
test('confirm observing Runtime change revokes old grant before rejecting review',async()=>{
 const f=fixture();try{await f.authorize();const p=await f.controller.prepare(f.scope);f.fingerprint='B';await assert.rejects(f.controller.confirm(p.receipt),/OCR_MODEL_CHANGED/);assert.equal(f.snapshot.authorized,false);f.fingerprint='A';await f.controller.tick();assert.equal(f.dispatches,0)}finally{f.close()}
})

test('status-only A-B-A observation cannot reach dispatch without a fresh grant',async context=>{
 const f=fixture();try{await f.authorize();f.fingerprint='B';await f.controller.read(f.scope);f.fingerprint='A';await f.controller.tick();context.diagnostic('synthetic dispatch calls after A-B-A: '+f.dispatches);assert.equal(f.dispatches,0)}finally{f.close()}
})
test('prepare can issue a new B review after revoking A, and explicit confirm grants only B',async()=>{
 const f=fixture();try{await f.authorize();f.fingerprint='B';const p=await f.controller.prepare(f.scope);const view=await f.controller.confirm(p.receipt);assert.equal(view.authorized,true);assert.equal(view.runtimeFingerprint,'B');await f.controller.tick();assert.equal(f.dispatches,1)}finally{f.close()}
})

for(const entry of ['prepare','confirm'] as const)test('delayed '+entry+' observation cannot revoke replaced Host permission in same epoch',async()=>{
 const f=fixture();let release=()=>{};try{await f.authorize();const review=entry==='confirm'?await f.controller.prepare(f.scope):null,pending=f.delayRuntime('B');release=pending.release;const outcome=(entry==='confirm'?f.controller.confirm(review!.receipt):f.controller.prepare(f.scope)).catch(e=>e);await pending.entered;f.snapshot.permissionRevision++;f.snapshot.runtimeFingerprint='A';f.snapshot.authorized=true;const before=f.revokeCalls;release();assert.match(String(await outcome),/BACKGROUND_OCR_SCOPE_EXPIRED/);assert.equal(f.revokeCalls,before);assert.equal(f.snapshot.authorized,true)}finally{release();f.close()}
})
for(const entry of ['prepare','confirm'] as const)test(entry+' observes missing Runtime and revokes old grant without A revival',async()=>{
 const f=fixture();try{await f.authorize();const review=entry==='confirm'?await f.controller.prepare(f.scope):null;f.fingerprint=null;await assert.rejects(entry==='confirm'?f.controller.confirm(review!.receipt):f.controller.prepare(f.scope));assert.equal(f.snapshot.authorized,false);f.fingerprint='A';await f.controller.tick();assert.equal(f.dispatches,0)}finally{f.close()}
})

for(const[calls,phase]of [[1,'tick'],[2,'claim'],[3,'sent']] as const)test('stale '+phase+' Runtime observation cannot revoke or use new grant after await',async()=>{
 const f=fixture();let release=()=>{};try{await f.authorize();const delay=f.delayRuntime('B',calls);release=delay.release;const work=f.controller.tick();await delay.entered;f.snapshot.permissionRevision++;f.snapshot.authorized=true;const revokes=f.revokeCalls;release();await work;assert.equal(f.snapshot.authorized,true);assert.equal(f.revokeCalls,revokes);assert.equal(f.dispatches,0);assert.equal(f.sent,0);await f.controller.tick();assert.equal(f.dispatches,0)}finally{release();f.close()}
})
