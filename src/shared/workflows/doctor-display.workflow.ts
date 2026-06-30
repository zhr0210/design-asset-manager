import type { DoctorCheckResult, DoctorCheckStatus, DoctorReport } from '../types/doctor.types'
import type { PlatformName } from '../types/platform.types'

export type DoctorPanelStatus = DoctorCheckStatus | 'idle' | 'loading'
export type DoctorPanelStatusIcon = 'activity' | 'loading' | 'success' | 'warning'

export interface DoctorStatusDisplay {
  status: DoctorPanelStatus
  label: string
  badgeClass: string
  icon: DoctorPanelStatusIcon
}

export interface DoctorCheckListItem {
  id: string
  label: string
  result: DoctorCheckResult | null
}

export interface DoctorReportSummaryDisplay {
  platformLabel: string
  archLabel: string
  profileLabel: string
  overallLabel: string
  generatedAtLabel: string
  lastRunAtLabel: string
}

export interface DoctorPathEntryDisplay {
  key: string
  pathLabel: string
  status: DoctorCheckStatus | 'unknown'
  statusLabel: string
  statusBadgeClass: string
}

export interface DoctorPathSummaryDisplay {
  empty: boolean
  emptyTitle: string
  emptyMessage: string
  title: string
  description: string
  status: DoctorCheckStatus | 'unknown'
  statusLabel: string
  statusBadgeClass: string
  paths: DoctorPathEntryDisplay[]
  warningTitle: string
  permissionTitle: string
  warnings: string[]
  permissions: string[]
  warningEmptyLabel: string
  permissionEmptyLabel: string
  detailsTitle: string
  details: string[]
}

type PathEntry = {
  key: string
  path?: string
  status?: DoctorCheckStatus | 'unknown'
  writable?: boolean
  warningCount?: number
  issueCount?: number
}

const CHECK_ORDER = ['system', 'path', 'node', 'python', 'port', 'native-deps', 'ai-worker', 'permission']

const DOCTOR_INFO_LABELS: Record<string, string> = {
  platform: '系统',
  arch: '架构',
  profile: '运行配置',
  overall: '总体状态',
  generatedAt: '生成时间',
  lastRunAt: '最近体检'
}

const DOCTOR_PLATFORM_LABELS: Partial<Record<PlatformName, string>> = {
  darwin: 'macOS'
}

const DOCTOR_CHECK_LABELS: Record<string, string> = {
  system: '系统平台',
  path: '路径治理',
  node: 'Node 环境',
  python: 'Python 环境',
  port: '端口占用',
  'native-deps': '原生依赖',
  'ai-worker': 'AI Worker 服务',
  permission: '读写权限'
}

const DOCTOR_STATUS_LABELS: Record<DoctorPanelStatus | 'unknown', string> = {
  idle: '未检测',
  loading: '检测中',
  ok: '正常',
  warning: '提醒',
  error: '错误',
  skipped: '跳过',
  unknown: '未知'
}

const DOCTOR_STATUS_BADGE_CLASSES: Record<DoctorPanelStatus | 'unknown', string> = {
  idle: 'border-slate-200 bg-slate-50 text-slate-500',
  loading: 'border-brand-100 bg-brand-50 text-brand-600',
  ok: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  error: 'border-rose-100 bg-rose-50 text-rose-700',
  skipped: 'border-slate-200 bg-slate-50 text-slate-500',
  unknown: 'border-slate-200 bg-slate-50 text-slate-500'
}

const MANAGED_PATH_KEYS = [
  'userDataDir',
  'configDir',
  'logsDir',
  'debugDir',
  'cacheDir',
  'tempDir',
  'runtimeDir',
  'modelsDir',
  'databaseDir'
]

export function projectDoctorStatusDisplay(status?: DoctorPanelStatus | null): DoctorStatusDisplay {
  const normalized = normalizeDoctorPanelStatus(status)
  return {
    status: normalized,
    label: DOCTOR_STATUS_LABELS[normalized],
    badgeClass: DOCTOR_STATUS_BADGE_CLASSES[normalized],
    icon: projectDoctorStatusIcon(normalized)
  }
}

export function projectDoctorInfoLabel(label: string): string {
  return DOCTOR_INFO_LABELS[label] ?? label
}

export function projectDoctorCheckLabel(id: string, fallbackLabel?: string | null): string {
  return DOCTOR_CHECK_LABELS[id] ?? fallbackLabel ?? id
}

export function projectDoctorDateLabel(value?: string | null): string {
  if (!value) return '无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function projectDoctorDetailsLabel(details?: Record<string, unknown>): string {
  if (!details) return '无'
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

export function projectDoctorReportSummaryDisplay(
  report: DoctorReport | null,
  loading = false
): DoctorReportSummaryDisplay {
  const status = loading ? 'loading' : report?.overallStatus ?? 'idle'
  return {
    platformLabel: projectDoctorPlatformLabel(report?.platform),
    archLabel: report?.arch ?? '未检测',
    profileLabel: report?.profile ?? '未检测',
    overallLabel: projectDoctorStatusDisplay(status).label,
    generatedAtLabel: projectDoctorDateLabel(report?.generatedAt),
    lastRunAtLabel: projectDoctorDateLabel(report?.generatedAt)
  }
}

function projectDoctorPlatformLabel(platform?: PlatformName | null): string {
  if (!platform) return '未检测'
  return DOCTOR_PLATFORM_LABELS[platform] ?? platform
}

export function projectDoctorCheckList(
  report: DoctorReport | null,
  knownChecks: readonly { id: string; label: string }[]
): DoctorCheckListItem[] {
  const resultById = new Map(report?.checks.map((check) => [check.id, check]) ?? [])
  const labelById = new Map(knownChecks.map((check) => [check.id, check.label]))
  const ids = new Set([...CHECK_ORDER, ...knownChecks.map((check) => check.id), ...resultById.keys()])

  return Array.from(ids).map((id) => {
    const result = resultById.get(id) ?? null
    return {
      id,
      label: projectDoctorCheckLabel(id, result?.label ?? labelById.get(id)),
      result
    }
  })
}

export function projectDoctorPathSummaryDisplay(report: DoctorReport | null): DoctorPathSummaryDisplay {
  if (!report) {
    return {
      empty: true,
      emptyTitle: '路径治理',
      emptyMessage: '尚未加载 Doctor 体检报告。',
      title: '路径治理',
      description: '来自最近一次 Doctor 报告的只读托管路径摘要。',
      status: 'unknown',
      statusLabel: DOCTOR_STATUS_LABELS.unknown,
      statusBadgeClass: DOCTOR_STATUS_BADGE_CLASSES.unknown,
      paths: [],
      warningTitle: '路径提醒',
      permissionTitle: '权限探测',
      warnings: [],
      permissions: [],
      warningEmptyLabel: '未报告路径提醒。',
      permissionEmptyLabel: '未报告权限探测提醒。',
      detailsTitle: '详情',
      details: []
    }
  }

  const pathCheck = report.checks.find((check) => check.id === 'path') ?? null
  const permissionCheck = report.checks.find((check) => check.id === 'permission') ?? null
  const paths = collectPaths(pathCheck, permissionCheck)
  const warnings = collectAuditItems(pathCheck)
  const permissions = collectPermissionItems(permissionCheck)
  const status = resolvePathSummaryStatus(pathCheck, permissionCheck, warnings, permissions)

  return {
    empty: false,
    emptyTitle: '路径治理',
    emptyMessage: '尚未加载 Doctor 体检报告。',
    title: '路径治理',
    description: '来自最近一次 Doctor 报告的只读托管路径摘要。',
    status,
    statusLabel: DOCTOR_STATUS_LABELS[status],
    statusBadgeClass: DOCTOR_STATUS_BADGE_CLASSES[status],
    paths: paths.map((item) => ({
      key: item.key,
      pathLabel: maskDoctorPath(item.path),
      status: item.status ?? 'unknown',
      statusLabel: DOCTOR_STATUS_LABELS[item.status ?? 'unknown'],
      statusBadgeClass: DOCTOR_STATUS_BADGE_CLASSES[item.status ?? 'unknown']
    })),
    warningTitle: '路径提醒',
    permissionTitle: '权限探测',
    warnings,
    permissions,
    warningEmptyLabel: '未报告路径提醒。',
    permissionEmptyLabel: '未报告权限探测提醒。',
    detailsTitle: '详情',
    details: [
      `已汇总 ${paths.length} 个托管路径条目。`,
      `报告中包含 ${warnings.length} 条路径提醒或阻塞项。`,
      `报告中包含 ${permissions.length} 条权限探测提醒。`
    ]
  }
}

export function maskDoctorPath(value?: string): string {
  if (!value) return 'unknown'
  const normalized = value.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 2) return normalized
  return `.../${parts.slice(-2).join('/')}`
}

function normalizeDoctorPanelStatus(status?: DoctorPanelStatus | null): DoctorPanelStatus {
  if (
    status === 'idle'
    || status === 'loading'
    || status === 'ok'
    || status === 'warning'
    || status === 'error'
    || status === 'skipped'
  ) {
    return status
  }
  return 'idle'
}

function projectDoctorStatusIcon(status: DoctorPanelStatus): DoctorPanelStatusIcon {
  if (status === 'loading') return 'loading'
  if (status === 'ok') return 'success'
  if (status === 'warning' || status === 'error') return 'warning'
  return 'activity'
}

function collectPaths(pathCheck: DoctorCheckResult | null, permissionCheck: DoctorCheckResult | null): PathEntry[] {
  const details = pathCheck?.details ?? {}
  const rawPaths = asRecord(details.paths)
  const logPaths = asRecord(details.logPaths)
  const cacheTempPaths = asRecord(details.cacheTempPaths)
  const auditByKey = new Map<string, PathEntry>()
  const checkedPaths = asArray(asRecord(details.audit).checkedPaths)

  for (const item of checkedPaths) {
    const record = asRecord(item)
    const key = String(record.key ?? '')
    if (!key) continue
    auditByKey.set(key, {
      key,
      path: stringValue(record.path),
      status: statusValue(record.status),
      warningCount: asArray(record.warnings).length,
      issueCount: asArray(record.blockingIssues).length
    })
  }

  const permissionByLabel = new Map<string, boolean>()
  const permissionDetails = permissionCheck?.details ?? {}
  for (const groupKey of ['paths', 'logPaths', 'cacheTempPaths']) {
    for (const item of asArray(asRecord(permissionDetails)[groupKey])) {
      const record = asRecord(item)
      const label = String(record.label ?? '')
      if (label) permissionByLabel.set(label, record.writable === true)
    }
  }

  return MANAGED_PATH_KEYS.map((key) => {
    const pathRecord = asRecord(rawPaths[key])
    const logRecord = asRecord(logPaths[key])
    const cacheRecord = asRecord(cacheTempPaths[key])
    const auditRecord = auditByKey.get(key)
    const pathValue = stringValue(pathRecord.path) ?? stringValue(logRecord.path) ?? stringValue(cacheRecord.path) ?? auditRecord?.path
    const warningCount = auditRecord?.warningCount ?? 0
    const issueCount = auditRecord?.issueCount ?? 0

    return {
      key,
      path: pathValue,
      writable: permissionByLabel.get(key),
      warningCount,
      issueCount,
      status: statusForPath(pathCheck?.status, permissionByLabel.get(key), warningCount, issueCount)
    }
  })
}

function collectAuditItems(pathCheck: DoctorCheckResult | null): string[] {
  const audit = asRecord(pathCheck?.details?.audit)
  return [...asStringArray(audit.blockingIssues), ...asStringArray(audit.warnings)].map(maskDoctorPath)
}

function collectPermissionItems(permissionCheck: DoctorCheckResult | null): string[] {
  const details = permissionCheck?.details ?? {}
  const items: string[] = []
  for (const groupKey of ['paths', 'logPaths', 'cacheTempPaths']) {
    for (const item of asArray(asRecord(details)[groupKey])) {
      const record = asRecord(item)
      if (record.writable === false) {
        items.push(`${String(record.label ?? 'path')}: ${String(record.error ?? 'not writable')}`)
      }
    }
  }
  return items.map(maskDoctorPath)
}

function resolvePathSummaryStatus(
  pathCheck: DoctorCheckResult | null,
  permissionCheck: DoctorCheckResult | null,
  warnings: string[],
  permissions: string[]
): DoctorCheckStatus | 'unknown' {
  if (pathCheck?.status === 'error' || permissionCheck?.status === 'error') return 'error'
  if (warnings.length > 0 || permissions.length > 0 || pathCheck?.status === 'warning' || permissionCheck?.status === 'warning') return 'warning'
  if (pathCheck || permissionCheck) return 'ok'
  return 'unknown'
}

function statusForPath(
  pathStatus: DoctorCheckStatus | undefined,
  writable: boolean | undefined,
  warningCount: number,
  issueCount: number
): DoctorCheckStatus | 'unknown' {
  if (issueCount > 0) return 'error'
  if (warningCount > 0 || writable === false || pathStatus === 'warning') return 'warning'
  if (writable === true || pathStatus === 'ok') return 'ok'
  return 'unknown'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map((item) => String(item))
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function statusValue(value: unknown): DoctorCheckStatus | 'unknown' {
  return value === 'ok' || value === 'warning' || value === 'error' || value === 'skipped' ? value : 'unknown'
}
