import type { AiRuntimeSettings } from '../../../shared/types/ai-runtime-settings.types'
import type { AppSettings } from '../../../shared/types/settings.types'
import type { BootstrapMode, BootstrapStatus } from '../../../shared/types/bootstrap.types'
import type { ManagedPaths, PlatformProfile } from '../../../shared/types/platform.types'
import type { RuntimeProfileId } from '../../../shared/types/runtime-profile.types'

export const SETTINGS_COMPATIBILITY_TARGET_VERSION = 2

export type {
  CompatibilityReport,
  SettingsCompatibilityChange,
  SettingsCompatibilityChangeType,
  SettingsCompatibilityResult
} from '../../../shared/types/settings-migration.types'

export interface SettingsPathDefaults {
  managedPaths: Partial<ManagedPaths>
  libraryPath?: string
  modelRootDir?: string
}

export interface SettingsRuntimeDefaults {
  platformProfile?: PlatformProfile
  runtimeProfileId?: RuntimeProfileId
  aiRuntimeSettings?: AiRuntimeSettings
}

export interface SettingsDoctorDefaults {
  doctorSettings: NonNullable<AppSettings['doctorSettings']>
}

export interface SettingsBootstrapDefaults {
  bootstrapSettings: NonNullable<AppSettings['bootstrapSettings']>
}

export interface CrossPlatformSettingsDefaults {
  schemaVersion: number
  platformProfile: PlatformProfile
  managedPaths: Partial<ManagedPaths>
  aiRuntimeSettings: AiRuntimeSettings
  bootstrapSettings: {
    status: BootstrapStatus
    mode: BootstrapMode
    selectedProfileId: RuntimeProfileId | null
    recommendedProfileId: RuntimeProfileId | null
    completedAt: string | null
    skippedAt: string | null
  }
  doctorSettings: NonNullable<AppSettings['doctorSettings']>
}
