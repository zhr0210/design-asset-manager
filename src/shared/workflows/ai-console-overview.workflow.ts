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
  deviceLabel: string
  usageLabel: string
  valueLabel: string
  captionLabel: string
  freeLabel: string
  totalLabel: string
  barToneClass: string
  barWidthPercent: number
}

export interface AiConsoleModelReadinessDisplay {
  valueLabel: string
  captionLabel: string
  tone: AiConsoleOverviewTone
  executableLabel: string
  routeStatusLabel: string
  workerStatusLabel: string
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

  return {
    riskTone,
    statusLabel: riskTone === 'good' ? '安全' : riskTone === 'bad' ? '高负载' : '未知',
    deviceLabel: telemetryTrusted ? (input.deviceName || 'Unknown GPU') : '物理 GPU 状态未识别',
    usageLabel: telemetryTrusted ? `${usagePercent.toFixed(0)}%` : 'Unknown',
    valueLabel: telemetryTrusted ? `${formatGb(usedMb)} / ${formatGb(totalMb)}` : 'Unknown',
    captionLabel: telemetryTrusted ? `当前占用 ${usagePercent.toFixed(0)}%，可用 ${formatGb(freeMb)}` : '暂无可信物理显存指标',
    freeLabel: telemetryTrusted ? formatGb(freeMb) : '未知',
    totalLabel: telemetryTrusted ? formatGb(totalMb) : '未知',
    barToneClass: riskTone === 'bad' ? 'bg-rose-500' : riskTone === 'warn' ? 'bg-amber-400' : 'bg-emerald-500',
    barWidthPercent: telemetryTrusted ? Math.min(100, Math.max(0, usagePercent)) : 0
  }
}

export function projectAiConsoleModelReadinessDisplay(input: {
  installedModelCount?: number | null
  currentModelReady?: boolean | null
  workerOffline?: boolean | null
}): AiConsoleModelReadinessDisplay {
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

function formatGb(mb: number): string {
  if (!mb || mb <= 0) return '未知'
  return `${(mb / 1024).toFixed(1)} GB`
}

function safeNumber(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
