import { DownloadTask } from '../types/download.types'

/**
 * 📥 资源抓取下载排队通信契约 (Shared Download IPC Contracts)
 */

export const CHANNEL_DOWNLOAD_LIST = 'download:list'
export const CHANNEL_DOWNLOAD_SAVE = 'download:save'
export const CHANNEL_DOWNLOAD_CLEAR = 'download:clear'
export const CHANNEL_DOWNLOAD_ENQUEUE = 'download:enqueue'
export const CHANNEL_DOWNLOAD_RETRY = 'download:retry'

// Injected Web Page Download Triggers (安全反向注入触发信道)
export const EVENT_DOWNLOAD_INJECTED_TRIGGER = 'download:injected-trigger'

// DTOs
export interface ListDownloadsResponse {
  success: boolean
  tasks?: DownloadTask[]
  error?: string
}

export interface SaveDownloadRequest {
  task: Partial<DownloadTask>
}

export interface SaveDownloadResponse {
  success: boolean
  task?: DownloadTask
  error?: string
}

export interface EnqueueDownloadRequest {
  task: Partial<DownloadTask>
}

export interface EnqueueDownloadResponse {
  success: boolean
  taskId?: string
  error?: string
}

export interface RetryDownloadRequest {
  id: string
}

export interface RetryDownloadResponse {
  success: boolean
  error?: string
}
