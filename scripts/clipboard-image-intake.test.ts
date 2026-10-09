import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createCanonicalCaptureEnvelopeDigest} from '../src/main/capture-intake/capture-gateway'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-clipboard-intake-'))),library=path.join(root,'library')
const pngs=await Promise.all(['#184ce5','#ed222a'].map((background,i)=>sharp({create:{width:64+i*4,height:40,channels:4,background}}).png().toBuffer()))
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),sourceHashes=pngs.map(sha)
const admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})})
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'cancelled'})},{admission}))
let db:Database.Database|undefined
const tree=async(directory:string):Promise<string[]>=>{const names:string[]=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const relative=entry.name;if(entry.isDirectory())names.push(...(await tree(path.join(directory,entry.name))).map(name=>relative+'/'+name));else names.push(relative)}return names.sort()}
try{
 const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(plan.plan.receipt)
 db=new Database(path.join(library,'.dam','library.sqlite'),{fileMustExist:true})
 let state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!}
 const request={...scope,requestId:'clip-first',fileName:'Cafe\u0301.png',bytes:pngs[0]}
 const baseline=await tree(library)
 const bad=async(input:unknown)=>{const rows=db!.prepare('SELECT count(*) AS n FROM assets').get() as {n:number},captures=db!.prepare('SELECT count(*) AS n FROM capture_requests').get() as {n:number},files=await tree(library);await assert.rejects(host.importClipboardImage(input as Parameters<typeof host.importClipboardImage>[0]));assert.equal((db!.prepare('SELECT count(*) AS n FROM assets').get() as {n:number}).n,rows.n);assert.equal((db!.prepare('SELECT count(*) AS n FROM capture_requests').get() as {n:number}).n,captures.n);assert.deepEqual(await tree(library),files);assert.equal(admission.resourceStatus().materialBytes,0);assert.equal(admission.resourceStatus().computeBytes,0)}
 for(const invalid of [{...request,libraryIdentity:'library:wrong'},{...request,generation:'stale-generation'},{...request,requestId:'../escape'},{...request,requestId:''},{...request,fileName:'../private.png'},{...request,fileName:'wrong.jpg'},{...request,fileName:' trailing.png '},{...request,bytes:new Uint8Array()},{...request,bytes:[1,2,3]},{...request,bytes:pngs[0].subarray(0,40)},{...request,extra:'not-accepted'},null])await bad(invalid)
 const jpeg=await sharp(pngs[0]).jpeg().toBuffer();await bad({...request,bytes:jpeg})
 const oversized=Buffer.alloc(96*1024*1024+1);await bad({...request,bytes:oversized})
 const tooManyPixels=await sharp({create:{width:4001,height:4000,channels:3,background:'#334455'}}).png().toBuffer();await bad({...request,bytes:tooManyPixels})
 assert.equal((await host.listAssets()).length,0);assert.deepEqual(await tree(library),baseline,'all invalid inputs leave no partial files or capture rows')
 const first=await host.importClipboardImage(request),second=await host.importClipboardImage({...request,requestId:'clip-second',fileName:'Second clipboard.png',bytes:pngs[1]})
 assert.notEqual(first.assetId,second.assetId);let assets=await host.listAssets();assert.equal(assets.length,2)
 for(const[index,id]of [first.assetId,second.assetId].entries()){
  const asset=assets.find(a=>a.id===id)!;assert.equal(asset.sourceSiteId,'clipboard');assert.equal(asset.sourceSiteName,'剪贴板图片')
  const original=await host.readManagedOriginal(asset.id,asset.revision,asset.thumbnailRef);assert.equal(sha(original.bytes),sourceHashes[index]);assert.deepEqual(Buffer.from(original.bytes),pngs[index])
  const preview=await host.readPreview(asset.id),meta=await sharp(preview).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,64+index*4);assert.equal(meta.height,40)
  const row=db.prepare('SELECT source_site_id AS site,capture_method AS method,original_url AS url,image_metadata_json AS provenance FROM assets WHERE id=?').get(id) as any
  assert.equal(row.method,'copy-into-library');assert.equal(row.url,null);assert.equal(JSON.parse(row.provenance).kind,'clipboard');assert.equal(JSON.parse(row.provenance).sourceSha256,sourceHashes[index])
  const capture=db.prepare('SELECT received_file_name AS receivedFileName,source_bytes AS sourceBytes,source_generation AS sourceGeneration,source_locator_digest AS sourceLocatorDigest,source_format AS format,canonical_envelope_digest AS digest,capture_method AS method FROM capture_requests WHERE capture_request_identity=?').get('capture-request:clipboard:'+(['clip-first','clip-second'][index])+':1') as any
  assert.equal(capture.method,'copy-into-library');assert.equal(capture.sourceGeneration,'sha256:'+sourceHashes[index]);assert.equal(capture.digest,createCanonicalCaptureEnvelopeDigest(capture,'clipboard'));assert.notEqual(capture.digest,createCanonicalCaptureEnvelopeDigest(capture,'local-file'))
  assert.equal((await host.inspectCapture('capture-batch:clipboard:'+(['clip-first','clip-second'][index])+':1')).state,'complete')
 }
 assert.equal(assets.find(a=>a.id===first.assetId)!.fileName,'Café.png','filename is NFC canonical before persistence')
 const counts=()=>db!.prepare('SELECT (SELECT count(*) FROM assets) AS assets,(SELECT count(*) FROM capture_requests) AS requests,(SELECT count(*) FROM asset_candidates) AS candidates,(SELECT count(*) FROM promotion_links) AS promotions').get()
 const completedCounts=counts(),completedTree=await tree(library);assert.deepEqual(await host.importClipboardImage(request),first);assert.deepEqual(counts(),completedCounts);assert.deepEqual(await tree(library),completedTree)
 await bad({...request,bytes:pngs[1]});await bad({...request,fileName:'Different.png'})
 const heldOriginal=(db.prepare('SELECT file_path AS original FROM assets WHERE id=?').get(first.assetId) as {original:string}).original;await fs.writeFile(heldOriginal,'mutated recoverable fixture')
 try{await bad(request)}finally{await fs.writeFile(heldOriginal,pngs[0])}
 // User edits remain authoritative on an idempotent replay.
 db.prepare('UPDATE assets SET title=?,ai_caption=?,file_name=? WHERE id=?').run('User fixture title','User fixture caption','User renamed.png',first.assetId)
 await host.importClipboardImage(request);assert.equal((await host.listAssets()).find(a=>a.id===first.assetId)!.title,'User fixture title')
 db.close();db=undefined;await host.close();await host.reopen();state=host.inspect();scope={libraryIdentity:state.identity!,generation:state.generation!}
 db=new Database(path.join(library,'.dam','library.sqlite'),{fileMustExist:true});await bad({...request,generation:'stale-after-reopen'});const reopenedRequest={...request,...scope};assert.deepEqual(await host.importClipboardImage(reopenedRequest),first);assert.deepEqual(counts(),completedCounts)
 assets=await host.listAssets();const saved=assets.find(a=>a.id===first.assetId)!;assert.equal(saved.title,'User fixture title');assert.equal(saved.aiCaption,'User fixture caption');assert.equal(saved.fileName,'User renamed.png');assert.equal(sha((await host.readManagedOriginal(saved.id,saved.revision,saved.thumbnailRef)).bytes),sourceHashes[0])
 // Existing non-clipboard consumers retain their distinct origins and limit paths.
 const download=await host.importDownloadedImage({requestId:'legacy-download',generation:scope.generation,fileName:'Downloaded.png',sourceUrl:'https://fixture.invalid/public.png',bytes:pngs[0]})
 const variant=await host.saveImageVariant({...scope,requestId:'legacy-variant',assetId:saved.id,sourceRevision:saved.revision,previewGeneration:saved.thumbnailRef,fileName:'Variant.png',bytes:pngs[1],options:{source:'preview',rotation:0,mirror:false,crop:'original',maxEdge:1600}})
 const origins=db.prepare('SELECT id,source_site_id AS site,capture_method AS method,image_metadata_json AS metadata FROM assets WHERE id IN (?,?)').all(download.assetId,variant.assetId) as any[]
 assert.equal(origins.find(a=>a.id===download.assetId)!.site,'web-download');assert.equal(origins.find(a=>a.id===variant.assetId)!.site,'image-tools');assert.equal(JSON.parse(origins.find(a=>a.id===variant.assetId)!.metadata).kind,'controlled-preview-variant')
 // The clipboard branch really exceeds the unchanged32MiB download/variant cap.
 const large=await sharp({create:{width:3000,height:3000,channels:4,background:'#22aacc'}}).png({compressionLevel:0}).toBuffer();assert.ok(large.byteLength>32*1024*1024&&large.byteLength<96*1024*1024)
 const largeResult=await host.importClipboardImage({...reopenedRequest,requestId:'clip-large',fileName:'Large clipboard.png',bytes:large}),largeRow=db.prepare('SELECT file_path AS original FROM assets WHERE id=?').get(largeResult.assetId) as {original:string}
 assert.ok(largeRow.original.startsWith(path.join(library,'Originals')+path.sep));assert.equal(sha(await fs.readFile(largeRow.original)),sha(large));assert.equal((await sharp(await host.readPreview(largeResult.assetId)).metadata()).width,1600)
 // A genuinely admitted incomplete Capture is retained, never blindly dispatched again.
 db.exec("CREATE TRIGGER fixture_clipboard_unknown BEFORE INSERT ON promotion_links WHEN NEW.design_asset_identity='clipboard-asset:clip-unknown' BEGIN SELECT RAISE(ABORT,'controlled clipboard promotion failure'); END")
 const unknown={...reopenedRequest,requestId:'clip-unknown',fileName:'Unknown.png'}
 await assert.rejects(host.importClipboardImage(unknown),error=>Boolean(error&&typeof error==='object'&&'code'in error&&error.code==='library-recovery-required'));db.exec('DROP TRIGGER fixture_clipboard_unknown')
 const unknownCounts=counts(),unknownTree=await tree(library);await assert.rejects(host.importClipboardImage(unknown),error=>Boolean(error&&typeof error==='object'&&'code'in error&&error.code==='library-recovery-required'));assert.deepEqual(counts(),unknownCounts);assert.deepEqual(await tree(library),unknownTree)
 db.exec("CREATE TRIGGER fixture_clipboard_provenance BEFORE UPDATE OF source_site_id ON assets WHEN NEW.id='clipboard-asset:clip-provenance' BEGIN SELECT RAISE(ABORT,'controlled provenance failure'); END")
 const provenanceRequest={...reopenedRequest,requestId:'clip-provenance',fileName:'Provenance.png'};await assert.rejects(host.importClipboardImage(provenanceRequest));db.exec('DROP TRIGGER fixture_clipboard_provenance')
 const provenanceCounts=counts(),provenanceTree=await tree(library);await assert.rejects(host.importClipboardImage(provenanceRequest),error=>Boolean(error&&typeof error==='object'&&'code'in error&&error.code==='library-recovery-required'));assert.deepEqual(counts(),provenanceCounts);assert.deepEqual(await tree(library),provenanceTree,'incomplete origin cannot turn into a fabricated successful replay')
 assert.deepEqual(pngs.map(sha),sourceHashes);assert.equal(admission.resourceStatus().materialBytes,0);assert.equal(admission.resourceStatus().computeBytes,0);assert.equal(admission.inspect().requests,0)
 console.log('Production held Copy/SQLite clipboard PNG intake: two distinct actual Originals/previews and genuine36MiB PNG above old32MiB cap, explicit clipboard origin/canonical envelope, strict PNG16MP/96MiB/identity/generation/request/name rejection before files or admission, NFC request replay with source conflicts rejected, user edits and close-reopen preserved, download/variant compatibility, admitted unknown or incomplete provenance retained without redispatch, source bytes and resource permits preserved. No OS clipboard access or user-path qualification.')
}finally{db?.close();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-clipboard-intake-'));await fs.rm(root,{recursive:true,force:true})}
