import type { ManagedPaths } from '../../shared/types/platform.types'

export type ManagedLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ManagedLogEntry {
  timestamp?: string
  level: ManagedLogLevel
  source: string
  message: string
  details?: unknown
  correlationId?: string
}

export interface ManagedLogWriterOptions {
  managedPaths: ManagedPaths
  fileName?: string
  encoding?: BufferEncoding
}

export interface ManagedLogCleanupOptions extends ManagedLogWriterOptions {
  enabled: boolean
  olderThanMs?: number
}

export interface ManagedLogWriteResult {
  path: string
  bytesWritten: number
}
