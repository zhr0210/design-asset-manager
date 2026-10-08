import React, { useEffect, useRef, useState } from 'react'
import { getWorkspaceClient } from '../../workspace-client'
import type { TransitionReview } from '../../../shared/contracts/workspace-transition.contract'
import { useUIStore } from '../../stores/ui.store'
import { Button, Notice, ReviewSheet } from '../ui/WorkspacePrimitives'

export default function WorkspaceTransitions() {
  const api = getWorkspaceClient()?.transitions, theme = useUIStore(state => state.theme)
  const [review, setReview] = useState<TransitionReview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const readSequence = useRef(0)
  const readReview = async () => {
    const sequence = ++readSequence.current
    try {
      const value = await api?.pending()
      if (sequence === readSequence.current) setReview(value ?? null)
    } catch {
      if (sequence === readSequence.current) setError('审查状态暂不可读，请检查连接。')
    }
  }
  useEffect(() => {
    const read = () => { void readReview() }
    const quit = () => { setError(''); void api?.quit().catch(() => setError('退出尚未完成。请检查其他界面的未保存编辑和连接后重试。')) }
    const stopReview = api?.onReview(read), stopState = api?.onState(() => read())
    window.addEventListener('workspace-quit', quit)
    return () => { readSequence.current++; stopReview?.(); stopState?.(); window.removeEventListener('workspace-quit', quit) }
  }, [api])
  if (!review || !api) return error ? <div role="alert" className="workspace-recovery-banner">{error}<Button onClick={() => setError('')}>关闭提示</Button></div> : null
  const action = review.action === 'quit' ? '退出整个 DAM' : '切换或关闭素材库'
  const run = async (operation: () => Promise<unknown>) => { if (busy) return; readSequence.current++; setBusy(true); setError(''); try { await operation(); await readReview() } catch { setError('暂未继续。请检查其他界面的未完成编辑和连接，再重试。') } finally { setBusy(false) } }
  return <ReviewSheet label={action} busy={busy} transitionSurface onCancel={() => { void run(() => api.cancel(review.id)) }} surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="file-picker"><h2>{action}</h2><p>已检查当前桌面、浏览器和悬浮窗口。继续会保留本机暂存草稿；恢复后仍需明确保存到素材库。</p>
      <p>暂存草稿 {review.drafts} 项 · 原生窗口未保存状态 {review.nativeDrafts} 项 · 正在登录的账号任务 {review.accounts} 项</p>
      {review.accounts > 0 && <p>退出整个 DAM 会取消尚未完成的账号登录。关闭素材库会按现有规则排空相关任务。</p>}
      {review.changed && <Notice>审查期间内容又有变化，已更新上面的结果。请重新确认。</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <footer><Button disabled={busy} onClick={() => { void run(() => api.cancel(review.id)) }}>继续编辑</Button><Button variant="primary" disabled={busy} onClick={() => { void run(() => api.confirm(review.id)) }}>{review.action === 'quit' ? '保留草稿并退出 DAM' : '保留草稿并继续切库'}</Button></footer>
    </div>
  </ReviewSheet>
}
