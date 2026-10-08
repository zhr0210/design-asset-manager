import {contextBridge,ipcRenderer} from 'electron'
import type { NativeDraftBridge } from '../shared/contracts/workspace-draft.contract'

const nativeDrafts: NativeDraftBridge = {
  put: input => ipcRenderer.invoke('drafts:put', input),
  remove: scope => ipcRenderer.invoke('drafts:remove', scope),
  ready: input => ipcRenderer.invoke('workspace:ready', input),
  acknowledge: request => ipcRenderer.invoke('workspace:flush-ack', request),
  onFlush: listener => { const receive = (_event: unknown, value: { id: string; freeze: boolean }) => listener(value); ipcRenderer.on('workspace:flush', receive); return () => ipcRenderer.removeListener('workspace:flush', receive) },
  onState: listener => { const receive = (_event: unknown, value: { frozen: boolean }) => listener(value); ipcRenderer.on('workspace:transition-state', receive); return () => ipcRenderer.removeListener('workspace:transition-state', receive) }
}
contextBridge.exposeInMainWorld('nativeDraftsAPI', Object.freeze(nativeDrafts))
import type {WorkWindowApi,WorkWindowSnapshot} from '../shared/contracts/work-set.contract'
// Sandbox entry stays self-contained, with no general library/filesystem or process bridge.
const api:WorkWindowApi={mediaRead:request=>ipcRenderer.invoke("work-window:media-read",request),mediaWrite:request=>ipcRenderer.invoke("work-window:media-write",request),mediaCancel:request=>ipcRenderer.invoke("work-window:media-cancel",request),fileHandoff:request=>ipcRenderer.invoke("work-window:file-handoff",request),dragFile:request=>ipcRenderer.invoke("work-window:drag-file",request),inspect:()=>ipcRenderer.invoke('work-window:inspect'),act:request=>ipcRenderer.invoke('work-window:action',request),notebookRead:request=>ipcRenderer.invoke('work-window:note-read',request),notebookSave:request=>ipcRenderer.invoke('work-window:note-save',request),onState:listener=>{const receive=(_event:unknown,value:WorkWindowSnapshot|null)=>listener(value);ipcRenderer.on('work-window:state',receive);return()=>ipcRenderer.removeListener('work-window:state',receive)}}
contextBridge.exposeInMainWorld('workWindowAPI',Object.freeze(api))
