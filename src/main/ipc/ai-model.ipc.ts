import { ipcMain } from 'electron'
import { AiModelDownloadService } from '../services/ai-models/ai-model-download.service'
import { PROMPT_VLM_MODELS, getModelLocalPath } from '../services/ai-models/ai-model-registry'
import { resolvePythonExecutable } from '../services/ocr-dependency.service'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { resolveAiServicePath } from '../services/ai-service-paths'

export function registerAiModelIpc() {
  const service = AiModelDownloadService.getInstance()

  ipcMain.handle('ai-model:list', async () => {
    return PROMPT_VLM_MODELS.map((model) => {
      const localPath = getModelLocalPath(model)
      const isDownloaded = fs.existsSync(localPath) && fs.existsSync(path.join(localPath, 'config.json'))
      return {
        ...model,
        localPath,
        isDownloaded
      }
    })
  })

  ipcMain.handle('ai-model:download', async (event, { modelId }) => {
    try {
      await service.startDownload(modelId, event.sender)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai-model:cancel-download', async (_, { modelId }) => {
    service.cancelDownload(modelId)
    return { success: true }
  })

  ipcMain.handle('ai-model:delete', async (_, { modelId }) => {
    try {
      service.deleteModel(modelId)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai-model:verify-compatibility', async (_, { modelId }) => {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId)
    if (!model) {
      return {
        success: false,
        compatible: false,
        error: { code: 'MODEL_NOT_FOUND', message: `未找到模型注册配置: ${modelId}` }
      }
    }
    const localPath = getModelLocalPath(model)
    const payload = {
      modelPath: localPath,
      modelId: model.id,
      repoId: model.repoId,
      quantization: model.quantization
    }

    const pythonPath = resolvePythonExecutable()
    const scriptPath = resolveAiServicePath(['tools', 'check_qwen3vl_model_compat.py'])

    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      const child = spawn(pythonPath, [scriptPath], { shell: false })

      child.stdin?.write(JSON.stringify(payload) + '\n')
      child.stdin?.end()

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.on('error', (err: any) => {
        resolve({
          success: false,
          compatible: false,
          error: {
            code: 'SUBPROCESS_LAUNCH_FAILED',
            message: `启动兼容性验证脚本失败: ${err.message}`
          }
        })
      })

      child.on('close', (code: number) => {
        let parsedResult: any = null
        try {
          const trimmed = stdout.trim()
          if (trimmed) {
            parsedResult = JSON.parse(trimmed)
          }
        } catch (e: any) {
          // ignore
        }

        if (parsedResult) {
          resolve(parsedResult)
        } else {
          resolve({
            success: false,
            compatible: false,
            error: {
              code: 'JSON_PARSE_FAILED',
              message: `验证程序退出(Exit Code: ${code})，但未能解析其 JSON 输出。`,
              stderr: `stdout: ${stdout}\nstderr: ${stderr}`
            }
          })
        }
      })
    })
  })
}
