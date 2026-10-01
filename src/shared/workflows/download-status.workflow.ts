export type DownloadTaskStatus = 'waiting' | 'downloading' | 'completed' | 'failed' | string

export const DOWNLOAD_EXECUTION_UNAVAILABLE =
  '当前版本下载功能不可用，文件未下载，也未加入素材库。此请求仅保留在本次会话。'

export type DownloadStatusIconKey = 'clock' | 'loader' | 'check' | 'alert'

export interface DownloadTaskLike {
  status?: DownloadTaskStatus | null
  id?: string | null
  assetTitle?: string | null
  sourceSiteName?: string | null
  thumbnailUrl?: string | null
  fileSize?: number | null
  progress?: number | null
  historyOnly?: boolean
}

export interface DownloadTaskStatusDisplay {
  normalizedStatus: 'waiting' | 'downloading' | 'completed' | 'failed'
  label: string
  badgeClass: string
  iconKey: DownloadStatusIconKey
  iconClass: string
  progressClass: string
  isActive: boolean
  isCompleted: boolean
  isFailed: boolean
}

export interface DownloadTaskSummaryDisplay {
  activeCount: number
  completedCount: number
  isDownloading: boolean
  topbarLabel: string
  emptyQueueLabel: string
  emptyQueueDetail: string
}

export interface DownloadSearchActionDisplay {
  disabled: boolean
  label: string
  iconKey: 'download' | 'clock' | 'image'
  buttonClass: string
}

export interface DownloadQueueRowDisplay {
  id: string
  titleLabel: string
  sourceSiteLabel: string
  thumbnailSrc: string
  fileSizeLabel: string
  hasFileSize: boolean
  progressPercent: number
  progressLabel: string
  status: DownloadTaskStatusDisplay
}

export function projectDownloadTaskStatusDisplay(status?: DownloadTaskStatus | null): DownloadTaskStatusDisplay {
  const normalizedStatus = normalizeDownloadStatus(status)

  if (normalizedStatus === 'completed') {
    return {
      normalizedStatus,
      label: '已完成',
      badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      iconKey: 'check',
      iconClass: 'text-emerald-500',
      progressClass: 'bg-emerald-500',
      isActive: false,
      isCompleted: true,
      isFailed: false
    }
  }

  if (normalizedStatus === 'failed') {
    return {
      normalizedStatus,
      label: '失败',
      badgeClass: 'bg-rose-50 text-rose-600 border border-rose-100',
      iconKey: 'alert',
      iconClass: 'text-rose-500',
      progressClass: 'bg-rose-500',
      isActive: false,
      isCompleted: false,
      isFailed: true
    }
  }

  if (normalizedStatus === 'downloading') {
    return {
      normalizedStatus,
      label: '下载中',
      badgeClass: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      iconKey: 'loader',
      iconClass: 'text-brand-500 animate-spin',
      progressClass: 'bg-brand-500',
      isActive: true,
      isCompleted: false,
      isFailed: false
    }
  }

  return {
    normalizedStatus,
    label: '排队等待',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
    iconKey: 'clock',
    iconClass: 'text-slate-400',
    progressClass: 'bg-brand-500',
    isActive: true,
    isCompleted: false,
    isFailed: false
  }
}

export function projectDownloadTaskSummaryDisplay(tasks: readonly DownloadTaskLike[]): DownloadTaskSummaryDisplay {
  const statuses = tasks.filter((task) => !task.historyOnly)
    .map((task) => projectDownloadTaskStatusDisplay(task.status))
  const activeCount = statuses.filter((status) => status.isActive).length
  const completedCount = statuses.filter((status) => status.isCompleted).length
  const isDownloading = statuses.some((status) => status.normalizedStatus === 'downloading')

  return {
    activeCount,
    completedCount,
    isDownloading,
    topbarLabel: '下载中',
    emptyQueueLabel: '当前没有任何下载队列任务',
    emptyQueueDetail: '粘贴直连图片地址，或从网页采集发起下载。'
  }
}

export function projectDownloadQueueRowDisplay(task: DownloadTaskLike): DownloadQueueRowDisplay {
  const progressPercent = task.historyOnly ? 0 : normalizeProgress(task.progress)
  const fileSizeLabel = formatDownloadFileSize(task.fileSize)

  return {
    id: task.id || '',
    titleLabel: task.assetTitle?.trim() || '未命名下载',
    sourceSiteLabel: task.sourceSiteName?.trim() || 'Unknown',
    thumbnailSrc: task.thumbnailUrl || '',
    fileSizeLabel,
    hasFileSize: fileSizeLabel !== '',
    progressPercent,
    progressLabel: task.historyOnly ? '—' : `${progressPercent}%`,
    status: task.historyOnly ? {
      ...projectDownloadTaskStatusDisplay('waiting'),
      label: '历史记录 · 未核验',
      isActive: false
    } : projectDownloadTaskStatusDisplay(task.status)
  }
}

export function projectDownloadSearchActionDisplay(status?: DownloadTaskStatus | null, canPrepare = false): DownloadSearchActionDisplay {
  if (canPrepare) return { disabled: false, label: '下载并入库', iconKey: 'download', buttonClass: 'bg-brand-500 text-white hover:bg-brand-600' }
  if (!status) {
    return {
      disabled: true,
      label: '暂不可下载',
      iconKey: 'download',
      buttonClass: 'bg-slate-100 text-slate-500'
    }
  }

  const display = projectDownloadTaskStatusDisplay(status)
  if (display.isCompleted) {
    return {
      disabled: true,
      label: '有下载记录',
      iconKey: 'image',
      buttonClass: 'bg-slate-100 text-slate-500'
    }
  }

  return {
    disabled: true,
    label: '暂不可下载',
    iconKey: 'clock',
    buttonClass: 'bg-brand-50 text-brand-600'
  }
}

export function normalizeDownloadStatus(status?: DownloadTaskStatus | null): 'waiting' | 'downloading' | 'completed' | 'failed' {
  return status === 'completed' || status === 'failed' || status === 'downloading' ? status : 'waiting'
}

export function normalizeProgress(progress?: number | null): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress)))
}

export function formatDownloadFileSize(bytes?: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return ''
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
