export type AiTaskCompletionKind = 'running' | 'success' | 'failure'

export interface AiTaskStatusClassification {
  status: string
  kind: AiTaskCompletionKind
  isTerminal: boolean
  isSuccess: boolean
  isFailure: boolean
}

const SUCCESS_STATUSES = new Set(['synced', 'completed'])
const FAILURE_STATUSES = new Set(['failed'])

export function classifyAiTaskStatus(status?: string | null): AiTaskStatusClassification {
  const normalized = (status ?? '').trim().toLowerCase()
  const isSuccess = SUCCESS_STATUSES.has(normalized)
  const isFailure = FAILURE_STATUSES.has(normalized)

  return {
    status: normalized,
    kind: isSuccess ? 'success' : isFailure ? 'failure' : 'running',
    isTerminal: isSuccess || isFailure,
    isSuccess,
    isFailure
  }
}

export function isAiTaskTerminalStatus(status?: string | null): boolean {
  return classifyAiTaskStatus(status).isTerminal
}

export function isAiTaskSuccessStatus(status?: string | null): boolean {
  return classifyAiTaskStatus(status).isSuccess
}

export function isAiTaskFailureStatus(status?: string | null): boolean {
  return classifyAiTaskStatus(status).isFailure
}
