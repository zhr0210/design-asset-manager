import { ipcMain } from 'electron'
import { SearchService } from '../services/search.service'

export function registerSearchIpc() {
  const service = new SearchService()

  ipcMain.handle('search:run', async (_, params: { siteId: string; keyword: string }) => {
    try {
      console.log(`[IPC] search:run - Running query: "${params.keyword}" for site: ${params.siteId}`)
      const results = await service.runSearch(params.siteId, params.keyword)
      return { success: true, results }
    } catch (err) {
      console.error('[IPC] search:run error:', err)
      return { success: false, error: String(err), results: [] }
    }
  })
}
