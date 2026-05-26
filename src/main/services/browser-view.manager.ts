import { BrowserWindow, WebContentsView } from 'electron'

export class EmbeddedBrowserManager {
  private static instance: EmbeddedBrowserManager
  private mainWindow: BrowserWindow | null = null
  private activeView: WebContentsView | null = null
  private activeSiteId: string = ''
  private isVisible: boolean = false
  private bounds = { x: 0, y: 0, width: 0, height: 0 }

  private constructor() {}

  public static getInstance(): EmbeddedBrowserManager {
    if (!EmbeddedBrowserManager.instance) {
      EmbeddedBrowserManager.instance = new EmbeddedBrowserManager()
    }
    return EmbeddedBrowserManager.instance
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  public getWebContents() {
    return this.activeView ? this.activeView.webContents : null
  }

  public createView(siteId: string): WebContentsView {
    if (this.activeView) {
      this.hide()
      // Remove all listeners to prevent memory leak
      try {
        this.activeView.webContents.removeAllListeners()
      } catch (e) {
        // Safe ignore
      }
    }

    this.activeSiteId = siteId
    
    console.log(`[BrowserManager] Creating isolated WebContentsView partition: persist:site-${siteId}`)
    
    // Instantiate a new WebContentsView with partition-based sandboxed environment
    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:site-${siteId}`,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    })

    this.activeView = view

    // Hook navigation state updates
    const web = view.webContents
    
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
      this.mainWindow.contentView.addChildView(this.activeView)
      this.activeView.setBounds(this.bounds)
    } catch (err) {
      console.error('[BrowserManager] Failed to mount WebContentsView:', err)
    }
  }

  public hide() {
    this.isVisible = false
    if (!this.mainWindow || !this.activeView) return

    try {
      this.mainWindow.contentView.removeChildView(this.activeView)
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
