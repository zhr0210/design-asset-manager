import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, FolderTree, ShieldAlert } from 'lucide-react'
import type { DoctorCheckResult, DoctorCheckStatus, DoctorReport } from '../../../shared/types/doctor.types'

type PathEntry = {
  key: string
  path?: string
  exists?: boolean
  isDirectory?: boolean
  status?: DoctorCheckStatus | 'unknown'
  writable?: boolean
  warningCount?: number
  issueCount?: number
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

const PATH_LABELS: Record<string, string> = {
  userDataDir: '用户数据',
  configDir: '配置目录',
  logsDir: '日志目录',
  debugDir: '调试日志',
  cacheDir: '缓存目录',
  tempDir: '临时目录',
  runtimeDir: '运行时目录',
  modelsDir: '模型目录',
  databaseDir: '数据库目录'
}

const STATUS_LABELS: Record<DoctorCheckStatus | 'unknown', string> = {
  ok: '正常',
  warning: '提醒',
  error: '错误',
  skipped: '跳过',
  unknown: '未知'
}

const STATUS_STYLE: Record<DoctorCheckStatus | 'unknown', string> = {
  ok: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  error: 'border-rose-100 bg-rose-50 text-rose-700',
  skipped: 'border-slate-200 bg-slate-50 text-slate-500',
  unknown: 'border-slate-200 bg-slate-50 text-slate-500'
}

export function PathGovernanceSummary({ report }: { report: DoctorReport | null }) {
  const summary = useMemo(() => buildSummary(report), [report])

  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="flex items-center gap-2 text-[12px] font-black text-slate-700">
          <FolderTree className="h-4 w-4 text-slate-400" />
          路径治理摘要
        </div>
        <p className="mt-2 text-[10.5px] font-semibold leading-5 text-slate-400">尚未加载系统体检报告。</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-black text-slate-800">
            <FolderTree className="h-4 w-4 text-brand-500" />
            路径治理摘要
          </div>
          <p className="mt-1 text-[10.5px] font-semibold leading-5 text-slate-400">
            根据最近一次系统体检生成的只读路径状态汇总。
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-black ${STATUS_STYLE[summary.status]}`}>
          {STATUS_LABELS[summary.status]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {summary.paths.map((item) => (
          <PathRow key={item.key} item={item} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <SummaryBox
          icon={AlertTriangle}
          label="路径提醒"
          items={summary.warnings}
          empty="未发现路径治理提醒。"
        />
        <SummaryBox
          icon={ShieldAlert}
          label="权限探测"
          items={summary.permissions}
          empty="未发现权限探测提醒。"
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer select-none text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600">
          原始摘要
        </summary>
        <div className="mt-2 space-y-2 text-[10px] font-semibold leading-5 text-slate-500">
          {summary.details.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              {item}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function PathRow({ item }: { item: PathEntry }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-[10px] font-black text-slate-500">{PATH_LABELS[item.key] ?? item.key}</span>
      <span className="truncate text-[10px] font-semibold text-slate-500" title={maskPath(item.path)}>
        {maskPath(item.path)}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${STATUS_STYLE[item.status ?? 'unknown']}`}>
        {STATUS_LABELS[item.status ?? 'unknown']}
      </span>
    </div>
  )
}

function SummaryBox({
  icon: Icon,
  label,
  items,
  empty
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  items: string[]
  empty: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 space-y-1">
        {(items.length > 0 ? items : [empty]).slice(0, 5).map((item) => (
          <p key={item} className="text-[10px] font-semibold leading-5 text-slate-500">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}

function buildSummary(report: DoctorReport | null) {
  const pathCheck = report?.checks.find((check) => check.id === 'path') ?? null
  const permissionCheck = report?.checks.find((check) => check.id === 'permission') ?? null
  const paths = collectPaths(pathCheck, permissionCheck)
  const warnings = collectAuditItems(pathCheck)
  const permissions = collectPermissionItems(permissionCheck)
  const status = resolveSummaryStatus(pathCheck, permissionCheck, warnings, permissions)

  return {
    status,
    paths,
    warnings,
    permissions,
    details: [
      `已汇总 ${paths.length} 个托管路径。`,
      `发现 ${warnings.length} 条路径提醒或阻塞项。`,
      `发现 ${permissions.length} 条权限探测提醒。`
    ]
  }
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
      exists: booleanValue(pathRecord.exists),
      isDirectory: booleanValue(pathRecord.isDirectory),
      writable: permissionByLabel.get(key),
      warningCount,
      issueCount,
      status: statusForPath(pathCheck?.status, permissionByLabel.get(key), warningCount, issueCount)
    }
  })
}

function collectAuditItems(pathCheck: DoctorCheckResult | null): string[] {
  const audit = asRecord(pathCheck?.details?.audit)
  return [...asStringArray(audit.blockingIssues), ...asStringArray(audit.warnings)].map(maskPath)
}

function collectPermissionItems(permissionCheck: DoctorCheckResult | null): string[] {
  const details = permissionCheck?.details ?? {}
  const items: string[] = []
  for (const groupKey of ['paths', 'logPaths', 'cacheTempPaths']) {
    for (const item of asArray(asRecord(details)[groupKey])) {
      const record = asRecord(item)
      if (record.writable === false) {
        const label = PATH_LABELS[String(record.label ?? '')] ?? String(record.label ?? '路径')
        items.push(`${label}: ${String(record.error ?? '不可写').replace(/not writable/i, '不可写')}`)
      }
    }
  }
  return items.map(maskPath)
}

function resolveSummaryStatus(
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

function maskPath(value?: string): string {
  if (!value) return '未知'
  const normalized = value.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 2) return normalized
  return `.../${parts.slice(-2).join('/')}`
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

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function statusValue(value: unknown): DoctorCheckStatus | 'unknown' {
  return value === 'ok' || value === 'warning' || value === 'error' || value === 'skipped' ? value : 'unknown'
}
