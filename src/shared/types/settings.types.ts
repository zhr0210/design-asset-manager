import { ModelCompatibilityStatus } from './ai-model.types';
import type { AiBackendConfig, AiPromptReverseSettings } from './ai-backend.types';

/**
 * ⚙️ 共享设置类型模型定义 (Shared App Settings Types)
 */

export interface AiMemoryPolicy {
  clearGpuBeforePromptReverse: 'always' | 'auto' | 'never';
  forceClearWhenInsufficient: boolean;
  minFreeVramGBBeforeQwen8B: number;
  maxGpuMemoryUsagePercent: number;
  enableGpuMemoryGuard: boolean;
  enableGpuMemoryPollingDuringInference: boolean;
  gpuMemoryPollIntervalMs: number;
}

export interface AiPromptTemplate {
  id: string;
  name: string;
  content: string;
  language: 'zh-CN' | 'en' | 'mixed' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  libraryPath: string
  concurrency: number
  delayInterval: number
  saveOriginalUrl: boolean
  autoThumbnail: boolean
  
  // Model Compatibility Cache
  modelCompatStatuses?: Record<string, ModelCompatibilityStatus>;
  
  // 色彩提取与文字前景提取高级设置
  enableTextColorPalette: boolean
  textDetectionProvider: 'paddleocr_detection' | 'rapidocr_detection' | 'qwen_vl_text_blocks' | 'mock_text_boxes' | 'none'
  textDetectionTimeoutMs: number
  maxTextBoxes: number
  minTextBoxConfidence: number

  // OCR Enhancements R3
  enableTextColorAnalysis: boolean
  textBoxProvider: 'none' | 'easyocr' | 'rapidocr' | 'mock'
  ocrTimeoutMs: number
  maxTextBoxesPerImage: number
  autoInstallAllowed?: boolean
  lastOcrEnvCheckAt?: string
  cachedOcrEnvStatus?: any

  // Qwen3-VL & AI settings
  modelRootDir?: string
  selectedPromptModelId?: string | null
  selectedPromptModelPath?: string | null
  qwen3vlMaxNewTokens?: number
  qwen3vlMaxImageSize?: number
  qwen3vlTemperature?: number
  qwen3vlTopP?: number
  memoryPolicy?: AiMemoryPolicy
  aiBackends?: AiBackendConfig[]
  promptReverseSettings?: AiPromptReverseSettings
  promptReverseTemplates?: AiPromptTemplate[]

  // --------------------------------------------------------------------------
  // ⚠️ Legacy 别名支持 (下划线拼写)
  // 说明: 以下 snake_case 字段仅用于向后兼容旧版持久化 settings.json 数据
  // 或作为跨语言交互中的 JSON Payload 支持。新开发的前端及主进程业务代码
  // 应 100% 优先使用上面的 camelCase 标准驼峰命名字段。
  // --------------------------------------------------------------------------
  /**
   * @deprecated Legacy field. Only used for backward compatibility with settings.json or cross-language payload.
   * For new code, always prioritize camelCase `enableTextColorPalette`.
   */
  enable_text_color_palette?: boolean

  /**
   * @deprecated Legacy field. Only used for backward compatibility with settings.json or cross-language payload.
   * For new code, always prioritize camelCase `textDetectionProvider`.
   */
  text_detection_provider?: 'paddleocr_detection' | 'rapidocr_detection' | 'qwen_vl_text_blocks' | 'mock_text_boxes' | 'none'

  /**
   * @deprecated Legacy field. Only used for backward compatibility with settings.json or cross-language payload.
   * For new code, always prioritize camelCase `textDetectionTimeoutMs`.
   */
  text_detection_timeout_ms?: number

  /**
   * @deprecated Legacy field. Only used for backward compatibility with settings.json or cross-language payload.
   * For new code, always prioritize camelCase `maxTextBoxes`.
   */
  max_text_boxes?: number

  /**
   * @deprecated Legacy field. Only used for backward compatibility with settings.json or cross-language payload.
   * For new code, always prioritize camelCase `minTextBoxConfidence`.
   */
  min_text_box_confidence?: number
}
