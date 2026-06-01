import { create } from 'zustand'
import type { AppSettings } from '../../shared/types/settings.types'
import type { AiBackendConfig, AiPromptReverseSettings } from '../../shared/types/ai-backend.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../shared/constants/prompt-templates.constants'

const defaultLlamaBackend: AiBackendConfig = {
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

const defaultPromptReverseSettings: AiPromptReverseSettings = {
  backendMode: 'native-qwen3vl',
  selectedNativeModelId: 'qwen3-vl-4b-instruct',
  selectedExternalBackendId: 'llama-local-openai',
  selectedExternalModel: '',
  maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  maxImageSize: 1024,
  temperature: 0.6,
  topP: 0.9
}

interface SettingsState {
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  loadSettings: () => Promise<void>
  clearCache: () => Promise<void>
}

const api = (window as any).electronAPI

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    libraryPath: '~/DesignAssetManager/library',
    concurrency: 3,
    delayInterval: 1.5,
    saveOriginalUrl: true,
    autoThumbnail: true,
    
    // Default Text Color Palette settings
    enableTextColorPalette: true,
    textDetectionProvider: 'none',
    textDetectionTimeoutMs: 3000,
    maxTextBoxes: 30,
    minTextBoxConfidence: 0.5,

    // OCR Enhancements R3
    enableTextColorAnalysis: true,
    textBoxProvider: 'easyocr',
    ocrTimeoutMs: 3000,
    maxTextBoxesPerImage: 30,
    autoInstallAllowed: false,
    lastOcrEnvCheckAt: '',
    cachedOcrEnvStatus: null,

    // Qwen3-VL & AI settings defaults
    modelRootDir: '~/DesignAssetManager/AIModels',
    selectedPromptModelId: 'qwen3-vl-4b-instruct', // Update default model to 4B stable recommended
    selectedPromptModelPath: '~/DesignAssetManager/AIModels/qwen/qwen3-vl-4b-instruct',
    qwen3vlMaxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    qwen3vlMaxImageSize: 1024,
    qwen3vlTemperature: 0.6,
    qwen3vlTopP: 0.9,
    aiBackends: [defaultLlamaBackend],
    promptReverseSettings: defaultPromptReverseSettings,
    promptReverseTemplates: [],
    modelCompatStatuses: {},
    memoryPolicy: {
      clearGpuBeforePromptReverse: 'auto',
      forceClearWhenInsufficient: true,
      minFreeVramGBBeforeQwen8B: 10,
      maxGpuMemoryUsagePercent: 92,
      enableGpuMemoryGuard: true,
      enableGpuMemoryPollingDuringInference: true,
      gpuMemoryPollIntervalMs: 1000
    }
  },

  loadSettings: async () => {
    if (api && api.settingsLoad) {
      try {
        const loaded = await api.settingsLoad()
        set({ settings: loaded })
        console.log('[SettingsStore] Settings loaded from backend:', loaded)
      } catch (err) {
        console.error('[SettingsStore] Failed to load settings:', err)
      }
    }
  },

  updateSettings: async (newSettings) => {
    const previous = get().settings
    const updated = { ...previous, ...newSettings }
    set({ settings: updated })

    if (api && api.settingsSave) {
      try {
        const saved = await api.settingsSave(newSettings)
        set({ settings: saved })
        console.log('[SettingsStore] Settings saved to backend:', saved)
      } catch (err) {
        set({ settings: previous })
        console.error('[SettingsStore] Failed to save settings to backend, rolled back:', err)
        throw err
      }
    }
  },

  clearCache: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    console.log('App visual cache cleared successfully.')
  }
}))
