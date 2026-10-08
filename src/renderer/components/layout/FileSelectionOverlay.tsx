import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, Folder, File, FolderPlus } from 'lucide-react'
import type { FilePickerSnapshot } from '../../../shared/contracts/file-selection.contract'
import { getWorkspaceClient } from '../../workspace-client'
import { useUIStore } from '../../stores/ui.store'
import { Button, Notice, ReviewSheet } from '../ui/WorkspacePrimitives'
import '../../styles/file-picker.css'

/** Both clients use this product selector; paths are validated and resolved by Host. */
export default function FileSelectionOverlay() {
  const [picker, setPicker] = useState<FilePickerSnapshot | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [directory, setDirectory] = useState('')
  const [newFolder, setNewFolder] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const theme = useUIStore(state => state.theme)
  const sequence = useRef(0)
  const busyOwner = useRef<number | null>(null)
  const api = getWorkspaceClient()?.files
  useEffect(() => {
    if (!api) return
    const refresh = async () => {
      const epoch = ++sequence.current
      busyOwner.current = epoch
      setBusy(true)
      try {
        const next = await api.pending()
        if (epoch !== sequence.current) return
        setPicker(next); setDirectory(next?.directory ?? ''); setSelected([]); setNewFolder(null); setError('')
      } catch { if (epoch === sequence.current) setError('无法读取选择器，请重新连接后重试。') }
      finally { if (epoch === sequence.current) { busyOwner.current = null; setBusy(false) } }
    }
    const stop = api.onRequested(() => { void refresh() })
    void refresh()
    return () => { sequence.current++; busyOwner.current = null; stop() }
  }, [api])
  if (!picker || !api) return null
  const run = async (operation: (isCurrent: () => boolean) => Promise<void>) => {
    if (busyOwner.current !== null) return
    const epoch = sequence.current
    const isCurrent = () => epoch === sequence.current
    busyOwner.current = epoch
    setBusy(true); setError('')
    try { await operation(isCurrent) }
    catch (caught) {
      if (!isCurrent()) return
      // Directory errors never print submitted paths or backend diagnostics.
      const message = caught instanceof Error ? caught.message : ''
      setError(message.includes('测试模式') || message.includes('选择已失效') ? message : '无法使用所选位置，请检查名称和权限，或选择其它目录。')
    } finally { if (isCurrent()) { busyOwner.current = null; setBusy(false) } }
  }
  const browse = (request: { entry?: string; path?: string }) => run(async isCurrent => {
    const next = await api.browse({ session: picker.id, ...request })
    if (!isCurrent()) return
    setPicker(next); setDirectory(next.directory); setSelected([]); setNewFolder(null)
  })
  const cancel = () => { void run(async isCurrent => { await api.cancel(picker.id); if (isCurrent()) setPicker(null) }) }
  const confirm = () => { void run(async isCurrent => {
    await api.confirm({ session: picker.id, entries: selected.length ? selected : picker.mode === 'directory' ? [picker.directoryId] : [] })
    if (isCurrent()) setPicker(null)
  }) }
  return <ReviewSheet label={picker.title} busy={busy} onCancel={cancel} transitionSurface
    surfaceClassName={`gallery-design minimal-prototype gallery-review-surface ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="file-picker">
      <header><h2>{picker.title}</h2><p className="ui-meta">{picker.mode === 'directory' ? '选择文件夹；选择后仍会检查该位置是否符合本次用途。' : picker.multiple ? '选择一个或多个文件，再确认。' : '选择一个文件，再确认。'}</p></header>
      <form className="file-picker-path" onSubmit={event => { event.preventDefault(); void browse({ path: directory }) }}>
        <Button aria-label="上一级目录" disabled={busy || !picker.parentId} onClick={() => void browse({ entry: picker.parentId! })}><ArrowUp /></Button>
        <label className="sr-only" htmlFor="file-picker-path">目录路径</label>
        <input id="file-picker-path" value={directory} onChange={event => setDirectory(event.target.value)} disabled={busy} />
        <Button type="submit" disabled={busy}>前往</Button>
      </form>
      <div className="file-picker-browser">
        <nav aria-label="本机位置">{picker.roots.map(root => <Button key={root.id} disabled={busy} onClick={() => void browse({ entry: root.id })}><Folder />{root.name}</Button>)}</nav>
        <div className="file-picker-list" role="group" aria-label="目录内容">
          {picker.entries.length === 0 && <p className="ui-muted">此目录中没有可选择的项目。</p>}
          {picker.entries.map(entry => <div key={entry.id} className="file-picker-row">
            <button type="button" aria-pressed={selected.includes(entry.id)} disabled={busy}
              onDoubleClick={() => { if (entry.kind === 'directory') void browse({ entry: entry.id }) }}
              onClick={() => {
                if (picker.mode === 'files' && entry.kind === 'directory') { void browse({ entry: entry.id }); return }
                setSelected(previous => picker.multiple ? previous.includes(entry.id) ? previous.filter(id => id !== entry.id) : [...previous, entry.id] : previous.includes(entry.id) ? [] : [entry.id])
              }}>
              {entry.kind === 'directory' ? <Folder /> : <File />}<span>{entry.name}</span>
            </button>
            {entry.kind === 'directory' && <Button variant="ghost" aria-label={`打开文件夹 ${entry.name}`} disabled={busy} onClick={() => void browse({ entry: entry.id })}>打开</Button>}
          </div>)}
        </div>
      </div>
      {picker.truncated && <Notice>目录项目较多，当前显示前 2000 项。可输入更精确的目录路径继续选择。</Notice>}
      {newFolder !== null ? <form className="file-picker-path" onSubmit={event => { event.preventDefault(); void run(async isCurrent => {
        const next = await api.createDirectory({ session: picker.id, name: newFolder })
        if (!isCurrent()) return
        setPicker(next); setNewFolder(null)
      }) }}>
        <label htmlFor="file-picker-new">新文件夹名称</label><input autoFocus id="file-picker-new" value={newFolder} onChange={event => setNewFolder(event.target.value)} disabled={busy} />
        <Button type="submit" disabled={busy || !newFolder.trim()}>创建文件夹</Button><Button disabled={busy} onClick={() => setNewFolder(null)}>返回</Button>
      </form> : <Button variant="ghost" disabled={busy} onClick={() => setNewFolder('')}><FolderPlus />新建文件夹</Button>}
      {error && <Notice tone="danger">{error}</Notice>}
      <footer><span className="ui-meta">{busy ? '正在处理…' : selected.length ? `已选择 ${selected.length} 项` : picker.mode === 'directory' ? '确认将选择当前文件夹' : '请选择文件'}</span>
        <Button disabled={busy} onClick={cancel}>取消</Button><Button variant="primary" disabled={busy || (picker.mode === 'files' && !selected.length)} onClick={confirm}>{picker.mode === 'directory' ? '选择此文件夹' : '选择文件'}</Button>
      </footer>
    </div>
  </ReviewSheet>
}
