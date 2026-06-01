import { ipcMain } from 'electron'
import {
  CHANNEL_AI_BACKEND_DELETE,
  CHANNEL_AI_BACKEND_HEALTH_CHECK,
  CHANNEL_AI_BACKEND_LIST,
  CHANNEL_AI_BACKEND_LIST_MODELS,
  CHANNEL_AI_BACKEND_SAVE
} from '../../shared/contracts/ai-backend.contract'
import type { AiBackendActionRequest, AiBackendDeleteRequest, AiBackendSaveRequest } from '../../shared/contracts/ai-backend.contract'
import { AiBackendHealthService } from '../services/ai-backends/ai-backend-health.service'
import { AiBackendSettingsService } from '../services/ai-backends/ai-backend-settings.service'

export function registerAiBackendIpc() {
  const settingsService = new AiBackendSettingsService()
  const healthService = new AiBackendHealthService()

  ipcMain.handle(CHANNEL_AI_BACKEND_LIST, async () => {
    return settingsService.listBackends()
  })

  ipcMain.handle(CHANNEL_AI_BACKEND_SAVE, async (_, config: AiBackendSaveRequest) => {
    return settingsService.saveBackend(config)
  })

  ipcMain.handle(CHANNEL_AI_BACKEND_DELETE, async (_, request: AiBackendDeleteRequest) => {
    return settingsService.deleteBackend(request.id)
  })

  ipcMain.handle(CHANNEL_AI_BACKEND_HEALTH_CHECK, async (_, request: AiBackendActionRequest) => {
    const config = request.config ?? settingsService.getBackend(request.backendId)
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        backendType: 'custom',
        error: {
          code: 'BACKEND_NOT_CONFIGURED',
          message: '未找到外部 AI 后端配置。'
        }
      }
    }

    return healthService.healthCheck(config)
  })

  ipcMain.handle(CHANNEL_AI_BACKEND_LIST_MODELS, async (_, request: AiBackendActionRequest) => {
    const config = request.config ?? settingsService.getBackend(request.backendId)
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        models: [],
        error: {
          code: 'BACKEND_NOT_CONFIGURED',
          message: '未找到外部 AI 后端配置。'
        }
      }
    }

    return healthService.listModels(config)
  })
}

