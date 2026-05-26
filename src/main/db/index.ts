import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import * as schema from './schema'

let db: Database.Database

export function initDatabase(): Database.Database {
  // Resolve base workspace library directory: ~/DesignAssetManager
  const baseDir = join(homedir(), 'DesignAssetManager')
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true })
  }

  // Resolve DB file path
  const dbPath = join(baseDir, 'design_asset_manager.db')
  console.log(`[SQLite] Connecting to SQLite DB at: ${dbPath}`)

  // Open SQLite database
  db = new Database(dbPath, { verbose: console.log })
  db.pragma('foreign_keys = ON')

  // Run Migrations / Schema setups
  db.transaction(() => {
    db.prepare(schema.CREATE_SITES_TABLE).run()
    db.prepare(schema.CREATE_ASSETS_TABLE).run()
    db.prepare(schema.CREATE_TAGS_TABLE).run()
    db.prepare(schema.CREATE_ASSET_TAGS_TABLE).run()
    db.prepare(schema.CREATE_DOWNLOAD_TASKS_TABLE).run()

    // Create performance indexes
    for (const createIndexSql of schema.CREATE_INDEXES) {
      db.prepare(createIndexSql).run()
    }
  })()

  // Run dynamic migrations to ensure backward compatibility
  try {
    const assetsInfo = db.prepare("PRAGMA table_info(assets)").all() as Array<{ name: string }>
    const assetsCols = assetsInfo.map((c) => c.name)

    if (!assetsCols.includes('browser_page_title')) {
      console.log('[SQLite] Migration: Adding browser_page_title to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN browser_page_title TEXT").run()
    }
    if (!assetsCols.includes('capture_method')) {
      console.log('[SQLite] Migration: Adding capture_method to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN capture_method TEXT").run()
    }

    const downloadTasksInfo = db.prepare("PRAGMA table_info(download_tasks)").all() as Array<{ name: string }>
    const downloadTasksCols = downloadTasksInfo.map((c) => c.name)

    if (!downloadTasksCols.includes('source_site_name')) {
      console.log('[SQLite] Migration: Adding source_site_name to download_tasks table')
      db.prepare("ALTER TABLE download_tasks ADD COLUMN source_site_name TEXT").run()
    }
    if (!downloadTasksCols.includes('browser_page_title')) {
      console.log('[SQLite] Migration: Adding browser_page_title to download_tasks table')
      db.prepare("ALTER TABLE download_tasks ADD COLUMN browser_page_title TEXT").run()
    }
    if (!downloadTasksCols.includes('capture_method')) {
      console.log('[SQLite] Migration: Adding capture_method to download_tasks table')
      db.prepare("ALTER TABLE download_tasks ADD COLUMN capture_method TEXT").run()
    }
  } catch (migErr) {
    console.error('[SQLite] Failed to run database migrations:', migErr)
  }

  // Seed default sites if sites table is empty
  const sitesCount = (db.prepare('SELECT COUNT(*) as count FROM sites').get() as { count: number }).count
  if (sitesCount === 0) {
    console.log('[SQLite] Sites table is empty. Seeding default configurations...')
    const insertSite = db.prepare(`
      INSERT INTO sites (id, name, base_url, search_url_template, requires_auth, auth_status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = new Date().toISOString()
    db.transaction(() => {
      for (const site of schema.SEED_SITES) {
        insertSite.run(
          site.id,
          site.name,
          site.base_url,
          site.search_url_template,
          site.requires_auth,
          site.auth_status,
          site.notes,
          now,
          now
        )
      }
    })()
  }

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Please call initDatabase() first.')
  }
  return db
}
