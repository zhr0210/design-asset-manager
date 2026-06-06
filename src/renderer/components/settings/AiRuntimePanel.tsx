import React, { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Loader2, Play, Power, RefreshCw, RotateCcw, ShieldCheck, Star } from 'lucide-react'
import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../../../shared/types/ai-runtime.types'
import type { MacOSAiBranchRuntimeMetadata, MacOSAiCapabilityStatus, MacOSAiRuntimeLane, MacOSAiWorkerProbeResult } from '../../../shared/types/macos-ai-runtime.types'
import { MacOSAiCapabilityMatrix } from './MacOSAiCapabilityMatrix'
import type {
  AiRuntimeActiveRuntimeResponse,
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeHealthCheckAllResponse,
  AiRuntimeHealthCheckResponse,
  AiRuntimeMacOSCapabilitiesResponse,
  AiRuntimePythonMpsStatusResponse,
  AiRuntimeIpcResponse,
  AiRuntimeListRuntimesResponse,
  AiRuntimeOperationResponse,
  AiRuntimeStateResponse
} from '../../../shared/contracts/ai-runtime.contract'
import {
  projectAiRuntimeHealthResultDisplay,
  projectAiRuntimeStatusDisplay,
  projectAiRuntimeSummaryDisplay,
  projectClipSiglipOnnxCompatibilityDisplay,
  projectMacOSAiCapabilityStatusDisplay,
  projectMacOSAiWorkerProbeDisplay,
  projectPythonMpsCompatibilityDisplay,
  projectAiRuntimeInfoLabel,
  projectAiRuntimeDisplayValue,
  projectAiRuntimeActionLabel,
  getMacOSAiBranchRuntime
} from '../../../shared/workflows/ai-runtime-status.workflow'

type AiRuntimeApi = {
  listRuntimes: () => Promise<AiRuntimeIpcResponse<AiRuntimeListRuntimesResponse>>
  getRuntimeState: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeStateResponse>>
  getActiveRuntime: () => Promise<AiRuntimeIpcResponse<AiRuntimeActiveRuntimeResponse>>
  getMacOSCapabilities: () => Promise<AiRuntimeIpcResponse<AiRuntimeMacOSCapabilitiesResponse>>
  getPythonMpsStatus: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonMpsStatusResponse>>
  getClipSiglipOnnxStatus: () => Promise<AiRuntimeIpcResponse<AiRuntimeClipSiglipOnnxStatusResponse>>
  selectActiveRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  startRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  stopRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  restartRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  healthCheck: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeHealthCheckResponse>>
  healthCheckAll: () => Promise<AiRuntimeIpcResponse<AiRuntimeHealthCheckAllResponse>>
  updateRuntimeConfig: (runtimeId: string, config: Partial<AiRuntimeConfig>) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
}

function getAiRuntimeApi(): AiRuntimeApi | null {
  const electronAPI = (window as unknown as { electronAPI?: { aiRuntime?: AiRuntimeApi } }).electronAPI
  return electronAPI?.aiRuntime ?? null
}

function formatDate(value?: string | null) {
  if (!value) return '从未检查'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function stringifyMetadata(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return '{}'
  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return String(metadata)
  }
}

function statusIcon(icon: ReturnType<typeof projectAiRuntimeStatusDisplay>['icon']) {
  if (icon === 'success') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (icon === 'warning') return <AlertTriangle className="h-3.5 w-3.5" />
  return <Activity className="h-3.5 w-3.5" />
}

export default function AiRuntimePanel() {
  const [runtimes, setRuntimes] = useState<AiRuntimeState[]>([])
  const [activeRuntime, setActiveRuntime] = useState<AiRuntimeState | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, AiRuntimeHealthResult>>({})
  const [macOSWorkerProbe, setMacOSWorkerProbe] = useState<MacOSAiWorkerProbeResult | null>(null)
  const [macOSWorkerProbeError, setMacOSWorkerProbeError] = useState<string | null>(null)
  const [pythonMpsStatus, setPythonMpsStatus] = useState<AiRuntimePythonMpsStatusResponse | null>(null)
  const [pythonMpsStatusError, setPythonMpsStatusError] = useState<string | null>(null)
  const [clipSiglipOnnxStatus, setClipSiglipOnnxStatus] = useState<AiRuntimeClipSiglipOnnxStatusResponse | null>(null)
  const [clipSiglipOnnxStatusError, setClipSiglipOnnxStatusError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyRuntimeId, setBusyRuntimeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const activeRuntimeId = activeRuntime?.id ?? null
  const hasRuntimes = runtimes.length > 0
  const macosAiBranch = useMemo(() => getMacOSAiBranchRuntime(runtimes), [runtimes])

  const runtimeSummary = useMemo(() => {
    return projectAiRuntimeSummaryDisplay(runtimes)
  }, [runtimes])

  const pythonMpsDisplay = useMemo(() => {
    return projectPythonMpsCompatibilityDisplay(pythonMpsStatus, pythonMpsStatusError)
  }, [pythonMpsStatus, pythonMpsStatusError])

  const clipSiglipDisplay = useMemo(() => {
    return projectClipSiglipOnnxCompatibilityDisplay(clipSiglipOnnxStatus, clipSiglipOnnxStatusError)
  }, [clipSiglipOnnxStatus, clipSiglipOnnxStatusError])

  const loadRuntimes = async () => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('当前运行环境未暴露 AI 运行时接口。')
      return
    }

    setLoading(true)
    setError(null)
    setMacOSWorkerProbeError(null)
    setPythonMpsStatusError(null)
    setClipSiglipOnnxStatusError(null)
    try {
      const [listResponse, activeResponse, macOSProbeResponse, pythonMpsResponse] = await Promise.all([
        api.listRuntimes(),
        api.getActiveRuntime(),
        api.getMacOSCapabilities(),
        api.getPythonMpsStatus()
      ])
      if (!listResponse.success || !listResponse.data) throw new Error(listResponse.error || '读取 AI 运行时列表失败。')
      if (!activeResponse.success) throw new Error(activeResponse.error || '读取当前 AI 运行时失败。')
      setRuntimes(listResponse.data.runtimes)
      setActiveRuntime(activeResponse.data ?? null)
      if (macOSProbeResponse.success && macOSProbeResponse.data) {
        setMacOSWorkerProbe(macOSProbeResponse.data.capabilities)
        setMacOSWorkerProbeError(macOSProbeResponse.data.error ?? null)
      } else {
        setMacOSWorkerProbe(null)
        setMacOSWorkerProbeError(macOSProbeResponse.error || '读取 macOS Worker 能力失败。')
      }
      if (pythonMpsResponse.success && pythonMpsResponse.data) {
        setPythonMpsStatus(pythonMpsResponse.data)
        setPythonMpsStatusError(pythonMpsResponse.data.error ?? null)
      } else {
        setPythonMpsStatus(null)
        setPythonMpsStatusError(pythonMpsResponse.error || '读取 Python MPS 兼容性失败。')
      }
      const clipSiglipResponse = await api.getClipSiglipOnnxStatus()
      if (clipSiglipResponse.success && clipSiglipResponse.data) {
        setClipSiglipOnnxStatus(clipSiglipResponse.data)
        setClipSiglipOnnxStatusError(clipSiglipResponse.data.error ?? null)
      } else {
        setClipSiglipOnnxStatus(null)
        setClipSiglipOnnxStatusError(clipSiglipResponse.error || '读取 CLIP/SigLIP ONNX 兼容性失败。')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRuntimes()
  }, [])

  const replaceRuntimeState = (state: AiRuntimeState | null | undefined) => {
    if (!state) return
    setRuntimes((current) => current.map((runtime) => (runtime.id === state.id ? state : runtime)))
    setActiveRuntime((current) => (current?.id === state.id ? state : current))
  }

  const runOperation = async (
    runtimeId: string,
    label: string,
    operation: (api: AiRuntimeApi, runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResult>>
  ) => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('当前运行环境未暴露 AI 运行时接口。')
      return
    }

    setBusyRuntimeId(runtimeId)
    setError(null)
    try {
      const response = await operation(api, runtimeId)
      if (!response.success || !response.data) throw new Error(response.error || `${projectAiRuntimeActionLabel(label)}失败。`)
      if (!response.data.success) throw new Error(response.data.error || `${projectAiRuntimeActionLabel(label)}被运行时拒绝。`)
      replaceRuntimeState(response.data.state)
      setLastAction(`${projectAiRuntimeActionLabel(label)}：${runtimeId}`)
      if (label === 'Set active') {
        setActiveRuntime(response.data.state)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyRuntimeId(null)
    }
  }

  const runHealthCheck = async (runtimeId: string) => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('当前运行环境未暴露 AI 运行时接口。')
      return
    }

    setBusyRuntimeId(runtimeId)
    setError(null)
    try {
      const response = await api.healthCheck(runtimeId)
      if (!response.success || !response.data) throw new Error(response.error || '健康检查失败。')
      setHealthResults((current) => ({ ...current, [runtimeId]: response.data! }))
      const stateResponse = await api.getRuntimeState(runtimeId)
      if (stateResponse.success) replaceRuntimeState(stateResponse.data)
      setLastAction(`健康检查：${runtimeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyRuntimeId(null)
    }
  }

  const runHealthCheckAll = async () => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('当前运行环境未暴露 AI 运行时接口。')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.healthCheckAll()
      if (!response.success || !response.data) throw new Error(response.error || '全部健康检查失败。')
      setHealthResults(Object.fromEntries(response.data.map((result) => [result.runtimeId, result])))
      await loadRuntimes()
      setLastAction('全部健康检查')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[15px] font-black text-slate-900 dark:text-slate-50">AI 运行时管理</h4>
            <p className="mt-1 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400">
              这里用于查看和手动控制当前 AI 运行时状态。启动、停止、重启会通过主进程运行时管理器执行，并显示健康检查结果。
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
          {runtimeSummary.runningLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
        运行时操作会经过 Electron 主进程的安全 IPC。外部服务、模型下载和运行时安装仍由各自模块管理，不会在本面板自动触发。
      </div>

      {macosAiBranch && <MacOSAiBranchPanel branch={macosAiBranch} />}
      <MacOSAiWorkerProbePanel probe={macOSWorkerProbe} error={macOSWorkerProbeError} />
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">Python MPS 兼容性检查</div>
            <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">
              这个检查器会确认 PyTorch MPS、torchvision、transformers 与小模型家族是否已经具备可用的 macOS 兼容性。
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${pythonMpsDisplay.toneClass}`}>
            {pythonMpsDisplay.label}
          </span>
        </div>

        {pythonMpsStatus && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-4">
            <InfoTile label="displayName" value={pythonMpsDisplay.runtimeLabel} />
            <InfoTile label="platform" value={pythonMpsDisplay.platformValue} />
            <InfoTile label="machine" value={pythonMpsDisplay.statusValue} />
            <InfoTile label="error" value={pythonMpsDisplay.errorValue} wide />
          </div>
        )}

        {!pythonMpsStatus && pythonMpsStatusError && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
            {pythonMpsStatusError}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[12px] font-black text-slate-800 dark:text-slate-200">CLIP/SigLIP ONNX 兼容性检查</div>
            <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">
              这个检查器会确认本地 Python 依赖和 ONNX 图结构是否足以支撑 macOS 的 embedding 路线。
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${clipSiglipDisplay.toneClass}`}>
            {clipSiglipDisplay.label}
          </span>
        </div>

        {clipSiglipOnnxStatus && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-4">
            <InfoTile label="displayName" value={clipSiglipDisplay.runtimeLabel} />
            <InfoTile label="platform" value={clipSiglipDisplay.platformValue} />
            <InfoTile label="machine" value={clipSiglipDisplay.statusValue} />
            <InfoTile label="error" value={clipSiglipDisplay.errorValue} wide />
          </div>
        )}

        {!clipSiglipOnnxStatus && clipSiglipOnnxStatusError && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
            {clipSiglipOnnxStatusError}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 text-[10.5px] font-bold text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="active" value={activeRuntimeId ?? 'None'} wide />
        <InfoTile label="total" value={String(runtimeSummary.total)} />
        <InfoTile label="running" value={String(runtimeSummary.running)} />
        <InfoTile label="issues" value={String(runtimeSummary.issues)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PanelButton onClick={loadRuntimes} disabled={loading} icon={RefreshCw}>
          刷新状态
        </PanelButton>
        <PanelButton onClick={runHealthCheckAll} disabled={loading || !hasRuntimes} icon={Activity}>
          全部检查
        </PanelButton>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-[11px] font-black text-brand-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在读取运行时状态...
        </div>
      )}

      {!loading && !hasRuntimes && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11px] font-bold leading-5 text-slate-500">
          当前没有已注册的 AI 运行时。
        </div>
      )}

      <div className="mt-5 space-y-3">
        {runtimes.map((runtime) => (
          <RuntimeCard
            key={runtime.id}
            runtime={runtime}
            active={runtime.id === activeRuntimeId}
            busy={busyRuntimeId === runtime.id}
            healthResult={healthResults[runtime.id]}
            onSelect={() => runOperation(runtime.id, 'Set active', (api, id) => api.selectActiveRuntime(id))}
            onStart={() => runOperation(runtime.id, 'Start', (api, id) => api.startRuntime(id))}
            onStop={() => runOperation(runtime.id, 'Stop', (api, id) => api.stopRuntime(id))}
            onRestart={() => runOperation(runtime.id, 'Restart', (api, id) => api.restartRuntime(id))}
            onHealthCheck={() => runHealthCheck(runtime.id)}
          />
        ))}
      </div>

      {lastAction && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-[10.5px] font-black text-emerald-700">
          最近操作：{lastAction}
        </div>
      )}
    </section>
  )
}

function MacOSAiBranchPanel({ branch }: { branch: MacOSAiBranchRuntimeMetadata }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-slate-900">macOS AI 分支</div>
          <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
            Python MPS、ONNX Runtime 与 Llama 三条路线的阶段性能力图。当前阶段：{branch.phase} / {branch.platform}/{branch.arch}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${branch.isCurrentPlatform ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
          {branch.isCurrentPlatform ? '当前平台' : '非当前平台'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {branch.lanes.map((lane) => <MacOSAiLaneCard key={lane.id} lane={lane} />)}
      </div>

      {branch.warnings.length > 0 && (
        <div className="mt-3 space-y-1 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
          {branch.warnings.map((warning) => <div key={warning}>{warning}</div>)}
        </div>
      )}
    </div>
  )
}

function MacOSAiWorkerProbePanel({ probe, error }: { probe: MacOSAiWorkerProbeResult | null; error: string | null }) {
  const probeDisplay = useMemo(() => projectMacOSAiWorkerProbeDisplay(probe), [probe])

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-black text-slate-900">macOS Worker 实时探测</div>
          <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
            这里显示 Python Worker 当前探测到的 MPS、ONNX Runtime 和 MLX 状态，帮助确认真实运行时能力是否已经可用。
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${probeDisplay.platformBadgeClass}`}>
          {probeDisplay.platformBadgeLabel}
        </span>
      </div>

      {probe && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-[10.5px] font-bold text-slate-500 lg:grid-cols-5">
          <InfoTile label="platform" value={probe.platform} />
          <InfoTile label="machine" value={probe.machine} />
          <InfoTile label="isMacOS" value={probeDisplay.isMacOSLabel} />
          <InfoTile label="isAppleSilicon" value={probeDisplay.isAppleSiliconLabel} />
          <InfoTile label="clipSiglipOnnx" value={probeDisplay.clipSiglipStatusLabel} />
        </div>
      )}

      {probe && (
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {probe.lanes.map((lane) => <MacOSAiLaneCard key={lane.id} lane={lane} />)}
        </div>
      )}

      <MacOSAiCapabilityMatrix probe={probe} />

      {error && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
          {error}
        </div>
      )}

      {!probe && !error && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[10.5px] font-bold leading-5 text-slate-500">
          暂未获取到 Worker 探测结果。
        </div>
      )}
    </div>
  )
}

type MacOSAiLaneLike = {
  id: string
  label: string
  status: MacOSAiCapabilityStatus
  summary: string
  capabilities: Array<{
    id: string
    label: string
    status: MacOSAiCapabilityStatus
    backend?: string
    role: string
  }>
}

function MacOSAiLaneCard({ lane }: { lane: MacOSAiLaneLike }) {
  const laneDisplay = projectMacOSAiCapabilityStatusDisplay(lane.status)
  return (
    <div className="rounded-xl border border-white bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-black text-slate-900">{lane.label}</div>
          <div className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500">{lane.summary}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${laneDisplay.badgeClass}`}>
          {laneDisplay.label}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {lane.capabilities.map((capability) => {
          const capDisplay = projectMacOSAiCapabilityStatusDisplay(capability.status)
          return (
            <div key={capability.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
              <div className="min-w-0">
                <div className="truncate text-[10.5px] font-black text-slate-700">{capability.label}</div>
                <div className="mt-0.5 truncate text-[9.5px] font-bold text-slate-400">{capability.backend ?? capability.role}</div>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${capDisplay.badgeClass}`}>
                {capDisplay.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RuntimeCard({
  runtime,
  active,
  busy,
  healthResult,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onHealthCheck
}: {
  runtime: AiRuntimeState
  active: boolean
  busy: boolean
  healthResult?: AiRuntimeHealthResult
  onSelect: () => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onHealthCheck: () => void
}) {
  const statusDisplay = projectAiRuntimeStatusDisplay(runtime.status)
  const healthDisplay = projectAiRuntimeStatusDisplay(runtime.healthStatus)
  const healthResultDisplay = healthResult ? projectAiRuntimeHealthResultDisplay(healthResult) : null

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${statusDisplay.badgeClass}`}>
              {statusIcon(statusDisplay.icon)}
              {statusDisplay.label}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${healthDisplay.badgeClass}`}>
              {healthDisplay.label}
            </span>
            {active && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9.5px] font-black text-indigo-700">
                <Star className="h-3 w-3" />
                当前
              </span>
            )}
          </div>
          <h5 className="mt-2 truncate text-[12.5px] font-black text-slate-900">{String(runtime.metadata?.displayName ?? runtime.id)}</h5>
          <p className="mt-1 text-[10.5px] font-bold text-slate-400">{runtime.kind} / {runtime.id}</p>
        </div>
        {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoTile label="displayName" value={String(runtime.metadata?.displayName ?? runtime.id)} wide />
        <InfoTile label="baseUrl" value={runtime.baseUrl ?? 'None'} wide />
        <InfoTile label="lastCheck" value={formatDate(runtime.lastHealthCheckAt)} />
        <InfoTile label="pid" value={runtime.pid === null ? 'None' : String(runtime.pid)} />
        <InfoTile label="error" value={runtime.lastError ?? 'None'} wide />
      </div>

      {healthResultDisplay && (
        <div className={`mt-3 rounded-xl border p-3 text-[10.5px] font-bold leading-5 ${healthResultDisplay.status.badgeClass}`}>
          {healthResultDisplay.messageLabel}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <RuntimeButton onClick={onHealthCheck} disabled={busy} icon={Activity}>健康检查</RuntimeButton>
        <RuntimeButton onClick={onSelect} disabled={busy || active} icon={Star}>设为当前</RuntimeButton>
        <RuntimeButton onClick={onStart} disabled={busy} icon={Play}>启动</RuntimeButton>
        <RuntimeButton onClick={onStop} disabled={busy} icon={Power}>停止</RuntimeButton>
        <RuntimeButton onClick={onRestart} disabled={busy} icon={RotateCcw}>重启</RuntimeButton>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600">
          元数据
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500">
          {stringifyMetadata(runtime.metadata)}
        </pre>
      </details>
    </div>
  )
}

function InfoTile({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-100 bg-white/80 p-2.5 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[9.5px] font-black text-slate-400">{projectAiRuntimeInfoLabel(label)}</div>
      <div className="mt-1 truncate text-[10.5px] font-black text-slate-700" title={value}>
        {projectAiRuntimeDisplayValue(value)}
      </div>
    </div>
  )
}

function PanelButton({
  children,
  disabled,
  icon: Icon,
  onClick
}: {
  children: React.ReactNode
  disabled: boolean
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function RuntimeButton({
  children,
  disabled,
  icon: Icon,
  onClick
}: {
  children: React.ReactNode
  disabled: boolean
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  )
}
