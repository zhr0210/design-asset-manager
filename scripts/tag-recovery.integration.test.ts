import {spawn} from 'node:child_process'
import http from 'node:http'
import {build} from 'esbuild'
import {createTagRecoveryController} from '../src/main/independent-tags/tag-recovery-controller'
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
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-recovery-'))),library=path.join(root,'library'),sources:string[]=[]
 for(let i=0;i<count;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:{r:30+i*20,g:80,b:140}}}).png().toFile(file);sources.push(file)}
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}),tagIntentTestHooks:hooks})
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
 const assets=await host.listAssets(),s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!},context=await host.readTagIntentContext({...scope,assetId:assets[0].id})
 const input:TagBatchCommit={...scope,sessionToken:context.sessionToken,expectedSchemaVersion:1,allowUpgrade:true,requestId:'batch-one',backendId:'synthetic',model:'synthetic-model',backendBindingSha256:createHash('sha256').update(JSON.stringify({baseUrl:'http://127.0.0.1:1/v1',type:'openai-compatible',model:'synthetic-model',vision:true})).digest('hex'),recipeId:'independent-tags-v1',recipeVersion:'1',forceRerun:false,items:assets.map(a=>({assetId:a.id,assetRevision:a.revision,previewGeneration:a.thumbnailRef}))}
 return{root,library,dbFile:path.join(library,'.dam','library.sqlite'),assets,host,scope,input,hooks,close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
async function activate(f:Awaited<ReturnType<typeof fixture>>){await f.host.saveTagBatch(f.input);await f.host.enableTagExecution({...f.scope,assetId:f.assets[0].id,sessionToken:f.input.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})}
async function claim(f:Awaited<ReturnType<typeof fixture>>,assetId=f.assets[0].id){const ref={...f.scope,assetId,requestId:f.input.requestId,sessionToken:f.input.sessionToken,inputSha256:'a'.repeat(64),origin:'tags-only' as const};return{...ref,...await f.host.claimTagExecution(ref)}}
for(const sent of [false,true])await test(`new Host session reconciles an orphan ${sent?'sent':'not-sent'} attempt from durable facts`,async()=>{
 const f=await fixture(1)
 try{
  await activate(f);const old=await claim(f);if(sent)await f.host.markTagExecutionSent(old)
  await f.host.close();await assert.rejects(f.host.readTagEffectReceipt(old));await f.host.reopen()
  const read=await f.host.readTagExecution(old);assert.equal(read.jobs[0].state,sent?'outcome-unknown':'paused');assert.notEqual(read.sessionToken,old.sessionToken);assert.equal(read.current,null)
  await assert.rejects(f.host.commitTagExecution({...old,tags:['late']}));const input={...old,sessionToken:read.sessionToken}
  if(sent)await assert.rejects(f.host.claimTagExecution(input));else assert.equal((await f.host.claimTagExecution(input)).attemptEpoch,2)
 }finally{await f.close()}
})
await test('an authorized new session reads committed receipt without an old claim or running backend',async()=>{
 const f=await fixture(1)
 try{
  await activate(f);const ref=await claim(f);await f.host.markTagExecutionSent(ref);const commit={...ref,tags:['saved']},effect=await f.host.commitTagExecution(commit)
  assert.equal((await f.host.readTagEffectReceipt(ref)).receipt?.effectId,effect.effectId);await f.host.close();await assert.rejects(f.host.readTagEffectReceipt(ref));await assert.rejects(f.host.commitTagExecution(commit));await f.host.reopen()
  await assert.rejects(f.host.readTagEffectReceipt(ref));const current=await f.host.readTagExecution(ref);assert.equal(current.jobs[0].state,'succeeded')
  const fresh={...ref,sessionToken:current.sessionToken};assert.equal((await f.host.readTagEffectReceipt(fresh)).receipt?.effectId,effect.effectId);assert.deepEqual(await f.host.commitTagExecution({...commit,sessionToken:current.sessionToken,attemptToken:'not-a-claim'}),effect)
  assert.equal((await f.host.readTagOutbox(fresh)).length,1)
 }finally{await f.close()}
})
await test('recovery list exposes full related batch to Main and never expands a card to other members',async()=>{
 const f=await fixture(2)
 try{
  await activate(f);const input={...f.scope,assetIds:[f.assets[0].id]},main=await f.host.readTagRecovery(input,true),card=await f.host.readTagRecovery(input,false)
  assert.equal(main.length,1);assert.equal(main[0].items.length,2);assert.equal(card.length,0);assert.ok(main[0].items.every(i=>i.sourceMatches&&i.isLatest&&i.state==='waiting-execution'))
 }finally{await f.close()}
})
for(const sent of [false,true])await test(`private shutdown record is ${sent?'unknown':'paused'} before close; closed connection rejects it`,async()=>{
 const f=await fixture(1)
 try{
  await activate(f);const ref=await claim(f);if(sent)await f.host.markTagExecutionSent(ref);const release=f.host.holdBusinessAdmission()
  await assert.rejects(f.host.commitTagExecution({...ref,tags:['blocked']}));await f.host.finishTagExecution({...ref,state:'cancelled'});release()
  assert.equal((await f.host.readTagExecution(ref)).jobs[0].state,sent?'outcome-unknown':'paused');await f.host.close();await assert.rejects(f.host.finishTagExecution({...ref,state:'paused'}))
 }finally{await f.close()}
})
const crashWorker=path.resolve('dist-temp/tests/tag-recovery-crash.worker.mjs')
await build({entryPoints:['scripts/fixtures/tag-recovery-crash.worker.ts'],outfile:crashWorker,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'})
async function crash(root:string,cut:string,url:string){
 const child=spawn(process.execPath,[crashWorker,root,cut,url],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','pipe','pipe']});let buffer='',stderr='',timer:ReturnType<typeof setTimeout>|undefined
 const exited=new Promise<{code:number|null;signal:string|null}>(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})))
 try{
  await new Promise<void>((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Owned crash marker timed out')),15000);child.stdout.on('data',chunk=>{buffer+=chunk;const line=buffer.split('\n').find(x=>x.includes('"ready":true'));if(line){const value=JSON.parse(line);if(value.cut===cut)resolve()}});child.stderr.on('data',chunk=>{stderr+=chunk});child.once('exit',()=>reject(Error('Owned crash worker ended before cut: '+stderr.slice(-1200))))})
  child.kill('SIGKILL');const result=await exited;assert.equal(result.signal,'SIGKILL')
 }finally{if(timer)clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited}}
}
for(const cut of ['before-claim','after-claim','after-sent','after-response','after-commit','after-ack','during-transaction'])await test(`owned process SIGKILL at ${cut} preserves durable facts and cannot revive old authority`,async()=>{
 const f=await fixture(1);let requests=0
 const server=http.createServer(async(req,res)=>{for await(const _ of req){}requests++;res.setHeader('Content-Type','application/json');res.end('{"fixture":"response"}')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r))
 const address=server.address();if(!address||typeof address==='string')throw Error('fixture address')
 const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:f.library})}))
 try{
  await activate(f);await f.host.close();await crash(f.root,cut,`http://127.0.0.1:${address.port}/`)
  if(cut==='during-transaction'){
   const journal=f.dbFile+'-journal',before=await fs.readFile(f.dbFile),sidecar=await fs.readFile(journal);assert.ok(sidecar.length>512);assert.notDeepEqual(sidecar.subarray(0,8),Buffer.alloc(8),'Interrupted journal must have a real header')
   await assert.rejects(host.open());assert.equal(host.inspect().state,'recovery-required');assert.deepEqual(await fs.readFile(f.dbFile),before);assert.deepEqual(await fs.readFile(journal),sidecar)
  }else{
   await host.open();const scope={...f.scope,assetId:f.assets[0].id},snapshot=await host.readTagExecution(scope)
   assert.notEqual(snapshot.sessionToken,f.input.sessionToken);assert.equal(host.inspect().generation,f.scope.generation)
   const expected=cut==='before-claim'?undefined:cut==='after-claim'?'paused':['after-commit','after-ack'].includes(cut)?'succeeded':'outcome-unknown'
   assert.equal(snapshot.jobs[0]?.state,expected);const receipt=await host.readTagEffectReceipt({...scope,sessionToken:snapshot.sessionToken,requestId:f.input.requestId});assert.equal(Boolean(receipt.receipt),expected==='succeeded')
   assert.equal((await host.readTagOutbox({...scope,sessionToken:snapshot.sessionToken})).length,cut==='after-commit'?1:0)
   await assert.rejects(host.readTagEffectReceipt({...scope,sessionToken:f.input.sessionToken,requestId:f.input.requestId}))
  }
  assert.equal(requests,['after-response','after-commit','after-ack','during-transaction'].includes(cut)?1:0)
 }finally{await host.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await f.close()}
})

function controllers(f:Awaited<ReturnType<typeof fixture>>,provider:VisionProvider){
 const settings=createNewInstallAppSettingsDefaults();settings.aiBackends=[{id:'synthetic',name:'Synthetic service',type:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:1/v1',defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}]
 const admission=createVisualAdmission(),legacy=createVisualAiController({host:f.host,settings:()=>settings,admission,provider,onChanged:()=>{}}),execution=createTagExecutionController({host:f.host,settings:()=>settings,admission,provider,legacy,changed:()=>{}}),batch=createTagBatchController({host:f.host,settings:()=>settings,execution,changed:()=>{}})
 const prepare=(forceRerun=false,requestId='reviewed-batch')=>batch.prepare('main',{...f.scope,assetIds:f.assets.map(a=>a.id),backendId:'synthetic',model:'synthetic-model',requestId,forceRerun})
 return{settings,admission,legacy,execution,batch,prepare,close:async()=>{await Promise.all([batch.suspendAndDrain(),execution.suspendAndDrain(),legacy.suspendAndDrain()]);admission.invalidate()}}
}
const output=(tags=['蓝色'])=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({tags})}}]})
await test('outbox failure remains pending; concurrent replay and duplicate ack never infer or duplicate effects',async()=>{
 const f=await fixture(1);let calls=0,notifies=0,fail=true;const c=controllers(f,{invokeOnce:async()=>{calls++;return output()}})
 const recovery=createTagRecoveryController({host:f.host,settings:()=>c.settings,batch:c.batch,changed:()=>{notifies++;if(fail)throw Error('synthetic notification loss')}})
 try{
  await activate(f);const ref=await claim(f);await f.host.markTagExecutionSent(ref);await f.host.commitTagExecution({...ref,tags:['saved']})
  assert.deepEqual(await recovery.flush(f.scope),{delivered:0,pending:true});assert.equal((await f.host.readTagOutbox(ref)).length,1)
  fail=false;await Promise.all([recovery.flush(f.scope),recovery.flush(f.scope)]);assert.equal(notifies,2);assert.equal(calls,0);assert.equal((await f.host.readTagOutbox(ref)).length,0)
  await recovery.flush(f.scope);assert.equal(notifies,2)
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.prepare('SELECT count(*) FROM independent_tag_effect_receipts').pluck().get(),1);assert.equal(db.prepare('SELECT count(*) FROM independent_tag_evidence').pluck().get(),1)}finally{db.close()}
 }finally{await c.close();await f.close()}
})
await test('explicit recovery reuses success, skips remote unknown and continues only the remaining item',async()=>{
 const f=await fixture(3);let calls=0
 try{
  await activate(f);const first=await claim(f,f.assets[0].id);await f.host.markTagExecutionSent(first);await f.host.commitTagExecution({...first,tags:['original success']});const unknown=await claim(f,f.assets[1].id);await f.host.markTagExecutionSent(unknown)
  await f.host.close();await f.host.reopen();const c=controllers(f,{invokeOnce:async()=>{calls++;return output(['continued'])}}),recovery=createTagRecoveryController({host:f.host,settings:()=>c.settings,batch:c.batch,changed:()=>{}})
  try{
   const input={...f.scope,assetIds:[f.assets[0].id]},list=await recovery.list('main',input);assert.equal(list[0].items.filter(i=>i.state==='outcome-unknown').length,1)
   c.settings.aiBackends[0].enabled=false;assert.ok((await recovery.receipt('main',{...f.scope,assetId:f.assets[0].id,requestId:f.input.requestId})).receipt);await assert.rejects(recovery.prepare('main',{...input,requestId:f.input.requestId}));c.settings.aiBackends[0].enabled=true
   const review=await recovery.prepare('main',{...input,requestId:f.input.requestId});assert.match(review.resumeSummary,/1 项可继续，1 项复用已保存结果，1 项未知/);assert.equal(calls,0)
   const j=await c.batch.run('main',review.receipt),done=await c.batch.settle('main',j.id);assert.equal(done.state,'partial');assert.equal(calls,1);assert.equal(done.items.filter(i=>i.state==='succeeded').length,2);assert.equal(done.items.filter(i=>i.state==='outcome-unknown').length,1)
   assert.deepEqual((await f.host.readTagExecution({...f.scope,assetId:f.assets[0].id})).current?.tags,['original success']);await assert.rejects(recovery.prepare('main',{...input,requestId:f.input.requestId}));assert.equal(calls,1)
  }finally{await c.close()}
 }finally{await f.close()}
})
await test('changed destination rejects resume and changed authentication after fresh review cannot send',async()=>{
 const f=await fixture(1);let calls=0;const c=controllers(f,{invokeOnce:async()=>{calls++;return output()}}),recovery=createTagRecoveryController({host:f.host,settings:()=>c.settings,batch:c.batch,changed:()=>{}})
 try{
  await activate(f);const input={...f.scope,assetIds:[f.assets[0].id],requestId:f.input.requestId},original=c.settings.aiBackends[0].baseUrl
  c.settings.aiBackends[0].baseUrl='http://127.0.0.1:2/v1';await assert.rejects(recovery.prepare('main',input));c.settings.aiBackends[0].baseUrl=original
  c.settings.aiBackends[0].apiKey='synthetic-first-credential';const review=await recovery.prepare('main',input);c.settings.aiBackends[0].apiKey='synthetic-updated-credential';const j=await c.batch.run('main',review.receipt);assert.equal((await c.batch.settle('main',j.id)).state,'failed');assert.equal(calls,0)
 }finally{await c.close();await f.close()}
})
await test('corrupt generated database remains recovery-required with bytes unchanged',async()=>{
 const f=await fixture(1),host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:f.library})}))
 try{await activate(f);await f.host.close();const bytes=await fs.readFile(f.dbFile);bytes.fill(0,0,16);await fs.writeFile(f.dbFile,bytes);await assert.rejects(host.open());assert.equal(host.inspect().state,'recovery-required');assert.deepEqual(await fs.readFile(f.dbFile),bytes)}finally{await host.close();await f.close()}
})
for(const route of ['list','receipt'] as const)await test(`late ${route} response cannot survive its card owner revocation`,async()=>{
 const f=await fixture(1),c=controllers(f,{invokeOnce:async()=>output()});let release!:()=>void,entered!:()=>void
 const gate=new Promise<void>(r=>{release=r}),atReturn=new Promise<void>(r=>{entered=r}),host={...f.host,readTagEffectReceipt:async(...args:Parameters<typeof f.host.readTagEffectReceipt>)=>{const result=await f.host.readTagEffectReceipt(...args);if(route==='receipt'){entered();await gate}return result}},recovery=createTagRecoveryController({host,settings:()=>c.settings,batch:c.batch,changed:async()=>{if(route==='list'){entered();await gate}}})
 try{
  await activate(f);const ref=await claim(f);await f.host.markTagExecutionSent(ref);await f.host.commitTagExecution({...ref,tags:['saved']})
  const pending=route==='list'?recovery.list('card:one',{...f.scope,assetIds:[f.assets[0].id]}):recovery.receipt('card:one',{...f.scope,assetId:f.assets[0].id,requestId:f.input.requestId})
  const rejected=assert.rejects(pending);await atReturn;recovery.cancelOwner('card:one');release();await rejected
 }finally{release();await c.close();await f.close()}
})
await test('a preserved receipt is historical after content changes even when the pointer row still exists',async()=>{
 const f=await fixture(1)
 try{
  await activate(f);const ref=await claim(f);await f.host.markTagExecutionSent(ref);await f.host.commitTagExecution({...ref,tags:['old-content']})
  const db=new Database(f.dbFile);try{db.prepare('UPDATE asset_lifecycle SET revision=? WHERE design_asset_identity=?').run('generated-new-revision',f.assets[0].id)}finally{db.close()}
  assert.equal((await f.host.readTagExecution(ref)).current,null);const saved=await f.host.readTagEffectReceipt(ref);assert.ok(saved.receipt);assert.equal(saved.isCurrent,false)
 }finally{await f.close()}
})
await test('notification paging is bounded to 1000 and explicitly reports remaining synthetic events',async()=>{
 const f=await fixture(1),c=controllers(f,{invokeOnce:async()=>{throw Error('must not infer')}});let notifications=0
 const events=Array.from({length:1001},(_,i)=>({eventId:`synthetic-${i}`,assetId:f.assets[0].id})),host={...f.host,readTagOutbox:async()=>events.slice(0,50),ackTagOutbox:async(_scope:unknown,id:string)=>{assert.equal(events[0].eventId,id);events.shift()}}
 const recovery=createTagRecoveryController({host,settings:()=>c.settings,batch:c.batch,changed:()=>{notifications++}})
 try{assert.deepEqual(await recovery.flush(f.scope),{delivered:1000,pending:true});assert.equal(notifications,1000);assert.deepEqual(await recovery.flush(f.scope),{delivered:1,pending:false});assert.equal(notifications,1001)}finally{await c.close();await f.close()}
})
await test('the related-history list remains bounded while exact selected history stays readable',async()=>{
 const f=await fixture(1)
 try{
  await activate(f);for(let i=0;i<24;i++)await f.host.saveTagBatch({...f.input,expectedSchemaVersion:10,requestId:`history-${i}`,forceRerun:true})
  const input={...f.scope,assetIds:[f.assets[0].id]},recent=await f.host.readTagRecovery(input,true);assert.equal(recent.length,20);assert.equal(recent[0].items[0].requestGeneration,25)
  const original=await f.host.readTagRecovery(input,true,'batch-one');assert.equal(original.length,1);assert.equal(original[0].items[0].state,'superseded')
 }finally{await f.close()}
})
