import os from 'os'
import { ipcMain } from 'electron'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD,
  CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE,
  CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,
  CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION,
  CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_START_RUNTIME,
  CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG
} from '../../shared/contracts/ai-runtime.contract'
import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { PlatformAiBranch } from '../../shared/types/platform-ai-branch-status.types'
import type {
  AiRuntimeGetStateRequest,
  AiRuntimeHealthCheckRequest,
  AiRuntimeIpcResponse,
  AiRuntimeMacOSCapabilitiesResponse,
  AiRuntimeOperationRequest,
  AiRuntimeOnnxModelLoadProbeRequest,
  AiRuntimePythonCudaExecutionProbeResponse,
  AiRuntimePythonCudaStatusResponse,
  AiRuntimePythonMpsExecutionProbeResponse,
  AiRuntimePythonMpsStatusResponse,
  AiRuntimeSelectActiveRequest,
  AiRuntimeUpdateConfigRequest,
  AiRuntimeWindowsCapabilitiesResponse
} from '../../shared/contracts/ai-runtime.contract'
import type {
  AiRuntimeOnnxModelLoadProbeResponse
} from '../../shared/contracts/ai-runtime.contract'
import { AiClientService } from '../services/ai-client.service'
import { bootstrapAiRuntimeManager } from '../services/ai-runtime/ai-runtime-bootstrap'
import { resolveAiServiceRoot } from '../services/ai-service-paths'
import { resolvePythonExecutable } from '../services/ai-python-runtime.service'
import { createPlatformAiBranchStatus } from '../services/ai-runtime/platform-ai-branch-status.projector'
import {
  createLlamaMultimodalProbeArtifactReadiness,
  createLlamaRuntimeStatusArtifactReadiness,
  createOcrRealEvidenceArtifactReadiness,
  createOnnxModelLoadProbeArtifactReadiness,
  createWorkerModelStatusArtifactReadiness
} from '../services/ai-runtime/model-artifact-readiness.mapper'
import { LlamaRuntimeInstallService } from '../services/llama-runtime/llama-runtime-install.service'
import { getFreshLlamaMultimodalProbe } from '../services/ai-runtime/llama-multimodal-evidence.store'
import {
  getFreshOcrRealEvidence,
  recordOcrRealEvidence
} from '../services/ai-runtime/ocr-real-evidence.store'
import { createOcrRealEvidenceProbeService } from '../services/ai-runtime/ocr-real-evidence-probe.factory'
import {
  getFreshPythonExecutionEvidence,
  recordPythonExecutionEvidence
} from '../services/ai-runtime/python-execution-evidence.store'

function success<T>(data: T): AiRuntimeIpcResponse<T> {
  return { success: true, data }
}

function failure(error: unknown): AiRuntimeIpcResponse<never> {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  }
}

function resolveRuntimePythonExecutable(): string {
  return resolvePythonExecutable()
}

interface PlatformAiBranchStatusIpcDescriptor {
  channel:
    | typeof CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS
    | typeof CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS
  platformBranch: PlatformAiBranch
}

type PlatformAiCapabilitiesIpcDescriptor =
  | {
      channel: typeof CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES
      getCapabilities: () => Promise<AiRuntimeMacOSCapabilitiesResponse>
    }
  | {
      channel: typeof CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES
      getCapabilities: () => Promise<AiRuntimeWindowsCapabilitiesResponse>
    }

type PythonCompatibilityStatusIpcDescriptor =
  | {
      channel: typeof CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS
      getStatus: () => Promise<AiRuntimePythonMpsStatusResponse>
    }
  | {
      channel: typeof CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS
      getStatus: () => Promise<AiRuntimePythonCudaStatusResponse>
    }

type PythonExecutionProbeIpcDescriptor =
  | {
      channel: typeof CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION
      evidenceLane: 'python_mps'
      probe: () => Promise<AiRuntimePythonMpsExecutionProbeResponse>
    }
  | {
      channel: typeof CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION
      evidenceLane: 'python_cuda'
      probe: () => Promise<AiRuntimePythonCudaExecutionProbeResponse>
    }

const PLATFORM_AI_BRANCH_STATUS_IPC_DESCRIPTORS: PlatformAiBranchStatusIpcDescriptor[] = [
  {
    channel: CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
    platformBranch: 'macos'
  },
  {
    channel: CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
    platformBranch: 'windows'
  }
]

const { manager: aiRuntimeManager } = bootstrapAiRuntimeManager({
  platform: process.platform as PlatformName,
  arch: process.arch as PlatformArch,
  homeDir: os.homedir(),
  pythonExecutable: resolveRuntimePythonExecutable(),
  aiServiceRoot: resolveAiServiceRoot()
}, {
  onAutoStartError: (error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[ai-runtime] Could not auto-start python-worker-runtime:', message)
  }
})
const aiClientService = new AiClientService()
const llamaRuntimeService = LlamaRuntimeInstallService.getInstance()
const ocrRealEvidenceProbeService = createOcrRealEvidenceProbeService()
const latestOnnxModelLoadProbes: Partial<Record<AiRuntimeOnnxModelLoadProbeResponse['modelFamily'], AiRuntimeOnnxModelLoadProbeResponse>> = {}
const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000
const PLATFORM_AI_CAPABILITIES_IPC_DESCRIPTORS: PlatformAiCapabilitiesIpcDescriptor[] = [
  {
    channel: CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
    getCapabilities: () => aiClientService.getMacOSCapabilities()
  },
  {
    channel: CHANNEL_AI_RUNTIME_GET_WINDOWS_CAPABILITIES,
    getCapabilities: () => aiClientService.getWindowsCapabilities()
  }
]
const PYTHON_COMPATIBILITY_STATUS_IPC_DESCRIPTORS: PythonCompatibilityStatusIpcDescriptor[] = [
  {
    channel: CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
    getStatus: () => aiClientService.getPythonMpsStatus()
  },
  {
    channel: CHANNEL_AI_RUNTIME_GET_PYTHON_CUDA_STATUS,
    getStatus: () => aiClientService.getPythonCudaStatus()
  }
]
const PYTHON_EXECUTION_PROBE_IPC_DESCRIPTORS: PythonExecutionProbeIpcDescriptor[] = [
  {
    channel: CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION,
    evidenceLane: 'python_mps',
    probe: () => aiClientService.probePythonMpsExecution()
  },
  {
    channel: CHANNEL_AI_RUNTIME_PROBE_PYTHON_CUDA_EXECUTION,
    evidenceLane: 'python_cuda',
    probe: () => aiClientService.probePythonCudaExecution()
  }
]

export async function shutdownAiRuntimes(): Promise<void> {
  const results = await aiRuntimeManager.stopAllRuntimes()
  const failures = results.filter((result) => !result.success)
  if (failures.length > 0) {
    console.warn(`[ai-runtime] ${failures.length} runtime(s) did not stop cleanly`)
  }
}

function getFreshOnnxModelLoadProbes(): AiRuntimeOnnxModelLoadProbeResponse[] {
  return Object.values(latestOnnxModelLoadProbes).filter((probe): probe is AiRuntimeOnnxModelLoadProbeResponse => {
    const checkedAt = Date.parse(probe.checkedAt)
    return Number.isFinite(checkedAt) && Date.now() - checkedAt <= ONNX_MODEL_LOAD_EVIDENCE_TTL_MS
  })
}

async function collectModelReadinessEvidence() {
  const workerStatus = await aiClientService.getModelsStatus().catch(() => null)
  const llamaStatus = llamaRuntimeService.getStatus()
  return [
    ...createWorkerModelStatusArtifactReadiness(workerStatus),
    ...createLlamaRuntimeStatusArtifactReadiness(llamaStatus),
    ...createLlamaMultimodalProbeArtifactReadiness(getFreshLlamaMultimodalProbe()),
    ...createOcrRealEvidenceArtifactReadiness(getFreshOcrRealEvidence()),
    ...getFreshOnnxModelLoadProbes().flatMap(createOnnxModelLoadProbeArtifactReadiness)
  ]
}

function createPlatformAiBranchStatusIpcHandler(
  descriptor: PlatformAiBranchStatusIpcDescriptor
) {
  return async () => {
    try {
      const modelReadiness = await collectModelReadinessEvidence()
      return success(createPlatformAiBranchStatus({
        platformBranch: descriptor.platformBranch,
        currentPlatform: process.platform as PlatformName,
        runtimes: aiRuntimeManager.listRuntimes(),
        modelReadiness,
        pythonExecutionEvidence: getFreshPythonExecutionEvidence()
      }))
    } catch (err) {
      console.error(`[IPC] ${descriptor.channel} error:`, err)
      return failure(err)
    }
  }
}

function createPlatformAiCapabilitiesIpcHandler(
  descriptor: PlatformAiCapabilitiesIpcDescriptor
) {
  return async () => {
    try {
      return success(await descriptor.getCapabilities())
    } catch (err) {
      console.error(`[IPC] ${descriptor.channel} error:`, err)
      return failure(err)
    }
  }
}

function createPythonCompatibilityStatusIpcHandler(
  descriptor: PythonCompatibilityStatusIpcDescriptor
) {
  return async () => {
    try {
      return success(await descriptor.getStatus())
    } catch (err) {
      console.error(`[IPC] ${descriptor.channel} error:`, err)
      return failure(err)
    }
  }
}

function createPythonExecutionProbeIpcHandler(
  descriptor: PythonExecutionProbeIpcDescriptor
) {
  return async () => {
    try {
      const probe = await descriptor.probe()
      recordPythonExecutionEvidence({ lane: descriptor.evidenceLane, probe })
      return success(probe)
    } catch (err) {
      console.error(`[IPC] ${descriptor.channel} error:`, err)
      return failure(err)
    }
  }
}

export function registerAiRuntimeIpc() {
  ipcMain.handle(CHANNEL_AI_RUNTIME_LIST_RUNTIMES, async () => {
    try {
      return success({ runtimes: aiRuntimeManager.listRuntimes() })
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_LIST_RUNTIMES} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE, async (_, request: AiRuntimeGetStateRequest) => {
    try {
      return success(aiRuntimeManager.getRuntimeState(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME, async () => {
    try {
      return success(aiRuntimeManager.getActiveRuntime())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME} error:`, err)
      return failure(err)
    }
  })

  for (const descriptor of PLATFORM_AI_CAPABILITIES_IPC_DESCRIPTORS) {
    ipcMain.handle(descriptor.channel, createPlatformAiCapabilitiesIpcHandler(descriptor))
  }

  for (const descriptor of PLATFORM_AI_BRANCH_STATUS_IPC_DESCRIPTORS) {
    ipcMain.handle(descriptor.channel, createPlatformAiBranchStatusIpcHandler(descriptor))
  }

  for (const descriptor of PYTHON_COMPATIBILITY_STATUS_IPC_DESCRIPTORS) {
    ipcMain.handle(descriptor.channel, createPythonCompatibilityStatusIpcHandler(descriptor))
  }

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS, async () => {
    try {
      return success(await aiClientService.getClipSiglipOnnxStatus())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD, async (_, request?: AiRuntimeOnnxModelLoadProbeRequest) => {
    try {
      const modelFamily = request?.modelFamily ?? 'wd_tagger'
      const probe = await aiClientService.probeOnnxModelLoad(modelFamily)
      latestOnnxModelLoadProbes[modelFamily] = probe
      return success(probe)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE, async () => {
    try {
      const probe = await ocrRealEvidenceProbeService.probe()
      recordOcrRealEvidence(probe)
      return success(probe)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_PROBE_OCR_REAL_EVIDENCE} error:`, err)
      return failure(err)
    }
  })

  for (const descriptor of PYTHON_EXECUTION_PROBE_IPC_DESCRIPTORS) {
    ipcMain.handle(descriptor.channel, createPythonExecutionProbeIpcHandler(descriptor))
  }

  ipcMain.handle(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, async (_, request: AiRuntimeSelectActiveRequest) => {
    try {
      return success(aiRuntimeManager.selectActiveRuntime(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_START_RUNTIME, async (_, request: AiRuntimeOperationRequest) => {
    try {
      return success(await aiRuntimeManager.startRuntime(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_START_RUNTIME} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_STOP_RUNTIME, async (_, request: AiRuntimeOperationRequest) => {
    try {
      return success(await aiRuntimeManager.stopRuntime(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_STOP_RUNTIME} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, async (_, request: AiRuntimeOperationRequest) => {
    try {
      return success(await aiRuntimeManager.restartRuntime(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_RESTART_RUNTIME} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_HEALTH_CHECK, async (_, request: AiRuntimeHealthCheckRequest) => {
    try {
      return success(await aiRuntimeManager.healthCheck(request.runtimeId))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_HEALTH_CHECK} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL, async () => {
    try {
      return success(await aiRuntimeManager.healthCheckAll())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, async (_, request: AiRuntimeUpdateConfigRequest) => {
    try {
      return success(await aiRuntimeManager.updateRuntimeConfig(request.runtimeId, request.config))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG} error:`, err)
      return failure(err)
    }
  })
}
