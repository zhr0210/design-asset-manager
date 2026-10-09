import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createWorkWindowController} from '../src/main/work-mode/work-window-controller'
import type {WorkWindowLayout} from '../src/shared/contracts/work-set.contract'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-image-handoff-')))
const sources=[path.join(root,'first.png'),path.join(root,'second.png')]
for(const [i,file] of sources.entries())await sharp({create:{width:80,height:90,channels:3,background:i?'#e51b24':'#195af0'}}).png().toFile(file)
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:path.join(root,'library')}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
let controller:ReturnType<typeof createWorkWindowController>|undefined
try{
 const plan=await host.prepareCreate();assert.equal(plan.kind,'planned');if(plan.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(plan.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),first=assets.find(a=>a.fileName==='first.png')!,second=assets.find(a=>a.fileName==='second.png')!
 assert.ok(first&&second)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:handoff-test'
 const catalog=await host.readWorkSets(scope,device)
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Fixture two distinct images',assetIds:[first.id,second.id],colors:[],columns:2,note:''}}},device)
 const set=created.sets[0],files=createWorkFileHandoffs({host,root:path.join(root,'handoffs'),open:async()=>'',trash:async()=>{throw Error('NOT_USED')}})
 const media=createWorkMediaController({host,files,changed(){}}),owner={}
 let layout!:WorkWindowLayout,captured:{file:string;icon:Uint8Array}|undefined
 controller=createWorkWindowController({host,media,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:900}],changed(){},hideMain(){},locate(){},createWindow:input=>{
  layout=input.layout;return{publish(){},show(){},hide(){},destroy(){input.closed()},setPinned:p=>{layout.pinned=p},bounds:()=>layout,setBounds:b=>{layout=b},visible:()=>true,isTrusted:e=>e===owner,startDrag:(file,icon)=>{captured={file,icon}}}
 }})
 const opened=await controller.open({...scope,id:set.id});if(!opened.success)throw Error(opened.error)
 const receipt=await files.prepare('work-native:'+opened.value.token,{...scope,setId:set.id,assetId:second.id,kind:'original',action:'prepare'})
 assert.equal((await controller.nativeDrag({}, {token:opened.value.token,id:receipt.id})).success,false)
 const dragged=await controller.nativeDrag(owner,{token:opened.value.token,id:receipt.id});assert.equal(dragged.success,true)
 assert.ok(captured)
 assert.deepEqual(Buffer.from(captured.icon),Buffer.from(await host.readPreview(second.id)),'native cursor must show the delivered second image, not first workset member')
 assert.notDeepEqual(Buffer.from(captured.icon),Buffer.from(await host.readPreview(first.id)))
 assert.deepEqual(await fs.readFile(captured.file),await fs.readFile(sources[1]))
 console.log('Production image Copy/Host/handoff/controller: second-member file and cursor agree; wrong native sender rejected. Controlled OS port; physical drop is separately verified.')
}finally{
 await controller?.drain();await host.close()
 assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-image-handoff-'))
 await fs.rm(root,{recursive:true,force:true})
}
