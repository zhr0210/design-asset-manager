import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle
} from 'lucide-react'
import type {
  SettingsMigrationAnalyzeResponse,
  SettingsMigrationBackupInfo,
  SettingsMigrationCreatePlanResponse,
  SettingsMigrationDryRunResponse,
  SettingsMigrationListBackupsResponse
} from '../../../shared/contracts/settings-migration.contract'
import type { SettingsMigrationPlan } from '../../../shared/types/settings-migration.types'

type PanelStatus = 'not_analyzed' | 'loading' | 'safe_to_apply' | 'blocked' | 'failed' | 'no_changes'
type CompatibilityReport = NonNullable<SettingsMigrationAnalyzeResponse['data']>
type SettingsCompatibilityChange = SettingsMigrationPlan['changes'][number]

type SettingsMigrationApi = {
  createPlan: () => Promise<SettingsMigrationCreatePlanResponse>
  dryRun: () => Promise<SettingsMigrationDryRunResponse>
  analyze: () => Promise<SettingsMigrationAnalyzeResponse>
  listBackups: () => Promise<SettingsMigrationListBackupsResponse>
}

type ElectronApiWindow = Window & {
  electronAPI?: {
    settingsMigration?: SettingsMigrationApi
  }
}

const statusStyles: Record<PanelStatus, string> = {
  not_analyzed: 'border-slate-200 bg-slate-50 text-slate-600',
  loading: 'border-blue-200 bg-blue-50 text-blue-700',
  safe_to_apply: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blocked: 'border-amber-200 bg-amber-50 text-amber-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  no_changes: 'border-slate-200 bg-white text-slate-600'
}

const statusLabels: Record<PanelStatus, string> = {
  not_analyzed: 'Not analyzed',
  loading: 'Checking',
  safe_to_apply: 'Safe to apply later',
  blocked: 'Blocked',
  failed: 'Failed',
  no_changes: 'No changes'
}

export default function SettingsMigrationPanel() {
  const [status, setStatus] = useState<PanelStatus>('not_analyzed')
  const [plan, setPlan] = useState<SettingsMigrationPlan | null>(null)
  const [analysis, setAnalysis] = useState<CompatibilityReport | null>(null)
  const [backups, setBackups] = useState<SettingsMigrationBackupInfo[]>([])
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const api = getSettingsMigrationApi()
  const isBusy = status === 'loading'

  const displayedChanges = useMemo(() => {
    if (plan?.changes?.length) return plan.changes
    if (analysis?.changes?.length) return analysis.changes
    return []
  }, [analysis, plan])

  const displayedWarnings = plan?.warnings?.length ? plan.warnings : analysis?.warnings ?? []
  const displayedBlockingIssues = plan?.blockingIssues?.length ? plan.blockingIssues : analysis?.blockingIssues ?? []

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (!api) {
      setStatus('failed')
      setError('Settings migration API is unavailable in preload.')
      return
    }

    setStatus('loading')
    setActiveAction(label)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setStatus('failed')
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setActiveAction(null)
    }
  }

  const handleAnalyze = () =>
    runAction('Analyzing', async () => {
      const response = await api!.analyze()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Analyze failed.')
      }
      setAnalysis(response.data)
      setStatus(getReportPanelStatus(response.data))
    })

  const handleCreatePlan = () =>
    runAction('Creating plan', async () => {
      const response = await api!.createPlan()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Plan creation failed.')
      }
      setPlan(response.data)
      setAnalysis(response.data.dryRunResult.report)
      setStatus(getPlanPanelStatus(response.data))
    })

  const handleDryRun = () =>
    runAction('Dry run', async () => {
      const response = await api!.dryRun()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Dry run failed.')
      }
      setPlan(response.data)
      setAnalysis(response.data.dryRunResult.report)
      setStatus(getPlanPanelStatus(response.data))
    })

  const handleRefreshBackups = () =>
    runAction('Refreshing backups', async () => {
      const response = await api!.listBackups()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Backup refresh failed.')
      }
      setBackups(response.data.backups)
      setStatus((current) => (current === 'loading' ? 'not_analyzed' : current))
    })

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-black text-slate-900">Settings migration dry run</h4>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
              Read-only compatibility checks for future cross-platform settings migration.
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-[10.5px] font-bold leading-5 text-cyan-800">
        This panel is read-only. It does not write settings.json, does not auto-migrate, does not overwrite paths, and exposes no write or restore controls.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton label="Analyze" icon={<FileSearch className="h-3.5 w-3.5" />} busy={activeAction === 'Analyzing'} disabled={isBusy} onClick={handleAnalyze} />
        <ActionButton label="Plan" icon={<ClipboardCheck className="h-3.5 w-3.5" />} busy={activeAction === 'Creating plan'} disabled={isBusy} onClick={handleCreatePlan} />
        <ActionButton label="Dry run" icon={<ShieldCheck className="h-3.5 w-3.5" />} busy={activeAction === 'Dry run'} disabled={isBusy} onClick={handleDryRun} />
        <ActionButton label="Backups" icon={<RefreshCw className="h-3.5 w-3.5" />} busy={activeAction === 'Refreshing backups'} disabled={isBusy} onClick={handleRefreshBackups} />
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-[11px] font-bold leading-5 text-rose-700">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <PlanSummary plan={plan} analysis={analysis} />
        <ChangeList changes={displayedChanges} />
        <TextList title="Warnings" items={displayedWarnings} tone="warning" />
        <TextList title="Blocking issues" items={displayedBlockingIssues} tone="blocked" />
        <BackupList backups={backups} />
      </div>
    </section>
  )
}

function getSettingsMigrationApi(): SettingsMigrationApi | null {
  return (window as ElectronApiWindow).electronAPI?.settingsMigration ?? null
}

function getPlanPanelStatus(plan: SettingsMigrationPlan): PanelStatus {
  if (plan.blockingIssues.length > 0 || !plan.canApply) return 'blocked'
  if (!plan.changes.length && !plan.warnings.length) return 'no_changes'
  return 'safe_to_apply'
}

function getReportPanelStatus(report: CompatibilityReport): PanelStatus {
  if (report.blockingIssues.length > 0 || !report.safeToApplyLater) return 'blocked'
  if (!report.wouldChange && !report.warnings.length) return 'no_changes'
  return 'safe_to_apply'
}

function StatusBadge({ status }: { status: PanelStatus }) {
  const icon =
    status === 'failed' ? (
      <XCircle className="h-3.5 w-3.5" />
    ) : status === 'blocked' ? (
      <AlertTriangle className="h-3.5 w-3.5" />
    ) : status === 'loading' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5" />
    )

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[status]}`}>
      {icon}
      {statusLabels[status]}
    </span>
  )
}

function ActionButton({
  label,
  icon,
  busy,
  disabled,
  onClick
}: {
  label: string
  icon: React.ReactNode
  busy: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}

function PlanSummary({ plan, analysis }: { plan: SettingsMigrationPlan | null; analysis: CompatibilityReport | null }) {
  return (
    <details className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <summary className="cursor-pointer text-[11.5px] font-black text-slate-700">Plan summary</summary>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10.5px] font-bold text-slate-500">
        <KeyValue label="id" value={plan?.id ?? '-'} />
        <KeyValue label="generatedAt" value={plan?.generatedAt ?? '-'} />
        <KeyValue label="sourceVersion" value={String(plan?.sourceVersion ?? analysis?.originalVersion ?? '-')} />
        <KeyValue label="targetVersion" value={String(plan?.targetVersion ?? analysis?.targetVersion ?? '-')} />
        <KeyValue label="status" value={plan?.status ?? '-'} />
        <KeyValue label="canApply" value={plan ? String(plan.canApply) : '-'} />
        <KeyValue label="canRollback" value={plan ? String(plan.canRollback) : '-'} />
        <KeyValue label="backupRequired" value={plan ? String(plan.backupRequired) : '-'} />
      </dl>
    </details>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-slate-700" title={value}>
        {value}
      </dd>
    </div>
  )
}

function ChangeList({ changes }: { changes: SettingsCompatibilityChange[] }) {
  return (
    <details className="rounded-2xl border border-slate-100 bg-white p-3">
      <summary className="cursor-pointer text-[11.5px] font-black text-slate-700">Changes ({changes.length})</summary>
      {changes.length ? (
        <ul className="mt-3 space-y-2">
          {changes.map((change) => (
            <li key={`${change.field}-${change.type}-${change.message}`} className="rounded-xl bg-slate-50 p-2 text-[10.5px] font-bold leading-5 text-slate-500">
              <span className="font-black text-slate-700">{change.field}</span>
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[9.5px] font-black uppercase text-slate-400">{change.type}</span>
              <p>{change.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">No changes loaded.</p>
      )}
    </details>
  )
}

function TextList({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'blocked' }) {
  const colorClass = tone === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-rose-700 bg-rose-50 border-rose-100'

  return (
    <details className={`rounded-2xl border p-3 ${items.length ? colorClass : 'border-slate-100 bg-white text-slate-500'}`}>
      <summary className="cursor-pointer text-[11.5px] font-black">{title} ({items.length})</summary>
      {items.length ? (
        <ul className="mt-3 space-y-1.5 text-[10.5px] font-bold leading-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">None reported.</p>
      )}
    </details>
  )
}

function BackupList({ backups }: { backups: SettingsMigrationBackupInfo[] }) {
  return (
    <details className="rounded-2xl border border-slate-100 bg-white p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-[11.5px] font-black text-slate-700">
        <Archive className="h-3.5 w-3.5" />
        Backups ({backups.length})
      </summary>
      {backups.length ? (
        <ul className="mt-3 space-y-2">
          {backups.map((backup) => (
            <li key={backup.name} className="rounded-xl bg-slate-50 p-2 text-[10.5px] font-bold leading-5 text-slate-500">
              <div className="truncate font-black text-slate-700" title={backup.name}>
                {backup.name}
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span>{backup.createdAt ?? 'Unknown time'}</span>
                <span>{formatSize(backup.sizeBytes)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">No backup summaries loaded.</p>
      )}
    </details>
  )
}

function formatSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}
