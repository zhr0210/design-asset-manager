import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  projectAiRuntimeHealthResultDisplay,
  projectAiRuntimeActionLabel,
  projectAiRuntimeDisplayValue,
  projectAiRuntimeInfoLabel,
  projectAiRuntimeStatusDisplay,
  projectAiRuntimeSummaryDisplay,
  getMacOSAiBranchRuntime,
  isMacOSAiBranchMetadata,
  normalizeAiCapabilityStatus,
  projectClipSiglipOnnxCompatibilityDisplay,
  projectLlamaRuntimeDisplay,
  projectAiCapabilityStatusDisplay,
  projectMacOSAiWorkerProbeDisplay,
  projectOnnxModelLoadProbeDisplay,
  projectPythonMpsExecutionProbeDisplay,
  projectPythonMpsCompatibilityDisplay,
  projectPythonCudaCompatibilityDisplay,
  projectPythonCudaExecutionProbeDisplay,
  projectWindowsAiWorkerProbeDisplay
} from '../src/shared/workflows/ai-runtime-status.workflow'

const pythonUnchecked = projectPythonMpsCompatibilityDisplay(null, 'offline')
assert.equal(pythonUnchecked.label, '未检查')
assert.equal(pythonUnchecked.tone, 'muted')
assert.equal(pythonUnchecked.platformValue, 'unknown')
assert.equal(pythonUnchecked.errorValue, 'offline')

const pythonReady = projectPythonMpsCompatibilityDisplay({
  success: true,
  compatible: true,
  runtime: 'torch.mps',
  status: 'optional',
  diagnostics: {}
})
assert.equal(pythonReady.label, '可兼容')
assert.equal(pythonReady.tone, 'good')
assert.equal(pythonReady.platformValue, 'compatible')
assert.equal(pythonReady.statusValue, 'optional')

const pythonPlanned = projectPythonMpsCompatibilityDisplay({
  success: false,
  compatible: false,
  runtime: null,
  status: 'planned',
  diagnostics: {},
  error: 'torch missing'
})
assert.equal(pythonPlanned.label, '待补齐')
assert.equal(pythonPlanned.tone, 'warn')
assert.equal(pythonPlanned.errorValue, 'torch missing')

const pythonUnavailable = projectPythonMpsCompatibilityDisplay({
  success: false,
  compatible: false,
  runtime: null,
  status: 'unavailable',
  diagnostics: {}
})
assert.equal(pythonUnavailable.label, '不可用')
assert.equal(pythonUnavailable.tone, 'bad')

const mpsExecutionUnchecked = projectPythonMpsExecutionProbeDisplay(null)
assert.equal(mpsExecutionUnchecked.label, '尚未验证')
assert.equal(mpsExecutionUnchecked.tone, 'muted')

const mpsExecutionPassed = projectPythonMpsExecutionProbeDisplay({
  success: true,
  status: 'executed_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  runtime: 'torch.mps',
  operation: 'tensor_square_sum',
  resultFinite: true
})
assert.equal(mpsExecutionPassed.label, '真实执行通过')
assert.equal(mpsExecutionPassed.tone, 'good')
assert.match(mpsExecutionPassed.detail, /torch\.mps/)

const mpsExecutionUnavailable = projectPythonMpsExecutionProbeDisplay({
  success: false,
  status: 'backend_unavailable',
  checkedAt: '2026-06-06T00:00:00.000Z',
  runtime: 'torch.mps',
  operation: 'tensor_square_sum',
  resultFinite: false,
  errorCode: 'MPS_UNAVAILABLE'
})
assert.equal(mpsExecutionUnavailable.label, '后端不可用')
assert.equal(mpsExecutionUnavailable.tone, 'warn')

const clipReady = projectClipSiglipOnnxCompatibilityDisplay({
  success: true,
  compatible: true,
  runtime: 'optimum.onnxruntime',
  diagnostics: { onnxruntime: true }
})
assert.equal(clipReady.label, '可兼容')
assert.equal(clipReady.statusValue, 'onnxruntime')

const clipPlanned = projectClipSiglipOnnxCompatibilityDisplay({
  success: false,
  compatible: false,
  runtime: null,
  diagnostics: {}
})
assert.equal(clipPlanned.label, '待补齐')
assert.equal(clipPlanned.platformValue, 'incompatible')
assert.equal(clipPlanned.statusValue, 'unknown')

const onnxUnchecked = projectOnnxModelLoadProbeDisplay(null)
assert.equal(onnxUnchecked.label, '尚未验证')
assert.equal(onnxUnchecked.tone, 'muted')

const onnxOffline = projectOnnxModelLoadProbeDisplay(null, 'fetch failed')
assert.equal(onnxOffline.label, 'Worker 不可达')
assert.equal(onnxOffline.tone, 'muted')

const onnxLoaded = projectOnnxModelLoadProbeDisplay({
  success: true,
  modelFamily: 'wd_tagger',
  status: 'loaded_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider'],
  inputCount: 1,
  outputCount: 2
})
assert.equal(onnxLoaded.label, '真实加载通过')
assert.equal(onnxLoaded.tone, 'good')
assert.match(onnxLoaded.detail, /CoreMLExecutionProvider/)

const clipEmbeddingLoaded = projectOnnxModelLoadProbeDisplay({
  success: true,
  modelFamily: 'clip',
  status: 'loaded_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: ['CPUExecutionProvider'],
  inputCount: 3,
  outputCount: 4,
  operation: 'image_text_embedding',
  resultFinite: true,
  embeddingDimension: 512
})
assert.equal(clipEmbeddingLoaded.label, '真实 Embedding 通过')
assert.match(clipEmbeddingLoaded.detail, /512 维/)

const onnxMissing = projectOnnxModelLoadProbeDisplay({
  success: false,
  modelFamily: 'wd_tagger',
  status: 'artifact_missing',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: [],
  inputCount: 0,
  outputCount: 0,
  errorCode: 'MODEL_ARTIFACT_MISSING'
})
assert.equal(onnxMissing.label, '模型缺失')
assert.equal(onnxMissing.tone, 'warn')

const llamaRunning = projectLlamaRuntimeDisplay({
  phase: 'complete',
  progress: 100,
  message: 'ready',
  baseUrl: 'http://127.0.0.1:8080/v1',
  serverPid: 123,
  serverModels: ['qwen3-vl']
})
assert.equal(llamaRunning.running, true)
assert.equal(llamaRunning.pillTone, 'good')
assert.equal(llamaRunning.pillLabel, '运行中')
assert.equal(llamaRunning.routeCaption, 'qwen3-vl 健康检查通过')
assert.equal(llamaRunning.serviceDetailValue, '进程 PID 123')

const llamaOverride = projectLlamaRuntimeDisplay({
  phase: 'complete',
  progress: 100,
  message: 'ready',
  baseUrl: 'http://127.0.0.1:8080/v1'
}, true)
assert.equal(llamaOverride.running, true)
assert.equal(llamaOverride.serviceDetailValue, '运行中')

const llamaError = projectLlamaRuntimeDisplay({
  phase: 'error',
  progress: 0,
  message: 'failed',
  baseUrl: 'http://127.0.0.1:8080/v1',
  error: { code: 'START_FAILED', message: 'port busy' }
})
assert.equal(llamaError.pillTone, 'bad')
assert.equal(llamaError.pillLabel, '异常')
assert.equal(llamaError.routeCaption, 'port busy')

const llamaStopped = projectLlamaRuntimeDisplay(null)
assert.equal(llamaStopped.pillTone, 'muted')
assert.equal(llamaStopped.pillLabel, '已停止')
assert.equal(llamaStopped.routeValue, '已停止')

assert.deepEqual(projectAiCapabilityStatusDisplay('ready'), {
  status: 'ready',
  label: '就绪',
  badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('optional'), {
  status: 'optional',
  label: '依赖可用',
  badgeClass: 'border-sky-100 bg-sky-50 text-sky-700'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('planned'), {
  status: 'planned',
  label: '尚未实现',
  badgeClass: 'border-amber-100 bg-amber-50 text-amber-700'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('evidence_insufficient'), {
  status: 'evidence_insufficient',
  label: '证据不足',
  badgeClass: 'border-slate-200 bg-slate-50 text-slate-500'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('dependency_missing'), {
  status: 'dependency_missing',
  label: '依赖缺失',
  badgeClass: 'border-amber-100 bg-amber-50 text-amber-700'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('fallback'), {
  status: 'fallback',
  label: '回退路线',
  badgeClass: 'border-slate-200 bg-slate-50 text-slate-600'
})
assert.deepEqual(projectAiCapabilityStatusDisplay('unavailable'), {
  status: 'unavailable',
  label: '不可用',
  badgeClass: 'border-rose-100 bg-rose-50 text-rose-700'
})
assert.equal(normalizeAiCapabilityStatus(null), 'unavailable')
assert.equal(normalizeAiCapabilityStatus('ready'), 'ready')

assert.deepEqual(projectAiRuntimeStatusDisplay('running'), {
  status: 'running',
  label: '运行中',
  badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  icon: 'success'
})
assert.deepEqual(projectAiRuntimeStatusDisplay('unhealthy'), {
  status: 'unhealthy',
  label: '异常',
  badgeClass: 'border-amber-100 bg-amber-50 text-amber-700',
  icon: 'warning'
})
assert.deepEqual(projectAiRuntimeStatusDisplay('failed'), {
  status: 'failed',
  label: '失败',
  badgeClass: 'border-rose-100 bg-rose-50 text-rose-700',
  icon: 'warning'
})
assert.deepEqual(projectAiRuntimeStatusDisplay('ok'), {
  status: 'ok',
  label: '正常',
  badgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  icon: 'success'
})
assert.deepEqual(projectAiRuntimeStatusDisplay('warning'), {
  status: 'warning',
  label: '提醒',
  badgeClass: 'border-amber-100 bg-amber-50 text-amber-700',
  icon: 'warning'
})
assert.deepEqual(projectAiRuntimeStatusDisplay(null), {
  status: 'unknown',
  label: '未知',
  badgeClass: 'border-slate-200 bg-slate-50 text-slate-500',
  icon: 'activity'
})

const runtimeSummary = projectAiRuntimeSummaryDisplay([
  runtimeState('running'),
  runtimeState('failed'),
  runtimeState('unhealthy'),
  runtimeState('stopped')
])
assert.deepEqual(runtimeSummary, {
  total: 4,
  running: 1,
  issues: 2,
  runningLabel: '1/4 运行中'
})
assert.deepEqual(projectAiRuntimeSummaryDisplay(null), {
  total: 0,
  running: 0,
  issues: 0,
  runningLabel: '0/0 运行中'
})

const healthResult = projectAiRuntimeHealthResultDisplay({
  runtimeId: 'python-worker',
  status: 'warning',
  message: '',
  checkedAt: '2026-06-05T00:00:00.000Z',
  durationMs: 42
})
assert.equal(healthResult.status.label, '提醒')
assert.equal(healthResult.status.icon, 'warning')
assert.equal(healthResult.messageLabel, '提醒 (42ms)')

assert.equal(projectAiRuntimeInfoLabel('active'), '当前运行时')
assert.equal(projectAiRuntimeInfoLabel('displayName'), '显示名称')
assert.equal(projectAiRuntimeInfoLabel('customField'), 'customField')
assert.equal(projectAiRuntimeDisplayValue('None'), '无')
assert.equal(projectAiRuntimeDisplayValue('Never'), '从未检查')
assert.equal(projectAiRuntimeDisplayValue('unknown'), '未知')
assert.equal(projectAiRuntimeDisplayValue('ready'), 'ready')
assert.equal(projectAiRuntimeActionLabel('Set active'), '设为当前')
assert.equal(projectAiRuntimeActionLabel('Health check all'), '全部健康检查')
assert.equal(projectAiRuntimeActionLabel('Custom action'), 'Custom action')

const macOSBranch = {
  marker: 'macos-ai-branch' as const,
  phase: 'worker-probes' as const,
  platform: 'darwin' as const,
  arch: 'arm64' as const,
  isCurrentPlatform: true,
  lanes: [],
  warnings: []
}
assert.equal(isMacOSAiBranchMetadata(macOSBranch), true)
assert.equal(isMacOSAiBranchMetadata({ marker: 'macos-ai-branch', lanes: null }), false)
assert.equal(getMacOSAiBranchRuntime([
  runtimeState('stopped'),
  { ...runtimeState('running'), metadata: { macosAiBranch: macOSBranch } }
]), macOSBranch)
assert.equal(getMacOSAiBranchRuntime([{ ...runtimeState('running'), metadata: { macosAiBranch: { marker: 'other', lanes: [] } } }]), null)

const uncheckedProbe = projectMacOSAiWorkerProbeDisplay(null)
assert.equal(uncheckedProbe.connected, false)
assert.equal(uncheckedProbe.connectionLabel, '等待探测')
assert.equal(uncheckedProbe.connectionTone, 'muted')
assert.equal(uncheckedProbe.mps.valueLabel, '尚未探测')
assert.equal(uncheckedProbe.onnxRuntime.valueLabel, '尚未探测')
assert.equal(uncheckedProbe.clipSiglipOnnx.valueLabel, '尚未探测')
assert.equal(uncheckedProbe.clipSiglipStatusLabel, '证据不足')

const connectedProbe = projectMacOSAiWorkerProbeDisplay({
  platform: 'darwin',
  machine: 'arm64',
  isMacOS: true,
  isAppleSilicon: true,
  phase: 'worker-probes',
  torch: {
    available: true,
    version: '2.8.0',
    mpsBuilt: true,
    mpsAvailable: true,
    cpuFallback: true,
    error: null
  },
  onnxruntime: {
    available: true,
    version: '1.22.0',
    providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider'],
    coremlAvailable: true,
    cpuAvailable: true,
    error: null
  },
  clipSiglipOnnx: {
    id: 'clip-siglip-onnx',
    label: 'CLIP/SigLIP ONNX',
    status: 'dependency_missing',
    role: 'embedding',
    backend: 'optimum',
    version: null,
    available: false,
    error: null
  },
  lanes: []
})
assert.equal(connectedProbe.connected, true)
assert.equal(connectedProbe.connectionLabel, 'macOS 探测已连接')
assert.equal(connectedProbe.connectionTone, 'good')
assert.equal(connectedProbe.platformBadgeLabel, 'darwin/arm64')
assert.equal(connectedProbe.isMacOSLabel, 'yes')
assert.equal(connectedProbe.isAppleSiliconLabel, 'yes')
assert.equal(connectedProbe.mps.valueLabel, '可用')
assert.equal(connectedProbe.mps.captionLabel, 'torch 2.8.0')
assert.equal(connectedProbe.onnxRuntime.valueLabel, '可用')
assert.equal(connectedProbe.onnxRuntime.captionLabel, 'CoreMLExecutionProvider / CPUExecutionProvider')
assert.equal(connectedProbe.clipSiglipOnnx.valueLabel, '依赖缺失')
assert.equal(connectedProbe.clipSiglipOnnx.captionLabel, '已探测，未报告版本')

// Add Windows capability display tests
const windowsUncheckedProbe = projectWindowsAiWorkerProbeDisplay(null)
assert.equal(windowsUncheckedProbe.connected, false)
assert.equal(windowsUncheckedProbe.cuda.valueLabel, '尚未探测')
assert.equal(windowsUncheckedProbe.onnxRuntime.valueLabel, '尚未探测')

const windowsConnectedProbe = projectWindowsAiWorkerProbeDisplay({
  platform: 'win32',
  machine: 'amd64',
  isMacOS: false,
  isAppleSilicon: false,
  phase: 'worker-probes',
  torch: {
    available: true,
    version: '2.8.0+cu121',
    cudaAvailable: true,
    cpuFallback: false,
    error: null
  },
  onnxruntime: {
    available: true,
    version: '1.22.0',
    providers: ['CUDAExecutionProvider', 'CPUExecutionProvider'],
    cudaAvailable: true,
    cpuAvailable: true,
    error: null
  },
  clipSiglipOnnx: {
    id: 'clip-siglip-onnx',
    label: 'CLIP/SigLIP ONNX',
    status: 'ready',
    role: 'embedding',
    backend: 'optimum',
    version: '1.22.0',
    available: true,
    error: null
  },
  lanes: []
})
assert.equal(windowsConnectedProbe.connected, true)
assert.equal(windowsConnectedProbe.connectionLabel, 'Windows 探测已连接')
assert.equal(windowsConnectedProbe.cuda.valueLabel, '可用')
assert.equal(windowsConnectedProbe.cuda.captionLabel, 'torch 2.8.0+cu121')
assert.equal(windowsConnectedProbe.onnxRuntime.valueLabel, '可用')
assert.equal(windowsConnectedProbe.onnxRuntime.captionLabel, 'CUDAExecutionProvider / CPUExecutionProvider')
assert.equal(windowsConnectedProbe.clipSiglipOnnx.valueLabel, '就绪')

const settingsPanelSource = await fs.readFile('src/renderer/components/settings/AiRuntimePanel.tsx', 'utf8')
const matrixSource = await fs.readFile('src/renderer/components/settings/MacOSAiCapabilityMatrix.tsx', 'utf8')
const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(settingsPanelSource, /projectPythonMpsCompatibilityDisplay/)
assert.match(settingsPanelSource, /projectPythonMpsExecutionProbeDisplay/)
assert.match(settingsPanelSource, /projectClipSiglipOnnxCompatibilityDisplay/)
assert.match(settingsPanelSource, /验证真实 Embedding/)
assert.match(settingsPanelSource, /runOnnxModelLoadProbe\('clip'\)/)
assert.match(settingsPanelSource, /projectAiRuntimeStatusDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeSummaryDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeHealthResultDisplay/)
assert.match(settingsPanelSource, /projectAiCapabilityStatusDisplay/)
assert.match(settingsPanelSource, /projectMacOSAiWorkerProbeDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeInfoLabel/)
assert.match(settingsPanelSource, /projectAiRuntimeDisplayValue/)
assert.match(settingsPanelSource, /projectAiRuntimeActionLabel/)
assert.match(settingsPanelSource, /getMacOSAiBranchRuntime/)
assert.match(matrixSource, /projectAiCapabilityStatusDisplay/)
assert.match(aiConsoleSource, /projectPythonMpsCompatibilityDisplay/)
assert.match(aiConsoleSource, /projectClipSiglipOnnxCompatibilityDisplay/)
assert.match(aiConsoleSource, /projectLlamaRuntimeDisplay/)
assert.doesNotMatch(settingsPanelSource, /pythonMpsStatus\?\.compatible\s*\?/)
assert.doesNotMatch(settingsPanelSource, /clipSiglipOnnxStatus\?\.compatible\s*\?/)
assert.doesNotMatch(settingsPanelSource, /clipSiglipOnnxStatus\.diagnostics\?\.onnxruntime\s*\?/)
assert.doesNotMatch(settingsPanelSource, /const STATUS_STYLE/)
assert.doesNotMatch(settingsPanelSource, /const STATUS_LABELS/)
assert.doesNotMatch(settingsPanelSource, /const INFO_LABELS/)
assert.doesNotMatch(settingsPanelSource, /function displayValue/)
assert.doesNotMatch(settingsPanelSource, /function actionLabel/)
assert.doesNotMatch(settingsPanelSource, /function isMacOSAiBranchMetadata/)
assert.doesNotMatch(settingsPanelSource, /function getMacOSAiBranchRuntime/)
assert.doesNotMatch(settingsPanelSource, /metadata\?\.macosAiBranch/)
assert.doesNotMatch(settingsPanelSource, /runtime\.status === ['"]running['"]/)
assert.doesNotMatch(settingsPanelSource, /runtime\.status === ['"]failed['"]/)
assert.doesNotMatch(settingsPanelSource, /function statusText/)
assert.doesNotMatch(settingsPanelSource, /function branchStatusStyle/)
assert.doesNotMatch(settingsPanelSource, /probe\?\.isMacOS\s*\?/)
assert.doesNotMatch(settingsPanelSource, /probe\.isMacOS\s*\?/)
assert.doesNotMatch(settingsPanelSource, /probe\.isAppleSilicon\s*\?/)
assert.doesNotMatch(aiConsoleSource, /pythonMpsStatus\?\.compatible\s*\?/)
assert.doesNotMatch(aiConsoleSource, /clipSiglipOnnxStatus\?\.compatible\s*\?/)
assert.doesNotMatch(aiConsoleSource, /llamaServerRunning\s*\?/)
assert.doesNotMatch(aiConsoleSource, /llamaStatus\?\.serverPid\s*\?\s*['"]运行中['"]/)
assert.doesNotMatch(matrixSource, /const STATUS_LABELS/)
assert.doesNotMatch(matrixSource, /const STATUS_STYLES/)
assert.doesNotMatch(matrixSource, /STATUS_LABELS\[/)
assert.doesNotMatch(matrixSource, /STATUS_STYLES\[/)

console.log('ai-runtime-status-workflow passed')

function runtimeState(status: 'running' | 'failed' | 'unhealthy' | 'stopped') {
  return {
    id: status,
    kind: 'python-worker' as const,
    status,
    healthStatus: 'unknown' as const,
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: null,
    pid: null,
    baseUrl: null
  }
}
