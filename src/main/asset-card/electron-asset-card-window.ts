import { BrowserWindow } from 'electron'
import type { AssetCardSnapshot } from '../../shared/contracts/asset-card.contract'
import { EVENT_ASSET_CARD_STATE } from '../../shared/contracts/asset-card.contract'
import { isTrustedLibrarySender } from '../trusted-sender'
import type { AssetCardWindow } from './asset-card-controller'

export function createElectronAssetCardWindow(input: { entryUrl: string; preloadPath: string; onClosed(): void }): AssetCardWindow {
  const window = new BrowserWindow({
    width: 440, height: 730, minWidth: 360, minHeight: 450,
    frame: false, transparent: true, roundedCorners: true, show: false,
    alwaysOnTop: true, autoHideMenuBar: true, backgroundColor: '#00000000',
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' as const, visualEffectState: 'active' as const } : {}),
    webPreferences: { preload: input.preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  let latest: AssetCardSnapshot | null = null
  const frame = window.webContents.mainFrame
  const publish = () => { if (!window.isDestroyed() && !window.webContents.isLoadingMainFrame()) window.webContents.send(EVENT_ASSET_CARD_STATE, latest) }
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  window.webContents.on('did-finish-load', publish)
  window.once('ready-to-show', () => { if (!window.isDestroyed()) window.show() })
  window.once('closed', input.onClosed)
  void window.loadURL(`${input.entryUrl.split('#')[0]}#/asset-card`).catch(() => { if (!window.isDestroyed()) window.close() })
  return {
    publish: state => { latest = state; publish() },
    show: () => { if (!window.isDestroyed() && !window.webContents.isLoadingMainFrame()) { window.show(); window.focus() } },
    setPinned: value => { if (!window.isDestroyed()) window.setAlwaysOnTop(value) },
    // Revoking a Library capability cannot be vetoed by beforeunload in the renderer.
    close: () => { if (!window.isDestroyed()) window.destroy() },
    isTrusted: event => isTrustedLibrarySender(event as Parameters<typeof isTrustedLibrarySender>[0], window, input.entryUrl, frame)
  }
}
