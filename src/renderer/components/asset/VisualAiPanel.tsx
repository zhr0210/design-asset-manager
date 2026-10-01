import BackgroundAnalysisPanel from './BackgroundAnalysisPanel'
import TagBatchPanel from './TagBatchPanel'
import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Check, Play } from 'lucide-react'
import type { VisualAiApi, VisualAiBackendChoice, VisualAiEvidence, VisualAiJob, VisualAiReview, VisualAiScope } from '../../../shared/contracts/visual-ai.contract'
import IndependentTagIntentPanel from './IndependentTagIntentPanel'

export default function VisualAiPanel({ scope, assetIds, promptDraft = '', onUsePrompt, onChanged, onConfigure }: {
  scope: VisualAiScope; assetIds: string[]; promptDraft?: string; onUsePrompt?(prompt: string): void; onChanged?(): void; onConfigure(): void
}) {
  const api = (window as Window & { visualAiAPI?: VisualAiApi; electronAPI?: { visualAi?: VisualAiApi } }).visualAiAPI ?? (window as any).electronAPI?.visualAi as VisualAiApi | undefined
  const [backends, setBackends] = useState<VisualAiBackendChoice[]>([])
  const [batchBusy,setBatchBusy]=useState(false)
  const [tagBusy,setTagBusy]=useState(false),[tagSource,setTagSource]=useState<string|null|undefined>(undefined)
  const [tagChoice,setTagChoice]=useState<{backendId:string;model:string}|null>(null)
  const [backendId, setBackendId] = useState(''); const [model, setModel] = useState('')
  const reviewReceipt=useRef<string|null>(null)
  const [review, setReview] = useState<VisualAiReview | null>(null); const [job, setJob] = useState<VisualAiJob | null>(null)
  const [results, setResults] = useState<VisualAiEvidence[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const requestScope = { libraryIdentity: scope.libraryIdentity, generation: scope.generation }
  const identity = JSON.stringify([requestScope, assetIds]); const alive = useRef(true); const activeIdentity = useRef(identity); activeIdentity.current = identity
  const exceedsBatchLimit = assetIds.length > 8
  const running = job?.state === 'queued' || job?.state === 'running'
  useEffect(() => {
    alive.current = true
    if(reviewReceipt.current){void api?.discardReview(reviewReceipt.current).catch(()=>{});reviewReceipt.current=null}
    setBusy(false); setReview(null); setJob(null); setResults([]); setConfirmed([]); setError('')
    if (!api) return
    const current = identity
    void api.backends().then(response => {
      if (!alive.current || activeIdentity.current !== current) return
      if (!response.ok) { setError(response.error); return }
      setBackends(response.value);const assigned=response.value.find(b=>b.taskModels?.analyze),tag=response.value.find(b=>b.taskModels?.tags);setBackendId(assigned?.id??response.value[0]?.id??'');setModel(assigned?.taskModels?.analyze??response.value[0]?.defaultModel??'');setTagChoice(tag?{backendId:tag.id,model:tag.taskModels!.tags!}:null)
    }).catch(() => { if (alive.current && activeIdentity.current === current) setError('AI 服务配置读取失败。') })
    if (assetIds.length === 1) void api.results({ ...requestScope, assetId: assetIds[0] }).then(response => { if (alive.current && activeIdentity.current === current && response.ok) setResults(response.value) }).catch(() => {})
    return () => { alive.current = false;if(reviewReceipt.current){void api?.discardReview(reviewReceipt.current).catch(()=>{});reviewReceipt.current=null} }
  }, [api, identity])
  useEffect(() => {
    if (!running || !api || !job) return
    let disposed = false; let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const response = await api.inspect(job.id)
        if (disposed) return
        if (!response.ok) { setError(response.error); setJob(null); return }
        setJob(response.value)
        if (!['running', 'queued'].includes(response.value.state)) {
          setResults(response.value.items.flatMap(item => item.evidence ? [item.evidence] : [])); onChanged?.(); return
        }
      } catch { if (!disposed) setError('任务状态暂时不可用，正在重试。') }
      if (!disposed) timer = setTimeout(poll, 500)
    }
    timer = setTimeout(poll, 100)
    return () => { disposed = true; clearTimeout(timer) }
  }, [api, running, job?.id])
  const operate = async (action: () => Promise<void>) => {
    if (busy) return
    const current = identity; setBusy(true); setError('')
    try { await action() } catch { if (alive.current && activeIdentity.current === current) setError('操作未完成，请重试。') }
    finally { if (alive.current && activeIdentity.current === current) setBusy(false) }
  }
  return <section className="visual-ai-panel" aria-label="AI 分析与反推"><header><span><Sparkles size={15} />AI 分析与反推</span><button type="button" onClick={onConfigure}>配置服务</button></header>
    {!api || !backends.length ? <p>请先启用支持图像的本地或外部服务。基础素材功能不受影响。</p> : <>
      <label>模型服务<select aria-label="分析模型服务" value={backendId} disabled={busy || running || tagBusy || batchBusy} onChange={event => { setBackendId(event.target.value); setModel(backends.find(item => item.id === event.target.value)?.defaultModel ?? ''); setReview(null) }}>{backends.map(backend => <option key={backend.id} value={backend.id}>{backend.name} · {backend.location === 'local' ? '本机端口' : '外部'}</option>)}</select></label>
      <label>模型名称<input aria-label="分析模型名称" value={model} disabled={busy || running || tagBusy || batchBusy} onChange={event => { setModel(event.target.value); setReview(null) }} /></label>
      <div className="visual-ai-actions">{(['analyze','reverse']as const).map(task=><button key={task} disabled={busy||running} onClick={()=>{const b=backends.find(b=>b.taskModels?.[task]);if(b){setBackendId(b.id);setModel(b.taskModels![task]!);setReview(null)}}}>采用{task==='analyze'?'分析':'反推'}默认模型</button>)}</div>
      <div className="visual-ai-actions">{(['analyze', 'reverse'] as const).map(purpose => <button key={purpose} type="button" disabled={busy || running || tagBusy || batchBusy || !model.trim() || exceedsBatchLimit} onClick={() => { void operate(async () => {
        const response = await api.prepare({ ...requestScope, assetIds, backendId, model, purpose })
        if (!alive.current || activeIdentity.current !== identity) return
        if (response.ok) {reviewReceipt.current=response.value.receipt;setReview(response.value)} else setError(response.error)
      }) }}><Sparkles size={13} />{purpose === 'analyze' ? `分析 ${assetIds.length} 个素材` : '反推提示词'}</button>)}</div>
    </>}
    {assetIds.length===1&&<BackgroundAnalysisPanel scope={requestScope} assetId={assetIds[0]}/>}
    <TagBatchPanel scope={requestScope} assetIds={assetIds} backendId={tagChoice?.backendId??backendId} model={tagChoice?.model??model} onActivityChange={setBatchBusy} onChanged={onChanged}/>
    {assetIds.length===1&&<IndependentTagIntentPanel scope={requestScope} assetId={assetIds[0]} backendId={tagChoice?.backendId??backendId} model={tagChoice?.model??model} onActivityChange={setTagBusy} onCurrentTagSource={setTagSource} />}
    {exceedsBatchLimit && <p role="status">已选择 {assetIds.length} 个素材，每批最多分析 8 个，请缩小选择范围。</p>}
    {review && <div className="visual-ai-review" role="region" aria-label="确认 AI 执行范围"><strong>{review.location === 'external' ? '确认发送到外部服务' : '确认本地分析'}</strong><p>{review.backendName} · {review.providerOrigin}</p><p>{review.model} · {review.assets.length} 个素材</p><p>{review.inputDescription}</p><p>{review.storageNotice}</p><div className="visual-ai-actions"><button type="button" disabled={busy} onClick={() => {const receipt=review.receipt;reviewReceipt.current=null;setReview(null);void api?.discardReview(receipt).catch(()=>{})}}><X size={13} />取消</button><button type="button" disabled={busy} onClick={() => { void operate(async () => {
      const response = await api!.run(review.receipt)
      if (!alive.current || activeIdentity.current !== identity) return
      if (response.ok) { reviewReceipt.current=null;setJob(response.value); setReview(null) } else setError(response.error)
    }) }}><Play size={13} />{review.location === 'external' ? '同意发送并执行' : '确认执行'}</button></div></div>}
    {busy && <p role="status">正在准备…</p>}{error && <p role="alert">{error}</p>}
    {job && <div className="visual-ai-job" role="status"><span>{running ? '分析中' : ({ completed: '分析完成', partial: '部分完成', failed: '分析失败', cancelled: '已取消' } as Record<string,string>)[job.state]} · {job.items.filter(item => item.state === 'completed').length}/{job.items.length}</span>{running && <button type="button" onClick={() => { void operate(async () => { const response = await api!.cancel(job.id); if (!alive.current || activeIdentity.current !== identity) return; if (response.ok) setJob(response.value); else setError(response.error) }) }}>取消分析</button>}{job.items.filter(item => item.error).map(item => <p key={item.assetId}>{item.error}</p>)}</div>}
    {results.slice(0, 8).map(result => <article key={result.id} className="visual-ai-result"><small>{result.model} · 受控预览 · {new Date(result.createdAt).toLocaleString()}</small><p>{result.output.caption}</p>{result.usage&&<small>输入 {result.usage.inputTokens??'未知'} / 输出 {result.usage.outputTokens??'未知'} token · {result.usage.costEstimateUsd===null?'费用未估算':`约 $${result.usage.costEstimateUsd.toFixed(4)}（目录估计，非实际账单）`}</small>}{result.output.ocrText && <details><summary>画面文字</summary><pre>{result.output.ocrText}</pre></details>}
      <div className="visual-ai-tags">{result.output.tags.map(tag => <button type="button" key={tag} disabled={busy || tagSource!==undefined || confirmed.includes(`${result.id}:${tag}`)} onClick={() => { void operate(async () => { const response = await api!.confirmTag({ ...requestScope, assetId: result.assetId, evidenceId: result.id, tag }); if (!alive.current || activeIdentity.current !== identity) return; if (response.ok) { setConfirmed(previous => [...previous, `${result.id}:${tag}`]); onChanged?.() } else setError(response.error) }) }}><Check size={10} />{tag}</button>)}</div>
      {assetIds.length===1&&result.processingLocation!=='external-service'&&/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/)/.test(result.providerOrigin)&&backends.find(b=>b.id===backendId)?.location==='external'&&<button disabled={busy||running} onClick={()=>void operate(async()=>{const response=await api!.prepare({...requestScope,assetIds,backendId,model,purpose:'analyze',refineEvidenceId:result.id});if(!alive.current||activeIdentity.current!==identity)return;if(response.ok){reviewReceipt.current=response.value.receipt;setReview(response.value)}else setError(response.error)})}>核对云端细化范围</button>}<details><summary>生成的提示词</summary><pre>{result.output.prompt}</pre></details>{onUsePrompt && assetIds.length === 1 && <button type="button" onClick={() => onUsePrompt(promptDraft.trim() ? `${promptDraft}\n\n${result.output.prompt}` : result.output.prompt)}>{promptDraft.trim() ? '追加到现有草稿' : '采用为提示词草稿'}</button>}
    </article>)}
  </section>
}
