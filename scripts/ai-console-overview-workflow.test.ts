import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  type AiConsoleModelReadinessDisplayInput,
  projectAiConsoleGpuDisplay,
  projectAiConsoleModelReadinessDisplay
} from '../src/shared/workflows/ai-console-overview.workflow'

const unknownGpu = projectAiConsoleGpuDisplay({ telemetryTrusted: false })
assert.equal(unknownGpu.riskTone, 'warn')
assert.equal(unknownGpu.statusLabel, '未知')
assert.equal(unknownGpu.valueLabel, 'Unknown')
assert.equal(unknownGpu.captionLabel, '暂无可信物理显存指标')
assert.equal(unknownGpu.deviceLabel, '物理 GPU 状态未识别')
assert.equal(unknownGpu.barWidthPercent, 0)

const safeGpu = projectAiConsoleGpuDisplay({
  telemetryTrusted: true,
  deviceName: 'Apple M-series GPU',
  totalMb: 32768,
  freeMb: 24576,
  usagePercent: 25,
  maxGpuMemoryUsagePercent: 90,
  minFreeVramGBBeforeQwen8B: 8
})
assert.equal(safeGpu.riskTone, 'good')
assert.equal(safeGpu.statusLabel, '安全')
assert.equal(safeGpu.valueLabel, '8.0 GB / 32.0 GB')
assert.equal(safeGpu.captionLabel, '当前占用 25%，可用 24.0 GB')
assert.equal(safeGpu.freeLabel, '24.0 GB')
assert.equal(safeGpu.totalLabel, '32.0 GB')
assert.equal(safeGpu.barToneClass, 'bg-emerald-500')
assert.equal(safeGpu.barWidthPercent, 25)

const highUsageGpu = projectAiConsoleGpuDisplay({
  telemetryTrusted: true,
  totalMb: 32768,
  freeMb: 1024,
  usagePercent: 95,
  maxGpuMemoryUsagePercent: 90,
  minFreeVramGBBeforeQwen8B: 8
})
assert.equal(highUsageGpu.riskTone, 'bad')
assert.equal(highUsageGpu.statusLabel, '高负载')
assert.equal(highUsageGpu.barToneClass, 'bg-rose-500')

const lowFreeGpu = projectAiConsoleGpuDisplay({
  telemetryTrusted: true,
  totalMb: 32768,
  freeMb: 4096,
  usagePercent: 60,
  maxGpuMemoryUsagePercent: 90,
  minFreeVramGBBeforeQwen8B: 8
})
assert.equal(lowFreeGpu.riskTone, 'warn')
assert.equal(lowFreeGpu.statusLabel, '未知')
assert.equal(lowFreeGpu.barToneClass, 'bg-amber-400')

const readyModelInput: AiConsoleModelReadinessDisplayInput = {
  installedModelCount: 3,
  currentModelReady: true,
  workerOffline: false
}
assert.deepEqual(projectAiConsoleModelReadinessDisplay(readyModelInput), {
  valueLabel: '3 个已安装',
  captionLabel: '当前模型可用 / Worker 在线',
  tone: 'good',
  executableLabel: '可执行',
  routeStatusLabel: '当前模型可用',
  workerStatusLabel: 'Worker 在线'
})

const blockedModelInput: AiConsoleModelReadinessDisplayInput = {
  installedModelCount: 1,
  currentModelReady: false,
  workerOffline: true
}
assert.deepEqual(projectAiConsoleModelReadinessDisplay(blockedModelInput), {
  valueLabel: '1 个已安装',
  captionLabel: '当前模型未就绪 / Worker 离线',
  tone: 'warn',
  executableLabel: '需配置',
  routeStatusLabel: '当前模型未就绪',
  workerStatusLabel: 'Worker 离线'
})

const aiConsoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
const overviewSliceStart = aiConsoleSource.indexOf('function OverviewWorkspace')
const overviewSliceEnd = aiConsoleSource.indexOf('function PlatformAiBranchStatusPanel', overviewSliceStart)
const overviewSlice = aiConsoleSource.slice(overviewSliceStart, overviewSliceEnd)

assert.match(aiConsoleSource, /projectAiConsoleGpuDisplay/)
assert.match(aiConsoleSource, /projectAiConsoleModelReadinessDisplay/)
assert.match(aiConsoleSource, /AiConsoleModelReadinessDisplayInput/)
assert.match(aiConsoleSource, /const modelReadinessInput: AiConsoleModelReadinessDisplayInput/)
assert.match(aiConsoleSource, /modelReadinessInput=\{modelReadinessInput\}/)
assert.match(aiConsoleSource, /modelReadinessInput: AiConsoleModelReadinessDisplayInput/)
assert.match(aiConsoleSource, /projectAiConsoleModelReadinessDisplay\(props\.modelReadinessInput\)/)
assert.doesNotMatch(aiConsoleSource, /currentModelReady=\{currentModelReady\}/)
assert.doesNotMatch(aiConsoleSource, /isWorkerOffline=\{isWorkerOffline\}/)
assert.doesNotMatch(aiConsoleSource, /currentModelReady: boolean/)
assert.doesNotMatch(aiConsoleSource, /isWorkerOffline: boolean/)
assert.doesNotMatch(aiConsoleSource, /effectiveGpu\.usagePercent\s*>=\s*memoryPolicy\.maxGpuMemoryUsagePercent/)
assert.doesNotMatch(aiConsoleSource, /effectiveGpu\.freeMb\s*>\s*0\s*&&\s*effectiveGpu\.freeMb\s*</)
assert.doesNotMatch(aiConsoleSource, /currentModelReady\s*\?\s*['"]当前模型可用['"]/)
assert.doesNotMatch(aiConsoleSource, /isWorkerOffline\s*\?\s*['"]Worker 离线['"]/)
assert.doesNotMatch(aiConsoleSource, /currentModelReady\s*\?\s*['"]可执行['"]/)
assert.doesNotMatch(aiConsoleSource, /tone=\{currentModelReady\s*\?\s*['"]good['"]\s*:\s*['"]warn['"]\}/)
assert.doesNotMatch(aiConsoleSource, /当前占用 \$\{effectiveGpu\.usagePercent/)
assert.doesNotMatch(aiConsoleSource, /riskTone === 'bad' \? 'bg-rose-500'/)
assert.match(overviewSlice, /gpuDisplay: AiConsoleGpuDisplay/)
assert.match(overviewSlice, /props\.gpuDisplay\.riskTone/)
assert.doesNotMatch(overviewSlice, /telemetryTrusted: boolean/)
assert.doesNotMatch(overviewSlice, /effectiveGpu: ReturnType/)
assert.doesNotMatch(overviewSlice, /riskTone: 'good' \| 'warn' \| 'bad'/)
assert.doesNotMatch(overviewSlice, /props\.riskTone/)

console.log('ai-console-overview-workflow passed')
