import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import {createNativeClipboardImageReader} from '../src/main/work-mode/native-clipboard-image'
import type {WorkWindowLayout,WorkWindowSnapshot} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-clipboard-'))),library=path.join(root,'library'),pngs=await Promise.all(['#174adf','#ea2229'].map((background,i)=>sharp({create:{width:80+i,height:60,channels:4,background}}).png().toBuffer()))
const hashes=pngs.map(bytes=>createHash('sha256').update(bytes).digest('hex')),admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})})
const realHost=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'cancelled'})},{admission}))
let failLayout=false,afterImport:(()=>Promise<void>)|undefined
const host={...realHost,writeWorkLayout:async(...args:Parameters<typeof realHost.writeWorkLayout>)=>{if(failLayout)throw Error('CONTROLLED_LAYOUT_FAILURE');return realHost.writeWorkLayout(...args)},importClipboardImageFromReader:async(...args:Parameters<typeof realHost.importClipboardImageFromReader>)=>{const value=await realHost.importClipboardImageFromReader(...args);if(afterImport){const action=afterImport;afterImport=undefined;await action()}return value}}
let controller:ReturnType<typeof createWorkWindowController>|undefined,readerCount=0,nextImage=0,readerGate:{entered:Promise<void>;wait:Promise<void>;notify:()=>void;release:()=>void}|undefined
let latest:WorkWindowSnapshot|null=null,layout!:WorkWindowLayout,destroyed=0
const owner={},locates:string[]=[]
const reader=async()=>{readerCount++;assert.equal(admission.resourceStatus().materialBytes,512*1024*1024,'reader executes inside one shared permit');const gate=readerGate;readerGate=undefined;if(gate){gate.notify();await gate.wait}return pngs[nextImage]}
const holdReader=()=>{let notify!:()=>void,release!:()=>void;const gate={entered:new Promise<void>(resolve=>notify=resolve),wait:new Promise<void>(resolve=>release=resolve),notify:()=>notify(),release:()=>release()};readerGate=gate;return gate}
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('FIXTURE_CREATE');await host.confirmCreate(creation.plan.receipt)
 const state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!},device='device:clipboard-test',initial=await host.readWorkSets(scope,device),value={name:'Clipboard fixture',assetIds:[],note:'Manual saved note',colors:['#123456'],columns:2}
 const catalog=await host.writeWorkSet({...scope,sessionToken:initial.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device),id=catalog.sets[0].id
 controller=createWorkWindowController({host,readClipboardImage:reader,deviceId:device,theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:900}],changed(){},hideMain(){},locate:(_scope,_set,assetId)=>{if(assetId)locates.push(assetId)},beforeWorkspaceClose:async()=>()=>{},createWindow:input=>{layout=input.layout;const port:WorkWindowPort={publish:s=>{latest=s},show(){},hide(){},destroy(){destroyed++;input.closed()},setPinned:p=>{layout.pinned=p},bounds:()=>layout,setBounds:b=>{layout=b},visible:()=>true,isTrusted:event=>event===owner,configureDock:b=>{layout=b}};return port}})
 const opened=await controller.open({...scope,id});if(!opened.success)throw Error(opened.error);const token=opened.value.token
 const paste=(requestId:string,revision=latest!.set.revision)=>controller!.act(owner,{token,kind:'paste-image',requestId,expectedRevision:revision})
 const rejectWithoutRead=async(input:unknown,event:unknown=owner)=>{const count=readerCount,assets=(await host.listAssets()).length;assert.equal((await controller!.act(event,input)).success,false);assert.equal(readerCount,count);assert.equal((await host.listAssets()).length,assets);assert.equal(destroyed,0)}
 for(const invalid of [{token,kind:'paste-image',requestId:'../bad',expectedRevision:1},{token,kind:'paste-image',requestId:'valid',expectedRevision:0},{token,kind:'paste-image',requestId:'valid',expectedRevision:1,path:'/not-allowed'},{token:'wrong',kind:'paste-image',requestId:'valid',expectedRevision:1}])await rejectWithoutRead(invalid)
 await rejectWithoutRead({token,kind:'paste-image',requestId:'valid',expectedRevision:1},{})
 await controller.act(owner,{token,kind:'draft',expectedRevision:1,value:{...value,note:'Unsaved manual note'}});await rejectWithoutRead({token,kind:'paste-image',requestId:'dirty',expectedRevision:1})
 assert.equal((await controller.act(owner,{token,kind:'close',discard:false})).success,false);assert.equal((await controller.act(owner,{token,kind:'discard-draft'})).success,true)
 // A rejected dirty close must not leave the still-owned window permanently retiring.
 const first=await paste('gesture-first');if(!first.success)throw Error(first.code+': '+first.error);assert.equal(first.success,true);assert.equal(first.value.set.assetIds.length,1);const firstId=first.value.set.assetIds[0];assert.equal(first.value.set.note,value.note);assert.deepEqual(first.value.set.colors,value.colors)
 nextImage=1;const second=await paste('gesture-second');assert.equal(second.success,true);if(!second.success)throw Error(second.error);assert.equal(second.value.set.assetIds.length,2);assert.equal(second.value.assets.length,2)
 for(const[index,assetId]of second.value.set.assetIds.entries()){const asset=second.value.assets.find(a=>a.id===assetId)!;assert.equal(asset.sourceSiteId,'clipboard');assert.equal(createHash('sha256').update((await host.readManagedOriginal(assetId,asset.revision,asset.thumbnailRef)).bytes).digest('hex'),hashes[index]);assert.equal((await sharp(await host.readPreview(assetId)).metadata()).format,'png')}
 const count=readerCount;nextImage=0;assert.equal((await paste('gesture-first')).success,true);assert.equal(readerCount,count,'completed nonce replay never reads changed OS clipboard');assert.equal((await host.listAssets()).length,2);assert.equal(latest!.set.assetIds.length,2)
 await rejectWithoutRead({token,kind:'paste-image',requestId:'stale',expectedRevision:1})
 failLayout=true;assert.equal((await controller.act(owner,{token,kind:'close',discard:true})).success,false);assert.equal(destroyed,0);failLayout=false;assert.equal((await paste('gesture-first')).success,true,'failed layout close releases only its own retirement guard')
 // A legitimate late revision conflict retains the imported asset and reports its actual effect.
 afterImport=async()=>{const current=await host.readWorkSets(scope,device),saved=current.sets.find(s=>s.id===id)!;await realHost.writeWorkSet({...scope,sessionToken:current.sessionToken,allowUpgrade:false,command:{kind:'save',id,expectedRevision:saved.revision,value:{name:saved.name,assetIds:saved.assetIds,note:'Concurrent saved note',colors:saved.colors,columns:saved.columns}}},device)}
 const partial=await paste('gesture-partial');assert.equal(partial.success,false);if(partial.success)throw Error('EXPECTED_PARTIAL');assert.equal(partial.code,'CLIPBOARD_ATTACHMENT_INCOMPLETE');assert.equal(partial.effect?.kind,'clipboard-image');assert.equal(partial.effect?.attachment,'unconfirmed');const partialId=partial.effect!.assetId
 assert.equal((await host.listAssets()).length,3);assert.equal((await host.readWorkSets(scope,device)).sets[0].assetIds.includes(partialId),false)
 assert.equal((await controller.act(owner,{token,kind:'locate',assetId:partialId})).success,true);assert.deepEqual(locates,[partialId]);await rejectWithoutRead({token,kind:'locate',assetId:'asset:unproven'})
 await controller.refresh();const replayCount=readerCount;assert.equal((await paste('gesture-partial')).success,true);assert.equal(readerCount,replayCount);assert.equal(latest!.set.note,'Concurrent saved note')
 // Real 200-active-asset capacity, not injected asset rows or a fabricated projection.
 const smallIds:string[]=[]
 for(let i=0;i<200;i++)smallIds.push((await host.importClipboardImage({...scope,requestId:'capacity-'+i,fileName:'Capacity-'+i+'.png',bytes:pngs[i%2]})).assetId)
 const beforeCapacity=(await host.readWorkSets(scope,device)).sets.find(set=>set.id===id)!
 const fill=await controller.write({...scope,sessionToken:(await host.readWorkSets(scope,device)).sessionToken,allowUpgrade:false,command:{kind:'save',id,expectedRevision:beforeCapacity.revision,value:{name:beforeCapacity.name,note:beforeCapacity.note,colors:beforeCapacity.colors,columns:beforeCapacity.columns,assetIds:smallIds}}});assert.equal(fill.success,true)
 const blockedCapacity=await paste('gesture-capacity');assert.equal(blockedCapacity.success,false);if(!blockedCapacity.success)assert.equal(blockedCapacity.code,'WORK_SET_CAPACITY');assert.equal(readerCount,replayCount)
 const filled=await host.readWorkSets(scope,device),full=filled.sets.find(set=>set.id===id)!;assert.equal((await controller.write({...scope,sessionToken:filled.sessionToken,allowUpgrade:false,command:{kind:'save',id,expectedRevision:full.revision,value:{name:beforeCapacity.name,note:beforeCapacity.note,colors:beforeCapacity.colors,columns:beforeCapacity.columns,assetIds:beforeCapacity.assetIds}}})).success,true)
 // Whole-Host drain waits for the actual paste queue before releasing port/slot.
 const held=holdReader(),inFlight=paste('gesture-drain');await held.entered
 const workspaceClose=await controller.control({...scope,id,kind:'close'});assert.equal(workspaceClose.success,false);if(!workspaceClose.success)assert.equal(workspaceClose.code,'WORK_OPERATION_ACTIVE')
 let drained=false;const drain=controller.drain().then(()=>{drained=true});await new Promise(resolve=>setImmediate(resolve));assert.equal(drained,false);assert.equal(destroyed,0);held.release();assert.equal((await inFlight).success,true);await drain;assert.equal(controller.count(),0);assert.equal(destroyed,1);assert.equal(admission.resourceStatus().materialBytes,0);assert.equal(admission.resourceStatus().computeBytes,0)
 const saved=await host.readWorkSets(scope,device);assert.equal(saved.sets[0].note,'Concurrent saved note');assert.equal(saved.sets[0].assetIds.length,4)
 // The pure Native reader uses only readImage/isEmpty/getSize/toPNG, never text or file data.
 let toPNG=0,readText=0;const native=createNativeClipboardImageReader({readImage:()=>({isEmpty:()=>false,getSize:()=>({width:80,height:60}),toPNG:()=>{toPNG++;return pngs[0]}}),readText:()=>{readText++;throw Error('FORBIDDEN')}} as Parameters<typeof createNativeClipboardImageReader>[0]);assert.deepEqual(await native(),pngs[0]);assert.equal(toPNG,1);assert.equal(readText,0)
 for(const invalid of [{empty:true,w:80,h:60},{empty:false,w:4001,h:4000},{empty:false,w:NaN,h:60}])await assert.rejects(createNativeClipboardImageReader({readImage:()=>({isEmpty:()=>invalid.empty,getSize:()=>({width:invalid.w,height:invalid.h}),toPNG:()=>{throw Error('must not encode invalid size')}})})())
 console.log('Production temp-SQLite native clipboard: trusted actor/strict nonce-revision/no path, clean-draft preflight, two real PNG members/Originals/previews and manual data preserved, actual200-asset capacity refused before reading, durable same-nonce no reread, close failure retirement recovery, genuine late revision partial effect+proven-only locate, recovery attachment without duplicate, active Workspaceclose refusal and real drain queue barrier; Native reader image-only size-before-encode. Controlled PNG reader/OS port; actual clipboard user path separate.')
}finally{readerGate?.release();await controller?.drain();await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-clipboard-'));await fs.rm(root,{recursive:true,force:true})}
