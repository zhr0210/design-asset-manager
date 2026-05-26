import { create } from 'zustand'

export interface ExtractedAsset {
  id: string
  title?: string
  thumbnailUrl: string
  previewUrl?: string
  downloadUrl?: string
  sourcePageUrl: string
  sourceSite: string
  width?: number
  height?: number
  fileType?: string
}

interface ExtractorState {
  extractedAssets: ExtractedAsset[]
  selectedAssetIds: string[]
  isExtracting: boolean
  extractError: string | null

  setExtractedAssets: (assets: ExtractedAsset[]) => void
  setSelectedAssetIds: (ids: string[]) => void
  toggleSelectAsset: (id: string) => void
  selectAll: () => void
  selectNone: () => void
  scanCurrentPage: () => Promise<void>
  clearResults: () => void
}

const api = (window as any).electronAPI

export const useExtractorStore = create<ExtractorState>((set, get) => ({
  extractedAssets: [],
  selectedAssetIds: [],
  isExtracting: false,
  extractError: null,

  setExtractedAssets: (extractedAssets) => set({ extractedAssets }),
  setSelectedAssetIds: (selectedAssetIds) => set({ selectedAssetIds }),

  toggleSelectAsset: (id) => {
    set((state) => {
      const selected = state.selectedAssetIds.includes(id)
        ? state.selectedAssetIds.filter((x) => x !== id)
        : [...state.selectedAssetIds, id]
      return { selectedAssetIds: selected }
    })
  },

  selectAll: () => {
    const allIds = get().extractedAssets.map((a) => a.id)
    set({ selectedAssetIds: allIds })
  },

  selectNone: () => {
    set({ selectedAssetIds: [] })
  },

  scanCurrentPage: async () => {
    set({ isExtracting: true, extractError: null, extractedAssets: [], selectedAssetIds: [] })
    if (api && api.extractorScanPage) {
      try {
        const results = await api.extractorScanPage()
        set({
          extractedAssets: results || [],
          selectedAssetIds: (results || []).map((r: any) => r.id),
          isExtracting: false
        })
      } catch (err) {
        console.error('[ExtractorStore] Extraction scan failed:', err)
        set({ extractError: String(err), isExtracting: false })
      }
    } else {
      // Mock assets fallback for web environment testing
      setTimeout(() => {
        const mockResults: ExtractedAsset[] = [
          {
            id: `ext-${Math.random().toString(36).substr(2, 9)}`,
            title: 'Mock Unsplash Forest View',
            thumbnailUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
            previewUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=80',
            downloadUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=80',
            sourcePageUrl: 'https://unsplash.com/s/photos/forest',
            sourceSite: 'Unsplash',
            width: 1920,
            height: 1080,
            fileType: 'JPG'
          },
          {
            id: `ext-${Math.random().toString(36).substr(2, 9)}`,
            title: 'Mock TapNow Platform Image',
            thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
            previewUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            downloadUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            sourcePageUrl: 'https://app.tapnow.ai/home',
            sourceSite: 'TapNow',
            width: 2560,
            height: 1440,
            fileType: 'JPG'
          }
        ]
        set({
          extractedAssets: mockResults,
          selectedAssetIds: mockResults.map((r) => r.id),
          isExtracting: false
        })
      }, 1000)
    }
  },

  clearResults: () => {
    set({ extractedAssets: [], selectedAssetIds: [], extractError: null, isExtracting: false })
  }
}))
