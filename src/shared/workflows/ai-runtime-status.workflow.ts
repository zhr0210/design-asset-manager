import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeOnnxModelLoadProbeResponse,
  AiRuntimePythonCompatibilityStatusResponseBase,
  AiRuntimePythonExecutionProbeResponseBase
} from '../contracts/ai-runtime.contract'
import type {
  AiRuntimeHealthResult,
  AiRuntimeHealthStatus,
  AiRuntimeState,
  AiRuntimeStatus
} from '../types/ai-runtime.types'
import type { LlamaInstallStatus } from '../types/llama-runtime.types'
import type {
  AiCapabilityStatus,
  PlatformAiBranchRuntimeMetadata,
  PlatformAiWorkerProbeDiagnosticsInput,
  PlatformAiWorkerProbeResultBase,
  PlatformAiWorkerProbeWithRuntimeVersions
} from '../types/platform-ai-runtime.types'
import type { PlatformAiBranch } from '../types/platform-ai-branch-status.types'

export type AiRuntimeDisplayTone = 'good' | 'warn' | 'bad' | 'muted'
export type AiRuntimeStatusIcon = 'success' | 'warning' | 'activity'

export const DEFAULT_PLATFORM_AI_BRANCH: PlatformAiBranch = 'macos'

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

export interface PlatformAiWorkerProbeHeaderDisplay {
  connected: boolean
  connectionLabel: string
  connectionTone: AiRuntimeDisplayTone
  platformBadgeLabel: string
  platformBadgeClass: string
  isMacOSLabel: string
  isAppleSiliconLabel: string
  clipSiglipStatusLabel: string
}

export interface PlatformAiWorkerProbeDiagnosticsDisplay extends PlatformAiWorkerProbeHeaderDisplay {
  accelerator: PlatformAiProbeTileDisplay
  onnxRuntime: PlatformAiProbeTileDisplay
  clipSiglipOnnx: PlatformAiProbeTileDisplay
}

export interface PlatformAiWorkerProbeDiagnosticsSelection {
  platformBranch: PlatformAiBranch
  probe: PlatformAiWorkerProbeWithRuntimeVersions | null
  display: PlatformAiWorkerProbeDiagnosticsDisplay
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

export interface AiRuntimeWorkerProbePanelDisplay extends PlatformAiWorkerProbeHeaderDisplay {
  title: string
  description: string
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

interface PythonRuntimeDisplayCopy {
  runtimeLabel: string
  acceleratorLabel: string
  supportedPlatformLabel: string
}

interface PlatformAiSurfaceCopy {
  branchTitle: string
  branchRouteSummary: string
  capabilityMatrixTitle: string
  connectedLabel: string
  panelTitle: string
  panelDescription: string
  runtimePanel: AiRuntimePlatformPanelCopy
}

const PYTHON_RUNTIME_DISPLAY_COPY: Record<PlatformAiBranch, PythonRuntimeDisplayCopy> = {
  macos: {
    runtimeLabel: 'torch.mps',
    acceleratorLabel: 'MPS',
    supportedPlatformLabel: 'macOS'
  },
  windows: {
    runtimeLabel: 'torch.cuda',
    acceleratorLabel: 'CUDA',
    supportedPlatformLabel: 'Windows'
  }
}

const PLATFORM_AI_SURFACE_COPY: Record<PlatformAiBranch, PlatformAiSurfaceCopy> = {
  macos: {
    branchTitle: 'macOS AI 分支',
    branchRouteSummary: 'Python MPS、ONNX Runtime 与 Llama 三条路线的架构定义；未经 macOS 实时探测的条目统一显示为证据不足。',
    capabilityMatrixTitle: 'macOS 细项能力矩阵',
    connectedLabel: 'macOS 探测已连接',
    panelTitle: 'macOS Worker 实时探测',
    panelDescription: '这里显示 Python Worker 当前探测到的 MPS 和 ONNX Runtime 状态，帮助确认真实运行时能力是否已经可用。',
    runtimePanel: {
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
  },
  windows: {
    branchTitle: 'Windows AI 分支',
    branchRouteSummary: 'Python CUDA、ONNX Runtime 与 Llama 三条路线的架构定义；未经过实时探测的条目统一显示为证据不足。',
    capabilityMatrixTitle: 'Windows 细项能力矩阵',
    connectedLabel: 'Windows 探测已连接',
    panelTitle: 'Windows Worker 实时探测',
    panelDescription: '这里显示 Python Worker 当前探测到的 CUDA 和 ONNX Runtime 状态，帮助确认真实运行时能力是否已经可用。',
    runtimePanel: {
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
}

function projectPythonRuntimeCompatibilityDisplay(
  platformBranch: PlatformAiBranch,
  status?: AiRuntimePythonCompatibilityStatusResponseBase | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  const { runtimeLabel } = PYTHON_RUNTIME_DISPLAY_COPY[platformBranch]

  if (!status) {
    return compatibilityDisplay('未检查', 'muted', runtimeLabel, 'unknown', 'unchecked', error)
  }

  if (status.compatible) {
    return compatibilityDisplay('可兼容', 'good', status.runtime ?? runtimeLabel, 'compatible', status.status, error)
  }

  const label = status.status === 'planned' ? '待补齐' : '不可用'
  return compatibilityDisplay(
    label,
    status.status === 'planned' ? 'warn' : 'bad',
    status.runtime ?? runtimeLabel,
    'incompatible',
    status.status,
    error ?? status.error
  )
}

function projectPythonRuntimeExecutionProbeDisplay(
  platformBranch: PlatformAiBranch,
  probe?: AiRuntimePythonExecutionProbeResponseBase | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  const {
    runtimeLabel,
    acceleratorLabel,
    supportedPlatformLabel
  } = PYTHON_RUNTIME_DISPLAY_COPY[platformBranch]

  if (!probe && error) {
    return modelLoadProbeDisplay(
      'Worker 不可达',
      'muted',
      `当前无法连接 AI Worker，尚未获得 ${acceleratorLabel} 执行证据。`
    )
  }
  if (!probe) {
    return modelLoadProbeDisplay(
      '尚未验证',
      'muted',
      `需要用户手动执行一次固定的 ${acceleratorLabel} 张量运算。`
    )
  }
  if (probe.status === 'executed_real') {
    return modelLoadProbeDisplay('真实执行通过', 'good', `${probe.runtime ?? runtimeLabel} · 固定张量运算完成`)
  }
  if (probe.status === 'dependency_missing') {
    return modelLoadProbeDisplay('依赖缺失', 'warn', '当前 Worker 缺少 PyTorch。')
  }
  if (probe.status === 'backend_unavailable') {
    return modelLoadProbeDisplay('后端不可用', 'warn', `PyTorch 已存在，但当前设备无法使用 ${acceleratorLabel}。`)
  }
  if (probe.status === 'unsupported') {
    return modelLoadProbeDisplay('平台不支持', 'muted', `${acceleratorLabel} 真实执行仅适用于 ${supportedPlatformLabel}。`)
  }
  return modelLoadProbeDisplay(
    '执行失败',
    'bad',
    `${acceleratorLabel} 张量执行失败：${probe.errorCode ?? probe.status}`
  )
}

export function projectPythonMpsCompatibilityDisplay(
  status?: AiRuntimePythonCompatibilityStatusResponseBase | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  return projectPythonRuntimeCompatibilityDisplay('macos', status, error)
}

export function projectPlatformPythonRuntimeCompatibilityDisplay(
  platformBranch: PlatformAiBranch,
  status?: AiRuntimePythonCompatibilityStatusResponseBase | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  return projectPythonRuntimeCompatibilityDisplay(platformBranch, status, error)
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
  probe?: AiRuntimePythonExecutionProbeResponseBase | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  return projectPythonRuntimeExecutionProbeDisplay('macos', probe, error)
}

export function projectPlatformPythonRuntimeExecutionProbeDisplay(
  platformBranch: PlatformAiBranch,
  probe?: AiRuntimePythonExecutionProbeResponseBase | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  return projectPythonRuntimeExecutionProbeDisplay(platformBranch, probe, error)
}

export function projectAiRuntimePlatformPanelCopy(platformBranch: PlatformAiBranch): AiRuntimePlatformPanelCopy {
  return PLATFORM_AI_SURFACE_COPY[platformBranch].runtimePanel
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

function projectPlatformAiWorkerProbeHeaderDisplay(
  probe: Pick<PlatformAiWorkerProbeResultBase, 'platform' | 'machine' | 'isMacOS' | 'isAppleSilicon' | 'clipSiglipOnnx'> | null,
  connected: boolean,
  connectedLabel: string
): PlatformAiWorkerProbeHeaderDisplay {
  if (!probe) {
    return {
      connected: false,
      connectionLabel: '等待探测',
      connectionTone: 'muted',
      platformBadgeLabel: '等待探测',
      platformBadgeClass: 'border-slate-200 bg-white text-slate-500',
      isMacOSLabel: 'unknown',
      isAppleSiliconLabel: 'unknown',
      clipSiglipStatusLabel: '证据不足'
    }
  }

  const clipSiglipStatus = projectAiCapabilityStatusDisplay(probe.clipSiglipOnnx.status)
  return {
    connected,
    connectionLabel: connected ? connectedLabel : '等待探测',
    connectionTone: connected ? 'good' : 'muted',
    platformBadgeLabel: `${probe.platform}/${probe.machine}`,
    platformBadgeClass: connected
      ? 'border-indigo-100 bg-white text-indigo-700'
      : 'border-slate-200 bg-white text-slate-500',
    isMacOSLabel: probe.isMacOS ? 'yes' : 'no',
    isAppleSiliconLabel: probe.isAppleSilicon ? 'yes' : 'no',
    clipSiglipStatusLabel: clipSiglipStatus.label
  }
}

interface PlatformAiWorkerProbeAccessors {
  isConnected: (probe: Pick<PlatformAiWorkerProbeResultBase, 'platform' | 'isMacOS'>) => boolean
  isAcceleratorAvailable: (probe: PlatformAiWorkerProbeDiagnosticsInput) => boolean
}

const PLATFORM_AI_WORKER_PROBE_ACCESSORS: Record<PlatformAiBranch, PlatformAiWorkerProbeAccessors> = {
  macos: {
    isConnected: (probe) => probe.isMacOS,
    isAcceleratorAvailable: (probe) => Boolean(probe.torch.mpsAvailable)
  },
  windows: {
    isConnected: (probe) => probe.platform === 'win32' || probe.platform === 'windows',
    isAcceleratorAvailable: (probe) => Boolean(probe.torch.cudaAvailable)
  }
}

function isPlatformAiWorkerProbeConnected(
  platformBranch: PlatformAiBranch,
  probe?: Pick<PlatformAiWorkerProbeResultBase, 'platform' | 'isMacOS'> | null
): boolean {
  if (!probe) return false
  return PLATFORM_AI_WORKER_PROBE_ACCESSORS[platformBranch].isConnected(probe)
}

export function projectPlatformAiWorkerProbeDiagnosticsDisplay(
  platformBranch: PlatformAiBranch,
  probe?: PlatformAiWorkerProbeDiagnosticsInput | null
): PlatformAiWorkerProbeDiagnosticsDisplay {
  const { connectedLabel } = PLATFORM_AI_SURFACE_COPY[platformBranch]

  if (!probe) {
    const unchecked = { valueLabel: '尚未探测', captionLabel: '尚未探测' }
    return {
      ...projectPlatformAiWorkerProbeHeaderDisplay(null, false, connectedLabel),
      accelerator: unchecked,
      onnxRuntime: unchecked,
      clipSiglipOnnx: unchecked
    }
  }

  const connected = isPlatformAiWorkerProbeConnected(platformBranch, probe)
  const clipSiglipStatus = projectAiCapabilityStatusDisplay(probe.clipSiglipOnnx.status)
  const acceleratorAvailable = PLATFORM_AI_WORKER_PROBE_ACCESSORS[platformBranch]
    .isAcceleratorAvailable(probe)

  return {
    ...projectPlatformAiWorkerProbeHeaderDisplay(probe, connected, connectedLabel),
    accelerator: {
      valueLabel: acceleratorAvailable ? '可用' : probe.torch.cpuFallback ? 'CPU 回退' : '依赖缺失',
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

type PlatformAiBranchRuntimeMarker = 'macos-ai-branch' | 'windows-ai-branch'
type PlatformAiBranchRuntimeMetadataKey = 'macosAiBranch' | 'windowsAiBranch'

interface PlatformAiBranchRuntimeDescriptor {
  metadataKey: PlatformAiBranchRuntimeMetadataKey
  marker: PlatformAiBranchRuntimeMarker
}

const PLATFORM_AI_BRANCH_RUNTIME_DESCRIPTORS: Record<PlatformAiBranch, PlatformAiBranchRuntimeDescriptor> = {
  macos: {
    metadataKey: 'macosAiBranch',
    marker: 'macos-ai-branch'
  },
  windows: {
    metadataKey: 'windowsAiBranch',
    marker: 'windows-ai-branch'
  }
}

const CURRENT_PLATFORM_AI_BRANCH_PRIORITY: PlatformAiBranch[] = ['windows', 'macos']

const PLATFORM_AI_BRANCH_BY_MARKER: Record<PlatformAiBranchRuntimeMarker, PlatformAiBranch> = {
  'macos-ai-branch': 'macos',
  'windows-ai-branch': 'windows'
}

function isPlatformAiBranchMetadata(
  value: unknown,
  marker: PlatformAiBranchRuntimeMarker
): value is PlatformAiBranchRuntimeMetadata {
  if (!value || typeof value !== 'object') return false
  const branch = value as Partial<PlatformAiBranchRuntimeMetadata>
  return branch.marker === marker
    && typeof branch.phase === 'string'
    && typeof branch.platform === 'string'
    && typeof branch.arch === 'string'
    && typeof branch.isCurrentPlatform === 'boolean'
    && Array.isArray(branch.lanes)
    && Array.isArray(branch.warnings)
}

function getPlatformAiBranchRuntime(
  runtimes: AiRuntimeState[],
  descriptor: PlatformAiBranchRuntimeDescriptor
): PlatformAiBranchRuntimeMetadata | null {
  for (const runtime of runtimes) {
    const branch = runtime.metadata?.[descriptor.metadataKey]
    if (isPlatformAiBranchMetadata(branch, descriptor.marker)) return branch
  }
  return null
}

export function getCurrentPlatformAiBranchRuntime(
  runtimes: AiRuntimeState[]
): PlatformAiBranchRuntimeMetadata | null {
  for (const platformBranch of CURRENT_PLATFORM_AI_BRANCH_PRIORITY) {
    const branch = getPlatformAiBranchRuntime(
      runtimes,
      PLATFORM_AI_BRANCH_RUNTIME_DESCRIPTORS[platformBranch]
    )
    if (branch?.isCurrentPlatform) return branch
  }
  return null
}

export function resolvePlatformAiBranch(
  branch?: PlatformAiBranchRuntimeMetadata | null
): PlatformAiBranch {
  return branch?.marker
    ? PLATFORM_AI_BRANCH_BY_MARKER[branch.marker as PlatformAiBranchRuntimeMarker] ?? DEFAULT_PLATFORM_AI_BRANCH
    : DEFAULT_PLATFORM_AI_BRANCH
}

export function projectAiRuntimeBranchPanelDisplay(
  branch: PlatformAiBranchRuntimeMetadata
): AiRuntimeBranchPanelDisplay {
  const copy = PLATFORM_AI_SURFACE_COPY[resolvePlatformAiBranch(branch)]

  return {
    title: copy.branchTitle,
    description: `${copy.branchRouteSummary} 当前阶段：${branch.phase} / ${branch.platform}/${branch.arch}`,
    platformBadgeLabel: branch.isCurrentPlatform ? '当前平台' : '非当前平台',
    platformBadgeClass: branch.isCurrentPlatform
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-white text-slate-500'
  }
}

export function projectPythonCudaCompatibilityDisplay(
  status?: AiRuntimePythonCompatibilityStatusResponseBase | null,
  error?: string | null
): AiRuntimeCompatibilityDisplay {
  return projectPythonRuntimeCompatibilityDisplay('windows', status, error)
}

export function projectPythonCudaExecutionProbeDisplay(
  probe?: AiRuntimePythonExecutionProbeResponseBase | null,
  error?: string | null
): AiRuntimeModelLoadProbeDisplay {
  return projectPythonRuntimeExecutionProbeDisplay('windows', probe, error)
}

interface PlatformAiWorkerProbeDiagnosticsSelectionInput {
  platformBranch?: PlatformAiBranch | null
  macOSProbe?: PlatformAiWorkerProbeDiagnosticsInput | null
  windowsProbe?: PlatformAiWorkerProbeDiagnosticsInput | null
}

function resolvePlatformAiWorkerProbeDiagnosticsBranch(
  input: PlatformAiWorkerProbeDiagnosticsSelectionInput
): PlatformAiBranch {
  if (input.platformBranch) return input.platformBranch
  return input.windowsProbe && !input.macOSProbe ? 'windows' : DEFAULT_PLATFORM_AI_BRANCH
}

export function projectPlatformAiWorkerProbeDiagnosticsSelection(
  input: PlatformAiWorkerProbeDiagnosticsSelectionInput
): PlatformAiWorkerProbeDiagnosticsSelection {
  const probes: Record<PlatformAiBranch, PlatformAiWorkerProbeDiagnosticsInput | null> = {
    macos: input.macOSProbe ?? null,
    windows: input.windowsProbe ?? null
  }
  const platformBranch = resolvePlatformAiWorkerProbeDiagnosticsBranch(input)
  const probe = probes[platformBranch]

  return {
    platformBranch,
    probe,
    display: projectPlatformAiWorkerProbeDiagnosticsDisplay(platformBranch, probe)
  }
}

export function projectAiRuntimeWorkerProbePanelDisplay(
  platformBranch: PlatformAiBranch,
  probe?: PlatformAiWorkerProbeResultBase | null
): AiRuntimeWorkerProbePanelDisplay {
  const copy = PLATFORM_AI_SURFACE_COPY[platformBranch]
  const display = projectPlatformAiWorkerProbeHeaderDisplay(
    probe ?? null,
    isPlatformAiWorkerProbeConnected(platformBranch, probe),
    copy.connectedLabel
  )

  return projectAiRuntimeWorkerProbePanelFromHeader(
    display,
    copy.panelTitle,
    copy.panelDescription
  )
}

function projectAiRuntimeWorkerProbePanelFromHeader(
  header: PlatformAiWorkerProbeHeaderDisplay,
  title: string,
  description: string
): AiRuntimeWorkerProbePanelDisplay {
  return {
    ...header,
    title,
    description
  }
}

export function projectAiRuntimeCapabilityMatrixDisplay(
  platformBranch: PlatformAiBranch = DEFAULT_PLATFORM_AI_BRANCH
): AiRuntimeCapabilityMatrixDisplay {
  return {
    title: PLATFORM_AI_SURFACE_COPY[platformBranch].capabilityMatrixTitle,
    description: '区分依赖可用、依赖缺失、证据不足与真正尚未实现的路线，避免把探测缺口误报为功能规划。'
  }
}
