import type { MainIpcHandleRegistrar } from './ipc-registrar'

const DISABLED_CHANNELS = [
  'assets:save', 'assets:save-custom-category', 'assets:get-custom-category',
  'assets:extract-palette', 'assets:trigger-extract-save',
  'tag:delete', 'tag:merge',
  'asset-tag:confirm-ai', 'asset-tag:reject-ai',
  'tag-search:ai-pending',
  'ai:enqueue-tag', 'ai:process-batch', 'ai:model-status', 'ai:model-unload', 'ai:routing-preview',
  'ai-client:enqueue-tag', 'ai-client:process-batch', 'ai-client:model-status',
  'ai-client:model-unload', 'ai-client:routing-preview',
  'ai-model:list', 'ai-model:download', 'ai-model:cancel-download',
  'ai-model:delete', 'ai-model:verify-compatibility',
  'ai-worker:get-gpu-status', 'ai-worker:clear-gpu-memory',
  'macos-ai:install-deps', 'ocr:check-environment', 'ocr:install-easyocr',
  'ocr:install-compressed-tensors', 'ocr:cancel-install', 'ocr:get-install-log',
  'llama-runtime:detect-hardware', 'llama-runtime:create-install-plan',
  'llama-runtime:start-install', 'llama-runtime:cancel-install',
  'llama-runtime:get-status', 'llama-runtime:start-server',
  'llama-runtime:stop-server', 'llama-runtime:test-server',
  'llama-runtime:open-install-root', 'llama-runtime:list-local-models',
  'llama-runtime:health-check',
  'assets:path-migration-report', 'assets:path-governance-report', 'assets:apply-path-migration', 'downloads:get-path-plan',
  'doctor:runAll', 'doctor:runChecks', 'doctor:runCheck', 'doctor:repairCheck', 'doctor:getLastReport', 'doctor:clearLastReport', 'doctor:listChecks',
  'aiRuntime:listRuntimes', 'aiRuntime:getRuntimeState', 'aiRuntime:getActiveRuntime',
  'aiRuntime:getMacOSCapabilities', 'aiRuntime:getWindowsCapabilities', 'aiRuntime:getPythonMpsStatus', 'aiRuntime:getPythonCudaStatus',
  'aiRuntime:probePythonMpsExecution', 'aiRuntime:probePythonCudaExecution', 'aiRuntime:getClipSiglipOnnxStatus',
  'aiRuntime:probeOnnxModelLoad', 'aiRuntime:probeOcrRealEvidence', 'aiRuntime:selectActiveRuntime',
  'aiRuntime:startRuntime', 'aiRuntime:stopRuntime', 'aiRuntime:restartRuntime', 'aiRuntime:healthCheck',
  'aiRuntime:healthCheckAll', 'aiRuntime:updateRuntimeConfig', 'ai-runtime:get-macos-ai-branch-status', 'ai-runtime:get-windows-ai-branch-status',
  'runtime-package:select-local-manifest', 'runtime-package:execute-selection', 'runtime-package:get-execution-status',
  'settingsMigration:createPlan', 'settingsMigration:dryRun', 'settingsMigration:analyze', 'settingsMigration:listBackups',
  'cooperative-model:list', 'cooperative-model:download', 'cooperative-model:cancel-download', 'cooperative-model:delete'
] as const

export function registerDisabledAppIpc(handle: MainIpcHandleRegistrar): void {
  for (const channel of DISABLED_CHANNELS) {
    handle(channel, () => ({ success: false, error: 'This operation is unavailable while Active Library authority is active.', code: 'LIBRARY_FEATURE_DISABLED' }))
  }
}

export function disabledAppChannels(): readonly string[] {
  return DISABLED_CHANNELS
}
