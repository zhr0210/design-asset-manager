import type {
  AiResultSyncWorkflow,
  AiTaskSyncActionPlan
} from './ai-result-sync.projector'

interface LifecycleSyncDatabase {
  prepare(sql: string): {
    run(...params: unknown[]): unknown
  }
}

const WORKFLOW_STORAGE = {
  tagging: {
    taskTable: 'ai_tag_tasks',
    assetStatusColumn: 'ai_tag_status'
  },
  prompt: {
    taskTable: 'ai_prompt_tasks',
    assetStatusColumn: 'ai_prompt_status'
  },
  analysis: {
    taskTable: 'ai_analysis_tasks',
    assetStatusColumn: 'ai_analysis_status'
  }
} as const

export function syncProjectedAiTaskLifecycle(input: {
  db: LifecycleSyncDatabase
  workflow: AiResultSyncWorkflow
  taskId: string
  assetId: string
  action: AiTaskSyncActionPlan
}): boolean {
  const { action } = input
  if (
    action.lifecycle !== 'active'
    && action.lifecycle !== 'failed'
    && action.lifecycle !== 'cancelled'
  ) {
    return false
  }

  if (!action.taskStatus || !action.assetStatus) return false

  const storage = WORKFLOW_STORAGE[input.workflow]
  if (action.lifecycle === 'failed') {
    input.db.prepare(`
      UPDATE ${storage.taskTable}
      SET status = ?, sync_status = ?, error_message = ?
      WHERE id = ?
    `).run(action.taskStatus, action.taskSyncStatus, action.errorMessage, input.taskId)
  } else {
    input.db.prepare(`UPDATE ${storage.taskTable} SET status = ? WHERE id = ?`)
      .run(action.taskStatus, input.taskId)
  }

  input.db.prepare(`UPDATE assets SET ${storage.assetStatusColumn} = ? WHERE id = ?`)
    .run(action.assetStatus, input.assetId)
  return true
}

export function syncProjectedAiTaskCompletionRecord(input: {
  db: LifecycleSyncDatabase
  workflow: AiResultSyncWorkflow
  taskId: string
  action: AiTaskSyncActionPlan
  syncedAt: string
  startedAt: string | null
  completedAt: string | null
  resultJson?: string
  resultPrompt?: string
  resultCaption?: string
}): boolean {
  if (
    input.action.lifecycle !== 'completed'
    || !input.action.taskStatus
    || !input.action.taskSyncStatus
  ) {
    return false
  }

  const storage = WORKFLOW_STORAGE[input.workflow]
  if (input.workflow === 'analysis') {
    input.db.prepare(`
      UPDATE ${storage.taskTable}
      SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ?, result_json = ?
      WHERE id = ?
    `).run(
      input.action.taskStatus,
      input.action.taskSyncStatus,
      input.syncedAt,
      input.startedAt,
      input.completedAt,
      input.resultJson ?? null,
      input.taskId
    )
  } else if (input.workflow === 'prompt') {
    input.db.prepare(`
      UPDATE ${storage.taskTable}
      SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ?,
          result_prompt = ?, result_caption = ?
      WHERE id = ?
    `).run(
      input.action.taskStatus,
      input.action.taskSyncStatus,
      input.syncedAt,
      input.startedAt,
      input.completedAt,
      input.resultPrompt ?? '',
      input.resultCaption ?? '',
      input.taskId
    )
  } else {
    input.db.prepare(`
      UPDATE ${storage.taskTable}
      SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ?
      WHERE id = ?
    `).run(
      input.action.taskStatus,
      input.action.taskSyncStatus,
      input.syncedAt,
      input.startedAt,
      input.completedAt,
      input.taskId
    )
  }

  return true
}
