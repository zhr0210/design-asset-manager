import {build} from 'esbuild'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
import {enableOcrStorage} from '../src/main/ocr/ocr.schema'
import {applyTagIntentSchema} from '../src/main/independent-tags/tag-intent.schema'
import {applyTagExecutionSchema} from '../src/main/independent-tags/tag-execution.schema'
import {applyTagDecisionSchema} from '../src/main/independent-tags/tag-decision.schema'
import {createBackgroundAnalysisController} from '../src/main/background-analysis/background-analysis-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createOcrController} from '../src/main/ocr/ocr-controller'
import {registerBackgroundAnalysisIpc} from '../src/main/ipc/background-analysis.ipc'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
async function fixture(hooks:TagIntentTestHooks={}){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-background-plan-'))),library=path.join(root,'library'),sources:string[]=[];let next=0
 for(let i=0;i<3;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:'#7799bb'}}).png().toFile(file);sources.push(file)}
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:sources[next++]}]})}),tagIntentTestHooks:hooks})
 const p=await host.prepareCreate();if(p.kind!=='planned')throw Error('fixture');await host.confirmCreate(p.plan.receipt)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!}
 const add=async()=>{const p=await host.prepareAddAssets();if(p.kind!=='planned')throw Error('fixture');const result=await host.dispatchAddAssets(p.plan.receipt);return{receipt:p.plan.receipt,id:result.items[0].promotion!.designAssetIdentity}}
 return{root,host,scope,add,sources,hooks,dbFile:path.join(library,'.dam','library.sqlite'),close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
await test('explicit baseline preference persists; only later promoted assets receive three lightweight intents',async()=>{
 const f=await fixture(),host=f.host as any
 try{
  const old=await f.add();assert.equal(typeof host.readBackgroundAnalysis,'function','Host must expose the reviewed metadata-only background plan boundary')
  const initial=await host.readBackgroundAnalysis(f.scope);assert.equal(initial.schemaVersion,1);assert.equal(initial.policy.enabled,false)
  await host.configureBackgroundAnalysis({...f.scope,sessionToken:initial.sessionToken,expectedRevision:0,expectedSchemaVersion:1,allowUpgrade:true,enabled:true,capabilities:{tags:true,caption:true,ocr:true}})
  assert.equal((await host.readBackgroundAnalysis({...f.scope,assetId:old.id})).intents.length,0,'Enabling must not backfill old assets')
  const added=await f.add();await f.host.dispatchAddAssets(added.receipt)
  const current=await host.readBackgroundAnalysis({...f.scope,assetId:added.id});assert.equal(current.schemaVersion,12);assert.deepEqual(current.intents.map((i:any)=>i.capability).sort(),['caption','ocr','tags']);assert.ok(current.intents.every((i:any)=>i.state==='waiting'))
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.prepare('SELECT COUNT(*) FROM background_analysis_intents').pluck().get(),3);assert.equal(db.prepare('SELECT COUNT(*) FROM independent_tag_executions').pluck().get(),0)}finally{db.close()}
  await f.host.close();await f.host.reopen();assert.equal((await host.readBackgroundAnalysis(f.scope)).policy.enabled,true)
 }finally{await f.close()}
})
async function configure(f:Awaited<ReturnType<typeof fixture>>,enabled=true,capabilities={tags:true,caption:true,ocr:true}){const c=await f.host.readBackgroundAnalysis(f.scope);return f.host.configureBackgroundAnalysis({...f.scope,sessionToken:c.sessionToken,expectedRevision:c.policy.revision,expectedSchemaVersion:c.schemaVersion,allowUpgrade:true,enabled,capabilities})}
for(const version of [8,9,10,11])await test(`known profile ${version} upgrades to 12 without seeding historical background intents`,async()=>{
 const f=await fixture()
 try{
  const old=await f.add();await f.host.close();const db=new Database(f.dbFile);try{db.pragma('foreign_keys=ON');if(version===8)enableOcrStorage(db);else if(version===9)applyTagIntentSchema(db);else{applyTagExecutionSchema(db);if(version===11)applyTagDecisionSchema(db)}}finally{db.close()}
  await f.host.reopen();assert.equal((await f.host.readBackgroundAnalysis(f.scope)).schemaVersion,version);await configure(f);assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:old.id})).intents.length,0);const next=await f.add();assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:next.id})).intents.length,3)
 }finally{await f.close()}
})
for(const fault of ['afterDdl','beforeCommit','afterCommit']as const)await test(`configuration migration ${fault} fault has an atomic and truthful result`,async()=>{
 const hooks:TagIntentTestHooks={},f=await fixture(hooks)
 try{hooks[fault]=()=>{throw Error('synthetic fault')};await assert.rejects(configure(f));delete hooks[fault];const s=await f.host.readBackgroundAnalysis(f.scope);assert.equal(s.schemaVersion,fault==='afterCommit'?12:1);assert.equal(s.policy.enabled,fault==='afterCommit');if(fault!=='afterCommit')await configure(f);const next=await f.add();assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:next.id})).intents.length,3)}finally{await f.close()}
})
await test('user pause/cancel survives policy toggles, Trash restoration and fresh session; source changes are not new work',async()=>{
 const f=await fixture()
 try{
  await configure(f);const a=await f.add(),scope={...f.scope,assetId:a.id},s=await f.host.readBackgroundAnalysis(scope),tag=s.intents.find(i=>i.capability==='tags')!,ocr=s.intents.find(i=>i.capability==='ocr')!
  const pause={...scope,id:tag.id,sessionToken:s.sessionToken,expectedRevision:tag.revision,action:'pause' as const};await f.host.changeBackgroundIntent(pause);await assert.rejects(f.host.changeBackgroundIntent(pause))
  await f.host.changeBackgroundIntent({...scope,id:ocr.id,sessionToken:s.sessionToken,expectedRevision:ocr.revision,action:'cancel'});await configure(f,false);await configure(f,true)
  const asset=(await f.host.listAssets())[0],plan=await f.host.prepareTrash({kind:'move-design-asset-to-trash',designAssetIdentity:a.id,expectedRevision:asset.revision});const trash=await f.host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt});await f.host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:a.id,expectedRevision:trash.revision})
  await f.host.close();await f.host.reopen();const restored=await f.host.readBackgroundAnalysis(scope);assert.equal(restored.intents.length,3);assert.equal(restored.intents.find(i=>i.capability==='tags')!.state,'user-paused');assert.equal(restored.intents.find(i=>i.capability==='ocr')!.state,'cancelled')
  await assert.rejects(f.host.changeBackgroundIntent({...pause,expectedRevision:2,action:'resume'}));await assert.rejects(f.host.changeBackgroundIntent({...scope,id:ocr.id,sessionToken:restored.sessionToken,expectedRevision:2,action:'resume'}))
  const resumed=await f.host.changeBackgroundIntent({...pause,sessionToken:restored.sessionToken,expectedRevision:2,action:'resume'});assert.equal(resumed.intents.find(i=>i.capability==='tags')!.state,'waiting');await f.host.changeBackgroundIntent({...pause,sessionToken:restored.sessionToken,expectedRevision:3})
  const db=new Database(f.dbFile);try{db.prepare('UPDATE asset_candidates SET preview_generation_identity=? WHERE candidate_identity=(SELECT candidate_identity FROM promotion_links WHERE design_asset_identity=?)').run('changed-generated-preview',a.id)}finally{db.close()}
  const changed=await f.host.readBackgroundAnalysis(scope);assert.equal(changed.intents.find(i=>i.capability==='tags')!.state,'superseded');assert.equal(changed.intents.length,3)
 }finally{await f.close()}
})
await test('capability toggles affect future registration only; replay and poll never create intents',async()=>{
 const f=await fixture()
 try{await configure(f,true,{tags:true,caption:false,ocr:false});const a=await f.add();await f.host.dispatchAddAssets(a.receipt);for(let i=0;i<5;i++)assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:a.id})).intents.length,1);await configure(f);assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:a.id})).intents.length,1);const b=await f.add();assert.equal((await f.host.readBackgroundAnalysis({...f.scope,assetId:b.id})).intents.length,3)}finally{await f.close()}
})
await test('an intent storage fault rolls back Promotion rather than publishing an asset without its reviewed plan',async()=>{
 const f=await fixture()
 try{
  await configure(f);const p=await f.host.prepareAddAssets();if(p.kind!=='planned')throw Error('fixture');const db=new Database(f.dbFile)
  try{db.exec("CREATE TRIGGER synthetic_background_failure BEFORE INSERT ON background_analysis_intents BEGIN SELECT RAISE(ABORT,'synthetic'); END");await f.host.dispatchAddAssets(p.plan.receipt).catch(()=>{});assert.equal((await f.host.listAssets()).length,0);assert.equal(db.prepare('SELECT COUNT(*) FROM background_analysis_intents').pluck().get(),0);assert.equal(db.prepare("SELECT COUNT(*) FROM asset_candidates WHERE lifecycle_state='promoted'").pluck().get(),0)}finally{db.exec('DROP TRIGGER synthetic_background_failure');db.close()}
 }finally{await f.close()}
})
await test('OCR maintenance rejects in-flight configure, blocks new operations and does not restore old reviews',async()=>{
 let release!:()=>void,entered!:()=>void,calls=0;const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r}),ocr=createOcrController({host:{} as any,runtime:{current:async()=>{calls++;return null},configure:async()=>{entered();await gate}},changed:()=>{}})
 const configuring=ocr.configure();await started;assert.throws(()=>ocr.holdForMaintenance());release();await configuring
 const a=ocr.holdForMaintenance(),b=ocr.holdForMaintenance();await assert.rejects(ocr.configure());await assert.rejects(ocr.prepare({libraryIdentity:'fixture',generation:'fixture',assetIds:['fixture']}));await assert.rejects(ocr.run('expired'));a();await assert.rejects(ocr.configure());b();assert.equal(calls,0)
})
const unknownTelemetry=()=>({memory:{kind:'unknown' as const},battery:{kind:'unknown' as const},lowPower:{kind:'unknown' as const},thermal:{kind:'unknown' as const},idle:{kind:'unknown' as const},visible:{kind:'unknown' as const},gpuFree:{kind:'unknown' as const}})
await test('controller and formal IPC keep card members scoped and reject late owner reads',async()=>{
 const f=await fixture(),admission=createVisualAdmission();let release!:()=>void,entered!:()=>void,delay=false
 const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r}),host={...f.host,readBackgroundAnalysis:async(...args:Parameters<typeof f.host.readBackgroundAnalysis>)=>{const v=await f.host.readBackgroundAnalysis(...args);if(delay){entered();await gate}return v}},c=createBackgroundAnalysisController({host,admission,telemetry:unknownTelemetry,holdOcr:()=>()=>{},visuals:{suspendAndDrain:async()=>{},resume:()=>{}}}),handlers=new Map<string,any>(),main={}as any,card={}as any
 try{
  await configure(f);const a=await f.add(),scope={...f.scope,assetId:a.id}
  registerBackgroundAnalysisIpc({controller:c,card:{isTrusted:(e:any)=>e===card,inspect:()=>({token:'one',context:scope})}as any,isMain:e=>e===main,handle:(name,handler)=>{handlers.set(name,handler)}})
  const call=(name:string,event:any,input:any)=>handlers.get('background-analysis:'+name)(event,input)
  assert.equal((await call('read',card,f.scope)).ok,false);assert.equal((await call('read',card,{...scope,assetId:'foreign'})).ok,false);assert.equal((await call('prepare',card,{...f.scope,enabled:true})).ok,false)
  const view=await call('read',card,scope);assert.equal(view.ok,true);assert.equal(view.value.dispatchAvailable,false);assert.equal(view.value.canConfigure,false);assert.equal(view.value.execution.policy.enabled,false);assert.ok(view.value.capabilityReadiness.every((r:any)=>!r.ready),'No executor or continuous rules were granted in this fixture')
  delay=true;const pending=c.read('card:one',scope),reject=assert.rejects(pending);await started;c.cancelOwner('card:one');release();await reject
 }finally{release?.();c.invalidate();admission.invalidate();await f.close()}
})
await test('a legacy combined current is seeded exactly once and v12 keeps prior user edits and each storage capability usable',async()=>{
 const f=await fixture()
 try{
  const {id}=await f.add(),asset=(await f.host.listAssets())[0],scope={...f.scope,assetId:id},e={id:'old-combined',assetId:id,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,inputSha256:'b'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',purpose:'analyze' as const,inputScope:'controlled-preview-rgb' as const,recipe:'visual-ai-v1' as const,createdAt:new Date().toISOString(),output:{caption:'AI caption',prompt:'Historical prompt',ocrText:'',tags:['已确认','待决定']}}
  await f.host.enableVisualAi();await f.host.saveVisualAiEvidence(e);await f.host.confirmVisualAiTag(id,e.id,'已确认');await f.host.updateAssetCaption(id,'User caption')
  await configure(f);const c=await f.host.readTagExecution(scope);assert.equal(c.schemaVersion,12);assert.equal(c.current?.originalVisualEvidenceId,e.id)
  await f.host.decideTag({...scope,sessionToken:c.sessionToken,expectedSchemaVersion:12,allowUpgrade:false,evidenceId:c.current!.evidenceId,tag:'待决定',decision:'reject'});await configure(f,false);await configure(f,true)
  assert.deepEqual((await f.host.readTagExecution(scope)).current?.tags,['已确认']);assert.equal((await f.host.listAssets())[0].aiCaption,'User caption')
  const ocr=await f.host.readOcr(scope),saved=await f.host.commitOcr({...scope,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr-v12',assetId:id,assetRevision:asset.revision,sourceRef:asset.thumbnailRef,inputSha256:'e'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}}})
  await f.host.correctOcr({...scope,sessionToken:saved.sessionToken,expectedRevision:saved.revision,evidenceId:'ocr-v12',text:'User OCR'})
  const note=await f.host.readNotebook(scope);await f.host.saveNotebook({...scope,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:note.revision,allowUpgrade:false,book:note.book})
  const org=await f.host.readOrganization(f.scope);await f.host.writeOrganization({...f.scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'User folder',folderKind:'assets',parentId:null,assetIds:[id]}})
  const work=await f.host.readWorkSets(f.scope,'device-v12'),set=await f.host.writeWorkSet({...f.scope,sessionToken:work.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'User set',note:'User note',assetIds:[id],colors:[],columns:1}}},'device-v12'),layout={x:12,y:20,width:400,height:500,pinned:true,open:false};await f.host.writeWorkLayout({...f.scope,sessionToken:work.sessionToken,id:set.sets[0].id,layout},'device-v12')
  await f.host.downloadJournal({kind:'create',generation:f.scope.generation,taskId:'download-v12',url:'https://fixture.invalid/not-requested.png',fileName:'generated.png'})
  for(const recipe of ['visual-ai-v1','independent-tags-v1']){
   await f.host.saveTagIntent({...scope,sessionToken:c.sessionToken,expectedSchemaVersion:12,allowUpgrade:false,requestId:recipe,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:'synthetic',model:'synthetic-model',backendBindingSha256:'a'.repeat(64),recipeId:recipe,recipeVersion:'1'})
   const claim=await f.host.claimTagExecution({...scope,sessionToken:c.sessionToken,requestId:recipe,inputSha256:'b'.repeat(64),origin:recipe==='visual-ai-v1'?'combined':'tags-only'}),ref={...scope,sessionToken:c.sessionToken,requestId:recipe,attemptToken:claim.attemptToken};await f.host.markTagExecutionSent(ref);await f.host.commitTagExecution({...ref,tags:['新的标签'],...(recipe==='visual-ai-v1'?{combinedEvidence:{...e,id:'v12-combined',output:{...e.output,tags:['新的标签']}}}:{})})
  }
  await f.host.close();await f.host.reopen();assert.equal((await f.host.readOcr(scope)).editedText,'User OCR');assert.equal((await f.host.readNotebook(scope)).revision,1);assert.equal((await f.host.readOrganization(f.scope)).folders[0].name,'User folder');assert.deepEqual((await f.host.readWorkSets(f.scope,'device-v12')).sets[0].layout,layout);assert.equal((await f.host.downloadJournal({kind:'list',generation:f.scope.generation})).intents!.length,1);assert.equal((await f.host.listAssets())[0].aiCaption,'User caption');assert.deepEqual((await f.host.listAssets())[0].tags,['已确认']);assert.deepEqual((await f.host.readTagExecution(scope)).current?.tags,['新的标签'])
 }finally{await f.close()}
})
await test('postcommit settings restoration failure quarantines v12 and does not allow further business writes',async()=>{
 const f=await fixture(),original=Database.prototype.pragma;let once=true
 try{Database.prototype.pragma=function(sql:string,options?:any):any{if(once&&sql.startsWith('cache_spill = ')&&!sql.endsWith('OFF')){once=false;throw Error('synthetic restoration error')}return original.call(this,sql,options)};await assert.rejects(configure(f));assert.equal(f.host.inspect().state,'recovery-required');await assert.rejects(f.host.readBackgroundAnalysis(f.scope));const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.pragma('user_version',{simple:true}),12)}finally{db.close()}}finally{Database.prototype.pragma=original;await f.close()}
})
await test('the frozen v11 reader refuses v12 without changing database bytes',async()=>{
 const f=await fixture()
 try{
  await configure(f);await f.host.close();const base=path.resolve('scripts/fixtures/background-v11'),manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8')),frozen=await readFrozenLibrarySource(base,manifest)
  const source=frozen['library-open-control-store.internal.ts'],version=frozen['library-schema-version.ts'],output=path.resolve('dist-temp/tests/background-v11-reader.mjs')
  await build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'frozen-version',setup(b){b.onResolve({filter:/library-schema-version$/},()=>({path:'frozen-v11',namespace:'frozen'}));b.onLoad({filter:/.*/,namespace:'frozen'},()=>({contents:version,loader:'ts'}))}}]})
  const old=await import(pathToFileURL(output).href),decl=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.root,'library/.dam/library.manifest.json'))));if(decl.kind!=='compatible')throw Error('fixture manifest');const before=await fs.readFile(f.dbFile),db=openReadonlyLibraryDatabase(f.dbFile);try{assert.equal(old.inspectLibraryControlStore(db,decl.declaration).kind,'unsupported')}finally{db.close()};assert.deepEqual(await fs.readFile(f.dbFile),before)
 }finally{await f.close()}
})
await test('policy receipts expire or lose authority, and overlapping barriers are not released by an upgrade',async()=>{
 const f=await fixture(),admission=createVisualAdmission();let now=0,held=false,resumes=0
 const c=createBackgroundAnalysisController({host:f.host,admission,telemetry:unknownTelemetry,now:()=>now,holdOcr:()=>{held=true;return()=>{held=false}},visuals:{suspendAndDrain:async()=>{assert.equal(held,true)},resume:()=>{resumes++}}})
 const input={...f.scope,enabled:true,capabilities:{tags:true,caption:true,ocr:true},expectedRevision:0}
 try{const old=await c.prepare('main',input);now=300001;await assert.rejects(c.confirm('main',old.receipt));const revoked=await c.prepare('main',input);c.invalidate();await assert.rejects(c.confirm('main',revoked.receipt));const good=await c.prepare('main',input),other=admission.hold();await c.confirm('main',good.receipt);assert.equal(resumes,1);assert.equal(held,false);assert.equal(admission.inspect().accepting,false);other()}finally{c.invalidate();admission.invalidate();await f.close()}
})
await test('OCR preparation is fenced, and a real prepared review is invalidated by the idle maintenance lock',async()=>{
 const f=await fixture();let release!:()=>void,entered!:()=>void,calls=0
 const gate=new Promise<void>(r=>{release=r}),started=new Promise<void>(r=>{entered=r}),ocr=createOcrController({host:f.host,runtime:{configure:async()=>{},current:async()=>{entered();await gate;return{label:'synthetic',fingerprint:'synthetic',run:async()=>{calls++;throw Error('must not run')}}}},changed:()=>{}})
 try{const a=await f.add(),preparing=ocr.prepare({...f.scope,assetIds:[a.id]});await started;assert.throws(()=>ocr.holdForMaintenance());release();const old=await preparing,unlock=ocr.holdForMaintenance();unlock();await assert.rejects(ocr.run(old.receipt));assert.equal(calls,0)}finally{release();ocr.invalidate();await f.close()}
})
await test('the last safe policy revision remains readable and further writes fail without overflow',async()=>{
 const f=await fixture()
 try{await configure(f);const db=new Database(f.dbFile);try{db.prepare('UPDATE background_analysis_policy SET revision=?').run(Number.MAX_SAFE_INTEGER-1)}finally{db.close()};const final=await configure(f,false);assert.equal(final.policy.revision,Number.MAX_SAFE_INTEGER);assert.equal(final.policy.enabled,false);await assert.rejects(configure(f,true));assert.equal((await f.host.readBackgroundAnalysis(f.scope)).policy.enabled,false)}finally{await f.close()}
})
