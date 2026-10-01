import type {TagRecoveryApi,TagRecoveryBatch} from '../../../shared/contracts/tag-recovery.contract'
import React,{useEffect,useRef,useState} from 'react'
import type {TagBatchApi,TagBatchScope,TagBatchReview,TagBatchJob} from '../../../shared/contracts/tag-batch.contract'
export default function TagBatchPanel({scope,assetIds,backendId,model,onActivityChange,onChanged}:{scope:TagBatchScope;assetIds:string[];backendId:string;model:string;onActivityChange?(busy:boolean):void;onChanged?():void}){
 const bridge=window as unknown as {tagBatchesAPI?:TagBatchApi;tagRecoveryAPI?:TagRecoveryApi;electronAPI?:{tagBatches?:TagBatchApi;tagRecovery?:TagRecoveryApi}},api=bridge.tagBatchesAPI??bridge.electronAPI?.tagBatches,recovery=bridge.tagRecoveryAPI??bridge.electronAPI?.tagRecovery
 const identity=JSON.stringify([scope,[...assetIds].sort(),backendId,model]),epoch=useRef(0),receipt=useRef<string|null>(null),pending=useRef(false),requestId=useRef('')
 const [review,setReview]=useState<TagBatchReview|null>(null),[job,setJob]=useState<TagBatchJob|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [saved,setSaved]=useState<TagRecoveryBatch[]>([]),[receiptMessage,setReceiptMessage]=useState('')
 const refreshRecovery=async()=>{if(!recovery||assetIds.length<1||assetIds.length>8)return;const version=epoch.current,r=await recovery.list({...scope,assetIds});if(version===epoch.current&&r.ok)setSaved(r.value)}
 const running=job&&['queued','running'].includes(job.state)
 useEffect(()=>{epoch.current++;pending.current=false;requestId.current=crypto.randomUUID();setReview(null);setJob(null);setBusy(false);setError('');setSaved([]);setReceiptMessage('');void refreshRecovery().catch(()=>{});return()=>{epoch.current++;if(receipt.current){void api?.discard(receipt.current).catch(()=>{});receipt.current=null}}},[identity,api,recovery])
 useEffect(()=>{onActivityChange?.(Boolean(busy||running));return()=>onActivityChange?.(false)},[busy,running,onActivityChange])
 useEffect(()=>{
  if(!api||!job||!running)return
  let stopped=false,timer:ReturnType<typeof setTimeout>
  const poll=async()=>{try{const r=await api.inspect(job.id);if(stopped)return;if(!r.ok){setError(r.error);setJob(null);return}setJob(r.value);if(!['queued','running'].includes(r.value.state)){onChanged?.();void refreshRecovery().catch(()=>{});return}}catch{if(!stopped)setError('批次状态读取暂不可用。')}if(!stopped)timer=setTimeout(poll,200)}
  timer=setTimeout(poll,50);return()=>{stopped=true;clearTimeout(timer)}
 },[api,job?.id,running,identity])
 const operate=async(action:(valid:()=>boolean)=>Promise<void>)=>{if(pending.current)return;const version=epoch.current,valid=()=>version===epoch.current;pending.current=true;setBusy(true);setError('');try{await action(valid)}catch{if(valid())setError('标签批次未完成，请重新检查。')}finally{if(valid()){pending.current=false;setBusy(false)}}}
 const prepare=(forceRerun:boolean)=>void operate(async valid=>{
  if(forceRerun)requestId.current=crypto.randomUUID()
  const r=await api!.prepare({...scope,assetIds,backendId,model,requestId:requestId.current,forceRerun})
  if(!valid()){if(r.ok)void api!.discard(r.value.receipt).catch(()=>{});return}if(r.ok){receipt.current=r.value.receipt;setReview(r.value)}else setError(r.error)
 })
 if(!api)return null
 const labels:Record<string,string>={'waiting-execution':'等待',queued:'等待资源',running:'分析中',succeeded:'已保存',failed:'失败，保留原结果',cancelled:'已取消','outcome-unknown':'远端状态未知，待核对',superseded:'已被新请求取代',paused:'已暂停'}
 return <section aria-label="批量标签分析"><div className="visual-ai-actions"><button disabled={busy||Boolean(running)||!backendId||!model.trim()||assetIds.length<1||assetIds.length>8} onClick={()=>prepare(false)}>分析所选 {assetIds.length} 个素材的标签</button><button disabled={busy||Boolean(running)||!backendId||!model.trim()||assetIds.length<1||assetIds.length>8} onClick={()=>prepare(true)}>强制重新分析标签</button></div>
 {review&&<div className="visual-ai-review" role="region" aria-label="确认批量标签范围"><strong>{review.forceRerun?'确认强制重跑标签':'确认标签批次'}</strong><p>{review.backendName} · {review.providerOrigin} · {review.model}</p><p>{review.assets.map(a=>a.title).join('、')}</p><p>{review.inputDescription}</p>{review.resumeSummary&&<p>{review.resumeSummary}</p>}<p>{review.storageNotice}</p><div className="visual-ai-actions"><button disabled={busy} onClick={()=>{const id=review.receipt;receipt.current=null;setReview(null);void api.discard(id).catch(()=>{})}}>取消批次</button><button disabled={busy} onClick={()=>void operate(async valid=>{const r=await api.run(review.receipt);if(!valid())return;receipt.current=null;setReview(null);if(r.ok)setJob(r.value);else setError(r.error)})}>{review.location==='external'?'同意发送并运行批次':'确认运行标签批次'}</button></div></div>}
 {job&&<div className="visual-ai-result" aria-label="标签批次进度" role="status"><span>{running?'批次处理中':job.state==='completed'?'批次完成':job.state==='partial'?'批次部分完成':job.state==='cancelled'?'批次已取消':'批次未完成'} · {job.items.filter(i=>i.state==='succeeded').length}/{job.items.length}</span>{running&&<button disabled={busy} onClick={()=>void operate(async valid=>{const r=await api.cancel(job.id);if(valid()){if(r.ok)setJob(r.value);else setError(r.error)}})}>取消标签批次</button>}{job.items.map(item=><p key={item.assetId}>{item.title} · {labels[item.state]}{item.error&&` · ${item.error}`}</p>)}{job.error&&<p>{job.error}</p>}</div>}
 {recovery&&<details aria-label="已保存标签任务"><summary>已保存标签任务 · {saved.length} 批</summary><button disabled={busy||Boolean(running)} onClick={()=>void operate(async()=>{await refreshRecovery()})}>刷新已保存任务</button>
  {saved.map(batch=><article key={batch.requestId} className="visual-ai-result"><small>{batch.model} · {batch.items.length} 个素材</small>{batch.items.map(item=><p key={item.assetId}>{item.title} · {labels[item.state]}{!item.sourceMatches&&' · 素材已变化'}{item.hasReceipt&&<button disabled={busy} aria-label={`核对已保存结果 ${item.title}`} onClick={()=>void operate(async valid=>{const r=await recovery.receipt({...scope,assetId:item.assetId,requestId:batch.requestId});if(valid())setReceiptMessage(r.ok&&r.value.receipt?(r.value.isCurrent?'已核验当前已保存结果。':'已核验历史保存记录，当前结果来自其他任务。'):'保存记录暂不可用，请刷新核对。')})}>核对结果</button>}</p>)}
   <button disabled={busy||Boolean(running)||batch.items.some(i=>!i.sourceMatches)||!batch.items.some(i=>i.isLatest&&['waiting-execution','paused','failed','cancelled'].includes(i.state))} onClick={()=>void operate(async valid=>{const r=await recovery.prepare({...scope,assetIds,requestId:batch.requestId});if(!valid()){if(r.ok)void api.discard(r.value.receipt).catch(()=>{});return}if(r.ok){receipt.current=r.value.receipt;setReview(r.value)}else setError(r.error)})}>重新审阅未完成任务</button>
  </article>)}{receiptMessage&&<p role="status">{receiptMessage}</p>}
 </details>}
 {error&&<p role="alert">{error}</p>}
 </section>
}
