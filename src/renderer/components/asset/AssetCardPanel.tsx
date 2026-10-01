import React, { useEffect, useState } from 'react'
import { normalizeDescriptionDraft } from '../../../shared/workflows/asset-description-draft.workflow'
import type { AssetDescriptionDraft } from '../../../shared/contracts/asset-card.contract'
import { ArrowLeft, ArrowRight, Check, Copy, Maximize2, Pin, RotateCw, Save, Sparkles, X } from 'lucide-react'

export interface CardPresentation {
  id: string; title: string; previewSrc: string; metadata: string; tags: readonly string[]; caption: string
}

export default function AssetCardPanel({ asset, promptDraft, onPromptDraft, descriptionDraft, onDescriptionDraft, onSaveDescription, onClose, onFocus, onPopout, onPin, pinned, onPrevious, onNext, onConfigureAi, error, aiPanel, toolsPanel }: {
  asset: CardPresentation
  promptDraft: string
  onPromptDraft(value: string): void
  descriptionDraft: AssetDescriptionDraft
  onDescriptionDraft(value: AssetDescriptionDraft): void
  onSaveDescription(value: string, expected: string): Promise<boolean>
  onClose?(): void; onFocus?(): void; onPopout?(): void
  onPin?(): void; pinned?: boolean
  onPrevious?(): void; onNext?(): void
  onConfigureAi(): void; error?: string
  aiPanel?: React.ReactNode
  toolsPanel?: React.ReactNode
}) {
  const [rotation, setRotation] = useState(0)
  const description = descriptionDraft.value
  const dirty = description !== descriptionDraft.baseCaption
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(dirty)
  const [copied, setCopied] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  useEffect(() => {
    if (!dirty && descriptionDraft.baseCaption !== asset.caption) onDescriptionDraft(normalizeDescriptionDraft(descriptionDraft, asset.caption))
  }, [asset.caption, dirty, descriptionDraft, onDescriptionDraft])
  useEffect(() => { setRotation(0); setImageFailed(false) }, [asset.id, asset.previewSrc])
  useEffect(() => {
    if (!dirty) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])
  const copy = async () => {
    try { await navigator.clipboard.writeText(promptDraft); setCopied(true); setCopyFailed(false) }
    catch { setCopyFailed(true) }
  }
  return <section className="asset-floating-panel" aria-label="素材悬浮卡片">
    <header className="asset-card-chrome"><button aria-label="关闭卡片" disabled={dirty || saving} onClick={onClose}><X size={13} /></button><span>{asset.title}</span>
      {onPin && <button aria-label={pinned ? '取消窗口置顶' : '窗口置顶'} aria-pressed={pinned} onClick={onPin}><Pin size={14} /></button>}
      {onPopout && <button className="asset-card-popout" disabled={dirty || saving} onClick={onPopout}>在桌面悬浮<Maximize2 size={14} /></button>}
      {onFocus && <button aria-label="返回专注查看" disabled={dirty || saving} onClick={onFocus}><Maximize2 size={14} /></button>}
    </header>
    <div className="asset-card-scroll">
      <div className="asset-card-image">{imageFailed ? <p role="alert">预览暂时不可用</p> : <img src={asset.previewSrc} alt={asset.title} onError={() => setImageFailed(true)} style={{ transform: `rotate(${rotation}deg)` }} />}
        <span className="asset-card-preview-label">受控预览{rotation !== 0 ? ' · 仅旋转显示' : ''}</span>
        <div className="asset-card-step"><button aria-label="上一张素材" disabled={!onPrevious || dirty || saving} onClick={onPrevious}><ArrowLeft size={15} /></button><button aria-label="下一张素材" disabled={!onNext || dirty || saving} onClick={onNext}><ArrowRight size={15} /></button></div>
      </div>
      <div className="asset-card-information"><h2>{asset.title}</h2><p>{asset.metadata}</p><div className="asset-card-tags">{asset.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
      <div className="asset-card-tools"><button onClick={() => setRotation(value => (value + 90) % 360)}><RotateCw size={16} />旋转预览</button><button aria-expanded={editing} onClick={() => setEditing(true)}>编辑描述</button><button disabled={dirty || saving} onClick={onConfigureAi}><Sparkles size={16} />AI 设置</button></div>
      {editing && <form className="asset-card-description" onSubmit={async event => {
        event.preventDefault(); if (!dirty || saving) return
        setSaving(true)
        try { if (await onSaveDescription(description, descriptionDraft.baseCaption)) setEditing(false) }
        finally { setSaving(false) }
      }}><label>素材描述<textarea aria-label="素材描述" disabled={saving} maxLength={32000} value={description} onChange={event => onDescriptionDraft({ value: event.target.value, baseCaption: descriptionDraft.baseCaption })} /></label><div><span>{dirty ? '请保存或取消后再离开卡片' : '已保存'}</span><button type="button" disabled={saving} onClick={() => { onDescriptionDraft({ value: asset.caption, baseCaption: asset.caption }); setEditing(false) }}>取消</button><button type="submit" disabled={!dirty || saving}><Save size={13} />{saving ? '保存中…' : '保存描述'}</button></div></form>}
      {error && <p className="asset-card-error" role="alert">{error}</p>}
      {toolsPanel}
      {aiPanel}
      <section className="asset-card-prompt" aria-label="提示词草稿区"><header><span><Sparkles size={15} />创作提示词</span></header><textarea aria-label="提示词草稿" maxLength={32000} placeholder="记录你的创作提示词…" value={promptDraft} onChange={event => { onPromptDraft(event.target.value); setCopied(false) }} /><footer><span>会话草稿 · 关闭资料库后清除</span><button disabled={!promptDraft.trim()} onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? '已复制' : '复制提示词'}</button></footer>{copyFailed && <p role="alert">未能复制，请选择文本后手动复制。</p>}</section>
    </div>
  </section>
}
