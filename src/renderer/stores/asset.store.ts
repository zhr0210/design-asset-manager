import { create } from 'zustand'
import type { AssetTaggingModelId } from '../../shared/workflows/asset-tagging.workflow'
import { classifyAiTaskStatus, isAiTaskTerminalStatus } from '../../shared/workflows/ai-task-status.workflow'

export interface Asset {
  id: string
  revision?: string
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
  tagAnalysis?:import('../../shared/contracts/tag-execution.contract').TagCurrentSummary|null
  visualAi?: import('../../shared/contracts/visual-ai.contract').VisualAiSummary
  ocr?: import('../../shared/contracts/asset-ocr.contract').OcrSummary
  aiOcrText?: string
  aiOcrSource?: string
  aiOcrUpdatedAt?: string
  aiAnalysisStatus: string
  aiAnalysisJson: string
  lastTagUpdatedAt: string
  color_palette_json?: string
  tags: string[]
  tagAliases?: string[]
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

export type AssetLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AssetState {
  assets: Asset[]
  tags: Tag[]
  tagLoadError: string | null
  selectedAsset: Asset | null
  activeTagSearchQueries: string[]
  bulkSelectedAssetIds: string[]
  assetRelations: Record<string, AssetTagRelation[]>
  searchQuery: string
  filterSite: string
  filterTag: string
  includePending: boolean
  assetLoadStatus: AssetLoadStatus
  assetLoadError: string | null
  hasLoadedAssets: boolean

  resetForLibraryTransition: () => void
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

  // Real AI tagging pipeline
  generateAiSuggestions: (assetId: string, modelsToRun?: readonly AssetTaggingModelId[]) => Promise<{ success: boolean; error?: string }>

  // Qwen3-VL Advanced Prompt Reverse
  runPromptReverse: (assetId: string, modelId: string, modelPath: string, options?: { promptTemplateId?: string; promptTemplateText?: string }) => Promise<any>
}

const api = (window as any).electronAPI

let latestAssetLoadRequestId = 0
let latestTagLoadRequestId = 0
let latestLibraryEpoch = 0

// Mapper to map database snake_case structures to camelCase
function mapDbAssetToAsset(dbAsset: any): Asset {
  const isControlledPreview = (p: string) => p && p.startsWith('dam-preview://')
  const thumbnailPath = isControlledPreview(dbAsset.thumbnail_path) ? dbAsset.thumbnail_path : ''
  const fileUrl = thumbnailPath

  return {
    id: dbAsset.id,
    revision: dbAsset.revision,
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
    visualAi: dbAsset.visualAi,
    tagAnalysis:dbAsset.tagAnalysis,
    ocr: dbAsset.ocr,
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
    tagAliases: dbAsset.tagAliases || [],
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
    parentId: dbTag.parentId ?? dbTag.parent_id ?? null,
    isCategory: !!dbTag.is_category,
    isSystem: !!(dbTag.isSystem ?? dbTag.is_system),
    usageCount: dbTag.usage_count ?? dbTag.usageCount ?? 0,
    createdAt: dbTag.created_at,
    updatedAt: dbTag.updated_at || dbTag.created_at
  }
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  tags: [],
  tagLoadError: null,
  selectedAsset: null,
  activeTagSearchQueries: [],
  bulkSelectedAssetIds: [],
  assetRelations: {},
  searchQuery: '',
  filterSite: '',
  filterTag: '',
  includePending: false,
  assetLoadStatus: 'idle',
  assetLoadError: null,
  hasLoadedAssets: false,

  resetForLibraryTransition: () => {
    latestLibraryEpoch += 1
    latestAssetLoadRequestId += 1
    latestTagLoadRequestId += 1
    set({
      assets: [],
      tags: [], tagLoadError: null,
      selectedAsset: null,
      activeTagSearchQueries: [],
      bulkSelectedAssetIds: [],
      assetRelations: {},
      searchQuery: '',
      filterSite: '',
      filterTag: '',
      includePending: false,
      assetLoadStatus: 'idle',
      assetLoadError: null,
      hasLoadedAssets: false
    })
  },

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
    const requestId = ++latestAssetLoadRequestId
    set({
      assetLoadStatus: 'loading',
      assetLoadError: null
    })

    const queries = get().activeTagSearchQueries
    const includePending = get().includePending

    const currentApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined
    if (!currentApi || typeof currentApi.listAssets !== 'function') {
      if (requestId === latestAssetLoadRequestId) {
        set({
          assetLoadStatus: 'error',
          assetLoadError: '素材服务不可用，请稍后重试'
        })
      }
      return
    }

    try {
      const dbAssets = await currentApi.listAssets({
        keyword: queries.length > 0 ? queries.join(' ') : undefined,
        includePending
      })

      if (requestId !== latestAssetLoadRequestId) {
        return
      }

      if (!Array.isArray(dbAssets)) {
        set({
          assetLoadStatus: 'error',
          assetLoadError: '素材数据格式异常，请稍后重试'
        })
        return
      }

      const mappedAssets = dbAssets.map(mapDbAssetToAsset)

      const currentSel = get().selectedAsset
      let updatedSelected: Asset | null = null
      if (currentSel) {
        const matched = mappedAssets.find((a: Asset) => a.id === currentSel.id)
        if (matched) {
          updatedSelected = matched
        }
      }

      const currentBulkIds = get().bulkSelectedAssetIds
      const validIdSet = new Set(mappedAssets.map((a: Asset) => a.id))
      const updatedBulkIds = currentBulkIds.filter((id) => validIdSet.has(id))

      set({
        assets: mappedAssets,
        assetLoadStatus: 'ready',
        assetLoadError: null,
        hasLoadedAssets: true,
        selectedAsset: updatedSelected,
        bulkSelectedAssetIds: updatedBulkIds
      })
    } catch {
      if (requestId === latestAssetLoadRequestId) {
        console.error('[Store] Failed to load assets from DB')
        set({
          assetLoadStatus: 'error',
          assetLoadError: '加载素材库失败，请重试'
        })
      }
    }
  },

  addAsset: async (assetData) => {
    void assetData
    console.warn('[Store] Direct Asset writes are disabled; use the Main-owned Copy Into Library workflow.')
  },

  deleteAsset: async (id) => {
    const epoch = latestLibraryEpoch
    if (api) {
      try {
        const asset = get().assets.find((candidate) => candidate.id === id)
        const libraryApi = api.library
        if (!asset || !libraryApi) throw new Error('素材回收服务不可用。')
        const current = await libraryApi.trashInspect(id)
        if (!current?.revision) throw new Error('Library Asset revision unavailable.')
        const plan = await libraryApi.trashPrepare({ designAssetIdentity: id, expectedRevision: current.revision })
        if (!plan?.plan?.receipt) throw new Error(plan?.error || 'Asset Trash plan unavailable.')
        const res = await libraryApi.trashDispatch({ kind: 'confirm-plan', planReceipt: plan.plan.receipt })
        if (epoch !== latestLibraryEpoch) return
        if (res?.state === 'trash') {
          await get().loadAssets()
          await get().loadTags()
          return
        }
        throw new Error('素材未能移到回收站。')
      } catch {
        console.error('[Store] Failed to move an Asset to Trash.')
        throw new Error('素材未能移到回收站。')
      }
    }
  },

  // Tag CRUD Operations
  loadTags: async () => {
    const requestId = ++latestTagLoadRequestId
    set({ tagLoadError: null })
    try {
      if (!api) throw new Error('TAG_API_UNAVAILABLE')
      const res = await api.tagList()
      if (requestId !== latestTagLoadRequestId) return
      if (!res?.success || !Array.isArray(res.tags)) throw new Error('TAG_LIST_UNAVAILABLE')
      set({ tags: res.tags.map(mapDbTagToTag), tagLoadError: null })
    } catch {
      if (requestId === latestTagLoadRequestId) set({ tagLoadError: '标签加载失败，当前内容可能未更新，请重试。' })
    }
  },

  createTag: async (input) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagCreate(input)
      if (epoch !== latestLibraryEpoch) return undefined
      if (res.success) {
        await get().loadTags()
        return res.tag
      }
      throw new Error(res.error)
    }
  },

  updateTag: async (id, input) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagUpdate(id, input)
      if (epoch !== latestLibraryEpoch) return undefined
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagDelete(id)
      if (epoch !== latestLibraryEpoch) return undefined
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagMerge(sourceTagId, targetTagId)
      if (epoch !== latestLibraryEpoch) return { success: false, error: '资料库已切换，请重新打开标签。' }
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagCreateAlias(tagId, alias)
      if (epoch !== latestLibraryEpoch) return { success: false, error: '资料库已切换，请重新打开标签。' }
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  removeAlias: async (tagId, alias) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagRemoveAlias(tagId, alias)
      if (epoch !== latestLibraryEpoch) return { success: false, error: '资料库已切换，请重新打开标签。' }
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  setParent: async (tagId, parentId) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.tagSetParent(tagId, parentId)
      if (epoch !== latestLibraryEpoch) return { success: false, error: '资料库已切换，请重新打开标签。' }
      if (res.success) {
        await get().loadTags()
      }
      return res
    }
  },

  // Relations
  loadAssetTags: async (assetId) => {
    const epoch = latestLibraryEpoch
    if (api) {
      try {
        const res = await api.assetTagListByAsset(assetId)
        if (epoch === latestLibraryEpoch && get().selectedAsset?.id === assetId && res.success) {
          set((state) => ({
            assetRelations: {
              ...state.assetRelations,
              [assetId]: res.relations
            }
          }))
        }
      } catch {
        console.error('[Store] Failed to load Asset Tag relations.')
      }
    }
  },

  addTagToAsset: async (assetId, tagId, options) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagAdd(assetId, tagId, options)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  removeTagFromAsset: async (assetId, tagId) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagRemove(assetId, tagId)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  batchAddTagsToAssets: async (assetIds, tagIds, options) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagBatchAdd(assetIds, tagIds, options)
      if (epoch !== latestLibraryEpoch) return
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagBatchRemove(assetIds, tagIds)
      if (epoch !== latestLibraryEpoch) return
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagReplace(assetIds, oldTagId, newTagId)
      if (epoch !== latestLibraryEpoch) return
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
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagConfirmAi(assetTagId)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  rejectAiTag: async (assetTagId, assetId) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.assetTagRejectAi(assetTagId)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssetTags(assetId)
        await get().loadAssets()
        await get().loadTags()
      }
    }
  },

  updateAssetCaption: async (assetId, caption) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.updateAssetCaption(assetId, caption)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssets()
      }
    }
  },

  resetAssetCaptionEdited: async (assetId) => {
    const epoch = latestLibraryEpoch
    if (api) {
      const res = await api.resetAssetCaptionEdited(assetId)
      if (epoch !== latestLibraryEpoch) return
      if (res.success) {
        await get().loadAssets()
      }
    }
  },

  // Real AI tagging trigger. Mock fallbacks are intentionally blocked in product UI.
  generateAiSuggestions: async (assetId, modelsToRun) => {
    if (!api) {
      return { success: false, error: 'Electron API is unavailable.' }
    }

    try {
      const asset = get().assets.find((a: Asset) => a.id === assetId)
      if (!asset) {
        return { success: false, error: 'Asset not found in library.' }
      }

      console.log('[Store] Dispatching tag enqueue to Python AI Worker REST service...')
      const tagRes = await api.aiEnqueueTag(assetId, asset.filePath, 0, modelsToRun)
      if (!tagRes?.success) {
        return {
          success: false,
          error: tagRes?.error || 'Python AI Worker 未连接，已阻止本地 mock 标签写入。'
        }
      }

      const batchRes = await api.aiProcessBatch()
      if (!batchRes?.success) {
        return {
          success: false,
          error: batchRes?.error || 'Python AI Worker 未能启动真实打标批处理。'
        }
      }

      let finalStatus = 'running'
      const startTime = Date.now()
      while (Date.now() - startTime < 45000) {
        await get().loadAssets()
        const updatedAsset = get().assets.find((a: Asset) => a.id === assetId)
        if (updatedAsset) {
          finalStatus = updatedAsset.aiTagStatus
          if (isAiTaskTerminalStatus(finalStatus)) {
            break
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const finalClassification = classifyAiTaskStatus(finalStatus)
      if (finalClassification.isFailure) {
        return { success: false, error: '真实 AI 打标任务失败，请检查 Python Worker 日志和模型依赖。' }
      }

      if (!finalClassification.isSuccess) {
        return { success: false, error: '真实 AI 打标任务超时，未写入 mock 标签。' }
      }

      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: `真实 AI 打标不可用，已阻止 mock fallback：${err?.message || String(err)}`
      }
    } finally {
      await get().loadAssetTags(assetId)
      await get().loadAssets()
      await get().loadTags()
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
