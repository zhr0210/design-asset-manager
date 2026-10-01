import assert from 'node:assert/strict'
import type { PromptVlmModel } from '../src/shared/types/ai-model.types'
import type { GpuStatus } from '../src/shared/types/ai-worker.types'
import type { LlamaInstallStatus } from '../src/shared/types/llama-runtime.types'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'
import { createAiConsoleStatusModule } from '../src/renderer/modules/ai-console-status/ai-console-status.module'
import { createElectronAiConsoleStatusAdapter } from '../src/renderer/modules/ai-console-status/electron-ai-console-status.adapter'
import { createInMemoryAiConsoleStatusAdapter } from '../src/renderer/modules/ai-console-status/in-memory-ai-console-status.adapter'

const browserPreviewModule = createAiConsoleStatusModule(
  createInMemoryAiConsoleStatusAdapter({ available: false })
)

assert.deepEqual(await browserPreviewModule.refresh({
  backendMode: 'native-qwen3vl'
}), {
  kind: 'bridge-unavailable',
  aiStatus: {
    offline: true,
    error: 'Electron bridge is unavailable in browser preview.'
  },
  gpuStatus: null,
  modelsList: []
})

const nativeModel = {
  id: 'qwen3-vl-4b-instruct',
  provider: 'Qwen',
  repoId: 'Qwen/Qwen3-VL-4B-Instruct',
  displayName: 'Qwen3-VL 4B',
  task: 'prompt_reverse',
  recommendedVramGB: 8,
  minVramGB: 6,
  quality: 'recommended',
  sizeLevel: 'medium',
  description: 'fixture',
  modelFamily: 'qwen3-vl',
  modelSize: '4B',
  quantization: 'none',
  runtime: 'transformers',
  stability: 'stable',
  isDownloaded: true
} satisfies PromptVlmModel

const directGpu = {
  success: true,
  cudaAvailable: true,
  gpuName: 'Direct GPU',
  totalVramGB: 16,
  freeVramGB: 10,
  usedVramGB: 6,
  usagePercent: 38
} satisfies GpuStatus

const llamaStatus = {
  phase: 'running',
  progress: 100,
  message: 'ready',
  baseUrl: 'http://127.0.0.1:8080/v1',
  serverPid: 42,
  serverRunning: true
} satisfies LlamaInstallStatus

const workerStatus = {
  offline: false,
  loaded_models: { qwen_vl: true },
  queue_stats: { queued: 1, running: 2, completed: 3, failed: 4 },
  gpu_status: {
    available: true,
    is_mock: false,
    device_name: 'Worker GPU',
    total_vram_mb: 12288,
    used_vram_mb: 4096,
    free_vram_mb: 8192,
    utilization_percent: 33
  }
}

const onlineModule = createAiConsoleStatusModule(createInMemoryAiConsoleStatusAdapter({
  getRuntimeList: async () => ({ success: true, data: { runtimes: [] } }),
  getWorkerStatus: async () => workerStatus,
  getGpuStatus: async () => directGpu,
  listNativeModels: async () => [nativeModel],
  getLlamaStatus: async () => llamaStatus,
  listLocalGgufModels: async () => [{
    id: 'qwen-gguf',
    name: 'Qwen GGUF',
    filename: 'qwen.gguf',
    modelPath: '/fixture/qwen.gguf',
    isDownloaded: true
  }]
}))

const onlineSnapshot = await onlineModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(onlineSnapshot.kind, 'updated')
if (onlineSnapshot.kind === 'updated') {
  assert.equal(onlineSnapshot.aiStatus, workerStatus)
  assert.equal(onlineSnapshot.gpuStatus, directGpu)
  assert.deepEqual(onlineSnapshot.modelsList, [nativeModel])
  assert.equal(onlineSnapshot.llamaStatus, llamaStatus)
  assert.equal(onlineSnapshot.llamaRunning, true)
  assert.equal(onlineSnapshot.platformBranchStatus, null)
  assert.equal(onlineSnapshot.platformWorkerProbe, null)
  assert.equal(onlineSnapshot.clipSiglipOnnxStatus, null)
  assert.deepEqual(onlineSnapshot.gpuSample, { usagePercent: 33, freeMb: 8192 })
  assert.equal(onlineSnapshot.localGgufModels[0]?.filename, 'qwen.gguf')
}

const electronBridgeModule = createAiConsoleStatusModule(createElectronAiConsoleStatusAdapter({
  aiModelStatus: async () => workerStatus,
  aiWorkerGetGpuStatus: async () => directGpu,
  aiModelList: async () => [nativeModel],
  llamaRuntimeGetStatus: async () => llamaStatus,
  llamaRuntimeListLocalModels: async () => [],
  aiRuntime: {
    listRuntimes: async () => ({ success: true, data: { runtimes: [] } }),
    getClipSiglipOnnxStatus: async () => ({ success: false })
  }
}))

const electronBridgeSnapshot = await electronBridgeModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(electronBridgeSnapshot.kind, 'updated')
if (electronBridgeSnapshot.kind === 'updated') {
  assert.equal(electronBridgeSnapshot.aiStatus, workerStatus)
  assert.deepEqual(electronBridgeSnapshot.modelsList, [nativeModel])
  assert.equal(electronBridgeSnapshot.llamaRunning, true)
}

const macOSRuntime = {
  id: 'macos-ai-branch-runtime',
  kind: 'disabled',
  status: 'stopped',
  healthStatus: 'unknown',
  startedAt: null,
  stoppedAt: null,
  lastHealthCheckAt: null,
  lastError: null,
  pid: null,
  baseUrl: null,
  metadata: {
    macosAiBranch: {
      marker: 'macos-ai-branch',
      phase: 'worker-probes',
      platform: 'darwin',
      arch: 'arm64',
      isCurrentPlatform: true,
      lanes: [],
      warnings: []
    }
  }
} satisfies AiRuntimeState

const macOSBranchStatus = {
  platformBranch: 'macos' as const,
  generatedAt: '2026-08-09T00:00:00.000Z',
  workflows: []
}
const macOSProbe = {
  platform: 'darwin',
  machine: 'arm64',
  isMacOS: true,
  isAppleSilicon: true,
  phase: 'worker-probes' as const,
  torch: {
    available: true,
    version: '2.8.0',
    cpuFallback: true,
    mpsAvailable: true,
    error: null
  },
  onnxruntime: {
    available: true,
    version: '1.22.0',
    providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider'],
    cpuAvailable: true,
    error: null
  },
  clipSiglipOnnx: {
    id: 'clip-siglip-onnx',
    label: 'CLIP/SigLIP ONNX',
    status: 'ready' as const,
    role: 'embedding' as const,
    available: true
  },
  lanes: []
}
const clipStatus = {
  success: true,
  compatible: true,
  runtime: 'optimum.onnxruntime',
  diagnostics: {}
}

const macOSModule = createAiConsoleStatusModule(createElectronAiConsoleStatusAdapter({
  aiModelStatus: async () => ({ offline: false }),
  aiRuntime: {
    listRuntimes: async () => ({ success: true, data: { runtimes: [macOSRuntime] } }),
    getMacOSCapabilities: async () => ({
      success: true,
      data: { offline: false, capabilities: macOSProbe }
    }),
    getMacOSAiBranchStatus: async () => ({ success: true, data: macOSBranchStatus }),
    getPythonMpsStatus: async () => ({
      success: true,
      data: {
        success: true,
        compatible: true,
        runtime: 'torch.mps',
        status: 'optional',
        diagnostics: {}
      }
    }),
    getClipSiglipOnnxStatus: async () => ({ success: true, data: clipStatus })
  }
}))

const macOSSnapshot = await macOSModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(macOSSnapshot.kind, 'updated')
if (macOSSnapshot.kind === 'updated') {
  assert.equal(macOSSnapshot.platformWorkerProbeBranch, 'macos')
  assert.equal(macOSSnapshot.platformWorkerProbe?.platform, 'darwin')
  assert.equal(macOSSnapshot.platformProbeDisplay.connected, true)
  assert.equal(macOSSnapshot.platformBranchStatus, macOSBranchStatus)
  assert.equal(macOSSnapshot.platformPythonCompatibilityDisplay.label, '可兼容')
  assert.equal(macOSSnapshot.platformPythonCompatibilityDisplay.runtimeLabel, 'torch.mps')
  assert.equal(macOSSnapshot.clipSiglipOnnxStatus, clipStatus)
}

let offlinePythonStatusCalls = 0
const offlineWorkerModule = createAiConsoleStatusModule(createInMemoryAiConsoleStatusAdapter({
  getRuntimeList: async () => ({ success: true, data: { runtimes: [macOSRuntime] } }),
  getWorkerStatus: async () => ({ offline: true }),
  getPythonMpsStatus: async () => {
    offlinePythonStatusCalls += 1
    return {
      success: true,
      data: {
        success: true,
        compatible: true,
        runtime: 'must-not-be-read',
        status: 'optional',
        diagnostics: {}
      }
    }
  }
}))
const offlineWorkerSnapshot = await offlineWorkerModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(offlineWorkerSnapshot.kind, 'updated')
assert.equal(offlinePythonStatusCalls, 0)
if (offlineWorkerSnapshot.kind === 'updated') {
  assert.equal(offlineWorkerSnapshot.platformPythonCompatibilityDisplay.label, '未检查')
}

const partialFailureModule = createAiConsoleStatusModule(createInMemoryAiConsoleStatusAdapter({
  getRuntimeList: async () => {
    throw new Error('registry unavailable')
  },
  getWorkerStatus: async () => {
    throw new Error('worker down')
  },
  getGpuStatus: async () => directGpu,
  listNativeModels: async () => {
    throw new Error('model list failed')
  },
  listLocalGgufModels: async () => [{
    id: 'surviving-gguf',
    name: 'Surviving GGUF',
    filename: 'surviving.gguf',
    modelPath: '/fixture/surviving.gguf'
  }],
  getClipSiglipOnnxStatus: async () => {
    throw new Error('clip check failed')
  }
}))

const partialFailureSnapshot = await partialFailureModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(partialFailureSnapshot.kind, 'updated')
if (partialFailureSnapshot.kind === 'updated') {
  assert.deepEqual(partialFailureSnapshot.aiStatus, {
    offline: true,
    error: 'Error: worker down'
  })
  assert.equal(partialFailureSnapshot.gpuStatus, directGpu)
  assert.deepEqual(partialFailureSnapshot.modelsList, [])
  assert.equal(partialFailureSnapshot.localGgufModels[0]?.id, 'surviving-gguf')
  assert.equal(partialFailureSnapshot.clipSiglipOnnxStatus, null)
  assert.equal(partialFailureSnapshot.platformPythonCompatibilityDisplay.label, '未检查')
}

const llamaFallbackModule = createAiConsoleStatusModule(createInMemoryAiConsoleStatusAdapter({
  getLlamaStatus: async () => ({
    phase: 'idle',
    progress: 0,
    message: 'not started',
    baseUrl: 'http://127.0.0.1:8080/v1'
  }),
  checkLlamaHealth: async (baseUrl) => ({
    running: baseUrl === 'http://127.0.0.1:8080/v1'
  })
}))

const llamaFallbackSnapshot = await llamaFallbackModule.refresh({
  backendMode: 'llama-openai',
  llamaBaseUrl: 'http://127.0.0.1:8080/v1'
})
assert.equal(llamaFallbackSnapshot.kind, 'updated')
if (llamaFallbackSnapshot.kind === 'updated') {
  assert.equal(llamaFallbackSnapshot.llamaRunning, true)
  assert.equal(llamaFallbackSnapshot.llamaStatus?.serverPid, 1)
  assert.equal(llamaFallbackSnapshot.llamaStatus?.phase, 'running')
}

const windowsRuntime = {
  ...macOSRuntime,
  id: 'windows-ai-branch-runtime',
  metadata: {
    windowsAiBranch: {
      marker: 'windows-ai-branch',
      phase: 'worker-probes',
      platform: 'win32',
      arch: 'x64',
      isCurrentPlatform: true,
      lanes: [],
      warnings: []
    }
  }
} satisfies AiRuntimeState
const windowsProbe = {
  ...macOSProbe,
  platform: 'win32',
  machine: 'amd64',
  isMacOS: false,
  isAppleSilicon: false,
  torch: {
    ...macOSProbe.torch,
    mpsAvailable: undefined,
    cudaAvailable: true
  }
}
const windowsModule = createAiConsoleStatusModule(createElectronAiConsoleStatusAdapter({
  aiModelStatus: async () => ({ offline: false }),
  aiRuntime: {
    listRuntimes: async () => ({ success: true, data: { runtimes: [windowsRuntime] } }),
    getWindowsCapabilities: async () => ({
      success: true,
      data: { offline: false, capabilities: windowsProbe }
    }),
    getWindowsAiBranchStatus: async () => ({
      success: true,
      data: macOSBranchStatus
    }),
    getPythonCudaStatus: async () => ({
      success: true,
      data: {
        success: true,
        compatible: true,
        runtime: 'torch.cuda',
        status: 'optional',
        diagnostics: {}
      }
    })
  }
}))

const windowsSnapshot = await windowsModule.refresh({ backendMode: 'native-qwen3vl' })
assert.equal(windowsSnapshot.kind, 'updated')
if (windowsSnapshot.kind === 'updated') {
  assert.equal(windowsSnapshot.platformWorkerProbeBranch, 'windows')
  assert.equal(windowsSnapshot.platformWorkerProbe?.platform, 'win32')
  assert.equal(windowsSnapshot.platformBranchStatus, null)
  assert.equal(windowsSnapshot.platformPythonCompatibilityDisplay.runtimeLabel, 'torch.cuda')
}

const unexpectedFailureModule = createAiConsoleStatusModule(createInMemoryAiConsoleStatusAdapter({
  getRuntimeList: () => {
    throw new Error('unexpected bridge failure')
  }
}))
assert.deepEqual(await unexpectedFailureModule.refresh({ backendMode: 'native-qwen3vl' }), {
  kind: 'unchanged',
  error: { message: 'unexpected bridge failure' }
})

console.log('ai-console-status-module passed')
