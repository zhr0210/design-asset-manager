import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { COOPERATIVE_MODELS, getCooperativeModelLocalPath } from '../services/ai-models/cooperative-model-registry'
import { ensureMacOSAiPythonRuntime } from '../services/ocr-dependency.service'
import { resolveAiServicePath } from '../services/ai-service-paths'
import { getPythonModelCacheEnv } from '../services/ai-models/ai-model-registry'

export function registerCooperativeModelIpc() {
  const activeDownloads = new Map<string, ReturnType<typeof spawn>>()

  ipcMain.handle('cooperative-model:list', async () => {
    return {
      success: true,
      models: COOPERATIVE_MODELS.map((model) => {
        const localPath = getCooperativeModelLocalPath(model)
        let isDownloaded = false
        try {
          isDownloaded = fs.existsSync(localPath) && fs.readdirSync(localPath).length > 0
        } catch { /* ignore */ }
        return { ...model, localPath, isDownloaded }
      })
    }
  })

  ipcMain.handle('cooperative-model:download', async (event, { modelId }: { modelId: string }) => {
    const model = COOPERATIVE_MODELS.find((m) => m.id === modelId)
    if (!model) return { success: false, error: `Model not found: ${modelId}` }

    const localDir = getCooperativeModelLocalPath(model)
    const runtime = await ensureMacOSAiPythonRuntime()
    if (!runtime.success) {
      return { success: false, error: `Managed Python runtime unavailable: ${runtime.error ?? 'unknown'}` }
    }
    const pythonExe = runtime.pythonPath
    const downloadScript = resolveAiServicePath(['tools', 'download_cooperative_hf_model.py'])

    if (!fs.existsSync(downloadScript)) {
      return { success: false, error: `Download script not found: ${downloadScript}` }
    }

    if (activeDownloads.has(modelId)) return { success: false, error: 'Download already in progress' }

    const args = ['--repo-id', model.repoId, '--local-dir', localDir, '--category', model.category]
    const child = spawn(pythonExe, [downloadScript, ...args], {
      shell: false,
      env: getPythonModelCacheEnv()
    })
    activeDownloads.set(modelId, child)

    const sender = event.sender
    const channel = `cooperative-model:download-progress:${modelId}`

    child.stdout?.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim())
          parsed.modelId = modelId
          if (!sender.isDestroyed()) sender.send(channel, parsed)
        } catch {
          if (!sender.isDestroyed()) sender.send(channel, { type: 'log', message: line, modelId })
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      if (!sender.isDestroyed()) {
        sender.send(channel, { type: 'stderr', message: chunk.toString(), modelId })
      }
    })

    child.on('close', (code: number | null) => {
      activeDownloads.delete(modelId)
      if (!sender.isDestroyed()) {
        sender.send(channel, { type: 'exit', success: code === 0, code, modelId })
      }
    })

    child.on('error', (err: Error) => {
      activeDownloads.delete(modelId)
      if (!sender.isDestroyed()) {
        sender.send(channel, {
          type: 'error',
          success: false,
          modelId,
          error: { code: 'SUBPROCESS_FAILED', message: err.message }
        })
      }
    })

    return { success: true }
  })

  ipcMain.handle('cooperative-model:cancel-download', async (_, { modelId }: { modelId: string }) => {
    const child = activeDownloads.get(modelId)
    if (child) {
      try { child.kill('SIGKILL') } catch { /* ignore */ }
      activeDownloads.delete(modelId)
    }
    return { success: true }
  })

  ipcMain.handle('cooperative-model:delete', async (_, { modelId }: { modelId: string }) => {
    const model = COOPERATIVE_MODELS.find((m) => m.id === modelId)
    if (!model) return { success: false, error: `Model not found: ${modelId}` }
    const localDir = getCooperativeModelLocalPath(model)
    if (fs.existsSync(localDir)) {
      try {
        fs.rmSync(localDir, { recursive: true, force: true })
      } catch (err: any) {
        return { success: false, error: String(err) }
      }
    }
    return { success: true }
  })
}
