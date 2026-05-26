import { create } from 'zustand'

export interface Settings {
  libraryPath: string
  concurrency: number
  delayInterval: number
  saveOriginalUrl: boolean
  autoThumbnail: boolean
}

interface SettingsState {
  settings: Settings
  updateSettings: (settings: Partial<Settings>) => void
  clearCache: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    libraryPath: '~/DesignAssetManager/library',
    concurrency: 3,
    delayInterval: 1.5,
    saveOriginalUrl: true,
    autoThumbnail: true
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }))
  },

  clearCache: async () => {
    // Simulated delay
    await new Promise((resolve) => setTimeout(resolve, 800))
    console.log('App visual cache cleared successfully.')
  }
}))
