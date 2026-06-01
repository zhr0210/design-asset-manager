import { BrowserWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { createBrowserPreviewInjectionScript } from './browser-preview-injection'

export class EmbeddedBrowserManager {
  private static instance: EmbeddedBrowserManager
  private mainWindow: BrowserWindow | null = null
  private activeView: WebContentsView | null = null
  private activeSiteId: string = ''
  private isVisible: boolean = false
  private isMounted: boolean = false
  private bounds = { x: 0, y: 0, width: 0, height: 0 }
  
  // Track the currently hovered original image metadata globally in the main process
  private activeHoveredAsset: any = null

  private constructor() {}

  public static getInstance(): EmbeddedBrowserManager {
    if (!EmbeddedBrowserManager.instance) {
      EmbeddedBrowserManager.instance = new EmbeddedBrowserManager()
    }
    return EmbeddedBrowserManager.instance
  }

  public setActiveHoveredAsset(asset: any) {
    this.activeHoveredAsset = asset
  }

  public getActiveHoveredAsset() {
    return this.activeHoveredAsset
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window

    // Captures S/s key at the main OS window boundary to download the active hovered original image
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.key.toLowerCase() === 's' || input.code.toLowerCase() === 'keys')) {
        const asset = this.activeHoveredAsset
        if (asset) {
          event.preventDefault()
          this.triggerDownload(asset)
        }
      }
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public triggerDownload(asset: any) {
    console.log('[Download] S key triggered download:', asset.url)
    if (!this.mainWindow) {
      console.warn('[Download] Cancelled: mainWindow is null')
      return
    }
    try {
      const urlObj = new URL(asset.sourcePageUrl)
      const domain = urlObj.hostname.replace('www.', '')
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1)

      this.mainWindow.webContents.send('download:injected-trigger', {
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

      // Send immediate tactile visual feedback to the guest view
      if (this.activeView) {
        this.activeView.webContents.executeJavaScript(`
          (function() {
            const sizeEl = document.getElementById('photoshow-injected-preview-size');
            if (sizeEl) {
              const prevSizeText = sizeEl.textContent;
              sizeEl.textContent = '鈿?宸插惎鍔ㄥ師鍥句笅杞?..';
              sizeEl.style.color = '#34d399';
              setTimeout(() => {
                sizeEl.textContent = prevSizeText;
                sizeEl.style.color = 'rgba(255, 255, 255, 0.7)';
              }, 1500);
            }
          })()
        `).catch(console.error)
      }
    } catch (err) {
      console.error('[BrowserManager] triggerDownload error:', err)
    }
  }

  public getWebContents() {
    return this.activeView ? this.activeView.webContents : null
  }

  public createView(siteId: string): WebContentsView {
    if (this.activeView) {
      this.hide()
      this.isMounted = false
      // Remove all listeners to prevent memory leak
      try {
        this.activeView.webContents.removeAllListeners()
      } catch (e) {
        // Safe ignore
      }
    }

    this.activeSiteId = siteId
    
    const preloadPath = join(__dirname, '../preload/browser.cjs')

    
    // Instantiate a new WebContentsView with secure partition-based sandboxed environment and restricted preload script
    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:site-${siteId}`,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        preload: preloadPath
      }
    })

    this.activeView = view

    // PhotoShow-like image hover zoom is injected directly via executeJavaScript
    // in the dom-ready handler below (no Chrome extension needed)

    // Hook navigation state updates and DOM injects
    const web = view.webContents

    web.on('console-message', (event, level, message, line, sourceId) => {

    })
    
    // Captures S/s key at the guest view boundary to download the active hovered original image
    web.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.key.toLowerCase() === 's' || input.code.toLowerCase() === 'keys')) {
        const asset = this.activeHoveredAsset
        if (asset) {
          event.preventDefault()
          this.triggerDownload(asset)
        }
      }
    })
    
    const sendState = () => {
      if (!this.mainWindow || this.activeView !== view) return
      
      try {
        this.mainWindow.webContents.send('browser:state-change', {
          url: web.getURL(),
          title: web.getTitle(),
          canGoBack: web.canGoBack(),
          canGoForward: web.canGoForward(),
          isLoading: web.isLoading()
        })
      } catch (e) {
        // Window might be closing, ignore
      }
    }

    web.on('did-start-loading', sendState)
    web.on('did-stop-loading', sendState)
    web.on('did-finish-load', sendState)
    web.on('did-navigate', sendState)
    web.on('did-navigate-in-page', sendState)
    web.on('page-title-updated', (_event, title) => {
      if (!this.mainWindow || this.activeView !== view) return
      try {
        this.mainWindow.webContents.send('browser:state-change', {
          url: web.getURL(),
          title: title,
          canGoBack: web.canGoBack(),
          canGoForward: web.canGoForward(),
          isLoading: web.isLoading()
        })
      } catch (e) {}
    })

    // Secure external links (force target="_blank" tags to default system browser)
    web.setWindowOpenHandler((details) => {
      const { shell } = require('electron')
      shell.openExternal(details.url).catch(console.error)
      return { action: 'deny' }
    })

    // Automatically inject our highly responsive floating download button script and premium hover zoom script when DOM is ready
    web.on('dom-ready', () => {

      const injectorScript = createBrowserPreviewInjectionScript()
      web.executeJavaScript(injectorScript).catch(console.error)
    })

    // If browser view was already active/visible, mount it immediately
    if (this.isVisible && this.mainWindow) {
      this.show()
    }

    return view
  }

  public show() {
    this.isVisible = true

    if (!this.mainWindow || !this.activeView) return

    try {
      if (!this.isMounted) {

        this.mainWindow.contentView.addChildView(this.activeView)
        this.isMounted = true
      }

      this.activeView.setBounds(this.bounds)
    } catch (err) {
      console.error('[BrowserManager] Failed to mount WebContentsView:', err)
    }
  }

  public hide() {
    this.isVisible = false

    if (!this.mainWindow || !this.activeView) return

    try {
      if (this.isMounted) {

        this.mainWindow.contentView.removeChildView(this.activeView)
        this.isMounted = false
      }
    } catch (err) {
      // View might already be detached, safe warn
      console.warn('[BrowserManager] Failed to detach WebContentsView:', err)
    }
  }

  public resize(bounds: { x: number; y: number; width: number; height: number }) {

    this.bounds = bounds
    if (this.activeView && this.isVisible) {
      try {

        this.activeView.setBounds(bounds)
      } catch (e) {
        console.error('[BrowserManager] Failed to set bounds:', e)
      }
    }
  }

  public async loadUrl(url: string, siteId: string) {

    // Recreate view if target site partition changes, or view hasn't been instantiated yet
    if (siteId !== this.activeSiteId || !this.activeView) {

      this.createView(siteId)
    }

    if (this.activeView) {
      try {

        await this.activeView.webContents.loadURL(url)
      } catch (err) {
        console.error(`[BrowserManager] Failed to load URL "${url}":`, err)
      }
    } else {
      console.error('[BrowserManager] loadUrl() failed: activeView is null')
    }
  }

  public goBack() {
    if (this.activeView && this.activeView.webContents.canGoBack()) {
      this.activeView.webContents.goBack()
    }
  }

  public goForward() {
    if (this.activeView && this.activeView.webContents.canGoForward()) {
      this.activeView.webContents.goForward()
    }
  }

  public reload() {
    if (this.activeView) {
      this.activeView.webContents.reload()
    }
  }

  public stop() {
    if (this.activeView) {
      this.activeView.webContents.stop()
    }
  }
}
