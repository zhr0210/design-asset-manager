import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Archive, Check, Database, FolderOpen, Search } from 'lucide-react'

import type {
  LegacyReadOnlyAssetProjection,
  LegacyReadOnlyProjection,
  LegacyReadOnlyReview
} from '../../shared/contracts/external-connected-library.contract'
import {
  Button,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge
} from '../components/ui/WorkspacePrimitives'

const emptyProjection: LegacyReadOnlyProjection = {
  state: 'unconfigured',
  evidenceLevel: 'not-opened',
  identity: null,
  generation: null,
  counts: { assets: 0, tags: 0, relations: 0 },
  limitations: []
}

export default function LegacyLibraryPage() {
  const api = (window as any).electronAPI?.legacyReadonly
  const [projection, setProjection] = useState<LegacyReadOnlyProjection>(emptyProjection)
  const [review, setReview] = useState<LegacyReadOnlyReview | null>(null)
  const [items, setItems] = useState<readonly LegacyReadOnlyAssetProjection[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [brokenPreviews, setBrokenPreviews] = useState<ReadonlySet<string>>(new Set())
  const mediaAuthorityRef = useRef({ identity: null as string | null, generation: null as string | null })

  const refresh = async ({ resetPreviews = false }: { resetPreviews?: boolean } = {}) => {
    if (!api) throw new Error('LEGACY_READONLY_UNAVAILABLE')
    const next = unwrap<LegacyReadOnlyProjection>(await api.inspect())
    setProjection(next)
    if (next.state === 'ready') {
      setItems(unwrap(await api.list()))
    } else {
      setItems([])
    }
    const previousAuthority = mediaAuthorityRef.current
    const authorityChanged = previousAuthority.identity !== next.identity ||
      previousAuthority.generation !== next.generation
    if (resetPreviews || authorityChanged) setBrokenPreviews(new Set())
    mediaAuthorityRef.current = { identity: next.identity, generation: next.generation }
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
  }, [])

  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase()
    return items.filter((item) => !value ||
      [item.title, item.fileName, ...item.tags]
        .some((field) => field.toLocaleLowerCase().includes(value)))
  }, [items, query])
  const ready = projection.state === 'ready'

  return <article className="ui-page">
    <PageHeader
      eyebrow="LEGACY LIBRARY"
      title="找回旧素材"
      description="只读查看旧版 Design Asset Manager 素材，不迁移、不复制，也不会写回旧库。"
      actions={<>
        <StatusBadge tone="accent">只读访问</StatusBadge>
        {ready && <Button variant="ghost" data-testid="legacy-refresh" disabled={busy !== null} onClick={() => run('refresh', () => refresh({ resetPreviews: true }))}>刷新</Button>}
        {ready && <Button
          variant="secondary"
          data-testid="legacy-close"
          disabled={busy !== null}
          onClick={() => run('close', async () => {
            unwrap(await api.close())
            setReview(null)
            setItems([])
            await refresh()
          })}
        >
          关闭旧库
        </Button>}
      </>}
    />

    {projection.evidenceLevel === 'synthetic-read-only' && <Notice tone="warning">
      当前展示的是合成只读验证数据，不是你的真实旧素材库。
    </Notice>}

    {initialLoading && <section data-testid="legacy-state" className="ui-card">
      <EmptyState
        icon={<Archive />}
        title="正在读取旧库状态"
        description="不会自动打开任何数据库或素材文件夹。"
      />
    </section>}

    {!initialLoading && !ready && <section data-testid="legacy-state" className="ui-card">
      <div className="ui-section-heading">
        <div>
          <h2>尚未打开旧 DAM 库</h2>
          <p className="ui-muted">请只选择本应用旧版生成的 .db 或 .sqlite 文件。Eagle Library 不是旧 DAM 库。</p>
        </div>
        <StatusBadge tone="neutral">等你选择</StatusBadge>
      </div>

      <ol className="ui-grid" style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
        <LegacyStep
          number="1"
          icon={<Database />}
          title="选择旧版数据库"
          description="选择旧版 Design Asset Manager 的 .db 或 .sqlite 文件。"
        />
        <LegacyStep
          number="2"
          icon={<FolderOpen />}
          title="选择素材文件夹"
          description="指定旧素材所在范围，用于安全读取受控预览。"
        />
        <LegacyStep
          number="3"
          icon={<Check />}
          title="审阅并只读打开"
          description="核对素材、标签和关系数量后再确认。"
        />
      </ol>

      <div className="ui-actions" style={{ marginTop: 16 }}>
        <Button
          variant="primary"
          data-testid="legacy-prepare"
          disabled={busy !== null}
          onClick={() => run('prepare', async () => {
            const result = unwrap<any>(await api.prepare())
            if (result.kind === 'planned') setReview(result.review)
          })}
        >
          开始选择旧库
        </Button>
      </div>
      <p className="ui-meta" style={{ marginTop: 8 }}>
        系统会依次打开数据库和素材文件夹选择器；任一步都可以取消。
      </p>

      {review && <LegacyReview
        review={review}
        busy={busy !== null}
        onCancel={() => setReview(null)}
        onConfirm={() => run('confirm', async () => {
          unwrap(await api.confirm(review.receipt))
          setReview(null)
          await refresh()
        })}
      />}
      {busy && <Notice tone="neutral" style={{ marginTop: 16 }}>{busyLabel(busy)}</Notice>}
      {error && <LegacyError message={error} onRetry={() => run('refresh', () => refresh({ resetPreviews: true }))} />}
    </section>}

    {!initialLoading && ready && <section data-testid="legacy-state" className="ui-card">
      <div className="ui-section-heading">
        <div>
          <h2>旧 DAM 库已只读打开</h2>
          <p className="ui-muted">可以搜索和预览；当前页面不会编辑、迁移或复制这些素材。</p>
        </div>
        <StatusBadge tone="positive">只读访问</StatusBadge>
      </div>
      <div className="ui-actions" style={{ marginTop: 16 }}>
        <StatusBadge tone="neutral">{projection.counts.assets} 个素材</StatusBadge>
        <StatusBadge tone="neutral">{projection.counts.tags} 个标签</StatusBadge>
        <StatusBadge tone="neutral">{projection.counts.relations} 个标签关系</StatusBadge>
      </div>
      {busy && <Notice tone="neutral" style={{ marginTop: 16 }}>{busyLabel(busy)}</Notice>}
      {error && <LegacyError message={error} onRetry={() => run('refresh', () => refresh({ resetPreviews: true }))} />}
    </section>}

    {ready && <section className="ui-card">
      <div className="ui-section-heading">
        <div>
          <h2>旧素材</h2>
          <p className="ui-muted">搜索标题、文件名或标签。预览不可用不会影响其他条目。</p>
        </div>
        <StatusBadge tone="neutral">{visible.length} 项</StatusBadge>
      </div>
      <label className="ui-field">
        <span className="ui-label">搜索旧素材</span>
          <span className="flex items-center gap-2" style={{ width: '100%' }}>
          <Search aria-hidden="true" />
          <input
            className="ui-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索旧素材标题、文件名或标签"
            style={{ width: '100%' }}
          />
        </span>
      </label>

      {visible.length > 0
        ? <div className="ui-grid" style={{ marginTop: 16 }}>
            {visible.map((item) => <article key={item.id} className="ui-card" style={{ marginTop: 0 }}>
              {brokenPreviews.has(previewFailureKey(projection, item.id)) || !item.previewRef
                ? <div
                    className="ui-card flex items-center justify-center"
                    style={{ minHeight: 132, marginTop: 0, padding: 12, background: 'var(--ui-surface-muted)' }}
                  >
                    <span className="ui-meta">预览不可用</span>
                  </div>
                : <img
                    src={previewUrl(projection, item.id)}
                    alt={item.title}
                    onError={() => setBrokenPreviews((current) =>
                      new Set(current).add(previewFailureKey(projection, item.id)))}
                    style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 8, objectFit: 'cover' }}
                  />}
              <h3 className="truncate" style={{ marginTop: 12, fontSize: 13, fontWeight: 700 }}>{item.title}</h3>
              <p className="ui-meta" style={{ marginTop: 4 }}>{item.fileName}</p>
              <div className="ui-actions" style={{ marginTop: 8 }}>
                <StatusBadge tone={item.referencedFileAvailable ? 'positive' : 'warning'}>
                  {item.referencedFileAvailable ? '素材引用可用' : '素材引用不可用'}
                </StatusBadge>
                {item.tags.map((tag) => <StatusBadge key={tag} tone="neutral">{tag}</StatusBadge>)}
              </div>
            </article>)}
          </div>
        : <EmptyState
            icon={<Search />}
            title={items.length === 0 ? '这个旧库中没有可显示的素材' : '没有匹配的旧素材'}
            description={items.length === 0
              ? '数据库已只读打开，但没有返回素材条目。'
              : '尝试标题、文件名或标签中的其他关键词。'}
          />}
    </section>}
  </article>
}

function LegacyStep({ number, icon, title, description }: {
  number: string
  icon: ReactNode
  title: string
  description: string
}) {
  return <li className="ui-card" style={{ marginTop: 0 }}>
    <div className="flex items-start gap-3">
      <StatusBadge tone="accent">{number}</StatusBadge>
      <div>
        <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
          {icon}
          {title}
        </div>
        <p className="ui-muted" style={{ marginTop: 8 }}>{description}</p>
      </div>
    </div>
  </li>
}

function LegacyReview({ review, busy, onConfirm, onCancel }: {
  review: LegacyReadOnlyReview
  busy: boolean
  onConfirm(): void
  onCancel(): void
}) {
  return <div data-testid="legacy-review" className="ui-card" style={{ marginTop: 16 }}>
    <div className="ui-section-heading">
      <div>
        <h2>审阅旧库内容</h2>
        <p className="ui-muted">检查完成。确认后仅建立本次只读访问。</p>
      </div>
      <StatusBadge tone="positive">检查通过</StatusBadge>
    </div>
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <StatusBadge tone="neutral">{review.counts.assets} 个素材</StatusBadge>
      <StatusBadge tone="neutral">{review.counts.tags} 个标签</StatusBadge>
      <StatusBadge tone="neutral">{review.counts.relations} 个标签关系</StatusBadge>
    </div>
    <Notice tone="neutral" style={{ marginTop: 16 }}>
      打开后仍是只读访问，不会编辑数据库、移动素材或并入 Eagle。
    </Notice>
    <div className="ui-actions" style={{ marginTop: 16 }}>
      <Button
        variant="primary"
        data-testid="legacy-confirm"
        disabled={busy}
        onClick={onConfirm}
      >
        确认只读打开
      </Button>
      <Button variant="ghost" disabled={busy} onClick={onCancel}>取消</Button>
    </div>
  </div>
}

function LegacyError({ message, onRetry }: { message: string; onRetry(): void }) {
  return <Notice tone="danger" style={{ marginTop: 16 }}>
    <div className="flex items-center justify-between gap-4">
      <span>{message}</span>
      <Button variant="ghost" onClick={onRetry}>重新读取状态</Button>
    </div>
  </Notice>
}

function unwrap<T>(value: any): T {
  if (value && typeof value === 'object' && value.error) throw new Error(String(value.error))
  return value as T
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message === 'LEGACY_READONLY_UNAVAILABLE') {
    return '旧素材只读入口暂不可用。请稍后重试。'
  }
  if (/LEGACY_READONLY/iu.test(message)) {
    return '无法只读打开所选旧库。请重新选择旧版数据库和对应素材文件夹。'
  }
  return message && message.length < 180 && !/[\\/]|sqlite|path|token/iu.test(message)
    ? message
    : '无法读取所选旧库。请确认它是旧版 Design Asset Manager 数据库，并重新选择。'
}

function busyLabel(value: string) {
  return ({
    'initial-load': '正在读取旧库状态…',
    refresh: '正在重新读取状态…',
    prepare: '正在等待你选择数据库和素材文件夹…',
    confirm: '正在只读打开旧库…',
    close: '正在关闭旧库…'
  } as Record<string, string>)[value] ?? '正在处理…'
}

function previewUrl(projection: LegacyReadOnlyProjection, id: string) {
  return projection.identity && projection.generation
    ? `dam-legacy-preview://preview/${encodeURIComponent(projection.identity)}/${encodeURIComponent(projection.generation)}/${encodeURIComponent(id)}`
    : ''
}

function previewFailureKey(projection: LegacyReadOnlyProjection, id: string) {
  return `${projection.identity ?? 'none'}\0${projection.generation ?? 'none'}\0${id}`
}
