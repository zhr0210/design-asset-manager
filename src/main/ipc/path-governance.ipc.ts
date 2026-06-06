import { ipcMain } from 'electron'
import { getDatabase } from '../db'
import { SettingsService } from '../services/settings.service'
import { createAssetLibraryPathGovernanceReport } from '../path-migration/asset-library-path-governance'
import { createDownloadPathDryRunPlan } from '../path-migration/download-path-governance'
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

export function registerPathGovernanceIpc() {
  ipcMain.handle('assets:path-governance-report', async () => {
    try {
      const db = getDatabase()
      const rows = db.prepare('SELECT id, file_path, thumbnail_path FROM assets').all() as Array<{
        id: string
        file_path: string | null | undefined
        thumbnail_path?: string | null
      }>

      const samples = rows.map((row) => ({
        assetId: row.id,
        filePath: row.file_path,
        thumbnailPath: row.thumbnail_path
      }))

      return createAssetLibraryPathGovernanceReport(samples)
    } catch (err) {
      console.error('[IPC] assets:path-governance-report error:', err)
      throw err
    }
  })

  ipcMain.handle('downloads:get-path-plan', async (_, requestedFilename: string) => {
    try {
      const settings = SettingsService.getInstance().getSettings()
      const libraryPath = settings.libraryPath || '~/DesignAssetManager/library'

      const resolvedFolder = libraryPath.startsWith('~')
        ? libraryPath.replace('~', homedir())
        : libraryPath

      const absoluteFolder = path.resolve(resolvedFolder)

      let existingFilenames: string[] = []
      if (fs.existsSync(absoluteFolder)) {
        existingFilenames = fs.readdirSync(absoluteFolder)
      }

      const plan = createDownloadPathDryRunPlan({
        downloadsRoot: absoluteFolder,
        requestedFilename,
        existingFilenames
      })
      return plan
    } catch (err) {
      console.error('[IPC] downloads:get-path-plan error:', err)
      throw err
    }
  })
}
