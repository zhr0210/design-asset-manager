import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createWorkWindowController} from '../src/main/work-mode/work-window-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import type {WorkWindowLayout} from '../src/shared/contracts/work-set.contract'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-open-existing-'))),library=path.join(root,'library'),handoffRoot=path.join(root,'handoffs'),sources=[path.join(root,'one.png'),path.join(root,'two.png'),path.join(root,'three.png')]
for(const[index,file]of sources.entries())await sharp({create:{width:35+index,height:44+index,channels:3,background:['#1359e4','#e7291f','#2bb935'][index]}}).png().toFile(file)
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),sourceBytes=await Promise.all(sources.map(file=>fs.readFile(file)))
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done});return{promise,resolve}}
const watch=<T>(promise:Promise<T>)=>promise.then(value=>({status:'fulfilled' as const,value}),reason=>({status:'rejected' as const,reason}))
let controller:ReturnType<typeof createWorkWindowController>|undefined,db:Database.Database|undefined
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('CREATE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),ids=sources.map(file=>assets.find(a=>a.fileName===path.basename(file))!.id),current=host.inspect(),scope={libraryIdentity:current.identity!,generation:current.generation!},device='device:open-existing'
 const initial=await host.readWorkSets(scope,device),set=(await host.writeWorkSet({...scope,sessionToken:initial.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Public opener fixtures',assetIds:ids,note:'Keep bytes',colors:[],columns:3}}},device)).sets[0]
 const admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})});let opens=0,mode:'ok'|'reject'|'gate'|'throw'='ok',entered=deferred(),release=deferred(),lastPath=''
 const options={host,admission,root:handoffRoot,open:async(file:string)=>{opens++;lastPath=file;if(mode==='gate'){entered.resolve();await release.promise}if(mode==='throw')throw Error('fixture opener unknown');return mode==='reject'?'fixture receiver rejection':''},trash:async()=>{throw Error('NOT_USED')}}
 const files=createWorkFileHandoffs(options),media=createWorkMediaController({host,files,changed(){}}),owner={},foreign={};let layout!:WorkWindowLayout
 controller=createWorkWindowController({host,media,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1400,height:900}],changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{layout=input.layout;return{publish(){},show(){},hide(){},destroy(){input.closed()},setPinned:value=>{layout.pinned=value},bounds:()=>layout,setBounds:value=>{layout=value},visible:()=>true,isTrusted:event=>event===owner}}})
 const opened=await controller.open({...scope,id:set.id});if(!opened.success)throw Error(opened.error)
 const token=opened.value.token,actor='work-native:'+token
 const copied=await files.prepare(actor,{...scope,setId:set.id,assetId:ids[0],kind:'original',action:'prepare'}),zip=await files.prepare(actor,{...scope,setId:set.id,assetId:ids[0],assetIds:ids,kind:'zip',action:'prepare'}),baseline=(await fs.readdir(handoffRoot)).sort()
 const copyPath=(await files.nativeFile(actor,copied.id)).file,zipPath=(await files.nativeFile(actor,zip.id)).file
 const requested=await controller.nativeOpenFile(owner,{token,id:copied.id});assert.equal(requested.success,true);if(requested.success)assert.equal(requested.value.status,'open-requested')
 assert.equal(lastPath,copyPath);assert.equal(opens,1);assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline);assert.deepEqual(Buffer.from((await files.readFile(copied.id)).bytes),sourceBytes[0])
 mode='reject';const rejected=await files.openExisting(actor,zip.id);assert.equal(rejected.status,'open-rejected');assert.equal(lastPath,zipPath);assert.equal(opens,2);assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline);assert.ok((await files.readFile(zip.id)).bytes.length>0)
 mode='ok';await assert.rejects(files.openExisting('wrong-actor',copied.id),/不属于当前窗口/);assert.equal((await controller.nativeOpenFile(foreign,{token,id:copied.id})).success,false);assert.equal((await controller.nativeOpenFile(owner,{token:'token:wrong',id:copied.id})).success,false);assert.equal((await controller.nativeOpenFile(owner,{token,id:copied.id,path:copyPath})).success,false);assert.equal(opens,2)
 const originalCopy=await fs.readFile(copyPath);await fs.writeFile(copyPath,'changed recoverable fixture')
 try{await assert.rejects(files.openExisting(actor,copied.id))}finally{await fs.writeFile(copyPath,originalCopy)}assert.equal(opens,2)
 await fs.unlink(copyPath);await fs.symlink(sources[0],copyPath)
 try{await assert.rejects(files.openExisting(actor,copied.id))}finally{await fs.unlink(copyPath);await fs.writeFile(copyPath,originalCopy)}assert.equal(opens,2)
 const recordPath=path.join(handoffRoot,copied.id.slice(8),'receipt.json'),originalRecord=await fs.readFile(recordPath)
 const altered=JSON.parse(originalRecord.toString());altered.scope.kind='preview';altered.receipt.kind='preview';await fs.writeFile(recordPath,JSON.stringify(altered))
 try{await assert.rejects(files.openExisting(actor,copied.id),/记录身份已变化/)}finally{await fs.writeFile(recordPath,originalRecord)}assert.equal(opens,2)
 await fs.unlink(recordPath);await fs.symlink(path.join(handoffRoot,zip.id.slice(8),'receipt.json'),recordPath)
 try{await assert.rejects(files.openExisting(actor,copied.id))}finally{await fs.unlink(recordPath);await fs.writeFile(recordPath,originalRecord)}assert.equal(opens,2)
 db=new Database(path.join(library,'.dam','library.sqlite'),{fileMustExist:true})
 const link=db.prepare('SELECT c.capture_request_identity AS requestId,r.source_generation AS generation FROM promotion_links p JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity WHERE p.design_asset_identity=?').get(ids[1]) as {requestId:string;generation:string}
 db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run('sha256:'+'a'.repeat(64),link.requestId)
 try{await assert.rejects(files.openExisting(actor,zip.id))}finally{db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run(link.generation,link.requestId)}assert.equal(opens,2)
 const beforeRemoval=await host.readWorkSets(scope,device),saved=beforeRemoval.sets.find(s=>s.id===set.id)!
 await host.writeWorkSet({...scope,sessionToken:beforeRemoval.sessionToken,allowUpgrade:true,command:{kind:'save',id:set.id,expectedRevision:saved.revision,value:{name:saved.name,assetIds:[ids[0],ids[2]],note:saved.note,colors:saved.colors,columns:saved.columns}}},device)
 await assert.rejects(files.openExisting(actor,zip.id),/参考已移除/);assert.equal(opens,2)
 const restore=await host.readWorkSets(scope,device),removed=restore.sets.find(s=>s.id===set.id)!
 await host.writeWorkSet({...scope,sessionToken:restore.sessionToken,allowUpgrade:true,command:{kind:'save',id:set.id,expectedRevision:removed.revision,value:{name:removed.name,assetIds:ids,note:removed.note,colors:removed.colors,columns:removed.columns}}},device)
 // Pending real opener Promise is an active actor job; native close/dock deny it.
 mode='gate';entered=deferred();release=deferred();const pending=controller.nativeOpenFile(owner,{token,id:zip.id});assert.equal(files.hasActive(actor),true);await entered.promise
 const close=await controller.act(owner,{token,kind:'close',discard:true});assert.equal(close.success,false);if(!close.success)assert.equal(close.code,'WORK_OPERATION_ACTIVE')
 const dock=await controller.act(owner,{token,kind:'dock',edge:'left'});assert.equal(dock.success,false);if(!dock.success)assert.equal(dock.code,'WORK_OPERATION_ACTIVE')
 assert.equal(admission.resourceStatus().materialBytes,512*1024**2);release.resolve();assert.equal((await pending).success,true);assert.equal(files.hasActive(actor),false)
 // Pre-dispatch cancel at a real Host-read barrier keeps the completed copy.
 const hostEntered=deferred(),hostRelease=deferred();let blocked=false
 const heldHost={...host,readWorkMedia:async(input:Parameters<typeof host.readWorkMedia>[0])=>{if(!blocked){blocked=true;hostEntered.resolve();await hostRelease.promise}return host.readWorkMedia(input)}},heldFiles=createWorkFileHandoffs({...options,host:heldHost});mode='ok'
 const beforeCancel=opens,cancelled=watch(heldFiles.openExisting(actor,copied.id));await hostEntered.promise;let cancelledDone=false;const cancelAck=heldFiles.cancel(actor).then(()=>{cancelledDone=true});await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(cancelledDone,false);assert.equal(heldFiles.hasActive(actor),true)
 hostRelease.resolve();const cancellation=await cancelled;await cancelAck;assert.equal(cancellation.status,'rejected');if(cancellation.status==='rejected')assert.equal(cancellation.reason.code,'WORK_HANDOFF_CANCELLED');assert.equal(opens,beforeCancel);assert.deepEqual(Buffer.from((await heldFiles.readFile(copied.id)).bytes),sourceBytes[0])
 // An unknown atomic-record write result never retries OS open or deletes copy.
 const rename=fs.rename;let injected=false
 fs.rename=(async(from:any,to:any)=>{if(!injected&&String(from).startsWith(handoffRoot+path.sep)&&path.basename(String(from)).startsWith('receipt-update-')){injected=true;throw Error('fixture unknown rename outcome')}return rename(from,to)})as typeof fs.rename
 const beforeUnknown=opens
 try{await assert.rejects(files.openExisting(actor,copied.id),(error:any)=>error.code==='WORK_HANDOFF_OPEN_RECORD_UNKNOWN')}finally{fs.rename=rename}
 assert.equal(opens,beforeUnknown+1);assert.deepEqual(Buffer.from((await files.readFile(copied.id)).bytes),sourceBytes[0]);assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline)
 mode='throw';const beforeThrow=opens;await assert.rejects(files.openExisting(actor,copied.id),(error:any)=>error.code==='WORK_HANDOFF_OPEN_UNKNOWN');assert.equal(opens,beforeThrow+1);mode='ok'
 // Real Controller drain requests cancellation then waits the already dispatched
 // opener Promise. It neither destroys the window early nor claims reception.
 entered=deferred();release=deferred();mode='gate';const duringDrain=controller.nativeOpenFile(owner,{token,id:copied.id});await entered.promise;let drainDone=false;const draining=controller.drain().then(()=>{drainDone=true})
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(drainDone,false);assert.equal(controller.count(),1);assert.equal(files.hasActive(actor),true);release.resolve();await duringDrain;await draining;assert.equal(controller.count(),0);assert.equal(files.hasActive(actor),false)
 assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline);assert.deepEqual(Buffer.from((await files.readFile(copied.id)).bytes),sourceBytes[0])
 for(const[index,file]of sources.entries())assert.equal(sha(await fs.readFile(file)),sha(sourceBytes[index]));assert.equal(admission.resourceStatus().materialBytes,0);assert.equal(admission.inspect().requests,0)
 const indexText=await fs.readFile(path.join(process.cwd(),'src/main/index.ts'),'utf8');assert.match(indexText,/browserDeniedChannels[^\n]*'work-window:open-file'/)
 console.log('PASS: production Copy/Host/SQLite openExisting same receipt/no new directories; ZIP all-member/source/hash/kind/path/actor guards; native sender/token/unknown-key gate; explicit open-requested/rejected and preserved copies; atomic record unknown no retry; pre-dispatch cancel; active close/dock and real drain wait actual opener return; originals/permits preserved. OS opener is a controlled port; native receiver effects remain separate.')
}finally{db?.close();await controller?.drain();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-open-existing-'));await fs.rm(root,{recursive:true,force:true})}
