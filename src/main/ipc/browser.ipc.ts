import { ipcMain } from 'electron'
import { EmbeddedBrowserManager } from '../services/browser-view.manager'
import { GenericImageExtractorPlugin } from '../plugins/generic-image-extractor.plugin'
import { ExtractContext } from '../plugins/types'

export function registerBrowserIpc() {
  const manager = EmbeddedBrowserManager.getInstance()
  const extractor = new GenericImageExtractorPlugin()

  // 1. Browser controls IPC handlers
  ipcMain.handle('browser:load-url', async (_, { url, siteId }) => {
    try {
      await manager.loadUrl(url, siteId)
      return { success: true }
    } catch (err) {
      console.error('[IPC] browser:load-url error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('browser:go-back', async () => {
    manager.goBack()
    return { success: true }
  })

  ipcMain.handle('browser:go-forward', async () => {
    manager.goForward()
    return { success: true }
  })

  ipcMain.handle('browser:reload', async () => {
    manager.reload()
    return { success: true }
  })

  ipcMain.handle('browser:stop', async () => {
    manager.stop()
    return { success: true }
  })

  ipcMain.handle('browser:resize', async (_, bounds) => {
    manager.resize(bounds)
    return { success: true }
  })

  ipcMain.handle('browser:hide', async () => {
    manager.hide()
    return { success: true }
  })

  ipcMain.handle('browser:show', async () => {
    manager.show()
    return { success: true }
  })

  // 2. Extractor scan IPC handler
  ipcMain.handle('extractor:scan-current-page', async () => {
    try {
      const webContents = manager.getWebContents()
      if (!webContents) {
        throw new Error('未发现正在运行的浏览器视图上下文')
      }

      const currentUrl = webContents.getURL()
      const pageTitle = webContents.getTitle()

      // Define execution context for the extraction plugin
      const context: ExtractContext = {
        currentUrl,
        pageTitle,
        executeJavaScript: <T>(code: string): Promise<T> => {
          return webContents.executeJavaScript(code)
        }
      }

      const extracted = await extractor.extractAssets(context)
      console.log(`[IPC] Successfully scanned page and identified ${extracted.length} image assets`)
      return extracted
    } catch (err) {
      console.error('[IPC] extractor:scan-current-page error:', err)
      throw err
    }
  })
}
