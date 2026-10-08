import ImageToolsPanel from '../components/asset/ImageToolsPanel'
import { connectTransitionParticipant } from '../workspace-transition-participant'
import { holdWorkspaceDraft, removeWorkspaceDraft } from '../workspace-drafts'
import React, { useEffect, useRef, useState } from 'react'
import { completeDescriptionDraft } from '../../shared/workflows/asset-description-draft.workflow'
import VisualAiPanel from '../components/asset/VisualAiPanel'
import AssetCardPanel from '../components/asset/AssetCardPanel'
import type { AssetCardAction, AssetCardApi, AssetCardSnapshot, AssetDescriptionDraft } from '../../shared/contracts/asset-card.contract'

const messages = {
  DESCRIPTION_CONFLICT: '描述已在其他窗口变化。请取消编辑以载入最新内容，再重试。',
  STALE_CARD: '资料库或素材已切换，请重新打开卡片。',
  ASSET_UNAVAILABLE: '当前素材不可用，请返回资料库。',
  INVALID_REQUEST: '未能保存此项更改，请检查输入。',
  UNTRUSTED_SENDER: '当前窗口没有素材访问权限。',
  CARD_UNAVAILABLE: '操作未能完成，请重试。'
}

export default function AssetCardWindow() {
  useEffect(() => connectTransitionParticipant(() => false), [])
  const api = (window as Window & { assetCardAPI?: AssetCardApi }).assetCardAPI
  const [state, setState] = useState<AssetCardSnapshot | null>(null)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [description, setDescription] = useState<AssetDescriptionDraft>({ value: '', baseCaption: '' })
  const sequence = useRef(0)
  useEffect(() => {
    if (!state) return
    const scope = { libraryIdentity: state.context.libraryIdentity, generation: state.context.generation, entityId: state.context.assetId }
    if (description.value !== description.baseCaption) holdWorkspaceDraft({ ...scope, kind: 'description' }, description.value, description.baseCaption)
    else removeWorkspaceDraft({ ...scope, kind: 'description' })
    if (prompt) holdWorkspaceDraft({ ...scope, kind: 'prompt' }, prompt, '')
    else removeWorkspaceDraft({ ...scope, kind: 'prompt' })
  }, [state?.token, description, prompt])
  const token = useRef<string | null>(null)
  useEffect(() => {
    document.documentElement.classList.add('asset-card-window')
    if (!api) { setError('请从素材工作区打开悬浮卡片。'); return }
    let mounted = true
    let received = 0
    const accept = (next: AssetCardSnapshot | null) => {
      if (!mounted) return
      if (token.current !== next?.token) { token.current = next?.token ?? null; setPrompt(next?.promptDraft ?? ''); setDescription(next?.descriptionDraft ?? { value: '', baseCaption: '' }); setError('') }
      setState(next)
    }
    const unsubscribe = api.onState(next => { received++; accept(next) })
    const version = received
    void api.inspect().then(result => { if (!mounted || version !== received) return; if (result.ok) accept(result.state); else setError(messages[result.code]) }).catch(() => { if (mounted) setError(messages.CARD_UNAVAILABLE) })
    return () => { mounted = false; unsubscribe(); document.documentElement.classList.remove('asset-card-window') }
  }, [api])
  const act = async (action: AssetCardAction) => {
    if (!api) return false
    const version = ++sequence.current
    try {
      const result = await api.act(action)
      if (action.token !== token.current && action.kind !== 'next' && action.kind !== 'previous') return false
      if (!result.ok) {
        if (version === sequence.current || action.kind === 'save-description') setError(messages[result.code])
        if (result.code === 'DESCRIPTION_CONFLICT') { const fresh = await api.inspect(); if (fresh.ok && fresh.state?.token === token.current) setState(fresh.state) }
        return false
      }
      if (action.kind === 'save-description' && result.state?.token === token.current) setState(result.state)
      if (version === sequence.current) setError('')
      return true
    } catch { if (version === sequence.current) setError(messages.CARD_UNAVAILABLE); return false }
  }
  if (!state) return <main className="native-card-empty" role="status">{error || '正在读取素材…'}</main>
  const asset = state.asset
  return <main className="native-card-page"><AssetCardPanel key={state.token} asset={{ id: asset.id, title: asset.title, previewSrc: state.previewUrl, metadata: `${asset.fileType || '图片'} · ${asset.width ?? '—'} × ${asset.height ?? '—'}`, tags: asset.tags, caption: asset.aiCaption }}
    toolsPanel={<ImageToolsPanel scope={state.context} />}
    aiPanel={<VisualAiPanel key={state.token} scope={state.context} assetIds={[asset.id]} promptDraft={prompt} onUsePrompt={value => { setPrompt(value); void act({ token: state.token, kind: 'prompt-draft', value }) }} onConfigure={() => { void act({ token: state.token, kind: 'configure-ai' }) }} />}
    promptDraft={prompt} onPromptDraft={value => { setPrompt(value); void act({ token: state.token, kind: 'prompt-draft', value }) }}
    descriptionDraft={description} onDescriptionDraft={value => { setDescription(value); void act({ token: state.token, kind: 'description-draft', ...value }) }}
    onSaveDescription={async (value, expectedCaption) => {
      const saved = await act({ token: state.token, kind: 'save-description', value, expectedCaption })
      if (saved) setDescription(current => completeDescriptionDraft(current, value, expectedCaption))
      return saved
    }}
    onClose={() => { void act({ token: state.token, kind: 'close' }) }} onFocus={() => { void act({ token: state.token, kind: 'return' }) }}
    pinned={state.pinned} onPin={() => { void act({ token: state.token, kind: 'pin', pinned: !state.pinned }) }}
    onPrevious={state.canPrevious ? () => { void act({ token: state.token, kind: 'previous' }) } : undefined}
    onNext={state.canNext ? () => { void act({ token: state.token, kind: 'next' }) } : undefined}
    onConfigureAi={() => { void act({ token: state.token, kind: 'configure-ai' }) }} error={error} />
  </main>
}
