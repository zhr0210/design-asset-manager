import React, { useEffect, useState } from 'react'
import { getWorkspaceClient } from '../../workspace-client'
import { Button, Notice } from '../ui/WorkspacePrimitives'
import { workspaceMutationErrorMessage } from '../../../shared/client/workspace-connection-error'

/** A native user prepares the ordinary one-use entry for their chosen browser. */
export default function BrowserEntryPanel() {
  const [entry, setEntry] = useState<{ entry: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!entry) return
    const timer = setTimeout(() => setEntry(null), Math.max(0, Date.parse(entry.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [entry])
  if (!(window as Window & { damClient?: unknown }).damClient) return null
  return <section className="ui-card">
    <h2>连接其他浏览器</h2>
    <p className="ui-meta">准备入口后，在所选浏览器中打开下方地址。入口仅供本机下一次打开，60 秒后失效；浏览器自行建立独立连接。</p>
    <Button disabled={busy} onClick={async () => {
      setBusy(true); setEntry(null); setError('')
      try {
        const client = getWorkspaceClient()
        if (!client) throw Error('本机 DAM 尚未连接。')
        setEntry(await client.prepareBrowserEntry())
      } catch (cause) { setError(workspaceMutationErrorMessage(cause, '准备入口失败，请核对本机连接后重试。')) }
      finally { setBusy(false) }
    }}>{busy ? '正在准备…' : '准备浏览器入口'}</Button>
    {entry && <label className="ui-field"><span>本机浏览器启动地址</span><input className="ui-input" aria-label="本机浏览器启动地址" readOnly value={entry.entry} /></label>}
    {error && <Notice tone="danger">{error}</Notice>}
  </section>
}
