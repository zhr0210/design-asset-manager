import type { AppSettings } from './settings.types'

export type SettingsCompatibilityChangeType = 'add' | 'normalize' | 'preserve' | 'warning'

export interface SettingsCompatibilityChange {
  field: string
  type: SettingsCompatibilityChangeType
  message: string
}

export interface CompatibilityReport {
  originalVersion: number | null
  targetVersion: number
  changes: SettingsCompatibilityChange[]
  warnings: string[]
  blockingIssues: string[]
  wouldChange: boolean
  safeToApplyLater: boolean
}

export interface SettingsCompatibilityResult {
  settings: Partial<AppSettings>
  report: CompatibilityReport
}

export type SettingsMigrationMode = 'dry_run' | 'apply' | 'rollback'

export type SettingsMigrationStatus =
  | 'pending'
  | 'safe_to_apply'
  | 'blocked'
  | 'applied'
  | 'rolled_back'
  | 'failed'

export interface SettingsMigrationPlan {
  id: string
  generatedAt: string
  sourceVersion: number | null
  targetVersion: number
  status: SettingsMigrationStatus
  changes: SettingsCompatibilityChange[]
  warnings: string[]
  blockingIssues: string[]
  backupRequired: boolean
  canApply: boolean
  canRollback: boolean
  dryRunResult: SettingsCompatibilityResult
}

export interface SettingsMigrationApplyResult {
  success: boolean
  planId: string
  appliedAt: string | null
  backupPath: string | null
  settingsPath: string
  warnings: string[]
  error: string | null
}

export interface SettingsMigrationRollbackResult {
  success: boolean
  rolledBackAt: string | null
  restoredFromBackup: string | null
  settingsPath: string
  warnings: string[]
  error: string | null
}
