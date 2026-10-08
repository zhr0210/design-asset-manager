import { useEffect, useRef, useState } from 'react'
import { getWorkspaceClient } from '../../workspace-client'
import {
  BASIC_CAPABILITIES,
  type BackgroundAnalysisApi,
  type BackgroundView,
  type BackgroundScope,
  type BackgroundReview,
  type BackgroundExecutionItem,
} from '../../../shared/contracts/background-analysis.contract'
const names = { tags: '标签', caption: '短描述', ocr: 'OCR' },
  labels: Record<string, string> = {
    claimed: '准备中',
    sent: '执行中',
    succeeded: '已保存',
    failed: '执行未完成',
    cancelled: '已取消',
    unknown: '结果不确定',
    deferred: '等待执行',
    abandoned: '已放弃',
  }
export default function BackgroundExecutionPanel({
  scope,
  view,
  changed,
}: {
  scope: BackgroundScope
  view: BackgroundView
  changed(): void
}) {
  const api = getWorkspaceClient()?.backgroundAnalysis as BackgroundAnalysisApi | undefined,
    p = view.execution?.policy,
    [enabled, setEnabled] = useState(false),
    [caps, setCaps] = useState({ tags: true, caption: true, ocr: true }),
    [limit, setLimit] = useState(24),
    [backends, setBackends] = useState<
      Array<{ id: string; name: string; defaultModel: string; location: string }>
    >([]),
    [backendId, setBackend] = useState(''),
    [model, setModel] = useState(''),
    [review, setReview] = useState<BackgroundReview | null>(null),
    [recovery, setRecovery] = useState<{ item: BackgroundExecutionItem; action: 'abandon' | 'rerun' } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const life = useRef(0),
    pending = useRef(false),
    receipt = useRef<string | null>(null),
    identity = JSON.stringify([scope, view.sessionToken])
  useEffect(() => {
    life.current++
    pending.current = false
    setBusy(false)
    setError('')
    setReview(null)
    setRecovery(null)
    return () => {
      life.current++
      pending.current = false
      if (receipt.current) void api?.discard(receipt.current).catch(() => {})
      receipt.current = null
    }
  }, [identity, api])
  useEffect(() => {
    if (p) {
      setEnabled(p.enabled)
      if (p.rules.length) {
        setCaps(Object.fromEntries(p.rules.map((r) => [r.capability, r.enabled])) as typeof caps)
        const b = p.rules.find((r) => r.capability === 'tags' || r.capability === 'caption')
        if (b?.backendId) {
          setBackend(b.backendId)
          setModel(b.model)
        }
      }
      setLimit(p.dailyCallLimit)
    }
    setReview(null)
    setRecovery(null)
  }, [p?.revision, view.sessionToken])
  useEffect(() => {
    let alive = true
    void getWorkspaceClient()
      ?.visualAi.backends()
      .then((r: any) => {
        if (!alive || !r.ok) return
        setBackends(r.value)
        if (!backendId) {
          const b = r.value.find((b: any) => b.location === 'local') ?? r.value[0]
          if (b) {
            setBackend(b.id)
            setModel(b.defaultModel)
          }
        }
      })
    return () => {
      alive = false
    }
  }, [view.sessionToken])
  const operate = async (action: (valid: () => boolean) => Promise<void>) => {
    if (pending.current) return
    const version = life.current,
      valid = () => version === life.current
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action(valid)
    } catch {
      if (valid()) setError('操作结果需要核对，请重新读取已保存状态。')
    } finally {
      if (valid()) {
        pending.current = false
        setBusy(false)
      }
    }
  }
  const recover = (item: BackgroundExecutionItem, action: 'reconcile' | 'keep' | 'abandon' | 'rerun') =>
    void operate(async (valid) => {
      const r = await api!.recover({
        ...scope,
        sessionToken: view.sessionToken,
        intentId: item.intentId,
        attemptId: item.attemptId,
        action,
      })
      if (!valid()) return
      if (r.ok) {
        setRecovery(null)
        changed()
      } else setError(r.error)
    })
  if (!api || !p) return null
  return (
    <div aria-label="后台持续执行">
      <p>
        {p.enabled ? '后台持续执行已启用' : '后台持续执行已暂停'} ·
        新入库素材按规则执行，重开后复核配置与资源。
      </p>
      {view.canConfigure && !scope.assetId && (
        <>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={busy}
            />
            自动分析新入库素材
          </label>
          <div className="visual-ai-actions">
            {BASIC_CAPABILITIES.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={caps[c]}
                  disabled={busy}
                  onChange={(e) => setCaps({ ...caps, [c]: e.target.checked })}
                />
                {names[c]}
              </label>
            ))}
          </div>
          <label>
            标签与描述使用
            <select
              aria-label="后台模型服务"
              value={backendId}
              disabled={busy}
              onChange={(e) => {
                setBackend(e.target.value)
                setModel(backends.find((b) => b.id === e.target.value)?.defaultModel ?? '')
              }}
            >
              <option value="">选择服务</option>
              {backends.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.location === 'local' ? '本机' : '外部'}
                </option>
              ))}
            </select>
          </label>
          <label>
            模型
            <input
              aria-label="后台模型名称"
              value={model}
              disabled={busy}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label>
            云端每日调用上限
            <input
              aria-label="后台每日调用上限"
              type="number"
              min={1}
              max={1000}
              value={limit}
              disabled={busy}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              void operate(async (valid) => {
                const r = await api.prepareExecution({
                  libraryIdentity: scope.libraryIdentity,
                  generation: scope.generation,
                  enabled,
                  capabilities: caps,
                  backendId,
                  model,
                  dailyCallLimit: limit,
                  expectedRevision: p.revision,
                })
                if (!valid()) {
                  if (r.ok) void api.discard(r.value.receipt)
                  return
                }
                if (r.ok) {
                  receipt.current = r.value.receipt
                  setReview(r.value)
                } else setError(r.error)
              })
            }
          >
            核对持续执行规则
          </button>
        </>
      )}
      {review && (
        <div className="visual-ai-review" role="region" aria-label="确认后台持续执行">
          <p style={{ whiteSpace: 'pre-line' }}>{review.notice}</p>
          <button
            disabled={busy}
            onClick={() => {
              receipt.current = null
              void api.discard(review.receipt)
              setReview(null)
            }}
          >
            取消
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void operate(async (valid) => {
                const r = await api.confirmExecution(review.receipt)
                if (!valid()) return
                if (r.ok) {
                  receipt.current = null
                  setReview(null)
                  changed()
                } else setError(r.error)
              })
            }
          >
            确认保存持续规则
          </button>
        </div>
      )}
      <p>
        今日云端已预留 {view.execution?.budgetUsed ?? 0}/{p.dailyCallLimit} 次调用；本机 OCR
        使用独立文字识别环境。
      </p>
      {view.capabilityReadiness?.map((r) => (
        <p key={r.capability}>
          {names[r.capability]} · {r.ready ? '可执行' : '等待'} · {r.reason}
        </p>
      ))}
      <div aria-label="后台执行与中断记录">
        {view.execution?.items.map((item) => (
          <article className="visual-ai-result" key={item.intentId}>
            <p>
              {names[item.capability]} · {labels[item.state] ?? item.state} · 第 {item.attemptEpoch} 次尝试
              {item.interrupted ? ' · 上次会话中断' : ''}
            </p>
            <small>
              {item.assetTitle??'素材'} · {new Date(item.updatedAt).toLocaleString()}
            </small>
            {view.canConfigure && ['unknown', 'failed', 'cancelled', 'deferred'].includes(item.state) && (
              <div className="visual-ai-actions">
                <button disabled={busy} onClick={() => recover(item, 'reconcile')}>
                  核对已保存回执
                </button>
                <button disabled={busy} onClick={() => recover(item, 'keep')}>
                  保留当前记录
                </button>
                <button disabled={busy} onClick={() => setRecovery({ item, action: 'abandon' })}>
                  放弃等待
                </button>
                <button disabled={busy} onClick={() => setRecovery({ item, action: 'rerun' })}>
                  重新执行…
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {recovery && (
        <div className="visual-ai-review" role="region" aria-label="确认中断处置">
          <p>
            {recovery.action === 'rerun'
              ? '此前请求可能已经执行。重新执行会建立新的请求并采用当前已确认持续规则；云端可能重复计算和扣除额度。原不确定记录保留，不会被删除。'
              : '放弃表示停止等待此前结果，不代表模型未执行或云端费用为零；原记录保留。'}
          </p>
          <button onClick={() => setRecovery(null)} disabled={busy}>
            取消
          </button>
          <button disabled={busy} onClick={() => recover(recovery.item, recovery.action)}>
            {recovery.action === 'rerun' ? '确认可能重复并重新执行' : '确认放弃等待'}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!!view.execution?.history?.length && (
        <details>
          <summary>查看已归档尝试</summary>
          {view.execution.history.map((i) => (
            <p key={i.attemptId}>
              {names[i.capability]} · 第 {i.attemptEpoch} 次 · {labels[i.state] ?? i.state} ·{' '}
              {new Date(i.updatedAt).toLocaleString()}
            </p>
          ))}
        </details>
      )}
    </div>
  )
}
