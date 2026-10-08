import { getWorkspaceClient } from '../../workspace-client'
import './background-analysis.css'
import BackgroundExecutionPanel from './BackgroundExecutionPanel'
import React,{useEffect,useRef,useState} from 'react'
import {BASIC_CAPABILITIES,type BackgroundAnalysisApi,type BackgroundScope,type BackgroundView,type BackgroundPolicy,type BackgroundReview} from '../../../shared/contracts/background-analysis.contract'
const names={tags:'标签',caption:'描述',ocr:'OCR'}
const states={'waiting':'等待执行','user-paused':'已手动暂停','policy-paused':'已由策略暂停','cancelled':'已取消','superseded':'来源已变化','waiting-asset':'等待素材恢复',running:'正在执行',succeeded:'已保存',failed:'执行未完成',unknown:'需要核对中断结果',abandoned:'已放弃'}
const reasons:Record<string,string>={'automatic-executor-not-integrated':'自动执行尚未接入','memory-unknown':'内存证据未知','memory-insufficient':'内存余量不足','power-unknown':'供电状态未知','waiting-external-power':'等待外接电源','low-power-mode-unknown':'节能模式状态未知','low-power-mode':'系统节能模式','thermal-unknown':'温控状态未知','thermal-pressure':'温控压力','interaction-unknown':'交互状态未知','foreground-active':'前台正在交互','session-locked':'系统已锁定','visibility-unknown':'窗口状态未知','no-visible-window':'没有可见主窗口','gpu-memory-unknown':'GPU 预算未知'}
export default function BackgroundAnalysisPanel({scope,assetId}:{scope?:BackgroundScope;assetId?:string}){
 const bridge=window as any,api=(bridge.backgroundAnalysisAPI??getWorkspaceClient()?.backgroundAnalysis) as BackgroundAnalysisApi|undefined
 const identity=JSON.stringify([scope,assetId]),life=useRef(0),readSequence=useRef(0),authority=useRef(''),reading=useRef<number|null>(null),pending=useRef(false),receipt=useRef<string|null>(null)
 const [view,setView]=useState<{scope:BackgroundScope;value:BackgroundView}|null>(null),[draft,setDraft]=useState<BackgroundPolicy|null>(null),[review,setReview]=useState<BackgroundReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[actionError,setActionError]=useState('')
 const revoke=()=>{life.current++;readSequence.current++;authority.current='';pending.current=false;setBusy(false);setActionError('');if(receipt.current)void api?.discard?.(receipt.current).catch(()=>{});receipt.current=null;setReview(null);setView(null);setDraft(null)}
 const adopt=(next:{scope:BackgroundScope;value:BackgroundView})=>setView(previous=>{
  if(previous&&previous.value.sessionToken===next.value.sessionToken&&previous.scope.assetId===next.scope.assetId&&previous.scope.libraryIdentity===next.scope.libraryIdentity){
   if(previous.value.schemaVersion>next.value.schemaVersion||previous.value.policy.revision>next.value.policy.revision||next.value.intents.some(i=>(previous.value.intents.find(p=>p.id===i.id)?.revision??0)>i.revision))return previous
  }
  return next
 })
 const load=async(reset=false)=>{
  if(!api||reading.current===life.current)return;const epoch=life.current,sequence=++readSequence.current;reading.current=epoch
  try{
   let actual=scope
   if(!actual){const current=await getWorkspaceClient()?.library.inspect();if(current?.state!=='ready'){if(epoch===life.current&&sequence===readSequence.current){revoke();setError('请先打开资料库。')}return}actual={libraryIdentity:current.identity,generation:current.generation}}
   const selected={...actual,...(assetId?{assetId}:{})},r=await api.read(selected)
   if(epoch!==life.current||sequence!==readSequence.current)return
   if(!r.ok){setError(r.error);return}
   const key=JSON.stringify([actual,r.value.sessionToken])
   if(key!==authority.current){authority.current=key;life.current++;pending.current=false;setBusy(false);setActionError('');if(receipt.current)void api.discard?.(receipt.current).catch(()=>{});receipt.current=null;setReview(null);setDraft(r.value.policy)}else if(reset){setDraft(r.value.policy);setActionError('')}
   adopt({scope:selected,value:r.value});setError('')
  }catch{if(epoch===life.current&&sequence===readSequence.current)setError('后台计划状态暂不可用。')}
  finally{if(reading.current===epoch)reading.current=null}
 }
 useEffect(()=>{life.current++;authority.current='';pending.current=false;setBusy(false);setView(null);setDraft(null);setError('');setActionError('');void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},5000);return()=>{life.current++;clearInterval(timer);if(receipt.current)void api?.discard?.(receipt.current).catch(()=>{});receipt.current=null}},[identity,api])
 const operate=async(action:(valid:()=>boolean)=>Promise<void>)=>{if(pending.current)return;const epoch=life.current,valid=()=>epoch===life.current;readSequence.current++;pending.current=true;setBusy(true);setError('');setActionError('');try{await action(valid)}catch{if(valid())setActionError('后台计划操作未完成，请重新读取。')}finally{if(valid()){readSequence.current++;pending.current=false;setBusy(false)}}}
 if(!api)return null
 return <section className="visual-ai-panel background-analysis-panel" aria-label={assetId?'素材后台分析计划':'后台基础分析计划'}><header><strong>后台基础分析计划</strong><button disabled={busy} onClick={()=>void operate(async()=>{await load(true)})}>重新读取计划</button></header>
 <p>基础能力独立派发。旧计划不会自动取得执行许可，首次运行请核对持续规则。</p>
 {view&&<><p>{view.value.policy.enabled?'已启用新素材计划':'新素材计划未启用'} · 不自动补扫历史库</p>
 <BackgroundExecutionPanel scope={view.scope} view={view.value} changed={()=>void load(true)}/>
 {!assetId&&view.value.canConfigure&&draft&&<><label><input type="checkbox" style={{display:'inline-block',width:'auto',margin:'0 6px 0 0',accentColor:'var(--ui-text)'}} aria-label="收集新素材分析计划" checked={draft.enabled} disabled={busy} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>收集新素材分析计划</label><div className="visual-ai-actions">{BASIC_CAPABILITIES.map(cap=><label key={cap}><input type="checkbox" style={{display:'inline-block',width:'auto',margin:'0 6px 0 0',accentColor:'var(--ui-text)'}} aria-label={`计划能力 ${names[cap]}`} checked={draft.capabilities[cap]} disabled={busy} onChange={e=>setDraft({...draft,capabilities:{...draft.capabilities,[cap]:e.target.checked}})}/>{names[cap]}</label>)}</div><button disabled={busy} onClick={()=>void operate(async valid=>{const r=await api.prepare({...view.scope,enabled:draft.enabled,capabilities:draft.capabilities,expectedRevision:draft.revision});if(!valid()){if(r.ok)void api.discard(r.value.receipt).catch(()=>{});return}if(r.ok){receipt.current=r.value.receipt;setReview(r.value)}else setActionError(r.error)})}>保存新素材计划设置</button></>}
 {review&&<div className="visual-ai-review" role="region" aria-label="确认后台计划设置"><p>{review.notice}</p><div className="visual-ai-actions"><button disabled={busy} onClick={()=>{const id=review.receipt;receipt.current=null;setReview(null);void api.discard(id).catch(()=>{})}}>取消设置</button><button disabled={busy} onClick={()=>void operate(async valid=>{const r=await api.confirm(review.receipt);if(!valid())return;readSequence.current++;receipt.current=null;setReview(null);if(r.ok){adopt({...view,value:r.value});setDraft(r.value.policy)}else setActionError(r.error)})}>确认保存后台计划</button></div></div>}
 {!assetId&&<div className="visual-ai-result">{view.value.counts.length?view.value.counts.map(row=><p key={row.capability+row.state}>{names[row.capability]} · {states[row.state]} · {row.count}</p>):<p>尚无后台计划。</p>}</div>}
 {assetId&&<div className="visual-ai-result">{!view.value.intents.length&&<p>此素材没有后台计划；启用设置不会补建历史任务。</p>}{view.value.intents.map(item=><div key={item.id}><p>{names[item.capability]} · {states[item.state]}</p><div className="visual-ai-actions">{(['pause','resume','cancel']as const).map(action=><button key={action} aria-label={`${action==='pause'?'暂停':action==='resume'?'恢复':'取消'}${names[item.capability]}计划`} disabled={busy||['cancelled','superseded','waiting-asset'].includes(item.state)||(action==='resume'&&item.state!=='user-paused')} onClick={()=>void operate(async valid=>{const r=await api.change({...view.scope,assetId,id:item.id,sessionToken:view.value.sessionToken,expectedRevision:item.revision,action});if(valid()){readSequence.current++;if(r.ok)adopt({...view,value:r.value});else setActionError(r.error)}})}>{action==='pause'?'暂停':action==='resume'?'恢复':'取消'}</button>)}</div></div>)}</div>}
 <details><summary>准入证据与等待原因</summary><p>{view.value.availableMemoryMiB===null?'可用内存未知':`系统空闲内存约 ${view.value.availableMemoryMiB} MiB；不代表模型可用预算。`}</p>{view.value.resourceReasons.map(reason=><p key={reason}>{reasons[reason]??'执行资格尚未验证'}</p>)}</details>
 </>}{(error||actionError)&&<p role="alert">{error||actionError}</p>}
 </section>
}
