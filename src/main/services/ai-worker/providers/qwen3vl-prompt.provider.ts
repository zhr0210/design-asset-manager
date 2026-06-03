import { spawn } from 'child_process'
import fs from 'fs'
import type { AiProvider, AiMemoryEstimate, AiWorkerContext } from '../ai-provider.interface'
import type { PromptReverseResult } from '../../../../shared/types/prompt.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../../../shared/constants/prompt-templates.constants'

import { getPythonModelCacheEnv, PROMPT_VLM_MODELS } from '../../ai-models/ai-model-registry'
import { resolveAiServicePath } from '../../ai-service-paths'

export class Qwen3vlPromptProvider implements AiProvider<any, PromptReverseResult> {
  public id = 'provider.prompt.qwen3vl'
  public taskType = 'prompt_reverse.qwen3vl'

  public async isAvailable(): Promise<boolean> {
    return true
  }

  public async estimateMemory(input: { modelId: string }): Promise<AiMemoryEstimate> {
    const id = input.modelId.toLowerCase()
    if (id.includes('2b')) {
      return { minFreeVramGB: 4.0, recommendedFreeVramGB: 6.0 }
    } else if (id.includes('4b')) {
      return { minFreeVramGB: 8.0, recommendedFreeVramGB: 10.0 }
    } else if (id.includes('awq-4bit')) {
      return { minFreeVramGB: 7.0, recommendedFreeVramGB: 10.0 }
    } else if (id.includes('awq-8bit')) {
      return { minFreeVramGB: 9.0, recommendedFreeVramGB: 12.0 }
    } else {
      return { minFreeVramGB: 10.0, recommendedFreeVramGB: 14.0 } // 8B Instruct original
    }
  }

  public async execute(
    input: { assetId: string; filePath: string; modelId: string; modelPath: string },
    context: AiWorkerContext
  ): Promise<PromptReverseResult> {
    const workerScript = resolveAiServicePath(['prompt_workers', 'qwen3vl_prompt_worker.py'])
    if (!fs.existsSync(workerScript)) {
      throw new Error(`Worker script not found at ${workerScript}`)
    }

    if (!fs.existsSync(input.modelPath)) {
      throw new Error(`模型物理路径不存在！请在设置的 AI 模型管理中完整下载 Qwen3-VL 模型后再执行。`)
    }

    const modelDef = PROMPT_VLM_MODELS.find(m => m.id === input.modelId)
    const quantization = modelDef?.quantization ?? 'none'
    const runtime = modelDef?.runtime ?? 'transformers'
    const repoId = modelDef?.repoId ?? ''

    return new Promise((resolve, reject) => {
      const payload = {
        imagePath: input.filePath,
        modelPath: input.modelPath,
        modelId: input.modelId,
        repoId,
        quantization,
        runtime,
        mode: 'design_prompt',
        templateId: context.options?.promptTemplateId ?? 'qwen3vl.design_prompt.v1',
        promptTemplateText: context.options?.promptTemplateText,
        options: {
          maxNewTokens: context.options?.maxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          temperature: context.options?.temperature ?? 0.6,
          topP: context.options?.topP ?? 0.9,
          maxImageSize: context.options?.maxImageSize ?? 1024,
          language: 'zh-CN'
        }
      }

      let stdout = ''
      let stderr = ''
      let killed = false

      const child = spawn(context.pythonPath, [workerScript], { shell: false, env: getPythonModelCacheEnv() })

      // Support configurable timeouts via environment or defaults (2 minutes)
      const timeoutMs = context.options?.timeoutMs ?? 180000 // 3 minutes standard Qwen preheat pre-inference latency fallback
      const timeout = setTimeout(() => {
        killed = true
        try { child.kill('SIGKILL') } catch {}
        reject(new Error('Qwen3-VL 推理超时，已强制杀掉后台进程以防止爆显存/挂起。'))
      }, timeoutMs)

      // Feed payload via stdin JSON
      child.stdin?.write(JSON.stringify(payload) + '\n')
      child.stdin?.end()

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timeout)
        reject(err)
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeout)

        // Robustly parse stdout JSON first, as python workers output JSON error payloads and exit with code 1
        let parsedResult: any = null
        try {
          const trimmed = stdout.trim()
          if (trimmed) {
            parsedResult = JSON.parse(trimmed)
          }
        } catch (e) {
          // Ignore, will fallback to generic code check
        }

        if (parsedResult && parsedResult.success === false && parsedResult.error) {
          // Keep stdout error structures intact but attach stderr for deep console inspection
          if (!parsedResult.error.stderr) {
            parsedResult.error.stderr = stderr
          }
          resolve(parsedResult)
          return
        }

        if (code !== 0) {
          // Detect CUDA OOM from stderr
          if (stderr.includes('OutOfMemoryError') || stderr.includes('CUDA out of memory')) {
            resolve({
              success: false,
              provider: 'prompt.qwen3vl',
              modelId: input.modelId,
              device: 'cuda',
              durationMs: 0,
              data: null,
              error: {
                code: 'CUDA_OUT_OF_MEMORY',
                message: 'CUDA 显存不足 (Out of Memory)！建议在 AI 设置中调低最大图像尺寸，或将模型切换为低显存需求的 Qwen3-VL 4B / 2B Instruct。',
                stderr
              }
            })
            return
          }

          resolve({
            success: false,
            provider: 'prompt.qwen3vl',
            modelId: input.modelId,
            device: 'unknown',
            durationMs: 0,
            data: null,
            error: {
              code: 'QWEN3VL_PROMPT_FAILED',
              message: `子进程执行失败 (Exit Code: ${code})。请确认 Python 依赖完整。`,
              stderr
            }
          })
          return
        }

        if (parsedResult) {
          resolve(parsedResult)
        } else {
          resolve({
            success: false,
            provider: 'prompt.qwen3vl',
            modelId: input.modelId,
            device: 'unknown',
            durationMs: 0,
            data: null,
            error: {
              code: 'JSON_PARSE_FAILED',
              message: `无法解析 Python 输出的 JSON 结果。`,
              stderr: `stdout: ${stdout}\nstderr: ${stderr}`
            }
          })
        }
      })
    })
  }
}
