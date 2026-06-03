import { spawn } from 'child_process'
import { ensureMacOSAiPythonRuntime } from '../ocr-dependency.service'
import fs from 'fs'
import type { WebContents } from 'electron'
import { getModelLocalPath, getPythonModelCacheEnv, PROMPT_VLM_MODELS } from './ai-model-registry'
import { resolveAiServicePath } from '../ai-service-paths'

export class AiModelDownloadService {
  private static instance: AiModelDownloadService
  private activeDownloads: Map<string, any> = new Map()

  private constructor() {}

  public static getInstance(): AiModelDownloadService {
    if (!AiModelDownloadService.instance) {
      AiModelDownloadService.instance = new AiModelDownloadService()
    }
    return AiModelDownloadService.instance
  }

  public async startDownload(modelId: string, sender: WebContents): Promise<void> {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId)
    if (!model) throw new Error(`Model not found in registry: ${modelId}`)

    if (this.activeDownloads.has(modelId)) {
      console.warn(`[AiModelDownloadService] Download already active for: ${modelId}`)
      return
    }

    const localDir = getModelLocalPath(model)
    const runtime = await ensureMacOSAiPythonRuntime()
    if (!runtime.success) {
      throw new Error(`Managed Python runtime unavailable: ${runtime.error ?? 'unknown'}`)
    }
    const pythonExe = runtime.pythonPath
    const downloadScript = resolveAiServicePath(['tools', 'download_hf_model.py'])

    if (!fs.existsSync(downloadScript)) {
      throw new Error(`Download script not found at: ${downloadScript}`)
    }

    const args = ['--repo-id', model.repoId, '--local-dir', localDir]
    console.log(`[AiModelDownloadService] Launching snapshot download: ${pythonExe} ${downloadScript} ${args.join(' ')}`)

    const child = spawn(pythonExe, [downloadScript, ...args], { shell: false, env: getPythonModelCacheEnv() })
    this.activeDownloads.set(modelId, child)

    child.stdout?.on('data', (chunk) => {
      const chunkStr = chunk.toString()
      
      // Try to parse TQDM percentage progress from stdout
      const match = chunkStr.match(/(\d+)%\|/)
      if (match) {
        const percentage = parseInt(match[1], 10)
        if (!sender.isDestroyed()) {
          sender.send(`ai-model:download-progress:${modelId}`, {
            type: 'progress',
            progress: Math.min(percentage, 99),
            status: `正在下载权重: ${percentage}%`
          })
        }
      }

      const lines = chunkStr.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim())
          if (!sender.isDestroyed()) {
            sender.send(`ai-model:download-progress:${modelId}`, parsed)
          }
        } catch {
          // Standard text logs fallback
          if (!sender.isDestroyed()) {
            sender.send(`ai-model:download-progress:${modelId}`, { type: 'log', message: line })
          }
        }
      }
    })

    child.stderr?.on('data', (chunk) => {
      const chunkStr = chunk.toString()

      // Try to parse TQDM percentage progress from stderr
      const match = chunkStr.match(/(\d+)%\|/)
      if (match) {
        const percentage = parseInt(match[1], 10)
        if (!sender.isDestroyed()) {
          sender.send(`ai-model:download-progress:${modelId}`, {
            type: 'progress',
            progress: Math.min(percentage, 99),
            status: `正在下载权重: ${percentage}%`
          })
        }
      }

      if (!sender.isDestroyed()) {
        sender.send(`ai-model:download-progress:${modelId}`, { type: 'stderr', message: chunkStr })
      }
    })

    child.on('close', (code) => {
      this.activeDownloads.delete(modelId)
      if (!sender.isDestroyed()) {
        sender.send(`ai-model:download-progress:${modelId}`, {
          type: 'exit',
          success: code === 0,
          code
        })
      }
    })
  }

  public cancelDownload(modelId: string): void {
    const child = this.activeDownloads.get(modelId)
    if (child) {
      try {
        child.kill('SIGKILL')
      } catch (err) {
        console.warn(`[AiModelDownloadService] Failed to kill child download subprocess:`, err)
      }
      this.activeDownloads.delete(modelId)
      console.log(`[AiModelDownloadService] Cancelled download for: ${modelId}`)
    }
  }

  public deleteModel(modelId: string): void {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId)
    if (!model) return
    const localDir = getModelLocalPath(model)
    if (fs.existsSync(localDir)) {
      try {
        fs.rmSync(localDir, { recursive: true, force: true })
        console.log(`[AiModelDownloadService] Deleted model folder: ${localDir}`)
      } catch (err) {
        console.error(`[AiModelDownloadService] Failed to delete model folder:`, err)
        throw err
      }
    }
  }
}
