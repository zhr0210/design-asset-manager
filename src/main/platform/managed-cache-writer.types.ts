import type { ManagedPaths } from '../../shared/types/platform.types'

export interface ManagedCacheWriterOptions {
  managedPaths: ManagedPaths
  encoding?: BufferEncoding
}

export interface ManagedCacheCleanupOptions extends ManagedCacheWriterOptions {
  enabled: boolean
  olderThanMs?: number
}

export interface ManagedCacheWriteResult {
  path: string
  bytesWritten: number
}

export interface ManagedCacheCleanupResult {
  removed: string[]
  skipped: boolean
}
