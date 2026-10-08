import { getWorkspaceClient } from '../../../workspace-client'
import {ocrDraftKey,getOcrDraft,holdOcrDraft,discardOcrDraft,restoreOcrDraft,updateOcrDraftMismatch,adoptOcrDraftBaseline} from './ocr-drafts'
import { recoveredWorkspaceDraft } from '../../../workspace-drafts'
import React,{useEffect,useRef,useState} from 'react'
import {Copy,ScanText} from 'lucide-react'
import type {Asset} from '../../../stores/asset.store'
import {ocrText,type OcrApi,type OcrScope,type OcrSnapshot,type OcrStatus,type OcrReview} from '../../../../shared/contracts/asset-ocr.contract'
export function DedicatedOcrPanel({asset,scope,assetIds}:{asset:Asset;scope:OcrScope;assetIds?:string[]}){
 const api=getWorkspaceClient()?.assetOcr as OcrApi | undefined
 const draftKey=ocrDraftKey(scope),retained=getOcrDraft(draftKey)
 const [snapshot,setSnapshot]=useState<OcrSnapshot|null>(retained?.snapshot??null),[status,setStatus]=useState<OcrStatus|null>(null),[review,setReview]=useState<OcrReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[statusError,setStatusError]=useState(''),[message,setMessage]=useState(''),[editing,setEditing]=useState(!!retained),[draft,setDraft]=useState(retained?.text??''),[recoveryMismatch,setRecoveryMismatch]=useState(retained?.mismatch??false)
 const life=useRef(0),readSequence=useRef(0),statusSequence=useRef(0),pending=useRef(false),snapshotRef=useRef(snapshot),dirtyRef=useRef(false),draftRef=useRef(draft);snapshotRef.current=snapshot;draftRef.current=draft
 const base=snapshot?.editedText??(snapshot?.evidence?ocrText(snapshot.evidence.observation):'')
 dirtyRef.current=editing&&(recoveryMismatch||draft!==base)
 const running=status?.job?.state==='running',ids=assetIds?.length?assetIds:[asset.id]
 const read=async()=>{
  if(!api)return;const version=life.current,request=++readSequence.current
  try{
   const r=await api.read(scope);if(version!==life.current||request!==readSequence.current)return;if(!r.ok){setError(r.error);return}
   if(dirtyRef.current){
    const mismatch=getOcrDraft(draftKey)?updateOcrDraftMismatch(draftKey,r.value):snapshotRef.current?.revision!==r.value.revision||snapshotRef.current?.evidence?.id!==r.value.evidence?.id
    setRecoveryMismatch(mismatch)
    if(mismatch)setMessage('识别结果已更新，修订草稿已保留。请核对后明确采用当前版本。')
    return
   }
   const recovered=recoveredWorkspaceDraft({...scope,kind:'ocr',entityId:scope.assetId})
   if(recovered){
    const originalBase=recovered.base as {revision:number;evidenceId?:string}
    restoreOcrDraft(draftKey,r.value,String(recovered.value),originalBase)
    const mismatch=getOcrDraft(draftKey)!.mismatch
    setSnapshot({...r.value,revision:originalBase.revision});setDraft(String(recovered.value));setEditing(true);setRecoveryMismatch(mismatch)
    if(mismatch)setError('识别版本已变化，恢复文字仍保留。请核对当前文字，再明确采用新版本。')
   }else{setSnapshot(r.value);setDraft(r.value.editedText??(r.value.evidence?ocrText(r.value.evidence.observation):''))}
  }catch{if(version===life.current&&request===readSequence.current)setError('OCR 结果暂时无法读取，请重试。')}
 }
 const loadStatus=async()=>{if(!api)return;const version=life.current,request=++statusSequence.current;try{const r=await api.status();if(version!==life.current||request!==statusSequence.current)return;if(r.ok){setStatus(r.value);setStatusError('')}else setStatusError(r.error)}catch{if(version===life.current&&request===statusSequence.current)setStatusError('无法读取本地 OCR 状态。')}}
 useEffect(()=>{life.current++;void read();void loadStatus();const stop=api?.onChanged(event=>{if(event.libraryIdentity===scope.libraryIdentity&&event.generation===scope.generation&&event.assetId===scope.assetId)void read()}),stopRuntime=api?.onRuntimeChanged?.(()=>{void loadStatus()});return()=>{life.current++;statusSequence.current++;stop?.();stopRuntime?.()}},[api,scope.libraryIdentity,scope.generation,scope.assetId])
 useEffect(()=>{if(!running)return;let stopped=false;const poll=async()=>{await loadStatus();if(!stopped)timer=setTimeout(()=>void poll(),600)};let timer=setTimeout(()=>void poll(),600);return()=>{stopped=true;clearTimeout(timer)}},[running,api])
 useEffect(()=>{setReview(null)},[ids.join('|')])
 const act=async(operation:()=>Promise<void>)=>{if(pending.current)return;const version=life.current;pending.current=true;++readSequence.current;setBusy(true);setError('');setMessage('');try{await operation()}catch(e){if(version===life.current)setError(e instanceof Error?e.message:'OCR 操作未完成，请重试。')}finally{if(version===life.current){pending.current=false;setBusy(false)}}}
 const accept=<T,>(r:{ok:true;value:T}|{ok:false;error:string})=>{if(!r.ok)throw Error(r.error);return r.value}
 const currentText=asset.ocr?.text??asset.aiOcrText??''
 return <section className="detail-section dedicated-ocr" aria-label="专用文字识别">
  <h3><ScanText size={15}/>画面文字</h3>
  {asset.ocr?<><small className="subtle ai-provenance">专用 OCR · 受控预览 · {asset.ocr.edited?'已修订':'识别结果'} · {asset.ocr.blockCount} 个文字区域</small>{currentText?<p className="ocr-content">{currentText}</p>:<p className="subtle">{asset.ocr.edited?'文字已修订为空。':'当前预览未检出文字。'}</p>}</>:currentText?<><small className="subtle">视觉模型文字推测 · 尚未经专用 OCR 核验</small><p className="ocr-content">{currentText}</p></>:<p className="subtle">尚无专用 OCR 结果。</p>}
  {api?<>
   <div className="ocr-actions"><button disabled={busy||running||!status?.configured||ids.length>8||editing} onClick={()=>void act(async()=>{const version=life.current;const value=accept(await api.prepare({libraryIdentity:scope.libraryIdentity,generation:scope.generation,assetIds:ids}));if(version===life.current)setReview(value)})}>{asset.ocr?'重新识别文字':`识别文字${ids.length>1?`（${ids.length} 份）`:''}`}</button><button disabled={busy||running} onClick={()=>void act(async()=>{const version=life.current,request=++statusSequence.current;const value=accept(await api.configure());if(version===life.current&&request===statusSequence.current)setStatus(value)})}>选择本地 OCR 环境</button></div>
   {!status?.configured&&<small className="subtle">选择已安装且可信的 OCR 环境；识别时会运行其中的 Python。本入口不会自动下载。</small>}
   {ids.length>8&&<p className="subtle">每批最多 8 份素材，请缩小选择范围。</p>}
   {review&&<div className="ocr-review" role="region" aria-label="确认本地 OCR"><p>{review.runtimeLabel} · {review.count} 份素材，仅处理最长边 1600 像素的受控预览，不外发图片。</p>{review.requiresUpgrade&&<p>首次保存将当前素材库升级到 v8，旧版应用可能无法打开；取消不会升级。</p>}<button disabled={busy} onClick={()=>setReview(null)}>取消识别</button><button disabled={busy} onClick={()=>void act(async()=>{const version=life.current;const job=accept(await api.run(review.receipt));if(version===life.current){++statusSequence.current;setReview(null);setStatus(v=>v?{...v,job}:null)}})}>确认识别并保存</button></div>}
   {status?.job&&(running||status.job.items.some(i=>i.assetId===asset.id))&&<div role="status" className="ocr-job"><span>{running?'OCR 识别中':({completed:'OCR 识别完成',partial:'OCR 部分完成',failed:'OCR 识别失败',cancelled:'OCR 已取消'} as const)[status.job.state as Exclude<typeof status.job.state,'running'>]} · {status.job.items.filter(i=>i.state==='completed').length}/{status.job.items.length}</span>{running&&<button disabled={busy} onClick={()=>void act(async()=>{accept(await api.cancel());await loadStatus()})}>取消 OCR 批次</button>}{status.job.items.filter(i=>i.error).map(i=><p key={i.assetId}>{i.error}</p>)}</div>}
   {snapshot?.evidence&&!editing&&<div className="ocr-actions"><button disabled={busy||running} onClick={()=>{setDraft(base);setEditing(true)}}>修订识别文字</button>{currentText&&<button onClick={()=>void act(async()=>{await navigator.clipboard.writeText(currentText);setMessage('已复制识别文字')})}><Copy size={12}/>复制文字</button>}</div>}
   {editing&&snapshot&&<div className="ocr-editor"><textarea aria-label="修订识别文字" maxLength={16000} value={draft} onChange={e=>{draftRef.current=e.target.value;setDraft(e.target.value);if(e.target.value===base&&!recoveryMismatch)discardOcrDraft(draftKey);else holdOcrDraft(draftKey,snapshot,e.target.value)}}/>{recoveryMismatch&&<button disabled={busy} onClick={()=>void act(async()=>{const version=life.current,request=++readSequence.current;const latest=accept(await api.read(scope));if(version!==life.current)return;if(request!==readSequence.current)throw Error('读取期间识别结果有变化，文字仍保留。请重新核对当前版本。');if(!latest.evidence)throw Error('当前没有可用识别结果，请先取消修订并重新识别。');++readSequence.current;snapshotRef.current=latest;setSnapshot(latest);setRecoveryMismatch(false);adoptOcrDraftBaseline(draftKey,latest,draftRef.current);setMessage('已明确采用当前识别版本，请核对后保存修订。')})}>核对后采用当前识别版本</button>}<button disabled={busy} onClick={()=>{discardOcrDraft(draftKey);dirtyRef.current=false;setEditing(false);setRecoveryMismatch(false);void read()}}>取消修订</button><button disabled={busy||!dirtyRef.current||recoveryMismatch||!snapshot.evidence} onClick={()=>void act(async()=>{const version=life.current,submitted=draft;const next=accept(await api.correct({...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision,evidenceId:snapshot.evidence!.id,text:submitted}));if(version!==life.current)return;++readSequence.current;snapshotRef.current=next;setSnapshot(next);setRecoveryMismatch(false);if(draftRef.current===submitted){discardOcrDraft(draftKey);dirtyRef.current=false;setEditing(false);setMessage('识别文字已修订并保存')}else{adoptOcrDraftBaseline(draftKey,next,draftRef.current);dirtyRef.current=true;setMessage('本次提交已保存；随后输入仍保留为未保存修订。')}})}>保存文字修订</button></div>}
   {asset.ocr?.edited&&snapshot?.evidence&&!editing&&<details><summary>查看原识别文字</summary><p className="ocr-content">{asset.ocr.sourceText||'原识别结果为空。'}</p><button disabled={busy||running} onClick={()=>void act(async()=>{const version=life.current;const next=accept(await api.correct({...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision,evidenceId:snapshot.evidence!.id,text:null}));if(version===life.current){++readSequence.current;snapshotRef.current=next;setSnapshot(next);setMessage('已恢复识别结果')}})}>恢复原识别文字</button></details>}
  </>:<p className="subtle">当前窗口不提供专用 OCR 操作。</p>}
  {(error||statusError)&&<p role="alert">{error||statusError}<button onClick={()=>{setError('');setStatusError('');void read();void loadStatus()}}>重试读取 OCR</button></p>}{message&&<p role="status">{message}</p>}
 </section>
}
