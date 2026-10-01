import { contextBridge, ipcRenderer } from 'electron'
import type { AssetCardApi, AssetCardSnapshot } from '../shared/contracts/asset-card.contract'

// Keep this sandbox preload self-contained: sandbox require cannot load Rollup sibling chunks.
const CHANNEL_ASSET_CARD_ACTION = 'asset-card:action'
const CHANNEL_ASSET_CARD_INSPECT = 'asset-card:inspect'
const EVENT_ASSET_CARD_STATE = 'asset-card:state'

const api: AssetCardApi = {
  inspect: () => ipcRenderer.invoke(CHANNEL_ASSET_CARD_INSPECT),
  act: action => ipcRenderer.invoke(CHANNEL_ASSET_CARD_ACTION, action),
  onState: listener => {
    const receive = (_event: unknown, state: AssetCardSnapshot | null) => listener(state)
    ipcRenderer.on(EVENT_ASSET_CARD_STATE, receive)
    return () => ipcRenderer.removeListener(EVENT_ASSET_CARD_STATE, receive)
  }
}
contextBridge.exposeInMainWorld('assetCardAPI', Object.freeze(api))
contextBridge.exposeInMainWorld('tagDecisionsAPI',Object.freeze({prepare:(input:unknown)=>ipcRenderer.invoke('tag-decision:prepare',input),confirm:(receipt:string)=>ipcRenderer.invoke('tag-decision:confirm',receipt),discard:(receipt:string)=>ipcRenderer.invoke('tag-decision:discard',receipt)}))
contextBridge.exposeInMainWorld('tagExecutionAPI',Object.freeze({onChanged:(listener:(scope:unknown)=>void)=>{const receive=(_event:unknown,state:AssetCardSnapshot|null)=>{if(state)listener(state.context)};ipcRenderer.on('asset-card:state',receive);return()=>ipcRenderer.removeListener('asset-card:state',receive)},prepare:(input:unknown)=>ipcRenderer.invoke('tag-execution:prepare',input),discardReview:(receipt:string)=>ipcRenderer.invoke('tag-execution:discard-review',receipt),run:(receipt:string)=>ipcRenderer.invoke('tag-execution:run',receipt),inspect:(id:string)=>ipcRenderer.invoke('tag-execution:inspect',id),cancel:(id:string)=>ipcRenderer.invoke('tag-execution:cancel',id),read:(scope:unknown)=>ipcRenderer.invoke('tag-execution:read',scope)}))
contextBridge.exposeInMainWorld('independentTagsAPI', Object.freeze({
  prepare: (input: unknown) => ipcRenderer.invoke('independent-tags:prepare', input),
  confirm: (receipt: string) => ipcRenderer.invoke('independent-tags:confirm', receipt),
  read: (scope: unknown) => ipcRenderer.invoke('independent-tags:read', scope)
}))

contextBridge.exposeInMainWorld('visualAiAPI', Object.freeze({
    backends: () => ipcRenderer.invoke('visual-ai:backends'),
    prepare: (input: unknown) => ipcRenderer.invoke('visual-ai:prepare', input),
    discardReview:(receipt:string)=>ipcRenderer.invoke('visual-ai:discard-review',receipt),
    run: (receipt: string) => ipcRenderer.invoke('visual-ai:run', receipt),
    inspect: (id: string) => ipcRenderer.invoke('visual-ai:inspect', id),
    cancel: (id: string) => ipcRenderer.invoke('visual-ai:cancel', id),
    results: (input: unknown) => ipcRenderer.invoke('visual-ai:results', input),
    confirmTag: (input: unknown) => ipcRenderer.invoke('visual-ai:confirm-tag', input)
  }))

contextBridge.exposeInMainWorld('imageToolsAPI', Object.freeze({
  prepare: (input: unknown) => ipcRenderer.invoke('image-tools:prepare', input),
  save: (receipt: string) => ipcRenderer.invoke('image-tools:save', receipt),
  discard: (receipt: string) => ipcRenderer.invoke('image-tools:discard', receipt)
}))

contextBridge.exposeInMainWorld('tagBatchesAPI',Object.freeze({prepare:(input:unknown)=>ipcRenderer.invoke('tag-batch:prepare',input),run:(receipt:string)=>ipcRenderer.invoke('tag-batch:run',receipt),discard:(receipt:string)=>ipcRenderer.invoke('tag-batch:discard',receipt),inspect:(id:string)=>ipcRenderer.invoke('tag-batch:inspect',id),cancel:(id:string)=>ipcRenderer.invoke('tag-batch:cancel',id)}))

contextBridge.exposeInMainWorld('tagRecoveryAPI',Object.freeze({list:(input:unknown)=>ipcRenderer.invoke('tag-recovery:list',input),prepare:(input:unknown)=>ipcRenderer.invoke('tag-recovery:prepare',input),receipt:(input:unknown)=>ipcRenderer.invoke('tag-recovery:receipt',input)}))

contextBridge.exposeInMainWorld('backgroundAnalysisAPI',Object.freeze({read:(input:unknown)=>ipcRenderer.invoke('background-analysis:read',input),change:(input:unknown)=>ipcRenderer.invoke('background-analysis:change',input)}))
