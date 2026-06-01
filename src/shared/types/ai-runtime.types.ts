import type { PlatformName } from './platform.types'
import type { RuntimeProfileId } from './runtime-profile.types'

export type AiRuntimeKind =
  | 'python-worker'
  | 'llama-app'
  | 'ollama'
  | 'lm-studio'
  | 'custom-http'
  | 'disabled'
  | 'mock'

export type AiRuntimeStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'unhealthy'
  | 'failed'
  | 'disabled'

export type AiRuntimeHealthStatus = 'ok' | 'warning' | 'error' | 'unknown'

export type ExternalHttpRuntimeKind = 'ollama' | 'lm-studio' | 'llama-app' | 'custom-http'

export type ExternalHttpAuthMode = 'none' | 'bearer' | 'api-key' | 'custom'

export type ExternalHttpHealthParseStrategy = 'status-only' | 'json-status' | 'openai-models' | 'ollama-tags'

export interface ExternalHttpRuntimeConfig {
  runtimeId: string
  kind: ExternalHttpRuntimeKind
  displayName: string
  baseUrl: string | null
  healthEndpoint: string
  modelsEndpoint?: string | null
  chatEndpoint?: string | null
  completionsEndpoint?: string | null
  timeoutMs: number
  headers?: Record<string, string>
  authMode: ExternalHttpAuthMode
  metadata?: Record<string, unknown>
}

export interface ExternalHttpHealthCheckConfig {
  method: 'GET' | 'POST'
  endpoint: string
  expectedStatus: number
  timeoutMs: number
  parseStrategy: ExternalHttpHealthParseStrategy
}

export interface ExternalHttpRequestInput {
  method: 'GET' | 'POST'
  url: string
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

export interface ExternalHttpRequestOptions {
  headers?: Record<string, string>
  timeoutMs?: number
}

export interface ExternalHttpResponse {
  status: number
  ok: boolean
  headers: Record<string, string>
  body: unknown
  durationMs: number
}

export interface ExternalHttpClient {
  request(input: ExternalHttpRequestInput): Promise<ExternalHttpResponse>
  get(url: string, options?: ExternalHttpRequestOptions): Promise<ExternalHttpResponse>
  post(url: string, body: unknown, options?: ExternalHttpRequestOptions): Promise<ExternalHttpResponse>
}

export interface PythonWorkerRuntimeConfig {
  runtimeId: string
  displayName: string
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
  platform?: PlatformName | 'all'
  profileId?: RuntimeProfileId | null
  metadata?: Record<string, unknown>
}

export interface PythonWorkerProcessState {
  pid: number | null
  command: string
  args: string[]
  cwd: string | null
  startedAt: string | null
  exitedAt: string | null
  exitCode: number | null
  signal: string | null
  stdoutTail: string[]
  stderrTail: string[]
}

export interface PythonWorkerLaunchPlan {
  command: string | null
  args: string[]
  cwd: string | null
  env: Record<string, string>
  healthUrl: string | null
  timeoutMs: number
  warnings: string[]
  blockingIssues: string[]
}

export interface AiRuntimeConfig {
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
  platform?: PlatformName | 'all'
  profileId?: RuntimeProfileId | null
  metadata?: Record<string, unknown>
}

export interface AiRuntimeState {
  id: string
  kind: AiRuntimeKind
  status: AiRuntimeStatus
  healthStatus: AiRuntimeHealthStatus
  startedAt: string | null
  stoppedAt: string | null
  lastHealthCheckAt: string | null
  lastError: string | null
  pid: number | null
  baseUrl: string | null
  metadata?: Record<string, unknown>
}

export interface AiRuntimeHealthResult {
  runtimeId: string
  status: AiRuntimeHealthStatus
  message: string
  details?: Record<string, unknown>
  checkedAt: string
  durationMs: number
}

export interface AiRuntimeOperationResult {
  success: boolean
  state: AiRuntimeState
  error?: string
  warnings?: string[]
}

export interface AiRuntimeProvider {
  getConfig(): AiRuntimeConfig
  getState(): AiRuntimeState
  start(): Promise<AiRuntimeOperationResult>
  stop(): Promise<AiRuntimeOperationResult>
  restart(): Promise<AiRuntimeOperationResult>
  healthCheck(): Promise<AiRuntimeHealthResult>
  updateConfig(config: Partial<AiRuntimeConfig>): Promise<AiRuntimeOperationResult>
}
