import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Tags, ArrowUpRight, Plus, Pencil, X } from 'lucide-react'
import { useAssetStore, type Tag } from '../stores/asset.store'
import TagChip from '../components/tag/TagChip'
import { PageHeader, EmptyState, Notice, ReviewSheet } from '../components/ui/WorkspacePrimitives'
import { projectAssetTagManager, type AssetTagManagerSortOrder } from '../../shared/workflows/asset-tagging.workflow'
import type { ActiveLibraryHostProjection } from '../../shared/contracts/active-library.contract'

export default function TagManagerPage() {
  const tags = useAssetStore(state => state.tags)
  const tagLoadError = useAssetStore(state => state.tagLoadError)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortOrder, setSortOrder] = useState<AssetTagManagerSortOrder>('usage')
  const [scope, setScope] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<Tag | 'new' | null>(null)
  const navigate = useNavigate()
  const projection = useMemo(() => projectAssetTagManager(tags, { search, filterType, sortOrder }), [tags, search, filterType, sortOrder])
  useEffect(() => {
    let active = true
    void inspectScope().then(async current => {
      if (!active) return
      setScope(current)
      if (current) await useAssetStore.getState().loadTags()
    }).catch(() => { if (active) setError('无法读取资料库状态，请回到资料库重新打开。') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const browse = (tag: Tag) => {
    const store = useAssetStore.getState()
    store.clearActiveTagSearchQueries()
    store.setSearchQuery('')
    store.addActiveTagSearchQuery(`tag:${tag.name}`)
    navigate('/library')
  }
  return <div className="ui-page ui-tool-page">
    <PageHeader eyebrow="ORGANIZE" title="标签" description="整理名称、别名和层级，用熟悉的词汇找回素材。" actions={<>
      <Link to="/library" className="ui-button ui-button-secondary">返回资料库<ArrowUpRight size={15} /></Link>
      <button className="ui-button ui-button-primary" disabled={!scope || loading} onClick={() => setEditor('new')}><Plus size={16} />新建标签</button>
    </>} />
    {error && <Notice tone="danger">{error}</Notice>}
    {tagLoadError && <Notice tone="danger">{tagLoadError}<button className="ui-button ui-button-secondary ml-3" onClick={() => void useAssetStore.getState().loadTags()}>重新加载标签</button></Notice>}
    {!scope && !loading && <Notice>请先在资料库中创建或打开一个本地素材库。</Notice>}
    <div className="ui-tool-toolbar">
      <label className="library-searchbar flex-1"><Search aria-hidden="true" /><input className="workspace-search-input" aria-label="搜索标签" placeholder="搜索名称或别名" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <select className="ui-input" aria-label="标签类别" value={filterType} onChange={event => setFilterType(event.target.value)}><option value="">全部类别</option>{projection.typeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select className="ui-input" aria-label="标签排序" value={sortOrder} onChange={event => setSortOrder(event.target.value as AssetTagManagerSortOrder)}><option value="usage">最多使用</option><option value="name">名称排序</option></select>
    </div>
    <p className="ui-meta my-5" role="status">{loading ? '正在读取标签…' : `${scope ? projection.rows.length : 0} 个标签 · 别名参与标签与素材检索`}</p>
    {scope && projection.rows.length ? <div className="ui-card p-0 overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="px-5 py-4">标签</th><th className="px-5 py-4">类别</th><th className="px-5 py-4">别名</th><th className="px-5 py-4">上级标签</th><th className="px-5 py-4 text-right">素材数</th><th className="px-5 py-4"><span className="sr-only">操作</span></th></tr></thead><tbody>
      {projection.rows.map(row => <tr key={row.tag.id} className="border-t" style={{ borderColor: 'var(--ui-border)' }}>
        <td className="px-5 py-4"><TagChip onClick={() => browse(row.tag)} name={row.tag.name} type={row.tag.type} colorClass={row.tag.color} source="manual" status="confirmed" showHoverTooltip={false} /></td>
        <td className="px-5 py-4 ui-muted">{row.categoryLabel}</td><td className="px-5 py-4 ui-muted">{row.aliasLabels.length ? row.aliasLabels.join(' · ') : '—'}</td><td className="px-5 py-4 ui-muted">{tags.find(tag => tag.id === row.tag.parentId)?.name ?? '无'}</td>
        <td className="px-5 py-4 text-right">{row.usageLabel}</td><td className="px-5 py-4"><button type="button" className="ui-button ui-button-secondary" aria-label={`编辑标签 ${row.tag.name}`} onClick={() => setEditor(row.tag)}><Pencil size={14} />编辑</button></td>
      </tr>)}
    </tbody></table></div> : !loading && !tagLoadError && <div className="ui-card"><EmptyState icon={<Tags />} title={search || filterType ? '没有匹配的标签' : '从第一个标签开始'} description={search || filterType ? '试试其他关键词，或重置筛选。' : '新建标签，或在素材检查器中添加手动标签。'} />{(search || filterType) && <button className="ui-button ui-button-secondary" onClick={() => { setSearch(''); setFilterType('') }}>重置筛选</button>}</div>}
    <details className="ui-detail-disclosure"><summary>当前可用的标签能力</summary><div><Notice>支持创建、编辑、别名及上级标签。层级用于组织标签，不自动给素材增加父标签。合并和永久删除仍需完成身份保留与恢复机制。</Notice></div></details>
    {editor && scope && <TagEditor key={`${scope}:${editor === 'new' ? 'new' : editor.id}`} tag={editor === 'new' ? null : editor} scope={scope} onClose={() => setEditor(null)} />}
  </div>
}

function TagEditor({ tag, scope, onClose }: { tag: Tag | null; scope: string; onClose(): void }) {
  const tags = useAssetStore(state => state.tags)
  const tagLoadError = useAssetStore(state => state.tagLoadError)
  const current = tag ? tags.find(item => item.id === tag.id) ?? tag : null
  const [name, setName] = useState(tag?.name ?? '')
  const [type, setType] = useState(tag?.type ?? 'custom')
  const [color, setColor] = useState(tag?.color ?? 'bg-slate-100 text-slate-700 border border-slate-200')
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  const run = async (operation: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const actualScope = await inspectScope()
      if (!mounted.current) return
      if (actualScope !== scope) throw new Error('资料库已切换或关闭，请重新打开标签。')
      await operation()
    } catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : '操作未完成，请重试。') }
    finally { if (mounted.current) setBusy(false) }
  }
  const requireSuccess = async (result: Promise<{ success?: boolean; error?: string } | undefined>) => {
    const response = await result
    if (!response?.success) throw new Error(response?.error || '操作未完成，请刷新后重试。')
  }
  const parents = tags.filter(candidate => {
    const seen = new Set<string>()
    let item: Tag | undefined = candidate
    while (item) {
      if (item.id === tag?.id || seen.has(item.id)) return false
      seen.add(item.id); item = tags.find(parent => parent.id === item!.parentId)
    }
    return true
  })
  return <ReviewSheet label={tag ? '编辑标签' : '新建标签'} busy={busy} onCancel={onClose}>
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{tag ? '编辑标签' : '新建标签'}</h2><button className="ui-icon-button" aria-label="关闭标签编辑" disabled={busy} onClick={onClose}><X size={18} /></button></div>
      {error && <Notice tone="danger">{error}</Notice>}
    {tagLoadError && <Notice tone="danger">{tagLoadError}<button className="ui-button ui-button-secondary ml-3" onClick={() => void useAssetStore.getState().loadTags()}>重新加载标签</button></Notice>}
      <form onSubmit={event => { event.preventDefault(); void run(async () => {
        const store = useAssetStore.getState()
        const result = tag ? await store.updateTag(tag.id, { name: name.trim(), type, color }) : await store.createTag({ name: name.trim(), type, color })
        if (!result) throw new Error('资料库已切换或服务不可用。')
        if (mounted.current) onClose()
      }) }}>
        <fieldset disabled={busy} className="space-y-4 min-w-0">
          <label className="block space-y-2"><span>名称</span><input autoFocus required className="ui-input w-full" aria-label="标签名称" value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="block space-y-2"><span>类别</span><select className="ui-input w-full" aria-label="编辑标签类别" value={type} onChange={event => setType(event.target.value)}>{[...new Set(['custom', ...tags.map(item => item.type)])].map(value => <option key={value} value={value}>{value === 'custom' ? '自定义' : value}</option>)}</select></label>
          <label className="block space-y-2"><span>颜色</span><select className="ui-input w-full" aria-label="标签颜色" value={color} onChange={event => setColor(event.target.value)}>{[
            [tag?.color ?? 'bg-slate-100 text-slate-700 border border-slate-200', '原有颜色'],
            ['bg-blue-100 text-blue-700 border border-blue-200', '蓝色'],
            ['bg-emerald-100 text-emerald-700 border border-emerald-200', '绿色'],
            ['bg-rose-100 text-rose-700 border border-rose-200', '粉色'],
            ['bg-amber-100 text-amber-700 border border-amber-200', '黄色']
          ].filter((item, index, all) => all.findIndex(other => other[0] === item[0]) === index).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex justify-end gap-2"><button type="button" className="ui-button ui-button-secondary" onClick={onClose}>取消</button><button type="submit" className="ui-button ui-button-primary" disabled={!name.trim()}>{tag ? '保存标签' : '创建标签'}</button></div>
        </fieldset>
      </form>
      {current && <fieldset disabled={busy} className="space-y-4 min-w-0 border-t pt-5" style={{ borderColor: 'var(--ui-border)' }}>
        <p className="ui-meta">下方别名和层级操作分别即时保存。</p>
        <label className="block space-y-2"><span>上级标签</span><select className="ui-input w-full" aria-label="上级标签" value={current.parentId ?? ''} onChange={event => { const value = event.target.value; void run(() => requireSuccess(useAssetStore.getState().setParent(current.id, value || null))) }}><option value="">无上级标签</option>{parents.map(parent => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>
        <div className="flex flex-wrap gap-2">{current.aliases.map(value => <span className="ui-chip inline-flex items-center gap-2" key={value}>{value}<button type="button" aria-label={`移除别名 ${value}`} onClick={() => void run(() => requireSuccess(useAssetStore.getState().removeAlias(current.id, value)))}><X size={14} /></button></span>)}</div>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void run(async () => { await requireSuccess(useAssetStore.getState().createAlias(current.id, alias.trim())); if (mounted.current) setAlias('') }) }}><input className="ui-input flex-1 min-w-0" aria-label="新别名" placeholder="添加别名，如另一种称呼" value={alias} maxLength={240} onChange={event => setAlias(event.target.value)} /><button type="submit" className="ui-button ui-button-secondary" disabled={!alias.trim()}>添加别名</button></form>
      </fieldset>}
    </div>
  </ReviewSheet>
}

async function inspectScope(): Promise<string | null> {
  const api = (window as Window & { electronAPI?: { library?: { inspect(): Promise<ActiveLibraryHostProjection> } } }).electronAPI?.library
  if (!api?.inspect) return null
  const value = await api.inspect()
  return value.state === 'ready' && value.identity && value.generation ? JSON.stringify([value.identity, value.generation]) : null
}
