import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import type {NativeShelfIntent} from '../src/main/work-mode/native-shelf-work-window'
import type {WorkWindowLayout,WorkWindowSnapshot} from '../src/shared/contracts/work-set.contract'
import {insetShelfBounds} from '../src/main/work-mode/work-window-bounds'
const edgeArea=[{x:-1200,y:24,width:1200,height:800}]
for(const x of [-1200,-640]){const original={x,y:90,width:640,height:520,pinned:true,open:true},restored=insetShelfBounds(original,edgeArea);assert.equal(restored.y,90);assert.equal(restored.width,640);assert.equal(restored.height,520);assert.ok(restored.x>=-1168&&restored.x+restored.width<=-32)}
assert.equal(insetShelfBounds({x:0,y:0,width:640,height:520,pinned:true,open:true},[{x:0,y:0,width:640,height:520}]).x,0)
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-work-dock-'))),source=path.join(root,'fixture.png'),library=path.join(root,'library')
await sharp({create:{width:80,height:90,channels:3,background:'#195af0'}}).png().toFile(source)
const realHost=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}))
let failPersist=false,failConfigure=false,supportsDock=true
const feedbackMessages:string[]=[]
const host={...realHost,writeWorkLayout:async(...args:Parameters<typeof realHost.writeWorkLayout>)=>{if(failPersist)throw Error('FIXTURE_PERSIST_FAILURE');return realHost.writeWorkLayout(...args)}}
let controller:ReturnType<typeof createWorkWindowController>|undefined,areas=[{x:0,y:24,width:1200,height:800}]
const owner={},device='device:dock-test',ports:{port:WorkWindowPort;last:WorkWindowSnapshot|null;layout:WorkWindowLayout;destroyed:boolean;changed:()=>void;nativeIntent?:(intent:NativeShelfIntent)=>void;details:number}[]=[]
const makeController=()=>createWorkWindowController({host,deviceId:device,areas:()=>areas,theme:()=> 'light',changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{
 const held={last:null as WorkWindowSnapshot|null,layout:structuredClone(input.layout),destroyed:false,changed:input.changed,nativeIntent:undefined as ((intent:NativeShelfIntent)=>void)|undefined,details:0,port:null as unknown as WorkWindowPort}
 held.port={bindNativeIntents:listener=>{held.nativeIntent=listener},feedback:message=>{feedbackMessages.push(message)},showDetail:()=>{held.details++},publish:s=>{held.last=s},show(){},hide(){},destroy(){held.destroyed=true;input.closed()},setPinned:value=>{held.layout.pinned=value},bounds:()=>structuredClone(held.layout),setBounds:value=>{held.layout={...structuredClone(value),...(held.layout.dock?{dock:held.layout.dock}:{})}},visible:()=>!held.destroyed,isTrusted:event=>event===owner,configureDock:layout=>{if(failConfigure)throw Error('FIXTURE_CONFIGURE_FAILURE');held.layout=structuredClone(layout)}};if(!supportsDock)delete held.port.configureDock;ports.push(held);return held.port
}})
try{
 const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(plan.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('FIXTURE_INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const asset=(await host.listAssets())[0],initial=host.inspect();let scope={libraryIdentity:initial.identity!,generation:initial.generation!}
 const catalog=await host.readWorkSets(scope,device),value={name:'Dock fixture',assetIds:[asset.id],columns:1}
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device),id=created.sets[0].id
 const normal={x:200,y:100,width:420,height:640,pinned:true,open:true};await host.writeWorkLayout({...scope,sessionToken:created.sessionToken,id,layout:normal},device)
 controller=makeController();const opened=await controller.open({...scope,id});if(!opened.success)throw Error(opened.error);let token=opened.value.token
 assert.deepEqual(opened.value.geometry,normal)
 // Native child intents bind to the captured entry; no forged sender or public token channel.
 ports[0].nativeIntent?.({kind:'pin',pinned:false});await controller.windows(scope)
 assert.equal(ports[0].layout.pinned,false)
 ports[0].nativeIntent?.({kind:'pin',pinned:true});await controller.windows(scope)
 assert.equal(ports[0].layout.pinned,true)

 const rejected=async(input:unknown,event:unknown=owner)=>{const before=structuredClone(ports.at(-1)!.layout);assert.equal((await controller!.act(event,input)).success,false);assert.deepEqual(ports.at(-1)!.layout,before)}
 await rejected({token,kind:'dock',edge:'top'});await rejected({token,kind:'dock',edge:'left',bounds:normal});await rejected({token,kind:'undock',edge:'left'});await rejected({token:'wrong',kind:'dock',edge:'left'});await rejected({token,kind:'dock',edge:'left'},{})
 const configure=ports[0].port.configureDock;delete ports[0].port.configureDock;const unsupported=await controller.act(owner,{token,kind:'dock',edge:'left'});assert.equal(unsupported.success,false);if(!unsupported.success)assert.equal(unsupported.code,'NATIVE_DOCK_UNAVAILABLE');ports[0].port.configureDock=configure
 failConfigure=true;await rejected({token,kind:'dock',edge:'left'})
 ports[0].nativeIntent?.({kind:'dock',edge:'left'});await controller.windows(scope)
 for(let i=0;i<100&&!feedbackMessages.length;i++)await new Promise(resolve=>setTimeout(resolve,5))
 assert.ok(feedbackMessages.length>0,'a rejected physical docking intent must provide visible feedback');assert.equal(ports[0].details,1);ports[0].details=0;failConfigure=false
 // Docking is permitted with a dirty draft; it never saves or discards draft content.
 const draft={...value,name:'unsaved fixture note'};assert.equal((await controller.act(owner,{token,kind:'draft',expectedRevision:1,value:draft})).success,true)
 ports[0].nativeIntent?.({kind:'close'})
 for(let i=0;i<100&&ports[0].details===0;i++)await new Promise(resolve=>setTimeout(resolve,5))
 assert.equal(ports[0].destroyed,false);assert.equal(ports[0].details,1)
 const docked=await controller.act(owner,{token,kind:'dock',edge:'right'});assert.equal(docked.success,true);if(!docked.success)throw Error(docked.error)
 assert.equal(docked.value.geometry.width,72);assert.equal(docked.value.geometry.x,1128);assert.equal(docked.value.geometry.dock?.edge,'right');assert.equal(docked.value.draft?.name,draft.name);assert.equal(controller.hasUnsaved(),true)
 assert.equal((await controller.act(owner,{token,kind:'close',discard:false})).success,false)
 const stored=(await host.readWorkSets(scope,device)).sets[0];assert.deepEqual(stored.layout,docked.value.geometry);assert.equal(stored.name,value.name)
 ports[0].layout.x=600;ports[0].changed();await new Promise(resolve=>setTimeout(resolve,310));assert.equal(ports[0].layout.x,1128,'passive dock move returns to its real work-area edge')
 assert.equal((await controller.act(owner,{token,kind:'save',expectedRevision:1,value:draft})).success,true)
 await controller.drain();await host.close();assert.equal(ports[0].destroyed,true)
 // Whole held Host/database reopen, fresh native capability and saved dock JSON.
 await host.open();const reopened=host.inspect();scope={libraryIdentity:reopened.identity!,generation:reopened.generation!};supportsDock=false;controller=makeController();assert.equal((await controller.restore(scope)).success,false);assert.equal(controller.count(),0);assert.equal(ports.at(-1)!.destroyed,true);ports.pop();supportsDock=true;controller=makeController()
 const restored=await controller.restore(scope);assert.equal(restored.success,true);assert.equal(controller.count(),1);token=ports[1].last!.token
 assert.notEqual(token,opened.value.token);assert.equal(ports[1].layout.dock?.edge,'right');assert.equal(ports[1].layout.width,72);assert.equal(ports[1].last!.set.name,draft.name)
 await rejected({token:opened.value.token,kind:'undock'})
 // Use a controlled work-area input to check recovery; this is not an external-display acceptance.
 areas=[{x:40,y:50,width:800,height:600}];ports[1].layout={...ports[1].layout,x:9000,y:9000}
 assert.equal((await controller.act(owner,{token,kind:'recover'})).success,true);assert.equal(ports[1].layout.x,768);assert.equal(ports[1].layout.y,490);assert.deepEqual(ports[1].layout.dock?.normalBounds,{x:200,y:100,width:420,height:640})
 const expanded=await controller.act(owner,{token,kind:'undock'});assert.equal(expanded.success,true);if(!expanded.success)throw Error(expanded.error)
 assert.equal('dock'in expanded.value.geometry,false);assert.equal(expanded.value.geometry.width,420);assert.equal(expanded.value.geometry.height,600);assert.equal(expanded.value.geometry.y,50)
 assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout,expanded.value.geometry)
 await rejected({token,kind:'undock',restore:{x:300,y:100,width:420,height:500}})
 await controller.act(owner,{token,kind:'dock',edge:'left'})
 ports[1].nativeIntent?.({kind:'undock',restore:{x:300,y:100,width:420,height:500}});await controller.windows(scope)
 assert.equal(ports[1].layout.x,300);assert.equal(ports[1].layout.y,100);assert.equal(ports[1].layout.width,420);assert.equal(ports[1].layout.dock,undefined)
 // Save failure leaves the real compact window and draft intact, explicitly unsaved.
 failPersist=true;assert.equal((await controller.act(owner,{token,kind:'dock',edge:'left'})).success,false);assert.equal(ports[1].layout.width,72);assert.equal(ports[1].last!.geometry.width,72);assert.ok(ports[1].last!.layoutError)
 failPersist=false;assert.equal((await controller.act(owner,{token,kind:'recover'})).success,true);assert.equal(ports[1].last!.layoutError,undefined)
 await host.close();await rejected({token,kind:'undock'})
 console.log('Production temp-SQLite dock controller: strict actor/token/edge/bounds, port failure/unavailable, dirty draft protection, actual compact geometry/persistence, whole Host reopen/restore, fresh capability, work-area recovery/expand and explicit persistence failure. Controlled OS port; physical native/display acceptance separate.')
}finally{
 await controller?.drain();await host.close()
 assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-work-dock-'));await fs.rm(root,{recursive:true,force:true})
}
