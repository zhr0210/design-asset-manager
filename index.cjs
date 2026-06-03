"use strict";
const electron = require("electron");
const CHANNEL_SETTINGS_LOAD = "settings:load";
const CHANNEL_SETTINGS_SAVE = "settings:save";
const CHANNEL_AI_BACKEND_LIST = "ai-backend:list";
const CHANNEL_AI_BACKEND_SAVE = "ai-backend:save";
const CHANNEL_AI_BACKEND_DELETE = "ai-backend:delete";
const CHANNEL_AI_BACKEND_HEALTH_CHECK = "ai-backend:health-check";
const CHANNEL_AI_BACKEND_LIST_MODELS = "ai-backend:list-models";
const CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE = "llama-runtime:detect-hardware";
const CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN = "llama-runtime:create-install-plan";
const CHANNEL_LLAMA_RUNTIME_START_INSTALL = "llama-runtime:start-install";
const CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL = "llama-runtime:cancel-install";
const CHANNEL_LLAMA_RUNTIME_GET_STATUS = "llama-runtime:get-status";
const CHANNEL_LLAMA_RUNTIME_START_SERVER = "llama-runtime:start-server";
const CHANNEL_LLAMA_RUNTIME_STOP_SERVER = "llama-runtime:stop-server";
const CHANNEL_LLAMA_RUNTIME_TEST_SERVER = "llama-runtime:test-server";
const llamaRuntimeInstallProgressChannel = (installId) => `llama-runtime:install-progress:${installId}`;
const CHANNEL_OCR_CHECK_ENVIRONMENT = "ocr:check-environment";
const CHANNEL_OCR_INSTALL_EASYOCR = "ocr:install-easyocr";
const CHANNEL_OCR_CANCEL_INSTALL = "ocr:cancel-install";
const CHANNEL_OCR_GET_INSTALL_LOG = "ocr:get-install-log";
const CHANNEL_OCR_INSTALL_LOG_UPDATE = "ocr:install-log";
const CHANNEL_DOCTOR_RUN_ALL = "doctor:runAll";
const CHANNEL_DOCTOR_RUN_CHECKS = "doctor:runChecks";
const CHANNEL_DOCTOR_GET_LAST_REPORT = "doctor:getLastReport";
const CHANNEL_DOCTOR_CLEAR_LAST_REPORT = "doctor:clearLastReport";
const CHANNEL_DOCTOR_RUN_CHECK = "doctor:runCheck";
const CHANNEL_DOCTOR_LIST_CHECKS = "doctor:listChecks";
const CHANNEL_DOCTOR_REPAIR_CHECK = "doctor:repairCheck";
const CHANNEL_AI_RUNTIME_LIST_RUNTIMES = "aiRuntime:listRuntimes";
const CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE = "aiRuntime:getRuntimeState";
const CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME = "aiRuntime:getActiveRuntime";
const CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES = "aiRuntime:getMacOSCapabilities";
const CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS = "aiRuntime:getPythonMpsStatus";
const CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS = "aiRuntime:getClipSiglipOnnxStatus";
const CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME = "aiRuntime:selectActiveRuntime";
const CHANNEL_AI_RUNTIME_START_RUNTIME = "aiRuntime:startRuntime";
const CHANNEL_AI_RUNTIME_STOP_RUNTIME = "aiRuntime:stopRuntime";
const CHANNEL_AI_RUNTIME_RESTART_RUNTIME = "aiRuntime:restartRuntime";
const CHANNEL_AI_RUNTIME_HEALTH_CHECK = "aiRuntime:healthCheck";
const CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL = "aiRuntime:healthCheckAll";
const CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG = "aiRuntime:updateRuntimeConfig";
const CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN = "settingsMigration:createPlan";
const CHANNEL_SETTINGS_MIGRATION_DRY_RUN = "settingsMigration:dryRun";
const CHANNEL_SETTINGS_MIGRATION_ANALYZE = "settingsMigration:analyze";
const CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS = "settingsMigration:listBackups";
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Sites IPC API
  listSites: () => electron.ipcRenderer.invoke("sites:list"),
  saveSite: (site) => electron.ipcRenderer.invoke("sites:save", site),
  deleteSite: (id) => electron.ipcRenderer.invoke("sites:delete", id),
  startLoginSite: (id) => electron.ipcRenderer.invoke("sites:login:start", id),
  completeLoginSite: (id) => electron.ipcRenderer.invoke("sites:login:complete", id),
  // Search IPC API
  runSearch: (params) => electron.ipcRenderer.invoke("search:run", params),
  // Download IPC API
  listDownloads: () => electron.ipcRenderer.invoke("download:list"),
  saveDownload: (task) => electron.ipcRenderer.invoke("download:save", task),
  clearDownloads: () => electron.ipcRenderer.invoke("download:clear"),
  enqueueDownload: (task) => electron.ipcRenderer.invoke("download:enqueue", task),
  retryDownload: (id) => electron.ipcRenderer.invoke("download:retry", id),
  // Assets IPC API
  listAssets: (filters) => electron.ipcRenderer.invoke("assets:list", filters),
  saveAsset: (asset, tags) => electron.ipcRenderer.invoke("assets:save", { asset, tags }),
  deleteAsset: (id) => electron.ipcRenderer.invoke("assets:delete", id),
  extractColorPalette: (filePath, textBoxes) => electron.ipcRenderer.invoke("assets:extract-palette", { filePath, textBoxes }),
  triggerExtractSave: (assetId, filePath) => electron.ipcRenderer.invoke("assets:trigger-extract-save", { assetId, filePath }),
  // Embedded Browser IPC API
  browserLoadUrl: (url, siteId) => electron.ipcRenderer.invoke("browser:load-url", { url, siteId }),
  browserGoBack: () => electron.ipcRenderer.invoke("browser:go-back"),
  browserGoForward: () => electron.ipcRenderer.invoke("browser:go-forward"),
  browserReload: () => electron.ipcRenderer.invoke("browser:reload"),
  browserStop: () => electron.ipcRenderer.invoke("browser:stop"),
  browserResize: (bounds) => electron.ipcRenderer.invoke("browser:resize", bounds),
  browserHide: () => electron.ipcRenderer.invoke("browser:hide"),
  browserShow: () => electron.ipcRenderer.invoke("browser:show"),
  onBrowserStateChange: (callback) => {
    electron.ipcRenderer.on("browser:state-change", callback);
    return () => {
      electron.ipcRenderer.removeListener("browser:state-change", callback);
    };
  },
  // Preload download callback from injected site button click
  onInjectedDownloadTrigger: (callback) => {
    electron.ipcRenderer.on("download:injected-trigger", callback);
    return () => {
      electron.ipcRenderer.removeListener("download:injected-trigger", callback);
    };
  },
  // Listen for AI task completion and SQLite sync event
  onAiTaskSynced: (callback) => {
    electron.ipcRenderer.on("ai:task-synced", callback);
    return () => {
      electron.ipcRenderer.removeListener("ai:task-synced", callback);
    };
  },
  // Extractor IPC API
  extractorScanPage: () => electron.ipcRenderer.invoke("extractor:scan-current-page"),
  // Tags IPC API
  tagCreate: (input) => electron.ipcRenderer.invoke("tag:create", input),
  tagUpdate: (id, input) => electron.ipcRenderer.invoke("tag:update", { id, input }),
  tagDelete: (id) => electron.ipcRenderer.invoke("tag:delete", id),
  tagMerge: (sourceTagId, targetTagId) => electron.ipcRenderer.invoke("tag:merge", { sourceTagId, targetTagId }),
  tagGet: (id) => electron.ipcRenderer.invoke("tag:get", id),
  tagList: (filter) => electron.ipcRenderer.invoke("tag:list", filter),
  tagSearch: (query) => electron.ipcRenderer.invoke("tag:search", query),
  tagCreateAlias: (tagId, alias) => electron.ipcRenderer.invoke("tag:create-alias", { tagId, alias }),
  tagRemoveAlias: (tagId, alias) => electron.ipcRenderer.invoke("tag:remove-alias", { tagId, alias }),
  tagSetParent: (tagId, parentId) => electron.ipcRenderer.invoke("tag:set-parent", { tagId, parentId }),
  // Asset Tags IPC API
  assetTagAdd: (assetId, tagId, options) => electron.ipcRenderer.invoke("asset-tag:add", { assetId, tagId, options }),
  assetTagRemove: (assetId, tagId) => electron.ipcRenderer.invoke("asset-tag:remove", { assetId, tagId }),
  assetTagBatchAdd: (assetIds, tagIds, options) => electron.ipcRenderer.invoke("asset-tag:batch-add", { assetIds, tagIds, options }),
  assetTagBatchRemove: (assetIds, tagIds) => electron.ipcRenderer.invoke("asset-tag:batch-remove", { assetIds, tagIds }),
  assetTagReplace: (assetIds, oldTagId, newTagId) => electron.ipcRenderer.invoke("asset-tag:replace", { assetIds, oldTagId, newTagId }),
  assetTagListByAsset: (assetId) => electron.ipcRenderer.invoke("asset-tag:list-by-asset", assetId),
  assetTagConfirmAi: (assetTagId) => electron.ipcRenderer.invoke("asset-tag:confirm-ai", assetTagId),
  assetTagRejectAi: (assetTagId) => electron.ipcRenderer.invoke("asset-tag:reject-ai", assetTagId),
  // Tag Search IPC API
  tagSearchAssets: (queries) => electron.ipcRenderer.invoke("tag-search:assets", queries),
  tagSearchUntagged: () => electron.ipcRenderer.invoke("tag-search:untagged"),
  tagSearchAiPending: () => electron.ipcRenderer.invoke("tag-search:ai-pending"),
  // Mock AI predictions trigger
  mockAiGenerateSuggestions: (assetId) => electron.ipcRenderer.invoke("mock-ai:generate-suggestions", assetId),
  // REST AI Client IPC API
  aiEnqueueTag: (assetId, filePath, priority, modelsToRun) => electron.ipcRenderer.invoke("ai:enqueue-tag", { assetId, filePath, priority, modelsToRun }),
  aiProcessBatch: () => electron.ipcRenderer.invoke("ai:process-batch"),
  aiModelStatus: () => electron.ipcRenderer.invoke("ai:model-status"),
  aiModelUnload: () => electron.ipcRenderer.invoke("ai:model-unload"),
  aiPromptGenerate: (assetId, filePath) => electron.ipcRenderer.invoke("ai:prompt-generate", { assetId, filePath }),
  aiAnalysisGenerate: (assetId, filePath) => electron.ipcRenderer.invoke("ai:analysis-generate", { assetId, filePath }),
  aiRoutingPreview: (filePath) => electron.ipcRenderer.invoke("ai:routing-preview", { filePath }),
  // Custom Category Overrides API
  assetsSaveCustomCategory: (assetId, category) => electron.ipcRenderer.invoke("assets:save-custom-category", { assetId, category }),
  assetsGetCustomCategory: (assetId) => electron.ipcRenderer.invoke("assets:get-custom-category", assetId),
  // Caption operations API
  updateAssetCaption: (assetId, caption) => electron.ipcRenderer.invoke("assets:update-caption", { assetId, caption }),
  resetAssetCaptionEdited: (assetId) => electron.ipcRenderer.invoke("assets:reset-caption-edited", { assetId }),
  // Settings operations API
  settingsLoad: () => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_LOAD),
  settingsSave: (settings) => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_SAVE, settings),
  settingsSelectFolder: (request) => electron.ipcRenderer.invoke("settings:select-folder", request),
  aiBackendList: () => electron.ipcRenderer.invoke(CHANNEL_AI_BACKEND_LIST),
  aiBackendSave: (config) => electron.ipcRenderer.invoke(CHANNEL_AI_BACKEND_SAVE, config),
  aiBackendDelete: (request) => electron.ipcRenderer.invoke(CHANNEL_AI_BACKEND_DELETE, request),
  aiBackendHealthCheck: (request) => electron.ipcRenderer.invoke(CHANNEL_AI_BACKEND_HEALTH_CHECK, request),
  aiBackendListModels: (request) => electron.ipcRenderer.invoke(CHANNEL_AI_BACKEND_LIST_MODELS, request),
  llamaRuntimeDetectHardware: () => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE),
  llamaRuntimeCreateInstallPlan: (request) => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN, request),
  llamaRuntimeStartInstall: (request) => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_INSTALL, request),
  llamaRuntimeCancelInstall: () => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL),
  llamaRuntimeGetStatus: () => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_GET_STATUS),
  llamaRuntimeStartServer: (request) => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_SERVER, request),
  llamaRuntimeStopServer: () => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_STOP_SERVER),
  llamaRuntimeTestServer: (request) => electron.ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_TEST_SERVER, request),
  llamaRuntimeOpenInstallRoot: () => electron.ipcRenderer.invoke("llama-runtime:open-install-root"),
  llamaHealthCheck: (baseUrl) => electron.ipcRenderer.invoke("llama-runtime:health-check", { baseUrl }),
  llamaRuntimeListLocalModels: () => electron.ipcRenderer.invoke("llama-runtime:list-local-models"),
  onLlamaRuntimeInstallProgress: (installId, callback) => {
    const channel = llamaRuntimeInstallProgressChannel(installId);
    electron.ipcRenderer.on(channel, callback);
    return () => {
      electron.ipcRenderer.removeListener(channel, callback);
    };
  },
  // OCR R3 dependency and dynamic pip install APIs
  ocrCheckEnvironment: () => electron.ipcRenderer.invoke(CHANNEL_OCR_CHECK_ENVIRONMENT),
  ocrInstallEasyOcr: () => electron.ipcRenderer.invoke(CHANNEL_OCR_INSTALL_EASYOCR),
  ocrInstallCompressedTensors: () => electron.ipcRenderer.invoke("ocr:install-compressed-tensors"),
  ocrCancelInstall: () => electron.ipcRenderer.invoke(CHANNEL_OCR_CANCEL_INSTALL),
  ocrGetInstallLog: (currentCount) => electron.ipcRenderer.invoke(CHANNEL_OCR_GET_INSTALL_LOG),
  onOcrInstallLog: (callback) => {
    electron.ipcRenderer.on(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback);
    return () => {
      electron.ipcRenderer.removeListener(CHANNEL_OCR_INSTALL_LOG_UPDATE, callback);
    };
  },
  // AI Worker IPC API
  aiWorkerRunPromptReverse: (params) => electron.ipcRenderer.invoke("ai-worker:run-prompt-reverse", params),
  aiWorkerGetGpuStatus: () => electron.ipcRenderer.invoke("ai-worker:get-gpu-status"),
  aiWorkerClearGpuMemory: () => electron.ipcRenderer.invoke("ai-worker:clear-gpu-memory"),
  // Doctor IPC API
  doctor: {
    runAll: (request) => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_ALL, request),
    runChecks: (checkIds, request) => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_CHECKS, { ...request, checkIds }),
    runCheck: (checkId, request) => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_RUN_CHECK, { ...request, checkId }),
    repairCheck: (checkId, request) => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_REPAIR_CHECK, { ...request, checkId }),
    getLastReport: () => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_GET_LAST_REPORT),
    clearLastReport: () => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_CLEAR_LAST_REPORT),
    listChecks: () => electron.ipcRenderer.invoke(CHANNEL_DOCTOR_LIST_CHECKS)
  },
  // AI Runtime IPC API
  aiRuntime: {
    listRuntimes: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_LIST_RUNTIMES),
    getRuntimeState: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE, { runtimeId }),
    getActiveRuntime: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME),
    getMacOSCapabilities: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES),
    getPythonMpsStatus: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS),
    getClipSiglipOnnxStatus: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS),
    selectActiveRuntime: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, { runtimeId }),
    startRuntime: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_START_RUNTIME, { runtimeId }),
    stopRuntime: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_STOP_RUNTIME, { runtimeId }),
    restartRuntime: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, { runtimeId }),
    healthCheck: (runtimeId) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK, { runtimeId }),
    healthCheckAll: () => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL),
    updateRuntimeConfig: (runtimeId, config) => electron.ipcRenderer.invoke(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, { runtimeId, config })
  },
  // Settings Migration IPC API
  settingsMigration: {
    createPlan: (request) => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, request),
    dryRun: (request) => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, request),
    analyze: (request) => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_ANALYZE, request),
    listBackups: (request) => electron.ipcRenderer.invoke(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, request)
  },
  // AI Model IPC API
  aiModelList: () => electron.ipcRenderer.invoke("ai-model:list"),
  aiModelDownload: (modelId) => electron.ipcRenderer.invoke("ai-model:download", { modelId }),
  aiModelCancelDownload: (modelId) => electron.ipcRenderer.invoke("ai-model:cancel-download", { modelId }),
  aiModelDelete: (modelId) => electron.ipcRenderer.invoke("ai-model:delete", { modelId }),
  aiModelVerifyCompatibility: (modelId) => electron.ipcRenderer.invoke("ai-model:verify-compatibility", { modelId }),
  onAiModelDownloadProgress: (modelId, callback) => {
    const channel = `ai-model:download-progress:${modelId}`;
    electron.ipcRenderer.on(channel, callback);
    return () => {
      electron.ipcRenderer.removeListener(channel, callback);
    };
  },
  // Cooperative Model IPC API
  cooperativeModelList: () => electron.ipcRenderer.invoke("cooperative-model:list"),
  cooperativeModelDownload: (modelId) => electron.ipcRenderer.invoke("cooperative-model:download", { modelId }),
  cooperativeModelCancelDownload: (modelId) => electron.ipcRenderer.invoke("cooperative-model:cancel-download", { modelId }),
  cooperativeModelDelete: (modelId) => electron.ipcRenderer.invoke("cooperative-model:delete", { modelId }),
  onCooperativeModelDownloadProgress: (modelId, callback) => {
    const channel = "cooperative-model:download-progress:" + modelId;
    electron.ipcRenderer.on(channel, callback);
    return () => {
      electron.ipcRenderer.removeListener(channel, callback);
    };
  },
  // macOS AI dependency installer
  macosAiInstallDeps: () => electron.ipcRenderer.invoke("macos-ai:install-deps")
});
