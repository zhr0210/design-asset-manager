import path from 'path'
import { app } from 'electron'
import type { PromptVlmModel } from '../../../shared/types/ai-model.types'
import { SettingsService } from '../settings.service'

export const PROMPT_VLM_MODELS: PromptVlmModel[] = [
  {
    id: 'qwen3-vl-2b-instruct',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-2B-Instruct',
    displayName: 'Qwen3-VL 2B Instruct',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '2B',
    quantization: 'none',
    runtime: 'transformers',
    recommendedVramGB: 8,
    minVramGB: 6,
    estimatedMinFreeVramGB: 4,
    estimatedRecommendedFreeVramGB: 6,
    quality: 'basic',
    sizeLevel: 'small',
    stability: 'stable',
    officialReleaseDate: '2025-09-22',
    description: '低显存设备可用，速度极快，反推细节与指令理解较弱。'
  },
  {
    id: 'qwen3-vl-4b-instruct',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-4B-Instruct',
    displayName: 'Qwen3-VL 4B Instruct',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '4B',
    quantization: 'none',
    runtime: 'transformers',
    recommendedVramGB: 12,
    minVramGB: 10,
    estimatedMinFreeVramGB: 8,
    estimatedRecommendedFreeVramGB: 10,
    quality: 'recommended',
    sizeLevel: 'medium',
    stability: 'stable',
    officialReleaseDate: '2025-10-14',
    description: '质量和显存占用较平衡，适合多数本地用户。推荐作为稳定版高级反推模型。'
  },
  {
    id: 'qwen3-vl-8b-instruct',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct',
    displayName: 'Qwen3-VL 8B Instruct 原版',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '8B',
    quantization: 'none',
    runtime: 'transformers',
    recommendedVramGB: 24,
    minVramGB: 16,
    estimatedMinFreeVramGB: 10,
    estimatedRecommendedFreeVramGB: 14,
    quality: 'high',
    sizeLevel: 'large',
    stability: 'gpu-sensitive',
    officialReleaseDate: '2025-10-14',
    description: '高质量反推模型。16GB 显存可尝试，但建议关闭其他 GPU 任务，并启用显存保护。'
  }
]

export function getModelRootDir(): string {
  try {
    const configured = SettingsService.getInstance().getSettings().modelRootDir
    if (configured && configured.trim()) return configured
  } catch {
    // Fallback keeps model lookup available before settings are initialized.
  }
  const appData = app.getPath('userData')
  return path.join(appData, 'AIModels')
}

export function getModelLocalPath(model: PromptVlmModel): string {
  // Normalize directories for OS cross-compatibility and use model.id to ensure no conflicts
  return path.join(getModelRootDir(), model.provider, model.id)
}

export function getPythonModelCacheEnv(): NodeJS.ProcessEnv {
  const root = getModelRootDir()
  return {
    ...process.env,
    HF_HOME: path.join(root, 'huggingface'),
    HUGGINGFACE_HUB_CACHE: path.join(root, 'huggingface', 'hub'),
    TRANSFORMERS_CACHE: path.join(root, 'huggingface', 'transformers'),
    TORCH_HOME: path.join(root, 'torch'),
    EASYOCR_MODULE_PATH: path.join(root, 'easyocr'),
    PADDLEOCR_HOME: path.join(root, 'paddleocr'),
    PADDLE_HOME: path.join(root, 'paddle'),
    PADDLEX_HOME: path.join(root, 'paddlex'),
    XDG_CACHE_HOME: path.join(root, 'cache'),
    DESIGN_ASSET_MANAGER_STRICT_REAL_AI: '1'
  }
}
