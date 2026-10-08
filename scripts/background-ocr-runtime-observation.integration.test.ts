import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createOcrController,OCR_HOST_RESERVE_BYTES} from '../src/main/ocr/ocr-controller'
import {createBackgroundOcrController} from '../src/main/background-ocr/background-ocr-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import type {OcrObservation} from '../src/shared/contracts/asset-ocr.contract'

// Execute with the repository Electron Node runner, not system Node's SQLite ABI.
// Real temporary Host and resource ledger; generated input and in-process synthetic OCR.
// Ported candidate assertions; execution status belongs to this run's logs, not this source comment.
async function fixture(){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-observation-')))
 const library=path.join(root,'library'),input=path.join(root,'generated.png')
 await sharp({create:{width:80,height:80,channels:3,background:'#7799bb'}}).png().toFile(input)
 const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory:async()=>({kind:'selected',directory:library}),
  selectLocalFiles:async()=>({kind:'selected',files:[{filePath:input}]})
 }))
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture create')
 await host.confirmCreate(create.plan.receipt)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!}
 const plans=await host.readBackgroundAnalysis(scope)
 await host.configureBackgroundAnalysis({...scope,sessionToken:plans.sessionToken,expectedRevision:plans.policy.revision,expectedSchemaVersion:plans.schemaVersion,allowUpgrade:true,enabled:true,capabilities:{tags:true,caption:true,ocr:true}})
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture add')
 await host.dispatchAddAssets(add.plan.receipt)
 let fingerprint:string|null='synthetic-A',calls=0,delayCount=1,nextRuntime:(()=>Promise<any>)|undefined
 const observation:OcrObservation={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}
 const runtime={configure:async()=>{},current:async()=>{if(nextRuntime&&--delayCount<=0){const pending=nextRuntime;nextRuntime=undefined;return pending()}return fingerprint===null?null:{label:'synthetic-only',fingerprint,run:async()=>{calls++;return observation}}}}
 const admission=createVisualAdmission()
 const ocr=createOcrController({host,runtime,reserve:(bytes,signal)=>admission.reserveOcr(bytes,signal),changed:()=>{}})
 const known=<T>(value:T)=>({kind:'known' as const,value,sampledAt:performance.now()})
 const background=createBackgroundOcrController({host,ocr,runtime,schedule:()=>()=>{},
  telemetry:()=>({memory:known({free:8*1024**3,total:16*1024**3}),battery:known(false),lowPower:known(false),thermal:known('nominal' as const),idle:known('idle' as const),visible:known(true),gpuFree:{kind:'unknown'}}),
  qualify:r=>({runtimeFingerprint:r.fingerprint,evidenceId:'synthetic-test-only',envelope:{ownership:'host-owned',verified:true,peakRamBytes:OCR_HOST_RESERVE_BYTES+128*1048576,accelerator:'cpu',lightOnBattery:false}})
 })
 const authorize=async()=>background.confirm((await background.prepare(scope)).receipt)
 return{host,scope,background,authorize,admission,get calls(){return calls},set fingerprint(value:string|null){fingerprint=value},delayRuntime(afterCalls=1){delayCount=afterCalls;let entered!:()=>void,released!:()=>void;const started=new Promise<void>(r=>{entered=r}),wait=new Promise<void>(r=>{released=r});nextRuntime=async()=>{entered();await wait;return{label:'synthetic-only',fingerprint:'synthetic-B',run:async()=>observation}};return{entered:started,release:released}},close:async()=>{background.invalidate();await ocr.suspendAndDrain();await host.close();await fs.rm(root,{recursive:true,force:true})}}
}

test('real Host: status-only Runtime mismatch invalidates memory grant, not stored history',async()=>{
 const f=await fixture()
 try{
  await f.authorize();const before=await f.host.readBackgroundOcr(f.scope)
  f.fingerprint='synthetic-B';assert.equal((await f.background.read(f.scope)).authorized,false)
  const revoked=await f.host.readBackgroundOcr(f.scope)
  assert.equal(revoked.authorized,false);assert.equal(revoked.permissionRevision,before.permissionRevision)
  assert.equal(revoked.runtimeFingerprint,'synthetic-A')
  f.fingerprint='synthetic-A';await f.background.tick()
  assert.equal(f.calls,0);assert.deepEqual((await f.host.readBackgroundOcr(f.scope)).attempts,[])
  assert.equal(f.admission.inspect().materialBytes,0)
  await f.authorize();await f.background.tick();assert.equal(f.calls,1)
  assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'succeeded')
 }finally{await f.close()}
})
test('real Host: discarded review for B cannot leave the old A grant reusable',async()=>{
 const f=await fixture()
 try{await f.authorize();f.fingerprint='synthetic-B';const p=await f.background.prepare(f.scope);f.background.discard(p.receipt);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);f.fingerprint='synthetic-A';await f.background.tick();assert.equal(f.calls,0);assert.deepEqual((await f.host.readBackgroundOcr(f.scope)).attempts,[])}finally{await f.close()}
})
test('real Host: a confirm mismatch revokes instead of only returning a failed review',async()=>{
 const f=await fixture()
 try{await f.authorize();const p=await f.background.prepare(f.scope);f.fingerprint='synthetic-B';await assert.rejects(f.background.confirm(p.receipt),/OCR_MODEL_CHANGED/);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);f.fingerprint='synthetic-A';await f.background.tick();assert.equal(f.calls,0);assert.equal(f.admission.inspect().materialBytes,0)}finally{await f.close()}
})

test('real Host: missing Runtime followed by A needs fresh explicit authority',async()=>{const f=await fixture();try{await f.authorize();f.fingerprint=null;assert.equal((await f.background.read(f.scope)).authorized,false);f.fingerprint='synthetic-A';await f.background.tick();assert.equal(f.calls,0);await f.authorize();await f.background.tick();assert.equal(f.calls,1)}finally{await f.close()}})
for(const entry of ['read','prepare','confirm'] as const)test('real Host: stale '+entry+' does not revoke replacement grant or let old controller dispatch it',async()=>{
 const f=await fixture();let release=()=>{};try{await f.authorize();const review=entry==='confirm'?await f.background.prepare(f.scope):null,delay=f.delayRuntime();release=delay.release;const old=(entry==='confirm'?f.background.confirm(review!.receipt):entry==='prepare'?f.background.prepare(f.scope):f.background.read(f.scope)).catch(e=>e);await delay.entered;const s=await f.host.readBackgroundOcr(f.scope);await f.host.configureBackgroundOcr({...f.scope,sessionToken:s.sessionToken,expectedRevision:s.permissionRevision,expectedSchemaVersion:s.schemaVersion,allowUpgrade:false,enabled:true,runtimeFingerprint:'synthetic-A'});const replacement=await f.host.readBackgroundOcr(f.scope);release();assert.match(String(await old),/BACKGROUND_OCR_SCOPE_EXPIRED/);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,true);assert.equal((await f.host.readBackgroundOcr(f.scope)).permissionRevision,replacement.permissionRevision);await f.background.tick();assert.equal(f.calls,0)}finally{release();await f.close()}
})

for(const[calls,phase]of [[1,'tick'],[2,'claim'],[3,'sent']] as const)test('real Host: old '+phase+' awaits cannot cancel a newer permit or dispatch under it',async()=>{
 const f=await fixture();let release=()=>{};try{await f.authorize();const delay=f.delayRuntime(calls);release=delay.release;const old=f.background.tick();await delay.entered;const s=await f.host.readBackgroundOcr(f.scope);await f.host.configureBackgroundOcr({...f.scope,sessionToken:s.sessionToken,expectedRevision:s.permissionRevision,expectedSchemaVersion:s.schemaVersion,allowUpgrade:false,enabled:true,runtimeFingerprint:'synthetic-A'});release();await old;assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,true);assert.equal(f.calls,0);await f.background.tick();assert.equal(f.calls,0);assert.equal(f.admission.inspect().materialBytes,0)}finally{release();await f.close()}
})
