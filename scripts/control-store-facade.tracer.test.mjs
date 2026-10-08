import assert from 'node:assert/strict'
import {test,after} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createFacadeFixture} from './fixtures/control-store-facade-client.tracer.mjs'
import {PROFILE,CATALOG} from './fixtures/control-store-facade-profile.tracer.mjs'

const cases=[]
async function scenario(name,exercise){
 const fixture=await createFacadeFixture();let passed=false,errorCode
 try{await exercise(fixture);passed=true}catch(e){errorCode=e.code??'ASSERTION_OR_HARNESS_FAILURE';throw e}
 finally{const terminal=await fixture.dispose({preserve:!passed}),record={name,status:passed?'PASS':'FAIL',errorCode,...terminal};cases.push(record)
  if(passed)try{assert.equal(terminal.allExited,true);assert.equal(terminal.uncertain,false);assert.equal(terminal.readers,0);assert.equal(terminal.cleanup,'REMOVED_OWNED_FIXTURE')}catch(e){record.status='FAIL';record.errorCode='TERMINAL_ASSERTION_FAILURE';throw e}}
}
const refused=(reply,code)=>{assert.equal(reply.ok,false);assert.equal(reply.code,code)}
const unchanged=disk=>{assert.equal(disk.caption.revision,0);assert.equal(disk.caption.effects,0);assert.equal(disk.receipts,0);assert.equal(disk.integrity,'ok')}
const payload=(caption,expectedCaption='')=>({assetId:CATALOG.assetId,caption,expectedCaption})
const id=(h,suffix)=>h.connection().scope().instance+':'+suffix
async function ready(f,cut){const h=f.createHost();await h.connect(cut);assert.equal(h.inspect().businessAdmission,false);await h.authorize();return h}

test('FC01: registered references, explicit grant and same-MAIN caption/effect/receipt',async()=>scenario('FC01',async f=>{
 const h=f.createHost();await h.connect();assert.equal(h.inspect().state,'ready');assert.equal(h.inspect().businessAuthorized,false)
 refused(await h.connection().raw('commitCaption',{operationId:id(h,'ungranted'),payload:payload('denied')}),'GRANT_REQUIRED')
 h.edit('synthetic caption');assert.equal((await h.save()).status,'not-admitted');await h.authorize()
 const saved=await h.save();assert.equal(saved.status,'committed');assert.equal(saved.current,true);assert.equal(saved.receipt.effects,1);assert.equal(h.draft().dirty,false)
 assert.equal((await h.inspectOutcome(saved.operationId)).status,'committed');assert.equal((await h.close()).code,0)
 const disk=f.readAfterExit(saved.operationId);assert.equal(disk.caption.caption,'synthetic caption');assert.equal(disk.receipt.payloadDigest,saved.receipt.payloadDigest);assert.equal(disk.receipt.revision,disk.caption.revision);assert.equal(disk.receipts,1);assert.equal(disk.integrity,'ok')
}))

test('FC02: fixed catalog/profile/client, raw paths and unknown fields refuse without effects',async()=>scenario('FC02',async f=>{
 const h=await ready(f),c=h.connection()
 for(const [fields,code] of [[{catalogRef:'C:\\untrusted.sqlite'},'CATALOG_REFERENCE_MISMATCH'],[{catalogRef:'forged-store'},'CATALOG_REFERENCE_MISMATCH'],[{profileId:'different-profile'},'PROFILE_MISMATCH'],[{clientId:'different-client'},'CLIENT_MISMATCH'],[{generation:'2'},'LIBRARY_SCOPE_MISMATCH'],[{path:'C:\\untrusted.sqlite'},'UNKNOWN_FIELD'],[{session:'stale-synthetic'},'INVALID_SESSION']])refused(await c.raw('readCaption',fields),code)
 refused(await c.raw('attach',{instance:c.scope().instance,catalogRef:CATALOG.catalogRef,materialRef:'forged-material',profileId:CATALOG.profileId,clientId:CATALOG.clientId}),'MATERIAL_REFERENCE_MISMATCH')
 refused(await c.raw('register',{path:'C:\\untrusted.sqlite'}),'UNKNOWN_ACTION')
 assert.equal((await c.read()).caption.effects,0);await h.close();unchanged(f.readAfterExit())
}))

test('FC03: disconnect retires H epoch/issued scopes synchronously and reconnect is inspection-only',async()=>scenario('FC03',async f=>{
 const h=await ready(f);h.edit('preserved on disconnect');const before=h.inspect(),draft=h.draft(),refs=['receipt','picker','native','media'].map(kind=>h.issue(kind))
 assert.equal(h.matches(before),true);assert.equal(refs.every(r=>h.checkIssued(r)),true)
 const oldScope=h.connection().scope();await h.connection().dispose()
 assert.equal(h.inspect().state,'recovery-required');assert.ok(h.inspect().authorityEpoch>before.authorityEpoch);assert.equal(h.inspect().identity,before.identity);assert.equal(h.inspect().generation,before.generation)
 assert.equal(h.matches(before),false);assert.equal(refs.some(r=>h.checkIssued(r)),false);assert.deepEqual(h.draft(),draft)
 await h.connect();assert.equal(h.inspect().businessAuthorized,false);assert.equal((await h.save()).status,'not-admitted');refused(await h.connection().raw('readCaption',oldScope),'STALE_INSTANCE')
 await h.authorize();assert.equal(h.inspect().businessAdmission,true);assert.equal(refs.some(r=>h.checkIssued(r)),false);assert.deepEqual(h.draft(),draft)
 await h.close();unchanged(f.readAfterExit())
}))

test('FC04: late committed ACK is historical and cannot clean a new H epoch',async()=>scenario('FC04',async f=>{
 const h=await ready(f,'late-after-commit');h.edit('old epoch caption');const saving=h.save();await h.connection().waitForCut()
 const before=h.inspect();h.invalidate();h.edit('new epoch unsaved caption');const draft=h.draft();assert.ok(h.inspect().authorityEpoch>before.authorityEpoch)
 await h.connection().releaseCut();const result=await saving;assert.equal(result.status,'committed');assert.equal(result.current,false);assert.deepEqual(h.draft(),draft);assert.equal(h.inspect().businessAdmission,false)
 await h.close();const disk=f.readAfterExit(result.operationId);assert.equal(disk.caption.caption,'old epoch caption');assert.equal(disk.caption.effects,1);assert.equal(disk.receipts,1)
}))

test('FC05: independent cycle/shutdown holds and idempotent release preserve other gates',async()=>scenario('FC05',async f=>{
 const h=await ready(f),releaseCycle=h.hold('cycle'),releaseSecond=h.hold('cycle'),releaseShutdown=h.hold('shutdown')
 h.edit('held input');const draft=h.draft();assert.equal(h.inspect().state,'ready');assert.equal(h.inspect().holds,3);assert.equal((await h.save()).status,'not-admitted')
 releaseCycle();releaseCycle();assert.equal(h.inspect().holds,2);releaseSecond();assert.equal(h.inspect().holds,1);assert.equal(h.inspect().businessAdmission,false);assert.deepEqual(h.draft(),draft)
 releaseShutdown();assert.equal(h.inspect().holds,0);assert.equal(h.inspect().shuttingDown,true);assert.equal(h.inspect().businessAdmission,false);await assert.rejects(h.authorize(),{code:'LOCAL_AUTHORIZATION_BLOCKED'})
 await h.close();unchanged(f.readAfterExit())
}))

test('FC06: revoke closes local admission before ACK; raw new write and regrant remain denied',async()=>scenario('FC06',async f=>{
 const h=await ready(f);h.edit('revoked draft');const draft=h.draft(),reference=h.issue('receipt'),revoking=h.revoke()
 assert.equal(h.inspect().businessAuthorized,false);assert.equal(h.inspect().fence,'pending');assert.equal(h.checkIssued(reference),false);assert.equal((await h.save()).status,'not-admitted')
 assert.equal((await revoking).applied,true);assert.equal(h.inspect().fence,'acknowledged');assert.equal(h.inspect().fenceUnknown,false)
 refused(await h.connection().raw('commitCaption',{operationId:id(h,'raw-after-revoke'),payload:payload('denied')}),'REVOKED');await assert.rejects(h.authorize(),{code:'LOCAL_REVOKED'})
 h.setResourceUnknown(true);h.setResourceUnknown(false);assert.equal(h.inspect().businessAdmission,false);assert.deepEqual(h.draft(),draft)
 await h.close();unchanged(f.readAfterExit())
}))

test('FC07: commit before A revoke fence is retained, while H late result does not restore authorization',async()=>scenario('FC07',async f=>{
 const h=await ready(f);h.edit('committed before revoke');const saving=h.save(),revoking=h.revoke(),saved=await saving
 assert.equal(saved.status,'committed');assert.equal(saved.current,false);assert.equal((await revoking).applied,true);assert.equal(h.inspect().businessAdmission,false);assert.equal(h.draft().dirty,true)
 refused(await h.connection().raw('commitCaption',{operationId:id(h,'later'),payload:payload('denied','committed before revoke')}),'REVOKED')
 await h.close();const disk=f.readAfterExit(saved.operationId);assert.equal(disk.caption.effects,1);assert.equal(disk.receipts,1)
}))

test('FC08: lost applied-revoke ACK stays unknown across release, resource recovery and fresh attach',async()=>scenario('FC08',async f=>{
 const h=await ready(f,'after-revoke'),release=h.hold('cycle'),oldId=id(h,'old-revoked');const lost=h.revoke().then(()=>null,e=>e.code)
 assert.equal(h.inspect().fence,'pending');await h.connection().waitForCut();await h.connection().stopAtCut();assert.equal(await lost,'AUTHORITY_EXITED_ACK_UNKNOWN')
 release();h.setResourceUnknown(true);h.setResourceUnknown(false);assert.equal(h.inspect().fenceUnknown,true);assert.equal(h.inspect().holds,0);assert.equal(h.inspect().businessAdmission,false)
 await h.connect();assert.equal(h.inspect().businessAuthorized,false);assert.equal(h.inspect().fenceUnknown,true);await assert.rejects(h.authorize(),{code:'LOCAL_REVOKED'})
 refused(await h.connection().raw('commitCaption',{operationId:oldId,payload:payload('old denied')}),'STALE_OPERATION')
 refused(await h.connection().raw('commitCaption',{operationId:id(h,'new-ungranted'),payload:payload('new denied')}),'GRANT_REQUIRED')
 await h.close();unchanged(f.readAfterExit())
}))

test('FC09: before-COMMIT death leaves no rows but missing receipt remains unknown and draft is retained',async()=>scenario('FC09',async f=>{
 const h=await ready(f,'before-commit');h.edit('not acknowledged');const draft=h.draft(),saving=h.save(),cut=await h.connection().waitForCut();await h.connection().stopAtCut();const lost=await saving
 assert.equal(lost.status,'unknown');assert.deepEqual(h.draft(),draft);unchanged(f.readAfterExit(cut.operationId))
 await h.connect();assert.equal((await h.inspectOutcome(lost.operationId)).status,'unknown');assert.equal(h.inspect().unknownOperations,1);assert.deepEqual(h.draft(),draft)
 await assert.rejects(h.authorize(),{code:'LOCAL_OUTCOME_UNKNOWN'});refused(await h.connection().raw('commitCaption',{operationId:lost.operationId,payload:payload('not acknowledged')}),'STALE_OPERATION')
 assert.equal((await h.save()).status,'not-admitted');await h.close();unchanged(f.readAfterExit())
}))

test('FC10: post-COMMIT ACK loss is matched through fresh inspection without regrant or resubmit',async()=>scenario('FC10',async f=>{
 const h=await ready(f,'after-commit');h.edit('saved without ACK');const draft=h.draft(),saving=h.save();await h.connection().waitForCut();await h.connection().stopAtCut();const lost=await saving
 assert.equal(lost.status,'unknown');const disk=f.readAfterExit(lost.operationId);assert.equal(disk.caption.effects,1);assert.equal(disk.receipts,1)
 await h.connect();const known=await h.inspectOutcome(lost.operationId);assert.equal(known.status,'committed');assert.equal(known.current,false);assert.equal(h.inspect().unknownOperations,0);assert.equal(h.inspect().businessAuthorized,false);assert.deepEqual(h.draft(),draft)
 refused(await h.connection().raw('commitCaption',{operationId:lost.operationId,payload:payload('saved without ACK')}),'STALE_OPERATION');assert.equal((await h.save()).status,'not-admitted')
 await h.close();assert.equal(f.readAfterExit().caption.effects,1)
}))

test('FC11: mismatched receipt cannot clean input; matching stored receipt can later prove historical commit',async()=>scenario('FC11',async f=>{
 const h=await ready(f,'mismatched-receipt');h.edit('receipt binding');const draft=h.draft(),result=await h.save()
 assert.equal(result.status,'unknown');assert.equal(result.code,'INVALID_RECEIPT');assert.equal(h.inspect().businessAdmission,false);assert.deepEqual(h.draft(),draft)
 assert.equal(f.readAfterExit(result.operationId).caption.effects,1);await h.connect();const known=await h.inspectOutcome(result.operationId)
 assert.equal(known.status,'committed');assert.notEqual(known.receipt.payloadDigest,'0'.repeat(64));assert.equal(known.current,false);assert.deepEqual(h.draft(),draft);assert.equal(h.inspect().businessAuthorized,false)
 await h.close();assert.equal(f.readAfterExit().receipts,1)
}))

test('FC12: optional caption baseline, COALESCE, CAS conflict and omitted-baseline digest remain distinct',async()=>scenario('FC12',async f=>{
 const h=await ready(f),c=h.connection(),firstId=id(h,'first'),first=await c.raw('commitCaption',{operationId:firstId,payload:payload('first')})
 assert.equal(first.ok,true);assert.equal(first.receipt.effects,1);assert.equal((await c.raw('commitCaption',{operationId:firstId,payload:payload('first')})).replayed,true)
 const mismatch=await c.raw('commitCaption',{operationId:firstId,payload:{assetId:CATALOG.assetId,caption:'first'}});refused(mismatch,'PAYLOAD_MISMATCH');assert.equal(Object.hasOwn(mismatch,'outcome'),false)
 const conflict=await c.raw('commitCaption',{operationId:id(h,'conflict'),payload:payload('conflict')});refused(conflict,'CAPTION_CONFLICT');assert.equal(conflict.outcome,'verified-no-effect')
 assert.equal((await c.raw('commitCaption',{operationId:id(h,'omitted'),payload:{assetId:CATALOG.assetId,caption:'unconditional'}})).ok,true)
 assert.equal((await c.raw('commitCaption',{operationId:id(h,'matched'),payload:payload('matched','unconditional')})).ok,true)
 h.edit('stale-base draft');const draft=h.draft(),failed=await h.save();assert.equal(failed.status,'verified-no-effect');assert.equal(failed.code,'CAPTION_CONFLICT');assert.deepEqual(h.draft(),draft);assert.equal(h.inspect().unknownOperations,0)
 await h.close();const disk=f.readAfterExit(firstId);assert.equal(disk.caption.caption,'matched');assert.equal(disk.caption.effects,3);assert.equal(disk.receipts,3);assert.equal(disk.receipt.caption,'first')
}))

test('FC13: acknowledged saved input advances baseline but later typing stays dirty',async()=>scenario('FC13',async f=>{
 const h=await ready(f,'late-after-commit');h.edit('submitted snapshot');const saving=h.save();await h.connection().waitForCut();h.edit('typed after submit');const sequence=h.draft().sequence
 await h.connection().releaseCut();const result=await saving;assert.equal(result.status,'committed');assert.equal(result.current,true);assert.equal(h.draft().sequence,sequence);assert.equal(h.draft().baseCaption,'submitted snapshot');assert.equal(h.draft().input,'typed after submit');assert.equal(h.draft().dirty,true)
 await h.close();assert.equal(f.readAfterExit().caption.effects,1)
}))

test('FC14: refresh failure after known commit preserves saved feedback and subsequent draft',async()=>scenario('FC14',async f=>{
 const h=await ready(f);h.edit('saved before refresh');const result=await h.save({refresh:()=>{h.edit('typed during refresh');throw Error('synthetic refresh unavailable')}})
 assert.equal(result.status,'committed');assert.equal(result.feedback,'refresh-unavailable');assert.equal(h.draft().baseCaption,'saved before refresh');assert.equal(h.draft().input,'typed during refresh');assert.equal(h.draft().dirty,true);assert.equal(h.inspect().unknownOperations,0)
 await h.close();const disk=f.readAfterExit(result.operationId);assert.equal(disk.caption.caption,'saved before refresh');assert.equal(disk.caption.effects,1);assert.equal(disk.receipts,1)
}))

test('FC15: malformed response on the live H channel closes admission, then fresh receipt inspection recovers evidence',async()=>scenario('FC15',async f=>{
 const h=await ready(f,'malformed-after-commit');h.edit('stored before malformed ACK');const draft=h.draft(),result=await h.save();assert.equal(result.status,'unknown');assert.equal(result.code,'INVALID_RESPONSE_FRAME');await h.connection().waitForExit()
 assert.equal(h.inspect().businessAdmission,false);assert.deepEqual(h.draft(),draft);assert.equal(f.readAfterExit(result.operationId).caption.effects,1)
 await h.connect();assert.equal((await h.inspectOutcome(result.operationId)).status,'committed');assert.equal(h.inspect().businessAuthorized,false);assert.deepEqual(h.draft(),draft)
 await h.close();assert.equal(f.readAfterExit().receipts,1)
}))

test('FC16: committed receipt and synthetic resource UNKNOWN are independent; resource recovery cannot undo revoke',async()=>scenario('FC16',async f=>{
 const h=await ready(f,'late-after-commit');h.edit('saved with separate resource state');const saving=h.save();await h.connection().waitForCut();h.setResourceUnknown(true);await h.connection().releaseCut();const saved=await saving
 assert.equal(saved.status,'committed');assert.equal(h.inspect().resourceUnknown,true);assert.equal(h.inspect().businessAdmission,false);assert.equal((await h.save()).status,'not-admitted')
 await h.revoke();h.setResourceUnknown(false);assert.equal(h.inspect().businessAdmission,false);assert.equal(h.inspect().fence,'acknowledged')
 await h.close();assert.equal(f.readAfterExit(saved.operationId).caption.effects,1)
}))

test('FC17: finite H/A receipt capacity refuses without purge; matching historical replay remains bounded',async()=>scenario('FC17',async f=>{
 const h=await ready(f);let first
 for(let i=0;i<PROFILE.receipts;i++){h.edit('bounded '+i);const result=await h.save();assert.equal(result.status,'committed');if(i===0)first=result}
 h.edit('overflow preserved');const draft=h.draft();assert.equal((await h.save()).status,'not-admitted');assert.deepEqual(h.draft(),draft)
 const overflow=await h.connection().raw('commitCaption',{operationId:id(h,'a-capacity'),payload:payload('overflow','bounded 15')});refused(overflow,'RECEIPT_CAPACITY');assert.equal(overflow.outcome,'verified-no-effect')
 const replay=await h.connection().raw('commitCaption',{operationId:first.operationId,payload:payload('bounded 0')});assert.equal(replay.replayed,true);assert.equal(replay.receipt.effects,1)
 await h.close();const disk=f.readAfterExit();assert.equal(disk.caption.effects,PROFILE.receipts);assert.equal(disk.receipts,PROFILE.receipts);assert.equal(disk.integrity,'ok')
}))

after(async()=>{
 const run=process.env.DAM_FACADE_RUN;if(!run)return;if(!/^run-\d{2}$/.test(run))throw Error('INVALID_EVIDENCE_RUN')
 const directory=path.resolve('.scratch/windows-control-facade-20261005',run),st=await fs.lstat(directory);if(!st.isDirectory()||st.isSymbolicLink())throw Error('INVALID_EVIDENCE_DIRECTORY')
 await fs.writeFile(path.join(directory,'results.json'),JSON.stringify({at:new Date().toISOString(),kind:'Owned synthetic H facade/catalog-reference/caption compatibility tracer only',parentRuntime:{electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,uv:process.versions.uv,platform:process.platform,release:os.release()},profile:PROFILE,cases,productionQualified:false,restoreAllowed:false,namespaceMetadataQualified:false,formalAdapterWired:false,computerUse:'NOT_RUN; previous Esc BLOCKED_UX_ACCEPTANCE remains',productBuild:'NOT_RUN'},null,2)+'\n',{flag:'wx'})
})
