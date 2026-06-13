import { ipcMain } from 'electron'
import { AssetTagService, AssetTagOptions } from '../services/asset-tag.service'
import { TagSearchService } from '../services/tag-search.service'

export function registerAssetTagIpc() {
  const service = new AssetTagService()
  const searchService = new TagSearchService()

  ipcMain.handle('asset-tag:add', async (_, { assetId, tagId, options }: { assetId: string; tagId: string; options?: AssetTagOptions }) => {
    try {
      const rel = service.addTagToAsset(assetId, tagId, options)
      return { success: true, relation: rel }
    } catch (err) {
      console.error('[IPC] asset-tag:add error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:remove', async (_, { assetId, tagId }: { assetId: string; tagId: string }) => {
    try {
      service.removeTagFromAsset(assetId, tagId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:remove error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:batch-add', async (_, { assetIds, tagIds, options }: { assetIds: string[]; tagIds: string[]; options?: AssetTagOptions }) => {
    try {
      service.addTagsToAssets(assetIds, tagIds, options)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:batch-add error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:batch-remove', async (_, { assetIds, tagIds }: { assetIds: string[]; tagIds: string[] }) => {
    try {
      service.removeTagsFromAssets(assetIds, tagIds)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:batch-remove error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:replace', async (_, { assetIds, oldTagId, newTagId }: { assetIds: string[]; oldTagId: string; newTagId: string }) => {
    try {
      service.replaceTagForAssets(assetIds, oldTagId, newTagId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:replace error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:list-by-asset', async (_, assetId: string) => {
    try {
      const relations = service.getTagsForAsset(assetId)
      return { success: true, relations }
    } catch (err) {
      console.error('[IPC] asset-tag:list-by-asset error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:confirm-ai', async (_, assetTagId: string) => {
    try {
      service.confirmAiTag(assetTagId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:confirm-ai error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('asset-tag:reject-ai', async (_, assetTagId: string) => {
    try {
      service.rejectAiTag(assetTagId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] asset-tag:reject-ai error:', err)
      return { success: false, error: String(err) }
    }
  })

  // Tag Search IPC Interfaces
  ipcMain.handle('tag-search:assets', async (_, queries: string[]) => {
    try {
      const assets = searchService.searchAssetsByTags(queries)
      return { success: true, assets }
    } catch (err) {
      console.error('[IPC] tag-search:assets error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag-search:untagged', async () => {
    try {
      const assets = searchService.getUntaggedAssets()
      return { success: true, assets }
    } catch (err) {
      console.error('[IPC] tag-search:untagged error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag-search:ai-pending', async () => {
    try {
      const assets = searchService.getAssetsWithPendingAiTags()
      return { success: true, assets }
    } catch (err) {
      console.error('[IPC] tag-search:ai-pending error:', err)
      return { success: false, error: String(err) }
    }
  })

}
