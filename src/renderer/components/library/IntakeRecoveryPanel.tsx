import React, { useRef, useState } from 'react'
import { Button, Notice, ReviewSheet } from '../ui/WorkspacePrimitives'
import type { IntakeRecoveryApi, IntakeRecoveryItem, IntakeRecoveryReview } from '../../../shared/contracts/intake-recovery.contract'

export function IntakeRecoveryPanel({ onRecovered }: { onRecovered(): Promise<void> }) {
  const api = (window as any).electronAPI?.libraryRecovery as IntakeRecoveryApi | undefined
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<IntakeRecoveryItem[]>([])
  const [review, setReview] = useState<IntakeRecoveryReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)
  const close = () => { sequence.current++; setOpen(false); setReview(null) }
  const execute = async (operation: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await operation() } catch (e) { setError(e instanceof Error ? e.message : '恢复操作未能完成。') }
    finally { setBusy(false) }
  }
  const refresh = async () => {
    const response = await api?.list()
    if (!response?.success || !response.value) throw new Error(response?.error ?? '入库恢复不可用。')
    setItems(response.value.items)
  }
  const prepare = (item: IntakeRecoveryItem, selectSource = false) => {
    const version = ++sequence.current; setReview(null)
    void execute(async () => {
      const response = await api?.prepare({ id: item.id, ...(selectSource ? { selectSource: true } : {}) })
      if (sequence.current !== version) return
      if (!response?.success || !response.value) throw new Error(response?.error ?? '无法核验入库记录。')
      if (response.value.kind === 'cancelled') return
      setReview(response.value)
    })
  }
  return <>
    <Button variant="ghost" data-testid="library-intake-recovery" onClick={() => { setOpen(true); void execute(refresh) }}>入库恢复</Button>
    {open && <ReviewSheet label="入库恢复" onCancel={close}><div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">入库恢复</h2>
      <Notice>只处理当前素材库已登记、单文件不超过 32 MB 的 PNG、JPEG、WebP 导入和图片副本。先核验，再确认继续；不会覆盖来源、冲突文件或恢复回收站素材。下载任务请在下载队列中恢复。</Notice>
      {error && <p role="alert">{error}</p>}
      {review ? <section aria-label="确认恢复入库" className="space-y-3"><strong>{review.fileName}</strong><p>{Math.round(review.bytes / 1024)} KB · {review.kind === 'variant' ? '使用已保存的副本和处理参数，不重新运行工具。' : '使用已核验的图片字节补齐原件、预览和入库记录。'}</p>
        <div className="ui-actions"><Button disabled={busy} onClick={() => { sequence.current++; setReview(null) }}>取消确认</Button><Button disabled={busy} onClick={() => { const receipt = review.receipt; setReview(null); void execute(async () => { const result = await api?.run(receipt); if (!result?.success) throw new Error(result?.error ?? '恢复失败。'); await onRecovered(); await refresh() }) }}>确认恢复入库</Button></div>
      </section> : <>{!items.length && <p>没有待恢复的图片导入或副本。</p>}{items.map(item => <section key={item.id} className="ui-card"><strong>{item.fileName}</strong><p>{item.kind === 'variant' ? '图片副本' : '图片导入'} · {Math.round(item.bytes / 1024)} KB</p><div className="ui-actions"><Button disabled={busy} onClick={() => prepare(item)}>核验保留文件</Button>{item.kind === 'copy' && item.state === 'intake' && <Button disabled={busy} onClick={() => prepare(item, true)}>重新选择原文件</Button>}</div></section>)}</>}
      <div className="ui-actions"><Button disabled={busy} onClick={() => void execute(refresh)}>刷新记录</Button><Button onClick={close}>关闭</Button></div>
    </div></ReviewSheet>}
  </>
}
