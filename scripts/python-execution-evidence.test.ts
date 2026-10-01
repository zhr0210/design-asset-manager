import assert from 'node:assert/strict'
import {
  getFreshPythonExecutionEvidence,
  recordPythonExecutionEvidence
} from '../src/main/services/ai-runtime/python-execution-evidence.store'
import { createPlatformAiBranchStatus } from '../src/main/services/ai-runtime/platform-ai-branch-status.projector'

const checkedAt = '2026-06-14T00:00:00.000Z'
const checkedAtMs = Date.parse(checkedAt)

recordPythonExecutionEvidence({
  lane: 'python_mps',
  probe: {
    success: true,
    status: 'executed_real',
    checkedAt,
    runtime: 'torch.mps',
    operation: 'tensor_square_sum',
    resultFinite: true
  }
})

assert.equal(getFreshPythonExecutionEvidence(checkedAtMs).length, 1)
assert.equal(getFreshPythonExecutionEvidence(checkedAtMs + 5 * 60 * 1000).length, 1)
assert.equal(getFreshPythonExecutionEvidence(checkedAtMs + 5 * 60 * 1000 + 1).length, 0)

const status = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: checkedAt,
  runtimes: [],
  pythonExecutionEvidence: getFreshPythonExecutionEvidence(checkedAtMs)
})
const tagWorkflow = status.workflows.find((workflow) => workflow.workflow === 'ai_tag_task')
const mpsLane = tagWorkflow?.runtimeLanes.find((lane) => lane.lane === 'python_mps')
assert.equal(mpsLane?.status, 'runtime_probe_ready')
assert.equal(tagWorkflow?.status, 'runtime_probe_ready')
assert.ok(mpsLane?.evidence.some((item) => (
  item.code === 'runtime_probe_ready'
  && item.source === 'worker_probe'
  && item.detail?.includes('tensor_square_sum')
)))
assert.equal(tagWorkflow?.status === 'real_model_path', false)

recordPythonExecutionEvidence({
  lane: 'python_cuda',
  probe: {
    success: false,
    status: 'backend_unavailable',
    checkedAt,
    runtime: 'torch.cuda',
    operation: 'tensor_square_sum',
    resultFinite: false,
    errorCode: 'CUDA_UNAVAILABLE'
  }
})
const windowsStatus = createPlatformAiBranchStatus({
  platformBranch: 'windows',
  currentPlatform: 'win32',
  generatedAt: checkedAt,
  runtimes: [],
  pythonExecutionEvidence: getFreshPythonExecutionEvidence(checkedAtMs)
})
const cudaLane = windowsStatus.workflows
  .find((workflow) => workflow.workflow === 'ai_tag_task')
  ?.runtimeLanes.find((lane) => lane.lane === 'python_cuda')
assert.equal(cudaLane?.status, 'evidence_insufficient')
assert.ok(cudaLane?.evidence.some((item) => item.code === 'service_unavailable'))

console.log('python-execution-evidence passed')
