import { ipcMain } from 'electron'
import {
  CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK,
  CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL,
  CHANNEL_AI_RUNTIME_LIST_RUNTIMES,
  CHANNEL_AI_RUNTIME_RESTART_RUNTIME,
  CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME,
  CHANNEL_AI_RUNTIME_START_RUNTIME,
  CHANNEL_AI_RUNTIME_STOP_RUNTIME,
  CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG
} from '../../shared/contracts/ai-runtime.contract'
import type {
  AiRuntimeGetStateRequest,
  AiRuntimeHealthCheckRequest,
  AiRuntimeIpcResponse,
  AiRuntimeOperationRequest,
  AiRuntimeSelectActiveRequest,
  AiRuntimeUpdateConfigRequest
} from '../../shared/contracts/ai-runtime.contract'
import { AiRuntimeManager } from '../services/ai-runtime/ai-runtime-manager'
import { DisabledAiRuntimeProvider } from '../services/ai-runtime/providers/disabled-ai-runtime.provider'
import { ExternalHttpRuntimeProvider } from '../services/ai-runtime/providers/external-http-runtime.provider'
import { createCustomHttpRuntimeConfig } from '../services/ai-runtime/providers/external-http-runtime-presets'
import { MockAiRuntimeProvider } from '../services/ai-runtime/providers/mock-ai-runtime.provider'
import { PythonWorkerRuntimeProvider } from '../services/ai-runtime/providers/python-worker-runtime.provider'
import { createDefaultPythonWorkerRuntimeConfig } from '../services/ai-runtime/providers/python-worker-runtime-presets'
import { MockAiRuntimeHttpClient } from '../services/ai-runtime/http/mock-ai-runtime-http-client'
import { MockAiRuntimeProcessRunner } from '../services/ai-runtime/process/mock-ai-runtime-process-runner'

function success<T>(data: T): AiRuntimeIpcResponse<T> {
  return { success: true, data }
}

function failure(error: unknown): AiRuntimeIpcResponse<never> {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  }
}

function createSafeAiRuntimeManager(): AiRuntimeManager {
  const manager = new AiRuntimeManager()

  manager.registerProvider(new DisabledAiRuntimeProvider({ id: 'disabled-runtime' }))
  manager.registerProvider(new MockAiRuntimeProvider({ id: 'mock-runtime' }))
  manager.registerProvider(new ExternalHttpRuntimeProvider(
    createCustomHttpRuntimeConfig({
      runtimeId: 'mock-external-http-runtime',
      displayName: 'Mock External HTTP Runtime',
      baseUrl: null
    }),
    new MockAiRuntimeHttpClient()
  ))
  manager.registerProvider(new PythonWorkerRuntimeProvider(
    createDefaultPythonWorkerRuntimeConfig({
      runtimeId: 'mock-python-worker-runtime',
      displayName: 'Mock Python Worker Runtime',
      pythonPath: 'mock-python',
      scriptPath: 'mock-ai-worker.py',
      workingDirectory: 'mock-ai-service'
    }),
    new MockAiRuntimeProcessRunner()
  ))

  manager.selectActiveRuntime('disabled-runtime')
  return manager
}

const aiRuntimeManager = createSafeAiRuntimeManager()

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
