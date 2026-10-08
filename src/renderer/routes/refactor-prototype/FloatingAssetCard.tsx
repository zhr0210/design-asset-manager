// Browser simulation of a future native floating window. All edits are in-memory previews.
import React, { useEffect, useRef, useState } from 'react'
import { motion, useDragControls, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Copy, GripHorizontal, Maximize2, Palette, Pin, RotateCw, SlidersHorizontal, Sparkles, Undo2, Wand2, X } from 'lucide-react'

export type CardDraft = { warmth: number; rotation: number; editRequest: string; prompt: string; tool: 'color' | 'ai' | null }
export const defaultCardDraft: CardDraft = { warmth: 0, rotation: 0, editRequest: '', prompt: '', tool: null }
export const previewFilter = (warmth: number) => `sepia(${warmth / 160}) saturate(${1 + warmth / 150}) contrast(${1 + warmth / 600})`

export function FloatingAssetCard({ asset, artwork, draft, onDraft, onClose, onFocus, onPrevious, onNext, onCopy, tell }: {
  asset?: { id: number; title: string; format: string; tags: string[] }
  artwork: React.ReactNode
  draft: CardDraft
  onDraft(value: CardDraft): void
  onClose(): void
  onFocus(): void
  onPrevious(): void
  onNext(): void
  onCopy(): void
  tell(message: string): void
}) {
  const stage = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const reduced = useReducedMotion()
  const [pinned, setPinned] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => setCopied(false), [asset?.id])
  const modified = draft.warmth !== 0 || draft.rotation !== 0
  return <div className="rp-floating-stage" ref={stage}>
    <div className="rp-desktop-caption"><span>DESIGN ASSET MANAGER</span><h1>灵感，随手可及。</h1><p>悬浮卡片 · 浏览器内桌面示意</p></div>
    <div className="rp-desktop-ghost" aria-hidden="true"><i /><i /><i /><div /><div /><div /></div>
    <motion.section className="rp-floating-card" aria-label="素材悬浮卡片"
      drag={!pinned} dragListener={false} dragControls={dragControls} dragConstraints={stage}
      dragMomentum={false} dragElastic={.06}
      initial={false} whileDrag={reduced ? undefined : { scale: 1.012 }}
    >
      <header className="rp-card-titlebar" onPointerDown={event => {
        if (!pinned && !(event.target as HTMLElement).closest('button')) dragControls.start(event)
      }}>
        <button className="rp-card-close" aria-label="关闭卡片并返回资料库" onClick={onClose}><X size={11} /></button>
        <span className="rp-card-filename">{asset ? `${asset.title}.${asset.format.toLowerCase()}` : '素材卡片'}</span>
        <GripHorizontal className="rp-card-grip" size={16} aria-label="拖动卡片标题栏" />
        <button aria-label={pinned ? '取消固定卡片位置' : '固定卡片位置'} aria-pressed={pinned} onClick={() => setPinned(!pinned)}><Pin size={14} /></button>
        <button aria-label="进入专注查看" onClick={onFocus}><Maximize2 size={14} /></button>
      </header>
      {asset ? <div className="rp-card-scroll">
        <div className="rp-card-image">
          <div className="rp-card-image-art" style={{ filter: previewFilter(draft.warmth), transform: `rotate(${draft.rotation}deg)` }}>{artwork}</div>
          <span className="rp-card-image-label">{modified ? '编辑预览 · 示例' : '合成素材'}</span>
          <div className="rp-card-image-nav"><button aria-label="上一张素材" onClick={onPrevious}><ArrowLeft size={15} /></button><button aria-label="下一张素材" onClick={onNext}><ArrowRight size={15} /></button></div>
        </div>
        <div className="rp-card-details"><div><h2>{asset.title}</h2><p>{asset.format} <i /> 1600 × 2000 <i /> 设计灵感库</p></div><div className="rp-card-tags">{asset.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div>
        <div className="rp-card-tools" aria-label="图片工具">
          <button aria-pressed={draft.tool === 'ai'} onClick={() => onDraft({ ...draft, tool: draft.tool === 'ai' ? null : 'ai' })}><Wand2 size={17} /><span>AI 编辑</span></button>
          <button aria-pressed={draft.tool === 'color'} onClick={() => onDraft({ ...draft, tool: draft.tool === 'color' ? null : 'color' })}><SlidersHorizontal size={17} /><span>调色</span></button>
          <button onClick={() => onDraft({ ...draft, rotation: (draft.rotation + 90) % 360 })}><RotateCw size={17} /><span>旋转</span></button>
          <button onClick={() => tell('示例色板：奶油白 #EADACA、暖棕 #87694F、墨绿 #31463B；未执行取色算法。')}><Palette size={17} /><span>色板</span></button>
        </div>
        {draft.tool === 'color' && <div className="rp-card-edit-panel"><label><span>暖色预览 <small>仅调整示例显示</small></span><output>{draft.warmth}%</output><input aria-label="图片暖色程度" type="range" min="0" max="80" value={draft.warmth} onChange={event => onDraft({ ...draft, warmth: Number(event.target.value) })} /></label></div>}
        {draft.tool === 'ai' && <div className="rp-card-edit-panel"><label className="rp-card-ai-request"><span>你想怎样调整这张图？</span><input aria-label="AI 图片编辑要求" placeholder="例如：让色调更温暖" value={draft.editRequest} onChange={event => onDraft({ ...draft, editRequest: event.target.value })} /></label><div className="rp-card-demo-action"><small>演示使用固定暖色预设，未连接 AI</small><button onClick={() => { onDraft({ ...draft, warmth: 45 }); tell('已展示暖色编辑示例，原素材保持不变。') }}><Sparkles size={13} />预览示例</button></div></div>}
        {modified && <div className="rp-card-edit-save"><span>原素材保持不变</span><button onClick={() => onDraft({ ...draft, warmth: 0, rotation: 0 })}><Undo2 size={12} />还原</button><button onClick={onCopy}><Copy size={12} />保留示例副本</button></div>}
        <section className="rp-card-prompt" aria-label="提示词反推">
          <header><span><Sparkles size={15} />提示词反推</span><button onClick={() => {
            onDraft({ ...draft, prompt: `A refined minimalist visual study, inspired by “${asset.title}”. Sculptural forms, considered negative space, soft directional light, tactile surfaces, a harmonious palette, editorial composition, crisp detail.\n\n示例提示词：这段预设文案用于体验编辑和复用，没有运行视觉模型。` })
            setCopied(false)
          }}>生成示例<ArrowRight size={12} /></button></header>
          <textarea aria-label="反推提示词草稿" placeholder={'把视觉参考，变成下一次创作的起点。\n生成后可以编辑、复制提示词。'} value={draft.prompt} onChange={event => { onDraft({ ...draft, prompt: event.target.value }); setCopied(false) }} />
          <footer><span>可编辑草稿 · 原型演示</span><button disabled={!draft.prompt.trim()} onClick={async () => {
            try { await navigator.clipboard.writeText(draft.prompt); setCopied(true) }
            catch { tell('浏览器未允许复制；可以在文本框内手动选择并复制。') }
          }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? '已复制' : '复制提示词'}</button></footer>
        </section>
      </div> : <div className="rp-empty"><Maximize2 size={24} /><h2>还没有可查看的素材</h2><p>返回资料库，选择一个素材或调整筛选。</p><button onClick={onClose}>返回资料库</button></div>}
      <div className="rp-card-bottom-edge" aria-hidden="true" />
    </motion.section>
  </div>
}

