import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  syncProjectedAiTaskCompletionRecord,
  syncProjectedAiTaskLifecycle
} from '../src/main/services/ai-client/ai-task-lifecycle-sync.sink'
import type { AiTaskSyncActionPlan } from '../src/main/services/ai-client/ai-result-sync.projector'

function createFakeDb() {
  const statements: Array<{ sql: string; params: unknown[] }> = []
  return {
    statements,
    db: {
      prepare(sql: string) {
        return {
          run: (...params: unknown[]) => statements.push({
            sql: sql.replace(/\s+/g, ' ').trim(),
            params
          })
        }
      }
    }
  }
}

const activeAction: AiTaskSyncActionPlan = {
  lifecycle: 'active',
  taskStatus: 'running',
  taskSyncStatus: null,
  assetStatus: 'running',
  errorMessage: null
}
const activeDb = createFakeDb()
assert.equal(syncProjectedAiTaskLifecycle({
  db: activeDb.db,
  workflow: 'tagging',
  taskId: 'task-1',
  assetId: 'asset-1',
  action: activeAction
}), true)
assert.deepEqual(activeDb.statements, [
  {
    sql: 'UPDATE ai_tag_tasks SET status = ? WHERE id = ?',
    params: ['running', 'task-1']
  },
  {
    sql: 'UPDATE assets SET ai_tag_status = ? WHERE id = ?',
    params: ['running', 'asset-1']
  }
])

const failedAction: AiTaskSyncActionPlan = {
  lifecycle: 'failed',
  taskStatus: 'failed',
  taskSyncStatus: 'failed',
  assetStatus: 'failed',
  errorMessage: 'worker failed'
}
const failedDb = createFakeDb()
assert.equal(syncProjectedAiTaskLifecycle({
  db: failedDb.db,
  workflow: 'analysis',
  taskId: 'task-2',
  assetId: 'asset-2',
  action: failedAction
}), true)
assert.deepEqual(failedDb.statements, [
  {
    sql: 'UPDATE ai_analysis_tasks SET status = ?, sync_status = ?, error_message = ? WHERE id = ?',
    params: ['failed', 'failed', 'worker failed', 'task-2']
  },
  {
    sql: 'UPDATE assets SET ai_analysis_status = ? WHERE id = ?',
    params: ['failed', 'asset-2']
  }
])

const cancelledDb = createFakeDb()
assert.equal(syncProjectedAiTaskLifecycle({
  db: cancelledDb.db,
  workflow: 'tagging',
  taskId: 'task-3',
  assetId: 'asset-3',
  action: {
    lifecycle: 'cancelled',
    taskStatus: 'cancelled',
    taskSyncStatus: null,
    assetStatus: 'not_started',
    errorMessage: null
  }
}), true)
assert.equal(cancelledDb.statements[1].params[0], 'not_started')

const promptFailedDb = createFakeDb()
assert.equal(syncProjectedAiTaskLifecycle({
  db: promptFailedDb.db,
  workflow: 'prompt',
  taskId: 'task-prompt-failed',
  assetId: 'asset-prompt-failed',
  action: failedAction
}), true)
assert.deepEqual(promptFailedDb.statements, [
  {
    sql: 'UPDATE ai_prompt_tasks SET status = ?, sync_status = ?, error_message = ? WHERE id = ?',
    params: ['failed', 'failed', 'worker failed', 'task-prompt-failed']
  },
  {
    sql: 'UPDATE assets SET ai_prompt_status = ? WHERE id = ?',
    params: ['failed', 'asset-prompt-failed']
  }
])

for (const lifecycle of ['completed', 'ignored'] as const) {
  const db = createFakeDb()
  assert.equal(syncProjectedAiTaskLifecycle({
    db: db.db,
    workflow: 'analysis',
    taskId: 'task-noop',
    assetId: 'asset-noop',
    action: {
      lifecycle,
      taskStatus: lifecycle === 'completed' ? 'completed' : null,
      taskSyncStatus: lifecycle === 'completed' ? 'synced' : null,
      assetStatus: lifecycle === 'completed' ? 'synced' : null,
      errorMessage: null
    }
  }), false)
  assert.deepEqual(db.statements, [])
}

const taggingCompletionDb = createFakeDb()
assert.equal(syncProjectedAiTaskCompletionRecord({
  db: taggingCompletionDb.db,
  workflow: 'tagging',
  taskId: 'task-4',
  action: {
    lifecycle: 'completed',
    taskStatus: 'completed',
    taskSyncStatus: 'synced',
    assetStatus: 'synced',
    errorMessage: null
  },
  syncedAt: '2026-06-05T10:00:00.000Z',
  startedAt: '2026-06-05T09:59:00.000Z',
  completedAt: '2026-06-05T09:59:30.000Z'
}), true)
assert.deepEqual(taggingCompletionDb.statements[0], {
  sql: 'UPDATE ai_tag_tasks SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ? WHERE id = ?',
  params: [
    'completed',
    'synced',
    '2026-06-05T10:00:00.000Z',
    '2026-06-05T09:59:00.000Z',
    '2026-06-05T09:59:30.000Z',
    'task-4'
  ]
})

const analysisCompletionDb = createFakeDb()
assert.equal(syncProjectedAiTaskCompletionRecord({
  db: analysisCompletionDb.db,
  workflow: 'analysis',
  taskId: 'task-5',
  action: {
    lifecycle: 'completed',
    taskStatus: 'completed',
    taskSyncStatus: 'synced',
    assetStatus: 'synced',
    errorMessage: null
  },
  syncedAt: '2026-06-05T10:00:00.000Z',
  startedAt: null,
  completedAt: null,
  resultJson: '{"layout":"grid"}'
}), true)
assert.deepEqual(analysisCompletionDb.statements[0], {
  sql: 'UPDATE ai_analysis_tasks SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ?, result_json = ? WHERE id = ?',
  params: [
    'completed',
    'synced',
    '2026-06-05T10:00:00.000Z',
    null,
    null,
    '{"layout":"grid"}',
    'task-5'
  ]
})

const promptCompletionDb = createFakeDb()
assert.equal(syncProjectedAiTaskCompletionRecord({
  db: promptCompletionDb.db,
  workflow: 'prompt',
  taskId: 'task-prompt-complete',
  action: {
    lifecycle: 'completed',
    taskStatus: 'completed',
    taskSyncStatus: 'synced',
    assetStatus: 'synced',
    errorMessage: null
  },
  syncedAt: '2026-06-05T10:00:00.000Z',
  startedAt: '2026-06-05T09:59:00.000Z',
  completedAt: '2026-06-05T09:59:30.000Z',
  resultPrompt: 'studio product photo',
  resultCaption: 'Product on white background'
}), true)
assert.deepEqual(promptCompletionDb.statements[0], {
  sql: 'UPDATE ai_prompt_tasks SET status = ?, sync_status = ?, synced_at = ?, started_at = ?, completed_at = ?, result_prompt = ?, result_caption = ? WHERE id = ?',
  params: [
    'completed',
    'synced',
    '2026-06-05T10:00:00.000Z',
    '2026-06-05T09:59:00.000Z',
    '2026-06-05T09:59:30.000Z',
    'studio product photo',
    'Product on white background',
    'task-prompt-complete'
  ]
})

const invalidCompletionDb = createFakeDb()
assert.equal(syncProjectedAiTaskCompletionRecord({
  db: invalidCompletionDb.db,
  workflow: 'tagging',
  taskId: 'task-noop',
  action: activeAction,
  syncedAt: '2026-06-05T10:00:00.000Z',
  startedAt: null,
  completedAt: null
}), false)
assert.deepEqual(invalidCompletionDb.statements, [])

const aiClientSource = await fs.readFile('src/main/services/ai-client.service.ts', 'utf8')
assert.match(aiClientSource, /syncProjectedAiTaskLifecycle/)
assert.match(aiClientSource, /syncProjectedAiTaskCompletionRecord/)
assert.equal((aiClientSource.match(/syncProjectedAiTaskLifecycle\(\{/g) ?? []).length, 3)
assert.equal((aiClientSource.match(/syncProjectedAiTaskCompletionRecord\(\{/g) ?? []).length, 3)
assert.doesNotMatch(aiClientSource, /UPDATE ai_tag_tasks SET status = \? WHERE id = \?/)
assert.doesNotMatch(aiClientSource, /UPDATE ai_prompt_tasks SET status = \? WHERE id = \?/)
assert.doesNotMatch(aiClientSource, /UPDATE ai_analysis_tasks SET status = \? WHERE id = \?/)
assert.doesNotMatch(aiClientSource, /SET status = \?, sync_status = \?, error_message = \?/)
assert.doesNotMatch(aiClientSource, /SET status = \?, sync_status = \?, synced_at = \?, started_at = \?, completed_at = \?/)

console.log('ai-task-lifecycle-sync-sink passed')
