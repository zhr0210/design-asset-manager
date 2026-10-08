export const CHANNEL_DOWNLOAD_PREPARE = 'download:prepare'
export const CHANNEL_DOWNLOAD_JOBS = 'download:jobs'
export const CHANNEL_DOWNLOAD_CANCEL = 'download:cancel'
export type PrepareDownload = { url: string; fileName?: string; persistence?: 'memory' | 'library' } | { resumeTaskId: string } | { abandonTaskId: string }
export interface ManagedDownloadReview { action?: 'abandon'; persistence?: 'memory' | 'library'; upgradesLibrary?: boolean; resumeTaskId?: string; checkpointBytes?: number; recovery?: 'network' | 'local'; receipt: string; fileName: string; origin: string; libraryIdentity: string; generation: string }
export interface ManagedDownloadJob {
  id: string; fileName: string; origin: string; libraryIdentity: string; generation: string
  state: 'queued' | 'downloading' | 'importing' | 'completed' | 'failed' | 'cancelled' | 'recovery-required'
  abandoned?: boolean; retainedBytes?: number
  persistence?: 'memory' | 'library'; restored?: boolean; recovery?: 'network' | 'local'; checkpointBytes?: number
  receivedBytes: number; totalBytes: number | null; assetId?: string; error?: string
}
