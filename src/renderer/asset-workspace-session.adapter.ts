import { createAssetWorkspaceSession } from './asset-workspace-session.internal'
import { getWorkspaceClient } from './workspace-client'
import { useAssetStore } from './stores/asset.store'
import { useLibraryViewStore } from './stores/library-view.store'
import { clearLibraryNotebookSession, hasUnsavedLibraryNotes } from './components/library/canvas/notebook-session'
import { clearOcrDrafts, hasUnsavedOcrDrafts } from './components/library/canvas/ocr-drafts'
import { clearWorkspaceDraftView } from './workspace-drafts'

export function createElectronAssetWorkspaceSession(navigate: (destination: 'library' | 'ai-console') => void) {
  return createAssetWorkspaceSession({
    inspect: () => {
      const api = getWorkspaceClient()?.library
      if (typeof api?.inspect !== 'function') throw Error('LIBRARY_BRIDGE_UNAVAILABLE')
      return api.inspect()
    },
    view: {
      getScope: () => useLibraryViewStore.getState().scope,
      setScope: scope => {
        if (scope !== useLibraryViewStore.getState().scope) {
          clearWorkspaceDraftView(); clearLibraryNotebookSession(); clearOcrDrafts(); useAssetStore.getState().resetForLibraryTransition()
        }
        useLibraryViewStore.getState().setScope(scope)
      },
      acceptDrafts: (assetId, patch) => useLibraryViewStore.getState().acceptDrafts(assetId, patch, true),
      setDesktopAsset: id => useLibraryViewStore.getState().setDesktopAsset(id),
      setMode: mode => useLibraryViewStore.getState().setMode(mode)
    },
    assets: {
      reset: () => useAssetStore.getState().resetForLibraryTransition(),
      loadAssets: () => useAssetStore.getState().loadAssets(),
      loadTags: () => useAssetStore.getState().loadTags(),
      loadAssetTags: id => useAssetStore.getState().loadAssetTags(id),
      selectedId: () => useAssetStore.getState().selectedAsset?.id,
      find: id => useAssetStore.getState().assets.find(asset => asset.id === id),
      select: asset => useAssetStore.getState().setSelectedAsset(asset)
    },
    drafts: {
      hasUnsavedNotes: hasUnsavedLibraryNotes, hasUnsavedOcr: hasUnsavedOcrDrafts,
      clearNotes: clearLibraryNotebookSession, clearOcr: clearOcrDrafts,
      confirmDiscard: () => window.confirm('当前有未保存的图片笔记或 OCR 修订。仍要关闭或切换素材库并放弃这些草稿吗？')
    },
    navigate
  })
}
