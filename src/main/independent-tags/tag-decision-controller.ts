import {randomUUID} from 'node:crypto'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import type {TagDecisionPrepare,TagDecisionCommit,TagDecisionReview} from '../../shared/contracts/tag-decision.contract'
import type {TagIntentScope} from '../../shared/contracts/independent-tag-intent.contract'
import type {VisualAdmission} from '../visual-ai/visual-admission'
import {tagIntentId} from './tag-intent-storage'

type Plan={owner:string;input:TagDecisionCommit;review:TagDecisionReview}
export function createTagDecisionController(deps:{host:ActiveLibraryHost;admission:VisualAdmission;visuals:{suspendAndDrain():Promise<void>;resume():void};changed(scope:TagIntentScope):void;now?:()=>number}){
 const plans=new Map<string,Plan>(),active=new Map<string,{owner:string;abort:AbortController}>(),preparing=new Set<string>(),owners=new Map<string,number>()
 const now=deps.now??Date.now;let epoch=0
 return{
  async prepare(owner:string,input:TagDecisionPrepare):Promise<TagDecisionReview>{
   if(!input||Object.keys(input).some(k=>!['libraryIdentity','generation','assetId','evidenceId','tag','decision'].includes(k)))throw Error('TAG_DECISION_INVALID')
   tagIntentId(input.evidenceId)
   for(const [key,p]of plans)if(p.owner===owner||Date.parse(p.review.expiresAt)<now())plans.delete(key)
   if(preparing.has(owner)||preparing.size+plans.size>=4)throw Error('TAG_DECISION_BUSY')
   preparing.add(owner);const version=epoch,ownerVersion=owners.get(owner)??0
   try{
    const context=await deps.host.readTagDecisionContext(input)
    if(version!==epoch||ownerVersion!==(owners.get(owner)??0))throw Error('TAG_INTENT_SESSION_EXPIRED')
    const requiresUpgrade=input.decision==='reject'&&context.schemaVersion<11
    const review:TagDecisionReview={receipt:randomUUID(),tag:context.tag,decision:input.decision,requiresUpgrade,storageNotice:requiresUpgrade?'首次保存拒绝规则将停止在途视觉任务、备份数据库并升级至 v11；旧版应用将无法打开。规则仅用于当前内容和同来源族，不删除素材或已确认标签。':'该选择只更新当前内容的标签决定，保留素材与已有人工内容。',expiresAt:new Date(now()+300000).toISOString()}
    plans.set(review.receipt,{owner,review,input:{...input,tag:context.tag,sessionToken:context.sessionToken,expectedSchemaVersion:context.schemaVersion,allowUpgrade:requiresUpgrade}});return review
   }finally{preparing.delete(owner)}
  },
  async confirm(owner:string,receipt:string){
   const p=plans.get(receipt);if(!p||p.owner!==owner||Date.parse(p.review.expiresAt)<now())throw Error('TAG_INTENT_SESSION_EXPIRED')
   plans.delete(receipt);const abort=new AbortController();active.set(receipt,{owner,abort});let release:(()=>void)|undefined
   try{
    if(p.review.requiresUpgrade){release=deps.admission.hold();await deps.visuals.suspendAndDrain()}
    abort.signal.throwIfAborted()
    const value=await deps.host.decideTag(p.input,abort.signal)
    try{deps.changed(p.input)}catch{/* A lost UI notification cannot undo a user decision. */}
    return value
   }finally{
    try{if(release&&deps.host.inspect().state==='ready'){const session=await deps.host.readVisualSession(p.input);if(session.sessionToken===p.input.sessionToken)deps.visuals.resume()}}
    finally{release?.();active.delete(receipt)}
   }
  },
  discard(owner:string,receipt:string){const p=plans.get(receipt);if(!p)return;if(p.owner!==owner)throw Error('TAG_INTENT_SESSION_EXPIRED');plans.delete(receipt)},
  cancelOwner(owner:string){owners.set(owner,(owners.get(owner)??0)+1);for(const[key,p]of plans)if(p.owner===owner)plans.delete(key);for(const p of active.values())if(p.owner===owner)p.abort.abort()},
  invalidate(){epoch++;plans.clear();for(const p of active.values())p.abort.abort()}
 }
}
export function tagDecisionMessage(error:unknown){
 const code=error instanceof Error?error.message:''
 if(code==='TAG_DECISION_SOURCE_CHANGED')return '标签来源已变化，请刷新后重新选择。'
 if(code==='TAG_INTENT_ACK_UNCERTAIN')return '选择可能已保存，请重新读取后核对；不会重复分析素材。'
 if(code==='TAG_INTENT_SETTINGS_RESTORE_FAILED')return '资料库需要恢复检查，已停止新的写入。'
 if(code==='TAG_DECISION_UPGRADE_REQUIRED')return '请先确认拒绝规则的存储升级。'
 return '标签选择未完成，请核对当前资料库与素材后重试。'
}
