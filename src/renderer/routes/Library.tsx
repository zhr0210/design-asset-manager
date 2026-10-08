import { getWorkspaceClient } from '../workspace-client'
import {appPath} from '../../shared/workflows/app-navigation.workflow'
import { takeRecoveredNavigation } from '../workspace-drafts'
import AssetDeleteButton from '../components/asset/AssetDeleteButton'
import {useWorkSetNavigation} from '../stores/work-set-navigation.store'
import {useWorkSets} from '../components/library/canvas/useWorkSets'
import {WorkSetModal,type WorkSetIntent} from '../components/library/canvas/WorkSetModal'
import {WorkSetReferenceView} from '../components/library/canvas/WorkSetReferenceView'
import {useLibraryOrganization} from '../components/library/canvas/useLibraryOrganization'
import {OrganizationModal,type OrganizationIntent} from '../components/library/canvas/OrganizationModal'
import {libraryNotebookSession} from '../components/library/canvas/notebook-session'
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
import { useLibraryViewStore, flushLibraryDrafts } from '../stores/library-view.store'
import { projectAssetLibraryCardDisplay } from '../../shared/workflows/asset-display.workflow'
import type { AssetCardChangedEvent } from '../../shared/contracts/asset-card.contract'
import { useAssetStore, mapSearchAsset, type Asset } from '../stores/asset.store'
import { useSettingsStore } from '../stores/settings.store'
import { useHostAssetSearch,type SearchOptions } from '../components/library/canvas/useHostAssetSearch'
import SearchFilters from '../components/library/canvas/SearchFilters'
import RetrievalSearchControls from '../components/library/canvas/RetrievalSearchControls'
import type { ActiveLibraryHostProjection } from '../../shared/contracts/active-library.contract'
import { useAssetWorkspaceSession } from '../asset-workspace-session.context'

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
  const session = useAssetWorkspaceSession()
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
    hasLoadedAssets
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
  const [libraryProjection, setLibraryProjection] = useState<ActiveLibraryHostProjection>(() => session.getSnapshot().projection)
  const resetRevision = useRef(session.getSnapshot().reset?.revision ?? 0)
  useEffect(() => {
    const update = () => {
      const next = session.getSnapshot()
      setLibraryProjection(next.projection); setLibraryError(next.error)
      if (next.reset && next.reset.revision !== resetRevision.current) {
        resetRevision.current = next.reset.revision
        setQuickLookAsset(null)
        if (next.reset.kind === 'revoked') { setBulkActionType(null); setCardError('') }
      }
    }
    const stop = session.subscribe(update)
    update()
    return stop
  }, [session])
  const refreshLibraryState = () => session.refresh('inspect')
  const refreshReadyLibrary = () => session.refresh('ready-assets')

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
      await refreshReadyLibrary()
      if (!active) return
      await loadSettings()
    })()
    return () => { active = false }
  }, [])

  const [searchOptions,setSearchOptions]=useState<SearchOptions>({mode:'lexical'})
  const [searchFolderId,setSearchFolderId]=useState<string|undefined>(),[referencedAssets,setReferencedAssets]=useState<Asset[]>([])
  useEffect(()=>setSearchOptions({mode:'lexical'}),[libraryProjection.identity,libraryProjection.generation])
  const hostedSearch = useHostAssetSearch(libraryProjection,searchQuery,filterSite,activeTagSearchQueries,assets,{...searchOptions,folderId:searchFolderId})
  const discovery = {matches:hostedSearch.matches}
  const displayAssets = useMemo(()=>[...new Map([...referencedAssets,...assets,...hostedSearch.matches.map(m=>m.asset)].map(a=>[a.id,a])).values()],[assets,hostedSearch.matches,referencedAssets])

  const handleClearFilters = () => {
    setSearchOptions({mode:'lexical'})
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
    if (mode !== 'library' && !displayAssets.some(asset => asset.id === useAssetStore.getState().selectedAsset?.id)) setSelectedAsset(discovery.matches[0]?.asset ?? null)
    view.setMode(mode)
    setCardError('')
  }
  const focusAsset = displayAssets.find(asset => asset.id === selectedAsset?.id)
  const scope = view.scope ?? 'unopened'
  const organization=useLibraryOrganization(libraryProjection,assets)
  const workSets=useWorkSets(libraryProjection,assets)
  const [workSetIntent,setWorkSetIntent]=useState<WorkSetIntent|null>(null)
  const [referenceSet,setReferenceSet]=useState<string|null>(null)
  const [recoveredMediaAsset,setRecoveredMediaAsset]=useState<string|null>(null)
  useEffect(()=>{setReferencedAssets([])},[scope])
  useEffect(()=>{let live=true
    if(libraryProjection.state!=='ready')return
    const current={libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!},known=new Set(assets.map(a=>a.id))
    const activeSet=referenceSet??(workSetIntent&&'id' in workSetIntent?workSetIntent.id:null)
    const ids=[...new Set([...(workSets.catalog?.sets??[]).flatMap(s=>s.id===activeSet?s.assetIds:s.assetIds.slice(0,3)),...(organization.snapshot?.folders??[]).flatMap(f=>f.assetIds.slice(0,3))])].filter(id=>!known.has(id)).slice(0,5000)
    void(async()=>{const fetched:Asset[]=[];for(let offset=0;offset<ids.length;offset+=100){const rows=await getWorkspaceClient()!.readSearchAssets({...current,ids:ids.slice(offset,offset+100)});if(!live)return;fetched.push(...rows.map(a=>mapSearchAsset(a,current)))}if(live)setReferencedAssets(fetched)})().catch(()=>{if(live)setLibraryError('部分工作集或文件夹素材暂不可读，请刷新重试。')})
    return()=>{live=false}
  },[scope,workSets.catalog,organization.snapshot,referenceSet,workSetIntent,assets])
  useEffect(()=>{hostedSearch.reload()},[organization.snapshot?.revision])
  // Revoke the previous scope before accepting navigation for the current one.
  useEffect(()=>{setWorkSetIntent(null);setReferenceSet(null)},[scope])
  useEffect(() => {
    let live=true
    const receive = () => {
      if (libraryProjection.state !== 'ready' || !hasLoadedAssets) return
      const recovered = takeRecoveredNavigation(libraryProjection.identity!)
      if (!recovered) return
      if (recovered.kind === 'work-set') { setWorkSetIntent(recovered.entityId === 'work-set:new' ? { kind: 'new' } : { kind: 'edit', id: recovered.entityId }); return }
      if(recovered.kind==='work-media'){const value=recovered.value as {setId?:string;assetId?:string};if(typeof value?.setId==='string'&&typeof value.assetId==='string'){setReferenceSet(value.setId);setRecoveredMediaAsset(value.assetId)}else setLibraryError('视频参考草稿缺少身份信息，已保留，请核对。');return}
      const current={libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}
      void(async()=>{
        const local=displayAssets.find(value=>value.id===recovered.entityId)
        const asset=local??(await getWorkspaceClient()!.readSearchAssets({...current,ids:[recovered.entityId]})).map(a=>mapSearchAsset(a,current))[0]
        if(!live||scope!==useLibraryViewStore.getState().scope)return
        if(!asset){setLibraryError('草稿对应的素材暂不可用；草稿仍保留在本机。');return}
        if(!local)setReferencedAssets(old=>[...old.filter(a=>a.id!==asset.id),asset])
        if(recovered.kind==='description')view.acceptDrafts(asset.id,{descriptionDraft:{value:String(recovered.value),baseCaption:String(recovered.base)}})
        if(recovered.kind==='prompt')view.acceptDrafts(asset.id,{promptDraft:String(recovered.value)})
        setSelectedAsset(asset)
        if(recovered.kind==='notebook')openQuick(asset)
      })().catch(()=>{if(live)setLibraryError('草稿对应的素材暂不可读；草稿仍保留在本机，请重试。')})
    }
    window.addEventListener('workspace-recovered-draft', receive); receive()
    return () => {live=false;window.removeEventListener('workspace-recovered-draft', receive)}
  }, [libraryProjection.identity, libraryProjection.generation, hasLoadedAssets])
  const workNavigation=useWorkSetNavigation(s=>s.request)
  const [revealWorkAsset,setRevealWorkAsset]=useState(0)
  useEffect(()=>{if(!workNavigation||libraryProjection.state!=='ready'||!hasLoadedAssets)return;const event=workNavigation;useWorkSetNavigation.getState().clear();if(event.libraryIdentity!==libraryProjection.identity||event.generation!==libraryProjection.generation)return
    if(event.assetId)void(async()=>{const local=displayAssets.find(a=>a.id===event.assetId),current={libraryIdentity:event.libraryIdentity,generation:event.generation}
      const asset=local??(await getWorkspaceClient()!.readSearchAssets({...current,ids:[event.assetId!]})).map(a=>mapSearchAsset(a,current))[0]
      if(!asset||scope!==useLibraryViewStore.getState().scope)return
      if(!local)setReferencedAssets(old=>[...old.filter(a=>a.id!==asset.id),asset])
      handleClearFilters();setSelectedAsset(asset);view.setMode('library');setRevealWorkAsset(v=>v+1)
    })().catch(()=>setLibraryError('工作集素材暂不可读，请刷新后重新定位。'))
    else setWorkSetIntent({kind:'add',targetId:event.setId})
  },[workNavigation,libraryProjection.state,libraryProjection.identity,libraryProjection.generation,hasLoadedAssets])
  const [organizationIntent,setOrganizationIntent]=useState<OrganizationIntent|null>(null)
  useEffect(()=>setOrganizationIntent(null),[scope])
  const authorityWillChange = () => setLibraryError('')
  const popout = async () => {
    if (!focusAsset || openingCard || !libraryProjection.identity || !libraryProjection.generation) return
    const api = getWorkspaceClient()?.assetCard
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
      const result = await getWorkspaceClient()?.updateAssetCaption(focusAsset.id, caption, expected)
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
    const api = getWorkspaceClient()?.assetCard
    return api?.onChanged((context: AssetCardChangedEvent) => {
      void session.receive({ kind: 'card-metadata', context })
    })
  }, [session])
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
  const focusItems=quickIds.map(id=>displayAssets.find(a=>a.id===id)).filter((a):a is Asset=>Boolean(a))
  const analysis=selectedAsset&&aiScope?<VisualAiPanel key={`${scope}:${selectedAsset.id}`} scope={aiScope} assetIds={bulkSelectedAssetIds.length?bulkSelectedAssetIds:[selectedAsset.id]} promptDraft={view.prompts[selectedAsset.id]??''} onUsePrompt={value=>view.setPrompt(selectedAsset.id,value)} onChanged={refreshAi} onConfigure={()=>navigate(appPath('ai-console'))}/>:undefined
  const workspaceTools=selectedAsset&&aiScope?<ImageToolsPanel key={`tools:${scope}:${selectedAsset.id}`} scope={{...aiScope,assetId:selectedAsset.id}}/>:undefined
  const legacyDetails=selectedAsset?<AssetInspectorDrawer key={`${scope}:${selectedAsset.id}`} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} updateAssetCaption={updateAssetCaption} resetAssetCaptionEdited={resetAssetCaptionEdited} generateAiSuggestions={generateAiSuggestions} deleteAsset={deleteAsset} activeLibraryMode embedded workspaceTools={workspaceTools} onPreview={()=>openQuick(selectedAsset)} retainTriggerFocus/>:null
  const details=selectedAsset?<LibraryDetails ocrAssetIds={bulkSelectedAssetIds} analysis={analysis} libraryScope={libraryProjection.state==='ready'?{libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}:undefined} organize={setOrganizationIntent} addWorkColor={color=>setWorkSetIntent({kind:'add',colors:[color]})} key={`${scope}:${selectedAsset.id}`} asset={selectedAsset} close={()=>setSelectedAsset(null)} preview={()=>openQuick(selectedAsset)} editor={legacyDetails} tools={<>{workspaceTools}<AssetDeleteButton assetId={selectedAsset.id} deleteAsset={deleteAsset}/></>} addWork={()=>setWorkSetIntent({kind:'add',assetIds:[selectedAsset.id]})}/>:null
  const notebook=useMemo(()=>libraryNotebookSession({libraryIdentity:libraryProjection.identity||'',generation:libraryProjection.generation||''},()=> getWorkspaceClient()?.library),[scope,libraryProjection.identity,libraryProjection.generation])



  const work=focusAsset&&cardPresentation?view.desktopAssetId===focusAsset.id?<div className="lc-native-card-note"><p>正在桌面悬浮窗口中查看。</p><button onClick={()=>void popout()}>聚焦桌面卡片</button></div>:<AssetCardPanel key={`${scope}:${focusAsset.id}`} asset={cardPresentation}
    promptDraft={view.prompts[focusAsset.id]??''} onPromptDraft={value=>view.setPrompt(focusAsset.id,value)} onSaveDescription={saveDescription}
    descriptionDraft={view.descriptions[focusAsset.id]??{value:focusAsset.aiCaption||'',baseCaption:focusAsset.aiCaption||''}} onDescriptionDraft={value=>view.setDescription(focusAsset.id,value)}
    onClose={()=>changeMode('library')} onFocus={()=>openQuick(focusAsset)} onPopout={openingCard?undefined:()=>{void popout()}}
    onPrevious={discovery.matches.findIndex(m=>m.asset.id===focusAsset.id)>0?()=>stepAsset(-1):undefined}
    onNext={discovery.matches.findIndex(m=>m.asset.id===focusAsset.id)<discovery.matches.length-1?()=>stepAsset(1):undefined}
    toolsPanel={aiScope&&<ImageToolsPanel scope={{...aiScope,assetId:focusAsset.id}}/>}
    aiPanel={aiScope&&<VisualAiPanel scope={aiScope} assetIds={[focusAsset.id]} promptDraft={view.prompts[focusAsset.id]??''} onUsePrompt={value=>view.setPrompt(focusAsset.id,value)} onChanged={refreshAi} onConfigure={()=>navigate(appPath('ai-console'))}/>}
    onConfigureAi={()=>navigate(appPath('ai-console'))} error={cardError}/>:<p className="lc-empty">请先导入或选择一个素材。</p>
  return <>
    <LibraryCanvas revealWorkAsset={revealWorkAsset} workSets={workSets} openWorkSet={setReferenceSet} editWorkSet={setWorkSetIntent} organization={organization} organize={setOrganizationIntent} addFiles={()=>libraryControlsRef.current?.addFiles()} key={scope} scope={scope} authority={libraryProjection} assets={displayAssets} matches={discovery.matches} tags={tags} selected={selectedAsset} pick={setSelectedAsset} openFocus={openQuick}
      filtersActive={Boolean(searchOptions.color||searchOptions.example)} searchFolder={setSearchFolderId} searchControl={libraryProjection.state==='ready'&&<section aria-label="检索状态" className="gallery-notice library-search-status">
        <SearchFilters key={scope} options={searchOptions} setOptions={setSearchOptions} colors={hostedSearch.colors}/>
        <RetrievalSearchControls scope={{libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}} options={searchOptions} setOptions={setSearchOptions} selectedIds={bulkSelectedAssetIds} selectedAsset={bulkSelectedAssetIds.length===1?displayAssets.find(a=>a.id===bulkSelectedAssetIds[0])??selectedAsset:selectedAsset} reload={hostedSearch.reload}/>
        {hostedSearch.busy?<span role="status">正在查询或维护索引，已显示的结果保留…</span>:<span>{hostedSearch.lane==='lexical-only'?'文字检索':hostedSearch.lane==='image'?'以图找相似':hostedSearch.lane==='hybrid'?'文字＋画面含义':'中英文画面含义'} · 已显示 {hostedSearch.matches.length}/{hostedSearch.total} · 文字索引覆盖 {hostedSearch.index?.indexed??0}/{hostedSearch.index?.total??0}{hostedSearch.index?.state!=='ready'?' · 索引仍在准备':''}{hostedSearch.coverage?` · 图文覆盖 ${hostedSearch.coverage.indexed}/${hostedSearch.coverage.total}`:''}</span>}
        {hostedSearch.notice&&<p>{hostedSearch.notice}</p>}
        {hostedSearch.hasUpdates&&<p>素材内容已刷新，当前分页与顺序保留；重新查询可更新结果成员与排序。</p>}
        {hostedSearch.error&&<span role="alert">{hostedSearch.error}</span>}
        <button disabled={hostedSearch.busy} onClick={hostedSearch.reload}>重新查询</button>
        {hostedSearch.busy&&(searchOptions.mode!=='lexical'||searchOptions.example)&&<button onClick={hostedSearch.cancel}>取消图文查询</button>}
        {hostedSearch.hasMore&&<button disabled={hostedSearch.busy} onClick={()=>void hostedSearch.loadMore()}>加载更多搜索结果</button>}
        <details><summary>文字索引维护</summary><p>索引由当前素材与有效分析重建，不删除素材、人工内容或保存结果。</p><button disabled={hostedSearch.busy} onClick={()=>void hostedSearch.rebuild()}>重建文字索引</button></details>
      </section>}
      query={searchQuery} setQuery={setSearchQuery} tagQueries={activeTagSearchQueries} addTag={addActiveTagSearchQuery} removeTag={removeActiveTagSearchQuery} clearFilters={handleClearFilters}
      bulkIds={bulkSelectedAssetIds} toggleBulk={toggleBulkSelectedAssetId} clearBulk={clearBulkSelectedAssetIds} bulkAction={setBulkActionType} status={assetLoadStatus} error={assetLoadError} loaded={hasLoadedAssets} retry={refreshReadyLibrary}
      controls={<>{libraryError&&<div role="alert" className="lc-notice">{libraryError}<button onClick={()=>void refreshReadyLibrary()}>重新检查</button></div>}<ActiveLibraryControls ref={libraryControlsRef} projection={libraryProjection} onAuthorityWillChange={authorityWillChange} onAuthorityReady={refreshReadyLibrary} onAuthorityChangeComplete={()=>session.refresh('authority-change')} refreshProjection={refreshLibraryState}/></>}
      details={details} work={work} workMode={view.mode==='card'} showWork={()=>changeMode('card')} showAll={()=>view.setMode('library')} register={registerCardTrigger}/>
    {focused&&libraryProjection.state==='ready'&&createPortal(<LibraryFocus key={scope} asset={focused} items={focusItems} change={id=>{const a=displayAssets.find(a=>a.id===id);if(a)setQuickLookAsset(a)}} close={closeQuick} notebook={notebook} details={<LibraryDetails libraryScope={libraryProjection.state==='ready'?{libraryIdentity:libraryProjection.identity!,generation:libraryProjection.generation!}:undefined} organize={setOrganizationIntent} addWorkColor={color=>setWorkSetIntent({kind:'add',colors:[color]})} key={focused.id} asset={focused} focus editor={<button onClick={()=>{closeQuick();setSelectedAsset(focused)}}>在侧栏编辑与分析</button>}/>}/>,document.body)}
    {referenceSet&&workSets.catalog&&<WorkSetReferenceView key={scope+referenceSet} id={referenceSet} initialMediaAssetId={recoveredMediaAsset} model={workSets} assets={displayAssets} close={()=>{setReferenceSet(null);setRecoveredMediaAsset(null)}} preview={openQuick} locate={asset=>{setSelectedAsset(asset);view.setMode('library');setRevealWorkAsset(v=>v+1)}}/>}
    {workSetIntent&&!workSets.catalog&&<div className="work-intent-pending" role="status">{workSets.error||'正在读取工作集…'}<button onClick={()=>void workSets.refresh()}>重试</button><button onClick={()=>setWorkSetIntent(null)}>取消</button></div>}
    {workSetIntent&&workSets.catalog&&<WorkSetModal key={scope+JSON.stringify(workSetIntent)} model={workSets} intent={workSetIntent} assets={displayAssets} close={()=>setWorkSetIntent(null)}/>}
    {organizationIntent&&<OrganizationModal key={scope+JSON.stringify(organizationIntent)} model={organization} intent={organizationIntent} close={()=>setOrganizationIntent(null)}/>}
    <BulkActionModal bulkActionType={bulkActionType} bulkActionTags={bulkActionTags} setBulkActionTags={setBulkActionTags} setBulkActionType={setBulkActionType} executeBulkAction={executeBulkAction} busy={bulkBusy} error={bulkError}/>
  </>
}
