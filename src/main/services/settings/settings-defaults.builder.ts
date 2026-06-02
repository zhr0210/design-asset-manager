import path from 'path'
import { homedir } from 'os'
import type { AiBackendConfig, AiPromptReverseSettings } from '../../../shared/types/ai-backend.types'
import type { AppSettings } from '../../../shared/types/settings.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../../shared/constants/prompt-templates.constants'
import { detectPlatform } from '../../platform/platform-detector'
import { resolveManagedPaths } from '../../platform/path-resolver'
import { createCrossPlatformSettingsDefaults } from './settings-cross-platform-defaults'

export function createDefaultLlamaBackendConfig(): AiBackendConfig {
  return {
    id: 'llama-local-openai',
    name: 'Llama local quantized model service',
    type: 'llama-openai',
    enabled: false,
    baseUrl: 'http://127.0.0.1:8080/v1',
    apiKey: 'local',
    defaultModel: '',
    timeoutMs: 120000,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50,
    notes: 'OpenAI-compatible local llama runtime default.'
  }
}

export function createDefaultPromptReverseSettings(): AiPromptReverseSettings {
  return {
    backendMode: 'native-qwen3vl',
    selectedNativeModelId: 'qwen3-vl-4b-instruct',
    selectedExternalBackendId: 'llama-local-openai',
    selectedExternalModel: '',
    maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    maxImageSize: 1024,
    temperature: 0.6,
    topP: 0.9
  }
}

export function createLegacyAppSettingsDefaults(): AppSettings {
  return {
    libraryPath: '~/DesignAssetManager/library',
    concurrency: 3,
    delayInterval: 1.5,
    saveOriginalUrl: true,
    autoThumbnail: true,

    enableTextColorPalette: true,
    textDetectionProvider: 'none',
    textDetectionTimeoutMs: 15000,
    maxTextBoxes: 30,
    minTextBoxConfidence: 0.5,

    enableTextColorAnalysis: true,
    textBoxProvider: 'easyocr',
    ocrTimeoutMs: 15000,
    maxTextBoxesPerImage: 30,
    autoInstallAllowed: false,
    lastOcrEnvCheckAt: '',
    cachedOcrEnvStatus: null,

    modelRootDir: path.join(homedir(), 'DesignAssetManager', 'AIModels'),
    selectedPromptModelId: 'qwen3-vl-4b-instruct',
    selectedPromptModelPath: path.join(homedir(), 'DesignAssetManager', 'AIModels', 'qwen', 'qwen3-vl-4b-instruct'),
    qwen3vlMaxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    qwen3vlMaxImageSize: 1024,
    qwen3vlTemperature: 0.6,
    qwen3vlTopP: 0.9,
    aiBackends: [createDefaultLlamaBackendConfig()],
    promptReverseSettings: createDefaultPromptReverseSettings(),
    promptReverseTemplates: [],
    memoryPolicy: {
      clearGpuBeforePromptReverse: 'auto',
      forceClearWhenInsufficient: true,
      minFreeVramGBBeforeQwen8B: 10,
      maxGpuMemoryUsagePercent: 92,
      enableGpuMemoryGuard: true,
      enableGpuMemoryPollingDuringInference: true,
      gpuMemoryPollIntervalMs: 1000
    },

    enable_text_color_palette: true,
    text_detection_provider: 'none',
    text_detection_timeout_ms: 3000,
    max_text_boxes: 30,
    min_text_box_confidence: 0.5
  }
}

export function createNewInstallAppSettingsDefaults(): AppSettings {
  const platformInfo = detectPlatform()
  const managedPaths = resolveManagedPaths()
  const crossPlatformDefaults = createCrossPlatformSettingsDefaults(platformInfo, managedPaths)

  return {
    ...createLegacyAppSettingsDefaults(),
    schemaVersion: crossPlatformDefaults.schemaVersion,
    platformProfile: crossPlatformDefaults.platformProfile,
    managedPaths: crossPlatformDefaults.managedPaths,
    aiRuntimeSettings: crossPlatformDefaults.aiRuntimeSettings,
    bootstrapSettings: crossPlatformDefaults.bootstrapSettings,
    doctorSettings: crossPlatformDefaults.doctorSettings
  }
}
