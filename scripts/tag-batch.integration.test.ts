import {createTagBatchController} from '../src/main/independent-tags/tag-batch-controller'
import {createTagExecutionController} from '../src/main/independent-tags/tag-execution-controller'
import {createVisualAiController} from '../src/main/visual-ai/visual-ai-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import type {VisionProvider} from '../src/main/visual-ai/openai-vision.provider'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createHash} from 'node:crypto'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
import type {TagBatchCommit} from '../src/shared/contracts/tag-batch.contract'
async function fixture(count=8,hooks:TagIntentTestHooks={}){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-batch-'))),library=path.join(root,'library'),sources:string[]=[]
 for(let i=0;i<count;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:{r:30+i*20,g:80,b:140}}}).png().toFile(file);sources.push(file)}
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}),tagIntentTestHooks:hooks})
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
 const assets=await host.listAssets(),s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!},context=await host.readTagIntentContext({...scope,assetId:assets[0].id})
 const input:TagBatchCommit={...scope,sessionToken:context.sessionToken,expectedSchemaVersion:1,allowUpgrade:true,requestId:'batch-one',backendId:'synthetic',model:'synthetic-model',backendBindingSha256:createHash('sha256').update(JSON.stringify({baseUrl:'http://127.0.0.1:1/v1',type:'openai-compatible',model:'synthetic-model',vision:true})).digest('hex'),recipeId:'independent-tags-v1',recipeVersion:'1',forceRerun:false,items:assets.map(a=>({assetId:a.id,assetRevision:a.revision,previewGeneration:a.thumbnailRef}))}
 return{root,library,dbFile:path.join(library,'.dam','library.sqlite'),assets,host,scope,input,hooks,close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
await test('eight-item intent is atomic, normal reuse is generation-based and force replay is idempotent',async()=>{
 const f=await fixture()
 try{
  const first=await f.host.saveTagBatch(f.input);assert.equal(first.items.length,8);assert.ok(first.items.every(i=>i.requestGeneration===1))
  const duplicate=await f.host.saveTagBatch({...f.input,requestId:'another-window',items:[...f.input.items].reverse()});assert.equal(duplicate.requestId,first.requestId)
  const force={...f.input,expectedSchemaVersion:9,forceRerun:true,requestId:'force-one'};const forced=await f.host.saveTagBatch(force);assert.ok(forced.items.every(i=>i.requestGeneration===2));assert.deepEqual(await f.host.saveTagBatch(force),forced)
  assert.equal((await f.host.saveTagBatch({...f.input,requestId:'new-review',expectedSchemaVersion:9})).requestId,'force-one')
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.prepare('SELECT count(*) FROM independent_tag_requests').pluck().get(),2);assert.equal(db.prepare('SELECT count(*) FROM independent_tag_request_items').pluck().get(),16)}finally{db.close()}
 }finally{await f.close()}
})
await test('single item preserves the original intent digest and ordinary batch can reuse it',async()=>{
 const f=await fixture(1)
 try{
  await f.host.saveTagIntent({...f.input,...f.input.items[0]});const same=await f.host.saveTagBatch({...f.input,requestId:'new-ui-id'});assert.equal(same.requestId,'batch-one');assert.equal(same.items[0].requestGeneration,1)
  await assert.rejects(f.host.saveTagBatch({...f.input,items:[{...f.input.items[0],previewGeneration:'foreign'}]}))
 }finally{await f.close()}
})
await test('invalid ranges and one stale item cannot create a partial reviewed scope',async()=>{
 const f=await fixture()
 try{
  for(const items of [[],[...f.input.items,f.input.items[0]],[f.input.items[0],f.input.items[0]],[f.input.items[0],{...f.input.items[1],assetRevision:'stale'}]])await assert.rejects(async()=>f.host.saveTagBatch({...f.input,items}))
  assert.equal((await f.host.readTagIntentContext({...f.scope,assetId:f.assets[0].id})).schemaVersion,1)
  f.hooks.beforeCommit=()=>{throw Error('synthetic commit failure')};await assert.rejects(f.host.saveTagBatch(f.input));delete f.hooks.beforeCommit
  assert.equal((await f.host.readTagIntentContext({...f.scope,assetId:f.assets[0].id})).schemaVersion,1)
  const saved=await f.host.saveTagBatch(f.input);assert.ok(saved.items.every(i=>i.requestGeneration===1))
 }finally{await f.close()}
})
function controllers(f:Awaited<ReturnType<typeof fixture>>,provider:VisionProvider){
 const settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{id:'synthetic',name:'Synthetic service',type:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:1/v1',defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}]
 const admission=createVisualAdmission(),legacy=createVisualAiController({host:f.host,settings:()=>settings,admission,provider,onChanged:()=>{}}),execution=createTagExecutionController({host:f.host,settings:()=>settings,admission,provider,legacy,changed:()=>{}}),batch=createTagBatchController({host:f.host,settings:()=>settings,execution,changed:()=>{}})
 const prepare=(forceRerun=false,requestId='reviewed-batch')=>batch.prepare('main',{...f.scope,assetIds:f.assets.map(a=>a.id),backendId:'synthetic',model:'synthetic-model',requestId,forceRerun})
 return{settings,admission,legacy,execution,batch,prepare,close:async()=>{await Promise.all([batch.suspendAndDrain(),execution.suspendAndDrain(),legacy.suspendAndDrain()]);admission.invalidate()}}
}
const output=(tags=['蓝色'])=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({tags})}}]})
function assertIdleMaterials(admission:ReturnType<typeof createVisualAdmission>){
 const state=admission.inspect(),cache=admission.resourceStatus().preparedCache
 assert.equal(state.requests,0);assert.equal(state.preparing,0);assert.equal(state.frozenBytes,0)
 assert.equal(state.materialBytes,cache.bytes,'Terminal work releases active buffers; only the accounted reusable cache may remain')
 admission.releaseIdleMaterials()
 assert.equal(admission.inspect().materialBytes,0,'Explicit cache release frees the remaining physical buffers')
 assert.equal(admission.resourceStatus().preparedCache.bytes,0)
}
await test('eight-item execution keeps partial success, reuses successful items and only force advances generations',async()=>{
 const f=await fixture();let calls=0,peak=0;let c:ReturnType<typeof controllers>
 c=controllers(f,{invokeOnce:async()=>{calls++;peak=Math.max(peak,c.admission.inspect().requests);return calls===2?{choices:[{finish_reason:'stop',message:{content:'invalid'}}]}:output()}})
 try{
  const r=await c.prepare();assert.equal(calls,0);const j=await c.batch.run('main',r.receipt);await assert.rejects(c.batch.run('main',r.receipt));const first=await c.batch.settle('main',j.id)
  assert.equal(first.state,'partial');assert.equal(first.items.filter(i=>i.state==='succeeded').length,7);assert.equal(calls,8);assert.equal(peak,1);assertIdleMaterials(c.admission)
  const review=await c.prepare(false,'different-window-request'),retry=await c.batch.run('main',review.receipt);assert.equal((await c.batch.settle('main',retry.id)).state,'completed');assert.equal(calls,9)
  const forced=await c.prepare(true,'force-replay'),force=await c.batch.run('main',forced.receipt);assert.equal((await c.batch.settle('main',force.id)).state,'completed');assert.equal(calls,17)
  const duplicate=await c.prepare(true,'force-replay'),same=await c.batch.run('main',duplicate.receipt);await c.batch.settle('main',same.id);assert.equal(calls,17)
  for(const a of f.assets)assert.equal((await f.host.readTagExecution({...f.scope,assetId:a.id})).current?.requestGeneration,2)
 }finally{await c.close();await f.close()}
})
await test('batch cancellation retains the physical permit until settlement and skips unstarted items',async()=>{
 const f=await fixture();let release!:()=>void,started!:()=>void,calls=0;const gate=new Promise<void>(r=>{release=r}),entered=new Promise<void>(r=>{started=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;started();await gate;return output()}})
 try{
  const r=await c.prepare(),j=await c.batch.run('main',r.receipt);await entered;const live=c.batch.inspect('main',j.id);assert.equal(live.items[0].state,'running');assert.equal(live.items[1].state,'waiting-execution');c.batch.cancel('main',j.id);assert.equal(c.admission.inspect().requests,1);release();const done=await c.batch.settle('main',j.id)
  assert.equal(done.state,'cancelled');assert.equal(calls,1);assert.equal(done.items.filter(i=>i.state==='cancelled').length,7);assert.equal(done.items.filter(i=>i.state==='outcome-unknown').length,1);assert.equal(c.admission.inspect().materialBytes,0)
  for(const a of f.assets)assert.equal((await f.host.readTagExecution({...f.scope,assetId:a.id})).current,null)
 }finally{release();await c.close();await f.close()}
})
await test('changing full backend configuration after first response cannot silently authorize remaining assets',async()=>{
 const f=await fixture(2);let calls=0,c:ReturnType<typeof controllers>
 c=controllers(f,{invokeOnce:async()=>{calls++;c.settings.aiBackends[0].timeoutMs=7000;return output()}})
 try{
  const r=await c.prepare(),j=await c.batch.run('main',r.receipt),done=await c.batch.settle('main',j.id);assert.equal(calls,1);assert.equal(done.state,'partial');assert.equal(done.items.filter(i=>i.state==='succeeded').length,1)
 }finally{await c.close();await f.close()}
})
await test('a failed configuration lookup cannot poison the owner preparation slot',async()=>{
 const f=await fixture(1),c=controllers(f,{invokeOnce:async()=>output()})
 try{c.settings.aiBackends[0].enabled=false;await assert.rejects(c.prepare());c.settings.aiBackends[0].enabled=true;assert.ok((await c.prepare()).receipt)}finally{await c.close();await f.close()}
})
async function until<T>(read:()=>T|Promise<T>,done:(v:T)=>boolean):Promise<T>{for(let i=0;i<1000;i++){const v=await read();if(done(v))return v;await new Promise(r=>setTimeout(r,5))}throw Error('Generated batch did not settle')}
await test('legacy requests and a new batch share two physical slots; late combined tags cannot take current back',async()=>{
 const f=await fixture(1),releases:Array<()=>void>=[];let peak=0,tags=0,c:ReturnType<typeof controllers>
 c=controllers(f,{invokeOnce:async input=>{peak=Math.max(peak,c.admission.inspect().requests);if(input.systemPrompt.includes('标签助手')){tags++;return output(['最新标签'])}await new Promise<void>(r=>releases.push(r));return{choices:[{finish_reason:'stop',message:{content:JSON.stringify({caption:'Historical',prompt:'Historical',ocrText:'',tags:['旧综合标签']})}}]}}})
 try{
  await f.host.saveTagBatch(f.input);await f.host.enableTagExecution({...f.scope,assetId:f.assets[0].id,sessionToken:f.input.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const jobs=[];for(const owner of ['main','card:synthetic']){const r=await c.legacy.prepare(owner,{...f.scope,assetIds:[f.assets[0].id],backendId:'synthetic',purpose:'analyze'});jobs.push({owner,job:await c.legacy.run(owner,r.receipt)})}
  await until(()=>releases.length,n=>n===2);const r=await c.prepare(true,'newest-batch'),j=await c.batch.run('main',r.receipt)
  await until(()=>c.admission.inspect().waiting,n=>n>0);assert.equal(tags,0);assert.equal(c.admission.inspect().requests,2);releases[0]()
  assert.equal((await c.batch.settle('main',j.id)).state,'completed');assert.equal(tags,1);releases[1]();for(const old of jobs)await until(()=>c.legacy.inspect(old.owner,old.job.id),j=>!['queued','running'].includes(j.state))
  assert.equal(peak,2);assert.deepEqual((await f.host.readTagExecution({...f.scope,assetId:f.assets[0].id})).current?.tags,['最新标签']);assertIdleMaterials(c.admission)
 }finally{releases.forEach(r=>r());await c.close();await f.close()}
})
await test('an item that committed before batch cancel stays successful while later items are cancelled',async()=>{
 const f=await fixture(2);let calls=0,id='',c:ReturnType<typeof controllers>;const commit=f.host.commitTagExecution
 const host={...f.host,commitTagExecution:async(...args:Parameters<typeof commit>)=>{const receipt=await commit(...args);c.batch.cancel('main',id);return receipt}}
 c=controllers({...f,host},{invokeOnce:async()=>{calls++;return output()}})
 try{
  const r=await c.prepare(),j=await c.batch.run('main',r.receipt);id=j.id;const done=await c.batch.settle('main',id)
  assert.equal(done.state,'cancelled');assert.equal(done.items.filter(i=>i.state==='succeeded').length,1);assert.equal(calls,1)
  assert.equal((await f.host.listAssets()).filter(a=>a.tagAnalysis).length,1)
 }finally{await c.close();await f.close()}
})
await test('waitIdle is not an exclusive permit: a stolen run slot is retried without false item failure',async()=>{
 const f=await fixture(2);let release!:()=>void,entered!:()=>void,calls=0;const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r})
 const c=controllers(f,{invokeOnce:async()=>{calls++;if(calls===1){entered();await gate}return output()}});let once=true,busyRetries=0
 const execution={...c.execution,run:async(owner:string,receipt:string)=>{try{return await c.execution.run(owner,receipt)}catch(e){if(e instanceof Error&&e.message==='TAG_EXECUTION_BUSY')busyRetries++;throw e}},waitIdle:async(signal:AbortSignal)=>{await c.execution.waitIdle(signal);if(once){once=false;const assetId=[...f.assets.map(a=>a.id)].sort((a,b)=>a.localeCompare(b,'en'))[1],r=await c.execution.prepare('other-window',{...f.scope,assetId,requestId:'raced-batch'});await c.execution.run('other-window',r.receipt)}}}
 const batch=createTagBatchController({host:f.host,settings:()=>c.settings,execution,changed:()=>{}})
 try{
  await f.host.saveTagBatch({...f.input,requestId:'raced-batch'});await f.host.enableTagExecution({...f.scope,assetId:f.assets[0].id,sessionToken:f.input.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const r=await batch.prepare('main',{...f.scope,assetIds:f.assets.map(a=>a.id),requestId:'raced-batch',backendId:'synthetic',model:'synthetic-model',forceRerun:false}),j=await batch.run('main',r.receipt);await started
  await until(()=>busyRetries,n=>n===1);release();const done=await batch.settle('main',j.id);assert.equal(done.state,'completed');assert.equal(calls,2);assertIdleMaterials(c.admission)
 }finally{release();await Promise.all([batch.suspendAndDrain(),c.close()]);await f.close()}
})
await test('owner revocation and same-generation reopen invalidate frozen batch reviews before any send',async()=>{
 const f=await fixture(1);let calls=0;const c=controllers(f,{invokeOnce:async()=>{calls++;return output()}})
 try{
  const input={...f.scope,assetIds:f.assets.map(a=>a.id),backendId:'synthetic',model:'synthetic-model',requestId:'card-request',forceRerun:false}
  const first=await c.batch.prepare('card:one',input);c.batch.cancelOwner('card:one');await assert.rejects(c.batch.run('card:one',first.receipt))
  const old=await c.prepare();await f.host.close();await f.host.reopen();const j=await c.batch.run('main',old.receipt);assert.equal((await c.batch.settle('main',j.id)).state,'failed');assert.equal(calls,0);assert.equal((await f.host.readTagIntentContext({...f.scope,assetId:f.assets[0].id})).schemaVersion,1)
 }finally{await c.close();await f.close()}
})
await test('closing while batch waits on an existing request cancels orchestration before draining owned work',async()=>{
 const f=await fixture(1);let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r}),c=controllers(f,{invokeOnce:async()=>{entered();await gate;return output()}})
 try{
  await f.host.saveTagBatch(f.input);await f.host.enableTagExecution({...f.scope,assetId:f.assets[0].id,sessionToken:f.input.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
  const r=await c.execution.prepare('single',{...f.scope,assetId:f.assets[0].id,requestId:f.input.requestId});await c.execution.run('single',r.receipt);await started
  const review=await c.prepare(true,'queued-batch'),j=await c.batch.run('main',review.receipt);await until(()=>c.batch.inspect('main',j.id).state,s=>s==='running')
  const barrier=c.admission.hold(),business=f.host.holdBusinessAdmission(),drain=c.close();assert.equal(c.admission.inspect().requests,1);release();await drain
  assert.equal((await c.batch.settle('main',j.id)).state,'cancelled');assert.equal(c.admission.inspect().materialBytes,0)
  await f.host.close();business();barrier();await assert.rejects(f.host.readTagExecution({...f.scope,assetId:f.assets[0].id}));await f.host.reopen();assert.equal((await f.host.readTagExecution({...f.scope,assetId:f.assets[0].id})).current,null)
 }finally{release();await c.close();await f.close()}
})
