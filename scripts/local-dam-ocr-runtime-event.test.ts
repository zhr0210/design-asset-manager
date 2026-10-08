import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createOcrController} from '../src/main/ocr/ocr-controller'
import {registerAssetOcrIpc} from '../src/main/ipc/asset-ocr.ipc'
import {createWorkspaceClient} from '../src/shared/client/workspace-client'
import {OCR_RUNTIME_CHANGED} from '../src/shared/contracts/asset-ocr.contract'
import type {WorkspaceTransport} from '../src/shared/client/workspace-transport'

// Actual shared Client -> production OCR IPC -> controller; only delivery/runtime are synthetic.
// No server, files, database, model, Python or Computer Use.
function fixture(){
 const trusted=Object.freeze({sender:{id:7}}),handlers=new Map<string,(...args:any[])=>any>(),listeners:Array<Map<string,Set<(...args:any[])=>void>>>=[],events:Array<{name:string;payload:unknown}>=[]
 let fingerprint:string|null=null,next:string|null='synthetic:first',fail=false,selections=0,revocations=0
 const forbidden=async()=>{throw Error('UNEXPECTED_SYNTHETIC_MATERIAL_OPERATION')}
 const host={inspect:()=>({state:'ready',identity:'synthetic',generation:'synthetic:generation'}),readAssetContext:forbidden,readPreview:forbidden,readOcr:forbidden,commitOcr:forbidden,correctOcr:forbidden}
 const runtime={current:async()=>fingerprint===null?null:{fingerprint,label:'合成 OCR 接线 · 无真实模型',run:forbidden},configure:async()=>{selections++;if(fail)throw Error('SYNTHETIC_CONFIGURATION_FAILED');if(next!==null)fingerprint=next}}
 const controller=createOcrController({host:host as any,runtime,changed:()=>{throw Error('UNEXPECTED_SYNTHETIC_ASSET_CHANGE')},runtimeChanged:()=>{
  revocations++;events.push({name:OCR_RUNTIME_CHANGED,payload:undefined});for(const client of listeners)for(const receive of client.get(OCR_RUNTIME_CHANGED)??[])receive({},undefined)
 }})
 registerAssetOcrIpc({controller,isMain:event=>event===trusted,handle:(channel,handler)=>{handlers.set(channel,handler)}})
 const client=(allowed=true)=>{const own=new Map<string,Set<(...args:any[])=>void>>();listeners.push(own);const transport:WorkspaceTransport={
  invoke:async(channel,...args)=>handlers.get(channel)!(allowed?trusted:{},...args),
  on:(channel,listener)=>{const channelListeners=own.get(channel)??new Set();channelListeners.add(listener);own.set(channel,channelListeners)},removeListener:(channel,listener)=>{own.get(channel)?.delete(listener)}
 };return createWorkspaceClient(transport)}
 return{client,events,get selections(){return selections},get revocations(){return revocations},set next(value:string|null){next=value},set fail(value:boolean){fail=value}}
}

await test('trusted OCR configuration broadcasts one payload-free event to both actual shared Clients after committing',async()=>{
 const f=fixture(),desktop=f.client(),browser=f.client(),received=[0,0]
 const stopDesktop=desktop.assetOcr.onRuntimeChanged(()=>{received[0]++}),stopBrowser=browser.assetOcr.onRuntimeChanged(()=>{received[1]++})
 const reply=await desktop.assetOcr.configure();assert.equal(reply.ok,true);assert.equal(reply.value.configured,true);assert.deepEqual(received,[1,1]);assert.deepEqual(f.events,[{name:OCR_RUNTIME_CHANGED,payload:undefined}]);assert.equal(f.revocations,1)
 assert.equal((await browser.assetOcr.status()).value.configured,true);assert.equal(f.events.length,1,'rereading does not broadcast')
 stopDesktop();f.next='synthetic:second';await browser.assetOcr.configure();assert.deepEqual(received,[1,2]);stopBrowser()
})
await test('untrusted source IPC configuration cannot select an environment or broadcast a runtime event',async()=>{
 const f=fixture(),peer=f.client();let changes=0;peer.assetOcr.onRuntimeChanged(()=>changes++)
 const denied=await f.client(false).assetOcr.configure();assert.equal(denied.ok,false);assert.equal(f.selections,0);assert.equal(changes,0);assert.deepEqual(f.events,[]);assert.equal((await peer.assetOcr.status()).value.configured,false)
})
await test('equivalent, cancelled and failed configuration preserve state without a spurious runtime event',async()=>{
 const f=fixture(),client=f.client();let changes=0;client.assetOcr.onRuntimeChanged(()=>changes++)
 await client.assetOcr.configure();await client.assetOcr.configure();f.next=null;await client.assetOcr.configure();f.fail=true;const failed=await client.assetOcr.configure()
 assert.equal(failed.ok,false);assert.equal(changes,1);assert.equal(f.revocations,1);assert.equal(f.events.length,1);assert.equal((await client.assetOcr.status()).value.configured,true)
})
