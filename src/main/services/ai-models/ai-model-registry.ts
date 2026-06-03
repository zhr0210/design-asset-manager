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
  },

  // ============================================================
  // Qwen3-VL GGUF 量化版本 (llama.cpp 运行时)
  // ============================================================
  // 2B GGUF variants
  {
    id: 'qwen3-vl-2b-instruct-q4-k-m',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-2B-Instruct-GGUF',
    displayName: 'Qwen3-VL 2B Q4_K_M (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '2B',
    quantization: 'q4_k_m',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 6,
    minVramGB: 4,
    estimatedMinFreeVramGB: 4,
    estimatedRecommendedFreeVramGB: 6,
    quality: 'basic',
    sizeLevel: 'small',
    stability: 'stable',
    officialReleaseDate: '2025-09-22',
    description: 'Qwen3-VL 2B Q4_K_M 量化，最低显存需求，速度最快，适合轻量视觉反推场景。',
    ggufFilename: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-2B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-2B-Instruct-GGUF',
    estimatedSizeGB: 1.5
  },
  {
    id: 'qwen3-vl-2b-instruct-q8-0',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-2B-Instruct-GGUF',
    displayName: 'Qwen3-VL 2B Q8_0 (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '2B',
    quantization: 'q8_0',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 8,
    minVramGB: 6,
    estimatedMinFreeVramGB: 5,
    estimatedRecommendedFreeVramGB: 8,
    quality: 'basic',
    sizeLevel: 'small',
    stability: 'stable',
    officialReleaseDate: '2025-09-22',
    description: 'Qwen3-VL 2B Q8_0 量化，近乎无损精度，轻度显存占用。',
    ggufFilename: 'Qwen3VL-2B-Instruct-Q8_0.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-2B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-2B-Instruct-GGUF',
    estimatedSizeGB: 2.2
  },
  // 4B GGUF variants
  {
    id: 'qwen3-vl-4b-instruct-q4-k-m',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-4B-Instruct-GGUF',
    displayName: 'Qwen3-VL 4B Q4_K_M (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '4B',
    quantization: 'q4_k_m',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 8,
    minVramGB: 6,
    estimatedMinFreeVramGB: 6,
    estimatedRecommendedFreeVramGB: 8,
    quality: 'recommended',
    sizeLevel: 'medium',
    stability: 'stable',
    officialReleaseDate: '2025-10-14',
    description: 'Qwen3-VL 4B Q4_K_M 量化，平衡质量与速度，推荐大多数本地用户使用。',
    ggufFilename: 'Qwen3VL-4B-Instruct-Q4_K_M.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-4B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-4B-Instruct-GGUF',
    estimatedSizeGB: 3.2
  },
  {
    id: 'qwen3-vl-4b-instruct-q8-0',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-4B-Instruct-GGUF',
    displayName: 'Qwen3-VL 4B Q8_0 (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '4B',
    quantization: 'q8_0',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 10,
    minVramGB: 8,
    estimatedMinFreeVramGB: 8,
    estimatedRecommendedFreeVramGB: 10,
    quality: 'high',
    sizeLevel: 'medium',
    stability: 'stable',
    officialReleaseDate: '2025-10-14',
    description: 'Qwen3-VL 4B Q8_0 量化，近乎原始精度，指令理解更准确。',
    ggufFilename: 'Qwen3VL-4B-Instruct-Q8_0.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-4B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-4B-Instruct-GGUF',
    estimatedSizeGB: 5.1
  },
  // 8B GGUF variants
  {
    id: 'qwen3-vl-8b-instruct-q4-k-m',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    displayName: 'Qwen3-VL 8B Q4_K_M (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '8B',
    quantization: 'q4_k_m',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 12,
    minVramGB: 10,
    estimatedMinFreeVramGB: 10,
    estimatedRecommendedFreeVramGB: 12,
    quality: 'high-memory-saving',
    sizeLevel: 'large-quantized',
    stability: 'gpu-sensitive',
    officialReleaseDate: '2025-10-14',
    description: 'Qwen3-VL 8B Q4_K_M 量化，大幅节省显存，12GB 显存可流畅运行。',
    ggufFilename: 'Qwen3VL-8B-Instruct-Q4_K_M.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-8B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    estimatedSizeGB: 6.2
  },
  {
    id: 'qwen3-vl-8b-instruct-q8-0',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    displayName: 'Qwen3-VL 8B Q8_0 (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '8B',
    quantization: 'q8_0',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 16,
    minVramGB: 14,
    estimatedMinFreeVramGB: 14,
    estimatedRecommendedFreeVramGB: 16,
    quality: 'high-balanced',
    sizeLevel: 'large-quantized',
    stability: 'gpu-sensitive',
    officialReleaseDate: '2025-10-14',
    description: 'Qwen3-VL 8B Q8_0 量化，接近原始精度的高质量视觉反推，16GB 显存推荐。',
    ggufFilename: 'Qwen3VL-8B-Instruct-Q8_0.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-8B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    estimatedSizeGB: 9.6
  },
  {
    id: 'qwen3-vl-8b-instruct-f16',
    provider: 'qwen',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    displayName: 'Qwen3-VL 8B F16 (GGUF)',
    task: 'prompt_reverse',
    modelFamily: 'qwen3-vl',
    modelSize: '8B',
    quantization: 'f16',
    runtime: 'gguf-llama-cpp',
    recommendedVramGB: 24,
    minVramGB: 18,
    estimatedMinFreeVramGB: 18,
    estimatedRecommendedFreeVramGB: 24,
    quality: 'high',
    sizeLevel: 'large',
    stability: 'gpu-sensitive',
    officialReleaseDate: '2025-10-14',
    description: 'Qwen3-VL 8B F16 原始精度，最高质量视觉理解。需要 24GB 显存，适合专业场景。',
    ggufFilename: 'Qwen3VL-8B-Instruct-F16.gguf',
    mmprojFilename: 'mmproj-Qwen3VL-8B-Instruct-F16.gguf',
    ggufRepoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    estimatedSizeGB: 17.4
  },

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
