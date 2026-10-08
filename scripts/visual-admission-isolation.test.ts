import assert from 'node:assert/strict'
import {test} from 'node:test'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import {createVisualAdmission, VISUAL_ADMISSION_PROFILE as profile} from '../src/main/visual-ai/visual-admission'
import {createVisualAiController} from '../src/main/visual-ai/visual-ai-controller'
import {createOcrController} from '../src/main/ocr/ocr-controller'
import {PiProcessUnconfirmedError} from '../src/main/ai-gateway/pi-runtime-host'
import {registerVisualAiIpc} from '../src/main/ipc/visual-ai.ipc'
import {CHANNEL_VISUAL_AI_PREPARE} from '../src/shared/contracts/visual-ai.contract'

const session={sessionToken:'synthetic',leaseIdentity:'synthetic'}
const scope={libraryIdentity:'synthetic',generation:'generation'}
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve))
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r});return{promise,resolve}}
const result=()=>({jpeg:new Uint8Array([1]),pixels:1,additionalRss:1})
const empty={materialBytes:0,frozenBytes:0,preparing:0,requests:0,tags:0,receipts:0,waiting:0,accepting:true}
async function withInstalledCodecRefusal(run:()=>Promise<void>) {
 const read=fs.readFile.bind(fs);let reached=false
 // Windows codec is now qualified. Exercise its actual hash gate with a
 // synthetic read failure; never mutate the installed native dependency.
 fs.readFile=(async(file:any,...args:any[])=>{if(String(file).endsWith('sharp-win32-x64.node')){reached=true;throw Error('synthetic unavailable codec bytes')}return(read as any)(file,...args)}) as typeof fs.readFile
 try{await run();if(process.versions.electron==='30.5.1')assert.equal(reached,true,'Actual installed-codec qualification must reach the fault')}
 finally{fs.readFile=read as typeof fs.readFile}
}

await test('formal command discloses capability refusal and resource danger separately without changing the response contract',async()=>{
 const handlers=new Map<string,any>();let code='VISUAL_CODEC_UNQUALIFIED'
 registerVisualAiIpc({controller:{prepare:async()=>{throw Error(code)}} as any,isMain:()=>true,handle:(channel,handler)=>{handlers.set(channel,handler)}})
 const event={sender:{id:1}} as any
 const unavailable=await handlers.get(CHANNEL_VISUAL_AI_PREPARE)(event,{})
 assert.equal(unavailable.ok,false);assert.match(unavailable.error,/资格验证/);assert.match(unavailable.error,/本次未发送素材/)
 code='VISUAL_CODEC_ESTIMATE_EXCEEDED';const unsafe=await handlers.get(CHANNEL_VISUAL_AI_PREPARE)(event,{})
 assert.equal(unsafe.ok,false);assert.match(unsafe.error,/资源证据不安全/)
})

await test('production Windows codec rejection does not freeze subsequent OCR and Pi resource admission',async t=>{
 if(process.platform!=='win32'){t.skip('Windows production negative path');return}
 const admission=createVisualAdmission(),lease=admission.open('windows',session)
 try{await withInstalledCodecRefusal(async()=>{await assert.rejects(lease.prepare('generated',async()=>new Uint8Array([1])),/VISUAL_CODEC_UNQUALIFIED/)})}finally{lease.dispose()}
 assert.deepEqual(admission.inspect(),empty)
 admission.resume()
 const ocr=await admission.reserveOcr(1,new AbortController().signal);ocr.release();ocr.release()
 const probe=await admission.reservePiProbe(new AbortController().signal);probe.release();probe.release()
 assert.deepEqual(admission.inspect(),empty)
})

await test('formal Visual Controller failure shares the same ledger with OCR Controller and Pi Probe, without inference',async t=>{
 if(process.platform!=='win32'){t.skip('Windows production negative path');return}
 const admission=createVisualAdmission(),png=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer()
 let previewReads=0,inferences=0,commits=0
 const host={inspect:()=>({state:'ready',identity:scope.libraryIdentity,generation:scope.generation}),readAssetContext:async()=>({assets:[{id:'asset',revision:'revision',thumbnailRef:'preview',title:'Generated'}],schemaVersion:1}),readVisualSession:async()=>session,readVisualPreview:async()=>{previewReads++;return png},readPreview:async()=>png,readOcr:async()=>({sessionToken:'synthetic',revision:1,requiresUpgrade:false,evidence:null,editedText:'user text'}),commitOcr:async()=>{commits++;throw Error('unexpected commit')}}
 const backend={id:'synthetic',name:'Generated fixture',type:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:1/v1',defaultModel:'synthetic',timeoutMs:1000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false}}
 const visual=createVisualAiController({host:host as any,admission,settings:()=>({aiBackends:[backend]}) as any,provider:(async()=>{inferences++;throw Error('unexpected inference')}) as any,onChanged:()=>{}})
 const ocr=createOcrController({host:host as any,reserve:(bytes,signal)=>admission.reserveOcr(bytes,signal),runtime:{configure:async()=>{},current:async()=>({label:'synthetic only',fingerprint:'synthetic',run:async()=>{inferences++;throw Error('unexpected inference')}})},changed:()=>{}})
 try{
  await withInstalledCodecRefusal(async()=>{await assert.rejects(visual.prepare('owner',{...scope,assetIds:['asset'],backendId:'synthetic',purpose:'analyze'}),/VISUAL_CODEC_UNQUALIFIED/)})
  assert.equal(previewReads,1);assert.deepEqual(admission.inspect(),empty)
  const review=await ocr.prepare({...scope,assetIds:['asset']});assert.equal(review.count,1)
  assert.equal(admission.inspect().requests,1)
  await ocr.suspendAndDrain();ocr.resume()
  const probe=await admission.reservePiProbe(new AbortController().signal);probe.release()
  assert.equal(inferences,0);assert.equal(commits,0);assert.deepEqual(admission.inspect(),empty)
 }finally{await visual.suspendAndDrain();await ocr.suspendAndDrain()}
})

for(const code of ['VISUAL_CODEC_UNQUALIFIED','VISUAL_CODEC_FAILED','VISUAL_SOURCE_TOO_LARGE'])await test(code+' releases only the failed attempt and preserves another resident request',async()=>{
 const held=deferred(),entered=deferred()
 const admission=createVisualAdmission({codec:async source=>{if(!source[0])throw Error(code);return result()}})
 const active=admission.open('active',session),failed=admission.open('failed',session)
 try{
  await active.prepare('active',async()=>new Uint8Array([1]));active.consume()
  const request=active.withRequest('active','combined',new AbortController().signal,async()=>{entered.resolve();await held.promise})
  await entered.promise;const before=admission.inspect()
  await assert.rejects(failed.prepare('failed',async()=>new Uint8Array([0])),new RegExp(code));failed.dispose();failed.dispose()
  assert.equal(admission.inspect().requests,1);assert.equal(admission.inspect().materialBytes,before.materialBytes);assert.equal(admission.inspect().frozenBytes,1)
  const probe=await admission.reservePiProbe(new AbortController().signal);probe.release()
  held.resolve();await request
 }finally{held.resolve();active.dispose();failed.dispose()}
 assert.deepEqual(admission.inspect(),empty)
})

await test('actual estimate exceeded rejects queued work and cannot be cleared by resume',async()=>{
 const held=deferred(),entered=deferred()
 const admission=createVisualAdmission({codec:async()=>{entered.resolve();await held.promise;throw Error('VISUAL_CODEC_ESTIMATE_EXCEEDED')}})
 const lease=admission.open('unsafe',session),preparing=lease.prepare('asset',async()=>new Uint8Array([1]))
 const outcome=preparing.catch(error=>error);await entered.promise
 const queued=admission.reserveOcr(profile.maxLocalBytes,new AbortController().signal).catch(error=>error)
 assert.equal(admission.inspect().waiting,1);held.resolve();assert.equal((await outcome).message,'VISUAL_CODEC_ESTIMATE_EXCEEDED');assert.equal((await queued).message,'VISUAL_ADMISSION_SUSPENDED')
 lease.dispose();admission.resume();assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().accepting,false)
 await assert.rejects(admission.reserveOcr(1,new AbortController().signal),/SUSPENDED/)
 await assert.rejects(admission.reservePiProbe(new AbortController().signal),/SUSPENDED/)
})

await test('two UNKNOWN requests keep their own reservations until each actual release',async()=>{
 const admission=createVisualAdmission({codec:async()=>result()}),leases=[admission.open('one',session),admission.open('two',session)],releases=[deferred(),deferred()]
 try{
  for(const lease of leases){await lease.prepare('asset',async()=>new Uint8Array([1]));lease.consume()}
  for(let i=0;i<2;i++)await assert.rejects(leases[i].withRequest('asset','combined',new AbortController().signal,async()=>{throw new PiProcessUnconfirmedError(releases[i].promise)}),/UNCONFIRMED/)
  for(const lease of leases){lease.dispose();lease.dispose()}
  admission.resume();assert.equal(admission.inspect().requests,2);assert.equal(admission.inspect().frozenBytes,2)
  releases[0].resolve();await tick();assert.equal(admission.inspect().requests,1);assert.equal(admission.inspect().frozenBytes,1)
  assert.ok(admission.inspect().materialBytes>0);releases[1].resolve();await tick();assert.deepEqual(admission.inspect(),empty)
 }finally{for(const r of releases)r.resolve();for(const lease of leases)lease.dispose();await tick()}
})

await test('queued cancellation and invalidation cannot revive an expired receipt or release active work early',async()=>{
 const admission=createVisualAdmission({codec:async()=>result()}),leases=[admission.open('one',session),admission.open('two',session),admission.open('queued',session)],held=deferred(),entered=deferred()
 try{
  for(const lease of leases){await lease.prepare('asset',async()=>new Uint8Array([1]));lease.consume()}
  const actions=leases.slice(0,2).map(lease=>lease.withRequest('asset','combined',new AbortController().signal,async()=>{entered.resolve();await held.promise}).catch(error=>error))
  await entered.promise;await tick();const cancelled=new AbortController()
  const queued=leases[2].withRequest('asset','combined',cancelled.signal,async()=>{throw Error('must not dispatch')})
  await tick();assert.equal(admission.inspect().waiting,1);cancelled.abort();await assert.rejects(queued);assert.equal(admission.inspect().waiting,0)
  admission.invalidate();admission.resume();assert.equal(admission.inspect().requests,2)
  await assert.rejects(leases[2].prepare('late',async()=>new Uint8Array([1])),/EXPIRED/)
  held.resolve();for(const action of actions)assert.equal((await action).name,'AbortError')
 }finally{held.resolve();for(const lease of leases)lease.dispose()}
 assert.deepEqual(admission.inspect(),empty)
})

await test('TTL during unavailable preparation keeps materials until settlement, with no leaked receipt',async()=>{
 const entered=deferred(),held=deferred();let expire!:()=>void
 const admission=createVisualAdmission({clock:{now:()=>0,scheduleTimeout:callback=>{expire=callback;return()=>{}}},codec:async()=>{entered.resolve();await held.promise;throw Error('VISUAL_CODEC_UNQUALIFIED')}})
 const lease=admission.open('ttl',session),preparing=lease.prepare('asset',async()=>new Uint8Array([1])).catch(error=>error)
 await entered.promise;const bytes=admission.inspect().materialBytes;expire();expire();assert.equal(admission.inspect().materialBytes,bytes)
 held.resolve();assert.equal((await preparing).message,'VISUAL_CODEC_UNQUALIFIED');lease.dispose();assert.deepEqual(admission.inspect(),empty)
})
