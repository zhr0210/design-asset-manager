import type {BackgroundOcrClaim,BackgroundOcrReceipt} from '../../shared/contracts/background-ocr.contract'
import {randomUUID,createHash} from 'node:crypto'
import sharp from 'sharp'
import {OcrProcessUnconfirmedError} from './local-ocr-process'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {OcrScope,OcrCommit,OcrJob,OcrReview,OcrSnapshot,OcrCorrection} from '../../shared/contracts/asset-ocr.contract'
import type {OcrRuntime,OcrRuntimeHandle} from './ocr-runtime'
type Scope=Omit<OcrScope,'assetId'>
type Host=Pick<ActiveLibraryHost,'inspect'|'readAssetContext'|'readPreview'|'readOcr'|'commitOcr'|'correctOcr'>
// Host-side decode/codec/frozen/transport/result upper accounting reserve; not a model peak estimate.
export const OCR_HOST_RESERVE_BYTES=2*32*1048576+4*40000000+3*16*1048576+2*1048576+128*1048576+256*1048576
interface Plan{release():void;timer?:ReturnType<typeof setTimeout>;scope:Scope;expires:number;epoch:number;runtime:OcrRuntimeHandle;items:Array<{assetId:string;assetRevision:string;sourceRef:string;inputSha256:string;preview:Uint8Array;snapshot:OcrSnapshot}>}
export const ocrMessage=(error:unknown)=>{
 const code=error instanceof Error?error.message:''
 const messages:Record<string,string>={OCR_SCOPE_EXPIRED:'素材库已变化，请重新选择素材。',OCR_RESULT_CONFLICT:'OCR 已在其他位置更新，草稿已保留，请重新载入后核对。',OCR_SOURCE_CHANGED:'素材预览已变化，本次结果没有保存。',OCR_RUNTIME_UNAVAILABLE:'本地 OCR 环境不可用，请先选择已安装的环境。',OCR_TIMEOUT:'文字识别超时，本次没有保存结果。',OCR_CANCELLED:'文字识别已取消。',OCR_PROCESS_EXIT_UNCONFIRMED:'尚未确认 OCR 进程退出，已阻止新的识别与维护操作。',OCR_DRAIN_BLOCKED:'OCR 尚未安全停止，请稍后重试关闭。',OCR_UPGRADE_REQUIRED:'请先确认 OCR 存储升级。',OCR_MODEL_CHANGED:'OCR 模型文件已变化，请重新配置并确认。',OCR_EDITED_SOURCE_CHANGED:'已有修订属于旧预览，结果保留，请先检查素材版本。'}
 return messages[code]||'OCR 操作未完成；已有结果和输入保留，请检查本地环境后重试。'
}
export function createOcrController(deps:{host:Host;runtime:OcrRuntime;changed(scope:OcrScope):void;drainTimeoutMs?:number;runtimeChanged?():void;reserve?(bytes:number,signal:AbortSignal):Promise<{release():void}>}){
 let epoch=0,preparing=false,maintenanceHolds=0,drains=0,suspended=false
 type Record={job:OcrJob;abort:AbortController;done:Promise<void>;unconfirmed:boolean}
 let active:Record|null=null,preparation=Promise.resolve(),preparationAbort:AbortController|null=null
 const unreleased=new Set<Promise<void>>()
 const beginPreparation=()=>{preparing=true;preparationAbort=new AbortController();let done!:()=>void;preparation=new Promise<void>(r=>{done=r});return()=>{preparing=false;preparationAbort=null;done()}}
 const plans=new Map<string,Plan>()
 const clearPlans=()=>{for(const p of plans.values()){clearTimeout(p.timer);p.release()}plans.clear()}
 const reserve=deps.reserve??(async()=>({release(){}}))
 const retain=(error:OcrProcessUnconfirmedError,release:()=>void)=>{unreleased.add(error.released);void error.released.then(()=>{release();unreleased.delete(error.released)})}
 const matches=(s:Scope)=>{const a=deps.host.inspect();return a.state==='ready'&&a.identity===s.libraryIdentity&&a.generation===s.generation}
 const requireScope=(s:Scope)=>{if(!s||!matches(s))throw Error('OCR_SCOPE_EXPIRED')}
 const busy=()=>active?.job.state==='running'||unreleased.size>0
 const invalidate=()=>{epoch++;clearPlans();preparationAbort?.abort();active?.abort.abort()}
 const suspend=()=>{suspended=true;invalidate()}
 const assertAdmission=()=>{if(unreleased.size)throw Error('OCR_PROCESS_EXIT_UNCONFIRMED');if(suspended||maintenanceHolds||preparing||busy())throw Error('OCR_BUSY')}
 return{
  async status(){const runtime=await deps.runtime.current();return{configured:!!runtime,label:runtime?.label||'尚未选择本地 OCR 环境',job:active&&matches(active.job)?structuredClone(active.job):null}},
  holdForMaintenance(){if(suspended||busy()||preparing)throw Error('OCR_BUSY');maintenanceHolds++;epoch++;clearPlans();let held=true;return()=>{if(held){held=false;maintenanceHolds--}}},
  async configure(){assertAdmission();const finish=beginPreparation();try{clearPlans();const before=deps.runtimeChanged?await deps.runtime.current():null;await deps.runtime.configure();if(deps.runtimeChanged&&(await deps.runtime.current())?.fingerprint!==before?.fingerprint)deps.runtimeChanged()}finally{finish()}},
  read:(scope:OcrScope)=>{requireScope(scope);return deps.host.readOcr(scope)},
  async prepare(input:Scope&{assetIds:string[]}):Promise<OcrReview>{
   assertAdmission()
   if(!input||Object.keys(input).some(k=>!['libraryIdentity','generation','assetIds'].includes(k))||!Array.isArray(input.assetIds)||!input.assetIds.length||input.assetIds.length>8||new Set(input.assetIds).size!==input.assetIds.length)throw Error('OCR_INPUT_INVALID')
   requireScope(input);const finish=beginPreparation();clearPlans();const version=epoch;let permit:{release():void}|undefined,transferred=false
   try{
    const runtime=await deps.runtime.current();if(!runtime)throw Error('OCR_RUNTIME_UNAVAILABLE')
    permit=await reserve(OCR_HOST_RESERVE_BYTES+7*16*1048576,preparationAbort!.signal)
    const items:Plan['items']=[]
    for(const id of input.assetIds)items.push(await freezeItem(input,id))
    requireScope(input);if(version!==epoch)throw Error('OCR_SCOPE_EXPIRED')
    const receipt=randomUUID(),plan:Plan={release:()=>permit!.release(),scope:{libraryIdentity:input.libraryIdentity,generation:input.generation},epoch:version,expires:Date.now()+300000,runtime,items};plans.set(receipt,plan);transferred=true;plan.timer=setTimeout(()=>{if(plans.get(receipt)===plan){plans.delete(receipt);plan.release()}},300000);plan.timer.unref?.()
    return{receipt,count:items.length,requiresUpgrade:items.some(i=>i.snapshot.requiresUpgrade),runtimeLabel:runtime.label}
   }finally{if(!transferred)permit?.release();finish()}
  },
  async run(receipt:string){assertAdmission();const plan=plans.get(receipt);if(!plan||plan.epoch!==epoch||plan.expires<Date.now())throw Error('OCR_SCOPE_EXPIRED');requireScope(plan.scope)
   const finish=beginPreparation()
   try{
    const runtime=await deps.runtime.current();if(runtime?.fingerprint!==plan.runtime.fingerprint)throw Error('OCR_MODEL_CHANGED')
    requireScope(plan.scope);if(suspended||maintenanceHolds||plan.epoch!==epoch||!plans.has(receipt))throw Error('OCR_SCOPE_EXPIRED');plans.delete(receipt);clearTimeout(plan.timer)
    const record:Record={job:{...plan.scope,id:randomUUID(),state:'running',items:plan.items.map(i=>({assetId:i.assetId,state:'queued'}))},abort:new AbortController(),done:Promise.resolve(),unconfirmed:false};active=record
    record.done=execute(plan,record);return structuredClone(record.job)
   }finally{finish()}
  },
  backgroundAvailability(){return{busy:!!busy()||preparing||maintenanceHolds>0||suspended||plans.size>0,unconfirmed:unreleased.size>0}},
  async runBackground(input:{scope:Scope;runtimeFingerprint:string;reserveBytes:number;signal:AbortSignal;claim():Promise<BackgroundOcrClaim|null>;sent(claim:BackgroundOcrClaim):Promise<void>;commit(claim:BackgroundOcrClaim,ocr:OcrCommit,signal:AbortSignal):Promise<BackgroundOcrReceipt>;finish(claim:BackgroundOcrClaim,state:'failed'|'cancelled'|'unknown'|'deferred'):Promise<void>}):Promise<BackgroundOcrReceipt|null>{
   assertAdmission();if(plans.size)throw Error('OCR_BUSY');requireScope(input.scope)
   const finish=beginPreparation(),abort=preparationAbort!,version=epoch,cancel=()=>abort.abort()
   input.signal.addEventListener('abort',cancel,{once:true});if(input.signal.aborted)cancel()
   let permit:{release():void}|undefined,unknown=false,claim:BackgroundOcrClaim|null=null,record:Record|undefined
   try{
    if(input.reserveBytes<OCR_HOST_RESERVE_BYTES)throw Error('OCR_RESOURCE_BUDGET')
    permit=await reserve(input.reserveBytes,abort.signal);abort.signal.throwIfAborted()
    const runtime=await deps.runtime.current();if(!runtime||runtime.fingerprint!==input.runtimeFingerprint)throw Error('OCR_MODEL_CHANGED')
    if(version!==epoch)throw Error('OCR_SCOPE_EXPIRED');requireScope(input.scope);abort.signal.throwIfAborted()
    claim=await input.claim();if(!claim)return null
    record={job:{...input.scope,id:claim.attemptId,state:'running',items:[{assetId:claim.assetId,state:'running'}]},abort,done:preparation,unconfirmed:false};active=record
    const item=await freezeItem(input.scope,claim.assetId)
    abort.signal.throwIfAborted();if(version!==epoch)throw Error('OCR_SCOPE_EXPIRED');requireScope(input.scope)
    await input.sent(claim);abort.signal.throwIfAborted()
    const observation=await runtime.run(item.preview,abort.signal)
    abort.signal.throwIfAborted();if(version!==epoch)throw Error('OCR_SCOPE_EXPIRED');requireScope(input.scope)
    const receipt=await input.commit(claim,{...input.scope,assetId:claim.assetId,sessionToken:item.snapshot.sessionToken,expectedRevision:item.snapshot.revision,allowUpgrade:false,evidence:{id:'ocr:'+claim.attemptId,assetId:claim.assetId,assetRevision:item.assetRevision,sourceRef:item.sourceRef,inputSha256:item.inputSha256,createdAt:new Date().toISOString(),observation}},abort.signal)
    record.job.state='completed';record.job.items[0].state='completed';try{deps.changed({...input.scope,assetId:claim.assetId})}catch{}return receipt
   }catch(error){
    unknown=error instanceof OcrProcessUnconfirmedError
    if(record){record.unconfirmed=unknown;record.job.state=unknown?'failed':abort.signal.aborted?'cancelled':'failed';record.job.items[0].state=record.job.state;record.job.items[0].error=ocrMessage(error)}
    if(claim){try{await input.finish(claim,unknown?'unknown':abort.signal.aborted?'cancelled':error instanceof Error&&error.message==='BACKGROUND_OCR_RESOURCES_CHANGED'?'deferred':'failed')}catch{}}
    if(error instanceof OcrProcessUnconfirmedError){const held=permit;retain(error,()=>{held?.release();if(claim)void input.finish(claim,'failed').catch(()=>{})})}
    throw error
   }finally{if(!unknown)permit?.release();input.signal.removeEventListener('abort',cancel);finish()}
  },
  cancel(){active?.abort.abort();return active?structuredClone(active.job):null},
  async correct(input:OcrCorrection){requireScope(input);const result=await deps.host.correctOcr(input);try{deps.changed(input)}catch{}return result},
  invalidate,
  suspend,
  resume(){if(!drains&&!preparing&&!busy())suspended=false},
  async suspendAndDrain(){
   suspend();drains++
   let timer:ReturnType<typeof setTimeout>|undefined
   try{
    await Promise.race([
     (async()=>{await preparation;await active?.done;await Promise.all([...unreleased])})(),
     new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('OCR_DRAIN_BLOCKED')),deps.drainTimeoutMs??5000)})
    ])
   }finally{clearTimeout(timer);drains--}
  }

 }
 async function freezeItem(scope:Scope,id:string):Promise<Plan['items'][number]>{
  const a=(await deps.host.readAssetContext([id])).assets.find(x=>x.id===id);if(!a)throw Error('OCR_SOURCE_CHANGED')
  const snapshot=await deps.host.readOcr({...scope,assetId:id}),bytes=await deps.host.readPreview(id)
  if(bytes.byteLength>32*1024*1024)throw Error('OCR_INPUT_INVALID')
  const preview=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).png().toBuffer()
  if(preview.length>16*1024*1024)throw Error('OCR_INPUT_INVALID')
  return{assetId:id,assetRevision:a.revision,sourceRef:a.thumbnailRef,snapshot,preview,inputSha256:createHash('sha256').update(preview).digest('hex')}
 }
 async function execute(plan:Plan,record:Record){
  try{for(const [index,input] of plan.items.entries()){
   const item=record.job.items[index]
   if(record.unconfirmed||record.abort.signal.aborted||plan.epoch!==epoch||!matches(plan.scope)){item.state='cancelled';continue}
   item.state='running'
   try{
    const before=await deps.host.readOcr({...plan.scope,assetId:item.assetId});if(before.sessionToken!==input.snapshot.sessionToken||before.revision!==input.snapshot.revision)throw Error('OCR_RESULT_CONFLICT')
    const source=(await deps.host.readAssetContext([item.assetId])).assets[0];if(!source||source.revision!==input.assetRevision||source.thumbnailRef!==input.sourceRef)throw Error('OCR_SOURCE_CHANGED')
    const observation=await plan.runtime.run(input.preview,record.abort.signal)
    if(record.abort.signal.aborted||plan.epoch!==epoch)throw Error('OCR_CANCELLED');requireScope(plan.scope)
    await deps.host.commitOcr({...plan.scope,assetId:item.assetId,sessionToken:input.snapshot.sessionToken,expectedRevision:input.snapshot.revision,allowUpgrade:true,evidence:{id:'ocr:'+randomUUID(),assetId:item.assetId,assetRevision:input.assetRevision,sourceRef:input.sourceRef,inputSha256:input.inputSha256,createdAt:new Date().toISOString(),observation}},record.abort.signal)
    item.state='completed';try{deps.changed({...plan.scope,assetId:item.assetId})}catch{}
   }catch(error){
    if(error instanceof OcrProcessUnconfirmedError){record.unconfirmed=true;retain(error,plan.release);item.state='failed';item.error=ocrMessage(error)}
    else{item.state=record.abort.signal.aborted||plan.epoch!==epoch?'cancelled':'failed';item.error=item.state==='failed'?ocrMessage(error):undefined}
   }
   finally{input.preview=new Uint8Array()}
  }}finally{const n=record.job.items.filter(i=>i.state==='completed').length;record.job.state=record.unconfirmed?'failed':n===record.job.items.length?'completed':n?'partial':record.abort.signal.aborted||plan.epoch!==epoch?'cancelled':'failed';plan.items=[];if(!record.unconfirmed)plan.release()}
 }
}
