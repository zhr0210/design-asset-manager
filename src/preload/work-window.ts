import {contextBridge,ipcRenderer} from 'electron'
import type {WorkWindowApi,WorkWindowSnapshot} from '../shared/contracts/work-set.contract'
// Sandbox entry stays self-contained, with no general library/filesystem or process bridge.
const api:WorkWindowApi={inspect:()=>ipcRenderer.invoke('work-window:inspect'),act:request=>ipcRenderer.invoke('work-window:action',request),notebookRead:request=>ipcRenderer.invoke('work-window:note-read',request),notebookSave:request=>ipcRenderer.invoke('work-window:note-save',request),onState:listener=>{const receive=(_event:unknown,value:WorkWindowSnapshot|null)=>listener(value);ipcRenderer.on('work-window:state',receive);return()=>ipcRenderer.removeListener('work-window:state',receive)}}
contextBridge.exposeInMainWorld('workWindowAPI',Object.freeze(api))
