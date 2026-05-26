import { ipcMain } from 'electron'
import { AssetService } from '../services/asset.service'

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
      const saved = service.saveAsset(data.asset, data.tags || [])
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
}
