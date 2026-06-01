import React, { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Loader2, Play, Power, RefreshCw, RotateCcw, ShieldCheck, Star } from 'lucide-react'
import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../../../shared/types/ai-runtime.types'
import type {
  AiRuntimeActiveRuntimeResponse,
  AiRuntimeHealthCheckAllResponse,
  AiRuntimeHealthCheckResponse,
  AiRuntimeIpcResponse,
  AiRuntimeListRuntimesResponse,
  AiRuntimeOperationResponse,
  AiRuntimeStateResponse
} from '../../../shared/contracts/ai-runtime.contract'

type AiRuntimeApi = {
  listRuntimes: () => Promise<AiRuntimeIpcResponse<AiRuntimeListRuntimesResponse>>
  getRuntimeState: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeStateResponse>>
  getActiveRuntime: () => Promise<AiRuntimeIpcResponse<AiRuntimeActiveRuntimeResponse>>
  selectActiveRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  startRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  stopRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  restartRuntime: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
  healthCheck: (runtimeId: string) => Promise<AiRuntimeIpcResponse<AiRuntimeHealthCheckResponse>>
  healthCheckAll: () => Promise<AiRuntimeIpcResponse<AiRuntimeHealthCheckAllResponse>>
  updateRuntimeConfig: (runtimeId: string, config: Partial<AiRuntimeConfig>) => Promise<AiRuntimeIpcResponse<AiRuntimeOperationResponse>>
}

const STATUS_STYLE: Record<string, string> = {
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

function getAiRuntimeApi(): AiRuntimeApi | null {
  const electronAPI = (window as unknown as { electronAPI?: { aiRuntime?: AiRuntimeApi } }).electronAPI
  return electronAPI?.aiRuntime ?? null
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'
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

function statusIcon(status: string) {
  if (status === 'running' || status === 'ok') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (status === 'failed' || status === 'error' || status === 'unhealthy' || status === 'warning') return <AlertTriangle className="h-3.5 w-3.5" />
  return <Activity className="h-3.5 w-3.5" />
}

export default function AiRuntimePanel() {
  const [runtimes, setRuntimes] = useState<AiRuntimeState[]>([])
  const [activeRuntime, setActiveRuntime] = useState<AiRuntimeState | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, AiRuntimeHealthResult>>({})
  const [loading, setLoading] = useState(false)
  const [busyRuntimeId, setBusyRuntimeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const activeRuntimeId = activeRuntime?.id ?? null
  const hasRuntimes = runtimes.length > 0

  const runtimeSummary = useMemo(() => {
    const running = runtimes.filter((runtime) => runtime.status === 'running').length
    const failed = runtimes.filter((runtime) => runtime.status === 'failed' || runtime.status === 'unhealthy').length
    return { running, failed, total: runtimes.length }
  }, [runtimes])

  const loadRuntimes = async () => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('AI Runtime API is not available in this environment.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [listResponse, activeResponse] = await Promise.all([api.listRuntimes(), api.getActiveRuntime()])
      if (!listResponse.success || !listResponse.data) throw new Error(listResponse.error || 'Failed to list AI runtimes.')
      if (!activeResponse.success) throw new Error(activeResponse.error || 'Failed to read active AI runtime.')
      setRuntimes(listResponse.data.runtimes)
      setActiveRuntime(activeResponse.data ?? null)
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
      setError('AI Runtime API is not available in this environment.')
      return
    }

    setBusyRuntimeId(runtimeId)
    setError(null)
    try {
      const response = await operation(api, runtimeId)
      if (!response.success || !response.data) throw new Error(response.error || `${label} failed.`)
      if (!response.data.success) throw new Error(response.data.error || `${label} was rejected.`)
      replaceRuntimeState(response.data.state)
      setLastAction(`${label}: ${runtimeId}`)
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
      setError('AI Runtime API is not available in this environment.')
      return
    }

    setBusyRuntimeId(runtimeId)
    setError(null)
    try {
      const response = await api.healthCheck(runtimeId)
      if (!response.success || !response.data) throw new Error(response.error || 'Health check failed.')
      setHealthResults((current) => ({ ...current, [runtimeId]: response.data! }))
      const stateResponse = await api.getRuntimeState(runtimeId)
      if (stateResponse.success) replaceRuntimeState(stateResponse.data)
      setLastAction(`Health check: ${runtimeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyRuntimeId(null)
    }
  }

  const runHealthCheckAll = async () => {
    const api = getAiRuntimeApi()
    if (!api) {
      setError('AI Runtime API is not available in this environment.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.healthCheckAll()
      if (!response.success || !response.data) throw new Error(response.error || 'Health check all failed.')
      setHealthResults(Object.fromEntries(response.data.map((result) => [result.runtimeId, result])))
      await loadRuntimes()
      setLastAction('Health check all')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] font-black text-slate-900">AI Runtime Manager</h4>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
              Safe manual controls for the current mock runtime layer. No real Python, external service, model download, or runtime package install is started here.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
          {runtimeSummary.running}/{runtimeSummary.total} running
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-[10.5px] font-bold leading-5 text-amber-700">
        Current providers are safe mocks only. Start/stop/restart updates mock provider state and will not launch Python, call Ollama/LM Studio/llama.app, download models, or install runtime packages.
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-[10.5px] font-bold text-slate-500">
        <InfoTile label="active" value={activeRuntimeId ?? 'None'} wide />
        <InfoTile label="total" value={String(runtimeSummary.total)} />
        <InfoTile label="running" value={String(runtimeSummary.running)} />
        <InfoTile label="issues" value={String(runtimeSummary.failed)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PanelButton onClick={loadRuntimes} disabled={loading} icon={RefreshCw}>
          Refresh
        </PanelButton>
        <PanelButton onClick={runHealthCheckAll} disabled={loading || !hasRuntimes} icon={Activity}>
          Check all
        </PanelButton>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-[11px] font-black text-brand-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading runtime state...
        </div>
      )}

      {!loading && !hasRuntimes && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[11px] font-bold leading-5 text-slate-500">
          No AI runtimes are currently registered.
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
          Last action: {lastAction}
        </div>
      )}
    </section>
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
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE[runtime.status] ?? STATUS_STYLE.unknown}`}>
              {statusIcon(runtime.status)}
              {runtime.status}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE[runtime.healthStatus] ?? STATUS_STYLE.unknown}`}>
              {runtime.healthStatus}
            </span>
            {active && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9.5px] font-black text-indigo-700">
                <Star className="h-3 w-3" />
                active
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

      {healthResult && (
        <div className={`mt-3 rounded-xl border p-3 text-[10.5px] font-bold leading-5 ${STATUS_STYLE[healthResult.status] ?? STATUS_STYLE.unknown}`}>
          {healthResult.message} ({healthResult.durationMs}ms)
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <RuntimeButton onClick={onHealthCheck} disabled={busy} icon={Activity}>Health</RuntimeButton>
        <RuntimeButton onClick={onSelect} disabled={busy || active} icon={Star}>Active</RuntimeButton>
        <RuntimeButton onClick={onStart} disabled={busy} icon={Play}>Start</RuntimeButton>
        <RuntimeButton onClick={onStop} disabled={busy} icon={Power}>Stop</RuntimeButton>
        <RuntimeButton onClick={onRestart} disabled={busy} icon={RotateCcw}>Restart</RuntimeButton>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600">
          metadata
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
      <div className="text-[8.5px] font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 truncate text-[10.5px] font-black text-slate-700" title={value}>
        {value}
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
