import { ipcMain } from 'electron'
import { AiWorkerManager } from '../services/ai-worker/ai-worker-manager'
import { Qwen3vlPromptProvider } from '../services/ai-worker/providers/qwen3vl-prompt.provider'
import { getDatabase } from '../db'

export function registerAiWorkerIpc() {
  const manager = AiWorkerManager.getInstance()
  
  // Register the Qwen3-VL provider on initialization
  manager.registerProvider(new Qwen3vlPromptProvider())

  ipcMain.handle('ai-worker:run-prompt-reverse', async (_, { assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText }) => {
    try {
      const result = await manager.runPromptReverse({ assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText })
      
      // Save result prompt JSON in assets table
      if (result.success && result.data) {
        const db = getDatabase()
        const now = new Date().toISOString()
        
        db.transaction(() => {
          db.prepare(`
            UPDATE assets 
            SET ai_prompt_status = 'synced', ai_prompt = ?
            WHERE id = ?
          `).run(JSON.stringify(result.data), assetId)
          
          // Log in ai_prompt_tasks
          const taskId = `prompt-task-${Math.random().toString(36).substr(2, 9)}`
          db.prepare(`
            INSERT INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, result_prompt, result_caption, created_at, synced_at, sync_status)
            VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, 'synced')
          `).run(taskId, assetId, filePath, modelId, JSON.stringify(result.data), result.data.shortCaption || '', now, now)
        })()
      }
      return result
    } catch (err: any) {
      console.error('[IPC] ai-worker:run-prompt-reverse failed:', err)
      return { 
        success: false, 
        provider: 'prompt.qwen3vl',
        modelId,
        device: 'unknown',
        durationMs: 0,
        data: null,
        error: {
          code: err.code || 'UNKNOWN_ERROR',
          message: err.message || String(err)
        } 
      }
    }
  })

  ipcMain.handle('ai-worker:get-gpu-status', async () => {
    try {
      return await manager.getGpuMonitor().getGpuStatus()
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai-worker:clear-gpu-memory', async () => {
    try {
      // Force kill Llama background process to release its GGUF GPU memory
      try {
        const { LlamaRuntimeInstallService } = await import('../services/llama-runtime/llama-runtime-install.service')
        LlamaRuntimeInstallService.getInstance().stopServer()
      } catch (e) {
        // ignore
      }
      
      return await manager.getMemoryGuard().clearGpuMemory('User manual trigger')
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })
}
