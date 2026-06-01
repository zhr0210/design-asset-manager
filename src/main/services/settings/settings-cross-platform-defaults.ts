import type { AiRuntimeKind } from '../../../shared/types/ai-runtime.types'
import type { ManagedPaths, PlatformArch, PlatformName, PlatformProfile } from '../../../shared/types/platform.types'
import type { RuntimeProfile, RuntimeProfileId } from '../../../shared/types/runtime-profile.types'
import { createDefaultAiRuntimeSettings } from '../ai-runtime/ai-runtime-settings.defaults'
import type {
  CrossPlatformSettingsDefaults,
  SettingsBootstrapDefaults,
  SettingsDoctorDefaults,
  SettingsPathDefaults,
  SettingsRuntimeDefaults
} from './settings-compatibility.types'
import { SETTINGS_COMPATIBILITY_TARGET_VERSION } from './settings-compatibility.types'

export interface SettingsPlatformInfo {
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
}

function defaultRuntimeKindForProfile(runtimeProfile?: RuntimeProfile | RuntimeProfileId): AiRuntimeKind {
  if (typeof runtimeProfile === 'object' && runtimeProfile.recommendedRuntimeKinds.length > 0) {
    return runtimeProfile.recommendedRuntimeKinds[0]
  }

  if (runtimeProfile === 'external-inference-only') {
    return 'custom-http'
  }

  return 'disabled'
}

function runtimeProfileId(runtimeProfile?: RuntimeProfile | RuntimeProfileId): RuntimeProfileId | undefined {
  return typeof runtimeProfile === 'object' ? runtimeProfile.id : runtimeProfile
}

export function createSettingsPathDefaults(managedPaths: ManagedPaths): SettingsPathDefaults {
  return {
    managedPaths: {
      userDataDir: managedPaths.userDataDir,
      configDir: managedPaths.configDir,
      databaseDir: managedPaths.databaseDir,
      logsDir: managedPaths.logsDir,
      cacheDir: managedPaths.cacheDir,
      runtimeDir: managedPaths.runtimeDir,
      modelsDir: managedPaths.modelsDir,
      tempDir: managedPaths.tempDir,
      downloadsDir: managedPaths.downloadsDir
    },
    libraryPath: managedPaths.downloadsDir,
    modelRootDir: managedPaths.modelsDir
  }
}

export function createSettingsRuntimeDefaults(runtimeProfile?: RuntimeProfile | RuntimeProfileId): SettingsRuntimeDefaults {
  const profileId = runtimeProfileId(runtimeProfile)
  const defaultRuntimeKind = defaultRuntimeKindForProfile(runtimeProfile)

  return {
    runtimeProfileId: profileId,
    aiRuntimeSettings: createDefaultAiRuntimeSettings(defaultRuntimeKind)
  }
}

export function createSettingsDoctorDefaults(): SettingsDoctorDefaults {
  return {
    doctorSettings: {
      lastRunAt: null,
      lastOverallStatus: null,
      showInSettings: true,
      dismissedCheckIds: []
    }
  }
}

export function createSettingsBootstrapDefaults(): SettingsBootstrapDefaults {
  return {
    bootstrapSettings: {
      status: 'not_initialized',
      mode: 'manual',
      selectedProfileId: null,
      recommendedProfileId: null,
      completedAt: null,
      skippedAt: null
    }
  }
}

export function createCrossPlatformSettingsDefaults(
  platformInfo: SettingsPlatformInfo,
  managedPaths: ManagedPaths,
  runtimeProfile?: RuntimeProfile | RuntimeProfileId
): CrossPlatformSettingsDefaults {
  const runtimeDefaults = createSettingsRuntimeDefaults(runtimeProfile)
  const bootstrapDefaults = createSettingsBootstrapDefaults()
  const doctorDefaults = createSettingsDoctorDefaults()

  return {
    schemaVersion: SETTINGS_COMPATIBILITY_TARGET_VERSION,
    platformProfile: platformInfo.profile,
    managedPaths: createSettingsPathDefaults(managedPaths).managedPaths,
    aiRuntimeSettings: runtimeDefaults.aiRuntimeSettings!,
    bootstrapSettings: {
      status: bootstrapDefaults.bootstrapSettings.status ?? 'not_initialized',
      mode: bootstrapDefaults.bootstrapSettings.mode ?? 'manual',
      selectedProfileId: runtimeDefaults.runtimeProfileId ?? null,
      recommendedProfileId: runtimeDefaults.runtimeProfileId ?? null,
      completedAt: bootstrapDefaults.bootstrapSettings.completedAt ?? null,
      skippedAt: bootstrapDefaults.bootstrapSettings.skippedAt ?? null
    },
    doctorSettings: doctorDefaults.doctorSettings
  }
}
