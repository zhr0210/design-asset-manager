import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'
import type {BackgroundOcrClaim} from '../src/shared/contracts/background-ocr.contract'
import type {OcrObservation} from '../src/shared/contracts/asset-ocr.contract'
const observation:OcrObservation={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}
async function fixture(hooks:TagIntentTestHooks={}){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-bg-ocr-'))),library=path.join(root,'library'),sources:string[]=[];let next=0
 for(let i=0;i<4;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:'#7799bb'}}).png().toFile(file);sources.push(file)}
 const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:sources[next++]}]})}),tagIntentTestHooks:hooks})
 const p=await host.prepareCreate();if(p.kind!=='planned')throw Error('fixture');await host.confirmCreate(p.plan.receipt);const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!}
 const add=async()=>{const p=await host.prepareAddAssets();if(p.kind!=='planned')throw Error('fixture');const result=await host.dispatchAddAssets(p.plan.receipt);return(await host.listAssets()).find(a=>a.id===result.items[0].promotion!.designAssetIdentity)!}
 const plans=async()=>{const s=await host.readBackgroundAnalysis(scope);await host.configureBackgroundAnalysis({...scope,sessionToken:s.sessionToken,expectedRevision:s.policy.revision,expectedSchemaVersion:s.schemaVersion,allowUpgrade:true,enabled:true,capabilities:{tags:true,caption:true,ocr:true}})}
 const grant=async(enabled=true)=>{const s=await host.readBackgroundOcr(scope);return host.configureBackgroundOcr({...scope,sessionToken:s.sessionToken,expectedRevision:s.permissionRevision,expectedSchemaVersion:s.schemaVersion,allowUpgrade:true,enabled,runtimeFingerprint:'synthetic-runtime'})}
 const claim=async()=>host.claimBackgroundOcr({...scope,sessionToken:(await host.readBackgroundOcr(scope)).sessionToken,runtimeFingerprint:'synthetic-runtime'})
 const commit=async(c:BackgroundOcrClaim)=>{const a=(await host.listAssets()).find(a=>a.id===c.assetId)!,s=await host.readOcr({...scope,assetId:a.id});return{claim:c,ocr:{...scope,assetId:a.id,sessionToken:s.sessionToken,expectedRevision:s.revision,allowUpgrade:false,evidence:{id:'ocr:'+c.attemptId,assetId:a.id,assetRevision:a.revision,sourceRef:a.thumbnailRef,inputSha256:'d'.repeat(64),createdAt:new Date().toISOString(),observation}}}}
 return{root,library,host,scope,add,plans,grant,claim,commit,hooks,dbFile:path.join(library,'.dam','library.sqlite'),close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}
await test('plan enrollment never grants OCR execution; explicit v12 upgrade and fresh session permission',async()=>{
 const f=await fixture();try{assert.equal((await f.host.readBackgroundOcr(f.scope)).schemaVersion,1);await assert.rejects(f.grant());await f.add();await f.plans();await f.add();await assert.rejects(f.claim());const s=await f.grant();assert.equal(s.schemaVersion,13);assert.equal(s.authorized,true);assert.ok(await f.claim());assert.equal(await f.claim(),null);await f.host.close();await f.host.reopen();assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);await assert.rejects(f.claim());await f.grant();assert.ok(await f.claim())}finally{await f.close()}
})
await test('atomic empty OCR + receipt, exact replay preserves later user correction, output conflict rejected',async()=>{
 const f=await fixture();try{await f.plans();await f.add();await f.grant();const c=(await f.claim())!,input=await f.commit(c);await assert.rejects(f.host.commitBackgroundOcr(input));await f.host.markBackgroundOcrSent(c);const receipt=await f.host.commitBackgroundOcr(input);assert.equal(receipt.savedRevision,1);const s=await f.host.readOcr({...f.scope,assetId:c.assetId});await f.host.correctOcr({...f.scope,assetId:c.assetId,sessionToken:s.sessionToken,expectedRevision:s.revision,evidenceId:s.evidence!.id,text:'user correction'});assert.deepEqual(await f.host.commitBackgroundOcr(input),receipt);assert.equal((await f.host.readOcr({...f.scope,assetId:c.assetId})).editedText,'user correction');await assert.rejects(f.host.commitBackgroundOcr({...input,ocr:{...input.ocr,evidence:{...input.ocr.evidence,inputSha256:'e'.repeat(64)}}}));assert.equal(await f.claim(),null);await f.host.close();await f.host.reopen();await f.grant();assert.equal(await f.claim(),null)}finally{await f.close()}
})
for(const change of ['revoke','pause','source','preview','ocr-revision'] as const)await test(change+' after sent rejects stale result with zero partial effect',async()=>{
 const f=await fixture();try{await f.plans();await f.add();await f.grant();const c=(await f.claim())!,input=await f.commit(c);await f.host.markBackgroundOcrSent(c)
 if(change==='revoke')f.host.revokeBackgroundOcr()
 if(change==='pause'){const b=await f.host.readBackgroundAnalysis({...f.scope,assetId:c.assetId}),i=b.intents.find(i=>i.capability==='ocr')!;await f.host.changeBackgroundIntent({...f.scope,assetId:c.assetId,id:i.id,sessionToken:b.sessionToken,expectedRevision:i.revision,action:'pause'})}
 if(change==='source'||change==='preview'){const db=new Database(f.dbFile);try{db.exec(change==='source'?"UPDATE capture_requests SET source_generation=source_generation||'-changed'":"UPDATE asset_candidates SET preview_generation_identity=preview_generation_identity||'-changed'")}finally{db.close()}}
 if(change==='ocr-revision')await f.host.commitOcr(input.ocr)
 await assert.rejects(f.host.commitBackgroundOcr(input));const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.prepare("SELECT count(*) FROM background_ocr_attempts WHERE state='succeeded'").pluck().get(),0);assert.equal(db.prepare('SELECT count(*) FROM asset_ocr_evidence').pluck().get(),change==='ocr-revision'?1:0)}finally{db.close()}
 }finally{await f.close()}
})
for(const state of ['claimed','sent','unknown'] as const)await test('reopen '+state+' requires fresh permission and never reclaims sent/unknown',async()=>{
 const f=await fixture();try{await f.plans();await f.add();await f.grant();const c=(await f.claim())!;if(state!=='claimed')await f.host.markBackgroundOcrSent(c);if(state==='unknown')await f.host.finishBackgroundOcr(c,'unknown');await f.host.close();await f.host.reopen();assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);await f.grant();assert.equal(!!await f.claim(),state==='claimed')}finally{await f.close()}
})
await test('terminal first intent cannot starve later work and failures do not hot-loop',async()=>{
 const f=await fixture();try{await f.plans();await f.add();await f.grant();const a=(await f.claim())!;await f.host.finishBackgroundOcr(a,'failed');assert.equal(await f.claim(),null);await f.add();const b=(await f.claim())!;assert.notEqual(b.intentId,a.intentId);await f.host.finishBackgroundOcr(b,'cancelled');assert.equal(await f.claim(),null);await f.grant();assert.ok(await f.claim())}finally{await f.close()}
})
for(const point of ['afterDdl','beforeCommit','afterCommit'] as const)await test('v13 '+point+' failure has honest upgrade/grant state',async()=>{
 const f=await fixture();try{await f.plans();f.hooks[point]=()=>{throw Error('synthetic fault')};await assert.rejects(f.grant());const view=await f.host.readBackgroundOcr(f.scope);assert.equal(view.schemaVersion,point==='afterCommit'?13:12);assert.equal(view.authorized,false);await assert.rejects(f.claim());f.hooks[point]=undefined;await f.grant();assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,true)}finally{await f.close()}
})

import {createOcrController,OCR_HOST_RESERVE_BYTES} from '../src/main/ocr/ocr-controller'
import {createBackgroundOcrController} from '../src/main/background-ocr/background-ocr-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {OcrProcessUnconfirmedError} from '../src/main/ocr/local-ocr-process'
function gate<T=void>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return{promise,resolve}}
async function chain(){
 const f=await fixture();await f.plans();await f.add();let calls=0,fingerprint='synthetic-runtime',qualified=true,lowPower=false,currentGate:Promise<void>|undefined,run:(signal:AbortSignal)=>Promise<OcrObservation>=async()=>observation
 const admission=createVisualAdmission(),runtime={configure:async()=>{},current:async()=>{await currentGate;return{label:'synthetic',fingerprint,run:async(_:Uint8Array,signal:AbortSignal)=>{calls++;return run(signal)}}}},scheduled:Array<()=>void>=[]
 const ocrHost={...f.host};const ocr=createOcrController({host:ocrHost,runtime,reserve:(bytes,signal)=>admission.reserveOcr(bytes,signal),changed:()=>{},drainTimeoutMs:50})
 const k=<T>(value:T)=>({kind:'known' as const,value,sampledAt:performance.now()})
 const background=createBackgroundOcrController({host:f.host,ocr,runtime,drainTimeoutMs:50,schedule:fn=>{scheduled.push(fn);return()=>{}},telemetry:()=>({memory:k({free:8*1024**3,total:16*1024**3}),battery:k(false),lowPower:k(lowPower),thermal:k('nominal' as const),idle:k('idle' as const),visible:k(true),gpuFree:{kind:'unknown'}}),qualify:r=>qualified?{runtimeFingerprint:r.fingerprint,evidenceId:'synthetic-only',envelope:{ownership:'host-owned',verified:true,peakRamBytes:OCR_HOST_RESERVE_BYTES,accelerator:'cpu',lightOnBattery:false}}:null})
 const authorize=async()=>background.confirm((await background.prepare(f.scope)).receipt)
 return{...f,admission,ocrHost,ocr,background,authorize,scheduled,get calls(){return calls},set currentGate(v:Promise<void>|undefined){currentGate=v},set fingerprint(v:string){fingerprint=v},set qualified(v:boolean){qualified=v},set lowPower(v:boolean){lowPower=v},set run(v:typeof run){run=v},close:async()=>{background.invalidate();await ocr.suspendAndDrain();await f.close()}}
}
await test('real Host chain requires separate grant, double ticks execute once and commit once',async()=>{
 const f=await chain();try{await f.background.tick();assert.equal(f.calls,0);await f.authorize();await Promise.all([f.background.tick(),f.background.tick()]);assert.equal(f.calls,1);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'succeeded');assert.equal(f.admission.inspect().materialBytes,0);await f.background.tick();assert.equal(f.calls,1)}finally{await f.close()}
})
await test('unqualified runtime and constrained telemetry produce no claim, decode or spawn',async()=>{
 const f=await chain();try{await f.authorize();f.qualified=false;await f.background.tick();assert.equal(f.calls,0);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts.length,0);assert.ok((await f.background.read(f.scope)).reasons.includes('automatic-executor-not-integrated'));f.qualified=true;f.lowPower=true;await f.background.tick();assert.equal(f.calls,0);assert.equal(f.admission.inspect().materialBytes,0)}finally{await f.close()}
})
await test('manual review and execution share the actual background reservation boundary',async()=>{
 const f=await chain();try{await f.authorize();const asset=(await f.host.listAssets())[0],p=await f.ocr.prepare({...f.scope,assetIds:[asset.id]});assert.ok(f.admission.inspect().materialBytes>0);await f.background.tick();assert.equal(f.calls,0);await f.ocr.run(p.receipt);for(let i=0;i<50&&(await f.ocr.status()).job?.state==='running';i++)await new Promise(r=>setTimeout(r,5));assert.equal(f.calls,1);assert.equal(f.admission.inspect().materialBytes,0)}finally{await f.close()}
})
await test('UNKNOWN retains reservation after failed promise; late close releases and finalizes without writing OCR',async()=>{
 const f=await chain(),release=gate();try{f.run=async()=>{throw new OcrProcessUnconfirmedError(release.promise)};await f.authorize();await f.background.tick();assert.ok(f.admission.inspect().materialBytes>0);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'unknown');await f.background.tick();assert.equal(f.calls,1);await assert.rejects(f.ocr.prepare({...f.scope,assetIds:[(await f.host.listAssets())[0].id]}));release.resolve();for(let i=0;i<50&&(await f.host.readBackgroundOcr(f.scope)).attempts[0].state==='unknown';i++)await new Promise(r=>setTimeout(r,5));assert.equal(f.admission.inspect().materialBytes,0);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'failed');assert.equal((await f.host.readOcr({...f.scope,assetId:(await f.host.listAssets())[0].id})).evidence,null)}finally{release.resolve();await f.close()}
})
await test('failed concurrent confirm cannot lose active cancellation; revoke cancels owned runtime',async()=>{
 const f=await chain(),entered=gate(),release=gate<OcrObservation>();let cancelled=false
 try{f.run=async signal=>{signal.addEventListener('abort',()=>{cancelled=true;release.resolve(observation)},{once:true});entered.resolve();return release.promise};await f.authorize();const work=f.background.tick();await entered.promise;const review=await f.background.prepare(f.scope);await assert.rejects(f.background.confirm(review.receipt));await f.background.revoke(f.scope);await work;assert.equal(cancelled,true);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'cancelled');assert.equal((await f.host.readOcr({...f.scope,assetId:(await f.host.listAssets())[0].id})).evidence,null)}finally{release.resolve(observation);await f.close()}
})
await test('runtime A to B to A cannot restore old permission even without qualified resources',async()=>{
 const f=await chain();try{await f.authorize();f.qualified=false;f.fingerprint='changed';await f.background.tick();f.fingerprint='synthetic-runtime';f.qualified=true;await f.background.tick();assert.equal(f.calls,0);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);await f.authorize();await f.background.tick();assert.equal(f.calls,1)}finally{await f.close()}
})
await test('Host revoke during awaited backup cannot be overwritten by late configure',async()=>{
 const f=await fixture(),entered=gate(),release=gate();try{await f.plans();f.hooks.afterBackup=async()=>{entered.resolve();await release.promise};const granting=f.grant();const outcome=granting.catch(e=>e);await entered.promise;f.host.revokeBackgroundOcr();release.resolve();assert.ok(await outcome instanceof Error);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false)}finally{release.resolve();await f.close()}
})

import {build} from 'esbuild'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
await test('frozen v12 reader rejects v13 without changing bytes; exact current reader reopens',async()=>{
 const f=await fixture();try{await f.plans();await f.grant();await f.host.close();const base=path.resolve('scripts/fixtures/background-ocr-v12'),manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8')),frozen=await readFrozenLibrarySource(base,manifest)
 const source=frozen['library-open-control-store.internal.ts'],version=frozen['library-schema-version.ts'],output=path.resolve('dist-temp/tests/background-ocr-v12-reader.mjs')
 await build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'frozen-version',setup(b){b.onResolve({filter:/library-schema-version$/},()=>({path:'frozen-v12',namespace:'frozen'}));b.onLoad({filter:/.*/,namespace:'frozen'},()=>({contents:version,loader:'ts'}))}}]})
 const old=await import(pathToFileURL(output).href),decl=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.library,'.dam/library.manifest.json'))));if(decl.kind!=='compatible')throw Error('manifest');const before=await fs.readFile(f.dbFile),db=openReadonlyLibraryDatabase(f.dbFile);try{assert.equal(old.inspectLibraryControlStore(db,decl.declaration).kind,'unsupported')}finally{db.close()};assert.deepEqual(await fs.readFile(f.dbFile),before);await f.host.reopen();assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false)
 }finally{await f.close()}
})
await test('failure after OCR insert rolls back both OCR and completion receipt',async()=>{
 const f=await fixture(),prepare=Database.prototype.prepare
 try{await f.plans();await f.add();await f.grant();const c=(await f.claim())!,input=await f.commit(c);await f.host.markBackgroundOcrSent(c);Database.prototype.prepare=function(sql:string):any{if(sql.startsWith("UPDATE background_ocr_attempts SET state='succeeded'"))throw Error('synthetic after OCR insert');return prepare.call(this,sql)};await assert.rejects(f.host.commitBackgroundOcr(input));Database.prototype.prepare=prepare;assert.equal((await f.host.readOcr({...f.scope,assetId:c.assetId})).evidence,null);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'sent');await f.host.commitBackgroundOcr(input);assert.equal((await f.host.readOcr({...f.scope,assetId:c.assetId})).revision,1)}finally{Database.prototype.prepare=prepare;await f.close()}
})
const crashWorker=path.resolve('dist-temp/tests/background-ocr-crash.worker.mjs')
await build({entryPoints:['scripts/fixtures/background-ocr-crash.worker.ts'],outfile:crashWorker,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'})
for(const cut of ['before-claim','after-claim','after-sent','after-commit'])await test('owned Host SIGKILL '+cut+' cannot restore permission or replay a committed effect',async()=>{
 const f=await fixture();let child:ReturnType<typeof spawn>|undefined
 try{await f.plans();await f.add();await f.grant();await f.host.close();child=spawn(process.execPath,[crashWorker,f.root,cut],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','pipe','pipe']});const exited=new Promise(r=>child!.once('exit',(code,signal)=>r({code,signal})));let text='';await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('owned marker timeout')),10000);child!.stdout!.on('data',chunk=>{text+=chunk;if(text.includes('"ready":true')){clearTimeout(timer);resolve()}});child!.once('exit',()=>{clearTimeout(timer);reject(Error('owned worker ended early'))})});child.kill('SIGKILL');assert.equal((await exited as any).signal,'SIGKILL');await f.host.reopen();assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);await assert.rejects(f.claim());await f.grant();assert.equal(!!await f.claim(),cut==='before-claim'||cut==='after-claim');if(cut==='after-commit')assert.equal((await f.host.readOcr({...f.scope,assetId:(await f.host.listAssets())[0].id})).revision,1)
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(r=>child!.once('exit',r));child.kill('SIGKILL');await exited}await f.close()}
})

await test('a legacy combined current is seeded exactly once and v13 keeps prior user edits and each storage capability usable',async()=>{
 const f=await fixture()
 try{
  const {id}=await f.add(),asset=(await f.host.listAssets())[0],scope={...f.scope,assetId:id},e={id:'old-combined',assetId:id,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,inputSha256:'b'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',purpose:'analyze' as const,inputScope:'controlled-preview-rgb' as const,recipe:'visual-ai-v1' as const,createdAt:new Date().toISOString(),output:{caption:'AI caption',prompt:'Historical prompt',ocrText:'',tags:['已确认','待决定']}}
  await f.host.enableVisualAi();await f.host.saveVisualAiEvidence(e);await f.host.confirmVisualAiTag(id,e.id,'已确认');await f.host.updateAssetCaption(id,'User caption')
  await f.plans();await f.grant();const c=await f.host.readTagExecution(scope);assert.equal(c.schemaVersion,13);assert.equal(c.current?.originalVisualEvidenceId,e.id)
  await f.host.decideTag({...scope,sessionToken:c.sessionToken,expectedSchemaVersion:13,allowUpgrade:false,evidenceId:c.current!.evidenceId,tag:'待决定',decision:'reject'});await f.grant(false);await f.grant(true)
  assert.deepEqual((await f.host.readTagExecution(scope)).current?.tags,['已确认']);assert.equal((await f.host.listAssets())[0].aiCaption,'User caption')
  const ocr=await f.host.readOcr(scope),saved=await f.host.commitOcr({...scope,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr-v13',assetId:id,assetRevision:asset.revision,sourceRef:asset.thumbnailRef,inputSha256:'e'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}}})
  await f.host.correctOcr({...scope,sessionToken:saved.sessionToken,expectedRevision:saved.revision,evidenceId:'ocr-v13',text:'User OCR'})
  const note=await f.host.readNotebook(scope);await f.host.saveNotebook({...scope,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:note.revision,allowUpgrade:false,book:note.book})
  const org=await f.host.readOrganization(f.scope);await f.host.writeOrganization({...f.scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'User folder',folderKind:'assets',parentId:null,assetIds:[id]}})
  const work=await f.host.readWorkSets(f.scope,'device-v13'),set=await f.host.writeWorkSet({...f.scope,sessionToken:work.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'User set',note:'User note',assetIds:[id],colors:[],columns:1}}},'device-v13'),layout={x:12,y:20,width:400,height:500,pinned:true,open:false};await f.host.writeWorkLayout({...f.scope,sessionToken:work.sessionToken,id:set.sets[0].id,layout},'device-v13')
  await f.host.downloadJournal({kind:'create',generation:f.scope.generation,taskId:'download-v13',url:'https://fixture.invalid/not-requested.png',fileName:'generated.png'})
  for(const recipe of ['visual-ai-v1','independent-tags-v1']){
   await f.host.saveTagIntent({...scope,sessionToken:c.sessionToken,expectedSchemaVersion:13,allowUpgrade:false,requestId:recipe,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:'synthetic',model:'synthetic-model',backendBindingSha256:'a'.repeat(64),recipeId:recipe,recipeVersion:'1'})
   const claim=await f.host.claimTagExecution({...scope,sessionToken:c.sessionToken,requestId:recipe,inputSha256:'b'.repeat(64),origin:recipe==='visual-ai-v1'?'combined':'tags-only'}),ref={...scope,sessionToken:c.sessionToken,requestId:recipe,attemptToken:claim.attemptToken};await f.host.markTagExecutionSent(ref);await f.host.commitTagExecution({...ref,tags:['新的标签'],...(recipe==='visual-ai-v1'?{combinedEvidence:{...e,id:'v13-combined',output:{...e.output,tags:['新的标签']}}}:{})})
  }
  await f.host.close();await f.host.reopen();assert.equal((await f.host.readOcr(scope)).editedText,'User OCR');assert.equal((await f.host.readNotebook(scope)).revision,1);assert.equal((await f.host.readOrganization(f.scope)).folders[0].name,'User folder');assert.deepEqual((await f.host.readWorkSets(f.scope,'device-v13')).sets[0].layout,layout);assert.equal((await f.host.downloadJournal({kind:'list',generation:f.scope.generation})).intents!.length,1);assert.equal((await f.host.listAssets())[0].aiCaption,'User caption');assert.deepEqual((await f.host.listAssets())[0].tags,['已确认']);assert.deepEqual((await f.host.readTagExecution(scope)).current?.tags,['新的标签'])
 }finally{await f.close()}
})
for(const phase of ['preflight','confirmation'])await test('bounded background drain covers hanging '+phase+' and never revives permission',async()=>{
 const f=await chain(),release=gate();let work:Promise<unknown>|undefined
 try{if(phase==='preflight'){await f.authorize();f.currentGate=release.promise;work=f.background.tick()}else{const p=await f.background.prepare(f.scope);f.currentGate=release.promise;work=f.background.confirm(p.receipt).catch(e=>e)}await new Promise(r=>setImmediate(r));await assert.rejects(f.background.suspendAndDrain(),/BACKGROUND_OCR_DRAIN_BLOCKED/);release.resolve();await work;assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);assert.equal(f.calls,0)}finally{release.resolve();await work;await f.close()}
})

import {registerBackgroundOcrIpc} from '../src/main/ipc/background-ocr.ipc'
await test('formal IPC rejects non-Main and renderer-supplied execution options before reaching controller',async()=>{
 const handlers=new Map<string,Function>();let calls=0
 registerBackgroundOcrIpc({controller:{read:async()=>{calls++}} as any,isMain:e=>(e as any).main===true,handle:(name,handler)=>{handlers.set(name,handler)}})
 assert.equal((await handlers.get('background-ocr:read')!({main:false},{libraryIdentity:'a',generation:'b'})).ok,false)
 assert.equal((await handlers.get('background-ocr:read')!({main:true},{libraryIdentity:'a',generation:'b',verified:true})).ok,false)
 assert.equal((await handlers.get('background-ocr:confirm')!({main:false},'receipt')).ok,false);assert.equal(calls,0)
 assert.equal((await handlers.get('background-ocr:read')!({main:true},{libraryIdentity:'a',generation:'b'})).ok,true);assert.equal(calls,1)
})
await test('candidate and recent projection use dedicated indexes without full count aggregation',async()=>{
 const f=await fixture(),prepare=Database.prototype.prepare;let sql=''
 try{await f.plans();await f.add();await f.grant();Database.prototype.prepare=function(q:string):any{if(q.startsWith('SELECT i.id '))sql=q;return prepare.call(this,q)};await f.claim();Database.prototype.prepare=prepare;assert.ok(sql.includes('LIMIT 1'));assert.ok(!sql.includes('COUNT('));const db=new Database(f.dbFile,{readonly:true});try{const plans=db.prepare('EXPLAIN QUERY PLAN '+sql).all(1,(await f.host.readBackgroundOcr(f.scope)).sessionToken,1) as Array<{detail:string}>;assert.ok(plans.some(p=>p.detail.includes('background_ocr_candidates')));assert.ok(!plans.some(p=>p.detail.includes('TEMP B-TREE')));const recent=db.prepare('EXPLAIN QUERY PLAN SELECT * FROM background_ocr_attempts ORDER BY updated_at DESC,intent_id LIMIT 20').all() as Array<{detail:string}>;assert.ok(recent.some(p=>p.detail.includes('background_ocr_attempts_recent')))}finally{db.close()}}finally{Database.prototype.prepare=prepare;await f.close()}
})
await test('resource change during asynchronous preparation defers before sent and resumes safely later',async()=>{
 const f=await chain(),entered=gate(),release=gate(),read=f.ocrHost.readPreview
 try{await f.authorize();f.ocrHost.readPreview=async id=>{entered.resolve();await release.promise;return read(id)};const work=f.background.tick();await entered.promise;f.lowPower=true;release.resolve();await work;assert.equal(f.calls,0);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'deferred');assert.equal(f.admission.inspect().materialBytes,0);f.ocrHost.readPreview=read;f.lowPower=false;await f.background.tick();assert.equal(f.calls,1);assert.equal((await f.host.readBackgroundOcr(f.scope)).attempts[0].state,'succeeded')}finally{release.resolve();f.ocrHost.readPreview=read;await f.close()}
})
await test('Runtime identity change observed after preparation revokes instead of deferring old consent',async()=>{
 const f=await chain(),entered=gate(),release=gate(),read=f.ocrHost.readPreview
 try{await f.authorize();f.ocrHost.readPreview=async id=>{entered.resolve();await release.promise;return read(id)};const work=f.background.tick();await entered.promise;f.fingerprint='changed';release.resolve();await work;assert.equal(f.calls,0);assert.equal((await f.host.readBackgroundOcr(f.scope)).authorized,false);f.ocrHost.readPreview=read;f.fingerprint='synthetic-runtime';await f.background.tick();assert.equal(f.calls,0);await f.authorize();await f.background.tick();assert.equal(f.calls,1)}finally{release.resolve();f.ocrHost.readPreview=read;await f.close()}
})
await test('v13 settings restoration failure quarantines Host and never grants execution',async()=>{
 const f=await fixture(),original=Database.prototype.pragma;let once=true
 try{await f.plans();Database.prototype.pragma=function(sql:string,options?:any):any{if(once&&sql.startsWith('cache_spill = ')&&!sql.endsWith('OFF')){once=false;throw Error('synthetic restoration error')}return original.call(this,sql,options)};await assert.rejects(f.grant());assert.equal(f.host.inspect().state,'recovery-required');await assert.rejects(f.claim());const db=new Database(f.dbFile,{readonly:true});try{assert.equal(db.pragma('user_version',{simple:true}),13)}finally{db.close()}}finally{Database.prototype.pragma=original;await f.close()}
})
