import { getWorkspaceClient } from '../../workspace-client'
import TagDecisionControls from './TagDecisionControls'
import React,{useEffect,useRef,useState} from 'react'
import type {TagIntentApi,TagIntentReview,TagIntentSummary} from '../../../shared/contracts/independent-tag-intent.contract'
import type {TagExecutionApi,TagRunReview,TagRunJob,TagExecutionSnapshot} from '../../../shared/contracts/tag-execution.contract'
import type {VisualAiScope} from '../../../shared/contracts/visual-ai.contract'

/** Shared Main/card surface. Persistence confirmation and network execution confirmation are distinct. */
export default function IndependentTagIntentPanel({scope,assetId,backendId,model,onActivityChange,onCurrentTagSource,onPendingTags}:{
 scope:VisualAiScope;assetId:string;backendId:string;model:string
 onPendingTags?(tags:string[]|undefined):void;onActivityChange?(active:boolean):void;onCurrentTagSource?(source:string|null|undefined):void
}){
 const bridge=window as unknown as {independentTagsAPI?:TagIntentApi;tagExecutionAPI?:TagExecutionApi;damClient?:{independentTags?:TagIntentApi;tagExecution?:TagExecutionApi}}
 const api=bridge.independentTagsAPI??getWorkspaceClient()?.independentTags,execution=bridge.tagExecutionAPI??getWorkspaceClient()?.tagExecution
 const identity=JSON.stringify([scope,assetId,backendId,model]),current=useRef(identity);current.current=identity
 const executionReceipt=useRef<string|null>(null)
 const requestId=useRef(''),pending=useRef(false),alive=useRef(true),lifecycle=useRef(0)
 const isCurrent=(version:number)=>alive.current&&current.current===identity&&lifecycle.current===version
 const [review,setReview]=useState<TagIntentReview|null>(null),[requests,setRequests]=useState<TagIntentSummary[]>([])
 const [runReview,setRunReview]=useState<TagRunReview|null>(null),[job,setJob]=useState<TagRunJob|null>(null),[snapshot,setSnapshot]=useState<TagExecutionSnapshot|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const running=job?.state==='queued'||job?.state==='running'
 const applySnapshot=(value:TagExecutionSnapshot)=>{setSnapshot(value);onPendingTags?.(value.schemaVersion>=10?value.current?.pendingTags??[]:undefined);onCurrentTagSource?.(value.schemaVersion>=10?value.current?.originalVisualEvidenceId??null:undefined);if(value.activeJobs?.length)setJob(value.activeJobs[0])}
 const refresh=async(fence?:()=>boolean)=>{
  const version=lifecycle.current,valid=()=>isCurrent(version)&&(!fence||fence())
  if(!api)return
  const saved=await api.read({...scope,assetId})
  if(!valid())return
  if(saved.ok)setRequests(saved.value.requests);else setError(saved.error)
  if(execution){const result=await execution.read({...scope,assetId});if(valid()){if(result.ok)applySnapshot(result.value);else setError(result.error)}}
 }
 useEffect(()=>{
  lifecycle.current++;const version=lifecycle.current,valid=()=>isCurrent(version)
  alive.current=true;pending.current=false;requestId.current=crypto.randomUUID();setReview(null);setRunReview(null);setJob(null);setSnapshot(null);setRequests([]);setBusy(false);setError('');onCurrentTagSource?.(undefined);onPendingTags?.(undefined)
  void refresh(valid).catch(()=>{if(valid())setError('标签任务读取失败，请重试。')})
  return()=>{lifecycle.current++;alive.current=false;if(executionReceipt.current){void execution?.discardReview(executionReceipt.current).catch(()=>{});executionReceipt.current=null}}
 },[api,execution,identity])
 useEffect(()=>execution?.onChanged(changed=>{if(!changed||typeof changed!=='object')return;const event=changed as {libraryIdentity?:string;generation?:string;assetId?:string};if(event.libraryIdentity===scope.libraryIdentity&&event.generation===scope.generation&&event.assetId===assetId)void refresh().catch(()=>{})}),[execution,identity])
 useEffect(()=>{onActivityChange?.(busy||running);return()=>onActivityChange?.(false)},[busy,running,onActivityChange])
 useEffect(()=>{
  if(!running||!job||!execution)return
  let disposed=false,timer:ReturnType<typeof setTimeout>
  const poll=async()=>{
   try{const result=await execution.inspect(job.id);if(disposed)return
    if(!result.ok){setError(result.error);setJob(null);return}
    setJob(result.value)
    if(!['queued','running'].includes(result.value.state)){await refresh();return}
   }catch{if(!disposed)setError('标签状态读取暂不可用，正在重试。')}
   if(!disposed)timer=setTimeout(poll,300)
  }
  timer=setTimeout(poll,100);return()=>{disposed=true;clearTimeout(timer)}
 },[running,job?.id,execution,identity])
 const operate=async(action:(valid:()=>boolean)=>Promise<void>)=>{
  if(pending.current)return
  const version=lifecycle.current,valid=()=>isCurrent(version)
  pending.current=true;setBusy(true);setError('')
  try{await action(valid)}catch{if(valid())setError('标签任务操作未完成，请重新读取后核对。')}
  finally{if(valid()){pending.current=false;setBusy(false)}}
 }
 if(!api)return null
 const states=new Map(snapshot?.jobs.map(j=>[j.requestId,j.state])??[])
 const labels:Record<string,string>={'waiting-execution':'任务已保存，待运行',queued:'等待资源',running:'标签分析中',succeeded:'标签已保存',failed:'未完成，保留原结果',cancelled:'已取消','outcome-unknown':'远端状态未知，不会自动重发',paused:'已暂停',superseded:'已被较新请求取代'}
 return <div className="visual-ai-intents" aria-label="独立标签任务">
  <div className="visual-ai-actions"><button type="button" disabled={busy||running||!backendId||!model.trim()} onClick={()=>void operate(async valid=>{
   const r=await api.prepare({...scope,assetId,backendId,model,requestId:requestId.current});if(!valid())return
   if(r.ok)setReview(r.value);else setError(r.error)
  })}>保存独立标签任务</button><button type="button" disabled={busy} onClick={()=>void operate(refresh)}>重新读取任务</button></div>
  {review&&<div className="visual-ai-review" role="region" aria-label="确认保存标签任务"><strong>确认保存标签任务</strong><p>{review.backendName} · {review.model}</p><p>{review.storageNotice}</p>
   <div className="visual-ai-actions"><button type="button" disabled={busy} onClick={()=>setReview(null)}>取消保存</button><button type="button" disabled={busy} onClick={()=>void operate(async valid=>{
    const r=await api.confirm(review.receipt);if(!valid())return
    if(r.ok){setReview(null);await refresh(valid)}else setError(r.error)
   })}>确认保存任务</button></div></div>}
  {runReview&&<div className="visual-ai-review" role="region" aria-label="确认标签执行范围"><strong>{runReview.alreadySucceeded?'结果已保存':runReview.location==='external'?'确认发送到外部服务':'确认独立标签分析'}</strong><p>{runReview.backendName} · {runReview.providerOrigin}</p><p>{runReview.model}</p><p>{runReview.inputDescription}</p><p>{runReview.storageNotice}</p>
   <div className="visual-ai-actions"><button type="button" disabled={busy} onClick={()=>{const receipt=runReview.receipt;executionReceipt.current=null;setRunReview(null);void execution?.discardReview(receipt).catch(()=>{})}}>取消运行</button><button type="button" disabled={busy} onClick={()=>void operate(async valid=>{
    const r=await execution!.run(runReview.receipt);if(!valid())return
    if(r.ok){executionReceipt.current=null;setJob(r.value);setRunReview(null);if(r.value.state==='succeeded')await refresh(valid)}else setError(r.error)
   })}>{runReview.alreadySucceeded?'读取已保存结果':runReview.location==='external'?'同意发送并运行标签':'确认运行标签'}</button></div></div>}
  {busy&&<p role="status">正在处理标签任务…</p>}{error&&<p role="alert">{error}</p>}
  {job&&<div className="visual-ai-job" role="status"><span>{labels[job.state]}</span>{running&&<button type="button" disabled={busy} onClick={()=>void operate(async valid=>{const r=await execution!.cancel(job.id);if(valid()){if(r.ok)setJob(r.value);else setError(r.error)}})}>取消标签分析</button>}{job.error&&<p>{job.error}</p>}</div>}
  {requests.map(r=>{const state=job?.requestId===r.requestId?job.state:states.get(r.requestId)??r.state;return <div className="visual-ai-job" role="status" key={r.requestId}><span>{r.sourceMatches?labels[state]:'素材已变化，请重新确认'} · {r.model}</span>
   {execution&&r.sourceMatches&&!['running','queued','outcome-unknown','superseded','succeeded'].includes(state)&&<button type="button" disabled={busy||running} onClick={()=>void operate(async valid=>{
    const result=await execution.prepare({...scope,assetId,requestId:r.requestId});if(!valid()){if(result.ok)void execution.discardReview(result.value.receipt).catch(()=>{});return}
    if(result.ok){executionReceipt.current=result.value.receipt;setRunReview(result.value)}else setError(result.error)
   })}>分析标签</button>}
  </div>})}
  {snapshot?.current&&<article className="visual-ai-result" aria-label="当前标签建议"><small>{snapshot.current.model} · 标签建议 · 受控预览</small><TagDecisionControls scope={{...scope,assetId}} summary={snapshot.current} onUpdated={applySnapshot}/>{snapshot.current.tags.length===0&&<p>{snapshot.current.observedTagCount===0?'本次返回有效空标签':'本次建议已隐藏。'}</p>}</article>}
 </div>
}
