import { SettingsService } from '../settings.service'
import { AiGpuMonitorService } from './ai-gpu-monitor.service'
import { AiMemoryGuardService } from './ai-memory-guard.service'
import type { AiProvider } from './ai-provider.interface'
import type { GpuStatus, ClearGpuMemoryResult } from '../../../shared/types/ai-worker.types'
import { resolvePythonExecutable } from '../ocr-dependency.service'
import { PROMPT_VLM_MODELS } from '../ai-models/ai-model-registry'
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider'
import { LlamaOpenAIProvider } from './providers/llama-openai.provider'
import { resolvePromptReverseRoute } from './prompt-reverse-router'
import {
  DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  DEFAULT_PROMPT_TEMPLATE_ID,
  DEFAULT_QWEN3VL_DESIGN_PROMPT,
  RETRY_PROMPT_REVERSE_MAX_TOKENS
} from '../../../shared/constants/prompt-templates.constants'
import { __openAiCompatibleTestUtils } from './providers/openai-compatible.provider'

export const QWEN3VL_MEMORY_REQUIREMENTS: Record<string, { minFreeVramGB: number; recommendedFreeVramGB: number; hardBlockBelowGB: number }> = {
  'qwen3-vl-2b-instruct': {
    minFreeVramGB: 4,
    recommendedFreeVramGB: 6,
    hardBlockBelowGB: 3
  },
  'qwen3-vl-4b-instruct': {
    minFreeVramGB: 8,
    recommendedFreeVramGB: 10,
    hardBlockBelowGB: 6
  },
  'qwen3-vl-8b-instruct': {
    minFreeVramGB: 10,
    recommendedFreeVramGB: 14,
    hardBlockBelowGB: 8
  },
  'qwen3-vl-8b-instruct-awq-4bit': {
    minFreeVramGB: 7,
    recommendedFreeVramGB: 10,
    hardBlockBelowGB: 5
  },
  'qwen3-vl-8b-instruct-awq-8bit': {
    minFreeVramGB: 9,
    recommendedFreeVramGB: 12,
    hardBlockBelowGB: 7
  }
}

function isLikelyTruncatedPromptReverseResult(result: any): boolean {
  const rawResponse = result?.data?.rawResponse
  return typeof rawResponse === 'string' && __openAiCompatibleTestUtils.isLikelyTruncatedPromptReverseText(rawResponse)
}

export class AiWorkerManager {
  private static instance: AiWorkerManager
  private providers: Map<string, AiProvider<any, any>> = new Map()
  private gpuMonitor: AiGpuMonitorService
  private memoryGuard: AiMemoryGuardService
  private openAiProvider = new OpenAICompatibleProvider()
  private llamaProvider = new LlamaOpenAIProvider()
  private isProcessing = false

  private constructor() {
    this.gpuMonitor = new AiGpuMonitorService()
    this.memoryGuard = new AiMemoryGuardService(this.gpuMonitor)
  }

  public static getInstance(): AiWorkerManager {
    if (!AiWorkerManager.instance) {
      AiWorkerManager.instance = new AiWorkerManager()
    }
    return AiWorkerManager.instance
  }

  public registerProvider(provider: AiProvider<any, any>) {
    this.providers.set(provider.id, provider)
    console.log(`[AiWorkerManager] Registered provider: ${provider.id} for task ${provider.taskType}`)
  }

  public getGpuMonitor() {
    return this.gpuMonitor
  }

  public getMemoryGuard() {
    return this.memoryGuard
  }

  public async runPromptReverse(input: { assetId: string; filePath: string; modelId: string; modelPath: string; promptTemplateId?: string; promptTemplateText?: string }): Promise<any> {
    const settings = SettingsService.getInstance().getSettings()
    const promptSettings = settings.promptReverseSettings
    const route = resolvePromptReverseRoute(settings)
    const backendMode = route.mode

    if (backendMode === 'openai-compatible' || backendMode === 'llama-openai') {
      const backend = route.backend
      if (!backend) {
        return {
          success: false,
          provider: backendMode === 'llama-openai' ? 'prompt.llama-openai' : 'prompt.openai-compatible',
          modelId: promptSettings?.selectedExternalModel ?? '',
          device: 'external',
          durationMs: 0,
          data: null,
          error: {
            code: 'BACKEND_NOT_CONFIGURED',
            message: '尚未配置外部 AI 后端。'
          },
          cleared: false
        }
      }

      const provider = backend.type === 'llama-openai' ? this.llamaProvider : this.openAiProvider
      return provider.runPromptReverse(backend, {
        assetId: input.assetId,
        filePath: input.filePath,
        modelId: promptSettings?.selectedExternalModel || backend.defaultModel || input.modelId,
        promptTemplateId: input.promptTemplateId ?? DEFAULT_PROMPT_TEMPLATE_ID,
        promptTemplateText: input.promptTemplateText ?? DEFAULT_QWEN3VL_DESIGN_PROMPT,
        maxImageSize: promptSettings?.maxImageSize ?? 1024,
        temperature: promptSettings?.temperature ?? settings.qwen3vlTemperature ?? 0.6,
        topP: promptSettings?.topP ?? settings.qwen3vlTopP ?? 0.9,
        maxTokens: Math.max(promptSettings?.maxNewTokens ?? settings.qwen3vlMaxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS)
      })
    }

    const provider = this.providers.get('provider.prompt.qwen3vl')
    if (!provider) {
      throw new Error('Qwen3-VL provider is not registered.')
    }
    
    // 1. Compatibility verification gate for quantized runtimes
    const modelDef = PROMPT_VLM_MODELS.find(m => m.id === input.modelId)
    if (modelDef && modelDef.runtime === 'transformers-compatible-check-required') {
      const compatStatus = settings.modelCompatStatuses?.[input.modelId] ?? 'unknown'
      if (compatStatus === 'unknown' || compatStatus === 'check_required' || compatStatus === 'checking') {
        return {
          success: false,
          provider: 'prompt.qwen3vl',
          modelId: input.modelId,
          device: 'cuda',
          durationMs: 0,
          data: null,
          error: {
            code: 'MODEL_COMPAT_NOT_VERIFIED',
            message: `该量化模型首次运行前必须进行兼容性验证！请前往【设置 -> AI模型下载】卡片点击“兼容性验证”。`
          },
          cleared: false
        }
      } else if (compatStatus === 'incompatible' || compatStatus === 'failed') {
        return {
          success: false,
          provider: 'prompt.qwen3vl',
          modelId: input.modelId,
          device: 'cuda',
          durationMs: 0,
          data: null,
          error: {
            code: 'MODEL_COMPAT_CHECK_FAILED',
            message: `当前环境经检测不支持该量化模型，请前往【设置 -> AI模型下载】改用 Qwen3-VL 4B 稳定版或 Qwen3-VL 8B 原版。`
          },
          cleared: false
        }
      }
    }

    // Fallback memory policy if empty
    const policy = settings.memoryPolicy || {
      clearGpuBeforePromptReverse: 'auto',
      forceClearWhenInsufficient: true,
      minFreeVramGBBeforeQwen8B: 10,
      maxGpuMemoryUsagePercent: 92,
      enableGpuMemoryGuard: true,
      enableGpuMemoryPollingDuringInference: true,
      gpuMemoryPollIntervalMs: 1000
    }

    // 2. Get memory requirement estimates and hard block threshold
    const req = provider.estimateMemory 
      ? await provider.estimateMemory(input) 
      : { minFreeVramGB: 10.0, recommendedFreeVramGB: 14.0 }

    const memLimit = QWEN3VL_MEMORY_REQUIREMENTS[input.modelId] || {
      minFreeVramGB: req.minFreeVramGB,
      recommendedFreeVramGB: req.recommendedFreeVramGB,
      hardBlockBelowGB: 8
    }

    // 3. Perform memory guard pre-inference checks
    let status = await this.gpuMonitor.getGpuStatus()
    let cleared = false

    if (status.cudaAvailable) {
      const clearAlways = policy.clearGpuBeforePromptReverse === 'always'
      const clearAuto = policy.clearGpuBeforePromptReverse === 'auto' && status.freeVramGB < memLimit.recommendedFreeVramGB
      const clearNeverButNeeded = policy.clearGpuBeforePromptReverse === 'never' && status.freeVramGB < memLimit.minFreeVramGB && policy.forceClearWhenInsufficient

      if (clearAlways || clearAuto || clearNeverButNeeded) {
        console.log(`[AiWorkerManager] GPU VRAM guard triggered clear (Policy strategy: ${policy.clearGpuBeforePromptReverse})`)
        const clearRes = await this.memoryGuard.clearGpuMemory(`Policy strategy: ${policy.clearGpuBeforePromptReverse}`)
        cleared = clearRes.success
        status = await this.gpuMonitor.getGpuStatus() // Query updated stats post-clear
      }

      // Hard stop/prevent inference if VRAM is still critically below the hard block threshold
      if (status.freeVramGB < memLimit.hardBlockBelowGB || status.usagePercent > policy.maxGpuMemoryUsagePercent) {
        return {
          success: false,
          provider: 'prompt.qwen3vl',
          modelId: input.modelId,
          device: 'cuda',
          durationMs: 0,
          data: null,
          error: {
            code: 'GPU_MEMORY_INSUFFICIENT',
            message: `系统可用显存不足！执行该模型至少需要 ${memLimit.hardBlockBelowGB}GB 的剩余显存，当前仅有 ${status.freeVramGB.toFixed(1)}GB (使用率 ${status.usagePercent}%)。请关闭其他占用显存的任务，或改用 Qwen3-VL 4B / 2B 稳定版本。`
          },
          cleared
        }
      }
    }

    // 3. Execute prompt reverse in subprocess
    this.isProcessing = true
    try {
      const initialMaxNewTokens = Math.max(promptSettings?.maxNewTokens ?? settings.qwen3vlMaxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS)
      const retryMaxNewTokens = Math.max(RETRY_PROMPT_REVERSE_MAX_TOKENS, initialMaxNewTokens * 2)
      const executeWithTokens = (maxNewTokens: number) => provider.execute(input, {
        pythonPath: resolvePythonExecutable(),
        options: {
          maxNewTokens,
          maxImageSize: settings.qwen3vlMaxImageSize ?? 1024,
          temperature: settings.qwen3vlTemperature ?? 0.6,
          topP: settings.qwen3vlTopP ?? 0.9,
          promptTemplateId: input.promptTemplateId ?? DEFAULT_PROMPT_TEMPLATE_ID,
          promptTemplateText: input.promptTemplateText ?? DEFAULT_QWEN3VL_DESIGN_PROMPT,
          timeoutMs: 180000 // 3 minutes maximum
        }
      })

      const result = await executeWithTokens(initialMaxNewTokens)
      if (isLikelyTruncatedPromptReverseResult(result)) {
        const retry = await executeWithTokens(retryMaxNewTokens)
        return { ...retry, cleared }
      }

      return { ...result, cleared }
    } finally {
      this.isProcessing = false
    }
  }
}
