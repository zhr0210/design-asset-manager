import type { AiRuntimeSettings, AiRuntimeSettingsEntry, AiRuntimeSettingsValidationResult } from '../../../shared/types/ai-runtime-settings.types'
import { createDefaultAiRuntimeSettings } from './ai-runtime-settings.defaults'

function isProbablyUrl(value: string): boolean {
  return /^https?:\/\/[^ "]+$/i.test(value)
}

export function validateAiRuntimeSettingsEntry(entry: Partial<AiRuntimeSettingsEntry>): AiRuntimeSettingsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!entry.id) {
    errors.push('Runtime entry id is required.')
  }

  if (!entry.kind) {
    errors.push('Runtime entry kind is required.')
  }

  const baseUrl = entry.baseUrl ?? entry.externalHttp?.baseUrl ?? entry.pythonWorker?.baseUrl
  if (baseUrl && !isProbablyUrl(baseUrl)) {
    errors.push(`Runtime entry baseUrl is invalid: ${baseUrl}`)
  }

  if (entry.kind === 'python-worker' && entry.enabled && !entry.pythonWorker?.pythonPath && !entry.executablePath) {
    warnings.push('Enabled Python worker runtime does not have pythonPath configured.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateAiRuntimeSettings(settings: Partial<AiRuntimeSettings>): AiRuntimeSettingsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(settings.runtimes)) {
    errors.push('AiRuntimeSettings.runtimes must be an array.')
  } else {
    for (const entry of settings.runtimes) {
      const result = validateAiRuntimeSettingsEntry(entry)
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }
  }

  if (settings.activeRuntimeId && Array.isArray(settings.runtimes) && !settings.runtimes.some((runtime) => runtime.id === settings.activeRuntimeId)) {
    warnings.push(`Active runtime id is not present in runtimes: ${settings.activeRuntimeId}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function normalizeAiRuntimeSettings(settings: Partial<AiRuntimeSettings>): AiRuntimeSettings {
  const defaults = createDefaultAiRuntimeSettings()
  const runtimes = Array.isArray(settings.runtimes) && settings.runtimes.length > 0
    ? settings.runtimes.map((entry) => ({
        ...entry,
        enabled: entry.enabled ?? false,
        launchArgs: entry.launchArgs ?? [],
        env: entry.env ?? {},
        metadata: { ...(entry.metadata ?? {}) }
      }))
    : defaults.runtimes

  return {
    activeRuntimeId: settings.activeRuntimeId ?? runtimes[0]?.id ?? defaults.activeRuntimeId,
    runtimes,
    defaultRuntimeKind: settings.defaultRuntimeKind ?? runtimes[0]?.kind ?? defaults.defaultRuntimeKind,
    allowExternalInference: settings.allowExternalInference ?? false,
    allowLocalPythonWorker: settings.allowLocalPythonWorker ?? false,
    healthCheckOnStartup: settings.healthCheckOnStartup ?? false,
    metadata: {
      ...(defaults.metadata ?? {}),
      ...(settings.metadata ?? {})
    }
  }
}

export function getAiRuntimeSettingsWarnings(settings: Partial<AiRuntimeSettings>): string[] {
  return validateAiRuntimeSettings(settings).warnings
}
