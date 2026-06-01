import { create } from 'zustand'

export interface Asset {
  id: string
  title: string
  fileName: string
  filePath: string
  thumbnailPath: string
  fileUrl?: string
  sourceSiteId: string
  sourceSiteName: string
  sourcePageUrl: string
  originalUrl: string
  width: number
  height: number
  fileSize: number
  fileType: string
  dominantColor?: string
  browserPageTitle?: string
  captureMethod?: string
  aiTagStatus: string
  aiTaggedAt: string
  aiPromptStatus: string
  aiPrompt: string
  aiCaption: string
  aiCaptionSource?: string
  aiCaptionUpdatedAt?: string
  aiCaptionIsUserEdited?: number
  aiOcrText?: string
  aiOcrSource?: string
  aiOcrUpdatedAt?: string
  aiAnalysisStatus: string
  aiAnalysisJson: string
  lastTagUpdatedAt: string
  color_palette_json?: string
  tags: string[]
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  normalizedName: string
  slug: string
  type: string
  color: string
  description?: string
  shorthand?: string
  aliases: string[]
  parentId?: string | null
  isCategory: boolean
  isSystem: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface AssetTagRelation {
  id: string
  asset_id: string
  tag_id: string
  source: string
  confidence: number
  status: string
  model_name?: string
  model_version?: string
  raw_value?: string
  created_by: string
  created_at: string
  tag_name: string
  tag_type: string
  tag_color: string
}

interface AssetState {
  assets: Asset[]
  tags: Tag[]
  selectedAsset: Asset | null
  activeTagSearchQueries: string[]
  bulkSelectedAssetIds: string[]
  assetRelations: Record<string, AssetTagRelation[]>
  searchQuery: string
  filterSite: string
  filterTag: string
  includePending: boolean

  setSelectedAsset: (asset: Asset | null) => void
  setSearchQuery: (query: string) => void
  setFilterSite: (site: string) => void
  setFilterTag: (tag: string) => void
  setIncludePending: (val: boolean) => void

  // Bulk Assets Selection
  toggleBulkSelectedAssetId: (id: string) => void
  clearBulkSelectedAssetIds: () => void

  // Tag Search Queries
  addActiveTagSearchQuery: (query: string) => void
  removeActiveTagSearchQuery: (query: string) => void
  clearActiveTagSearchQueries: () => void

  // Core API loading
  loadAssets: () => Promise<void>
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'aiTagStatus' | 'aiPromptStatus' | 'aiAnalysisStatus' | 'aiTaggedAt' | 'aiPrompt' | 'aiCaption' | 'aiAnalysisJson' | 'lastTagUpdatedAt'>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>

  // Tag CRUD Operations
  loadTags: () => Promise<void>
  createTag: (input: { name: string; type?: string; color?: string; description?: string; shorthand?: string; parentId?: string; isCategory?: boolean }) => Promise<any>
  updateTag: (id: string, input: any) => Promise<any>
  deleteTag: (id: string) => Promise<any>
  mergeTags: (sourceTagId: string, targetTagId: string) => Promise<any>
  createAlias: (tagId: string, alias: string) => Promise<any>
  removeAlias: (tagId: string, alias: string) => Promise<any>
  setParent: (tagId: string, parentId: string | null) => Promise<any>

  // Asset Tags Relations Operations
  loadAssetTags: (assetId: string) => Promise<void>
  addTagToAsset: (assetId: string, tagId: string, options?: any) => Promise<void>
  removeTagFromAsset: (assetId: string, tagId: string) => Promise<void>
  batchAddTagsToAssets: (assetIds: string[], tagIds: string[], options?: any) => Promise<void>
  batchRemoveTagsFromAssets: (assetIds: string[], tagIds: string[]) => Promise<void>
  replaceTagsForAssets: (assetIds: string[], oldTagId: string, newTagId: string) => Promise<void>
  confirmAiTag: (assetTagId: string, assetId: string) => Promise<void>
  rejectAiTag: (assetTagId: string, assetId: string) => Promise<void>

  // Caption operations
  updateAssetCaption: (assetId: string, caption: string) => Promise<void>
  resetAssetCaptionEdited: (assetId: string) => Promise<void>

  // Mock AI Suggestions pipeline
  generateMockAiSuggestions: (assetId: string, modelsToRun?: string[]) => Promise<void>

  // Qwen-VL Senior Deep Analysis
  generateDeepAnalysis: (assetId: string) => Promise<void>

  // Qwen3-VL Advanced Prompt Reverse
  runPromptReverse: (assetId: string, modelId: string, modelPath: string, options?: { promptTemplateId?: string; promptTemplateText?: string }) => Promise<any>
}

const api = (window as any).electronAPI

// Mapper to map database snake_case structures to camelCase
function mapDbAssetToAsset(dbAsset: any): Asset {
  const isHttp = (p: string) => p && (p.startsWith('http://') || p.startsWith('https://'))
  const thumbnailPath = dbAsset.thumbnail_path
    ? (isHttp(dbAsset.thumbnail_path) ? dbAsset.thumbnail_path : `local-file://${dbAsset.thumbnail_path}`)
    : ''
  const fileUrl = dbAsset.file_path
    ? (isHttp(dbAsset.file_path) ? dbAsset.file_path : `local-file://${dbAsset.file_path}`)
    : ''

  return {
    id: dbAsset.id,
    title: dbAsset.title,
    fileName: dbAsset.file_name,
    filePath: dbAsset.file_path,
    thumbnailPath,
    fileUrl,
    sourceSiteId: dbAsset.source_site_id,
    sourceSiteName: dbAsset.source_site_name,
    sourcePageUrl: dbAsset.source_page_url || '',
    originalUrl: dbAsset.original_url || '',
    width: dbAsset.width || 0,
    height: dbAsset.height || 0,
    fileSize: dbAsset.file_size || 0,
    fileType: dbAsset.file_type || 'JPG',
    dominantColor: dbAsset.dominant_color,
    browserPageTitle: dbAsset.browser_page_title || '',
    captureMethod: dbAsset.capture_method || 'search',
    aiTagStatus: dbAsset.ai_tag_status || 'not_started',
    aiTaggedAt: dbAsset.ai_tagged_at || '',
    aiPromptStatus: dbAsset.ai_prompt_status || 'not_started',
    aiPrompt: dbAsset.ai_prompt || '',
    aiCaption: dbAsset.ai_caption || '',
    aiCaptionSource: dbAsset.ai_caption_source || '',
    aiCaptionUpdatedAt: dbAsset.ai_caption_updated_at || '',
    aiCaptionIsUserEdited: dbAsset.ai_caption_is_user_edited || 0,
    aiOcrText: dbAsset.ai_ocr_text || '',
    aiOcrSource: dbAsset.ai_ocr_source || '',
    aiOcrUpdatedAt: dbAsset.ai_ocr_updated_at || '',
    aiAnalysisStatus: dbAsset.ai_analysis_status || 'not_started',
    aiAnalysisJson: dbAsset.ai_analysis_json || '',
    lastTagUpdatedAt: dbAsset.last_tag_updated_at || '',
    color_palette_json: dbAsset.color_palette_json || '',
    tags: dbAsset.tags || [],
    createdAt: dbAsset.created_at
  }
}

function mapDbTagToTag(dbTag: any): Tag {
  let parsedAliases: string[] = []
  try {
    parsedAliases = dbTag.aliases ? JSON.parse(dbTag.aliases) : []
  } catch (e) {
    parsedAliases = Array.isArray(dbTag.aliases) ? dbTag.aliases : []
  }

  return {
    id: dbTag.id,
    name: dbTag.name,
    normalizedName: dbTag.normalized_name || dbTag.name.toLowerCase(),
    slug: dbTag.slug || '',
    type: dbTag.type || 'custom',
    color: dbTag.color || 'bg-slate-100 text-slate-700 border border-slate-200',
    description: dbTag.description || '',
    shorthand: dbTag.shorthand || '',
    aliases: parsedAliases,
    parentId: dbTag.parent_id || null,
    isCategory: !!dbTag.is_category,
    isSystem: !!dbTag.is_system,
    usageCount: dbTag.usage_count || 0,
    createdAt: dbTag.created_at,
    updatedAt: dbTag.updated_at || dbTag.created_at
  }
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  tags: [],
  selectedAsset: null,
  activeTagSearchQueries: [],
  bulkSelectedAssetIds: [],
  assetRelations: {},
  searchQuery: '',
  filterSite: '',
  filterTag: '',
  includePending: false,

  setSelectedAsset: (asset) => {
    set({ selectedAsset: asset })
    if (asset) {
      get().loadAssetTags(asset.id)
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterSite: (filterSite) => set({ filterSite }),
  setFilterTag: (filterTag) => {
    set({ filterTag })
    // Synced with active search queries list
    if (filterTag) {
      get().addActiveTagSearchQuery(`tag:${filterTag}`)
    }
  },
  setIncludePending: (includePending) => {
    set({ includePending })
    get().loadAssets()
  },

  // Bulk Assets Selection
  toggleBulkSelectedAssetId: (id) => {
    const list = get().bulkSelectedAssetIds
    if (list.includes(id)) {
      set({ bulkSelectedAssetIds: list.filter((x) => x !== id) })
    } else {
      set({ bulkSelectedAssetIds: [...list, id] })
    }
  },
  clearBulkSelectedAssetIds: () => set({ bulkSelectedAssetIds: [] }),

  // Tag Search Queries
  addActiveTagSearchQuery: (query) => {
    const queries = get().activeTagSearchQueries
    if (!queries.includes(query)) {
      const updated = [...queries, query]
      set({ activeTagSearchQueries: updated })
      get().loadAssets()
    }
  },
  removeActiveTagSearchQuery: (query) => {
    const queries = get().activeTagSearchQueries
    const updated = queries.filter((x) => x !== query)
    set({ activeTagSearchQueries: updated })
    if (query.startsWith('tag:')) {
      const tagVal = query.substring(4)
      if (get().filterTag === tagVal) {
        set({ filterTag: '' })
      }
    }
    get().loadAssets()
  },
  clearActiveTagSearchQueries: () => {
    set({ activeTagSearchQueries: [], filterTag: '' })
    get().loadAssets()
  },

  loadAssets: async () => {
    if (api) {
      try {
        const queries = get().activeTagSearchQueries
        const includePending = get().includePending
        const dbAssets = await api.listAssets({
          keyword: queries.length > 0 ? queries.join(' ') : undefined,
          includePending
        })
        const mappedAssets = dbAssets.map(mapDbAssetToAsset)
        set({ assets: mappedAssets })
        
        // Refresh selectedAsset if loaded
        const currentSel = get().selectedAsset
        if (currentSel) {
          const matched = mappedAssets.find((a: Asset) => a.id === currentSel.id)
          if (matched) {
            set({ selectedAsset: matched })
          }
        }
      } catch (err) {
        console.error('[Store] Failed to load assets from DB:', err)
      }
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
      dominant_color: assetData.dominantColor,
      browser_page_title: assetData.browserPageTitle || null,
      capture_method: assetData.captureMethod || 'search'
    }

    if (api) {
      try {
        const res = await api.saveAsset(newDbAsset, assetData.tags)
        if (res.success) {
          await get().loadAssets()
          await get().loadTags()
        }
      } catch (err) {
        console.error('[Store] Failed to save asset via IPC:', err)
      }
    }
  },

  deleteAsset: async (id) => {
    if (api) {
      try {
        const res = await api.deleteAsset(id)
        if (res.success) {
          await get().loadAssets()
          await get().loadTags()
        }
      } catch (err) {
        console.error('[Store] Failed to delete asset via IPC:', err)
      }
    }
  },

  // Tag CRUD Operations
  loadTags: async () => {
    if (api) {
      try {
        const res = await api.tagList()
        if (res.success) {
          set({ tags: res.tags.map(mapDbTagToTag) })
        }
      } catch (err) {
        console.error('[Store] Failed to load tags:', err)
      }
    }
  },

  createTag: async (input) => {
    if (api) {
      const res = await api.tagCreate(input)
      if (res.success) {
        await get().loadTags()
        return res.tag
      }
      throw new Error(res.error)
    }
  },

  updateTag: async (id, input) => {
    if (api) {
      const res = await api.tagUpdate(id, input)
      if (res.success) {
        await get().loadTags()
        await get().loadAssets()
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset!.id)
        }
        return res.tag
      }
      throw new Error(res.error)
    }
  },

  deleteTag: async (id) => {
    if (api) {
      const res = await api.tagDelete(id)
      if (res.success) {
        await get().loadTags()
        await get().loadAssets()
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset!.id)
        }
        return res.id
      }
      throw new Error(res.error)
    }
  },

  mergeTags: async (sourceTagId, targetTagId) => {
    if (api) {
      const res = await api.tagMerge(sourceTagId, targetTagId)
      if (res.success) {
        await get().loadTags()
        await get().loadAssets()
        if (get().selectedAsset) {
          await get().loadAssetTags(get().selectedAsset!.id)
        }
      }
      return res
    }
  },

  createAlias: async (tagId, alias) => {
    if (api) {
      const res = await api.tagCreateAlias(tagId, alias)
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  removeAlias: async (tagId, alias) => {
    if (api) {
      const res = await api.tagRemoveAlias(tagId, alias)
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  setParent: async (tagId, parentId) => {
    if (api) {
      const res = await api.tagSetParent(tagId, parentId)
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  // Relations
  loadAssetTags: async (assetId) => {
    if (api) {
      try {
        const res = await api.assetTagListByAsset(assetId)
        if (res.success) {
          set((state) => ({
            assetRelations: {
              ...state.assetRelations,
              [assetId]: res.relations
            }
          }))
        }
      } catch (err) {
        console.error('[Store] Failed to load asset tags relations:', err)
      }
    }
  },

  addTagToAsset: async (assetId, tagId, options) => {
    if (api) {
      const res = await api.assetTagAdd(assetId, tagId, options)
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  removeTagFromAsset: async (assetId, tagId) => {
    if (api) {
      const res = await api.assetTagRemove(assetId, tagId)
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  batchAddTagsToAssets: async (assetIds, tagIds, options) => {
    if (api) {
      const res = await api.assetTagBatchAdd(assetIds, tagIds, options)
      if (res.success) {
        await get().loadAssets()
        await get().loadTags()
        for (const aid of assetIds) {
          await get().loadAssetTags(aid)
        }
      }
    }
  },

  batchRemoveTagsFromAssets: async (assetIds, tagIds) => {
    if (api) {
      const res = await api.assetTagBatchRemove(assetIds, tagIds)
      if (res.success) {
        await get().loadAssets()
        await get().loadTags()
        for (const aid of assetIds) {
          await get().loadAssetTags(aid)
        }
      }
    }
  },

  replaceTagsForAssets: async (assetIds, oldTagId, newTagId) => {
    if (api) {
      const res = await api.assetTagReplace(assetIds, oldTagId, newTagId)
      if (res.success) {
        await get().loadAssets()
        await get().loadTags()
        for (const aid of assetIds) {
          await get().loadAssetTags(aid)
        }
      }
    }
  },

  confirmAiTag: async (assetTagId, assetId) => {
    if (api) {
      const res = await api.assetTagConfirmAi(assetTagId)
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  rejectAiTag: async (assetTagId, assetId) => {
    if (api) {
      const res = await api.assetTagRejectAi(assetTagId)
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  updateAssetCaption: async (assetId, caption) => {
    if (api) {
      const res = await api.updateAssetCaption(assetId, caption)
      if (res.success) {
        await get().loadAssets()
      }
    }
  },

  resetAssetCaptionEdited: async (assetId) => {
    if (api) {
      const res = await api.resetAssetCaptionEdited(assetId)
      if (res.success) {
        await get().loadAssets()
      }
    }
  },

  // Mock AI Suggestions trigger
  generateMockAiSuggestions: async (assetId, modelsToRun?: string[]) => {
    if (api) {
      try {
        const asset = get().assets.find((a: Asset) => a.id === assetId)
        if (!asset) return

        // 1. Try to contact the active Python REST server first
        console.log('[Store] Dispatching enqueues to Python AI Worker REST service...')
        const tagRes = await api.aiEnqueueTag(assetId, asset.filePath, 0, modelsToRun)
        
        if (tagRes && tagRes.success) {
          // If server is responsive, trigger WD Tagger batch processing
          await api.aiProcessBatch()
          
          // Poll the asset status from SQLite until it is synced/completed or failed
          let isComplete = false
          const startTime = Date.now()
          // Maximum wait time of 45 seconds to prevent infinite loop (model preheat might take some time)
          while (!isComplete && (Date.now() - startTime < 45000)) {
            // Load the updated assets list
            await get().loadAssets()
            const updatedAsset = get().assets.find((a: Asset) => a.id === assetId)
            
            if (updatedAsset) {
              const status = updatedAsset.aiTagStatus
              if (status === 'synced' || status === 'completed' || status === 'failed') {
                isComplete = true
                break
              }
            }
            // Wait 500ms before polling again
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } else {
          // Trigger local SQLite mock recommendations fallback directly
          console.warn('[Store] AI REST server unresponsive. Executing local database mock fallback...')
          await api.mockAiGenerateSuggestions(assetId)
        }
      } catch (err) {
        console.warn('[Store] AI REST connection failed. Running local database mock fallback...', err)
        await api.mockAiGenerateSuggestions(assetId)
      } finally {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  generateDeepAnalysis: async (assetId: string) => {
    if (api) {
      try {
        const asset = get().assets.find((a: Asset) => a.id === assetId)
        if (!asset) return

        console.log('[Store] Dispatching generateDeepAnalysis to Qwen-VL analysis worker...')
        const res = await api.aiAnalysisGenerate(assetId, asset.filePath)
        
        if (res && res.success) {
          // Trigger immediate batch processing
          await api.aiProcessBatch()
          
          // Poll the asset status from SQLite until synced or failed
          let isComplete = false
          const startTime = Date.now()
          while (!isComplete && (Date.now() - startTime < 45000)) {
            await get().loadAssets()
            const updatedAsset = get().assets.find((a: Asset) => a.id === assetId)
            if (updatedAsset) {
              const status = updatedAsset.aiAnalysisStatus
              if (status === 'synced' || status === 'completed' || status === 'failed') {
                isComplete = true
                break
              }
            }
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      } catch (err) {
        console.error('[Store] Failed to generate Qwen-VL deep analysis:', err)
      } finally {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  runPromptReverse: async (assetId: string, modelId: string, modelPath: string, options?: { promptTemplateId?: string; promptTemplateText?: string }) => {
    if (api && api.aiWorkerRunPromptReverse) {
      try {
        const asset = get().assets.find((a: Asset) => a.id === assetId)
        if (!asset) return { success: false, error: 'Asset not found in library.' }

        // Update selected asset state to processing status
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            if (a.id === assetId) {
              return { ...a, aiPromptStatus: 'running' }
            }
            return a
          })
          const matched = updatedAssets.find((a) => a.id === assetId)
          return {
            assets: updatedAssets,
            selectedAsset: matched || state.selectedAsset
          }
        })

        const res = await api.aiWorkerRunPromptReverse({ assetId, filePath: asset.filePath, modelId, modelPath, ...options })
        
        await get().loadAssets()
        return res
      } catch (err) {
        console.error('[Store] runPromptReverse failed:', err)
        set((state) => {
          const updatedAssets = state.assets.map((a) => {
            if (a.id === assetId) {
              return { ...a, aiPromptStatus: 'failed' }
            }
            return a
          })
          const matched = updatedAssets.find((a) => a.id === assetId)
          return {
            assets: updatedAssets,
            selectedAsset: matched || state.selectedAsset
          }
        })
        return { success: false, error: String(err) }
      }
    }
    return { success: false, error: 'electronAPI is offline.' }
  }
}))

// Auto trigger load on execution
useAssetStore.getState().loadAssets()
useAssetStore.getState().loadTags()

// Subscribe to background AI completed task SQLite sync notifications
if (api && api.onAiTaskSynced) {
  const win = window as any
  if (typeof win.__cleanup_ai_task_synced__ === 'function') {
    try {
      win.__cleanup_ai_task_synced__()
    } catch (e) {
      console.warn('[Store] Error cleaning up previous AI task synced listener:', e)
    }
  }
  win.__cleanup_ai_task_synced__ = api.onAiTaskSynced(async (_event: any, data: { assetId: string }) => {
    console.log('[Store] Received AI completed task synced notification for asset:', data.assetId)
    const store = useAssetStore.getState()
    await store.loadAssets()
    await store.loadTags()
    if (store.selectedAsset && store.selectedAsset.id === data.assetId) {
      await store.loadAssetTags(data.assetId)
    }
  })
}
