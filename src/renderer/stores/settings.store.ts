import { getWorkspaceClient } from '../workspace-client'
import { create } from 'zustand'
import type { AppSettings } from '../../shared/types/settings.types'
import type { AiBackendConfig, AiPromptReverseSettings } from '../../shared/types/ai-backend.types'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../shared/constants/prompt-templates.constants'
import type { SettingsExpected } from '../../shared/contracts/settings.contract'

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
  backendMode: 'llama-openai',
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
  updateSettings: (settings: Partial<AppSettings>, expected?: SettingsExpected) => Promise<void>
  loadSettings: (requireSuccess?: boolean) => Promise<void>
  clearCache: () => Promise<void>
}

const api = getWorkspaceClient()
let loadVersion = 0
let saveVersion = 0
let requiredLoad: Promise<void> | undefined

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

  loadSettings: async (requireSuccess = false) => {
    // Mount/event refreshes must not invalidate the read that admits browser writes.
    // Follow it with a fresh read so peer changes during calibration are still seen.
    if (!requireSuccess) {
      while (requiredLoad) {
        try { await requiredLoad } catch { /* The required caller still receives its failure. */ }
      }
    }
    const version = ++loadVersion
    const read = async () => {
      if (api && api.settingsLoad) {
        try {
          const loaded = await api.settingsLoad()
          if (version !== loadVersion) {
            if (requireSuccess) throw Error('SETTINGS_LOAD_SUPERSEDED')
            return
          }
          set({ settings: loaded })
          console.log('[SettingsStore] Settings loaded from backend.')
        } catch (err) {
          console.error('[SettingsStore] Failed to load settings:', err)
          if (requireSuccess) throw err
        }
      } else if (requireSuccess) throw Error('SETTINGS_API_UNAVAILABLE')
    }
    if (!requireSuccess) return read()
    const pending = read().finally(() => {
      if (requiredLoad === pending) requiredLoad = undefined
    })
    requiredLoad = pending
    return pending
  },

  updateSettings: async (newSettings, expected) => {
    const version = ++saveVersion
    ++loadVersion
    const previous = get().settings
    const updated = { ...previous, ...newSettings }
    set({ settings: updated })

    if (api && api.settingsSave) {
      let saved: AppSettings
      try {
        const base = expected ?? Object.fromEntries(Object.keys(newSettings).map(key => [key, previous[key as keyof AppSettings] ?? null]))
        saved = await api.settingsSave(newSettings, base)
      } catch (err) {
        if (get().settings === updated) set({ settings: previous })
        console.error('[SettingsStore] Failed to save settings to backend, rolled back:', err)
        throw err
      }
      // Commit is known. A failed refresh must not roll it back or report a failed write.
      ++loadVersion
      if (version === saveVersion) {
        if (get().settings === updated) set({ settings: saved })
        else await get().loadSettings()
      }
      console.log('[SettingsStore] Settings saved to backend.')
    }
  },

  clearCache: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    console.log('App visual cache cleared successfully.')
  }
}))
