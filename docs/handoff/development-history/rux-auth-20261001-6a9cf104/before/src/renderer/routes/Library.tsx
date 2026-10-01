import AssetDeleteButton from '../components/asset/AssetDeleteButton'
import {hasUnsavedOcrDrafts,clearOcrDrafts} from '../components/library/canvas/ocr-drafts'
import {useWorkSetNavigation} from '../stores/work-set-navigation.store'
import {useWorkSets} from '../components/library/canvas/useWorkSets'
import {WorkSetModal,type WorkSetIntent} from '../components/library/canvas/WorkSetModal'
import {useLibraryOrganization} from '../components/library/canvas/useLibraryOrganization'
import {OrganizationModal,type OrganizationIntent} from '../components/library/canvas/OrganizationModal'
import {libraryNotebookSession,clearLibraryNotebookSession,hasUnsavedLibraryNotes} from '../components/library/canvas/notebook-session'
import {LibraryDetails} from '../components/library/canvas/LibraryDetails'
import type {Notebook} from '../components/gallery/focus-notes'
import { LibraryCanvas } from '../components/library/canvas/LibraryCanvas'
import { LibraryFocus } from '../components/library/canvas/LibraryFocus'
import ImageToolsPanel from '../components/asset/ImageToolsPanel'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { LibraryViewMode } from '../components/library/WorkspaceModes'
import VisualAiPanel from '../components/asset/VisualAiPanel'
import AssetCardPanel from '../components/asset/AssetCardPanel'
import { libraryViewScope, useLibraryViewStore, flushLibraryDrafts } from '../stores/library-view.store'
import { projectAssetLibraryCardDisplay } from '../../shared/workflows/asset-display.workflow'
import type { AssetCardChangedEvent } from '../../shared/contracts/asset-card.contract'
import { useAssetStore, type Asset } from '../stores/asset.store'
import { useSettingsStore } from '../stores/settings.store'
import { projectAssetDiscovery } from '../../shared/workflows/asset-discovery.workflow'
import type { ActiveLibraryHostProjection } from '../../shared/contracts/active-library.contract'

// Presentational & panel components
import AssetInspectorDrawer from '../components/asset/AssetInspectorDrawer'
import BulkActionModal from '../components/library/BulkActionModal'
import ActiveLibraryControls, {type ActiveLibraryControlActions} from '../components/library/ActiveLibraryControls'

export default function Library() {
  const navigate = useNavigate()
  const view = useLibraryViewStore()
  const [cardError, setCardError] = useState('')
  const [libraryError,setLibraryError]=useState('')
  const [openingCard, setOpeningCard] = useState(false)
  const inspectSequence = useRef(0)
  const {
    assets,
    tags,
    selectedAsset,
    searchQuery,
    filterSite,
    activeTagSearchQueries,
    bulkSelectedAssetIds,
    setSelectedAsset,
    setSearchQuery,
    setFilterSite,
    addActiveTagSearchQuery,
    removeActiveTagSearchQuery,
    clearActiveTagSearchQueries,
    toggleBulkSelectedAssetId,
    clearBulkSelectedAssetIds,
    batchAddTagsToAssets,
    batchRemoveTagsFromAssets,
    deleteAsset,
    loadAssets,
    loadTags,
    filterTag,
    setFilterTag,
    updateAssetCaption,
    resetAssetCaptionEdited,
    generateAiSuggestions,
    assetLoadStatus,
    assetLoadError,
    hasLoadedAssets,
    resetForLibraryTransition
  } = useAssetStore()

  const libraryControlsRef=useRef<ActiveLibraryControlActions>(null)
  const [quickLookAsset, setQuickLookAsset] = useState<Asset | null>(null)
  const [quickIds,setQuickIds]=useState<string[]>([])
  const openQuick=(asset:Asset,orderedIds?:string[])=>{view.setMode('focus');setQuickIds(orderedIds||discovery.matches.map(m=>m.asset.id));setQuickLookAsset(asset)}
  useEffect(() => {
    const searchShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f') return
      if (document.querySelector('[aria-modal="true"]')) return
      const input = document.querySelector<HTMLInputElement>('input[aria-label="搜索素材"]')
      if (input) { event.preventDefault(); input.focus(); input.select() }
    }
    window.addEventListener('keydown', searchShortcut)
    return () => window.removeEventListener('keydown', searchShortcut)
  }, [])

  // Bulk actions popover states
  const [bulkActionType, setBulkActionType] = useState<'add' | 'remove' | null>(null)
  const [bulkActionTags, setBulkActionTags] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const { loadSettings } = useSettingsStore()
  const [libraryProjection, setLibraryProjection] = useState<ActiveLibraryHostProjection>({ state: 'unopened', identity: null, generation: null })
  const refreshLibraryState = async (): Promise<ActiveLibraryHostProjection> => {
    const sequence=++inspectSequence.current
    try {
      const inspect=(window as any).electronAPI?.library?.inspect
      if(typeof inspect!=='function')throw new Error('LIBRARY_BRIDGE_UNAVAILABLE')
      const next=await inspect() as ActiveLibraryHostProjection
      if(!next||!['unopened','opening','ready','quiescing','closed','recovery-required'].includes(next.state)||(next.state==='ready'&&(!next.identity||!next.generation)))throw new Error('INVALID_AUTHORITY')
      if(sequence===inspectSequence.current){setLibraryProjection(next);setLibraryError('');useLibraryViewStore.getState().setScope(next.state==='ready'&&next.identity&&next.generation?libraryViewScope(next.identity,next.generation):null)}
      return next
    }catch{
      const failed:ActiveLibraryHostProjection={state:'recovery-required',identity:null,generation:null}
      if(sequence===inspectSequence.current){setLibraryProjection(failed);setLibraryError('无法确认当前素材库状态，请重新检查或打开素材库。');useLibraryViewStore.getState().setScope(null);resetForLibraryTransition();setQuickLookAsset(null)}
      return failed
    }
  }
  const refreshReadyLibrary = async () => {
    const projection=await refreshLibraryState()
    if(projection.state==='ready')await Promise.all([loadAssets(),loadTags()])
  }

  // Track last opened asset id and card trigger elements for focus restoration
  const cardTriggerRegistryRef = useRef<Map<string, HTMLElement>>(new Map())
  const lastOpenedAssetIdRef = useRef<string | null>(null)
  const prevSelectedAssetRef = useRef<Asset | null>(selectedAsset)

  const registerCardTrigger = (assetId: string, element: HTMLElement | null) => {
    if (element) {
      cardTriggerRegistryRef.current.set(assetId, element)
    } else {
      cardTriggerRegistryRef.current.delete(assetId)
    }
  }

  // Restore focus when selectedAsset closes
  useEffect(() => {
    if (selectedAsset) {
      lastOpenedAssetIdRef.current = selectedAsset.id
    } else if (prevSelectedAssetRef.current) {
      const closedAssetId = lastOpenedAssetIdRef.current
      lastOpenedAssetIdRef.current = null

      const triggerEl =
        (closedAssetId ? cardTriggerRegistryRef.current.get(closedAssetId) : null) ||
        (closedAssetId ? document.getElementById(`asset-card-open-${closedAssetId}`) : null)

      if (triggerEl && triggerEl.isConnected && typeof triggerEl.focus === 'function') {
        triggerEl.focus()
      } else {
        const searchInput =
          document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="搜索"]') ||
          document.querySelector<HTMLInputElement>('input[type="text"]')
        if (searchInput && searchInput.isConnected && typeof searchInput.focus === 'function') {
          searchInput.focus()
        }
      }
    }
    prevSelectedAssetRef.current = selectedAsset
  }, [selectedAsset])

  // Refresh tags and assets list on load
  useEffect(() => {
    let active = true
    void (async () => {
      const projection = await refreshLibraryState()
      if (!active) return
      if (projection.state === 'ready') await Promise.all([loadAssets(), loadTags()])
      await loadSettings()
    })()
    return () => { active = false }
  }, [])

  const discovery = useMemo(
    () => projectAssetDiscovery({
      assets,
      query: searchQuery,
      sourceSiteId: filterSite || undefined,
      tagScope: 'includes-pending',
      tagQueries: activeTagSearchQueries
    }),
    [activeTagSearchQueries, assets, filterSite, searchQuery]
  )

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterSite('')
    setFilterTag('')
    clearActiveTagSearchQueries()
  }

  // Bulk operation execute logic
  const executeBulkAction = async () => {
    if (bulkActionTags.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setBulkError(null)
    try {
      if (bulkActionType === 'add') {
        await batchAddTagsToAssets(bulkSelectedAssetIds, bulkActionTags, {
          source: 'manual',
          status: 'confirmed'
        })
      } else if (bulkActionType === 'remove') {
        await batchRemoveTagsFromAssets(bulkSelectedAssetIds, bulkActionTags)
      }
      setBulkActionType(null)
      setBulkActionTags([])
      clearBulkSelectedAssetIds()
    } catch (e) {
      setBulkError('本次批量修改未能完成，请检查素材库状态后重试。')
    } finally { setBulkBusy(false) }
  }

  const changeMode = (mode: LibraryViewMode) => {
    if (mode !== 'library' && !discovery.matches.some(match => match.asset.id === useAssetStore.getState().selectedAsset?.id)) setSelectedAsset(discovery.matches[0]?.asset ?? null)
    view.setMode(mode)
    setCardError('')
  }
  const focusAsset = discovery.matches.find(match => match.asset.id === selectedAsset?.id)?.asset
  const scope = view.scope ?? 'unopened'
  const organization=useLibraryOrganization(libraryProjection,assets)
  const workSets=useWorkSets(libraryProjection,assets)
  const [workSetIntent,setWorkSetIntent]=useState<WorkSetIntent|null>(null)
  useEffect(()=>setWorkSetIntent(null),[scope])
  const workNavigation=useWorkSetNavigation(s=>s.request)
  const [revealWorkAsset,setRevealWorkAsset]=useState(0)
  useEffect(()=>{if(!workNavigation||libraryProjection.state!=='ready'||!hasLoadedAssets)return;const event=workNavigation;useWorkSetNavigation.getState().clear();if(event.libraryIdentity!==libraryProjection.identity||event.generation!==libraryProjection.generation)return;if(event.assetId){const asset=useAssetStore.getState().assets.find(a=>a.id===event.assetId);if(asset){handleClearFilters();setSelectedAsset(asset);view.setMode('library');setRevealWorkAsset(v=>v+1)}}else setWorkSetIntent({kind:'add',targetId:event.setId})},[workNavigation,libraryProjection.state,libraryProjection.identity,libraryProjection.generation,hasLoadedAssets])
  const [organizationIntent,setOrganizationIntent]=useState<OrganizationIntent|null>(null)
  useEffect(()=>setOrganizationIntent(null),[scope])
  const authorityWillChange = () => {
    if((hasUnsavedLibraryNotes()||hasUnsavedOcrDrafts())&&!window.confirm('当前有未保存的图片笔记或 OCR 修订。仍要关闭或切换素材库并放弃这些草稿吗？'))throw new Error('已取消切换，笔记草稿保留。')
    clearLibraryNotebookSession();clearOcrDrafts()
    inspectSequence.current++
    useLibraryViewStore.getState().setScope(null)
    setQuickLookAsset(null); setBulkActionType(null); setCardError('')
    setLibraryProjection({ state: 'quiescing', identity: null, generation: null })
    resetForLibraryTransition()
  }
  const popout = async () => {
    if (!focusAsset || openingCard || !libraryProjection.identity || !libraryProjection.generation) return
    const api = (window as any).electronAPI?.assetCard
    if (!api?.open) { setCardError('当前环境无法打开桌面悬浮窗口。'); return }
    const expectedScope = scope
    setOpeningCard(true); setCardError('')
    const ids = discovery.matches.map(match => match.asset.id)
    const start = Math.max(0, ids.indexOf(focusAsset.id) - 249)
    try {
      await flushLibraryDrafts()
      if (expectedScope !== useLibraryViewStore.getState().scope) return
      const result = await api.open({ libraryIdentity: libraryProjection.identity, generation: libraryProjection.generation, assetId: focusAsset.id, assetIds: ids.slice(start, start + 500) })
      if (expectedScope === useLibraryViewStore.getState().scope) {
        if (!result?.ok) setCardError('悬浮窗口未能打开，请确认素材库状态后重试。')
        else useLibraryViewStore.getState().setDesktopAsset(focusAsset.id)
      }
    } catch { if (expectedScope === useLibraryViewStore.getState().scope) setCardError('悬浮窗口未能打开，请重试。') }
    finally { setOpeningCard(false) }
  }
  const saveDescription = async (caption: string, expected: string) => {
    if (!focusAsset) return false
    const expectedScope = scope
    try {
      const result = await (window as any).electronAPI?.updateAssetCaption(focusAsset.id, caption, expected)
      if (!result?.success) throw new Error('SAVE_FAILED')
      if (expectedScope !== useLibraryViewStore.getState().scope) return false
      await loadAssets();
      if (expectedScope !== useLibraryViewStore.getState().scope) return false
      useLibraryViewStore.getState().finishDescription(focusAsset.id, caption, expected)
      setCardError(''); return true
    } catch {
      if (expectedScope === useLibraryViewStore.getState().scope) { setCardError('描述未保存，可能已在其他窗口修改。取消编辑以载入最新内容后重试。'); await loadAssets() }
      return false
    }
  }
  useEffect(() => {
    const api = (window as any).electronAPI?.assetCard
    return api?.onChanged((context: AssetCardChangedEvent) => {
      if (context.metadataChanged && libraryViewScope(context.libraryIdentity, context.generation) === useLibraryViewStore.getState().scope) void loadAssets()
    })
  }, [loadAssets])
  const aiScope = libraryProjection.identity && libraryProjection.generation ? { libraryIdentity: libraryProjection.identity, generation: libraryProjection.generation } : null
  const refreshAi = () => { void Promise.all([loadAssets(), loadTags()]) }
  const cardPresentation = focusAsset ? {
    id: focusAsset.id, title: focusAsset.title, previewSrc: projectAssetLibraryCardDisplay(focusAsset).previewSrc,
    metadata: `${focusAsset.fileType || '图片'} · ${focusAsset.width || '—'} × ${focusAsset.height || '—'}`,
    tags: focusAsset.tags, caption: focusAsset.aiCaption || ''
  } : null
  const stepAsset = (offset: number) => {
    const index = discovery.matches.findIndex(match => match.asset.id === focusAsset?.id)
    const next = discovery.matches[index + offset]?.asset
    if (next) setSelectedAsset(next)
  }

  useEffect(()=>{if(view.mode==='focus'&&focusAsset&&!quickLookAsset)openQuick(focusAsset)},[view.mode,focusAsset?.id])
  useEffect(()=>{if(quickLookAsset&&!assets.some(a=>a.id===quickLookAsset.id)){setQuickLookAsset(null);if(view.mode==='focus')view.setMode('library')}},[assets])
  const closeQuick=()=>{setQuickLookAsset(null);if(view.mode==='focus')view.setMode('library')}
  const focused=quickLookAsset?assets.find(a=>a.id===quickLookAsset.id):null
  const focusItems=quickIds.map(id=>assets.find(a=>a.id===id)).filter((a):a is Asset=>Boolean(a))
  const analysis=selectedAsset&&aiScope?<VisualAiPanel key={`${scope}:${selectedAsset.id}`} scope={aiScope} assetIds={bulkSelectedAssetIds.length?bulkSelectedAssetIds:[selectedAsset.id]} promptDraft={view.prompts[selectedAsset.id]??''} onUsePrompt={value=>view.setPrompt(selectedAsset.id,value)} onChanged={refreshAi} onConfigure={()=>navigate('/settings?section=ai')}/>:undefined
  const workspaceTools=selectedAsset&&aiScope?<ImageToolsPanel key={`tools:${scope}:${selectedAsset.id}`} scope={{...aiScope,assetId:selectedAsset.id}}/>:undefined
  const legacyDetails=selectedAsset?<AssetInspectorDrawer key={`${scope}:${selectedAsset.id}`} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} updateAssetCaption={updateAssetCaption} resetAssetCaptionEdited={resetAssetCaptionEdited} generateAiSuggestions={generateAiSuggestions} deleteAsset={deleteAsset} activeLibraryMode embedded workspaceTools={workspaceTools} onPreview={()=>openQuick(selectedAsset)} retainTriggerFocus/>:null
  const details=selectedAsset?<LibraryDetails ocrAssetIds={bulkSelectedAssetIds} analysis={analysis} libraryScope={libraryProjection.state==='ready'?{libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}:undefined} organize={setOrganizationIntent} addWorkColor={color=>setWorkSetIntent({kind:'add',colors:[color]})} key={`${scope}:${selectedAsset.id}`} asset={selectedAsset} close={()=>setSelectedAsset(null)} preview={()=>openQuick(selectedAsset)} editor={legacyDetails} tools={<>{workspaceTools}<AssetDeleteButton assetId={selectedAsset.id} deleteAsset={deleteAsset}/></>} addWork={()=>setWorkSetIntent({kind:'add',assetIds:[selectedAsset.id]})}/>:null
  const notebook=useMemo(()=>libraryNotebookSession({libraryIdentity:libraryProjection.identity||'',generation:libraryProjection.generation||''},()=> (window as any).electronAPI?.library),[scope,libraryProjection.identity,libraryProjection.generation])



  const work=focusAsset&&cardPresentation?view.desktopAssetId===focusAsset.id?<div className="lc-native-card-note"><p>正在桌面悬浮窗口中查看。</p><button onClick={()=>void popout()}>聚焦桌面卡片</button></div>:<AssetCardPanel key={`${scope}:${focusAsset.id}`} asset={cardPresentation}
    promptDraft={view.prompts[focusAsset.id]??''} onPromptDraft={value=>view.setPrompt(focusAsset.id,value)} onSaveDescription={saveDescription}
    descriptionDraft={view.descriptions[focusAsset.id]??{value:focusAsset.aiCaption||'',baseCaption:focusAsset.aiCaption||''}} onDescriptionDraft={value=>view.setDescription(focusAsset.id,value)}
    onClose={()=>changeMode('library')} onFocus={()=>openQuick(focusAsset)} onPopout={openingCard?undefined:()=>{void popout()}}
    onPrevious={discovery.matches.findIndex(m=>m.asset.id===focusAsset.id)>0?()=>stepAsset(-1):undefined}
    onNext={discovery.matches.findIndex(m=>m.asset.id===focusAsset.id)<discovery.matches.length-1?()=>stepAsset(1):undefined}
    toolsPanel={aiScope&&<ImageToolsPanel scope={{...aiScope,assetId:focusAsset.id}}/>}
    aiPanel={aiScope&&<VisualAiPanel scope={aiScope} assetIds={[focusAsset.id]} promptDraft={view.prompts[focusAsset.id]??''} onUsePrompt={value=>view.setPrompt(focusAsset.id,value)} onChanged={refreshAi} onConfigure={()=>navigate('/settings?section=ai')}/>}
    onConfigureAi={()=>navigate('/settings?section=ai')} error={cardError}/>:<p className="lc-empty">请先导入或选择一个素材。</p>
  return <>
    <LibraryCanvas revealWorkAsset={revealWorkAsset} workSets={workSets} editWorkSet={setWorkSetIntent} organization={organization} organize={setOrganizationIntent} addFiles={()=>libraryControlsRef.current?.addFiles()} key={scope} scope={scope} authority={libraryProjection} assets={assets} matches={discovery.matches} tags={tags} selected={selectedAsset} pick={setSelectedAsset} openFocus={openQuick}
      query={searchQuery} setQuery={setSearchQuery} tagQueries={activeTagSearchQueries} addTag={addActiveTagSearchQuery} removeTag={removeActiveTagSearchQuery} clearFilters={handleClearFilters}
      bulkIds={bulkSelectedAssetIds} toggleBulk={toggleBulkSelectedAssetId} clearBulk={clearBulkSelectedAssetIds} bulkAction={setBulkActionType} status={assetLoadStatus} error={assetLoadError} loaded={hasLoadedAssets} retry={refreshReadyLibrary}
      controls={<>{libraryError&&<div role="alert" className="lc-notice">{libraryError}<button onClick={()=>void refreshReadyLibrary()}>重新检查</button></div>}<ActiveLibraryControls ref={libraryControlsRef} projection={libraryProjection} onAuthorityWillChange={authorityWillChange} onAuthorityReady={refreshReadyLibrary} refreshProjection={refreshLibraryState}/></>}
      details={details} work={work} workMode={view.mode==='card'} showWork={()=>changeMode('card')} showAll={()=>view.setMode('library')} register={registerCardTrigger}/>
    {focused&&libraryProjection.state==='ready'&&createPortal(<LibraryFocus key={scope} asset={focused} items={focusItems} change={id=>{const a=assets.find(a=>a.id===id);if(a)setQuickLookAsset(a)}} close={closeQuick} notebook={notebook} details={<LibraryDetails libraryScope={libraryProjection.state==='ready'?{libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}:undefined} organize={setOrganizationIntent} addWorkColor={color=>setWorkSetIntent({kind:'add',colors:[color]})} key={focused.id} asset={focused} focus editor={<button onClick={()=>{closeQuick();setSelectedAsset(focused)}}>在侧栏编辑与分析</button>}/>}/>,document.body)}
    {workSetIntent&&!workSets.catalog&&<div className="work-intent-pending" role="status">{workSets.error||'正在读取工作集…'}<button onClick={()=>void workSets.refresh()}>重试</button><button onClick={()=>setWorkSetIntent(null)}>取消</button></div>}
    {workSetIntent&&workSets.catalog&&<WorkSetModal key={scope+JSON.stringify(workSetIntent)} model={workSets} intent={workSetIntent} assets={assets} close={()=>setWorkSetIntent(null)}/>}
    {organizationIntent&&<OrganizationModal key={scope+JSON.stringify(organizationIntent)} model={organization} intent={organizationIntent} close={()=>setOrganizationIntent(null)}/>}
    <BulkActionModal bulkActionType={bulkActionType} bulkActionTags={bulkActionTags} setBulkActionTags={setBulkActionTags} setBulkActionType={setBulkActionType} executeBulkAction={executeBulkAction} busy={bulkBusy} error={bulkError}/>
  </>
}
