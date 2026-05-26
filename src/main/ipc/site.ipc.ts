import { ipcMain } from 'electron'
import { SiteService } from '../services/site.service'
import { PlaywrightService } from '../services/playwright.service'

export function registerSiteIpc() {
  const service = new SiteService()

  ipcMain.handle('sites:list', async () => {
    try {
      return service.listSites()
    } catch (err) {
      console.error('[IPC] sites:list error:', err)
      throw err
    }
  })

  ipcMain.handle('sites:save', async (_, site: any) => {
    try {
      const mappedSite = {
        ...site,
        requires_auth: site.requiresAuth ? 1 : 0
      }
      const saved = service.saveSite(mappedSite)
      return { success: true, site: saved }
    } catch (err) {
      console.error('[IPC] sites:save error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('sites:delete', async (_, id: string) => {
    try {
      service.deleteSite(id)
      return { success: true, id }
    } catch (err) {
      console.error('[IPC] sites:delete error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('sites:login:start', async (_, siteId: string) => {
    try {
      const sites = service.listSites()
      const site = sites.find((s) => s.id === siteId)
      if (!site) {
        return { success: false, error: `Site config not found for: ${siteId}` }
      }

      console.log(`[IPC] sites:login:start - Launching Chrome window for site: ${siteId} (${site.base_url})`)
      const playwrightService = new PlaywrightService()
      await playwrightService.startLogin(siteId, site.base_url)
      return { success: true }
    } catch (err) {
      console.error('[IPC] sites:login:start error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('sites:login:complete', async (_, siteId: string) => {
    try {
      console.log(`[IPC] sites:login:complete - Fetching session cookies and completing auth for site: ${siteId}`)
      const playwrightService = new PlaywrightService()
      const authStatePath = await playwrightService.completeLogin(siteId)

      service.updateSiteAuth(siteId, authStatePath, 'logged')
      return { success: true, status: 'logged' }
    } catch (err) {
      console.error('[IPC] sites:login:complete error:', err)
      return { success: false, error: String(err) }
    }
  })
}
