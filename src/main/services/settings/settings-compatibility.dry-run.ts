import type { AiRuntimeSettings } from '../../../shared/types/ai-runtime-settings.types'
import type { AppSettings } from '../../../shared/types/settings.types'
import type { ManagedPaths, PlatformProfile } from '../../../shared/types/platform.types'
import type { RuntimeProfileId } from '../../../shared/types/runtime-profile.types'
import { createDefaultAiRuntimeSettings } from '../ai-runtime/ai-runtime-settings.defaults'
import { mergeAiRuntimeSettingsDefaults, migrateLegacyAiRuntimeSettings } from '../ai-runtime/ai-runtime-settings.mapper'
import {
  createCompatibilityReport,
  mergeCompatibilityReports
} from './settings-compatibility.validator'
import type {
  CompatibilityReport,
  SettingsCompatibilityChange,
  SettingsCompatibilityResult
} from './settings-compatibility.types'
import { SETTINGS_COMPATIBILITY_TARGET_VERSION } from './settings-compatibility.types'

type SettingsInput = Partial<AppSettings> & Record<string, unknown>

interface DryRunOptions {
  platformProfile?: PlatformProfile
  managedPaths?: Partial<ManagedPaths>
  runtimeProfileId?: RuntimeProfileId
  targetVersion?: number
}

function cloneSettings<T extends SettingsInput>(input: T): T {
  return JSON.parse(JSON.stringify(input ?? {})) as T
}

function originalVersion(input: SettingsInput): number | null {
  return typeof input.schemaVersion === 'number' ? input.schemaVersion : null
}

function change(field: string, type: SettingsCompatibilityChange['type'], message: string): SettingsCompatibilityChange {
  return { field, type, message }
}

function reportFor(input: SettingsInput, changes: SettingsCompatibilityChange[], warnings: string[] = [], blockingIssues: string[] = []): CompatibilityReport {
  return createCompatibilityReport({
    originalVersion: originalVersion(input),
    targetVersion: SETTINGS_COMPATIBILITY_TARGET_VERSION,
    changes,
    warnings,
    blockingIssues
  })
}

function detectBlockingIssues(input: SettingsInput): string[] {
  const issues: string[] = []

  if (input.managedPaths && typeof input.managedPaths !== 'object') {
    issues.push('managedPaths is present but is not an object.')
  }

  if (input.aiRuntimeSettings && typeof input.aiRuntimeSettings !== 'object') {
    issues.push('aiRuntimeSettings is present but is not an object.')
  }

  return issues
}

export function dryRunInjectAiRuntimeSettings(input: SettingsInput): SettingsCompatibilityResult {
  const settings = cloneSettings(input)
  const changes: SettingsCompatibilityChange[] = []

  if (settings.aiRuntimeSettings) {
    settings.aiRuntimeSettings = mergeAiRuntimeSettingsDefaults(settings.aiRuntimeSettings as Partial<AiRuntimeSettings>)
    changes.push(change('aiRuntimeSettings', 'preserve', 'Existing aiRuntimeSettings would be preserved and normalized.'))
  } else {
    settings.aiRuntimeSettings = migrateLegacyAiRuntimeSettings(settings)
    changes.push(change('aiRuntimeSettings', 'add', 'aiRuntimeSettings would be created from legacy AI settings or safe defaults.'))
  }

  return {
    settings,
    report: reportFor(input, changes, [], detectBlockingIssues(input))
  }
}

export function dryRunInjectCrossPlatformDefaults(input: SettingsInput, options: DryRunOptions = {}): SettingsCompatibilityResult {
  const settings = cloneSettings(input)
  const changes: SettingsCompatibilityChange[] = []

  if (!settings.schemaVersion) {
    settings.schemaVersion = options.targetVersion ?? SETTINGS_COMPATIBILITY_TARGET_VERSION
    changes.push(change('schemaVersion', 'add', 'schemaVersion would be added for future settings compatibility.'))
  }

  if (!settings.platformProfile && options.platformProfile) {
    settings.platformProfile = options.platformProfile
    changes.push(change('platformProfile', 'add', 'platformProfile would be added from platform detection.'))
  }

  const normalizedPaths = dryRunNormalizeManagedPaths(settings, options)
  const merged = normalizedPaths.settings

  if (options.runtimeProfileId) {
    const bootstrapSettings = {
      ...merged.bootstrapSettings,
      selectedProfileId: merged.bootstrapSettings?.selectedProfileId ?? options.runtimeProfileId,
      recommendedProfileId: merged.bootstrapSettings?.recommendedProfileId ?? options.runtimeProfileId
    }
    merged.bootstrapSettings = bootstrapSettings
    changes.push(change('bootstrapSettings', 'add', 'bootstrapSettings would receive runtime profile defaults.'))
  }

  if (!merged.doctorSettings) {
    merged.doctorSettings = {
      lastRunAt: null,
      lastOverallStatus: null,
      showInSettings: true,
      dismissedCheckIds: []
    }
    changes.push(change('doctorSettings', 'add', 'doctorSettings would be added with safe display defaults.'))
  }

  return {
    settings: merged,
    report: mergeCompatibilityReports(reportFor(input, changes, [], detectBlockingIssues(input)), normalizedPaths.report)
  }
}

export function dryRunNormalizeManagedPaths(input: SettingsInput, options: DryRunOptions = {}): SettingsCompatibilityResult {
  const settings = cloneSettings(input)
  const changes: SettingsCompatibilityChange[] = []

  if (options.managedPaths) {
    settings.managedPaths = {
      ...(typeof settings.managedPaths === 'object' ? settings.managedPaths : {}),
      ...options.managedPaths
    }
    changes.push(change('managedPaths', settings.managedPaths ? 'normalize' : 'add', 'managedPaths would be merged from platform managed paths.'))
  } else if (!settings.managedPaths) {
    changes.push(change('managedPaths', 'warning', 'managedPaths cannot be added without platform managed paths.'))
  }

  return {
    settings,
    report: reportFor(input, changes, options.managedPaths ? [] : ['managedPaths were not provided; path defaults are dry-run only.'], detectBlockingIssues(input))
  }
}

export function dryRunUpgradeSettings(input: SettingsInput, options: DryRunOptions = {}): SettingsCompatibilityResult {
  const withAiRuntime = dryRunInjectAiRuntimeSettings(input)
  const withCrossPlatform = dryRunInjectCrossPlatformDefaults(withAiRuntime.settings, options)

  return {
    settings: withCrossPlatform.settings,
    report: mergeCompatibilityReports(analyzeSettingsCompatibility(input, options), withAiRuntime.report, withCrossPlatform.report)
  }
}

export function analyzeSettingsCompatibility(input: SettingsInput, options: DryRunOptions = {}): CompatibilityReport {
  const changes: SettingsCompatibilityChange[] = []
  const warnings: string[] = []
  const blockingIssues = detectBlockingIssues(input)

  if (originalVersion(input) !== SETTINGS_COMPATIBILITY_TARGET_VERSION) {
    changes.push(change('schemaVersion', input.schemaVersion ? 'normalize' : 'add', 'Settings schema version would be aligned with the compatibility target.'))
  }

  if (!input.platformProfile && options.platformProfile) {
    changes.push(change('platformProfile', 'add', 'Platform profile can be recorded for future migrations.'))
  }

  if (!input.managedPaths && options.managedPaths) {
    changes.push(change('managedPaths', 'add', 'Managed paths can be added from platform path resolver output.'))
  }

  if (!input.aiRuntimeSettings) {
    changes.push(change('aiRuntimeSettings', 'add', 'AI Runtime settings can be created without deleting legacy AI fields.'))
  }

  if (!options.managedPaths) {
    warnings.push('No managedPaths were provided, so path defaults cannot be fully evaluated.')
  }

  return reportFor(input, changes, warnings, blockingIssues)
}

export function explainSettingsUpgradePlan(input: SettingsInput, options: DryRunOptions = {}): string[] {
  const report = analyzeSettingsCompatibility(input, options)
  const lines = [
    `Settings compatibility target version: ${report.targetVersion}`,
    report.wouldChange ? 'Dry-run would change a cloned settings object.' : 'Dry-run would not change the settings object.',
    report.safeToApplyLater ? 'No blocking issue was detected.' : 'Blocking issues must be resolved before a real migration.'
  ]

  return [
    ...lines,
    ...report.changes.map((item) => `${item.type}: ${item.field} - ${item.message}`),
    ...report.warnings.map((warning) => `warning: ${warning}`),
    ...report.blockingIssues.map((issue) => `blocking: ${issue}`)
  ]
}
