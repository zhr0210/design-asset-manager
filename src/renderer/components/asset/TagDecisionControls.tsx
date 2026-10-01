import React,{useEffect,useRef,useState} from 'react'
import {Check,X} from 'lucide-react'
import type {TagIntentScope} from '../../../shared/contracts/independent-tag-intent.contract'
import type {TagCurrentSummary,TagExecutionSnapshot} from '../../../shared/contracts/tag-execution.contract'
import type {TagDecisionApi,TagDecisionReview,TagDecision} from '../../../shared/contracts/tag-decision.contract'

/** The same source-bound choice controls are used in the Inspector and native card. */
export default function TagDecisionControls({scope,summary,onUpdated}:{scope:TagIntentScope;summary:TagCurrentSummary;onUpdated?(snapshot:TagExecutionSnapshot):void}){
 const bridge=window as unknown as {tagDecisionsAPI?:TagDecisionApi;electronAPI?:{tagDecisions?:TagDecisionApi}},api=bridge.tagDecisionsAPI??bridge.electronAPI?.tagDecisions
 const identity=JSON.stringify([scope,summary.evidenceId]),current=useRef(identity);current.current=identity
 const [shown,setShown]=useState(summary),[review,setReview]=useState<TagDecisionReview|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const operation=useRef(0),pending=useRef(false),receipt=useRef<string|null>(null),alive=useRef(true)
 useEffect(()=>{alive.current=true;pending.current=false;setBusy(false);setShown(summary);setReview(null);setMessage('');return()=>{operation.current++;alive.current=false;if(receipt.current){void api?.discard(receipt.current).catch(()=>{});receipt.current=null}}},[identity,api])
 useEffect(()=>setShown(summary),[summary])
 const consume=async(r:TagDecisionReview,valid:()=>boolean)=>{
  const result=await api!.confirm(r.receipt)
  if(!valid())return
  if(receipt.current===r.receipt)receipt.current=null
  setReview(null)
  if(result.ok){if(result.value.current)setShown(result.value.current);setMessage(r.decision==='confirm'?'标签已确认。':'该内容的同类建议已隐藏。');onUpdated?.(result.value)}else setMessage(result.error)
 }
 const operate=async(action:(valid:()=>boolean)=>Promise<void>)=>{
  if(pending.current)return
  const version=++operation.current,valid=()=>alive.current&&current.current===identity&&operation.current===version
  pending.current=true;setBusy(true);setMessage('')
  try{await action(valid)}catch{if(valid())setMessage('选择未完成，请重新读取后核对。')}
  finally{if(valid()){pending.current=false;setBusy(false)}}
 }
 const choose=(tag:string,decision:TagDecision)=>void operate(async valid=>{
  const r=await api!.prepare({...scope,evidenceId:shown.evidenceId,tag,decision})
  if(!valid()){if(r.ok)void api!.discard(r.value.receipt).catch(()=>{});return}
  if(!r.ok){setMessage(r.error);return}
  receipt.current=r.value.receipt
  if(r.value.requiresUpgrade)setReview(r.value);else await consume(r.value,valid)
 })
 if(!api)return <div className="tags">{shown.pendingTags.map(tag=><span className="detail-tag" key={tag}>{tag}</span>)}</div>
 return <div aria-label="AI 标签选择"><div className="tags">{shown.pendingTags.map(tag=><span className="visual-ai-actions" key={tag}><button className="detail-tag" disabled={busy} aria-label={`确认 AI 标签 ${tag}`} onClick={()=>choose(tag,'confirm')}><Check size={12}/>{tag}</button><button className="detail-tag" disabled={busy} aria-label={`拒绝 AI 标签 ${tag}`} onClick={()=>choose(tag,'reject')}><X size={12}/></button></span>)}</div>
  {review&&<div className="visual-ai-review" role="region" aria-label="确认保存标签选择"><strong>隐藏建议“{review.tag}”</strong><p>{review.storageNotice}</p><div className="visual-ai-actions"><button disabled={busy} onClick={()=>{const value=review.receipt;receipt.current=null;setReview(null);void api.discard(value).catch(()=>{})}}>取消选择</button><button disabled={busy} onClick={()=>void operate(valid=>consume(review,valid))}>确认隐藏建议</button></div></div>}
  {message&&<p role="status">{message}</p>}
 </div>
}
