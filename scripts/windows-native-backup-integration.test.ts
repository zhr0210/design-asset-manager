import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createExclusiveLibraryLockTracer} from '../src/main/library-lifecycle/exclusive-library-lock.tracer'
import {createHostSchemaMaintenance, type HostMaintenanceStorage} from '../src/main/library-lifecycle/host-schema-maintenance.internal'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {assertLibraryDataSchema} from '../src/main/library-lifecycle/library-materialization.internal'
import {inspectLibraryControlStore} from '../src/main/library-lifecycle/library-open-control-store.internal'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
import {readBackgroundAnalysis} from '../src/main/background-analysis/background-analysis-storage'
import {withTagIntentGrowthCap, type TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
import {ActiveLibraryHostError} from '../src/shared/contracts/active-library.contract'
import {runNativeBackupTracer} from './fixtures/windows-backup-native-harness'
import {verifyLibraryBackupSnapshot} from '../src/main/library-lifecycle/library-backup-snapshot.internal'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {prepareWindowsBackupLifecycle} from '../src/main/platform/windows-backup-lifecycle.internal'
import {captureWindowsBackupConnection, validateWindowsBackupSource, requireWindowsBackupSpace, recheckWindowsBackupSource, type WindowsBackupSourceEvidence} from '../src/main/platform/windows-backup-source.internal'
import {serializeWindowsBackupBinding, inspectWindowsBackupRecovery, type WindowsBackupBinding} from '../src/main/platform/windows-backup-recovery.internal'
import {prepareWindowsBackupHelper} from './fixtures/windows-backup-helper-process'
import {prepareWindowsBackupVfs, prepareWindowsBackupVfsConnection, pinWindowsBackupVfsSource, requireWindowsBackupVfsMatch, type WindowsBackupVfsPin} from './fixtures/windows-backup-vfs'
import {prepareWindowsBackupJournalVfs, openWindowsBackupJournalSource} from './fixtures/windows-backup-journal-vfs'
import {writeWindowsBackupCommitMarker, inspectWindowsBackupSourceCommit} from '../src/main/platform/windows-backup-commit.internal'
await prepareWindowsBackupHelper()
await prepareWindowsBackupVfs()
assert.equal(process.env.SQLITE_USE_URI,'1','Use the isolated Windows backup pathname runner')
await prepareWindowsBackupJournalVfs()

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
const MAX_IMAGE=1024*1024

/** Real SQLite, exclusive lease and maintenance module; private synthetic storage only. */
async function fixture(mode:'normal'|'cancel'|'ddl-failure'|'ram-denied'|'ack-uncertain'|'source-changed'){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-target-'))),directory=path.join(root,'library')
 const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory}),selectLocalFiles:async()=>({kind:'cancelled'})}))
 const created=await host.prepareCreate();assert.equal(created.kind,'planned');if(created.kind!=='planned')throw Error('fixture create')
 await host.confirmCreate(created.plan.receipt);const state=host.inspect();await host.close()
 const control=path.join(directory,'.dam'),file=path.join(control,'library.sqlite')
 const declaration=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(control,'library.manifest.json'))));if(declaration.kind!=='compatible')throw Error('fixture manifest')
 const authority=createExclusiveLibraryLockTracer({controlDirectory:control,libraryIdentity:state.identity!,libraryGeneration:state.generation!})
 const acquired=await authority.acquire();if(acquired.kind!=='acquired')throw Error('fixture lease')
 const journalSource=await openWindowsBackupJournalSource(control)
 const db=journalSource.db;db.pragma('foreign_keys=ON')
 await prepareWindowsBackupVfsConnection(db)
 assert.equal(journalSource.receipt().created,0,'named VFS is active before source business SQL')
 const active={root:directory,control,database:db,identity:state.identity!,generation:state.generation!,notebookSession:'native-test-session',manifestDeclaration:declaration.declaration,lock:acquired.lock}
 const abort=new AbortController(),admission=createVisualAdmission(),hold=admission.hold()
 let receipt:any,image:Buffer|undefined,serialized=0,commitReached=false,finished:boolean|undefined,binding:WindowsBackupBinding|undefined
 let sourceBefore:WindowsBackupSourceEvidence|undefined,sourceRecheck:(()=>Promise<WindowsBackupSourceEvidence>)|undefined
 let vfsPin:WindowsBackupVfsPin|undefined
 const hooks:TagIntentTestHooks={afterBackup:async()=>{
  assert.equal(acquired.lock.lease.inspect().state,'held');assert.equal((await authority.acquire()).kind,'busy')
  await assert.rejects(fs.rename(path.join(control,'schema-backups'),path.join(control,'moved')),/EBUSY|EPERM|EACCES/)
  await assert.rejects(fs.rename(file,path.join(control,'replaced.sqlite')),/EBUSY|EPERM|EACCES/,'retained source denies deletion/replacement')
  if(mode==='cancel')abort.abort()
  if(mode==='source-changed')db.exec("INSERT INTO tags(id,name,created_at,updated_at) VALUES('synthetic-change','changed','synthetic','synthetic')")
 },afterDdl:()=>{commitReached=true;assert.ok(admission.inspect().materialBytes>0);if(mode==='ddl-failure')throw Error('SYNTHETIC_DDL_FAILURE')},afterCommit:()=>{if(mode==='ack-uncertain')throw Error('SYNTHETIC_ACK_LOST')}}
 const storage:HostMaintenanceStorage={prepareBackup:async(a,check,signal)=>{
  check();assert.equal(a.database,db);assert.equal(db.inTransaction,false);assert.equal(db.pragma('journal_mode',{simple:true}),'delete')
  const connection=captureWindowsBackupConnection(db,control),{pages,pageSize}=connection,bytes=pages*pageSize
  assert.ok(Number.isSafeInteger(bytes)&&bytes>0&&bytes<=MAX_IMAGE)
  const lifetime=await prepareWindowsBackupLifecycle({hold,imageBytes:bytes,signal:signal??abort.signal,
   ...(mode==='ram-denied'?{readMemory:()=>({free:0,total:1024**3})}:{}),
   createImage:async()=>{
    vfsPin=await pinWindowsBackupVfsSource(db,control)
    check();serialized++;image=db.serialize();validateWindowsBackupSource(vfsPin.before,connection,image)
    return image
   },
   verifyImage:(snapshot,hash)=>{verifyLibraryBackupSnapshot(snapshot,{declaration:a.manifestDeclaration,generation:a.generation,schemaVersion:1,nativeReadbackSha256:hash})},
   runTarget:async(snapshot,whileHeld)=>{
    let decision:number|undefined
    receipt=await runNativeBackupTracer({directory:control,mode:'source-hold',image:snapshot,onSource:source=>{
     check();sourceBefore=source;requireWindowsBackupVfsMatch(vfsPin!.recheck(),source)
     const policy=validateWindowsBackupSource(source,connection,snapshot);requireWindowsBackupSpace(source,policy.beforeBackup)
     recheckWindowsBackupSource(source,source,connection,captureWindowsBackupConnection(db,control),db.serialize())
     binding={format:1,operation:'snapshot-op',library:a.identity,lineage:a.manifestDeclaration.lineageIdentity,controlStore:a.manifestDeclaration.controlStoreIdentity,generation:a.generation,source,connection,imageSha256:sha(snapshot)}
     return serializeWindowsBackupBinding(binding)
    },whileHeld:async(hash,recheckSource)=>{sourceRecheck=recheckSource;decision=await whileHeld(hash);return decision}})
    if(receipt.Outcome!=='target-verified'&&!(decision===0&&receipt.Reason==='CANCELLED_WHILE_HELD'))throw Error('BACKUP_TARGET_RECEIPT_REFUSED')
   }
  }).catch(error=>{vfsPin?.close();throw error})
  try{
   await hooks.afterBackup?.();check();lifetime.checkHeld()
   assert.ok(sourceBefore&&sourceRecheck)
   const sourceAfter=await sourceRecheck();check();lifetime.checkHeld()
   requireWindowsBackupVfsMatch(vfsPin!.recheck(),sourceAfter)
   recheckWindowsBackupSource(sourceBefore,sourceAfter,connection,captureWindowsBackupConnection(db,control),db.serialize())
   // Source recheck on the actual connection before maintenance may enter DDL.
   if(sha(db.serialize())!==sha(image!))throw Error('TAG_INTENT_SOURCE_CHANGED')
   assert.equal(db.pragma('user_version',{simple:true}),1)
   return{pageCap:pages+Math.floor(4*1024*1024/pageSize),recordCommit:()=>writeWindowsBackupCommitMarker(db,{binding:binding!,targetSchemaVersion:12}),
    finish:async(committed)=>{finished=committed;try{await lifetime.finish(committed)}finally{vfsPin?.close()}}}
  }catch(error){try{await lifetime.finish(false)}finally{vfsPin?.close()}throw error}
 },withGrowthCap:withTagIntentGrowthCap}
 let tail:Promise<unknown>=Promise.resolve()
 const enqueue=<T>(operation:()=>Promise<T>)=>{const next=tail.then(operation,operation);tail=next.catch(()=>{});return next}
 const claims=new Map(),ocrAuthority={claims:new Map()}
 const module=createHostSchemaMaintenance({current:()=>({binding:active,state:'ready',businessSuspended:false}),enqueueLifecycle:enqueue,inFlight:()=>[],run:async operation=>operation(active),quarantine:()=>{throw Error('unexpected quarantine')},stateError:()=>new ActiveLibraryHostError('library-recovery-required','fixture'),hostError:code=>new ActiveLibraryHostError(code,code),executionBinding:a=>({...a,leaseIdentity:acquired.lock.lease.inspect().leaseIdentity,claims}),ocrBinding:a=>({...a,ocrAuthority}),ocrAuthority,hooks},storage)
 const scope={libraryIdentity:active.identity,generation:active.generation},view=readBackgroundAnalysis(active,scope)
 const input={...scope,sessionToken:view.sessionToken,expectedRevision:view.policy.revision,expectedSchemaVersion:view.schemaVersion,allowUpgrade:true,enabled:false,capabilities:{tags:false,caption:false,ocr:false}}
 return{root,control,db,module,input,abort,journalSource,get binding(){return binding},get image(){return image},get serialized(){return serialized},get reserved(){return admission.inspect().materialBytes},get commitReached(){return commitReached},get finished(){return finished},get receipt(){return receipt},close:async()=>{await tail;hold();journalSource.close();await acquired.lock.release();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-target-'));await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100})},declaration:declaration.declaration}
}

for(const mode of ['normal','cancel','ddl-failure','ram-denied','ack-uncertain','source-changed']as const)await test('native target / actual SQLite lease / maintenance: '+mode,async()=>{
 const f=await fixture(mode)
 try{
  if(mode==='normal'){
   const result=await f.module.configureBackgroundAnalysis(f.input,f.abort.signal);assert.equal(result.schemaVersion,12);assert.equal(result.policy.enabled,false);assert.equal(f.commitReached,true);assert.equal(f.finished,true)
  }else{
   await assert.rejects(f.module.configureBackgroundAnalysis(f.input,f.abort.signal),mode==='cancel'?/BACKGROUND_SCOPE_EXPIRED/:mode==='ack-uncertain'?/TAG_INTENT_ACK_UNCERTAIN/:/BACKGROUND_STORAGE_FAILED/)
   assert.equal(f.db.pragma('user_version',{simple:true}),mode==='ack-uncertain'?12:1);assert.equal(f.commitReached,mode==='ddl-failure'||mode==='ack-uncertain')
   if(mode==='ack-uncertain')assert.equal(f.finished,true,'lost acknowledgement is not rollback')
   if(mode==='ddl-failure')assert.equal(f.finished,false)
  }
  const r=f.receipt;assert.equal(f.reserved,0,'maintenance awaits actual child close')
  if(mode==='ram-denied'){assert.equal(f.serialized,0);assert.equal(r,undefined);await assert.rejects(fs.access(path.join(f.control,'schema-backups')));return}
  const committed=mode==='normal'||mode==='ack-uncertain'
  assert.equal(r.ProductionQualified,false);assert.equal(r.Outcome,committed?'target-verified':'refused');if(!committed)assert.equal(r.Reason,'CANCELLED_WHILE_HELD')
  assert.deepEqual(r.FlushOrder,['binding-file','backing-status-file','backing-operation','backing-parent','backing-control','file','status-file','operation','parent','control','finish-status-file','finish-operation','finish-parent','finish-control'])
  const operation=path.join(f.control,'schema-backups','snapshot-op'),bytes=await fs.readFile(path.join(operation,'library.sqlite'));assert.equal(sha(bytes),sha(f.image!))
  const checked=new Database(bytes,{readonly:true})
  try{
   assert.equal(checked.pragma('quick_check',{simple:true}),'ok');assert.equal(checked.pragma('user_version',{simple:true}),1);assertLibraryDataSchema(checked)
   checked.pragma('query_only=ON')
   verifyLibraryBackupSnapshot(bytes,{declaration:f.declaration,generation:f.input.generation,schemaVersion:1,nativeReadbackSha256:r.Hash})
   // Serialized verification is private; the file-backed DELETE gate remains.
   assert.equal(checked.pragma('journal_mode',{simple:true}),'memory')
   assert.equal(checked.transaction(()=>inspectLibraryControlStore(checked,f.declaration))().kind,'recovery-required')
  }finally{checked.close()}
  // Test-owned retrieval after native release, separately from confined writing.
  const target=openReadonlyLibraryDatabase(path.join(operation,'library.sqlite'))
  try{const inspection=target.transaction(()=>inspectLibraryControlStore(target,f.declaration))();assert.equal(inspection.kind,'compatible');if(inspection.kind==='compatible')assert.equal(inspection.generation,f.input.generation)}finally{target.close()}
  const status=JSON.parse(await fs.readFile(path.join(operation,'status-verified.json'),'utf8'));assert.equal(status.phase,'tracer-target-verified');assert.equal(status.productionQualified,false);assert.equal(status.imageSha256,sha(bytes))
  const finish=JSON.parse(await fs.readFile(path.join(operation,'status-finished.json'),'utf8'));assert.equal(finish.mainDeclaredCommitted,committed);assert.equal(finish.productionQualified,false)
  assert.equal(f.db.pragma('quick_check',{simple:true}),'ok');assertLibraryDataSchema(f.db)
  const journal=f.journalSource.receipt()
  if(mode==='normal'||mode==='ack-uncertain'||mode==='ddl-failure'){
   assert.ok(journal.created>0,'actual maintenance used the owned journal VFS')
   assert.equal(journal.created,journal.deleted,'commit and rollback delete the retained journal handle')
   assert.equal(journal.journalRetained,false)
  }
  assert.equal(journal.productionQualified,false)
  const retrieval=await runNativeBackupTracer({directory:f.control,mode:'bound-retrieve',image:f.image!})
  assert.equal(retrieval.Outcome,'retrieved-content',retrieval.Reason);assert.deepEqual(retrieval.FlushOrder,[])
  const recovered=inspectWindowsBackupRecovery({binding:retrieval.Binding,backing:retrieval.Backing,verified:retrieval.Verified,finished:retrieval.Finished,imageSha256:retrieval.Hash},f.binding!)
  assert.equal(recovered.kind,committed?'commit-claimed':'cancelled');assert.equal(recovered.sourceCommit,'unproven');assert.equal(recovered.restoreAllowed,false)
  // Restart-style source proof is independent from the untrusted finished claim.
  const readonlySource=await openWindowsBackupJournalSource(f.control,true)
  const sourceDb=readonlySource.db
  await prepareWindowsBackupVfsConnection(sourceDb)
  let sourcePin:WindowsBackupVfsPin|undefined
  try{
   sourcePin=await pinWindowsBackupVfsSource(sourceDb,f.control)
   const proof=sourceDb.transaction(()=>inspectWindowsBackupSourceCommit(sourceDb,{binding:f.binding!,targetSchemaVersion:12},sourcePin.recheck()))()
   assert.equal(proof.sourceCommit,committed?'recorded-commit':'unproven')
   assert.equal(proof.productionQualified,false);assert.equal(proof.restoreAllowed,false)
  }finally{sourcePin?.close();readonlySource.close()}
 }finally{await f.close()}
})
