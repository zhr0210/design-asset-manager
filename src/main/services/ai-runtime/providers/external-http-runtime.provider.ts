import type {
  AiRuntimeConfig,
  AiRuntimeHealthResult,
  AiRuntimeOperationResult,
  AiRuntimeProvider,
  AiRuntimeState,
  ExternalHttpClient,
  ExternalHttpRuntimeConfig
} from '../ai-runtime.types'
import { FetchAiRuntimeHttpClient } from '../http/fetch-ai-runtime-http-client'
import { createCustomHttpRuntimeConfig } from './external-http-runtime-presets'

function now(): string {
  return new Date().toISOString()
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${normalizedBase}${normalizedEndpoint}`
}

function toAiRuntimeConfig(config: ExternalHttpRuntimeConfig): AiRuntimeConfig {
  return {
    id: config.runtimeId,
    kind: config.kind,
    enabled: true,
    displayName: config.displayName,
    baseUrl: config.baseUrl,
    healthEndpoint: config.healthEndpoint,
    executablePath: null,
    workingDirectory: null,
    launchArgs: [],
    env: {},
    port: null,
    timeoutMs: config.timeoutMs,
    platform: 'all',
    profileId: null,
    metadata: {
      ...config.metadata,
      externalHttp: {
        modelsEndpoint: config.modelsEndpoint ?? null,
        chatEndpoint: config.chatEndpoint ?? null,
        completionsEndpoint: config.completionsEndpoint ?? null,
        authMode: config.authMode
      }
    }
  }
}

export class ExternalHttpRuntimeProvider implements AiRuntimeProvider {
  private config: ExternalHttpRuntimeConfig
  private state: AiRuntimeState
  private readonly httpClient: ExternalHttpClient

  constructor(config: Partial<ExternalHttpRuntimeConfig> = {}, httpClient: ExternalHttpClient = new FetchAiRuntimeHttpClient()) {
    this.config = createCustomHttpRuntimeConfig(config)
    this.httpClient = httpClient
    this.state = this.createState('idle')
  }

  getConfig(): AiRuntimeConfig {
    return toAiRuntimeConfig(this.config)
  }

  getExternalConfig(): ExternalHttpRuntimeConfig {
    return {
      ...this.config,
      headers: { ...(this.config.headers ?? {}) },
      metadata: { ...(this.config.metadata ?? {}) }
    }
  }

  getState(): AiRuntimeState {
    return { ...this.state }
  }

  async start(): Promise<AiRuntimeOperationResult> {
    this.state = this.createState('running')
    return { success: true, state: this.getState() }
  }

  async stop(): Promise<AiRuntimeOperationResult> {
    this.state = this.createState('stopped')
    return { success: true, state: this.getState() }
  }

  async restart(): Promise<AiRuntimeOperationResult> {
    await this.stop()
    return this.start()
  }

  async healthCheck(): Promise<AiRuntimeHealthResult> {
    const startedAt = Date.now()
    const checkedAt = now()

    if (!this.config.baseUrl) {
      this.state = {
        ...this.state,
        healthStatus: 'warning',
        lastHealthCheckAt: checkedAt,
        lastError: 'External HTTP runtime baseUrl is not configured'
      }

      return {
        runtimeId: this.config.runtimeId,
        status: 'warning',
        message: 'External HTTP runtime baseUrl is not configured',
        checkedAt,
        durationMs: Date.now() - startedAt
      }
    }

    try {
      const response = await this.httpClient.get(joinEndpoint(this.config.baseUrl, this.config.healthEndpoint), {
        headers: this.config.headers,
        timeoutMs: this.config.timeoutMs
      })

      const status = response.ok ? 'ok' : 'error'
      const message = response.ok
        ? 'External HTTP runtime health check succeeded'
        : `External HTTP runtime health check returned HTTP ${response.status}`

      this.state = {
        ...this.state,
        healthStatus: status,
        lastHealthCheckAt: checkedAt,
        lastError: response.ok ? null : message,
        status: response.ok ? this.state.status : 'unhealthy'
      }

      return {
        runtimeId: this.config.runtimeId,
        status,
        message,
        details: {
          status: response.status,
          ok: response.ok
        },
        checkedAt,
        durationMs: Date.now() - startedAt
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'External HTTP runtime health check failed'
      const status = /timed out|timeout|refused/i.test(message) ? 'warning' : 'error'
      this.state = {
        ...this.state,
        healthStatus: status,
        lastHealthCheckAt: checkedAt,
        lastError: message,
        status: 'unhealthy'
      }

      return {
        runtimeId: this.config.runtimeId,
        status,
        message,
        checkedAt,
        durationMs: Date.now() - startedAt
      }
    }
  }

  async updateConfig(config: Partial<AiRuntimeConfig & ExternalHttpRuntimeConfig>): Promise<AiRuntimeOperationResult> {
    this.config = {
      ...this.config,
      ...config,
      runtimeId: this.config.runtimeId,
      kind: config.kind ?? this.config.kind
    }

    this.state = {
      ...this.state,
      id: this.config.runtimeId,
      kind: this.config.kind,
      baseUrl: this.config.baseUrl ?? null,
      metadata: this.getConfig().metadata
    }

    return { success: true, state: this.getState() }
  }

  private createState(status: AiRuntimeState['status']): AiRuntimeState {
    return {
      id: this.config.runtimeId,
      kind: this.config.kind,
      status,
      healthStatus: status === 'running' ? 'unknown' : 'unknown',
      startedAt: status === 'running' ? now() : null,
      stoppedAt: status === 'stopped' ? now() : null,
      lastHealthCheckAt: null,
      lastError: null,
      pid: null,
      baseUrl: this.config.baseUrl ?? null,
      metadata: this.getConfig().metadata
    }
  }
}
