import { AiRuntimeHealthChecker } from './ai-runtime-health-checker'
import { AiRuntimeProviderRegistry } from './ai-runtime-registry'
import type {
  AiRuntimeConfig,
  AiRuntimeHealthResult,
  AiRuntimeOperationResult,
  AiRuntimeProvider,
  AiRuntimeState
} from './ai-runtime.types'

function failedState(config: AiRuntimeConfig, error: unknown): AiRuntimeState {
  return {
    id: config.id,
    kind: config.kind,
    status: 'failed',
    healthStatus: 'error',
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: new Date().toISOString(),
    lastError: error instanceof Error ? error.message : String(error),
    pid: null,
    baseUrl: config.baseUrl ?? null,
    metadata: config.metadata
  }
}

function missingState(runtimeId: string, error: string): AiRuntimeState {
  return {
    id: runtimeId,
    kind: 'disabled',
    status: 'failed',
    healthStatus: 'error',
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: error,
    pid: null,
    baseUrl: null
  }
}

function operationFailure(config: AiRuntimeConfig, error: unknown): AiRuntimeOperationResult {
  return {
    success: false,
    state: failedState(config, error),
    error: error instanceof Error ? error.message : String(error)
  }
}

export class AiRuntimeManager {
  private readonly providers: AiRuntimeProviderRegistry
  private readonly healthChecker: AiRuntimeHealthChecker
  private activeRuntimeId: string | null = null

  constructor(
    providers = new AiRuntimeProviderRegistry(),
    healthChecker = new AiRuntimeHealthChecker()
  ) {
    this.providers = providers
    this.healthChecker = healthChecker
  }

  registerProvider(provider: AiRuntimeProvider): void {
    this.providers.registerProvider(provider)
  }

  unregisterProvider(runtimeId: string): boolean {
    if (this.activeRuntimeId === runtimeId) {
      this.activeRuntimeId = null
    }

    return this.providers.unregisterProvider(runtimeId)
  }

  getProvider(runtimeId: string): AiRuntimeProvider | undefined {
    return this.providers.getProvider(runtimeId)
  }

  listRuntimes(): AiRuntimeState[] {
    return this.providers.listProviders().map((provider) => provider.getState())
  }

  getRuntimeState(runtimeId: string): AiRuntimeState | null {
    return this.providers.getProvider(runtimeId)?.getState() ?? null
  }

  async startRuntime(runtimeId: string): Promise<AiRuntimeOperationResult> {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.start())
  }

  async stopRuntime(runtimeId: string): Promise<AiRuntimeOperationResult> {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.stop())
  }

  async restartRuntime(runtimeId: string): Promise<AiRuntimeOperationResult> {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.restart())
  }

  async healthCheck(runtimeId: string): Promise<AiRuntimeHealthResult> {
    const provider = this.providers.getProvider(runtimeId)
    if (!provider) {
      return {
        runtimeId,
        status: 'error',
        message: `AI runtime provider not found: ${runtimeId}`,
        checkedAt: new Date().toISOString(),
        durationMs: 0
      }
    }

    const timeoutMs = provider.getConfig().timeoutMs
    if (timeoutMs && timeoutMs > 0) {
      return this.healthChecker.runHealthCheckWithTimeout(provider, timeoutMs)
    }

    return this.healthChecker.runHealthCheck(provider)
  }

  async healthCheckAll(): Promise<AiRuntimeHealthResult[]> {
    const checks = this.providers.listProviders().map((provider) => this.healthCheck(provider.getConfig().id))
    return Promise.all(checks)
  }

  async stopAllRuntimes(): Promise<AiRuntimeOperationResult[]> {
    const runningProviders = this.providers.listProviders().filter((provider) => {
      const status = provider.getState().status
      return status === 'starting' || status === 'running' || status === 'unhealthy'
    })

    return Promise.all(runningProviders.map((provider) => this.stopRuntime(provider.getConfig().id)))
  }

  async updateRuntimeConfig(runtimeId: string, partialConfig: Partial<AiRuntimeConfig>): Promise<AiRuntimeOperationResult> {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.updateConfig(partialConfig))
  }

  selectActiveRuntime(runtimeId: string): AiRuntimeOperationResult {
    const provider = this.providers.getProvider(runtimeId)
    if (!provider) {
      const error = `AI runtime provider not found: ${runtimeId}`
      return {
        success: false,
        state: missingState(runtimeId, error),
        error
      }
    }

    this.activeRuntimeId = runtimeId
    return {
      success: true,
      state: provider.getState()
    }
  }

  getActiveRuntime(): AiRuntimeState | null {
    if (!this.activeRuntimeId) {
      return null
    }

    return this.getRuntimeState(this.activeRuntimeId)
  }

  private async runRuntimeOperation(
    runtimeId: string,
    operation: (provider: AiRuntimeProvider) => Promise<AiRuntimeOperationResult>
  ): Promise<AiRuntimeOperationResult> {
    const provider = this.providers.getProvider(runtimeId)
    if (!provider) {
      const error = `AI runtime provider not found: ${runtimeId}`
      return {
        success: false,
        state: missingState(runtimeId, error),
        error
      }
    }

    try {
      return await operation(provider)
    } catch (error) {
      return operationFailure(provider.getConfig(), error)
    }
  }
}
