import Database from 'better-sqlite3'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import type { ManagedPaths } from '../../shared/types/platform.types'
import { ImageMetadataService } from '../services/image-metadata.service'
import { setDatabase } from '../db/index'

export interface MigrationJournal {
  status: 'initialized' | 'db_backed_up' | 'file_copy_in_progress' | 'file_copy_completed' | 'db_updated' | 'completed' | 'failed'
  backupPath?: string
  copiedFiles: Array<{
    source: string
    dest: string
  }>
  error?: string
}

export class PathMigrationExecutor {
  private db: Database.Database
  private managedPaths: ManagedPaths
  private journalPath: string
  private journal: MigrationJournal

  constructor(db: Database.Database, managedPaths: ManagedPaths) {
    this.db = db
    this.managedPaths = managedPaths
    this.journalPath = path.join(this.managedPaths.tempDir, 'migration-journal.json')
    this.journal = {
      status: 'initialized',
      copiedFiles: []
    }
  }

  public getDb(): Database.Database {
    return this.db
  }

  private async writeJournal(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.journalPath), { recursive: true })
      await fs.writeFile(this.journalPath, JSON.stringify(this.journal, null, 2), 'utf8')
    } catch (err) {
      console.warn('[PathMigrationExecutor] Failed to write journal file:', err)
    }
  }

  public getJournal(): MigrationJournal {
    return this.journal
  }

  public async executeMigration(options?: { deleteLegacyFiles?: boolean }): Promise<{ success: boolean; migratedCount: number }> {
    try {
      // 1. Write initial journal
      await this.writeJournal()

      // 2. Perform atomic database backup using SQLite's native db.backup(backupPath)
      const backupsDir = path.join(this.managedPaths.userDataDir, 'backups')
      await fs.mkdir(backupsDir, { recursive: true })
      const backupPath = path.join(backupsDir, `backup_${Date.now()}.db`)
      await this.db.backup(backupPath)

      this.journal.status = 'db_backed_up'
      this.journal.backupPath = backupPath
      await this.writeJournal()

      // 3. Retrieve assets to migrate
      const assets = this.db.prepare('SELECT id, thumbnail_path, normalized_path FROM assets').all() as Array<{
        id: string
        thumbnail_path: string | null
        normalized_path: string | null
      }>

      const toMigrate: Array<{
        id: string
        thumbnailPath: string | null
        normalizedPath: string | null
        needsThumb: boolean
        needsNorm: boolean
      }> = []

      for (const asset of assets) {
        const needsThumb = !!(asset.thumbnail_path && !asset.thumbnail_path.startsWith('cache://'))
        const needsNorm = !!(asset.normalized_path && !asset.normalized_path.startsWith('cache://'))
        if (needsThumb || needsNorm) {
          toMigrate.push({
            id: asset.id,
            thumbnailPath: asset.thumbnail_path,
            normalizedPath: asset.normalized_path,
            needsThumb,
            needsNorm
          })
        }
      }

      if (toMigrate.length === 0) {
        this.journal.status = 'completed'
        await this.writeJournal()
        return { success: true, migratedCount: 0 }
      }

      this.journal.status = 'file_copy_in_progress'
      await this.writeJournal()

      // 4. Copy files from their current location to the new cache location
      for (const asset of toMigrate) {
        if (asset.needsThumb && asset.thumbnailPath) {
          let srcFile = ImageMetadataService.resolvePath(asset.thumbnailPath)
          if (!existsSync(srcFile)) {
            const fallback = path.join(homedir(), 'DesignAssetManager', 'library', 'thumbnails', path.basename(asset.thumbnailPath))
            if (existsSync(fallback)) {
              srcFile = fallback
            } else {
              throw new Error(`Thumbnail file not found for asset ${asset.id}`)
            }
          }
          const filename = path.basename(srcFile)
          const destDir = path.join(this.managedPaths.cacheDir, 'thumbnail', asset.id)
          const destFile = path.join(destDir, filename)

          await fs.mkdir(destDir, { recursive: true })
          await fs.copyFile(srcFile, destFile)
          this.journal.copiedFiles.push({ source: srcFile, dest: destFile })
          await this.writeJournal()
        }

        if (asset.needsNorm && asset.normalizedPath) {
          let srcFile = ImageMetadataService.resolvePath(asset.normalizedPath)
          if (!existsSync(srcFile)) {
            const fallback = path.join(homedir(), 'DesignAssetManager', 'library', 'normalized', path.basename(asset.normalizedPath))
            if (existsSync(fallback)) {
              srcFile = fallback
            } else {
              throw new Error(`Normalized image file not found for asset ${asset.id}`)
            }
          }
          const filename = path.basename(srcFile)
          const destDir = path.join(this.managedPaths.cacheDir, 'normalized-image', asset.id)
          const destFile = path.join(destDir, filename)

          await fs.mkdir(destDir, { recursive: true })
          await fs.copyFile(srcFile, destFile)
          this.journal.copiedFiles.push({ source: srcFile, dest: destFile })
          await this.writeJournal()
        }
      }

      this.journal.status = 'file_copy_completed'
      await this.writeJournal()

      // 5. Update SQLite paths inside a single database transaction
      const updateStmt = this.db.prepare('UPDATE assets SET thumbnail_path = ?, normalized_path = ? WHERE id = ?')
      this.db.transaction(() => {
        for (const asset of toMigrate) {
          let finalThumb = asset.thumbnailPath
          let finalNorm = asset.normalizedPath

          if (asset.needsThumb && asset.thumbnailPath) {
            const filename = path.basename(asset.thumbnailPath)
            finalThumb = `cache://thumbnail/${asset.id}/${filename}`
          }
          if (asset.needsNorm && asset.normalizedPath) {
            const filename = path.basename(asset.normalizedPath)
            finalNorm = `cache://normalized-image/${asset.id}/${filename}`
          }

          updateStmt.run(finalThumb, finalNorm, asset.id)
        }
      })()

      this.journal.status = 'db_updated'
      await this.writeJournal()

      // 6. Delete legacy files if deleteLegacyFiles option is set
      if (options?.deleteLegacyFiles) {
        for (const fileOp of this.journal.copiedFiles) {
          try {
            if (existsSync(fileOp.source) && fileOp.source !== fileOp.dest) {
              await fs.unlink(fileOp.source)
            }
          } catch (delErr) {
            console.warn('[PathMigrationExecutor] Failed to delete a legacy migration source:', delErr)
          }
        }
      }

      this.journal.status = 'completed'
      await this.writeJournal()

      return {
        success: true,
        migratedCount: toMigrate.length
      }

    } catch (err: any) {
      console.error(
        '[PathMigrationExecutor] Error during migration:',
        err instanceof Error ? err.message : String(err)
      )
      this.journal.status = 'failed'
      this.journal.error = err?.message || String(err)
      await this.writeJournal()

      await this.rollbackMigration()
      throw err
    }
  }

  public async rollbackMigration(): Promise<void> {
    console.log('[PathMigrationExecutor] Running rollback...')
    // 1. Close active database connection, restore backup, and re-open/re-initialize DB connection
    if (this.journal.backupPath && existsSync(this.journal.backupPath)) {
      const dbPath = this.db.name
      try {
        this.db.close()
      } catch (err) {
        console.warn('[PathMigrationExecutor] Error closing DB during rollback:', err)
      }
      try {
        await fs.copyFile(this.journal.backupPath, dbPath)
        this.db = new Database(dbPath)
        setDatabase(this.db)
      } catch (dbCopyErr) {
        console.error('[PathMigrationExecutor] Failed to restore backup DB file during rollback:', dbCopyErr)
      }
    }

    // 2. Loop over operations in the journal and delete files/directories created in managed-cache
    for (const fileOp of this.journal.copiedFiles) {
      try {
        if (existsSync(fileOp.dest)) {
          await fs.unlink(fileOp.dest)
          console.log('[PathMigrationExecutor] Rolled back one generated cache file.')
        }
        const parentDir = path.dirname(fileOp.dest)
        if (existsSync(parentDir)) {
          const files = await fs.readdir(parentDir)
          if (files.length === 0) {
            await fs.rmdir(parentDir)
            console.log('[PathMigrationExecutor] Removed one empty migration cache directory.')
          }
        }
      } catch (cleanupErr) {
        console.warn('[PathMigrationExecutor] Cleanup failed during migration rollback:', cleanupErr)
      }
    }
  }
}
