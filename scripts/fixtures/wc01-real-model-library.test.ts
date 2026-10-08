/** Explicit WC01 opt-in; exact disposable public Library only. No private discovery. */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAdmission} from '../../src/main/visual-ai/visual-admission'
import {createVisualAiController} from '../../src/main/visual-ai/visual-ai-controller'
import {createPiRuntimeHost} from '../../src/main/ai-gateway/pi-runtime-host'
import {createAiConnectionService} from '../../src/main/ai-gateway/ai-connection-service'
import {createCredentialVault} from '../../src/main/ai-credentials/credential-vault'
import {createNewInstallAppSettingsDefaults} from '../../src/main/services/settings/settings-defaults.builder'
import {createTagExecutionController} from '../../src/main/independent-tags/tag-execution-controller'
import {backendExecutionBinding} from '../../src/main/ai-gateway/backend-binding'
import type {AiBackendConfig} from '../../src/shared/types/ai-backend.types'
assert.equal(process.env.DAM_WC01_REAL_MODEL_EXECUTE,'1','Explicit existing-model test opt-in required')
const parent=path.resolve('.scratch/wc01-real-model-library-20261005')
const run=path.resolve((await fs.readFile(path.join(parent,'selected-run.txt'),'utf8')).trim());assert.equal(path.dirname(run),parent)
const serviceFile=(await fs.readFile(path.join(run,'selected-service.txt'),'utf8')).trim();assert.match(serviceFile,/^evidence\/qwen\d{2}-service\.json$/)
const service=JSON.parse(await fs.readFile(path.join(run,serviceFile),'utf8'));assert.equal(service.mock,false);assert.equal(service.bind,'127.0.0.1')
const execution=process.env.DAM_WC01_MODEL_EXECUTION??'exec-01';assert.match(execution,/^exec-\d{2}$/)
const evidence=path.join(run,execution);await fs.mkdir(evidence)
const save=(name:string,value:unknown)=>fs.writeFile(path.join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex')
const library=path.join(run,'work-local'),baseline=path.join(run,'baseline-v13')
const manifest=JSON.parse(await fs.readFile(path.join(run,'library-copies.json'),'utf8'));assert.equal(manifest.existingPrivateLibraryAccess,false)
for(const f of manifest.files)assert.equal(sha(await fs.readFile(path.join(baseline,f.relativePath))),f.sha256)
const admission=createVisualAdmission()
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'cancelled'})},{admission}))
const b:AiBackendConfig={id:'wc01-existing-qwen-local',name:'WC01 existing Qwen 4B (offline tracer)',type:'openai-compatible',transport:'pi',providerKind:'openai-compatible',authMode:'none',processingLocation:'local-service',enabled:true,baseUrl:`http://127.0.0.1:${service.port}/v1`,defaultModel:service.model,timeoutMs:120000,priority:0,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false}}
let settings={...createNewInstallAppSettingsDefaults(),aiBackends:[b]}
// Keyless local inference never decrypts/encrypts a credential. Unlike account
// tests, this harness deliberately exposes unavailable secret storage.
const vault=createCredentialVault({file:path.join(evidence,'keyless-vault.json'),protection:{available:()=>false,encrypt:()=>{throw Error('KEYLESS_NO_CREDENTIAL_WRITE')},decrypt:()=>{throw Error('KEYLESS_NO_CREDENTIAL_READ')}}})
const runtime=createPiRuntimeHost({root:path.resolve('pi-runtime')})
const connections=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:n=>{settings={...settings,...n};return settings}},vault,runtime,reserveProbe:signal=>admission.reservePiProbe(signal),changed:()=>{}})
const controller=createVisualAiController({host,settings:()=>settings,provider:connections.provider,admission,onChanged:()=>{}})
const tags=createTagExecutionController({host,settings:()=>settings,provider:connections.provider,admission,legacy:controller,changed:()=>{}})
const protectedSnapshot=()=>{
 const db=new Database(path.join(library,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
 try{
  const columns=(db.prepare('PRAGMA table_info(assets)').all() as any[]).map(r=>r.name).filter(c=>!['ai_caption','ai_caption_updated_at'].includes(c))
  const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"'
  const rows=db.prepare(`SELECT ${columns.map(quote).join(',')} FROM assets ORDER BY id`).all()
  const userCaptions=db.prepare('SELECT id,ai_caption,ai_caption_is_user_edited FROM assets WHERE ai_caption_is_user_edited=1 ORDER BY id').all()
  const relations=Object.fromEntries(['asset_tags','tags','asset_folders'].filter(t=>db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t)).map(t=>[t,db.prepare(`SELECT * FROM ${quote(t)}`).all().map(r=>JSON.stringify(r)).sort()]))
  return {columns,assetsSha256:sha(JSON.stringify(rows)),userCaptions,relationsSha256:sha(JSON.stringify(relations))}
 }finally{db.close()}
}
const before=protectedSnapshot();await save('protected-before.json',before)
const outcomes:any[]=[];let complete=false
try{
 await save('runtime-verification.json',await runtime.verify())
 const opened=await host.open();assert.ok('identity' in opened);assert.equal(host.inspect().state,'ready')
 const assets=await host.listAssets();assert.equal(assets.length,24)
 const s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!}
 const sqliteCheck=new Database(':memory:');const sqlite=(sqliteCheck.prepare('SELECT sqlite_version() v').get() as any).v;sqliteCheck.close()
 await save('host-open.json',{state:s,assetCount:assets.length,actualElectron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,sqlite,mock:false})
 for(const prefix of ['public-01','public-03','public-04','public-08','public-15','derived-4096']){
  const asset=assets.find(a=>a.title.startsWith(prefix));assert.ok(asset,`Public sample missing: ${prefix}`)
  const existing=await host.listVisualAiEvidence(asset.id)
  const review=await controller.prepare('main',{...scope,assetIds:[asset.id],backendId:b.id,model:service.model,purpose:'analyze'})
  await save(prefix+'-review.json',review)
  const started=await controller.run('main',review.receipt),deadline=Date.now()+125000
  let job=controller.inspect('main',started.id)
  while(['queued','running'].includes(job.state)&&Date.now()<deadline){await new Promise(r=>setTimeout(r,100));job=controller.inspect('main',started.id)}
  if(['queued','running'].includes(job.state)){controller.cancel('main',started.id);throw Error('FORMAL_JOB_TIMEOUT')}
  await save(prefix+'-job.json',job)
  const stored=await host.listVisualAiEvidence(asset.id),row={sample:prefix,state:job.state,storedDelta:stored.length-existing.length,evidenceId:job.items[0].evidence?.id??null,error:job.items[0].error??null}
  if(job.state==='completed'){
   // The SQLite JSON seam omits optional undefined properties; compare every
   // serialized field, including IDs, revisions, input digest and actual output.
   assert.equal(stored.length,existing.length+1);assert.deepEqual(stored.find(e=>e.id===job.items[0].evidence!.id),JSON.parse(JSON.stringify(job.items[0].evidence)))
   assert.equal(job.items[0].evidence!.output.ocrText,'');assert.ok(/[\u3400-\u9fff]/.test(job.items[0].evidence!.output.caption));assert.ok(job.items[0].evidence!.output.tags.length>0)
  }else assert.equal(stored.length,existing.length,'Failed inference must not commit visual evidence')
  outcomes.push(row);console.log(JSON.stringify(row))
  assert.equal(admission.inspect().materialBytes,0);assert.equal(runtime.inspect().unknown,0);assert.equal(runtime.inspect().active,0)
 }
 const asset=assets.find(a=>a.title.startsWith('public-02'))!;assert.ok(asset)
 const tagScope={...scope,assetId:asset.id},context=await host.readTagIntentContext(tagScope)
 const requestId='wc01-real-keyless-tags-'+execution
 await host.saveTagIntent({...tagScope,sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:false,requestId,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:b.id,model:service.model,backendBindingSha256:backendExecutionBinding(b,service.model),recipeId:'independent-tags-v1',recipeVersion:'1'})
 const review=await tags.prepare('main',{...tagScope,requestId}),started=await tags.run('main',review.receipt);let finished=await tags.inspect('main',started.id);const end=Date.now()+125000
 while(['queued','running'].includes(finished.state)&&Date.now()<end){await new Promise(r=>setTimeout(r,100));finished=await tags.inspect('main',started.id)}
 await save('independent-tags-job.json',finished)
 if(finished.state==='succeeded'){
  const beforeCalls=(await (await fetch(`http://127.0.0.1:${service.port}/health`)).json() as any).requests
  const duplicate=await tags.prepare('main',{...tagScope,requestId});assert.equal(duplicate.alreadySucceeded,true);assert.equal((await tags.run('main',duplicate.receipt)).state,'succeeded')
  const afterCalls=(await (await fetch(`http://127.0.0.1:${service.port}/health`)).json() as any).requests;assert.equal(afterCalls,beforeCalls)
  await save('independent-tags-duplicate.json',{zeroReinference:true,requestCount:afterCalls,stored:await host.readTagExecution(tagScope)})
 }
 outcomes.push({sample:'public-02-independent-tags',state:finished.state,error:finished.error??null})
 await tags.suspendAndDrain();await controller.suspendAndDrain();await connections.drain();assert.equal(admission.inspect().materialBytes,0)
 await host.close();assert.deepEqual(protectedSnapshot(),before)
 await host.reopen();assert.equal(host.inspect().state,'ready')
 for(const row of outcomes.filter(r=>r.evidenceId)){const stored=await host.listVisualAiEvidence(assets.find(a=>a.title.startsWith(row.sample))!.id);assert.ok(stored.some(e=>e.id===row.evidenceId))}
 const reopened=await host.readTagExecution({...scope,generation:host.inspect().generation!,assetId:asset.id});await save('reopened-tags.json',reopened)
 await host.close()
 for(const f of manifest.files){assert.equal(sha(await fs.readFile(path.join(baseline,f.relativePath))),f.sha256);if(!f.relativePath.endsWith('.sqlite')&&!f.relativePath.endsWith('.json'))assert.equal(sha(await fs.readFile(path.join(library,f.relativePath))),f.sha256)}
 complete=true
}finally{
 await tags.suspendAndDrain();await controller.suspendAndDrain();await connections.drain();await host.close()
 await save('result.json',{executed:complete,scope:'Exact public copied v13 Library, actual weights through offline tracer -> actual installed Pi -> current source Visual/Tag Controller -> production Active Library Host',productBuildUiNotSubstituted:true,modelsDownloaded:false,mock:false,privateExistingLibraryAccess:false,accountTests:false,outcomes,resourceLedger:admission.inspect(),runtime:runtime.inspect(),protectedFieldsAndRelationsPreserved:complete,baselinePreserved:complete})
}
assert.equal(outcomes.filter(r=>!['completed','succeeded'].includes(r.state)).length,0,'Actual model inference failure retained in evidence')
