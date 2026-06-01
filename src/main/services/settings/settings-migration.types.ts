import type { CompatibilityReport, SettingsCompatibilityChange, SettingsCompatibilityResult } from './settings-compatibility.types'

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

export interface SettingsMigrationPlanOptions {
  compatibilityReport?: CompatibilityReport
}
