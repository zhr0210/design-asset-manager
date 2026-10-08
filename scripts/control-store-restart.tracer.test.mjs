import assert from 'node:assert/strict'
import {test,after} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createRestartFixture} from './fixtures/control-store-restart-client.tracer.mjs'
import {LIMITS,sha} from './fixtures/control-store-restart-profile.tracer.mjs'

const cases=[],active=new Set()
const run=process.env.DAM_RESTART_RUN
if(run&&!/^run-\d{2}$/.test(run))throw Error('INVALID_EVIDENCE_RUN')
const watchdog=setTimeout(async()=>{
 const retained=[];for(const fixture of active)try{retained.push(await fixture.dispose({preserve:true}))}catch{retained.push({cleanup:'RETAINED',uncertain:true})}
 if(run)await fs.writeFile(path.resolve('.scratch/windows-control-restart-20261005',run,'timeout.json'),JSON.stringify({status:'WHOLE_RUN_TIMEOUT_UNKNOWN',retained},null,2)+'\n',{flag:'wx'})
 process.exit(2)
},90000)
async function scenario(name,exercise,preserve=false){
 const fixture=await createRestartFixture();active.add(fixture);let passed=false,errorCode,timer
 try{await Promise.race([exercise(fixture),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('CASE_TIMEOUT_UNKNOWN'),{code:'CASE_TIMEOUT_UNKNOWN'})),15000)})]);passed=true}
 catch(e){errorCode=e.code??'ASSERTION_OR_HARNESS_FAILURE';throw e}
 finally{clearTimeout(timer);const terminal=await fixture.dispose({preserve:preserve||!passed});active.delete(fixture);const record={name,status:passed?'PASS':'FAIL',errorCode,...terminal};cases.push(record)
  if(passed)try{assert.equal(terminal.allHExited,true);assert.equal(terminal.authority.allExited,true);assert.equal(terminal.uncertain,false);assert.equal(terminal.authority.readers,0);assert.equal(terminal.cleanup,preserve?'RETAINED':'REMOVED_OWNED_FIXTURE')}catch(e){record.status='FAIL';record.errorCode='TERMINAL_ASSERTION_FAILURE';throw e}}
}
const initial=async(f,Hcut,Acut)=>{await f.rotateA(Acut);return f.startH(Hcut)}
const again=async(f,h,retainA=false)=>{await h.close();if(!retainA)await f.rotateA();const fresh=await f.startH();assert.notEqual(fresh.processInstance,h.processInstance);assert.notEqual(fresh.pid,h.pid);assert.equal(fresh.projection().inspectionOnly,true);return fresh}
const one=f=>assert.equal(f.counters().stub,1)
const effect=p=>p.operations.find(o=>o.kind==='effect')
const ack=p=>p.operations.find(o=>o.kind==='ack-event')
const Hcut=async(h,verb,fields={})=>{const pending=h.request(verb,fields).then(()=>null,e=>e.code);await h.waitForCut();await h.waitForExit();assert.equal(await pending,'H_EXIT_UNKNOWN')}
const Acut=async(f,h,verb,fields={})=>{const pending=h.request(verb,fields);await f.connection().waitForCut();await f.connection().stopAtCut();return pending}
const atomic=d=>{assert.equal(d.attempt.state,'succeeded');assert.equal(d.attempt.effects,3);assert.equal(d.effect.result,'owned-stub-result');assert.equal(d.effect.result_digest,sha('owned-stub-result'));assert.equal(d.outbox.length,1);assert.equal(d.outbox[0].effect_id,d.effect.effect_id);assert.equal(d.integrity,'ok')}

test('QR01: real H exit/respawn preserves exact committed effect and original receipt; fresh inspection notification',()=>scenario('QR01',async f=>{
 let h=await initial(f),r=await h.request('run');const original=effect(r.projection),Ascope=f.connection().scope();one(f);h=await again(f,h,true);assert.deepEqual(f.connection().scope(),Ascope);assert.equal(effect(h.projection()).operationId,original.operationId);assert.deepEqual(effect(h.projection()).receipt,original.receipt);assert.equal((await h.request('recover')).status,'history-inspected');await assert.rejects(h.request('run'),{code:'RESTART_INFERENCE_REFUSED'});assert.equal((await h.request('notify',{mode:'ok'})).status,'committed');one(f);await h.close();await f.connection().close();const d=f.readAfterExit();atomic(d);assert.equal(d.outbox[0].delivered,1)
}))
test('QR02: result saved without effect ID survives restart as data, never auto submit/infer',()=>scenario('QR02',async f=>{
 let h=await initial(f,'after-result-save');await Hcut(h,'run');one(f);h=await again(f,h);assert.equal(h.projection().inference.status,'result');assert.equal(effect(h.projection()),undefined);assert.equal((await h.request('recover')).status,'history-inspected');await assert.rejects(h.request('run'),{code:'RESTART_INFERENCE_REFUSED'});await h.close();await f.connection().close();assert.equal(f.readAfterExit().effect,null);one(f)
}))
test('QR03: reserved before actual stub cut retains ambiguity, no second inference',()=>scenario('QR03',async f=>{
 let h=await initial(f,'after-inference-reserve');await Hcut(h,'run');assert.equal(f.counters().stub,0);h=await again(f,h);assert.equal(h.projection().inference.status,'reserved');assert.equal(h.projection().inference.reservations,1);await h.request('recover');await assert.rejects(h.request('run'),{code:'RESTART_INFERENCE_REFUSED'});assert.equal(f.counters().stub,0);await h.close();await f.connection().close();assert.equal(f.readAfterExit().effect,null)
}))
test('QR04: effect intent persisted before send keeps same original ID, missing receipt unknown',()=>scenario('QR04',async f=>{
 let h=await initial(f,'after-effect-intent');await Hcut(h,'run');h=await again(f,h);const id=effect(h.projection()).operationId;const r=await h.request('recover');assert.equal(r.status,'recovery-unknown');assert.equal(effect(r.projection).operationId,id);assert.equal(effect(r.projection).status,'unknown');assert.equal((await h.request('notify',{mode:'ok'})).code,'ACK_OR_EFFECT_UNKNOWN');one(f);await h.close();await f.connection().close();assert.equal(f.readAfterExit().effect,null)
}))
test('QR05: effect reply received before local receipt save; restart inspects exact original committed history',()=>scenario('QR05',async f=>{
 let h=await initial(f,'after-effect-response-before-save');await Hcut(h,'run');h=await again(f,h);const original=effect(h.projection());assert.equal(original.status,'pending');const r=await h.request('recover');assert.equal(effect(r.projection).operationId,original.operationId);assert.equal(effect(r.projection).status,'committed');one(f);await h.close();await f.connection().close();atomic(f.readAfterExit())
}))
for(const [name,cut,expected] of [['QR06','before-effect','unknown'],['QR07','after-effect','committed']])test(name+': A COMMIT loss then actual H restart preserves result and original operation',()=>scenario(name,async f=>{
 let h=await initial(f,null,cut),r=await Acut(f,h,'run');assert.equal(r.status,'unknown');const original=effect(r.projection).operationId;h=await again(f,h);r=await h.request('recover');assert.equal(effect(r.projection).operationId,original);assert.equal(effect(r.projection).status,expected);one(f);await assert.rejects(h.request('run'),{code:'RESTART_INFERENCE_REFUSED'});await h.close();await f.connection().close();const d=f.readAfterExit();if(expected==='committed')atomic(d);else assert.equal(d.effect,null)
}))
test('QR08: notification known throw across H restart permits at-least-once retry, no stub replay',()=>scenario('QR08',async f=>{
 let h=await initial(f);await h.request('run');assert.equal((await h.request('notify',{mode:'throw'})).status,'notification-pending');h=await again(f,h);await h.request('recover');assert.equal(h.projection().notification.callbackCalls,1);assert.equal((await h.request('notify',{mode:'ok'})).status,'committed');assert.equal(f.counters().callbacks,2);one(f);await h.close()
}))
test('QR09: persisted ACK intent before send blocks re-notification after restart; missing stays unknown',()=>scenario('QR09',async f=>{
 let h=await initial(f,'after-ack-intent');await h.request('run');await Hcut(h,'notify',{mode:'ok'});h=await again(f,h);const id=ack(h.projection()).operationId;let r=await h.request('recover');assert.equal(ack(r.projection).operationId,id);assert.equal(ack(r.projection).status,'unknown');assert.equal((await h.request('notify',{mode:'ok'})).status,'not-admitted');assert.equal(f.counters().callbacks,1);one(f);await h.close();await f.connection().close();assert.equal(f.readAfterExit().outbox[0].delivered,0)
}))
test('QR10: delivery reply before local receipt save; empty pending is not original ACK proof',()=>scenario('QR10',async f=>{
 let h=await initial(f,'after-ack-response-before-save');await h.request('run');await Hcut(h,'notify',{mode:'ok'});h=await again(f,h);assert.equal((await f.connection().outbox()).events.length,0);assert.equal(ack(h.projection()).status,'pending');assert.equal((await h.request('notify',{mode:'ok'})).status,'not-admitted');const id=ack(h.projection()).operationId,r=await h.request('recover');assert.equal(ack(r.projection).operationId,id);assert.equal(ack(r.projection).status,'committed');assert.equal((await h.request('notify',{mode:'ok'})).status,'empty');assert.equal(f.counters().callbacks,1);one(f);await h.close()
}))
for(const [name,cut,expected] of [['QR11','before-ack','unknown'],['QR12','after-ack','committed']])test(name+': delivery ACK COMMIT loss then H restart checks only original receipt',()=>scenario(name,async f=>{
 let h=await initial(f,null,cut);await h.request('run');let r=await Acut(f,h,'notify',{mode:'ok'});assert.equal(r.status,'unknown');const id=ack(r.projection).operationId;h=await again(f,h);assert.equal((await h.request('notify',{mode:'ok'})).status,'not-admitted');r=await h.request('recover');assert.equal(ack(r.projection).operationId,id);assert.equal(ack(r.projection).status,expected);assert.equal(f.counters().callbacks,1);one(f);await h.close();await f.connection().close();assert.equal(f.readAfterExit().outbox[0].delivered,expected==='committed'?1:0)
}))
test('QR13: durable revoke survives H/A restart, notification subset never grants inference',()=>scenario('QR13',async f=>{
 let h=await initial(f);await h.request('run');await h.request('revoke');h=await again(f,h);assert.equal(h.projection().revoked,true);await assert.rejects(h.request('run'),{code:'RESTART_INFERENCE_REFUSED'});f.inspectionFault('missing');await assert.rejects(h.request('recover'),{code:'STORAGE_HISTORY_UNCONFIRMED'});assert.equal((await h.request('notify',{mode:'ok'})).code,'HISTORY_INSPECTION_REQUIRED');f.inspectionFault('wrong-digest');await assert.rejects(h.request('recover'),{code:'RECOVERY_RECEIPT_MISMATCH'});f.inspectionFault('unavailable');assert.equal((await h.request('recover')).status,'recovery-unknown');assert.equal((await h.request('notify',{mode:'ok'})).status,'not-admitted');f.inspectionFault(null);await h.request('recover');assert.equal((await h.request('notify',{mode:'ok'})).status,'committed');assert.equal(f.counters().grants,1);assert.equal((await f.connection().read()).attempt.state,'succeeded');one(f);await h.close()
}))
for(const [name,mode] of [['QR14','corrupt'],['QR15','truncate']])test(name+': malformed ledger fails closed before A requests; exact retained evidence',()=>scenario(name,async f=>{
 let h=await initial(f);await h.request('run');await h.close();const before=f.counters().rpcs;await f.mutateJournal(mode);await assert.rejects(f.startH(),e=>/LEDGER/.test(e.code));assert.equal(f.counters().rpcs,before);if(mode==='truncate'){await f.mutateJournal('rollback');await assert.rejects(f.verifyOwnedJournal(),{code:'LEDGER_WITNESS'});await f.mutateJournal('missing');await assert.rejects(f.verifyOwnedJournal(),e=>/SUPERVISOR/.test(e.code))}else{await f.mutateJournal('replace');await assert.rejects(f.verifyOwnedJournal(),{code:'SUPERVISOR_OBJECT_CHANGED'})};one(f)
},true))
test('QR16: no expiry/eviction; full journal retained across restart; capacity closes gate before callback',()=>scenario('QR16',async f=>{
 let h=await initial(f);await h.request('run');await h.request('fillRetention');assert.equal(h.projection().ledger.revision,LIMITS.revisions);const witness=f.witness();h=await again(f,h);assert.equal(h.projection().ledger.revision,LIMITS.revisions);assert.deepEqual(f.witness(),witness);await h.request('recover');await assert.rejects(h.request('notify',{mode:'ok'}),e=>/CAPACITY/.test(e.code));assert.equal(f.counters().callbacks,0);one(f);await h.close()
}))

after(async()=>{
 clearTimeout(watchdog);if(!run)return;const directory=path.resolve('.scratch/windows-control-restart-20261005',run),st=await fs.lstat(directory);if(!st.isDirectory()||st.isSymbolicLink())throw Error('INVALID_EVIDENCE_DIRECTORY')
 await fs.writeFile(path.join(directory,'results.json'),JSON.stringify({at:new Date().toISOString(),kind:'Owned synthetic actual H process exit/respawn with append journal; no powerloss or production profile qualification',parentRuntime:{electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,uv:process.versions.uv,platform:process.platform,release:os.release()},limits:LIMITS,cases,productionQualified:false,restoreAllowed:false,namespaceMetadataQualified:false,formalAdapterWired:false,computerUse:'NOT_RUN; previous Esc BLOCKED_UX_ACCEPTANCE remains',productBuild:'NOT_RUN'},null,2)+'\n',{flag:'wx'})
})
