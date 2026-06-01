import { dialog, ipcMain } from 'electron'
import { SettingsService } from '../services/settings.service'
import { CHANNEL_SETTINGS_LOAD, CHANNEL_SETTINGS_SAVE } from '../../shared/contracts/settings.contract'
import type { AppSettings } from '../../shared/types/settings.types'

export function registerSettingsIpc() {
  const service = SettingsService.getInstance()

  // Load settings
  ipcMain.handle(CHANNEL_SETTINGS_LOAD, async () => {
    try {
      return service.getSettings()
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_LOAD} error:`, err)
      throw err
    }
  })

  // Save settings
  ipcMain.handle(CHANNEL_SETTINGS_SAVE, async (_, newSettings: Partial<AppSettings>) => {
    try {
      return service.saveSettings(newSettings)
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_SAVE} error:`, err)
      throw err
    }
  })

  ipcMain.handle('settings:select-folder', async (_, request?: { defaultPath?: string }) => {
    const result = await dialog.showOpenDialog({
      defaultPath: request?.defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: '' }
    }
    return { canceled: false, path: result.filePaths[0] }
  })
}
