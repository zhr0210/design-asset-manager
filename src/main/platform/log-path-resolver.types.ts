import type { ManagedPaths } from '../../shared/types/platform.types'

export interface LogPaths {
  logsDir: string
  debugDir: string
  doctorLogsDir: string
  aiRuntimeLogsDir: string
  bootstrapLogsDir: string
  settingsMigrationLogsDir: string
  legacyLogsDir: string
}

export interface LogPathResolverOptions {
  managedPaths?: ManagedPaths
  fileName?: string
  extension?: string
}

export interface LogPathSafetyResult {
  path: string
  logsDir: string
  isInsideLogsDir: boolean
}
