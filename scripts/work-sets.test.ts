import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import {visibleWorkBounds} from '../src/main/work-mode/work-window-bounds'
import type {WorkWindowSnapshot,WorkWindowLayout} from '../src/shared/contracts/work-set.contract'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost,type ActiveLibraryHostDependencies} from '../src/main/library-lifecycle'
import type {LibraryCreationQualificationInput} from '../src/main/library-lifecycle/library-creation-planner.tracer'
import type {LibraryOpenQualificationInput} from '../src/main/library-lifecycle/library-open-inspection.tracer'
import {validateNotebook,type AssetNotebook} from '../src/shared/contracts/asset-notebook.contract'
import {registerActiveLibraryIpc} from '../src/main/ipc/active-library.ipc'
import {registerWorkSetIpc} from '../src/main/ipc/work-set.ipc'
import {createWorkspaceClient} from '../src/shared/client/workspace-client'
import {createLocalDamServer} from '../src/main/local-host/local-dam-server'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-workset-host-')))
let selected=path.join(root,'library-a');const source=path.join(root,'source.png')
await sharp({create:{width:80,height:90,channels:3,background:'#596a7b'}}).png().toFile(source)
const hash=async()=>createHash('sha256').update(await fs.readFile(source)).digest('hex'),before=await hash()
const dependencies:ActiveLibraryHostDependencies={selectLibraryDirectory:async()=>({kind:'selected',directory:selected}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]}),
  targetPlatform: {
    platform: process.platform,
    targetNameIsSupported: (name) => name.length > 0 && !name.startsWith('.'),
    inspectAccess: async () => 'read-write'
  },
  creationQualification: {
    inspect: (input: LibraryCreationQualificationInput) => ({
      targetGeneration: input.targetGeneration,
      qualificationGeneration: 'qualification:synthetic-1',
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: { kind: 'read-write', scopeIdentity: input.accessScopeIdentity },
      exclusiveLock: 'qualified',
      capacity: { availableBytes: 1024 * 1024 * 1024, requiredBytes: 1, safetyReserveBytes: 1 }
    })
  },
  openQualification: {
    inspect: (input: LibraryOpenQualificationInput) => ({
      inspectionIdentity: input.inspectionIdentity,
      generation: input.generation,
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: 'read-write', lock: 'available'
    })
  }
}
let host=createActiveLibraryHost(dependencies)
async function create(){const plan=await host.prepareCreate();assert.equal(plan.kind,'planned');if(plan.kind!=='planned')throw Error();await host.confirmCreate(plan.plan.receipt);const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error();await host.dispatchAddAssets(add.plan.receipt);return (await host.listAssets())[0]}

const asset=await create(),a=host.inspect(),scope={libraryIdentity:a.identity!,generation:a.generation!},device='device:test'
let catalog=await host.readWorkSets(scope,device);assert.equal(catalog.requiresUpgrade,true)
const value={name:'Project A',note:'Reference notes',assetIds:[asset.id],colors:['#AABBCC'],columns:2}
await assert.rejects(host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'create',value}},device))
catalog=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value}},device)
const set=catalog.sets[0],layout={x:9000,y:7000,width:420,height:600,pinned:true,open:true}
await host.writeWorkLayout({...scope,sessionToken:catalog.sessionToken,id:set.id,layout},device)
assert.deepEqual((await host.readWorkSets(scope,'device:other')).sets[0].layout,null)
await assert.rejects(host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'save',id:set.id,expectedRevision:999,value}},device))
let ports:{port:WorkWindowPort;last:WorkWindowSnapshot|null;shown:boolean;destroyed:boolean;layout:WorkWindowLayout;readPreview:(url:string)=>Promise<Uint8Array>}[]=[]
let server:Awaited<ReturnType<typeof createLocalDamServer>>|undefined,events=0,beforeClose:()=>Promise<()=>void>=async()=>()=>{}
const controller=createWorkWindowController({host,deviceId:device,beforeWorkspaceClose:()=>beforeClose(),theme:()=> 'light',areas:()=>[{x:0,y:0,width:1200,height:800}],changed:()=>{events++;server?.publish('work-sets:changed',null)},locate:()=>{},hideMain:()=>{},createWindow:input=>{const p:any={last:null,shown:false,destroyed:false,layout:input.layout,readPreview:input.readPreview};p.port={publish:(s:WorkWindowSnapshot|null)=>p.last=s,show:()=>p.shown=true,hide:()=>p.shown=false,destroy:()=>{p.destroyed=true;input.closed()},setPinned:(v:boolean)=>p.layout.pinned=v,bounds:()=>p.layout,setBounds:(v:WorkWindowLayout)=>p.layout=v,visible:()=>p.shown,isTrusted:(e:unknown)=>e===p};ports.push(p);return p.port}})
const [opened,repeated]=await Promise.all([controller.open({...scope,id:set.id}),controller.open({...scope,id:set.id})]);assert.equal(opened.success,true);assert.equal(repeated.success,true);assert.equal(ports.length,1);assert.equal(controller.count(),1);assert.ok(ports[0].layout.x+ports[0].layout.width<=1200);assert.ok(ports[0].layout.y+ports[0].layout.height<=800)
assert.equal((await controller.inspect({})).success,false)
if(!opened.success)throw Error();const token=opened.value.token
// Both formal Client adapters control an existing window by saved id, never a native token.
const commands=new Map<string,(...args:any[])=>unknown>(),desktopOwner={sender:{id:1}}
registerWorkSetIpc({controller,isMain:event=>event===desktopOwner||server?.isAuthenticated(event)===true,handle:(channel,handler)=>commands.set(channel,handler)})
const clientFor=(owner:unknown)=>createWorkspaceClient({invoke:async(channel,...args)=>commands.get(channel)!(owner,...args),on:()=>{},removeListener:()=>{}})
const desktopClient=clientFor(desktopOwner)
server=await createLocalDamServer({rendererDirectory:root,channels:()=>[...commands.keys()].filter(channel=>!channel.startsWith('work-window:')),invoke:async(context,command,args)=>commands.get(command)!(context,...args),media:async()=>{throw Error('NOT_USED')}})
const launch=await fetch(server.authorizeLaunch()),launchHtml=await launch.text(),grant=/data-dam-grant="([a-f0-9]+)"/.exec(launchHtml)?.[1]
assert.ok(grant)
const authorization=await fetch(server.origin+'/api/session',{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json'},body:JSON.stringify({grant})})
assert.equal(authorization.status,200)
const credentials=await authorization.json() as {csrf:string;clientId:string},cookie=authorization.headers.get('set-cookie')!.split(';')[0]
const eventsAbort=new AbortController(),eventStream=await fetch(server.origin+'/api/events?client='+credentials.clientId,{headers:{Cookie:cookie},signal:eventsAbort.signal}),eventReader=eventStream.body!.getReader()
assert.match(new TextDecoder().decode((await eventReader.read()).value),/event: connected/)
const httpCommand=(command:string,args:unknown[])=>fetch(server!.origin+'/api/command',{method:'POST',headers:{Origin:server!.origin,'Content-Type':'application/json',Cookie:cookie,'X-Dam-Csrf':credentials.csrf,'X-Dam-Client':credentials.clientId},body:JSON.stringify({command,args})})
const browserClient=createWorkspaceClient({invoke:async(channel,...args)=>{const reply=await httpCommand(channel,args);assert.equal(reply.status,200);return (await reply.json() as {value:unknown}).value},on:()=>{},removeListener:()=>{}})
const windowList=await browserClient.workSets.windows(scope)
assert.equal(windowList.success,true)
assert.deepEqual(windowList.value,[{id:set.id,open:true,pinned:true,visible:true,hasUnsaved:false}])
assert.equal('token' in windowList.value[0],false)
const unpinned=await browserClient.workSets.control({...scope,id:set.id,kind:'pin',pinned:false})
assert.equal(unpinned.success,true);assert.equal(unpinned.value.status,'applied');assert.equal(unpinned.value.window.pinned,false)
const changedEvent=await Promise.race([eventReader.read(),new Promise<never>((_resolve,reject)=>setTimeout(()=>reject(Error('WORK_WINDOW_CHANGE_EVENT_MISSING')),2000))])
assert.match(new TextDecoder().decode(changedEvent.value),/work-sets:changed/)
assert.equal((await desktopClient.workSets.windows(scope)).value[0].pinned,false)
const hidden=await browserClient.workSets.control({...scope,id:set.id,kind:'hide'})
assert.equal(hidden.success,true);assert.equal(hidden.value.window.visible,false)
const beforeRecoverEvents=events
const recovered=await desktopClient.workSets.control({...scope,id:set.id,kind:'recover'})
assert.equal(recovered.success,true);assert.equal(recovered.value.window.visible,true)
assert.ok(events>beforeRecoverEvents)
assert.equal((await clientFor({}).workSets.control({...scope,id:set.id,kind:'hide'})).code,'UNTRUSTED_SENDER')
assert.equal((await browserClient.workSets.control({...scope,generation:'stale',id:set.id,kind:'hide'})).success,false)
assert.equal((await browserClient.workSets.control({...scope,id:'set-missing',kind:'hide'})).success,false)
assert.equal((await browserClient.workSets.control({...scope,id:set.id,kind:'hide',token} as any)).success,false)
assert.equal((await browserClient.workSets.control({...scope,id:set.id,kind:'close',discard:true} as any)).success,false)
assert.equal((await httpCommand('work-window:action',[{token,kind:'close',discard:true}])).status,404)
assert.equal(ports[0].shown,true);assert.equal(ports[0].destroyed,false)
assert.equal((await controller.act({}, {token,kind:'hide'})).success,false);assert.equal((await controller.act(ports[0],{token:'stale',kind:'hide'})).success,false)
assert.equal((await controller.act(ports[0],{token,kind:'save',expectedRevision:1,value:{...value,assetIds:['asset:outside']}})).success,false)
const bytes=await ports[0].readPreview(`dam-preview://preview/${scope.libraryIdentity}/${scope.generation}/${asset.id}`);assert.ok(bytes.length>0);await assert.rejects(ports[0].readPreview(`dam-preview://preview/${scope.libraryIdentity}/${scope.generation}/asset:outside`))
await controller.act(ports[0],{token,kind:'draft',expectedRevision:1,value:{...value,note:'Draft'}});assert.equal(controller.hasUnsaved(),true)
const dirtyClose=await browserClient.workSets.control({...scope,id:set.id,kind:'close'})
assert.equal(dirtyClose.success,true);assert.equal(dirtyClose.value.status,'review-required');assert.match(dirtyClose.value.message,/未保存/)
assert.equal(dirtyClose.value.window.open,true);assert.equal(dirtyClose.value.window.hasUnsaved,true);assert.equal(ports[0].destroyed,false)
assert.equal((await controller.inspect(ports[0])).value.draft?.note,'Draft')
const saved=await controller.act(ports[0],{token,kind:'save',expectedRevision:1,value:{...value,note:'Draft',assetIds:[]}});assert.equal(saved.success,true);assert.equal((await host.listAssets()).length,1)
// Saved content differs from the retained draft, so an explicit discard clears it.
await controller.act(ports[0],{token,kind:'discard-draft'});assert.equal(controller.hasUnsaved(),false)
let flushed!:()=>void,releaseClose!:(release:()=>void)=>void,thawed=false
const flushing=new Promise<void>(resolve=>flushed=resolve)
beforeClose=()=>new Promise<()=>void>(resolve=>{releaseClose=resolve;flushed()})
const racingClose=browserClient.workSets.control({...scope,id:set.id,kind:'close'})
await flushing
await controller.act(ports[0],{token,kind:'draft',expectedRevision:2,value:{...value,assetIds:[],note:'Input delivered while close review flushes'}})
releaseClose(()=>{thawed=true})
assert.equal((await racingClose).value.status,'review-required');assert.equal(thawed,true);assert.equal(ports[0].destroyed,false)
assert.equal((await controller.inspect(ports[0])).value.draft?.note,'Input delivered while close review flushes')
await controller.act(ports[0],{token,kind:'discard-draft'})
beforeClose=async()=>{throw Error('SYNTHETIC_FLUSH_FAILURE')}
assert.equal((await browserClient.workSets.control({...scope,id:set.id,kind:'close'})).success,false);assert.equal(ports[0].destroyed,false)
beforeClose=async()=>()=>{}
await controller.act(ports[0],{token,kind:'notes-dirty',dirty:true})
assert.equal((await desktopClient.workSets.control({...scope,id:set.id,kind:'close'})).value.status,'review-required')
assert.equal(ports[0].destroyed,false)
await controller.act(ports[0],{token,kind:'notes-dirty',dirty:false})
const faultDb=new Database(path.join(selected,'.dam','library.sqlite'));faultDb.exec("CREATE TRIGGER fail_work_layout BEFORE INSERT ON work_window_layouts BEGIN SELECT RAISE(ABORT,'SYNTHETIC_LAYOUT_FAILURE'); END;")
const prior=(await host.readWorkSets(scope,device)).sets.find(s=>s.id===set.id)!
assert.equal((await controller.act(ports[0],{token,kind:'save',expectedRevision:prior.revision,value:{...value,note:'Must roll back'}})).success,false)
assert.equal((await host.readWorkSets(scope,device)).sets.find(s=>s.id===set.id)!.revision,prior.revision)
faultDb.exec('DROP TRIGGER fail_work_layout');faultDb.close()
const beforeNativePinEvents=events
await controller.act(ports[0],{token,kind:'pin',pinned:false});assert.equal(ports[0].layout.pinned,false);assert.ok(events>beforeNativePinEvents)
await controller.act(ports[0],{token,kind:'hide'});assert.equal(ports[0].shown,false);await controller.restore(scope);assert.equal(ports[0].shown,true)
catalog=await host.readWorkSets(scope,device);const second=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'create',value:{...value,name:'Project B'}}},device);const other=second.sets.find(s=>s.id!==set.id)!
assert.equal((await controller.open({...scope,id:other.id})).success,true);assert.equal(controller.count(),2)
assert.equal((await controller.act(ports[0],{token:ports[1].last!.token,kind:'hide'})).success,false)
const beforeNotes=await host.readNotebook({...scope,assetId:asset.id});assert.equal(beforeNotes.requiresUpgrade,false)
assert.equal((await controller.notebookRead(ports[0],{token,assetId:asset.id})).success,false)
assert.equal((await controller.notebookRead(ports[1],{token:ports[1].last!.token,assetId:asset.id})).success,true)
const t=await host.inspectTrash(asset.id),plan=await host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:t.revision}),trashed=await host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt});await controller.refresh();assert.deepEqual(ports[1].last!.set.unavailableIds,[asset.id]);assert.equal(ports[1].last!.set.assetIds.length,1);await assert.rejects(ports[1].readPreview(`dam-preview://preview/${scope.libraryIdentity}/${scope.generation}/${asset.id}`))
await host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:asset.id,expectedRevision:trashed.revision});await controller.refresh();assert.equal(ports[1].last!.assets.length,1)
const cleanClose=await browserClient.workSets.control({...scope,id:other.id,kind:'close'})
assert.equal(cleanClose.success,true);assert.equal(cleanClose.value.status,'applied');assert.equal(cleanClose.value.window.open,false);assert.equal(cleanClose.value.window.visible,false)
assert.equal(ports[1].destroyed,true);assert.equal(controller.count(),1)
assert.equal((await host.readWorkSets(scope,device)).sets.find(s=>s.id===other.id)!.layout?.open,false)
assert.equal((await browserClient.workSets.windows(scope)).value.length,1)
await controller.open({...scope,id:other.id})
await controller.drain();assert.equal(controller.count(),0);assert.equal((await controller.open({...scope,id:other.id})).success,false);assert.ok(ports.every(p=>p.destroyed));await assert.rejects(ports[1].readPreview(`dam-preview://preview/${scope.libraryIdentity}/${scope.generation}/${asset.id}`))
await host.close();await host.reopen();catalog=await host.readWorkSets(scope,device);assert.equal(catalog.sets.length,2);assert.equal(catalog.sets.find(s=>s.id===set.id)?.note,'Draft');assert.equal(catalog.sets.find(s=>s.id===set.id)?.layout?.pinned,false);assert.ok(catalog.sets.every(s=>s.layout?.open))
await host.close();host=createActiveLibraryHost(dependencies);await host.open();catalog=await host.readWorkSets(scope,device);assert.equal(catalog.sets.length,2);await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'delete',id:other.id,expectedRevision:other.revision}},device);assert.equal((await host.listAssets()).length,1);await host.close();assert.equal(await hash(),before)
eventsAbort.abort();await eventReader.cancel().catch(()=>{});await server.close()
const clamped=visibleWorkBounds({...layout,x:-3000,y:-500},[{x:0,y:0,width:1000,height:700}]);assert.ok(clamped.x>=0&&clamped.y>=0);assert.ok(clamped.x+clamped.width<=1000&&clamped.y+clamped.height<=700)
console.log('Work sets: consent/schema/reopen, per-device layouts, duplicate-open guard, scoped Desktop/Browser window controls, dirty close preservation, two independent owners, membership-scoped preview/notes, drafts, pin/hide/restore, Trash state, deletion reference safety and off-screen recovery passed')
