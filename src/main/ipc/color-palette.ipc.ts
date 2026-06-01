import { ipcMain } from 'electron'
import { ColorPaletteService } from '../services/color-palette.service'

export function registerColorPaletteIpc() {
  const service = new ColorPaletteService()

  // Handler for manual extraction requests
  ipcMain.handle('assets:extract-palette', async (_, { filePath, textBoxes }: { filePath: string; textBoxes?: any[] }) => {
    try {
      return await service.extractPalette(filePath, textBoxes || [])
    } catch (err) {
      console.error('[IPC] assets:extract-palette error:', err)
      throw err
    }
  })

  // Handler to trigger background extraction, SQLite save, and tag suggestions population
  ipcMain.handle('assets:trigger-extract-save', async (_, { assetId, filePath }: { assetId: string; filePath: string }) => {
    try {
      // Await extraction and saving to guarantee SQLite updates are completed before resolving
      await service.extractAndSavePalette(assetId, filePath)
      return { success: true }
    } catch (err) {
      console.error('[IPC] assets:trigger-extract-save error:', err)
      return { success: false, error: String(err) }
    }
  })
}
