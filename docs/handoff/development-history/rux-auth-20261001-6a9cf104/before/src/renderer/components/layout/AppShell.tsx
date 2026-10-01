import {hasUnsavedOcrDrafts} from '../library/canvas/ocr-drafts'
import {useWorkSetNavigation} from '../../stores/work-set-navigation.store'
import {hasUnsavedLibraryNotes} from '../library/canvas/notebook-session'
import React, { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { WorkspaceEntrance } from '../ui/WorkspaceMotion'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import GlobalNavigationMenu from './GlobalNavigationMenu'
import WorkspaceRail from './WorkspaceRail'
import { DESKTOP_VIEWPORT_POLICY } from '../../../shared/desktop-viewport-policy'
import { APP_HOME_ROUTE, getAppTopbarTitle, shouldShowAppTopbar } from '../../../shared/workflows/app-navigation.workflow'
import { libraryViewScope, useLibraryViewStore } from '../../stores/library-view.store'
import { useAssetStore } from '../../stores/asset.store'
import type { AssetCardReturnEvent, AssetCardChangedEvent } from '../../../shared/contracts/asset-card.contract'

function AppShellContent() {
  const location = useLocation()
  const library = location.pathname === '/library'
  const nativeMac = /Electron/.test(navigator.userAgent) && /Mac/.test(navigator.platform)
  return <div className="workspace-shell" data-native-mac={nativeMac||undefined} data-library-workspace={library || undefined} data-settings-workspace={location.pathname === '/settings' || undefined} style={{ minWidth: library ? 0 : DESKTOP_VIEWPORT_POLICY.shell.minContentWidth, minHeight: DESKTOP_VIEWPORT_POLICY.shell.minContentHeight }}>
    {nativeMac&&<div className="native-window-drag" aria-hidden="true"/>}
    <WorkspaceRail />
    <div className="workspace-stage">
      {!library && shouldShowAppTopbar(location.pathname) && <header className="workspace-titlebar">
        <div><span className="workspace-titlebar-title">{getAppTopbarTitle(location.pathname)}</span><span className="workspace-titlebar-caption">Design Asset Manager</span></div>
        <span className="ui-meta mr-12">本地优先 · 创作素材工作台</span>
      </header>}
      {!library&&<GlobalNavigationMenu />}
      <main className="workspace-content">
        <section data-overlay-workspace="true" className={library ? 'workspace-page-library' : 'workspace-page'}><WorkspaceEntrance route={location.pathname}><Outlet /></WorkspaceEntrance></section>
      </main>
    </div>
  </div>
}

export default function AppShell() {
  useEffect(()=>{const protect=(event:BeforeUnloadEvent)=>{if(hasUnsavedLibraryNotes()||hasUnsavedOcrDrafts()){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect)},[])
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(()=>{const api=(window as any).electronAPI?.workSets;return api?.onLocate((request:any)=>{useWorkSetNavigation.getState().receive(request);navigate('/library')})},[navigate])
  useEffect(() => {
    const api = (window as any).electronAPI
    const stopDownload = api?.managedDownloads?.onImported((scope: { libraryIdentity: string; generation: string }) => {
      if (useLibraryViewStore.getState().scope === libraryViewScope(scope.libraryIdentity, scope.generation)) void Promise.all([useAssetStore.getState().loadAssets(), useAssetStore.getState().loadTags()])
    })
    const stopTools = api?.imageTools?.onSaved?.((scope: { libraryIdentity: string; generation: string }) => {
      if (useLibraryViewStore.getState().scope === libraryViewScope(scope.libraryIdentity, scope.generation)) void Promise.all([useAssetStore.getState().loadAssets(), useAssetStore.getState().loadTags()])
    })
    const stopOcr=api?.assetOcr?.onChanged?.((scope:{libraryIdentity:string;generation:string})=>{if(useLibraryViewStore.getState().scope===libraryViewScope(scope.libraryIdentity,scope.generation))void useAssetStore.getState().loadAssets()})
    const stopAi = api?.visualAi?.onChanged?.((scope: { libraryIdentity: string; generation: string; assetId:string }) => {
      if (useLibraryViewStore.getState().scope !== libraryViewScope(scope.libraryIdentity, scope.generation)) return
      const store=useAssetStore.getState()
      void Promise.all([store.loadAssets(),store.loadTags(),...(store.selectedAsset?.id===scope.assetId?[store.loadAssetTags(scope.assetId)]:[])])
    })
    const showDownloadReview = () => navigate('/downloads')
    window.addEventListener('managed-download-review', showDownloadReview)
    const stopChanges = api?.assetCard?.onChanged((event: AssetCardChangedEvent) => {
      const view = useLibraryViewStore.getState()
      if (view.scope !== libraryViewScope(event.libraryIdentity, event.generation)) return
      view.acceptDrafts(event.assetId, event)
      if (event.windowSelectionChanged) view.setDesktopAsset(event.assetId)
    })
    const stopReturn = api?.assetCard?.onReturn(async (context: AssetCardReturnEvent) => {
      try {
      const current = await api.library.inspect()
      if (current?.state !== 'ready' || current.identity !== context.libraryIdentity || current.generation !== context.generation) return
      const view = useLibraryViewStore.getState()
      view.setScope(libraryViewScope(context.libraryIdentity, context.generation))
      view.acceptDrafts(context.assetId, context)
      view.setDesktopAsset(null)
      view.setMode('focus')
      const asset = useAssetStore.getState().assets.find(item => item.id === context.assetId)
      if (asset) useAssetStore.getState().setSelectedAsset(asset)
      navigate(context.configureAi ? '/settings?section=ai' : '/library')
      } catch { /* Failed authority inspection must not apply stale window state. */ }
    })
    return () => { stopChanges?.(); stopReturn?.(); stopDownload?.(); stopOcr?.(); stopAi?.(); stopTools?.(); window.removeEventListener('managed-download-review', showDownloadReview) }
  }, [navigate])
  useEffect(() => {
    if (location.pathname === '/') navigate(APP_HOME_ROUTE.path, { replace: true })
  }, [location.pathname, navigate])
  return <MotionConfig reducedMotion="user"><AppShellContent /></MotionConfig>
}
