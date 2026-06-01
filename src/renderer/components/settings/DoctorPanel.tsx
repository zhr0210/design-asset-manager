import React, { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import type { DoctorCheckResult, DoctorCheckStatus, DoctorReport } from '../../../shared/types/doctor.types'
import type {
  DoctorClearLastReportResponse,
  DoctorGetLastReportResponse,
  DoctorListChecksResponse,
  DoctorRunResponse
} from '../../../shared/contracts/doctor.contract'

type DoctorApi = {
  runAll: () => Promise<DoctorRunResponse>
  getLastReport: () => Promise<DoctorGetLastReportResponse>
  clearLastReport: () => Promise<DoctorClearLastReportResponse>
  listChecks: () => Promise<DoctorListChecksResponse>
}

const CHECK_ORDER = ['system', 'path', 'node', 'python', 'port', 'native-deps', 'ai-worker', 'permission']

const STATUS_LABELS: Record<DoctorCheckStatus | 'idle' | 'loading', string> = {
  idle: '未检测',
  loading: '检测中',
  ok: '正常',
  warning: '提醒',
  error: '错误',
  skipped: '跳过'
}

const STATUS_STYLES: Record<DoctorCheckStatus | 'idle' | 'loading', string> = {
  idle: 'border-slate-200 bg-slate-50 text-slate-500',
  loading: 'border-brand-100 bg-brand-50 text-brand-600',
  ok: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  error: 'border-rose-100 bg-rose-50 text-rose-700',
  skipped: 'border-slate-200 bg-slate-50 text-slate-500'
}

function getDoctorApi(): DoctorApi | null {
  const electronAPI = (window as unknown as { electronAPI?: { doctor?: DoctorApi } }).electronAPI
  return electronAPI?.doctor ?? null
}

function formatDate(value?: string | null) {
  if (!value) return '无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function stringifyDetails(details?: Record<string, unknown>) {
  if (!details) return '无'
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

function statusIcon(status: DoctorCheckStatus | 'idle' | 'loading') {
  if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin" />
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'warning' || status === 'error') return <AlertTriangle className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

export default function DoctorPanel() {
  const [report, setReport] = useState<DoctorReport | null>(null)
  const [knownChecks, setKnownChecks] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overallStatus = loading ? 'loading' : report?.overallStatus ?? 'idle'
  const lastRunAt = report?.generatedAt ?? null

  const orderedChecks = useMemo(() => {
    const resultById = new Map(report?.checks.map((check) => [check.id, check]) ?? [])
    const labelById = new Map(knownChecks.map((check) => [check.id, check.label]))
    const ids = new Set([...CHECK_ORDER, ...knownChecks.map((check) => check.id), ...resultById.keys()])

    return Array.from(ids).map((id) => ({
      id,
      label: resultById.get(id)?.label ?? labelById.get(id) ?? id,
      result: resultById.get(id) ?? null
    }))
  }, [knownChecks, report])

  const loadLastReport = async () => {
    const api = getDoctorApi()
    if (!api) {
      setError('当前运行环境未暴露 Doctor API。')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [lastReportResponse, checksResponse] = await Promise.all([api.getLastReport(), api.listChecks()])
      if (!lastReportResponse.success) throw new Error(lastReportResponse.error || '读取上次体检结果失败。')
      if (!checksResponse.success) throw new Error(checksResponse.error || '读取体检项列表失败。')
      setReport(lastReportResponse.report ?? null)
      setKnownChecks(checksResponse.checks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLastReport()
  }, [])

  const handleRunDoctor = async () => {
    const api = getDoctorApi()
    if (!api) {
      setError('当前运行环境未暴露 Doctor API。')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.runAll()
      if (!response.success || !response.report) throw new Error(response.error || '体检运行失败。')
      setReport(response.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    const api = getDoctorApi()
    if (!api) {
      setError('当前运行环境未暴露 Doctor API。')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.clearLastReport()
      if (!response.success) throw new Error(response.error || '清除体检结果失败。')
      setReport(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              {statusIcon(overallStatus)}
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-black text-slate-900">系统环境体检</h4>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
                用于检测当前系统、路径、Python、Node、端口、AI Worker 与 native dependency 状态，不会自动安装或修改环境。
              </p>
            </div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS_STYLES[overallStatus]}`}>
          {STATUS_LABELS[overallStatus]}
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 text-[10.5px] font-bold text-slate-500">
        <InfoTile label="platform" value={report?.platform ?? '未检测'} />
        <InfoTile label="arch" value={report?.arch ?? '未检测'} />
        <InfoTile label="profile" value={report?.profile ?? '未检测'} />
        <InfoTile label="overall" value={report?.overallStatus ?? '未检测'} />
        <InfoTile label="generatedAt" value={formatDate(report?.generatedAt)} wide />
        <InfoTile label="lastRunAt" value={formatDate(lastRunAt)} wide />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PanelButton onClick={handleRunDoctor} disabled={loading} icon={Activity}>
          一键体检
        </PanelButton>
        <PanelButton onClick={handleRunDoctor} disabled={loading || !report} icon={RotateCcw}>
          重新体检
        </PanelButton>
        <PanelButton onClick={loadLastReport} disabled={loading} icon={RefreshCw}>
          刷新上次结果
        </PanelButton>
        <PanelButton onClick={handleClear} disabled={loading || !report} icon={Trash2}>
          清除结果
        </PanelButton>
      </div>

      <div className="mt-5 space-y-2">
        {orderedChecks.map(({ id, label, result }) => (
          <CheckRow key={id} id={id} label={label} result={result} />
        ))}
      </div>
    </section>
  )
}

function InfoTile({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-[9px] font-black uppercase text-slate-400">{label}</div>
      <div className="mt-1 truncate text-[11px] font-black text-slate-700" title={value}>
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

function CheckRow({ id, label, result }: { id: string; label: string; result: DoctorCheckResult | null }) {
  const status = result?.status ?? 'idle'

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLES[status]}`}>
              {statusIcon(status)}
              {STATUS_LABELS[status]}
            </span>
            <span className="truncate text-[11.5px] font-black text-slate-800">{label}</span>
          </div>
          <p className="mt-2 text-[10.5px] font-semibold leading-5 text-slate-500">{result?.message ?? '尚未运行该检测项。'}</p>
        </div>
        <span className="shrink-0 text-[10px] font-black text-slate-400">{result ? `${result.durationMs}ms` : '-'}</span>
      </div>

      {result?.fixSuggestion && (
        <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-[10px] font-bold leading-5 text-amber-700">
          {result.fixSuggestion}
        </p>
      )}

      <details className="mt-2 group">
        <summary className="cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600">
          details · {id}
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500">
          {stringifyDetails(result?.details)}
        </pre>
      </details>
    </div>
  )
}
