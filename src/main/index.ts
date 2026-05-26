import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerSiteIpc } from './ipc/site.ipc'
import { registerAssetIpc } from './ipc/asset.ipc'
import { registerDownloadIpc } from './ipc/download.ipc'
import { registerSearchIpc } from './ipc/search.ipc'
import { registerBrowserIpc } from './ipc/browser.ipc'
import { EmbeddedBrowserManager } from './services/browser-view.manager'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Design Asset Manager',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Register main window inside our EmbeddedBrowserManager singleton
  EmbeddedBrowserManager.getInstance().setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize SQLite database
  try {
    initDatabase()
    console.log('[SQLite] Database successfully loaded.')
  } catch (err) {
    console.error('[SQLite] Failed to initialize database:', err)
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.antigravity.designassetmanager')
  }

  app.on('browser-window-created', (_, window) => {
    window.setMenuBarVisibility(false)
  })

  setupIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers() {
  // Register database IPC handlers
  registerSiteIpc()
  registerAssetIpc()
  registerDownloadIpc()
  registerSearchIpc()
  registerBrowserIpc()
}
