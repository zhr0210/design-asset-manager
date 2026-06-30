import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import * as schema from './schema'

let db: Database.Database

// System built-in tags mapping and seed definitions
const TYPE_COLOR_MAP: Record<string, string> = {
  style: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  usage: 'bg-blue-50 text-blue-700 border border-blue-200',
  layout: 'bg-amber-50 text-amber-700 border border-amber-200',
  scene: 'bg-rose-50 text-rose-700 border border-rose-200',
  source: 'bg-slate-100 text-slate-700 border border-slate-200',
  ai: 'bg-purple-50 text-purple-700 border border-purple-200',
  custom: 'bg-pink-50 text-pink-700 border border-pink-200'
}

const SYSTEM_TAGS = [
  // Style
  { type: 'style', name: '新中式' },
  { type: 'style', name: '极简' },
  { type: 'style', name: '科技感' },
  { type: 'style', name: '金融商务' },
  { type: 'style', name: '玻璃拟态' },
  { type: 'style', name: '水墨风' },
  { type: 'style', name: '手绘水彩' },
  { type: 'style', name: '3D立体' },
  { type: 'style', name: '高级感' },
  { type: 'style', name: '轻奢' },
  // Color
  { type: 'color', name: '蓝紫色' },
  { type: 'color', name: '黑金' },
  { type: 'color', name: '红橙色' },
  { type: 'color', name: '深色调' },
  { type: 'color', name: '浅色背景' },
  { type: 'color', name: '低饱和绿色' },
  { type: 'color', name: '暖色调' },
  { type: 'color', name: '冷色调' },
  // Usage
  { type: 'usage', name: 'PPT封面' },
  { type: 'usage', name: '海报' },
  { type: 'usage', name: '金融横图' },
  { type: 'usage', name: '电商banner' },
  { type: 'usage', name: '教学报告封面' },
  { type: 'usage', name: '指示牌' },
  { type: 'usage', name: '长图文' },
  { type: 'usage', name: 'UI设计' },
  { type: 'usage', name: '宣传图' },
  // Layout
  { type: 'layout', name: '左文右图' },
  { type: 'layout', name: '标题居中' },
  { type: 'layout', name: '大面积留白' },
  { type: 'layout', name: '信息密集' },
  { type: 'layout', name: '瀑布流' },
  { type: 'layout', name: '横版构图' },
  { type: 'layout', name: '竖版构图' },
  { type: 'layout', name: '16:9' },
  { type: 'layout', name: '4:3' },
  { type: 'layout', name: 'A4竖版' },
  // Scene
  { type: 'scene', name: '餐厅' },
  { type: 'scene', name: '酒店' },
  { type: 'scene', name: '室内' },
  { type: 'scene', name: '户外' },
  { type: 'scene', name: '山峰' },
  { type: 'scene', name: '城市天际线' },
  { type: 'scene', name: '教室' },
  { type: 'scene', name: '办公场景' },
  // Source
  { type: 'source', name: '网页抓取' },
  { type: 'source', name: '本地导入' },
  { type: 'source', name: 'Pinterest' },
  { type: 'source', name: 'Behance' },
  { type: 'source', name: 'Dribbble' },
  { type: 'source', name: '站酷' },
  { type: 'source', name: '花瓣' },
  { type: 'source', name: 'Freepik' }
]

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

  // Check if tags table needs migration (does it lack 'normalized_name'?)
  let tagsNeedsMigration = false
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tags)").all() as Array<{ name: string }>
    const cols = tableInfo.map((c) => c.name)
    if (cols.length > 0 && !cols.includes('normalized_name')) {
      tagsNeedsMigration = true
    }
  } catch (err) {
    // Table doesn't exist yet
  }

  // Check if asset_tags table needs migration (does it lack 'source'?)
  let assetTagsNeedsMigration = false
  try {
    const tableInfo = db.prepare("PRAGMA table_info(asset_tags)").all() as Array<{ name: string }>
    const cols = tableInfo.map((c) => c.name)
    if (cols.length > 0 && !cols.includes('source')) {
      assetTagsNeedsMigration = true
    }
  } catch (err) {
    // Table doesn't exist yet
  }

  // Run Migrations / Schema setups inside atomic transaction
  db.transaction(() => {
    db.prepare(schema.CREATE_SITES_TABLE).run()
    db.prepare(schema.CREATE_ASSETS_TABLE).run()

    // Handle tags table migration
    if (tagsNeedsMigration) {
      console.log('[SQLite] Migration: Re-creating tags table for advanced constraint schema')
      db.prepare("ALTER TABLE tags RENAME TO tags_old").run()
      db.prepare(schema.CREATE_TAGS_TABLE).run()
      db.prepare(`
        INSERT INTO tags (id, name, normalized_name, slug, type, color, description, is_system, usage_count, created_at, updated_at)
        SELECT id, name, LOWER(TRIM(name)), LOWER(TRIM(name)), 'custom', color, '', 0, 0, created_at, created_at FROM tags_old
      `).run()
      db.prepare("DROP TABLE tags_old").run()
    } else {
      db.prepare(schema.CREATE_TAGS_TABLE).run()
    }

    // Handle asset_tags table migration
    if (assetTagsNeedsMigration) {
      console.log('[SQLite] Migration: Re-creating asset_tags table for detailed tag tracking')
      db.prepare("ALTER TABLE asset_tags RENAME TO asset_tags_old").run()
      db.prepare(schema.CREATE_ASSET_TAGS_TABLE).run()
      db.prepare(`
        INSERT INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_at, updated_at)
        SELECT asset_id || '_' || tag_id, asset_id, tag_id, 'manual', 1.0, 'confirmed', datetime('now'), datetime('now')
        FROM asset_tags_old
      `).run()
      db.prepare("DROP TABLE asset_tags_old").run()
    } else {
      db.prepare(schema.CREATE_ASSET_TAGS_TABLE).run()
    }

    // Create other auxiliary schema tables
    db.prepare(schema.CREATE_TAG_ALIASES_TABLE).run()
    db.prepare(schema.CREATE_TAG_RELATIONS_TABLE).run()
    db.prepare(schema.CREATE_TAG_GROUPS_TABLE).run()
    db.prepare(schema.CREATE_TAG_GROUP_ITEMS_TABLE).run()
    db.prepare(schema.CREATE_TAG_SUGGESTIONS_TABLE).run()
    db.prepare(schema.CREATE_AI_TAG_TASKS_TABLE).run()
    db.prepare(schema.CREATE_AI_PROMPT_TASKS_TABLE).run()
    db.prepare(schema.CREATE_AI_ANALYSIS_TASKS_TABLE).run()
    db.prepare(schema.CREATE_DOWNLOAD_TASKS_TABLE).run()

    // Create performance indexes
    for (const createIndexSql of schema.CREATE_INDEXES) {
      db.prepare(createIndexSql).run()
    }
  })()

  // Run dynamic migrations to ensure backward compatibility and add new fields
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

    // Append AI processing columns
    if (!assetsCols.includes('ai_tag_status')) {
      console.log('[SQLite] Migration: Adding ai_tag_status to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_tag_status TEXT DEFAULT 'not_started'").run()
    }
    if (!assetsCols.includes('ai_tagged_at')) {
      console.log('[SQLite] Migration: Adding ai_tagged_at to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_tagged_at TEXT").run()
    }
    if (!assetsCols.includes('ai_prompt_status')) {
      console.log('[SQLite] Migration: Adding ai_prompt_status to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_prompt_status TEXT DEFAULT 'not_started'").run()
    }
    if (!assetsCols.includes('ai_prompt')) {
      console.log('[SQLite] Migration: Adding ai_prompt to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_prompt TEXT").run()
    }
    if (!assetsCols.includes('ai_caption')) {
      console.log('[SQLite] Migration: Adding ai_caption to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption TEXT").run()
    }
    if (!assetsCols.includes('ai_caption_source')) {
      console.log('[SQLite] Migration: Adding ai_caption_source to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_source TEXT").run()
    }
    if (!assetsCols.includes('ai_caption_updated_at')) {
      console.log('[SQLite] Migration: Adding ai_caption_updated_at to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_updated_at TEXT").run()
    }
    if (!assetsCols.includes('ai_caption_is_user_edited')) {
      console.log('[SQLite] Migration: Adding ai_caption_is_user_edited to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_is_user_edited INTEGER DEFAULT 0").run()
    }
    if (!assetsCols.includes('ai_ocr_text')) {
      console.log('[SQLite] Migration: Adding ai_ocr_text to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_text TEXT").run()
    }
    if (!assetsCols.includes('ai_ocr_source')) {
      console.log('[SQLite] Migration: Adding ai_ocr_source to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_source TEXT").run()
    }
    if (!assetsCols.includes('ai_ocr_updated_at')) {
      console.log('[SQLite] Migration: Adding ai_ocr_updated_at to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_updated_at TEXT").run()
    }
    if (!assetsCols.includes('ai_analysis_status')) {
      console.log('[SQLite] Migration: Adding ai_analysis_status to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_analysis_status TEXT DEFAULT 'not_started'").run()
    }
    if (!assetsCols.includes('ai_analysis_json')) {
      console.log('[SQLite] Migration: Adding ai_analysis_json to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_analysis_json TEXT").run()
    }
    if (!assetsCols.includes('last_tag_updated_at')) {
      console.log('[SQLite] Migration: Adding last_tag_updated_at to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN last_tag_updated_at TEXT").run()
    }
    if (!assetsCols.includes('ai_caption_en')) {
      console.log('[SQLite] Migration: Adding ai_caption_en to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_en TEXT").run()
    }
    if (!assetsCols.includes('ai_caption_translated_by')) {
      console.log('[SQLite] Migration: Adding ai_caption_translated_by to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_translated_by TEXT").run()
    }
    if (!assetsCols.includes('color_palette_json')) {
      console.log('[SQLite] Migration: Adding color_palette_json to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN color_palette_json TEXT").run()
    }

    if (!assetsCols.includes('original_path')) {
      console.log('[SQLite] Migration: Adding original_path to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN original_path TEXT").run()
    }
    if (!assetsCols.includes('normalized_path')) {
      console.log('[SQLite] Migration: Adding normalized_path to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_path TEXT").run()
    }
    if (!assetsCols.includes('original_format')) {
      console.log('[SQLite] Migration: Adding original_format to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN original_format TEXT").run()
    }
    if (!assetsCols.includes('normalized_format')) {
      console.log('[SQLite] Migration: Adding normalized_format to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_format TEXT").run()
    }
    if (!assetsCols.includes('has_alpha')) {
      console.log('[SQLite] Migration: Adding has_alpha to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN has_alpha INTEGER DEFAULT 0").run()
    }
    if (!assetsCols.includes('color_space')) {
      console.log('[SQLite] Migration: Adding color_space to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN color_space TEXT").run()
    }
    if (!assetsCols.includes('normalize_status')) {
      console.log('[SQLite] Migration: Adding normalize_status to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN normalize_status TEXT DEFAULT 'not_started'").run()
    }
    if (!assetsCols.includes('normalized_at')) {
      console.log('[SQLite] Migration: Adding normalized_at to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_at TEXT").run()
    }
    if (!assetsCols.includes('image_metadata_json')) {
      console.log('[SQLite] Migration: Adding image_metadata_json to assets table')
      db.prepare("ALTER TABLE assets ADD COLUMN image_metadata_json TEXT").run()
    }

    // Dynamic bulk sync for backward compatibility: backfill original_path for legacy assets
    try {
      db.prepare("UPDATE assets SET original_path = file_path WHERE original_path IS NULL OR original_path = ''").run()
    } catch (backfillErr) {
      console.warn('[SQLite] Backfill original_path warning:', backfillErr)
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

    // Migrate AI tables with synced_at and sync_status if missing
    const aiTagTasksInfo = db.prepare("PRAGMA table_info(ai_tag_tasks)").all() as Array<{ name: string }>
    const aiTagTasksCols = aiTagTasksInfo.map((c) => c.name)
    if (!aiTagTasksCols.includes('synced_at')) {
      console.log('[SQLite] Migration: Adding synced_at to ai_tag_tasks table')
      db.prepare("ALTER TABLE ai_tag_tasks ADD COLUMN synced_at TEXT").run()
    }
    if (!aiTagTasksCols.includes('sync_status')) {
      console.log('[SQLite] Migration: Adding sync_status to ai_tag_tasks table')
      db.prepare("ALTER TABLE ai_tag_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run()
    }

    const aiPromptTasksInfo = db.prepare("PRAGMA table_info(ai_prompt_tasks)").all() as Array<{ name: string }>
    const aiPromptTasksCols = aiPromptTasksInfo.map((c) => c.name)
    if (!aiPromptTasksCols.includes('synced_at')) {
      console.log('[SQLite] Migration: Adding synced_at to ai_prompt_tasks table')
      db.prepare("ALTER TABLE ai_prompt_tasks ADD COLUMN synced_at TEXT").run()
    }
    if (!aiPromptTasksCols.includes('sync_status')) {
      console.log('[SQLite] Migration: Adding sync_status to ai_prompt_tasks table')
      db.prepare("ALTER TABLE ai_prompt_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run()
    }

    const aiAnalysisTasksInfo = db.prepare("PRAGMA table_info(ai_analysis_tasks)").all() as Array<{ name: string }>
    const aiAnalysisTasksCols = aiAnalysisTasksInfo.map((c) => c.name)
    if (!aiAnalysisTasksCols.includes('synced_at')) {
      console.log('[SQLite] Migration: Adding synced_at to ai_analysis_tasks table')
      db.prepare("ALTER TABLE ai_analysis_tasks ADD COLUMN synced_at TEXT").run()
    }
    if (!aiAnalysisTasksCols.includes('sync_status')) {
      console.log('[SQLite] Migration: Adding sync_status to ai_analysis_tasks table')
      db.prepare("ALTER TABLE ai_analysis_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run()
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

  // Seed default system tags for designers if tags are completely empty or unseeded
  const tagCount = (db.prepare("SELECT COUNT(*) as count FROM tags WHERE is_system = 1").get() as { count: number }).count
  if (tagCount === 0) {
    console.log('[SQLite] Seeding design category tags to database...')
    const now = new Date().toISOString()
    const insertTag = db.prepare(`
      INSERT OR IGNORE INTO tags (id, name, normalized_name, slug, type, color, description, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    db.transaction(() => {
      for (const t of SYSTEM_TAGS) {
        const id = `tag-${t.type}-${Math.random().toString(36).substr(2, 9)}`
        const normalized = t.name.toLowerCase().trim()
        const color = TYPE_COLOR_MAP[t.type] || TYPE_COLOR_MAP.custom
        const slug = normalized
        insertTag.run(id, t.name, normalized, slug, t.type, color, `${t.name} (系统标签)`, now, now)
      }
    })()
  }

  return db
}

export function setDatabase(newDb: Database.Database): void {
  db = newDb
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Please call initDatabase() first.')
  }
  return db
}
