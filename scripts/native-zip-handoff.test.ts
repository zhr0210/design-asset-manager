import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import type {WorkWindowLayout} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-zip-handoff-'))),sources=[path.join(root,'first.png'),path.join(root,'second.png')]
for(const[i,file]of sources.entries())await sharp({create:{width:80,height:90,channels:3,background:i?'#e51b24':'#195af0'}}).png().toFile(file)
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:path.join(root,'library')}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
const fileIcon=await sharp({create:{width:32,height:32,channels:3,background:'#dec53a'}}).png().toBuffer()
let controller:ReturnType<typeof createWorkWindowController>|undefined
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),first=assets.find(a=>a.fileName==='first.png')!,second=assets.find(a=>a.fileName==='second.png')!,state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:native-zip-test'
 const initial=await host.readWorkSets(scope,device),value={name:'Native ZIP fixture',assetIds:[first.id,second.id],columns:2,}
 const created=await host.writeWorkSet({...scope,sessionToken:initial.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device),set=created.sets[0]
 const files=createWorkFileHandoffs({host,root:path.join(root,'handoffs'),open:async()=>'',trash:async()=>{throw Error('NOT_USED')}}),media=createWorkMediaController({host,files,changed(){}}),owner={}
 const iconRequests:string[]=[],dragCalls:{files:string[];icon:Uint8Array}[]=[];let port!:WorkWindowPort,layout!:WorkWindowLayout,afterIcon:(()=>Promise<void>)|undefined,emptyIcon=false
 controller=createWorkWindowController({host,media,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:900}],changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{
  layout=input.layout;port={publish(){},show(){},hide(){},destroy(){input.closed()},setPinned:p=>{layout.pinned=p},bounds:()=>layout,setBounds:b=>{layout=b},visible:()=>true,isTrusted:event=>event===owner,
  readFileIcon:async file=>{iconRequests.push(file);if(afterIcon){const change=afterIcon;afterIcon=undefined;await change()}return emptyIcon?new Uint8Array():fileIcon},startDrag:(file,icon)=>dragCalls.push({files:[file],icon}),startDragFiles:(paths,icon)=>dragCalls.push({files:paths,icon})};return port
 }})
 const opened=await controller.open({...scope,id:set.id});if(!opened.success)throw Error(opened.error);const token=opened.value.token,actor='work-native:'+token
 const zip=await files.prepare(actor,{...scope,setId:set.id,assetId:first.id,assetIds:[first.id,second.id],kind:'zip',action:'prepare'}),image=await files.prepare(actor,{...scope,setId:set.id,assetId:second.id,kind:'original',action:'prepare'})
 const zipFile=await files.nativeFile(actor,zip.id),imageFile=await files.nativeFile(actor,image.id);assert.equal(zipFile.kind,'zip');assert.equal(imageFile.kind,'original');assert.equal(zip.archive?.count,2)
 const read=await files.readFile(zip.id);assert.equal(read.type,'application/zip');assert.deepEqual(Array.from(read.bytes.subarray(0,4)),[0x50,0x4b,0x03,0x04])
 assert.equal((await controller.nativeDrag(owner,{token,id:zip.id})).success,true);assert.deepEqual(iconRequests,[zipFile.file]);assert.deepEqual(dragCalls[0].files,[zipFile.file]);assert.deepEqual(Buffer.from(dragCalls[0].icon),fileIcon)
 assert.notDeepEqual(Buffer.from(dragCalls[0].icon),Buffer.from(await host.readPreview(first.id)),'ZIP never borrows its first member image as cursor')
 assert.equal((await controller.nativeDragFiles(owner,{token,ids:[zip.id,image.id]})).success,true);assert.deepEqual(dragCalls[1].files,[zipFile.file,imageFile.file]);assert.deepEqual(Buffer.from(dragCalls[1].icon),fileIcon)
 const iconCount=iconRequests.length
 assert.equal((await controller.nativeDrag(owner,{token,id:image.id})).success,true);assert.equal(iconRequests.length,iconCount);assert.deepEqual(Buffer.from(dragCalls[2].icon),Buffer.from(await host.readPreview(second.id)))
 const denied=async(batch:boolean,event:unknown=owner)=>{const count=dragCalls.length,reply=batch?await controller!.nativeDragFiles(event,{token,ids:[zip.id,image.id]}):await controller!.nativeDrag(event,{token,id:zip.id});assert.equal(reply.success,false);assert.equal(dragCalls.length,count,'rejected archive never reaches OS drag');return reply}
 await denied(false,{});await denied(true,{})
 const iconPort=port.readFileIcon;delete port.readFileIcon
 for(const batch of [false,true]){const reply=await denied(batch);if(!reply.success)assert.equal(reply.code,'NATIVE_FILE_ICON_UNAVAILABLE')}
 port.readFileIcon=iconPort;emptyIcon=true;const empty=await denied(false);if(!empty.success)assert.equal(empty.code,'NATIVE_FILE_ICON_UNAVAILABLE');emptyIcon=false
 afterIcon=async()=>{await fs.writeFile(zipFile.file,'modified owned archive fixture')};await denied(false);await fs.writeFile(zipFile.file,read.bytes)
 afterIcon=async()=>{await fs.unlink(zipFile.file);await fs.symlink(sources[0],zipFile.file)};await denied(true);await fs.unlink(zipFile.file);await fs.writeFile(zipFile.file,read.bytes)
 const membership=async(ids:string[])=>{const current=await host.readWorkSets(scope,device),saved=current.sets.find(s=>s.id===set.id)!;const result=await controller!.write({...scope,sessionToken:current.sessionToken,allowUpgrade:false,command:{kind:'save',id:set.id,expectedRevision:saved.revision,value:{...value,assetIds:ids}}});assert.equal(result.success,true)}
 for(const batch of [false,true]){
  afterIcon=()=>membership([first.id]);await denied(batch);assert.equal((await host.readWorkSets(scope,device)).sets[0].assetIds.includes(first.id),true,'first ZIP member remains granted')
  await membership([first.id,second.id])
 }
 afterIcon=async()=>{const current=await host.inspectTrash(second.id),plan=await host.prepareTrash({designAssetIdentity:second.id,expectedRevision:current.revision});await host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt});await controller!.refresh()}
 await denied(false)
 console.log('Production Copy/Host/temp-SQLite native ZIP: actual two-member archive, verified owned path to OS icon, archive cursor for single/batch, image preview unchanged, missing/empty icon, wrong actor, archive bytes/path changed during lookup reject; non-first ZIP member removed or trashed during icon await rejects with zero OS drag. Controlled icon/OS port; physical native receipt separate.')
}finally{await controller?.drain();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-zip-handoff-'));await fs.rm(root,{recursive:true,force:true})}
