export type AiConsoleOverviewTone = 'good' | 'warn' | 'bad' | 'muted'

export interface AiConsoleGpuDisplayInput {
  telemetryTrusted?: boolean | null
  deviceName?: string | null
  totalMb?: number | null
  freeMb?: number | null
  usagePercent?: number | null
  maxGpuMemoryUsagePercent?: number | null
  minFreeVramGBBeforeQwen8B?: number | null
}

export interface AiConsoleGpuDisplay {
  riskTone: Exclude<AiConsoleOverviewTone, 'muted'>
  statusLabel: string
  healthLabel: string
  deviceLabel: string
  usageLabel: string
  valueLabel: string
  captionLabel: string
  freeLabel: string
  totalLabel: string
  barToneClass: string
  barWidthPercent: number
}

interface AiConsoleGpuRiskDisplayMetadata {
  statusLabel: string
  healthLabel: string
  barToneClass: string
}

export interface AiConsoleModelReadinessDisplay {
  valueLabel: string
  captionLabel: string
  tone: AiConsoleOverviewTone
  executableLabel: string
  routeStatusLabel: string
  workerStatusLabel: string
}

export interface AiConsoleModelReadinessDisplayInput {
  installedModelCount?: number | null
  currentModelReady?: boolean | null
  workerOffline?: boolean | null
}

export interface AiConsoleDependencyInstallResultInput {
  success?: boolean | null
  installedPackages?: unknown[] | null
  failedPackages?: unknown[] | null
  runtime?: {
    created?: boolean | null
  } | null
  durationMs?: number | null
  exitCode?: unknown
  error?: unknown
}

export type AiConsoleDependencyInstallTarget = 'macos'

export interface AiConsoleDependencyInstallCopy {
  unavailableToast: string
  startToast: string
  startedLog: string
  successToast: string
  completedLog: (result: AiConsoleDependencyInstallResultInput) => string
  failureToast: (result: AiConsoleDependencyInstallResultInput | null | undefined) => string
  failedLog: (result: AiConsoleDependencyInstallResultInput | null | undefined) => string
  exceptionToast: (error: unknown) => string
  exceptionLog: (error: unknown) => string
}

const AI_CONSOLE_GPU_RISK_DISPLAY: Record<
  AiConsoleGpuDisplay['riskTone'],
  AiConsoleGpuRiskDisplayMetadata
> = {
  good: {
    statusLabel: '安全',
    healthLabel: '正常',
    barToneClass: 'bg-emerald-500'
  },
  warn: {
    statusLabel: '未知',
    healthLabel: '未知',
    barToneClass: 'bg-amber-400'
  },
  bad: {
    statusLabel: '高负载',
    healthLabel: '关注',
    barToneClass: 'bg-rose-500'
  }
}

export function projectAiConsoleGpuDisplay(input: AiConsoleGpuDisplayInput): AiConsoleGpuDisplay {
  const telemetryTrusted = Boolean(input.telemetryTrusted)
  const totalMb = safeNumber(input.totalMb)
  const freeMb = safeNumber(input.freeMb)
  const usedMb = Math.max(0, totalMb - freeMb)
  const usagePercent = safeNumber(input.usagePercent)
  const maxUsage = safeNumber(input.maxGpuMemoryUsagePercent)
  const minFreeMb = safeNumber(input.minFreeVramGBBeforeQwen8B) * 1024
  const riskTone = projectGpuRiskTone({
    telemetryTrusted,
    freeMb,
    usagePercent,
    maxUsage,
    minFreeMb
  })
  const riskDisplay = AI_CONSOLE_GPU_RISK_DISPLAY[riskTone]

  return {
    riskTone,
    statusLabel: riskDisplay.statusLabel,
    healthLabel: riskDisplay.healthLabel,
    deviceLabel: telemetryTrusted ? (input.deviceName || 'Unknown GPU') : '物理 GPU 状态未识别',
    usageLabel: telemetryTrusted ? `${usagePercent.toFixed(0)}%` : 'Unknown',
    valueLabel: telemetryTrusted ? `${formatGb(usedMb)} / ${formatGb(totalMb)}` : 'Unknown',
    captionLabel: telemetryTrusted ? `当前占用 ${usagePercent.toFixed(0)}%，可用 ${formatGb(freeMb)}` : '暂无可信物理显存指标',
    freeLabel: telemetryTrusted ? formatGb(freeMb) : '未知',
    totalLabel: telemetryTrusted ? formatGb(totalMb) : '未知',
    barToneClass: riskDisplay.barToneClass,
    barWidthPercent: telemetryTrusted ? Math.min(100, Math.max(0, usagePercent)) : 0
  }
}

export function projectAiConsoleModelReadinessDisplay(input: AiConsoleModelReadinessDisplayInput): AiConsoleModelReadinessDisplay {
  const installedModelCount = Math.max(0, Math.floor(safeNumber(input.installedModelCount)))
  const currentModelReady = Boolean(input.currentModelReady)
  const workerOffline = Boolean(input.workerOffline)
  const routeStatusLabel = currentModelReady ? '当前模型可用' : '当前模型未就绪'
  const workerStatusLabel = workerOffline ? 'Worker 离线' : 'Worker 在线'

  return {
    valueLabel: `${installedModelCount} 个已安装`,
    captionLabel: `${routeStatusLabel} / ${workerStatusLabel}`,
    tone: currentModelReady && !workerOffline ? 'good' : 'warn',
    executableLabel: currentModelReady ? '可执行' : '需配置',
    routeStatusLabel,
    workerStatusLabel
  }
}

const AI_CONSOLE_DEPENDENCY_INSTALL_COPY: Record<AiConsoleDependencyInstallTarget, AiConsoleDependencyInstallCopy> = {
  macos: {
    unavailableToast: '安装接口不可用',
    startToast: '正在安装 macOS AI 依赖 (torch, transformers, onnxruntime)...',
    startedLog: 'macOS AI deps installation started',
    successToast: 'macOS AI 依赖安装完成',
    completedLog: (result) => {
      const installedCount = Array.isArray(result.installedPackages) ? result.installedPackages.length : 0
      const runtimeLabel = result.runtime?.created ? 'managed runtime created' : 'managed runtime reused'
      return `macOS AI deps installation completed (${installedCount} package checks, ${runtimeLabel}, ${formatDurationSeconds(result.durationMs)}s)`
    },
    failureToast: (result) => `安装失败：${projectDependencyInstallFailureMessage(result).slice(0, 120)}`,
    failedLog: (result) => `macOS AI deps install failed (${formatDurationSeconds(result?.durationMs)}s): ${projectDependencyInstallFailedPackageMessage(result)}`,
    exceptionToast: (error) => `安装失败: ${String(error)}`,
    exceptionLog: (error) => `macOS AI deps install failed: ${String(error)}`
  }
}

export function projectAiConsoleDependencyInstallCopy(target: AiConsoleDependencyInstallTarget): AiConsoleDependencyInstallCopy {
  return AI_CONSOLE_DEPENDENCY_INSTALL_COPY[target]
}

export function projectDependencyInstallFailedPackageMessage(result: AiConsoleDependencyInstallResultInput | null | undefined): string {
  const failedPackages = Array.isArray(result?.failedPackages)
    ? result.failedPackages.map((item) => packageNameFromUnknown(item)).filter(Boolean)
    : []

  return failedPackages.length ? failedPackages.join(', ') : 'unknown package'
}

export function projectDependencyInstallFailureMessage(result: AiConsoleDependencyInstallResultInput | null | undefined): string {
  if (result?.error) return String(result.error)
  return `exit=${String(result?.exitCode ?? 'unknown')} failed=${projectDependencyInstallFailedPackageMessage(result)}`
}

function projectGpuRiskTone(input: {
  telemetryTrusted: boolean
  freeMb: number
  usagePercent: number
  maxUsage: number
  minFreeMb: number
}): Exclude<AiConsoleOverviewTone, 'muted'> {
  if (!input.telemetryTrusted) return 'warn'
  if (input.maxUsage > 0 && input.usagePercent >= input.maxUsage) return 'bad'
  if (input.freeMb > 0 && input.minFreeMb > 0 && input.freeMb < input.minFreeMb) return 'warn'
  return 'good'
}

function packageNameFromUnknown(value: unknown): string {
  if (!value || typeof value !== 'object' || !('package' in value)) return ''
  const packageValue = (value as { package?: unknown }).package
  return typeof packageValue === 'string' ? packageValue : ''
}

function formatDurationSeconds(value?: number | null): number {
  return Math.round(safeNumber(value) / 1000)
}

function formatGb(mb: number): string {
  if (!mb || mb <= 0) return '未知'
  return `${(mb / 1024).toFixed(1)} GB`
}

function safeNumber(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
