import assert from 'node:assert/strict'
import {test,after} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID,createHash} from 'node:crypto'
import {createEffectFixture} from './fixtures/control-store-effect-client.tracer.mjs'
import {PROFILE,CATALOG} from './fixtures/control-store-effect-profile.tracer.mjs'

const cases=[],active=new Set()
const run=process.env.DAM_EFFECT_RUN
if(run&&!/^run-\d{2}$/.test(run))throw Error('INVALID_EVIDENCE_RUN')
const watchdog=setTimeout(async()=>{
 const retained=[];for(const fixture of active)try{retained.push(await fixture.dispose({preserve:true}))}catch{retained.push({cleanup:'RETAINED',uncertain:true})}
 if(run)await fs.writeFile(path.resolve('.scratch/windows-control-effect-20261005',run,'timeout.json'),JSON.stringify({status:'WHOLE_RUN_TIMEOUT_UNKNOWN',retained},null,2)+'\n',{flag:'wx'})
 process.exit(2)
},90000)
async function scenario(name,exercise){
 const fixture=await createEffectFixture();active.add(fixture);let passed=false,errorCode,timer
 try{await Promise.race([exercise(fixture),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('CASE_TIMEOUT_UNKNOWN'),{code:'CASE_TIMEOUT_UNKNOWN'})),12000)})]);passed=true}
 catch(e){errorCode=e.code??'ASSERTION_OR_HARNESS_FAILURE';throw e}
 finally{clearTimeout(timer);const terminal=await fixture.dispose({preserve:!passed});active.delete(fixture);const record={name,status:passed?'PASS':'FAIL',errorCode,...terminal};cases.push(record)
  if(passed)try{assert.equal(terminal.allExited,true);assert.equal(terminal.uncertain,false);assert.equal(terminal.readers,0);assert.equal(terminal.cleanup,'REMOVED_OWNED_FIXTURE')}catch(e){record.status='FAIL';record.errorCode='TERMINAL_ASSERTION_FAILURE';throw e}}
}
const refused=(r,code)=>{assert.equal(r.ok,false);assert.equal(r.code,code)}
const ready=async(f,cut)=>{const h=f.createHost();await h.connect(cut);await h.authorize();return h}
const one=h=>assert.equal(h.inspect().stubCalls,1)
const atomic=d=>{assert.equal(d.attempt.state,'succeeded');assert.equal(d.attempt.effects,3);assert.ok(d.effect);assert.equal(d.effect.result,'owned-stub-result');assert.equal(d.effect.result_digest,createHash('sha256').update('owned-stub-result','utf8').digest('hex'));assert.equal(d.outbox.length,1);assert.equal(d.outbox[0].effect_id,d.effect.effect_id);assert.equal(d.outbox[0].event_id,'event:'+d.effect.effect_id);assert.equal(d.outbox[0].result_digest,d.effect.result_digest);assert.equal(d.integrity,'ok')}
const effect=p=>({kind:'effect',assetId:CATALOG.assetId,claimOperationId:p.claimOperationId,claimToken:p.claimReceipt.claimToken,result:p.result})
const id=h=>h.connection().scope().instance+':'+randomUUID()
const paused=async(h,cut,operation)=>{const pending=operation();await h.connection().waitForCut();await h.connection().stopAtCut();return pending}

test('QE01: atomic result success receipt outbox; ACK keeps historical effect receipt immutable',()=>scenario('QE01',async f=>{
 const h=await ready(f),r=await h.runStub();assert.equal(r.status,'committed');assert.equal(r.current,true);one(h)
 const original=structuredClone(r.receipt),seen=[];assert.equal((await h.flushNotifications(v=>{seen.push(v.eventId)})).status,'flushed');assert.deepEqual(seen,[r.receipt.eventId])
 assert.deepEqual((await h.inspectOutcome(r.operationId)).receipt,original);await h.close();const d=f.readAfterExit(r.operationId);atomic(d);assert.equal(d.receipts,4);assert.equal(d.outbox[0].delivered,1)
}))
test('QE02: exact same ID replay; payload conflict preserves original result and event',()=>scenario('QE02',async f=>{
 const h=await ready(f),p=await h.prepareResult(),r=await h.commitResult(p),c=h.connection();const again=await c.commit(r.operationId,effect(p));assert.equal(again.replayed,true);assert.deepEqual(again.receipt,r.receipt)
 refused(await c.commit(r.operationId,{...effect(p),result:'different'}),'PAYLOAD_MISMATCH');assert.equal((await h.commitResult(p)).code,'RESULT_ALREADY_SUBMITTED');one(h);await h.close();const d=f.readAfterExit();atomic(d);assert.equal(d.receipts,3)
}))
test('QE03: before effect COMMIT loss retains result once; missing receipt stays unknown',()=>scenario('QE03',async f=>{
 const h=await ready(f,'before-effect'),r=await paused(h,null,()=>h.runStub());assert.equal(r.status,'unknown');one(h);const d=f.readAfterExit(r.operationId);assert.equal(d.attempt.state,'sent');assert.equal(d.effect,null);assert.equal(d.outbox.length,0);assert.equal(d.receipts,2)
 await h.connect();assert.equal((await h.inspectOutcome(r.operationId)).status,'unknown');assert.equal((await h.runStub()).status,'not-admitted');await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});one(h);await h.close()
}))
test('QE04: after effect COMMIT lost ACK; fresh exact history and notification never rerun stub',()=>scenario('QE04',async f=>{
 const h=await ready(f,'after-effect'),r=await paused(h,null,()=>h.runStub());assert.equal(r.status,'unknown');atomic(f.readAfterExit(r.operationId));one(h);await h.connect();const exact=await h.inspectOutcome(r.operationId);assert.equal(exact.status,'committed');assert.equal(exact.current,false);assert.equal(h.inspect().businessAuthorized,false)
 assert.equal((await h.flushNotifications(()=>{})).status,'flushed');assert.equal((await h.runStub()).status,'not-admitted');one(h);await h.close();assert.equal(f.readAfterExit().receipts,4)
}))
test('QE05: late effect ACK after epoch change remains historical success',()=>scenario('QE05',async f=>{
 const h=await ready(f,'late-after-effect'),pending=h.runStub();await h.connection().waitForCut();h.invalidate();await h.connection().releaseCut();const r=await pending;assert.equal(r.status,'committed');assert.equal(r.current,false);assert.equal((await h.flushNotifications(()=>{})).status,'not-admitted');one(h);await h.close();atomic(f.readAfterExit())
}))
for(const [name,cut] of [['QE06','mismatched-effect'],['QE07','malformed-after-effect']])test(name+': invalid receipt fails closed, fresh precise receipt recovers only history',()=>scenario(name,async f=>{
 const h=await ready(f,cut),r=await h.runStub();assert.equal(r.status,'unknown');assert.equal(r.code,'INVALID_RECEIPT');one(h);await h.connect();assert.equal((await h.inspectOutcome(r.operationId)).status,'committed');assert.equal(h.inspect().businessAuthorized,false);one(h);await h.close();atomic(f.readAfterExit())
}))
test('QE08: notification throw remains pending; callback replays without inference replay',()=>scenario('QE08',async f=>{
 const h=await ready(f);await h.runStub();let seen=0;const callback=()=>{seen++;if(seen===1)throw Error('FIXTURE_NOTIFY_FAILURE')};assert.equal((await h.flushNotifications(callback)).status,'notification-pending');assert.equal((await h.connection().outbox()).events.length,1);assert.equal((await h.flushNotifications(callback)).status,'flushed');assert.equal(seen,2);one(h);await h.close();atomic(f.readAfterExit())
}))
test('QE09: callback timeout never ACKs; late settlement cannot ACK in background',()=>scenario('QE09',async f=>{
 const h=await ready(f);await h.runStub();let settle;const delayed=new Promise(r=>{settle=r}),r=await h.flushNotifications(()=>delayed);assert.equal(r.code,'NOTIFICATION_TIMEOUT_UNKNOWN');settle();await delayed;await Promise.resolve();assert.equal((await h.connection().outbox()).events.length,1);assert.equal(h.operations().filter(o=>o.kind==='ack-event').length,0);one(h);await h.close();assert.equal(f.readAfterExit().receipts,3)
}))
test('QE10: before ACK COMMIT loss; pending event is not proof for original ACK',()=>scenario('QE10',async f=>{
 const h=await ready(f,'before-ack');await h.runStub();const r=await paused(h,null,()=>h.flushNotifications(()=>{}));assert.equal(r.status,'unknown');assert.equal(f.readAfterExit().outbox[0].delivered,0);await h.connect();assert.equal((await h.inspectOutcome(r.operationId)).status,'unknown');assert.equal((await h.flushNotifications(()=>{throw Error('MUST_NOT_CALL')})).status,'not-admitted');one(h);await h.close()
}))
test('QE11: after ACK COMMIT loss; exact original ACK inspection resolves delivery',()=>scenario('QE11',async f=>{
 const h=await ready(f,'after-ack');await h.runStub();const r=await paused(h,null,()=>h.flushNotifications(()=>{}));assert.equal(r.status,'unknown');assert.equal(f.readAfterExit().outbox[0].delivered,1);await h.connect();assert.equal((await h.connection().outbox()).events.length,0);assert.equal(h.inspect().unknownOperations,1);assert.equal((await h.flushNotifications(()=>{})).status,'not-admitted')
 const resolved=await h.inspectOutcome(r.operationId);assert.equal(resolved.status,'committed');assert.equal(resolved.receipt.delivered,true);assert.equal(resolved.current,false);let seen=0;assert.equal((await h.flushNotifications(()=>{seen++})).status,'flushed');assert.equal(seen,0);one(h);await h.close();assert.equal(f.readAfterExit().receipts,4)
}))
test('QE12: late ACK after epoch change keeps exact delivered history, no new scope progression',()=>scenario('QE12',async f=>{
 const h=await ready(f,'late-after-ack');await h.runStub();const pending=h.flushNotifications(()=>{});await h.connection().waitForCut();h.invalidate();await h.connection().releaseCut();const r=await pending;assert.equal(r.status,'committed');assert.equal(r.current,false);one(h);await h.close();assert.equal(f.readAfterExit().outbox[0].delivered,1)
}))
test('QE13: delayed callback and maintenance hold prevent old ACK; release permits callback replay',()=>scenario('QE13',async f=>{
 const h=await ready(f);await h.runStub();let settle,started;const began=new Promise(r=>{started=r}),delayed=new Promise(r=>{settle=r});const pending=h.flushNotifications(()=>{started();return delayed});await began;const release=h.hold('maintenance');settle();assert.equal((await pending).code,'NOTIFICATION_SCOPE_CHANGED');assert.equal(h.operations().filter(o=>o.kind==='ack-event').length,0);release();assert.equal((await h.flushNotifications(()=>{})).status,'flushed');assert.equal(h.inspect().callbackCalls,2);one(h);await h.close()
}))
test('QE14: delayed callback after epoch invalidation cannot ACK or restore grant',()=>scenario('QE14',async f=>{
 const h=await ready(f);await h.runStub();let settle,started;const began=new Promise(r=>{started=r}),delayed=new Promise(r=>{settle=r});const pending=h.flushNotifications(()=>{started();return delayed});await began;h.invalidate();settle();assert.equal((await pending).code,'NOTIFICATION_SCOPE_CHANGED');assert.equal(h.inspect().businessAuthorized,false);assert.equal(h.operations().filter(o=>o.kind==='ack-event').length,0);one(h);await h.close();assert.equal(f.readAfterExit().outbox[0].delivered,0)
}))
test('QE15: local hold at queued notification entry prevents callback invocation',()=>scenario('QE15',async f=>{
 const h=await ready(f);await h.runStub();let calls=0;const pending=h.flushNotifications(()=>{calls++}),release=h.hold('maintenance');await assert.rejects(pending,{code:'NOTIFICATION_SCOPE_CHANGED'});assert.equal(calls,0);release();one(h);await h.close();assert.equal(f.readAfterExit().receipts,3)
}))
test('QE16: concurrent flush single flight and repeated ACK are idempotent for effect',()=>scenario('QE16',async f=>{
 const h=await ready(f);await h.runStub();let settle,started,calls=0;const began=new Promise(r=>{started=r}),delayed=new Promise(r=>{settle=r});const p=h.flushNotifications(()=>{calls++;started();return delayed}),q=h.flushNotifications(()=>{throw Error('SECOND_CALLBACK')});assert.equal(p,q);await began;settle();const r=await p;assert.equal(r.status,'flushed');assert.equal(calls,1);const ack=r.receipts[0],event=ack.receipt;const payload={kind:'ack-event',assetId:CATALOG.assetId,eventId:event.eventId,effectId:event.effectId,resultDigest:event.resultDigest}
 assert.equal((await h.connection().commit(ack.operationId,payload)).replayed,true);assert.equal((await h.connection().commit(id(h),payload)).ok,true);one(h);await h.close();const d=f.readAfterExit();atomic(d);assert.equal(d.receipts,5)
}))
test('QE17: finish cannot downgrade succeeded under any nonsuccess target or create success',()=>scenario('QE17',async f=>{
 const h=await ready(f),p=await h.prepareResult(),committed=await h.commitResult(p);for(const state of ['failed','cancelled','paused','outcome-unknown'])refused(await h.finish(p,state),'ALREADY_SUCCEEDED');refused(await h.finish(p,'succeeded'),'INVALID_FINISH');await h.quiesce();refused(await h.connection().outbox(),'SUSPENDED');refused(await h.connection().readEvent(committed.receipt.eventId),'SUSPENDED');refused(await h.connection().commit(id(h),{kind:'ack-event',assetId:CATALOG.assetId,eventId:committed.receipt.eventId,effectId:committed.receipt.effectId,resultDigest:committed.receipt.resultDigest}),'SUSPENDED');refused(await h.finish(p,'failed'),'ALREADY_SUCCEEDED');one(h);await h.close();atomic(f.readAfterExit())
}))
test('QE18: legitimate finish under quiescence prevents late effect resurrection',()=>scenario('QE18',async f=>{
 const h=await ready(f),p=await h.prepareResult();await h.quiesce();const finished=await h.finish(p,'outcome-unknown');assert.equal(finished.ok,true);await h.resume();await h.authorize();refused(await h.connection().commit(id(h),effect(p)),'NOT_CLAIMED');one(h);await h.close();const d=f.readAfterExit();assert.equal(d.attempt.state,'outcome-unknown');assert.equal(d.effect,null);assert.equal(d.receipts,2)
}))
test('QE19: revoke before effect denies submission; resource release never restores grant',()=>scenario('QE19',async f=>{
 const h=await ready(f),p=await h.prepareResult();await h.revoke();h.setResourceUnknown(true);h.setResourceUnknown(false);assert.equal((await h.commitResult(p)).status,'not-admitted');refused(await h.connection().commit(id(h),effect(p)),'REVOKED');await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});assert.equal((await h.finish(p,'paused')).ok,true);one(h);await h.close();assert.equal(f.readAfterExit().effect,null)
}))
test('QE20: revoke after commit keeps success; inspection-only notifications no inference grant',()=>scenario('QE20',async f=>{
 const h=await ready(f),r=await h.runStub();await h.revoke();assert.equal((await h.inspectOutcome(r.operationId)).status,'committed');assert.equal((await h.flushNotifications(()=>{})).status,'flushed');refused(await h.connection().raw('readOutbox',{path:'untrusted'}),'UNKNOWN_FIELD');refused(await h.connection().raw('commitIntent',{operationId:id(h),payload:{kind:'claim',assetId:CATALOG.assetId},allowSuspendedCoordination:true}),'UNKNOWN_FIELD');one(h);await h.close();atomic(f.readAfterExit())
}))

after(async()=>{
 clearTimeout(watchdog);if(!run)return;const directory=path.resolve('.scratch/windows-control-effect-20261005',run),st=await fs.lstat(directory);if(!st.isDirectory()||st.isSymbolicLink())throw Error('INVALID_EVIDENCE_DIRECTORY')
 await fs.writeFile(path.join(directory,'results.json'),JSON.stringify({at:new Date().toISOString(),kind:'Owned synthetic result/effect/succeeded/immutable receipt/outbox only; notifications at least once',parentRuntime:{electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,uv:process.versions.uv,platform:process.platform,release:os.release()},profile:PROFILE,deadlines:{callback:1000,case:12000,wholeRun:90000},cases,productionQualified:false,restoreAllowed:false,namespaceMetadataQualified:false,formalAdapterWired:false,computerUse:'NOT_RUN; previous Esc BLOCKED_UX_ACCEPTANCE remains',productBuild:'NOT_RUN'},null,2)+'\n',{flag:'wx'})
})
