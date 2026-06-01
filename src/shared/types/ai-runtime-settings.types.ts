import type { AiRuntimeKind, ExternalHttpAuthMode, ExternalHttpRuntimeKind } from './ai-runtime.types'
import type { RuntimeProfileId } from './runtime-profile.types'

export interface ExternalHttpRuntimeSettings {
  kind: ExternalHttpRuntimeKind
  baseUrl: string | null
  healthEndpoint: string
  modelsEndpoint?: string | null
  chatEndpoint?: string | null
  completionsEndpoint?: string | null
  timeoutMs: number
  headers?: Record<string, string>
  authMode: ExternalHttpAuthMode
}

export interface PythonWorkerRuntimeSettings {
  pythonPath: string | null
  scriptPath: string | null
  workingDirectory: string | null
  host: string
  port: number
  baseUrl: string | null
  healthEndpoint: string
  launchArgs: string[]
  env: Record<string, string>
  timeoutMs: number
}

export interface AiRuntimeSettingsEntry {
  id: string
  kind: AiRuntimeKind
  enabled: boolean
  displayName: string
  baseUrl?: string | null
  healthEndpoint?: string | null
  executablePath?: string | null
  workingDirectory?: string | null
  launchArgs?: string[]
  env?: Record<string, string>
  port?: number | null
  timeoutMs?: number
  profileId?: RuntimeProfileId | null
  externalHttp?: ExternalHttpRuntimeSettings
  pythonWorker?: PythonWorkerRuntimeSettings
  metadata?: Record<string, unknown>
}

export interface AiRuntimeSettings {
  activeRuntimeId: string | null
  runtimes: AiRuntimeSettingsEntry[]
  defaultRuntimeKind: AiRuntimeKind
  allowExternalInference: boolean
  allowLocalPythonWorker: boolean
  healthCheckOnStartup: boolean
  metadata?: Record<string, unknown>
}

export interface AiRuntimeSettingsValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
