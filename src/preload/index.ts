import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
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
  CHANNEL_AI_ANALYSIS_GENERATE,
  CHANNEL_AI_ENQUEUE_TAG,
  CHANNEL_AI_MODEL_STATUS,
  CHANNEL_AI_MODEL_UNLOAD,
  CHANNEL_AI_PROCESS_BATCH,
  CHANNEL_AI_PROMPT_GENERATE,
  CHANNEL_AI_ROUTING_PREVIEW,
  EVENT_AI_TASK_SYNCED,
  type AiTaskSyncedEvent,
  type AnalysisGenerateRequest,
  type EnqueueTagRequest,
  type PromptGenerateRequest,
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
  extractColorPalette: (filePath: string, textBoxes?: any[]) => ipcRenderer.invoke('assets:extract-palette', { filePath, textBoxes }),
  triggerExtractSave: (assetId: string, filePath: string) => ipcRenderer.invoke('assets:trigger-extract-save', { assetId, filePath }),

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

  // Preload download callback from injected site button click
  onInjectedDownloadTrigger: (callback: (event: any, item: any) => void) => {
    ipcRenderer.on('download:injected-trigger', callback)
    return () => {
      ipcRenderer.removeListener('download:injected-trigger', callback)
    }
  },

  // Listen for AI task completion and SQLite sync event
  onAiTaskSynced: (callback: (event: IpcRendererEvent, data: AiTaskSyncedEvent) => void) => {
    ipcRenderer.on(EVENT_AI_TASK_SYNCED, callback)
    return () => {
      ipcRenderer.removeListener(EVENT_AI_TASK_SYNCED, callback)
    }
  },

  // Extractor IPC API
  extractorScanPage: () => ipcRenderer.invoke('extractor:scan-current-page'),

  // Tags IPC API
  tagCreate: (input: any) => ipcRenderer.invoke('tag:create', input),
  tagUpdate: (id: string, input: any) => ipcRenderer.invoke('tag:update', { id, input }),
  tagDelete: (id: string) => ipcRenderer.invoke('tag:delete', id),
  tagMerge: (sourceTagId: string, targetTagId: string) => ipcRenderer.invoke('tag:merge', { sourceTagId, targetTagId }),
  tagGet: (id: string) => ipcRenderer.invoke('tag:get', id),
  tagList: (filter?: any) => ipcRenderer.invoke('tag:list', filter),
  tagSearch: (query: string) => ipcRenderer.invoke('tag:search', query),
  tagCreateAlias: (tagId: string, alias: string) => ipcRenderer.invoke('tag:create-alias', { tagId, alias }),
  tagRemoveAlias: (tagId: string, alias: string) => ipcRenderer.invoke('tag:remove-alias', { tagId, alias }),
  tagSetParent: (tagId: string, parentId: string | null) => ipcRenderer.invoke('tag:set-parent', { tagId, parentId }),

  // Asset Tags IPC API
  assetTagAdd: (assetId: string, tagId: string, options?: any) => ipcRenderer.invoke('asset-tag:add', { assetId, tagId, options }),
  assetTagRemove: (assetId: string, tagId: string) => ipcRenderer.invoke('asset-tag:remove', { assetId, tagId }),
  assetTagBatchAdd: (assetIds: string[], tagIds: string[], options?: any) => ipcRenderer.invoke('asset-tag:batch-add', { assetIds, tagIds, options }),
  assetTagBatchRemove: (assetIds: string[], tagIds: string[]) => ipcRenderer.invoke('asset-tag:batch-remove', { assetIds, tagIds }),
  assetTagReplace: (assetIds: string[], oldTagId: string, newTagId: string) => ipcRenderer.invoke('asset-tag:replace', { assetIds, oldTagId, newTagId }),
  assetTagListByAsset: (assetId: string) => ipcRenderer.invoke('asset-tag:list-by-asset', assetId),
  assetTagConfirmAi: (assetTagId: string) => ipcRenderer.invoke('asset-tag:confirm-ai', assetTagId),
  assetTagRejectAi: (assetTagId: string) => ipcRenderer.invoke('asset-tag:reject-ai', assetTagId),

  // Tag Search IPC API
  tagSearchAssets: (queries: string[]) => ipcRenderer.invoke('tag-search:assets', queries),
  tagSearchUntagged: () => ipcRenderer.invoke('tag-search:untagged'),
  tagSearchAiPending: () => ipcRenderer.invoke('tag-search:ai-pending'),

  // Mock AI predictions trigger
  mockAiGenerateSuggestions: (assetId: string) => ipcRenderer.invoke('mock-ai:generate-suggestions', assetId),

  // REST AI Client IPC API
  aiEnqueueTag: (assetId: string, filePath: string, priority?: number, modelsToRun?: EnqueueTagRequest['modelsToRun']) => ipcRenderer.invoke(
    CHANNEL_AI_ENQUEUE_TAG,
    { assetId, filePath, priority, modelsToRun } satisfies EnqueueTagRequest
  ),
  aiProcessBatch: () => ipcRenderer.invoke(CHANNEL_AI_PROCESS_BATCH),
  aiModelStatus: () => ipcRenderer.invoke(CHANNEL_AI_MODEL_STATUS),
  aiModelUnload: () => ipcRenderer.invoke(CHANNEL_AI_MODEL_UNLOAD),
  aiPromptGenerate: (assetId: string, filePath: string) => ipcRenderer.invoke(
    CHANNEL_AI_PROMPT_GENERATE,
    { assetId, filePath } satisfies PromptGenerateRequest
  ),
  aiAnalysisGenerate: (assetId: string, filePath: string) => ipcRenderer.invoke(
    CHANNEL_AI_ANALYSIS_GENERATE,
    { assetId, filePath } satisfies AnalysisGenerateRequest
  ),
  aiRoutingPreview: (filePath: string) => ipcRenderer.invoke(
    CHANNEL_AI_ROUTING_PREVIEW,
    { filePath } satisfies RoutingPreviewRequest
  ),

  // Custom Category Overrides API
  assetsSaveCustomCategory: (assetId: string, category: string) => ipcRenderer.invoke('assets:save-custom-category', { assetId, category }),
  assetsGetCustomCategory: (assetId: string) => ipcRenderer.invoke('assets:get-custom-category', assetId),

  // Caption operations API
  updateAssetCaption: (assetId: string, caption: string) => ipcRenderer.invoke('assets:update-caption', { assetId, caption }),
  resetAssetCaptionEdited: (assetId: string) => ipcRenderer.invoke('assets:reset-caption-edited', { assetId }),

  // Settings operations API
  settingsLoad: () => ipcRenderer.invoke(CHANNEL_SETTINGS_LOAD),
  settingsSave: (settings: SaveSettingsRequest) => ipcRenderer.invoke(CHANNEL_SETTINGS_SAVE, settings),
  settingsSelectFolder: (request?: { defaultPath?: string }) => ipcRenderer.invoke('settings:select-folder', request),
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
    selectActiveRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, { runtimeId }),
    startRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_START_RUNTIME, { runtimeId }),
    stopRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_STOP_RUNTIME, { runtimeId }),
    restartRuntime: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, { runtimeId }),
    healthCheck: (runtimeId: string) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK, { runtimeId }),
    healthCheckAll: () => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL),
    updateRuntimeConfig: (runtimeId: string, config: Partial<AiRuntimeConfig>) => ipcRenderer.invoke(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, { runtimeId, config })
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
