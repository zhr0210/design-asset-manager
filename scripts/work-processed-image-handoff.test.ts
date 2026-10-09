import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {validateWorkHandoff,type WorkHandoffRequest,type WorkImageTransform} from '../src/shared/contracts/work-media.contract'

// Production Copy intake/SQLite/Host/Sharp/handoff, only an owned temporary library.
// Explicit temporary DB mutations below inject source/type faults, not user-path proof.
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-processed-image-')))
const library=path.join(root,'library'), sources=[path.join(root,'transparent.png'),path.join(root,'oriented.jpg'),path.join(root,'oversized.png')]
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
await sharp({create:{width:120,height:80,channels:4,background:{r:255,g:0,b:0,alpha:0}}}).png().toFile(sources[0])
await sharp({create:{width:100,height:60,channels:3,background:'#1258dc'}}).jpeg().withMetadata({orientation:6}).toFile(sources[1])
await sharp({create:{width:4001,height:4000,channels:3,background:'#37ab2e'}}).png().toFile(sources[2])
const sourceHashes=await Promise.all(sources.map(async file=>sha(await fs.readFile(file))))
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
let db:Database.Database|undefined
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),first=assets.find(a=>a.fileName==='transparent.png')!,second=assets.find(a=>a.fileName==='oriented.jpg')!,big=assets.find(a=>a.fileName==='oversized.png')!
 assert.ok(first&&second&&big)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:processed-image-test'
 const initial=await host.readWorkSets(scope,device)
 const created=await host.writeWorkSet({...scope,sessionToken:initial.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Generated image transforms',assetIds:[first.id,second.id,big.id],colors:[],columns:2,note:'Preserve original bytes'}}},device)
 const set=created.sets[0],handoffRoot=path.join(root,'handoffs')
 const admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})})
 const options={host,admission,root:handoffRoot,open:async()=>'',trash:async(file:string)=>{await fs.unlink(file)}}
 let files=createWorkFileHandoffs(options)
 const request=(assetId:string,imageTransform:WorkImageTransform):WorkHandoffRequest=>({...scope,setId:set.id,assetId,kind:'processed-image',action:'prepare',imageTransform})
 const png:WorkImageTransform={format:'png',quality:10,resize:{fit:'inside',width:60,height:60},stripMetadata:true}
 const firstRequest=request(first.id,png), firstReceipt=await files.prepare('fixture-actor',firstRequest)
 assert.equal(firstReceipt.kind,'processed-image');assert.deepEqual(firstReceipt.image,{width:60,height:40,format:'png',hasAlpha:true,autoOriented:true,qualityApplied:false,jpegAlphaFlattened:false,metadataPolicy:'stripped',retainedMetadata:[]})
 assert.match(firstReceipt.message,/PNG无损/);assert.equal(firstReceipt.message.includes(root),false)
 const firstFile=await files.readFile(firstReceipt.id);assert.equal(firstFile.type,'image/png')
 const otherPngQuality=await files.prepare('fixture-actor',request(first.id,{...png,quality:100}))
 assert.deepEqual(Buffer.from((await files.readFile(otherPngQuality.id)).bytes),Buffer.from(firstFile.bytes),'PNG must not apply lossy quality setting')
 const firstOutput=await sharp(firstFile.bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(firstOutput.info.channels,4);assert.equal(firstOutput.data[3],0)
 const jpegReceipt=await files.prepare('fixture-actor',request(first.id,{format:'jpeg',quality:95,stripMetadata:true}))
 assert.equal(jpegReceipt.image?.jpegAlphaFlattened,true);assert.equal(jpegReceipt.image?.hasAlpha,false);assert.equal(jpegReceipt.image?.qualityApplied,true)
 const jpegFile=await files.readFile(jpegReceipt.id);assert.equal(jpegFile.type,'image/jpeg')
 const jpegPixel=await sharp(jpegFile.bytes).removeAlpha().raw().toBuffer();assert.ok(jpegPixel[0]>250&&jpegPixel[1]>250&&jpegPixel[2]>250,'fully transparent pixel must become white, not black')
 const orientedReceipt=await files.prepare('fixture-actor',request(second.id,{format:'webp',quality:82,resize:{fit:'inside',width:200,height:200},stripMetadata:false}))
 assert.equal(orientedReceipt.image?.width,60);assert.equal(orientedReceipt.image?.height,100,'EXIF orientation must be applied and resize must not enlarge')
 assert.equal(orientedReceipt.image?.metadataPolicy,'partial');assert.ok(orientedReceipt.image?.retainedMetadata.includes('exif'));assert.ok(orientedReceipt.image?.retainedMetadata.includes('icc'))
 assert.match(orientedReceipt.message,/不保证完整保留/)
 const orientedFile=await files.readFile(orientedReceipt.id);assert.equal(orientedFile.type,'image/webp')
 const orientedMeta=await sharp(orientedFile.bytes).metadata();assert.equal(orientedMeta.orientation,1,'retained EXIF must not re-rotate exported pixels')
 assert.notEqual(sha(orientedFile.bytes),firstReceipt.sha256)
 const record=JSON.parse(await fs.readFile(path.join(handoffRoot,orientedReceipt.id.slice(8),'receipt.json'),'utf8'))
 assert.equal(record.provenance.sourceSha256,sourceHashes[1]);assert.equal(record.provenance.image.result.width,60);assert.ok(record.provenance.image.operations.includes('resize-inside/without-enlargement'))
 assert.equal(JSON.stringify(record.provenance).includes(root),false)
 await assert.rejects(files.nativeFile('other-actor',orientedReceipt.id),/不属于当前窗口/)
 assert.equal((await files.nativeFile('fixture-actor',orientedReceipt.id)).assetId,second.id)
 // Fresh production service reloads both old and new receipt JSON without losing evidence.
 const legacy=await files.prepare('fixture-actor',{...scope,setId:set.id,assetId:first.id,kind:'original',action:'prepare'})
 const preview=await files.prepare('fixture-actor',{...scope,setId:set.id,assetId:first.id,kind:'preview',action:'prepare'})
 const compatible=await files.prepare('fixture-actor',{...scope,setId:set.id,assetId:first.id,kind:'compatible-png',action:'prepare'})
 files=createWorkFileHandoffs(options)
 assert.deepEqual(Buffer.from((await files.readFile(legacy.id)).bytes),await fs.readFile(sources[0]))
 assert.ok((await files.readFile(preview.id)).bytes.length>0);assert.equal((await files.readFile(compatible.id)).type,'image/png')
 assert.equal((await files.list({...scope,setId:set.id,assetId:second.id}))[0].image?.width,60)
 assert.equal((await files.readFile(orientedReceipt.id)).type,'image/webp')
 // Strict parameter boundaries; malformed requests cannot create an output directory.
 const invalids:unknown[]=[{...firstRequest,imageTransform:undefined},{...firstRequest,imageTransform:{...png,format:'gif'}},{...firstRequest,imageTransform:{...png,format:['png']}},{...firstRequest,kind:['processed-image']},{...firstRequest,action:['prepare']},{...firstRequest,imageTransform:{...png,quality:0}},{...firstRequest,imageTransform:{...png,quality:101}},{...firstRequest,imageTransform:{...png,quality:2.5}},{...firstRequest,imageTransform:{...png,stripMetadata:'yes'}},{...firstRequest,imageTransform:{...png,resize:{fit:'cover',width:60,height:60}}},{...firstRequest,imageTransform:{...png,resize:{fit:'inside',width:4097,height:60}}},{...firstRequest,imageTransform:{...png,resize:{fit:'inside',width:0,height:60}}},{...firstRequest,imageTransform:{...png,unknown:true}},{...firstRequest,imageTransform:{...png,resize:{fit:'inside',width:60,height:60,unknown:true}}},{...firstRequest,unknown:true},{...firstRequest,kind:'original'}, {...firstRequest,frameId:'reference-frame:invalid'}]
 const beforeInvalid=(await fs.readdir(handoffRoot)).length
 for(const invalid of invalids)assert.throws(()=>validateWorkHandoff(invalid))
 assert.equal((await fs.readdir(handoffRoot)).length,beforeInvalid)
 await assert.rejects(files.prepare('x'.repeat(20000),firstRequest),/交付记录超过16 KiB/)
 assert.equal((await fs.readdir(handoffRoot)).length,beforeInvalid,'oversized record must be refused before copy directory creation')
 await assert.rejects(files.prepare('fixture-actor',request(big.id,png)),/pixel limit|16百万/i)
 await assert.rejects(files.prepare('fixture-actor',{...firstRequest,generation:'generation:stale'}))
 const mediaStatus=await host.workMediaStatus(scope)
 await host.enableWorkMedia({...scope,...mediaStatus,expectedSchemaVersion:mediaStatus.schemaVersion,allowUpgrade:true})
 db=new Database(path.join(library,'.dam','library.sqlite'),{fileMustExist:true})
 const link=db.prepare('SELECT c.capture_request_identity AS requestId,c.managed_original_ref AS originalRef,r.source_generation AS generation,r.source_format AS format FROM promotion_links p JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity WHERE p.design_asset_identity=?').get(first.id) as {requestId:string;originalRef:string;generation:string;format:string}
 // Production Host supplies video type after a controlled temporary SQLite format fault.
 db.prepare('UPDATE capture_requests SET source_format=? WHERE capture_request_identity=?').run('mp4',link.requestId)
 try{await assert.rejects(files.prepare('fixture-actor',firstRequest),/视频不支持/)}finally{db.prepare('UPDATE capture_requests SET source_format=? WHERE capture_request_identity=?').run(link.format,link.requestId)}
 let reads=0
 const changedHost={...host,readWorkMedia:async(input:Parameters<typeof host.readWorkMedia>[0])=>{if(++reads===2)db!.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run('sha256:'+'a'.repeat(64),link.requestId);return host.readWorkMedia(input)}}
 const changedFiles=createWorkFileHandoffs({...options,host:changedHost})
 try{await assert.rejects(changedFiles.prepare('fixture-actor',firstRequest),/素材已变化/)}finally{db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run(link.generation,link.requestId)}
 // Actual temporary managed-original tampering is caught before transform; restore immediately.
 const original=path.join(library,'Originals',link.originalRef.slice('managed-original:'.length)),originalBytes=await fs.readFile(original)
 await fs.writeFile(original,Buffer.from('tampered public fixture'))
 try{await assert.rejects(files.prepare('fixture-actor',firstRequest))}finally{await fs.writeFile(original,originalBytes)}
 const fullRoot=path.join(root,'full-handoffs');await fs.mkdir(fullRoot)
 for(let i=0;i<64;i++)await fs.mkdir(path.join(fullRoot,randomUUID()))
 await assert.rejects(createWorkFileHandoffs({...options,root:fullRoot}).prepare('fixture-actor',firstRequest),/64份或1 GiB/)
 assert.equal((await fs.readdir(fullRoot)).length,64)
 const byteRoot=path.join(root,'byte-handoffs'),sparseDir=path.join(byteRoot,randomUUID());await fs.mkdir(sparseDir,{recursive:true})
 const sparse=await fs.open(path.join(sparseDir,'bounded-fixture.bin'),'wx');await sparse.truncate(1024**3);await sparse.close()
 await assert.rejects(createWorkFileHandoffs({...options,root:byteRoot}).prepare('fixture-actor',firstRequest),/64份或1 GiB/)
 assert.equal((await fs.readdir(byteRoot)).length,1)
 const metadataBoundary=await fs.open(path.join(sparseDir,'bounded-fixture.bin'),'r+')
 await metadataBoundary.truncate(1024**3-firstReceipt.bytes-8192);await metadataBoundary.close()
 await assert.rejects(createWorkFileHandoffs({...options,root:byteRoot}).prepare('fixture-actor',firstRequest),/64份或1 GiB/,'file alone fits, but bounded receipt metadata must also fit')
 assert.equal((await fs.readdir(byteRoot)).length,1)
 // Real saved-set member removal revokes reading and preparation of formerly delivered copies.
 const latest=await host.readWorkSets(scope,device),held=latest.sets.find(s=>s.id===set.id)!
 await host.writeWorkSet({...scope,sessionToken:latest.sessionToken,allowUpgrade:true,command:{kind:'save',id:set.id,expectedRevision:held.revision,value:{name:held.name,assetIds:[second.id,big.id],colors:held.colors,columns:held.columns,note:held.note}}},device)
 await assert.rejects(files.prepare('fixture-actor',firstRequest),/参考已移除/)
 await assert.rejects(files.readFile(firstReceipt.id),/参考已移除/)
 db.close();db=undefined;await host.close();await host.reopen()
 const reopened=host.inspect();assert.equal(reopened.state,'ready')
 const reopenedScope={libraryIdentity:reopened.identity!,generation:reopened.generation!}
 const reopenedSet=(await host.readWorkSets(reopenedScope,device)).sets.find(s=>s.id===set.id)!
 assert.equal(reopenedSet.note,'Preserve original bytes');assert.deepEqual(reopenedSet.assetIds,[second.id,big.id])
 const reopenedFiles=createWorkFileHandoffs(options)
 assert.deepEqual(Buffer.from((await reopenedFiles.readFile(orientedReceipt.id)).bytes),Buffer.from(orientedFile.bytes))
 assert.equal((await reopenedFiles.list({...reopenedScope,setId:set.id,assetId:second.id}))[0].image?.format,'webp')
 await assert.rejects(reopenedFiles.readFile(firstReceipt.id),/参考已移除/)
 for(const [i,file] of sources.entries())assert.equal(sha(await fs.readFile(file)),sourceHashes[i])
 assert.equal(sha(await fs.readFile(original)),sourceHashes[0])
 assert.equal((await host.listAssets()).length,3)
 assert.equal(admission.inspect().requests,0);assert.equal(admission.resourceStatus().computeBytes,0,'all successful and failed transforms must release their shared resource permits')
 console.log('PASS: production temporary SQLite Copy/Host/Sharp image transforms; PNG alpha and honest quality, JPEG white flatten, EXIF auto-orientation/no enlargement, partial metadata, MIME/provenance/Host close-reopen, old kinds, invalid inputs, type/source/member/actor refusal, 16MP and 64-copy/1GiB budgets, shared permits released, original hashes unchanged. Video refusal uses explicit temporary type fault; physical GUI delivery remains separate.')
}finally{
 db?.close();await host.close()
 assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-processed-image-'))
 await fs.rm(root,{recursive:true,force:true})
}
