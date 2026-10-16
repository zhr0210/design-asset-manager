import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash,randomBytes,randomUUID} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import yauzl from 'yauzl'
import crc32 from 'buffer-crc32'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createBoundedWorkZip,workZipEntryNames,WORK_ZIP_MAX_BYTES} from '../src/main/work-mode/bounded-work-zip'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {validateWorkHandoff,type WorkHandoffRequest} from '../src/shared/contracts/work-media.contract'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-work-zip-'))),library=path.join(root,'library'),handoffRoot=path.join(root,'handoffs')
const paths=[path.join(root,'a','共同.png'),path.join(root,'b','共同.png'),path.join(root,'c','e\u0301.png')]
for(const [index,file]of paths.entries()){await fs.mkdir(path.dirname(file));await sharp({create:{width:30+index,height:40+index,channels:3,background:['#1259f4','#e83025','#10ac37'][index]}}).png().toFile(file)}
const sourceBytes=await Promise.all(paths.map(file=>fs.readFile(file))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex')
let selections=paths
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:selections.map(filePath=>({filePath}))})}))
const readZip=(bytes:Uint8Array)=>new Promise<Array<{name:string;bytes:Buffer;crc:number;flags:number}>>((resolve,reject)=>{
 yauzl.fromBuffer(Buffer.from(bytes),{lazyEntries:true,strictFileNames:true,validateEntrySizes:true},(error:any,zip:any)=>{
  if(error){reject(error);return}const entries:Array<{name:string;bytes:Buffer;crc:number;flags:number}>=[]
  zip.on('error',reject);zip.on('end',()=>resolve(entries));zip.on('entry',(entry:any)=>zip.openReadStream(entry,(err:any,stream:any)=>{
   if(err){reject(err);return}const chunks:Buffer[]=[];stream.on('error',reject);stream.on('data',(chunk:Buffer)=>chunks.push(chunk));stream.on('end',()=>{const data=Buffer.concat(chunks);assert.equal(data.length,entry.uncompressedSize);assert.equal(crc32.unsigned(data),entry.crc32,'independent reader CRC must match actual bytes');entries.push({name:entry.fileName,bytes:data,crc:entry.crc32,flags:entry.generalPurposeBitFlag});zip.readEntry()})
  }));zip.readEntry()
 })
})
let db:Database.Database|undefined
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('CREATE_FIXTURE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('INTAKE_FIXTURE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets();assert.equal(assets.length,3)
 // Duplicate source names are intentional; preserve source order by actual public byte digest.
 db=new Database(path.join(library,'.dam','library.sqlite'),{fileMustExist:true})
 const links=sourceBytes.map(bytes=>db!.prepare('SELECT p.design_asset_identity AS assetId,r.capture_request_identity AS requestId,r.source_generation AS generation,c.managed_original_ref AS originalRef FROM capture_requests r JOIN asset_candidates c ON c.capture_request_identity=r.capture_request_identity JOIN promotion_links p ON p.candidate_identity=c.candidate_identity WHERE r.source_generation=?').get('sha256:'+sha(bytes)) as {assetId:string;requestId:string;generation:string;originalRef:string})
 const ids=links.map(link=>link.assetId),state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:zip-test'
 const initial=await host.readWorkSets(scope,device),created=await host.writeWorkSet({...scope,sessionToken:initial.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Public ZIP fixture',assetIds:ids,columns:3}}},device),set=created.sets[0]
 const request:WorkHandoffRequest={...scope,setId:set.id,assetId:ids[0],kind:'zip',action:'prepare',assetIds:ids}
 const admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})});let opened=0
 const options={host,admission,root:handoffRoot,open:async()=>{opened++;return ''},trash:async()=>{throw Error('NOT_USED')}}
 let files=createWorkFileHandoffs(options)
 const receipt=await files.prepare('fixture-owner',request),payload=await files.readFile(receipt.id)
 assert.equal(payload.type,'application/zip');assert.equal(receipt.archive?.count,3);assert.equal(receipt.message.includes(root),false)
 const parsed=await readZip(payload.bytes);assert.deepEqual(parsed.map(entry=>entry.name),['共同.png','共同 (2).png','é.png'])
 for(const [index,entry]of parsed.entries()){assert.deepEqual(entry.bytes,sourceBytes[index]);assert.equal(entry.flags&0x800,0x800,'Unicode entry names require UTF8 flag');assert.equal(receipt.archive!.items[index].sha256,sha(sourceBytes[index]))}
 await assert.rejects(files.nativeFile('different-owner',receipt.id),/不属于当前窗口/)
 const recordFile=path.join(handoffRoot,receipt.id.slice(8),'receipt.json'),recordText=await fs.readFile(recordFile,'utf8'),record=JSON.parse(recordText)
 assert.equal(record.sourceMembers.length,3);assert.deepEqual(record.provenance.archive.inputs.map((s:any)=>s.digest),sourceBytes.map(sha));assert.equal(recordText.includes(root),false)
 const legacy=await files.prepare('fixture-owner',{...scope,setId:set.id,assetId:ids[0],kind:'original',action:'prepare'})
 files=createWorkFileHandoffs(options);assert.deepEqual(Buffer.from((await files.readFile(legacy.id)).bytes),sourceBytes[0])
 for(const invalid of [{...request,assetIds:undefined},{...request,assetIds:[]},{...request,assetIds:[ids[0],ids[0]]},{...request,assetIds:[ids[1],ids[0]]},{...request,assetIds:Array.from({length:65},(_,i)=>'asset:'+i)},{...request,assetIds:'string'},{...request,assetIds:[ids[0],42]},{...request,kind:'original'},{...request,frameId:'frame:invalid'},{...request,imageTransform:{format:'png',quality:1,stripMetadata:true}},{...request,unexpected:true}])assert.throws(()=>validateWorkHandoff(invalid))
 await assert.rejects(files.prepare('fixture-owner',{...request,assetIds:[ids[0],'asset:not-member']}),/参考已移除|不可用/)
 await assert.rejects(createBoundedWorkZip([{name:'large.png',bytes:randomBytes(4096)}],100),/ZIP输出超过/)
 await assert.rejects(createBoundedWorkZip([{name:'too-large',bytes:Buffer.alloc(WORK_ZIP_MAX_BYTES+1)}]),/总输入/)
 assert.deepEqual(workZipEntryNames(['../x.png','x.png','x.PNG','CON.png','e\u0301.png','é.png']),['x.png','x (2).png','x (3).PNG','_CON.png','é.png','é (2).png'])
 assert.ok(Buffer.byteLength(workZipEntryNames(['界'.repeat(100)+'.png'])[0])<=120)
 let originalReads=0
 const oversizedHost={...host,readAssetContext:async(...args:Parameters<typeof host.readAssetContext>)=>{const result=await host.readAssetContext(...args);return {...result,assets:result.assets.map(a=>({...a,fileSize:60*1024**2}))}},readWorkMediaFile:async(...args:Parameters<typeof host.readWorkMediaFile>)=>{originalReads++;return host.readWorkMediaFile(...args)}}
 await assert.rejects(createWorkFileHandoffs({...options,host:oversizedHost}).prepare('fixture-owner',request),/ZIP总输入超过/);assert.equal(originalReads,0,'sum budget must reject before accumulating member buffers')
 const baseline=(await fs.readdir(handoffRoot)).sort(),realOpen=fs.open
 // Real partial write, exact owned FileHandle/inode, then a simulated disk-full error.
 const injectWriteFault=(unknown:boolean)=>{let fired=false;fs.open=(async(...args:any[])=>{const handle=await (realOpen as any)(...args),file=String(args[0]);if(!fired&&file.startsWith(handoffRoot+path.sep)&&file.endsWith('.zip')&&args[1]==='wx'){fired=true;return new Proxy(handle,{get(target,key){if(key==='writeFile')return async(value:Uint8Array)=>{await target.writeFile(value.subarray(0,8));if(unknown)await fs.writeFile(path.join(path.dirname(file),'unknown.txt'),'unrelated public fixture');throw Object.assign(Error('fixture ENOSPC'),{code:'ENOSPC'})};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}})}return handle})as typeof fs.open}
 try{injectWriteFault(false);await assert.rejects(files.prepare('fixture-owner',{...request,action:'open'}),/已回收本次不完整/)}finally{fs.open=realOpen}
 assert.equal(opened,0);assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline)
 try{injectWriteFault(true);await assert.rejects(files.prepare('fixture-owner',{...request,action:'open'}),/归属未确认.*请勿盲目重试/)}finally{fs.open=realOpen}
 assert.equal(opened,0)
 const partial=(await fs.readdir(handoffRoot)).find(name=>!baseline.includes(name))!;assert.equal(await fs.readFile(path.join(handoffRoot,partial,'unknown.txt'),'utf8'),'unrelated public fixture')
 await fs.rm(path.join(handoffRoot,partial),{recursive:true}) // Only this named owned temporary failure fixture.
 for(const altered of [{...record,sourceMembers:record.sourceMembers.slice(0,1)},{...record,sourceMembers:record.sourceMembers.map((s:any,i:number)=>i===1?{...s,assetId:ids[0]}:s)},{...record,scope:{...record.scope,kind:'original',assetIds:undefined},receipt:{...record.receipt,kind:'original'},padding:'x'.repeat(20000)}]){
  await fs.writeFile(recordFile,JSON.stringify(altered));await assert.rejects(createWorkFileHandoffs(options).readFile(receipt.id));await fs.writeFile(recordFile,recordText)
 }
 // Actual non-first source mutation must revoke the archive even when first is unchanged.
 db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run('sha256:'+'a'.repeat(64),links[1].requestId)
 try{await assert.rejects(createWorkFileHandoffs(options).readFile(receipt.id))}finally{db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run(links[1].generation,links[1].requestId)}
 const changedHost={...host,readWorkMediaFile:async(input:Parameters<typeof host.readWorkMediaFile>[0])=>{const value=await host.readWorkMediaFile(input);if(input.assetId===ids[2])db!.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run('sha256:'+'b'.repeat(64),links[1].requestId);return value}}
 try{await assert.rejects(createWorkFileHandoffs({...options,host:changedHost}).prepare('fixture-owner',request))}finally{db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run(links[1].generation,links[1].requestId)}
 assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline)
 const originals=links.map(link=>path.join(library,'Originals',link.originalRef.slice('managed-original:'.length)))
 const old=await fs.readFile(originals[2]);await fs.writeFile(originals[2],'mutated recoverable public fixture')
 try{await assert.rejects(files.prepare('fixture-owner',request))}finally{await fs.writeFile(originals[2],old)}
 const fullRoot=path.join(root,'full');await fs.mkdir(fullRoot);for(let i=0;i<64;i++)await fs.mkdir(path.join(fullRoot,randomUUID()))
 await assert.rejects(createWorkFileHandoffs({...options,root:fullRoot}).prepare('fixture-owner',request),/64份或1 GiB/)
 const byteRoot=path.join(root,'bytes'),sparseDir=path.join(byteRoot,randomUUID());await fs.mkdir(sparseDir,{recursive:true});const sparse=await fs.open(path.join(sparseDir,'sparse.bin'),'wx');await sparse.truncate(1024**3-receipt.bytes-64*1024);await sparse.close()
 await assert.rejects(createWorkFileHandoffs({...options,root:byteRoot}).prepare('fixture-owner',request),/64份或1 GiB/,'ZIP must reserve its bounded128KiB receipt, not just file bytes')
 db.close();db=undefined;await host.close();await host.reopen();const resumed=host.inspect(),resumedScope={libraryIdentity:resumed.identity!,generation:resumed.generation!}
 files=createWorkFileHandoffs(options);assert.deepEqual(Buffer.from((await files.readFile(receipt.id)).bytes),Buffer.from(payload.bytes))
 const catalog=await host.readWorkSets(resumedScope,device),saved=catalog.sets.find(s=>s.id===set.id)!
 await host.writeWorkSet({...resumedScope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'save',id:set.id,expectedRevision:saved.revision,value:{name:saved.name,assetIds:[ids[0],ids[2]],columns:saved.columns}}},device)
 await assert.rejects(files.readFile(receipt.id),/参考已移除/);await assert.rejects(files.nativeFile('fixture-owner',receipt.id),/参考已移除/)
 const after=await host.readWorkSets(resumedScope,device),removed=after.sets.find(s=>s.id===set.id)!
 await host.writeWorkSet({...resumedScope,sessionToken:after.sessionToken,allowUpgrade:true,command:{kind:'save',id:set.id,expectedRevision:removed.revision,value:{name:removed.name,assetIds:ids,columns:removed.columns}}},device)
 assert.deepEqual(Buffer.from((await files.readFile(receipt.id)).bytes),Buffer.from(payload.bytes),'restored current membership may authorize intact archive again')
 // Actual maximum batch: 64 independently imported images, not synthesized receipts.
 const extraFiles:string[]=[]
 for(let i=0;i<61;i++){const file=path.join(root,'extra-'+String(i).padStart(2,'0')+'.png');await sharp({create:{width:10+i,height:16,channels:3,background:{r:i+1,g:244,b:166}}}).png().toFile(file);extraFiles.push(file)}
 selections=extraFiles;const maximumIntake=await host.prepareAddAssets();if(maximumIntake.kind!=='planned')throw Error('MAXIMUM_INTAKE');await host.dispatchAddAssets(maximumIntake.plan.receipt)
 const maximumAssets=await host.listAssets();assert.equal(maximumAssets.length,64)
 const maximumIds=[...ids,...extraFiles.map(file=>maximumAssets.find(asset=>asset.fileName===path.basename(file))!.id)],maximumCatalog=await host.readWorkSets(resumedScope,device)
 const maximumSet=(await host.writeWorkSet({...resumedScope,sessionToken:maximumCatalog.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Maximum64',assetIds:maximumIds,columns:4,}}},device)).sets.find(set=>set.name==='Maximum64')!
 const maximumReceipt=await files.prepare('fixture-owner',{...resumedScope,setId:maximumSet.id,assetId:maximumIds[0],assetIds:maximumIds,kind:'zip',action:'prepare'})
 assert.equal(maximumReceipt.archive?.count,64)
 const maximumRecord=await fs.readFile(path.join(handoffRoot,maximumReceipt.id.slice(8),'receipt.json'));assert.ok(maximumRecord.length>16384&&maximumRecord.length<128*1024,'64-member receipt really requires ZIP-only bounded metadata allowance')
 const maximumPayload=await createWorkFileHandoffs(options).readFile(maximumReceipt.id),maximumEntries=await readZip(maximumPayload.bytes),maximumSources=[...sourceBytes,...await Promise.all(extraFiles.map(file=>fs.readFile(file)))]
 assert.equal(maximumEntries.length,64);for(const[index,entry]of maximumEntries.entries())assert.deepEqual(entry.bytes,maximumSources[index])
 for(const[index,file]of originals.entries())assert.equal(sha(await fs.readFile(file)),sha(sourceBytes[index]))
 for(const[index,file]of paths.entries())assert.equal(sha(await fs.readFile(file)),sha(sourceBytes[index]))
 assert.equal(admission.resourceStatus().computeBytes,0);assert.equal(admission.inspect().requests,0)
 console.log('PASS: production Copy/Host/SQLite ZIP archive; 3 distinct sources and actual64-import maximum, independent yauzl entries/CRC/UTF8/order/bytes, deterministic collision names, strict params and every-member actor/source/revocation guards, bounded input/output/retained/receipt, real partial-write rollback and unknown ownership retained with no OS open, legacy records, actual Host close-reopen, restored membership, original hashes and shared permits preserved. Injected budget/source/disk faults are internal regression; GUI delivery remains separate.')
}finally{db?.close();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-work-zip-'));await fs.rm(root,{recursive:true,force:true})}
