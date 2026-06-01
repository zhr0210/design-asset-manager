import type { RegisteredDoctorCheck } from '../doctor.types'

export const aiWorkerCheck: RegisteredDoctorCheck = {
  id: 'ai-worker',
  label: 'AI Worker reachability',
  async run(context) {
    const startedAt = Date.now()
    const config = context.aiWorkerConfig ?? {
      baseUrl: 'http://127.0.0.1:8000',
      healthPath: '/health',
      timeoutMs: Math.min(context.timeoutMs, 2000)
    }
    const url = `${config.baseUrl.replace(/\/$/, '')}${config.healthPath}`

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(config.timeoutMs ?? 2000) })
      return {
        id: this.id,
        label: this.label,
        status: response.ok ? 'ok' : 'warning',
        message: response.ok ? 'AI Worker health endpoint is reachable.' : `AI Worker health endpoint returned HTTP ${response.status}.`,
        details: { url, status: response.status },
        fixSuggestion: response.ok ? undefined : 'Start or configure the AI Worker manually; Doctor will not start it.',
        durationMs: Date.now() - startedAt
      }
    } catch (err) {
      return {
        id: this.id,
        label: this.label,
        status: 'warning',
        message: 'AI Worker health endpoint is not reachable.',
        details: { url, error: err instanceof Error ? err.message : String(err) },
        fixSuggestion: 'Start or configure the AI Worker manually; Doctor will not start it.',
        durationMs: Date.now() - startedAt
      }
    }
  }
}
