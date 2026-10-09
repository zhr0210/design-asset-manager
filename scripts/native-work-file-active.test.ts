import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import type {WorkWindowLayout} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-file-active-'))),sources=[path.join(root,'first.png'),path.join(root,'second.png')]
for(const[i,file]of sources.entries())await sharp({create:{width:80,height:90,channels:3,background:i?'#e51b24':'#195af0'}}).png().toFile(file)
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex'),beforeSources=await Promise.all(sources.map(async file=>sha(await fs.readFile(file))))
const realHost=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:path.join(root,'library')}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
const allGates:{release:()=>void}[]=[]
const gates=new Map<string,{entered:Promise<void>;release:()=>void;wait:Promise<void>;notify:()=>void}>()
const gate=(assetId:string)=>{let release!:()=>void,notify!:()=>void;const held={entered:new Promise<void>(resolve=>notify=resolve),wait:new Promise<void>(resolve=>release=resolve),release:()=>release(),notify:()=>notify()};gates.set(assetId,held);allGates.push(held);return held}
const host={...realHost,readWorkMediaFile:async(...args:Parameters<typeof realHost.readWorkMediaFile>)=>{const bytes=await realHost.readWorkMediaFile(...args),held=gates.get(args[0].assetId);if(held){gates.delete(args[0].assetId);held.notify();await held.wait}return bytes}}
let controller:ReturnType<typeof createWorkWindowController>|undefined
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),first=assets.find(a=>a.fileName==='first.png')!,second=assets.find(a=>a.fileName==='second.png')!,state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:file-active-test'
 const catalog=await host.readWorkSets(scope,device),value={name:'Active file fixture',assetIds:[first.id,second.id],colors:[],columns:2,note:'saved fixture'}
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device),set=created.sets[0]
 const originalHashes=await Promise.all(value.assetIds.map(async assetId=>sha((await realHost.readWorkMediaFile({...scope,setId:set.id,assetId})).bytes)))
 const files=createWorkFileHandoffs({host,root:path.join(root,'handoffs'),open:async()=>'',trash:async()=>{throw Error('NOT_USED')}}),media=createWorkMediaController({host,files,changed(){}}),owner={}
 let layout!:WorkWindowLayout,destroyed=0,latest:any
 controller=createWorkWindowController({host,media,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:900}],changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{
  layout=input.layout;const port:WorkWindowPort={publish:s=>{latest=s},show(){},hide(){},destroy(){destroyed++;input.closed()},setPinned:p=>{layout.pinned=p},bounds:()=>layout,setBounds:b=>{layout=b},visible:()=>true,isTrusted:event=>event===owner,configureDock:b=>{layout=b}};return port
 }})
 const opened=await controller.open({...scope,id:set.id});if(!opened.success)throw Error(opened.error);const token=opened.value.token,actor='work-native:'+token,request={...scope,setId:set.id,assetId:first.id,kind:'original' as const,action:'prepare' as const}
 const completed=await controller.nativeHandoff(owner,{token,request});assert.equal(completed.success,true);if(!completed.success)throw Error(completed.error);const originalReceipt=completed.value
 assert.equal((await controller.act(owner,{token,kind:'notes-dirty',dirty:true})).success,true)
 assert.equal((await controller.act(owner,{token,kind:'dock',edge:'left'})).success,true,'notesDirty is not an active file task');assert.equal((await controller.act(owner,{token,kind:'undock'})).success,true)
 assert.equal((await controller.act(owner,{token,kind:'notes-dirty',dirty:false})).success,true)
 const draft={...value,note:'unsaved fixture retained'};await controller.act(owner,{token,kind:'draft',expectedRevision:1,value:draft})
 const held=gate(first.id),job=controller.nativeHandoff(owner,{token,request});await held.entered;assert.equal(files.hasActive(actor),true)
 const activeDenied=async(promise:Promise<any>)=>{const reply=await promise;assert.equal(reply.success,false);assert.equal(reply.code,'WORK_OPERATION_ACTIVE');assert.match(reply.error,/正在准备交付/);assert.equal(controller!.count(),1);assert.equal(destroyed,0);const current=await controller!.inspect(owner);assert.equal(current.success,true);if(current.success)assert.equal(current.value.draft?.note,draft.note)}
 await activeDenied(controller.act(owner,{token,kind:'close',discard:true}));await activeDenied(controller.act(owner,{token,kind:'close',discard:false}))
 await activeDenied(controller.control({...scope,id:set.id,kind:'close'}));await activeDenied(controller.act(owner,{token,kind:'dock',edge:'left'}));await activeDenied(controller.act(owner,{token,kind:'undock'}))
 let cancelDone=false;const cancellation=controller.nativeMediaCancel(owner,{token}).then(reply=>{cancelDone=true;return reply});await new Promise(resolve=>setImmediate(resolve));assert.equal(cancelDone,false,'cancel is a physical settlement barrier, not an early boolean')
 assert.equal(files.hasActive(actor),true);held.release();assert.equal((await job).success,false);assert.equal((await cancellation).success,true);assert.equal(files.hasActive(actor),false)
 assert.deepEqual(Buffer.from((await files.readFile(originalReceipt.id)).bytes),await fs.readFile(sources[0]));assert.equal((await files.list({...scope,setId:set.id,assetId:first.id})).length,1,'cancelled in-flight copy does not remove earlier completed copy')
 const ownedGate=gate(first.id),owned=controller.nativeHandoff(owner,{token,request});await ownedGate.entered
 const otherGate=gate(second.id),foreignActor='independent-fixture-actor',other=files.prepare(foreignActor,{...request,assetId:second.id});assert.equal(files.hasActive(foreignActor),true)
 let drained=false;const draining=controller.drain().then(()=>{drained=true});await new Promise(resolve=>setImmediate(resolve));assert.equal(drained,false);assert.equal(controller.count(),1);assert.equal(destroyed,0)
 assert.equal((await controller.open({...scope,id:set.id})).success,false,'draining cannot admit a new native owner')
 const retiring=await controller.nativeHandoff(owner,{token,request});assert.equal(retiring.success,false);if(!retiring.success)assert.equal(retiring.code,'WORK_OPERATION_RETIRING')
 assert.equal(files.hasActive(foreignActor),true);ownedGate.release();assert.equal((await owned).success,false);await otherGate.entered
 await draining;assert.equal(controller.count(),0);assert.equal(destroyed,1);assert.equal(files.hasActive(actor),false);assert.equal(files.hasActive(foreignActor),true,'native drain never cancels or waits for an unrelated actor')
 otherGate.release();const foreignReceipt=await other;assert.deepEqual(Buffer.from((await files.readFile(foreignReceipt.id)).bytes),await fs.readFile(sources[1]));assert.equal(files.hasActive(foreignActor),false)
 assert.deepEqual(Buffer.from((await files.readFile(originalReceipt.id)).bytes),await fs.readFile(sources[0]));assert.deepEqual(await Promise.all(sources.map(async file=>sha(await fs.readFile(file)))),beforeSources)
 assert.deepEqual(await Promise.all(value.assetIds.map(async assetId=>sha((await realHost.readWorkMediaFile({...scope,setId:set.id,assetId})).bytes))),originalHashes)
 console.log('Production temp-SQLite file-active controller: real Copy preparation with held Original read, native/discard/Workspace close and dock refuse active jobs without destroying slot/draft; cancel and native drain await actual settlement, admit no new work, preserve completed copy/Original hashes, release only own slot and never cancel unrelated actor. Controlled read barrier and OS port; physical user workflow separate.')
}finally{for(const held of allGates)held.release();await controller?.drain();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-file-active-'));await fs.rm(root,{recursive:true,force:true})}
