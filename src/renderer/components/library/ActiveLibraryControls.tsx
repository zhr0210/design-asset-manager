import { workspaceMediaUrl } from '../../workspace-client'
import {useUIStore} from '../../stores/ui.store'
import { getWorkspaceClient } from '../../workspace-client'
import { IntakeRecoveryPanel } from './IntakeRecoveryPanel'
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button, EmptyState, Notice, StatusBadge, ReviewSheet } from '../ui/WorkspacePrimitives'
import { ArchiveRestore, FolderOpen, LibraryBig, PackagePlus, X } from 'lucide-react'

import type {
  ActiveLibraryCaptureBatchSnapshot,
  ActiveLibraryCopyPlan,
  ActiveLibraryHostProjection,
  ActiveLibraryTrashEntryProjection,
  CreateLibraryPlanProjection
} from '../../../shared/contracts/active-library.contract'

interface ActiveLibraryControlsProps {
  projection: ActiveLibraryHostProjection
  onAuthorityWillChange(): void
  onAuthorityReady(): Promise<void>
  onAuthorityChangeComplete(): Promise<void>
  refreshProjection(): Promise<void>
}

type LibraryApi = {
  createPrepare(): Promise<unknown>
  createConfirm(receipt: string): Promise<unknown>
  open(): Promise<unknown>
  close(): Promise<unknown>
  reopen(): Promise<unknown>
  addPrepare(): Promise<unknown>
  addDispatch(receipt: string): Promise<unknown>
  trashList(): Promise<unknown>
  trashDispatch(command: unknown): Promise<unknown>
}

export interface ActiveLibraryControlActions {addFiles():void}
export default React.forwardRef<ActiveLibraryControlActions,ActiveLibraryControlsProps>(function ActiveLibraryControls({
  projection,
  onAuthorityWillChange,
  onAuthorityReady,
  onAuthorityChangeComplete,
  refreshProjection
}: ActiveLibraryControlsProps, ref) {
  const theme=useUIStore(s=>s.theme)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createPlan, setCreatePlan] = useState<CreateLibraryPlanProjection | null>(null)
  const [copyPlan, setCopyPlan] = useState<ActiveLibraryCopyPlan | null>(null)
  const [lastCapture, setLastCapture] = useState<ActiveLibraryCaptureBatchSnapshot | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashEntries, setTrashEntries] = useState<readonly ActiveLibraryTrashEntryProjection[]>([])

  const api = getWorkspaceClient()?.library as LibraryApi | undefined
  const ready = projection.state === 'ready'

  const run = async (label: string, operation: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try {
      if (!api) throw new Error('本地 Library 服务不可用。')
      await operation()
    } catch (caught) {
      setError(safeMessage(caught))
      try { await refreshProjection() } catch { /* keep the last safe projection */ }
    } finally {
      setBusy(null)
    }
  }

  const refreshTrash = async () => {
    if (!api) throw new Error('本地 Library 服务不可用。')
    const result = unwrap<readonly ActiveLibraryTrashEntryProjection[]>(await api.trashList())
    setTrashEntries(result)
  }

  const completeAuthorityChange = onAuthorityChangeComplete

  const prepareCreate = () => run('create-prepare', async () => {
    const result = unwrap<{ kind: 'cancelled' } | { kind: 'planned'; plan: CreateLibraryPlanProjection }>(await api!.createPrepare())
    if (result.kind === 'planned') setCreatePlan(result.plan)
  })

  const confirmCreate = () => run('create-confirm', async () => {
    if (!createPlan) return
    onAuthorityWillChange()
    unwrap(await api!.createConfirm(createPlan.receipt))
    await completeAuthorityChange()
    setCreatePlan(null)
  })

  const openLibrary = () => run('open', async () => {
    onAuthorityWillChange()
    const result = unwrap<{ kind?: 'cancelled' }>(await api!.open())
    if (result.kind === 'cancelled') {
      await refreshProjection()
      return
    }
    await completeAuthorityChange()
  })

  const closeLibrary = () => run('close', async () => {
    onAuthorityWillChange()
    unwrap(await api!.close())
    setCopyPlan(null)
    setTrashOpen(false)
    setTrashEntries([])
    await refreshProjection()
  })

  const reopenLibrary = () => run('reopen', async () => {
    onAuthorityWillChange()
    unwrap(await api!.reopen())
    await completeAuthorityChange()
  })

  const prepareAdd = () => run('add-prepare', async () => {
    const result = unwrap<{ kind: 'cancelled' } | { kind: 'planned'; plan: ActiveLibraryCopyPlan }>(await api!.addPrepare())
    if (result.kind === 'planned') setCopyPlan(result.plan)
  })

  const confirmAdd = () => run('add-confirm', async () => {
    if (!copyPlan) return
    if(copyPlan.items.some(item=>item.eligibility.kind==='eligible'&&item.detectedFormat==='mp4')){
      const scope={libraryIdentity:copyPlan.activeLibrary.identity,generation:copyPlan.activeLibrary.generation}
      const media=getWorkspaceClient()!.workSets,current=await media.mediaStatus(scope)
      if(!current.success)throw Error(current.error)
      if(current.value.schemaVersion<15){const enabled=await media.mediaEnable({...scope,sessionToken:current.value.sessionToken,expectedSchemaVersion:current.value.schemaVersion,allowUpgrade:true});if(!enabled.success)throw Error(enabled.error)}
    }
    const result = unwrap<ActiveLibraryCaptureBatchSnapshot>(await api!.addDispatch(copyPlan.receipt))
    setLastCapture(result)
    setCopyPlan(null)
    await onAuthorityReady()
  })

  const toggleTrash = () => run('trash-list', async () => {
    if (trashOpen) {
      setTrashOpen(false)
      return
    }
    await refreshTrash()
    setTrashOpen(true)
  })

  const restore = (entry: ActiveLibraryTrashEntryProjection) => run(`restore:${entry.id}`, async () => {
    unwrap(await api!.trashDispatch({
      kind: 'restore-design-asset',
      designAssetIdentity: entry.id,
      expectedRevision: entry.revision
    }))
    await Promise.all([refreshTrash(), onAuthorityReady()])
  })

  React.useImperativeHandle(ref,()=>({addFiles:()=>{if(ready&&busy===null)void prepareAdd()}}))

  return <section data-testid="active-library-controls" className="library-context-bar">
    <div className="library-context-heading">
      <div>
        <div className="ui-eyebrow">资料库</div>
        <div className="mt-1 flex items-center gap-3"><h1>本地素材库</h1><StatusBadge tone="neutral">{ready ? '已打开' : libraryStateLabel(projection.state)}</StatusBadge></div>
      </div>
      {ready && <div className="library-context-actions"><IntakeRecoveryPanel key={`${projection.identity}:${projection.generation}`} onRecovered={onAuthorityReady} />
        <Button data-testid="library-add-assets" variant="primary" disabled={busy !== null} onClick={prepareAdd}><PackagePlus />添加素材</Button>
        <Button data-testid="library-trash-toggle" disabled={busy !== null} onClick={toggleTrash}><ArchiveRestore />回收站</Button>
        <Button data-testid="library-close" variant="ghost" disabled={busy !== null} onClick={closeLibrary}>关闭素材库</Button>
      </div>}
    </div>

    {!ready && <div className="ui-card p-0">
      <EmptyState icon={<LibraryBig />} title={projection.state==='recovery-required'?'当前素材库未成功打开':'为下一次创作，安放好素材'} description={projection.state==='recovery-required'?'保留现有文件，重新选择兼容的 DAM 素材库；创建新库请选择空文件夹。AI 账号配置与设置仍可使用。':'创建一个本地素材库，或打开已有素材库。导入采用复制方式，来源文件会完整保留。'} actions={<>
        <Button data-testid="library-create" variant="primary" disabled={busy !== null} onClick={prepareCreate}>创建素材库</Button>
        <Button data-testid="library-open" disabled={busy !== null} onClick={openLibrary}><FolderOpen />打开已有素材库</Button>
        {projection.state === 'closed' && <Button data-testid="library-reopen" variant="ghost" disabled={busy !== null} onClick={reopenLibrary}>重新打开上次素材库</Button>}
      </>} />
      <div className="flex justify-center gap-6 border-t px-5 py-4 ui-meta" style={{borderColor:'var(--ui-border)'}}>
        <NavLink to="/legacy-library" className="hover:underline">使用过旧版本？找回旧素材</NavLink>
        <NavLink to="/connected-libraries" className="hover:underline">已有 Eagle 库？了解连接方式</NavLink>
      </div>
    </div>}

    {busy && <Notice>正在处理，请稍候…</Notice>}
    {error && !createPlan && !copyPlan && <Notice tone="danger" data-testid="library-action-error">{error}</Notice>}
    {lastCapture && <Notice tone="positive" data-testid="library-capture-complete">已收录 {lastCapture.items.filter(item => item.state === 'promoted').length} 个素材，来源文件已保留。</Notice>}

    {createPlan && <ReviewSheet surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme==='dark'?'dark':''}`} label="确认创建素材库" busy={busy !== null} onCancel={() => setCreatePlan(null)}><div data-testid="library-create-review" className="ui-card">
      <div className="ui-section-heading"><span>确认创建素材库</span><Button variant="ghost" disabled={busy !== null} aria-label="取消创建预览" onClick={() => setCreatePlan(null)}><X /></Button></div>
      <p className="ui-muted mb-4 text-[13px] leading-7">所选位置已通过检查。将在这里保存导入素材的副本和预览，不会移动现有来源文件。</p>
      <div className="ui-actions">
        <Button data-testid="library-create-confirm" variant="primary" disabled={busy !== null} onClick={confirmCreate}>确认创建并打开</Button>
        <Button data-testid="library-create-cancel" disabled={busy !== null} onClick={() => setCreatePlan(null)}>取消</Button>
      </div>
    </div>{error && <Notice tone="danger" data-testid="library-action-error" className="mx-6 mb-5">{error}</Notice>}</ReviewSheet>}

    {copyPlan && <ReviewSheet surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme==='dark'?'dark':''}`} label="确认添加素材" busy={busy !== null} onCancel={() => setCopyPlan(null)}><div data-testid="library-copy-review" data-plan-receipt={copyPlan.receipt} className="ui-card">
      <div className="ui-section-heading"><span>确认添加素材</span><Button variant="ghost" disabled={busy !== null} aria-label="取消添加副本预览" onClick={() => setCopyPlan(null)}><X /></Button></div>
      <p className="ui-meta mb-3">已选择 {copyPlan.summary.selectedCount} 个；可收录 {copyPlan.summary.eligibleCount} 个；排除 {copyPlan.summary.excludedCount} 个。</p>
      <ul className="max-h-48 overflow-y-auto divide-y" style={{borderColor:'var(--ui-border)'}}>
        {copyPlan.items.map(item => <li key={item.planItemIdentity} className="flex items-center justify-between gap-4 py-3 text-[12px]">
          <span className="truncate">{item.receivedFileName}</span>
          <StatusBadge tone={item.eligibility.kind === 'eligible' ? 'positive' : 'warning'}>{item.eligibility.kind === 'eligible' ? item.detectedFormat?.toUpperCase() : excludedReason(item.eligibility.code)}</StatusBadge>
        </li>)}
      </ul>
      {copyPlan.items.some(item=>item.detectedFormat==='mp4')&&<Notice tone="warning">MP4（H.264、不旋转）使用独立原件与首帧图片预览，最多96 MiB、1小时、3840×2160。选择时先核验本机解码能力；视频不参与整图 AI 分析。首次确认会先备份并将库升级至 v15，旧版应用将无法打开；原件与已有内容保留。取消不升级。</Notice>}
      {!copyPlan.confirmable && <Notice tone="warning">没有可收录的素材，请重新选择 PNG、JPG、WEBP 或支持的 MP4 文件。</Notice>}
      <p className="ui-meta my-3">仅复制选中的文件，来源文件保持不变。</p>
      <div className="ui-actions"><Button data-testid="library-copy-confirm" variant="primary" disabled={busy !== null || !copyPlan.confirmable} onClick={confirmAdd}>确认复制并收录</Button><Button data-testid="library-copy-cancel" disabled={busy !== null} onClick={() => setCopyPlan(null)}>取消</Button></div>
    </div>{error && <Notice tone="danger" data-testid="library-action-error" className="mx-6 mb-5">{error}</Notice>}</ReviewSheet>}

    {trashOpen && <div data-testid="library-trash-panel" className="ui-card">
      <div className="ui-section-heading"><span>回收站 <span className="ui-meta ml-2">{trashEntries.length} 个素材</span></span><Button variant="ghost" aria-label="关闭回收站" onClick={() => setTrashOpen(false)}><X /></Button></div>
      <p className="ui-meta mb-3">文件和标签仍被保留，可恢复到素材库。</p>
      {trashEntries.length === 0 ? <p className="ui-muted py-5 text-center text-[12px]">回收站为空</p> : <div className="ui-grid">
        {trashEntries.map(entry => <div key={entry.id} data-trash-asset-id={entry.id} className="flex items-center gap-3 rounded-lg border p-3" style={{borderColor:'var(--ui-border)'}}>
          <img src={previewUrl(projection,entry.id)} alt="回收站素材预览" className="h-14 w-14 rounded-md object-contain" />
          <span className="ui-meta flex-1">可恢复素材</span><Button aria-label="恢复素材" disabled={busy !== null} onClick={() => restore(entry)}>恢复</Button>
        </div>)}
      </div>}
    </div>}
  </section>
})

function unwrap<T>(value: unknown): T {
  if (value && typeof value === 'object' && 'error' in value) {
    const message = Reflect.get(value, 'error')
    throw new Error(typeof message === 'string' ? message : '本地 Library 操作失败。')
  }
  return value as T
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    'The Active Library is not open.': '请先打开一个素材库。',
    'The Active Library is closed.': '素材库已关闭，请重新打开。',
    'The Active Library is opening or changing.': '正在切换素材库，请稍候。',
    'The Active Library is closing.': '正在安全关闭素材库，请稍候。',
    'The Active Library requires recovery.': '这个素材库需要检查，请保留文件并重新选择。',
    'The Active Library write authority is unavailable.': '当前无法写入素材库。请确认没有其他程序正在占用它。',
    'The Active Library generation changed.': '素材库状态已变化，请重新选择后再试。',
    'The selected Library target is unavailable.': '无法使用这个位置，请选择本机可读写的文件夹。',
    'The selected Library target is not empty.': '请为新素材库选择一个空文件夹。',
    'The Library creation plan is unavailable.': '创建确认已失效，请重新选择位置。',
    'The Library receipt is stale.': '所选位置已变化，请重新检查。',
    'The Active Library operation failed.': '操作未完成，请重试。',
    '另一界面仍有尚未保存的表单或笔记编辑，请先保存或取消编辑。': '另一界面仍有尚未保存的表单或笔记编辑，请先保存或取消编辑。',
    '草稿尚未暂存成功，暂未切库或退出。': '草稿尚未暂存成功，暂未切库或退出。请检查连接后重试。',
    '另一个界面未回应，暂未切库或退出。请回到该界面检查连接。': '另一个界面未回应，暂未切库或退出。请回到该界面检查连接。',
    '已取消，所有界面的输入继续保留。': '已取消，所有界面的输入继续保留。',
    '请先完成或取消当前切库或退出审查。': '请先完成或取消当前切库或退出审查。',
    '本地 Library 服务不可用。': '素材库服务暂时不可用，请重启应用后重试。'
  }
  return messages[message] ?? '素材库操作未完成，请重试。'
}

function libraryStateLabel(state: ActiveLibraryHostProjection['state']): string {
  if (state === 'opening') return '正在打开'
  if (state === 'quiescing') return '正在关闭'
  if (state === 'recovery-required') return '需要恢复'
  if (state === 'closed') return '已关闭'
  return '尚未打开'
}

function excludedReason(code: string): string {
  if (code === 'unsupported-format') return '格式不支持'
  if (code === 'not-a-regular-file') return '不是普通文件'
  return '无法读取'
}

function previewUrl(projection: ActiveLibraryHostProjection, assetId: string): string {
  return projection.identity && projection.generation
    ? workspaceMediaUrl(`dam-preview://preview/${encodeURIComponent(projection.identity)}/${encodeURIComponent(projection.generation)}/${encodeURIComponent(assetId)}`)
    : ''
}
