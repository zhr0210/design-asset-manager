import type { AiRuntimeKind, ExternalHttpRuntimeKind } from './ai-runtime.types'
import type {
  AiRuntimeSettings,
  AiRuntimeSettingsEntry,
  ExternalHttpRuntimeSettings,
  PythonWorkerRuntimeSettings
} from '../../../shared/types/ai-runtime-settings.types'

export function createDefaultExternalHttpRuntimeSettings(kind: ExternalHttpRuntimeKind): ExternalHttpRuntimeSettings {
  const defaults: Record<ExternalHttpRuntimeKind, Pick<ExternalHttpRuntimeSettings, 'healthEndpoint' | 'modelsEndpoint' | 'chatEndpoint' | 'completionsEndpoint' | 'timeoutMs'>> = {
    ollama: {
      healthEndpoint: '/api/tags',
      modelsEndpoint: '/api/tags',
      chatEndpoint: '/api/chat',
      completionsEndpoint: '/api/generate',
      timeoutMs: 5_000
    },
    'lm-studio': {
      healthEndpoint: '/v1/models',
      modelsEndpoint: '/v1/models',
      chatEndpoint: '/v1/chat/completions',
      completionsEndpoint: '/v1/completions',
      timeoutMs: 30_000
    },
    'llama-app': {
      healthEndpoint: '/health',
      modelsEndpoint: '/v1/models',
      chatEndpoint: '/v1/chat/completions',
      completionsEndpoint: '/v1/completions',
      timeoutMs: 30_000
    },
    'custom-http': {
      healthEndpoint: '/health',
      modelsEndpoint: null,
      chatEndpoint: null,
      completionsEndpoint: null,
      timeoutMs: 30_000
    }
  }

  return {
    kind,
    baseUrl: null,
    headers: {},
    authMode: 'none',
    ...defaults[kind]
  }
}

export function createDefaultPythonWorkerRuntimeSettings(): PythonWorkerRuntimeSettings {
  return {
    pythonPath: null,
    scriptPath: null,
    workingDirectory: null,
    host: '127.0.0.1',
    port: 8000,
    baseUrl: 'http://127.0.0.1:8000',
    healthEndpoint: '/health',
    launchArgs: [],
    env: {},
    timeoutMs: 5_000
  }
}

export function createDefaultDisabledRuntimeSettings(): AiRuntimeSettingsEntry {
  return {
    id: 'disabled-runtime',
    kind: 'disabled',
    enabled: false,
    displayName: 'Disabled AI Runtime',
    baseUrl: null,
    healthEndpoint: null,
    executablePath: null,
    workingDirectory: null,
    launchArgs: [],
    env: {},
    port: null,
    timeoutMs: 1_000,
    profileId: null,
    metadata: {}
  }
}

export function createDefaultAiRuntimeSettings(defaultRuntimeKind: AiRuntimeKind = 'disabled'): AiRuntimeSettings {
  const disabledRuntime = createDefaultDisabledRuntimeSettings()

  return {
    activeRuntimeId: disabledRuntime.id,
    runtimes: [disabledRuntime],
    defaultRuntimeKind,
    allowExternalInference: false,
    allowLocalPythonWorker: false,
    healthCheckOnStartup: false,
    metadata: {}
  }
}
