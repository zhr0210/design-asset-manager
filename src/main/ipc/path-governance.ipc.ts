import { ipcMain } from 'electron'
import { getDatabase } from '../db'
import { SettingsService } from '../services/settings.service'
import { createAssetLibraryPathGovernanceReport } from '../path-migration/asset-library-path-governance'
import { createDownloadPathDryRunPlan } from '../path-migration/download-path-governance'
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'
import { resolveManagedPaths } from '../platform/path-resolver'
import { PathMigrationExecutor } from '../path-migration/path-migration-executor'
import { ImageMetadataService } from '../services/image-metadata.service'

export function registerPathGovernanceIpc() {
  ipcMain.handle('assets:path-migration-report', async () => {
    try {
      const db = getDatabase()
      const managedPaths = resolveManagedPaths()
      
      const assets = db.prepare('SELECT id, thumbnail_path, normalized_path FROM assets').all() as Array<{
        id: string
        thumbnail_path: string | null
        normalized_path: string | null
      }>

      let affectedRows = 0
      const missingFiles: Array<{ assetId: string; filePath: string }> = []
      const proposedMappings: Array<{ original: string; proposed: string; isCollision: boolean }> = []
      const collisions: Array<{ filePath: string; conflictingAssetId: string }> = []

      for (const asset of assets) {
        const needsThumb = !!(asset.thumbnail_path && !asset.thumbnail_path.startsWith('cache://'))
        const needsNorm = !!(asset.normalized_path && !asset.normalized_path.startsWith('cache://'))

        if (needsThumb || needsNorm) {
          affectedRows++
        }

        if (needsThumb && asset.thumbnail_path) {
          const original = asset.thumbnail_path
          const basename = path.basename(original)
          const proposed = `cache://thumbnail/${asset.id}/${basename}`
          
          let srcFile = ImageMetadataService.resolvePath(original)
          let exists = fs.existsSync(srcFile)
          if (!exists) {
            const fallback = path.join(homedir(), 'DesignAssetManager', 'library', 'thumbnails', basename)
            if (fs.existsSync(fallback)) {
              exists = true
              srcFile = fallback
            }
          }

          if (!exists) {
            missingFiles.push({ assetId: asset.id, filePath: original })
          }

          const destFile = path.join(managedPaths.cacheDir, 'thumbnail', asset.id, basename)
          const isCollision = fs.existsSync(destFile)
          if (isCollision) {
            collisions.push({ filePath: destFile, conflictingAssetId: asset.id })
          }

          proposedMappings.push({
            original,
            proposed,
            isCollision
          })
        }

        if (needsNorm && asset.normalized_path) {
          const original = asset.normalized_path
          const basename = path.basename(original)
          const proposed = `cache://normalized-image/${asset.id}/${basename}`
          
          let srcFile = ImageMetadataService.resolvePath(original)
          let exists = fs.existsSync(srcFile)
          if (!exists) {
            const fallback = path.join(homedir(), 'DesignAssetManager', 'library', 'normalized', basename)
            if (fs.existsSync(fallback)) {
              exists = true
              srcFile = fallback
            }
          }

          if (!exists) {
            missingFiles.push({ assetId: asset.id, filePath: original })
          }

          const destFile = path.join(managedPaths.cacheDir, 'normalized-image', asset.id, basename)
          const isCollision = fs.existsSync(destFile)
          if (isCollision) {
            collisions.push({ filePath: destFile, conflictingAssetId: asset.id })
          }

          proposedMappings.push({
            original,
            proposed,
            isCollision
          })
        }
      }

      return {
        success: true,
        report: {
          affectedRows,
          missingFiles,
          proposedMappings,
          collisions
        }
      }
    } catch (err: any) {
      console.error('[IPC] assets:path-migration-report error:', err)
      return {
        success: false,
        error: err?.message || String(err)
      }
    }
  })

  ipcMain.handle('assets:apply-path-migration', async (_, options?: { deleteLegacyFiles?: boolean }) => {
    try {
      const db = getDatabase()
      const managedPaths = resolveManagedPaths()
      const executor = new PathMigrationExecutor(db, managedPaths)
      const res = await executor.executeMigration({ deleteLegacyFiles: options?.deleteLegacyFiles })
      return { success: true, migratedCount: res.migratedCount }
    } catch (err: any) {
      console.error('[IPC] assets:apply-path-migration error:', err)
      return { success: false, error: err?.message || String(err) }
    }
  })

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
