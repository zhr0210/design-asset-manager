/** THROWAWAY PROTOTYPE. Three approved workspace modes on the existing hash routes.
 * Library, focused viewing, and a browser simulation of a floating desktop card.
 * Synthetic in-memory data only. No production App/store/IPC, inference, file or network operations.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight,
  Copy, Folder, FolderOpen, Grid2X2, Image as ImageIcon, Layers, Maximize2,
  PanelRight, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Tag, Trash2, X,
  Compass, Wand2, Sun, HardDrive, Keyboard, ShieldCheck, Cpu
} from 'lucide-react'
import { ModeDock, ModeVeil, readWorkspaceMode, useModeTransition, type WorkspaceMode } from './ModeSwitch'
import { FloatingAssetCard, defaultCardDraft, previewFilter, type CardDraft } from './FloatingAssetCard'
import './refactor-prototype.css'
import './glass-modes.css'

type Asset = { id: number; title: string; art: string; word: string; tags: string[]; folder: string; format: string; trashed?: boolean; appearance?: { warmth: number; rotation: number } }
type Preferences = { theme: string; automatic: boolean; concurrency: string; provider: string }
const seed: Asset[] = [
  { id: 1, title: '弧线 · 品牌视觉', art: 'arch', word: 'FORM', tags: ['品牌', '极简'], folder: '品牌参考', format: 'PNG' },
  { id: 2, title: '植物研究 No.02', art: 'botanical', word: 'BOTANICA', tags: ['自然', '绿色'], folder: '包装与印刷', format: 'JPG' },
  { id: 3, title: '湛蓝 · 排版实验', art: 'type', word: 'Aa', tags: ['排版', '蓝色'], folder: '字体与版式', format: 'PNG' },
  { id: 4, title: '柔光材质练习', art: 'orb', word: 'soft forms', tags: ['材质', '渐变'], folder: '品牌参考', format: 'WEBP' },
  { id: 5, title: '构成与留白', art: 'grid', word: 'GRID / 04', tags: ['排版', '极简'], folder: '字体与版式', format: 'PNG' },
  { id: 6, title: '柑橘 · 包装概念', art: 'orange', word: 'SUNNY', tags: ['包装', '橙色'], folder: '包装与印刷', format: 'JPG' },
  { id: 7, title: '静物 · 色彩关系', art: 'still', word: 'STILL', tags: ['材质', '极简'], folder: '品牌参考', format: 'PNG' },
  { id: 8, title: '流动的绿色', art: 'ripple', word: 'flow', tags: ['绿色', '渐变'], folder: '品牌参考', format: 'WEBP' },
  { id: 9, title: '编辑设计 · 留白', art: 'editorial', word: 'Less,\nbut better.', tags: ['排版'], folder: '字体与版式', format: 'JPG' },
  { id: 10, title: '几何海报 01', art: 'geometric', word: '01—09', tags: ['品牌', '蓝色'], folder: '品牌参考', format: 'PNG' },
  { id: 11, title: '紫色光谱', art: 'spectrum', word: 'SPECTRUM', tags: [], folder: '', format: 'WEBP' },
  { id: 12, title: '山形 · 标志研究', art: 'mountain', word: 'FIELD', tags: ['品牌', '自然'], folder: '品牌参考', format: 'PNG' },
  { id: 13, title: '印刷实验 03', art: 'print', word: 'MAKE\nSOMETHING.', tags: ['排版', '橙色'], folder: '包装与印刷', format: 'JPG' },
  { id: 14, title: '圆与方', art: 'blocks', word: 'SHAPE', tags: ['极简'], folder: '品牌参考', format: 'PNG' },
  { id: 15, title: '黄油色 · 字体', art: 'butter', word: 'hello.', tags: [], folder: '', format: 'JPG' },
  { id: 16, title: '新绿色卡', art: 'palette', word: 'GREENS', tags: ['绿色'], folder: '包装与印刷', format: 'PNG' }
]
const preferenceGroups = [
  { id: 'appearance', name: '外观与操作', icon: Sun },
  { id: 'library', name: '资料库', icon: HardDrive },
  { id: 'ai', name: 'AI 与模型', icon: Sparkles },
  { id: 'capture', name: '采集与下载', icon: Compass },
  { id: 'keyboard', name: '快捷键', icon: Keyboard },
  { id: 'advanced', name: '高级维护', icon: ShieldCheck }
]

function Artwork({ asset }: { asset: Asset }) {
  return <div className={`rp-art rp-art-${asset.art}`} aria-label={`${asset.title}，合成设计样张`} role="img" style={asset.appearance ? { filter: previewFilter(asset.appearance.warmth), transform: `rotate(${asset.appearance.rotation}deg)` } : undefined}>
    <span className="rp-art-kicker">STUDIO COLLECTION / {String(asset.id).padStart(2, '0')}</span>
    <i className="rp-shape rp-shape-one" /><i className="rp-shape rp-shape-two" />
    <strong>{asset.word}</strong><small>EXPLORATIONS IN FORM & COLOR</small>
  </div>
}

export default function RefactorPrototype() {
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requestedMode = readWorkspaceMode(params)
  const [previewReduced, setPreviewReduced] = useState(false)
  const transition = useModeTransition(requestedMode, previewReduced)
  const mode = transition.displayed
  const variant = mode === 'library' ? 'A' : mode === 'focus' ? 'C' : 'F'
  const page = location.pathname === '/settings' ? 'settings' : location.pathname === '/browser' ? 'capture' : location.pathname === '/tools' ? 'tools' : 'library'
  const [assets, setAssets] = useState(seed)
  const [selectedIds, setSelectedIds] = useState<number[]>([1])
  const [collection, setCollection] = useState('全部素材')
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState('全部格式')
  const [size, setSize] = useState(174)
  const [filters, setFilters] = useState(false)
  const [inspector, setInspector] = useState(true)
  const [inspectorTab, setInspectorTab] = useState('info')
  const [quickLook, setQuickLook] = useState(false)
  const [libraryMenu, setLibraryMenu] = useState(false)
  const [addReview, setAddReview] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [suggestions, setSuggestions] = useState<number[]>([])
  const [feedback, setFeedback] = useState('')
  const [settingsGroup, setSettingsGroup] = useState('appearance')
  const [settingsSearch, setSettingsSearch] = useState('')
  const [saved, setSaved] = useState<Preferences>({ theme: '浅色', automatic: true, concurrency: '3', provider: '本地模型' })
  const [draft, setDraft] = useState(saved)
  const [showState, setShowState] = useState(false)
  const [cardDrafts, setCardDrafts] = useState<Record<number, CardDraft>>({})
  const galleryRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef({ library: 0, focus: 0 })
  const searchRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDialogElement>(null)
  const settingsRef = useRef<HTMLElement>(null)
  const selected = assets.find(asset => asset.id === selectedIds[0])
  const visible = useMemo(() => assets.filter(asset => {
    if (Boolean(asset.trashed) !== (collection === '回收站')) return false
    if (collection === '未分类' && asset.folder) return false
    if (collection === '未标记' && asset.tags.length) return false
    if (['品牌参考', '包装与印刷', '字体与版式'].includes(collection) && asset.folder !== collection) return false
    if (collection.startsWith('#') && !asset.tags.includes(collection.slice(1))) return false
    return (format === '全部格式' || asset.format === format) && `${asset.title} ${asset.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  }), [assets, collection, query, format])
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const go = (path: string) => { setLibraryMenu(false); navigate(`${path}?mode=${requestedMode}`) }
  const switchMode = (next: WorkspaceMode) => {
    setLibraryMenu(false); setQuickLook(false); setAddReview(false)
    if (next !== 'library' && visible.length && !visible.some(asset => selectedIds.includes(asset.id))) setSelectedIds([visible[0].id])
    navigate(`/library?mode=${next}`, { replace: true })
  }
  const cardAsset = visible.find(asset => asset.id === selectedIds[0]) ?? visible[0]
  const cardDraft: CardDraft = cardAsset ? cardDrafts[cardAsset.id] ?? { ...defaultCardDraft, ...cardAsset.appearance } : defaultCardDraft
  const stepAsset = (direction: number) => {
    if (!visible.length) return
    const index = visible.findIndex(asset => asset.id === cardAsset?.id)
    setSelectedIds([visible[(index + direction + visible.length) % visible.length].id])
  }
  const saveCardCopy = () => {
    if (!cardAsset) return
    const id = Math.max(...assets.map(asset => asset.id)) + 1
    setAssets(previous => [{ ...cardAsset, id, title: `${cardAsset.title} · 编辑副本`, appearance: { warmth: cardDraft.warmth, rotation: cardDraft.rotation } }, ...previous])
    setSelectedIds([id])
    setFeedback('已保留内存中的示例副本，没有修改来源文件。')
  }
  useEffect(() => {
    if (galleryRef.current && mode === 'library') galleryRef.current.scrollTop = scrollPositions.current.library
    if (galleryRef.current && mode === 'focus') galleryRef.current.scrollLeft = scrollPositions.current.focus
  }, [mode, page])
  const changeCollection = (next: string) => { setCollection(next); setSelectedIds([]); setQuickLook(false) }
  const select = (asset: Asset, multiple = false) => {
    setSelectedIds(previous => multiple ? previous.includes(asset.id) ? previous.filter(id => id !== asset.id) : [...previous, asset.id] : [asset.id])
    setInspector(true)
  }
  const tell = (text: string) => setFeedback(text)
  const changeTrash = (trashed: boolean) => {
    setAssets(previous => previous.map(asset => selectedIds.includes(asset.id) ? { ...asset, trashed } : asset))
    tell(`示例：${selectedIds.length} 个素材已${trashed ? '移入回收站' : '恢复'}。`)
    setSelectedIds([])
  }
  const addTag = (value: string) => {
    const clean = value.trim()
    if (!clean) return
    setAssets(previous => previous.map(asset => selectedIds.includes(asset.id) ? { ...asset, tags: [...new Set([...asset.tags, clean])] } : asset))
    setTagDraft(''); tell(`示例：已为 ${selectedIds.length} 个素材添加“${clean}”。`)
  }
  useEffect(() => {
    if (page === 'settings') settingsRef.current?.focus()
  }, [page, mode])
  useEffect(() => {
    const dialog = modalRef.current
    if (quickLook || addReview) dialog?.showModal()
    else dialog?.close()
  }, [quickLook, addReview])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const target = event.target as HTMLElement
      if (target.closest('dialog[open]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && page === 'library') {
        event.preventDefault(); searchRef.current?.focus(); return
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ',') { event.preventDefault(); go('/settings'); return }
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return
      if (event.key === 'Escape') { setLibraryMenu(false); if (page === 'settings') go('/library') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestedMode, page])
  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const libraryPicker = <div className="rp-library-picker">
    <button className="rp-library-button" aria-expanded={libraryMenu} onClick={() => setLibraryMenu(!libraryMenu)}><span className="rp-library-mark"><Layers size={17} /></span><span>设计灵感库<small>本地资料库 · 示例</small></span><ChevronDown size={14} /></button>
    {libraryMenu && <div className="rp-popover rp-library-options"><strong>资料库</strong>{['设计灵感库', '创建资料库', '打开资料库', '连接 Eagle', '找回旧素材'].map(label => <button key={label} onClick={() => { setLibraryMenu(false); tell(label === '设计灵感库' ? '正在浏览合成示例资料库。' : `原型入口：${label}，不会访问真实资料库。`) }}>{label}{label === '设计灵感库' && <Check size={13} />}</button>)}</div>}
  </div>
  const modeNav = <nav className="rp-mode-nav" aria-label="应用区域">{[
    { label: '素材', route: '/library', id: 'library', icon: Grid2X2 },
    { label: '采集', route: '/browser', id: 'capture', icon: Compass },
    { label: '工具', route: '/tools', id: 'tools', icon: Wand2 }
  ].map(({ label, route, id, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => go(route)}><Icon size={16} />{label}</button>)}</nav>
  const collectionNav = <nav className="rp-collections" aria-label="素材组织">
    <div className="rp-nav-section">资料库</div>
    {['全部素材', '未分类', '未标记', '回收站'].map((name, index) => {
      const Icon = [Grid2X2, FolderOpen, Tag, Trash2][index]
      const count = assets.filter(asset => name === '回收站' ? asset.trashed : !asset.trashed && (name === '未分类' ? !asset.folder : name === '未标记' ? !asset.tags.length : true)).length
      return <button key={name} aria-current={collection === name ? 'true' : undefined} onClick={() => { changeCollection(name); if (page !== 'library') go('/library') }}><Icon size={15} /><span>{name}</span><small>{count}</small></button>
    })}
    <div className="rp-nav-section">文件夹<span>3</span></div>
    {['品牌参考', '包装与印刷', '字体与版式'].map(name => <button key={name} aria-current={collection === name ? 'true' : undefined} onClick={() => { changeCollection(name); if (page !== 'library') go('/library') }}><ChevronRight size={11} /><Folder size={15} /><span>{name}</span></button>)}
    <div className="rp-nav-section">常用标签</div>
    <div className="rp-nav-tags">{['品牌', '排版', '极简', '绿色', '材质'].map(tag => <button key={tag} aria-pressed={collection === `#${tag}`} onClick={() => { changeCollection(`#${tag}`); if (page !== 'library') go('/library') }}><span className={`rp-tag-dot dot-${tag}`} />{tag}</button>)}</div>
  </nav>
  const settingsButton = <button className="rp-settings-button" onClick={() => go('/settings')}><Settings2 size={16} /><span>设置</span><span className="rp-key">⌘ ,</span></button>
  const searchBox = <label className="rp-search"><Search size={16} /><input ref={searchRef} aria-label="搜索示例素材" placeholder="搜索当前资料库" value={query} onChange={event => setQuery(event.target.value)} />{query ? <button aria-label="清空搜索" onClick={() => setQuery('')}><X size={13} /></button> : <kbd>⌘ F</kbd>}</label>
  const toolbar = <div className="rp-toolbar">{searchBox}<button className={filters ? 'rp-active' : ''} aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={15} />筛选</button><div className="rp-spacer" /><label className="rp-size-control"><ImageIcon size={13} /><input type="range" aria-label="缩略图大小" min="140" max="240" value={size} onChange={event => setSize(Number(event.target.value))} /></label><button aria-label="显示或隐藏检查器" aria-pressed={inspector} onClick={() => setInspector(!inspector)}><PanelRight size={16} /></button><button className="rp-primary" onClick={() => setAddReview(true)}><Plus size={15} />导入</button></div>
  const filterBar = filters && <div className="rp-filter-bar"><span>文件格式</span><select aria-label="格式筛选" value={format} onChange={event => setFormat(event.target.value)}>{['全部格式', 'PNG', 'JPG', 'WEBP'].map(value => <option key={value}>{value}</option>)}</select><span className="rp-muted">{visible.length} 个匹配</span>{format !== '全部格式' && <button onClick={() => setFormat('全部格式')}>清除条件<X size={12} /></button>}</div>
  const empty = <div className="rp-empty"><Search size={28} /><h2>没有匹配的素材</h2><p>试试其他关键词，或调整筛选条件。</p><button onClick={() => { setQuery(''); setFormat('全部格式'); changeCollection('全部素材') }}>查看全部素材</button></div>
  const gallery = <div className="rp-gallery" ref={galleryRef} onScroll={event => {
    if (mode === 'library') scrollPositions.current.library = event.currentTarget.scrollTop
    if (mode === 'focus') scrollPositions.current.focus = event.currentTarget.scrollLeft
  }} style={{ '--rp-tile': `${size}px` } as React.CSSProperties} aria-label="素材列表">
    {visible.length ? visible.map((asset, index) => <button key={asset.id} className={`rp-asset ${selectedIds.includes(asset.id) ? 'is-selected' : ''}`} aria-label={asset.title} aria-pressed={selectedIds.includes(asset.id)} onClick={event => select(asset, event.ctrlKey || event.metaKey || event.shiftKey)} onDoubleClick={() => { select(asset); setQuickLook(true) }} onKeyDown={event => {
      if (event.key === ' ') { event.preventDefault(); select(asset); setQuickLook(true) }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const offset = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
        const next = visible[(index + offset + visible.length) % visible.length]
        select(next); (event.currentTarget.parentElement?.children[(index + offset + visible.length) % visible.length] as HTMLButtonElement)?.focus()
      }
    }}><div className="rp-thumbnail"><Artwork asset={asset} /><span className="rp-selected-tick"><Check size={11} /></span></div><span className="rp-asset-title">{asset.title}</span><span className="rp-asset-meta">{asset.format}<span>{asset.tags.slice(0, 2).join(' · ') || '未标记'}</span></span></button>) : empty}
  </div>
  const bulkBar = selectedIds.length > 1 && <div className="rp-bulk-bar"><span>已选 {selectedIds.length} 项</span><button onClick={() => addTag('参考')}><Tag size={14} />添加标签</button><button onClick={() => { setSuggestions(previous => [...new Set([...previous, ...selectedIds])]); setInspectorTab('ai'); tell('已展示预设 AI 建议，没有运行模型。') }}><Sparkles size={14} />AI 分析</button><button onClick={() => changeTrash(collection !== '回收站')}><Trash2 size={14} />{collection === '回收站' ? '恢复' : '移入回收站'}</button><button aria-label="取消选择" onClick={() => setSelectedIds([])}><X size={14} /></button></div>
  const inspectorPanel = inspector && selected && <aside className="rp-inspector" aria-label="素材检查器"><div className="rp-inspector-head"><span>{selectedIds.length > 1 ? `${selectedIds.length} 项已选择` : '素材信息'}</span><button aria-label="关闭检查器" onClick={() => setInspector(false)}><X size={15} /></button></div><div className="rp-inspector-scroll"><div className="rp-inspector-preview"><Artwork asset={selected} /><button aria-label="快速查看所选素材" onClick={() => setQuickLook(true)}><Maximize2 size={14} /></button></div><h2>{selected.title}</h2><p className="rp-muted">{selected.format} · 1600 × 2000 · 合成样张</p><div className="rp-tabs"><button aria-pressed={inspectorTab === 'info'} onClick={() => setInspectorTab('info')}>详情</button><button aria-pressed={inspectorTab === 'ai'} onClick={() => setInspectorTab('ai')}><Sparkles size={13} />AI 助手</button></div>
    {inspectorTab === 'info' ? <><div className="rp-field-title">标签</div><div className="rp-chips">{selected.tags.map(tag => <span key={tag}>{tag}<button aria-label={`移除标签 ${tag}`} onClick={() => setAssets(previous => previous.map(asset => selectedIds.includes(asset.id) ? { ...asset, tags: asset.tags.filter(value => value !== tag) } : asset))}><X size={10} /></button></span>)}</div><form className="rp-inline-form" onSubmit={event => { event.preventDefault(); addTag(tagDraft) }}><input aria-label="添加标签" placeholder="添加标签…" value={tagDraft} onChange={event => setTagDraft(event.target.value)} /><button aria-label="确认添加标签" disabled={!tagDraft.trim()}><Plus size={14} /></button></form><div className="rp-field-title">文件夹</div><div className="rp-folder-path"><Folder size={14} />{selected.folder || '未分类'}</div><div className="rp-field-title">颜色</div><div className="rp-swatches">{['#EADACA', '#BDA189', '#87694F', '#31463B', '#171E19'].map(color => <button key={color} style={{ background: color }} aria-label={`查看示例颜色 ${color}`} onClick={() => tell(`示例色值：${color}`)} />)}</div><dl><dt>来源</dt><dd>原型合成素材</dd><dt>加入日期</dt><dd>2026年9月11日</dd><dt>保存方式</dt><dd>复制到资料库</dd></dl></> : <div className="rp-ai-panel"><span className="rp-local"><span />本地优先</span><h3>让素材更容易找回</h3><p>提取描述、标签和画面文字。建议经过确认后成为你的整理结果。</p><button className="rp-primary" onClick={() => { setSuggestions(previous => [...new Set([...previous, ...selectedIds])]); tell('这里展示预设建议，不会调用 AI。') }}><Sparkles size={14} />查看示例分析</button>{suggestions.includes(selected.id) && <div className="rp-suggestion"><small>预设 AI 建议 · 未运行模型</small><p>以简洁的几何形态与留白构成画面，适合作为品牌视觉参考。</p><div className="rp-chips"><span>几何</span><span>留白</span></div><button onClick={() => addTag('几何')}><Check size={13} />确认“几何”标签</button></div>}<button className="rp-text-button" onClick={() => { setSettingsGroup('ai'); go('/settings') }}>管理 AI 与模型<ArrowRight size={13} /></button></div>}
    </div><div className="rp-inspector-footer"><button onClick={() => tell('原型复用入口：正式实现须区分原件与兼容导出；此处没有复制文件。')}><Copy size={14} />复用素材</button><button aria-label={selected.trashed ? '恢复所选素材' : '移入回收站'} onClick={() => changeTrash(!selected.trashed)}>{selected.trashed ? <ArrowLeft size={14} /> : <Trash2 size={14} />}</button></div></aside>
  const settingsContent = <section className="rp-preferences" ref={settingsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="设置内容" onKeyDown={event => {
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]')).filter(element => element.offsetParent !== null)
    const first = controls[0], last = controls[controls.length - 1]
    if (!first) return
    if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }}><header><div><span className="rp-eyebrow">PREFERENCES</span><h1>设置</h1><p>调整你的工作方式。</p></div><button aria-label="返回素材工作区" onClick={() => go('/library')}><X size={19} /></button></header><div className="rp-preferences-body"><nav aria-label="设置分类"><label className="rp-settings-search"><Search size={13} /><input aria-label="搜索设置分类" placeholder="搜索设置" value={settingsSearch} onChange={event => setSettingsSearch(event.target.value)} /></label>{preferenceGroups.filter(group => group.name.includes(settingsSearch)).map(({ id, name, icon: Icon }) => <button key={id} aria-current={settingsGroup === id ? 'true' : undefined} onClick={() => setSettingsGroup(id)}><Icon size={16} />{name}</button>)}{settingsSearch && !preferenceGroups.some(group => group.name.includes(settingsSearch)) && <p className="rp-muted">没有匹配的分类</p>}</nav><div className="rp-preferences-detail"><h2>{preferenceGroups.find(group => group.id === settingsGroup)?.name}</h2>
      {settingsGroup === 'appearance' && <><p className="rp-muted">应用外观与日常操作偏好。</p><div className="rp-preference-row"><div><strong>外观</strong><small>当前仅保存示例偏好，不改变方案配色。</small></div><select aria-label="外观偏好" value={draft.theme} onChange={event => setDraft({ ...draft, theme: event.target.value })}>{['浅色', '深色', '跟随系统'].map(value => <option key={value}>{value}</option>)}</select></div><div className="rp-theme-samples"><div className="rp-theme-light"><i /><span /><span /><span /></div><div className="rp-theme-dark"><i /><span /><span /><span /></div></div><div className="rp-preference-row"><div><strong>缩略图大小</strong><small>在素材工具栏即时调整，属于当前视图。</small></div><Grid2X2 size={19} /></div><div className="rp-preference-row"><div><strong>减少动态效果</strong><small>跟随系统偏好。</small></div><span className="rp-muted">系统控制</span></div></>}
      {settingsGroup === 'library' && <><p className="rp-muted">当前资料库的状态与管理。</p><div className="rp-library-summary"><span className="rp-library-mark"><Layers /></span><div><strong>设计灵感库</strong><p>{assets.filter(asset => !asset.trashed).length} 个示例素材 · 内存状态</p></div></div><div className="rp-preference-row"><div><strong>默认导入方式</strong><small>保留外部来源，复制一份进入资料库。</small></div><span>复制到资料库</span></div>{['打开其他资料库', '连接 Eagle', '找回旧素材'].map(label => <button className="rp-preference-link" key={label} onClick={() => tell(`原型入口：${label}，不会读取真实数据。`)}>{label}<ChevronRight size={14} /></button>)}</>}
      {settingsGroup === 'ai' && <><p className="rp-muted">在这里统一管理模型、服务与分析偏好。</p><div className="rp-preference-row"><div><strong>默认分析方式</strong><small>外部服务需要在具体分析动作中授权。</small></div><select aria-label="默认分析方式" value={draft.provider} onChange={event => setDraft({ ...draft, provider: event.target.value })}><option>本地模型</option><option>外部服务</option></select></div><div className="rp-preference-row"><div><strong>导入后自动分析</strong><small>仅在本地能力就绪时执行，素材立即可用。</small></div><input type="checkbox" role="switch" aria-label="导入后自动分析" checked={draft.automatic} onChange={event => setDraft({ ...draft, automatic: event.target.checked })} /></div><div className="rp-model-card"><Cpu size={23} /><div><strong>模型与运行环境</strong><p>原型没有连接真实模型</p></div><button onClick={() => tell('模型管理子页：区分权重、运行环境、安装状态与可用能力。')}>管理<ChevronRight size={13} /></button></div><h3>分析能力</h3>{['描述与标签', '画面文字 OCR', '提示词反推', '语义与视觉检索'].map(name => <div className="rp-capability-row" key={name}><span>{name}</span><span className="rp-muted">待配置</span></div>)}<button className="rp-preference-link" onClick={() => tell('原型入口：提示词模板管理。')}>提示词模板<ChevronRight size={14} /></button></>}
      {settingsGroup === 'capture' && <><p className="rp-muted">偏好保存在此处；采集记录与下载任务在采集区域。</p><div className="rp-preference-row"><div><strong>同时下载数量</strong><small>影响新任务的调度。</small></div><select aria-label="同时下载数量" value={draft.concurrency} onChange={event => setDraft({ ...draft, concurrency: event.target.value })}>{['1', '2', '3', '4'].map(value => <option key={value} value={value}>{value} 个</option>)}</select></div><button className="rp-preference-link" onClick={() => go('/browser')}>查看采集与任务<ArrowRight size={14} /></button><p className="rp-note">示例偏好不会启动下载或打开外部网站。</p></>}
      {settingsGroup === 'keyboard' && <>{[['搜索素材', '⌘ / Ctrl + F'], ['快速查看', '空格'], ['关闭当前弹窗', 'Esc'], ['多选素材', '⌘ / Ctrl + 点击']].map(([name, key]) => <div className="rp-preference-row" key={name}><strong>{name}</strong><kbd>{key}</kbd></div>)}</>}
      {settingsGroup === 'advanced' && <><p className="rp-muted">先查看问题，再选择具体维护动作。</p>{['运行环境诊断', '资料库完整性检查', '路径与设置迁移'].map(name => <button className="rp-preference-link" key={name} onClick={() => tell(`原型入口：${name}，没有执行检查或修复。`)}>{name}<ChevronRight size={14} /></button>)}</>}
    </div></div><footer><span>{dirty ? '有未保存的更改' : '偏好已保存到本次原型会话'}</span><button disabled={!dirty} onClick={() => { setDraft(saved); tell('已撤销未保存的示例更改。') }}>撤销更改</button><button className="rp-primary" disabled={!dirty} onClick={() => { setSaved(draft); tell('偏好已保存在内存中；刷新后重置。') }}>保存更改</button></footer></section>
  const supportingPage = page === 'capture' ? <div className="rp-support-page"><span className="rp-eyebrow">COLLECT</span><h1>采集</h1><p>从发现灵感，到进入你的资料库。</p><div className="rp-capture-entry"><Compass size={24} /><div><h2>网页采集</h2><p>浏览来源、收集候选，再确认入库。</p></div><button className="rp-primary" onClick={() => tell('原型没有打开外部网站。正式网页采集沿用独立 BrowserView。')}>打开采集浏览器<ArrowRight size={14} /></button></div><div className="rp-tabs"><button aria-pressed="true">任务记录</button><button onClick={() => tell('原型入口：网站与账号管理。')}>网站与账号</button><button onClick={() => tell('原型入口：外部来源搜索，与素材搜索分开。')}>来源发现</button></div><div className="rp-empty"><ArrowDownToLine size={30} /><h2>还没有采集任务</h2><p>这里展示排队、下载、失败与待确认入库的真实状态。</p><small>原型没有下载执行器，不会模拟下载成功。</small></div></div> : <div className="rp-support-page"><span className="rp-eyebrow">DESIGN TOOLS</span><h1>工具箱</h1><p>从素材开始，让日常设计操作更顺手。</p><div className="rp-tool-list">{[{ title: '提取颜色', body: '查看与整理素材的颜色', icon: SlidersHorizontal }, { title: '识别文字', body: '从画面中提取可编辑的文字', icon: ImageIcon }, { title: '提示词反推', body: '把视觉参考转成创作描述', icon: Sparkles }].map(({ title, body, icon: Icon }) => <button key={title} onClick={() => { go('/library'); setInspectorTab('ai'); setInspector(true); if (!selected) setSelectedIds([1]); tell(`示例：从选中素材进入“${title}”。`) }}><Icon size={26} /><h2>{title}</h2><p>{body}</p><span>从素材进入<ArrowRight size={14} /></span></button>)}</div><p className="rp-note">工具入口用于讨论布局；这里没有运行算法或模型。</p></div>
  const libraryHeading = <div className="rp-library-heading"><div><h1>{collection}</h1><span>{visible.length} 个素材{query && ` · 匹配“${query}”`}</span></div><span className="rp-muted">手动整理与 AI 建议，共同积累</span></div>
  const galleryContent = <>{libraryHeading}{toolbar}{filterBar}{gallery}{bulkBar}</>

  return <div className={`rp-root rp-variant-${variant} rp-glass-workspace`} data-mode={mode} data-transition={transition.phase} data-reduced-motion={transition.reduced}>
    <div className="rp-prototype-banner"><span><b>交互原型</b>合成素材 · 编辑与 AI 为演示 · 未连接真实服务</span><button onClick={() => { setAssets(seed); setSelectedIds([1]); setCollection('全部素材'); setQuery(''); setFormat('全部格式'); setSuggestions([]); setCardDrafts({}); setDraft(saved); tell('示例素材已重置。') }}>重置示例</button></div>
    <div className="rp-mode-stage">
    <div className={`rp-mode-canvas ${transition.phase === 'frosting' || transition.phase === 'title' ? 'is-frosted' : ''}`} {...(transition.busy ? { inert: '' } : {})} aria-hidden={transition.busy || undefined}>
    {variant === 'A' && <div className="rp-layout-a" {...(page === 'settings' ? { inert: '' } : {})} aria-hidden={page === 'settings' || undefined}><aside className="rp-sidebar">{libraryPicker}{modeNav}{collectionNav}<div className="rp-spacer" />{settingsButton}</aside><main className="rp-center">{page === 'library' || page === 'settings' ? galleryContent : supportingPage}</main>{(page === 'library' || page === 'settings') && inspectorPanel}</div>}
    {variant === 'C' && <div className="rp-layout-c" {...(page === 'settings' ? { inert: '' } : {})} aria-hidden={page === 'settings' || undefined}><header className="rp-c-top">{libraryPicker}{modeNav}<div className="rp-spacer" />{settingsButton}</header>{page === 'library' || page === 'settings' ? <div className="rp-review-workspace"><aside className="rp-sidebar">{collectionNav}</aside><main className="rp-review-center">{toolbar}{filterBar}<div className="rp-review-stage">{selected && !selected.trashed && visible.some(asset => asset.id === selected.id) || selected && collection === '回收站' && selected.trashed ? <><div className="rp-review-caption"><div><strong>{selected!.title}</strong><span>{selected!.format} · 合成样张</span></div><button onClick={() => setQuickLook(true)}><Maximize2 size={15} />快速查看</button></div><div className="rp-review-art"><Artwork asset={selected!} /></div></> : <div className="rp-empty"><ImageIcon size={30} /><h2>选择一个素材，查看细节</h2><p>底部缩略带保留你的浏览位置。</p></div>}</div><div className="rp-filmstrip">{gallery}</div>{bulkBar}</main>{inspectorPanel}</div> : supportingPage}</div>}
    {mode === 'card' && <div className="rp-layout-floating" {...(page === 'settings' ? { inert: '' } : {})} aria-hidden={page === 'settings' || undefined}>
      {(page === 'library' || page === 'settings') ? <FloatingAssetCard asset={cardAsset}
        artwork={cardAsset && <Artwork asset={{ ...cardAsset, appearance: undefined }} />}
        draft={cardDraft} onDraft={value => { if (cardAsset) setCardDrafts(previous => ({ ...previous, [cardAsset.id]: value })) }}
        onClose={() => switchMode('library')} onFocus={() => switchMode('focus')}
        onPrevious={() => stepAsset(-1)} onNext={() => stepAsset(1)} onCopy={saveCardCopy} tell={tell}
      /> : <div className="rp-layout-c"><header className="rp-c-top">{libraryPicker}{modeNav}<div className="rp-spacer" />{settingsButton}</header>{supportingPage}</div>}
    </div>}
    {page === 'settings' && <div className="rp-settings-overlay"><div className="rp-settings-scrim" onClick={() => go('/library')} />{settingsContent}</div>}
    </div>
    <ModeVeil requested={requestedMode} phase={transition.phase} reduced={transition.reduced} />
    </div>
    <span className="rp-sr-only" role="status">{transition.busy ? '正在切换视图' : `当前模式：${mode === 'library' ? '资料库' : mode === 'focus' ? '专注查看' : '悬浮卡片'}`}</span>
    <dialog ref={modalRef} className={quickLook ? 'rp-quick-look' : 'rp-import-review'} onCancel={() => { setQuickLook(false); setAddReview(false) }}>
      <header><strong>{quickLook ? selected?.title : '导入示例素材'}</strong><button aria-label="关闭弹窗" onClick={() => { setQuickLook(false); setAddReview(false) }}><X size={20} /></button></header>
      {quickLook && selected ? <><Artwork asset={selected} /><p>合成预览 · 空格打开 / Esc 关闭</p></> : <><p>体验复制入库的确认流程。不会打开文件选择器或读取磁盘素材。</p><div className="rp-import-item"><ImageIcon size={24} /><div><strong>新的灵感样张.png</strong><small>原型生成 · 1600 × 2000</small></div><Check size={18} /></div><p className="rp-note">保存到「设计灵感库」· 复制到资料库 · 保留来源</p><button className="rp-primary" onClick={() => { const id = Math.max(...assets.map(asset => asset.id)) + 1; setAssets(previous => [{ ...seed[0], id, title: `新的灵感样张 ${id}`, tags: [], folder: '' }, ...previous]); setSelectedIds([id]); setCollection('全部素材'); setFormat('全部格式'); setQuery(''); setAddReview(false); tell('示例素材已加入内存；没有复制真实文件。') }}>确认加入示例</button></>}
    </dialog>
    {feedback && <div className="rp-toast" role="status"><Check size={14} />{feedback}</div>}
    <ModeDock current={requestedMode} onChange={switchMode} reduced={transition.reduced} />
    <button className="rp-debug-toggle" aria-expanded={showState} onClick={() => setShowState(!showState)}>交互状态</button>
    {showState && <aside className="rp-state"><label><input type="checkbox" checked={previewReduced} onChange={event => setPreviewReduced(event.target.checked)} />演示减少动态效果</label><pre>{JSON.stringify({ mode, requestedMode, phase: transition.phase, reducedMotion: transition.reduced, page, collection, query, format, selectedIds, visibleCount: visible.length, settingsGroup, draft, dirty, externalCalls: 0, persistence: 'memory-only' }, null, 2)}</pre></aside>}
  </div>
}
