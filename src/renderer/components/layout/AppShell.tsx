import { getWorkspaceClient } from '../../workspace-client'
import {hasUnsavedOcrDrafts} from '../library/canvas/ocr-drafts'
import {useWorkSetNavigation} from '../../stores/work-set-navigation.store'
import {hasUnsavedLibraryNotes} from '../library/canvas/notebook-session'
import React, { useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { WorkspaceEntrance } from '../ui/WorkspaceMotion'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AuthActivity from './AuthActivity'
import FileSelectionOverlay from './FileSelectionOverlay'
import WorkspaceRecovery from './WorkspaceRecovery'
import WorkspaceConnection from './WorkspaceConnection'
import WorkspaceTransitions from './WorkspaceTransitions'
import { connectTransitionParticipant } from '../../workspace-transition-participant'
import { hasTransientLibraryNotes } from '../library/canvas/notebook-session'
import { hasTransientWorkspaceEdits } from '../../workspace-edit-guards'
import { flushLibraryDrafts } from '../../stores/library-view.store'
import { useSettingsStore } from '../../stores/settings.store'
import { useAssetStore } from '../../stores/asset.store'
import WorkspaceRail from './WorkspaceRail'
import { DESKTOP_VIEWPORT_POLICY } from '../../../shared/desktop-viewport-policy'
import { APP_HOME_ROUTE, appPath } from '../../../shared/workflows/app-navigation.workflow'
import { createElectronAssetWorkspaceSession } from '../../asset-workspace-session.adapter'
import { AssetWorkspaceSessionContext } from '../../asset-workspace-session.context'
import type { AssetCardReturnEvent, AssetCardChangedEvent } from '../../../shared/contracts/asset-card.contract'

function AppShellContent() {
  const location = useLocation()
  const library = location.pathname === '/library'
  const settings = location.pathname === '/settings' || location.pathname.startsWith('/settings/')
  const nativeMac = /Electron/.test(navigator.userAgent) && /Mac/.test(navigator.platform)
  return <div className="workspace-shell" data-native-mac={nativeMac||undefined} data-library-workspace={library || undefined} data-settings-workspace={settings || undefined} style={{ minWidth: 0, minHeight: DESKTOP_VIEWPORT_POLICY.shell.minContentHeight }}>
    {nativeMac&&<div className="native-window-drag" aria-hidden="true"/>}
    {!library&&!settings&&<WorkspaceRail />}
    <div className="workspace-stage">
      <AuthActivity />
      <FileSelectionOverlay />
      <WorkspaceRecovery />
      <WorkspaceConnection />
      <WorkspaceTransitions />
      <main className="workspace-content">
        <section data-overlay-workspace="true" className={library ? 'workspace-page-library' : 'workspace-page'}><WorkspaceEntrance route={settings ? '/settings' : location.pathname}><Outlet /></WorkspaceEntrance></section>
      </main>
    </div>
  </div>
}

export default function AppShell() {
  useEffect(() => connectTransitionParticipant(() => hasTransientLibraryNotes() || hasTransientWorkspaceEdits(), flushLibraryDrafts), [])
  useEffect(()=>{const protect=(event:BeforeUnloadEvent)=>{if(hasUnsavedLibraryNotes()||hasUnsavedOcrDrafts()){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect)},[])
  const location = useLocation()
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const [session] = useState(() => createElectronAssetWorkspaceSession(destination => navigateRef.current(destination === 'ai-console' ? appPath('ai-console') : '/library')))
  useEffect(() => () => session.disconnect(), [session])
  useEffect(()=>{const api=getWorkspaceClient()?.workSets;return api?.onLocate((request:any)=>{useWorkSetNavigation.getState().receive(request);navigate('/library')})},[navigate])
  useEffect(() => {
    const api = getWorkspaceClient()
    const stopReconcile = api?.onReconcile(async()=>{
      await Promise.all([session.refresh('ready-assets'),useSettingsStore.getState().loadSettings(true)])
      if(session.getSnapshot().error)throw Error('WORKSPACE_RECONCILIATION_FAILED')
      if(session.getSnapshot().projection.state==='ready') {
        const assets=useAssetStore.getState()
        if(assets.assetLoadStatus!=='ready'||assets.assetLoadError||assets.tagLoadError)throw Error('WORKSPACE_RECONCILIATION_FAILED')
      }
    })
    const stopNavigate = api?.onNavigate(request => navigate(request.path))
    const stopSettings = api?.onSettingsChanged(() => { void useSettingsStore.getState().loadSettings() })
    const stopWorkspace = api?.onWorkspaceChanged?.(() => { void session.refresh('ready-assets') })
    const stopConnection = api?.onConnectionChanged?.((state: { connected: boolean }) => { if (state.connected) void session.refresh('ready-assets') })
    const stopTools = api?.imageTools?.onSaved?.((scope: { libraryIdentity: string; generation: string }) => {
      void session.receive({ kind: 'tool-saved', scope })
    })
    const stopOcr=api?.assetOcr?.onChanged?.((scope:{libraryIdentity:string;generation:string})=>{void session.receive({kind:'ocr-changed',scope})})
    const stopAi = api?.visualAi?.onChanged?.((scope: { libraryIdentity: string; generation: string; assetId:string }) => {
      void session.receive({ kind: 'visual-ai-changed', scope })
    })
    const stopChanges = api?.assetCard?.onChanged((event: AssetCardChangedEvent) => {
      void session.receive({ kind: 'card-drafts', context: event })
    })
    const stopReturn = api?.assetCard?.onReturn((context: AssetCardReturnEvent) => session.receive({ kind: 'card-return', context }))
    return () => { stopReconcile?.(); stopNavigate?.(); stopSettings?.(); stopWorkspace?.(); stopConnection?.(); stopChanges?.(); stopReturn?.(); stopOcr?.(); stopAi?.(); stopTools?.() }
  }, [navigate, session])
  useEffect(() => {
    if (location.pathname === '/') navigate(APP_HOME_ROUTE.path, { replace: true })
  }, [location.pathname, navigate])
  return <AssetWorkspaceSessionContext.Provider value={session}><MotionConfig reducedMotion="user"><AppShellContent /></MotionConfig></AssetWorkspaceSessionContext.Provider>
}
