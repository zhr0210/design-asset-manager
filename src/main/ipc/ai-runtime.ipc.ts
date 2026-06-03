import { ipcMain } from 'electron'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES,
  CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
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
import { AiClientService } from '../services/ai-client.service'
import { AiRuntimeManager } from '../services/ai-runtime/ai-runtime-manager'
import { DisabledAiRuntimeProvider } from '../services/ai-runtime/providers/disabled-ai-runtime.provider'
import { PythonWorkerRuntimeProvider } from '../services/ai-runtime/providers/python-worker-runtime.provider'
import { createDefaultPythonWorkerRuntimeConfig } from '../services/ai-runtime/providers/python-worker-runtime-presets'
import { resolveAiServicePath, resolveAiServiceRoot } from '../services/ai-service-paths'
import { resolvePythonExecutable } from '../services/ai-python-runtime.service'

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
        DESIGN_ASSET_MANAGER_STRICT_REAL_AI: '1'
      }
    })
  ))

  manager.selectActiveRuntime('disabled-runtime')
  return manager
}

const aiRuntimeManager = createSafeAiRuntimeManager()
const aiClientService = new AiClientService()

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
