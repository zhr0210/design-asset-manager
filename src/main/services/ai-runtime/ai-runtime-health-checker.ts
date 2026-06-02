import type { AiRuntimeHealthResult, AiRuntimeProvider } from './ai-runtime.types'

function unknownHealthResult(runtimeId: string, startedAt: number, message: string): AiRuntimeHealthResult {
  return {
    runtimeId,
    status: 'unknown',
    message,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt
  }
}

export class AiRuntimeHealthChecker {
  async runHealthCheck(provider: AiRuntimeProvider): Promise<AiRuntimeHealthResult> {
    const startedAt = Date.now()

    try {
      return this.normalizeHealthResult(await provider.healthCheck())
    } catch (error) {
      return {
        ...unknownHealthResult(provider.getConfig().id, startedAt, error instanceof Error ? error.message : 'Runtime health check failed'),
        status: 'error'
      }
    }
  }

  async runHealthCheckWithTimeout(provider: AiRuntimeProvider, timeoutMs: number): Promise<AiRuntimeHealthResult> {
    const startedAt = Date.now()
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    try {
      return await Promise.race([
        this.runHealthCheck(provider),
        new Promise<AiRuntimeHealthResult>((resolve) => {
          timeoutHandle = setTimeout(() => {
            resolve(unknownHealthResult(provider.getConfig().id, startedAt, `Runtime health check timed out after ${timeoutMs}ms`))
          }, timeoutMs)
        })
      ])
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }

  normalizeHealthResult(result: AiRuntimeHealthResult): AiRuntimeHealthResult {
    return {
      runtimeId: result.runtimeId,
      status: result.status ?? 'unknown',
      message: result.message || 'Runtime health status is unknown',
      details: result.details,
      checkedAt: result.checkedAt || new Date().toISOString(),
      durationMs: Math.max(0, result.durationMs ?? 0)
    }
  }
}
