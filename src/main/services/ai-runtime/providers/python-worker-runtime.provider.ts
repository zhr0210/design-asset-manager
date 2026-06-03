import type {
  AiRuntimeConfig,
  AiRuntimeHealthResult,
  AiRuntimeOperationResult,
  AiRuntimeProvider,
  AiRuntimeState,
  PythonWorkerProcessState,
  PythonWorkerRuntimeConfig
} from '../ai-runtime.types'
import { RealAiRuntimeProcessRunner } from '../process/real-ai-runtime-process-runner'
import type { AiRuntimeProcessRunner } from '../process/ai-runtime-process-runner.types'
import { createPythonWorkerLaunchPlan } from './python-worker-launch-plan'
import { createDefaultPythonWorkerRuntimeConfig } from './python-worker-runtime-presets'

function now(): string {
  return new Date().toISOString()
}

function toAiRuntimeConfig(config: PythonWorkerRuntimeConfig): AiRuntimeConfig {
  return {
    id: config.runtimeId,
    kind: 'python-worker',
    enabled: true,
    displayName: config.displayName,
    baseUrl: config.baseUrl,
    healthEndpoint: config.healthEndpoint,
    executablePath: config.pythonPath,
    workingDirectory: config.workingDirectory,
    launchArgs: [...config.launchArgs],
    env: { ...config.env },
    port: config.port,
    timeoutMs: config.timeoutMs,
    platform: config.platform,
    profileId: config.profileId,
    metadata: {
      ...config.metadata,
      pythonWorker: {
        scriptPath: config.scriptPath,
        host: config.host
      }
    }
  }
}

export class PythonWorkerRuntimeProvider implements AiRuntimeProvider {
  private config: PythonWorkerRuntimeConfig
  private state: AiRuntimeState
  private processState: PythonWorkerProcessState | null = null
  private readonly processRunner: AiRuntimeProcessRunner

  constructor(config: Partial<PythonWorkerRuntimeConfig> = {}, processRunner: AiRuntimeProcessRunner = new RealAiRuntimeProcessRunner()) {
    this.config = createDefaultPythonWorkerRuntimeConfig(config)
    this.processRunner = processRunner
    this.state = this.createState('idle')
  }

  getConfig(): AiRuntimeConfig {
    return toAiRuntimeConfig(this.config)
  }

  getPythonConfig(): PythonWorkerRuntimeConfig {
    return {
      ...this.config,
      launchArgs: [...this.config.launchArgs],
      env: { ...this.config.env },
      metadata: { ...(this.config.metadata ?? {}) }
    }
  }

  getState(): AiRuntimeState {
    this.refreshExitedProcessState()
    return { ...this.state }
  }

  async start(): Promise<AiRuntimeOperationResult> {
    const plan = createPythonWorkerLaunchPlan(this.config)
    if (plan.blockingIssues.length > 0 || !plan.command) {
      this.state = {
        ...this.createState('failed'),
        healthStatus: 'error',
        lastError: plan.blockingIssues.join('; ')
      }

      return {
        success: false,
        state: this.getState(),
        error: this.state.lastError ?? 'Python worker launch plan is blocked.',
        warnings: plan.warnings
      }
    }

    try {
      this.state = this.createState('starting')
      this.processState = await this.processRunner.spawn(plan.command, plan.args, {
        cwd: plan.cwd,
        env: plan.env
      })
      this.state = {
        ...this.createState('running'),
        pid: this.processState.pid
      }

      return {
        success: true,
        state: this.getState(),
        warnings: plan.warnings
      }
    } catch (error) {
      this.state = {
        ...this.createState('failed'),
        healthStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Python worker process spawn failed'
      }

      return {
        success: false,
        state: this.getState(),
        error: this.state.lastError ?? 'Python worker process spawn failed'
      }
    }
  }

  async stop(): Promise<AiRuntimeOperationResult> {
    const processId = this.processState?.pid
    if (processId !== null && processId !== undefined) {
      await this.processRunner.kill(processId)
      this.processState = this.processRunner.getProcess(processId)
    }

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
    this.refreshExitedProcessState()

    if (!this.config.baseUrl || !this.config.healthEndpoint) {
      this.state = {
        ...this.state,
        healthStatus: 'warning',
        lastHealthCheckAt: checkedAt,
        lastError: 'Python worker health endpoint is not configured'
      }

      return {
        runtimeId: this.config.runtimeId,
        status: 'warning',
        message: 'Python worker health endpoint is not configured',
        checkedAt,
        durationMs: Date.now() - startedAt
      }
    }

    if (this.state.status === 'running') {
      this.state = {
        ...this.state,
        healthStatus: 'ok',
        lastHealthCheckAt: checkedAt,
        lastError: null
      }

      return {
        runtimeId: this.config.runtimeId,
        status: 'ok',
        message: 'Python worker process is running',
        checkedAt,
        durationMs: Date.now() - startedAt
      }
    }

    const status = this.state.status === 'failed' ? 'error' : 'warning'
    return {
      runtimeId: this.config.runtimeId,
      status,
      message: `Python worker is ${this.state.status}`,
      checkedAt,
      durationMs: Date.now() - startedAt
    }
  }

  async updateConfig(config: Partial<AiRuntimeConfig & PythonWorkerRuntimeConfig>): Promise<AiRuntimeOperationResult> {
    this.config = {
      ...this.config,
      ...config,
      runtimeId: this.config.runtimeId
    }
    this.state = {
      ...this.state,
      baseUrl: this.config.baseUrl,
      metadata: this.getConfig().metadata
    }

    return { success: true, state: this.getState() }
  }

  private createState(status: AiRuntimeState['status']): AiRuntimeState {
    return {
      id: this.config.runtimeId,
      kind: 'python-worker',
      status,
      healthStatus: 'unknown',
      startedAt: status === 'running' ? now() : null,
      stoppedAt: status === 'stopped' ? now() : null,
      lastHealthCheckAt: null,
      lastError: null,
      pid: this.processState?.pid ?? null,
      baseUrl: this.config.baseUrl,
      metadata: this.getConfig().metadata
    }
  }

  private refreshExitedProcessState(): void {
    const processId = this.processState?.pid
    if (processId === null || processId === undefined) {
      return
    }

    const latestProcess = this.processRunner.getProcess(processId)
    if (!latestProcess) {
      return
    }

    this.processState = latestProcess
    if (latestProcess.exitedAt && this.state.status === 'running') {
      this.state = {
        ...this.state,
        status: latestProcess.exitCode === 0 ? 'unhealthy' : 'failed',
        healthStatus: latestProcess.exitCode === 0 ? 'warning' : 'error',
        lastError: `Python worker process exited with code ${latestProcess.exitCode}`
      }
    }
  }
}
