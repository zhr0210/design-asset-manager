import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeOnnxModelLoadProbeResponse,
  AiRuntimePythonMpsExecutionProbeResponse,
  AiRuntimePythonMpsStatusResponse,
  AiRuntimePythonCudaStatusResponse,
  AiRuntimePythonCudaExecutionProbeResponse
} from '../contracts/ai-runtime.contract'
import type {
  AiRuntimeHealthResult,
  AiRuntimeHealthStatus,
  AiRuntimeState,
  AiRuntimeStatus
} from '../types/ai-runtime.types'
import type { LlamaInstallStatus } from '../types/llama-runtime.types'
import type {
  MacOSAiBranchRuntimeMetadata,
  AiCapabilityStatus,
  MacOSAiWorkerProbeResult
} from '../types/macos-ai-runtime.types'
import type { WindowsAiBranchRuntimeMetadata, WindowsAiWorkerProbeResult } from '../types/windows-ai-runtime.types'

export type AiRuntimeDisplayTone = 'good' | 'warn' | 'bad' | 'muted'
export type AiRuntimeStatusIcon = 'success' | 'warning' | 'activity'

export interface AiRuntimeCompatibilityDisplay {
  label: string
  tone: AiRuntimeDisplayTone
  toneClass: string
  runtimeLabel: string
  platformValue: 'compatible' | 'incompatible' | 'unknown'
  statusValue: string
  errorValue: string
}

export interface AiRuntimeModelLoadProbeDisplay {
  label: string
  tone: AiRuntimeDisplayTone
  toneClass: string
  detail: string
}

export interface LlamaRuntimeDisplay {
  running: boolean
  pillTone: AiRuntimeDisplayTone
  pillLabel: string
  routeValue: string
  routeCaption: string
  serviceValue: string
  serviceDetailValue: string
}

export interface AiCapabilityStatusDisplay {
  status: AiCapabilityStatus
  label: string
  badgeClass: string
}

export interface AiRuntimeStatusDisplay {
  status: AiRuntimeStatus | AiRuntimeHealthStatus
  label: string
  badgeClass: string
  icon: AiRuntimeStatusIcon
}

export interface AiRuntimeSummaryDisplay {
  total: number
  running: number
  issues: number
  runningLabel: string
}

export interface AiRuntimeHealthResultDisplay {
  status: AiRuntimeStatusDisplay
  messageLabel: string
}

export interface PlatformAiProbeTileDisplay {
  valueLabel: string
  captionLabel: string
}

export interface MacOSAiWorkerProbeDisplay {
  connected: boolean
  connectionLabel: string
  connectionTone: AiRuntimeDisplayTone
  platformBadgeLabel: string
  platformBadgeClass: string
  isMacOSLabel: string
  isAppleSiliconLabel: string
  clipSiglipStatusLabel: string
  mps: PlatformAiProbeTileDisplay
  onnxRuntime: PlatformAiProbeTileDisplay
  clipSiglipOnnx: PlatformAiProbeTileDisplay
}

export interface AiRuntimePlatformPanelCopy {
  compatibilityTitle: string
  compatibilityDescription: string
  compatibilityFailureMessage: string
  executionTitle: string
  executionDescription: string
  executionFailureMessage: string
  executionLastActionLabel: string
  executionBusyLabel: string
  executionButtonLabel: string
  clipSiglipCompatibilityDescription: string
  workerProbeFailureMessage: string
}

export interface AiRuntimeBranchPanelDisplay {
  title: string
  description: string
  platformBadgeLabel: string
  platformBadgeClass: string
}

export interface AiRuntimeWorkerProbePanelDisplay {
  title: string
  description: string
  platformBadgeLabel: string
  platformBadgeClass: string
  isMacOSLabel: string
  isAppleSiliconLabel: string
  clipSiglipStatusLabel: string
}

export interface AiRuntimeCapabilityMatrixDisplay {
  title: string
  description: string
}

const TONE_CLASS: Record<AiRuntimeDisplayTone, string> = {
  good: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-100 bg-amber-50 text-amber-700',
  bad: 'border-rose-100 bg-rose-50 text-rose-700',
  muted: 'border-slate-200 bg-slate-50 text-slate-500'
}

export function projectPythonMpsCompatibilityDisplay(
  status?: AiRuntimePythonMpsStatusResponse | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  if (!status) {
    return compatibilityDisplay('未检查', 'muted', 'torch.mps', 'unknown', 'unchecked', error)
  }

  if (status.compatible) {
    return compatibilityDisplay('可兼容', 'good', status.runtime ?? 'torch.mps', 'compatible', status.status, error)
  }

  const label = status.status === 'planned' ? '待补齐' : '不可用'
  return compatibilityDisplay(label, status.status === 'planned' ? 'warn' : 'bad', status.runtime ?? 'torch.mps', 'incompatible', status.status, error ?? status.error)
}

export function projectPlatformPythonRuntimeCompatibilityDisplay(
  isWindows: boolean,
  status?: AiRuntimePythonMpsStatusResponse | AiRuntimePythonCudaStatusResponse | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  return isWindows
    ? projectPythonCudaCompatibilityDisplay(status as AiRuntimePythonCudaStatusResponse, error)
    : projectPythonMpsCompatibilityDisplay(status as AiRuntimePythonMpsStatusResponse, error)
}

export function projectClipSiglipOnnxCompatibilityDisplay(
  status?: AiRuntimeClipSiglipOnnxStatusResponse | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  if (!status) {
    return compatibilityDisplay('未检查', 'muted', 'optimum.onnxruntime', 'unknown', 'unchecked', error)
  }

  if (status.compatible) {
    return compatibilityDisplay('可兼容', 'good', status.runtime ?? 'optimum.onnxruntime', 'compatible', 'onnxruntime', error)
  }

  const hasOnnxRuntime = Boolean(status.diagnostics?.onnxruntime)
  return compatibilityDisplay('待补齐', 'warn', status.runtime ?? 'optimum.onnxruntime', 'incompatible', hasOnnxRuntime ? 'onnxruntime' : 'unknown', error ?? status.error)
}

export function projectOnnxModelLoadProbeDisplay(
  probe?: AiRuntimeOnnxModelLoadProbeResponse | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  if (!probe && error) return modelLoadProbeDisplay('Worker 不可达', 'muted', '当前无法连接 AI Worker，尚未获得模型加载证据。')
  if (!probe) return modelLoadProbeDisplay('尚未验证', 'muted', '需要用户手动执行一次真实 ONNX 模型验证。')
  if (probe.status === 'loaded_real') {
    if (probe.modelFamily === 'clip') {
      return modelLoadProbeDisplay(
        '真实 Embedding 通过',
        'good',
        `${probe.providers.join(' / ') || 'ONNX Runtime'} · 合成图像与文本前向 · ${probe.embeddingDimension ?? 0} 维`
      )
    }
    return modelLoadProbeDisplay(
      '真实加载通过',
      'good',
      `${probe.providers.join(' / ') || 'ONNX Runtime'} · ${probe.inputCount} 输入 / ${probe.outputCount} 输出`
    )
  }
  if (probe.status === 'dependency_missing') {
    return modelLoadProbeDisplay('依赖缺失', 'warn', '当前 Worker 缺少 ONNX Runtime。')
  }
  if (probe.status === 'artifact_missing') {
    return modelLoadProbeDisplay('模型缺失', 'warn', `已登记的 ${probe.modelFamily === 'clip' ? 'CLIP' : 'WD Tagger'} ONNX artifact 尚未就绪。`)
  }
  if (probe.status === 'artifact_invalid') {
    return modelLoadProbeDisplay('模型无效', 'bad', `已登记的 ${probe.modelFamily === 'clip' ? 'CLIP' : 'WD Tagger'} ONNX artifact 不完整或无效。`)
  }
  return modelLoadProbeDisplay(
    probe.modelFamily === 'clip' ? 'Embedding 失败' : '加载失败',
    'bad',
    `真实 ONNX 验证失败：${probe.errorCode ?? probe.status}`
  )
}

export function projectPythonMpsExecutionProbeDisplay(
  probe?: AiRuntimePythonMpsExecutionProbeResponse | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  if (!probe && error) return modelLoadProbeDisplay('Worker 不可达', 'muted', '当前无法连接 AI Worker，尚未获得 MPS 执行证据。')
  if (!probe) return modelLoadProbeDisplay('尚未验证', 'muted', '需要用户手动执行一次固定的 MPS 张量运算。')
  if (probe.status === 'executed_real') {
    return modelLoadProbeDisplay('真实执行通过', 'good', `${probe.runtime ?? 'torch.mps'} · 固定张量运算完成`)
  }
  if (probe.status === 'dependency_missing') {
    return modelLoadProbeDisplay('依赖缺失', 'warn', '当前 Worker 缺少 PyTorch。')
  }
  if (probe.status === 'backend_unavailable') {
    return modelLoadProbeDisplay('后端不可用', 'warn', 'PyTorch 已存在，但当前设备无法使用 MPS。')
  }
  if (probe.status === 'unsupported') {
    return modelLoadProbeDisplay('平台不支持', 'muted', 'MPS 真实执行仅适用于 macOS。')
  }
  return modelLoadProbeDisplay('执行失败', 'bad', `MPS 张量执行失败：${probe.errorCode ?? probe.status}`)
}

export function projectPlatformPythonRuntimeExecutionProbeDisplay(
  isWindows: boolean,
  probe?: AiRuntimePythonMpsExecutionProbeResponse | AiRuntimePythonCudaExecutionProbeResponse | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  return isWindows
    ? projectPythonCudaExecutionProbeDisplay(probe as AiRuntimePythonCudaExecutionProbeResponse, error)
    : projectPythonMpsExecutionProbeDisplay(probe as AiRuntimePythonMpsExecutionProbeResponse, error)
}

export function projectAiRuntimePlatformPanelCopy(isWindows: boolean): AiRuntimePlatformPanelCopy {
  if (isWindows) {
    return {
      compatibilityTitle: 'Python CUDA 兼容性检查',
      compatibilityDescription: '这个检查器会确认 PyTorch CUDA、torchvision、transformers 与小模型家族是否已经具备可用的 Windows 兼容性。',
      compatibilityFailureMessage: '读取 Python CUDA 兼容性失败。',
      executionTitle: 'Python CUDA 真实执行验证',
      executionDescription: '手动执行一次固定张量运算。该结果只证明 torch.cuda 可执行，不代表任何模型已经加载或完成推理。',
      executionFailureMessage: 'CUDA 真实执行验证失败。',
      executionLastActionLabel: 'Python CUDA 真实执行验证',
      executionBusyLabel: '正在验证...',
      executionButtonLabel: '验证 CUDA 执行',
      clipSiglipCompatibilityDescription: '这个检查器会确认本地 Python 依赖和 ONNX 图结构是否足以支撑 Windows 的 embedding 路线。',
      workerProbeFailureMessage: '读取 Windows Worker 能力失败。'
    }
  }

  return {
    compatibilityTitle: 'Python MPS 兼容性检查',
    compatibilityDescription: '这个检查器会确认 PyTorch MPS、torchvision、transformers 与小模型家族是否已经具备可用的 macOS 兼容性。',
    compatibilityFailureMessage: '读取 Python MPS 兼容性失败。',
    executionTitle: 'Python MPS 真实执行验证',
    executionDescription: '手动执行一次固定张量运算。该结果只证明 torch.mps 可执行，不代表任何模型已经加载或完成推理。',
    executionFailureMessage: 'MPS 真实执行验证失败。',
    executionLastActionLabel: 'Python MPS 真实执行验证',
    executionBusyLabel: '正在验证...',
    executionButtonLabel: '验证 MPS 执行',
    clipSiglipCompatibilityDescription: '这个检查器会确认本地 Python 依赖和 ONNX 图结构是否足以支撑 macOS 的 embedding 路线。',
    workerProbeFailureMessage: '读取 macOS Worker 能力失败。'
  }
}

export function projectLlamaRuntimeDisplay(
  status?: LlamaInstallStatus | null,
  runningOverride?: boolean | null
): LlamaRuntimeDisplay {
  const running = typeof runningOverride === 'boolean'
    ? runningOverride
    : Boolean(status?.serverRunning || status?.serverPid)
  const phase = status?.phase || '已停止'

  if (running) {
    const firstModel = status?.serverModels?.slice(0, 1).join('') || 'llama-server'
    return {
      running: true,
      pillTone: 'good',
      pillLabel: '运行中',
      routeValue: '运行中',
      routeCaption: `${firstModel} 健康检查通过`,
      serviceValue: '运行中',
      serviceDetailValue: status?.serverPid ? `进程 PID ${status.serverPid}` : '运行中'
    }
  }

  if (status?.phase === 'error') {
    return {
      running: false,
      pillTone: 'bad',
      pillLabel: '异常',
      routeValue: 'error',
      routeCaption: status.error?.message || 'llama.app / llama.cpp Metal / Ollama',
      serviceValue: 'error',
      serviceDetailValue: 'error'
    }
  }

  return {
    running: false,
    pillTone: 'muted',
    pillLabel: '已停止',
    routeValue: phase || '未启动',
    routeCaption: status?.serverPid ? `PID ${status.serverPid}` : 'llama.app / llama.cpp Metal / Ollama',
    serviceValue: phase || '未运行',
    serviceDetailValue: phase || '已停止'
  }
}

export function projectAiCapabilityStatusDisplay(
  status?: AiCapabilityStatus | null
): AiCapabilityStatusDisplay {
  const normalized = normalizeAiCapabilityStatus(status)
  const labels: Record<AiCapabilityStatus, string> = {
    ready: '就绪',
    optional: '依赖可用',
    planned: '尚未实现',
    evidence_insufficient: '证据不足',
    dependency_missing: '依赖缺失',
    fallback: '回退路线',
    unavailable: '不可用'
  }
  const badgeClasses: Record<AiCapabilityStatus, string> = {
    ready: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    optional: 'border-sky-100 bg-sky-50 text-sky-700',
    planned: 'border-amber-100 bg-amber-50 text-amber-700',
    evidence_insufficient: 'border-slate-200 bg-slate-50 text-slate-500',
    dependency_missing: 'border-amber-100 bg-amber-50 text-amber-700',
    fallback: 'border-slate-200 bg-slate-50 text-slate-600',
    unavailable: 'border-rose-100 bg-rose-50 text-rose-700'
  }

  return {
    status: normalized,
    label: labels[normalized],
    badgeClass: badgeClasses[normalized]
  }
}

export function projectAiRuntimeStatusDisplay(
  status?: AiRuntimeStatus | AiRuntimeHealthStatus | null
): AiRuntimeStatusDisplay {
  const normalized = normalizeAiRuntimeDisplayStatus(status)
  const labels: Record<AiRuntimeStatus | AiRuntimeHealthStatus, string> = {
    idle: '空闲',
    starting: '启动中',
    running: '运行中',
    stopping: '停止中',
    stopped: '已停止',
    unhealthy: '异常',
    failed: '失败',
    disabled: '已禁用',
    ok: '正常',
    warning: '提醒',
    error: '错误',
    unknown: '未知'
  }
  const badgeClasses: Record<AiRuntimeStatus | AiRuntimeHealthStatus, string> = {
    idle: 'border-slate-200 bg-slate-50 text-slate-500',
    starting: 'border-brand-100 bg-brand-50 text-brand-600',
    running: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    stopping: 'border-amber-100 bg-amber-50 text-amber-700',
    stopped: 'border-slate-200 bg-slate-50 text-slate-500',
    unhealthy: 'border-amber-100 bg-amber-50 text-amber-700',
    failed: 'border-rose-100 bg-rose-50 text-rose-700',
    disabled: 'border-slate-200 bg-slate-100 text-slate-500',
    ok: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
    error: 'border-rose-100 bg-rose-50 text-rose-700',
    unknown: 'border-slate-200 bg-slate-50 text-slate-500'
  }

  return {
    status: normalized,
    label: labels[normalized],
    badgeClass: badgeClasses[normalized],
    icon: normalized === 'running' || normalized === 'ok'
      ? 'success'
      : normalized === 'failed' || normalized === 'error' || normalized === 'unhealthy' || normalized === 'warning'
        ? 'warning'
        : 'activity'
  }
}

export function projectAiRuntimeSummaryDisplay(
  runtimes?: readonly AiRuntimeState[] | null
): AiRuntimeSummaryDisplay {
  const states = runtimes ?? []
  const running = states.filter((runtime) => runtime.status === 'running').length
  const issues = states.filter((runtime) => runtime.status === 'failed' || runtime.status === 'unhealthy').length

  return {
    total: states.length,
    running,
    issues,
    runningLabel: `${running}/${states.length} 运行中`
  }
}

export function projectAiRuntimeHealthResultDisplay(
  result: AiRuntimeHealthResult
): AiRuntimeHealthResultDisplay {
  const status = projectAiRuntimeStatusDisplay(result.status)
  return {
    status,
    messageLabel: `${result.message || status.label} (${result.durationMs}ms)`
  }
}

export function projectMacOSAiWorkerProbeDisplay(
  probe?: MacOSAiWorkerProbeResult | null
): MacOSAiWorkerProbeDisplay {
  if (!probe) {
    const unchecked = { valueLabel: '尚未探测', captionLabel: '尚未探测' }
    return {
      connected: false,
      connectionLabel: '等待探测',
      connectionTone: 'muted',
      platformBadgeLabel: '等待探测',
      platformBadgeClass: 'border-slate-200 bg-white text-slate-500',
      isMacOSLabel: 'unknown',
      isAppleSiliconLabel: 'unknown',
      clipSiglipStatusLabel: '证据不足',
      mps: unchecked,
      onnxRuntime: unchecked,
      clipSiglipOnnx: unchecked
    }
  }

  const connected = probe.isMacOS
  const clipSiglipStatus = projectAiCapabilityStatusDisplay(probe.clipSiglipOnnx.status)
  return {
    connected,
    connectionLabel: connected ? 'macOS 探测已连接' : '等待探测',
    connectionTone: connected ? 'good' : 'muted',
    platformBadgeLabel: `${probe.platform}/${probe.machine}`,
    platformBadgeClass: connected
      ? 'border-indigo-100 bg-white text-indigo-700'
      : 'border-slate-200 bg-white text-slate-500',
    isMacOSLabel: probe.isMacOS ? 'yes' : 'no',
    isAppleSiliconLabel: probe.isAppleSilicon ? 'yes' : 'no',
    clipSiglipStatusLabel: clipSiglipStatus.label,
    mps: {
      valueLabel: probe.torch.mpsAvailable ? '可用' : probe.torch.cpuFallback ? 'CPU 回退' : '依赖缺失',
      captionLabel: probe.torch.version ? `torch ${probe.torch.version}` : '已探测，未报告版本'
    },
    onnxRuntime: {
      valueLabel: probe.onnxruntime.available ? '可用' : '依赖缺失',
      captionLabel: probe.onnxruntime.providers.join(' / ') || '已探测，未报告 Provider'
    },
    clipSiglipOnnx: {
      valueLabel: clipSiglipStatus.label,
      captionLabel: probe.clipSiglipOnnx.version
        ? `${probe.clipSiglipOnnx.backend ?? 'optimum'} ${probe.clipSiglipOnnx.version}`
        : '已探测，未报告版本'
    }
  }
}

export function normalizeAiCapabilityStatus(
  status?: AiCapabilityStatus | null
): AiCapabilityStatus {
  return status === 'ready'
    || status === 'optional'
    || status === 'planned'
    || status === 'evidence_insufficient'
    || status === 'dependency_missing'
    || status === 'fallback'
    || status === 'unavailable'
    ? status
    : 'unavailable'
}

function normalizeAiRuntimeDisplayStatus(
  status?: AiRuntimeStatus | AiRuntimeHealthStatus | null
): AiRuntimeStatus | AiRuntimeHealthStatus {
  return status === 'idle'
    || status === 'starting'
    || status === 'running'
    || status === 'stopping'
    || status === 'stopped'
    || status === 'unhealthy'
    || status === 'failed'
    || status === 'disabled'
    || status === 'ok'
    || status === 'warning'
    || status === 'error'
    || status === 'unknown'
    ? status
    : 'unknown'
}

function compatibilityDisplay(
  label: string,
  tone: AiRuntimeDisplayTone,
  runtimeLabel: string,
  platformValue: AiRuntimeCompatibilityDisplay['platformValue'],
  statusValue: string,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  return {
    label,
    tone,
    toneClass: TONE_CLASS[tone],
    runtimeLabel,
    platformValue,
    statusValue,
    errorValue: error ?? 'None'
  }
}

function modelLoadProbeDisplay(
  label: string,
  tone: AiRuntimeDisplayTone,
  detail: string
): AiRuntimeModelLoadProbeDisplay {
  return {
    label,
    tone,
    toneClass: TONE_CLASS[tone],
    detail
  }
}

const AI_RUNTIME_INFO_LABELS: Record<string, string> = {
  active: '当前运行时',
  total: '总数',
  running: '运行中',
  issues: '问题',
  displayName: '显示名称',
  baseUrl: '服务地址',
  lastCheck: '最近检查',
  pid: '进程 PID',
  error: '错误',
  platform: '平台',
  machine: '机器架构',
  isMacOS: 'macOS',
  isAppleSilicon: 'Apple Silicon',
  clipSiglipOnnx: 'CLIP/SigLIP ONNX'
}

export function projectAiRuntimeInfoLabel(label: string): string {
  return AI_RUNTIME_INFO_LABELS[label] ?? label
}

export function projectAiRuntimeDisplayValue(value: string): string {
  if (value === 'None') return '无'
  if (value === 'Never') return '从未检查'
  if (value === 'unknown') return '未知'
  return value
}

export function projectAiRuntimeActionLabel(label: string): string {
  return {
    'Set active': '设为当前',
    Start: '启动',
    Stop: '停止',
    Restart: '重启',
    'Health check': '健康检查',
    'Health check all': '全部健康检查'
  }[label] ?? label
}

export function isMacOSAiBranchMetadata(value: unknown): value is MacOSAiBranchRuntimeMetadata {
  return Boolean(value && typeof value === 'object' && (value as { marker?: unknown }).marker === 'macos-ai-branch' && Array.isArray((value as { lanes?: unknown }).lanes))
}

export function getMacOSAiBranchRuntime(runtimes: AiRuntimeState[]): MacOSAiBranchRuntimeMetadata | null {
  for (const runtime of runtimes) {
    const branch = runtime.metadata?.macosAiBranch
    if (isMacOSAiBranchMetadata(branch)) return branch
  }
  return null
}

export function isWindowsAiBranchMetadata(value: unknown): value is WindowsAiBranchRuntimeMetadata {
  return Boolean(value && typeof value === 'object' && (value as { marker?: unknown }).marker === 'windows-ai-branch' && Array.isArray((value as { lanes?: unknown }).lanes))
}

export function getWindowsAiBranchRuntime(runtimes: AiRuntimeState[]): WindowsAiBranchRuntimeMetadata | null {
  for (const runtime of runtimes) {
    const branch = runtime.metadata?.windowsAiBranch
    if (isWindowsAiBranchMetadata(branch)) return branch
  }
  return null
}

export function projectAiRuntimeBranchPanelDisplay(
  branch: MacOSAiBranchRuntimeMetadata | WindowsAiBranchRuntimeMetadata
): AiRuntimeBranchPanelDisplay {
  const isWindows = branch.marker === 'windows-ai-branch'
  const routeSummary = isWindows
    ? 'Python CUDA、ONNX Runtime 与 Llama 三条路线的架构定义；未经过实时探测的条目统一显示为证据不足。'
    : 'Python MPS、ONNX Runtime 与 Llama 三条路线的架构定义；未经 macOS 实时探测的条目统一显示为证据不足。'

  return {
    title: isWindows ? 'Windows AI 分支' : 'macOS AI 分支',
    description: `${routeSummary} 当前阶段：${branch.phase} / ${branch.platform}/${branch.arch}`,
    platformBadgeLabel: branch.isCurrentPlatform ? '当前平台' : '非当前平台',
    platformBadgeClass: branch.isCurrentPlatform
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-white text-slate-500'
  }
}

export function projectPythonCudaCompatibilityDisplay(
  status?: AiRuntimePythonCudaStatusResponse | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  if (!status) {
    return compatibilityDisplay('未检查', 'muted', 'torch.cuda', 'unknown', 'unchecked', error)
  }

  if (status.compatible) {
    return compatibilityDisplay('可兼容', 'good', status.runtime ?? 'torch.cuda', 'compatible', status.status, error)
  }

  const label = status.status === 'planned' ? '待补齐' : '不可用'
  return compatibilityDisplay(label, status.status === 'planned' ? 'warn' : 'bad', status.runtime ?? 'torch.cuda', 'incompatible', status.status, error ?? status.error)
}

export function projectPythonCudaExecutionProbeDisplay(
  probe?: AiRuntimePythonCudaExecutionProbeResponse | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  if (!probe && error) return modelLoadProbeDisplay('Worker 不可达', 'muted', '当前无法连接 AI Worker，尚未获得 CUDA 执行证据。')
  if (!probe) return modelLoadProbeDisplay('尚未验证', 'muted', '需要用户手动执行一次固定的 CUDA 张量运算。')
  if (probe.status === 'executed_real') {
    return modelLoadProbeDisplay('真实执行通过', 'good', `${probe.runtime ?? 'torch.cuda'} · 固定张量运算完成`)
  }
  if (probe.status === 'dependency_missing') {
    return modelLoadProbeDisplay('依赖缺失', 'warn', '当前 Worker 缺少 PyTorch。')
  }
  if (probe.status === 'backend_unavailable') {
    return modelLoadProbeDisplay('后端不可用', 'warn', 'PyTorch 已存在，但当前设备无法使用 CUDA。')
  }
  if (probe.status === 'unsupported') {
    return modelLoadProbeDisplay('平台不支持', 'muted', 'CUDA 真实执行仅适用于 Windows。')
  }
  return modelLoadProbeDisplay('执行失败', 'bad', `CUDA 张量执行失败：${probe.errorCode ?? probe.status}`)
}

export interface WindowsAiWorkerProbeDisplay {
  connected: boolean
  connectionLabel: string
  connectionTone: AiRuntimeDisplayTone
  platformBadgeLabel: string
  platformBadgeClass: string
  isMacOSLabel: string
  isAppleSiliconLabel: string
  clipSiglipStatusLabel: string
  cuda: PlatformAiProbeTileDisplay
  onnxRuntime: PlatformAiProbeTileDisplay
  clipSiglipOnnx: PlatformAiProbeTileDisplay
}

export function projectWindowsAiWorkerProbeDisplay(
  probe?: WindowsAiWorkerProbeResult | null
): WindowsAiWorkerProbeDisplay {
  if (!probe) {
    const unchecked = { valueLabel: '尚未探测', captionLabel: '尚未探测' }
    return {
      connected: false,
      connectionLabel: '等待探测',
      connectionTone: 'muted',
      platformBadgeLabel: '等待探测',
      platformBadgeClass: 'border-slate-200 bg-white text-slate-500',
      isMacOSLabel: 'unknown',
      isAppleSiliconLabel: 'unknown',
      clipSiglipStatusLabel: '证据不足',
      cuda: unchecked,
      onnxRuntime: unchecked,
      clipSiglipOnnx: unchecked
    }
  }

  const connected = probe.platform === 'win32' || probe.platform === 'windows'
  const clipSiglipStatus = projectAiCapabilityStatusDisplay(probe.clipSiglipOnnx.status)
  return {
    connected,
    connectionLabel: connected ? 'Windows 探测已连接' : '等待探测',
    connectionTone: connected ? 'good' : 'muted',
    platformBadgeLabel: `${probe.platform}/${probe.machine}`,
    platformBadgeClass: connected
      ? 'border-indigo-100 bg-white text-indigo-700'
      : 'border-slate-200 bg-white text-slate-500',
    isMacOSLabel: probe.isMacOS ? 'yes' : 'no',
    isAppleSiliconLabel: probe.isAppleSilicon ? 'yes' : 'no',
    clipSiglipStatusLabel: clipSiglipStatus.label,
    cuda: {
      valueLabel: probe.torch.cudaAvailable ? '可用' : probe.torch.cpuFallback ? 'CPU 回退' : '依赖缺失',
      captionLabel: probe.torch.version ? `torch ${probe.torch.version}` : '已探测，未报告版本'
    },
    onnxRuntime: {
      valueLabel: probe.onnxruntime.available ? '可用' : '依赖缺失',
      captionLabel: probe.onnxruntime.providers.join(' / ') || '已探测，未报告 Provider'
    },
    clipSiglipOnnx: {
      valueLabel: clipSiglipStatus.label,
      captionLabel: probe.clipSiglipOnnx.version
        ? `${probe.clipSiglipOnnx.backend ?? 'optimum'} ${probe.clipSiglipOnnx.version}`
        : '已探测，未报告版本'
    }
  }
}

export function projectAiRuntimeWorkerProbePanelDisplay(
  isWindows: boolean,
  probe?: MacOSAiWorkerProbeResult | WindowsAiWorkerProbeResult | null
): AiRuntimeWorkerProbePanelDisplay {
  if (isWindows) {
    const display = projectWindowsAiWorkerProbeDisplay(probe as WindowsAiWorkerProbeResult)
    return {
      title: 'Windows Worker 实时探测',
      description: '这里显示 Python Worker 当前探测到的 CUDA 和 ONNX Runtime 状态，帮助确认真实运行时能力是否已经可用。',
      platformBadgeLabel: display.platformBadgeLabel,
      platformBadgeClass: display.platformBadgeClass,
      isMacOSLabel: display.isMacOSLabel,
      isAppleSiliconLabel: display.isAppleSiliconLabel,
      clipSiglipStatusLabel: display.clipSiglipStatusLabel
    }
  }

  const display = projectMacOSAiWorkerProbeDisplay(probe as MacOSAiWorkerProbeResult)
  return {
    title: 'macOS Worker 实时探测',
    description: '这里显示 Python Worker 当前探测到的 MPS 和 ONNX Runtime 状态，帮助确认真实运行时能力是否已经可用。',
    platformBadgeLabel: display.platformBadgeLabel,
    platformBadgeClass: display.platformBadgeClass,
    isMacOSLabel: display.isMacOSLabel,
    isAppleSiliconLabel: display.isAppleSiliconLabel,
    clipSiglipStatusLabel: display.clipSiglipStatusLabel
  }
}

export function projectAiRuntimeCapabilityMatrixDisplay(isWindows?: boolean): AiRuntimeCapabilityMatrixDisplay {
  return {
    title: isWindows ? 'Windows 细项能力矩阵' : 'macOS 细项能力矩阵',
    description: '区分依赖可用、依赖缺失、证据不足与真正尚未实现的路线，避免把探测缺口误报为功能规划。'
  }
}
