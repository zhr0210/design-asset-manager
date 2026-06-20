import type {
  RuntimePackageExecutionSnapshotPreview,
  RuntimePackageIpcErrorCode,
  RuntimePackageSelectionPreview
} from '../contracts/runtime-package.contract'
import type {
  RuntimePackageExecutionErrorCode,
  RuntimePackageExecutionStage
} from '../types/runtime-package.types'

export type RuntimePackageDisplayTone = 'idle' | 'info' | 'success' | 'warning' | 'error'

export interface RuntimePackageStatusDisplay {
  label: string
  detail: string
  tone: RuntimePackageDisplayTone
  badgeClass: string
  progressClass: string
}

const STAGE_LABELS: Record<RuntimePackageExecutionStage, string> = {
  validating: '正在验证',
  verifying: '正在校验',
  extracting: '正在解压',
  promoting: '正在写入',
  registering: '正在登记',
  completed: '安装完成',
  rolling_back: '正在回滚',
  rolled_back: '已回滚',
  blocked: '已阻止',
  failed: '安装失败'
}

const ERROR_COPY: Record<RuntimePackageIpcErrorCode | RuntimePackageExecutionErrorCode, string> = {
  CONFIRMATION_REQUIRED: '需要明确确认后才能执行安装。',
  MANIFEST_INVALID: '清单格式或内容无效。',
  MANIFEST_UNREADABLE: '无法读取所选清单。',
  PACKAGE_NOT_FOUND: '清单必须只包含一个可选择的运行时包。',
  PACKAGE_NOT_SELECTABLE: '该运行时包不允许通过本地安装流程执行。',
  ARCHIVE_INVALID: '归档文件与清单声明不一致。',
  ARCHIVE_MISSING: '清单引用的同目录 ZIP 归档不存在。',
  CHECKSUM_MISMATCH: '归档文件的 SHA-256 校验失败。',
  SELECTION_EXPIRED: '本次选择已失效，请重新选择清单。',
  EXECUTION_NOT_FOUND: '安装状态已过期或不存在。',
  EXECUTION_FAILED: '运行时包安装未完成。',
  SELECTION_CANCELLED: '未选择运行时包清单。',
  SOURCE_NOT_ALLOWED: '该包来源不在允许范围内。',
  PACKAGE_NOT_ALLOWED: '该包类型不允许安装。',
  ARCHIVE_OUTSIDE_SOURCE: '归档文件不在批准的本地来源目录中。',
  ARCHIVE_ENTRY_UNSAFE: '归档包含不安全的文件条目。',
  MANAGED_PATH_UNSAFE: '目标运行时目录未通过安全检查。',
  INSTALL_TARGET_EXISTS: '目标版本已经存在。',
  REGISTRY_WRITE_FAILED: '运行时登记失败。',
  ROLLBACK_FAILED: '安装失败且回滚未完整完成。'
}

const TONE_CLASSES: Record<RuntimePackageDisplayTone, Pick<RuntimePackageStatusDisplay, 'badgeClass' | 'progressClass'>> = {
  idle: {
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-500',
    progressClass: 'bg-slate-300'
  },
  info: {
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    progressClass: 'bg-blue-500'
  },
  success: {
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    progressClass: 'bg-emerald-500'
  },
  warning: {
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    progressClass: 'bg-amber-500'
  },
  error: {
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    progressClass: 'bg-rose-500'
  }
}

function statusDisplay(
  label: string,
  detail: string,
  tone: RuntimePackageDisplayTone
): RuntimePackageStatusDisplay {
  return { label, detail, tone, ...TONE_CLASSES[tone] }
}

export function projectRuntimePackageIdleDisplay(): RuntimePackageStatusDisplay {
  return statusDisplay('未选择', '请选择本地 runtime-package.json 清单。', 'idle')
}

export function projectRuntimePackageSelectionDisplay(
  selection: RuntimePackageSelectionPreview
): RuntimePackageStatusDisplay {
  return statusDisplay(
    '等待确认',
    `${selection.name} ${selection.version}，${formatRuntimePackageBytes(selection.sizeBytes)}`,
    selection.warnings.length > 0 ? 'warning' : 'info'
  )
}

export function projectRuntimePackageExecutionDisplay(
  snapshot: RuntimePackageExecutionSnapshotPreview
): RuntimePackageStatusDisplay {
  if (snapshot.result?.success) {
    return statusDisplay(
      STAGE_LABELS[snapshot.stage],
      snapshot.result.installedVersion
        ? `已安装版本 ${snapshot.result.installedVersion}。`
        : '运行时包已通过校验并完成登记。',
      'success'
    )
  }
  if (snapshot.result?.errorCode) {
    const tone = snapshot.result.rolledBack ? 'warning' : 'error'
    return statusDisplay(
      snapshot.result.rolledBack ? '失败并已回滚' : STAGE_LABELS[snapshot.stage],
      projectRuntimePackageErrorDetail(snapshot.result.errorCode),
      tone
    )
  }
  if (snapshot.terminal) {
    const tone = snapshot.stage === 'rolled_back' ? 'warning' : 'error'
    return statusDisplay(STAGE_LABELS[snapshot.stage], '运行时包安装已结束。', tone)
  }
  return statusDisplay(
    STAGE_LABELS[snapshot.stage],
    `安装进度 ${clampRuntimePackagePercent(snapshot.percent)}%。`,
    'info'
  )
}

export function projectRuntimePackageErrorDisplay(
  errorCode: RuntimePackageIpcErrorCode | RuntimePackageExecutionErrorCode | undefined
): RuntimePackageStatusDisplay {
  if (errorCode === 'SELECTION_CANCELLED') {
    return statusDisplay('已取消', projectRuntimePackageErrorDetail(errorCode), 'idle')
  }
  return statusDisplay('操作未完成', projectRuntimePackageErrorDetail(errorCode), 'error')
}

export function projectRuntimePackageErrorDetail(
  errorCode: RuntimePackageIpcErrorCode | RuntimePackageExecutionErrorCode | undefined
): string {
  return errorCode ? ERROR_COPY[errorCode] : '主进程未返回可显示的错误详情。'
}

export function clampRuntimePackagePercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, Math.round(percent)))
}

export function formatRuntimePackageBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const formatted = value >= 10 || unitIndex === 0 || Number.isInteger(value)
    ? Math.round(value)
    : value.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}
