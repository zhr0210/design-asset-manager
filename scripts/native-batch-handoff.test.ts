import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import type {WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import {createWorkWindowController} from '../src/main/work-mode/work-window-controller'
import type {WorkWindowLayout} from '../src/shared/contracts/work-set.contract'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-batch-handoff-')))
const sources=[path.join(root,'first.png'),path.join(root,'second.png')]
for(const [i,file]of sources.entries())await sharp({create:{width:80,height:90,channels:3,background:i?'#e51b24':'#195af0'}}).png().toFile(file)
const realHost=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:path.join(root,'library')}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
let afterPreview:(()=>Promise<void>)|undefined
const host={...realHost,readPreview:async(id:string)=>{const bytes=await realHost.readPreview(id);if(afterPreview){const action=afterPreview;afterPreview=undefined;await action()}return bytes}}
let controller:ReturnType<typeof createWorkWindowController>|undefined
try{
 const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(plan.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),first=assets.find(a=>a.fileName==='first.png')!,second=assets.find(a=>a.fileName==='second.png')!
 assert.ok(first&&second)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:batch-test'
 const catalog=await host.readWorkSets(scope,device)
 const value={name:'Fixture batch',assetIds:[first.id,second.id],columns:2,}
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device)
 const set=created.sets[0],files=createWorkFileHandoffs({host,root:path.join(root,'handoffs'),open:async()=>'',trash:async()=>{throw Error('NOT_USED')}})
 const media=createWorkMediaController({host,files,changed(){}}),owner={},calls:{files:string[];icon:Uint8Array}[]=[]
 let layout!:WorkWindowLayout,port!:WorkWindowPort
 controller=createWorkWindowController({host,media,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:900}],changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{
  layout=input.layout;port={publish(){},show(){},hide(){},destroy(){input.closed()},setPinned:p=>{layout.pinned=p},bounds:()=>layout,setBounds:b=>{layout=b},visible:()=>true,isTrusted:e=>e===owner,startDragFiles:(paths,icon)=>{calls.push({files:paths,icon})}};return port
 }})
 const opened=await controller.open({...scope,id:set.id});if(!opened.success)throw Error(opened.error)
 const token=opened.value.token,actor='work-native:'+token
 const firstReceipt=await files.prepare(actor,{...scope,setId:set.id,assetId:first.id,kind:'original',action:'prepare'})
 const secondReceipt=await files.prepare(actor,{...scope,setId:set.id,assetId:second.id,kind:'original',action:'prepare'})
 const ids=[secondReceipt.id,firstReceipt.id]
 const dragged=await controller.nativeDragFiles(owner,{token,ids});assert.equal(dragged.success,true);assert.equal(calls.length,1,'one OS handoff only')
 assert.deepEqual(await fs.readFile(calls[0].files[0]),await fs.readFile(sources[1]))
 assert.deepEqual(await fs.readFile(calls[0].files[1]),await fs.readFile(sources[0]))
 assert.deepEqual(Buffer.from(calls[0].icon),Buffer.from(await realHost.readPreview(second.id)))
 const denied=async(input:unknown,event:unknown=owner)=>{const count=calls.length;assert.equal((await controller!.nativeDragFiles(event,input)).success,false);assert.equal(calls.length,count,'rejected batch never partially reaches OS')}
 await denied({token,ids},{});await denied({token:'wrong-token',ids});await denied({token,ids:[ids[0],ids[0]]})
 await denied({token,ids:[]});await denied({token,ids:Array(65).fill(ids[0])});await denied({token,ids,extra:'unexpected'})
 const startBatch=port.startDragFiles;delete port.startDragFiles
 const unavailable=await controller.nativeDragFiles(owner,{token,ids});assert.equal(unavailable.success,false);if(!unavailable.success)assert.equal(unavailable.code,'NATIVE_DRAG_UNAVAILABLE');assert.equal(calls.length,1)
 port.startDragFiles=startBatch
 const foreign=await files.prepare('different-window',{...scope,setId:set.id,assetId:first.id,kind:'original',action:'prepare'})
 await denied({token,ids:[secondReceipt.id,foreign.id]})
 const selected=await files.nativeFile(actor,firstReceipt.id)
 await fs.writeFile(selected.file,'corrupted fixture')
 await denied({token,ids})
 await fs.writeFile(selected.file,await fs.readFile(sources[0]))
 afterPreview=async()=>{
  const current=await host.readWorkSets(scope,device),saved=current.sets.find(s=>s.id===set.id)!
  const result=await controller!.write({...scope,sessionToken:current.sessionToken,allowUpgrade:false,command:{kind:'save',id:set.id,expectedRevision:saved.revision,value:{...value,assetIds:[first.id]}}})
  assert.equal(result.success,true)
 }
 await denied({token,ids})
 await denied({token,ids})
 const trashState=await host.inspectTrash(first.id),trashPlan=await host.prepareTrash({designAssetIdentity:first.id,expectedRevision:trashState.revision})
 await host.dispatchTrash({kind:'confirm-plan',planReceipt:trashPlan.plan.receipt});await controller.refresh()
 await denied({token,ids:[firstReceipt.id]})
 console.log('Production temp-SQLite batch handoff: correct ordered files/cursor, one OS call; duplicate, bounds, sender/token, foreign actor, modified copy, unavailable asset and member revoked during preview reject without partial drag.')
}finally{
 await controller?.drain();await host.close()
 assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-batch-handoff-'))
 await fs.rm(root,{recursive:true,force:true})
}
