import { contextBridge, ipcRenderer } from 'electron'

// Expose safe APIs to the React renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Sites IPC API
  listSites: () => ipcRenderer.invoke('sites:list'),
  saveSite: (site: any) => ipcRenderer.invoke('sites:save', site),
  deleteSite: (id: string) => ipcRenderer.invoke('sites:delete', id),
  startLoginSite: (id: string) => ipcRenderer.invoke('sites:login:start', id),
  completeLoginSite: (id: string) => ipcRenderer.invoke('sites:login:complete', id),

  // Search IPC API
  runSearch: (params: { siteId: string; keyword: string }) => ipcRenderer.invoke('search:run', params),

  // Download IPC API
  listDownloads: () => ipcRenderer.invoke('download:list'),
  saveDownload: (task: any) => ipcRenderer.invoke('download:save', task),
  clearDownloads: () => ipcRenderer.invoke('download:clear'),
  enqueueDownload: (task: any) => ipcRenderer.invoke('download:enqueue', task),
  retryDownload: (id: string) => ipcRenderer.invoke('download:retry', id),

  // Assets IPC API
  listAssets: (filters?: any) => ipcRenderer.invoke('assets:list', filters),
  saveAsset: (asset: any, tags?: string[]) => ipcRenderer.invoke('assets:save', { asset, tags }),
  deleteAsset: (id: string) => ipcRenderer.invoke('assets:delete', id),

  // Embedded Browser IPC API
  browserLoadUrl: (url: string, siteId: string) => ipcRenderer.invoke('browser:load-url', { url, siteId }),
  browserGoBack: () => ipcRenderer.invoke('browser:go-back'),
  browserGoForward: () => ipcRenderer.invoke('browser:go-forward'),
  browserReload: () => ipcRenderer.invoke('browser:reload'),
  browserStop: () => ipcRenderer.invoke('browser:stop'),
  browserResize: (bounds: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('browser:resize', bounds),
  browserHide: () => ipcRenderer.invoke('browser:hide'),
  browserShow: () => ipcRenderer.invoke('browser:show'),
  onBrowserStateChange: (callback: (event: any, state: any) => void) => {
    ipcRenderer.on('browser:state-change', callback)
    return () => {
      ipcRenderer.removeListener('browser:state-change', callback)
    }
  },

  // Extractor IPC API
  extractorScanPage: () => ipcRenderer.invoke('extractor:scan-current-page')
})
