import type {
  AiRuntimeHealthResult,
  ExternalHttpClient,
  ExternalHttpManualHealthCheckPlan,
  ExternalHttpManualHealthCheckRequest
} from '../ai-runtime.types'

function now(): string {
  return new Date().toISOString()
}

function joinEndpoint(baseUrl: string, endpoint: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${normalizedBase}${normalizedEndpoint}`
}

export function createExternalHttpManualHealthCheckPlan(
  request: ExternalHttpManualHealthCheckRequest
): ExternalHttpManualHealthCheckPlan {
  const warnings: string[] = []
  const blockingIssues: string[] = []

  if (!request.userInitiated) blockingIssues.push('External HTTP health check requires an explicit user action.')
  if (!request.baseUrl) blockingIssues.push('External HTTP baseUrl is required.')
  if (!request.healthEndpoint.trim()) blockingIssues.push('External HTTP healthEndpoint is required.')
  if (request.timeoutMs <= 0) warnings.push('timeoutMs should be positive; default runtime timeout should be used by caller.')

  return {
    runtimeId: request.runtimeId,
    url: request.baseUrl ? joinEndpoint(request.baseUrl, request.healthEndpoint) : null,
    method: 'GET',
    timeoutMs: request.timeoutMs,
    userInitiated: request.userInitiated,
    warnings,
    blockingIssues
  }
}

export async function runExternalHttpManualHealthCheck(
  request: ExternalHttpManualHealthCheckRequest,
  client: ExternalHttpClient
): Promise<AiRuntimeHealthResult> {
  const startedAt = Date.now()
  const checkedAt = now()
  const plan = createExternalHttpManualHealthCheckPlan(request)

  if (plan.blockingIssues.length > 0 || !plan.url) {
    return {
      runtimeId: request.runtimeId,
      status: 'warning',
      message: plan.blockingIssues.join(' '),
      details: { plan },
      checkedAt,
      durationMs: Date.now() - startedAt
    }
  }

  try {
    const response = await client.get(plan.url, {
      headers: request.headers,
      timeoutMs: request.timeoutMs
    })
    const status = response.ok ? 'ok' : 'error'
    return {
      runtimeId: request.runtimeId,
      status,
      message: response.ok ? 'Manual external HTTP health check succeeded.' : `Manual external HTTP health check returned HTTP ${response.status}.`,
      details: {
        plan,
        status: response.status,
        ok: response.ok
      },
      checkedAt,
      durationMs: Date.now() - startedAt
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual external HTTP health check failed.'
    return {
      runtimeId: request.runtimeId,
      status: /timed out|timeout|refused/i.test(message) ? 'warning' : 'error',
      message,
      details: { plan },
      checkedAt,
      durationMs: Date.now() - startedAt
    }
  }
}
