import React,{useEffect,useRef,useState} from 'react'
import type {WorkScope,WorkWindowApi} from '../../../../shared/contracts/work-set.contract'
import type {WorkHandoffReceipt} from '../../../../shared/contracts/work-media.contract'

/** A ZIP is its own deliverable; it must not replace a member's image drag receipt. */
export function WorkArchivePanel({api,token,scope,setId,assetIds,inputKey,onBusy}:{api:WorkWindowApi;token:string;scope:WorkScope;setId:string;assetIds:string[];inputKey:string;onBusy:(busy:boolean)=>void}){
 const key=JSON.stringify([token,scope.libraryIdentity,scope.generation,setId,assetIds,inputKey]),current=useRef(key);current.current=key
 const live=useRef(true),pending=useRef(false),cache=useRef(new Map<string,WorkHandoffReceipt>()),unknown=useRef(new Set<string>())
 const [receipt,setReceipt]=useState<WorkHandoffReceipt|null>(null),[busy,setBusy]=useState(false),[cancelBusy,setCancelBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{live.current=true;return()=>{live.current=false;onBusy(false)}},[onBusy])
 useEffect(()=>{setReceipt(cache.current.get(key)||null);setError(unknown.current.has(key)?'上一份归档结果未确认，请先在交付历史核对，不能自动重复创建。':'');setMessage('')},[key])
 const prepare=async()=>{
  if(pending.current||!assetIds.length||assetIds.length>64||unknown.current.has(key))return
  const held=key,cached=cache.current.get(key);if(cached){setReceipt(cached);return}
  pending.current=true;setBusy(true);onBusy(true);setError('');setMessage('')
  try{
   const reply=await api.fileHandoff({token,request:{...scope,setId,assetId:assetIds[0],assetIds:[...assetIds],kind:'zip',action:'prepare'}})
   if(!live.current||current.current!==held)return
   if(!reply.success){setError(reply.error);return}
   cache.current.set(held,reply.value);setReceipt(reply.value)
  }catch{unknown.current.add(held);if(live.current&&current.current===held)setError('归档结果未确认；请在资料库工作集的交付历史核对，暂不重复创建。')}
  finally{pending.current=false;if(live.current){setBusy(false);onBusy(false)}}
 }
 return <section className="work-archive-panel" aria-label="ZIP 归档"><h3>ZIP 归档</h3><p>按参考顺序归档 {assetIds.length} 份原件副本。未加密；原件保持。每批最多64份，输入及输出各不超过96 MiB。</p>
  <button disabled={busy||!assetIds.length||assetIds.length>64||unknown.current.has(key)} onClick={()=>void prepare()}>{busy?'正在准备 ZIP…':'准备 ZIP 归档'}</button>
  {busy&&<button disabled={cancelBusy} onClick={()=>{setCancelBusy(true);setMessage('正在等待取消与当前操作收尾…');void api.mediaCancel({token}).then(reply=>{if(!live.current)return;if(!reply.success)setError(reply.error);else setMessage(reply.value.message)}).catch(()=>{if(live.current)setError('取消结果未确认，仍在等待当前归档结果。')}).finally(()=>{if(live.current)setCancelBusy(false)})}}>{cancelBusy?'正在确认取消…':'取消 ZIP 准备'}</button>}
  {receipt&&<div role="status"><p>{receipt.fileName} · {receipt.archive?.count} 项 · {(receipt.bytes/1024).toFixed(1)} KiB</p><p>{receipt.message}</p><button draggable onDragStart={event=>{event.preventDefault();void api.dragFile({token,id:receipt.id}).then(reply=>{if(!live.current||current.current!==key)return;if(!reply.success)setError(reply.error);else setMessage(reply.value?.message||'交接结果未确认，请在接收应用核对。')}).catch(()=>{if(live.current)setError('原生交接结果未确认；归档仍保留，请重试拖动。')})}}>拖动 ZIP 到接收应用</button><ul>{receipt.archive?.items.map(item=><li key={item.fileName}>{item.fileName}</li>)}</ul></div>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>
}
