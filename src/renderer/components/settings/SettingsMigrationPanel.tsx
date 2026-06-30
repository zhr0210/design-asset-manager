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
import type { SettingsMigrationPlan, SettingsCompatibilityChange } from '../../../shared/types/settings-migration.types'
import {
  projectSettingsMigrationBackups,
  projectSettingsMigrationStatus,
  projectSettingsMigrationSummary,
  resolvePlanPanelStatus,
  resolveReportPanelStatus,
  SETTINGS_MIGRATION_EMPTY_LABELS
} from '../../../shared/workflows/settings-migration.workflow'
import type { SettingsMigrationPanelStatus } from '../../../shared/workflows/settings-migration.workflow'

type PanelStatus = SettingsMigrationPanelStatus
type CompatibilityReport = NonNullable<SettingsMigrationAnalyzeResponse['data']>

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
      setError('设置迁移 API 在预加载层中不可用。')
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
        throw new Error(response.error ?? '分析失败。')
      }
      setAnalysis(response.data)
      setStatus(resolveReportPanelStatus(response.data))
    })

  const handleCreatePlan = () =>
    runAction('Creating plan', async () => {
      const response = await api!.createPlan()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '创建迁移方案失败。')
      }
      setPlan(response.data)
      setAnalysis(response.data.dryRunResult.report)
      setStatus(resolvePlanPanelStatus(response.data))
    })

  const handleDryRun = () =>
    runAction('Dry run', async () => {
      const response = await api!.dryRun()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '演练失败。')
      }
      setPlan(response.data)
      setAnalysis(response.data.dryRunResult.report)
      setStatus(resolvePlanPanelStatus(response.data))
    })

  const handleRefreshBackups = () =>
    runAction('Refreshing backups', async () => {
      const response = await api!.listBackups()
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '刷新备份失败。')
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
            <h4 className="text-[14px] font-black text-slate-900">设置迁移演练</h4>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
              用于未来跨平台设置迁移的只读兼容性检查。
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-[10.5px] font-bold leading-5 text-cyan-800">
        此面板为只读。它不会写入 settings.json，不会自动迁移，不会覆盖路径，且不提供任何写入或恢复控件。
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton label="分析" icon={<FileSearch className="h-3.5 w-3.5" />} busy={activeAction === 'Analyzing'} disabled={isBusy} onClick={handleAnalyze} />
        <ActionButton label="规划" icon={<ClipboardCheck className="h-3.5 w-3.5" />} busy={activeAction === 'Creating plan'} disabled={isBusy} onClick={handleCreatePlan} />
        <ActionButton label="演练" icon={<ShieldCheck className="h-3.5 w-3.5" />} busy={activeAction === 'Dry run'} disabled={isBusy} onClick={handleDryRun} />
        <ActionButton label="备份列表" icon={<RefreshCw className="h-3.5 w-3.5" />} busy={activeAction === 'Refreshing backups'} disabled={isBusy} onClick={handleRefreshBackups} />
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
        <TextList items={displayedWarnings} tone="warning" />
        <TextList items={displayedBlockingIssues} tone="blocked" />
        <BackupList backups={backups} />
      </div>
    </section>
  )
}

function getSettingsMigrationApi(): SettingsMigrationApi | null {
  return (window as ElectronApiWindow).electronAPI?.settingsMigration ?? null
}

function StatusBadge({ status }: { status: PanelStatus }) {
  const display = projectSettingsMigrationStatus(status)
  const icon =
    display.iconName === 'x-circle' ? (
      <XCircle className="h-3.5 w-3.5" />
    ) : display.iconName === 'alert-triangle' ? (
      <AlertTriangle className="h-3.5 w-3.5" />
    ) : display.iconName === 'loader' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5" />
    )

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${display.className}`}>
      {icon}
      {display.label}
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
  const fields = projectSettingsMigrationSummary(plan, analysis)
  return (
    <details className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <summary className="cursor-pointer text-[11.5px] font-black text-slate-700">方案摘要</summary>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10.5px] font-bold text-slate-500">
        {fields.map((field) => (
          <KeyValue key={field.key} label={field.label} value={field.value} />
        ))}
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
      <summary className="cursor-pointer text-[11.5px] font-black text-slate-700">变更列表 ({changes.length})</summary>
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
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">{SETTINGS_MIGRATION_EMPTY_LABELS.changes}</p>
      )}
    </details>
  )
}

function TextList({ items, tone }: { items: string[]; tone: 'warning' | 'blocked' }) {
  const colorClass = tone === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-rose-700 bg-rose-50 border-rose-100'
  const displayTitle = tone === 'warning' ? '警告' : '阻断问题'
  const emptyLabel = tone === 'warning' ? SETTINGS_MIGRATION_EMPTY_LABELS.warnings : SETTINGS_MIGRATION_EMPTY_LABELS.blockingIssues

  return (
    <details className={`rounded-2xl border p-3 ${items.length ? colorClass : 'border-slate-100 bg-white text-slate-500'}`}>
      <summary className="cursor-pointer text-[11.5px] font-black">{displayTitle} ({items.length})</summary>
      {items.length ? (
        <ul className="mt-3 space-y-1.5 text-[10.5px] font-bold leading-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">{emptyLabel}</p>
      )}
    </details>
  )
}

function BackupList({ backups }: { backups: SettingsMigrationBackupInfo[] }) {
  const displayedBackups = projectSettingsMigrationBackups(backups)
  return (
    <details className="rounded-2xl border border-slate-100 bg-white p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-[11.5px] font-black text-slate-700">
        <Archive className="h-3.5 w-3.5" />
        备份历史 ({displayedBackups.length})
      </summary>
      {displayedBackups.length ? (
        <ul className="mt-3 space-y-2">
          {displayedBackups.map((backup) => (
            <li key={backup.name} className="rounded-xl bg-slate-50 p-2 text-[10.5px] font-bold leading-5 text-slate-500">
              <div className="truncate font-black text-slate-700" title={backup.name}>
                {backup.name}
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span>{backup.createdAtLabel}</span>
                <span>{backup.sizeLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[10.5px] font-bold text-slate-400">{SETTINGS_MIGRATION_EMPTY_LABELS.backups}</p>
      )}
    </details>
  )
}
