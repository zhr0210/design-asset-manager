import assert from 'node:assert/strict'
import {test,after} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {createClaimFixture} from './fixtures/control-store-claim-client.tracer.mjs'
import {PROFILE,CATALOG} from './fixtures/control-store-claim-profile.tracer.mjs'

const cases=[],active=new Set()
const run=process.env.DAM_CLAIM_RUN
if(run&&!/^run-\d{2}$/.test(run))throw Error('INVALID_EVIDENCE_RUN')
const watchdog=setTimeout(async()=>{
 const retained=[];for(const fixture of active)try{retained.push(await fixture.dispose({preserve:true}))}catch{retained.push({cleanup:'RETAINED',uncertain:true})}
 if(run)await fs.writeFile(path.resolve('.scratch/windows-control-claim-20261005',run,'timeout.json'),JSON.stringify({status:'WHOLE_RUN_TIMEOUT_UNKNOWN',retained},null,2)+'\n',{flag:'wx'})
 process.exit(2)
},90000)
async function scenario(name,exercise){
 const fixture=await createClaimFixture();active.add(fixture);let passed=false,errorCode,timer
 try{await Promise.race([exercise(fixture),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('CASE_TIMEOUT_UNKNOWN'),{code:'CASE_TIMEOUT_UNKNOWN'})),12000)})]);passed=true}
 catch(e){errorCode=e.code??'ASSERTION_OR_HARNESS_FAILURE';throw e}
 finally{clearTimeout(timer);const terminal=await fixture.dispose({preserve:!passed});active.delete(fixture);const record={name,status:passed?'PASS':'FAIL',errorCode,...terminal};cases.push(record)
  if(passed)try{assert.equal(terminal.allExited,true);assert.equal(terminal.uncertain,false);assert.equal(terminal.readers,0);assert.equal(terminal.cleanup,'REMOVED_OWNED_FIXTURE')}catch(e){record.status='FAIL';record.errorCode='TERMINAL_ASSERTION_FAILURE';throw e}}
}
const refused=(r,code)=>{assert.equal(r.ok,false);assert.equal(r.code,code)}
const idle=d=>{assert.equal(d.attempt.state,'idle');assert.equal(d.attempt.effects,0);assert.equal(d.attempt.claimToken,null);assert.equal(d.receipts,0);assert.equal(d.integrity,'ok')}
const id=(h,suffix)=>h.connection().scope().instance+':'+suffix
const claim={kind:'claim',assetId:CATALOG.assetId}
const sent=r=>({kind:'mark-sent',assetId:CATALOG.assetId,claimOperationId:r.claimOperationId,claimToken:r.claimToken})
async function ready(f,cut){const h=f.createHost();await h.connect(cut);assert.equal(h.inspect().businessAdmission,false);await h.authorize();return h}
const drains=()=>({workDrain:async()=>{},downloadDrain:async()=>{},aiDrain:async()=>{}})
const zero=h=>assert.equal(h.inspect().stubCalls,0)

test('QC01: matched claim and sent receipts precede exactly one local stub',()=>scenario('QC01',async f=>{
 const h=await ready(f),r=await h.runStub();assert.equal(r.status,'stub-inferred');assert.equal(r.stubCalls,1)
 assert.ok(h.events().indexOf('claim-acknowledged')<h.events().indexOf('mark-sent-sent-to-A'));assert.ok(h.events().indexOf('mark-sent-acknowledged')<h.events().indexOf('stub-inference'))
 const again=await h.runStub();assert.equal(again.status,'verified-no-effect');assert.equal(again.code,'CLAIM_BUSY');assert.equal(h.inspect().stubCalls,1)
 await h.close();const d=f.readAfterExit(r.sentOperationId);assert.equal(d.attempt.state,'sent');assert.equal(d.attempt.effects,2);assert.equal(d.receipts,2);assert.equal(d.receipt.state,'sent');assert.equal(d.integrity,'ok')
}))

test('QC02: work/download drain before hold, dependent drain after ACK, explicit resume/grant',()=>scenario('QC02',async f=>{
 const h=await ready(f),seen=[]
 const cycle=await h.coordinate({workDrain:async()=>{seen.push('work');assert.equal(h.inspect().businessAdmission,true)},downloadDrain:async()=>{seen.push('download');assert.equal(h.inspect().businessAdmission,true)},aiDrain:async()=>{seen.push('dependent');assert.equal(h.inspect().businessAdmission,false);assert.equal(h.inspect().fence,'acknowledged')}})
 assert.deepEqual(seen,['work','download','dependent']);const e=h.events();assert.ok(e.indexOf('download-drain-done')<e.indexOf('cycle-hold'));assert.ok(e.indexOf('A-fence-acknowledged')<e.indexOf('dependent-drain-start'))
 cycle.release();assert.equal(h.inspect().businessAdmission,false);await h.resume();assert.equal(h.inspect().businessAuthorized,false);assert.equal((await h.runStub()).status,'not-admitted');await h.authorize();assert.equal((await h.runStub()).status,'stub-inferred');await h.close()
}))

test('QC03: known work/download drain failure does not take hold or start dependent work',()=>scenario('QC03',async f=>{
 const h=await ready(f);let dependent=0,download=0
 await assert.rejects(h.coordinate({...drains(),workDrain:async()=>{throw Error('FIXTURE_WORK_FAILURE')},downloadDrain:async()=>{download++},aiDrain:async()=>{dependent++}}),/FIXTURE_WORK_FAILURE/)
 assert.equal(download,0);assert.equal(h.inspect().holds,0);assert.equal(h.inspect().fence,'not-requested')
 await assert.rejects(h.coordinate({...drains(),downloadDrain:async()=>{throw Error('FIXTURE_DOWNLOAD_FAILURE')},aiDrain:async()=>{dependent++}}),/FIXTURE_DOWNLOAD_FAILURE/)
 assert.equal(dependent,0);assert.equal(h.inspect().holds,0);zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC04: bounded download callback timeout retires admission, late settle cannot start dependent',()=>scenario('QC04',async f=>{
 const h=await ready(f);let resolve,dependent=0;const pending=new Promise(r=>{resolve=r})
 await assert.rejects(h.coordinate({...drains(),downloadDrain:()=>pending,aiDrain:async()=>{dependent++}}),{code:'DRAIN_TIMEOUT_UNKNOWN'})
 assert.equal(h.inspect().businessAdmission,false);assert.equal(h.inspect().state,'recovery-required');resolve();await pending;await Promise.resolve();assert.equal(dependent,0);zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC05: pending A fence closes gate before ACK, dependent work waits exact applied ACK',()=>scenario('QC05',async f=>{
 const h=await ready(f,'late-after-quiesce');let dependent=0;const coordinating=h.coordinate({...drains(),aiDrain:async()=>{dependent++;assert.equal(h.inspect().fence,'acknowledged')}})
 await h.connection().waitForCut();assert.equal(h.inspect().fence,'pending');assert.equal(h.inspect().businessAdmission,false);assert.equal(dependent,0);assert.equal((await h.runStub()).status,'not-admitted')
 await h.connection().releaseCut();const cycle=await coordinating;assert.equal(dependent,1);cycle.release();assert.equal(h.inspect().businessAdmission,false);zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC06: independent cycle/maintenance/shutdown tokens release idempotently, shutdown sticky',()=>scenario('QC06',async f=>{
 const h=await ready(f),a=h.hold('cycle'),b=h.hold('cycle'),m=h.hold('maintenance'),s=h.hold('shutdown');assert.equal(h.inspect().holds,4)
 a();a();assert.equal(h.inspect().holds,3);b();m();assert.equal(h.inspect().holds,1);s();assert.equal(h.inspect().holds,0);assert.equal(h.inspect().shuttingDown,true)
 assert.equal((await h.runStub()).status,'not-admitted');await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC07: applied quiesce lost ACK, finally release/resource/fresh attach never regrant',()=>scenario('QC07',async f=>{
 const h=await ready(f,'after-quiesce');let dependent=0;const waiting=h.coordinate({...drains(),aiDrain:async()=>{dependent++}}).then(()=>null,e=>e.code)
 await h.connection().waitForCut();await h.connection().stopAtCut();assert.equal(await waiting,'AUTHORITY_EXITED_ACK_UNKNOWN');assert.equal(dependent,0);assert.equal(h.inspect().holds,0);assert.equal(h.inspect().fenceUnknown,true)
 h.setResourceUnknown(true);h.setResourceUnknown(false);await h.connect();assert.equal(h.inspect().businessAdmission,false);await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});await assert.rejects(h.resume(),{code:'LOCAL_RESUME_REFUSED'});zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC08: applied resume lost ACK stays unknown across fresh inspection and resource recovery',()=>scenario('QC08',async f=>{
 const h=await ready(f,'after-resume'),cycle=await h.coordinate(drains());cycle.release();const resuming=h.resume().then(()=>null,e=>e.code)
 await h.connection().waitForCut();assert.equal(h.inspect().businessAuthorized,false);await h.connection().stopAtCut();assert.equal(await resuming,'AUTHORITY_EXITED_ACK_UNKNOWN');await h.connect();h.setResourceUnknown(false)
 assert.equal(h.inspect().fenceUnknown,true);await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC09: before claim COMMIT loss leaves no rows; missing receipt remains unknown, zero stub',()=>scenario('QC09',async f=>{
 const h=await ready(f,'before-claim'),running=h.runStub();await h.connection().waitForCut();await h.connection().stopAtCut();const r=await running;assert.equal(r.status,'unknown');zero(h);idle(f.readAfterExit(r.operationId))
 await h.connect();assert.equal((await h.inspectOutcome(r.operationId)).status,'unknown');await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});refused(await h.connection().raw('commitIntent',{operationId:r.operationId,payload:claim}),'STALE_OPERATION');zero(h);await h.close()
}))

test('QC10: committed claim lost ACK, precise status does not create sent/contact/inference',()=>scenario('QC10',async f=>{
 const h=await ready(f,'after-claim'),running=h.runStub();await h.connection().waitForCut();await h.connection().stopAtCut();const r=await running;assert.equal(r.status,'unknown');const before=f.readAfterExit(r.operationId);assert.equal(before.attempt.state,'claimed');assert.equal(before.receipts,1);zero(h)
 await h.connect();const recovered=await h.inspectOutcome(r.operationId);assert.equal(recovered.status,'committed');assert.equal(recovered.current,false);assert.equal(h.inspect().businessAuthorized,false);zero(h)
 await h.authorize();const repeated=await h.runStub();assert.equal(repeated.code,'CLAIM_BUSY');refused(await h.connection().raw('commitIntent',{operationId:id(h,'old-token'),payload:sent(recovered.receipt)}),'NOT_CLAIMED');zero(h);await h.close();assert.equal(f.readAfterExit().receipts,1)
}))

test('QC11: sent marker lost ACK is storage unknown and zero inference, fresh status does not resume',()=>scenario('QC11',async f=>{
 const h=await ready(f,'after-sent'),running=h.runStub();await h.connection().waitForCut();await h.connection().stopAtCut();const r=await running;assert.equal(r.status,'unknown');assert.equal(r.stage,'mark-sent');zero(h)
 const before=f.readAfterExit(r.sentOperationId);assert.equal(before.attempt.state,'sent');assert.equal(before.attempt.effects,2);assert.equal(before.receipts,2)
 await h.connect();assert.equal((await h.inspectOutcome(r.sentOperationId)).status,'committed');assert.equal(h.inspect().businessAdmission,false);zero(h);await h.authorize();assert.equal((await h.runStub()).code,'CLAIM_BUSY');zero(h);await h.close();assert.equal(f.readAfterExit().receipts,2)
}))

test('QC12: late claim ACK across local epoch is historical, second local run busy, no sent',()=>scenario('QC12',async f=>{
 const h=await ready(f,'late-after-claim'),running=h.runStub();await h.connection().waitForCut();assert.equal((await h.runStub()).code,'LOCAL_ATTEMPT_BUSY');h.invalidate();await h.connection().releaseCut();assert.equal((await running).status,'stopped-before-inference');zero(h)
 await h.close();const d=f.readAfterExit();assert.equal(d.attempt.state,'claimed');assert.equal(d.receipts,1)
}))

test('QC13: late sent ACK across epoch never starts inference although marker committed',()=>scenario('QC13',async f=>{
 const h=await ready(f,'late-after-sent'),running=h.runStub();await h.connection().waitForCut();h.invalidate();await h.connection().releaseCut();assert.equal((await running).status,'stopped-before-inference');zero(h);await h.close();const d=f.readAfterExit();assert.equal(d.attempt.state,'sent');assert.equal(d.receipts,2)
}))

test('QC14: abort during delayed sent ACK stays zero stub and does not negate sent marker',()=>scenario('QC14',async f=>{
 const h=await ready(f,'late-after-sent'),abort=new AbortController(),running=h.runStub({signal:abort.signal});await h.connection().waitForCut();abort.abort();await h.connection().releaseCut();assert.equal((await running).status,'aborted');zero(h);await h.close();assert.equal(f.readAfterExit().attempt.state,'sent')
}))

test('QC15: live mismatched sent receipt fails closed, original fresh receipt known, zero stub',()=>scenario('QC15',async f=>{
 const h=await ready(f,'mismatched-sent'),r=await h.runStub();assert.equal(r.status,'unknown');assert.equal(r.code,'INVALID_RECEIPT');zero(h);await h.connect();assert.equal((await h.inspectOutcome(r.sentOperationId)).status,'committed');assert.equal(h.inspect().businessAuthorized,false);zero(h);await h.close();assert.equal(f.readAfterExit().receipts,2)
}))

test('QC16: explicit revoke remains closed after resource recovery and independent token releases',()=>scenario('QC16',async f=>{
 const h=await ready(f),release=h.hold('maintenance');const revoking=h.revoke();assert.equal(h.inspect().businessAuthorized,false);assert.equal(h.inspect().fence,'pending');await revoking;release();h.setResourceUnknown(true);h.setResourceUnknown(false)
 await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'});refused(await h.connection().raw('grant'),'REVOKED');refused(await h.connection().raw('commitIntent',{operationId:id(h,'revoked'),payload:claim}),'REVOKED');zero(h);await h.close();idle(f.readAfterExit())
}))

test('QC17: raw bypass rejects, exact replay one effect, changed payload and stale claim epoch refuse',()=>scenario('QC17',async f=>{
 const h=await ready(f),c=h.connection();refused(await c.raw('commitIntent',{operationId:id(h,'bypass'),payload:claim,allowSuspendedCoordination:true}),'UNKNOWN_FIELD');refused(await c.raw('readAttempt',{path:'C:\\untrusted.sqlite'}),'UNKNOWN_FIELD')
 const operationId=id(h,'raw-claim'),first=await c.raw('commitIntent',{operationId,payload:claim});assert.equal(first.ok,true);assert.equal((await c.raw('commitIntent',{operationId,payload:claim})).replayed,true)
 refused(await c.raw('commitIntent',{operationId,payload:sent(first.receipt)}),'PAYLOAD_MISMATCH');refused(await c.raw('commitIntent',{operationId:id(h,'bad-token'),payload:{...sent(first.receipt),claimToken:randomUUID()}}),'NOT_CLAIMED')
 await h.quiesce();refused(await c.raw('grant'),'SUSPENDED');refused(await c.raw('commitIntent',{operationId:id(h,'held'),payload:claim}),'SUSPENDED');await h.resume();await h.authorize()
 refused(await c.raw('commitIntent',{operationId:id(h,'stale-epoch-token'),payload:sent(first.receipt)}),'NOT_CLAIMED');zero(h);await h.close();const d=f.readAfterExit();assert.equal(d.attempt.effects,1);assert.equal(d.receipts,1)
}))

test('QC18: abort before claim sends nothing; held pending claim ACK cannot start mark-sent',()=>scenario('QC18',async f=>{
 const h=await ready(f,'late-after-claim'),abort=new AbortController();abort.abort();assert.equal((await h.runStub({signal:abort.signal})).status,'aborted');assert.equal(h.operations().length,0)
 const running=h.runStub();await h.connection().waitForCut();const release=h.hold('maintenance');await h.connection().releaseCut();assert.equal((await running).status,'stopped-before-inference');release();zero(h);assert.equal((await h.runStub()).code,'CLAIM_BUSY');await h.close();assert.equal(f.readAfterExit().receipts,1)
}))

test('QC19: closed admission before/between pre-drains starts no dependent work or A fence',()=>scenario('QC19',async f=>{
 const h=f.createHost();await h.connect();let work=0,download=0,dependent=0
 const callbacks={workDrain:async()=>{work++},downloadDrain:async()=>{download++},aiDrain:async()=>{dependent++}}
 await assert.rejects(h.coordinate(callbacks),{code:'DRAIN_ADMISSION_CLOSED'});await h.authorize()
 const held=h.hold('cycle');await assert.rejects(h.coordinate(callbacks),{code:'DRAIN_ADMISSION_CLOSED'});assert.equal(h.inspect().holds,1);held()
 h.setResourceUnknown(true);await assert.rejects(h.coordinate(callbacks),{code:'DRAIN_ADMISSION_CLOSED'});h.setResourceUnknown(false);assert.equal(work,0)
 const queued=h.coordinate(callbacks),queuedHold=h.hold('maintenance');await assert.rejects(queued,{code:'DRAIN_ADMISSION_CLOSED'});assert.equal(work,0);assert.equal(download,0);queuedHold()
 let release;await assert.rejects(h.coordinate({...callbacks,workDrain:async()=>{work++;release=h.hold('maintenance')}}),{code:'DRAIN_ADMISSION_CLOSED'});assert.equal(work,1);assert.equal(download,0);assert.equal(h.inspect().holds,1);release()
 await assert.rejects(h.coordinate({...callbacks,downloadDrain:async()=>{download++;h.setResourceUnknown(true)}}),{code:'DRAIN_ADMISSION_CLOSED'});assert.equal(download,1);assert.equal(dependent,0);assert.equal(h.inspect().fence,'not-requested');assert.equal(h.inspect().holds,0);h.setResourceUnknown(false);zero(h);await h.close();idle(f.readAfterExit())
}))

after(async()=>{
 clearTimeout(watchdog);if(!run)return;const directory=path.resolve('.scratch/windows-control-claim-20261005',run),st=await fs.lstat(directory);if(!st.isDirectory()||st.isSymbolicLink())throw Error('INVALID_EVIDENCE_DIRECTORY')
 await fs.writeFile(path.join(directory,'results.json'),JSON.stringify({at:new Date().toISOString(),kind:'Owned synthetic quiescence/claim-sent only; marker is not contact or inference evidence',parentRuntime:{electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,uv:process.versions.uv,platform:process.platform,release:os.release()},profile:PROFILE,deadlines:{callback:1000,case:12000,wholeRun:90000},cases,productionQualified:false,restoreAllowed:false,namespaceMetadataQualified:false,formalAdapterWired:false,computerUse:'NOT_RUN; previous Esc BLOCKED_UX_ACCEPTANCE remains',productBuild:'NOT_RUN'},null,2)+'\n',{flag:'wx'})
})
