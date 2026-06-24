import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD,
  CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE,
  CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,
  CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_START_RUNTIME,
  CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG
} from '../src/shared/contracts/ai-runtime.contract'

const channels = {
  listRuntimes: CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  getRuntimeState: CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  getActiveRuntime: CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  getClipSiglipOnnxStatus: CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  getPythonMpsStatus: CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  getMacOSCapabilities: CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  getMacOSAiBranchStatus: CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
  getWindowsAiBranchStatus: CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
  probeOnnxModelLoad: CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD,
  probeOcrRealEvidence: CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE,
  probePythonMpsRuntime: CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,
  selectActiveRuntime: CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  startRuntime: CHANNEL_AI_RUNTIME_START_RUNTIME,
  stopRuntime: CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  restartRuntime: CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  healthCheck: CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  healthCheckAll: CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  updateRuntimeConfig: CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG
}
const channelConstants = [
  'CHANNEL_AI_RUNTIME_LIST_RUNTIMES',
  'CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE',
  'CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME',
  'CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS',
  'CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS',
  'CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES',
  'CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS',
  'CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS',
  'CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD',
  'CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE',
  'CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION',
  'CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME',
  'CHANNEL_AI_RUNTIME_START_RUNTIME',
  'CHANNEL_AI_RUNTIME_STOP_RUNTIME',
  'CHANNEL_AI_RUNTIME_RESTART_RUNTIME',
  'CHANNEL_AI_RUNTIME_HEALTH_CHECK',
  'CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL',
  'CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG'
]

assert.deepEqual(channels, {
  listRuntimes: 'aiRuntime:listRuntimes',
  getRuntimeState: 'aiRuntime:getRuntimeState',
  getActiveRuntime: 'aiRuntime:getActiveRuntime',
  getClipSiglipOnnxStatus: 'aiRuntime:getClipSiglipOnnxStatus',
  getPythonMpsStatus: 'aiRuntime:getPythonMpsStatus',
  getMacOSCapabilities: 'aiRuntime:getMacOSCapabilities',
  getMacOSAiBranchStatus: 'ai-runtime:get-macos-ai-branch-status',
  getWindowsAiBranchStatus: 'ai-runtime:get-windows-ai-branch-status',
  probeOnnxModelLoad: 'aiRuntime:probeOnnxModelLoad',
  probeOcrRealEvidence: 'aiRuntime:probeOcrRealEvidence',
  probePythonMpsRuntime: 'aiRuntime:probePythonMpsExecution',
  selectActiveRuntime: 'aiRuntime:selectActiveRuntime',
  startRuntime: 'aiRuntime:startRuntime',
  stopRuntime: 'aiRuntime:stopRuntime',
  restartRuntime: 'aiRuntime:restartRuntime',
  healthCheck: 'aiRuntime:healthCheck',
  healthCheckAll: 'aiRuntime:healthCheckAll',
  updateRuntimeConfig: 'aiRuntime:updateRuntimeConfig'
})

const contractSource = await fs.readFile('src/shared/contracts/ai-runtime.contract.ts', 'utf8')
const handlerSource = await fs.readFile('src/main/ipc/ai-runtime.ipc.ts', 'utf8')
const bootstrapSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-bootstrap.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const settingsSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')

assert.match(contractSource, /AiRuntimeIpcResponse/)
assert.doesNotMatch(contractSource, /interface\s+AiRuntimeState|interface\s+AiRuntimeConfig/)

assert.match(handlerSource, /registerAiRuntimeIpc/)
assert.match(handlerSource, /bootstrapAiRuntimeManager\(\{/)
assert.match(bootstrapSource, /new DisabledAiRuntimeProvider/)
assert.match(bootstrapSource, /new PythonWorkerRuntimeProvider/)
assert.match(bootstrapSource, /DESIGN_ASSET_MANAGER_STRICT_REAL_AI/)
assert.match(bootstrapSource, /interface PlatformAiBranchRuntimeProviderDescriptor/)
assert.match(bootstrapSource, /interface PlatformAiBranchRuntimeProviderProfileRule/)
assert.match(bootstrapSource, /const PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS: PlatformAiBranchRuntimeProviderDescriptor\[\]/)
assert.match(bootstrapSource, /id: 'macos-ai-branch-runtime'[\s\S]*macosAiBranch: createMacOSAiBranchRuntimeMetadata/)
assert.match(bootstrapSource, /id: 'windows-ai-branch-runtime'[\s\S]*windowsAiBranch: createWindowsAiBranchRuntimeMetadata/)
assert.match(bootstrapSource, /profileRules:[\s\S]*profileId: 'macos-apple-silicon'[\s\S]*profileId: 'macos-intel'[\s\S]*profileId: 'windows-nvidia-cuda'/)
assert.match(bootstrapSource, /function resolvePlatformAiBranchProviderProfileId/)
assert.match(bootstrapSource, /profileId: resolvePlatformAiBranchProviderProfileId\(descriptor, host\.platform, host\.arch\)/)
assert.match(bootstrapSource, /for \(const descriptor of PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS\)/)
assert.doesNotMatch(bootstrapSource, /const macosAiBranchMetadata = createMacOSAiBranchRuntimeMetadata/)
assert.doesNotMatch(bootstrapSource, /const windowsAiBranchMetadata = createWindowsAiBranchRuntimeMetadata/)
assert.doesNotMatch(bootstrapSource, /function resolveMacOSAiBranchProfileId|function resolveWindowsAiBranchProfileId/)
assert.match(bootstrapSource, /const PYTHON_WORKER_AUTOSTART_PLATFORMS = new Set<PlatformName>\(\['darwin', 'win32'\]\)/)
assert.match(bootstrapSource, /PYTHON_WORKER_AUTOSTART_PLATFORMS\.has\(host\.platform\)/)
assert.doesNotMatch(bootstrapSource, /host\.platform === 'darwin' \|\| host\.platform === 'win32'/)
assert.doesNotMatch(handlerSource, /PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS|PYTHON_WORKER_AUTOSTART_PLATFORMS/)
assert.doesNotMatch(`${handlerSource}\n${bootstrapSource}`, /new MockAiRuntimeProvider/)
assert.doesNotMatch(`${handlerSource}\n${bootstrapSource}`, /new MockAiRuntimeHttpClient/)
assert.doesNotMatch(`${handlerSource}\n${bootstrapSource}`, /new MockAiRuntimeProcessRunner/)
assert.match(handlerSource, /getMacOSCapabilities/)
assert.match(handlerSource, /getWindowsCapabilities/)
assert.match(handlerSource, /type PlatformAiCapabilitiesIpcDescriptor =/)
assert.match(handlerSource, /const PLATFORM_AI_CAPABILITIES_IPC_DESCRIPTORS: PlatformAiCapabilitiesIpcDescriptor\[\]/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,[\s\S]*getCapabilities: \(\) => aiClientService\.getMacOSCapabilities\(\)/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES,[\s\S]*getCapabilities: \(\) => aiClientService\.getWindowsCapabilities\(\)/)
assert.match(handlerSource, /function createPlatformAiCapabilitiesIpcHandler/)
assert.match(handlerSource, /for \(const descriptor of PLATFORM_AI_CAPABILITIES_IPC_DESCRIPTORS\)/)
assert.match(handlerSource, /ipcMain\.handle\(descriptor\.channel, createPlatformAiCapabilitiesIpcHandler\(descriptor\)\)/)
assert.doesNotMatch(handlerSource, /ipcMain\.handle\(CHANNEL_AI_RUNTIME_GET_(?:MACOS|WINDOWS)_CAPABILITIES/)
assert.match(handlerSource, /get-macos-ai-branch-status|getMacOSAiBranchStatus|CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS/)
assert.match(handlerSource, /get-windows-ai-branch-status|getWindowsAiBranchStatus|CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS/)
assert.match(handlerSource, /interface PlatformAiBranchStatusIpcDescriptor/)
assert.match(handlerSource, /const PLATFORM_AI_BRANCH_STATUS_IPC_DESCRIPTORS: PlatformAiBranchStatusIpcDescriptor\[\]/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,[\s\S]*platformBranch: 'macos'/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,[\s\S]*platformBranch: 'windows'/)
assert.match(handlerSource, /function createPlatformAiBranchStatusIpcHandler/)
assert.match(handlerSource, /for \(const descriptor of PLATFORM_AI_BRANCH_STATUS_IPC_DESCRIPTORS\)/)
assert.match(handlerSource, /ipcMain\.handle\(descriptor\.channel, createPlatformAiBranchStatusIpcHandler\(descriptor\)\)/)
assert.equal(handlerSource.match(/createPlatformAiBranchStatus\(\{/g)?.length, 1)
assert.doesNotMatch(handlerSource, /ipcMain\.handle\(CHANNEL_AI_RUNTIME_GET_(?:MACOS|WINDOWS)_AI_BRANCH_STATUS/)
assert.match(handlerSource, /getClipSiglipOnnxStatus/)
assert.match(handlerSource, /probeOnnxModelLoad/)
assert.match(handlerSource, /request\?\.modelFamily \?\? 'wd_tagger'/)
assert.match(preloadSource, /probeOnnxModelLoad:\s*\(request\?/)
assert.match(preloadSource, /probeOcrRealEvidence:\s*\(\)/)
assert.match(handlerSource, /createOcrRealEvidenceProbeService/)
assert.match(handlerSource, /ocrRealEvidenceProbeService\.probe\(\)/)
assert.match(handlerSource, /recordOcrRealEvidence\(probe\)/)
assert.match(handlerSource, /probePythonMpsExecution/)
assert.match(handlerSource, /probePythonCudaExecution/)
assert.match(handlerSource, /type PythonCompatibilityStatusIpcDescriptor =/)
assert.match(handlerSource, /const PYTHON_COMPATIBILITY_STATUS_IPC_DESCRIPTORS: PythonCompatibilityStatusIpcDescriptor\[\]/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,[\s\S]*getStatus: \(\) => aiClientService\.getPythonMpsStatus\(\)/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS,[\s\S]*getStatus: \(\) => aiClientService\.getPythonCudaStatus\(\)/)
assert.match(handlerSource, /function createPythonCompatibilityStatusIpcHandler/)
assert.match(handlerSource, /type PythonExecutionProbeIpcDescriptor =/)
assert.match(handlerSource, /const PYTHON_EXECUTION_PROBE_IPC_DESCRIPTORS: PythonExecutionProbeIpcDescriptor\[\]/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,[\s\S]*evidenceLane: 'python_mps',[\s\S]*probe: \(\) => aiClientService\.probePythonMpsExecution\(\)/)
assert.match(handlerSource, /channel: CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION,[\s\S]*evidenceLane: 'python_cuda',[\s\S]*probe: \(\) => aiClientService\.probePythonCudaExecution\(\)/)
assert.match(handlerSource, /function createPythonExecutionProbeIpcHandler/)
assert.match(handlerSource, /recordPythonExecutionEvidence\(\{ lane: descriptor\.evidenceLane, probe \}\)/)
assert.match(handlerSource, /for \(const descriptor of PYTHON_COMPATIBILITY_STATUS_IPC_DESCRIPTORS\)/)
assert.match(handlerSource, /for \(const descriptor of PYTHON_EXECUTION_PROBE_IPC_DESCRIPTORS\)/)
assert.doesNotMatch(handlerSource, /ipcMain\.handle\(CHANNEL_AI_RUNTIME_GET_PYTHON_(?:MPS|CUDA)_STATUS/)
assert.doesNotMatch(handlerSource, /ipcMain\.handle\(CHANNEL_AI_RUNTIME_PROBE_PYTHON_(?:MPS|CUDA)_EXECUTION/)
assert.match(handlerSource, /pythonExecutionEvidence: getFreshPythonExecutionEvidence\(\)/)
assert.match(handlerSource, /createOnnxModelLoadProbeArtifactReadiness/)
assert.doesNotMatch(handlerSource, /createPythonMpsExecutionProbeArtifactReadiness|createPythonCudaExecutionProbeArtifactReadiness/)
assert.match(handlerSource, /AiClientService/)
assert.match(handlerSource, /collectModelReadinessEvidence/)
assert.match(handlerSource, /createWorkerModelStatusArtifactReadiness/)
assert.match(handlerSource, /createLlamaRuntimeStatusArtifactReadiness/)
assert.match(handlerSource, /createLlamaMultimodalProbeArtifactReadiness/)
assert.match(handlerSource, /getFreshLlamaMultimodalProbe/)
assert.doesNotMatch(handlerSource, /child_process|execFile|runProcess|SettingsService|saveSettings|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
assert.doesNotMatch(handlerSource, /ai-worker-manager|ocr-dependency/i)
assert.doesNotMatch(handlerSource, /list-local-models|startInstall|startServer|detectHardware|createInstallPlan|fs\.|readdir|existsSync/)

assert.match(mainSource, /registerAiRuntimeIpc\(\)/)

assert.match(preloadSource, /aiRuntime:\s*{/)
for (const methodName of Object.keys(channels)) {
  assert.match(preloadSource, new RegExp(`${methodName}:\\s*\\(`))
}

const aiRuntimeBlock = preloadSource.slice(
  preloadSource.indexOf('aiRuntime: {'),
  preloadSource.indexOf('// Runtime Package IPC API')
)
assert.doesNotMatch(aiRuntimeBlock, /invoke:\s*\(|send:\s*\(|on:\s*\(/)
for (const channelConstant of channelConstants) {
  assert.ok(aiRuntimeBlock.includes(channelConstant) || preloadSource.includes(channelConstant))
}

assert.match(settingsSource, /<DoctorPanel \/>/)
