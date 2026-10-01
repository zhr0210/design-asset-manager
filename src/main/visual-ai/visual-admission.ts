import {PiProcessUnconfirmedError} from '../ai-gateway/pi-runtime-host'
import {MAX_VISION_RESPONSE_BYTES} from './openai-vision.provider'
import {randomUUID,createHash} from 'node:crypto'
import {systemVisualAiClock,type VisualAiClock} from './visual-ai-clock'
import {prepareVisualJpeg,type VisualCodecResult} from './visual-preparation'

export const VISUAL_ADMISSION_PROFILE=Object.freeze({version:'visual-admission-v1',requestSlots:2,tagsSlots:1,preparationSlots:1,sourceBytes:33554432,maxPixels:50_000_000,maxJpegBytes:4194304,maxReceiptBytes:33554432,maxFrozenBytes:67108864,maxLocalBytes:805306368,maxReceipts:4,maxWaiters:4,codecBytes:268435456,serializationMultiplier:12,responseBytes:MAX_VISION_RESPONSE_BYTES*132,pipeBytes:2097152,responseParseExpansion:128,piWorkerBytes:268435456})
type Kind='prepare'|'combined'|'tags-only'|'ocr'
type Permit={release():void}
type Waiter={kind:Kind;bytes:number;signal:AbortSignal;resolve:(p:Permit)=>void;reject:(e:Error)=>void;abort:()=>void}
export interface VisualSession {sessionToken:string;leaseIdentity:string}
export interface PreparedVisual {assetId:string;jpeg:Uint8Array}
export function createVisualAdmission(deps:{clock?:VisualAiClock;codec?:typeof prepareVisualJpeg}={}){
 const p=VISUAL_ADMISSION_PROFILE,clock=deps.clock??systemVisualAiClock,codec=deps.codec??prepareVisualJpeg
 let material=0,frozen=0,preparing=0,requests=0,tags=0,accepting=true,estimateFailed=false
 const barriers=new Set<symbol>()
 const canAccept=()=>accepting&&!estimateFailed&&barriers.size===0
 const leases=new Set<ReturnType<typeof makeLease>>(),queue:Waiter[]=[]
 const fits=(kind:Kind,bytes:number)=>material+bytes<=p.maxLocalBytes&&(kind==='prepare'?preparing<p.preparationSlots:requests<p.requestSlots&&(kind!=='tags-only'||tags<p.tagsSlots))
 const grant=(kind:Kind,bytes:number):Permit=>{
  material+=bytes;if(kind==='prepare')preparing++;else{requests++;if(kind==='tags-only')tags++}
  let released=false
  return{release(){if(released)return;released=true;material-=bytes;if(kind==='prepare')preparing--;else{requests--;if(kind==='tags-only')tags--}pump()}}
 }
 const pump=()=>{
  for(let i=0;i<queue.length;){const w=queue[i];if(!canAccept()||!fits(w.kind,w.bytes)){i++;continue}queue.splice(i,1);w.signal.removeEventListener('abort',w.abort);w.resolve(grant(w.kind,w.bytes))}
 }
 const acquire=(kind:Kind,bytes:number,signal:AbortSignal):Promise<Permit>=>{
  if(signal.aborted)return Promise.reject(Error('VISUAL_ADMISSION_CANCELLED'))
  if(!canAccept())return Promise.reject(Error('VISUAL_ADMISSION_SUSPENDED'))
  if(fits(kind,bytes))return Promise.resolve(grant(kind,bytes))
  if(queue.length>=p.maxWaiters)return Promise.reject(Error('VISUAL_ADMISSION_BUSY'))
  return new Promise((resolve,reject)=>{
   const w:Waiter={kind,bytes,signal,resolve,reject,abort:()=>{const i=queue.indexOf(w);if(i>=0)queue.splice(i,1);reject(Error('VISUAL_ADMISSION_CANCELLED'))}}
   queue.push(w);signal.addEventListener('abort',w.abort,{once:true})
  })
 }
 function makeLease(owner:string,session:VisualSession){
  const controller=new AbortController(),views=new Map<string,Uint8Array>(),id=randomUUID()
  let disposed=false,consumed=false,bytesHeld=0,operations=0,disposeRequested=false
  const expiresAt=clock.now()+300000
  const releaseHeld=()=>{if(!disposeRequested||operations)return;disposed=true;views.clear();frozen-=bytesHeld;material-=bytesHeld;bytesHeld=0;leases.delete(api);pump()}
  const cancelTimer=clock.scheduleTimeout(()=>{if(!consumed)api.dispose()},300000)
  const valid=()=>{if(disposed||disposeRequested||controller.signal.aborted||(!consumed&&clock.now()>expiresAt))throw Error('VISUAL_RECEIPT_EXPIRED')}
  const api={id,owner,session,expiresAt,
   consume(){valid();consumed=true;cancelTimer()},
   async prepare(assetId:string,read:()=>Promise<Uint8Array>):Promise<void>{
    valid();if(views.has(assetId))throw Error('VISUAL_ASSET_DUPLICATE')
    operations++
    let permit:Permit|undefined,source:Uint8Array|undefined,result:VisualCodecResult|undefined
    try{
     const reservation=2*p.sourceBytes+4*p.maxPixels+p.codecBytes+3*p.maxJpegBytes+p.pipeBytes
     permit=await acquire('prepare',reservation,controller.signal);valid()
     source=await read();if(source.length>p.sourceBytes)throw Error('VISUAL_SOURCE_TOO_LARGE')
     result=await codec(source,controller.signal);source=undefined;valid()
     const length=result.jpeg.length
     if(length>p.maxJpegBytes||length<1||bytesHeld+length>p.maxReceiptBytes||frozen+length>p.maxFrozenBytes||material+length>p.maxLocalBytes)throw Error('VISUAL_FROZEN_BUDGET')
     // Transfer ownership out of the larger preparation reservation before freeing that permit.
     views.set(assetId,result.jpeg);bytesHeld+=length;frozen+=length;material+=length;result=undefined
    }catch(error){if(error instanceof Error&&['VISUAL_CODEC_ESTIMATE_EXCEEDED','VISUAL_CODEC_UNQUALIFIED'].includes(error.message)){estimateFailed=true;rejectWaiters()}throw error}
    finally{source=undefined;result=undefined;permit?.release();operations--;releaseHeld()}
   },
   async withRequest<T>(assetId:string,kind:'combined'|'tags-only',signal:AbortSignal,action:(jpeg:Uint8Array,signal:AbortSignal)=>Promise<T>,workerBytes=0):Promise<T>{
    if(!Number.isSafeInteger(workerBytes)||workerBytes<0||workerBytes>p.piWorkerBytes)throw Error('VISUAL_WORKER_BUDGET');valid();if(!consumed)throw Error('VISUAL_REVIEW_REQUIRED')
    const jpeg=views.get(assetId);if(!jpeg)throw Error('VISUAL_ASSET_UNAVAILABLE')
    const abort=new AbortController(),cancel=()=>abort.abort();signal.addEventListener('abort',cancel,{once:true});controller.signal.addEventListener('abort',cancel,{once:true})
    if(signal.aborted||controller.signal.aborted)abort.abort()
    let permit:Permit|undefined,unknownRelease:Promise<void>|undefined;operations++
    try{permit=await acquire(kind,p.serializationMultiplier*jpeg.length+p.responseBytes+workerBytes,abort.signal);valid();abort.signal.throwIfAborted();const value=await action(jpeg,abort.signal);abort.signal.throwIfAborted();return value}
    catch(error){if(error instanceof PiProcessUnconfirmedError)unknownRelease=error.released;throw error}
    finally{const releaseOperation=()=>{permit?.release();operations--;releaseHeld()};if(unknownRelease)void unknownRelease.then(releaseOperation);else releaseOperation();signal.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',cancel)}
   },
   describe(assetId:string){valid();const jpeg=views.get(assetId);if(!jpeg)throw Error('VISUAL_ASSET_UNAVAILABLE');return{sha256:createHash('sha256').update(jpeg).digest('hex'),byteLength:jpeg.length}},
   dispose(){if(disposeRequested)return;disposeRequested=true;cancelTimer();controller.abort();releaseHeld()}
  }
  return api
 }
 const rejectWaiters=()=>{for(const w of queue.splice(0)){w.signal.removeEventListener('abort',w.abort);w.reject(Error('VISUAL_ADMISSION_SUSPENDED'))}}
 return{
  reservePiProbe(signal:AbortSignal){return acquire('combined',p.piWorkerBytes+p.responseBytes+4*1048576,signal)},
  reserveOcr(bytes:number,signal:AbortSignal){if(!Number.isSafeInteger(bytes)||bytes<1||bytes>p.maxLocalBytes)return Promise.reject(Error('OCR_RESOURCE_BUDGET'));return acquire('ocr',bytes,signal)},
  open(owner:string,session:VisualSession){if(!canAccept())throw Error('VISUAL_ADMISSION_SUSPENDED');if(leases.size>=p.maxReceipts)throw Error('VISUAL_ADMISSION_BUSY');const lease=makeLease(owner,session);leases.add(lease);return lease},
  cancelOwner(owner:string){for(const lease of leases)if(lease.owner===owner)lease.dispose()},
  hold(){const token=Symbol('visual-admission-barrier');barriers.add(token);rejectWaiters();let held=true;return()=>{if(!held)return;held=false;barriers.delete(token);pump()}},
  suspend(){accepting=false;rejectWaiters()},
  resume(){if(!estimateFailed){accepting=true;pump()}},
  invalidate(){accepting=false;rejectWaiters();for(const lease of leases)lease.dispose()},
  inspect(){return{materialBytes:material,frozenBytes:frozen,preparing,requests,tags,receipts:leases.size,waiting:queue.length,accepting:canAccept()}}
 }
}
export type VisualAdmission=ReturnType<typeof createVisualAdmission>
export type VisualMaterialLease=ReturnType<VisualAdmission['open']>
