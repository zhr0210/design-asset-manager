import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './db'
import { registerSiteIpc } from './ipc/site.ipc'
import { ColorPaletteService } from './services/color-palette.service'
import { registerAssetIpc } from './ipc/asset.ipc'
import { registerDownloadIpc } from './ipc/download.ipc'
import { registerSearchIpc } from './ipc/search.ipc'
import { registerBrowserIpc } from './ipc/browser.ipc'
import { registerTagIpc } from './ipc/tag.ipc'
import { registerAssetTagIpc } from './ipc/asset-tag.ipc'
import { registerAiClientIpc } from './ipc/ai-client.ipc'
import { registerColorPaletteIpc } from './ipc/color-palette.ipc'
import { EmbeddedBrowserManager } from './services/browser-view.manager'
import { ImageMetadataService } from './services/image-metadata.service'

// Register local-file scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.cjs')

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
      preload: preloadPath,
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
    
    // Automatically scan and extract color palettes for legacy assets that lack them
    ColorPaletteService.runStartupBatchScanner().catch((err) => {
      console.error('[ColorPaletteService] Failed to launch startup batch scanner:', err)
    })
  } catch (err) {
    console.error('[SQLite] Failed to initialize database:', err)
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.antigravity.designassetmanager')
  }

  app.on('browser-window-created', (_, window) => {
    window.setMenuBarVisibility(false)
  })

  // Register local-file protocol handler using modern Electron protocol.handle API
  protocol.handle('local-file', (request) => {
    try {
      let urlPath = request.url.replace('local-file://', '')
      if (urlPath.startsWith('/')) {
        urlPath = urlPath.slice(1)
      }
      const decodedPath = decodeURIComponent(urlPath)
      const absolutePath = ImageMetadataService.resolvePath(decodedPath)
      return net.fetch(pathToFileURL(absolutePath).toString())
    } catch (err) {
      console.error('[Protocol] Failed to handle local-file request:', err)
      return new Response('Not Found', { status: 404 })
    }
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

import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerOcrHealthcheckIpc } from './ipc/ocr-healthcheck.ipc'
import { registerOcrIpc } from './ipc/ocr.ipc'
import { registerAiWorkerIpc } from './ipc/ai-worker.ipc'
import { registerAiModelIpc } from './ipc/ai-model.ipc'
import { registerAiBackendIpc } from './ipc/ai-backend.ipc'
import { registerLlamaRuntimeIpc } from './ipc/llama-runtime.ipc'
import { registerDoctorIpc } from './ipc/doctor.ipc'
import { registerAiRuntimeIpc } from './ipc/ai-runtime.ipc'

function setupIpcHandlers() {
  // Register database IPC handlers
  registerSiteIpc()
  registerAssetIpc()
  registerDownloadIpc()
  registerSearchIpc()
  registerBrowserIpc()
  registerTagIpc()
  registerAssetTagIpc()
  registerAiClientIpc()
  registerColorPaletteIpc()
  registerSettingsIpc()
  registerOcrHealthcheckIpc()
  registerOcrIpc()
  registerAiWorkerIpc()
  registerAiModelIpc()
  registerAiBackendIpc()
  registerLlamaRuntimeIpc()
  registerDoctorIpc()
  registerAiRuntimeIpc()
}
