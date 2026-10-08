import {build} from 'esbuild'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import {pathToFileURL} from 'node:url'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
import {registerActiveLibraryIpc} from '../src/main/ipc/active-library.ipc'
import {CHANNEL_LIBRARY_CLOSE,CHANNEL_LIBRARY_REOPEN,CHANNEL_LIBRARY_OPEN} from '../src/shared/contracts/active-library.contract'
import Database from 'better-sqlite3'
import {createHash} from 'node:crypto'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createVisualAiController} from '../src/main/visual-ai/visual-ai-controller'
import {createTagExecutionController} from '../src/main/independent-tags/tag-execution-controller'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import type {VisionProvider} from '../src/main/visual-ai/openai-vision.provider'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {test} from 'node:test'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'

async function fixture(hooks:TagIntentTestHooks={}){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-execution-'))),library=path.join(root,'library'),source=path.join(root,'generated.png')
 await sharp({create:{width:120,height:100,channels:3,background:'#7799bb'}}).png().toFile(source)
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}),tagIntentTestHooks:hooks})
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
 const asset=(await host.listAssets())[0],s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!,assetId:asset.id},context=await host.readTagIntentContext(scope)
 const intent={...scope,sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:true,requestId:'synthetic-tags-one',assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:'synthetic',model:'synthetic-model',backendBindingSha256:createHash('sha256').update(JSON.stringify({baseUrl:'http://127.0.0.1:1/v1',type:'openai-compatible',model:'synthetic-model',vision:true})).digest('hex'),recipeId:'independent-tags-v1',recipeVersion:'1'}
 await host.saveTagIntent(intent)
 return{root,library,dbFile:path.join(library,'.dam','library.sqlite'),hooks,host,asset,scope,intent,close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
await test('explicit execution upgrade creates one claim-fenced durable tag effect and same-scope duplicate receipt',async()=>{
 const f=await fixture()
 try{
  const host=f.host as any
  assert.equal(typeof host.enableTagExecution,'function','Production Host must expose the explicitly reviewed execution boundary')
  const context=await f.host.readTagIntentContext(f.scope)
  await host.enableTagExecution({...f.scope,sessionToken:context.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(host,{...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  const commit={...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['蓝色','海报']}
  const receipt=await host.commitTagExecution(commit)
  assert.equal(receipt.historicalOnly,false)
  assert.deepEqual((await host.readTagExecution(f.scope)).current.tags,['蓝色','海报'])
  assert.deepEqual(await host.commitTagExecution({...commit,attemptToken:'expired-compute-token'}),receipt)
  await assert.rejects(host.commitTagExecution({...commit,tags:['different']}))
  await f.host.close();await f.host.reopen()
  assert.deepEqual((await host.readTagExecution(f.scope)).current.tags,['蓝色','海报'])
  await assert.rejects(host.commitTagExecution(commit))
 }finally{await f.close()}
})

for(const newest of ['succeeded','failed'] as const)await test(`late combined result stays historical-only after newer tags ${newest}`,async()=>{
 const f=await fixture(),host=f.host
 try{
  const c=await host.readTagIntentContext(f.scope)
  await host.enableTagExecution({...f.scope,sessionToken:c.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const first=await startClaim(host,{...f.scope,sessionToken:c.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  await host.commitTagExecution({...f.scope,sessionToken:c.sessionToken,requestId:f.intent.requestId,attemptToken:first.attemptToken,tags:['先前已提交']})
  await host.updateAssetCaption(f.asset.id,'User caption')
  await host.saveTagIntent({...f.intent,expectedSchemaVersion:10,requestId:'combined-old',recipeId:'visual-ai-v1'})
  const old=await startClaim(host,{...f.scope,sessionToken:c.sessionToken,requestId:'combined-old',inputSha256:'c'.repeat(64),origin:'combined'})
  await host.saveTagIntent({...f.intent,expectedSchemaVersion:10,requestId:'tags-new'})
  const latest=await startClaim(host,{...f.scope,sessionToken:c.sessionToken,requestId:'tags-new',inputSha256:'d'.repeat(64),origin:'tags-only'})
  if(newest==='succeeded')await host.commitTagExecution({...f.scope,sessionToken:c.sessionToken,requestId:'tags-new',attemptToken:latest.attemptToken,tags:['最新标签']})
  else await host.finishTagExecution({...f.scope,sessionToken:c.sessionToken,requestId:'tags-new',attemptToken:latest.attemptToken,state:'failed',errorCode:'TAG_OUTPUT_INVALID'})
  const evidence={id:'historical-combined',assetId:f.asset.id,assetRevision:f.asset.revision,previewGeneration:f.asset.thumbnailRef,inputSha256:'c'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',purpose:'analyze' as const,inputScope:'controlled-preview-rgb' as const,recipe:'visual-ai-v1' as const,createdAt:new Date().toISOString(),output:{caption:'Late AI caption',prompt:'Complete historical prompt',ocrText:'',tags:['旧在途标签']}}
  const input={...f.scope,sessionToken:c.sessionToken,requestId:'combined-old',attemptToken:old.attemptToken,tags:evidence.output.tags,combinedEvidence:evidence}
  const receipt=await host.commitTagExecution(input)
  assert.equal(receipt.historicalOnly,true);assert.equal(receipt.tagEvidenceId,null)
  assert.deepEqual(await host.commitTagExecution(input),receipt)
  assert.deepEqual((await host.readTagExecution(f.scope)).current?.tags,newest==='succeeded'?['最新标签']:['先前已提交'])
  assert.deepEqual((await host.listVisualAiEvidence(f.asset.id))[0].output.tags,['旧在途标签'])
  assert.equal((await host.listAssets())[0].aiCaption,'User caption')
  await assert.rejects(host.confirmVisualAiTag(f.asset.id,evidence.id,'旧在途标签'))
 }finally{await f.close()}
})
await test('missing session, cancelled signal and expired claim never create tag effects',async()=>{
 const f=await fixture(),host=f.host
 try{
  const c=await host.readTagIntentContext(f.scope)
  await host.enableTagExecution({...f.scope,sessionToken:c.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const input={...f.scope,sessionToken:c.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only' as const}
  await assert.rejects(startClaim(host,{...input,sessionToken:undefined} as any))
  const claim=await startClaim(host,input)
  const commit={...f.scope,sessionToken:c.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['蓝色']}
  await assert.rejects(host.commitTagExecution({...commit,attemptToken:'invented'}))
  const abort=new AbortController();abort.abort();await assert.rejects(host.commitTagExecution(commit,abort.signal))
  assert.equal((await host.readTagExecution(f.scope)).current,null)
  await host.finishTagExecution({...input,attemptToken:claim.attemptToken,state:'cancelled'})
  await assert.rejects(host.commitTagExecution(commit))
  assert.equal((await host.readTagExecution(f.scope)).current,null)
 }finally{await f.close()}
})

async function startClaim(host:any,input:any){const claim=await host.claimTagExecution(input);await host.markTagExecutionSent({...input,attemptToken:claim.attemptToken});return claim}

async function eventually<T>(read:()=>T|Promise<T>,done:(v:T)=>boolean):Promise<T>{for(let i=0;i<500;i++){const v=await read();if(done(v))return v;await new Promise(r=>setTimeout(r,10))}throw Error('Synthetic task did not settle')}
function controllers(f:Awaited<ReturnType<typeof fixture>>,provider:VisionProvider,changed=()=>{}){
 const settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{id:'synthetic',name:'Synthetic service',type:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:1/v1',defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}]
 const admission=createVisualAdmission(),legacy=createVisualAiController({host:f.host,settings:()=>settings,admission,provider,onChanged:changed})
 const tags=createTagExecutionController({host:f.host,settings:()=>settings,admission,legacy,provider,changed})
 return{admission,legacy,tags,settings,close:async()=>{await Promise.all([tags.suspendAndDrain(),legacy.suspendAndDrain()]);admission.invalidate()}}
}
await test('production tag controller freezes a reviewed preview, revokes legacy receipts at cutover and survives lost notification',async()=>{
 const f=await fixture();let calls=0
 const c=controllers(f,{invokeOnce:async()=>{calls++;return{choices:[{finish_reason:'stop',message:{content:JSON.stringify({tags:['蓝色',' Adobe ','adobe']})}}]}}},()=>{throw Error('synthetic notification loss')})
 try{
  await f.host.updateAssetCaption(f.asset.id,'User description')
  const old=await c.legacy.prepare('main',{libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation,assetIds:[f.asset.id],backendId:'synthetic',purpose:'analyze'})
  const review=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId})
  assert.equal(calls,0);assert.match(review.storageNotice,/v10/);assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,9)
  const job=await c.tags.run('main',review.receipt)
  await assert.rejects(c.tags.run('main',review.receipt))
  const finished=await eventually(()=>c.tags.inspect('main',job.id),j=>!['queued','running'].includes(j.state));assert.equal(finished.state,'succeeded',finished.error)
  assert.equal(calls,1);await assert.rejects(c.legacy.run('main',old.receipt))
  const snapshot=await c.tags.read('main',f.scope);assert.deepEqual(snapshot.current?.tags,['蓝色','Adobe'])
  assert.equal((await f.host.listAssets())[0].aiCaption,'User description')
  assert.equal((await f.host.readTagOutbox({...f.scope,sessionToken:snapshot.sessionToken})).length,1)
  const reread=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});assert.equal(reread.alreadySucceeded,true)
  assert.equal((await c.tags.run('main',reread.receipt)).state,'succeeded');assert.equal(calls,1)
  await eventually(()=>c.admission.inspect(),s=>s.materialBytes===0);assert.equal(c.admission.inspect().requests,0)
 }finally{await c.close();await f.close()}
})
await test('v10 seeds the real prior combined source and preserves confirmed/rejected choices',async()=>{
 const f=await fixture()
 try{
  const e={id:'old-seed',assetId:f.asset.id,assetRevision:f.asset.revision,previewGeneration:f.asset.thumbnailRef,inputSha256:'b'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',purpose:'analyze' as const,inputScope:'controlled-preview-rgb' as const,recipe:'visual-ai-v1' as const,createdAt:new Date().toISOString(),output:{caption:'Caption',prompt:'Prompt',ocrText:'',tags:['蓝色','拒绝','待确认']}}
  await f.host.saveVisualAiEvidence(e);await f.host.confirmVisualAiTag(f.asset.id,e.id,'蓝色')
  const db=new Database(f.dbFile);db.prepare("UPDATE tag_suggestions SET status='rejected' WHERE tag_name='拒绝'").run();db.close()
  const c=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:c.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const current=(await f.host.readTagExecution(f.scope)).current!
  assert.equal(current.originalVisualEvidenceId,e.id);assert.equal(current.requestGeneration,0);assert.deepEqual(current.tags,['蓝色','待确认']);assert.deepEqual(current.pendingTags,['待确认'])
  await assert.rejects(f.host.confirmVisualAiTag(f.asset.id,e.id,'待确认'))
  await f.host.decideTag({...f.scope,sessionToken:c.sessionToken,expectedSchemaVersion:10,allowUpgrade:false,evidenceId:current.evidenceId,tag:'待确认',decision:'confirm'});assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.pendingTags,[])
  await f.host.close();await f.host.reopen();assert.equal((await f.host.readTagExecution(f.scope)).current?.originalVisualEvidenceId,e.id)
 }finally{await f.close()}
})
await test('outbox insertion fault rolls back the whole tag effect and allows the same response to be committed once',async()=>{
 const f=await fixture()
 try{
  const s=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:s.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  const input={...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['标签']}
  const db=new Database(f.dbFile)
  try{
   db.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON independent_tag_outbox BEGIN SELECT RAISE(ABORT,'fixture'); END")
   await assert.rejects(f.host.commitTagExecution(input));assert.equal((await f.host.readTagExecution(f.scope)).current,null)
   assert.equal(db.prepare('SELECT COUNT(*) FROM independent_tag_evidence').pluck().get(),0);assert.equal(db.prepare('SELECT COUNT(*) FROM independent_tag_effect_receipts').pluck().get(),0)
   assert.equal((await f.host.readTagExecution(f.scope)).jobs[0].state,'running')
   db.exec('DROP TRIGGER synthetic_failure');await f.host.commitTagExecution(input);await f.host.commitTagExecution(input)
   assert.equal(db.prepare('SELECT COUNT(*) FROM independent_tag_outbox').pluck().get(),1)
  }finally{db.close()}
 }finally{await f.close()}
})
await test('business suspension denies new effects and user edits but allows only bounded finish records and session inspection',async()=>{
 const f=await fixture()
 try{
  const s=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:s.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  const release=f.host.holdBusinessAdmission(),other=f.host.holdBusinessAdmission()
  await assert.rejects(f.host.updateAssetCaption(f.asset.id,'blocked'))
  await assert.rejects(f.host.commitTagExecution({...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['blocked']}))
  await f.host.finishTagExecution({...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,state:'outcome-unknown'})
  assert.equal((await f.host.readVisualSession(f.scope)).sessionToken,s.sessionToken)
  release();release();await assert.rejects(f.host.updateAssetCaption(f.asset.id,'still blocked'));other()
  assert.equal((await f.host.readTagExecution(f.scope)).jobs[0].state,'outcome-unknown');assert.equal((await f.host.readTagExecution(f.scope)).current,null)
  await f.host.close();await assert.rejects(f.host.finishTagExecution({...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,state:'cancelled'}))
 }finally{await f.close()}
})

await test('legacy v10 network failure after send is unknown, not safe-to-resend failure',async()=>{
 const f=await fixture();let calls=0;const c=controllers(f,{invokeOnce:async()=>{calls++;throw new TypeError('synthetic socket reset')}})
 try{
  const session=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:session.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const review=await c.legacy.prepare('main',{libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation,assetIds:[f.asset.id],backendId:'synthetic',purpose:'analyze'})
  const job=await c.legacy.run('main',review.receipt);await eventually(()=>c.legacy.inspect('main',job.id),j=>!['running','queued'].includes(j.state))
  assert.equal(calls,1);assert.equal((await f.host.readTagExecution(f.scope)).jobs[0].state,'outcome-unknown')
 }finally{await c.close();await f.close()}
})
await test('legacy v10 deadline while waiting for a slot is not recorded as remote unknown',async()=>{
 const f=await fixture();let calls=0,release!:()=>void;const gate=new Promise<void>(r=>{release=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;throw Error('must not send')}});c.settings.aiBackends![0].timeoutMs=1000
 const blockers:any[]=[],holding:Promise<unknown>[]=[]
 try{
  const session=await f.host.readVisualSession(f.scope),context=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:session.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  for(let i=0;i<2;i++){const lease=c.admission.open('block-'+i,session);blockers.push(lease);await lease.prepare(f.asset.id,()=>f.host.readVisualPreview({...f.scope,sessionToken:session.sessionToken,assetRevision:context.asset.revision,previewGeneration:context.asset.previewGeneration}));lease.consume();holding.push(lease.withRequest(f.asset.id,'combined',new AbortController().signal,async()=>gate))}
  const review=await c.legacy.prepare('main',{libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation,assetIds:[f.asset.id],backendId:'synthetic',purpose:'analyze'})
  const job=await c.legacy.run('main',review.receipt);await eventually(()=>c.legacy.inspect('main',job.id),j=>!['running','queued'].includes(j.state))
  assert.equal(calls,0);assert.equal((await f.host.readTagExecution(f.scope)).jobs[0].state,'failed')
 }finally{release();await Promise.allSettled(holding);for(const l of blockers)l.dispose();await c.close();await f.close()}
})

for(const cut of ['afterDdl','beforeCommit','afterCommit'] as const)await test(`v10 activation ${cut} fault preserves the correct committed schema and writer mode`,async()=>{
 const f=await fixture(),c=controllers(f,{invokeOnce:async()=>{throw Error('must not infer during migration failure')}})
 try{
  f.hooks[cut]=()=>{throw Error('synthetic migration cut')}
  const r=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId}),job=await c.tags.run('main',r.receipt)
  await eventually(()=>c.tags.inspect('main',job.id),j=>!['queued','running'].includes(j.state))
  const version=(await f.host.readTagIntentContext(f.scope)).schemaVersion;assert.equal(version,cut==='afterCommit'?10:9)
  if(cut==='afterCommit')await assert.rejects(f.host.saveVisualAiEvidence({id:'forbidden-old',assetId:f.asset.id,assetRevision:f.asset.revision,previewGeneration:f.asset.thumbnailRef,inputSha256:'b'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',purpose:'analyze',inputScope:'controlled-preview-rgb',recipe:'visual-ai-v1',createdAt:new Date().toISOString(),output:{caption:'',ocrText:'',prompt:'complete',tags:['must not write']}}))
  assert.equal((await f.host.readTagExecution(f.scope)).current,null)
  assert.equal(c.admission.inspect().accepting,true,'Certain v9 rollback or known v10 may resume, never old writer on v10')
 }finally{delete f.hooks[cut];await c.close();await f.close()}
})
await test('postcommit restoration failure quarantines v10 and never sends an inference request',async()=>{
 const f=await fixture();let calls=0,once=true;const c=controllers(f,{invokeOnce:async()=>{calls++;throw Error('must not infer')}}),original=Database.prototype.pragma
 try{
  Database.prototype.pragma=function(sql:string,options?:any):any{if(once&&sql.startsWith('cache_spill = ')&&!sql.endsWith('OFF')){once=false;throw Error('native restoration failure')}return original.call(this,sql,options)}
  const r=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId}),job=await c.tags.run('main',r.receipt)
  await eventually(()=>f.host.inspect().state,s=>s==='recovery-required')
  await assert.rejects(c.legacy.prepare('main',{libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation,assetIds:[f.asset.id],backendId:'synthetic',purpose:'analyze'}))
  assert.equal(calls,0)
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.pragma('user_version',{simple:true}),10);assert.equal(db.prepare('SELECT COUNT(*) FROM independent_tag_executions').pluck().get(),0)}finally{db.close()}
  await assert.rejects(f.host.updateAssetCaption(f.asset.id,'not allowed'))
 }finally{Database.prototype.pragma=original;await c.close();await f.close()}
})
await test('authority IPC serializes the complete will-change/operation/did-change cycle',async()=>{
 const f=await fixture(),handlers=new Map<string,any>(),events:string[]=[];let count=0,release!:()=>void,entered!:()=>void
 const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r})
 registerActiveLibraryIpc({host:f.host,isTrustedSender:()=>true,onAuthorityWillChange:async()=>{events.push('will'+(++count));if(count===1){entered();await gate}},onAuthorityDidChange:()=>{events.push('did'+count)}},(channel,handler)=>{handlers.set(channel,handler)})
 try{
  const closing=handlers.get(CHANNEL_LIBRARY_CLOSE)({});await started
  const reopening=handlers.get(CHANNEL_LIBRARY_REOPEN)({});await new Promise(r=>setImmediate(r));assert.deepEqual(events,['will1'])
  release();assert.equal((await closing).success,true);assert.equal((await reopening).success,true);assert.deepEqual(events,['will1','did1','will2','did2'])
  assert.equal(f.host.inspect().state,'ready')
 }finally{release();await f.close()}
})
await test('failed authority operation while ready restores admission but never revives old receipts',async()=>{
 const f=await fixture(),handlers=new Map<string,any>(),c=controllers(f,{invokeOnce:async()=>{throw Error('not expected')}})
 let sharedRelease:(()=>void)|undefined,businessRelease:(()=>void)|undefined
 registerActiveLibraryIpc({host:f.host,isTrustedSender:()=>true,onAuthorityWillChange:async()=>{sharedRelease=c.admission.hold();businessRelease=f.host.holdBusinessAdmission();await Promise.all([c.legacy.suspendAndDrain(),c.tags.suspendAndDrain()])},onAuthorityDidChange:async()=>{try{if(f.host.inspect().state==='ready'){await f.host.readVisualSession(f.scope);c.legacy.resume();c.tags.resume()}}finally{businessRelease?.();sharedRelease?.()}}},(name,handler)=>{handlers.set(name,handler)})
 try{
  const old=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId})
  const failed=await handlers.get(CHANNEL_LIBRARY_OPEN)({});assert.equal(failed.success,false);assert.equal(f.host.inspect().state,'ready');assert.equal(c.admission.inspect().accepting,true)
  await assert.rejects(c.tags.run('main',old.receipt))
  const fresh=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});assert.notEqual(fresh.receipt,old.receipt)
 }finally{await c.close();await f.close()}
})

await test('discarding a reviewed operation immediately releases its material and forbids consuming that receipt',async()=>{
 const f=await fixture(),c=controllers(f,{invokeOnce:async()=>{throw Error('discard must not send')}})
 try{
  const old=await c.legacy.prepare('main',{libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation,assetIds:[f.asset.id],backendId:'synthetic',purpose:'analyze'})
  assert.ok(c.admission.inspect().frozenBytes>0)
  assert.equal(typeof (c.legacy as any).discardReview,'function')
  await (c.legacy as any).discardReview('main',old.receipt);assert.equal(c.admission.inspect().frozenBytes,0);await assert.rejects(c.legacy.run('main',old.receipt))
  const fresh=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});assert.ok(c.admission.inspect().frozenBytes>0)
  await assert.rejects(async()=>{await (c.tags as any).discardReview('other',fresh.receipt)})
  await (c.tags as any).discardReview('main',fresh.receipt);assert.equal(c.admission.inspect().frozenBytes,0);await assert.rejects(c.tags.run('main',fresh.receipt))
 }finally{await c.close();await f.close()}
})

await test('tag recipe empty, strict invalid and bounded truncation cases preserve the last committed result',async()=>{
 const f=await fixture();let respond:VisionProvider['invokeOnce']=async()=>({}),calls: Array<{budget:number;signal:AbortSignal}>=[]
 const c=controllers(f,{invokeOnce:async input=>{calls.push({budget:input.maxTokens,signal:input.signal});return respond(input)}})
 const payload=(tags:unknown,finish='stop')=>({choices:[{finish_reason:finish,message:{content:typeof tags==='string'?tags:JSON.stringify({tags})}}]})
 try{
  const cases=[
   {id:'empty',out:()=>payload([]),expected:'succeeded',count:1,tags:[]},
   {id:'normalized',out:()=>payload(['蓝色',' Adobe ','adobe']),expected:'succeeded',count:1,tags:['蓝色','Adobe']},
   {id:'recover-length',out:(n:number)=>n===1?payload('partial','length'):payload(['重试完成']),expected:'succeeded',count:2,tags:['重试完成']},
   {id:'invalid-json',out:()=>payload('not-json'),expected:'failed',count:1},
   {id:'extra-fields',out:()=>payload('{"tags":["wrong"],"caption":"extra"}'),expected:'failed',count:1},
   {id:'too-many',out:()=>payload(Array.from({length:9},(_,i)=>String(i))),expected:'failed',count:1},
   {id:'still-truncated',out:()=>payload('partial','length'),expected:'failed',count:2}
  ]
  let previous:string[]|null=null
  for(const fixtureCase of cases){
   await f.host.saveTagIntent({...f.intent,expectedSchemaVersion:(await f.host.readTagIntentContext(f.scope)).schemaVersion,requestId:fixtureCase.id})
   let attempt=0;respond=async()=>fixtureCase.out(++attempt);const before=calls.length
   const review=await c.tags.prepare('main',{...f.scope,requestId:fixtureCase.id}),job=await c.tags.run('main',review.receipt)
   const done=await eventually(()=>c.tags.inspect('main',job.id),j=>!['queued','running'].includes(j.state));assert.equal(done.state,fixtureCase.expected,fixtureCase.id)
   assert.equal(calls.length-before,fixtureCase.count);assert.deepEqual(calls.slice(before).map(c=>c.budget),fixtureCase.count===1?[512]:[512,1024])
   if(fixtureCase.count===2)assert.equal(calls[before].signal,calls[before+1].signal)
   if(fixtureCase.tags)previous=fixtureCase.tags
   assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,previous)
  }
 }finally{await c.close();await f.close()}
})
await test('a tags provider ignoring cancellation retains its permit until settlement and creates no late effect',async()=>{
 const f=await fixture();let complete!:(v:unknown)=>void,entered!:()=>void,calls=0
 const called=new Promise<void>(r=>{entered=r}),response=new Promise<unknown>(r=>{complete=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;entered();return response}})
 try{
  const review=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId}),job=await c.tags.run('main',review.receipt);await called
  assert.throws(()=>c.tags.cancel('card:other',job.id));c.tags.cancel('main',job.id)
  assert.equal(c.admission.inspect().requests,1)
  complete({choices:[{finish_reason:'stop',message:{content:'{"tags":["must not commit"]}'}}]})
  const done=await eventually(()=>c.tags.inspect('main',job.id),j=>!['queued','running'].includes(j.state));assert.equal(done.state,'outcome-unknown')
  assert.equal((await f.host.readTagExecution(f.scope)).current,null);assert.equal(c.admission.inspect().requests,0);assert.equal(calls,1)
  await assert.rejects(c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId}))
 }finally{complete?.({});await c.close();await f.close()}
})
await test('owner revocation before session lookup completes never starts preview materialization',async()=>{
 const f=await fixture();let release!:()=>void,entered!:()=>void,reads=0
 const wait=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r})
 const host={...f.host,readVisualSession:async(input:any)=>{entered();await wait;return f.host.readVisualSession(input)},readVisualPreview:async(input:any)=>{reads++;return f.host.readVisualPreview(input)}}
 const c=controllers({...f,host},{invokeOnce:async()=>{throw Error('must not send')}})
 try{
  const preparing=c.tags.prepare('card:one',{...f.scope,requestId:f.intent.requestId});await started;c.tags.cancelOwner('card:one');release();await assert.rejects(preparing)
  assert.equal(reads,0);assert.equal(c.admission.inspect().materialBytes,0)
 }finally{release();await c.close();await f.close()}
})

await test('unscoped legacy rejection never suppresses an independent tag family',async()=>{
 const f=await fixture()
 try{
  const s=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:s.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  await f.host.commitTagExecution({...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['共用名称']})
  const db=new Database(f.dbFile);try{const now=new Date().toISOString();db.prepare("INSERT INTO tag_suggestions(id,asset_id,tag_name,tag_type,source,confidence,status,model_name,raw_payload,created_at,updated_at) VALUES('older-unknown',?,'共用名称','custom','visual-ai',NULL,'rejected','older','{}',?,?)").run(f.asset.id,now,now)}finally{db.close()}
  assert.deepEqual((await f.host.listAssets())[0].tagAnalysis?.tags,['共用名称']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['共用名称'])
 }finally{await f.close()}
})

await test('cutover completion cannot reopen admission held by a simultaneous close cycle',async()=>{
 const f=await fixture();let releaseBackup!:()=>void,entered!:()=>void,calls=0
 const gate=new Promise<void>(r=>{releaseBackup=r}),atBackup=new Promise<void>(r=>{entered=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;throw Error('must not send')}})
 let sharedRelease:(()=>void)|undefined,businessRelease:(()=>void)|undefined
 try{
  f.hooks.afterBackup=async()=>{entered();await gate}
  const r=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});await c.tags.run('main',r.receipt);await atBackup
  sharedRelease=c.admission.hold();businessRelease=f.host.holdBusinessAdmission()
  const draining=Promise.all([c.tags.suspendAndDrain(),c.legacy.suspendAndDrain()]);releaseBackup();await draining
  assert.equal(c.admission.inspect().accepting,false);assert.equal(calls,0)
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.pragma('user_version',{simple:true}),9)}finally{db.close()}
  await f.host.close();businessRelease();sharedRelease();await f.host.reopen();c.legacy.resume();c.tags.resume()
  assert.equal(c.admission.inspect().accepting,true);await assert.rejects(c.tags.run('main',r.receipt))
 }finally{releaseBackup?.();businessRelease?.();sharedRelease?.();delete f.hooks.afterBackup;await c.close();await f.close()}
})
await test('v10 preserves OCR edits, notebook, work layout, organization and download journal across reopen',async()=>{
 const f=await fixture()
 try{
  const context=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:context.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const scope={libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation},ocr=await f.host.readOcr(f.scope)
  const saved=await f.host.commitOcr({...f.scope,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr-v10',assetId:f.asset.id,assetRevision:f.asset.revision,sourceRef:f.asset.thumbnailRef,inputSha256:'e'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:120,height:100,elapsedMs:1,threshold:.5,blocks:[]}}})
  await f.host.correctOcr({...f.scope,sessionToken:saved.sessionToken,expectedRevision:saved.revision,evidenceId:'ocr-v10',text:'User OCR retained'})
  const note=await f.host.readNotebook(f.scope);await f.host.saveNotebook({...f.scope,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:note.revision,allowUpgrade:false,book:note.book})
  const org=await f.host.readOrganization(scope);await f.host.writeOrganization({...scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'User folder',folderKind:'assets',parentId:null,assetIds:[f.asset.id]}})
  const work=await f.host.readWorkSets(scope,'device-v10'),set=await f.host.writeWorkSet({...scope,sessionToken:work.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'User set',note:'User note',assetIds:[f.asset.id],colors:[],columns:1}}},'device-v10')
  const layout={x:12,y:20,width:400,height:500,pinned:true,open:false};await f.host.writeWorkLayout({...scope,sessionToken:work.sessionToken,id:set.sets[0].id,layout},'device-v10')
  await f.host.downloadJournal({kind:'create',generation:scope.generation,taskId:'download-v10',url:'https://fixture.invalid/not-requested.png',fileName:'generated.png'})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'});await f.host.commitTagExecution({...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['新建议']})
  await f.host.close();await f.host.reopen()
  assert.equal((await f.host.readOcr(f.scope)).editedText,'User OCR retained');assert.equal((await f.host.readNotebook(f.scope)).revision,1)
  assert.equal((await f.host.readOrganization(scope)).folders[0].name,'User folder');assert.deepEqual((await f.host.readWorkSets(scope,'device-v10')).sets[0].layout,layout)
  assert.equal((await f.host.downloadJournal({kind:'list',generation:scope.generation})).intents!.length,1);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['新建议'])
 }finally{await f.close()}
})

await test('frozen v9 inspector and its version helper refuse v10 with database bytes unchanged',async()=>{
 const f=await fixture()
 try{
  const c=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:c.sessionToken,expectedSchemaVersion:9,allowUpgrade:true});await f.host.close()
  const base=path.resolve('scripts/fixtures/independent-tags-v9'),manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'))
  const frozen=await readFrozenLibrarySource(base,manifest)
  const source=frozen['library-open-control-store.internal.ts'],version=frozen['library-schema-version.ts']
  const output=path.resolve('dist-temp/tests/frozen-v9-inspector.mjs')
  await build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'frozen-version',setup(b){b.onResolve({filter:/library-schema-version$/},()=>({path:'frozen-v9-version',namespace:'frozen'}));b.onLoad({filter:/.*/,namespace:'frozen'},()=>({contents:version,loader:'ts'}))}}]})
  const old=await import(pathToFileURL(output).href),declaration=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.library,'.dam','library.manifest.json'))));if(declaration.kind!=='compatible')throw Error('fixture manifest')
  const before=await fs.readFile(f.dbFile),db=openReadonlyLibraryDatabase(f.dbFile)
  try{assert.equal(old.inspectLibraryControlStore(db,declaration.declaration).kind,'unsupported')}finally{db.close()}
  assert.deepEqual(await fs.readFile(f.dbFile),before)
 }finally{await f.close()}
})
await test('inconsistent current generation is hidden without hiding the basic asset',async()=>{
 const f=await fixture()
 try{
  const s=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:s.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'});await f.host.commitTagExecution({...f.scope,sessionToken:s.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['valid']})
  const db=new Database(f.dbFile);try{db.prepare('UPDATE independent_tag_current SET request_generation=request_generation+1').run()}finally{db.close()}
  const assets=await f.host.listAssets();assert.equal(assets.length,1);assert.equal(assets[0].tagAnalysis,null);assert.equal((await f.host.readTagExecution(f.scope)).current,null)
 }finally{await f.close()}
})

await test('150 saved-result reuses retain only 100 terminal jobs without inference or durable changes',async()=>{
 const f=await fixture();let calls=0,changes=0
 const c=controllers(f,{invokeOnce:async()=>{calls++;throw Error('Saved result must not infer')}},()=>{changes++})
 try{
  const context=await f.host.readTagIntentContext(f.scope)
  await f.host.enableTagExecution({...f.scope,sessionToken:context.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const claim=await startClaim(f.host,{...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'})
  const effect=await f.host.commitTagExecution({...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,attemptToken:claim.attemptToken,tags:['已有结果']})
  const before=await fs.readFile(f.dbFile),ids:string[]=[]
  for(let i=0;i<150;i++){const r=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});assert.equal(r.alreadySucceeded,true);const job=await c.tags.run('main',r.receipt);assert.equal(job.state,'succeeded');ids.push(job.id)}
  const visible=ids.filter(id=>{try{c.tags.inspect('main',id);return true}catch{return false}})
  assert.equal(calls,0);assert.equal(changes,0);assert.equal(c.admission.inspect().materialBytes,0);assert.deepEqual(await fs.readFile(f.dbFile),before)
  assert.equal((await f.host.readTagEffectReceipt({...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId})).receipt?.effectId,effect.effectId)
  assert.deepEqual(visible,ids.slice(-100),'The saved-result fast path must obey the same 100-terminal retention bound')
 }finally{await c.close();await f.close()}
})
for(const outcome of ['success','failure','queued-cancel','sent-cancel'] as const)await test(`terminal retention shares cleanup for ${outcome} without evicting active work`,async()=>{
 const f=await fixture();let calls=0,release!:()=>void,entered!:()=>void
 const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;entered();if(outcome==='sent-cancel')await gate;return{choices:[{finish_reason:'stop',message:{content:outcome==='failure'?'invalid':JSON.stringify({tags:['new result']})}}]}}})
 try{
  const context=await f.host.readTagIntentContext(f.scope);await f.host.enableTagExecution({...f.scope,sessionToken:context.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const seed=await startClaim(f.host,{...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,inputSha256:'b'.repeat(64),origin:'tags-only'});await f.host.commitTagExecution({...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId,attemptToken:seed.attemptToken,tags:['saved']})
  const ids:string[]=[];for(let i=0;i<100;i++){const r=await c.tags.prepare('main',{...f.scope,requestId:f.intent.requestId});ids.push((await c.tags.run('main',r.receipt)).id)}
  await f.host.saveTagIntent({...f.intent,expectedSchemaVersion:10,requestId:'new-terminal-case'})
  const review=await c.tags.prepare('main',{...f.scope,requestId:'new-terminal-case'}),job=await c.tags.run('main',review.receipt)
  assert.equal(job.state,'queued');assert.equal(c.tags.inspect('main',job.id).id,job.id)
  if(outcome==='queued-cancel')c.tags.cancel('main',job.id)
  if(outcome==='sent-cancel'){await started;assert.equal(c.tags.inspect('main',job.id).state,'running');c.tags.cancel('main',job.id);assert.equal(c.tags.inspect('main',job.id).id,job.id);assert.equal(c.admission.inspect().requests,1);release()}
  const terminal=await c.tags.settle('main',job.id)
  assert.equal(terminal.state,{'success':'succeeded','failure':'failed','queued-cancel':'cancelled','sent-cancel':'outcome-unknown'}[outcome]);assert.equal(calls,outcome==='queued-cancel'?0:1)
  assert.throws(()=>c.tags.inspect('main',ids[0]));for(const id of ids.slice(1))assert.equal(c.tags.inspect('main',id).state,'succeeded');assert.equal(c.tags.inspect('main',job.id).state,terminal.state)
  assert.ok((await f.host.readTagEffectReceipt({...f.scope,sessionToken:context.sessionToken,requestId:f.intent.requestId})).receipt)
  const settled=c.admission.inspect(), retained=c.admission.resourceStatus().preparedCache
  assert.equal(settled.requests,0);assert.equal(settled.receipts,0);assert.equal(settled.frozenBytes,0)
  assert.equal(settled.materialBytes,retained.bytes,'Only the explicitly accounted reusable cache may remain after terminal cleanup')
  assert.ok(retained.bytes>0,'Prepared content can remain reusable without keeping the terminal operation alive')
  c.admission.releaseIdleMaterials()
  assert.equal(c.admission.inspect().materialBytes,0,'Explicit release must free the physical prepared buffer')
 }finally{release();await c.close();await f.close()}
})
