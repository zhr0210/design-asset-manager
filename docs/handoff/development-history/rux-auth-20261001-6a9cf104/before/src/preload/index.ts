import type {WorkScope,WorkSetWrite} from '../shared/contracts/work-set.contract'
import {ORGANIZATION_COLORS,ORGANIZATION_READ,ORGANIZATION_WRITE,type OrganizationScope,type OrganizationWrite} from '../shared/contracts/library-organization.contract'
import {NOTEBOOK_READ,NOTEBOOK_SAVE,type NotebookScope,type NotebookSaveRequest} from '../shared/contracts/asset-notebook.contract'
import type { PrepareDownload } from '../shared/contracts/managed-download.contract'
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_DRAFT, EVENT_ASSET_CARD_CHANGED, EVENT_ASSET_CARD_RETURN, type AssetCardChangedEvent, type AssetCardOpenRequest, type AssetCardReturnEvent, type AssetCardDraftRequest } from '../shared/contracts/asset-card.contract'
import {
  CHANNEL_LIBRARY_ADD_DISPATCH,
  CHANNEL_LIBRARY_ADD_INSPECT,
  CHANNEL_LIBRARY_ADD_PREPARE,
  CHANNEL_LIBRARY_CLOSE,
  CHANNEL_LIBRARY_CREATE_CONFIRM,
  CHANNEL_LIBRARY_CREATE_PREPARE,
  CHANNEL_LIBRARY_INSPECT,
  CHANNEL_LIBRARY_MEDIA_READ_PREVIEW,
  CHANNEL_LIBRARY_OPEN,
  CHANNEL_LIBRARY_REOPEN,
  CHANNEL_LIBRARY_TRASH_DISPATCH,
  CHANNEL_LIBRARY_TRASH_INSPECT,
  CHANNEL_LIBRARY_TRASH_LIST,
  CHANNEL_LIBRARY_TRASH_PREPARE
} from '../shared/contracts/active-library.contract'
import { CHANNEL_SETTINGS_LOAD, CHANNEL_SETTINGS_SAVE } from '../shared/contracts/settings.contract'
import type { SaveSettingsRequest } from '../shared/contracts/settings.contract'
import {
  CHANNEL_AI_BACKEND_DELETE,
  CHANNEL_AI_BACKEND_HEALTH_CHECK,
  CHANNEL_AI_BACKEND_LIST,
  CHANNEL_AI_BACKEND_LIST_MODELS,
  CHANNEL_AI_BACKEND_SAVE
} from '../shared/contracts/ai-backend.contract'
import type { AiBackendActionRequest, AiBackendDeleteRequest, AiBackendSaveRequest } from '../shared/contracts/ai-backend.contract'
import {
  CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL,
  CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN,
  CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE,
  CHANNEL_LLAMA_RUNTIME_GET_STATUS,
  CHANNEL_LLAMA_RUNTIME_START_INSTALL,
  CHANNEL_LLAMA_RUNTIME_START_SERVER,
  CHANNEL_LLAMA_RUNTIME_STOP_SERVER,
  CHANNEL_LLAMA_RUNTIME_TEST_SERVER,
  llamaRuntimeInstallProgressChannel
} from '../shared/contracts/llama-runtime.contract'
import type { LlamaCreateInstallPlanRequest, LlamaServerControlRequest, LlamaStartInstallRequest } from '../shared/contracts/llama-runtime.contract'
import {
  CHANNEL_OCR_CHECK_ENVIRONMENT,
  CHANNEL_OCR_INSTALL_EASYOCR,
  CHANNEL_OCR_CANCEL_INSTALL,
  CHANNEL_OCR_GET_INSTALL_LOG,
  CHANNEL_OCR_INSTALL_LOG_UPDATE
} from '../shared/contracts/ocr-dependency.contract'
import {
  CHANNEL_DOCTOR_CLEAR_LAST_REPORT,
  CHANNEL_DOCTOR_GET_LAST_REPORT,
  CHANNEL_DOCTOR_LIST_CHECKS,
  CHANNEL_DOCTOR_REPAIR_CHECK,
  CHANNEL_DOCTOR_RUN_ALL,
  CHANNEL_DOCTOR_RUN_CHECK,
  CHANNEL_DOCTOR_RUN_CHECKS
} from '../shared/contracts/doctor.contract'
import type { DoctorRepairCheckRequest, DoctorRunCheckRequest, DoctorRunRequest } from '../shared/contracts/doctor.contract'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD,
  CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE,
  CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,
  CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION,
  CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_START_RUNTIME,
  CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG,
  type AiRuntimeOnnxModelLoadProbeRequest
} from '../shared/contracts/ai-runtime.contract'
import {
  CHANNEL_AI_ENQUEUE_TAG,
  CHANNEL_AI_MODEL_STATUS,
  CHANNEL_AI_MODEL_UNLOAD,
  CHANNEL_AI_PROCESS_BATCH,
  CHANNEL_AI_ROUTING_PREVIEW,
  EVENT_AI_TASK_SYNCED,
  type AiTaskSyncedEvent,
  type EnqueueTagRequest,
  type RoutingPreviewRequest
} from '../shared/contracts/ai-client.contract'
import type { AiRuntimeConfig } from '../shared/types/ai-runtime.types'
import {
  CHANNEL_SETTINGS_MIGRATION_ANALYZE,
  CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN,
  CHANNEL_SETTINGS_MIGRATION_DRY_RUN,
  CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS
} from '../shared/contracts/settings-migration.contract'
import type {
  SettingsMigrationAnalyzeRequest,
  SettingsMigrationCreatePlanRequest,
  SettingsMigrationDryRunRequest,
  SettingsMigrationListBackupsRequest
} from '../shared/contracts/settings-migration.contract'
import {
  CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
  CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
  CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST
} from '../shared/contracts/runtime-package.contract'
import type {
  RuntimePackageExecuteSelectionRequest,
  RuntimePackageGetExecutionStatusRequest
} from '../shared/contracts/runtime-package.contract'
import { createModelLibraryWorkspacePreloadApi } from
  './model-library-workspace.preload'
import { createExternalConnectedLibraryPreloadApi } from './external-connected-library.preload'

// Expose safe APIs to the React renderer
const connectedPreload=createExternalConnectedLibraryPreloadApi({invoke:(channel,request)=>ipcRenderer.invoke(channel,request)})
contextBridge.exposeInMainWorld('electronAPI', {
  imageTools: {
    prepare: (input: unknown) => ipcRenderer.invoke('image-tools:prepare', input),
    save: (receipt: string) => ipcRenderer.invoke('image-tools:save', receipt),
    discard: (receipt: string) => ipcRenderer.invoke('image-tools:discard', receipt),
    onSaved: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: IpcRendererEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      ipcRenderer.on('image-tools:saved', receive)
      return () => ipcRenderer.removeListener('image-tools:saved', receive)
    }
  },
  libraryRecovery: {
    list: () => ipcRenderer.invoke('library-recovery:list'),
    prepare: (input: { id: string; selectSource?: boolean }) => ipcRenderer.invoke('library-recovery:prepare', input),
    run: (receipt: string) => ipcRenderer.invoke('library-recovery:run', { receipt })
  },
  managedDownloads: {
    prepare: (input: PrepareDownload) => ipcRenderer.invoke('download:prepare', input),
    run: (receipt: string) => ipcRenderer.invoke('download:enqueue', receipt),
    list: () => ipcRenderer.invoke('download:jobs'),
    cancel: (id: string) => ipcRenderer.invoke('download:cancel', id),
    retry: (id: string) => ipcRenderer.invoke('download:retry', id),
    onImported: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: IpcRendererEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      ipcRenderer.on('download:imported', receive)
      return () => ipcRenderer.removeListener('download:imported', receive)
    }
  },
  aiAcceptance:{prepare:(input:unknown)=>ipcRenderer.invoke('ai-acceptance:prepare',input),confirm:(id:string)=>ipcRenderer.invoke('ai-acceptance:confirm',id),status:(id:string)=>ipcRenderer.invoke('ai-acceptance:status',id),cancel:(id:string)=>ipcRenderer.invoke('ai-acceptance:cancel',id),discard:(id:string)=>ipcRenderer.invoke('ai-acceptance:discard',id)},
  aiConnections:{prepareValidation:(id:string)=>ipcRenderer.invoke('ai-connection:prepare-validation',id),confirmValidation:(receipt:string)=>ipcRenderer.invoke('ai-connection:confirm-validation',receipt),discardValidation:(receipt:string)=>ipcRenderer.invoke('ai-connection:discard-validation',receipt),credentialStatus:(id:string)=>ipcRenderer.invoke('ai-connection:credential-status',id),setApiKey:(input:unknown)=>ipcRenderer.invoke('ai-connection:set-api-key',input),migrateCredential:(input:unknown)=>ipcRenderer.invoke('ai-connection:migrate-credential',input),clearCredential:(id:string)=>ipcRenderer.invoke('ai-connection:clear-credential',id),login:(id:string)=>ipcRenderer.invoke('ai-connection:login',id),loginStatus:(id:string)=>ipcRenderer.invoke('ai-connection:login-status',id),answerLogin:(input:unknown)=>ipcRenderer.invoke('ai-connection:answer-login',input),cancelLogin:(id:string)=>ipcRenderer.invoke('ai-connection:cancel-login',id),openAuthUrl:(input:unknown)=>ipcRenderer.invoke('ai-connection:open-auth-url',input)},
  backgroundOcr:{read:(scope:unknown)=>ipcRenderer.invoke('background-ocr:read',scope),prepare:(scope:unknown)=>ipcRenderer.invoke('background-ocr:prepare',scope),confirm:(receipt:string)=>ipcRenderer.invoke('background-ocr:confirm',receipt),discard:(receipt:string)=>ipcRenderer.invoke('background-ocr:discard',receipt),revoke:(scope:unknown)=>ipcRenderer.invoke('background-ocr:revoke',scope)},
  assetOcr: {
    status:()=>ipcRenderer.invoke('asset-ocr:status'),
    configure:()=>ipcRenderer.invoke('asset-ocr:configure'),
    read:(scope:unknown)=>ipcRenderer.invoke('asset-ocr:read',scope),
    prepare:(input:unknown)=>ipcRenderer.invoke('asset-ocr:prepare',input),
    run:(receipt:string)=>ipcRenderer.invoke('asset-ocr:run',receipt),
    cancel:()=>ipcRenderer.invoke('asset-ocr:cancel'),
    correct:(input:unknown)=>ipcRenderer.invoke('asset-ocr:correct',input),
    onChanged:(listener:(scope:{libraryIdentity:string;generation:string;assetId:string})=>void)=>{const receive=(_e:IpcRendererEvent,scope:any)=>listener(scope);ipcRenderer.on('asset-ocr:changed',receive);return()=>ipcRenderer.removeListener('asset-ocr:changed',receive)}
  },
  tagDecisions:{prepare:(input:unknown)=>ipcRenderer.invoke('tag-decision:prepare',input),confirm:(receipt:string)=>ipcRenderer.invoke('tag-decision:confirm',receipt),discard:(receipt:string)=>ipcRenderer.invoke('tag-decision:discard',receipt)},
  backgroundAnalysis:{read:(input:unknown)=>ipcRenderer.invoke('background-analysis:read',input),prepare:(input:unknown)=>ipcRenderer.invoke('background-analysis:prepare',input),confirm:(receipt:string)=>ipcRenderer.invoke('background-analysis:confirm',receipt),discard:(receipt:string)=>ipcRenderer.invoke('background-analysis:discard',receipt),change:(input:unknown)=>ipcRenderer.invoke('background-analysis:change',input)},
  tagRecovery:{list:(input:unknown)=>ipcRenderer.invoke('tag-recovery:list',input),prepare:(input:unknown)=>ipcRenderer.invoke('tag-recovery:prepare',input),receipt:(input:unknown)=>ipcRenderer.invoke('tag-recovery:receipt',input)},
  tagBatches:{prepare:(input:unknown)=>ipcRenderer.invoke('tag-batch:prepare',input),run:(receipt:string)=>ipcRenderer.invoke('tag-batch:run',receipt),discard:(receipt:string)=>ipcRenderer.invoke('tag-batch:discard',receipt),inspect:(id:string)=>ipcRenderer.invoke('tag-batch:inspect',id),cancel:(id:string)=>ipcRenderer.invoke('tag-batch:cancel',id)},
  tagExecution:{onChanged:(listener:(scope:unknown)=>void)=>{const receive=(_event:unknown,scope:unknown)=>listener(scope);ipcRenderer.on('visual-ai:updated',receive);return()=>ipcRenderer.removeListener('visual-ai:updated',receive)},prepare:(input:unknown)=>ipcRenderer.invoke('tag-execution:prepare',input),discardReview:(receipt:string)=>ipcRenderer.invoke('tag-execution:discard-review',receipt),run:(receipt:string)=>ipcRenderer.invoke('tag-execution:run',receipt),inspect:(id:string)=>ipcRenderer.invoke('tag-execution:inspect',id),cancel:(id:string)=>ipcRenderer.invoke('tag-execution:cancel',id),read:(scope:unknown)=>ipcRenderer.invoke('tag-execution:read',scope)},
  independentTags: {
    prepare: (input: unknown) => ipcRenderer.invoke('independent-tags:prepare', input),
    confirm: (receipt: string) => ipcRenderer.invoke('independent-tags:confirm', receipt),
    read: (scope: unknown) => ipcRenderer.invoke('independent-tags:read', scope)
  },
  visualAi: {
    backends: () => ipcRenderer.invoke('visual-ai:backends'),
    prepare: (input: unknown) => ipcRenderer.invoke('visual-ai:prepare', input),
    discardReview:(receipt:string)=>ipcRenderer.invoke('visual-ai:discard-review',receipt),
    run: (receipt: string) => ipcRenderer.invoke('visual-ai:run', receipt),
    inspect: (id: string) => ipcRenderer.invoke('visual-ai:inspect', id),
    cancel: (id: string) => ipcRenderer.invoke('visual-ai:cancel', id),
    results: (input: unknown) => ipcRenderer.invoke('visual-ai:results', input),
    confirmTag: (input: unknown) => ipcRenderer.invoke('visual-ai:confirm-tag', input),
    onChanged: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: IpcRendererEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      ipcRenderer.on('visual-ai:updated', receive)
      return () => ipcRenderer.removeListener('visual-ai:updated', receive)
    }
  },

  assetCard: {
    open: (request: AssetCardOpenRequest) => ipcRenderer.invoke(CHANNEL_ASSET_CARD_OPEN, request),
    updateDraft: (request: AssetCardDraftRequest) => ipcRenderer.invoke(CHANNEL_ASSET_CARD_DRAFT, request),
    onChanged: (listener: (context: AssetCardChangedEvent) => void) => {
      const receive = (_event: IpcRendererEvent, context: AssetCardChangedEvent) => listener(context)
      ipcRenderer.on(EVENT_ASSET_CARD_CHANGED, receive)
      return () => ipcRenderer.removeListener(EVENT_ASSET_CARD_CHANGED, receive)
    },
    onReturn: (listener: (context: AssetCardReturnEvent) => void) => {
      const receive = (_event: IpcRendererEvent, context: AssetCardReturnEvent) => listener(context)
      ipcRenderer.on(EVENT_ASSET_CARD_RETURN, receive)
      return () => ipcRenderer.removeListener(EVENT_ASSET_CARD_RETURN, receive)
    }
  },
  ...connectedPreload,
  workSets:{
    read:(scope:WorkScope)=>ipcRenderer.invoke('work-sets:read',scope),
    write:(input:WorkSetWrite)=>ipcRenderer.invoke('work-sets:write',input),
    open:(input:WorkScope & {id:string;theme?:'light'|'dark'})=>ipcRenderer.invoke('work-windows:open',input),
    restore:(scope:WorkScope & {theme?:'light'|'dark'})=>ipcRenderer.invoke('work-windows:restore',scope),
    recover:()=>ipcRenderer.invoke('work-windows:recover'),
    hideLibrary:()=>ipcRenderer.invoke('work-windows:hide-main'),
    onChanged:(listener:()=>void)=>{const receive=()=>listener();ipcRenderer.on('work-sets:changed',receive);return()=>ipcRenderer.removeListener('work-sets:changed',receive)},
    onLocate:(listener:(value:WorkScope & {setId:string;assetId?:string})=>void)=>{const receive=(_event:unknown,value:any)=>listener(value);ipcRenderer.on('work-sets:locate',receive);return()=>ipcRenderer.removeListener('work-sets:locate',receive)}
  },
  library: {
    previewColors:(scope:OrganizationScope & {assetId:string})=>ipcRenderer.invoke(ORGANIZATION_COLORS,scope),
    organizationRead:(scope:OrganizationScope)=>ipcRenderer.invoke(ORGANIZATION_READ,scope),
    organizationWrite:(input:OrganizationWrite)=>ipcRenderer.invoke(ORGANIZATION_WRITE,input),
    notebookRead:(scope:NotebookScope)=>ipcRenderer.invoke(NOTEBOOK_READ,scope),
    notebookSave:(input:NotebookSaveRequest)=>ipcRenderer.invoke(NOTEBOOK_SAVE,input),
    inspect: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_INSPECT); return result?.success ? result.value : result },
    createPrepare: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_CREATE_PREPARE); return result?.success ? result.value : result },
    createConfirm: async (receipt: string) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_CREATE_CONFIRM, { receipt }); return result?.success ? result.value : result },
    open: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_OPEN); return result?.success ? result.value : result },
    close: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_CLOSE); return result?.success ? result.value : result },
    reopen: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_REOPEN); return result?.success ? result.value : result },
    addPrepare: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_ADD_PREPARE); return result?.success ? result.value : result },
    addDispatch: async (receipt: string) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_ADD_DISPATCH, { receipt }); return result?.success ? result.value : result },
    addInspect: async (batchIdentity: string) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_ADD_INSPECT, { batchIdentity }); return result?.success ? result.value : result },
    readPreview: async (assetId: string) => { const authority = await ipcRenderer.invoke(CHANNEL_LIBRARY_INSPECT); const projection = authority?.success ? authority.value : null; const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_MEDIA_READ_PREVIEW, { assetId, libraryIdentity: projection?.identity, generation: projection?.generation }); return result?.success ? result.value : result },
    trashPrepare: async (request: { designAssetIdentity: string; expectedRevision: string }) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_TRASH_PREPARE, request); return result?.success ? result.value : result },
    trashDispatch: async (command: unknown) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_TRASH_DISPATCH, command); return result?.success ? result.value : result },
    trashInspect: async (assetId: string) => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_TRASH_INSPECT, { assetId }); return result?.success ? result.value : result },
    trashList: async () => { const result = await ipcRenderer.invoke(CHANNEL_LIBRARY_TRASH_LIST); return result?.success ? result.value : result }
  },
  // Independent download history
  listDownloads: () => ipcRenderer.invoke('download:list'),
  saveDownload: (task: any) => ipcRenderer.invoke('download:save', task),
  clearDownloads: () => ipcRenderer.invoke('download:clear'),
  enqueueDownload: (task: any) => ipcRenderer.invoke('download:enqueue', task),
  retryDownload: (id: string) => ipcRenderer.invoke('download:retry', id),

  // Assets IPC API
  listAssets: async (filters?: any) => {
    const result = await ipcRenderer.invoke('assets:list', filters)
    if (!result?.success) return []
    return result.value.assets.map((asset: any) => ({
      id: asset.id,
      revision: asset.revision,
      title: asset.title,
      file_name: asset.fileName,
      file_path: '',
      thumbnail_path: `dam-preview://preview/${encodeURIComponent(result.value.identity)}/${encodeURIComponent(result.value.generation)}/${encodeURIComponent(asset.id)}`,
      source_site_id: asset.sourceSiteId,
      source_site_name: asset.sourceSiteName,
      width: asset.width,
      height: asset.height,
      file_size: asset.fileSize,
      file_type: asset.fileType,
      ai_caption: asset.aiCaption,
      ai_ocr_text: asset.aiOcrText ?? '',
      ai_prompt: asset.visualAi?.prompt ?? '',
      visualAi: asset.visualAi,
      tagAnalysis: asset.tagAnalysis,
      ocr: asset.ocr,
      ai_caption_is_user_edited: asset.aiCaptionIsUserEdited ? 1 : 0,
      created_at: asset.createdAt,
      tags: asset.tags,
      tagAliases: asset.tagAliases ?? []
    }))
  },
  saveAsset: (asset: any, tags?: string[]) => ipcRenderer.invoke('assets:save', { asset, tags }),
  deleteAsset: (_id: string) => Promise.resolve({ success: false, error: 'Legacy asset deletion is disabled for Active Library data.', code: 'LEGACY_DELETE_DISABLED' }),
  extractColorPalette: (filePath: string, textBoxes?: any[]) => ipcRenderer.invoke('assets:extract-palette', { filePath, textBoxes }),
  triggerExtractSave: (assetId: string, filePath: string) => ipcRenderer.invoke('assets:trigger-extract-save', { assetId, filePath }),

  // Listen for AI task completion and SQLite sync event
  onAiTaskSynced: (callback: (event: IpcRendererEvent, data: AiTaskSyncedEvent) => void) => {
    ipcRenderer.on(EVENT_AI_TASK_SYNCED, callback)
    return () => {
      ipcRenderer.removeListener(EVENT_AI_TASK_SYNCED, callback)
    }
  },

  // Tags IPC API
  tagCreate: async (input: any) => { const result = await ipcRenderer.invoke('tag:create', input); return result?.success ? { success: true, tag: result.value.tag } : result },
  tagUpdate: async (id: string, input: any) => { const result = await ipcRenderer.invoke('tag:update', { id, input }); return result?.success ? { success: true, tag: result.value } : result },
  tagDelete: (id: string) => ipcRenderer.invoke('tag:delete', id),
  tagMerge: (sourceTagId: string, targetTagId: string) => ipcRenderer.invoke('tag:merge', { sourceTagId, targetTagId }),
  tagGet: async (id: string) => { const result = await ipcRenderer.invoke('tag:get', id); return result?.success ? { success: true, tag: result.value } : result },
  tagList: async (filter?: any) => {
    const result = await ipcRenderer.invoke('tag:list', filter)
    return result?.success ? { success: true, tags: result.value } : result
  },
  tagSearch: async (query: string) => { const result = await ipcRenderer.invoke('tag:search', query); return result?.success ? { success: true, tags: result.value } : result },
  tagCreateAlias: (tagId: string, alias: string) => ipcRenderer.invoke('tag:create-alias', { tagId, alias }),
  tagRemoveAlias: (tagId: string, alias: string) => ipcRenderer.invoke('tag:remove-alias', { tagId, alias }),
  tagSetParent: (tagId: string, parentId: string | null) => ipcRenderer.invoke('tag:set-parent', { tagId, parentId }),

  // Asset Tags IPC API
  assetTagAdd: async (assetId: string, tagId: string, options?: any) => { const result = await ipcRenderer.invoke('asset-tag:add', { assetId, tagId, options }); return result?.success ? { success: true, relation: result.value } : result },
  assetTagRemove: async (assetId: string, tagId: string) => { const result = await ipcRenderer.invoke('asset-tag:remove', { assetId, tagId }); return result?.success ? { success: true } : result },
  assetTagBatchAdd: (assetIds: string[], tagIds: string[], options?: any) => ipcRenderer.invoke('asset-tag:batch-add', { assetIds, tagIds, options }),
  assetTagBatchRemove: (assetIds: string[], tagIds: string[]) => ipcRenderer.invoke('asset-tag:batch-remove', { assetIds, tagIds }),
  assetTagReplace: (assetIds: string[], oldTagId: string, newTagId: string) => ipcRenderer.invoke('asset-tag:replace', { assetIds, oldTagId, newTagId }),
  assetTagListByAsset: async (assetId: string) => {
    const result = await ipcRenderer.invoke('asset-tag:list-by-asset', { assetId })
    return result?.success ? { success: true, relations: result.value } : result
  },
  assetTagConfirmAi: (assetTagId: string) => ipcRenderer.invoke('asset-tag:confirm-ai', assetTagId),
  assetTagRejectAi: (assetTagId: string) => ipcRenderer.invoke('asset-tag:reject-ai', assetTagId),

  // Tag Search IPC API
  tagSearchAssets: async (queries: string[]) => { const result = await ipcRenderer.invoke('tag-search:assets', queries); return result?.success ? { success: true, assets: result.value } : result },
  tagSearchUntagged: async () => { const result = await ipcRenderer.invoke('tag-search:untagged'); return result?.success ? { success: true, assets: result.value } : result },
  tagSearchAiPending: () => ipcRenderer.invoke('tag-search:ai-pending'),

  // REST AI Client IPC API
  aiEnqueueTag: (assetId: string, filePath: string, priority?: number, modelsToRun?: EnqueueTagRequest['modelsToRun']) => ipcRenderer.invoke(
    CHANNEL_AI_ENQUEUE_TAG,
    { assetId, filePath, priority, modelsToRun } satisfies EnqueueTagRequest
  ),
  aiProcessBatch: () => ipcRenderer.invoke(CHANNEL_AI_PROCESS_BATCH),
  aiModelStatus: () => ipcRenderer.invoke(CHANNEL_AI_MODEL_STATUS),
  aiModelUnload: () => ipcRenderer.invoke(CHANNEL_AI_MODEL_UNLOAD),
  aiRoutingPreview: (filePath: string) => ipcRenderer.invoke(
    CHANNEL_AI_ROUTING_PREVIEW,
    { filePath } satisfies RoutingPreviewRequest
  ),

  // Custom Category Overrides API
  assetsSaveCustomCategory: (assetId: string, category: string) => ipcRenderer.invoke('assets:save-custom-category', { assetId, category }),
  assetsGetCustomCategory: (assetId: string) => ipcRenderer.invoke('assets:get-custom-category', assetId),

  // Caption operations API
  updateAssetCaption: async (assetId: string, caption: string, expectedCaption?: string) => { const result = await ipcRenderer.invoke('assets:update-caption', { assetId, caption, ...(expectedCaption === undefined ? {} : { expectedCaption }) }); return result?.success ? { success: true } : result },
  resetAssetCaptionEdited: async (assetId: string) => { const result = await ipcRenderer.invoke('assets:reset-caption-edited', { assetId }); return result?.success ? { success: true } : result },

  // Settings operations API
  settingsLoad: () => ipcRenderer.invoke(CHANNEL_SETTINGS_LOAD),
  settingsSave: (settings: SaveSettingsRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_SAVE, settings),
  settingsSelectFolder: (request?: { defaultPath?: string }) => ipcRenderer.invoke('settings:select-folder', request),
  modelLibraryWorkspace: createModelLibraryWorkspacePreloadApi({
    invoke: (channel, request) => ipcRenderer.invoke(channel, request)
  }),
  aiBackendList: () => ipcRenderer.invoke(CHANNEL_AI_BACKEND_LIST),
  aiBackendSave: (config: AiBackendSaveRequest) => ipcRenderer.invoke(CHANNEL_AI_BACKEND_SAVE, config),
  aiBackendDelete: (request: AiBackendDeleteRequest) => ipcRenderer.invoke(CHANNEL_AI_BACKEND_DELETE, request),
  aiBackendHealthCheck: (request: AiBackendActionRequest) => ipcRenderer.invoke(CHANNEL_AI_BACKEND_HEALTH_CHECK, request),
  aiBackendListModels: (request: AiBackendActionRequest) => ipcRenderer.invoke(CHANNEL_AI_BACKEND_LIST_MODELS, request),
  llamaRuntimeDetectHardware: () => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE),
  llamaRuntimeCreateInstallPlan: (request?: LlamaCreateInstallPlanRequest) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN, request),
  llamaRuntimeStartInstall: (request: LlamaStartInstallRequest) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_INSTALL, request),
  llamaRuntimeCancelInstall: () => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL),
  llamaRuntimeGetStatus: () => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_GET_STATUS),
  llamaRuntimeStartServer: (request?: LlamaServerControlRequest) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_SERVER, request),
  llamaRuntimeStopServer: () => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_STOP_SERVER),
  llamaRuntimeTestServer: (request?: LlamaServerControlRequest) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_TEST_SERVER, request),
  llamaRuntimeOpenInstallRoot: () => ipcRenderer.invoke('llama-runtime:open-install-root'),
  llamaHealthCheck: (baseUrl?: string) => ipcRenderer.invoke("llama-runtime:health-check", { baseUrl }),
  llamaRuntimeListLocalModels: () => ipcRenderer.invoke('llama-runtime:list-local-models'),
  onLlamaRuntimeInstallProgress: (installId: string, callback: (event: any, data: any) => void) => {
    const channel = llamaRuntimeInstallProgressChannel(installId)
    ipcRenderer.on(channel, callback)
    return () => {
      ipcRenderer.removeListener(channel, callback)
    }
  },

  // OCR R3 dependency and dynamic pip install APIs
  ocrCheckEnvironment: () => ipcRenderer.invoke(CHANNEL_OCR_CHECK_ENVIRONMENT),
  ocrInstallEasyOcr: () => ipcRenderer.invoke(CHANNEL_OCR_INSTALL_EASYOCR),
  ocrInstallCompressedTensors: () => ipcRenderer.invoke('ocr:install-compressed-tensors'),
  ocrCancelInstall: () => ipcRenderer.invoke(CHANNEL_OCR_CANCEL_INSTALL),
  ocrGetInstallLog: (currentCount?: number) => ipcRenderer.invoke(CHANNEL_OCR_GET_INSTALL_LOG),
  onOcrInstallLog: (callback: (event: any, message: string) => void) => {
    ipcRenderer.on(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback)
    return () => {
      ipcRenderer.removeListener(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback)
    }
  },

  // AI Worker IPC API
  aiWorkerRunPromptReverse: (params: { assetId: string; filePath: string; modelId: string; modelPath: string }) => ipcRenderer.invoke('ai-worker:run-prompt-reverse', params),
  aiWorkerGetGpuStatus: () => ipcRenderer.invoke('ai-worker:get-gpu-status'),
  aiWorkerClearGpuMemory: () => ipcRenderer.invoke('ai-worker:clear-gpu-memory'),

  // Doctor IPC API
  doctor: {
    runAll: (request?: DoctorRunRequest) => ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_ALL, request),
    runChecks: (checkIds: string[], request?: Omit<DoctorRunRequest, 'checkIds'>) => ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_CHECKS, { ...request, checkIds }),
    runCheck: (checkId: string, request?: Omit<DoctorRunCheckRequest, 'checkId'>) => ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_CHECK, { ...request, checkId }),
    repairCheck: (checkId: string, request?: Omit<DoctorRepairCheckRequest, 'checkId'>) => ipcRenderer.invoke(CHANNEL_DOCTOR_REPAIR_CHECK, { ...request, checkId }),
    getLastReport: () => ipcRenderer.invoke(CHANNEL_DOCTOR_GET_LAST_REPORT),
    clearLastReport: () => ipcRenderer.invoke(CHANNEL_DOCTOR_CLEAR_LAST_REPORT),
    listChecks: () => ipcRenderer.invoke(CHANNEL_DOCTOR_LIST_CHECKS)
  },

  // AI Runtime IPC API
  aiRuntime: {
    listRuntimes: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_LIST_RUNTIMES),
    getRuntimeState: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE, { runtimeId }),
    getActiveRuntime: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME),
    getMacOSCapabilities: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES),
    getWindowsCapabilities: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES),
    getMacOSAiBranchStatus: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS),
    getWindowsAiBranchStatus: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS),
    getPythonMpsStatus: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS),
    getPythonCudaStatus: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS),
    probePythonMpsRuntime: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION),
    probePythonCudaRuntime: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION),
    getClipSiglipOnnxStatus: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS),
    probeOnnxModelLoad: (request?: AiRuntimeOnnxModelLoadProbeRequest) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD, request),
    probeOcrRealEvidence: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE),
    selectActiveRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, { runtimeId }),
    startRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_START_RUNTIME, { runtimeId }),
    stopRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_STOP_RUNTIME, { runtimeId }),
    restartRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, { runtimeId }),
    healthCheck: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK, { runtimeId }),
    healthCheckAll: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL),
    updateRuntimeConfig: (runtimeId: string, config: Partial<AiRuntimeConfig>) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, { runtimeId, config })
  },

  // Runtime Package IPC API
  runtimePackage: {
    selectLocalManifest: () => ipcRenderer.invoke(CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST),
    executeSelection: (request: RuntimePackageExecuteSelectionRequest) => ipcRenderer.invoke(
      CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
      request
    ),
    getExecutionStatus: (request: RuntimePackageGetExecutionStatusRequest) => ipcRenderer.invoke(
      CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
      request
    )
  },

  // Settings Migration IPC API
  settingsMigration: {
    createPlan: (request?: SettingsMigrationCreatePlanRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, request),
    dryRun: (request?: SettingsMigrationDryRunRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, request),
    analyze: (request?: SettingsMigrationAnalyzeRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_ANALYZE, request),
    listBackups: (request?: SettingsMigrationListBackupsRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, request)
  },

  // AI Model IPC API
  aiModelList: () => ipcRenderer.invoke('ai-model:list'),
  aiModelDownload: (modelId: string) => ipcRenderer.invoke('ai-model:download', { modelId }),
  aiModelCancelDownload: (modelId: string) => ipcRenderer.invoke('ai-model:cancel-download', { modelId }),
  aiModelDelete: (modelId: string) => ipcRenderer.invoke('ai-model:delete', { modelId }),
  aiModelVerifyCompatibility: (modelId: string) => ipcRenderer.invoke('ai-model:verify-compatibility', { modelId }),
  onAiModelDownloadProgress: (modelId: string, callback: (event: any, data: any) => void) => {
    const channel = `ai-model:download-progress:${modelId}`
    ipcRenderer.on(channel, callback)
    return () => {
      ipcRenderer.removeListener(channel, callback)
    }
  },

  // Cooperative Model IPC API
  cooperativeModelList: () => ipcRenderer.invoke("cooperative-model:list"),
  cooperativeModelDownload: (modelId: string) => ipcRenderer.invoke("cooperative-model:download", { modelId }),
  cooperativeModelCancelDownload: (modelId: string) => ipcRenderer.invoke("cooperative-model:cancel-download", { modelId }),
  cooperativeModelDelete: (modelId: string) => ipcRenderer.invoke("cooperative-model:delete", { modelId }),
  onCooperativeModelDownloadProgress: (modelId: string, callback: (event: any, data: any) => void) => {
    const channel = "cooperative-model:download-progress:" + modelId
    ipcRenderer.on(channel, callback)
    return () => {
      ipcRenderer.removeListener(channel, callback)
    }
  },

  // macOS AI dependency installer
  macosAiInstallDeps: () => ipcRenderer.invoke('macos-ai:install-deps'),

  // Path Governance APIs
  getAssetLibraryPathGovernanceReport: () => ipcRenderer.invoke('assets:path-governance-report'),
  getDownloadPathPlan: (requestedFilename: string) => ipcRenderer.invoke('downloads:get-path-plan', requestedFilename),
  applyPathMigration: (options?: { deleteLegacyFiles?: boolean }) => ipcRenderer.invoke('assets:apply-path-migration', options),
  getPathMigrationReport: () => ipcRenderer.invoke('assets:path-migration-report')
})
