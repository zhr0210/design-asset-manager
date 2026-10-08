import {randomUUID} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {BackgroundOcrScope,BackgroundOcrPermission,BackgroundOcrView,BackgroundOcrClaim,BackgroundOcrSnapshot} from '../../shared/contracts/background-ocr.contract'
import type {OcrRuntime,OcrRuntimeHandle} from '../ocr/ocr-runtime'
import {OCR_HOST_RESERVE_BYTES,type createOcrController} from '../ocr/ocr-controller'
import {evaluateBackgroundReadiness,type BackgroundTelemetry,type QualifiedBackgroundEnvelope} from '../background-analysis/background-resource-policy'
export interface BackgroundOcrQualification {runtimeFingerprint:string;evidenceId:string;envelope:QualifiedBackgroundEnvelope}
export function createBackgroundOcrController(deps:{host:ActiveLibraryHost;ocr:ReturnType<typeof createOcrController>;runtime:OcrRuntime;telemetry():BackgroundTelemetry;qualify(runtime:OcrRuntimeHandle):BackgroundOcrQualification|null;now?:()=>number;drainTimeoutMs?:number;schedule?:(fn:()=>void,ms:number)=>()=>void}){
 const now=deps.now??(()=>performance.now()),schedule=deps.schedule??((fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref?.();return()=>clearTimeout(timer)})
 let epoch=0,authorized:BackgroundOcrScope|null=null,active:Promise<void>|null=null,abort:AbortController|null=null,cancelTimer:(()=>void)|null=null,lastReasons:string[]=['permission-required'],confirming=false,confirmDone=Promise.resolve()
 let grantIdentity:Pick<BackgroundOcrSnapshot,'sessionToken'|'permissionRevision'|'runtimeFingerprint'>|null=null
 const retireLocal=()=>{epoch++;reviews.clear();authorized=null;grantIdentity=null;abort?.abort();cancelTimer?.();cancelTimer=null}
 const reviews=new Map<string,{expires:number;epoch:number;input:BackgroundOcrPermission}>()
 const revoke=()=>{retireLocal();deps.host.revokeBackgroundOcr()}
 const readiness=async()=>{
  const runtime=await deps.runtime.current(),qualification=runtime?deps.qualify(runtime):null
  const valid=qualification&&qualification.runtimeFingerprint===runtime?.fingerprint&&qualification.evidenceId.length>0&&qualification.envelope.peakRamBytes>=OCR_HOST_RESERVE_BYTES
  const resource=evaluateBackgroundReadiness(deps.telemetry(),valid?qualification!.envelope:null,now())
  return{runtime,qualification:valid?qualification:null,reasons:[...(!runtime?['runtime-unavailable']:[]),...resource.reasons],policyAllows:resource.policyAllows&&!!valid}
 }
 const sameIdentity=(a:BackgroundOcrSnapshot,b:BackgroundOcrSnapshot)=>a.sessionToken===b.sessionToken&&a.permissionRevision===b.permissionRevision&&a.runtimeFingerprint===b.runtimeFingerprint&&(!a.authorized||b.authorized)
 const observeRuntime=async(scope:BackgroundOcrScope,snapshot:BackgroundOcrSnapshot,runtime:OcrRuntimeHandle|null,version:number)=>{
  if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
  const current=await deps.host.readBackgroundOcr(scope)
  if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
  if(!sameIdentity(current,snapshot)){if(grantIdentity&&grantIdentity.sessionToken===snapshot.sessionToken&&grantIdentity.permissionRevision===snapshot.permissionRevision&&grantIdentity.runtimeFingerprint===snapshot.runtimeFingerprint)retireLocal();throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')}
  if(current.authorized&&current.runtimeFingerprint!==runtime?.fingerprint){revoke();lastReasons=['runtime-changed'];return{...current,authorized:false}}
  return current
 }
 const read=async(scope:BackgroundOcrScope):Promise<BackgroundOcrView>=>{
  const version=epoch,snapshot=await deps.host.readBackgroundOcr(scope),r=await readiness()
  const current=await observeRuntime(scope,snapshot,r.runtime,version),availability=deps.ocr.backgroundAvailability()
  return{...current,running:!!active,reasons:[...(!current.authorized?['permission-required']:[]),...r.reasons,...(availability.unconfirmed?['process-exit-unconfirmed']:availability.busy?['ocr-busy']:[]),...lastReasons.filter(v=>v==='operation-failed'||v==='runtime-changed'||v==='resources-changed')]}
 }

 const enqueue=(ms:number)=>{cancelTimer?.();if(authorized)cancelTimer=schedule(()=>{cancelTimer=null;void tick()},ms)}
 const tick=():Promise<void>=>{
  if(active)return active
  if(!authorized)return Promise.resolve()
  const scope={...authorized},version=epoch,controller=new AbortController();abort=controller
  active=Promise.resolve().then(async()=>{
   const snapshot=await deps.host.readBackgroundOcr(scope);if(version===epoch&&grantIdentity&&(snapshot.sessionToken!==grantIdentity.sessionToken||snapshot.permissionRevision!==grantIdentity.permissionRevision||snapshot.runtimeFingerprint!==grantIdentity.runtimeFingerprint)){retireLocal();lastReasons=['permission-required'];return}if(version!==epoch||!snapshot.authorized){lastReasons=['permission-required'];authorized=null;return}
   const r=await readiness();await observeRuntime(scope,snapshot,r.runtime,version);if(version!==epoch)return;if(r.runtime?.fingerprint!==snapshot.runtimeFingerprint){revoke();lastReasons=['runtime-changed'];return}if(!r.policyAllows||!r.runtime||!r.qualification){lastReasons=r.reasons;return}
   const availability=deps.ocr.backgroundAvailability();if(availability.busy){lastReasons=[availability.unconfirmed?'process-exit-unconfirmed':'ocr-busy'];return}
   controller.signal.throwIfAborted();if(version!==epoch)return
   lastReasons=[]
   const session={...scope,sessionToken:snapshot.sessionToken,runtimeFingerprint:r.runtime.fingerprint}
   const result=await deps.ocr.runBackground({scope,runtimeFingerprint:r.runtime.fingerprint,reserveBytes:r.qualification.envelope.peakRamBytes,signal:controller.signal,
    claim:async()=>{controller.signal.throwIfAborted();if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED');const fresh=await readiness();await observeRuntime(scope,snapshot,fresh.runtime,version);controller.signal.throwIfAborted();if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED');if(fresh.runtime?.fingerprint!==session.runtimeFingerprint){revoke();throw Error('OCR_MODEL_CHANGED')}if(!fresh.policyAllows)throw Error('BACKGROUND_OCR_RESOURCES_CHANGED');return deps.host.claimBackgroundOcr(session)},
    sent:async claim=>{controller.signal.throwIfAborted();const fresh=await readiness();await observeRuntime(scope,snapshot,fresh.runtime,version);controller.signal.throwIfAborted();if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED');if(fresh.runtime?.fingerprint!==session.runtimeFingerprint){revoke();throw Error('OCR_MODEL_CHANGED')}if(!fresh.policyAllows||!fresh.qualification||fresh.qualification.envelope.peakRamBytes>r.qualification!.envelope.peakRamBytes)throw Error('BACKGROUND_OCR_RESOURCES_CHANGED');controller.signal.throwIfAborted();await deps.host.markBackgroundOcrSent(claim)},
    commit:(claim,ocr,signal)=>deps.host.commitBackgroundOcr({claim,ocr},signal),
    finish:(claim,state)=>deps.host.finishBackgroundOcr(claim,state)
   });if(!result)lastReasons=['no-eligible-intent']
  }).catch(error=>{if(version===epoch)lastReasons=[error instanceof Error&&error.message==='BACKGROUND_OCR_RESOURCES_CHANGED'?'resources-changed':'operation-failed']}).finally(()=>{active=null;if(abort===controller)abort=null;if(version===epoch&&authorized)enqueue(lastReasons.length?30000:5000)})
  return active
 }
 return{
  read,tick,
  async prepare(scope:BackgroundOcrScope){
   if(confirming)throw Error('BACKGROUND_OCR_BUSY')
   const version=epoch,s=await deps.host.readBackgroundOcr(scope),runtime=await deps.runtime.current()
   if(s.schemaVersion>=14)throw Error('BACKGROUND_OCR_USE_BASIC_POLICY')
   const current=await observeRuntime(scope,s,runtime,version)
   if(current.schemaVersion<12)throw Error('BACKGROUND_OCR_ENABLE_PLANS_FIRST')
   if(!runtime)throw Error('OCR_RUNTIME_UNAVAILABLE')
   reviews.clear();const receipt=randomUUID();reviews.set(receipt,{expires:now()+300000,epoch,input:{...scope,sessionToken:current.sessionToken,expectedRevision:current.permissionRevision,expectedSchemaVersion:current.schemaVersion,allowUpgrade:true,enabled:true,runtimeFingerprint:runtime.fingerprint}})
   return{receipt,notice:(current.schemaVersion<13?'将备份并升级本资料库的 OCR 执行记录；旧版应用不能打开。 ':'')+'允许本次开库期间，在资源资格满足时执行新素材 OCR 计划；与手动 OCR 共用运行资源，不上传素材。旧库不补扫，关库撤销许可。安全终止的失败任务可在本次重新授权后重试；已发送且退出未知的任务保持阻塞。当前未取得生产资源资格时仍等待。'}
  },
  discard(receipt:string){reviews.delete(receipt)},
  async confirm(receipt:string){
   const p=reviews.get(receipt);if(!p||p.epoch!==epoch||p.expires<now()||confirming||active)throw Error('BACKGROUND_OCR_REVIEW_EXPIRED')
   reviews.delete(receipt);confirming=true;let endConfirm!:()=>void;confirmDone=new Promise<void>(r=>{endConfirm=r});let release:(()=>void)|undefined
   const version=epoch,signal=new AbortController();abort=signal
   try{
    release=deps.ocr.holdForMaintenance()
    const scope={libraryIdentity:p.input.libraryIdentity,generation:p.input.generation},snapshot=await deps.host.readBackgroundOcr(scope)
    if(version!==epoch||snapshot.sessionToken!==p.input.sessionToken||snapshot.permissionRevision!==p.input.expectedRevision)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
    const runtime=await deps.runtime.current()
    await observeRuntime(scope,snapshot,runtime,version)
    if(runtime?.fingerprint!==p.input.runtimeFingerprint){if(version===epoch){revoke();lastReasons=['runtime-changed']}throw Error('OCR_MODEL_CHANGED')}
    if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
    await deps.host.configureBackgroundOcr(p.input,signal.signal);if(version!==epoch)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
    const installed=await deps.host.readBackgroundOcr(scope);if(version!==epoch||installed.sessionToken!==p.input.sessionToken||installed.permissionRevision!==p.input.expectedRevision+1||!installed.authorized||installed.runtimeFingerprint!==p.input.runtimeFingerprint)throw Error('BACKGROUND_OCR_SCOPE_EXPIRED')
    authorized=scope;grantIdentity={sessionToken:installed.sessionToken,permissionRevision:installed.permissionRevision,runtimeFingerprint:installed.runtimeFingerprint};lastReasons=[]
    return await read(authorized)
   }finally{release?.();confirming=false;if(abort===signal)abort=null;endConfirm();if(authorized&&version===epoch)enqueue(0)}
  },
  async revoke(scope:BackgroundOcrScope){revoke();const snapshot=await deps.host.readBackgroundOcr(scope);if(snapshot.schemaVersion===13)await deps.host.configureBackgroundOcr({...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.permissionRevision,expectedSchemaVersion:13,allowUpgrade:false,enabled:false,runtimeFingerprint:snapshot.runtimeFingerprint});lastReasons=['permission-required'];return read(scope)},
  /** Called before policy/intent mutation; cancel only this controller's active work. */
  changed(){abort?.abort();if(authorized)enqueue(0)},
  invalidate:revoke,
  async suspendAndDrain(){revoke();let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([(async()=>{await deps.ocr.suspendAndDrain();await active;await confirmDone})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('BACKGROUND_OCR_DRAIN_BLOCKED')),deps.drainTimeoutMs??5000)})])}finally{clearTimeout(timer)}},
 }
}
export function backgroundOcrMessage(error:unknown){const code=error instanceof Error?error.message:'';if(code==='BACKGROUND_OCR_USE_CONTINUOUS_RULES')return '此库已使用统一后台执行，请在上方核对持续规则并勾选 OCR；旧会话许可不再启动另一个调度器。';if(code==='BACKGROUND_OCR_ENABLE_PLANS_FIRST')return '请先启用新素材计划，再单独授权后台 OCR。';if(code==='OCR_RUNTIME_UNAVAILABLE')return '请先选择已安装的本地 OCR 环境。';if(code==='OCR_BUSY'||code==='BACKGROUND_OCR_BUSY')return 'OCR 正在准备、运行或等待资源，请稍后重试。';return '后台 OCR 操作未完成；旧结果保留，请重新读取并核对授权与资源状态。'}
