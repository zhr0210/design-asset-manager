import React,{useEffect,useRef,useState} from 'react'
import type {BackgroundOcrApi,BackgroundOcrScope,BackgroundOcrView,BackgroundOcrReview} from '../../../shared/contracts/background-ocr.contract'
import './background-analysis.css'
const labels:Record<string,string>={'permission-required':'需要本次开库的独立许可','runtime-unavailable':'未选择本地 OCR 环境','runtime-changed':'环境已变化，请重新核对并授权','automatic-executor-not-integrated':'生产执行资源资格尚未验证','execution-envelope-unknown':'执行内存预算未知','memory-unknown':'内存证据未知','memory-insufficient':'内存余量不足','power-unknown':'供电状态未知','waiting-external-power':'等待外接电源','low-power-mode-unknown':'节能模式未知','low-power-mode':'系统处于节能模式','thermal-unknown':'温控状态未知','thermal-pressure':'温控压力','interaction-unknown':'交互状态未知','foreground-active':'前台正在交互','session-locked':'系统已锁定','visibility-unknown':'窗口状态未知','no-visible-window':'没有可见窗口','ocr-busy':'OCR 正在准备、运行或维护','process-exit-unconfirmed':'尚未确认进程退出，资源继续占用','resources-changed':'预处理期间条件变化，等待重新准入','operation-failed':'上次调度未完成，请检查任务记录后重新核对许可'}
const states={claimed:'已领取，尚未发送',sent:'已发送',succeeded:'已保存',failed:'失败，旧结果保留',cancelled:'已取消',unknown:'退出未知，禁止重试',deferred:'等待资源重新准入'}
export default function BackgroundOcrPanel(){
 const bridge=(window as any).electronAPI,api=bridge?.backgroundOcr as BackgroundOcrApi|undefined
 const [view,setView]=useState<{scope:BackgroundOcrScope;value:BackgroundOcrView}|null>(null),[review,setReview]=useState<BackgroundOcrReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState('')
 const life=useRef(0),sequence=useRef(0),key=useRef(''),receipt=useRef<string|null>(null),pending=useRef(false)
 const discard=()=>{if(receipt.current)void api?.discard(receipt.current).catch(()=>{});receipt.current=null;setReview(null)}
 const load=async()=>{
  if(!api)return;const epoch=life.current,n=++sequence.current
  try{
   const current=await bridge.library.inspect();if(epoch!==life.current||n!==sequence.current)return
   if(current.state!=='ready'){life.current++;key.current='';discard();setView(null);setLoadError('请先打开资料库。');pending.current=false;setBusy(false);return}
   const scope={libraryIdentity:current.identity,generation:current.generation},r=await api.read(scope)
   if(epoch!==life.current||n!==sequence.current)return
   if(!r.ok){setLoadError(r.error);return}
   const next=JSON.stringify([scope,r.value.sessionToken]);if(next!==key.current){life.current++;key.current=next;setError('');discard();pending.current=false;setBusy(false)}
   setView(old=>old&&old.value.sessionToken===r.value.sessionToken&&old.value.permissionRevision>r.value.permissionRevision?old:{scope,value:r.value});setLoadError('')
  }catch{if(epoch===life.current&&n===sequence.current)setLoadError('后台 OCR 状态暂不可用。')}
 }
 useEffect(()=>{life.current++;void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},5000);return()=>{life.current++;sequence.current++;clearInterval(timer);if(receipt.current)void api?.discard(receipt.current).catch(()=>{})}},[api])
 const act=async(action:(valid:()=>boolean)=>Promise<void>)=>{if(pending.current)return;const epoch=life.current;sequence.current++;pending.current=true;setBusy(true);setError('');try{await action(()=>epoch===life.current)}catch{if(epoch===life.current)setError('操作未完成，请重新核对。')}finally{if(epoch===life.current){pending.current=false;setBusy(false);sequence.current++;await load()}}}
 if(!api)return null
 return <section className="visual-ai-panel background-analysis-panel" aria-label="后台 OCR 执行许可"><header><strong>后台 OCR</strong><button disabled={busy} onClick={()=>void load()}>刷新 OCR 状态</button></header>
 <p>新素材计划不等于执行许可。授权只对本次开库有效；关库后需重新授权，不补扫旧素材。</p>
 {view&&<><p>{view.value.authorized?'本次开库已授权':'本次开库尚未授权'} · {view.value.running?'正在调度':'等待下一次准入'}</p>
 <div className="visual-ai-actions"><button disabled={busy} onClick={()=>void act(async valid=>{const r=await api.prepare(view.scope);if(!valid()){if(r.ok)void api.discard(r.value.receipt);return}if(r.ok){receipt.current=r.value.receipt;setReview(r.value)}else setError(r.error)})}>核对后台 OCR 授权</button><button disabled={busy||!view.value.authorized} onClick={()=>void act(async valid=>{discard();const r=await api.revoke(view.scope);if(valid()){if(r.ok)setView({...view,value:r.value});else setError(r.error)}})}>撤销后台 OCR 许可</button></div>
 {review&&<div className="visual-ai-review" role="region" aria-label="确认后台 OCR 授权"><p>{review.notice}</p><button disabled={busy} onClick={discard}>取消授权</button><button disabled={busy} onClick={()=>void act(async valid=>{const r=await api.confirm(review.receipt);if(!valid())return;receipt.current=null;setReview(null);if(r.ok)setView({...view,value:r.value});else setError(r.error)})}>确认授权后台 OCR</button></div>}
 <div aria-label="后台 OCR 等待原因">{[...new Set(view.value.reasons)].map(reason=><p key={reason}>{labels[reason]??'执行条件尚未满足'}</p>)}</div>
 <details><summary>最近 OCR 执行记录（最多 20 项）</summary>{view.value.attempts.length?view.value.attempts.map(a=><p key={a.intentId}>{a.interrupted&&a.state==='sent'?'上次发送结果未知，禁止自动重试':states[a.state]} · 第 {a.attemptGeneration} 次{a.interrupted?' · 来自上次会话，不能恢复旧权限':''}</p>):<p>尚无执行记录。</p>}</details></>}
 {(error||loadError)&&<p role="alert">{error||loadError}</p>}
 </section>
}
