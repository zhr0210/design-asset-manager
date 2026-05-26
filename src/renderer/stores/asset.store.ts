import { create } from 'zustand'

export interface Asset {
  id: string
  title: string
  fileName: string
  filePath: string
  thumbnailPath: string
  sourceSiteId: string
  sourceSiteName: string
  sourcePageUrl: string
  originalUrl: string
  width: number
  height: number
  fileSize: number
  fileType: string
  dominantColor?: string
  tags: string[]
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

interface AssetState {
  assets: Asset[]
  tags: Tag[]
  selectedAsset: Asset | null
  searchQuery: string
  filterSite: string
  filterTag: string
  setSelectedAsset: (asset: Asset | null) => void
  setSearchQuery: (query: string) => void
  setFilterSite: (site: string) => void
  setFilterTag: (tag: string) => void
  loadAssets: () => Promise<void>
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  addTag: (name: string, color?: string) => void
}

const api = (window as any).electronAPI

// Mapper to map database snake_case structures to camelCase
function mapDbAssetToAsset(dbAsset: any): Asset {
  return {
    id: dbAsset.id,
    title: dbAsset.title,
    fileName: dbAsset.file_name,
    filePath: dbAsset.file_path,
    thumbnailPath: dbAsset.thumbnail_path,
    sourceSiteId: dbAsset.source_site_id,
    sourceSiteName: dbAsset.source_site_name,
    sourcePageUrl: dbAsset.source_page_url || '',
    originalUrl: dbAsset.original_url || '',
    width: dbAsset.width || 0,
    height: dbAsset.height || 0,
    fileSize: dbAsset.file_size || 0,
    fileType: dbAsset.file_type || 'JPG',
    dominantColor: dbAsset.dominant_color,
    tags: dbAsset.tags || [],
    createdAt: dbAsset.created_at
  }
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  tags: [
    { id: 'tag-1', name: 'Interior', color: 'bg-rose-100 text-rose-700' },
    { id: 'tag-2', name: 'Minimalist', color: 'bg-slate-100 text-slate-700' },
    { id: 'tag-3', name: '3D', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'tag-4', name: 'Abstract', color: 'bg-amber-100 text-amber-700' }
  ],
  selectedAsset: null,
  searchQuery: '',
  filterSite: '',
  filterTag: '',

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterSite: (filterSite) => set({ filterSite }),
  setFilterTag: (filterTag) => set({ filterTag }),

  loadAssets: async () => {
    if (api) {
      try {
        const dbAssets = await api.listAssets()
        set({ assets: dbAssets.map(mapDbAssetToAsset) })
      } catch (err) {
        console.error('[Store] Failed to load assets from DB:', err)
      }
    } else {
      // Mock assets fallback for web
      set({
        assets: [
          {
            id: 'ast-1',
            title: 'Minimalist Interior Design Canvas',
            fileName: 'minimalist-interior.jpg',
            filePath: '~/DesignAssetManager/library/minimalist-interior.jpg',
            thumbnailPath: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
            sourceSiteId: 'unsplash',
            sourceSiteName: 'Unsplash',
            sourcePageUrl: 'https://unsplash.com/photos/minimalist-interior',
            originalUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
            width: 1920,
            height: 1280,
            fileSize: 1.2 * 1024 * 1024,
            fileType: 'JPG',
            dominantColor: '#ECECEB',
            tags: ['Interior', 'Minimalist'],
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ]
      })
    }
  },

  addAsset: async (assetData) => {
    const assetId = `ast-${Math.random().toString(36).substr(2, 9)}`
    
    // Map to DB snake_case schema
    const newDbAsset = {
      id: assetId,
      title: assetData.title,
      file_name: assetData.fileName,
      file_path: assetData.filePath,
      thumbnail_path: assetData.thumbnailPath,
      source_site_id: assetData.sourceSiteId,
      source_site_name: assetData.sourceSiteName,
      source_page_url: assetData.sourcePageUrl,
      original_url: assetData.originalUrl,
      width: assetData.width,
      height: assetData.height,
      file_size: assetData.fileSize,
      file_type: assetData.fileType,
      dominant_color: assetData.dominantColor
    }

    if (api) {
      try {
        const res = await api.saveAsset(newDbAsset, assetData.tags)
        if (res.success) {
          await get().loadAssets()
        }
      } catch (err) {
        console.error('[Store] Failed to save asset via IPC:', err)
      }
    } else {
      const fallbackAsset: Asset = {
        ...assetData,
        id: assetId,
        createdAt: new Date().toISOString()
      }
      set((state) => ({
        assets: [fallbackAsset, ...state.assets]
      }))
    }
  },

  deleteAsset: async (id) => {
    if (api) {
      try {
        const res = await api.deleteAsset(id)
        if (res.success) {
          await get().loadAssets()
        }
      } catch (err) {
        console.error('[Store] Failed to delete asset via IPC:', err)
      }
    } else {
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== id),
        selectedAsset: state.selectedAsset?.id === id ? null : state.selectedAsset
      }))
    }
  },

  addTag: (name, color) => {
    const defaultColors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700'
    ]
    const chosenColor = color || defaultColors[Math.floor(Math.random() * defaultColors.length)]
    set((state) => ({
      tags: [...state.tags, { id: `tag-${Math.random().toString(36).substr(2, 9)}`, name, color: chosenColor }]
    }))
  }
}))

// Auto trigger load on execution
useAssetStore.getState().loadAssets()
