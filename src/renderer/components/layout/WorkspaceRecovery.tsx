import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkspaceClient } from '../../workspace-client'
import { rememberRecoveredDraft, workspaceDraftStatus, flushWorkspaceDrafts, isWorkspaceDraftLoaded, archivedWorkspaceDrafts, forgetArchivedWorkspaceDraft, forgetDiscardedWorkspaceDraft, nextWorkspaceDraftOrder, prepareWorkspaceDraftWriter } from '../../workspace-drafts'
import type { WorkspaceDraftRecord, WorkspaceDraftInput } from '../../../shared/contracts/workspace-draft.contract'
import { useUIStore } from '../../stores/ui.store'
import { useAssetStore } from '../../stores/asset.store'
import { useLibraryViewStore } from '../../stores/library-view.store'
import { Button, Notice, ReviewSheet } from '../ui/WorkspacePrimitives'

const labels = { description: '描述', prompt: '提示词', notebook: '图片笔记', ocr: '文字修订', 'work-set': '工作集','work-media':'视频参考' }
export default function WorkspaceRecovery() {
  const [records, setRecords] = useState<WorkspaceDraftRecord[]>([])
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [draftStatus, setDraftStatus] = useState(workspaceDraftStatus())
  const [localDrafts, setLocalDrafts] = useState(archivedWorkspaceDrafts())
  const [discard, setDiscard] = useState<{kind:'received';record:WorkspaceDraftRecord}|{kind:'local';draft:WorkspaceDraftInput}>()
  const scopeKey = useLibraryViewStore(state => state.scope)
  const scope = scopeKey ? JSON.parse(scopeKey) as [string, string] : null
  const failed = draftStatus === 'failed'
  const api = getWorkspaceClient(), theme = useUIStore(state => state.theme), assets = useAssetStore(state => state.assets)
  const navigate = useNavigate()
  useEffect(() => {
    setRecords([])
    setDiscard(undefined)
    let live = true, timer: ReturnType<typeof setTimeout> | undefined
    let sequence = 0
    const read = async () => {
      const request = ++sequence
      try { const next = await api?.drafts.list(); if (live && request === sequence) setRecords(next ?? []) }
      catch { if (live && request === sequence) setError('草稿暂不可读，请重新连接后重试。') }
    }
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { void read() }, 500) }
    const show = () => { setOpen(true); void read() }
    const status = () => { setDraftStatus(workspaceDraftStatus()); setLocalDrafts(archivedWorkspaceDrafts()) }
    const stop = api?.onDraftsChanged(refresh), stopWorkspace = api?.onWorkspaceChanged(refresh)
    window.addEventListener('workspace-recovery-open', show)
    window.addEventListener('workspace-draft-status', status)
    void read()
    return () => { live = false; clearTimeout(timer); stop?.(); stopWorkspace?.(); window.removeEventListener('workspace-recovery-open', show); window.removeEventListener('workspace-draft-status', status) }
  }, [api, scopeKey])
  const run = async (operation: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError('')
    try { await operation(); setRecords(await api!.drafts.list()); return true }
    catch { setError('未能处理草稿。其他界面可能仍在编辑，或草稿已变化；请关闭原界面后重试。'); return false }
    finally { setBusy(false) }
  }
  const recoverable = records.filter(record => !record.activeElsewhere && (!record.owned || !isWorkspaceDraftLoaded(record)))
  return <>
    {(recoverable.length > 0 || localDrafts.length > 0 || draftStatus !== 'none') && <div className="workspace-recovery-banner" role="status">
      {failed ? '草稿尚未暂存，输入仍保留。' : draftStatus === 'pending' ? '正在暂存草稿…' : draftStatus === 'saved' ? '草稿已暂存在本机，尚未正式保存。' : localDrafts.length ? '此界面保留了尚未送达的旧库输入。' : `本机保留了 ${recoverable.length} 项草稿。`}
      {(recoverable.length > 0 || localDrafts.length > 0) && <Button onClick={() => setOpen(true)}>查看本机草稿</Button>}
      {failed && <Button onClick={() => { void flushWorkspaceDrafts().catch(() => setError('暂存失败，请检查连接。')) }}>重试暂存</Button>}
    </div>}
    {discard && <ReviewSheet label="放弃这项草稿" busy={busy} onCancel={() => setDiscard(undefined)} surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="file-picker"><h2>放弃这项草稿</h2><p>{labels[discard.kind==='local'?discard.draft.kind:discard.record.kind]}</p><p>只放弃这项{discard.kind==='local'?'尚未送达的输入':'本机暂存草稿'}。素材库中已保存的内容保持原样。</p>
        {error && <Notice tone="danger">{error}</Notice>}
        <footer><Button disabled={busy} onClick={()=>setDiscard(undefined)}>保留草稿</Button><Button disabled={busy} variant="primary" onClick={()=>{
          const selected=discard
          const order=nextWorkspaceDraftOrder()
          void run(async()=>{if(selected.kind==='local')forgetArchivedWorkspaceDraft(selected.draft);else {await prepareWorkspaceDraftWriter();await api!.drafts.discard({id:selected.record.id,revision:selected.record.revision,...order});forgetDiscardedWorkspaceDraft(selected.record,order)}}).then(ok=>{if(ok)setDiscard(undefined)})
        }}>确认放弃草稿</Button></footer>
      </div>
    </ReviewSheet>}
    {open && !discard && <ReviewSheet label="本机恢复草稿" busy={busy} onCancel={() => setOpen(false)} surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="file-picker"><h2>本机恢复草稿</h2><p>暂存内容与素材库分开。恢复后仍需检查冲突，并点击保存。</p>
        {records.length === 0 && localDrafts.length === 0 && <p>当前素材库没有暂存草稿。</p>}
        {localDrafts.map(draft => <section key={JSON.stringify(draft)} className="ui-card p-3"><h3>{labels[draft.kind]} · 此界面未送达的输入</h3>
          <p>输入仅保存在此界面，尚未收到 Host 回执。请重新打开对应素材库后，明确恢复并核对保存基线。</p>
          {typeof draft.value === 'string' && <p className="whitespace-pre-wrap">{draft.value.slice(0, 240)}</p>}
          <Button disabled={busy || !scope || scope[0] !== draft.libraryIdentity} onClick={() => void run(async () => {
            if (!scope) return
            const current = { ...draft, generation: scope[1], ...nextWorkspaceDraftOrder() }
            if (isWorkspaceDraftLoaded(current)) throw Error('LOCAL_DRAFT_ACTIVE')
            await prepareWorkspaceDraftWriter()
            const record = await api!.drafts.put(current)
            rememberRecoveredDraft(record); forgetArchivedWorkspaceDraft(draft); navigate('/library'); setOpen(false)
          })}>恢复未送达输入</Button>
          <Button disabled={busy} onClick={() => {setError('');setDiscard({kind:'local',draft})}}>放弃未送达输入</Button>
        </section>)}
        {records.map(record => <section key={record.id} className="ui-card p-3"><h3>{labels[record.kind]} · {assets.find(asset => asset.id === record.entityId)?.title ?? (record.kind === 'work-set' ? '工作集' : '素材')}</h3>
          <p className="ui-meta">{new Date(record.updatedAt).toLocaleString()} · {record.clientKind === 'browser' ? '浏览器' : record.clientKind === 'desktop' ? '桌面' : '悬浮窗口'}</p>
          {typeof record.value === 'string' && <p className="whitespace-pre-wrap">{record.value.slice(0, 240)}</p>}
          {record.owned && isWorkspaceDraftLoaded(record) ? <p>当前界面正在使用此草稿。</p> : record.activeElsewhere ? <p>另一界面仍在编辑。关闭该界面后可恢复。</p> : <Button disabled={busy} onClick={() => void run(async () => {
            if (isWorkspaceDraftLoaded(record)) throw Error('LOCAL_DRAFT_ACTIVE')
            const order=nextWorkspaceDraftOrder()
            await prepareWorkspaceDraftWriter()
            const recovered = await api!.drafts.recover({ id: record.id, ...order })
            if (isWorkspaceDraftLoaded(recovered)) throw Error('LOCAL_DRAFT_ACTIVE')
            rememberRecoveredDraft(recovered); navigate('/library'); setOpen(false)
          })}>恢复这项草稿</Button>}
          {(!record.owned || !isWorkspaceDraftLoaded(record)) && <Button disabled={busy || record.activeElsewhere} onClick={() => {setError('');setDiscard({kind:'received',record})}}>放弃暂存草稿</Button>}
        </section>)}
        {error && <Notice tone="danger">{error}</Notice>}<footer><Button disabled={busy} onClick={() => setOpen(false)}>返回</Button></footer>
      </div>
    </ReviewSheet>}
  </>
}
