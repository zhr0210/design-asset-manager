import { ipcMain } from 'electron'
import { AssetService } from '../services/asset.service'
import { getDatabase } from '../db'
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

const customCategoriesPath = path.join(homedir(), 'DesignAssetManager', 'custom_categories.json')

function getCustomCategories(): Record<string, string> {
  try {
    if (fs.existsSync(customCategoriesPath)) {
      const content = fs.readFileSync(customCategoriesPath, 'utf8')
      return JSON.parse(content)
    }
  } catch (err) {
    console.error('[AssetIPC] Failed to read custom categories:', err)
  }
  return {}
}

function saveCustomCategory(assetId: string, category: string): void {
  try {
    const data = getCustomCategories()
    data[assetId] = category
    fs.mkdirSync(path.dirname(customCategoriesPath), { recursive: true })
    fs.writeFileSync(customCategoriesPath, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('[AssetIPC] Failed to save custom category:', err)
  }
}

export function registerAssetIpc() {
  const service = new AssetService()

  ipcMain.handle('assets:list', async (_, filters?: { keyword?: string; siteId?: string; tagName?: string }) => {
    try {
      return service.listAssets(filters)
    } catch (err) {
      console.error('[IPC] assets:list error:', err)
      throw err
    }
  })

  ipcMain.handle('assets:save', async (_, data: { asset: any; tags?: string[] }) => {
    try {
      const saved = await service.saveAsset(data.asset, data.tags || [])
      return { success: true, asset: saved }
    } catch (err) {
      console.error('[IPC] assets:save error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('assets:delete', async (_, id: string) => {
    try {
      service.deleteAsset(id)
      return { success: true, id }
    } catch (err) {
      console.error('[IPC] assets:delete error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('assets:save-custom-category', async (_, { assetId, category }: { assetId: string; category: string }) => {
    try {
      saveCustomCategory(assetId, category)
      return { success: true }
    } catch (err) {
      console.error('[IPC] assets:save-custom-category error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('assets:get-custom-category', async (_, assetId: string) => {
    try {
      const data = getCustomCategories()
      return { success: true, category: data[assetId] || null }
    } catch (err) {
      console.error('[IPC] assets:get-custom-category error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('assets:update-caption', async (_, { assetId, caption }: { assetId: string; caption: string }) => {
    try {
      const db = getDatabase()
      const now = new Date().toISOString()
      db.prepare(`
        UPDATE assets
        SET ai_caption = ?, ai_caption_is_user_edited = 1, ai_caption_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).run(caption, now, now, assetId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] assets:update-caption error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('assets:reset-caption-edited', async (_, { assetId }: { assetId: string }) => {
    try {
      const db = getDatabase()
      const now = new Date().toISOString()
      db.prepare(`
        UPDATE assets
        SET ai_caption_is_user_edited = 0, ai_caption_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, assetId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] assets:reset-caption-edited error:', err)
      return { success: false, error: String(err) }
    }
  })
}

