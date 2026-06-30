import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  classifyAiTaskStatus,
  isAiTaskFailureStatus,
  isAiTaskSuccessStatus,
  isAiTaskTerminalStatus
} from '../src/shared/workflows/ai-task-status.workflow'

assert.deepEqual(classifyAiTaskStatus('synced'), {
  status: 'synced',
  kind: 'success',
  isTerminal: true,
  isSuccess: true,
  isFailure: false
})

assert.deepEqual(classifyAiTaskStatus(' completed '), {
  status: 'completed',
  kind: 'success',
  isTerminal: true,
  isSuccess: true,
  isFailure: false
})

assert.deepEqual(classifyAiTaskStatus('failed'), {
  status: 'failed',
  kind: 'failure',
  isTerminal: true,
  isSuccess: false,
  isFailure: true
})

for (const status of ['queued', 'running', 'processing', 'waiting', 'cancelled', '', null, undefined]) {
  const classified = classifyAiTaskStatus(status)
  assert.equal(classified.kind, 'running')
  assert.equal(classified.isTerminal, false)
  assert.equal(classified.isSuccess, false)
  assert.equal(classified.isFailure, false)
}

assert.equal(isAiTaskTerminalStatus('synced'), true)
assert.equal(isAiTaskTerminalStatus('failed'), true)
assert.equal(isAiTaskTerminalStatus('running'), false)
assert.equal(isAiTaskSuccessStatus('completed'), true)
assert.equal(isAiTaskSuccessStatus('failed'), false)
assert.equal(isAiTaskFailureStatus('failed'), true)
assert.equal(isAiTaskFailureStatus('synced'), false)

const storeSource = await fs.readFile('src/renderer/stores/asset.store.ts', 'utf8')
assert.match(storeSource, /classifyAiTaskStatus/)
assert.match(storeSource, /isAiTaskTerminalStatus/)
assert.doesNotMatch(storeSource, /finalStatus === 'failed'/)
assert.doesNotMatch(storeSource, /finalStatus !== 'synced'/)
assert.doesNotMatch(storeSource, /status === 'synced' \|\| status === 'completed' \|\| status === 'failed'/)

console.log('ai-task-status-workflow passed')
