import { ipcMain } from 'electron'
import { AiClientService } from '../services/ai-client.service'

export function registerAiClientIpc() {
  const service = new AiClientService()
  
  // Start the background poller on IPC register
  service.startQueueSync()

  ipcMain.handle('ai:enqueue-tag', async (_, { assetId, filePath, priority, modelsToRun }: { assetId: string; filePath: string; priority?: number; modelsToRun?: string[] }) => {
    try {
      return await service.enqueueTagging(assetId, filePath, priority || 0, modelsToRun)
    } catch (err) {
      console.error('[IPC] ai:enqueue-tag error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:process-batch', async () => {
    try {
      return await service.processBatch()
    } catch (err) {
      console.error('[IPC] ai:process-batch error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:model-status', async () => {
    try {
      return await service.getModelsStatus()
    } catch (err) {
      console.error('[IPC] ai:model-status error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:model-unload', async () => {
    try {
      return await service.unloadModels()
    } catch (err) {
      console.error('[IPC] ai:model-unload error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:prompt-generate', async (_, { assetId, filePath }: { assetId: string; filePath: string }) => {
    try {
      return await service.generatePrompt(assetId, filePath)
    } catch (err) {
      console.error('[IPC] ai:prompt-generate error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:analysis-generate', async (_, { assetId, filePath }: { assetId: string; filePath: string }) => {
    try {
      return await service.generateAnalysis(assetId, filePath)
    } catch (err) {
      console.error('[IPC] ai:analysis-generate error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai:routing-preview', async (_, { filePath }: { filePath: string }) => {
    try {
      return await service.getRoutingPreview(filePath)
    } catch (err) {
      console.error('[IPC] ai:routing-preview error:', err)
      return { success: false, error: String(err) }
    }
  })
}
