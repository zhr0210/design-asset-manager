import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  CHANNEL_AI_ANALYSIS_GENERATE,
  CHANNEL_AI_ENQUEUE_TAG,
  CHANNEL_AI_MODEL_STATUS,
  CHANNEL_AI_MODEL_UNLOAD,
  CHANNEL_AI_PROCESS_BATCH,
  CHANNEL_AI_PROMPT_GENERATE,
  CHANNEL_AI_ROUTING_PREVIEW,
  EVENT_AI_TASK_SYNCED,
  type EnqueueTagRequest,
  type EnqueueTagResponse
} from '../src/shared/contracts/ai-client.contract'

assert.deepEqual({
  enqueueTag: CHANNEL_AI_ENQUEUE_TAG,
  processBatch: CHANNEL_AI_PROCESS_BATCH,
  modelStatus: CHANNEL_AI_MODEL_STATUS,
  modelUnload: CHANNEL_AI_MODEL_UNLOAD,
  promptGenerate: CHANNEL_AI_PROMPT_GENERATE,
  analysisGenerate: CHANNEL_AI_ANALYSIS_GENERATE,
  routingPreview: CHANNEL_AI_ROUTING_PREVIEW,
  taskSynced: EVENT_AI_TASK_SYNCED
}, {
  enqueueTag: 'ai:enqueue-tag',
  processBatch: 'ai:process-batch',
  modelStatus: 'ai:model-status',
  modelUnload: 'ai:model-unload',
  promptGenerate: 'ai:prompt-generate',
  analysisGenerate: 'ai:analysis-generate',
  routingPreview: 'ai:routing-preview',
  taskSynced: 'ai:task-synced'
})

const request: EnqueueTagRequest = {
  assetId: 'asset-1',
  filePath: 'fixture.png',
  priority: 0,
  modelsToRun: ['ram', 'florence2']
}
const response: EnqueueTagResponse = {
  success: true,
  task_id: 'task-1',
  status: 'queued'
}
assert.deepEqual(request.modelsToRun, ['ram', 'florence2'])
assert.equal(response.task_id, 'task-1')

const mainSource = await fs.readFile('src/main/ipc/ai-client.ipc.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const serviceSource = await fs.readFile('src/main/services/ai-client.service.ts', 'utf8')
const contractSource = await fs.readFile('src/shared/contracts/ai-client.contract.ts', 'utf8')

for (const constant of [
  'CHANNEL_AI_ENQUEUE_TAG',
  'CHANNEL_AI_PROCESS_BATCH',
  'CHANNEL_AI_MODEL_STATUS',
  'CHANNEL_AI_MODEL_UNLOAD',
  'CHANNEL_AI_PROMPT_GENERATE',
  'CHANNEL_AI_ANALYSIS_GENERATE',
  'CHANNEL_AI_ROUTING_PREVIEW'
]) {
  assert.match(mainSource, new RegExp(constant))
  assert.match(preloadSource, new RegExp(constant))
}

assert.match(mainSource, /request: EnqueueTagRequest/)
assert.match(mainSource, /Promise<EnqueueTagResponse>/)
assert.match(preloadSource, /satisfies EnqueueTagRequest/)
assert.match(serviceSource, /Promise<EnqueueTagResponse>/)
assert.match(serviceSource, /EVENT_AI_TASK_SYNCED/)
assert.match(preloadSource, /EVENT_AI_TASK_SYNCED/)
assert.match(contractSource, /modelsToRun\?: AssetTaggingModelId\[\]/)
assert.match(contractSource, /task_id\?: string/)
assert.doesNotMatch(contractSource, /taskId\?: string/)
assert.doesNotMatch(mainSource, /ipcMain\.handle\(['"]ai:/)
assert.doesNotMatch(preloadSource, /ipcRenderer\.invoke\(['"]ai:(enqueue-tag|process-batch|model-status|model-unload|prompt-generate|analysis-generate|routing-preview)/)

console.log('ai-client-ipc-contract passed')
