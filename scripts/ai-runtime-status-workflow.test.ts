import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  projectAiRuntimeHealthResultDisplay,
  projectAiRuntimeActionLabel,
  projectAiRuntimeDisplayValue,
  projectAiRuntimeInfoLabel,
  projectAiRuntimeStatusDisplay,
  projectAiRuntimeSummaryDisplay,
  getCurrentPlatformAiBranchRuntime,
  resolvePlatformAiBranch,
  normalizeAiCapabilityStatus,
  projectClipSiglipOnnxCompatibilityDisplay,
  projectLlamaRuntimeDisplay,
  projectAiCapabilityStatusDisplay,
  projectMacOSAiWorkerProbeDisplay,
  projectOnnxModelLoadProbeDisplay,
  projectAiRuntimeBranchPanelDisplay,
  projectAiRuntimeCapabilityMatrixDisplay,
  projectAiRuntimePlatformPanelCopy,
  projectAiRuntimeWorkerProbePanelDisplay,
  projectPlatformAiWorkerProbeDiagnosticsSelection,
  projectPlatformPythonRuntimeCompatibilityDisplay,
  projectPlatformPythonRuntimeExecutionProbeDisplay,
  projectPythonMpsExecutionProbeDisplay,
  projectPythonMpsCompatibilityDisplay,
  projectPythonCudaCompatibilityDisplay,
  projectPythonCudaExecutionProbeDisplay,
  projectWindowsAiWorkerProbeDisplay
} from '../src/shared/workflows/ai-runtime-status.workflow'

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSourceFiles(entryPath)
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) return [entryPath.replace(/\\/g, '/')]
    return []
  }))
  return files.flat()
}

function extractFunctionSource(source: string, name: string): string {
  const start = source.search(new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`))
  assert.notEqual(start, -1, `Expected to find function ${name}`)

  const bodyStart = source.indexOf('{', start)
  assert.notEqual(bodyStart, -1, `Expected to find body for function ${name}`)

  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }

  assert.fail(`Expected function ${name} body to close`)
}

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

const macOSPlatformCopy = projectAiRuntimePlatformPanelCopy('macos')
assert.equal(macOSPlatformCopy.compatibilityTitle, 'Python MPS 兼容性检查')
assert.equal(macOSPlatformCopy.executionTitle, 'Python MPS 真实执行验证')
assert.equal(macOSPlatformCopy.executionFailureMessage, 'MPS 真实执行验证失败。')
assert.equal(macOSPlatformCopy.executionButtonLabel, '验证 MPS 执行')
assert.equal(macOSPlatformCopy.workerProbeFailureMessage, '读取 macOS Worker 能力失败。')
assert.match(macOSPlatformCopy.clipSiglipCompatibilityDescription, /macOS/)

const windowsPlatformCopy = projectAiRuntimePlatformPanelCopy('windows')
assert.equal(windowsPlatformCopy.compatibilityTitle, 'Python CUDA 兼容性检查')
assert.equal(windowsPlatformCopy.executionTitle, 'Python CUDA 真实执行验证')
assert.equal(windowsPlatformCopy.executionFailureMessage, 'CUDA 真实执行验证失败。')
assert.equal(windowsPlatformCopy.executionButtonLabel, '验证 CUDA 执行')
assert.equal(windowsPlatformCopy.workerProbeFailureMessage, '读取 Windows Worker 能力失败。')
assert.match(windowsPlatformCopy.clipSiglipCompatibilityDescription, /Windows/)

assert.equal(projectPlatformPythonRuntimeCompatibilityDisplay('macos', pythonReady).runtimeLabel, 'torch.mps')
const pythonCudaReady = {
  success: true,
  compatible: true,
  runtime: 'torch.cuda',
  status: 'optional',
  diagnostics: {}
} as const
assert.equal(projectPlatformPythonRuntimeCompatibilityDisplay('windows', pythonCudaReady).runtimeLabel, 'torch.cuda')
assert.deepEqual(
  projectPlatformPythonRuntimeCompatibilityDisplay('macos', null, 'offline'),
  projectPythonMpsCompatibilityDisplay(null, 'offline')
)
assert.deepEqual(
  projectPlatformPythonRuntimeCompatibilityDisplay('windows', pythonCudaReady),
  projectPythonCudaCompatibilityDisplay(pythonCudaReady)
)

const mpsExecutionUnchecked = projectPythonMpsExecutionProbeDisplay(null)
assert.equal(mpsExecutionUnchecked.label, '尚未验证')
assert.equal(mpsExecutionUnchecked.tone, 'muted')

const mpsExecutionPassedProbe = {
  success: true,
  status: 'executed_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  runtime: 'torch.mps',
  operation: 'tensor_square_sum',
  resultFinite: true
} as const
const mpsExecutionPassed = projectPythonMpsExecutionProbeDisplay(mpsExecutionPassedProbe)
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
assert.equal(projectPlatformPythonRuntimeExecutionProbeDisplay('macos', mpsExecutionPassedProbe).detail, mpsExecutionPassed.detail)
assert.match(projectPlatformPythonRuntimeExecutionProbeDisplay('windows', {
  success: true,
  status: 'executed_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  runtime: 'torch.cuda',
  operation: 'tensor_square_sum',
  resultFinite: true
}).detail, /torch\.cuda/)
const cudaExecutionUnsupportedProbe = {
  success: false,
  status: 'unsupported',
  checkedAt: '2026-06-06T00:00:00.000Z',
  runtime: null,
  operation: 'tensor_square_sum',
  resultFinite: false
} as const
const cudaExecutionUnsupported = projectPythonCudaExecutionProbeDisplay(cudaExecutionUnsupportedProbe)
assert.equal(cudaExecutionUnsupported.label, '平台不支持')
assert.equal(cudaExecutionUnsupported.detail, 'CUDA 真实执行仅适用于 Windows。')
assert.deepEqual(
  projectPlatformPythonRuntimeExecutionProbeDisplay('windows', cudaExecutionUnsupportedProbe),
  cudaExecutionUnsupported
)

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
assert.deepEqual(projectAiRuntimeBranchPanelDisplay(macOSBranch), {
  title: 'macOS AI 分支',
  description: 'Python MPS、ONNX Runtime 与 Llama 三条路线的架构定义；未经 macOS 实时探测的条目统一显示为证据不足。 当前阶段：worker-probes / darwin/arm64',
  platformBadgeLabel: '当前平台',
  platformBadgeClass: 'border-emerald-100 bg-emerald-50 text-emerald-700'
})
assert.equal(getCurrentPlatformAiBranchRuntime([
  runtimeState('stopped'),
  { ...runtimeState('running'), metadata: { macosAiBranch: macOSBranch } }
]), macOSBranch)
assert.equal(resolvePlatformAiBranch(macOSBranch), 'macos')
assert.equal(resolvePlatformAiBranch(null), 'macos')
assert.equal(getCurrentPlatformAiBranchRuntime([
  { ...runtimeState('running'), metadata: { macosAiBranch: { ...macOSBranch, lanes: null } } }
]), null)
assert.equal(getCurrentPlatformAiBranchRuntime([
  { ...runtimeState('running'), metadata: { macosAiBranch: { ...macOSBranch, marker: 'other' } } }
]), null)

const uncheckedProbe = projectMacOSAiWorkerProbeDisplay(null)
assert.equal(uncheckedProbe.connected, false)
assert.equal(uncheckedProbe.connectionLabel, '等待探测')
assert.equal(uncheckedProbe.connectionTone, 'muted')
assert.equal(uncheckedProbe.accelerator.valueLabel, '尚未探测')
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
assert.equal(connectedProbe.accelerator.valueLabel, '可用')
assert.equal(connectedProbe.accelerator.captionLabel, 'torch 2.8.0')
assert.equal(connectedProbe.mps.valueLabel, '可用')
assert.equal(connectedProbe.mps.captionLabel, 'torch 2.8.0')
assert.equal(connectedProbe.onnxRuntime.valueLabel, '可用')
assert.equal(connectedProbe.onnxRuntime.captionLabel, 'CoreMLExecutionProvider / CPUExecutionProvider')
assert.equal(connectedProbe.clipSiglipOnnx.valueLabel, '依赖缺失')
assert.equal(connectedProbe.clipSiglipOnnx.captionLabel, '已探测，未报告版本')
const macOSWorkerPanel = projectAiRuntimeWorkerProbePanelDisplay('macos', {
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
assert.equal(macOSWorkerPanel.title, 'macOS Worker 实时探测')
assert.equal(macOSWorkerPanel.platformBadgeLabel, 'darwin/arm64')
assert.equal(macOSWorkerPanel.clipSiglipStatusLabel, '依赖缺失')

// Add Windows capability display tests
const windowsUncheckedProbe = projectWindowsAiWorkerProbeDisplay(null)
assert.equal(windowsUncheckedProbe.connected, false)
assert.equal(windowsUncheckedProbe.accelerator.valueLabel, '尚未探测')
assert.equal(windowsUncheckedProbe.cuda.valueLabel, '尚未探测')
assert.equal(windowsUncheckedProbe.onnxRuntime.valueLabel, '尚未探测')

const windowsRawProbe = {
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
}
const windowsConnectedProbe = projectWindowsAiWorkerProbeDisplay(windowsRawProbe)
assert.equal(windowsConnectedProbe.connected, true)
assert.equal(windowsConnectedProbe.connectionLabel, 'Windows 探测已连接')
assert.equal(windowsConnectedProbe.accelerator.valueLabel, '可用')
assert.equal(windowsConnectedProbe.accelerator.captionLabel, 'torch 2.8.0+cu121')
assert.equal(windowsConnectedProbe.cuda.valueLabel, '可用')
assert.equal(windowsConnectedProbe.cuda.captionLabel, 'torch 2.8.0+cu121')
assert.equal(windowsConnectedProbe.onnxRuntime.valueLabel, '可用')
assert.equal(windowsConnectedProbe.onnxRuntime.captionLabel, 'CUDAExecutionProvider / CPUExecutionProvider')
assert.equal(windowsConnectedProbe.clipSiglipOnnx.valueLabel, '就绪')

const windowsProbeSelection = projectPlatformAiWorkerProbeDiagnosticsSelection({
  platformBranch: 'windows',
  windowsProbe: windowsRawProbe
})
assert.equal(windowsProbeSelection.probe, windowsRawProbe)
assert.equal(windowsProbeSelection.platformBranch, 'windows')
assert.equal(windowsProbeSelection.display.platformBadgeLabel, 'win32/amd64')
assert.equal(windowsProbeSelection.display.accelerator.captionLabel, 'torch 2.8.0+cu121')

const inferredWindowsProbeSelection = projectPlatformAiWorkerProbeDiagnosticsSelection({
  windowsProbe: windowsRawProbe
})
assert.equal(inferredWindowsProbeSelection.probe, windowsRawProbe)
assert.equal(inferredWindowsProbeSelection.platformBranch, 'windows')
assert.equal(inferredWindowsProbeSelection.display.connected, true)

const uncheckedMacOSProbeSelection = projectPlatformAiWorkerProbeDiagnosticsSelection({
  platformBranch: 'macos',
  windowsProbe: windowsRawProbe
})
assert.equal(uncheckedMacOSProbeSelection.probe, null)
assert.equal(uncheckedMacOSProbeSelection.platformBranch, 'macos')
assert.equal(uncheckedMacOSProbeSelection.display.connected, false)

const windowsBranch = {
  marker: 'windows-ai-branch' as const,
  phase: 'worker-probes' as const,
  platform: 'win32' as const,
  arch: 'x64' as const,
  isCurrentPlatform: false,
  lanes: [],
  warnings: []
}
const currentWindowsBranch = {
  ...windowsBranch,
  isCurrentPlatform: true
}
assert.equal(getCurrentPlatformAiBranchRuntime([
  { ...runtimeState('running'), metadata: { macosAiBranch: macOSBranch } },
  { ...runtimeState('running'), metadata: { windowsAiBranch: currentWindowsBranch } }
]), currentWindowsBranch)
assert.equal(resolvePlatformAiBranch(currentWindowsBranch), 'windows')
assert.equal(getCurrentPlatformAiBranchRuntime([
  { ...runtimeState('running'), metadata: { windowsAiBranch: windowsBranch } },
  { ...runtimeState('running'), metadata: { macosAiBranch: { ...macOSBranch, isCurrentPlatform: false } } }
]), null)
assert.deepEqual(projectAiRuntimeBranchPanelDisplay(windowsBranch), {
  title: 'Windows AI 分支',
  description: 'Python CUDA、ONNX Runtime 与 Llama 三条路线的架构定义；未经过实时探测的条目统一显示为证据不足。 当前阶段：worker-probes / win32/x64',
  platformBadgeLabel: '非当前平台',
  platformBadgeClass: 'border-slate-200 bg-white text-slate-500'
})
const windowsWorkerPanel = projectAiRuntimeWorkerProbePanelDisplay('windows', windowsRawProbe)
assert.equal(windowsWorkerPanel.title, 'Windows Worker 实时探测')
assert.equal(windowsWorkerPanel.platformBadgeLabel, 'win32/amd64')
assert.equal(windowsWorkerPanel.clipSiglipStatusLabel, '就绪')
assert.equal(projectAiRuntimeCapabilityMatrixDisplay('macos').title, 'macOS 细项能力矩阵')
assert.equal(projectAiRuntimeCapabilityMatrixDisplay('windows').title, 'Windows 细项能力矩阵')
assert.match(projectAiRuntimeCapabilityMatrixDisplay().description, /证据不足/)

const settingsPanelSource = await fs.readFile('src/renderer/components/settings/AiRuntimePanel.tsx', 'utf8')
const matrixSource = await fs.readFile('src/renderer/components/settings/PlatformAiCapabilityMatrix.tsx', 'utf8')
const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
const runtimeWorkflowSource = await fs.readFile('src/shared/workflows/ai-runtime-status.workflow.ts', 'utf8')
const aiRuntimeContractSource = await fs.readFile('src/shared/contracts/ai-runtime.contract.ts', 'utf8')
const platformAiRuntimeTypesSource = await fs.readFile('src/shared/types/platform-ai-runtime.types.ts', 'utf8')
const macosAiRuntimeTypesSource = await fs.readFile('src/shared/types/macos-ai-runtime.types.ts', 'utf8')
const windowsAiRuntimeTypesSource = await fs.readFile('src/shared/types/windows-ai-runtime.types.ts', 'utf8')
const windowsAiRuntimeConstantsSource = await fs.readFile('src/shared/constants/windows-ai-runtime.constants.ts', 'utf8')
const concretePlatformRuntimeTypePattern = /MacOSAiWorkerProbeResult|WindowsAiWorkerProbeResult|MacOSAiBranchRuntimeMetadata|WindowsAiBranchRuntimeMetadata|MacOSAiRuntimeLane|WindowsAiRuntimeLane/
const concretePlatformRuntimeTypeFiles = (await Promise.all(
  (await listSourceFiles('src')).map(async (file) => {
    const source = await fs.readFile(file, 'utf8')
    return concretePlatformRuntimeTypePattern.test(source) ? file : null
  })
)).filter((file): file is string => Boolean(file)).sort()
assert.deepEqual(concretePlatformRuntimeTypeFiles, [
  'src/main/ipc/ai-runtime.ipc.ts',
  'src/main/services/ai-client.service.ts',
  'src/shared/constants/macos-ai-runtime.constants.ts',
  'src/shared/constants/windows-ai-runtime.constants.ts',
  'src/shared/contracts/ai-runtime.contract.ts',
  'src/shared/types/macos-ai-runtime.types.ts',
  'src/shared/types/windows-ai-runtime.types.ts'
])
assert.match(platformAiRuntimeTypesSource, /export type AiCapabilityStatus/)
assert.match(platformAiRuntimeTypesSource, /export type PlatformAiRuntimeBranchPhase/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiRuntimeLaneBase/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiBranchRuntimeMetadataBase/)
assert.match(platformAiRuntimeTypesSource, /export type PlatformAiBranchRuntimeMetadata = PlatformAiBranchRuntimeMetadataBase<string, PlatformAiRuntimeLaneBase>/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiLaneDisplayCapability/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiLaneDisplayInput/)
assert.match(platformAiRuntimeTypesSource, /export interface AiWorkerLaneProbe/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiWorkerProbeResultBase/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiWorkerRuntimeVersionProbe/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiWorkerTorchProbe/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiWorkerOnnxRuntimeProbe/)
assert.match(platformAiRuntimeTypesSource, /export interface PlatformAiWorkerProbeDiagnosticsInput extends PlatformAiWorkerProbeResultBase/)
assert.match(platformAiRuntimeTypesSource, /export type PlatformAiWorkerProbeWithRuntimeVersions/)
assert.match(macosAiRuntimeTypesSource, /from '.\/platform-ai-runtime\.types'/)
assert.match(macosAiRuntimeTypesSource, /MacOSAiRuntimeLane extends PlatformAiRuntimeLaneBase<MacOSAiRuntimeLaneId>/)
assert.match(macosAiRuntimeTypesSource, /MacOSAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'macos-ai-branch', MacOSAiRuntimeLane>/)
assert.match(macosAiRuntimeTypesSource, /MacOSAiWorkerProbeResult extends PlatformAiWorkerProbeDiagnosticsInput/)
assert.doesNotMatch(macosAiRuntimeTypesSource, /phase: 'skeleton' \| 'worker-probes' \| 'model-download' \| 'validated'/)
assert.doesNotMatch(macosAiRuntimeTypesSource, /phase: 'worker-probes'/)
assert.match(windowsAiRuntimeTypesSource, /from '.\/platform-ai-runtime\.types'/)
assert.match(windowsAiRuntimeTypesSource, /WindowsAiRuntimeLane extends PlatformAiRuntimeLaneBase<WindowsAiRuntimeLaneId>/)
assert.match(windowsAiRuntimeTypesSource, /WindowsAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'windows-ai-branch', WindowsAiRuntimeLane>/)
assert.match(windowsAiRuntimeTypesSource, /WindowsAiWorkerProbeResult extends PlatformAiWorkerProbeDiagnosticsInput/)
assert.doesNotMatch(windowsAiRuntimeTypesSource, /from '.\/macos-ai-runtime\.types'/)
assert.doesNotMatch(windowsAiRuntimeTypesSource, /phase: 'skeleton' \| 'worker-probes' \| 'model-download' \| 'validated'/)
assert.doesNotMatch(windowsAiRuntimeTypesSource, /phase: 'worker-probes'/)
assert.doesNotMatch(windowsAiRuntimeConstantsSource, /from '..\/types\/macos-ai-runtime\.types'/)
assert.match(runtimeWorkflowSource, /interface PlatformAiProbeTileDisplay/)
assert.doesNotMatch(runtimeWorkflowSource, /MacOSAiProbeTileDisplay/)
assert.match(runtimeWorkflowSource, /interface PlatformAiWorkerProbeHeaderDisplay/)
assert.match(runtimeWorkflowSource, /interface PlatformAiWorkerProbeDiagnosticsDisplay extends PlatformAiWorkerProbeHeaderDisplay/)
assert.match(runtimeWorkflowSource, /function projectPlatformAiWorkerProbeHeaderDisplay/)
assert.match(runtimeWorkflowSource, /branch: PlatformAiBranchRuntimeMetadata/)
assert.doesNotMatch(runtimeWorkflowSource, /branch: MacOSAiBranchRuntimeMetadata \| WindowsAiBranchRuntimeMetadata/)
assert.match(runtimeWorkflowSource, /function getPlatformAiBranchRuntime/)
assert.match(runtimeWorkflowSource, /function resolvePlatformAiBranch/)
assert.doesNotMatch(runtimeWorkflowSource, /projectAiRuntimePlatformPanelCopy\(isWindows: boolean/)
assert.doesNotMatch(runtimeWorkflowSource, /projectPlatformPythonRuntimeCompatibilityDisplay\(\s*isWindows: boolean/)
assert.doesNotMatch(runtimeWorkflowSource, /projectPlatformPythonRuntimeExecutionProbeDisplay\(\s*isWindows: boolean/)
assert.doesNotMatch(runtimeWorkflowSource, /projectAiRuntimeWorkerProbePanelDisplay\(\s*isWindows: boolean/)
assert.doesNotMatch(runtimeWorkflowSource, /\bMacOSAiBranchRuntimeMetadata\b/)
assert.doesNotMatch(runtimeWorkflowSource, /\bWindowsAiBranchRuntimeMetadata\b/)
assert.doesNotMatch(runtimeWorkflowSource, /function getMacOSAiBranchRuntime/)
assert.doesNotMatch(runtimeWorkflowSource, /function getWindowsAiBranchRuntime/)
assert.match(runtimeWorkflowSource, /PlatformAiWorkerProbeResultBase/)
assert.match(runtimeWorkflowSource, /PlatformAiWorkerProbeDiagnosticsInput/)
assert.match(runtimeWorkflowSource, /AiRuntimePythonCompatibilityStatusResponseBase/)
assert.match(runtimeWorkflowSource, /AiRuntimePythonExecutionProbeResponseBase/)
assert.match(runtimeWorkflowSource, /const PYTHON_RUNTIME_DISPLAY_COPY: Record<PlatformAiBranch, PythonRuntimeDisplayCopy>/)
assert.match(runtimeWorkflowSource, /function projectPythonRuntimeCompatibilityDisplay\(/)
assert.match(runtimeWorkflowSource, /function projectPythonRuntimeExecutionProbeDisplay\(/)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectPythonMpsCompatibilityDisplay'),
  /return projectPythonRuntimeCompatibilityDisplay\('macos', status, error\)/
)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectPythonCudaCompatibilityDisplay'),
  /return projectPythonRuntimeCompatibilityDisplay\('windows', status, error\)/
)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectPythonMpsExecutionProbeDisplay'),
  /return projectPythonRuntimeExecutionProbeDisplay\('macos', probe, error\)/
)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectPythonCudaExecutionProbeDisplay'),
  /return projectPythonRuntimeExecutionProbeDisplay\('windows', probe, error\)/
)
assert.doesNotMatch(
  extractFunctionSource(runtimeWorkflowSource, 'projectPlatformPythonRuntimeCompatibilityDisplay'),
  /projectPython(?:Mps|Cuda)CompatibilityDisplay/
)
assert.doesNotMatch(
  extractFunctionSource(runtimeWorkflowSource, 'projectPlatformPythonRuntimeExecutionProbeDisplay'),
  /projectPython(?:Mps|Cuda)ExecutionProbeDisplay/
)
assert.doesNotMatch(runtimeWorkflowSource, /\bAiRuntimePythonMpsStatusResponse\b/)
assert.doesNotMatch(runtimeWorkflowSource, /\bAiRuntimePythonCudaStatusResponse\b/)
assert.doesNotMatch(runtimeWorkflowSource, /\bAiRuntimePythonMpsExecutionProbeResponse\b/)
assert.doesNotMatch(runtimeWorkflowSource, /\bAiRuntimePythonCudaExecutionProbeResponse\b/)
assert.doesNotMatch(runtimeWorkflowSource, /status as AiRuntimePython/)
assert.doesNotMatch(runtimeWorkflowSource, /probe as AiRuntimePython/)
assert.doesNotMatch(runtimeWorkflowSource, /\bMacOSAiWorkerProbeResult\b/)
assert.doesNotMatch(runtimeWorkflowSource, /\bWindowsAiWorkerProbeResult\b/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonCompatibilityStatusResponseBase/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonMpsStatusResponse extends AiRuntimePythonCompatibilityStatusResponseBase/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonCudaStatusResponse extends AiRuntimePythonCompatibilityStatusResponseBase/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonExecutionProbeResponseBase/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonMpsExecutionProbeResponse extends AiRuntimePythonExecutionProbeResponseBase/)
assert.match(aiRuntimeContractSource, /interface AiRuntimePythonCudaExecutionProbeResponse extends AiRuntimePythonExecutionProbeResponseBase/)
assert.match(runtimeWorkflowSource, /Pick<PlatformAiWorkerProbeResultBase/)
assert.doesNotMatch(runtimeWorkflowSource, /Pick<MacOSAiWorkerProbeResult \| WindowsAiWorkerProbeResult/)
assert.match(runtimeWorkflowSource, /probe\?: PlatformAiWorkerProbeResultBase \| null/)
assert.doesNotMatch(runtimeWorkflowSource, /projectAiRuntimeWorkerProbePanelDisplay\(\s*isWindows: boolean,\s*probe\?: MacOSAiWorkerProbeResult \| WindowsAiWorkerProbeResult \| null/)
assert.doesNotMatch(runtimeWorkflowSource, /projectWindowsAiWorkerProbeDisplay\(probe as WindowsAiWorkerProbeResult\)/)
assert.doesNotMatch(runtimeWorkflowSource, /projectMacOSAiWorkerProbeDisplay\(probe as MacOSAiWorkerProbeResult\)/)
assert.match(runtimeWorkflowSource, /interface MacOSAiWorkerProbeDisplay extends PlatformAiWorkerProbeDiagnosticsDisplay/)
assert.match(runtimeWorkflowSource, /interface WindowsAiWorkerProbeDisplay extends PlatformAiWorkerProbeDiagnosticsDisplay/)
assert.match(runtimeWorkflowSource, /interface AiRuntimeWorkerProbePanelDisplay extends PlatformAiWorkerProbeHeaderDisplay/)
assert.match(runtimeWorkflowSource, /function projectPlatformAiWorkerProbeDiagnosticsDisplay/)
assert.match(runtimeWorkflowSource, /function projectAiRuntimeWorkerProbePanelFromHeader/)
const platformProbeDeviceFieldPattern = /probe\.torch|\.(?:mpsAvailable|cudaAvailable)/
for (const helperName of [
  'projectPlatformAiWorkerProbeHeaderDisplay',
  'projectPlatformAiWorkerProbeDiagnosticsDisplay',
  'projectAiRuntimeWorkerProbePanelDisplay',
  'projectAiRuntimeWorkerProbePanelFromHeader',
  'projectAiRuntimeBranchPanelDisplay'
]) {
  assert.doesNotMatch(
    extractFunctionSource(runtimeWorkflowSource, helperName),
    platformProbeDeviceFieldPattern,
    `${helperName} should stay platform-neutral and not read Worker device detail fields`
  )
}
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectMacOSAiWorkerProbeDisplay'),
  /probe\.torch\.mpsAvailable/,
  'macOS Worker detail fields should stay inside the macOS-specific display projector'
)
assert.doesNotMatch(
  extractFunctionSource(runtimeWorkflowSource, 'projectMacOSAiWorkerProbeDisplay'),
  /probe\.(?:onnxruntime|clipSiglipOnnx)/,
  'macOS Worker projector should delegate shared diagnostics fields'
)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectWindowsAiWorkerProbeDisplay'),
  /probe\.torch\.cudaAvailable/,
  'Windows Worker detail fields should stay inside the Windows-specific display projector'
)
assert.doesNotMatch(
  extractFunctionSource(runtimeWorkflowSource, 'projectWindowsAiWorkerProbeDisplay'),
  /probe\.(?:onnxruntime|clipSiglipOnnx)/,
  'Windows Worker projector should delegate shared diagnostics fields'
)
assert.match(
  extractFunctionSource(runtimeWorkflowSource, 'projectPlatformAiWorkerProbeDiagnosticsDisplay'),
  /probe\.onnxruntime\.providers[\s\S]*probe\.clipSiglipOnnx\.version/,
  'shared Worker projector should own shared ONNX and CLIP diagnostics fields'
)
assert.match(settingsPanelSource, /projectAiRuntimePlatformPanelCopy/)
assert.match(settingsPanelSource, /projectPlatformPythonRuntimeCompatibilityDisplay/)
assert.match(settingsPanelSource, /projectPlatformPythonRuntimeExecutionProbeDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeBranchPanelDisplay/)
assert.match(settingsPanelSource, /branch: PlatformAiBranchRuntimeMetadata/)
assert.doesNotMatch(settingsPanelSource, /branch: MacOSAiBranchRuntimeMetadata \| WindowsAiBranchRuntimeMetadata/)
assert.match(settingsPanelSource, /PlatformAiLaneDisplayInput/)
assert.doesNotMatch(settingsPanelSource, /type PlatformAiLaneLike/)
assert.match(settingsPanelSource, /projectAiRuntimeWorkerProbePanelDisplay/)
assert.match(settingsPanelSource, /useState<PlatformAiWorkerProbeWithRuntimeVersions \| null>/)
assert.doesNotMatch(settingsPanelSource, /useState<MacOSAiWorkerProbeResult \| WindowsAiWorkerProbeResult \| null>/)
assert.match(settingsPanelSource, /projectClipSiglipOnnxCompatibilityDisplay/)
assert.match(settingsPanelSource, /验证真实 Embedding/)
assert.match(settingsPanelSource, /runOnnxModelLoadProbe\('clip'\)/)
assert.match(settingsPanelSource, /projectAiRuntimeStatusDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeSummaryDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeHealthResultDisplay/)
assert.match(settingsPanelSource, /projectAiCapabilityStatusDisplay/)
assert.match(settingsPanelSource, /projectAiRuntimeInfoLabel/)
assert.match(settingsPanelSource, /projectAiRuntimeDisplayValue/)
assert.match(settingsPanelSource, /projectAiRuntimeActionLabel/)
assert.match(settingsPanelSource, /getCurrentPlatformAiBranchRuntime/)
assert.match(settingsPanelSource, /resolvePlatformAiBranch/)
assert.match(settingsPanelSource, /platformBranch: PlatformAiBranch/)
assert.doesNotMatch(settingsPanelSource, /isWindows: boolean/)
assert.doesNotMatch(settingsPanelSource, /<PlatformAiWorkerProbePanel[^>]*isWindows=/)
assert.doesNotMatch(settingsPanelSource, /getMacOSAiBranchRuntime/)
assert.doesNotMatch(settingsPanelSource, /getWindowsAiBranchRuntime/)
assert.match(settingsPanelSource, /<PlatformAiBranchPanel branch=\{currentPlatformAiBranch\} \/>/)
assert.doesNotMatch(settingsPanelSource, /\bmacosAiBranch\b/)
assert.doesNotMatch(settingsPanelSource, /\bwindowsAiBranch\b/)
assert.match(matrixSource, /projectAiCapabilityStatusDisplay/)
assert.match(matrixSource, /projectAiRuntimeCapabilityMatrixDisplay/)
assert.match(matrixSource, /PlatformAiWorkerProbeWithRuntimeVersions/)
assert.match(matrixSource, /platformBranch: PlatformAiBranch/)
assert.doesNotMatch(matrixSource, /isWindows\??: boolean/)
assert.doesNotMatch(matrixSource, /MacOSAiWorkerProbeResult/)
assert.doesNotMatch(matrixSource, /WindowsAiWorkerProbeResult/)
assert.doesNotMatch(matrixSource, /Windows 细项能力矩阵/)
assert.doesNotMatch(matrixSource, /macOS 细项能力矩阵/)
assert.match(aiConsoleSource, /projectPlatformPythonRuntimeCompatibilityDisplay/)
assert.match(aiConsoleSource, /AiRuntimeCompatibilityDisplay/)
assert.doesNotMatch(aiConsoleSource, /projectPythonMpsCompatibilityDisplay/)
assert.doesNotMatch(aiConsoleSource, /AiRuntimePythonMpsStatusResponse/)
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
assert.doesNotMatch(settingsPanelSource, /Python CUDA 兼容性检查/)
assert.doesNotMatch(settingsPanelSource, /Python MPS 兼容性检查/)
assert.doesNotMatch(settingsPanelSource, /Python CUDA 真实执行验证/)
assert.doesNotMatch(settingsPanelSource, /Python MPS 真实执行验证/)
assert.doesNotMatch(settingsPanelSource, /Windows Worker 实时探测/)
assert.doesNotMatch(settingsPanelSource, /macOS Worker 实时探测/)
assert.doesNotMatch(settingsPanelSource, /Windows AI 分支/)
assert.doesNotMatch(settingsPanelSource, /macOS AI 分支/)
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
