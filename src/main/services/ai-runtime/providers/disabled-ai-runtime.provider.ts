import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../ai-runtime.types'

function now(): string {
  return new Date().toISOString()
}

export class DisabledAiRuntimeProvider {
  private config: AiRuntimeConfig
  private state: AiRuntimeState

  constructor(config: Partial<AiRuntimeConfig> = {}) {
    this.config = {
      id: 'disabled-ai-runtime',
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
      platform: 'all',
      profileId: null,
      metadata: {},
      ...config
    }
    this.state = this.createDisabledState()
  }

  getConfig(): AiRuntimeConfig {
    return { ...this.config }
  }

  getState(): AiRuntimeState {
    return { ...this.state }
  }

  async start(): Promise<AiRuntimeOperationResult> {
    this.state = {
      ...this.createDisabledState(),
      lastError: 'AI runtime is disabled'
    }

    return {
      success: false,
      state: this.getState(),
      error: 'AI runtime is disabled',
      warnings: ['Select an enabled runtime before starting AI features.']
    }
  }

  async stop(): Promise<AiRuntimeOperationResult> {
    this.state = this.createDisabledState()
    return { success: true, state: this.getState(), warnings: ['AI runtime is already disabled.'] }
  }

  async restart(): Promise<AiRuntimeOperationResult> {
    return this.start()
  }

  async healthCheck(): Promise<AiRuntimeHealthResult> {
    const checkedAt = now()
    this.state = {
      ...this.state,
      healthStatus: 'warning',
      lastHealthCheckAt: checkedAt
    }

    return {
      runtimeId: this.config.id,
      status: 'warning',
      message: 'AI runtime is disabled',
      checkedAt,
      durationMs: 0
    }
  }

  async updateConfig(config: Partial<AiRuntimeConfig>): Promise<AiRuntimeOperationResult> {
    this.config = {
      ...this.config,
      ...config,
      id: this.config.id,
      kind: 'disabled',
      enabled: false
    }
    this.state = this.createDisabledState()

    return { success: true, state: this.getState() }
  }

  private createDisabledState(): AiRuntimeState {
    return {
      id: this.config.id,
      kind: 'disabled',
      status: 'disabled',
      healthStatus: 'unknown',
      startedAt: null,
      stoppedAt: null,
      lastHealthCheckAt: null,
      lastError: null,
      pid: null,
      baseUrl: this.config.baseUrl ?? null,
      metadata: this.config.metadata
    }
  }
}
