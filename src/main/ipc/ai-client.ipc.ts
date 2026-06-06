import { ipcMain } from 'electron'
import { AiClientService } from '../services/ai-client.service'
import {
  CHANNEL_AI_ANALYSIS_GENERATE,
  CHANNEL_AI_ENQUEUE_TAG,
  CHANNEL_AI_MODEL_STATUS,
  CHANNEL_AI_MODEL_UNLOAD,
  CHANNEL_AI_PROCESS_BATCH,
  CHANNEL_AI_PROMPT_GENERATE,
  CHANNEL_AI_ROUTING_PREVIEW,
  type AnalysisGenerateRequest,
  type AnalysisGenerateResponse,
  type EnqueueTagRequest,
  type EnqueueTagResponse,
  type ModelStatusResponse,
  type ProcessBatchResponse,
  type PromptGenerateRequest,
  type PromptGenerateResponse,
  type RoutingPreviewRequest,
  type RoutingPreviewResponse,
  type UnloadModelResponse
} from '../../shared/contracts/ai-client.contract'

export function registerAiClientIpc() {
  const service = new AiClientService()
  
  // Start the background poller on IPC register
  service.startQueueSync()

  ipcMain.handle(CHANNEL_AI_ENQUEUE_TAG, async (_, request: EnqueueTagRequest): Promise<EnqueueTagResponse> => {
    try {
      return await service.enqueueTagging(
        request.assetId,
        request.filePath,
        request.priority ?? 0,
        request.modelsToRun
      )
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_ENQUEUE_TAG} error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(CHANNEL_AI_PROCESS_BATCH, async (): Promise<ProcessBatchResponse> => {
    try {
      return await service.processBatch()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_PROCESS_BATCH} error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(CHANNEL_AI_MODEL_STATUS, async (): Promise<ModelStatusResponse> => {
    try {
      return await service.getModelsStatus()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_MODEL_STATUS} error:`, err)
      return {
        success: false,
        offline: true,
        loaded_models: {},
        cooperative_models: {},
        gpu_status: {
          available: false,
          device_name: 'Python AI Service Offline',
          error: String(err)
        },
        queue_stats: {
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0
        },
        error: String(err)
      }
    }
  })

  ipcMain.handle(CHANNEL_AI_MODEL_UNLOAD, async (): Promise<UnloadModelResponse> => {
    try {
      return await service.unloadModels()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_MODEL_UNLOAD} error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(CHANNEL_AI_PROMPT_GENERATE, async (_, request: PromptGenerateRequest): Promise<PromptGenerateResponse> => {
    try {
      return await service.generatePrompt(request.assetId, request.filePath)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_PROMPT_GENERATE} error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(CHANNEL_AI_ANALYSIS_GENERATE, async (_, request: AnalysisGenerateRequest): Promise<AnalysisGenerateResponse> => {
    try {
      return await service.generateAnalysis(request.assetId, request.filePath)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_ANALYSIS_GENERATE} error:`, err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(CHANNEL_AI_ROUTING_PREVIEW, async (_, request: RoutingPreviewRequest): Promise<RoutingPreviewResponse> => {
    try {
      return await service.getRoutingPreview(request.filePath)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_ROUTING_PREVIEW} error:`, err)
      return { success: false, error: String(err) }
    }
  })
}
