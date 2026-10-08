import { getWorkspaceClient } from '../../workspace-client'
import React, { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, Save } from 'lucide-react'
import type { ImageToolsApi, ImageToolOptions, ImageToolReview, ImageToolScope } from '../../../shared/contracts/image-tools.contract'
import ImageCropEditor from './ImageCropEditor'

const defaults: ImageToolOptions = { rotation: 0, mirror: false, crop: 'original', maxEdge: 1600 }
export default function ImageToolsPanel({ scope }: { scope: ImageToolScope }) {
  const api = (window as Window & { imageToolsAPI?: ImageToolsApi; damClient?: { imageTools?: ImageToolsApi } }).imageToolsAPI ?? getWorkspaceClient()?.imageTools as ImageToolsApi | undefined
  const [options, setOptions] = useState<ImageToolOptions>(defaults)
  const [review, setReview] = useState<ImageToolReview | null>(null)
  const [cropBasis, setCropBasis] = useState<ImageToolReview | null>(null)
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [failed, setFailed] = useState(false)
  const receipt = useRef<string | null>(null); const version = useRef(0); const pending = useRef(false)
  const identity = JSON.stringify([scope.libraryIdentity, scope.generation, scope.assetId])
  const preview = useImageUrl(review)
  const cropImage = useImageUrl(cropBasis)
  useEffect(() => {
    version.current++; setOptions(defaults); setReview(null); setCropBasis(null); setMessage(''); setFailed(false); setBusy(false); pending.current = false
    return () => { version.current++; if (receipt.current) void api?.discard(receipt.current).catch(() => {}); receipt.current = null }
  }, [identity, api])
  const clearReview = () => { if (receipt.current) void api?.discard(receipt.current).catch(() => {}); receipt.current = null; setReview(null) }
  const patch = (value: Partial<ImageToolOptions>, resetBasis = false) => {
    clearReview(); setMessage(''); setFailed(false)
    if (resetBasis) setCropBasis(null)
    setOptions(current => ({ ...current, ...value }))
  }
  const operate = async (action: 'save' | 'preview' | 'crop-base') => {
    if (!api || pending.current) return
    pending.current = true; setBusy(true); setMessage(''); setFailed(false)
    const current = version.current
    try {
      if (action === 'save') {
        const id = receipt.current
        if (!id) return
        receipt.current = null
        const result = await api.save(id)
        if (current !== version.current) return
        setReview(null)
        if (!result.ok) { void api.discard(id).catch(() => {}); throw new Error(result.error) }
        setMessage('副本已保存到当前资料库，来源素材保持不变。')
      } else {
        clearReview()
        const selected = action === 'crop-base' ? { ...options, crop: 'original' as const, cropRect: undefined, maxEdge: Math.min(options.maxEdge, 1600) } : options
        const result = await api.prepare({ libraryIdentity: scope.libraryIdentity, generation: scope.generation, assetId: scope.assetId, options: selected })
        if (current !== version.current) { if (result.ok) void api.discard(result.value.receipt).catch(() => {}); return }
        if (!result.ok) throw new Error(result.error)
        if (action === 'crop-base') { await api.discard(result.value.receipt); if (current === version.current) setCropBasis(result.value) }
        else { receipt.current = result.value.receipt; setReview(result.value) }
      }
    } catch (error) { if (current === version.current) { setFailed(true); setMessage(error instanceof Error ? error.message : '图片工具暂时不可用，请重试。') } }
    finally { if (current === version.current) { pending.current = false; setBusy(false) } }
  }
  const original = options.source === 'original'
  return <details className="image-tools-panel"><summary><SlidersHorizontal size={15} />图片工具 <span>裁剪 · 旋转 · 缩放</span></summary>
    <section aria-label="图片副本工具"><p>{original ? '从库内受管原件生成 PNG 派生副本，最长边可至 8192 像素，不放大输入。' : '使用受控预览制作 PNG 副本，最长边不超过 1600 像素。'}不会修改来源素材。</p>
      <fieldset disabled={busy || !api}><div className="image-tools-fields">
        <label>输入来源<select aria-label="副本输入来源" value={options.source ?? 'preview'} onChange={event => { const source = event.target.value as 'preview' | 'original'; patch({ source, maxEdge: source === 'original' ? 8192 : 1600 }, true) }}><option value="preview">受控预览 · 快速</option><option value="original">受管原件 · 原分辨率</option></select></label>
        <label>旋转<select aria-label="副本旋转角度" value={options.rotation} onChange={event => patch({ rotation: Number(event.target.value) as ImageToolOptions['rotation'] }, true)}>{[0, 90, 180, 270].map(value => <option key={value} value={value}>{value}°</option>)}</select></label>
        <label>裁剪<select aria-label="副本裁剪比例" value={options.cropRect ? 'free' : options.crop} onChange={event => patch(event.target.value === 'free' ? { crop: 'original', cropRect: { left: 0.1, top: 0.1, width: 0.8, height: 0.8 } } : { crop: event.target.value as ImageToolOptions['crop'], cropRect: undefined }, true)}><option value="original">保持比例</option><option value="square">1 : 1 居中</option><option value="portrait">4 : 5 居中</option><option value="wide">16 : 9 居中</option><option value="free">自由框选</option></select></label>
        <label>最长边<select aria-label="副本最长边" value={options.maxEdge} onChange={event => patch({ maxEdge: Number(event.target.value) })}>{[320, 640, 960, 1280, 1600, ...(original ? [2400, 4096, 8192] : [])].map(value => <option key={value} value={value}>{value} px</option>)}</select></label>
        <label className="image-tools-mirror"><input type="checkbox" checked={options.mirror} onChange={event => patch({ mirror: event.target.checked }, true)} />水平镜像</label>
      </div></fieldset>
      {options.cropRect && <div>{cropBasis && cropImage ? <ImageCropEditor rect={options.cropRect} image={cropImage} width={cropBasis.width} height={cropBasis.height} disabled={busy || !api} onChange={cropRect => patch({ cropRect })} /> : <button type="button" disabled={busy || !api} className="ui-button ui-button-secondary" onClick={() => void operate('crop-base')}>加载裁剪画面</button>}</div>}
      <button type="button" disabled={busy || !api || (!!options.cropRect && !cropBasis)} className="ui-button ui-button-secondary" onClick={() => void operate('preview')}>生成副本预览</button>
      {original && <p>支持不超过 32 MB、5000 万像素的受管图片；一次处理一项原件任务。</p>}
      {!api && <p>请在应用中打开当前素材后使用图片工具。</p>}
      {busy && <p role="status">{review ? '正在保存副本…' : '正在生成预览…'}</p>}
      {review && <div className="image-tools-review" aria-label="图片副本预览">{preview && <img src={preview} alt="处理后的副本预览" />}<p>{review.width} × {review.height} · PNG</p><p>{review.source === 'original' ? '原件分辨率副本' : '预览副本'} · 输入 {review.sourceWidth} × {review.sourceHeight}</p>{review.storageNotice && <p>{review.storageNotice}</p>}<div className="visual-ai-actions"><button disabled={busy} onClick={clearReview}>放弃副本</button><button disabled={busy} onClick={() => void operate('save')}><Save size={13} />保存副本到资料库</button></div></div>}
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </section>
  </details>
}
function useImageUrl(review: ImageToolReview | null) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!review) { setUrl(''); return }
    const next = URL.createObjectURL(new Blob([new Uint8Array(review.previewBytes)], { type: 'image/png' }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [review])
  return url
}
