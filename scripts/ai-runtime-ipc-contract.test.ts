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
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const settingsSource = await fs.readFile('src/renderer/routes/Settings.tsx', 'utf8')

assert.match(contractSource, /AiRuntimeIpcResponse/)
assert.doesNotMatch(contractSource, /interface\s+AiRuntimeState|interface\s+AiRuntimeConfig/)

assert.match(handlerSource, /registerAiRuntimeIpc/)
assert.match(handlerSource, /new DisabledAiRuntimeProvider/)
assert.match(handlerSource, /new PythonWorkerRuntimeProvider/)
assert.match(handlerSource, /DESIGN_ASSET_MANAGER_STRICT_REAL_AI/)
assert.doesNotMatch(handlerSource, /new MockAiRuntimeProvider/)
assert.doesNotMatch(handlerSource, /new MockAiRuntimeHttpClient/)
assert.doesNotMatch(handlerSource, /new MockAiRuntimeProcessRunner/)
assert.match(handlerSource, /getMacOSCapabilities/)
assert.match(handlerSource, /get-macos-ai-branch-status|getMacOSAiBranchStatus|CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS/)
assert.match(handlerSource, /get-windows-ai-branch-status|getWindowsAiBranchStatus|CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS/)
assert.match(handlerSource, /getClipSiglipOnnxStatus/)
assert.match(handlerSource, /probeOnnxModelLoad/)
assert.match(handlerSource, /createOnnxModelLoadProbeArtifactReadiness/)
assert.match(handlerSource, /AiClientService/)
assert.match(handlerSource, /collectModelReadinessEvidence/)
assert.match(handlerSource, /createWorkerModelStatusArtifactReadiness/)
assert.match(handlerSource, /createLlamaRuntimeStatusArtifactReadiness/)
assert.doesNotMatch(handlerSource, /child_process|execFile|runProcess|SettingsService|saveSettings|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
assert.doesNotMatch(handlerSource, /ai-worker-manager|ocr-dependency/i)
assert.doesNotMatch(handlerSource, /list-local-models|startInstall|startServer|detectHardware|createInstallPlan|fs\.|readdir|existsSync/)

assert.match(mainSource, /registerAiRuntimeIpc\(\)/)

assert.match(preloadSource, /aiRuntime:\s*{/)
for (const methodName of Object.keys(channels)) {
  assert.match(preloadSource, new RegExp(`${methodName}:\\s*\\(`))
}

const aiRuntimeBlock = preloadSource.slice(preloadSource.indexOf('aiRuntime: {'), preloadSource.indexOf('// AI Model IPC API'))
assert.doesNotMatch(aiRuntimeBlock, /invoke:\s*\(|send:\s*\(|on:\s*\(/)
for (const channelConstant of channelConstants) {
  assert.ok(aiRuntimeBlock.includes(channelConstant) || preloadSource.includes(channelConstant))
}

assert.match(settingsSource, /<DoctorPanel \/>/)
