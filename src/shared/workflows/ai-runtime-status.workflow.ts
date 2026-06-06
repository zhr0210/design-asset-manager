import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimePythonMpsStatusResponse
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
  MacOSAiCapabilityStatus,
  MacOSAiWorkerProbeResult
} from '../types/macos-ai-runtime.types'

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

export interface LlamaRuntimeDisplay {
  running: boolean
  pillTone: AiRuntimeDisplayTone
  pillLabel: string
  routeValue: string
  routeCaption: string
  serviceValue: string
  serviceDetailValue: string
}

export interface MacOSAiCapabilityStatusDisplay {
  status: MacOSAiCapabilityStatus
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

export interface MacOSAiProbeTileDisplay {
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
  mps: MacOSAiProbeTileDisplay
  onnxRuntime: MacOSAiProbeTileDisplay
  clipSiglipOnnx: MacOSAiProbeTileDisplay
  mlx: MacOSAiProbeTileDisplay
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

export function projectMacOSAiCapabilityStatusDisplay(
  status?: MacOSAiCapabilityStatus | null
): MacOSAiCapabilityStatusDisplay {
  const normalized = normalizeMacOSAiCapabilityStatus(status)
  const labels: Record<MacOSAiCapabilityStatus, string> = {
    ready: '就绪',
    optional: '可选',
    planned: '规划中',
    fallback: '回退',
    unavailable: '不可用'
  }
  const badgeClasses: Record<MacOSAiCapabilityStatus, string> = {
    ready: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    optional: 'border-sky-100 bg-sky-50 text-sky-700',
    planned: 'border-amber-100 bg-amber-50 text-amber-700',
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
      clipSiglipOnnx: unchecked,
      mlx: unchecked
    }
  }

  const connected = probe.isMacOS
  const clipSiglipStatus = projectMacOSAiCapabilityStatusDisplay(probe.clipSiglipOnnx.status)
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
      valueLabel: probe.torch.mpsAvailable ? '可用' : '回退',
      captionLabel: probe.torch.version ? `torch ${probe.torch.version}` : '已探测，未报告版本'
    },
    onnxRuntime: {
      valueLabel: probe.onnxruntime.available ? '可用' : '回退',
      captionLabel: probe.onnxruntime.providers.join(' / ') || '已探测，未报告 Provider'
    },
    clipSiglipOnnx: {
      valueLabel: probe.clipSiglipOnnx.available ? '可用' : '规划中',
      captionLabel: probe.clipSiglipOnnx.version
        ? `${probe.clipSiglipOnnx.backend ?? 'optimum'} ${probe.clipSiglipOnnx.version}`
        : '已探测，未报告版本'
    },
    mlx: {
      valueLabel: probe.mlx.available ? '可用' : '规划中',
      captionLabel: probe.mlx.version ? `mlx ${probe.mlx.version}` : '已探测，未报告版本'
    }
  }
}

export function normalizeMacOSAiCapabilityStatus(
  status?: MacOSAiCapabilityStatus | null
): MacOSAiCapabilityStatus {
  return status === 'ready' || status === 'optional' || status === 'planned' || status === 'fallback' || status === 'unavailable'
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
