import assert from 'node:assert/strict'
import {
  createCooperativeModelArtifactReadiness,
  createLlamaLocalModelArtifactReadiness,
  createLlamaRuntimeStatusArtifactReadiness,
  createWorkerModelStatusArtifactReadiness
} from '../src/main/services/ai-runtime/model-artifact-readiness.mapper'
import { createPlatformAiBranchStatus } from '../src/main/services/ai-runtime/platform-ai-branch-status.projector'
import type { CooperativeModel } from '../src/shared/types/cooperative-model.types'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'

function cooperative(partial: Partial<CooperativeModel>): CooperativeModel {
  return {
    id: 'ram-plus',
    provider: 'provider',
    repoId: 'provider/model',
    displayName: 'RAM++',
    modelFamily: 'ram',
    category: 'pth',
    description: 'test model',
    fileSizeEstimate: '~1 GB',
    ...partial
  }
}

function runtime(partial: Partial<AiRuntimeState>): AiRuntimeState {
  return {
    id: 'python-worker-runtime',
    kind: 'python-worker',
    status: 'stopped',
    healthStatus: 'unknown',
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: null,
    pid: null,
    baseUrl: 'http://127.0.0.1:8000',
    ...partial
  }
}

const cooperativeReadiness = createCooperativeModelArtifactReadiness([
  cooperative({ id: 'ram-plus', displayName: 'RAM++', modelFamily: 'ram', isDownloaded: true }),
  cooperative({ id: 'wd-vit-tagger-v3', displayName: 'WD Tagger v3', modelFamily: 'wd_tagger', category: 'onnx-csv', isDownloaded: false })
])

assert.ok(cooperativeReadiness.some((item) => item.workflow === 'ai_tag_task' && item.runtimeLane === 'python_mps' && item.state === 'ready_to_load'))
assert.ok(cooperativeReadiness.some((item) => item.workflow === 'ai_tag_task' && item.runtimeLane === 'python_cuda' && item.state === 'ready_to_load'))
assert.ok(cooperativeReadiness.some((item) => item.workflow === 'ai_tag_task' && item.runtimeLane === 'onnx_runtime' && item.state === 'artifact_missing'))

const llamaReadiness = createLlamaLocalModelArtifactReadiness([
  {
    id: 'qwen3-vl-2b',
    name: 'Qwen3-VL 2B',
    filename: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf',
    isDownloaded: true,
    ggufDownloadState: 'downloaded',
    mmprojDownloadState: 'downloaded'
  },
  {
    id: 'qwen3-vl-8b',
    name: 'Qwen3-VL 8B',
    isDownloaded: false,
    isDownloading: true,
    ggufDownloadState: 'downloading',
    mmprojDownloadState: 'missing'
  }
])

assert.ok(llamaReadiness.some((item) => item.artifactId === 'qwen3-vl-2b' && item.runtimeLane === 'llama_metal' && item.state === 'ready_to_load'))
assert.ok(llamaReadiness.some((item) => item.artifactId === 'qwen3-vl-2b' && item.runtimeLane === 'llama_cuda' && item.state === 'ready_to_load'))
assert.ok(llamaReadiness.some((item) => item.artifactId === 'qwen3-vl-8b' && item.state === 'artifact_downloading'))

const workerReadiness = createWorkerModelStatusArtifactReadiness({
  cooperative_models: {
    'ram-plus': {
      loaded: true,
      backend: 'ram-real',
      is_mock: false,
      readiness: { state: 'loaded_real', backend: 'ram-real' }
    },
    'florence-2-large': {
      loaded: false,
      is_mock: false,
      readiness: { state: 'missing_dependencies', missing_dependencies: ['torch'] }
    }
  }
})

assert.ok(workerReadiness.some((item) => item.artifactId === 'ram-plus' && item.state === 'loaded_real'))
assert.ok(workerReadiness.some((item) => item.artifactId === 'florence-2-large' && item.state === 'dependency_missing'))

const llamaRuntimeReadiness = createLlamaRuntimeStatusArtifactReadiness({
  phase: 'complete',
  progress: 100,
  message: 'ready',
  baseUrl: 'http://127.0.0.1:8080/v1',
  modelPath: '/private/model/path/model.gguf',
  serverRunning: true
})

assert.equal(llamaRuntimeReadiness[0].state, 'loaded_real')
assert.deepEqual(
  llamaRuntimeReadiness.map((item) => item.runtimeLane),
  ['llama_metal', 'llama_cuda']
)

const readinessJson = JSON.stringify([...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness])
assert.doesNotMatch(readinessJson, /modelPath|localPath|Users|Downloads|Library\/Application Support/)
assert.doesNotMatch(readinessJson, /private\/model\/path/)

const projected = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runtime({})],
  modelReadiness: [...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness]
})

const tagWorkflow = projected.workflows.find((workflow) => workflow.workflow === 'ai_tag_task')
assert.equal(tagWorkflow?.status, 'real_model_path')
assert.ok(tagWorkflow?.evidence.some((item) => item.code === 'artifact_ready' && item.source === 'model_readiness'))
assert.ok(tagWorkflow?.evidence.some((item) => item.code === 'real_backend_loaded' && item.source === 'model_readiness'))

const promptWorkflow = projected.workflows.find((workflow) => workflow.workflow === 'ai_prompt_task')
assert.equal(promptWorkflow?.status, 'real_model_path')
assert.ok(promptWorkflow?.runtimeLanes.some((lane) => lane.lane === 'llama_metal' && lane.status === 'real_model_path'))

const windowsProjected = createPlatformAiBranchStatus({
  platformBranch: 'windows',
  currentPlatform: 'win32',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runtime({})],
  modelReadiness: [...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness]
})

const windowsTagWorkflow = windowsProjected.workflows.find((workflow) => workflow.workflow === 'ai_tag_task')
assert.equal(windowsTagWorkflow?.status, 'real_model_path')
assert.ok(windowsTagWorkflow?.runtimeLanes.some((lane) => (
  lane.lane === 'python_cuda'
  && lane.status === 'real_model_path'
  && lane.evidence.some((item) => item.code === 'real_backend_loaded')
)))

const windowsPromptWorkflow = windowsProjected.workflows.find((workflow) => workflow.workflow === 'ai_prompt_task')
assert.equal(windowsPromptWorkflow?.status, 'real_model_path')
assert.ok(windowsPromptWorkflow?.runtimeLanes.some((lane) => (
  lane.lane === 'llama_cuda'
  && lane.status === 'real_model_path'
)))

const missingOnly = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [],
  modelReadiness: createLlamaLocalModelArtifactReadiness([
    { id: 'qwen3-vl-4b', name: 'Qwen3-VL 4B', isDownloaded: false, ggufDownloadState: 'missing', mmprojDownloadState: 'missing' }
  ])
})

const missingPromptWorkflow = missingOnly.workflows.find((workflow) => workflow.workflow === 'ai_prompt_task')
assert.equal(missingPromptWorkflow?.status, 'planned_capability')
assert.ok(missingPromptWorkflow?.evidence.some((item) => item.code === 'artifact_missing'))
assert.ok(missingPromptWorkflow?.missing.some((item) => item.kind === 'model_artifact'))

console.log('model-artifact-readiness passed')
