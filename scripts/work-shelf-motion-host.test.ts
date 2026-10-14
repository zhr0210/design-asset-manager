import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import {nativeShelfLayout} from '../src/main/work-mode/work-window-bounds'
import {type WorkWindowLayout} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-motion-host-'))),library=path.join(root,'library'),png=path.join(root,'input.png'),areas=[{x:0,y:40,width:1200,height:800}]
await sharp({create:{width:80,height:90,channels:3,background:'#195af0'}}).png().toFile(png)
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:png}]})}))
let nativeIntent:((intent:import('../src/main/work-mode/native-shelf-work-window').NativeShelfIntent)=>void)|undefined
let changedGeometry:(()=>void)|undefined
let geometry:WorkWindowLayout,gate:(()=>void)|undefined,holding=false,fail=false,destroyed=false
const owner={},device='device:motion-host',port:WorkWindowPort={edgeDock:true,bindNativeIntents(listener){nativeIntent=listener},publish(){},show(){},hide(){},destroy(){destroyed=true},setPinned(p){geometry.pinned=p},bounds:()=>structuredClone(geometry),setBounds:b=>{geometry=b},visible:()=>!destroyed,isTrusted:e=>e===owner,configureDock:async target=>{
 if(holding)await new Promise<void>(resolve=>{gate=resolve})
 if(fail)throw Object.assign(Error('new input owns window'),{code:'WORK_MOTION_CANCELED'})
 geometry=nativeShelfLayout(target,areas)
}}
let saveFails=false
const controllerHost={...host,writeWorkLayout:async(...args:Parameters<typeof host.writeWorkLayout>)=>{if(saveFails)throw Object.assign(Error('injected layout disk failure'),{code:'LAYOUT_SAVE_FAILED'});return host.writeWorkLayout(...args)}}
const controller=createWorkWindowController({host:controllerHost,deviceId:device,areas:()=>areas,theme:()=> 'light',changed(){},hideMain(){},locate(){},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{changedGeometry=input.changed;destroyed=false;geometry=nativeShelfLayout(input.layout,areas);return port}})
try{
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('CREATE');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('ADD');await host.dispatchAddAssets(add.plan.receipt)
 const asset=(await host.listAssets())[0],active=host.inspect(),scope={libraryIdentity:active.identity!,generation:active.generation!},catalog=await host.readWorkSets(scope,device),value={name:'Motion fixture',assetIds:[asset.id],note:'saved original',colors:['#195AF0'],columns:1}
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device),id=created.sets[0].id
 const legacy={x:0,y:70,width:72,height:160,pinned:true,open:true,dock:{edge:'left' as const,normalBounds:{x:200,y:70,width:290,height:310}}};await host.writeWorkLayout({...scope,id,sessionToken:created.sessionToken,layout:legacy},device)
 holding=true;const opening=controller.open({...scope,id});for(let i=0;i<50&&!gate;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(gate);assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout,legacy,'opening also waits for actual motion before committing');gate!();holding=false;gate=undefined;const opened=await opening;if(!opened.success)throw Error(opened.error);const token=opened.value.token
 assert.equal(opened.value.geometry.presentation,'compact');assert.equal(opened.value.geometry.dock?.style,'edge-slide')
 assert.equal((await controller.act(owner,{token,kind:'undock'})).success,true)
 assert.equal(geometry!.x,12);assert.equal(geometry!.width,220)
 assert.ok(nativeIntent);nativeIntent!({kind:'dock',edge:'left',gestureId:1,deltaX:-2});await new Promise(resolve=>setTimeout(resolve,20));await controller.windows(scope);assert.equal(geometry!.dock?.style,'edge-slide','owned native gesture fields accepted')
 nativeIntent!({kind:'undock',gestureId:1});await new Promise(resolve=>setTimeout(resolve,20));await controller.windows(scope);assert.equal(geometry!.x,12)
 const before=(await host.readWorkSets(scope,device)).sets[0].layout
 holding=true;const docking=controller.act(owner,{token,kind:'dock',edge:'right'});for(let i=0;i<12&&!gate;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(gate)
 assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout,before,'native target is not committed before actual completion')
 gate!();const completed=await docking;assert.equal(completed.success,true);holding=false;gate=undefined
 assert.equal(geometry!.x,1165);assert.equal(geometry!.width,220);assert.equal((await host.readWorkSets(scope,device)).sets[0].layout?.x,1165)
 const settled=structuredClone(geometry!);fail=true;assert.equal((await controller.act(owner,{token,kind:'undock'})).success,false);assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout,settled);fail=false
 saveFails=true
 const failedSave=await controller.act(owner,{token,kind:'undock'});assert.equal(failedSave.success,false);assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout,settled,'failed disk commit retains last valid layout');assert.equal(geometry!.dock,undefined,'display stays at successful physical completion');saveFails=false
 assert.equal((await controller.act(owner,{token,kind:'dock',edge:'left',gestureId:1})).success,false,'Renderer cannot forge native gesture fields')
 await controller.act(owner,{token,kind:'undock'});geometry={...geometry!,width:640,height:520,presentation:'expanded'}
 geometry.expansion={edge:'left',compactBounds:{x:12,y:210,width:220,height:240}}
 changedGeometry!();await new Promise(resolve=>setTimeout(resolve,350));await controller.windows(scope)
 assert.deepEqual((await host.readWorkSets(scope,device)).sets[0].layout?.expansion,geometry.expansion,'Native actual expanded geometry and compact relation reach Host storage')
 const anchored=structuredClone(geometry)
 const large=await controller.act(owner,{token,kind:'dock',edge:'left'});assert.equal(large.success,false);if(!large.success)assert.equal(large.code,'WORK_WINDOW_NOT_DOCKABLE')
 geometry={...geometry!,expansion:undefined,width:290,height:310,presentation:'compact'};await controller.act(owner,{token,kind:'dock',edge:'left'});await controller.drain();await host.close();await host.open()
 const reopened=host.inspect(),s={libraryIdentity:reopened.identity!,generation:reopened.generation!},set=(await host.readWorkSets(s,device)).sets[0]
 assert.equal(set.layout?.dock?.style,'edge-slide');assert.equal(set.note,value.note);assert.deepEqual(set.colors,value.colors)
 assert.deepEqual((await host.readWorkMediaFile({...s,setId:id,assetId:asset.id})).bytes,await fs.readFile(png))
 const reopenWindow=await controller.open({...s,id});assert.equal(reopenWindow.success,true);if(!reopenWindow.success)throw Error(reopenWindow.error)
 holding=true;const revoked=controller.act(owner,{token:reopenWindow.value.token,kind:'undock'});for(let i=0;i<50&&!gate;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(gate);await host.close();gate!();holding=false;gate=undefined;assert.equal((await revoked).success,false,'revoked Host cannot commit late native completion');await controller.invalidate();await host.open();const renewed=host.inspect();assert.equal((await host.readWorkSets({libraryIdentity:renewed.identity!,generation:renewed.generation!},device)).sets[0].layout?.dock?.style,'edge-slide')
 const finalScope={libraryIdentity:renewed.identity!,generation:renewed.generation!},finalCatalog=await host.readWorkSets(finalScope,device)
 await host.writeWorkLayout({...finalScope,id,sessionToken:finalCatalog.sessionToken,layout:anchored},device);await host.close();await host.open()
 const anchorReopen=host.inspect(),anchorScope={libraryIdentity:anchorReopen.identity!,generation:anchorReopen.generation!};assert.deepEqual((await host.readWorkSets(anchorScope,device)).sets[0].layout,anchored,'Expanded compact relation survives a real SQLite Host close/reopen')
 const restoredAnchorWindow=await controller.open({...anchorScope,id});assert.equal(restoredAnchorWindow.success,true);if(!restoredAnchorWindow.success)throw Error(restoredAnchorWindow.error);assert.deepEqual(restoredAnchorWindow.value.geometry.expansion,anchored.expansion);assert.deepEqual(geometry.expansion,anchored.expansion,'Formal controller reopening restores the compact relation to the native port')
 console.log('PASS production temp SQLite: legacy normalization, actual native completion barrier, cancellation preserves last commit, forged native fields/expanded docking refuse, full held Host reopen retains compact dock/content and expanded compact relation. Controlled OS port; physical CU separately required.')
}finally{await controller.drain();await host.close();await fs.rm(root,{recursive:true,force:true})}
