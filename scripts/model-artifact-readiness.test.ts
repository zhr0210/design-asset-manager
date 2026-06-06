import assert from 'node:assert/strict'
import {
  createCooperativeModelArtifactReadiness,
  createLlamaLocalModelArtifactReadiness,
  createLlamaRuntimeStatusArtifactReadiness,
  createLlamaMultimodalProbeArtifactReadiness,
  createOnnxModelLoadProbeArtifactReadiness,
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
  mmprojPath: '/private/model/path/mmproj.gguf',
  serverRunning: true
})

assert.equal(llamaRuntimeReadiness[0].state, 'ready_to_load')
assert.deepEqual(
  llamaRuntimeReadiness.map((item) => item.runtimeLane),
  ['llama_metal', 'llama_cuda']
)

const llamaMultimodalReadiness = createLlamaMultimodalProbeArtifactReadiness({
  success: true,
  baseUrl: 'http://127.0.0.1:8080/v1',
  models: ['Qwen3VL-2B-Instruct-Q4_K_M.gguf'],
  modelId: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf',
  chatOk: true,
  visionOk: true,
  visionInput: 'generated_fixture',
  checkedAt: '2026-06-06T00:00:00.000Z'
})
assert.equal(llamaMultimodalReadiness[0].state, 'loaded_real')
assert.equal(llamaMultimodalReadiness[0].source, 'explicit_load_probe')
assert.match(llamaMultimodalReadiness[0].detail ?? '', /text \+ generated-image inference/)

const onnxLoadReadiness = createOnnxModelLoadProbeArtifactReadiness({
  success: true,
  modelFamily: 'wd_tagger',
  status: 'loaded_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider'],
  inputCount: 1,
  outputCount: 1
})
assert.deepEqual(onnxLoadReadiness.map((item) => ({
  workflow: item.workflow,
  lane: item.runtimeLane,
  state: item.state,
  source: item.source
})), [{
  workflow: 'ai_tag_task',
  lane: 'onnx_runtime',
  state: 'loaded_real',
  source: 'explicit_load_probe'
}])

const clipEmbeddingReadiness = createOnnxModelLoadProbeArtifactReadiness({
  success: true,
  modelFamily: 'clip',
  status: 'loaded_real',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: ['CPUExecutionProvider'],
  inputCount: 3,
  outputCount: 4,
  operation: 'image_text_embedding',
  resultFinite: true,
  embeddingDimension: 512
})
assert.deepEqual(clipEmbeddingReadiness.map((item) => ({
  workflow: item.workflow,
  lane: item.runtimeLane,
  state: item.state,
  source: item.source
})), [{
  workflow: 'search_embedding',
  lane: 'onnx_runtime',
  state: 'loaded_real',
  source: 'explicit_load_probe'
}])
assert.match(clipEmbeddingReadiness[0].detail ?? '', /512d/)

const missingOnnxReadiness = createOnnxModelLoadProbeArtifactReadiness({
  success: false,
  modelFamily: 'wd_tagger',
  status: 'artifact_missing',
  checkedAt: '2026-06-06T00:00:00.000Z',
  providers: [],
  inputCount: 0,
  outputCount: 0,
  errorCode: 'MODEL_ARTIFACT_MISSING'
})
assert.equal(missingOnnxReadiness[0].state, 'artifact_missing')
assert.equal(missingOnnxReadiness[0].missing?.[0].kind, 'model_artifact')

const onnxProbeOnlyProjection = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-06T00:00:00.000Z',
  runtimes: [],
  modelReadiness: onnxLoadReadiness
})
assert.equal(
  onnxProbeOnlyProjection.workflows.find((workflow) => workflow.workflow === 'ai_tag_task')?.status,
  'real_model_path'
)
assert.equal(
  onnxProbeOnlyProjection.workflows.find((workflow) => workflow.workflow === 'ocr_text_box')?.status,
  'evidence_insufficient'
)
assert.equal(
  onnxProbeOnlyProjection.workflows.find((workflow) => workflow.workflow === 'search_embedding')?.status,
  'evidence_insufficient'
)

const clipProbeOnlyProjection = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-06T00:00:00.000Z',
  runtimes: [],
  modelReadiness: clipEmbeddingReadiness
})
assert.equal(
  clipProbeOnlyProjection.workflows.find((workflow) => workflow.workflow === 'search_embedding')?.status,
  'real_model_path'
)
assert.equal(
  clipProbeOnlyProjection.workflows.find((workflow) => workflow.workflow === 'ai_tag_task')?.status,
  'evidence_insufficient'
)

const readinessJson = JSON.stringify([...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness, ...llamaMultimodalReadiness, ...onnxLoadReadiness])
assert.doesNotMatch(readinessJson, /modelPath|localPath|Users|Downloads|Library\/Application Support/)
assert.doesNotMatch(readinessJson, /private\/model\/path/)

const projected = createPlatformAiBranchStatus({
  platformBranch: 'macos',
  currentPlatform: 'darwin',
  generatedAt: '2026-06-04T00:00:00.000Z',
  runtimes: [runtime({})],
  modelReadiness: [...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness, ...llamaMultimodalReadiness]
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
  modelReadiness: [...cooperativeReadiness, ...llamaReadiness, ...workerReadiness, ...llamaRuntimeReadiness, ...llamaMultimodalReadiness]
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
assert.equal(missingPromptWorkflow?.status, 'evidence_insufficient')
assert.ok(missingPromptWorkflow?.evidence.some((item) => item.code === 'artifact_missing'))
assert.ok(missingPromptWorkflow?.missing.some((item) => item.kind === 'model_artifact'))

console.log('model-artifact-readiness passed')
