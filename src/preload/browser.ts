import { contextBridge, ipcRenderer } from 'electron'

// Expose a restricted secure bridge to the external page
contextBridge.exposeInMainWorld('browserAPI', {
  downloadAsset: (asset: any) => {
    // Send safe IPC message to the main process
    ipcRenderer.send('browser:download-injected', asset)
  },
  requestFocus: () => {
    // Request native OS/Electron focus for the guest view
    ipcRenderer.send('browser:request-focus')
  },
  setHoveredAsset: (asset: any) => {
    // Notify the main process about the active hovered asset
    ipcRenderer.send('browser:set-hovered-asset', asset)
  }
})
