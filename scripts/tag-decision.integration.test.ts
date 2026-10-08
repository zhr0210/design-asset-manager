import {build} from 'esbuild'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import {pathToFileURL} from 'node:url'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
import Database from 'better-sqlite3'
import {createHash} from 'node:crypto'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createTagDecisionController} from '../src/main/independent-tags/tag-decision-controller'
import {registerTagDecisionIpc} from '../src/main/ipc/tag-decision.ipc'
import {projectAiFolders} from '../src/shared/workflows/ai-folders.workflow'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'

async function fixture(hooks:TagIntentTestHooks={}){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-decisions-'))),library=path.join(root,'library'),source=path.join(root,'generated.png')
 await sharp({create:{width:80,height:80,channels:3,background:'#7799bb'}}).png().toFile(source)
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}),tagIntentTestHooks:hooks})
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
 const asset=(await host.listAssets())[0],s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!,assetId:asset.id},context=await host.readTagIntentContext(scope)
 const intent={...scope,sessionToken:context.sessionToken,expectedSchemaVersion:1,allowUpgrade:true,requestId:'first',assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:'synthetic',model:'synthetic',backendBindingSha256:'a'.repeat(64),recipeId:'independent-tags-v1',recipeVersion:'1'}
 await host.saveTagIntent(intent);await host.enableTagExecution({...scope,sessionToken:context.sessionToken,expectedSchemaVersion:9,allowUpgrade:true})
 const publish=async(requestId:string,tags:string[],family:'independent-tags-v1'|'visual-ai-v1'='independent-tags-v1',model='synthetic')=>{
  const live=await host.readTagIntentContext(scope)
  if(requestId!=='first')await host.saveTagIntent({...intent,assetRevision:live.asset.revision,previewGeneration:live.asset.previewGeneration,requestId,model,recipeId:family,expectedSchemaVersion:live.schemaVersion})
  const combined=family==='visual-ai-v1',c=await host.claimTagExecution({...scope,sessionToken:context.sessionToken,requestId,inputSha256:'b'.repeat(64),origin:combined?'combined':'tags-only'})
  await host.markTagExecutionSent({...scope,sessionToken:context.sessionToken,requestId,attemptToken:c.attemptToken})
  const combinedEvidence=combined?{id:`visual:${requestId}`,assetId:asset.id,assetRevision:live.asset.revision,previewGeneration:live.asset.previewGeneration,inputSha256:'b'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model,purpose:'analyze' as const,inputScope:'controlled-preview-rgb' as const,recipe:'visual-ai-v1' as const,createdAt:new Date().toISOString(),output:{caption:'Synthetic caption',prompt:'Synthetic prompt',ocrText:'',tags}}:undefined
  await host.commitTagExecution({...scope,sessionToken:context.sessionToken,requestId,attemptToken:c.attemptToken,tags,combinedEvidence});return(await host.readTagExecution(scope)).current!
 }
 const current=await publish('first',['蓝色','几何'])
 return{root,library,asset,source,dbFile:path.join(library,'.dam','library.sqlite'),hooks,host,scope,context,current,publish,close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
await test('explicit confirmation remains manual and rejection persists across same-family rerun and reopen',async()=>{
 const f=await fixture(),host=f.host as any
 try{
  assert.equal(typeof host.decideTag,'function','The real Host must implement source-bound user decisions')
  const input={...f.scope,sessionToken:f.context.sessionToken,expectedSchemaVersion:10,allowUpgrade:false,evidenceId:f.current.evidenceId,tag:'蓝色',decision:'confirm'}
  await host.decideTag(input);await host.decideTag(input)
  assert.deepEqual((await f.host.listAssets())[0].tags,['蓝色']);assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,10)
  await assert.rejects(host.decideTag({...input,tag:'几何',decision:'reject'}))
  await host.decideTag({...input,tag:'几何',decision:'reject',allowUpgrade:true})
  assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,11)
  assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['蓝色'])
  await f.publish('again',['几何','蓝色']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['蓝色'])
  await f.host.close();await f.host.reopen();assert.deepEqual((await f.host.listAssets())[0].tags,['蓝色']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['蓝色'])
 }finally{await f.close()}
})
const decision=(f:Awaited<ReturnType<typeof fixture>>,tag='几何')=>({...f.scope,sessionToken:f.context.sessionToken,expectedSchemaVersion:10,allowUpgrade:true,evidenceId:f.current.evidenceId,tag,decision:'reject' as const})
await test('family decisions preserve manual facts, normalize variants and do not suppress another recipe family',async()=>{
 const f=await fixture(),hash=async()=>createHash('sha256').update(await fs.readFile(f.source)).digest('hex'),original=await hash()
 try{
  const first=decision(f,'蓝色');await f.host.decideTag({...first,decision:'confirm'});await f.host.decideTag(first);await f.host.decideTag(first)
  assert.deepEqual((await f.host.listAssets())[0].tags,['蓝色']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['几何'])
  const next=await f.publish('model-two',['蓝色','Ａdobe'],'independent-tags-v1','another-model');assert.deepEqual(next.tags,['Ａdobe'])
  await f.host.decideTag({...first,evidenceId:next.evidenceId,tag:'adobe',expectedSchemaVersion:11});assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,[])
  assert.equal((await f.host.readTagExecution(f.scope)).current?.observedTagCount,2)
  await f.publish('model-three',['ADOBE','蓝色']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,[])
  const combined=await f.publish('other-family',['蓝色','ADOBE'],'visual-ai-v1');assert.deepEqual(combined.tags,['蓝色','ADOBE'])
  assert.deepEqual(combined.pendingTags,['ADOBE']);await f.host.decideTag({...first,evidenceId:combined.evidenceId,tag:'ADOBE',expectedSchemaVersion:11})
  await assert.rejects(f.host.confirmVisualAiTag(f.scope.assetId,combined.originalVisualEvidenceId!,'ADOBE'))
  const rows=await f.host.listAssets();assert.deepEqual(rows[0].tagAnalysis?.tags,['蓝色']);assert.ok(!projectAiFolders(rows).some(folder=>folder.name==='ADOBE'));assert.equal(await hash(),original)
 }finally{await f.close()}
})
await test('source, session, evidence and tag membership are checked again at the Host write',async()=>{
 const f=await fixture()
 try{
  const input=decision(f)
  for(const change of [{assetId:'foreign'},{generation:'foreign'},{sessionToken:'expired'},{evidenceId:'foreign'},{tag:'not-in-output'}])await assert.rejects(f.host.decideTag({...input,...change}))
  const abort=new AbortController();abort.abort();await assert.rejects(f.host.decideTag(input,abort.signal))
  await f.publish('new-current',['几何']);await assert.rejects(f.host.decideTag(input));assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,10)
  const fresh={...input,evidenceId:(await f.host.readTagExecution(f.scope)).current!.evidenceId};await f.host.close();await f.host.reopen();await assert.rejects(f.host.decideTag(fresh));assert.deepEqual((await f.host.listAssets())[0].tags,[])
 }finally{await f.close()}
})
for(const point of ['afterDdl','beforeCommit','afterCommit'] as const)await test(`first rejection migration fault at ${point} has a truthful durable outcome`,async()=>{
 const hooks:TagIntentTestHooks={},f=await fixture(hooks)
 try{
  hooks[point]=()=>{throw Error('synthetic fault')};await assert.rejects(f.host.decideTag(decision(f)));delete hooks[point]
  const snapshot=await f.host.readTagExecution(f.scope);assert.equal(snapshot.schemaVersion,point==='afterCommit'?11:10);assert.deepEqual(snapshot.current?.tags,point==='afterCommit'?['蓝色']:['蓝色','几何'])
  await f.host.decideTag(decision(f));const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.prepare('SELECT count(*) FROM independent_tag_rejections').pluck().get(),1)}finally{db.close()}
  await f.host.close();await f.host.reopen();assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['蓝色'])
 }finally{await f.close()}
})
await test('decision receipts bind owner, expiry and authority; upgrade drain is bounded by independent barriers',async()=>{
 const f=await fixture(),admission=createVisualAdmission();let time=0,drains=0,resumes=0,changes=0
 const c=createTagDecisionController({host:f.host,admission,visuals:{suspendAndDrain:async()=>{drains++},resume:()=>{resumes++}},changed:()=>{changes++;throw Error('lost notification')},now:()=>time})
 const input={...f.scope,evidenceId:f.current.evidenceId,tag:'几何',decision:'reject' as const}
 try{
  const r=await c.prepare('card:one',input);await assert.rejects(c.confirm('main',r.receipt));c.cancelOwner('card:one');await assert.rejects(c.confirm('card:one',r.receipt))
  const expired=await c.prepare('main',input);time=300001;await assert.rejects(c.confirm('main',expired.receipt))
  const invalidated=await c.prepare('main',input);c.invalidate();await assert.rejects(c.confirm('main',invalidated.receipt))
  const valid=await c.prepare('main',input),hold=admission.hold();assert.equal(valid.requiresUpgrade,true);await c.confirm('main',valid.receipt);assert.equal(drains,1);assert.equal(resumes,1);assert.equal(changes,1);assert.equal(admission.inspect().accepting,false);hold()
  const ordinary=await c.prepare('main',input);assert.equal(ordinary.requiresUpgrade,false);await c.confirm('main',ordinary.receipt);assert.equal(drains,1);assert.equal(changes,2)
  await assert.rejects(c.confirm('main',ordinary.receipt))
 }finally{c.invalidate();admission.invalidate();await f.close()}
})
await test('formal decision IPC rejects foreign card members, old owners and untrusted renderers',async()=>{
 const f=await fixture(),admission=createVisualAdmission(),c=createTagDecisionController({host:f.host,admission,visuals:{suspendAndDrain:async()=>{},resume:()=>{}},changed:()=>{}}),handlers=new Map<string,any>()
 let token='one';const main={} as any,card={} as any
 registerTagDecisionIpc({controller:c,handle:(channel,handler)=>{handlers.set(channel,handler)},isMain:e=>e===main,card:{isTrusted:(e:any)=>e===card,inspect:()=>({token,context:f.scope})} as any})
 const input={...f.scope,evidenceId:f.current.evidenceId,tag:'几何',decision:'confirm' as const},call=(name:string,event:any,value:any)=>handlers.get(`tag-decision:${name}`)(event,value)
 try{
  assert.equal((await call('prepare',{},input)).ok,false);assert.equal((await call('prepare',card,{...input,assetId:'foreign'})).ok,false)
  const r=await call('prepare',card,input);assert.equal(r.ok,true);assert.equal((await call('confirm',main,r.value.receipt)).ok,false)
  c.cancelOwner('card:one');token='two';assert.equal((await call('confirm',card,r.value.receipt)).ok,false);assert.deepEqual((await f.host.listAssets())[0].tags,[])
  const valid=await call('prepare',card,input);assert.equal((await call('confirm',card,valid.value.receipt)).ok,true);assert.deepEqual((await f.host.listAssets())[0].tags,['几何'])
 }finally{c.invalidate();admission.invalidate();await f.close()}
})
await test('canonical confirmation preserves NFKC-equivalent manual metadata and rejects the old sessionless route',async()=>{
 const f=await fixture()
 try{
  const a=await f.publish('wide',['Ａ'],'visual-ai-v1');await f.host.decideTag({...decision(f),evidenceId:a.evidenceId,tag:'Ａ',decision:'confirm',allowUpgrade:false})
  const b=await f.publish('narrow',['A'],'visual-ai-v1');await assert.rejects(f.host.confirmVisualAiTag(f.scope.assetId,b.originalVisualEvidenceId!,'A'))
  await f.host.decideTag({...decision(f),evidenceId:b.evidenceId,tag:'A',decision:'confirm',allowUpgrade:false});assert.deepEqual((await f.host.listAssets())[0].tags,['Ａ']);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.pendingTags,[])
 }finally{await f.close()}
})
await test('a new content revision does not inherit an old content rejection',async()=>{
 const f=await fixture()
 try{
  await f.host.decideTag(decision(f));const db=new Database(f.dbFile);try{db.prepare('UPDATE asset_lifecycle SET revision=? WHERE design_asset_identity=?').run('synthetic-new-revision',f.scope.assetId)}finally{db.close()}
  assert.equal((await f.host.readTagExecution(f.scope)).current,null)
  assert.deepEqual((await f.publish('new-content',['几何'])).tags,['几何'])
 }finally{await f.close()}
})
await test('postcommit pragma restoration failure quarantines v11 and cannot resume visual admission',async()=>{
 const f=await fixture(),admission=createVisualAdmission(),original=Database.prototype.pragma;let once=true,resumes=0
 const c=createTagDecisionController({host:f.host,admission,visuals:{suspendAndDrain:async()=>{},resume:()=>{resumes++}},changed:()=>{}})
 try{
  const review=await c.prepare('main',{...f.scope,evidenceId:f.current.evidenceId,tag:'几何',decision:'reject'})
  Database.prototype.pragma=function(sql:string,options?:any):any{if(once&&sql.startsWith('cache_spill = ')&&!sql.endsWith('OFF')){once=false;throw Error('synthetic restoration fault')}return original.call(this,sql,options)}
  await assert.rejects(c.confirm('main',review.receipt));assert.equal(f.host.inspect().state,'recovery-required');assert.equal(resumes,0)
  const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.pragma('user_version',{simple:true}),11);assert.equal(db.prepare('SELECT count(*) FROM independent_tag_rejections').pluck().get(),1)}finally{db.close()}
  await assert.rejects(f.host.updateAssetCaption(f.scope.assetId,'blocked'))
 }finally{Database.prototype.pragma=original;c.invalidate();admission.invalidate();await f.close()}
})

await test('frozen v10 inspector and its version helper refuse v11 with database bytes unchanged',async()=>{
 const f=await fixture()
 try{
  await f.host.decideTag(decision(f));await f.host.close()
  const base=path.resolve('scripts/fixtures/independent-tags-v10'),manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'))
  const frozen=await readFrozenLibrarySource(base,manifest)
  const source=frozen['library-open-control-store.internal.ts'],version=frozen['library-schema-version.ts']
  const output=path.resolve('dist-temp/tests/frozen-v10-inspector.mjs')
  await build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'frozen-version',setup(b){b.onResolve({filter:/library-schema-version$/},()=>({path:'frozen-v10-version',namespace:'frozen'}));b.onLoad({filter:/.*/,namespace:'frozen'},()=>({contents:version,loader:'ts'}))}}]})
  const old=await import(pathToFileURL(output).href),declaration=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.library,'.dam','library.manifest.json'))));if(declaration.kind!=='compatible')throw Error('fixture manifest')
  const before=await fs.readFile(f.dbFile),db=openReadonlyLibraryDatabase(f.dbFile)
  try{assert.equal(old.inspectLibraryControlStore(db,declaration.declaration).kind,'unsupported')}finally{db.close()}
  assert.deepEqual(await fs.readFile(f.dbFile),before)
 }finally{await f.close()}
})

await test('v11 preserves OCR edits, notebook, work layout, organization and download journal across reopen',async()=>{
 const f=await fixture()
 try{
  await f.host.decideTag(decision(f));assert.equal((await f.host.readTagExecution(f.scope)).schemaVersion,11)
  const scope={libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation},ocr=await f.host.readOcr(f.scope)
  const saved=await f.host.commitOcr({...f.scope,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr-v11',assetId:f.asset.id,assetRevision:f.asset.revision,sourceRef:f.asset.thumbnailRef,inputSha256:'e'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:120,height:100,elapsedMs:1,threshold:.5,blocks:[]}}})
  await f.host.correctOcr({...f.scope,sessionToken:saved.sessionToken,expectedRevision:saved.revision,evidenceId:'ocr-v11',text:'User OCR retained'})
  const note=await f.host.readNotebook(f.scope);await f.host.saveNotebook({...f.scope,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:note.revision,allowUpgrade:false,book:note.book})
  const org=await f.host.readOrganization(scope);await f.host.writeOrganization({...scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'User folder',folderKind:'assets',parentId:null,assetIds:[f.asset.id]}})
  const work=await f.host.readWorkSets(scope,'device-v11'),set=await f.host.writeWorkSet({...scope,sessionToken:work.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'User set',note:'User note',assetIds:[f.asset.id],colors:[],columns:1}}},'device-v11')
  const layout={x:12,y:20,width:400,height:500,pinned:true,open:false};await f.host.writeWorkLayout({...scope,sessionToken:work.sessionToken,id:set.sets[0].id,layout},'device-v11')
  await f.host.downloadJournal({kind:'create',generation:scope.generation,taskId:'download-v11',url:'https://fixture.invalid/not-requested.png',fileName:'generated.png'})
  await f.publish('after-choices',['新建议'])
  await f.host.close();await f.host.reopen()
  assert.equal((await f.host.readOcr(f.scope)).editedText,'User OCR retained');assert.equal((await f.host.readNotebook(f.scope)).revision,1)
  assert.equal((await f.host.readOrganization(scope)).folders[0].name,'User folder');assert.deepEqual((await f.host.readWorkSets(scope,'device-v11')).sets[0].layout,layout)
  assert.equal((await f.host.downloadJournal({kind:'list',generation:scope.generation})).intents!.length,1);assert.deepEqual((await f.host.readTagExecution(f.scope)).current?.tags,['新建议'])
 }finally{await f.close()}
})

