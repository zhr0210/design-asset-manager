import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import type { SavedWorkSet, WorkSetValue, WorkWindowControlInput, WorkWindowControlState } from '../../../../shared/contracts/work-set.contract'
import type { Asset } from '../../../stores/asset.store'
import { requireWorkspaceClient } from '../../../workspace-client'
import { currentWorkspaceDraft, flushWorkspaceDrafts, holdWorkspaceDraft, removeWorkspaceDraft, suspendRecoveredWorkspaceDraft } from '../../../workspace-drafts'
import { useUIStore } from '../../../stores/ui.store'
import { WorkReferencePanel } from '../../gallery/WorkReferencePanel'
import {Button} from '../../ui/WorkspacePrimitives'
import { controlledPreview } from './LibraryMedia'
import type { WorkSetModel } from './useWorkSets'
import {useWorkSetAssets} from './useWorkSetAssets'
import {WorkSetAssetChoices} from './WorkSetAssetChoices'
import {WorkMediaPanel} from './WorkMediaPanel'
import {WorkFileHandoffPanel} from './WorkFileHandoffPanel'
import './work-set-reference.css'

type Baseline = { revision: number; value: WorkSetValue }
const valueOf = (set: SavedWorkSet): WorkSetValue => ({ name: set.name, assetIds: set.assetIds, note: set.note, colors: set.colors, columns: set.columns })
const same = (a: WorkSetValue, b: WorkSetValue) => JSON.stringify(a) === JSON.stringify(b)

/** Same reference presentation as the native window, through the workspace's scoped Host commands. */
export function WorkSetReferenceView({ id, model, assets, close, preview, locate,initialMediaAssetId }: {
  initialMediaAssetId?:string|null
  id: string; model: WorkSetModel; assets: Asset[]; close: () => void
  preview: (asset: Asset, orderedIds: string[]) => void; locate: (asset: Asset) => void
}) {
  const theme = useUIStore(s => s.theme), dialog = useRef<HTMLDialogElement>(null)
  const scope = { ...model.scope, kind: 'work-set' as const, entityId: id }
  const current = model.catalog?.sets.find(set => set.id === id)
  const initial = useRef(currentWorkspaceDraft(scope))
  const [base, setBase] = useState<Baseline>(() => initial.current?.base as Baseline || { revision: current?.revision || 0, value: current ? valueOf(current) : { name: '', assetIds: [], note: '', colors: [], columns: 2 } })
  const [value, setValue] = useState<WorkSetValue>(() => initial.current?.value as WorkSetValue || base.value)
  const [retainedRecovery, setRetainedRecovery] = useState(Boolean(initial.current))
  const [error, setError] = useState(''), [status, setStatus] = useState(''), [saving, setSaving] = useState(false)
  const [add, setAdd] = useState(false), [query, setQuery] = useState(''), [color, setColor] = useState(''), [upgrade, setUpgrade] = useState(false)
  const [native, setNative] = useState<WorkWindowControlState>(), [nativeBusy, setNativeBusy] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [mediaAsset,setMediaAsset]=useState<string|null>(initialMediaAssetId??null),[handoffAsset,setHandoffAsset]=useState<string|null>(null)
  const references=useWorkSetAssets(model.scope,query,value.assetIds,assets,add)
  const alive = useRef(true), saveLock = useRef(false), serial = useRef(0), valueRef = useRef(value), baseRef = useRef(base)
  valueRef.current = value; baseRef.current = base
  const dirty = !same(value, base.value), conflict = Boolean(current && current.revision !== base.revision)
  useEffect(() => {
    alive.current = true
    const previous = document.activeElement as HTMLElement
    dialog.current?.showModal()
    return () => { alive.current = false; previous?.focus({ preventScroll: true }) }
  }, [])
  useEffect(() => {
    if (dirty || retainedRecovery) holdWorkspaceDraft(scope, value, base)
    else removeWorkspaceDraft(scope)
  }, [value, base, retainedRecovery])
  useEffect(() => {
    // Only a clean view can automatically follow another client's saved revision.
    if (current && !retainedRecovery && current.revision !== baseRef.current.revision && !saveLock.current && same(valueRef.current, baseRef.current.value)) {
      setBase({ revision: current.revision, value: valueOf(current) }); setValue(valueOf(current))
    }
  }, [current?.revision, retainedRecovery])
  useEffect(() => {
    const api = requireWorkspaceClient().workSets
    let sequence = 0, stopped = false
    const refresh = async () => {
      const version = ++sequence
      try {
        const result = await api.windows(model.scope)
        if (stopped || version !== sequence) return
        if (!result.success) throw Error(result.error)
        setNative(result.value.find(window => window.id === id))
      } catch (e) { if (!stopped && version === sequence) setError(e instanceof Error ? e.message : '无法读取桌面窗口状态。') }
    }
    void refresh(); const stop = api.onChanged(() => { void refresh() })
    return () => { stopped = true; sequence++; stop() }
  }, [id, model.scope.libraryIdentity, model.scope.generation])
  const update = (next: WorkSetValue) => { serial.current++; setValue(next); setError(''); setStatus('') }
  const leave = async () => {
    if (saveLock.current || nativeBusy) return false
    try { await flushWorkspaceDrafts(); suspendRecoveredWorkspaceDraft(scope); close(); return true }
    catch (e) { setError(e instanceof Error ? e.message : '草稿暂存失败，当前输入保留。'); return false }
  }
  const save = async (asNew = false) => {
    if (saveLock.current) return
    if (!asNew && (!current || conflict)) { setError('原工作集已变化或不存在。请核对当前保存内容后采用新基准，或另存工作集。'); return }
    const submitted = structuredClone(valueRef.current), version = serial.current
    saveLock.current = true; setSaving(true); setError('')
    try {
      const catalog = await model.write(asNew ? { kind: 'create', value: { ...submitted, name: (submitted.name + ' 副本').slice(0, 80) } } : { kind: 'save', id, expectedRevision: baseRef.current.revision, value: submitted }, upgrade)
      if (!alive.current) return
      if (asNew) {
        if (serial.current === version) { removeWorkspaceDraft(scope); close() }
        else setStatus('已另存此次内容；新编辑仍保留在原工作集页面，尚未保存。')
        return
      }
      const saved = catalog.sets.find(set => set.id === id)
      if (!saved) throw Error('已保存，但工作集暂不可用；请重新读取。')
      const next = { revision: saved.revision, value: valueOf(saved) }
      setBase(next)
      if (serial.current === version) { setRetainedRecovery(false); setValue(next.value); removeWorkspaceDraft(scope); setStatus('已保存工作集') }
      else { holdWorkspaceDraft(scope, valueRef.current, next); setStatus('此次保存已完成，新编辑尚未保存。') }
    } catch (e) { if (alive.current) { setError(e instanceof Error ? e.message : '保存失败，草稿仍保留。'); void model.refresh() } }
    finally { saveLock.current = false; if (alive.current) setSaving(false) }
  }
  const control = async (command: Omit<WorkWindowControlInput, 'libraryIdentity' | 'generation' | 'id'>) => {
    if (nativeBusy) return
    setNativeBusy(true); setError('')
    try {
      const result = await requireWorkspaceClient().workSets.control({ ...model.scope, id, ...command } as WorkWindowControlInput)
      if (!alive.current) return
      if (!result.success) throw Error(result.error)
      setNative(result.value.window.open ? result.value.window : undefined)
      setStatus(result.value.status === 'review-required' ? result.value.message || '桌面窗口有未保存内容，请先在窗口中审查。' : '桌面窗口命令已执行')
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : '桌面窗口操作失败。') }
    finally { if (alive.current) setNativeBusy(false) }
  }
  const openNative = async () => {
    setNativeBusy(true); setError('')
    try { await model.open(id); if (alive.current) setStatus(dirty ? '桌面窗口已打开保存版本；页面草稿仍保留。' : '桌面窗口已打开') }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : '无法打开桌面工作窗口。') }
    finally { if (alive.current) setNativeBusy(false) }
  }
  const items = value.assetIds.map(assetId => {
    const asset = references.assets.find(a => a.id === assetId)
    return { id: assetId, title: asset?.title || '暂不可用的参考', src: asset ? controlledPreview(asset) : '', unavailable: !asset || !controlledPreview(asset) }
  })
  const inspect = (assetId: string) => { const asset = references.assets.find(a => a.id === assetId); if (asset?.fileType==='mp4')setMediaAsset(assetId);else if(asset)preview(asset, value.assetIds) }
  return createPortal(<div className={`gallery-design minimal-prototype ${theme === 'dark' ? 'dark' : ''}`}>
    <dialog ref={dialog} className="work-reference-dialog glass" aria-label={`工作集 ${value.name || '暂不可用'}`} onCancel={event => { event.preventDefault(); if(discard)setDiscard(false);else void leave() }} onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if(!discard)void save() }
    }}>
      <div className="work-reference-navigation"><button onClick={() => void leave()} disabled={saving || nativeBusy}><ArrowLeft size={15}/>返回工作模式</button><span>页面工作区</span><button onClick={() => void openNative()} disabled={!current || nativeBusy || model.busy}>在桌面展开</button>
        {native && <><small>{native.visible ? '桌面窗口可见' : '桌面窗口已隐藏'}{native.hasUnsaved ? ' · 有未保存内容' : ''}</small><button disabled={nativeBusy} onClick={() => void control({ kind: 'recover' })}>找回桌面窗口</button><button disabled={nativeBusy} onClick={() => void control({ kind: 'close' })}>关闭桌面窗口</button></>}
      </div>
      {discard?<div className="file-picker" role="alertdialog" aria-label="放弃页面草稿"><h2>放弃页面草稿</h2><p>只放弃当前页面的工作集草稿。已保存的工作集与素材保持原样。</p><footer><Button onClick={()=>setDiscard(false)}>继续编辑</Button><Button variant="primary" onClick={()=>{setDiscard(false);setRetainedRecovery(false);removeWorkspaceDraft(scope);if(current){setBase({revision:current.revision,value:valueOf(current)});setValue(valueOf(current));setError('')}else close()}}>确认放弃页面草稿</Button></footer></div>:<WorkReferencePanel name={value.name || '暂不可用的工作集'} items={items} note={value.note} colors={value.colors} columns={value.columns} fitColumns pinned={Boolean(native?.pinned)} nativeControls={Boolean(native)} dirty={dirty} saving={saving || model.busy || nativeBusy} status={status} error={error || native?.layoutError} onInspect={inspect} onPreview={inspect}
        onRemove={assetId => update({ ...value, assetIds: value.assetIds.filter(a => a !== assetId) })}
        onMove={(assetId, delta) => { const ids = [...value.assetIds], from = ids.indexOf(assetId), to = from + delta; if (to >= 0 && to < ids.length) { [ids[from], ids[to]] = [ids[to], ids[from]]; update({ ...value, assetIds: ids }) } }}
        onAdd={() => setAdd(!add)} onNote={note => update({ ...value, note })} onColors={colors => update({ ...value, colors })} onColumns={columns => update({ ...value, columns })}
        onPin={() => void control({ kind: 'pin', pinned: !native?.pinned } as Omit<WorkWindowControlInput, 'libraryIdentity' | 'generation' | 'id'>)} onHide={() => void control({ kind: 'hide' })} onSave={() => void save()}
        onCopyColor={hex => { void navigator.clipboard.writeText(hex).then(() => setStatus('已复制 ' + hex)).catch(() => setError('复制失败，请重试。')) }}
        onTransfer={assetId => { const asset = references.assets.find(a => a.id === assetId); if (asset) void leave().then(left => { if (left) locate(asset) }) }} transferLabel="在资料库检查"
        extra={<div className="work-reference-fields"><label>名称<input aria-label="工作参考名称" value={value.name} maxLength={80} onChange={e => update({ ...value, name: e.target.value })}/></label>
          <section aria-label="工作参考交付">{value.assetIds.map(assetId=>{const asset=references.assets.find(a=>a.id===assetId);return asset&&<div key={assetId}><button disabled={!current?.assetIds.includes(assetId)} onClick={()=>setHandoffAsset(handoffAsset===assetId?null:assetId)}>交付 {asset.title}</button>{asset.fileType==='mp4'&&<button disabled={!current?.assetIds.includes(assetId)} onClick={()=>setMediaAsset(assetId)}>视频与参考帧 {asset.title}</button>}</div>})}</section>
          {handoffAsset&&value.assetIds.includes(handoffAsset)&&<WorkFileHandoffPanel key={handoffAsset} scope={{...model.scope,setId:id,assetId:handoffAsset}} video={references.assets.find(a=>a.id===handoffAsset)?.fileType==='mp4'}/>}
          {add && <section aria-label="添加工作参考"><label>查找素材<input aria-label="查找工作参考" value={query} onChange={e => setQuery(e.target.value)}/></label><WorkSetAssetChoices search={references} pick={id=>update({...value,assetIds:[...value.assetIds,id]})}/></section>}
          <form onSubmit={event => { event.preventDefault(); if (!/^#[0-9a-f]{6}$/i.test(color)) { setError('请输入六位颜色代码，如 #AABBCC。'); return } update({ ...value, colors: [...new Set([...value.colors, color.toUpperCase()])] }); setColor('') }}><label>添加用色<input aria-label="工作颜色代码" value={color} maxLength={7} onChange={e => setColor(e.target.value)} placeholder="#AABBCC"/></label><button type="submit">添加工作颜色</button></form>
          {model.catalog?.requiresUpgrade && <label><input type="checkbox" checked={upgrade} onChange={e => setUpgrade(e.target.checked)}/>首次保存升级到 v7，旧版应用将无法打开此库；原件保留。我了解并同意。</label>}
          {(conflict || !current) && <div role="status"><p>{current ? '工作集已在另一界面修改。页面草稿仍保留。' : '原工作集已不存在或暂不可用，页面草稿仍保留。'}</p>{current && <><details><summary>核对当前已保存内容</summary><p>{current.name} · {current.assetIds.length} 份参考 · {current.colors.join('、')}</p><pre>{current.note || '尚无工作备注'}</pre></details><button disabled={saving} onClick={() => { setBase({ revision: current.revision, value: valueOf(current) }); setError(''); setStatus('已采用当前保存版本为基准，页面输入仍保留。') }}>核对后采用当前工作集为基准</button></>}</div>}
        </div>}
        footerExtra={<><button disabled={saving || model.busy} onClick={() => void save(true)}>另存工作集</button><button disabled={saving || nativeBusy || model.busy} onClick={()=>setDiscard(true)}>放弃页面草稿</button></>}/>}
    </dialog>
    {mediaAsset&&current?.assetIds.includes(mediaAsset)&&<WorkMediaPanel key={mediaAsset} scope={{...model.scope,setId:id,assetId:mediaAsset}} title={references.assets.find(a=>a.id===mediaAsset)?.title||'视频参考'} close={()=>setMediaAsset(null)}/>}
  </div>, document.body)
}
