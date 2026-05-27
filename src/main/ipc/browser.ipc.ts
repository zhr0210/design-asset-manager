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
      return extracted
    } catch (err) {
      console.error('[IPC] extractor:scan-current-page error:', err)
      throw err
    }
  })

  // 3. Floating download button clicked in-page IPC listener
  ipcMain.on('browser:download-injected', (event, asset) => {
    try {
      console.log(`[IPC] Injected download button clicked for: ${asset.url}`)
      const urlObj = new URL(asset.sourcePageUrl)
      const domain = urlObj.hostname.replace('www.', '')
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1)

      const win = manager.getMainWindow()
      if (win) {
        win.webContents.send('download:injected-trigger', {
          title: asset.title,
          sourceSite: siteName,
          sourcePageUrl: asset.sourcePageUrl,
          downloadUrl: asset.url,
          thumbnailUrl: asset.url,
          width: asset.width,
          height: asset.height,
          browserPageTitle: asset.pageTitle,
          captureMethod: 'browser_extract'
        })
      }
    } catch (err) {
      console.error('[IPC] browser:download-injected error:', err)
    }
  })

  // 4. Request native OS/Electron focus for guest browser view webContents
  ipcMain.on('browser:request-focus', () => {
    try {
      const webContents = manager.getWebContents()
      if (webContents) {
        webContents.focus()
      }
    } catch (err) {
      console.error('[IPC] browser:request-focus error:', err)
    }
  })

  // 5. Track currently hovered original image metadata globally
  ipcMain.on('browser:set-hovered-asset', (_event, asset) => {
    manager.setActiveHoveredAsset(asset)
  })
}
