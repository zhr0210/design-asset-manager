import path from 'path'
import os from 'os'
import { ipcMain } from 'electron'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD,
  CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_START_RUNTIME,
  CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG
} from '../../shared/contracts/ai-runtime.contract'
import { createMacOSAiBranchRuntimeMetadata } from '../../shared/constants/macos-ai-runtime.constants'
import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type {
  AiRuntimeGetStateRequest,
  AiRuntimeHealthCheckRequest,
  AiRuntimeIpcResponse,
  AiRuntimeOperationRequest,
  AiRuntimeSelectActiveRequest,
  AiRuntimeUpdateConfigRequest
} from '../../shared/contracts/ai-runtime.contract'
import type { AiRuntimeOnnxModelLoadProbeResponse } from '../../shared/contracts/ai-runtime.contract'
import { AiClientService } from '../services/ai-client.service'
import { AiRuntimeManager } from '../services/ai-runtime/ai-runtime-manager'
import { DisabledAiRuntimeProvider } from '../services/ai-runtime/providers/disabled-ai-runtime.provider'
import { PythonWorkerRuntimeProvider } from '../services/ai-runtime/providers/python-worker-runtime.provider'
import { createDefaultPythonWorkerRuntimeConfig } from '../services/ai-runtime/providers/python-worker-runtime-presets'
import { resolveAiServicePath, resolveAiServiceRoot } from '../services/ai-service-paths'
import { resolvePythonExecutable } from '../services/ai-python-runtime.service'
import { createPlatformAiBranchStatus } from '../services/ai-runtime/platform-ai-branch-status.projector'
import {
  createLlamaRuntimeStatusArtifactReadiness,
  createOnnxModelLoadProbeArtifactReadiness,
  createWorkerModelStatusArtifactReadiness
} from '../services/ai-runtime/model-artifact-readiness.mapper'
import { LlamaRuntimeInstallService } from '../services/llama-runtime/llama-runtime-install.service'

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

function createSafeAiRuntimeManager(): AiRuntimeManager {
  const manager = new AiRuntimeManager()
  const currentPlatform = process.platform as PlatformName
  const currentArch = process.arch as PlatformArch
  const macosAiBranchMetadata = createMacOSAiBranchRuntimeMetadata(currentPlatform, currentArch)

  manager.registerProvider(new DisabledAiRuntimeProvider({ id: 'disabled-runtime' }))
  manager.registerProvider(new DisabledAiRuntimeProvider({
    id: 'macos-ai-branch-runtime',
    displayName: 'macOS AI Branch Runtime',
    platform: 'darwin',
    profileId: currentPlatform === 'darwin' ? (currentArch === 'arm64' ? 'macos-apple-silicon' : 'macos-intel') : null,
    metadata: {
      displayName: 'macOS AI Branch',
      macosAiBranch: macosAiBranchMetadata
    }
  }))
  manager.registerProvider(new PythonWorkerRuntimeProvider(
    createDefaultPythonWorkerRuntimeConfig({
      runtimeId: 'python-worker-runtime',
      displayName: 'Python AI Worker Runtime',
      pythonPath: resolveRuntimePythonExecutable(),
      scriptPath: resolveAiServicePath(['app.py']),
      workingDirectory: resolveAiServiceRoot(),
      env: {
        PYTHONUNBUFFERED: '1',
        DESIGN_ASSET_MANAGER_STRICT_REAL_AI: '1',
        HF_HOME: path.join(os.homedir(), 'Library', 'Application Support', 'design-asset-manager', 'runtime', 'huggingface-cache'),
        PADDLE_HOME: path.join(os.homedir(), 'Library', 'Application Support', 'design-asset-manager', 'runtime', 'paddle-cache'),
        PADDLEX_HOME: path.join(os.homedir(), 'Library', 'Application Support', 'design-asset-manager', 'runtime', 'paddlex-cache')
      }
    })
  ))

  // Auto-start Python AI Worker on macOS so capabilities probe works
  const isMacOS = currentPlatform === 'darwin'
  if (isMacOS) {
    manager.selectActiveRuntime('python-worker-runtime')
    // Fire-and-forget start; failure is non-fatal (worker may already be running
    // or managed-venv may need deps installed first).
    manager.startRuntime('python-worker-runtime').catch((err) => {
      console.warn('[ai-runtime] Could not auto-start python-worker-runtime:', err?.message ?? err)
    })
  } else {
    manager.selectActiveRuntime('disabled-runtime')
  }
  return manager
}

const aiRuntimeManager = createSafeAiRuntimeManager()
const aiClientService = new AiClientService()
const llamaRuntimeService = LlamaRuntimeInstallService.getInstance()
let latestOnnxModelLoadProbe: AiRuntimeOnnxModelLoadProbeResponse | null = null
const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000

export async function shutdownAiRuntimes(): Promise<void> {
  const results = await aiRuntimeManager.stopAllRuntimes()
  const failures = results.filter((result) => !result.success)
  if (failures.length > 0) {
    console.warn(`[ai-runtime] ${failures.length} runtime(s) did not stop cleanly`)
  }
}

function getFreshOnnxModelLoadProbe(): AiRuntimeOnnxModelLoadProbeResponse | null {
  if (!latestOnnxModelLoadProbe) return null
  const checkedAt = Date.parse(latestOnnxModelLoadProbe.checkedAt)
  if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > ONNX_MODEL_LOAD_EVIDENCE_TTL_MS) return null
  return latestOnnxModelLoadProbe
}

async function collectModelReadinessEvidence() {
  const workerStatus = await aiClientService.getModelsStatus().catch(() => null)
  const llamaStatus = llamaRuntimeService.getStatus()
  return [
    ...createWorkerModelStatusArtifactReadiness(workerStatus),
    ...createLlamaRuntimeStatusArtifactReadiness(llamaStatus),
    ...createOnnxModelLoadProbeArtifactReadiness(getFreshOnnxModelLoadProbe())
  ]
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

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES, async () => {
    try {
      return success(await aiClientService.getMacOSCapabilities())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS, async () => {
    try {
      const modelReadiness = await collectModelReadinessEvidence()
      return success(createPlatformAiBranchStatus({
        platformBranch: 'macos',
        currentPlatform: process.platform as PlatformName,
        runtimes: aiRuntimeManager.listRuntimes(),
        modelReadiness
      }))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS, async () => {
    try {
      const modelReadiness = await collectModelReadinessEvidence()
      return success(createPlatformAiBranchStatus({
        platformBranch: 'windows',
        currentPlatform: process.platform as PlatformName,
        runtimes: aiRuntimeManager.listRuntimes(),
        modelReadiness
      }))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS, async () => {
    try {
      return success(await aiClientService.getPythonMpsStatus())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS, async () => {
    try {
      return success(await aiClientService.getClipSiglipOnnxStatus())
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD, async () => {
    try {
      latestOnnxModelLoadProbe = await aiClientService.probeOnnxModelLoad()
      return success(latestOnnxModelLoadProbe)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD} error:`, err)
      return failure(err)
    }
  })

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
