import type { ManagedPaths, PlatformArch, PlatformName, PlatformProfile } from './platform.types'

export type DoctorCheckStatus = 'ok' | 'warning' | 'error' | 'skipped'

export interface DoctorCheckResult {
  id: string
  label: string
  status: DoctorCheckStatus
  message: string
  details?: Record<string, unknown>
  fixSuggestion?: string
  durationMs: number
}

export interface DoctorReport {
  id: string
  generatedAt: string
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
  overallStatus: 'ok' | 'warning' | 'error'
  checks: DoctorCheckResult[]
}

export interface DoctorAiWorkerConfig {
  baseUrl: string
  healthPath: string
  timeoutMs?: number
}

export interface DoctorCheckContext {
  platformInfo: {
    platform: PlatformName
    arch: PlatformArch
    profile: PlatformProfile
    isWindows: boolean
    isMacOS: boolean
    isAppleSilicon: boolean
  }
  managedPaths: ManagedPaths
  settingsSnapshot?: Record<string, unknown>
  aiWorkerConfig?: DoctorAiWorkerConfig
  timeoutMs: number
}
