import { requireWorkspaceClient } from '../workspace-client'
import { workspaceMediaUrl } from '../workspace-client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransientWorkspaceEdit } from '../workspace-edit-guards'
import {
  AlertTriangle,
  Cable,
  CloudOff,
  FilePenLine,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react'

import type {
  ConnectedCleanupCandidateProjection,
  ConnectedConflictProjection,
  ConnectedLibraryItemProjection,
  ConnectedLibraryProjection,
  ConnectedLibraryReview,
  ConnectedOperationProjection,
  EaglePairingProjection
} from '../../shared/contracts/external-connected-library.contract'
import {
  Button,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge
} from '../components/ui/WorkspacePrimitives'

const emptyProjection: ConnectedLibraryProjection = {
  state: 'unconfigured',
  evidenceLevel: 'not-connected',
  provider: 'eagle',
  providerIdentity: null,
  libraryIdentity: null,
  generation: null,
  displayName: null,
  originalAuthority: 'eagle-single-original',
  scope: null,
  grant: 'none',
  capabilities: null,
  counts: {
    indexed: 0,
    inScope: 0,
    pending: 0,
    conflicts: 0,
    trashed: 0,
    cleanupCandidates: 0
  },
  cursor: null,
  indexingComplete: false
}

export default function ConnectedLibrariesPage() {
  const api = requireWorkspaceClient()?.connectedLibrary
  const [projection, setProjection] = useState<ConnectedLibraryProjection>(emptyProjection)
  const [review, setReview] = useState<ConnectedLibraryReview | null>(null)
  const [items, setItems] = useState<readonly ConnectedLibraryItemProjection[]>([])
  const [operations, setOperations] = useState<readonly ConnectedOperationProjection[]>([])
  const [conflicts, setConflicts] = useState<readonly ConnectedConflictProjection[]>([])
  const [cleanup, setCleanup] = useState<readonly ConnectedCleanupCandidateProjection[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [pairing, setPairing] = useState<EaglePairingProjection | null>(null)
  const [requestedGrant, setRequestedGrant] = useState<'read-only' | 'read-write'>('read-only')
  const [names, setNames] = useState<Record<string, string>>({})
  const [brokenPreviews, setBrokenPreviews] = useState<ReadonlySet<string>>(new Set())
  const mediaAuthorityRef = useRef({ libraryIdentity: null as string | null, generation: null as string | null })
  const refreshEpoch = useRef(0)
  useTransientWorkspaceEdit(Object.entries(names).some(([key,name])=>name !== items.find(item=>item.key===key)?.title))

  const refresh = async ({ resetPreviews = false }: { resetPreviews?: boolean } = {}) => {
    const epoch = ++refreshEpoch.current
    if (!api) throw new Error('CONNECTED_LIBRARY_UNAVAILABLE')
    const next = unwrap<ConnectedLibraryProjection>(await api.inspect())
    const [listed, queued, foundConflicts, candidates, pairStatus] = await Promise.all([
      api.list(),
      api.operations(),
      api.conflicts(),
      api.cleanupCandidates(),
      next.evidenceLevel === 'synthetic-protocol' ? null : api.pairingInspect()
    ])
    if(epoch !== refreshEpoch.current)return
    setProjection(next)
    if (pairStatus) setPairing(unwrap(pairStatus))
    setItems(unwrap(listed))
    setOperations(unwrap(queued))
    setConflicts(unwrap(foundConflicts))
    setCleanup(unwrap(candidates))
    const previousAuthority = mediaAuthorityRef.current
    const authorityChanged = previousAuthority.libraryIdentity !== next.libraryIdentity ||
      previousAuthority.generation !== next.generation
    if (resetPreviews || authorityChanged) setBrokenPreviews(new Set())
    mediaAuthorityRef.current = {
      libraryIdentity: next.libraryIdentity,
      generation: next.generation
    }
  }

  const run = async (label: string, operation: () => Promise<void>) => {
    setBusy(label)
    setError(null)
    try {
      await operation()
    } catch (caught) {
      setError(safeError(caught))
    } finally {
      setBusy(null)
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    void run('initial-load', refresh)
    const client=requireWorkspaceClient(),stop=client.onConnectedLibrariesChanged(() => { void refresh().catch(() => setError('连接库状态暂不可读，请刷新重试。')) }),stopReconcile=client.onReconcile(refresh)
    return()=>{++refreshEpoch.current;stop();stopReconcile()}
  }, [])

  useEffect(() => {
    if (pairing?.state !== 'awaiting-eagle') return
    let cancelled = false
    const timer = window.setInterval(() => {
      void api.pairingInspect().then(result => { if (!cancelled) setPairing(unwrap(result)) })
        .catch(() => { if (!cancelled) setError('伴随插件暂不可达。配对请求失效后可以重新发起。') })
    }, 2000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [pairing?.state])

  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase()
    return items.filter((item) => !value ||
      [item.title, item.annotation, ...item.tags]
        .some((field) => field.toLocaleLowerCase().includes(value)))
  }, [items, query])
  const actionableConflicts = conflicts.filter((conflict) => conflict.state !== 'resolved')
  const isConnected = projection.grant !== 'none'

  return <article className="ui-page">
    <PageHeader
      eyebrow="CONNECTED LIBRARY"
      title="Eagle 连接库"
      description="Eagle 保留唯一正式原件；本应用保存可搜索索引、同步结果和待提交编辑。"
      actions={<>
        <Button
          variant="ghost"
          data-testid="connected-refresh"
          disabled={busy !== null}
          onClick={() => run('refresh', () => refresh({ resetPreviews: true }))}
        >
          <RefreshCw aria-hidden="true" />
          刷新
        </Button>
        {isConnected && <Button
          variant="secondary"
          data-testid="connected-disconnect"
          disabled={busy !== null}
          onClick={() => run('disconnect', async () => {
            unwrap(await api.disconnect())
            await refresh()
          })}
        >
          断开连接
        </Button>}
      </>}
    />

    {projection.evidenceLevel === 'synthetic-protocol' && <Notice tone="warning">
      当前为模拟连接，用于验证交互与同步流程；尚未连接真实 Eagle。
    </Notice>}

    {pairing && <section className="ui-card" aria-label="Eagle 本机配对">
      <div className="ui-section-heading"><div>
        <h2>本机配对</h2>
        <p className="ui-muted">先在 Eagle 安装并打开 DAM 伴随插件，选择要连接的库；再从这里发起请求，在 Eagle 确认该库与权限。配对秘密由应用内部处理。</p>
      </div><StatusBadge tone={pairing.state === 'paired' ? 'positive' : 'warning'}>{({
        unpaired: '尚未配对', 'awaiting-eagle': '等待 Eagle 确认', paired: '已配对',
        unavailable: '插件不可达或需重新配对', 'storage-unavailable': '安全凭据存储不可用'
      })[pairing.state]}</StatusBadge></div>
      {pairing.displayName && <p>已授权库：{pairing.displayName} · {pairing.requestedGrant === 'read-write' ? '可编辑' : '只读'}</p>}
      <label className="ui-field"><span className="ui-label">请求权限</span>
        <select className="ui-input" value={requestedGrant} disabled={busy !== null || pairing.state === 'awaiting-eagle' || pairing.state === 'paired'}
          onChange={event => setRequestedGrant(event.target.value as 'read-only' | 'read-write')}>
          <option value="read-only">只读：索引、搜索与预览</option>
          <option value="read-write">可编辑：修改、添加、回收/恢复与文件替换</option>
        </select>
      </label>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={busy !== null} onClick={() => run('plugin-download', async () => {
          const artifact = unwrap<{ fileName: string; bytesBase64: string; sha256: string }>(await api.companionArtifact())
          const bytes = Uint8Array.from(atob(artifact.bytesBase64), character => character.charCodeAt(0))
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('')
          if (digest !== artifact.sha256) throw Error('插件文件校验未通过，请重新下载。')
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
          const link = document.createElement('a'); link.href = url; link.download = artifact.fileName; link.click()
          window.setTimeout(() => URL.revokeObjectURL(url), 10000)
        })}>下载伴随插件</Button>
        <Button variant="primary" disabled={busy !== null || pairing.state === 'awaiting-eagle' || pairing.state === 'paired' || pairing.state === 'storage-unavailable'}
          onClick={() => run('pairing', async () => setPairing(unwrap(await api.pairingBegin(requestedGrant))))}>发起本机配对</Button>
        {pairing.state !== 'unpaired' && <Button variant="secondary" disabled={busy !== null}
          onClick={() => run('revoke', async () => {
            setPairing(unwrap(await api.pairingRevoke())); setReview(null); await refresh()
          })}>取消 / 撤销配对</Button>}
        {pairing.state === 'paired' && <Button variant="secondary" disabled={busy !== null}
          onClick={() => run('prepare', async () => {
            const result = unwrap<any>(await api.prepare({ kind: 'all' }, pairing.requestedGrant ?? 'read-only'))
            if (result.kind === 'unavailable') throw new Error('EAGLE_PROVIDER_UNAVAILABLE')
            setReview(result.review)
          })}>核对库与连接权限</Button>}
      </div>
      <p className="ui-muted">插件退出、切库或重启后需重新确认；DAM 的索引与未完成同步记录保留。永久删除不可用。</p>
      {error && <Notice tone="warning">{error}</Notice>}
      {busy && <InlineBusy label={busyLabel(busy)} />}
      {isConnected && review && <ConnectionReview review={review} busy={busy !== null}
        onCancel={() => setReview(null)} onConfirm={() => run('confirm', async () => {
          unwrap(await api.confirm(review.receipt)); setReview(null); await refresh()
        })} />}
    </section>}

    {initialLoading && <section data-testid="connected-state" className="ui-card">
      <EmptyState
        icon={<RefreshCw />}
        title="正在读取连接状态"
        description="正在检查本地索引与待处理记录。"
      />
    </section>}

    {!initialLoading && !isConnected && <section data-testid="connected-state" className="ui-card">
      <EmptyState
        icon={<Cable />}
        title="尚未开启真实 Eagle 连接"
        description="需要 Eagle 4.0 Build 21 或更高版本。配对成功后核对库名与权限，确认后开始分页索引；原件留在 Eagle。"
        actions={<Button
          variant="primary"
          data-testid="connected-prepare"
          disabled={busy !== null || pairing !== null && pairing.state !== 'paired'}
          onClick={() => run('prepare', async () => {
            const result = unwrap<any>(await api.prepare({ kind: 'all' }, pairing?.requestedGrant ?? 'read-write'))
            if (result.kind === 'unavailable') throw new Error('EAGLE_PROVIDER_UNAVAILABLE')
            setReview(result.review)
          })}
        >
          检查整库连接条件
        </Button>}
      />
      <div className="ui-divider" />
      <p className="ui-muted">当前界面仅支持整库范围。确认前会先展示原件归属、权限与可用能力。</p>
      {review && <ConnectionReview
        review={review}
        busy={busy !== null}
        onCancel={() => setReview(null)}
        onConfirm={() => run('confirm', async () => {
          unwrap(await api.confirm(review.receipt))
          setReview(null)
          await refresh()
        })}
      />}
      {error && <ActionError message={error} onRetry={() => run('refresh', () => refresh({ resetPreviews: true }))} />}
      {busy && <InlineBusy label={busyLabel(busy)} />}
    </section>}

    {!initialLoading && isConnected && <>
      <ConnectionStatus
        projection={projection}
        busy={busy}
        error={error}
        onIndex={() => run('index', async () => {
          unwrap(await api.indexNext(100))
          await refresh()
        })}
        onAdd={() => run('add-new', async () => {
          unwrap(await api.prepareNew())
          await refresh()
        })}
        onSync={() => run('sync', async () => {
          unwrap(await (projection.grant === 'read-only' ? api.indexNext(100) : api.sync(100)))
          await refresh({ resetPreviews: projection.state === 'disconnected' })
        })}
        onRetry={() => run('refresh', () => refresh({ resetPreviews: true }))}
      />

      <section
        className="ui-card"
        {...(actionableConflicts.length > 0 ? { 'data-testid': 'connected-conflicts' } : {})}
      >
        <div className="ui-section-heading">
          <div>
            <h2>需要处理</h2>
            <p className="ui-muted">其他素材会继续同步。请逐项选择本地版本、Eagle 版本，或先搁置。</p>
          </div>
          <StatusBadge tone={actionableConflicts.length > 0 ? 'warning' : 'positive'}>
            {actionableConflicts.length} 个冲突
          </StatusBadge>
        </div>
        {actionableConflicts.length > 0
          ? <div className="space-y-3">
              {actionableConflicts.map((conflict) => <ConflictCard
                key={conflict.conflictId}
                conflict={conflict}
                disabled={busy !== null}
                onResolve={(decision) => run(`conflict-${decision}`, async () => {
                  unwrap(await api.resolveConflict(conflict.conflictId, decision))
                  if (decision === 'use-eagle' && conflict.field === 'name') {
                    setNames((current) => withoutKey(current, conflict.itemKey))
                  }
                  await refresh()
                })}
              />)}
            </div>
          : <Notice tone="positive">没有需要处理的冲突。本地更改与 Eagle 当前版本一致。</Notice>}
      </section>

      <section className="ui-card">
        <div className="ui-section-heading">
          <div>
            <h2>素材浏览</h2>
            <p className="ui-muted">搜索当前索引；修改会在明确保存后进入同步记录。</p>
          </div>
          <StatusBadge tone="neutral">{projection.counts.inScope} 项</StatusBadge>
        </div>
        <label className="ui-field">
          <span className="ui-label">搜索 Eagle 索引</span>
          <span className="flex items-center gap-2" style={{ width: '100%' }}>
            <Search aria-hidden="true" />
            <input
              className="ui-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按名称、说明或标签搜索"
              style={{ width: '100%' }}
            />
          </span>
        </label>

        {visible.length > 0
          ? <div className="ui-grid" style={{ marginTop: 16 }}>
              {visible.map((item) => <ConnectedItemCard
                key={item.key}
                item={item}
                projection={projection}
                name={names[item.key] ?? item.title}
                previewBroken={brokenPreviews.has(previewFailureKey(projection, item.key))}
                busy={busy !== null}
                onNameChange={(name) => setNames((current) => ({ ...current, [item.key]: name }))}
                onPreviewError={() => setBrokenPreviews((current) =>
                  new Set(current).add(previewFailureKey(projection, item.key)))}
                onSaveName={() => run('queue-name', async () => {
                  unwrap(await api.queueMetadata(item.key, receipt('metadata'), {
                    name: names[item.key] ?? item.title
                  }))
                  await refresh()
                })}
                onPrepareFile={() => run('stage-file', async () => {
                  unwrap(await api.prepareFile(item.key))
                  await refresh()
                })}
                onLifecycle={(action) => run(action, async () => {
                  unwrap(await api.queueLifecycle(item.key, receipt(action), action))
                  await refresh()
                })}
              />)}
            </div>
          : <EmptyState
              icon={<Search />}
              title={items.length === 0 ? '索引中还没有素材' : '没有匹配的素材'}
              description={items.length === 0
                ? '继续索引以读取 Eagle 中的素材信息。'
                : '尝试名称、说明或标签中的其他关键词。'}
            />}
      </section>

      {cleanup.length > 0 && <CleanupSection
        candidates={cleanup}
        busy={busy !== null}
        onConfirm={(itemKey) => run('cleanup', async () => {
          unwrap(await api.confirmCleanup(itemKey, receipt('cleanup')))
          await refresh()
        })}
      />}

      {operations.length > 0 && <SyncHistory operations={operations} />}
    </>}
  </article>
}

function ConnectionReview({ review, busy, onConfirm, onCancel }: {
  review: ConnectedLibraryReview
  busy: boolean
  onConfirm(): void
  onCancel(): void
}) {
  return <div data-testid="connected-review" className="ui-card" style={{ marginTop: 16 }}>
    <div className="ui-section-heading">
      <div>
        <h2>确认连接到 {review.displayName}</h2>
        <p className="ui-muted">范围：整个 Eagle 库</p>
      </div>
      <StatusBadge tone={review.confirmable ? 'positive' : 'warning'}>
        {review.confirmable ? '可以确认' : '条件未满足'}
      </StatusBadge>
    </div>
    <ul className="space-y-2" style={{ paddingLeft: 18, marginTop: 16 }}>
      <li>Eagle 是唯一正式原件存储，不复制整库。</li>
      <li>权限：{review.requestedGrant === 'read-write' ? '读取并同步更改' : '只读索引'}。</li>
      <li>文件替换：{review.capabilities.fileReplace ? '配套组件已就绪' : '当前不可用'}。</li>
      <li>永久清理：{review.capabilities.permanentDelete ? '仅模拟环境可用' : '当前不可用'}。</li>
    </ul>
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <Button
        variant="primary"
        data-testid="connected-confirm"
        disabled={!review.confirmable || busy}
        onClick={onConfirm}
      >
        确认整库连接
      </Button>
      <Button variant="ghost" disabled={busy} onClick={onCancel}>取消</Button>
    </div>
  </div>
}

function ConnectionStatus({ projection, busy, error, onIndex, onAdd, onSync, onRetry }: {
  projection: ConnectedLibraryProjection
  busy: string | null
  error: string | null
  onIndex(): void
  onAdd(): void
  onSync(): void
  onRetry(): void
}) {
  const nextAction = projection.state === 'disconnected'
    ? 'Eagle 当前不可用。索引仍可搜索，更改会保留到重连后。'
    : projection.counts.conflicts > 0
      ? '先处理冲突；未冲突的素材仍可继续同步。'
      : projection.counts.pending > 0
        ? '有更改等待同步到 Eagle。'
        : projection.indexingComplete
          ? '连接正常，已完成当前索引。'
          : '继续读取 Eagle 素材索引。'
  return <section data-testid="connected-state" className="ui-card">
    <div className="ui-section-heading">
      <div>
        <h2>{projection.displayName ?? 'Eagle 连接库'}</h2>
        <p className="ui-muted">{nextAction}</p>
      </div>
      <StatusBadge tone={connectionTone(projection.state)}>{stateLabel(projection.state)}</StatusBadge>
    </div>
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <StatusBadge tone="neutral">{projection.counts.indexed} 已索引</StatusBadge>
      <StatusBadge tone={projection.counts.pending ? 'accent' : 'neutral'}>
        {projection.counts.pending} 待同步
      </StatusBadge>
      <StatusBadge tone={projection.counts.conflicts ? 'warning' : 'neutral'}>
        {projection.counts.conflicts} 有冲突
      </StatusBadge>
      <StatusBadge tone="neutral">{projection.counts.trashed} 在回收站</StatusBadge>
    </div>
    {projection.state === 'disconnected' && <Notice tone="warning" style={{ marginTop: 16 }}>
      <CloudOff aria-hidden="true" />
      Eagle 离线。不会覆盖远端内容；待处理更改会保留。
    </Notice>}
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <Button
        variant={projection.indexingComplete ? 'secondary' : 'primary'}
        data-testid="connected-index"
        disabled={busy !== null}
        onClick={onIndex}
      >
        {projection.indexingComplete ? '检查 Eagle 更新' : '继续读取索引'}
      </Button>
      <Button
        variant="primary"
        data-testid="connected-sync"
        disabled={busy !== null}
        onClick={onSync}
      >
        {projection.grant === 'read-only' ? '核对并刷新索引' : projection.state === 'disconnected' ? '重连并同步' : '同步待处理更改'}
      </Button>
      <Button
        variant="secondary"
        data-testid="connected-add-new"
        disabled={busy !== null || projection.grant !== 'read-write'}
        onClick={onAdd}
      >
        选择文件加入 Eagle
      </Button>
    </div>
    {busy && <InlineBusy label={busyLabel(busy)} />}
    {error && <ActionError message={error} onRetry={onRetry} />}
  </section>
}

function ConnectedItemCard({
  item,
  projection,
  name,
  previewBroken,
  busy,
  onNameChange,
  onPreviewError,
  onSaveName,
  onPrepareFile,
  onLifecycle
}: {
  item: ConnectedLibraryItemProjection
  projection: ConnectedLibraryProjection
  name: string
  previewBroken: boolean
  busy: boolean
  onNameChange(name: string): void
  onPreviewError(): void
  onSaveName(): void
  onPrepareFile(): void
  onLifecycle(action: 'trash' | 'restore'): void
}) {
  const editable = item.lifecycle !== 'tombstone' && item.lifecycle !== 'out-of-scope'
  return <article data-connected-item={item.key} className="ui-card" style={{ marginTop: 0 }}>
    <div className="flex gap-4">
      {previewBroken
        ? <div
            className="ui-card flex items-center justify-center"
            style={{ width: 112, minHeight: 84, marginTop: 0, padding: 12, background: 'var(--ui-surface-muted)' }}
          >
            <span className="ui-meta">预览不可用</span>
          </div>
        : <img
            src={previewUrl(projection, item.key)}
            alt={item.title}
            onError={onPreviewError}
            style={{ width: 112, height: 84, borderRadius: 8, objectFit: 'cover' }}
          />}
      <div className="min-w-0 flex-1">
        <h3 className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</h3>
        <div className="ui-actions" style={{ marginTop: 8 }}>
          <StatusBadge tone={item.sync === 'conflict' ? 'warning' : item.sync === 'pending' ? 'accent' : 'positive'}>
            {itemSyncLabel(item.sync)}
          </StatusBadge>
          <StatusBadge tone={item.lifecycle === 'trash' || item.lifecycle === 'tombstone' ? 'danger' : 'neutral'}>
            {itemLifecycleLabel(item.lifecycle)}
          </StatusBadge>
        </div>
        <p className="ui-meta" style={{ marginTop: 8 }}>{originalAvailabilityLabel(item.originalAvailability)}</p>
        {item.tags.length > 0 && <div className="ui-actions" style={{ marginTop: 8 }}>
          {item.tags.map((tag) => <StatusBadge key={tag} tone="neutral">{tag}</StatusBadge>)}
        </div>}
      </div>
    </div>

    {editable && <div style={{ marginTop: 16 }}>
      <label className="ui-field">
        <span className="ui-label">名称</span>
        <input
          className="ui-input"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label={`编辑名称 ${item.title}`}
        />
      </label>
      <div className="ui-actions" style={{ marginTop: 12 }}>
        <Button variant="primary" disabled={busy || !name.trim()} onClick={onSaveName}>
          保存名称
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onPrepareFile}>
          <FilePenLine aria-hidden="true" />
          选择替换文件
        </Button>
        {item.lifecycle === 'active' && <Button variant="danger" disabled={busy} onClick={() => onLifecycle('trash')}>
          <Trash2 aria-hidden="true" />
          移到 Eagle 回收站
        </Button>}
        {item.lifecycle === 'trash' && <Button variant="secondary" disabled={busy} onClick={() => onLifecycle('restore')}>
          <RotateCcw aria-hidden="true" />
          从回收站恢复
        </Button>}
      </div>
      <p className="ui-meta" style={{ marginTop: 8 }}>
        文件替换会先保留待提交副本；回收操作会在同步时写入 Eagle。
      </p>
    </div>}
  </article>
}

function ConflictCard({ conflict, disabled, onResolve }: {
  conflict: ConnectedConflictProjection
  disabled: boolean
  onResolve(decision: 'use-local' | 'use-eagle' | 'hold'): void
}) {
  return <article className="ui-card" style={{ marginTop: 0 }}>
    <div className="ui-section-heading">
      <div>
        <h3>{conflictKindLabel(conflict.kind)}{conflict.field ? ` · ${metadataFieldLabel(conflict.field)}` : ''}</h3>
        <p className="ui-meta">{conflict.state === 'held' ? '已搁置，内容仍安全保留' : '等待你的选择'}</p>
      </div>
      <StatusBadge tone={conflict.state === 'held' ? 'neutral' : 'warning'}>
        {conflict.state === 'held' ? '已搁置' : '待处理'}
      </StatusBadge>
    </div>
    <div className="ui-version-pair" style={{ marginTop: 16 }}>
      <VersionSummary title="本地版本" summary={conflict.localSummary} />
      <VersionSummary title="Eagle 版本" summary={conflict.eagleSummary} />
    </div>
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <Button variant="primary" disabled={disabled} onClick={() => onResolve('use-local')}>使用本地</Button>
      <Button variant="secondary" disabled={disabled} onClick={() => onResolve('use-eagle')}>使用 Eagle</Button>
      <Button variant="ghost" disabled={disabled} onClick={() => onResolve('hold')}>稍后处理</Button>
    </div>
  </article>
}

function VersionSummary({ title, summary }: { title: string; summary: string }) {
  return <div className="ui-card" style={{ marginTop: 0, background: 'var(--ui-surface-muted)' }}>
    <div className="ui-label">{title}</div>
    <p style={{ marginTop: 8, color: 'var(--ui-text)' }}>{summary}</p>
  </div>
}

function CleanupSection({ candidates, busy, onConfirm }: {
  candidates: readonly ConnectedCleanupCandidateProjection[]
  busy: boolean
  onConfirm(itemKey: string): void
}) {
  return <section className="ui-card">
    <div className="ui-section-heading">
      <div>
        <h2>回收站清理提醒</h2>
        <p className="ui-muted">满 30 天后仍需逐项确认；未同步或有冲突的项目不会清理。</p>
      </div>
    </div>
    <div className="space-y-2" style={{ marginTop: 16 }}>
      {candidates.map((candidate) => <div key={candidate.itemKey} className="ui-card" style={{ marginTop: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div style={{ fontWeight: 700 }}>{new Date(candidate.eligibleAt).toLocaleDateString()}</div>
            <div className="ui-meta">{cleanupBlockLabel(candidate.blockedBy)}</div>
          </div>
          <Button
            variant="danger"
            disabled={!candidate.confirmable || busy}
            onClick={() => onConfirm(candidate.itemKey)}
          >
            确认永久清理
          </Button>
        </div>
      </div>)}
    </div>
  </section>
}

function SyncHistory({ operations }: { operations: readonly ConnectedOperationProjection[] }) {
  return <details className="ui-card">
    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>同步记录 · {operations.length}</summary>
    <div className="space-y-2" style={{ marginTop: 16 }}>
      {operations.map((operation) => <div key={operation.operationId} className="ui-card" style={{ marginTop: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <span>{operationKindLabel(operation.kind)}</span>
          <StatusBadge tone={operationTone(operation.state)}>{operationStateLabel(operation.state)}</StatusBadge>
        </div>
        <details style={{ marginTop: 8 }}>
          <summary className="ui-meta" style={{ cursor: 'pointer' }}>诊断信息</summary>
          <div className="ui-meta" style={{ marginTop: 8 }}>
            操作标识：{operation.operationId} · 已检查 {operation.attemptCount} 次
          </div>
        </details>
      </div>)}
    </div>
  </details>
}

function InlineBusy({ label }: { label: string }) {
  return <Notice tone="neutral" style={{ marginTop: 16 }}>{label}</Notice>
}

function ActionError({ message, onRetry }: { message: string; onRetry(): void }) {
  return <Notice tone="danger" style={{ marginTop: 16 }}>
    <div className="flex items-center justify-between gap-4">
      <span>{message}</span>
      <Button variant="ghost" onClick={onRetry}>重试读取</Button>
    </div>
  </Notice>
}

function receipt(kind: string) {
  return `ui-${kind}:${crypto.randomUUID()}`
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

function unwrap<T>(value: any): T {
  if (value && typeof value === 'object' && value.error) throw new Error(String(value.error))
  return value as T
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message === 'EAGLE_PROVIDER_UNAVAILABLE' || message === 'CONNECTED_LIBRARY_UNAVAILABLE') {
    return '真实 Eagle 连接尚未就绪。请确认版本、配对组件与库身份后重试。'
  }
  if (/CONNECTED_LIBRARY|Connected Library|Eagle provider/iu.test(message)) {
    return '这项连接库操作未完成。现有索引和待处理更改仍会保留。'
  }
  return message && message.length < 180 && !/[\\/]|sqlite|token|path/iu.test(message)
    ? message
    : '连接库操作失败。当前更改仍会保留，请刷新状态后重试。'
}

function previewUrl(projection: ConnectedLibraryProjection, itemKey: string) {
  return projection.libraryIdentity && projection.generation
    ? workspaceMediaUrl(`dam-connected-preview://preview/${encodeURIComponent(projection.libraryIdentity)}/${encodeURIComponent(projection.generation)}/${encodeURIComponent(itemKey)}`)
    : ''
}

function previewFailureKey(projection: ConnectedLibraryProjection, itemKey: string) {
  return `${projection.libraryIdentity ?? 'none'}\0${projection.generation ?? 'none'}\0${itemKey}`
}

function stateLabel(state: ConnectedLibraryProjection['state']) {
  return ({
    unconfigured: '尚未连接',
    'review-required': '等待确认',
    connecting: '正在连接',
    indexing: '正在读取索引',
    ready: '连接正常',
    disconnected: 'Eagle 离线',
    conflict: '有冲突待处理',
    'recovery-required': '需要恢复',
    closed: '已关闭'
  })[state]
}

function connectionTone(state: ConnectedLibraryProjection['state']): 'neutral' | 'positive' | 'warning' | 'danger' {
  if (state === 'ready') return 'positive'
  if (state === 'conflict' || state === 'disconnected') return 'warning'
  if (state === 'recovery-required') return 'danger'
  return 'neutral'
}

function busyLabel(value: string) {
  return ({
    'initial-load': '正在读取连接状态…',
    refresh: '正在刷新…',
    prepare: '正在检查连接条件…',
    confirm: '正在确认连接…',
    disconnect: '正在断开连接…',
    pairing: '正在请求 Eagle 配对…',
    revoke: '正在撤销配对…',
    'plugin-download': '正在核对伴随插件文件…',
    index: '正在读取 Eagle 索引…',
    sync: '正在同步并核对结果…',
    'add-new': '正在准备新增素材…',
    'queue-name': '正在保存名称更改…',
    'stage-file': '正在准备文件替换…',
    trash: '正在准备移入回收站…',
    restore: '正在准备恢复…',
    cleanup: '正在核对清理结果…',
    'conflict-use-local': '正在保留本地版本…',
    'conflict-use-eagle': '正在保留 Eagle 版本…',
    'conflict-hold': '正在搁置冲突…'
  } as Record<string, string>)[value] ?? '正在处理…'
}

function itemLifecycleLabel(value: ConnectedLibraryItemProjection['lifecycle']) {
  return ({
    active: '正常',
    trash: 'Eagle 回收站',
    tombstone: '原件已不存在',
    'out-of-scope': '不在同步范围'
  })[value]
}

function itemSyncLabel(value: ConnectedLibraryItemProjection['sync']) {
  return ({ clean: '已同步', pending: '待同步', conflict: '有冲突' })[value]
}

function originalAvailabilityLabel(value: ConnectedLibraryItemProjection['originalAvailability']) {
  return ({
    'available-through-provider': '源文件可用',
    'mounted-read-only': '源文件只读可用',
    offline: '源文件暂不可用',
    'permanently-missing': '源文件已不存在'
  })[value]
}

function operationKindLabel(value: ConnectedOperationProjection['kind']) {
  return ({
    metadata: '更新信息',
    'replace-file': '替换文件',
    trash: '移入回收站',
    restore: '从回收站恢复',
    'add-file': '新增素材'
  })[value]
}

function operationStateLabel(value: ConnectedOperationProjection['state']) {
  return ({
    pending: '待同步',
    checking: '正在核对',
    committed: '已同步',
    conflict: '有冲突',
    held: '已搁置',
    failed: '同步失败'
  })[value]
}

function operationTone(state: ConnectedOperationProjection['state']): 'neutral' | 'positive' | 'warning' | 'danger' | 'accent' {
  if (state === 'committed') return 'positive'
  if (state === 'conflict' || state === 'held') return 'warning'
  if (state === 'failed') return 'danger'
  if (state === 'pending' || state === 'checking') return 'accent'
  return 'neutral'
}

function conflictKindLabel(value: ConnectedConflictProjection['kind']) {
  return ({
    field: '信息冲突',
    file: '文件冲突',
    'delete-versus-edit': '删除与编辑冲突',
    'library-changed': 'Eagle 库已切换',
    'volume-changed': '存储卷已变化',
    'result-uncertain': '同步结果待核对'
  })[value]
}

function metadataFieldLabel(value: NonNullable<ConnectedConflictProjection['field']>) {
  return ({ name: '名称', tags: '标签', rating: '评分', annotation: '说明', folderIds: '文件夹' })[value]
}

function cleanupBlockLabel(value: ConnectedCleanupCandidateProjection['blockedBy']) {
  return ({
    none: '可以清理',
    'pending-sync': '等待同步',
    conflict: '有冲突，已暂停',
    'provider-unsupported': '当前不可用'
  })[value]
}
