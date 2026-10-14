import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {enableWorkSetStorage} from '../src/main/library-lifecycle/work-set.schema'
import {assertLibraryDataSchema} from '../src/main/library-lifecycle/library-materialization.internal'
import {build} from 'esbuild'
import {pathToFileURL} from 'node:url'
import {readFrozenLibrarySource} from './fixtures/read-frozen-library-source'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {openReadonlyLibraryDatabase} from '../src/main/library-lifecycle/readonly-library-database.internal'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {validateWorkValue} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-work-retirement-'))),directory=path.join(root,'library'),source=path.join(root,'public.png')
await sharp({create:{width:80,height:90,channels:3,background:'#557799'}}).png().toFile(source)
const digest=async()=>createHash('sha256').update(await fs.readFile(source)).digest('hex'),before=await digest()
const hooks:{afterDdl?:()=>void;beforeCommit?:()=>void}={}
const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}),tagIntentTestHooks:hooks})
try{
 const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('CREATE');await host.confirmCreate(plan.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('ADD');await host.dispatchAddAssets(add.plan.receipt);const asset=(await host.listAssets())[0]
 await host.close()
 const file=path.join(directory,'.dam','library.sqlite'),db=new Database(file);db.pragma('foreign_keys=ON');enableWorkSetStorage(db)
 db.prepare('INSERT INTO work_sets VALUES(?,?,?,?,?,?,?)').run('work-set:legacy','Legacy','historical note',2,4,'["#557799"]','2026-10-01')
 db.prepare('INSERT INTO work_set_members VALUES(?,?,?)').run('work-set:legacy',asset.id,0)
 db.prepare('INSERT INTO work_window_layouts VALUES(?,?,?)').run('work-set:legacy','device:test',JSON.stringify({x:100,y:80,width:640,height:520,presentation:'expanded',pinned:true,open:true}))
 assertLibraryDataSchema(db);db.close();await host.open();const active=host.inspect(),scope={libraryIdentity:active.identity!,generation:active.generation!}
 const catalog=await host.readWorkSets(scope,'device:test')
 assert.equal(catalog.requiresUpgrade,true,'Opening legacy Work Sets must expose explicit retirement upgrade, not silently clear historical data')
 assert.equal(catalog.sets[0].name,'Legacy');assert.deepEqual(catalog.sets[0].assetIds,[asset.id]);assert.equal('note' in catalog.sets[0],false);assert.equal('colors' in catalog.sets[0],false)
 const value=validateWorkValue({name:'References',assetIds:[asset.id],columns:2})
 assert.throws(()=>validateWorkValue({...value,note:'retired'}));assert.throws(()=>validateWorkValue({...value,colors:['#557799']}))
 await assert.rejects(host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'save',id:'work-set:legacy',expectedRevision:4,value}},'device:test'))
 const readLegacy=new Database(file,{readonly:true});assert.equal((readLegacy.prepare('SELECT note FROM work_sets').get() as {note:string}).note,'historical note');assert.equal(readLegacy.pragma('user_version',{simple:true}),7);readLegacy.close()
 for(const point of ['afterDdl','beforeCommit'] as const){
  hooks[point]=()=>{throw Error('RETIREMENT_FAILURE')}
  await assert.rejects(host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'save',id:'work-set:legacy',expectedRevision:4,value}},'device:test'),/RETIREMENT_FAILURE/)
  delete hooks[point]
  const preserved=new Database(file,{readonly:true});assert.equal(preserved.pragma('user_version',{simple:true}),7);assert.equal((preserved.prepare('SELECT note FROM work_sets').get() as {note:string}).note,'historical note');assert.equal((preserved.prepare('SELECT revision FROM work_sets').get() as {revision:number}).revision,4);preserved.close()
 }
 const saved=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'save',id:'work-set:legacy',expectedRevision:4,value}},'device:test')
 assert.equal(saved.requiresUpgrade,false);assert.equal(saved.sets[0].revision,5);assert.deepEqual(saved.sets[0].assetIds,[asset.id]);assert.equal(saved.sets[0].layout?.x,100)
 await host.writeWorkLayout({...scope,sessionToken:saved.sessionToken,id:'work-set:legacy',layout:{...saved.sets[0].layout!,indicatorColor:'#AABBCC',alwaysShowIndicator:true,currentSpaceOnly:true,pinned:false}},'device:test')
 await host.close();const current=new Database(file);current.pragma('foreign_keys=ON');assert.equal(current.pragma('user_version',{simple:true}),16);assertLibraryDataSchema(current)
 const backups=path.join(directory,'.dam','schema-backups');let recovered=0
 for(const name of await fs.readdir(backups)){const backupFile=path.join(backups,name,'library.sqlite'),backup=new Database(backupFile,{readonly:true});assert.equal(backup.pragma('user_version',{simple:true}),7);assert.equal((backup.prepare('SELECT note FROM work_sets').get() as {note:string}).note,'historical note');assert.equal((backup.prepare('SELECT colors_json FROM work_sets').get() as {colors_json:string}).colors_json,'["#557799"]');assert.deepEqual(backup.prepare('SELECT asset_id FROM work_set_members').pluck().all(),[asset.id]);backup.close();recovered++}
 assert.ok(recovered>=1,'The actual retired database backup retains recoverable content')
 const fixture=path.resolve('scripts/fixtures/work-set-v15'),frozen=await readFrozenLibrarySource(fixture,JSON.parse(await fs.readFile(path.join(fixture,'manifest.json'),'utf8'))),oldReader=path.join(root,'old-v15-reader.mjs')
 await build({stdin:{contents:frozen['library-open-control-store.internal.ts'],loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},outfile:oldReader,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'frozen-version',setup(builder){builder.onResolve({filter:/library-schema-version$/},()=>({path:'frozen-v15',namespace:'frozen'}));builder.onLoad({filter:/.*/,namespace:'frozen'},()=>({contents:frozen['library-schema-version.ts'],loader:'ts'}))}}]})
 // Resolve dependencies from the repository, without importing an old runtime or credentials.
 const oldSource=await fs.readFile(oldReader,'utf8'),resolvedSource=oldSource.replace('from "better-sqlite3"','from '+JSON.stringify(path.resolve('node_modules/better-sqlite3/lib/index.js')));await fs.writeFile(oldReader,resolvedSource)
 const reader=await import(pathToFileURL(oldReader).href),manifest=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(directory,'.dam','library.manifest.json'))));assert.equal(manifest.kind,'compatible');if(manifest.kind!=='compatible')throw Error('MANIFEST')
 const dbHash=()=>fs.readFile(file).then(bytes=>createHash('sha256').update(bytes).digest('hex')),beforeOld=await dbHash(),readonly=openReadonlyLibraryDatabase(file);try{assert.equal(reader.inspectLibraryControlStore(readonly,manifest.declaration).kind,'unsupported')}finally{readonly.close()};assert.equal(await dbHash(),beforeOld)
 const columns=(current.pragma('table_info(work_sets)') as {name:string}[]).map(c=>c.name);assert.equal(columns.includes('note'),false);assert.equal(columns.includes('colors_json'),false);assert.deepEqual(current.pragma('foreign_key_check'),[]);current.close()
 await host.open();const reopened=host.inspect(),after=await host.readWorkSets({libraryIdentity:reopened.identity!,generation:reopened.generation!},'device:test');assert.equal(after.sets[0].name,'References');assert.equal(after.sets[0].revision,5);assert.equal(after.sets[0].layout?.indicatorColor,'#AABBCC');assert.equal(after.sets[0].layout?.alwaysShowIndicator,true);assert.equal(after.sets[0].layout?.currentSpaceOnly,true);assert.deepEqual(after.sets[0].assetIds,[asset.id]);assert.equal(await digest(),before)
 const forked=await host.writeWorkSet({libraryIdentity:reopened.identity!,generation:reopened.generation!,sessionToken:after.sessionToken,allowUpgrade:false,command:{kind:'fork',id:'work-set:legacy',expectedRevision:5,value:{name:'Copied references',assetIds:[asset.id],columns:2},move:false}},'device:test')
 assert.deepEqual(forked.sets.find(s=>s.id==='work-set:legacy')?.assetIds,[asset.id]);const copiedSet=forked.sets.find(s=>s.id!=='work-set:legacy')!;assert.deepEqual(copiedSet.assetIds,[asset.id])
 await assert.rejects(host.writeWorkSet({libraryIdentity:reopened.identity!,generation:reopened.generation!,sessionToken:after.sessionToken,allowUpgrade:false,command:{kind:'fork',id:'work-set:legacy',expectedRevision:999,value:{name:'Must not create',assetIds:[asset.id],columns:2},move:true}},'device:test'))
 assert.equal((await host.readWorkSets({libraryIdentity:reopened.identity!,generation:reopened.generation!},'device:test')).sets.length,2)
 const movedSet=await host.writeWorkSet({libraryIdentity:reopened.identity!,generation:reopened.generation!,sessionToken:after.sessionToken,allowUpgrade:false,command:{kind:'fork',id:copiedSet.id,expectedRevision:1,value:{name:'Moved references',assetIds:[asset.id],columns:2},move:true}},'device:test')
 assert.deepEqual(movedSet.sets.find(s=>s.id===copiedSet.id)?.assetIds,[]);assert.equal(movedSet.sets.find(s=>s.id===copiedSet.id)?.revision,2);assert.deepEqual(movedSet.sets.find(s=>s.name==='Moved references')?.assetIds,[asset.id])
 const deliveryRoot=path.join(root,'handoffs'),destination=path.join(root,'deliveries'),trash=path.join(root,'recoverable-trash');await fs.mkdir(deliveryRoot);await fs.mkdir(destination);await fs.mkdir(trash)
 const dependencies={host,root:deliveryRoot,open:async()=>'',trash:async(file:string)=>{await fs.rename(file,path.join(trash,path.basename(file)))}}
 let files=createWorkFileHandoffs(dependencies),actor='work-native:test'
 const receipt=await files.prepare(actor,{libraryIdentity:reopened.identity!,generation:reopened.generation!,setId:'work-set:legacy',assetId:asset.id,kind:'original',action:'prepare'}),originalCopy=await files.nativeFile(actor,receipt.id)
 for(const kind of ['pdf','stitch'] as const){const output=await files.prepare(actor,{libraryIdentity:reopened.identity!,generation:reopened.generation!,setId:'work-set:legacy',assetId:asset.id,assetIds:[asset.id],kind,...(kind==='stitch'?{composition:{direction:'vertical' as const,gap:12}}:{}),action:'prepare'});const data=await files.readFile(output.id);if(kind==='pdf'){assert.ok(Buffer.from(data.bytes).subarray(0,8).toString().startsWith('%PDF-1.4'));await fs.writeFile(path.join(root,'result.pdf'),data.bytes)}else{const metadata=await sharp(data.bytes).metadata();assert.equal(metadata.width,80);assert.equal(metadata.height,90)}}
 const bookScope={libraryIdentity:reopened.identity!,generation:reopened.generation!,assetId:asset.id},ocr=await host.readOcr(bookScope),projection=(await host.listAssets()).find(a=>a.id===asset.id)!
 const ocrSaved=await host.commitOcr({...bookScope,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr:preserve-correction',assetId:asset.id,assetRevision:projection.revision,sourceRef:projection.thumbnailRef,inputSha256:'a'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:90,elapsedMs:1,threshold:.5,blocks:[]}}})
 await host.correctOcr({...bookScope,sessionToken:ocrSaved.sessionToken,expectedRevision:ocrSaved.revision,evidenceId:'ocr:preserve-correction',text:'Human correction must remain'})
 const textReceipt=await files.prepare(actor,{...bookScope,setId:'work-set:legacy',kind:'ocr-text',action:'prepare'}),textFile=await files.readFile(textReceipt.id);assert.ok(Buffer.from(textFile.bytes).toString().includes('Human correction must remain'));assert.equal((await host.readOcr(bookScope)).editedText,'Human correction must remain')
 const redacted=await files.prepare(actor,{libraryIdentity:reopened.identity!,generation:reopened.generation!,setId:'work-set:legacy',assetId:asset.id,kind:'processed-image',imageTransform:{format:'png',quality:100,stripMetadata:true,annotations:[{kind:'redact',x:.1,y:.1,width:.3,height:.3,color:'#000000'}]},action:'prepare'}),redactedData=await files.readFile(redacted.id),pixels=await sharp(redactedData.bytes).removeAlpha().raw().toBuffer();assert.deepEqual([...pixels.subarray((20*80+20)*3,(20*80+20)*3+3)],[0,0,0]);assert.deepEqual([...pixels.subarray((60*80+60)*3,(60*80+60)*3+3)],[85,119,153])
 const copied=path.join(destination,path.basename(originalCopy.file));await files.fileAction(actor,receipt.id,'copy',copied,()=>{});assert.equal(createHash('sha256').update(await fs.readFile(copied)).digest('hex'),before)
 await assert.rejects(files.fileAction(actor,receipt.id,'move',copied,()=>{}),/EEXIST/);assert.equal((await files.nativeFile(actor,receipt.id)).file,originalCopy.file)
 const renamed=path.join(path.dirname(originalCopy.file),'renamed.png');await files.fileAction(actor,receipt.id,'rename',renamed,()=>{});await assert.rejects(fs.stat(originalCopy.file));assert.equal((await files.nativeFile(actor,receipt.id)).file,renamed)
 const moved=path.join(destination,'moved.png');await files.fileAction(actor,receipt.id,'move',moved,()=>{});await assert.rejects(fs.stat(renamed));files=createWorkFileHandoffs(dependencies);assert.equal((await files.nativeFile(actor,receipt.id)).file,moved);assert.equal((await files.readFile(receipt.id)).fileName,'moved.png')
 const adoptedActor='work-native:reopened';await assert.rejects(files.resumeNative(adoptedActor,{libraryIdentity:reopened.identity!,generation:reopened.generation!,setId:'other:set',assetId:asset.id},receipt.id,()=>{}));await files.resumeNative(adoptedActor,{libraryIdentity:reopened.identity!,generation:reopened.generation!,setId:'work-set:legacy',assetId:asset.id},receipt.id,()=>{});actor=adoptedActor;assert.equal((await files.nativeFile(actor,receipt.id)).file,moved);
 const cancelled=path.join(destination,'cancelled.png');await assert.rejects(files.fileAction(actor,receipt.id,'copy',cancelled,()=>{throw Error('SCOPE_REVOKED')}),/SCOPE_REVOKED/);await assert.rejects(fs.stat(cancelled));await assert.rejects(files.fileAction('other',receipt.id,'trash',undefined,()=>{}))
 await files.fileAction(actor,receipt.id,'trash',undefined,()=>{});await assert.rejects(files.nativeFile(actor,receipt.id),/废纸篓/);await files.clear(receipt.id);await assert.rejects(fs.stat(path.join(deliveryRoot,receipt.id.slice(8))));assert.equal(createHash('sha256').update(await fs.readFile(path.join(trash,'moved.png'))).digest('hex'),before);assert.equal(await digest(),before)
 console.log('PASS guarded system copies: copy/move/rename persist actual locations across controller recreation, collisions do not overwrite, revoked/wrong-owner actions do not write, recoverable-trash adapter retains bytes. OS picker/Trash are qualified separately.')
 console.log('PASS explicit retirement: read-only/cancel preserves old fields, backed-up Host migration removes fields and retains references/layout/revisions/Original, schema and actual reopen remain valid.')
}finally{await host.close();await fs.rm(root,{recursive:true,force:true})}
