import assert from 'node:assert/strict'
import { createPlatformAiBranchStatus } from '../src/main/services/ai-runtime/platform-ai-branch-status.projector'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'

function runtime(partial: Partial<AiRuntimeState>): AiRuntimeState {
  return {
    id: 'python-worker-runtime',
    kind: 'python-worker',
    status: 'running',
    healthStatus: 'ok',
    startedAt: '2026-06-04T00:00:00.000Z',
    stoppedAt: null,
    lastHealthCheckAt: '2026-06-04T00:00:01.000Z',
    lastError: null,
    pid: 123,
    baseUrl: 'http://127.0.0.1:8000',
    ...partial
  }
}

const runningPython = runtime({})
const macos = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runningPython]
})

assert.equal(macos.platformBranch, 'macos')
assert.equal(macos.generatedAt, '2026-06-04T00:00:00.000Z')
assert.deepEqual(macos.workflows.map((workflow) => workflow.workflow), [
  'ai_tag_task',
  'ai_prompt_task',
  'ocr_text_box',
  'search_embedding'
])
assert.equal(macos.workflows[0].status, 'runtime_probe_ready')
assert.ok(macos.workflows[0].runtimeLanes.some((lane) => lane.lane === 'python_mps'))
assert.ok(macos.workflows[0].evidence.some((item) => item.code === 'runtime_probe_ready' && item.source === 'runtime_health'))

const windows = createPlatformAiBranchStatus({
  platformBranch: 'windows',
  currentPlatform: 'win32',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runningPython]
})

assert.equal(windows.platformBranch, 'windows')
assert.deepEqual(
  windows.workflows.map((workflow) => Object.keys(workflow).sort()),
  macos.workflows.map((workflow) => Object.keys(workflow).sort())
)
assert.deepEqual(windows.workflows.map((workflow) => workflow.workflow), macos.workflows.map((workflow) => workflow.workflow))
assert.ok(windows.workflows[0].runtimeLanes.some((lane) => lane.lane === 'python_cuda'))
assert.notDeepEqual(
  windows.workflows[0].runtimeLanes.map((lane) => lane.lane),
  macos.workflows[0].runtimeLanes.map((lane) => lane.lane)
)

const windowsOnMac = createPlatformAiBranchStatus({
  platformBranch: 'windows',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runningPython]
})

assert.equal(windowsOnMac.workflows[0].status, 'unavailable')
assert.ok(windowsOnMac.workflows[0].evidence.some((item) => item.code === 'platform_unsupported'))
assert.ok(windowsOnMac.workflows[0].missing.some((item) => item.kind === 'platform_support'))

for (const response of [macos, windows, windowsOnMac]) {
  const encoded = JSON.stringify(response)
  assert.doesNotMatch(encoded, /ipcRenderer|ipcMain|channel|payload|invoke/)
  for (const workflow of response.workflows) {
    assert.ok(Array.isArray(workflow.evidence))
    assert.ok(Array.isArray(workflow.missing))
    assert.equal(typeof workflow.primaryRuntimeLane, 'string')
  }
}

console.log('platform-ai-branch-status-projector passed')
