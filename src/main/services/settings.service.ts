import fs from 'fs'
import path from 'path'
import { homedir } from 'os'
import type { AppSettings } from '../../shared/types/settings.types'
import type { AiBackendConfig, AiPromptReverseSettings } from '../../shared/types/ai-backend.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../shared/constants/prompt-templates.constants'

export function createDefaultLlamaBackendConfig(): AiBackendConfig {
  return {
    id: 'llama-local-openai',
    name: 'Llama 本地量化模型服务',
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
    notes: '适用于 llama.cpp / llama-server / llama.app 暴露的 OpenAI-compatible API。'
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

export class SettingsService {
  private static instance: SettingsService
  private configPath: string
  private cache: AppSettings | null = null

  private constructor() {
    const baseDir = path.join(homedir(), 'DesignAssetManager')
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true })
    }
    this.configPath = path.join(baseDir, 'settings.json')
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  /**
   * Get all settings (reads from cache or disk).
   */
  public getSettings(): AppSettings {
    if (this.cache) return this.cache

    const defaults: AppSettings = {
      libraryPath: '~/DesignAssetManager/library',
      concurrency: 3,
      delayInterval: 1.5,
      saveOriginalUrl: true,
      autoThumbnail: true,
      
      // New Text Color Palette default settings
      enableTextColorPalette: true,
      textDetectionProvider: 'none',
      textDetectionTimeoutMs: 15000,
      maxTextBoxes: 30,
      minTextBoxConfidence: 0.5,

      // OCR Enhancements R3
      enableTextColorAnalysis: true,
      textBoxProvider: 'easyocr',
      ocrTimeoutMs: 15000,
      maxTextBoxesPerImage: 30,
      autoInstallAllowed: false,
      lastOcrEnvCheckAt: '',
      cachedOcrEnvStatus: null,

      // Qwen3-VL & AI settings defaults
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

      // Aliases
      enable_text_color_palette: true,
      text_detection_provider: 'none',
      text_detection_timeout_ms: 3000,
      max_text_boxes: 30,
      min_text_box_confidence: 0.5
    }

    if (!fs.existsSync(this.configPath)) {
      this.cache = defaults
      this.saveSettings(defaults)
      return defaults
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf8')
      const parsed = JSON.parse(data)
      
      // Resolve snake_case and camelCase options defensively
      const enableVal = parsed.enableTextColorPalette ?? parsed.enable_text_color_palette ?? defaults.enableTextColorPalette
      let providerVal = parsed.textDetectionProvider ?? parsed.text_detection_provider ?? defaults.textDetectionProvider
      const timeoutVal = parsed.textDetectionTimeoutMs ?? parsed.text_detection_timeout_ms ?? defaults.textDetectionTimeoutMs
      const maxVal = parsed.maxTextBoxes ?? parsed.max_text_boxes ?? defaults.maxTextBoxes
      const minVal = parsed.minTextBoxConfidence ?? parsed.min_text_box_confidence ?? defaults.minTextBoxConfidence

      // Legacy default OCR provider safety migration
      const unsafeLegacyDefaultProviders = ['paddleocr_detection', 'rapidocr_detection', 'mock_text_boxes']
      if (unsafeLegacyDefaultProviders.includes(providerVal) && parsed.hasUserSelectedOcr !== true) {
        console.log(`[SettingsService] Safe legacy default migration: Normalizing unconfigured legacy provider '${providerVal}' to 'none'.`)
        providerVal = 'none'
      }

      // R3.0 parameters parsing
      const enableAnalysisVal = parsed.enableTextColorAnalysis ?? defaults.enableTextColorAnalysis
      const boxProviderVal = parsed.textBoxProvider ?? defaults.textBoxProvider
      const ocrTimeoutVal = parsed.ocrTimeoutMs ?? defaults.ocrTimeoutMs
      const maxBoxesImageVal = parsed.maxTextBoxesPerImage ?? defaults.maxTextBoxesPerImage
      const autoInstallAllowedVal = parsed.autoInstallAllowed ?? defaults.autoInstallAllowed
      const lastCheckAtVal = parsed.lastOcrEnvCheckAt ?? defaults.lastOcrEnvCheckAt
      const cachedEnvVal = parsed.cachedOcrEnvStatus ?? defaults.cachedOcrEnvStatus

      // Qwen3-VL models parsing
      const modelRootDirVal = parsed.modelRootDir ?? defaults.modelRootDir
      const selectedPromptModelIdVal = parsed.selectedPromptModelId ?? defaults.selectedPromptModelId
      const selectedPromptModelPathVal = parsed.selectedPromptModelPath ?? path.join(modelRootDirVal, 'qwen', parsed.selectedPromptModelId ?? defaults.selectedPromptModelId ?? 'qwen3-vl-4b-instruct')
      const qwen3vlMaxNewTokensVal = parsed.qwen3vlMaxNewTokens ?? defaults.qwen3vlMaxNewTokens
      const qwen3vlMaxImageSizeVal = parsed.qwen3vlMaxImageSize ?? defaults.qwen3vlMaxImageSize
      const qwen3vlTemperatureVal = parsed.qwen3vlTemperature ?? defaults.qwen3vlTemperature
      const qwen3vlTopPVal = parsed.qwen3vlTopP ?? defaults.qwen3vlTopP
      const memoryPolicyVal = parsed.memoryPolicy ? { ...defaults.memoryPolicy, ...parsed.memoryPolicy } : defaults.memoryPolicy
      const aiBackendsVal = Array.isArray(parsed.aiBackends) && parsed.aiBackends.length > 0
        ? parsed.aiBackends
        : defaults.aiBackends
      const promptReverseSettingsVal = parsed.promptReverseSettings
        ? { ...defaults.promptReverseSettings, ...parsed.promptReverseSettings }
        : defaults.promptReverseSettings
      const promptReverseTemplatesVal = Array.isArray(parsed.promptReverseTemplates) ? parsed.promptReverseTemplates : defaults.promptReverseTemplates

      this.cache = {
        ...defaults,
        ...parsed,
        enableTextColorPalette: enableVal,
        enable_text_color_palette: enableVal,
        textDetectionProvider: providerVal,
        text_detection_provider: providerVal,
        textDetectionTimeoutMs: timeoutVal,
        text_detection_timeout_ms: timeoutVal,
        maxTextBoxes: maxVal,
        max_text_boxes: maxVal,
        minTextBoxConfidence: minVal,
        min_text_box_confidence: minVal,
        hasUserSelectedOcr: parsed.hasUserSelectedOcr ?? false,

        // R3.0
        enableTextColorAnalysis: enableAnalysisVal,
        textBoxProvider: boxProviderVal,
        ocrTimeoutMs: ocrTimeoutVal,
        maxTextBoxesPerImage: maxBoxesImageVal,
        autoInstallAllowed: autoInstallAllowedVal,
        lastOcrEnvCheckAt: lastCheckAtVal,
        cachedOcrEnvStatus: cachedEnvVal,

        // Qwen3-VL
        modelRootDir: modelRootDirVal,
        selectedPromptModelId: selectedPromptModelIdVal,
        selectedPromptModelPath: selectedPromptModelPathVal,
        qwen3vlMaxNewTokens: qwen3vlMaxNewTokensVal,
        qwen3vlMaxImageSize: qwen3vlMaxImageSizeVal,
        qwen3vlTemperature: qwen3vlTemperatureVal,
        qwen3vlTopP: qwen3vlTopPVal,
        aiBackends: aiBackendsVal,
        promptReverseSettings: promptReverseSettingsVal,
        promptReverseTemplates: promptReverseTemplatesVal,
        memoryPolicy: memoryPolicyVal
      } as any
      return this.cache!
    } catch (e) {
      console.error('[SettingsService] Failed to read settings.json, returning defaults:', e)
      return defaults
    }
  }

  /**
   * Save settings to disk and update cache.
   */
  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    
    // Resolve snake_case and camelCase options defensively
    const enableVal = settings.enableTextColorPalette ?? settings.enable_text_color_palette ?? current.enableTextColorPalette
    const providerVal = settings.textDetectionProvider ?? settings.text_detection_provider ?? current.textDetectionProvider
    const timeoutVal = settings.textDetectionTimeoutMs ?? settings.text_detection_timeout_ms ?? current.textDetectionTimeoutMs
    const maxVal = settings.maxTextBoxes ?? settings.max_text_boxes ?? current.maxTextBoxes
    const minVal = settings.minTextBoxConfidence ?? settings.min_text_box_confidence ?? current.minTextBoxConfidence

    // R3.0 options parsing
    const enableAnalysisVal = settings.enableTextColorAnalysis ?? current.enableTextColorAnalysis
    const boxProviderVal = settings.textBoxProvider ?? current.textBoxProvider
    const ocrTimeoutVal = settings.ocrTimeoutMs ?? current.ocrTimeoutMs
    const maxBoxesImageVal = settings.maxTextBoxesPerImage ?? current.maxTextBoxesPerImage
    const autoInstallAllowedVal = settings.autoInstallAllowed ?? current.autoInstallAllowed
    const lastCheckAtVal = settings.lastOcrEnvCheckAt ?? current.lastOcrEnvCheckAt
    const cachedEnvVal = settings.cachedOcrEnvStatus ?? current.cachedOcrEnvStatus

    // Qwen3-VL
    const modelRootDirVal = settings.modelRootDir ?? current.modelRootDir
    const selectedPromptModelIdVal = settings.selectedPromptModelId ?? current.selectedPromptModelId
    const selectedPromptModelPathVal = settings.selectedPromptModelPath
      ?? (settings.modelRootDir
        ? path.join(modelRootDirVal ?? current.modelRootDir ?? path.join(homedir(), 'DesignAssetManager', 'AIModels'), 'qwen', selectedPromptModelIdVal ?? 'qwen3-vl-4b-instruct')
        : current.selectedPromptModelPath)
    const qwen3vlMaxNewTokensVal = settings.qwen3vlMaxNewTokens ?? current.qwen3vlMaxNewTokens
    const qwen3vlMaxImageSizeVal = settings.qwen3vlMaxImageSize ?? current.qwen3vlMaxImageSize
    const qwen3vlTemperatureVal = settings.qwen3vlTemperature ?? current.qwen3vlTemperature
    const qwen3vlTopPVal = settings.qwen3vlTopP ?? current.qwen3vlTopP
    const aiBackendsVal = settings.aiBackends ?? current.aiBackends ?? [createDefaultLlamaBackendConfig()]
    const promptReverseSettingsVal = settings.promptReverseSettings
      ? { ...(current.promptReverseSettings ?? createDefaultPromptReverseSettings()), ...settings.promptReverseSettings }
      : current.promptReverseSettings ?? createDefaultPromptReverseSettings()
    const promptReverseTemplatesVal = settings.promptReverseTemplates ?? current.promptReverseTemplates ?? []
    const memoryPolicyVal = settings.memoryPolicy ? { ...current.memoryPolicy, ...settings.memoryPolicy } : current.memoryPolicy

    const updated = {
      ...current,
      ...settings,
      enableTextColorPalette: enableVal,
      enable_text_color_palette: enableVal,
      textDetectionProvider: providerVal,
      text_detection_provider: providerVal,
      textDetectionTimeoutMs: timeoutVal,
      text_detection_timeout_ms: timeoutVal,
      maxTextBoxes: maxVal,
      max_text_boxes: maxVal,
      minTextBoxConfidence: minVal,
      min_text_box_confidence: minVal,
      hasUserSelectedOcr: true, // Explicitly mark that the configuration has been manually selected and saved

      // R3.0
      enableTextColorAnalysis: enableAnalysisVal,
      textBoxProvider: boxProviderVal,
      ocrTimeoutMs: ocrTimeoutVal,
      maxTextBoxesPerImage: maxBoxesImageVal,
      autoInstallAllowed: autoInstallAllowedVal,
      lastOcrEnvCheckAt: lastCheckAtVal,
      cachedOcrEnvStatus: cachedEnvVal,

      // Qwen3-VL
      modelRootDir: modelRootDirVal,
      selectedPromptModelId: selectedPromptModelIdVal,
      selectedPromptModelPath: selectedPromptModelPathVal,
      qwen3vlMaxNewTokens: qwen3vlMaxNewTokensVal,
      qwen3vlMaxImageSize: qwen3vlMaxImageSizeVal,
      qwen3vlTemperature: qwen3vlTemperatureVal,
      qwen3vlTopP: qwen3vlTopPVal,
      aiBackends: aiBackendsVal,
      promptReverseSettings: promptReverseSettingsVal,
      promptReverseTemplates: promptReverseTemplatesVal,
      memoryPolicy: memoryPolicyVal
    }
    this.cache = updated as any

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8')
      console.log('[SettingsService] Settings successfully saved to:', this.configPath)
    } catch (e) {
      console.error('[SettingsService] Failed to write settings.json:', e)
    }

    return updated
  }
}
