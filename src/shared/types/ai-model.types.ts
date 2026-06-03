export type AiModelQuantization =
  | 'none'
  | 'awq-4bit'
  | 'awq-8bit'
  | 'fp8'
  | 'q4_k_m'
  | 'q8_0'
  | 'f16'
  | 'unknown';

export type AiModelRuntime =
  | 'transformers'
  | 'transformers-compatible-check-required'
  | 'gguf-llama-cpp'
  | 'unsupported-on-this-platform';

export type AiModelCapability =
  | 'prompt_reverse'
  | 'ocr'
  | 'tagging';

export type ModelCompatibilityStatus =
  | 'unknown'
  | 'compatible'
  | 'incompatible'
  | 'check_required'
  | 'checking'
  | 'failed';

export interface PromptVlmModel {
  id: string;
  provider: string;
  repoId: string;
  displayName: string;
  task: AiModelCapability | string;
  recommendedVramGB: number;
  minVramGB: number;
  quality: 'basic' | 'recommended' | 'high' | 'high-memory-saving' | 'high-balanced' | string;
  sizeLevel: 'small' | 'medium' | 'large' | 'large-quantized' | string;
  description: string;
  officialReleaseDate?: string;
  localPath?: string;
  isDownloaded?: boolean;
  
  // New configuration properties
  modelFamily: 'qwen3-vl' | string;
  modelSize: '2B' | '4B' | '8B' | string;
  quantization: AiModelQuantization;
  runtime: AiModelRuntime;
  stability: 'stable' | 'gpu-sensitive' | 'experimental' | string;
  
  estimatedMinFreeVramGB?: number;
  estimatedRecommendedFreeVramGB?: number;
  
  // GGUF-specific fields
  ggufFilename?: string;
  mmprojFilename?: string;
  ggufRepoId?: string;
  estimatedSizeGB?: number;
}

export interface ModelDownloadProgress {
  type: 'start' | 'progress' | 'log' | 'stderr' | 'complete' | 'error' | 'exit';
  success?: boolean;
  repoId?: string;
  localDir?: string;
  localPath?: string;
  progress?: number;
  message?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
  code?: number;
}
