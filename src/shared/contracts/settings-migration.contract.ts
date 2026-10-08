import type { AppSettings } from '../types/settings.types'
import type { CompatibilityReport, SettingsMigrationPlan } from '../types/settings-migration.types'

export const CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN = 'settingsMigration:createPlan'
export const CHANNEL_SETTINGS_MIGRATION_DRY_RUN = 'settingsMigration:dryRun'
export const CHANNEL_SETTINGS_MIGRATION_ANALYZE = 'settingsMigration:analyze'
export const CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS = 'settingsMigration:listBackups'

export interface SettingsMigrationCreatePlanRequest {
  settingsSnapshot?: Partial<AppSettings>
}

export interface SettingsMigrationDryRunRequest {
  settingsSnapshot?: Partial<AppSettings>
}

export interface SettingsMigrationAnalyzeRequest {
  settingsSnapshot?: Partial<AppSettings>
}

export interface SettingsMigrationListBackupsRequest {
  limit?: number
}

export interface SettingsMigrationBackupInfo {
  name: string
  createdAt: string | null
  sizeBytes: number
}

export interface SettingsMigrationIpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type SettingsMigrationCreatePlanResponse = SettingsMigrationIpcResponse<SettingsMigrationPlan>
export type SettingsMigrationDryRunResponse = SettingsMigrationIpcResponse<SettingsMigrationPlan>
export type SettingsMigrationAnalyzeResponse = SettingsMigrationIpcResponse<CompatibilityReport>
export type SettingsMigrationListBackupsResponse = SettingsMigrationIpcResponse<{ backups: SettingsMigrationBackupInfo[] }>
