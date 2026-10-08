import type {WorkScope,WorkSetWrite,WorkResult,WorkWindowControlState,WorkWindowControlInput,WorkWindowControlResult} from '../contracts/work-set.contract'
import type {WorkMediaScope,WorkMediaWrite,WorkMediaSnapshot,WorkHandoffRequest,WorkHandoffReceipt} from '../contracts/work-media.contract'
import {OCR_RUNTIME_CHANGED} from '../contracts/asset-ocr.contract'
import type { WorkspaceDraftApi, WorkspaceDraftInput, WorkspaceDraftScope } from '../contracts/workspace-draft.contract'
import type { TransitionReview } from '../contracts/workspace-transition.contract'
import {ORGANIZATION_COLORS,ORGANIZATION_READ,ORGANIZATION_WRITE,type OrganizationScope,type OrganizationWrite} from '../contracts/library-organization.contract'
import {NOTEBOOK_READ,NOTEBOOK_SAVE,type NotebookScope,type NotebookSaveRequest} from '../contracts/asset-notebook.contract'
import type { PrepareDownload } from '../contracts/managed-download.contract'
import type { WorkspaceTransport, ClientEvent } from './workspace-transport'
import type { AiBackendConfig } from '../types/ai-backend.types'
import type { FilePickerSnapshot } from '../contracts/file-selection.contract'
import { CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_DRAFT, EVENT_ASSET_CARD_CHANGED, EVENT_ASSET_CARD_RETURN, type AssetCardChangedEvent, type AssetCardOpenRequest, type AssetCardReturnEvent, type AssetCardDraftRequest } from '../contracts/asset-card.contract'
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
} from '../contracts/active-library.contract'
import { CHANNEL_SETTINGS_LOAD, CHANNEL_SETTINGS_SAVE } from '../contracts/settings.contract'
import type { SaveSettingsRequest } from '../contracts/settings.contract'
import {
  CHANNEL_AI_BACKEND_DELETE,
  CHANNEL_AI_BACKEND_HEALTH_CHECK,
  CHANNEL_AI_BACKEND_LIST,
  CHANNEL_AI_BACKEND_LIST_MODELS,
  CHANNEL_AI_BACKEND_SAVE
} from '../contracts/ai-backend.contract'
import type { AiBackendActionRequest, AiBackendDeleteRequest, AiBackendSaveRequest } from '../contracts/ai-backend.contract'
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
} from '../contracts/llama-runtime.contract'
import type { LlamaCreateInstallPlanRequest, LlamaServerControlRequest, LlamaStartInstallRequest } from '../contracts/llama-runtime.contract'
import {
  CHANNEL_OCR_CHECK_ENVIRONMENT,
  CHANNEL_OCR_INSTALL_EASYOCR,
  CHANNEL_OCR_CANCEL_INSTALL,
  CHANNEL_OCR_GET_INSTALL_LOG,
  CHANNEL_OCR_INSTALL_LOG_UPDATE
} from '../contracts/ocr-dependency.contract'
import {
  CHANNEL_DOCTOR_CLEAR_LAST_REPORT,
  CHANNEL_DOCTOR_GET_LAST_REPORT,
  CHANNEL_DOCTOR_LIST_CHECKS,
  CHANNEL_DOCTOR_REPAIR_CHECK,
  CHANNEL_DOCTOR_RUN_ALL,
  CHANNEL_DOCTOR_RUN_CHECK,
  CHANNEL_DOCTOR_RUN_CHECKS
} from '../contracts/doctor.contract'
import type { DoctorRepairCheckRequest, DoctorRunCheckRequest, DoctorRunRequest } from '../contracts/doctor.contract'
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
} from '../contracts/ai-runtime.contract'
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
} from '../contracts/ai-client.contract'
import type { AiRuntimeConfig } from '../types/ai-runtime.types'
import {
  CHANNEL_SETTINGS_MIGRATION_ANALYZE,
  CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN,
  CHANNEL_SETTINGS_MIGRATION_DRY_RUN,
  CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS
} from '../contracts/settings-migration.contract'
import type {
  SettingsMigrationAnalyzeRequest,
  SettingsMigrationCreatePlanRequest,
  SettingsMigrationDryRunRequest,
  SettingsMigrationListBackupsRequest
} from '../contracts/settings-migration.contract'
import {
  CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
  CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
  CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST
} from '../contracts/runtime-package.contract'
import type {
  RuntimePackageExecuteSelectionRequest,
  RuntimePackageGetExecutionStatusRequest
} from '../contracts/runtime-package.contract'
import { createModelLibraryWorkspacePreloadApi } from
  './model-library-workspace.client'
import { createExternalConnectedLibraryPreloadApi } from './external-connected-library.client'

// Named product operations shared by Desktop and Browser. The transport stays private.
export function createWorkspaceClient(transport: WorkspaceTransport) {
const connectedPreload=createExternalConnectedLibraryPreloadApi({invoke:(channel,request)=>transport.invoke(channel,request)})
return Object.freeze({
  transitions: {
    ready: (input: { draftWriterId: string }) => transport.invoke('workspace:ready', input),
    acknowledge: (request: { id: string; ok: boolean; transient: boolean }) => transport.invoke('workspace:flush-ack', request),
    pending: (): Promise<TransitionReview | null> => transport.invoke('workspace:transition-pending'),
    confirm: (id: string): Promise<{ changed: boolean }> => transport.invoke('workspace:transition-confirm', id),
    cancel: (id: string) => transport.invoke('workspace:transition-cancel', id),
    quit: () => transport.invoke('workspace:quit'),
    onFlush(listener: (request: { id: string; freeze: boolean }) => void) {
      const receive = (_event: unknown, request: { id: string; freeze: boolean }) => listener(request)
      transport.on('workspace:flush', receive)
      return () => transport.removeListener('workspace:flush', receive)
    },
    onState(listener: (state: { frozen: boolean }) => void) {
      const receive = (_event: unknown, state: { frozen: boolean }) => listener(state)
      transport.on('workspace:transition-state', receive)
      return () => transport.removeListener('workspace:transition-state', receive)
    },
    onReview(listener: () => void) {
      const receive = () => listener()
      transport.on('workspace:transition-review', receive)
      return () => transport.removeListener('workspace:transition-review', receive)
    }
  },
  drafts: {
    put: (input: WorkspaceDraftInput) => transport.invoke('drafts:put', input),
    remove: (scope: Parameters<WorkspaceDraftApi['remove']>[0]) => transport.invoke('drafts:remove', scope),
    list: () => transport.invoke('drafts:list'),
    recover: (input: Parameters<WorkspaceDraftApi['recover']>[0]) => transport.invoke('drafts:recover', input),
    discard: (input: Parameters<WorkspaceDraftApi['discard']>[0]) => transport.invoke('drafts:discard', input)
  } satisfies WorkspaceDraftApi,
  onDraftsChanged(listener: () => void) {
    const receive = () => listener()
    transport.on('drafts:changed', receive)
    return () => transport.removeListener('drafts:changed', receive)
  },
  files: {
    pending: (): Promise<FilePickerSnapshot | null> => transport.invoke('files:pending'),
    browse: (request: { session: string; entry?: string; path?: string }): Promise<FilePickerSnapshot> => transport.invoke('files:browse', request),
    createDirectory: (request: { session: string; name: string }): Promise<FilePickerSnapshot> => transport.invoke('files:createDirectory', request),
    confirm: (request: { session: string; entries: string[] }) => transport.invoke('files:confirm', request),
    cancel: (session: string) => transport.invoke('files:cancel', session),
    onRequested: (listener: () => void) => {
      transport.on('files:requested', listener)
      return () => transport.removeListener('files:requested', listener)
    }
  },
  mediaUrl: (reference: string) => transport.mediaUrl?.(reference) ?? reference,
  onReconcile: (listener: () => Promise<void>) => transport.onReconcile?.(listener) ?? (() => {}),
  connectionState: () => transport.connectionState?.() ?? {connected:true,reconciling:false},
  openBrowser: () => transport.invoke('app:open-browser'),
  capabilities: () => transport.invoke('app:capabilities'),
  onSettingsChanged: (listener: () => void) => {
    transport.on('settings:changed', listener)
    return () => transport.removeListener('settings:changed', listener)
  },
  onConnectedLibrariesChanged: (listener: () => void) => {
    transport.on('connected-library:changed', listener)
    return () => transport.removeListener('connected-library:changed', listener)
  },
  onWorkspaceChanged: (listener: (payload: unknown) => void) => {
    const receive = (_event: ClientEvent, payload: unknown) => listener(payload)
    transport.on('workspace:changed', receive)
    return () => transport.removeListener('workspace:changed', receive)
  },
  onNavigate: (listener: (request: { path: '/connected-libraries' }) => void) => {
    const receive = (_event: ClientEvent, request: { path: '/connected-libraries' }) => listener(request)
    transport.on('workspace:navigate', receive)
    return () => transport.removeListener('workspace:navigate', receive)
  },
  onConnectionChanged: (listener: (payload: { connected: boolean; reconciling?: boolean }) => void) => {
    const receive = (_event: ClientEvent, payload: { connected: boolean; reconciling?: boolean }) => listener(payload)
    transport.on('workspace:connection', receive)
    return () => transport.removeListener('workspace:connection', receive)
  },
  imageTools: {
    prepare: (input: unknown) => transport.invoke('image-tools:prepare', input),
    save: (receipt: string) => transport.invoke('image-tools:save', receipt),
    discard: (receipt: string) => transport.invoke('image-tools:discard', receipt),
    onSaved: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: ClientEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      transport.on('image-tools:saved', receive)
      return () => transport.removeListener('image-tools:saved', receive)
    }
  },
  libraryRecovery: {
    list: () => transport.invoke('library-recovery:list'),
    prepare: (input: { id: string; selectSource?: boolean }) => transport.invoke('library-recovery:prepare', input),
    run: (receipt: string) => transport.invoke('library-recovery:run', { receipt })
  },
  managedDownloads: {
    prepare: (input: PrepareDownload) => transport.invoke('download:prepare', input),
    run: (receipt: string) => transport.invoke('download:enqueue', receipt),
    list: () => transport.invoke('download:jobs'),
    cancel: (id: string) => transport.invoke('download:cancel', id),
    retry: (id: string) => transport.invoke('download:retry', id),
    onImported: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: ClientEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      transport.on('download:imported', receive)
      return () => transport.removeListener('download:imported', receive)
    }
  },
  buildIdentity:()=>transport.invoke('app:build-identity'),
  aiAcceptance:{prepare:(input:unknown)=>transport.invoke('ai-acceptance:prepare',input),confirm:(id:string)=>transport.invoke('ai-acceptance:confirm',id),status:(id:string)=>transport.invoke('ai-acceptance:status',id),cancel:(id:string)=>transport.invoke('ai-acceptance:cancel',id),discard:(id:string)=>transport.invoke('ai-acceptance:discard',id)},
  aiConnections:{activeLogins:()=>transport.invoke('ai-connection:active-logins'),prepareValidation:(id:string)=>transport.invoke('ai-connection:prepare-validation',id),confirmValidation:(receipt:string)=>transport.invoke('ai-connection:confirm-validation',receipt),discardValidation:(receipt:string)=>transport.invoke('ai-connection:discard-validation',receipt),credentialStatus:(id:string)=>transport.invoke('ai-connection:credential-status',id),setApiKey:(input:unknown)=>transport.invoke('ai-connection:set-api-key',input),migrateCredential:(input:unknown)=>transport.invoke('ai-connection:migrate-credential',input),clearCredential:(id:string)=>transport.invoke('ai-connection:clear-credential',id),login:(id:string)=>transport.invoke('ai-connection:login',id),loginStatus:(id:string)=>transport.invoke('ai-connection:login-status',id),currentLogin:(id:string)=>transport.invoke('ai-connection:current-login',id),authDiagnostic:(id:string)=>transport.invoke('ai-connection:auth-diagnostic',id),answerLogin:(input:unknown)=>transport.invoke('ai-connection:answer-login',input),cancelLogin:(id:string)=>transport.invoke('ai-connection:cancel-login',id),openAuthUrl:(input:unknown)=>transport.invoke('ai-connection:open-auth-url',input)},
  backgroundOcr:{read:(scope:unknown)=>transport.invoke('background-ocr:read',scope),prepare:(scope:unknown)=>transport.invoke('background-ocr:prepare',scope),confirm:(receipt:string)=>transport.invoke('background-ocr:confirm',receipt),discard:(receipt:string)=>transport.invoke('background-ocr:discard',receipt),revoke:(scope:unknown)=>transport.invoke('background-ocr:revoke',scope)},
  assetOcr: {
    status:()=>transport.invoke('asset-ocr:status'),
    configure:()=>transport.invoke('asset-ocr:configure'),
    deactivate:()=>transport.invoke('asset-ocr:deactivate'),
    read:(scope:unknown)=>transport.invoke('asset-ocr:read',scope),
    prepare:(input:unknown)=>transport.invoke('asset-ocr:prepare',input),
    run:(receipt:string)=>transport.invoke('asset-ocr:run',receipt),
    cancel:()=>transport.invoke('asset-ocr:cancel'),
    correct:(input:unknown)=>transport.invoke('asset-ocr:correct',input),
    onChanged:(listener:(scope:{libraryIdentity:string;generation:string;assetId:string})=>void)=>{const receive=(_e:ClientEvent,scope:any)=>listener(scope);transport.on('asset-ocr:changed',receive);return()=>transport.removeListener('asset-ocr:changed',receive)},
    onRuntimeChanged:(listener:()=>void)=>{const receive=()=>listener();transport.on(OCR_RUNTIME_CHANGED,receive);return()=>transport.removeListener(OCR_RUNTIME_CHANGED,receive)}
  },
  tagDecisions:{prepare:(input:unknown)=>transport.invoke('tag-decision:prepare',input),confirm:(receipt:string)=>transport.invoke('tag-decision:confirm',receipt),discard:(receipt:string)=>transport.invoke('tag-decision:discard',receipt)},
  backgroundAnalysis:{read:(input:unknown)=>transport.invoke('background-analysis:read',input),prepare:(input:unknown)=>transport.invoke('background-analysis:prepare',input),confirm:(receipt:string)=>transport.invoke('background-analysis:confirm',receipt),discard:(receipt:string)=>transport.invoke('background-analysis:discard',receipt),change:(input:unknown)=>transport.invoke('background-analysis:change',input),prepareExecution:(input:unknown)=>transport.invoke('background-analysis:prepare-execution',input),confirmExecution:(receipt:string)=>transport.invoke('background-analysis:confirm-execution',receipt),recover:(input:unknown)=>transport.invoke('background-analysis:recover',input)},
  basicAnalysis:{prepare:(input:unknown)=>transport.invoke('basic-analysis:prepare',input),run:(receipt:string)=>transport.invoke('basic-analysis:run',receipt),discard:(receipt:string)=>transport.invoke('basic-analysis:discard',receipt),inspect:(id:string)=>transport.invoke('basic-analysis:inspect',id),cancel:(id:string)=>transport.invoke('basic-analysis:cancel',id),captions:(scope:unknown)=>transport.invoke('basic-analysis:captions',scope),attempts:(scope:unknown)=>transport.invoke('basic-analysis:attempts',scope),recover:(input:unknown)=>transport.invoke('basic-analysis:recover',input)},
  tagRecovery:{list:(input:unknown)=>transport.invoke('tag-recovery:list',input),prepare:(input:unknown)=>transport.invoke('tag-recovery:prepare',input),receipt:(input:unknown)=>transport.invoke('tag-recovery:receipt',input)},
  tagBatches:{prepare:(input:unknown)=>transport.invoke('tag-batch:prepare',input),run:(receipt:string)=>transport.invoke('tag-batch:run',receipt),discard:(receipt:string)=>transport.invoke('tag-batch:discard',receipt),inspect:(id:string)=>transport.invoke('tag-batch:inspect',id),cancel:(id:string)=>transport.invoke('tag-batch:cancel',id)},
  tagExecution:{onChanged:(listener:(scope:unknown)=>void)=>{const receive=(_event:unknown,scope:unknown)=>listener(scope);transport.on('visual-ai:updated',receive);return()=>transport.removeListener('visual-ai:updated',receive)},prepare:(input:unknown)=>transport.invoke('tag-execution:prepare',input),discardReview:(receipt:string)=>transport.invoke('tag-execution:discard-review',receipt),run:(receipt:string)=>transport.invoke('tag-execution:run',receipt),inspect:(id:string)=>transport.invoke('tag-execution:inspect',id),cancel:(id:string)=>transport.invoke('tag-execution:cancel',id),read:(scope:unknown)=>transport.invoke('tag-execution:read',scope)},
  independentTags: {
    prepare: (input: unknown) => transport.invoke('independent-tags:prepare', input),
    confirm: (receipt: string) => transport.invoke('independent-tags:confirm', receipt),
    read: (scope: unknown) => transport.invoke('independent-tags:read', scope)
  },
  visualAi: {
    backends: () => transport.invoke('visual-ai:backends'),
    prepare: (input: unknown) => transport.invoke('visual-ai:prepare', input),
    discardReview:(receipt:string)=>transport.invoke('visual-ai:discard-review',receipt),
    run: (receipt: string) => transport.invoke('visual-ai:run', receipt),
    inspect: (id: string) => transport.invoke('visual-ai:inspect', id),
    cancel: (id: string) => transport.invoke('visual-ai:cancel', id),
    results: (input: unknown) => transport.invoke('visual-ai:results', input),
    confirmTag: (input: unknown) => transport.invoke('visual-ai:confirm-tag', input),
    onChanged: (listener: (scope: { libraryIdentity: string; generation: string; assetId: string }) => void) => {
      const receive = (_event: ClientEvent, scope: { libraryIdentity: string; generation: string; assetId: string }) => listener(scope)
      transport.on('visual-ai:updated', receive)
      return () => transport.removeListener('visual-ai:updated', receive)
    }
  },

  managedVision:{status:()=>transport.invoke('managed-vision:status'),configure:()=>transport.invoke('managed-vision:configure'),activate:()=>transport.invoke('managed-vision:activate'),deactivate:()=>transport.invoke('managed-vision:deactivate')},
  managedModels:{read:()=>transport.invoke('managed-models:read'),action:(input:import('../contracts/managed-model-library.contract').ManagedModelAction)=>transport.invoke('managed-models:action',input)},
  retrievalModels:{read:()=>transport.invoke('retrieval-models:read'),action:(input:import('../contracts/retrieval-workspace.contract').RetrievalModelAction)=>transport.invoke('retrieval-models:action',input)},
  aiResources:{read:()=>transport.invoke('ai-resources:read'),diagnostics:():Promise<{stages:import('../contracts/ai-diagnostics.contract').AiStageRecord[];recoveries:Array<Record<string,unknown>>}>=>transport.invoke('ai-resources:diagnostics'),releaseIdle:()=>transport.invoke('ai-resources:release-idle'),configure:(policy:{mode:'quiet'|'normal'|'accelerated';reserveFraction:number})=>transport.invoke('ai-resources:configure',policy)},

  assetCard: {
    open: (request: AssetCardOpenRequest) => transport.invoke(CHANNEL_ASSET_CARD_OPEN, request),
    updateDraft: (request: AssetCardDraftRequest) => transport.invoke(CHANNEL_ASSET_CARD_DRAFT, request),
    onChanged: (listener: (context: AssetCardChangedEvent) => void) => {
      const receive = (_event: ClientEvent, context: AssetCardChangedEvent) => listener(context)
      transport.on(EVENT_ASSET_CARD_CHANGED, receive)
      return () => transport.removeListener(EVENT_ASSET_CARD_CHANGED, receive)
    },
    onReturn: (listener: (context: AssetCardReturnEvent) => void) => {
      const receive = (_event: ClientEvent, context: AssetCardReturnEvent) => listener(context)
      transport.on(EVENT_ASSET_CARD_RETURN, receive)
      return () => transport.removeListener(EVENT_ASSET_CARD_RETURN, receive)
    }
  },
  ...connectedPreload,
  workSets:{
    listHandoffs:(scope:WorkMediaScope):Promise<WorkResult<WorkHandoffReceipt[]>>=>transport.invoke('work-files:list',scope),
    mediaStatus:(scope:WorkScope):Promise<WorkResult<{schemaVersion:number;sessionToken:string}>>=>transport.invoke('work-media:status',scope),
    mediaEnable:(input:WorkScope&{sessionToken:string;allowUpgrade:boolean;expectedSchemaVersion:number}):Promise<WorkResult<{schemaVersion:number;sessionToken:string}>>=>transport.invoke('work-media:enable',input),
    mediaRead:(scope:WorkMediaScope):Promise<WorkResult<WorkMediaSnapshot>>=>transport.invoke('work-media:read',scope),
    mediaWrite:(input:WorkMediaWrite):Promise<WorkResult<WorkMediaSnapshot>>=>transport.invoke('work-media:write',input),
    mediaCancel:():Promise<WorkResult<{message:string}>>=>transport.invoke('work-media:cancel',{}),
    fileHandoff:(input:WorkHandoffRequest):Promise<WorkResult<WorkHandoffReceipt>>=>transport.invoke('work-files:handoff',input),
    clearHandoff:(id:string):Promise<WorkResult<{message:string}>>=>transport.invoke('work-files:clear',{id,receiverFinished:true}),
    read:(scope:WorkScope)=>transport.invoke('work-sets:read',scope),
    write:(input:WorkSetWrite)=>transport.invoke('work-sets:write',input),
    windows:(scope:WorkScope):Promise<WorkResult<WorkWindowControlState[]>>=>transport.invoke('work-windows:list',scope),
    control:(input:WorkWindowControlInput):Promise<WorkResult<WorkWindowControlResult>>=>transport.invoke('work-windows:control',input),
    open:(input:WorkScope & {id:string;theme?:'light'|'dark'})=>transport.invoke('work-windows:open',input),
    restore:(scope:WorkScope & {theme?:'light'|'dark'})=>transport.invoke('work-windows:restore',scope),
    recover:()=>transport.invoke('work-windows:recover'),
    hideLibrary:()=>transport.invoke('work-windows:hide-main'),
    onChanged:(listener:()=>void)=>{const receive=()=>listener();transport.on('work-sets:changed',receive);return()=>transport.removeListener('work-sets:changed',receive)},
    onLocate:(listener:(value:WorkScope & {setId:string;assetId?:string})=>void)=>{const receive=(_event:unknown,value:any)=>listener(value);transport.on('work-sets:locate',receive);return()=>transport.removeListener('work-sets:locate',receive)}
  },
  library: {
    previewColors:(scope:OrganizationScope & {assetId:string})=>transport.invoke(ORGANIZATION_COLORS,scope),
    organizationRead:(scope:OrganizationScope)=>transport.invoke(ORGANIZATION_READ,scope),
    organizationWrite:(input:OrganizationWrite)=>transport.invoke(ORGANIZATION_WRITE,input),
    notebookRead:(scope:NotebookScope)=>transport.invoke(NOTEBOOK_READ,scope),
    notebookSave:(input:NotebookSaveRequest)=>transport.invoke(NOTEBOOK_SAVE,input),
    inspect: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_INSPECT); return result?.success ? result.value : result },
    createPrepare: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_CREATE_PREPARE); return result?.success ? result.value : result },
    createConfirm: async (receipt: string) => { const result = await transport.invoke(CHANNEL_LIBRARY_CREATE_CONFIRM, { receipt }); return result?.success ? result.value : result },
    open: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_OPEN); return result?.success ? result.value : result },
    close: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_CLOSE); return result?.success ? result.value : result },
    reopen: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_REOPEN); return result?.success ? result.value : result },
    addPrepare: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_ADD_PREPARE); return result?.success ? result.value : result },
    addDispatch: async (receipt: string) => { const result = await transport.invoke(CHANNEL_LIBRARY_ADD_DISPATCH, { receipt }); return result?.success ? result.value : result },
    addInspect: async (batchIdentity: string) => { const result = await transport.invoke(CHANNEL_LIBRARY_ADD_INSPECT, { batchIdentity }); return result?.success ? result.value : result },
    readPreview: async (assetId: string) => { const authority = await transport.invoke(CHANNEL_LIBRARY_INSPECT); const projection = authority?.success ? authority.value : null; const result = await transport.invoke(CHANNEL_LIBRARY_MEDIA_READ_PREVIEW, { assetId, libraryIdentity: projection?.identity, generation: projection?.generation }); return result?.success ? result.value : result },
    trashPrepare: async (request: { designAssetIdentity: string; expectedRevision: string }) => { const result = await transport.invoke(CHANNEL_LIBRARY_TRASH_PREPARE, request); return result?.success ? result.value : result },
    trashDispatch: async (command: unknown) => { const result = await transport.invoke(CHANNEL_LIBRARY_TRASH_DISPATCH, command); return result?.success ? result.value : result },
    trashInspect: async (assetId: string) => { const result = await transport.invoke(CHANNEL_LIBRARY_TRASH_INSPECT, { assetId }); return result?.success ? result.value : result },
    trashList: async () => { const result = await transport.invoke(CHANNEL_LIBRARY_TRASH_LIST); return result?.success ? result.value : result }
  },
  // Independent download history
  listDownloads: () => transport.invoke('download:list'),
  saveDownload: (task: any) => transport.invoke('download:save', task),
  clearDownloads: () => transport.invoke('download:clear'),
  enqueueDownload: (task: any) => transport.invoke('download:enqueue', task),
  retryDownload: (id: string) => transport.invoke('download:retry', id),

  // Assets IPC API
  searchAssetsPage: async (input: import('../contracts/asset-search.contract').AssetSearchRequest) => {
    const result = await transport.invoke('asset-search:query', input)
    if (!result?.success) throw Error(result?.code ?? 'ASSET_SEARCH_FAILED')
    return result.value as import('../contracts/asset-search.contract').AssetSearchPage
  },
  retrieval:{
    coverage:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope)=>transport.invoke('asset-retrieval:coverage',scope) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    start:(input:import('../contracts/retrieval-workspace.contract').RetrievalGenerationRequest)=>transport.invoke('asset-retrieval:start',input) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    pause:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope,id:string)=>transport.invoke('asset-retrieval:pause',{...scope,id}) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    resume:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope,id:string)=>transport.invoke('asset-retrieval:resume',{...scope,id}) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    rebuild:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope)=>transport.invoke('asset-retrieval:rebuild-index',scope) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    switchSpace:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope,id:string)=>transport.invoke('asset-retrieval:switch-space',{...scope,id}) as Promise<import('../contracts/retrieval-workspace.contract').RetrievalCoverage>,
    query:(input:import('../contracts/retrieval-workspace.contract').AssetSemanticSearchRequest)=>transport.invoke('asset-retrieval:query',input) as Promise<import('../contracts/retrieval-workspace.contract').AssetSemanticSearchPage>,
    cancel:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope,id:string)=>transport.invoke('asset-retrieval:cancel-query',{libraryIdentity:scope.libraryIdentity,generation:scope.generation,id}),
    selectFile:(scope:import('../contracts/retrieval-workspace.contract').RetrievalScope)=>transport.invoke('query-file:select',scope) as Promise<import('../contracts/retrieval-workspace.contract').QueryFileReview|null>,
    releaseFile:(grant:string)=>transport.invoke('query-file:release',grant),
  },
  readSearchAssets: async (input: {libraryIdentity:string;generation:string;ids:string[]}) => {
    const result=await transport.invoke('asset-search:read-assets',input)
    if(!result?.success)throw Error(result?.code??'ASSET_SEARCH_FAILED')
    return result.value as import('../contracts/active-library.contract').ActiveLibraryAssetProjection[]
  },
  searchIndexStatus: async () => {
    const result = await transport.invoke('asset-search:status')
    if (!result?.success) throw Error(result?.code ?? 'ASSET_SEARCH_FAILED')
    return result.value as import('../contracts/asset-search.contract').AssetSearchIndexStatus
  },
  rebuildSearchIndex: async () => {
    const result = await transport.invoke('asset-search:rebuild')
    if (!result?.success) throw Error(result?.code ?? 'ASSET_SEARCH_FAILED')
    return result.value as import('../contracts/asset-search.contract').AssetSearchIndexStatus
  },
  listAssets: async (filters?: any) => {
    const result = await transport.invoke('assets:list', filters)
    if (!result?.success) throw Error('素材列表暂时无法读取，请重新核对当前素材库。')
    return result.value.assets.map((asset: any) => ({
      id: asset.id,
      revision: asset.revision,
      title: asset.title,
      file_name: asset.fileName,
      file_path: '',
      thumbnail_path: transport.mediaUrl?.(`dam-preview://preview/${encodeURIComponent(result.value.identity)}/${encodeURIComponent(result.value.generation)}/${encodeURIComponent(asset.id)}`) ?? `dam-preview://preview/${encodeURIComponent(result.value.identity)}/${encodeURIComponent(result.value.generation)}/${encodeURIComponent(asset.id)}`,
      source_site_id: asset.sourceSiteId,
      source_site_name: asset.sourceSiteName,
      width: asset.width,
      height: asset.height,
      file_size: asset.fileSize,
      file_type: asset.fileType,
      ai_caption: asset.aiCaption,
      ai_caption_source: asset.aiCaptionSource ?? '',
      ai_caption_updated_at: asset.aiCaptionUpdatedAt ?? '',
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
  saveAsset: (asset: any, tags?: string[]) => transport.invoke('assets:save', { asset, tags }),
  deleteAsset: (_id: string) => Promise.resolve({ success: false, error: 'Legacy asset deletion is disabled for Active Library data.', code: 'LEGACY_DELETE_DISABLED' }),
  extractColorPalette: (filePath: string, textBoxes?: any[]) => transport.invoke('assets:extract-palette', { filePath, textBoxes }),
  triggerExtractSave: (assetId: string, filePath: string) => transport.invoke('assets:trigger-extract-save', { assetId, filePath }),

  // Listen for AI task completion and SQLite sync event
  onAiTaskSynced: (callback: (event: ClientEvent, data: AiTaskSyncedEvent) => void) => {
    transport.on(EVENT_AI_TASK_SYNCED, callback)
    return () => {
      transport.removeListener(EVENT_AI_TASK_SYNCED, callback)
    }
  },

  // Tags IPC API
  tagCreate: async (input: any) => { const result = await transport.invoke('tag:create', input); return result?.success ? { success: true, tag: result.value.tag } : result },
  tagUpdate: async (id: string, input: any, expected?: { name: string; type: string; color: string | null }) => { const result = await transport.invoke('tag:update', { id, input, ...(expected === undefined ? {} : { expected }) }); return result?.success ? { success: true, tag: result.value } : result },
  tagDelete: (id: string) => transport.invoke('tag:delete', id),
  tagMerge: (sourceTagId: string, targetTagId: string) => transport.invoke('tag:merge', { sourceTagId, targetTagId }),
  tagGet: async (id: string) => { const result = await transport.invoke('tag:get', id); return result?.success ? { success: true, tag: result.value } : result },
  tagList: async (filter?: any) => {
    const result = await transport.invoke('tag:list', filter)
    return result?.success ? { success: true, tags: result.value } : result
  },
  tagSearch: async (query: string) => { const result = await transport.invoke('tag:search', query); return result?.success ? { success: true, tags: result.value } : result },
  tagCreateAlias: (tagId: string, alias: string) => transport.invoke('tag:create-alias', { tagId, alias }),
  tagRemoveAlias: (tagId: string, alias: string) => transport.invoke('tag:remove-alias', { tagId, alias }),
  tagSetParent: (tagId: string, parentId: string | null, expectedParentId?: string | null) => transport.invoke('tag:set-parent', { tagId, parentId, ...(expectedParentId === undefined ? {} : { expectedParentId }) }),

  // Asset Tags IPC API
  assetTagAdd: async (assetId: string, tagId: string, options?: any) => { const result = await transport.invoke('asset-tag:add', { assetId, tagId, options }); return result?.success ? { success: true, relation: result.value } : result },
  assetTagRemove: async (assetId: string, tagId: string) => { const result = await transport.invoke('asset-tag:remove', { assetId, tagId }); return result?.success ? { success: true } : result },
  assetTagBatchAdd: (assetIds: string[], tagIds: string[], options?: any) => transport.invoke('asset-tag:batch-add', { assetIds, tagIds, options }),
  assetTagBatchRemove: (assetIds: string[], tagIds: string[]) => transport.invoke('asset-tag:batch-remove', { assetIds, tagIds }),
  assetTagReplace: (assetIds: string[], oldTagId: string, newTagId: string) => transport.invoke('asset-tag:replace', { assetIds, oldTagId, newTagId }),
  assetTagListByAsset: async (assetId: string) => {
    const result = await transport.invoke('asset-tag:list-by-asset', { assetId })
    return result?.success ? { success: true, relations: result.value } : result
  },
  assetTagConfirmAi: (assetTagId: string) => transport.invoke('asset-tag:confirm-ai', assetTagId),
  assetTagRejectAi: (assetTagId: string) => transport.invoke('asset-tag:reject-ai', assetTagId),

  // Tag Search IPC API
  tagSearchAssets: async (queries: string[]) => { const result = await transport.invoke('tag-search:assets', queries); return result?.success ? { success: true, assets: result.value } : result },
  tagSearchUntagged: async () => { const result = await transport.invoke('tag-search:untagged'); return result?.success ? { success: true, assets: result.value } : result },
  tagSearchAiPending: () => transport.invoke('tag-search:ai-pending'),

  // REST AI Client IPC API
  aiEnqueueTag: (assetId: string, filePath: string, priority?: number, modelsToRun?: EnqueueTagRequest['modelsToRun']) => transport.invoke(
    CHANNEL_AI_ENQUEUE_TAG,
    { assetId, filePath, priority, modelsToRun } satisfies EnqueueTagRequest
  ),
  aiProcessBatch: () => transport.invoke(CHANNEL_AI_PROCESS_BATCH),
  aiModelStatus: () => transport.invoke(CHANNEL_AI_MODEL_STATUS),
  aiModelUnload: () => transport.invoke(CHANNEL_AI_MODEL_UNLOAD),
  aiRoutingPreview: (filePath: string) => transport.invoke(
    CHANNEL_AI_ROUTING_PREVIEW,
    { filePath } satisfies RoutingPreviewRequest
  ),

  // Custom Category Overrides API
  assetsSaveCustomCategory: (assetId: string, category: string) => transport.invoke('assets:save-custom-category', { assetId, category }),
  assetsGetCustomCategory: (assetId: string) => transport.invoke('assets:get-custom-category', assetId),

  // Caption operations API
  updateAssetCaption: async (assetId: string, caption: string, expectedCaption?: string) => { const result = await transport.invoke('assets:update-caption', { assetId, caption, ...(expectedCaption === undefined ? {} : { expectedCaption }) }); return result?.success ? { success: true } : result },
  resetAssetCaptionEdited: async (assetId: string) => { const result = await transport.invoke('assets:reset-caption-edited', { assetId }); return result?.success ? { success: true } : result },

  // Settings operations API
  settingsLoad: () => transport.invoke(CHANNEL_SETTINGS_LOAD),
  settingsSave: (settings: SaveSettingsRequest, expected?: import('../contracts/settings.contract').SettingsExpected) => transport.invoke(CHANNEL_SETTINGS_SAVE, settings, expected),
  settingsSelectFolder: (request?: { defaultPath?: string }) => transport.invoke('settings:select-folder', request),
  modelLibraryWorkspace: createModelLibraryWorkspacePreloadApi({
    invoke: (channel, request) => transport.invoke(channel, request)
  }),
  aiBackendList: () => transport.invoke(CHANNEL_AI_BACKEND_LIST),
  aiBackendSave: (config: AiBackendSaveRequest, expected?: AiBackendConfig | null) => transport.invoke(CHANNEL_AI_BACKEND_SAVE, config, expected),
  aiBackendDelete: (request: AiBackendDeleteRequest, expected?: AiBackendConfig | null) => transport.invoke(CHANNEL_AI_BACKEND_DELETE, request, expected),
  aiBackendHealthCheck: (request: AiBackendActionRequest) => transport.invoke(CHANNEL_AI_BACKEND_HEALTH_CHECK, request),
  aiBackendListModels: (request: AiBackendActionRequest) => transport.invoke(CHANNEL_AI_BACKEND_LIST_MODELS, request),
  llamaRuntimeDetectHardware: () => transport.invoke(CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE),
  llamaRuntimeCreateInstallPlan: (request?: LlamaCreateInstallPlanRequest) => transport.invoke(CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN, request),
  llamaRuntimeStartInstall: (request: LlamaStartInstallRequest) => transport.invoke(CHANNEL_LLAMA_RUNTIME_START_INSTALL, request),
  llamaRuntimeCancelInstall: () => transport.invoke(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL),
  llamaRuntimeGetStatus: () => transport.invoke(CHANNEL_LLAMA_RUNTIME_GET_STATUS),
  llamaRuntimeStartServer: (request?: LlamaServerControlRequest) => transport.invoke(CHANNEL_LLAMA_RUNTIME_START_SERVER, request),
  llamaRuntimeStopServer: () => transport.invoke(CHANNEL_LLAMA_RUNTIME_STOP_SERVER),
  llamaRuntimeTestServer: (request?: LlamaServerControlRequest) => transport.invoke(CHANNEL_LLAMA_RUNTIME_TEST_SERVER, request),
  llamaRuntimeOpenInstallRoot: () => transport.invoke('llama-runtime:open-install-root'),
  llamaHealthCheck: (baseUrl?: string) => transport.invoke("llama-runtime:health-check", { baseUrl }),
  llamaRuntimeListLocalModels: () => transport.invoke('llama-runtime:list-local-models'),
  onLlamaRuntimeInstallProgress: (installId: string, callback: (event: any, data: any) => void) => {
    const channel = llamaRuntimeInstallProgressChannel(installId)
    transport.on(channel, callback)
    return () => {
      transport.removeListener(channel, callback)
    }
  },

  // OCR R3 dependency and dynamic pip install APIs
  ocrCheckEnvironment: () => transport.invoke(CHANNEL_OCR_CHECK_ENVIRONMENT),
  ocrInstallEasyOcr: () => transport.invoke(CHANNEL_OCR_INSTALL_EASYOCR),
  ocrInstallCompressedTensors: () => transport.invoke('ocr:install-compressed-tensors'),
  ocrCancelInstall: () => transport.invoke(CHANNEL_OCR_CANCEL_INSTALL),
  ocrGetInstallLog: (currentCount?: number) => transport.invoke(CHANNEL_OCR_GET_INSTALL_LOG),
  onOcrInstallLog: (callback: (event: any, message: string) => void) => {
    transport.on(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback)
    return () => {
      transport.removeListener(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback)
    }
  },

  // AI Worker IPC API
  aiWorkerRunPromptReverse: (params: { assetId: string; filePath: string; modelId: string; modelPath: string }) => transport.invoke('ai-worker:run-prompt-reverse', params),
  aiWorkerGetGpuStatus: () => transport.invoke('ai-worker:get-gpu-status'),
  aiWorkerClearGpuMemory: () => transport.invoke('ai-worker:clear-gpu-memory'),

  // Doctor IPC API
  doctor: {
    runAll: (request?: DoctorRunRequest) => transport.invoke(CHANNEL_DOCTOR_RUN_ALL, request),
    runChecks: (checkIds: string[], request?: Omit<DoctorRunRequest, 'checkIds'>) => transport.invoke(CHANNEL_DOCTOR_RUN_CHECKS, { ...request, checkIds }),
    runCheck: (checkId: string, request?: Omit<DoctorRunCheckRequest, 'checkId'>) => transport.invoke(CHANNEL_DOCTOR_RUN_CHECK, { ...request, checkId }),
    repairCheck: (checkId: string, request?: Omit<DoctorRepairCheckRequest, 'checkId'>) => transport.invoke(CHANNEL_DOCTOR_REPAIR_CHECK, { ...request, checkId }),
    getLastReport: () => transport.invoke(CHANNEL_DOCTOR_GET_LAST_REPORT),
    clearLastReport: () => transport.invoke(CHANNEL_DOCTOR_CLEAR_LAST_REPORT),
    listChecks: () => transport.invoke(CHANNEL_DOCTOR_LIST_CHECKS)
  },

  // AI Runtime IPC API
  aiRuntime: {
    listRuntimes: () => transport.invoke(CHANNEL_AI_RUNTIME_LIST_RUNTIMES),
    getRuntimeState: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE, { runtimeId }),
    getActiveRuntime: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME),
    getMacOSCapabilities: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES),
    getWindowsCapabilities: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES),
    getMacOSAiBranchStatus: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS),
    getWindowsAiBranchStatus: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS),
    getPythonMpsStatus: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS),
    getPythonCudaStatus: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS),
    probePythonMpsRuntime: () => transport.invoke(CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION),
    probePythonCudaRuntime: () => transport.invoke(CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION),
    getClipSiglipOnnxStatus: () => transport.invoke(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS),
    probeOnnxModelLoad: (request?: AiRuntimeOnnxModelLoadProbeRequest) => transport.invoke(CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD, request),
    probeOcrRealEvidence: () => transport.invoke(CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE),
    selectActiveRuntime: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, { runtimeId }),
    startRuntime: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_START_RUNTIME, { runtimeId }),
    stopRuntime: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_STOP_RUNTIME, { runtimeId }),
    restartRuntime: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, { runtimeId }),
    healthCheck: (runtimeId: string) => transport.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK, { runtimeId }),
    healthCheckAll: () => transport.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL),
    updateRuntimeConfig: (runtimeId: string, config: Partial<AiRuntimeConfig>) => transport.invoke(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, { runtimeId, config })
  },

  // Runtime Package IPC API
  runtimePackage: {
    selectLocalManifest: () => transport.invoke(CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST),
    executeSelection: (request: RuntimePackageExecuteSelectionRequest) => transport.invoke(
      CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
      request
    ),
    getExecutionStatus: (request: RuntimePackageGetExecutionStatusRequest) => transport.invoke(
      CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
      request
    )
  },

  // Settings Migration IPC API
  settingsMigration: {
    createPlan: (request?: SettingsMigrationCreatePlanRequest) => transport.invoke(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, request),
    dryRun: (request?: SettingsMigrationDryRunRequest) => transport.invoke(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, request),
    analyze: (request?: SettingsMigrationAnalyzeRequest) => transport.invoke(CHANNEL_SETTINGS_MIGRATION_ANALYZE, request),
    listBackups: (request?: SettingsMigrationListBackupsRequest) => transport.invoke(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, request)
  },

  // AI Model IPC API
  aiModelList: () => transport.invoke('ai-model:list'),
  aiModelDownload: (modelId: string) => transport.invoke('ai-model:download', { modelId }),
  aiModelCancelDownload: (modelId: string) => transport.invoke('ai-model:cancel-download', { modelId }),
  aiModelDelete: (modelId: string) => transport.invoke('ai-model:delete', { modelId }),
  aiModelVerifyCompatibility: (modelId: string) => transport.invoke('ai-model:verify-compatibility', { modelId }),
  onAiModelDownloadProgress: (modelId: string, callback: (event: any, data: any) => void) => {
    const channel = `ai-model:download-progress:${modelId}`
    transport.on(channel, callback)
    return () => {
      transport.removeListener(channel, callback)
    }
  },

  // Cooperative Model IPC API
  cooperativeModelList: () => transport.invoke("cooperative-model:list"),
  cooperativeModelDownload: (modelId: string) => transport.invoke("cooperative-model:download", { modelId }),
  cooperativeModelCancelDownload: (modelId: string) => transport.invoke("cooperative-model:cancel-download", { modelId }),
  cooperativeModelDelete: (modelId: string) => transport.invoke("cooperative-model:delete", { modelId }),
  onCooperativeModelDownloadProgress: (modelId: string, callback: (event: any, data: any) => void) => {
    const channel = "cooperative-model:download-progress:" + modelId
    transport.on(channel, callback)
    return () => {
      transport.removeListener(channel, callback)
    }
  },

  // macOS AI dependency installer
  macosAiInstallDeps: () => transport.invoke('macos-ai:install-deps'),

  // Path Governance APIs
  getAssetLibraryPathGovernanceReport: () => transport.invoke('assets:path-governance-report'),
  getDownloadPathPlan: (requestedFilename: string) => transport.invoke('downloads:get-path-plan', requestedFilename),
  applyPathMigration: (options?: { deleteLegacyFiles?: boolean }) => transport.invoke('assets:apply-path-migration', options),
  getPathMigrationReport: () => transport.invoke('assets:path-migration-report')
})

}

export type WorkspaceClient = ReturnType<typeof createWorkspaceClient>
