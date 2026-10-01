import {randomUUID} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import {BASIC_CAPABILITIES} from '../../shared/contracts/background-analysis.contract'
import type {BackgroundScope,BackgroundConfig,BackgroundConfigCommit,BackgroundDecision,BackgroundView,BackgroundSnapshot} from '../../shared/contracts/background-analysis.contract'
import type {VisualAdmission} from '../visual-ai/visual-admission'
import {evaluateBackgroundReadiness,type BackgroundTelemetry} from './background-resource-policy'
export function createBackgroundAnalysisController(deps:{host:ActiveLibraryHost;admission:VisualAdmission;telemetry():BackgroundTelemetry;visuals:{suspendAndDrain():Promise<void>;resume():void};holdOcr():()=>void;now?:()=>number}){
 const plans=new Map<string,{owner:string;expires:number;input:BackgroundConfigCommit}>(),owners=new Map<string,number>(),active=new Map<string,{owner:string;abort:AbortController}>();let epoch=0;const now=deps.now??(()=>performance.now())
 const stamp=(owner:string)=>({epoch,ownerVersion:owners.get(owner)??0})
 const fence=async(owner:string,s:ReturnType<typeof stamp>,scope:BackgroundScope,session:string)=>{const current=await deps.host.readVisualSession(scope);if(epoch!==s.epoch||s.ownerVersion!==(owners.get(owner)??0)||current.sessionToken!==session)throw Error('BACKGROUND_SCOPE_EXPIRED')}
 const project=(owner:string,s:BackgroundSnapshot):BackgroundView=>{const resource=evaluateBackgroundReadiness(deps.telemetry(),null,performance.now());return{...s,dispatchAvailable:false,canConfigure:owner==='main',resourceReasons:resource.reasons,availableMemoryMiB:resource.availableMemoryMiB}}
 return{
  async read(owner:string,scope:BackgroundScope){const token=stamp(owner),s=await deps.host.readBackgroundAnalysis(scope);await fence(owner,token,scope,s.sessionToken);return project(owner,s)},
  async prepare(owner:string,input:BackgroundConfig){
   if(owner!=='main'||!input||Object.keys(input).some(k=>!['libraryIdentity','generation','enabled','capabilities','expectedRevision'].includes(k)))throw Error('BACKGROUND_INPUT_INVALID')
   if(typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||input.expectedRevision>=Number.MAX_SAFE_INTEGER||!input.capabilities||Object.keys(input.capabilities).length!==3||BASIC_CAPABILITIES.some(c=>typeof input.capabilities[c]!=='boolean'))throw Error('BACKGROUND_INPUT_INVALID')
   const token=stamp(owner),s=await deps.host.readBackgroundAnalysis(input);await fence(owner,token,input,s.sessionToken)
   if(input.expectedRevision!==s.policy.revision)throw Error('BACKGROUND_CONFLICT')
   for(const[id,p]of plans)if(p.owner===owner||p.expires<now())plans.delete(id)
   if(plans.size>=4)throw Error('BACKGROUND_BUSY')
   const receipt=randomUUID();plans.set(receipt,{owner,expires:now()+300000,input:{...structuredClone(input),sessionToken:s.sessionToken,expectedSchemaVersion:s.schemaVersion,allowUpgrade:true}})
   return{receipt,requiresUpgrade:s.schemaVersion<12,notice:(s.schemaVersion<12?'将备份数据库、暂停当前视觉任务并启用 v12；旧版本不能打开。OCR 忙时需先完成该任务。 ':'')+'只为启用后新入库素材保存标签、描述、OCR 计划，不回填历史库、不启动模型或发送素材；该设置本身不执行模型；后台 OCR 另需本次开库许可与资源资格。'}
  },
  async confirm(owner:string,receipt:string){
   const p=plans.get(receipt);if(!p||p.owner!==owner||p.expires<now()||active.size)throw Error('BACKGROUND_SCOPE_EXPIRED')
   const token=stamp(owner),abort=new AbortController();active.set(receipt,{owner,abort});plans.delete(receipt);let release:(()=>void)|undefined,ocrRelease:(()=>void)|undefined
   try{
    if(p.input.expectedSchemaVersion<12){ocrRelease=deps.holdOcr();release=deps.admission.hold();await deps.visuals.suspendAndDrain()}
    abort.signal.throwIfAborted();const s=await deps.host.configureBackgroundAnalysis(p.input,abort.signal);await fence(owner,token,p.input,p.input.sessionToken);return project(owner,s)
   }finally{
    try{if(release&&deps.host.inspect().state==='ready'){const current=await deps.host.readVisualSession(p.input);if(current.sessionToken===p.input.sessionToken)deps.visuals.resume()}}
    finally{ocrRelease?.();release?.();active.delete(receipt)}
   }
  },
  discard(owner:string,receipt:string){const p=plans.get(receipt);if(!p)return;if(p.owner!==owner)throw Error('BACKGROUND_SCOPE_EXPIRED');plans.delete(receipt)},
  async change(owner:string,input:BackgroundDecision){
   if(active.size>=4)throw Error('BACKGROUND_BUSY')
   const token=stamp(owner),id=randomUUID(),abort=new AbortController();active.set(id,{owner,abort})
   try{const s=await deps.host.changeBackgroundIntent(input,abort.signal);await fence(owner,token,input,input.sessionToken);return project(owner,s)}finally{active.delete(id)}
  },
  cancelOwner(owner:string){owners.set(owner,(owners.get(owner)??0)+1);for(const[id,p]of plans)if(p.owner===owner)plans.delete(id);for(const a of active.values())if(a.owner===owner)a.abort.abort()},
  invalidate(){epoch++;plans.clear();for(const a of active.values())a.abort.abort()}
 }
}
export function backgroundMessage(error:unknown){const code=error instanceof Error?error.message:'';if(code==='OCR_BUSY')return 'OCR 正在准备或运行，请完成后再启用计划存储。';if(code==='BACKGROUND_CONFLICT')return '计划状态已变化，请重新读取后操作。';if(code==='TAG_INTENT_SETTINGS_RESTORE_FAILED')return '资料库需要恢复检查，已停止写入。';if(code==='TAG_INTENT_ACK_UNCERTAIN')return '配置可能已保存，请重新读取核对。';return '后台计划操作未完成，请核对当前资料库和素材后重试。'}
