import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../ai-runtime.types'

function now(): string {
  return new Date().toISOString()
}

function createState(config: AiRuntimeConfig, status: AiRuntimeState['status']): AiRuntimeState {
  return {
    id: config.id,
    kind: config.kind,
    status,
    healthStatus: status === 'running' ? 'ok' : 'unknown',
    startedAt: status === 'running' ? now() : null,
    stoppedAt: status === 'stopped' ? now() : null,
    lastHealthCheckAt: null,
    lastError: null,
    pid: null,
    baseUrl: config.baseUrl ?? null,
    metadata: config.metadata
  }
}

export class MockAiRuntimeProvider {
  private config: AiRuntimeConfig
  private state: AiRuntimeState

  constructor(config: Partial<AiRuntimeConfig> = {}) {
    this.config = {
      id: 'mock-ai-runtime',
      kind: 'mock',
      enabled: true,
      displayName: 'Mock AI Runtime',
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
    this.state = createState(this.config, 'idle')
  }

  getConfig(): AiRuntimeConfig {
    return { ...this.config }
  }

  getState(): AiRuntimeState {
    return { ...this.state }
  }

  async start(): Promise<AiRuntimeOperationResult> {
    this.state = createState(this.config, 'running')
    return { success: true, state: this.getState() }
  }

  async stop(): Promise<AiRuntimeOperationResult> {
    this.state = createState(this.config, 'stopped')
    return { success: true, state: this.getState() }
  }

  async restart(): Promise<AiRuntimeOperationResult> {
    await this.stop()
    return this.start()
  }

  async healthCheck(): Promise<AiRuntimeHealthResult> {
    const checkedAt = now()
    this.state = {
      ...this.state,
      healthStatus: 'ok',
      lastHealthCheckAt: checkedAt,
      lastError: null
    }

    return {
      runtimeId: this.config.id,
      status: 'ok',
      message: 'Mock AI runtime is healthy',
      checkedAt,
      durationMs: 0
    }
  }

  async updateConfig(config: Partial<AiRuntimeConfig>): Promise<AiRuntimeOperationResult> {
    this.config = {
      ...this.config,
      ...config,
      id: this.config.id,
      kind: config.kind ?? this.config.kind
    }
    this.state = {
      ...this.state,
      kind: this.config.kind,
      baseUrl: this.config.baseUrl ?? null,
      metadata: this.config.metadata
    }

    return { success: true, state: this.getState() }
  }
}
