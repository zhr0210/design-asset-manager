import type { CompatibilityReport } from './settings-compatibility.types'

export type {
  SettingsMigrationApplyResult,
  SettingsMigrationMode,
  SettingsMigrationPlan,
  SettingsMigrationRollbackResult,
  SettingsMigrationStatus
} from '../../../shared/types/settings-migration.types'

export interface SettingsMigrationPlanOptions {
  compatibilityReport?: CompatibilityReport
}
