import { getWorkspaceClient } from '../../workspace-client'
import React, { useEffect, useRef, useState } from 'react'
import { useTransientWorkspaceEdit } from '../../workspace-edit-guards'
import { Check, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import type { AiBackendConfig, AiBackendHealthResult, AiModelListResult } from '../../../shared/types/ai-backend.types'
import { useSettingsStore } from '../../stores/settings.store'
import { Button, Notice } from '../ui/WorkspacePrimitives'
import BackendConfigConflict, { copyBackendConfiguration } from './BackendConfigConflict'
import { workspaceMutationErrorMessage } from '../../../shared/client/workspace-connection-error'

interface BackendApi {
  aiBackendList(): Promise<AiBackendConfig[]>
  aiBackendSave(config: AiBackendConfig): Promise<AiBackendConfig[]>
  aiBackendDelete(request: { id: string }): Promise<AiBackendConfig[]>
  aiBackendHealthCheck(input: { backendId: string; config: AiBackendConfig }): Promise<AiBackendHealthResult>
  aiBackendListModels(input: { backendId: string; config: AiBackendConfig }): Promise<AiModelListResult>
}

function newBackend(): AiBackendConfig {
  return { id: `backend-${crypto.randomUUID()}`, name: '新的模型服务', type: 'openai-compatible', enabled: false,
    baseUrl: 'http://127.0.0.1:1234/v1', defaultModel: '', timeoutMs: 30000, priority: 50,
    capabilities: { chat: true, vision: false, embeddings: false, jsonOutput: false, modelList: true, modelManagement: false } }
}

export default function AiBackendSettingsPanel() {
  const api = getWorkspaceClient()
  const [backends, setBackends] = useState<AiBackendConfig[]>([])
  const [draft, setDraft] = useState<AiBackendConfig | null>(null)
  const baseline = useRef<AiBackendConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [deleteReview, setDeleteReview] = useState(false)
  const saved = backends.find(backend => backend.id === draft?.id)
  const conflict = Boolean(draft && JSON.stringify(saved ?? null) !== JSON.stringify(baseline.current))
  const dirty = Boolean(draft && JSON.stringify(draft) !== JSON.stringify(baseline.current))
  const draftRef = useRef(draft), busyRef = useRef(busy)
  draftRef.current = draft; busyRef.current = busy
  const reread = useRef<() => Promise<void>>(async () => {})
  const readSequence = useRef(0)
  useTransientWorkspaceEdit(dirty)
  useEffect(() => {
    if (!api?.aiBackendList) { setFeedback({ error: true, text: '当前环境无法管理模型服务。' }); return }
    let live = true, requiredRead: Promise<void> | undefined, requiredSequence = 0
    const sync = async (required = false): Promise<void> => {
      if (!required) while (requiredRead && requiredSequence === readSequence.current) { try { await requiredRead } catch { /* The required caller receives its failure. */ } }
      const request = ++readSequence.current
      const read = async () => {
      const list = await api.aiBackendList()
      if (!live) return
      if (request !== readSequence.current) { if (required) throw Error('BACKEND_READ_SUPERSEDED'); return }
      if (!Array.isArray(list)) throw new Error('UNAVAILABLE')
      setBackends(list)
      const current = draftRef.current
      if (!busyRef.current && JSON.stringify(current) === JSON.stringify(baseline.current)) {
        const next = list.find((item:AiBackendConfig) => item.id === current?.id) ?? list[0] ?? null
        baseline.current = next; setDraft(next)
      }
      }
      if (!required) return read()
      const operation = read().finally(() => { if (requiredRead === operation) requiredRead = undefined })
      requiredRead = operation; requiredSequence = request
      return operation
    }
    reread.current = sync
    void sync().catch(() => { if (live) setFeedback({ error: true, text: '服务配置加载失败，输入仍保留。请重新读取后重试。' }) })
    const stop = api.onSettingsChanged(() => { void sync().catch(() => setFeedback({error:true,text:'连接状态暂不可读，输入已保留。'})) })
    const stopReconcile = api.onReconcile(() => sync(true))
    return () => { live = false; ++readSequence.current; stop(); stopReconcile() }
  }, [api])
  const accept = (next: AiBackendConfig[], id?: string) => {
    if (!Array.isArray(next)) throw new Error('INVALID_RESPONSE')
    ++readSequence.current
    setBackends(next); baseline.current = next.find(item => item.id === id) ?? next[0] ?? null; setDraft(baseline.current)
  }
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true; ++readSequence.current
    setBusy(true); setFeedback(null)
    try { await operation() } catch (error) { setFeedback({ error: true, text: workspaceMutationErrorMessage(error, '操作未完成，输入仍保留。请核对另一界面的配置变化后重试。') }) }
    finally { busyRef.current = false; setBusy(false) }
  }
  const patch = (value: Partial<AiBackendConfig>) => { if (draft) setDraft({ ...draft, ...value }); setModels([]); setFeedback(null); setDeleteReview(false) }
  return <section className="ui-card ai-backend-settings" aria-label="模型服务配置"><div className="ui-section-heading"><span>模型服务</span><Button disabled={busy || dirty} onClick={() => { baseline.current = null; setDraft(newBackend()); setModels([]); setFeedback(null) }}><Plus size={15} />添加服务</Button></div>
    <Notice>保存配置和检查连接不会上传素材。连接成功只证明服务可达，不代表已完成图像推理。</Notice>
    {feedback && <Notice tone={feedback.error ? 'danger' : 'positive'}>{feedback.text}{feedback.error && <Button disabled={busy} onClick={() => void run(() => reread.current())}>重新读取已保存的服务配置</Button>}</Notice>}
    {conflict && draft && <BackendConfigConflict current={saved} busy={busy} onAdopt={() => { if (!saved) return; baseline.current = structuredClone(saved); setDraft({ ...saved, name: draft.name, type: draft.type, baseUrl: draft.baseUrl, defaultModel: draft.defaultModel, enabled: draft.enabled, capabilities: { ...saved.capabilities, vision: draft.capabilities.vision } }); setDeleteReview(false); setFeedback({ error: false, text: '已采用当前服务配置为基准。你的输入仍保留，尚未保存。' }) }} onCopy={() => { baseline.current = null; setDraft(copyBackendConfiguration(draft, newBackend().id)); setModels([]); setDeleteReview(false); setFeedback(null) }} />}
    <div className="backend-settings-layout"><nav aria-label="已配置服务">{backends.map(backend => <button type="button" key={backend.id} aria-pressed={draft?.id === backend.id} disabled={busy || dirty} onClick={() => { baseline.current = backend; setDraft(backend); setModels([]); setDeleteReview(false); setFeedback(null) }}>{backend.name}<small>{backend.enabled ? '已启用' : '未启用'}</small></button>)}</nav>
      {draft ? <form onSubmit={event => { event.preventDefault(); void run(async () => { if (!api || conflict) throw new Error('REVIEW_CURRENT_CONFIGURATION'); accept(await api.aiBackendSave(draft, baseline.current), draft.id); await useSettingsStore.getState().loadSettings(); setFeedback({ error: false, text: '服务配置已保存。' }) }) }}><fieldset disabled={busy}>
        <label className="ui-field"><span>服务名称</span><input className="ui-input" aria-label="服务名称" required maxLength={256} value={draft.name} onChange={event => patch({ name: event.target.value })} /></label>
        <label className="ui-field"><span>服务类型</span><select className="ui-input" aria-label="服务类型" value={draft.type} onChange={event => patch({ type: event.target.value as AiBackendConfig['type'] })}>{['openai-compatible', 'llama-openai', 'lm-studio', 'ollama', 'custom', 'native-python'].map(type => <option key={type}>{type}</option>)}</select></label>
        <label className="ui-field"><span>API 地址</span><input className="ui-input" aria-label="API 地址" type="url" required value={draft.baseUrl} onChange={event => patch({ baseUrl: event.target.value })} /></label>
        <Notice>凭据通过专用加密入口管理。请在 <a href="#/ai-console">AI 控制台的模型连接</a> 选择此服务，安全保存 API Key、迁移旧凭据或登录订阅账号。</Notice>
        <label className="ui-field"><span>默认模型</span><input className="ui-input" aria-label="默认模型" list="backend-model-options" value={draft.defaultModel ?? ''} onChange={event => patch({ defaultModel: event.target.value })} /><datalist id="backend-model-options">{models.map(model => <option key={model} value={model} />)}</datalist></label>
        <div className="backend-capabilities"><label><input type="checkbox" checked={draft.enabled} onChange={event => patch({ enabled: event.target.checked })} />启用服务</label><label><input type="checkbox" checked={draft.capabilities.vision} onChange={event => patch({ capabilities: { ...draft.capabilities, vision: event.target.checked } })} />服务支持图像输入</label></div>
        <div className="ui-actions"><Button type="submit" variant="primary" disabled={!dirty || conflict}><Save size={14} />保存服务</Button><Button disabled={!dirty} onClick={() => { baseline.current = saved ?? backends[0] ?? null; setDraft(baseline.current); setModels([]); setFeedback(null) }}>撤销更改</Button></div>
        <div className="ui-actions"><Button disabled={!draft.enabled || dirty} onClick={() => { void run(async () => {
          if (!api) throw new Error('UNAVAILABLE')
          const result = await api.aiBackendHealthCheck({ backendId: draft.id, config: draft })
          setFeedback({ error: !result.success, text: result.success ? `连接成功，可读取 ${result.models?.length ?? 0} 个模型。` : '连接检查未通过，请检查服务是否启动及地址是否正确。' })
        }) }}><Check size={14} />检查连接</Button><Button disabled={!draft.enabled || dirty} onClick={() => { void run(async () => {
          if (!api) throw new Error('UNAVAILABLE')
          const result = await api.aiBackendListModels({ backendId: draft.id, config: draft })
          if (!result.success) throw new Error('UNAVAILABLE')
          setModels(result.models.map((model: { id: string }) => model.id)); setFeedback({ error: false, text: `已读取 ${result.models.length} 个模型，可在默认模型中选择。` })
        }) }}><RefreshCw size={14} />读取模型列表</Button></div>
        {saved && <div className="backend-delete"><Button disabled={dirty} onClick={() => setDeleteReview(!deleteReview)}><Trash2 size={13} />移除配置</Button>{deleteReview && <div><p>仅移除此服务配置，不删除模型文件。</p><Button onClick={() => { void run(async () => { if (!api) throw new Error('UNAVAILABLE'); accept(await api.aiBackendDelete({ id: draft.id }, baseline.current)); setDeleteReview(false); await useSettingsStore.getState().loadSettings(); setFeedback({ error: false, text: '配置已移除。' }) }) }}>确认移除配置</Button></div>}</div>}
      </fieldset></form> : <p className="ui-meta">添加一个本地或外部模型服务。</p>}
    </div>{busy && <p role="status" className="ui-meta">正在处理…</p>}
  </section>
}
