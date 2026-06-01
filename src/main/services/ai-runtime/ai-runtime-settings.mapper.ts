import type { AiBackendConfig, AiBackendType } from '../../../shared/types/ai-backend.types'
import type {
  AiRuntimeSettings,
  AiRuntimeSettingsEntry,
  ExternalHttpRuntimeSettings,
  PythonWorkerRuntimeSettings
} from '../../../shared/types/ai-runtime-settings.types'
import type { AppSettings } from '../../../shared/types/settings.types'
import type { AiRuntimeConfig, AiRuntimeKind, ExternalHttpRuntimeKind } from './ai-runtime.types'
import { createDefaultAiRuntimeSettings, createDefaultExternalHttpRuntimeSettings, createDefaultPythonWorkerRuntimeSettings } from './ai-runtime-settings.defaults'
import { normalizeAiRuntimeSettings } from './ai-runtime-settings.validator'

type LegacySettings = AppSettings & {
  llamaAppConfig?: Partial<ExternalHttpRuntimeSettings> & { enabled?: boolean; displayName?: string; id?: string }
  aiWorkerConfig?: Partial<PythonWorkerRuntimeSettings> & { enabled?: boolean; displayName?: string; id?: string }
  externalInference?: Partial<ExternalHttpRuntimeSettings> & { enabled?: boolean; displayName?: string; id?: string }
}

function isExternalRuntimeKind(kind: AiRuntimeKind): kind is ExternalHttpRuntimeKind {
  return kind === 'ollama' || kind === 'lm-studio' || kind === 'llama-app' || kind === 'custom-http'
}

function backendTypeToRuntimeKind(type: AiBackendType): ExternalHttpRuntimeKind {
  if (type === 'ollama') return 'ollama'
  if (type === 'lm-studio') return 'lm-studio'
  if (type === 'llama-openai') return 'llama-app'
  return 'custom-http'
}

function endpointForKind(kind: ExternalHttpRuntimeKind): string {
  return createDefaultExternalHttpRuntimeSettings(kind).healthEndpoint
}

function mapBackendToSettingsEntry(backend: AiBackendConfig): AiRuntimeSettingsEntry {
  const kind = backendTypeToRuntimeKind(backend.type)
  const externalHttp = {
    ...createDefaultExternalHttpRuntimeSettings(kind),
    baseUrl: backend.baseUrl,
    timeoutMs: backend.timeoutMs
  }

  return {
    id: backend.id,
    kind,
    enabled: backend.enabled,
    displayName: backend.name,
    baseUrl: backend.baseUrl,
    healthEndpoint: externalHttp.healthEndpoint,
    timeoutMs: backend.timeoutMs,
    externalHttp,
    metadata: {
      legacySource: 'aiBackends',
      backendType: backend.type,
      defaultModel: backend.defaultModel
    }
  }
}

function legacyExternalEntry(
  id: string,
  kind: ExternalHttpRuntimeKind,
  config: Partial<ExternalHttpRuntimeSettings> & { enabled?: boolean; displayName?: string; id?: string },
  legacySource: string
): AiRuntimeSettingsEntry {
  const externalHttp = {
    ...createDefaultExternalHttpRuntimeSettings(kind),
    ...config,
    kind
  }

  return {
    id: config.id ?? id,
    kind,
    enabled: config.enabled ?? false,
    displayName: config.displayName ?? id,
    baseUrl: externalHttp.baseUrl,
    healthEndpoint: externalHttp.healthEndpoint,
    timeoutMs: externalHttp.timeoutMs,
    externalHttp,
    metadata: { legacySource }
  }
}

function legacyPythonEntry(config: Partial<PythonWorkerRuntimeSettings> & { enabled?: boolean; displayName?: string; id?: string }): AiRuntimeSettingsEntry {
  const pythonWorker = {
    ...createDefaultPythonWorkerRuntimeSettings(),
    ...config
  }

  return {
    id: config.id ?? 'legacy-python-worker',
    kind: 'python-worker',
    enabled: config.enabled ?? false,
    displayName: config.displayName ?? 'Legacy Python Worker',
    baseUrl: pythonWorker.baseUrl,
    healthEndpoint: pythonWorker.healthEndpoint,
    executablePath: pythonWorker.pythonPath,
    workingDirectory: pythonWorker.workingDirectory,
    launchArgs: pythonWorker.launchArgs,
    env: pythonWorker.env,
    port: pythonWorker.port,
    timeoutMs: pythonWorker.timeoutMs,
    pythonWorker,
    metadata: { legacySource: 'aiWorkerConfig' }
  }
}

export function mapSettingsEntryToAiRuntimeConfig(entry: AiRuntimeSettingsEntry): AiRuntimeConfig {
  return {
    id: entry.id,
    kind: entry.kind,
    enabled: entry.enabled,
    displayName: entry.displayName,
    baseUrl: entry.baseUrl ?? entry.externalHttp?.baseUrl ?? entry.pythonWorker?.baseUrl ?? null,
    healthEndpoint: entry.healthEndpoint ?? entry.externalHttp?.healthEndpoint ?? entry.pythonWorker?.healthEndpoint ?? null,
    executablePath: entry.executablePath ?? entry.pythonWorker?.pythonPath ?? null,
    workingDirectory: entry.workingDirectory ?? entry.pythonWorker?.workingDirectory ?? null,
    launchArgs: entry.launchArgs ?? entry.pythonWorker?.launchArgs ?? [],
    env: entry.env ?? entry.pythonWorker?.env ?? {},
    port: entry.port ?? entry.pythonWorker?.port ?? null,
    timeoutMs: entry.timeoutMs ?? entry.externalHttp?.timeoutMs ?? entry.pythonWorker?.timeoutMs ?? 1_000,
    platform: 'all',
    profileId: entry.profileId ?? null,
    metadata: {
      ...entry.metadata,
      externalHttp: entry.externalHttp,
      pythonWorker: entry.pythonWorker
    }
  }
}

export function mapAiRuntimeConfigToSettingsEntry(config: AiRuntimeConfig): AiRuntimeSettingsEntry {
  const externalHttp = isExternalRuntimeKind(config.kind)
    ? {
        ...createDefaultExternalHttpRuntimeSettings(config.kind),
        ...(config.metadata?.externalHttp as Partial<ExternalHttpRuntimeSettings> | undefined),
        kind: config.kind,
        baseUrl: config.baseUrl ?? null,
        healthEndpoint: config.healthEndpoint ?? endpointForKind(config.kind),
        timeoutMs: config.timeoutMs ?? createDefaultExternalHttpRuntimeSettings(config.kind).timeoutMs
      }
    : undefined

  const pythonWorker = config.kind === 'python-worker'
    ? {
        ...createDefaultPythonWorkerRuntimeSettings(),
        ...(config.metadata?.pythonWorker as Partial<PythonWorkerRuntimeSettings> | undefined),
        pythonPath: config.executablePath ?? null,
        workingDirectory: config.workingDirectory ?? null,
        baseUrl: config.baseUrl ?? null,
        healthEndpoint: config.healthEndpoint ?? '/health',
        launchArgs: config.launchArgs ?? [],
        env: config.env ?? {},
        port: config.port ?? 8000,
        timeoutMs: config.timeoutMs ?? 5_000
      }
    : undefined

  return {
    id: config.id,
    kind: config.kind,
    enabled: config.enabled,
    displayName: config.displayName,
    baseUrl: config.baseUrl ?? null,
    healthEndpoint: config.healthEndpoint ?? null,
    executablePath: config.executablePath ?? null,
    workingDirectory: config.workingDirectory ?? null,
    launchArgs: config.launchArgs ?? [],
    env: config.env ?? {},
    port: config.port ?? null,
    timeoutMs: config.timeoutMs ?? 1_000,
    profileId: config.profileId ?? null,
    externalHttp,
    pythonWorker,
    metadata: { ...config.metadata }
  }
}

export function migrateLegacyAiRuntimeSettings(settings: Partial<LegacySettings>): AiRuntimeSettings {
  const runtimes: AiRuntimeSettingsEntry[] = []

  if (Array.isArray(settings.aiBackends)) {
    runtimes.push(...settings.aiBackends.map(mapBackendToSettingsEntry))
  }

  if (settings.llamaAppConfig) {
    runtimes.push(legacyExternalEntry('legacy-llama-app', 'llama-app', settings.llamaAppConfig, 'llamaAppConfig'))
  }

  if (settings.externalInference) {
    runtimes.push(legacyExternalEntry('legacy-external-inference', settings.externalInference.kind ?? 'custom-http', settings.externalInference, 'externalInference'))
  }

  if (settings.aiWorkerConfig) {
    runtimes.push(legacyPythonEntry(settings.aiWorkerConfig))
  }

  const defaults = createDefaultAiRuntimeSettings()
  return normalizeAiRuntimeSettings({
    ...defaults,
    runtimes: runtimes.length > 0 ? runtimes : defaults.runtimes,
    activeRuntimeId: runtimes.find((runtime) => runtime.enabled)?.id ?? defaults.activeRuntimeId,
    defaultRuntimeKind: runtimes.find((runtime) => runtime.enabled)?.kind ?? defaults.defaultRuntimeKind,
    allowExternalInference: runtimes.some((runtime) => runtime.enabled && isExternalRuntimeKind(runtime.kind)),
    allowLocalPythonWorker: runtimes.some((runtime) => runtime.enabled && runtime.kind === 'python-worker'),
    metadata: {
      ...defaults.metadata,
      migratedFromLegacy: runtimes.length > 0
    }
  })
}

export function mergeAiRuntimeSettingsDefaults(settings?: Partial<AiRuntimeSettings>): AiRuntimeSettings {
  return normalizeAiRuntimeSettings({
    ...createDefaultAiRuntimeSettings(),
    ...settings,
    metadata: {
      ...createDefaultAiRuntimeSettings().metadata,
      ...settings?.metadata
    }
  })
}

export function mapSettingsToAiRuntimeConfigs(settings: Partial<LegacySettings>): AiRuntimeConfig[] {
  const aiRuntimeSettings = settings.aiRuntimeSettings
    ? mergeAiRuntimeSettingsDefaults(settings.aiRuntimeSettings)
    : migrateLegacyAiRuntimeSettings(settings)

  return aiRuntimeSettings.runtimes.map(mapSettingsEntryToAiRuntimeConfig)
}
