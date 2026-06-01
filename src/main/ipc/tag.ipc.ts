import { ipcMain } from 'electron'
import { TagService, TagInput } from '../services/tag.service'

export function registerTagIpc() {
  const service = new TagService()

  ipcMain.handle('tag:create', async (_, input: TagInput) => {
    try {
      const tag = service.createTag(input)
      return { success: true, tag }
    } catch (err) {
      console.error('[IPC] tag:create error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:update', async (_, { id, input }: { id: string; input: Partial<TagInput & { aliases: string[]; color: string; isCategory: boolean }> }) => {
    try {
      const tag = service.updateTag(id, input)
      return { success: true, tag }
    } catch (err) {
      console.error('[IPC] tag:update error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:delete', async (_, id: string) => {
    try {
      service.deleteTag(id)
      return { success: true, id }
    } catch (err) {
      console.error('[IPC] tag:delete error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:merge', async (_, { sourceTagId, targetTagId }: { sourceTagId: string; targetTagId: string }) => {
    try {
      service.mergeTags(sourceTagId, targetTagId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] tag:merge error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:get', async (_, id: string) => {
    try {
      const tag = service.getTag(id)
      return { success: true, tag }
    } catch (err) {
      console.error('[IPC] tag:get error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:list', async (_, filter?: { type?: string; searchQuery?: string; isCategory?: boolean }) => {
    try {
      const tags = service.listTags(filter)
      return { success: true, tags }
    } catch (err) {
      console.error('[IPC] tag:list error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:search', async (_, query: string) => {
    try {
      const tags = service.searchTags(query)
      return { success: true, tags }
    } catch (err) {
      console.error('[IPC] tag:search error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:create-alias', async (_, { tagId, alias }: { tagId: string; alias: string }) => {
    try {
      service.createAlias(tagId, alias)
      return { success: true }
    } catch (err) {
      console.error('[IPC] tag:create-alias error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:remove-alias', async (_, { tagId, alias }: { tagId: string; alias: string }) => {
    try {
      service.removeAlias(tagId, alias)
      return { success: true }
    } catch (err) {
      console.error('[IPC] tag:remove-alias error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('tag:set-parent', async (_, { tagId, parentId }: { tagId: string; parentId: string | null }) => {
    try {
      service.setParent(tagId, parentId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] tag:set-parent error:', err)
      return { success: false, error: String(err) }
    }
  })
}
