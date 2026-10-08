import { contextBridge, ipcRenderer } from 'electron'
import { createWorkspaceClient } from '../shared/client/workspace-client'

const client = createWorkspaceClient({
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => { ipcRenderer.on(channel, listener) },
  removeListener: (channel, listener) => { ipcRenderer.removeListener(channel, listener) }
})
contextBridge.exposeInMainWorld('damClient', client)
