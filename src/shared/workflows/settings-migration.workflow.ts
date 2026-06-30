import type { CompatibilityReport, SettingsMigrationPlan } from '../types/settings-migration.types'

export type SettingsMigrationPanelStatus =
  | 'not_analyzed'
  | 'loading'
  | 'safe_to_apply'
  | 'blocked'
  | 'failed'
  | 'no_changes'

export interface SettingsMigrationStatusDisplay {
  status: SettingsMigrationPanelStatus
  label: string
  className: string
  iconName: 'check-circle' | 'alert-triangle' | 'loader' | 'x-circle'
}

export function projectSettingsMigrationStatus(status: SettingsMigrationPanelStatus): SettingsMigrationStatusDisplay {
  const styles: Record<SettingsMigrationPanelStatus, string> = {
    not_analyzed: 'border-slate-200 bg-slate-50 text-slate-600',
    loading: 'border-blue-200 bg-blue-50 text-blue-700',
    safe_to_apply: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blocked: 'border-amber-200 bg-amber-50 text-amber-700',
    failed: 'border-rose-200 bg-rose-50 text-rose-700',
    no_changes: 'border-slate-200 bg-white text-slate-600'
  }

  const labels: Record<SettingsMigrationPanelStatus, string> = {
    not_analyzed: '尚未分析',
    loading: '检查中',
    safe_to_apply: '可安全应用',
    blocked: '已阻断',
    failed: '失败',
    no_changes: '无变更'
  }

  const icons: Record<SettingsMigrationPanelStatus, SettingsMigrationStatusDisplay['iconName']> = {
    not_analyzed: 'check-circle',
    loading: 'loader',
    safe_to_apply: 'check-circle',
    blocked: 'alert-triangle',
    failed: 'x-circle',
    no_changes: 'check-circle'
  }

  return {
    status,
    label: labels[status] || '未知状态',
    className: styles[status] || 'border-slate-200 bg-slate-50 text-slate-600',
    iconName: icons[status] || 'check-circle'
  }
}

export function resolvePlanPanelStatus(plan: SettingsMigrationPlan | null): SettingsMigrationPanelStatus {
  if (!plan) return 'not_analyzed'
  if (plan.blockingIssues && plan.blockingIssues.length > 0) return 'blocked'
  if (!plan.canApply) return 'blocked'
  if ((!plan.changes || !plan.changes.length) && (!plan.warnings || !plan.warnings.length)) return 'no_changes'
  return 'safe_to_apply'
}

export function resolveReportPanelStatus(report: CompatibilityReport | null): SettingsMigrationPanelStatus {
  if (!report) return 'not_analyzed'
  if (report.blockingIssues && report.blockingIssues.length > 0) return 'blocked'
  if (!report.safeToApplyLater) return 'blocked'
  if (!report.wouldChange && (!report.warnings || !report.warnings.length)) return 'no_changes'
  return 'safe_to_apply'
}

export interface SettingsMigrationSummaryField {
  key: string
  label: string
  value: string
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  pending: '待处理',
  safe_to_apply: '可安全应用',
  blocked: '已阻断',
  applied: '已应用',
  rolled_back: '已回滚',
  failed: '已失败'
}

export function projectSettingsMigrationSummary(
  plan: SettingsMigrationPlan | null,
  analysis: CompatibilityReport | null
): SettingsMigrationSummaryField[] {
  const formatBool = (val?: boolean | null): string => {
    if (val === true) return '是'
    if (val === false) return '否'
    return '-'
  }

  const statusVal = plan?.status ? (STATUS_TRANSLATIONS[plan.status] || plan.status) : '-'

  return [
    { key: 'id', label: '方案 ID', value: plan?.id ?? '-' },
    { key: 'generatedAt', label: '生成时间', value: plan?.generatedAt ?? '-' },
    { key: 'sourceVersion', label: '源版本', value: String(plan?.sourceVersion ?? analysis?.originalVersion ?? '-') },
    { key: 'targetVersion', label: '目标版本', value: String(plan?.targetVersion ?? analysis?.targetVersion ?? '-') },
    { key: 'status', label: '状态', value: statusVal },
    { key: 'canApply', label: '可应用', value: formatBool(plan?.canApply) },
    { key: 'canRollback', label: '可回滚', value: formatBool(plan?.canRollback) },
    { key: 'backupRequired', label: '需要备份', value: formatBool(plan?.backupRequired) }
  ]
}

export function formatBackupSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}

export interface SettingsMigrationBackupDisplay {
  name: string
  createdAtLabel: string
  sizeLabel: string
}

export function projectSettingsMigrationBackups(
  backups: { name: string; createdAt: string | null; sizeBytes: number }[]
): SettingsMigrationBackupDisplay[] {
  return backups.map((backup) => ({
    name: backup.name,
    createdAtLabel: backup.createdAt ?? '未知时间',
    sizeLabel: formatBackupSize(backup.sizeBytes)
  }))
}

export interface SettingsMigrationEmptyLabels {
  changes: string
  warnings: string
  blockingIssues: string
  backups: string
}

export const SETTINGS_MIGRATION_EMPTY_LABELS: SettingsMigrationEmptyLabels = {
  changes: '未加载任何变更。',
  warnings: '无警告记录。',
  blockingIssues: '无阻断问题。',
  backups: '无备份记录。'
}
