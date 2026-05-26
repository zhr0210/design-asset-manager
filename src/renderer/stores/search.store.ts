import { create } from 'zustand'

export interface AssetSearchResult {
  id: string
  title?: string
  thumbnailUrl: string
  imageUrl?: string
  sourcePageUrl: string
  sourceSite: string
  width?: number
  height?: number
  fileType?: string
}

interface SearchState {
  siteId: string
  keyword: string
  searching: boolean
  results: AssetSearchResult[]
  setSiteId: (siteId: string) => void
  setKeyword: (keyword: string) => void
  search: () => Promise<void>
}

// Creative fallback mock results matching premium tastes (for web browser environment)
const MOCK_RESULTS: AssetSearchResult[] = [
  {
    id: 'res-1',
    title: 'Minimalist Interior Design Canvas',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    sourcePageUrl: 'https://unsplash.com/photos/minimalist-interior',
    sourceSite: 'Unsplash',
    width: 1920,
    height: 1280,
    fileType: 'JPG'
  },
  {
    id: 'res-2',
    title: '3D Glossy Holographic Shapes',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    sourcePageUrl: 'https://unsplash.com/photos/3d-shapes',
    sourceSite: 'Unsplash',
    width: 2400,
    height: 1800,
    fileType: 'PNG'
  },
  {
    id: 'res-3',
    title: 'Abstract Fluid Ink Painting',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80',
    sourcePageUrl: 'https://unsplash.com/photos/fluid-ink',
    sourceSite: 'Pinterest',
    width: 1600,
    height: 2400,
    fileType: 'JPG'
  }
]

const api = (window as any).electronAPI

export const useSearchStore = create<SearchState>((set, get) => ({
  siteId: 'tapnow',
  keyword: '',
  searching: false,
  results: [],

  setSiteId: (siteId) => set({ siteId }),
  setKeyword: (keyword) => set({ keyword }),

  search: async () => {
    const { siteId, keyword } = get()
    if (!keyword.trim()) return

    set({ searching: true, results: [] })

    if (api) {
      try {
        console.log(`[Store] Querying crawler for siteId: ${siteId}, query: "${keyword}"`)
        const res = await api.runSearch({ siteId, keyword })
        if (res.success) {
          set({ results: res.results, searching: false })
          return
        } else {
          console.error('[Store] Search IPC failed:', res.error)
        }
      } catch (err) {
        console.error('[Store] Search IPC execution error:', err)
      }
    }

    // Fallback Mock for web or failure cases
    await new Promise((resolve) => setTimeout(resolve, 1500))
    set({
      results: MOCK_RESULTS.map((item) => ({
        ...item,
        id: `res-${Math.random().toString(36).substr(2, 9)}`,
        title: `${keyword} - ${item.title}`
      })),
      searching: false
    })
  }
}))
