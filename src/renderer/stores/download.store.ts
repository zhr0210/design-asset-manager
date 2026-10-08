import { getWorkspaceClient } from '../workspace-client'
import type { PrepareDownload } from '../../shared/contracts/managed-download.contract'
import { create } from 'zustand'
import type { ManagedDownloadJob, ManagedDownloadReview } from '../../shared/contracts/managed-download.contract'
import type { DownloadTask as DbDownloadTask } from '../../shared/types/download.types'
import {
  DOWNLOAD_EXECUTION_UNAVAILABLE,
  normalizeDownloadStatus,
  projectDownloadTaskSummaryDisplay
} from '../../shared/workflows/download-status.workflow'

export interface DownloadTask {
  id: string
  assetTitle: string
  sourceSiteId: string
  sourceSiteName: string
  sourcePageUrl: string
  downloadUrl: string
  savePath: string
  status: 'waiting' | 'downloading' | 'completed' | 'failed'
  progress: number
  errorMessage?: string
  retryCount: number
  fileSize?: number
  thumbnailUrl: string
  browserPageTitle?: string
  captureMethod?: string
  historyOnly?: boolean
}

interface DownloadState {
  review: ManagedDownloadReview | null
  jobs: ManagedDownloadJob[]
  prepareManaged(url: string, fileName?: string, persistence?: 'memory' | 'library'): Promise<void>
  prepareResume(id: string, action?: 'resume' | 'abandon'): Promise<void>
  confirmManaged(): Promise<void>
  dismissReview(): void
  loadManaged(requireSuccess?: boolean): Promise<void>
  cancelManaged(id: string): Promise<void>

  tasks: DownloadTask[]
  activeDownloadsCount: number
  loadError: string | null
  loadDownloads(requireSuccess?: boolean): Promise<void>
  retryTask(id: string): Promise<void>
  clearCompleted(): Promise<void>
}

interface DownloadHistoryBridge {
  listDownloads(): Promise<DbDownloadTask[]>
  clearDownloads(): Promise<{ success: boolean }>

}

const win = window as unknown as {
  damClient?: DownloadHistoryBridge & { managedDownloads?: {
    prepare(input: PrepareDownload): Promise<any>
    run(receipt: string): Promise<any>
    list(): Promise<any>
    retry(id: string): Promise<any>
    cancel(id: string): Promise<any>
  } }
}
const api = getWorkspaceClient()
let loadVersion = 0
let managedLoadVersion = 0
let managedReviewVersion = 0
const MANAGED_STATE_ERROR = '下载状态暂时无法读取。'

function mapDbTaskToTask(task: DbDownloadTask): DownloadTask {
  return {
    id: task.id,
    assetTitle: task.asset_title,
    sourceSiteId: task.source_site_id,
    sourceSiteName: task.source_site_name || task.source_site_id || 'Unknown',
    sourcePageUrl: task.source_page_url || '',
    downloadUrl: task.download_url,
    savePath: task.save_path,
    status: normalizeDownloadStatus(task.status),
    progress: task.progress ?? 0,
    errorMessage: undefined,
    retryCount: task.retry_count ?? 0,
    // History has no verified preview; the download URL must not become an automatic image request.
    thumbnailUrl: '',
    browserPageTitle: task.browser_page_title || '',
    captureMethod: task.capture_method || 'search',
    historyOnly: true
  }
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  review: null, jobs: [],
  prepareManaged: async (url, fileName, persistence) => {
    const version = ++managedReviewVersion
    set({ review: null, loadError: null })
    if (!api?.managedDownloads) { set({ loadError: '当前环境不支持下载执行。' }); return }
    try { const response = await api.managedDownloads.prepare({ url, ...(fileName ? { fileName } : {}), ...(persistence ? { persistence } : {}) }); if (version !== managedReviewVersion) return; if (!response.ok) throw new Error(response.error); set({ review: response.value, loadError: null }); window.dispatchEvent(new Event('managed-download-review')) }
    catch (error) { if (version !== managedReviewVersion) return; set({ loadError: error instanceof Error ? error.message : '无法准备下载。' }); window.dispatchEvent(new Event('managed-download-review')) }
  },
  prepareResume: async (id, action = 'resume') => {
    const version = ++managedReviewVersion
    set({ review: null, loadError: null })
    try {
      const response = await api?.managedDownloads?.prepare(action === 'abandon' ? { abandonTaskId: id } : { resumeTaskId: id })
      if (version !== managedReviewVersion) return
      if (!response?.ok) throw new Error(response?.error ?? '当前无法准备恢复。')
      set({ review: response.value, loadError: null })
    } catch (error) { if (version === managedReviewVersion) set({ loadError: error instanceof Error ? error.message : MANAGED_STATE_ERROR }) }
  },
  confirmManaged: async () => {
    const review = get().review
    if (!review || !api?.managedDownloads) return
    ++managedReviewVersion
    set({ review: null, loadError: null })
    try { const response = await api.managedDownloads.run(review.receipt); if (!response.ok) throw new Error(response.error); set({ loadError: null }); await get().loadManaged() }
    catch (error) { set({ loadError: error instanceof Error ? error.message : '下载未启动。' }) }
  },
  dismissReview: () => { ++managedReviewVersion; set({ review: null }) },
  loadManaged: async (requireSuccess = false) => {
    if (!api?.managedDownloads) { if (requireSuccess) throw Error('DOWNLOAD_API_UNAVAILABLE'); return }
    const version = ++managedLoadVersion
    try {
      const response = await api.managedDownloads.list()
      if (version !== managedLoadVersion) return
      if (!response.ok || !Array.isArray(response.value)) throw new Error('MANAGED_STATE_UNAVAILABLE')
      const activeDownloadsCount = response.value.filter((job: ManagedDownloadJob) => ['queued', 'downloading', 'importing'].includes(job.state)).length
      set(state => ({ jobs: response.value, activeDownloadsCount, loadError: state.loadError === MANAGED_STATE_ERROR ? null : state.loadError }))
    } catch (error) { if (version === managedLoadVersion) set({ loadError: MANAGED_STATE_ERROR }); if (requireSuccess) throw error }
  },
  cancelManaged: async id => {
    try { const response = await api?.managedDownloads?.cancel(id); if (!response?.ok) throw new Error(response?.error); set({ loadError: null }); await get().loadManaged() }
    catch (error) { set({ loadError: error instanceof Error ? error.message : '未能取消下载。' }) }
  },
  tasks: [],
  activeDownloadsCount: 0,
  loadError: null,

  loadDownloads: async (requireSuccess = false) => {
    if (!api) { if (requireSuccess) throw Error('DOWNLOAD_API_UNAVAILABLE'); return }
    const version = ++loadVersion
    try {
      const history = (await api.listDownloads()).map(mapDbTaskToTask)
      if (version !== loadVersion) return
      set((state) => {
        const tasks = [...state.tasks.filter((task) => !task.historyOnly), ...history]
        return { tasks, loadError: null,
          activeDownloadsCount: state.jobs.filter(job => ['queued', 'downloading', 'importing'].includes(job.state)).length + projectDownloadTaskSummaryDisplay(tasks).activeCount }
      })
    } catch (error) {
      if (version === loadVersion) set({ loadError: '无法读取下载历史，请稍后刷新。' })
      if (requireSuccess) throw error
    }
  },

  retryTask: async (id) => {
    if (get().jobs.some(job => job.id === id) && api?.managedDownloads) {
      try { const response = await api.managedDownloads.retry(id); if (!response.ok) throw new Error(response.error); set({ loadError: null }); await get().loadManaged() }
      catch (error) { set({ loadError: error instanceof Error ? error.message : '未能重试。' }) }
      return
    }
    set((state) => ({ tasks: state.tasks.map((task) =>
      task.id === id && !task.historyOnly
        ? { ...task, status: 'failed', progress: 0, errorMessage: DOWNLOAD_EXECUTION_UNAVAILABLE }
        : task
    ) }))
  },

  clearCompleted: async () => {
    if (!api) return
    ++loadVersion
    try {
      const result = await api.clearDownloads()
      if (!result.success) throw new Error('DOWNLOAD_HISTORY_CLEAR_FAILED')
      await get().loadDownloads()
    } catch {
      set({ loadError: '无法清空历史记录，请稍后重试。' })
    }
  }
}))

void useDownloadStore.getState().loadDownloads()
