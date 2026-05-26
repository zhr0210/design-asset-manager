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
  deleteAsset: (id: string) => ipcRenderer.invoke('assets:delete', id)
})
