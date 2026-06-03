import { safeStorage, ipcMain, WebContentsView, dialog, app, shell, protocol, net as net$1, BrowserWindow } from "electron";
import path, { join } from "path";
import { URL as URL$1, pathToFileURL } from "url";
import Database from "better-sqlite3";
import fs, { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import os, { homedir } from "os";
import { chromium } from "playwright";
import http from "http";
import https from "https";
import fs$1 from "fs/promises";
import { spawn, execSync } from "child_process";
import sharp from "sharp";
import crypto from "crypto";
import net from "net";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const CREATE_SITES_TABLE = `
  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    search_url_template TEXT NOT NULL,
    requires_auth INTEGER DEFAULT 1,
    auth_state_path TEXT,
    auth_status TEXT DEFAULT 'unlogged',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const CREATE_ASSETS_TABLE = `
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    source_site_id TEXT NOT NULL,
    source_site_name TEXT NOT NULL,
    source_page_url TEXT,
    original_url TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    file_type TEXT,
    dominant_color TEXT,
    browser_page_title TEXT,
    capture_method TEXT,
    original_path TEXT,
    normalized_path TEXT,
    original_format TEXT,
    normalized_format TEXT,
    has_alpha INTEGER DEFAULT 0,
    color_space TEXT,
    normalize_status TEXT DEFAULT 'not_started',
    normalized_at TEXT,
    image_metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const CREATE_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    slug TEXT,
    type TEXT DEFAULT 'custom',
    color TEXT,
    description TEXT,
    shorthand TEXT,
    aliases TEXT,
    parent_id TEXT,
    is_category INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(normalized_name, type)
  );
`;
const CREATE_ASSET_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS asset_tags (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    confidence REAL DEFAULT 1.0,
    status TEXT DEFAULT 'confirmed',
    model_name TEXT,
    model_version TEXT,
    raw_value TEXT,
    created_by TEXT DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(asset_id, tag_id, source),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`;
const CREATE_TAG_ALIASES_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_aliases (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`;
const CREATE_TAG_RELATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_relations (
    id TEXT PRIMARY KEY,
    parent_tag_id TEXT NOT NULL,
    child_tag_id TEXT NOT NULL,
    relation_type TEXT DEFAULT 'parent',
    created_at TEXT NOT NULL,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (child_tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`;
const CREATE_TAG_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    sort_order INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const CREATE_TAG_GROUP_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_group_items (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    sort_order INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES tag_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`;
const CREATE_TAG_SUGGESTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_suggestions (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    tag_type TEXT,
    source TEXT,
    confidence REAL,
    status TEXT DEFAULT 'pending',
    model_name TEXT,
    raw_payload TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );
`;
const CREATE_AI_TAG_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS ai_tag_tasks (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    priority INTEGER DEFAULT 0,
    batch_id TEXT,
    model_name TEXT,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    synced_at TEXT,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );
`;
const CREATE_AI_PROMPT_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS ai_prompt_tasks (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    model_name TEXT,
    result_prompt TEXT,
    result_caption TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    synced_at TEXT,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );
`;
const CREATE_AI_ANALYSIS_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS ai_analysis_tasks (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    model_name TEXT,
    result_json TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    synced_at TEXT,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );
`;
const CREATE_DOWNLOAD_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS download_tasks (
    id TEXT PRIMARY KEY,
    asset_title TEXT NOT NULL,
    source_site_id TEXT NOT NULL,
    source_site_name TEXT,
    source_page_url TEXT,
    download_url TEXT NOT NULL,
    save_path TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    browser_page_title TEXT,
    capture_method TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(source_site_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_source ON asset_tags(source);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_status ON asset_tags(status);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_confidence ON asset_tags(confidence);`,
  `CREATE INDEX IF NOT EXISTS idx_tag_aliases_tag ON tag_aliases(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tag_suggestions_asset ON tag_suggestions(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);`
];
const SEED_SITES = [
  {
    id: "tapnow",
    name: "TapNow",
    base_url: "https://app.tapnow.ai",
    search_url_template: "https://app.tapnow.ai/home?q={{keyword}}",
    requires_auth: 1,
    auth_status: "logged",
    notes: "智能体创意画布 - 设计灵感库"
  },
  {
    id: "unsplash",
    name: "Unsplash",
    base_url: "https://unsplash.com",
    search_url_template: "https://unsplash.com/s/photos/{{keyword}}",
    requires_auth: 0,
    auth_status: "unlogged",
    notes: "免版权高清创意摄影图片库"
  },
  {
    id: "pinterest",
    name: "Pinterest",
    base_url: "https://pinterest.com",
    search_url_template: "https://pinterest.com/search/pins/?q={{keyword}}",
    requires_auth: 1,
    auth_status: "unlogged",
    notes: "全球创意设计瀑布流社区"
  }
];
let db;
const TYPE_COLOR_MAP = {
  style: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  usage: "bg-blue-50 text-blue-700 border border-blue-200",
  layout: "bg-amber-50 text-amber-700 border border-amber-200",
  scene: "bg-rose-50 text-rose-700 border border-rose-200",
  source: "bg-slate-100 text-slate-700 border border-slate-200",
  ai: "bg-purple-50 text-purple-700 border border-purple-200",
  custom: "bg-pink-50 text-pink-700 border border-pink-200"
};
const SYSTEM_TAGS = [
  // Style
  { type: "style", name: "新中式" },
  { type: "style", name: "极简" },
  { type: "style", name: "科技感" },
  { type: "style", name: "金融商务" },
  { type: "style", name: "玻璃拟态" },
  { type: "style", name: "水墨风" },
  { type: "style", name: "手绘水彩" },
  { type: "style", name: "3D立体" },
  { type: "style", name: "高级感" },
  { type: "style", name: "轻奢" },
  // Color
  { type: "color", name: "蓝紫色" },
  { type: "color", name: "黑金" },
  { type: "color", name: "红橙色" },
  { type: "color", name: "深色调" },
  { type: "color", name: "浅色背景" },
  { type: "color", name: "低饱和绿色" },
  { type: "color", name: "暖色调" },
  { type: "color", name: "冷色调" },
  // Usage
  { type: "usage", name: "PPT封面" },
  { type: "usage", name: "海报" },
  { type: "usage", name: "金融横图" },
  { type: "usage", name: "电商banner" },
  { type: "usage", name: "教学报告封面" },
  { type: "usage", name: "指示牌" },
  { type: "usage", name: "长图文" },
  { type: "usage", name: "UI设计" },
  { type: "usage", name: "宣传图" },
  // Layout
  { type: "layout", name: "左文右图" },
  { type: "layout", name: "标题居中" },
  { type: "layout", name: "大面积留白" },
  { type: "layout", name: "信息密集" },
  { type: "layout", name: "瀑布流" },
  { type: "layout", name: "横版构图" },
  { type: "layout", name: "竖版构图" },
  { type: "layout", name: "16:9" },
  { type: "layout", name: "4:3" },
  { type: "layout", name: "A4竖版" },
  // Scene
  { type: "scene", name: "餐厅" },
  { type: "scene", name: "酒店" },
  { type: "scene", name: "室内" },
  { type: "scene", name: "户外" },
  { type: "scene", name: "山峰" },
  { type: "scene", name: "城市天际线" },
  { type: "scene", name: "教室" },
  { type: "scene", name: "办公场景" },
  // Source
  { type: "source", name: "网页抓取" },
  { type: "source", name: "本地导入" },
  { type: "source", name: "Pinterest" },
  { type: "source", name: "Behance" },
  { type: "source", name: "Dribbble" },
  { type: "source", name: "站酷" },
  { type: "source", name: "花瓣" },
  { type: "source", name: "Freepik" }
];
function initDatabase() {
  const baseDir = join(homedir(), "DesignAssetManager");
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  const dbPath = join(baseDir, "design_asset_manager.db");
  console.log(`[SQLite] Connecting to SQLite DB at: ${dbPath}`);
  db = new Database(dbPath, { verbose: console.log });
  db.pragma("foreign_keys = ON");
  let tagsNeedsMigration = false;
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tags)").all();
    const cols = tableInfo.map((c) => c.name);
    if (cols.length > 0 && !cols.includes("normalized_name")) {
      tagsNeedsMigration = true;
    }
  } catch (err) {
  }
  let assetTagsNeedsMigration = false;
  try {
    const tableInfo = db.prepare("PRAGMA table_info(asset_tags)").all();
    const cols = tableInfo.map((c) => c.name);
    if (cols.length > 0 && !cols.includes("source")) {
      assetTagsNeedsMigration = true;
    }
  } catch (err) {
  }
  db.transaction(() => {
    db.prepare(CREATE_SITES_TABLE).run();
    db.prepare(CREATE_ASSETS_TABLE).run();
    if (tagsNeedsMigration) {
      console.log("[SQLite] Migration: Re-creating tags table for advanced constraint schema");
      db.prepare("ALTER TABLE tags RENAME TO tags_old").run();
      db.prepare(CREATE_TAGS_TABLE).run();
      db.prepare(`
        INSERT INTO tags (id, name, normalized_name, slug, type, color, description, is_system, usage_count, created_at, updated_at)
        SELECT id, name, LOWER(TRIM(name)), LOWER(TRIM(name)), 'custom', color, '', 0, 0, created_at, created_at FROM tags_old
      `).run();
      db.prepare("DROP TABLE tags_old").run();
    } else {
      db.prepare(CREATE_TAGS_TABLE).run();
    }
    if (assetTagsNeedsMigration) {
      console.log("[SQLite] Migration: Re-creating asset_tags table for detailed tag tracking");
      db.prepare("ALTER TABLE asset_tags RENAME TO asset_tags_old").run();
      db.prepare(CREATE_ASSET_TAGS_TABLE).run();
      db.prepare(`
        INSERT INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_at, updated_at)
        SELECT asset_id || '_' || tag_id, asset_id, tag_id, 'manual', 1.0, 'confirmed', datetime('now'), datetime('now')
        FROM asset_tags_old
      `).run();
      db.prepare("DROP TABLE asset_tags_old").run();
    } else {
      db.prepare(CREATE_ASSET_TAGS_TABLE).run();
    }
    db.prepare(CREATE_TAG_ALIASES_TABLE).run();
    db.prepare(CREATE_TAG_RELATIONS_TABLE).run();
    db.prepare(CREATE_TAG_GROUPS_TABLE).run();
    db.prepare(CREATE_TAG_GROUP_ITEMS_TABLE).run();
    db.prepare(CREATE_TAG_SUGGESTIONS_TABLE).run();
    db.prepare(CREATE_AI_TAG_TASKS_TABLE).run();
    db.prepare(CREATE_AI_PROMPT_TASKS_TABLE).run();
    db.prepare(CREATE_AI_ANALYSIS_TASKS_TABLE).run();
    db.prepare(CREATE_DOWNLOAD_TASKS_TABLE).run();
    for (const createIndexSql of CREATE_INDEXES) {
      db.prepare(createIndexSql).run();
    }
  })();
  try {
    const assetsInfo = db.prepare("PRAGMA table_info(assets)").all();
    const assetsCols = assetsInfo.map((c) => c.name);
    if (!assetsCols.includes("browser_page_title")) {
      console.log("[SQLite] Migration: Adding browser_page_title to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN browser_page_title TEXT").run();
    }
    if (!assetsCols.includes("capture_method")) {
      console.log("[SQLite] Migration: Adding capture_method to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN capture_method TEXT").run();
    }
    if (!assetsCols.includes("ai_tag_status")) {
      console.log("[SQLite] Migration: Adding ai_tag_status to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_tag_status TEXT DEFAULT 'not_started'").run();
    }
    if (!assetsCols.includes("ai_tagged_at")) {
      console.log("[SQLite] Migration: Adding ai_tagged_at to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_tagged_at TEXT").run();
    }
    if (!assetsCols.includes("ai_prompt_status")) {
      console.log("[SQLite] Migration: Adding ai_prompt_status to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_prompt_status TEXT DEFAULT 'not_started'").run();
    }
    if (!assetsCols.includes("ai_prompt")) {
      console.log("[SQLite] Migration: Adding ai_prompt to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_prompt TEXT").run();
    }
    if (!assetsCols.includes("ai_caption")) {
      console.log("[SQLite] Migration: Adding ai_caption to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption TEXT").run();
    }
    if (!assetsCols.includes("ai_caption_source")) {
      console.log("[SQLite] Migration: Adding ai_caption_source to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_source TEXT").run();
    }
    if (!assetsCols.includes("ai_caption_updated_at")) {
      console.log("[SQLite] Migration: Adding ai_caption_updated_at to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_updated_at TEXT").run();
    }
    if (!assetsCols.includes("ai_caption_is_user_edited")) {
      console.log("[SQLite] Migration: Adding ai_caption_is_user_edited to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_is_user_edited INTEGER DEFAULT 0").run();
    }
    if (!assetsCols.includes("ai_ocr_text")) {
      console.log("[SQLite] Migration: Adding ai_ocr_text to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_text TEXT").run();
    }
    if (!assetsCols.includes("ai_ocr_source")) {
      console.log("[SQLite] Migration: Adding ai_ocr_source to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_source TEXT").run();
    }
    if (!assetsCols.includes("ai_ocr_updated_at")) {
      console.log("[SQLite] Migration: Adding ai_ocr_updated_at to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_ocr_updated_at TEXT").run();
    }
    if (!assetsCols.includes("ai_analysis_status")) {
      console.log("[SQLite] Migration: Adding ai_analysis_status to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_analysis_status TEXT DEFAULT 'not_started'").run();
    }
    if (!assetsCols.includes("ai_analysis_json")) {
      console.log("[SQLite] Migration: Adding ai_analysis_json to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_analysis_json TEXT").run();
    }
    if (!assetsCols.includes("last_tag_updated_at")) {
      console.log("[SQLite] Migration: Adding last_tag_updated_at to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN last_tag_updated_at TEXT").run();
    }
    if (!assetsCols.includes("ai_caption_en")) {
      console.log("[SQLite] Migration: Adding ai_caption_en to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_en TEXT").run();
    }
    if (!assetsCols.includes("ai_caption_translated_by")) {
      console.log("[SQLite] Migration: Adding ai_caption_translated_by to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN ai_caption_translated_by TEXT").run();
    }
    if (!assetsCols.includes("color_palette_json")) {
      console.log("[SQLite] Migration: Adding color_palette_json to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN color_palette_json TEXT").run();
    }
    if (!assetsCols.includes("original_path")) {
      console.log("[SQLite] Migration: Adding original_path to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN original_path TEXT").run();
    }
    if (!assetsCols.includes("normalized_path")) {
      console.log("[SQLite] Migration: Adding normalized_path to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_path TEXT").run();
    }
    if (!assetsCols.includes("original_format")) {
      console.log("[SQLite] Migration: Adding original_format to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN original_format TEXT").run();
    }
    if (!assetsCols.includes("normalized_format")) {
      console.log("[SQLite] Migration: Adding normalized_format to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_format TEXT").run();
    }
    if (!assetsCols.includes("has_alpha")) {
      console.log("[SQLite] Migration: Adding has_alpha to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN has_alpha INTEGER DEFAULT 0").run();
    }
    if (!assetsCols.includes("color_space")) {
      console.log("[SQLite] Migration: Adding color_space to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN color_space TEXT").run();
    }
    if (!assetsCols.includes("normalize_status")) {
      console.log("[SQLite] Migration: Adding normalize_status to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN normalize_status TEXT DEFAULT 'not_started'").run();
    }
    if (!assetsCols.includes("normalized_at")) {
      console.log("[SQLite] Migration: Adding normalized_at to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN normalized_at TEXT").run();
    }
    if (!assetsCols.includes("image_metadata_json")) {
      console.log("[SQLite] Migration: Adding image_metadata_json to assets table");
      db.prepare("ALTER TABLE assets ADD COLUMN image_metadata_json TEXT").run();
    }
    try {
      db.prepare("UPDATE assets SET original_path = file_path WHERE original_path IS NULL OR original_path = ''").run();
    } catch (backfillErr) {
      console.warn("[SQLite] Backfill original_path warning:", backfillErr);
    }
    const downloadTasksInfo = db.prepare("PRAGMA table_info(download_tasks)").all();
    const downloadTasksCols = downloadTasksInfo.map((c) => c.name);
    if (!downloadTasksCols.includes("source_site_name")) {
      console.log("[SQLite] Migration: Adding source_site_name to download_tasks table");
      db.prepare("ALTER TABLE download_tasks ADD COLUMN source_site_name TEXT").run();
    }
    if (!downloadTasksCols.includes("browser_page_title")) {
      console.log("[SQLite] Migration: Adding browser_page_title to download_tasks table");
      db.prepare("ALTER TABLE download_tasks ADD COLUMN browser_page_title TEXT").run();
    }
    if (!downloadTasksCols.includes("capture_method")) {
      console.log("[SQLite] Migration: Adding capture_method to download_tasks table");
      db.prepare("ALTER TABLE download_tasks ADD COLUMN capture_method TEXT").run();
    }
    const aiTagTasksInfo = db.prepare("PRAGMA table_info(ai_tag_tasks)").all();
    const aiTagTasksCols = aiTagTasksInfo.map((c) => c.name);
    if (!aiTagTasksCols.includes("synced_at")) {
      console.log("[SQLite] Migration: Adding synced_at to ai_tag_tasks table");
      db.prepare("ALTER TABLE ai_tag_tasks ADD COLUMN synced_at TEXT").run();
    }
    if (!aiTagTasksCols.includes("sync_status")) {
      console.log("[SQLite] Migration: Adding sync_status to ai_tag_tasks table");
      db.prepare("ALTER TABLE ai_tag_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run();
    }
    const aiPromptTasksInfo = db.prepare("PRAGMA table_info(ai_prompt_tasks)").all();
    const aiPromptTasksCols = aiPromptTasksInfo.map((c) => c.name);
    if (!aiPromptTasksCols.includes("synced_at")) {
      console.log("[SQLite] Migration: Adding synced_at to ai_prompt_tasks table");
      db.prepare("ALTER TABLE ai_prompt_tasks ADD COLUMN synced_at TEXT").run();
    }
    if (!aiPromptTasksCols.includes("sync_status")) {
      console.log("[SQLite] Migration: Adding sync_status to ai_prompt_tasks table");
      db.prepare("ALTER TABLE ai_prompt_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run();
    }
    const aiAnalysisTasksInfo = db.prepare("PRAGMA table_info(ai_analysis_tasks)").all();
    const aiAnalysisTasksCols = aiAnalysisTasksInfo.map((c) => c.name);
    if (!aiAnalysisTasksCols.includes("synced_at")) {
      console.log("[SQLite] Migration: Adding synced_at to ai_analysis_tasks table");
      db.prepare("ALTER TABLE ai_analysis_tasks ADD COLUMN synced_at TEXT").run();
    }
    if (!aiAnalysisTasksCols.includes("sync_status")) {
      console.log("[SQLite] Migration: Adding sync_status to ai_analysis_tasks table");
      db.prepare("ALTER TABLE ai_analysis_tasks ADD COLUMN sync_status TEXT DEFAULT 'pending'").run();
    }
  } catch (migErr) {
    console.error("[SQLite] Failed to run database migrations:", migErr);
  }
  const sitesCount = db.prepare("SELECT COUNT(*) as count FROM sites").get().count;
  if (sitesCount === 0) {
    console.log("[SQLite] Sites table is empty. Seeding default configurations...");
    const insertSite = db.prepare(`
      INSERT INTO sites (id, name, base_url, search_url_template, requires_auth, auth_status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db.transaction(() => {
      for (const site of SEED_SITES) {
        insertSite.run(
          site.id,
          site.name,
          site.base_url,
          site.search_url_template,
          site.requires_auth,
          site.auth_status,
          site.notes,
          now2,
          now2
        );
      }
    })();
  }
  const tagCount = db.prepare("SELECT COUNT(*) as count FROM tags WHERE is_system = 1").get().count;
  if (tagCount === 0) {
    console.log("[SQLite] Seeding design category tags to database...");
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const insertTag = db.prepare(`
      INSERT OR IGNORE INTO tags (id, name, normalized_name, slug, type, color, description, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    db.transaction(() => {
      for (const t of SYSTEM_TAGS) {
        const id = `tag-${t.type}-${Math.random().toString(36).substr(2, 9)}`;
        const normalized = t.name.toLowerCase().trim();
        const color = TYPE_COLOR_MAP[t.type] || TYPE_COLOR_MAP.custom;
        const slug = normalized;
        insertTag.run(id, t.name, normalized, slug, t.type, color, `${t.name} (系统标签)`, now2, now2);
      }
    })();
  }
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Please call initDatabase() first.");
  }
  return db;
}
class SiteService {
  getDb() {
    return getDatabase();
  }
  listSites() {
    const db2 = this.getDb();
    return db2.prepare("SELECT * FROM sites ORDER BY name ASC").all();
  }
  saveSite(site) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const existing = db2.prepare("SELECT * FROM sites WHERE id = ?").get(site.id);
    if (existing) {
      db2.prepare(`
        UPDATE sites
        SET name = ?, base_url = ?, search_url_template = ?, requires_auth = ?, auth_state_path = ?, auth_status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(
        site.name,
        site.base_url,
        site.search_url_template,
        site.requires_auth,
        site.auth_state_path || null,
        site.auth_status,
        site.notes || null,
        now2,
        site.id
      );
      return {
        ...existing,
        ...site,
        updated_at: now2
      };
    } else {
      db2.prepare(`
        INSERT INTO sites (id, name, base_url, search_url_template, requires_auth, auth_state_path, auth_status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        site.id,
        site.name,
        site.base_url,
        site.search_url_template,
        site.requires_auth,
        site.auth_state_path || null,
        site.auth_status,
        site.notes || null,
        now2,
        now2
      );
      return {
        ...site,
        created_at: now2,
        updated_at: now2
      };
    }
  }
  deleteSite(id) {
    const db2 = this.getDb();
    db2.prepare("DELETE FROM sites WHERE id = ?").run(id);
  }
  updateSiteStatus(id, status) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db2.prepare("UPDATE sites SET auth_status = ?, updated_at = ? WHERE id = ?").run(status, now2, id);
  }
  updateSiteAuth(id, authStatePath, status) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db2.prepare("UPDATE sites SET auth_state_path = ?, auth_status = ?, updated_at = ? WHERE id = ?").run(authStatePath, status, now2, id);
  }
}
class AuthStateService {
  getAuthStatesDir() {
    const dir = join(homedir(), "DesignAssetManager", "auth_states");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
  getFilePath(siteId) {
    return join(this.getAuthStatesDir(), `${siteId}_state.json`);
  }
  saveAuthState(siteId, stateObj) {
    const filePath = this.getFilePath(siteId);
    const stateStr = JSON.stringify(stateObj);
    try {
      if (safeStorage.isEncryptionAvailable()) {
        console.log(`[SafeStorage] Encrypting credentials for site: ${siteId}`);
        const encryptedBuffer = safeStorage.encryptString(stateStr);
        writeFileSync(filePath, encryptedBuffer);
        return;
      }
    } catch (e) {
      console.warn(`[SafeStorage] safeStorage.encryptString failed, falling back to plaintext:`, e);
    }
    console.warn(`[SafeStorage] Saving raw text for: ${siteId}`);
    writeFileSync(filePath, stateStr, "utf-8");
  }
  loadAuthState(siteId) {
    const filePath = this.getFilePath(siteId);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const buffer = readFileSync(filePath);
      try {
        if (safeStorage.isEncryptionAvailable()) {
          console.log(`[SafeStorage] Decrypting credentials for site: ${siteId}`);
          const decryptedStr2 = safeStorage.decryptString(buffer);
          return JSON.parse(decryptedStr2);
        }
      } catch (e) {
        console.warn(`[SafeStorage] safeStorage.decryptString failed, trying raw text parse:`, e);
      }
      const decryptedStr = buffer.toString("utf-8");
      return JSON.parse(decryptedStr);
    } catch (err) {
      console.error(`[SafeStorage] Failed to decrypt auth state for ${siteId}:`, err);
      return null;
    }
  }
  deleteAuthState(siteId) {
    const filePath = this.getFilePath(siteId);
    if (existsSync(filePath)) {
      console.log(`[SafeStorage] Deleting auth state file for: ${siteId}`);
      unlinkSync(filePath);
    }
  }
  getAuthStatePath(siteId) {
    return this.getFilePath(siteId);
  }
}
class PlaywrightService {
  static activeContexts = /* @__PURE__ */ new Map();
  authStateService = new AuthStateService();
  getProfileDir(siteId) {
    const dir = join(homedir(), "DesignAssetManager", "profiles", siteId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
  async startLogin(siteId, baseUrl) {
    const existing = PlaywrightService.activeContexts.get(siteId);
    if (existing) {
      try {
        await existing.close();
      } catch (e) {
      }
      PlaywrightService.activeContexts.delete(siteId);
    }
    const profileDir = this.getProfileDir(siteId);
    console.log(`[Playwright] Launching Chrome in active memory at: ${profileDir}`);
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: "chrome",
      viewport: null,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--start-maximized"
      ]
    });
    PlaywrightService.activeContexts.set(siteId, context);
    const page = context.pages()[0] || await context.newPage();
    console.log(`[Playwright] Navigating context to: ${baseUrl}`);
    await page.goto(baseUrl);
  }
  async completeLogin(siteId) {
    const context = PlaywrightService.activeContexts.get(siteId);
    const statePath = this.authStateService.getAuthStatePath(siteId);
    if (!context) {
      console.log(`[Playwright] No active context in memory for ${siteId}, but profile exists. Gracefully returning path.`);
      return statePath;
    }
    try {
      console.log(`[Playwright] Fetching storageState for site: ${siteId}`);
      let storageState = null;
      try {
        storageState = await context.storageState();
      } catch (stateErr) {
        console.warn(
          `[Playwright] Could not fetch storageState (browser might be closed), but Chrome persists cookies automatically on disk in profile folder.`,
          stateErr
        );
      }
      if (storageState) {
        try {
          this.authStateService.saveAuthState(siteId, storageState);
        } catch (encryptErr) {
          console.warn(`[Playwright] Encryption helper encountered error:`, encryptErr);
        }
      }
      try {
        await context.close();
      } catch (closeErr) {
      }
      PlaywrightService.activeContexts.delete(siteId);
      return statePath;
    } catch (err) {
      console.error(`[Playwright] Graceful capture fallback triggered for ${siteId}:`, err);
      PlaywrightService.activeContexts.delete(siteId);
      return statePath;
    }
  }
}
function registerSiteIpc() {
  const service = new SiteService();
  ipcMain.handle("sites:list", async () => {
    console.log("[IPC] sites:list called");
    try {
      const sites = service.listSites();
      console.log("[IPC] sites:list returning sites count:", sites.length);
      return sites;
    } catch (err) {
      console.error("[IPC] sites:list error:", err);
      throw err;
    }
  });
  ipcMain.handle("sites:save", async (_, site) => {
    try {
      const mappedSite = {
        ...site,
        requires_auth: site.requiresAuth ? 1 : 0
      };
      const saved = service.saveSite(mappedSite);
      return { success: true, site: saved };
    } catch (err) {
      console.error("[IPC] sites:save error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("sites:delete", async (_, id) => {
    try {
      service.deleteSite(id);
      return { success: true, id };
    } catch (err) {
      console.error("[IPC] sites:delete error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("sites:login:start", async (_, siteId) => {
    try {
      const sites = service.listSites();
      const site = sites.find((s) => s.id === siteId);
      if (!site) {
        return { success: false, error: `Site config not found for: ${siteId}` };
      }
      console.log(`[IPC] sites:login:start - Launching Chrome window for site: ${siteId} (${site.base_url})`);
      const playwrightService = new PlaywrightService();
      await playwrightService.startLogin(siteId, site.base_url);
      return { success: true };
    } catch (err) {
      console.error("[IPC] sites:login:start error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("sites:login:complete", async (_, siteId) => {
    try {
      console.log(`[IPC] sites:login:complete - Fetching session cookies and completing auth for site: ${siteId}`);
      const playwrightService = new PlaywrightService();
      const authStatePath = await playwrightService.completeLogin(siteId);
      service.updateSiteAuth(siteId, authStatePath, "logged");
      return { success: true, status: "logged" };
    } catch (err) {
      console.error("[IPC] sites:login:complete error:", err);
      return { success: false, error: String(err) };
    }
  });
}
class ImageMetadataService {
  /**
   * Resolves a local path (including home directory abbreviation '~')
   * to a fully qualified absolute file system path.
   */
  static resolvePath(filePath) {
    if (!filePath) return "";
    if (filePath.startsWith("~")) {
      return filePath.replace("~", homedir());
    }
    return path.resolve(filePath);
  }
  /**
   * Checks if the resolved file path exists on the local file system.
   */
  static exists(filePath) {
    const resolved = this.resolvePath(filePath);
    return fs.existsSync(resolved);
  }
}
function hexToRgb(hex) {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return [r, g, b];
  }
  return [0, 0, 0];
}
function parseRgb(color) {
  if (!color) return [0, 0, 0];
  if (typeof color === "string" && color.startsWith("#")) {
    return hexToRgb(color);
  }
  if (Array.isArray(color)) return color;
  if (typeof color.array === "function") return color.array();
  if (typeof color.rgb === "function") {
    const obj = color.rgb();
    return [obj.r ?? obj._r ?? 0, obj.g ?? obj._g ?? 0, obj.b ?? obj._b ?? 0];
  }
  const r = color.r ?? color._r ?? color[0] ?? 0;
  const g = color.g ?? color._g ?? color[1] ?? 0;
  const b = color.b ?? color._b ?? color[2] ?? 0;
  return [r, g, b];
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
function getRelativeLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function getContrastRatio(rgb1, rgb2) {
  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
function classifyColorFamily(h, s, l) {
  if (l < 12) return "黑色系";
  if (l > 88 && s < 12) return "白色系";
  if (s < 12) return "灰色系";
  if (h >= 30 && h <= 60) {
    if (s >= 35 && s <= 95 && l >= 40 && l <= 75) return "金色系";
    if (s >= 10 && s <= 60 && l >= 75 && l <= 95) return "米色系";
  }
  if (h >= 15 && h <= 45 && s >= 15 && s <= 70 && l >= 12 && l <= 50) {
    return "棕色系";
  }
  if (h >= 330 || h < 15) {
    if (l > 50 && s > 30) return "粉色系";
    return "红色系";
  }
  if (h >= 15 && h < 45) return "橙色系";
  if (h >= 45 && h < 70) return "黄色系";
  if (h >= 70 && h < 160) return "绿色系";
  if (h >= 160 && h < 200) return "青色系";
  if (h >= 200 && h < 250) return "蓝色系";
  if (h >= 250 && h < 290) return "紫色系";
  if (h >= 290 && h < 330) return "粉色系";
  return "灰色系";
}
function getColorDistance(hsl1, hsl2) {
  const dh = Math.min(Math.abs(hsl1[0] - hsl2[0]), 360 - Math.abs(hsl1[0] - hsl2[0])) / 180;
  const ds = (hsl1[1] - hsl2[1]) / 100;
  const dl = (hsl1[2] - hsl2[2]) / 100;
  return Math.sqrt(dh * dh * 0.5 + ds * ds * 0.25 + dl * dl * 0.25);
}
function parseTextBoxes(textBlocks) {
  if (!textBlocks || !Array.isArray(textBlocks)) return [];
  const results = [];
  for (const block of textBlocks) {
    if (!block) continue;
    if (Array.isArray(block.box) && block.box.length === 4) {
      const box = block.box;
      const ymin = Number(box[0] ?? 0);
      const xmin = Number(box[1] ?? 0);
      const ymax = Number(box[2] ?? 0);
      const xmax = Number(box[3] ?? 0);
      const isNormalized1000 = ymin > 1.1 || xmin > 1.1 || ymax > 1.1 || xmax > 1.1;
      const scale = isNormalized1000 ? 1e3 : 1;
      const y = ymin / scale;
      const x = xmin / scale;
      const h = Math.max(0, ymax - ymin) / scale;
      const w = Math.max(0, xmax - xmin) / scale;
      results.push({ x, y, w, h, text: block.text || "" });
    } else if (block.x !== void 0 || block.left !== void 0) {
      results.push(block);
    }
  }
  return results;
}
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r = l, g = l, b = l;
  if (s !== 0) {
    const hue2rgb = (p2, q2, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
let sharpInstance$1 = null;
async function getSharp$1() {
  if (sharpInstance$1) return sharpInstance$1;
  try {
    sharpInstance$1 = (await import("sharp")).default || await import("sharp");
    return sharpInstance$1;
  } catch (err) {
    console.warn("[ImageNormalizeService] Failed to dynamically load native sharp module.", err);
    return null;
  }
}
class ImageNormalizeService {
  static getLibraryDir() {
    return path.join(homedir(), "DesignAssetManager", "library");
  }
  static toPortablePath(absolutePath) {
    const home = homedir();
    const normalizedAbs = path.normalize(absolutePath);
    const normalizedHome = path.normalize(home);
    if (normalizedAbs.startsWith(normalizedHome)) {
      const sub = normalizedAbs.slice(normalizedHome.length);
      return ("~" + sub).replace(/\\/g, "/");
    }
    return absolutePath.replace(/\\/g, "/");
  }
  /**
   * Safe helper to create directories recursively.
   */
  static ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  /**
   * Uniformly decodes, rotates, converts to sRGB, manages transparent alpha channels,
   * generates a normalized asset image (max side 2048px), and creates a quick UI thumbnail WebP (max side 512px).
   * 
   * If normalisation fails, it falls back to the original image gracefully without blocking.
   */
  static async normalize(originalPathInput, assetId) {
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const resolvedOriginal = ImageMetadataService.resolvePath(originalPathInput);
    const basename = path.basename(resolvedOriginal);
    const ext = path.extname(basename).toLowerCase();
    const libraryDir = this.getLibraryDir();
    const originalDir = path.join(libraryDir, "original");
    const normalizedDir = path.join(libraryDir, "normalized");
    const thumbnailDir = path.join(libraryDir, "thumbnails");
    this.ensureDir(originalDir);
    this.ensureDir(normalizedDir);
    this.ensureDir(thumbnailDir);
    const finalOriginalAbsPath = path.join(originalDir, basename);
    try {
      if (resolvedOriginal !== finalOriginalAbsPath) {
        fs.copyFileSync(resolvedOriginal, finalOriginalAbsPath);
        if (path.dirname(resolvedOriginal) === libraryDir) {
          fs.unlinkSync(resolvedOriginal);
        }
      }
    } catch (moveErr) {
      console.warn(`[ImageNormalizeService] Failed to copy/move original file to original/ folder:`, moveErr);
    }
    const portableOriginal = this.toPortablePath(finalOriginalAbsPath);
    const fallbackResult = {
      originalPath: portableOriginal,
      normalizedPath: portableOriginal,
      thumbnailPath: portableOriginal,
      originalFormat: ext.replace(".", "") || "jpeg",
      normalizedFormat: "jpeg",
      width: 1920,
      height: 1080,
      normalizedWidth: 1920,
      normalizedHeight: 1080,
      hasAlpha: false,
      colorSpace: "srgb",
      exifOrientationApplied: false,
      normalizeStatus: "failed",
      processedAt: now2
    };
    if (!fs.existsSync(finalOriginalAbsPath)) {
      fallbackResult.errorMessage = `Original file does not exist on disk at: ${finalOriginalAbsPath}`;
      return fallbackResult;
    }
    const sharp2 = await getSharp$1();
    if (!sharp2) {
      fallbackResult.errorMessage = "Native sharp module could not be loaded";
      return fallbackResult;
    }
    try {
      const meta = await sharp2(finalOriginalAbsPath).metadata();
      const width = meta.width || 1920;
      const height = meta.height || 1080;
      const originalFormatStr = meta.format || ext.replace(".", "") || "jpeg";
      const hasAlpha = !!meta.hasAlpha;
      const colorSpace = meta.space || "srgb";
      const isTransparentPng = hasAlpha && (originalFormatStr === "png" || ext === ".png");
      const normalizedFormat = isTransparentPng ? "png" : "jpeg";
      const normalizedFilename = basename.replace(new RegExp(`\\${ext}$`, "i"), normalizedFormat === "png" ? ".png" : ".jpg");
      const finalNormalizedAbsPath = path.join(normalizedDir, normalizedFilename);
      let resizeWidth = void 0;
      let resizeHeight = void 0;
      if (width > 2048 || height > 2048) {
        if (width >= height) {
          resizeWidth = 2048;
        } else {
          resizeHeight = 2048;
        }
      }
      let sharpPipeline = sharp2(finalOriginalAbsPath).rotate();
      if (resizeWidth || resizeHeight) {
        sharpPipeline = sharpPipeline.resize(resizeWidth, resizeHeight, { fit: "inside", withoutEnlargement: true });
      }
      try {
        if (typeof sharpPipeline.toColorspace === "function") {
          sharpPipeline = sharpPipeline.toColorspace("srgb");
        }
      } catch (spaceErr) {
        console.warn("[ImageNormalizeService] Colorspace conversion warning:", spaceErr);
      }
      if (normalizedFormat === "png") {
        await sharpPipeline.png({ compressionLevel: 8 }).toFile(finalNormalizedAbsPath);
      } else {
        if (hasAlpha) {
          sharpPipeline = sharpPipeline.flatten({ background: "#ffffff" });
        }
        await sharpPipeline.jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(finalNormalizedAbsPath);
      }
      const thumbnailFilename = basename.replace(new RegExp(`\\${ext}$`, "i"), ".webp");
      const finalThumbnailAbsPath = path.join(thumbnailDir, thumbnailFilename);
      let thumbPipeline = sharp2(finalOriginalAbsPath).rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true });
      try {
        if (typeof thumbPipeline.toColorspace === "function") {
          thumbPipeline = thumbPipeline.toColorspace("srgb");
        }
      } catch (spaceErr) {
        console.warn("[ImageNormalizeService] Thumbnail colorspace conversion warning:", spaceErr);
      }
      if (hasAlpha) {
        thumbPipeline = thumbPipeline.flatten({ background: "#ffffff" });
      }
      await thumbPipeline.webp({ quality: 80 }).toFile(finalThumbnailAbsPath);
      const normMeta = await sharp2(finalNormalizedAbsPath).metadata();
      return {
        originalPath: portableOriginal,
        normalizedPath: this.toPortablePath(finalNormalizedAbsPath),
        thumbnailPath: this.toPortablePath(finalThumbnailAbsPath),
        originalFormat: originalFormatStr,
        normalizedFormat,
        width,
        height,
        normalizedWidth: normMeta.width || width,
        normalizedHeight: normMeta.height || height,
        hasAlpha,
        colorSpace,
        exifOrientationApplied: true,
        normalizeStatus: "completed",
        processedAt: now2
      };
    } catch (err) {
      console.error("[ImageNormalizeService] Normalization process failed. Falling back:", err);
      fallbackResult.errorMessage = err?.message || String(err);
      return fallbackResult;
    }
  }
  /**
   * Generates a safe pre-processed sRGB jpeg buffer for ColorThief.
   * - Rotates to match EXIF.
   * - Resizes to maximum 512x512 for high performance.
   * - Converts colorspace to sRGB to eliminate channels shifting.
   * - Flattens any transparency (alpha) over a clean white background (#ffffff).
   * - Returns a stable binary JPEG buffer.
   */
  static async createPaletteSafeBuffer(imagePath) {
    const resolvedPath = ImageMetadataService.resolvePath(imagePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at: ${resolvedPath}`);
    }
    const sharp2 = await getSharp$1();
    if (!sharp2) {
      throw new Error("Sharp module could not be loaded");
    }
    let pipeline = sharp2(resolvedPath).rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true });
    try {
      if (typeof pipeline.toColorspace === "function") {
        pipeline = pipeline.toColorspace("srgb");
      }
    } catch (_) {
    }
    pipeline = pipeline.flatten({ background: "#ffffff" });
    return await pipeline.jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
  }
}
let sharpInstance = null;
let colorThiefInstance = null;
async function getSharp() {
  if (sharpInstance) return sharpInstance;
  try {
    sharpInstance = (await import("sharp")).default || await import("sharp");
    return sharpInstance;
  } catch (err) {
    console.warn("[ColorPaletteService] Failed to dynamically load native sharp module. Fallback active.", err);
    return null;
  }
}
async function getColorThief() {
  if (colorThiefInstance) return colorThiefInstance;
  try {
    colorThiefInstance = (await import("colorthief")).default || await import("colorthief");
    return colorThiefInstance;
  } catch (err) {
    console.warn("[ColorPaletteService] Failed to dynamically load native colorthief module. Fallback active.", err);
    return null;
  }
}
class ColorPaletteService {
  async ensureLocalImage(resolvedPath, assetId) {
    if (fs.existsSync(resolvedPath)) {
      return true;
    }
    let db2 = null;
    try {
      db2 = getDatabase();
    } catch (_) {
      return false;
    }
    let remoteUrl = void 0;
    if (assetId) {
      try {
        const row = db2.prepare("SELECT original_url, thumbnail_path FROM assets WHERE id = ?").get(assetId);
        if (row) {
          remoteUrl = row.original_url && row.original_url.startsWith("http") ? row.original_url : row.thumbnail_path;
        }
      } catch (err) {
        console.warn(`[ColorPaletteService] Failed to query asset by ID ${assetId} for download:`, err);
      }
    }
    if (!remoteUrl || !remoteUrl.startsWith("http")) {
      const basename = path.basename(resolvedPath);
      try {
        const row = db2.prepare("SELECT original_url, thumbnail_path FROM assets WHERE file_name = ? OR file_path LIKE ?").get(basename, `%${basename}`);
        if (row) {
          remoteUrl = row.original_url && row.original_url.startsWith("http") ? row.original_url : row.thumbnail_path;
        }
      } catch (err) {
        console.warn(`[ColorPaletteService] Failed to query asset by basename ${basename} for download:`, err);
      }
    }
    if (!remoteUrl || !remoteUrl.startsWith("http")) {
      console.warn(`[ColorPaletteService] No remote HTTP URL found for missing image at: ${resolvedPath}`);
      return false;
    }
    console.log(`[ColorPaletteService] Downloading missing image from ${remoteUrl} to ${resolvedPath}...`);
    try {
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await new Promise((resolve, reject) => {
        const parsedUrl = new URL$1(remoteUrl);
        const client = parsedUrl.protocol === "https:" ? https : http;
        const req = client.get(remoteUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 15e3
        }, (res) => {
          if (res.statusCode && (res.statusCode >= 300 && res.statusCode < 400) && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith("/")) {
              redirectUrl = parsedUrl.protocol + "//" + parsedUrl.host + redirectUrl;
            }
            const redirectClient = redirectUrl.startsWith("https:") ? https : http;
            redirectClient.get(redirectUrl, {
              headers: { "User-Agent": "Mozilla/5.0" },
              timeout: 15e3
            }, (redirectRes) => {
              if (redirectRes.statusCode !== 200) {
                reject(new Error(`Failed to download redirect: HTTP ${redirectRes.statusCode}`));
                return;
              }
              const fileStream2 = fs.createWriteStream(resolvedPath);
              redirectRes.pipe(fileStream2);
              fileStream2.on("finish", () => {
                fileStream2.close();
                resolve();
              });
              fileStream2.on("error", (err) => {
                fs.unlink(resolvedPath, () => {
                });
                reject(err);
              });
            }).on("error", reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
            return;
          }
          const fileStream = fs.createWriteStream(resolvedPath);
          res.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });
          fileStream.on("error", (err) => {
            fs.unlink(resolvedPath, () => {
            });
            reject(err);
          });
        });
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Download timeout"));
        });
      });
      console.log(`[ColorPaletteService] Successfully downloaded! Size: ${fs.statSync(resolvedPath).size} bytes.`);
      return true;
    } catch (dlErr) {
      console.error(`[ColorPaletteService] Failed to download remote image:`, dlErr);
      if (fs.existsSync(resolvedPath)) {
        try {
          fs.unlinkSync(resolvedPath);
        } catch (_) {
        }
      }
      return false;
    }
  }
  /**
   * Main color extraction executor for a local file.
   * Leverages sharp & colorthief with an absolute mock fallback.
   */
  async extractPalette(filePath, textBoxes = [], assetId) {
    const resolvedPath = ImageMetadataService.resolvePath(filePath);
    const warnings = [];
    let attempts = 0;
    const maxAttempts = 5;
    let fileAccessible = false;
    while (attempts < maxAttempts) {
      if (ImageMetadataService.exists(resolvedPath)) {
        try {
          const sharp22 = await getSharp();
          if (sharp22) {
            await sharp22(resolvedPath).metadata();
            fileAccessible = true;
            break;
          }
        } catch (e) {
          console.log(`[ColorPaletteService] File found but locked/unreadable, attempt ${attempts + 1}/${maxAttempts}.`);
        }
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!fileAccessible) {
      const downloaded = await this.ensureLocalImage(resolvedPath, assetId);
      if (downloaded) {
        fileAccessible = true;
      }
    }
    const parsedBoxes = parseTextBoxes(textBoxes);
    let finalBoxes = parsedBoxes;
    let detectionProvider = "manual_input";
    let isMockText = false;
    let textStatus = "none";
    let skipReason = null;
    const { SettingsService: SettingsService2 } = await Promise.resolve().then(() => settings_service);
    const settings = SettingsService2.getInstance().getSettings();
    const isAnalysisEnabled = settings.enableTextColorAnalysis ?? true;
    const rawProvider = settings.textBoxProvider ?? "easyocr";
    if (!isAnalysisEnabled) {
      skipReason = "disabled_by_user";
      textStatus = "disabled";
      detectionProvider = rawProvider;
    } else if (rawProvider === "none") {
      skipReason = "provider_none";
      textStatus = "skipped";
      detectionProvider = "none";
    } else {
      if (finalBoxes.length === 0) {
        const { OcrDependencyService: OcrDependencyService2 } = await Promise.resolve().then(() => ocrDependency_service);
        const env = OcrDependencyService2.getInstance().getCachedOcrEnvironment();
        if (rawProvider === "easyocr" && !env.providers.easyocr.available) {
          skipReason = "easyocr_not_installed";
          textStatus = "skipped";
          detectionProvider = "easyocr";
        } else if (rawProvider === "rapidocr" && !env.providers.rapidocr.available) {
          skipReason = "rapidocr_not_installed";
          textStatus = "skipped";
          detectionProvider = "rapidocr";
        } else if (rawProvider === "paddleocr" && !env.providers.paddleocr.available) {
          skipReason = "paddleocr_not_installed";
          textStatus = "skipped";
          detectionProvider = "paddleocr";
        } else {
          try {
            detectionProvider = rawProvider;
            let providerType = "none";
            if (rawProvider === "easyocr") providerType = "easyocr_detection";
            else if (rawProvider === "rapidocr") providerType = "rapidocr_detection";
            else if (rawProvider === "paddleocr") providerType = "paddleocr_detection";
            else if (rawProvider === "mock") providerType = "mock_text_boxes";
            else if (rawProvider === "qwen_vl_text_blocks") providerType = "qwen_vl_text_blocks";
            const { TextBoxProvider } = await import("./text-box-provider.service-CUIX5Lnd.js");
            const providerInstance = new TextBoxProvider({
              provider: providerType,
              timeoutMs: settings.ocrTimeoutMs ?? 3e3,
              maxTextBoxes: settings.maxTextBoxesPerImage ?? 30,
              minConfidence: settings.minTextBoxConfidence ?? 0.5
            });
            const detected = await providerInstance.detectTextBoxes(resolvedPath, assetId);
            finalBoxes = parseTextBoxes(detected.boxes);
            isMockText = detected.isMock || rawProvider === "mock";
            if (detected.warnings && detected.warnings.some((w) => w.includes("timeout"))) {
              textStatus = "timeout";
              skipReason = "ocr_timeout";
            } else if (finalBoxes.length === 0) {
              textStatus = "skipped";
              skipReason = "no_text_detected";
            }
          } catch (ocrErr) {
            console.error("[ColorPaletteService] OCR run failed:", ocrErr);
            textStatus = "failed";
            skipReason = "dependency_missing";
            warnings.push(`OCR failed: ${String(ocrErr)}`);
          }
        }
      } else {
        detectionProvider = "manual_input";
      }
    }
    const sharp2 = await getSharp();
    const colorthief = await getColorThief();
    if (!sharp2 || !colorthief || !ImageMetadataService.exists(resolvedPath)) {
      if (!ImageMetadataService.exists(resolvedPath)) {
        warnings.push(`File not found on disk at: ${resolvedPath}`);
      } else {
        warnings.push("Native sharp/colorthief dependencies failed to load. Running mock fallback quantization.");
      }
      return this._generateMockPalette(resolvedPath, finalBoxes, warnings, detectionProvider);
    }
    try {
      const resizedBuffer = await ImageNormalizeService.createPaletteSafeBuffer(resolvedPath);
      const meta = await sharp2(resizedBuffer).metadata();
      const width = meta.width || 512;
      const height = meta.height || 512;
      const rawPalette = await colorthief.getPalette(resizedBuffer, 8);
      const rawDominant = await colorthief.getColor(resizedBuffer);
      if (!rawPalette || rawPalette.length === 0) {
        throw new Error("ColorThief failed to extract color swatches");
      }
      const parsedPalette = rawPalette.map(parseRgb);
      const parsedDominant = parseRgb(rawDominant || rawPalette[0]);
      const swatches = [];
      let totalWeight = 0;
      const weights = [45, 20, 15, 8, 5, 3, 2, 2].slice(0, parsedPalette.length);
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < parsedPalette.length; i++) {
        const rgb = parsedPalette[i];
        const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        const percentage = Math.round(weights[i] / sumWeights * 100);
        const family = classifyColorFamily(hsl[0], hsl[1], hsl[2]);
        const contrastWhite = getContrastRatio(rgb, [255, 255, 255]);
        const contrastBlack = getContrastRatio(rgb, [0, 0, 0]);
        const textColor = contrastWhite > contrastBlack ? "#FFFFFF" : "#000000";
        let role = "secondary";
        if (i === 0) role = "background";
        else if (i === 1) role = "primary";
        else if (i === 2 && hsl[1] > 35) role = "accent";
        else if (i === 3 && hsl[1] > 40) role = "accent";
        swatches.push({
          hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
          rgb,
          hsl,
          percentage,
          role,
          family,
          isDark: hsl[2] < 45,
          textColor,
          contrastWhite: Number(contrastWhite.toFixed(2)),
          contrastBlack: Number(contrastBlack.toFixed(2))
        });
      }
      const dominantRgb = parsedDominant;
      const dominantHsl = rgbToHsl(dominantRgb[0], dominantRgb[1], dominantRgb[2]);
      const dominantFamily = classifyColorFamily(dominantHsl[0], dominantHsl[1], dominantHsl[2]);
      const domContrastW = getContrastRatio(dominantRgb, [255, 255, 255]);
      const domContrastB = getContrastRatio(dominantRgb, [0, 0, 0]);
      const dominantSwatch = {
        hex: rgbToHex(dominantRgb[0], dominantRgb[1], dominantRgb[2]),
        rgb: dominantRgb,
        hsl: dominantHsl,
        percentage: 100,
        role: "background",
        family: dominantFamily,
        isDark: dominantHsl[2] < 45,
        textColor: domContrastW > domContrastB ? "#FFFFFF" : "#000000",
        contrastWhite: Number(domContrastW.toFixed(2)),
        contrastBlack: Number(domContrastB.toFixed(2))
      };
      const families = swatches.map((s) => s.family);
      const countFamily = (f) => families.filter((x) => x === f).length;
      let warmCount = 0, coolCount = 0, neutralCount = 0;
      for (const s of swatches) {
        if ((s.hsl[0] >= 330 || s.hsl[0] < 80) && s.hsl[1] > 15) warmCount += s.percentage;
        else if (s.hsl[0] >= 160 && s.hsl[0] < 270 && s.hsl[1] > 15) coolCount += s.percentage;
        else neutralCount += s.percentage;
      }
      const isWarm = warmCount > coolCount && warmCount > 30;
      const isCool = coolCount > warmCount && coolCount > 30;
      const isNeutral = neutralCount > 50;
      const avgSat = swatches.reduce((sum, s) => sum + s.hsl[1] * (s.percentage / 100), 0);
      const isHighSaturation = avgSat > 55;
      const isLowSaturation = avgSat < 25;
      const hasBlackGold = (families.includes("黑色系") || swatches.some((s) => s.hsl[2] < 20)) && (families.includes("金色系") || swatches.some((s) => s.family === "金色系" || s.hsl[0] >= 35 && s.hsl[0] <= 55 && s.hsl[1] > 50));
      const hasBluePurpleGradient = families.includes("蓝色系") && (families.includes("紫色系") || families.includes("粉色系")) && avgSat > 40;
      const hasRedOrangeTone = families.includes("红色系") && families.includes("橙色系");
      const bgL = dominantSwatch.hsl[2];
      const backgroundType = bgL < 35 ? "dark" : bgL > 75 ? "light" : "medium";
      const themes = {
        isWarm,
        isCool,
        isNeutral,
        isHighSaturation,
        isLowSaturation,
        hasBlackGold,
        hasBluePurpleGradient,
        hasRedOrangeTone,
        backgroundType
      };
      let textColors = [];
      let textBgColors = [];
      if (!skipReason && textStatus !== "failed" && textStatus !== "timeout" && finalBoxes.length > 0) {
        try {
          if (detectionProvider === "easyocr") {
            const textColorsCollected = [];
            const localBgColorsCollected = [];
            for (const box of finalBoxes) {
              if (box.color && box.background_color) {
                const rgb = parseRgb(box.color);
                const contrast = box.readability_score ?? 1;
                const weight = 10 + Math.round(contrast * 12);
                textColorsCollected.push({
                  rgb,
                  weight,
                  bgHex: box.background_color
                });
                if (!localBgColorsCollected.includes(box.background_color)) {
                  localBgColorsCollected.push(box.background_color);
                }
              }
            }
            const merged = [];
            for (const candidate of textColorsCollected) {
              const rgb = candidate.rgb;
              const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
              let isMerged = false;
              for (const m of merged) {
                if (getColorDistance(hsl, m.hsl) < 0.15) {
                  const totalWeight2 = m.rawConfidence + candidate.weight;
                  m.rgb = [
                    Math.round((m.rgb[0] * m.rawConfidence + rgb[0] * candidate.weight) / totalWeight2),
                    Math.round((m.rgb[1] * m.rawConfidence + rgb[1] * candidate.weight) / totalWeight2),
                    Math.round((m.rgb[2] * m.rawConfidence + rgb[2] * candidate.weight) / totalWeight2)
                  ];
                  m.hsl = rgbToHsl(m.rgb[0], m.rgb[1], m.rgb[2]);
                  m.hex = rgbToHex(m.rgb[0], m.rgb[1], m.rgb[2]);
                  m.rawConfidence = totalWeight2;
                  m.fromBoxes += 1;
                  isMerged = true;
                  break;
                }
              }
              if (!isMerged) {
                merged.push({
                  hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
                  rgb,
                  hsl,
                  role: "text_secondary",
                  rawConfidence: candidate.weight,
                  fromBoxes: 1,
                  confidence: candidate.weight
                });
              }
            }
            merged.sort((a, b) => b.rawConfidence - a.rawConfidence);
            const maxConf = merged.length > 0 ? merged[0].rawConfidence : 100;
            for (const m of merged) {
              m.confidence = Number(Math.min(0.95, 0.4 + m.rawConfidence / (maxConf + 1) * 0.55).toFixed(2));
              delete m.rawConfidence;
            }
            const finalSwatches = merged.slice(0, 5);
            if (finalSwatches.length > 0) {
              finalSwatches[0].role = "text_primary";
              if (finalSwatches.length > 1) {
                let accentIdx = 1;
                let maxSat = finalSwatches[1].hsl[1];
                for (let j = 1; j < finalSwatches.length; j++) {
                  if (finalSwatches[j].hsl[1] > maxSat) {
                    maxSat = finalSwatches[j].hsl[1];
                    accentIdx = j;
                  }
                }
                finalSwatches[accentIdx].role = "text_accent";
                for (let j = 1; j < finalSwatches.length; j++) {
                  if (j !== accentIdx) {
                    finalSwatches[j].role = "text_secondary";
                  }
                }
              }
            }
            textColors = finalSwatches;
            textBgColors = localBgColorsCollected.slice(0, 3);
            textStatus = textColors.length > 0 ? "success" : "skipped";
          } else {
            const { TextColorExtractor } = await import("./text-color-extractor.service-CTUFbTl_.js");
            const extractor = new TextColorExtractor();
            const extOutput = await extractor.extractTextPalette({
              image_path: resolvedPath,
              text_boxes: finalBoxes.map((b) => ({
                x: b.x,
                y: b.y,
                width: b.width ?? b.w,
                height: b.height ?? b.h,
                confidence: b.confidence ?? 0.95
              })),
              provider: detectionProvider
            });
            textColors = extOutput.colors;
            textBgColors = extOutput.background_colors;
            textStatus = extOutput.status;
          }
        } catch (extErr) {
          console.error("[ColorPaletteService] TextColorExtractor execution failed:", extErr);
          textStatus = "failed";
          warnings.push(`Text color extraction failed: ${String(extErr)}`);
        }
      } else if (!skipReason && finalBoxes.length === 0 && textStatus === "none") {
        textStatus = "skipped";
        skipReason = "no_text_detected";
      }
      return {
        version: 1,
        provider: `sharp_colorthief_${dominantSwatch.isDark ? "dark" : "light"}`,
        image_palette: {
          dominant: dominantSwatch,
          swatches,
          themes,
          colors: swatches
        },
        text_palette: {
          provider: detectionProvider,
          colors: textColors,
          detected_text_box_count: finalBoxes.length,
          processed_text_box_count: Math.min(finalBoxes.length, 30),
          status: textStatus,
          textColorStatus: textStatus,
          skipReason: skipReason || void 0,
          isMock: isMockText,
          background_colors: textBgColors,
          swatches: textColors,
          warnings: skipReason ? [skipReason] : []
        },
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        warnings
      };
    } catch (e) {
      console.error("[ColorPaletteService] Error during real extraction, falling back to mock.", e);
      warnings.push(`Extraction failed, fell back. Error: ${String(e)}`);
      return this._generateMockPalette(resolvedPath, textBoxes, warnings);
    }
  }
  /**
   * Helper to crop text boxes and extract their contrast foreground text colors.
   */
  async _extractTextColors(sharp2, resolvedPath, textBoxes, dominantBg) {
    const textColorsCollected = [];
    if (!textBoxes || textBoxes.length === 0) {
      return [];
    }
    try {
      const meta = await sharp2(resolvedPath).metadata();
      const imgW = meta.width || 1e3;
      const imgH = meta.height || 1e3;
      const colorthief = await getColorThief();
      const boxesToProcess = textBoxes.slice(0, 5);
      for (const box of boxesToProcess) {
        let x = Number(box.x || box.left || 0);
        let y = Number(box.y || box.top || 0);
        let w = Number(box.width || box.w || 0);
        let h = Number(box.height || box.h || 0);
        if (x < 1 && y < 1 && w < 1 && h < 1) {
          x = Math.round(x * imgW);
          y = Math.round(y * imgH);
          w = Math.round(w * imgW);
          h = Math.round(h * imgH);
        }
        const pad = 3;
        const cropX = Math.max(0, x - pad);
        const cropY = Math.max(0, y - pad);
        const cropW = Math.min(imgW - cropX, w + pad * 2);
        const cropH = Math.min(imgH - cropY, h + pad * 2);
        if (cropW < 4 || cropH < 4) continue;
        const cropBuffer = await sharp2(resolvedPath).extract({ left: cropX, top: cropY, width: cropW, height: cropH }).rotate().flatten({ background: "#ffffff" }).toColorspace("srgb").jpeg({ quality: 92 }).toBuffer();
        try {
          const rawSubColors = await colorthief.getPalette(cropBuffer, 5);
          if (rawSubColors && rawSubColors.length > 0) {
            const subColors = rawSubColors.map(parseRgb);
            const subBg = subColors[0];
            const contrastyColors = subColors.slice(1).map((c) => {
              return {
                rgb: c,
                contrast: getContrastRatio(c, subBg)
              };
            });
            contrastyColors.sort((a, b) => b.contrast - a.contrast);
            for (let k = 0; k < Math.min(2, contrastyColors.length); k++) {
              const item = contrastyColors[k];
              if (item.contrast > 2) {
                textColorsCollected.push({
                  rgb: item.rgb,
                  weight: 10 + Math.round(item.contrast * 2)
                });
              }
            }
          }
        } catch (cropQuantErr) {
          console.warn("[ColorPaletteService] Sub-region crop color extraction failed:", cropQuantErr);
        }
      }
    } catch (err) {
      console.warn("[ColorPaletteService] Text color crop extraction error:", err);
    }
    const merged = [];
    for (const item of textColorsCollected) {
      const rgb = item.rgb;
      const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      let isMerged = false;
      for (const m of merged) {
        if (getColorDistance(hsl, m.hsl) < 0.15) {
          const totalWeight = m.confidence + item.weight;
          m.rgb = [
            Math.round((m.rgb[0] * m.confidence + rgb[0] * item.weight) / totalWeight),
            Math.round((m.rgb[1] * m.confidence + rgb[1] * item.weight) / totalWeight),
            Math.round((m.rgb[2] * m.confidence + rgb[2] * item.weight) / totalWeight)
          ];
          m.hsl = rgbToHsl(m.rgb[0], m.rgb[1], m.rgb[2]);
          m.hex = rgbToHex(m.rgb[0], m.rgb[1], m.rgb[2]);
          m.confidence = totalWeight;
          m.sourceCount += 1;
          isMerged = true;
          break;
        }
      }
      if (!isMerged) {
        merged.push({
          hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
          rgb,
          hsl,
          confidence: item.weight,
          sourceCount: 1,
          role: "text_secondary"
        });
      }
    }
    merged.sort((a, b) => b.confidence - a.confidence);
    const finalTextPalette = merged.slice(0, 5);
    if (finalTextPalette.length > 0) {
      finalTextPalette[0].role = "text_primary";
      if (finalTextPalette.length > 1) {
        let accentIdx = 1;
        let maxSat = finalTextPalette[1].hsl[1];
        for (let j = 1; j < finalTextPalette.length; j++) {
          if (finalTextPalette[j].hsl[1] > maxSat) {
            maxSat = finalTextPalette[j].hsl[1];
            accentIdx = j;
          }
        }
        finalTextPalette[accentIdx].role = "text_accent";
        for (let j = 1; j < finalTextPalette.length; j++) {
          if (j !== accentIdx) {
            finalTextPalette[j].role = "text_secondary";
          }
        }
      }
    }
    finalTextPalette.push({
      hex: dominantBg.hex,
      rgb: dominantBg.rgb,
      hsl: dominantBg.hsl,
      confidence: 100,
      sourceCount: textBoxes.length,
      role: "text_background"
    });
    return finalTextPalette;
  }
  _generateMockPalette(filePath, textBoxes = [], warnings = [], detectionProvider = "mock_fallback") {
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      hash = filePath.charCodeAt(i) + ((hash << 5) - hash);
    }
    const swatches = [];
    const baseH = Math.abs(hash) % 360;
    const percentages = [40, 25, 15, 10, 5, 3, 1, 1];
    for (let i = 0; i < 8; i++) {
      const h = (baseH + i * 40) % 360;
      const s = 40 + Math.abs(hash + i * 7) % 40;
      const l = 15 + Math.abs(hash + i * 13) % 65;
      const rgb = hslToRgb(h, s, l);
      const family = classifyColorFamily(h, s, l);
      const contrastWhite = getContrastRatio(rgb, [255, 255, 255]);
      const contrastBlack = getContrastRatio(rgb, [0, 0, 0]);
      let role = "secondary";
      if (i === 0) role = "background";
      else if (i === 1) role = "primary";
      else if (i === 2) role = "accent";
      swatches.push({
        hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
        rgb,
        hsl: [h, s, l],
        percentage: percentages[i],
        role,
        family,
        isDark: l < 45,
        textColor: contrastWhite > contrastBlack ? "#FFFFFF" : "#000000",
        contrastWhite: Number(contrastWhite.toFixed(2)),
        contrastBlack: Number(contrastBlack.toFixed(2))
      });
    }
    const dominantSwatch = swatches[0];
    const families = swatches.map((s) => s.family);
    const themes = {
      isWarm: baseH < 90 || baseH > 270,
      isCool: baseH >= 120 && baseH <= 240,
      isNeutral: Math.abs(hash) % 5 === 0,
      isHighSaturation: Math.abs(hash) % 3 === 0,
      isLowSaturation: Math.abs(hash) % 7 === 0,
      hasBlackGold: swatches.some((s) => s.hsl[2] < 20) && families.includes("黄色系"),
      hasBluePurpleGradient: families.includes("蓝色系") && families.includes("紫色系"),
      hasRedOrangeTone: families.includes("红色系") && families.includes("橙色系"),
      backgroundType: dominantSwatch.hsl[2] < 35 ? "dark" : dominantSwatch.hsl[2] > 75 ? "light" : "medium"
    };
    const textSwatches = [];
    if (textBoxes && textBoxes.length > 0) {
      const textPrimaryColor = dominantSwatch.isDark ? [255, 255, 255] : [34, 34, 34];
      const textHsl = rgbToHsl(textPrimaryColor[0], textPrimaryColor[1], textPrimaryColor[2]);
      textSwatches.push({
        hex: rgbToHex(textPrimaryColor[0], textPrimaryColor[1], textPrimaryColor[2]),
        rgb: textPrimaryColor,
        hsl: textHsl,
        confidence: 0.88,
        sourceCount: textBoxes.length,
        role: "text_primary"
      });
      textSwatches.push({
        hex: dominantSwatch.hex,
        rgb: dominantSwatch.rgb,
        hsl: dominantSwatch.hsl,
        confidence: 1,
        sourceCount: textBoxes.length,
        role: "text_background"
      });
    }
    const textColors = textSwatches.filter((x) => x.role !== "text_background").map((c) => ({
      hex: c.hex,
      rgb: c.rgb,
      hsl: c.hsl,
      role: c.role,
      confidence: c.confidence,
      from_boxes: textBoxes.length
    }));
    const bgs = textSwatches.filter((x) => x.role === "text_background").map((x) => x.hex);
    return {
      version: 1,
      provider: `mock_fallback_${dominantSwatch.isDark ? "dark" : "light"}`,
      image_palette: {
        dominant: dominantSwatch,
        swatches,
        themes,
        colors: swatches
      },
      text_palette: {
        provider: detectionProvider,
        colors: textColors,
        detected_text_box_count: textBoxes.length,
        processed_text_box_count: Math.min(textBoxes.length, 30),
        status: textColors.length > 0 ? "success" : "none",
        textColorStatus: textColors.length > 0 ? "success" : "none",
        isMock: true,
        background_colors: bgs,
        swatches: textSwatches,
        warnings: ["Mock color quantizer active. Install sharp/colorthief for production results."]
      },
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      warnings
    };
  }
  /**
   * Background runner that processes an asset's color palette extraction,
   * writes the payload directly to SQLite assets.color_palette_json, and
   * populates pending color semantic tag suggestions.
   */
  async extractAndSavePalette(assetId, filePath, textBoxes = []) {
    try {
      const db2 = getDatabase();
      let activeFilePath = filePath;
      try {
        const assetRow = db2.prepare("SELECT file_path, normalize_status FROM assets WHERE id = ?").get(assetId);
        if (assetRow && (!assetRow.normalize_status || assetRow.normalize_status === "not_started" || assetRow.normalize_status === "failed")) {
          console.log(`[ColorPaletteService] Progressive standardization: Asset ${assetId} has normalize_status ${assetRow.normalize_status || "null"}. Normalizing...`);
          const normRes = await ImageNormalizeService.normalize(assetRow.file_path, assetId);
          if (normRes.normalizeStatus === "completed") {
            db2.prepare(`
              UPDATE assets
              SET file_path = ?, thumbnail_path = ?, width = ?, height = ?,
                  original_path = ?, normalized_path = ?, original_format = ?, normalized_format = ?,
                  has_alpha = ?, color_space = ?, normalize_status = ?, normalized_at = ?, image_metadata_json = ?, updated_at = ?
              WHERE id = ?
            `).run(
              normRes.normalizedPath,
              normRes.thumbnailPath,
              normRes.normalizedWidth,
              normRes.normalizedHeight,
              normRes.originalPath,
              normRes.normalizedPath,
              normRes.originalFormat,
              normRes.normalizedFormat,
              normRes.hasAlpha ? 1 : 0,
              normRes.colorSpace,
              normRes.normalizeStatus,
              normRes.processedAt,
              JSON.stringify(normRes),
              (/* @__PURE__ */ new Date()).toISOString(),
              assetId
            );
            activeFilePath = normRes.normalizedPath;
            console.log(`[ColorPaletteService] Progressive standardization: Asset ${assetId} standardized successfully. Target: ${activeFilePath}`);
          }
        }
      } catch (normErr) {
        console.error(`[ColorPaletteService] Progressive standardization failed during background extract for asset ${assetId}:`, normErr);
      }
      let finalTextBoxes = textBoxes;
      if (!finalTextBoxes || finalTextBoxes.length === 0) {
        try {
          const row = db2.prepare("SELECT ai_analysis_json FROM assets WHERE id = ?").get(assetId);
          if (row && row.ai_analysis_json) {
            const analysis = JSON.parse(row.ai_analysis_json);
            if (analysis && Array.isArray(analysis.text_blocks)) {
              finalTextBoxes = analysis.text_blocks;
              console.log(`[ColorPaletteService] Loaded ${finalTextBoxes.length} text blocks from ai_analysis_json for asset ${assetId}.`);
            }
          }
        } catch (dbErr) {
          console.warn("[ColorPaletteService] Failed to load ai_analysis_json for text boxes:", dbErr);
        }
      }
      const palette = await this.extractPalette(activeFilePath, finalTextBoxes, assetId);
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      const dominantHex = palette.image_palette.dominant.hex;
      db2.prepare(`
        UPDATE assets
        SET color_palette_json = ?, dominant_color = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(palette), dominantHex, now2, assetId);
      console.log(`[ColorPaletteService] Successfully extracted and saved palette JSON for asset ${assetId}. Dominant: ${dominantHex}`);
      const colorTags = [];
      const dominantFamily = palette.image_palette.dominant.family;
      colorTags.push({ name: dominantFamily, confidence: 0.95 });
      const topSwatches = palette.image_palette.swatches.slice(1, 4);
      for (const s of topSwatches) {
        if (s.family !== dominantFamily && !colorTags.some((t) => t.name === s.family)) {
          colorTags.push({ name: s.family, confidence: 0.85 });
        }
      }
      const th = palette.image_palette.themes;
      if (th.isWarm) colorTags.push({ name: "暖色调", confidence: 0.8 });
      if (th.isCool) colorTags.push({ name: "冷色调", confidence: 0.8 });
      if (th.isNeutral) colorTags.push({ name: "中性色", confidence: 0.75 });
      if (th.isHighSaturation) colorTags.push({ name: "高饱和", confidence: 0.85 });
      if (th.isLowSaturation) colorTags.push({ name: "低饱和", confidence: 0.85 });
      if (th.hasBlackGold) colorTags.push({ name: "黑金", confidence: 0.9 });
      if (th.hasBluePurpleGradient) colorTags.push({ name: "蓝紫渐变", confidence: 0.9 });
      if (th.hasRedOrangeTone) colorTags.push({ name: "红橙色调", confidence: 0.9 });
      if (th.backgroundType === "dark") colorTags.push({ name: "深色背景", confidence: 0.95 });
      if (th.backgroundType === "light") colorTags.push({ name: "浅色背景", confidence: 0.95 });
      const textPalette = palette.text_palette;
      const textSwatches = textPalette && Array.isArray(textPalette.swatches) ? textPalette.swatches : [];
      const hasValidTextPalette = textPalette && textPalette.status === "success" && textPalette.isMock !== true && textSwatches.length > 0;
      if (hasValidTextPalette) {
        const textPrimary = textSwatches.find((s) => s.role === "text_primary");
        if (textPrimary) {
          const textFamily = classifyColorFamily(textPrimary.hsl[0], textPrimary.hsl[1], textPrimary.hsl[2]);
          if (textFamily === "白色系") {
            colorTags.push({ name: "文字白色", confidence: 0.9 });
          } else if (textFamily === "金色系") {
            colorTags.push({ name: "金色文字", confidence: 0.9 });
          }
        }
      }
      const insertSuggestion = db2.prepare(`
        INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
        VALUES (?, ?, ?, 'custom', 'color_palette', ?, 'pending', 'ColorPaletteExtractor', ?, ?, ?)
      `);
      db2.transaction(() => {
        for (const tag of colorTags) {
          const exists = db2.prepare(`
            SELECT 1 FROM tag_suggestions
            WHERE asset_id = ? AND tag_name = ? AND source = 'color_palette'
          `).get(assetId, tag.name);
          if (!exists) {
            const sugId = `sug-color-${Math.random().toString(36).substr(2, 9)}`;
            insertSuggestion.run(
              sugId,
              assetId,
              tag.name,
              tag.confidence,
              JSON.stringify({ color: dominantHex, themes: th }),
              now2,
              now2
            );
          }
        }
      })();
      console.log(`[ColorPaletteService] Added ${colorTags.length} pending color semantic tags for asset ${assetId}.`);
      this.notifyRenderer(assetId);
    } catch (err) {
      console.error(`[ColorPaletteService] Failed background extraction for asset ${assetId}:`, err);
    }
  }
  /**
   * Helper to send sync notification to the Electron renderer process.
   */
  notifyRenderer(assetId) {
    try {
      const { BrowserWindow: BrowserWindow2 } = require2("electron");
      BrowserWindow2.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("ai:task-synced", { assetId });
        }
      });
    } catch (err) {
      console.log("[ColorPaletteService] Skip renderer notification (non-Electron environment)");
    }
  }
  /**
   * Scans SQLite for all assets that do not have a valid color palette
   * (e.g. color_palette_json is null, empty, or contaminated with NaN/null bad values),
   * and runs background queue processing to batch extract them.
   */
  static async runStartupBatchScanner() {
    try {
      const db2 = getDatabase();
      const service = new ColorPaletteService();
      const rows = db2.prepare(`
        SELECT id, file_path, color_palette_json, ai_analysis_json FROM assets
      `).all();
      const assetsToProcess = [];
      for (const row of rows) {
        let needsExtraction = false;
        if (!row.color_palette_json || row.color_palette_json === "" || row.color_palette_json.includes("NAN") || row.color_palette_json.includes("null") || row.color_palette_json.includes("mock_fallback")) {
          needsExtraction = true;
        } else if (row.ai_analysis_json && row.ai_analysis_json !== "") {
          try {
            const analysis = JSON.parse(row.ai_analysis_json);
            const hasTextBlocks = analysis && Array.isArray(analysis.text_blocks) && analysis.text_blocks.length > 0;
            if (hasTextBlocks) {
              const palette = JSON.parse(row.color_palette_json);
              const hasTextSwatches = palette && palette.text_palette && Array.isArray(palette.text_palette.swatches) && palette.text_palette.swatches.filter((s) => s.role !== "text_background").length > 0;
              if (!hasTextSwatches) {
                console.log(`[ColorPaletteService] Asset ${row.id} has AI text blocks but lacks text swatches in palette. Queueing for repair.`);
                needsExtraction = true;
              }
            }
          } catch (e) {
          }
        }
        if (!needsExtraction && row.color_palette_json) {
          try {
            const palette = JSON.parse(row.color_palette_json);
            const textPalette = palette.text_palette;
            if (!textPalette || !textPalette.swatches || textPalette.swatches.length === 0 || textPalette.status !== "success" || textPalette.isMock === true) {
              console.log(`[ColorPaletteService] Asset ${row.id} has legacy, missing, or mock text palette. Queueing for real EasyOCR refresh.`);
              needsExtraction = true;
            }
          } catch (e) {
            needsExtraction = true;
          }
        }
        if (needsExtraction) {
          assetsToProcess.push({ id: row.id, file_path: row.file_path });
        }
      }
      if (assetsToProcess.length === 0) {
        console.log("[ColorPaletteService] Startup batch scanner: All assets have valid and fully updated color palettes. Scanning complete.");
        return;
      }
      console.log(`[ColorPaletteService] Startup batch scanner: Found ${assetsToProcess.length} assets requiring color palette extraction/repair. Starting background batch queue...`);
      (async () => {
        let count = 0;
        for (const asset of assetsToProcess) {
          try {
            console.log(`[ColorPaletteService] Background batch quantizing/repairing asset ${asset.id} (${asset.file_path})...`);
            await service.extractAndSavePalette(asset.id, asset.file_path);
            count++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`[ColorPaletteService] Background batch quantization failed for asset ${asset.id}:`, err);
          }
        }
        console.log(`[ColorPaletteService] Startup batch scanner: Successfully processed and saved color palettes for ${count}/${assetsToProcess.length} assets.`);
      })().catch((e) => {
        console.error("[ColorPaletteService] Background batch runner error:", e);
      });
    } catch (e) {
      console.error("[ColorPaletteService] Failed to run startup batch color palette scanner:", e);
    }
  }
  /**
   * Refreshes text color palette dynamically when Qwen-VL deep layout sweep provides high-accuracy text_blocks.
   */
  async refreshTextPaletteFromTextBlocks(assetId, textBlocks) {
    try {
      const db2 = getDatabase();
      const row = db2.prepare("SELECT file_path, color_palette_json FROM assets WHERE id = ?").get(assetId);
      if (!row) {
        console.warn(`[ColorPaletteService] Asset ${assetId} not found, skipping text palette refresh.`);
        return;
      }
      const filePath = row.file_path;
      let existingPalette = null;
      if (row.color_palette_json) {
        try {
          existingPalette = JSON.parse(row.color_palette_json);
        } catch (_) {
        }
      }
      if (existingPalette && existingPalette.text_palette) {
        const existingCount = existingPalette.text_palette.detected_text_box_count || 0;
        const newCount = textBlocks ? textBlocks.length : 0;
        if (existingPalette.text_palette.status === "success" && existingPalette.text_palette.provider === "qwen_vl_text_blocks" && existingCount >= newCount) {
          console.log(`[ColorPaletteService] Existing Qwen-VL text palette for asset ${assetId} is already high-confidence with ${existingCount} boxes. Skipping refresh.`);
          return;
        }
      }
      console.log(`[ColorPaletteService] Refreshing text palette for asset ${assetId} using Qwen-VL text_blocks (count: ${textBlocks.length}).`);
      const parsedBoxes = parseTextBoxes(textBlocks);
      const palette = await this.extractPalette(filePath, parsedBoxes, assetId);
      if (palette.text_palette) {
        palette.text_palette.provider = "qwen_vl_text_blocks";
      }
      const dominantHex = palette.image_palette.dominant.hex;
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      db2.prepare(`
        UPDATE assets
        SET color_palette_json = ?, dominant_color = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(palette), dominantHex, now2, assetId);
      console.log(`[ColorPaletteService] Text palette successfully refreshed and saved for asset ${assetId}.`);
      const colorTags = [];
      const textPalette = palette.text_palette;
      const textSwatches = textPalette && Array.isArray(textPalette.swatches) ? textPalette.swatches : [];
      const hasValidTextPalette = textPalette && textPalette.status === "success" && textPalette.isMock !== true && textSwatches.length > 0;
      if (hasValidTextPalette) {
        const textPrimary = textSwatches.find((s) => s.role === "text_primary");
        if (textPrimary) {
          const textFamily = classifyColorFamily(textPrimary.hsl[0], textPrimary.hsl[1], textPrimary.hsl[2]);
          if (textFamily === "白色系") {
            colorTags.push({ name: "文字白色", confidence: 0.9 });
          } else if (textFamily === "金色系") {
            colorTags.push({ name: "金色文字", confidence: 0.9 });
          }
        }
      }
      if (colorTags.length > 0) {
        const insertSuggestion = db2.prepare(`
          INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
          VALUES (?, ?, ?, 'custom', 'color_palette', ?, 'pending', 'ColorPaletteExtractor', ?, ?, ?)
        `);
        db2.transaction(() => {
          for (const tag of colorTags) {
            const exists = db2.prepare(`
              SELECT 1 FROM tag_suggestions
              WHERE asset_id = ? AND tag_name = ? AND source = 'color_palette'
            `).get(assetId, tag.name);
            if (!exists) {
              const sugId = `sug-color-refresh-${Math.random().toString(36).substr(2, 9)}`;
              insertSuggestion.run(
                sugId,
                assetId,
                tag.name,
                tag.confidence,
                JSON.stringify({ source: "qwen_vl_text_blocks", text_blocks_count: textBlocks.length }),
                now2,
                now2
              );
            }
          }
        })();
      }
    } catch (err) {
      console.error(`[ColorPaletteService] Failed to refresh text palette for asset ${assetId}:`, err);
    }
  }
}
const colorPalette_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ColorPaletteService,
  classifyColorFamily,
  getColorDistance,
  getContrastRatio,
  hexToRgb,
  hslToRgb,
  parseRgb,
  parseTextBoxes,
  rgbToHex,
  rgbToHsl
}, Symbol.toStringTag, { value: "Module" }));
class TagSearchService {
  getDb() {
    return getDatabase();
  }
  // Populate tags for a list of raw asset rows
  populateTagsForAssets(assets, includePending) {
    const db2 = this.getDb();
    const statusClause = includePending ? "at.status != 'rejected'" : "at.status = 'confirmed'";
    const getTagsStmt = db2.prepare(`
      SELECT t.name FROM tags t
      JOIN asset_tags at ON t.id = at.tag_id
      WHERE at.asset_id = ? AND ${statusClause}
    `);
    return assets.map((asset) => {
      const tagRows = getTagsStmt.all(asset.id);
      return {
        ...asset,
        tags: tagRows.map((r) => r.name)
      };
    });
  }
  searchAssetsByTags(queries, includePending) {
    const db2 = this.getDb();
    if (!queries || queries.length === 0) {
      const allAssets = db2.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
      return this.populateTagsForAssets(allAssets, includePending);
    }
    let sql = "SELECT * FROM assets WHERE ";
    const clauses = [];
    const params = [];
    const statusClause = includePending ? "(at.status = 'confirmed' OR at.status = 'pending')" : "at.status = 'confirmed'";
    for (const q of queries) {
      if (!q.includes(":")) {
        clauses.push("(title LIKE ? OR file_name LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
        continue;
      }
      const parts = q.split(":");
      const filterType = parts[0].trim().toLowerCase();
      const filterVal = parts.slice(1).join(":").trim();
      if (filterType === "tag") {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE (t.name = ? OR EXISTS (
            SELECT 1 FROM tag_aliases ta WHERE ta.tag_id = t.id AND ta.alias = ?
          )) AND ${statusClause}
        )`);
        params.push(filterVal, filterVal);
      } else if (filterType === "type") {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE t.type = ? AND ${statusClause}
        )`);
        params.push(filterVal);
      } else if (filterType === "source") {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          LEFT JOIN tags t ON at.tag_id = t.id 
          WHERE (t.type = 'source' AND t.name = ? AND ${statusClause}) 
             OR (at.source = ? AND ${statusClause})
        )`);
        params.push(filterVal, filterVal);
      } else if (filterType === "special") {
        const specialKey = filterVal.toLowerCase();
        if (specialKey === "untagged") {
          clauses.push(`id NOT IN (
            SELECT DISTINCT asset_id FROM asset_tags WHERE status = 'confirmed'
          )`);
        } else if (specialKey === "ai_pending") {
          clauses.push(`(
            id IN (SELECT DISTINCT asset_id FROM asset_tags WHERE status = 'pending')
            OR id IN (SELECT DISTINCT asset_id FROM tag_suggestions WHERE status = 'pending')
          )`);
        }
      }
    }
    if (clauses.length === 0) {
      const allAssets = db2.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
      return this.populateTagsForAssets(allAssets, includePending);
    }
    sql += clauses.join(" AND ");
    sql += " ORDER BY created_at DESC";
    const rows = db2.prepare(sql).all(...params);
    return this.populateTagsForAssets(rows, includePending);
  }
  getUntaggedAssets() {
    return this.searchAssetsByTags(["special:untagged"]);
  }
  getAssetsWithPendingAiTags() {
    return this.searchAssetsByTags(["special:ai_pending"]);
  }
  getAssetsByTagType(type) {
    return this.searchAssetsByTags([`type:${type}`]);
  }
  getAssetsByTagSource(source) {
    return this.searchAssetsByTags([`source:${source}`]);
  }
}
function tryGetImageDimensions(filePath) {
  try {
    const resolvedPath = filePath.startsWith("~") ? filePath.replace("~", process.env.USERPROFILE || process.env.HOME || "") : filePath;
    if (!fs.existsSync(resolvedPath)) return null;
    const buffer = fs.readFileSync(resolvedPath);
    if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (buffer[0] === 255 && buffer[1] === 216) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        const marker = buffer.readUInt16BE(offset);
        if (marker === 65497) break;
        if (marker === 65498) break;
        const length = buffer.readUInt16BE(offset + 2);
        if (marker >= 65472 && marker <= 65475 || marker >= 65477 && marker <= 65479 || marker >= 65481 && marker <= 65483 || marker >= 65485 && marker <= 65487) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + length;
      }
    }
  } catch (e) {
  }
  return null;
}
class AssetService {
  getDb() {
    return getDatabase();
  }
  listAssets(filters) {
    const db2 = this.getDb();
    const searchService = new TagSearchService();
    if (filters?.keyword && (filters.keyword.includes(":") || filters.keyword.startsWith("special:"))) {
      const queries = filters.keyword.split(/\s+/).filter(Boolean);
      let results = searchService.searchAssetsByTags(queries, filters.includePending);
      if (filters.siteId) {
        results = results.filter((a) => a.source_site_id === filters.siteId);
      }
      return results;
    }
    let query = "SELECT a.* FROM assets a";
    const params = [];
    const clauses = [];
    const statusClause = filters?.includePending ? "(at.status = 'confirmed' OR at.status = 'pending')" : "at.status = 'confirmed'";
    if (filters?.tagName) {
      query += `
        JOIN asset_tags at ON a.id = at.asset_id
        JOIN tags t ON at.tag_id = t.id
      `;
      clauses.push(`t.name = ? AND ${statusClause}`);
      params.push(filters.tagName);
    }
    if (filters?.keyword) {
      clauses.push("(a.title LIKE ? OR a.source_site_name LIKE ?)");
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    if (filters?.siteId) {
      clauses.push("a.source_site_id = ?");
      params.push(filters.siteId);
    }
    if (clauses.length > 0) {
      query += " WHERE " + clauses.join(" AND ");
    }
    query += " ORDER BY a.created_at DESC";
    const assets = db2.prepare(query).all(...params);
    return searchService.populateTagsForAssets(assets, filters?.includePending);
  }
  async saveAsset(asset, tagsList = []) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const existing = db2.prepare("SELECT * FROM assets WHERE id = ?").get(asset.id);
    let finalAsset = { ...asset };
    let originalPath = asset.original_path || asset.file_path;
    let normalizedPath = asset.normalized_path || asset.file_path;
    let thumbnailPath = asset.thumbnail_path;
    let originalFormat = asset.original_format || asset.file_type || "jpeg";
    let normalizedFormat = asset.normalized_format || "jpeg";
    let hasAlpha = asset.has_alpha || 0;
    let colorSpace = asset.color_space || "srgb";
    let normalizeStatus = asset.normalize_status || "not_started";
    let normalizedAt = asset.normalized_at || "";
    let imageMetadataJson = asset.image_metadata_json || "";
    const resolvedOriginal = ImageMetadataService.resolvePath(originalPath);
    if (fs.existsSync(resolvedOriginal)) {
      try {
        const normRes = await ImageNormalizeService.normalize(originalPath, asset.id);
        originalPath = normRes.originalPath;
        normalizedPath = normRes.normalizedPath;
        thumbnailPath = normRes.thumbnailPath;
        originalFormat = normRes.originalFormat;
        normalizedFormat = normRes.normalizedFormat;
        hasAlpha = normRes.hasAlpha ? 1 : 0;
        colorSpace = normRes.colorSpace;
        normalizeStatus = normRes.normalizeStatus;
        normalizedAt = normRes.processedAt;
        imageMetadataJson = JSON.stringify(normRes);
        finalAsset.file_path = normalizedPath;
        finalAsset.thumbnail_path = thumbnailPath;
        finalAsset.width = normRes.normalizedWidth;
        finalAsset.height = normRes.normalizedHeight;
      } catch (normErr) {
        console.error("[AssetService] Image normalization during save failed:", normErr);
      }
    }
    const dims = tryGetImageDimensions(finalAsset.file_path);
    const finalWidth = dims ? dims.width : finalAsset.width || null;
    const finalHeight = dims ? dims.height : finalAsset.height || null;
    db2.transaction(() => {
      if (existing) {
        db2.prepare(`
          UPDATE assets
          SET title = ?, file_name = ?, file_path = ?, thumbnail_path = ?, source_site_id = ?, source_site_name = ?,
              source_page_url = ?, original_url = ?, width = ?, height = ?, file_size = ?, file_type = ?, dominant_color = ?,
              original_path = ?, normalized_path = ?, original_format = ?, normalized_format = ?, has_alpha = ?, color_space = ?,
              normalize_status = ?, normalized_at = ?, image_metadata_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          finalAsset.title,
          finalAsset.file_name,
          finalAsset.file_path,
          finalAsset.thumbnail_path,
          finalAsset.source_site_id,
          finalAsset.source_site_name,
          finalAsset.source_page_url || null,
          finalAsset.original_url || null,
          finalWidth,
          finalHeight,
          finalAsset.file_size || null,
          finalAsset.file_type || null,
          finalAsset.dominant_color || null,
          originalPath,
          normalizedPath,
          originalFormat,
          normalizedFormat,
          hasAlpha,
          colorSpace,
          normalizeStatus,
          normalizedAt,
          imageMetadataJson || null,
          now2,
          finalAsset.id
        );
      } else {
        db2.prepare(`
          INSERT INTO assets (
            id, title, file_name, file_path, thumbnail_path, source_site_id, source_site_name, source_page_url, original_url,
            width, height, file_size, file_type, dominant_color, ai_tag_status, ai_prompt_status, ai_analysis_status,
            original_path, normalized_path, original_format, normalized_format, has_alpha, color_space, normalize_status, normalized_at, image_metadata_json,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 'not_started', 'not_started', 'not_started',
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `).run(
          finalAsset.id,
          finalAsset.title,
          finalAsset.file_name,
          finalAsset.file_path,
          finalAsset.thumbnail_path,
          finalAsset.source_site_id,
          finalAsset.source_site_name,
          finalAsset.source_page_url || null,
          finalAsset.original_url || null,
          finalWidth,
          finalHeight,
          finalAsset.file_size || null,
          finalAsset.file_type || null,
          finalAsset.dominant_color || null,
          originalPath,
          normalizedPath,
          originalFormat,
          normalizedFormat,
          hasAlpha,
          colorSpace,
          normalizeStatus,
          normalizedAt,
          imageMetadataJson || null,
          now2,
          now2
        );
      }
      db2.prepare("DELETE FROM asset_tags WHERE asset_id = ? AND source = 'manual'").run(finalAsset.id);
      for (const tagName of tagsList) {
        if (!tagName.trim()) continue;
        let tagRecord = db2.prepare("SELECT * FROM tags WHERE name = ?").get(tagName);
        if (!tagRecord) {
          const tagId = `tag-custom-${Math.random().toString(36).substr(2, 9)}`;
          const tagColors = [
            "bg-rose-50 text-rose-700 border border-rose-200",
            "bg-slate-100 text-slate-700 border border-slate-200",
            "bg-indigo-50 text-indigo-700 border border-indigo-200",
            "bg-amber-50 text-amber-700 border border-amber-200"
          ];
          const chosenColor = tagColors[Math.floor(Math.random() * tagColors.length)];
          const normalized = tagName.toLowerCase().trim();
          db2.prepare(`
            INSERT INTO tags (id, name, normalized_name, slug, type, color, description, aliases, is_system, usage_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'custom', ?, '', ?, 0, 0, ?, ?)
          `).run(
            tagId,
            tagName,
            normalized,
            normalized,
            chosenColor,
            JSON.stringify([]),
            now2,
            now2
          );
          tagRecord = { id: tagId, name: tagName, color: chosenColor, created_at: now2 };
        }
        const assetTagId = `${finalAsset.id}_${tagRecord.id}_manual`;
        db2.prepare(`
          INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_by, created_at, updated_at)
          VALUES (?, ?, ?, 'manual', 1.0, 'confirmed', 'user', ?, ?)
        `).run(assetTagId, finalAsset.id, tagRecord.id, now2, now2);
        db2.prepare("UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?").run(tagRecord.id);
      }
    })();
    const hasPalette = existing && existing.color_palette_json && existing.color_palette_json !== "" && !existing.color_palette_json.includes("NAN") && !existing.color_palette_json.includes("null");
    if (!hasPalette) {
      const paletteService = new ColorPaletteService();
      paletteService.extractAndSavePalette(finalAsset.id, finalAsset.file_path).catch((err) => {
        console.error("[AssetService] Background color palette extraction failed:", err);
      });
    }
    return {
      ...finalAsset,
      tags: tagsList,
      created_at: existing ? existing.created_at : now2,
      updated_at: now2
    };
  }
  deleteAsset(id) {
    const db2 = this.getDb();
    db2.transaction(() => {
      db2.prepare("DELETE FROM asset_tags WHERE asset_id = ?").run(id);
      db2.prepare("DELETE FROM assets WHERE id = ?").run(id);
    })();
  }
  listTags() {
    const db2 = this.getDb();
    return db2.prepare("SELECT * FROM tags ORDER BY name ASC").all();
  }
}
const customCategoriesPath = path.join(homedir(), "DesignAssetManager", "custom_categories.json");
function getCustomCategories() {
  try {
    if (fs.existsSync(customCategoriesPath)) {
      const content = fs.readFileSync(customCategoriesPath, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("[AssetIPC] Failed to read custom categories:", err);
  }
  return {};
}
function saveCustomCategory(assetId, category) {
  try {
    const data = getCustomCategories();
    data[assetId] = category;
    fs.mkdirSync(path.dirname(customCategoriesPath), { recursive: true });
    fs.writeFileSync(customCategoriesPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[AssetIPC] Failed to save custom category:", err);
  }
}
function registerAssetIpc() {
  const service = new AssetService();
  ipcMain.handle("assets:list", async (_, filters) => {
    try {
      return service.listAssets(filters);
    } catch (err) {
      console.error("[IPC] assets:list error:", err);
      throw err;
    }
  });
  ipcMain.handle("assets:save", async (_, data) => {
    try {
      const saved = await service.saveAsset(data.asset, data.tags || []);
      return { success: true, asset: saved };
    } catch (err) {
      console.error("[IPC] assets:save error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("assets:delete", async (_, id) => {
    try {
      service.deleteAsset(id);
      return { success: true, id };
    } catch (err) {
      console.error("[IPC] assets:delete error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("assets:save-custom-category", async (_, { assetId, category }) => {
    try {
      saveCustomCategory(assetId, category);
      return { success: true };
    } catch (err) {
      console.error("[IPC] assets:save-custom-category error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("assets:get-custom-category", async (_, assetId) => {
    try {
      const data = getCustomCategories();
      return { success: true, category: data[assetId] || null };
    } catch (err) {
      console.error("[IPC] assets:get-custom-category error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("assets:update-caption", async (_, { assetId, caption }) => {
    try {
      const db2 = getDatabase();
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      db2.prepare(`
        UPDATE assets
        SET ai_caption = ?, ai_caption_is_user_edited = 1, ai_caption_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).run(caption, now2, now2, assetId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] assets:update-caption error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("assets:reset-caption-edited", async (_, { assetId }) => {
    try {
      const db2 = getDatabase();
      const now2 = (/* @__PURE__ */ new Date()).toISOString();
      db2.prepare(`
        UPDATE assets
        SET ai_caption_is_user_edited = 0, ai_caption_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now2, now2, assetId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] assets:reset-caption-edited error:", err);
      return { success: false, error: String(err) };
    }
  });
}
class DownloadService {
  getDb() {
    return getDatabase();
  }
  listTasks() {
    const db2 = this.getDb();
    return db2.prepare("SELECT * FROM download_tasks ORDER BY created_at DESC").all();
  }
  saveTask(task) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const existing = db2.prepare("SELECT * FROM download_tasks WHERE id = ?").get(task.id);
    if (existing) {
      db2.prepare(`
        UPDATE download_tasks
        SET asset_title = ?, source_site_id = ?, source_site_name = ?, source_page_url = ?, download_url = ?, save_path = ?,
            status = ?, progress = ?, error_message = ?, retry_count = ?, browser_page_title = ?, capture_method = ?, updated_at = ?
        WHERE id = ?
      `).run(
        task.asset_title,
        task.source_site_id,
        task.source_site_name || null,
        task.source_page_url || null,
        task.download_url,
        task.save_path,
        task.status,
        task.progress,
        task.error_message || null,
        task.retry_count,
        task.browser_page_title || null,
        task.capture_method || "search",
        now2,
        task.id
      );
      return {
        ...existing,
        ...task,
        updated_at: now2
      };
    } else {
      db2.prepare(`
        INSERT INTO download_tasks (id, asset_title, source_site_id, source_site_name, source_page_url, download_url, save_path, status, progress, error_message, retry_count, browser_page_title, capture_method, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.id,
        task.asset_title,
        task.source_site_id,
        task.source_site_name || null,
        task.source_page_url || null,
        task.download_url,
        task.save_path,
        task.status,
        task.progress,
        task.error_message || null,
        task.retry_count,
        task.browser_page_title || null,
        task.capture_method || "search",
        now2,
        now2
      );
      return {
        ...task,
        created_at: now2,
        updated_at: now2
      };
    }
  }
  clearCompleted() {
    const db2 = this.getDb();
    db2.prepare("DELETE FROM download_tasks WHERE status = 'completed'").run();
  }
}
function registerDownloadIpc() {
  const service = new DownloadService();
  ipcMain.handle("download:list", async () => {
    try {
      return service.listTasks();
    } catch (err) {
      console.error("[IPC] download:list error:", err);
      throw err;
    }
  });
  ipcMain.handle("download:save", async (_, task) => {
    try {
      const saved = service.saveTask(task);
      return { success: true, task: saved };
    } catch (err) {
      console.error("[IPC] download:save error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("download:clear", async () => {
    try {
      service.clearCompleted();
      return { success: true };
    } catch (err) {
      console.error("[IPC] download:clear error:", err);
      return { success: false, error: String(err) };
    }
  });
}
class DemoMockSitePlugin {
  id = "demo-mock";
  name = "Demo Mock Site";
  baseUrl = "https://app.tapnow.ai";
  requiresAuth = false;
  buildSearchUrl(keyword) {
    return `${this.baseUrl}/home?q=${encodeURIComponent(keyword)}`;
  }
  async parseSearchResults(page) {
    const urlStr = page.url();
    const urlObj = new URL(urlStr);
    const keyword = urlObj.searchParams.get("q") || "Design";
    const visualTemplates = [
      {
        titleSuffix: "Minimalist Editorial Layout",
        thumb: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80",
        w: 1600,
        h: 2400,
        type: "JPG"
      },
      {
        titleSuffix: "Holographic Neon 3D Geometry",
        thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        w: 2400,
        h: 1800,
        type: "PNG"
      },
      {
        titleSuffix: "Brutalist Website Interface Wireframe",
        thumb: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
        w: 1400,
        h: 1950,
        type: "PNG"
      },
      {
        titleSuffix: "Modern Interior Visual Concept",
        thumb: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
        w: 1920,
        h: 1280,
        type: "JPG"
      },
      {
        titleSuffix: "Cyberpunk Retro Futurism Glow",
        thumb: "https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&w=600&q=80",
        w: 1920,
        h: 1080,
        type: "JPG"
      },
      {
        titleSuffix: "Abstract Fluid Acrylic Canvas",
        thumb: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80",
        w: 1200,
        h: 1800,
        type: "JPG"
      }
    ];
    await new Promise((resolve) => setTimeout(resolve, 300));
    return visualTemplates.map((tpl, idx) => ({
      id: `mock-res-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      title: `${keyword} - ${tpl.titleSuffix}`,
      thumbnailUrl: tpl.thumb,
      imageUrl: tpl.thumb.replace("&w=600", "&w=1600"),
      // high resolution swap
      sourcePageUrl: `https://unsplash.com/photos/creative-mock-${idx}`,
      sourceSite: "TapNow",
      width: tpl.w,
      height: tpl.h,
      fileType: tpl.type
    }));
  }
}
class GenericImagePagePlugin {
  id = "generic-image";
  name = "Generic Image Crawler";
  baseUrl;
  requiresAuth;
  searchUrlTemplate;
  constructor(site) {
    this.baseUrl = site.baseUrl;
    this.requiresAuth = site.requiresAuth;
    this.searchUrlTemplate = site.searchUrlTemplate;
  }
  buildSearchUrl(keyword) {
    return this.searchUrlTemplate.replace("{{keyword}}", encodeURIComponent(keyword));
  }
  async parseSearchResults(page) {
    console.log(`[GenericImagePlugin] Initiating DOM extraction on page: ${page.url()}`);
    const rawImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      return imgs.map((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || img.src || "";
        const alt = img.getAttribute("alt") || img.getAttribute("title") || img.title || "";
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        return { src, alt, width, height };
      });
    });
    const pageUrl = page.url();
    const urlObj = new URL(pageUrl);
    const siteDomain = urlObj.hostname.replace("www.", "");
    const results = [];
    for (const img of rawImages) {
      if (!img.src || img.src.startsWith("data:image")) {
        continue;
      }
      if (img.width > 0 && img.height > 0 && (img.width < 100 || img.height < 100)) {
        continue;
      }
      let absoluteUrl = img.src;
      try {
        if (!img.src.startsWith("http://") && !img.src.startsWith("https://")) {
          absoluteUrl = new URL(img.src, pageUrl).toString();
        }
      } catch (err) {
        console.warn(`[GenericImagePlugin] Failed to resolve absolute URL for src "${img.src}":`, err);
        continue;
      }
      let fileType = "JPG";
      const lowercaseUrl = absoluteUrl.toLowerCase();
      if (lowercaseUrl.includes(".png")) {
        fileType = "PNG";
      } else if (lowercaseUrl.includes(".webp")) {
        fileType = "WEBP";
      } else if (lowercaseUrl.includes(".gif")) {
        fileType = "GIF";
      } else if (lowercaseUrl.includes(".svg")) {
        fileType = "SVG";
      }
      results.push({
        id: `gen-res-${Math.random().toString(36).substr(2, 9)}`,
        title: img.alt.trim() || `${siteDomain.split(".")[0].toUpperCase()} Graphic Asset`,
        thumbnailUrl: absoluteUrl,
        imageUrl: absoluteUrl,
        sourcePageUrl: pageUrl,
        sourceSite: siteDomain.charAt(0).toUpperCase() + siteDomain.slice(1),
        width: img.width || 800,
        // fallbacks
        height: img.height || 600,
        fileType
      });
    }
    console.log(`[GenericImagePlugin] Successfully parsed and filtered ${results.length} assets from DOM.`);
    return results;
  }
}
class SearchService {
  siteService = new SiteService();
  authStateService = new AuthStateService();
  async runSearch(siteId, keyword) {
    console.log(`[SearchService] Executing search crawler for site: ${siteId}, keyword: ${keyword}`);
    const dbSites = this.siteService.listSites();
    const site = dbSites.find((s) => s.id === siteId);
    if (!site) {
      throw new Error(`无法找到注册网站配置: ${siteId}`);
    }
    let plugin;
    if (siteId === "tapnow") {
      plugin = new DemoMockSitePlugin();
    } else {
      plugin = new GenericImagePagePlugin({
        baseUrl: site.base_url,
        requiresAuth: site.requires_auth === 1,
        searchUrlTemplate: site.search_url_template
      });
    }
    let storageState = null;
    if (site.requires_auth === 1 && site.auth_status === "logged") {
      console.log(`[SearchService] Active authorization found. Loading storageState for: ${siteId}`);
      storageState = this.authStateService.loadAuthState(siteId);
    }
    console.log(`[SearchService] Starting headless Chrome scraper process...`);
    const browser = await chromium.launch({
      headless: true,
      channel: "chrome",
      // Crucial: Launches local system's official Chrome browser for security bypasses
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox"
      ]
    });
    try {
      const contextOptions = {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      };
      if (storageState) {
        contextOptions.storageState = storageState;
      }
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      const searchUrl = plugin.buildSearchUrl(keyword);
      console.log(`[SearchService] Directing browser to: ${searchUrl}`);
      await page.goto(searchUrl, {
        waitUntil: "load",
        // Wait until initial elements are ready
        timeout: 3e4
      });
      console.log(`[SearchService] Waiting for ajax dynamic content load...`);
      try {
        await page.waitForLoadState("networkidle", { timeout: 6e3 });
      } catch (e) {
        console.log(`[SearchService] Network idle wait timed out or finished, continuing...`);
      }
      console.log(`[SearchService] Performing scroll to trigger image lazy loads...`);
      try {
        await page.evaluate(() => window.scrollBy(0, 1200));
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.scrollBy(0, 1200));
        await page.waitForTimeout(1500);
      } catch (e) {
      }
      const results = await plugin.parseSearchResults(page);
      await context.close();
      await browser.close();
      return results;
    } catch (err) {
      console.error(`[SearchService] Scraper error for ${siteId}:`, err);
      try {
        await browser.close();
      } catch (e) {
      }
      throw err;
    }
  }
}
function registerSearchIpc() {
  const service = new SearchService();
  ipcMain.handle("search:run", async (_, params) => {
    try {
      console.log(`[IPC] search:run - Running query: "${params.keyword}" for site: ${params.siteId}`);
      const results = await service.runSearch(params.siteId, params.keyword);
      return { success: true, results };
    } catch (err) {
      console.error("[IPC] search:run error:", err);
      return { success: false, error: String(err), results: [] };
    }
  });
}
function createBrowserPreviewInjectionScript() {
  return `
        (() => {


          // ==========================================
          // 1. FLOATING DOWNLOAD BUTTON INJECTION
          // ==========================================
          if (!window.__image_downloader_injected__) {
            window.__image_downloader_injected__ = true;
            
            const btn = document.createElement('div');
            btn.id = 'electron-image-download-button';
            btn.style.position = 'absolute';
            btn.style.display = 'none';
            btn.style.zIndex = '999999999';
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '18px';
            btn.style.backgroundColor = '#6366f1';
            btn.style.color = '#ffffff';
            btn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
            btn.style.cursor = 'pointer';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'flex-start';
            btn.style.padding = '0 10px';
            btn.style.boxSizing = 'border-box';
            btn.style.overflow = 'hidden';
            btn.style.whiteSpace = 'nowrap';
            btn.style.transition = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s';
            
            btn.innerHTML = \`
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span style="margin-left: 6px; font-size: 11px; font-family: system-ui, -apple-system, sans-serif; font-weight: bold; opacity: 0; transition: opacity 0.15s ease-out; flex-shrink: 0; pointer-events: none;">涓嬭浇绱犳潗</span>
            \`;

            document.body.appendChild(btn);

            let activeImg = null;
            let activeMetadata = null;

            btn.addEventListener('mouseenter', () => {
              btn.style.width = '96px';
              btn.style.transform = 'scale(1.08)';
              btn.style.backgroundColor = '#4f46e5';
              const text = btn.querySelector('span');
              if (text) {
                text.style.opacity = '1';
              }
            });

            btn.addEventListener('mouseleave', () => {
              btn.style.width = '36px';
              btn.style.transform = 'scale(1.0)';
              btn.style.backgroundColor = '#6366f1';
              const text = btn.querySelector('span');
              if (text) {
                text.style.opacity = '0';
              }
            });

            document.addEventListener('mouseover', (e) => {
              let img = e.target.closest('img');
              
              // Smart traversal for elements with overlays on top (e.g. inside a card link 'a' tag)
              if (!img && e.target) {
                const cardLink = e.target.closest('a');
                if (cardLink) {
                  img = cardLink.querySelector('img');
                }
              }
              
              if (!img) return;

              const w = img.naturalWidth || img.width || img.offsetWidth || 0;
              const h = img.naturalHeight || img.height || img.offsetHeight || 0;

              if (w > 0 && h > 0 && (w < 300 || h < 300)) return;

              const src = img.currentSrc || img.src;
              if (!src || src.startsWith('data:')) return;

              const lowerUrl = src.toLowerCase();
              const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
              if (blockTerms.some(term => lowerUrl.includes(term))) {
                return;
              }

              activeImg = img;
              activeMetadata = {
                url: src,
                title: img.alt || img.title || document.title || '鎻愬彇绱犳潗',
                width: w,
                height: h
              };

              const rect = img.getBoundingClientRect();
              const pageX = rect.left + window.scrollX;
              const pageY = rect.top + window.scrollY;
              const imgHeight = rect.height;

              btn.style.left = (pageX + 12) + 'px';
              btn.style.top = (pageY + Math.max(12, imgHeight - 36 - 16)) + 'px';
              btn.style.display = 'flex';
            });

            document.addEventListener('mouseout', (e) => {
              const img = e.target.closest('img');
              if (!img) return;
              
              const toElement = e.relatedTarget;
              if (toElement && (toElement === btn || btn.contains(toElement))) {
                return;
              }

              btn.style.display = 'none';
            });

            btn.addEventListener('mouseleave', (e) => {
              const toElement = e.relatedTarget;
              if (toElement && toElement === activeImg) {
                return;
              }
              btn.style.display = 'none';
            });

            btn.addEventListener('click', () => {
              if (!activeMetadata || !window.browserAPI) return;

              btn.style.transform = 'scale(0.8)';
              setTimeout(() => {
                btn.style.transform = 'scale(1.1)';
              }, 100);

              window.browserAPI.downloadAsset({
                url: activeMetadata.url,
                title: activeMetadata.title,
                width: activeMetadata.width,
                height: activeMetadata.height,
                sourcePageUrl: window.location.href,
                pageTitle: document.title
              });
            });
          }

          // ==========================================
          // 2. PREMIUM INJECTED HOVER ZOOM ENGINE
          // ==========================================
          if (!window.__image_hover_zoom_injected__) {
            window.__image_hover_zoom_injected__ = true;

            // Create beautiful glassmorphic preview container (100vh full screen height-locked)
            const previewContainer = document.createElement('div');
            previewContainer.id = 'photoshow-injected-preview-container';
            previewContainer.style.position = 'fixed';
            previewContainer.style.zIndex = '2147483647';
            previewContainer.style.display = 'none';
            previewContainer.style.pointerEvents = 'none';
            previewContainer.style.background = 'rgba(10, 15, 30, 0.95)'; // Deep Slate Blue with high opacity
            previewContainer.style.backdropFilter = 'blur(20px)';
            previewContainer.style.webkitBackdropFilter = 'blur(20px)';
            previewContainer.style.borderLeft = '1px solid rgba(255, 255, 255, 0.15)';
            previewContainer.style.borderRight = '1px solid rgba(255, 255, 255, 0.15)';
            previewContainer.style.borderRadius = '0'; // Flat panels look extremely sleek at full height
            previewContainer.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.8)';
            previewContainer.style.padding = '0'; // Crucial: No margins or padding so image fills top to bottom perfectly!
            previewContainer.style.boxSizing = 'border-box';
            previewContainer.style.flexDirection = 'column';
            previewContainer.style.transition = 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
            previewContainer.style.opacity = '0';
            previewContainer.style.transform = 'scale(0.98)';
            previewContainer.style.top = '0';
            previewContainer.style.height = '100vh';

            previewContainer.innerHTML = \`
              <div id="photoshow-injected-preview-viewport" style="
                position: relative;
                width: 100%;
                height: calc(100% - 32px); /* Reclaim 32px for info bar so it never overlaps! */
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <img id="photoshow-injected-preview-img" style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  top: 0;
                  left: 0;
                  transition: transform 0.08s cubic-bezier(0.25, 0.8, 0.25, 1);
                  display: block;
                " />
                
                <div id="photoshow-injected-preview-spinner" style="
                  position: absolute;
                  width: 40px;
                  height: 40px;
                  display: block;
                  z-index: 10;
                ">
                  <svg width="40" height="40" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#6366f1">
                    <g fill="none" fill-rule="evenodd">
                      <g transform="translate(1 1)" stroke-width="3">
                        <circle stroke-opacity=".2" cx="18" cy="18" r="18"/>
                        <path d="M36 18c0-9.94-8.06-18-18-18">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 18 18"
                            to="360 18 18"
                            dur="0.8s"
                            repeatCount="indefinite"/>
                        </path>
                      </g>
                    </g>
                  </svg>
                </div>
              </div>
              
              <!-- Premium info-bar placed BELOW the image viewport in the normal layout flow -->
              <div id="photoshow-injected-preview-info" style="
                width: 100%;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.7);
                background: rgba(10, 15, 30, 0.95);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                padding: 0 16px;
                box-sizing: border-box;
                pointer-events: none;
                z-index: 15;
              ">
                <span id="photoshow-injected-preview-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; font-weight: 500;">Title</span>
                <span id="photoshow-injected-preview-size" style="font-family: monospace;">Loading...</span>
              </div>
            \`;

            document.body.appendChild(previewContainer);

            let activeElement = null;
            let activeCardElement = null;
            let hoverTimer = null;
            let currentHighResUrl = '';
            let activeRequestUrl = '';
            let preloadImageObj = null;
            let lastMouseEvent = { clientX: 0, clientY: 0 };
            let imageNaturalWidth = 0;
            let imageNaturalHeight = 0;
            let lastSentAssetUrl = '__unset__'; // Dedup: track last sent asset to avoid redundant IPC

            const previewImg = document.getElementById('photoshow-injected-preview-img');
            const spinner = document.getElementById('photoshow-injected-preview-spinner');
            const titleEl = document.getElementById('photoshow-injected-preview-title');
            const sizeEl = document.getElementById('photoshow-injected-preview-size');

            // Extract background image url
            function getBgImageUrl(el) {
              const bg = getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none') {
                const match = bg.match(/url\\((['"]?)(.*?)\\1\\)/);
                if (match) {
                  return match[2];
                }
              }
              return '';
            }

            // Resolve high-resolution URL from thumbnail URL
            function resolveHighResUrl(url) {
              // A. Pinterest
              if (/i\\.pinimg\\.com/.test(url)) {
                const match = url.match(/(https?:)?\\/\\/i\\.pinimg\\.com\\/(?:originals|\\d+x(?:\\d+(?:_\\w+)?)?)\\/(.+)/);
                if (match) {
                  const proto = match[1] || 'https:';
                  const path = match[2];
                  return {
                    url: proto + '//i.pinimg.com/originals/' + path,
                    fallback: proto + '//i.pinimg.com/736x/' + path
                  };
                }
              }
              
              // B. Unsplash & Pexels
              if (/unsplash\\.com/.test(url) || /pexels\\.com/.test(url)) {
                return { url: url.split('?')[0] };
              }
              
              // C. Huaban
              if (/huaban\\.com/.test(url) || /hbimg\\.huaban\\.com/.test(url)) {
                return { url: url.replace(/_(?:fw\\d+|sq\\d+|fw\\d+sf|square)/, '') };
              }
              
              // D. Xiaohongshu
              if (/xhscdn\\.com/.test(url) || /xiaohongshu\\.com/.test(url)) {
                let cleanUrl = url.split('?')[0];
                cleanUrl = cleanUrl.replace(/\\/w\\/\\d+$/, '');
                return { url: cleanUrl };
              }

              // E. Zcool
              if (/img\\.zcool\\.cn/.test(url)) {
                const match = url.match(/(.+?)@.+/);
                if (match) {
                  return { url: match[1] };
                }
              }
              
              return { url: url };
            }

            // Dynamically position the preview box opposite to the cursor, lock height and perform vertical panning
            function positionPopup(e) {
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              if (!activeElement || !activeCardElement) return;
              
              const cardRect = activeCardElement.getBoundingClientRect();
              
              // Calculate side spaces to determine optimal alignment adjacent to card
              const leftSpace = cardRect.left;
              const rightSpace = viewportWidth - cardRect.right;
              const placeOnLeft = leftSpace > rightSpace;
              
              // Determine max width available on the side (leaving 30px boundary cushion)
              let maxAvailableWidth = placeOnLeft ? (leftSpace - 30) : (rightSpace - 30);
              maxAvailableWidth = Math.min(maxAvailableWidth, viewportWidth * 0.85);
              
              let containerWidth = 550; // Premium default fallback width
              
              if (imageNaturalWidth > 0 && imageNaturalHeight > 0) {
                const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
                
                // Target container height is 100vh minus 32px (the height of the bottom info bar)
                const targetHeight = viewportHeight - 32;
                
                // Calculate ideal width so the image perfectly occupies 100% height without vertical letterboxing
                let idealWidth = targetHeight * imageAspectRatio;
                
                // If the image is ultra-tall (ratio is greater than vertical 9:16, i.e., w/h < 9/16 = 0.5625):
                if (imageAspectRatio < 9 / 16) {
                  // Lock ideal width to 30% of the viewport width (responsive for 4K/retina displays)
                  // with a minimum of 400px to guarantee excellent legibility on all resolutions!
                  idealWidth = Math.max(400, viewportWidth * 0.3);
                }
                
                // Set container width dynamically to the ideal width, capped only by screen boundary
                containerWidth = Math.min(idealWidth, maxAvailableWidth);
                
                // Ensure container width doesn't get ridiculously small for ultra-narrow images
                containerWidth = Math.max(containerWidth, 320);
              } else {
                containerWidth = Math.min(500, maxAvailableWidth);
              }
              
              let left = 0;
              const gap = 15; // clean gap from card edge
              
              if (placeOnLeft) {
                left = cardRect.left - containerWidth - gap;
                if (left < 10) left = 10;
              } else {
                left = cardRect.right + gap;
                if (left + containerWidth > viewportWidth - 10) {
                  left = viewportWidth - containerWidth - 10;
                }
              }
              
              previewContainer.style.width = containerWidth + 'px';
              previewContainer.style.left = left + 'px';
              previewContainer.style.top = '0';
              previewContainer.style.height = viewportHeight + 'px';
              previewContainer.style.display = 'flex';
              
              // Image overflow calculation and smooth scrolling translation
              if (imageNaturalWidth > 0 && imageNaturalHeight > 0) {
                const viewportDiv = document.getElementById('photoshow-injected-preview-viewport');
                const viewportHeightPx = viewportDiv.offsetHeight;
                const viewportWidthPx = viewportDiv.offsetWidth;
                
                // Proportional dimensions at full container width
                const renderedWidth = viewportWidthPx;
                const renderedHeight = imageNaturalHeight * (renderedWidth / imageNaturalWidth);
                
                if (renderedHeight > viewportHeightPx + 5) {
                  // Overflow triggers: Enable mouse-driven vertical scroll panning
                  previewImg.style.maxWidth = 'none';
                  previewImg.style.maxHeight = 'none';
                  previewImg.style.width = '100%';
                  previewImg.style.height = 'auto';
                  previewImg.style.objectFit = 'initial'; // Override contain constraints
                  previewImg.style.top = '0';
                  previewImg.style.left = '50%';
                  
                  // Scrolling physics optimization: 20% dead zones at top and bottom to avoid overlay button jitter
                  const rawY = (e.clientY - cardRect.top) / cardRect.height;
                  const threshold = 0.2; // 20% threshold
                  let panningY = 0;
                  
                  if (rawY < threshold) {
                    panningY = 0;
                  } else if (rawY > 1 - threshold) {
                    panningY = 1;
                  } else {
                    panningY = (rawY - threshold) / (1 - 2 * threshold);
                  }
                  
                  const overflowAmount = renderedHeight - viewportHeightPx;
                  const translateY = -panningY * overflowAmount;
                  
                  previewImg.style.transform = 'translateX(-50%) translateY(' + translateY + 'px)';
                } else {
                  // Fitting: Standard absolute center wrapping at full width and height
                  // We let object-fit contain do the native centering while forcing 100% width stretch
                  previewImg.style.maxWidth = '100%';
                  previewImg.style.maxHeight = '100%';
                  previewImg.style.width = '100%';
                  previewImg.style.height = '100%';
                  previewImg.style.objectFit = 'contain';
                  previewImg.style.top = '0';
                  previewImg.style.left = '0';
                  previewImg.style.transform = 'none';
                }
              } else {
                // Loading reset styles
                previewImg.style.maxWidth = '100%';
                previewImg.style.maxHeight = '100%';
                previewImg.style.width = '100%';
                previewImg.style.height = '100%';
                previewImg.style.objectFit = 'contain';
                previewImg.style.top = '0';
                previewImg.style.left = '0';
                previewImg.style.transform = 'none';
              }
            }

            // Smooth fade out and hide
            function hidePreview() {
              clearTimeout(hoverTimer);
              activeElement = null;
              activeCardElement = null;
              
              previewContainer.style.opacity = '0';
              previewContainer.style.transform = 'scale(0.95)';
              
              setTimeout(() => {
                if (!activeElement) {
                  previewContainer.style.display = 'none';
                  previewImg.src = '';
                }
              }, 200);
              
              if (preloadImageObj) {
                preloadImageObj.onload = null;
                preloadImageObj.onerror = null;
                preloadImageObj.src = '';
                preloadImageObj = null;
              }
              
              // Clear active hovered asset in main process (only if not already cleared)
              if (lastSentAssetUrl !== null) {
                lastSentAssetUrl = null;
                if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                  window.browserAPI.setHoveredAsset(null);
                }
              }
            }

            // Smooth fade in and preload high-res source
            function showPreview(el, src) {

              const resolved = resolveHighResUrl(src);
              const hiResUrl = resolved.url;
              const fallbackUrl = resolved.fallback;
              activeRequestUrl = hiResUrl;
              currentHighResUrl = hiResUrl;
              
              // Seed image size instantly using the hovered thumbnail's aspect ratio
              // This guarantees the container sizes itself perfectly immediately, preventing layout jumps!
              imageNaturalWidth = el.naturalWidth || el.offsetWidth || 0;
              imageNaturalHeight = el.naturalHeight || el.offsetHeight || 0;
              
              const altText = el.alt || el.title || document.title || '楂樻竻鍥剧墖棰勮';
              previewImg.src = src;
              previewImg.style.maxWidth = '100%';
              previewImg.style.maxHeight = '100%';
              previewImg.style.width = 'auto';
              previewImg.style.height = 'auto';
              previewImg.style.objectFit = 'contain';
              previewImg.style.top = '50%';
              previewImg.style.left = '50%';
              previewImg.style.transform = 'translateX(-50%) translateY(-50%)';
              spinner.style.display = 'block';
              
              previewContainer.style.display = 'flex';
              previewContainer.offsetHeight; // Force reflow
              previewContainer.style.opacity = '1';
              previewContainer.style.transform = 'scale(1)';
              
              positionPopup(lastMouseEvent);
              
              // Notify the main process about the active hovered asset (dedup by URL)
              if (lastSentAssetUrl !== currentHighResUrl && window.browserAPI && window.browserAPI.setHoveredAsset) {
                lastSentAssetUrl = currentHighResUrl;
                window.browserAPI.setHoveredAsset({
                  url: currentHighResUrl,
                  title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                  width: imageNaturalWidth,
                  height: imageNaturalHeight,
                  sourcePageUrl: window.location.href,
                  pageTitle: document.title
                });
              }
              
              preloadImageObj = new Image();
              preloadImageObj.onload = () => {
                if (preloadImageObj.src === activeRequestUrl) {
                  previewImg.src = activeRequestUrl;
                  spinner.style.display = 'none';
                  
                  imageNaturalWidth = preloadImageObj.naturalWidth;
                  imageNaturalHeight = preloadImageObj.naturalHeight;
                  
                  sizeEl.textContent = imageNaturalWidth + ' x ' + imageNaturalHeight;
                  positionPopup(lastMouseEvent);
                  
                  // Notify main process with updated size
                  if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                    window.browserAPI.setHoveredAsset({
                      url: currentHighResUrl,
                      title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                      width: imageNaturalWidth,
                      height: imageNaturalHeight,
                      sourcePageUrl: window.location.href,
                      pageTitle: document.title
                    });
                  }
                }
              };
              
              preloadImageObj.onerror = () => {
                if (fallbackUrl && activeRequestUrl === hiResUrl) {
                  activeRequestUrl = fallbackUrl;
                  currentHighResUrl = fallbackUrl; // Synchronize current high-res URL to the fallback URL!
                  preloadImageObj.src = fallbackUrl;
                  sizeEl.textContent = '姝ｅ湪鍔犺浇澶囩敤鍘熷浘...';
                  
                  // Notify main process with fallback URL
                  if (window.browserAPI && window.browserAPI.setHoveredAsset) {
                    window.browserAPI.setHoveredAsset({
                      url: currentHighResUrl,
                      title: el.alt || el.title || document.title || '鎻愬彇绱犳潗',
                      width: imageNaturalWidth,
                      height: imageNaturalHeight,
                      sourcePageUrl: window.location.href,
                      pageTitle: document.title
                    });
                  }
                } else if (activeRequestUrl === preloadImageObj.src) {
                  spinner.style.display = 'none';
                  sizeEl.textContent = (previewImg.naturalWidth || '?') + ' x ' + (previewImg.naturalHeight || '?') + ' (鍔犺浇鍘熷浘澶辫触)';
                }
              };
              
              preloadImageObj.src = hiResUrl;
            }

            // Mouse position tracking and real-time image vertical pan scroll
            document.addEventListener('mousemove', (e) => {
              lastMouseEvent = e;
              if (activeElement && previewContainer.style.display === 'flex') {
                positionPopup(e);
              }
            });

            // Delegate mouseover for highly efficient hover tracking
            document.addEventListener('mouseover', (e) => {
              // Focus the guest window and native WebContentsView container on hover 
              // to ensure keydown shortcuts (S, Escape) trigger instantly without manual clicking!
              try {
                window.focus();
                if (window.browserAPI && window.browserAPI.requestFocus) {
                  window.browserAPI.requestFocus();
                }
              } catch (err) {}
              
              let el = e.target.closest('img, [style*="background-image"], a');
              if (!el) return;
              
              if (el === activeElement) return;
              
              // Hide existing first
              hidePreview();
              
              // Resolve active card container for accurate boundary calculations
              activeCardElement = el.closest('a') || el;
              
              let src = '';
              if (el.tagName === 'IMG') {
                src = el.currentSrc || el.src;
              } else if (el.tagName === 'A') {
                const href = el.href || '';
                // 1. Direct image link
                if (/\\.(jpg|jpeg|png|webp|gif|svg)(\\?.*)?$/i.test(href)) {
                  src = href;
                } else {
                  // 2. Card link wrapping a card image - resolve to inner image
                  const childImg = el.querySelector('img');
                  if (childImg) {
                    el = childImg;
                    src = childImg.currentSrc || childImg.src;
                  } else {
                    return; // No child image, ignore
                  }
                }
              } else {
                src = getBgImageUrl(el);
              }
              
              if (!src || src.startsWith('data:')) return;
              
              // Size filtering: ignore small icons or decorative thumbnails
              const w = el.naturalWidth || el.offsetWidth || 0;
              const h = el.naturalHeight || el.offsetHeight || 0;
              if (w > 0 && h > 0 && (w < 80 || h < 80)) return;
              
              // Block terms
              const lowerUrl = src.toLowerCase();
              const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
              if (blockTerms.some(term => lowerUrl.includes(term))) return;
              
              activeElement = el;
              
              // Dwell for 150ms to ensure user is deliberately hovering to preview
              hoverTimer = setTimeout(() => {
                showPreview(el, src);
              }, 150);
            });

            // Mouseout triggers smooth hide
            document.addEventListener('mouseout', (e) => {
              if (!activeElement) return;
              const toElement = e.relatedTarget;
              if (toElement && activeElement.contains(toElement)) return;
              hidePreview();
            });

            // Scroll hides preview immediately
            window.addEventListener('scroll', () => {
              hidePreview();
            }, { passive: true });

            // Escape key hides preview, and S key triggers high-res download (PhotoShow replica)
            window.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                hidePreview();
                return;
              }
              
              // PhotoShow exact replica: Hover + S key to download high-res original instantly!
              // We check e.code === 'KeyS' to ensure it triggers 100% reliably even when the user's IME is in Chinese mode!
              if ((e.key === 's' || e.key === 'S' || e.code === 'KeyS') && activeElement && previewContainer.style.display === 'flex' && window.browserAPI) {
                // Prevent browser default behavior
                e.preventDefault();
                
                const title = titleEl.textContent || '鎻愬彇绱犳潗';
                const url = currentHighResUrl || previewImg.src;
                
                if (url && !url.startsWith('data:')) {
                  window.browserAPI.downloadAsset({
                    url: url,
                    title: title,
                    width: imageNaturalWidth || previewImg.naturalWidth || 0,
                    height: imageNaturalHeight || previewImg.naturalHeight || 0,
                    sourcePageUrl: window.location.href,
                    pageTitle: document.title
                  });
                  
                  // Premium tactile feedback: flash info bar size to show "鈿?宸插惎鍔ㄥ師鍥句笅杞?.."
                  const prevSizeText = sizeEl.textContent;
                  sizeEl.textContent = '鈿?宸插惎鍔ㄥ師鍥句笅杞?..';
                  sizeEl.style.color = '#34d399'; // Premium Emerald-400
                  setTimeout(() => {
                    sizeEl.textContent = prevSizeText;
                    sizeEl.style.color = 'rgba(255, 255, 255, 0.7)';
                  }, 1500);
                }
              }
            });
          }
        })()
`;
}
class EmbeddedBrowserManager {
  static instance;
  mainWindow = null;
  activeView = null;
  activeSiteId = "";
  isVisible = false;
  isMounted = false;
  bounds = { x: 0, y: 0, width: 0, height: 0 };
  // Track the currently hovered original image metadata globally in the main process
  activeHoveredAsset = null;
  constructor() {
  }
  static getInstance() {
    if (!EmbeddedBrowserManager.instance) {
      EmbeddedBrowserManager.instance = new EmbeddedBrowserManager();
    }
    return EmbeddedBrowserManager.instance;
  }
  setActiveHoveredAsset(asset) {
    this.activeHoveredAsset = asset;
  }
  getActiveHoveredAsset() {
    return this.activeHoveredAsset;
  }
  setMainWindow(window2) {
    this.mainWindow = window2;
    this.mainWindow.webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown" && (input.key.toLowerCase() === "s" || input.code.toLowerCase() === "keys")) {
        const asset = this.activeHoveredAsset;
        if (asset) {
          event.preventDefault();
          this.triggerDownload(asset);
        }
      }
    });
  }
  getMainWindow() {
    return this.mainWindow;
  }
  triggerDownload(asset) {
    console.log("[Download] S key triggered download:", asset.url);
    if (!this.mainWindow) {
      console.warn("[Download] Cancelled: mainWindow is null");
      return;
    }
    try {
      const urlObj = new URL(asset.sourcePageUrl);
      const domain = urlObj.hostname.replace("www.", "");
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1);
      this.mainWindow.webContents.send("download:injected-trigger", {
        title: asset.title,
        sourceSite: siteName,
        sourcePageUrl: asset.sourcePageUrl,
        downloadUrl: asset.url,
        thumbnailUrl: asset.url,
        width: asset.width,
        height: asset.height,
        browserPageTitle: asset.pageTitle,
        captureMethod: "browser_extract"
      });
      if (this.activeView) {
        this.activeView.webContents.executeJavaScript(`
          (function() {
            const sizeEl = document.getElementById('photoshow-injected-preview-size');
            if (sizeEl) {
              const prevSizeText = sizeEl.textContent;
              sizeEl.textContent = '鈿?宸插惎鍔ㄥ師鍥句笅杞?..';
              sizeEl.style.color = '#34d399';
              setTimeout(() => {
                sizeEl.textContent = prevSizeText;
                sizeEl.style.color = 'rgba(255, 255, 255, 0.7)';
              }, 1500);
            }
          })()
        `).catch(console.error);
      }
    } catch (err) {
      console.error("[BrowserManager] triggerDownload error:", err);
    }
  }
  getWebContents() {
    return this.activeView ? this.activeView.webContents : null;
  }
  createView(siteId) {
    if (this.activeView) {
      this.hide();
      this.isMounted = false;
      try {
        this.activeView.webContents.removeAllListeners();
      } catch (e) {
      }
    }
    this.activeSiteId = siteId;
    const preloadPath = join(__dirname, "../preload/browser.cjs");
    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:site-${siteId}`,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        preload: preloadPath
      }
    });
    this.activeView = view;
    const web = view.webContents;
    web.on("console-message", (event, level, message, line, sourceId) => {
    });
    web.on("before-input-event", (event, input) => {
      if (input.type === "keyDown" && (input.key.toLowerCase() === "s" || input.code.toLowerCase() === "keys")) {
        const asset = this.activeHoveredAsset;
        if (asset) {
          event.preventDefault();
          this.triggerDownload(asset);
        }
      }
    });
    const sendState = () => {
      if (!this.mainWindow || this.activeView !== view) return;
      try {
        this.mainWindow.webContents.send("browser:state-change", {
          url: web.getURL(),
          title: web.getTitle(),
          canGoBack: web.canGoBack(),
          canGoForward: web.canGoForward(),
          isLoading: web.isLoading()
        });
      } catch (e) {
      }
    };
    web.on("did-start-loading", sendState);
    web.on("did-stop-loading", sendState);
    web.on("did-finish-load", sendState);
    web.on("did-navigate", sendState);
    web.on("did-navigate-in-page", sendState);
    web.on("page-title-updated", (_event, title) => {
      if (!this.mainWindow || this.activeView !== view) return;
      try {
        this.mainWindow.webContents.send("browser:state-change", {
          url: web.getURL(),
          title,
          canGoBack: web.canGoBack(),
          canGoForward: web.canGoForward(),
          isLoading: web.isLoading()
        });
      } catch (e) {
      }
    });
    web.setWindowOpenHandler((details) => {
      const { shell: shell2 } = require2("electron");
      shell2.openExternal(details.url).catch(console.error);
      return { action: "deny" };
    });
    web.on("dom-ready", () => {
      const injectorScript = createBrowserPreviewInjectionScript();
      web.executeJavaScript(injectorScript).catch(console.error);
    });
    if (this.isVisible && this.mainWindow) {
      this.show();
    }
    return view;
  }
  show() {
    this.isVisible = true;
    if (!this.mainWindow || !this.activeView) return;
    try {
      if (!this.isMounted) {
        this.mainWindow.contentView.addChildView(this.activeView);
        this.isMounted = true;
      }
      this.activeView.setBounds(this.bounds);
    } catch (err) {
      console.error("[BrowserManager] Failed to mount WebContentsView:", err);
    }
  }
  hide() {
    this.isVisible = false;
    if (!this.mainWindow || !this.activeView) return;
    try {
      if (this.isMounted) {
        this.mainWindow.contentView.removeChildView(this.activeView);
        this.isMounted = false;
      }
    } catch (err) {
      console.warn("[BrowserManager] Failed to detach WebContentsView:", err);
    }
  }
  resize(bounds) {
    this.bounds = bounds;
    if (this.activeView && this.isVisible) {
      try {
        this.activeView.setBounds(bounds);
      } catch (e) {
        console.error("[BrowserManager] Failed to set bounds:", e);
      }
    }
  }
  async loadUrl(url, siteId) {
    if (siteId !== this.activeSiteId || !this.activeView) {
      this.createView(siteId);
    }
    if (this.activeView) {
      try {
        await this.activeView.webContents.loadURL(url);
      } catch (err) {
        console.error(`[BrowserManager] Failed to load URL "${url}":`, err);
      }
    } else {
      console.error("[BrowserManager] loadUrl() failed: activeView is null");
    }
  }
  goBack() {
    if (this.activeView && this.activeView.webContents.canGoBack()) {
      this.activeView.webContents.goBack();
    }
  }
  goForward() {
    if (this.activeView && this.activeView.webContents.canGoForward()) {
      this.activeView.webContents.goForward();
    }
  }
  reload() {
    if (this.activeView) {
      this.activeView.webContents.reload();
    }
  }
  stop() {
    if (this.activeView) {
      this.activeView.webContents.stop();
    }
  }
}
class GenericImageExtractorPlugin {
  id = "generic-image-extractor";
  name = "通用网页图片识别插件";
  matchDomains = ["*"];
  match(_url) {
    return true;
  }
  async extractAssets(context) {
    console.log(`[ExtractorPlugin] Running DOM extraction on page: ${context.currentUrl}`);
    const script = `
      (() => {
        const assets = [];
        const pageUrl = window.location.href;
        const urlObj = new URL(pageUrl);
        const siteDomain = urlObj.hostname.replace('www.', '');
        const uniqueUrls = new Set();

        function addUrl(url, title, type, width = 0, height = 0) {
          if (!url) return;
          try {
            const absoluteUrl = new URL(url, pageUrl).toString();
            if (uniqueUrls.has(absoluteUrl)) return;

            // Skip empty/base64canvas data urls
            if (absoluteUrl.startsWith('data:')) return;

            // Simple blocklist matching for avatars, icons, tracking pixels
            const lowerUrl = absoluteUrl.toLowerCase();
            const blockTerms = ['avatar', 'logo', 'pixel', 'tracking', 'favicon', '/icon', 'spacer', 'loader', 'sprite'];
            if (blockTerms.some(term => lowerUrl.includes(term))) {
              return;
            }

            uniqueUrls.add(absoluteUrl);
            assets.push({
              url: absoluteUrl,
              title: title || '',
              type,
              width,
              height
            });
          } catch(e) {}
        }

        // 1. img src and srcset
        document.querySelectorAll('img').forEach(img => {
          const title = img.alt || img.title || '';
          
          // Use natural dimensions if already loaded, otherwise attributes or layout size
          const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0', 10);
          const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0', 10);

          // Filtering rule: ignore small icons/badges (< 300px)
          if (w > 0 && h > 0 && (w < 300 || h < 300)) {
            return;
          }

          addUrl(img.currentSrc || img.src, title, 'img', w, h);

          if (img.srcset) {
            img.srcset.split(',').forEach(s => {
              const url = s.trim().split(/\\s+/)[0];
              addUrl(url, title, 'srcset', w, h);
            });
          }
        });

        // 2. picture source srcset
        document.querySelectorAll('picture source').forEach(source => {
          if (source.srcset) {
            source.srcset.split(',').forEach(s => {
              const url = s.trim().split(/\\s+/)[0];
              addUrl(url, '', 'picture-source');
            });
          }
        });

        // 3. CSS Computed style background-image
        document.querySelectorAll('*').forEach(el => {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') {
            const match = bg.match(/url\\(['"]?([^'"]+)['"]?\\)/);
            if (match) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && (rect.width < 300 || rect.height < 300)) {
                return;
              }
              addUrl(match[1], '', 'css-bg', Math.round(rect.width), Math.round(rect.height));
            }
          }
        });

        // 4. meta[property="og:image"] (OpenGraph image)
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg && ogImg.getAttribute('content')) {
          addUrl(ogImg.getAttribute('content'), 'OpenGraph Image', 'og-meta');
        }

        // 5. Direct file links
        document.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href) {
            const cleanHref = href.split('?')[0].split('#')[0].toLowerCase();
            if (/\\.(jpg|jpeg|png|webp|gif|svg)$/.test(cleanHref)) {
              addUrl(href, a.textContent || 'Linked Image', 'a-href');
            }
          }
        });

        return assets;
      })()
    `;
    try {
      const rawAssets = await context.executeJavaScript(script);
      if (!rawAssets || !Array.isArray(rawAssets)) return [];
      const urlObj = new URL(context.currentUrl);
      const domain = urlObj.hostname.replace("www.", "");
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1);
      return rawAssets.map((asset) => {
        let fileType = "JPG";
        const lowerUrl = asset.url.toLowerCase();
        if (lowerUrl.includes(".png")) fileType = "PNG";
        else if (lowerUrl.includes(".webp")) fileType = "WEBP";
        else if (lowerUrl.includes(".gif")) fileType = "GIF";
        else if (lowerUrl.includes(".svg")) fileType = "SVG";
        return {
          id: `ext-${Math.random().toString(36).substr(2, 9)}`,
          title: asset.title.trim() || `${siteName.split(".")[0]} Graphic Asset`,
          thumbnailUrl: asset.url,
          previewUrl: asset.url,
          downloadUrl: asset.url,
          sourcePageUrl: context.currentUrl,
          sourceSite: siteName,
          width: asset.width || 800,
          height: asset.height || 600,
          fileType
        };
      });
    } catch (err) {
      console.error("[ExtractorPlugin] Execution failed:", err);
      return [];
    }
  }
}
function registerBrowserIpc() {
  const manager = EmbeddedBrowserManager.getInstance();
  const extractor = new GenericImageExtractorPlugin();
  ipcMain.handle("browser:load-url", async (_, { url, siteId }) => {
    try {
      await manager.loadUrl(url, siteId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] browser:load-url error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("browser:go-back", async () => {
    manager.goBack();
    return { success: true };
  });
  ipcMain.handle("browser:go-forward", async () => {
    manager.goForward();
    return { success: true };
  });
  ipcMain.handle("browser:reload", async () => {
    manager.reload();
    return { success: true };
  });
  ipcMain.handle("browser:stop", async () => {
    manager.stop();
    return { success: true };
  });
  ipcMain.handle("browser:resize", async (_, bounds) => {
    manager.resize(bounds);
    return { success: true };
  });
  ipcMain.handle("browser:hide", async () => {
    manager.hide();
    return { success: true };
  });
  ipcMain.handle("browser:show", async () => {
    manager.show();
    return { success: true };
  });
  ipcMain.handle("extractor:scan-current-page", async () => {
    try {
      const webContents = manager.getWebContents();
      if (!webContents) {
        throw new Error("未发现正在运行的浏览器视图上下文");
      }
      const currentUrl = webContents.getURL();
      const pageTitle = webContents.getTitle();
      const context = {
        currentUrl,
        pageTitle,
        executeJavaScript: (code) => {
          return webContents.executeJavaScript(code);
        }
      };
      const extracted = await extractor.extractAssets(context);
      return extracted;
    } catch (err) {
      console.error("[IPC] extractor:scan-current-page error:", err);
      throw err;
    }
  });
  ipcMain.on("browser:download-injected", (event, asset) => {
    try {
      console.log(`[IPC] Injected download button clicked for: ${asset.url}`);
      const urlObj = new URL(asset.sourcePageUrl);
      const domain = urlObj.hostname.replace("www.", "");
      const siteName = domain.charAt(0).toUpperCase() + domain.slice(1);
      const win = manager.getMainWindow();
      if (win) {
        win.webContents.send("download:injected-trigger", {
          title: asset.title,
          sourceSite: siteName,
          sourcePageUrl: asset.sourcePageUrl,
          downloadUrl: asset.url,
          thumbnailUrl: asset.url,
          width: asset.width,
          height: asset.height,
          browserPageTitle: asset.pageTitle,
          captureMethod: "browser_extract"
        });
      }
    } catch (err) {
      console.error("[IPC] browser:download-injected error:", err);
    }
  });
  ipcMain.on("browser:request-focus", () => {
    try {
      const webContents = manager.getWebContents();
      if (webContents) {
        webContents.focus();
      }
    } catch (err) {
      console.error("[IPC] browser:request-focus error:", err);
    }
  });
  ipcMain.on("browser:set-hovered-asset", (_event, asset) => {
    manager.setActiveHoveredAsset(asset);
  });
}
class TagService {
  getDb() {
    return getDatabase();
  }
  getTag(id) {
    const db2 = this.getDb();
    const tag = db2.prepare("SELECT * FROM tags WHERE id = ?").get(id);
    return tag || null;
  }
  createTag(input) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const id = `tag-${input.type || "custom"}-${Math.random().toString(36).substr(2, 9)}`;
    const name = input.name.trim();
    const normalized = name.toLowerCase();
    const slug = normalized;
    const type = input.type || "custom";
    const color = input.color || "bg-slate-100 text-slate-700";
    const description = input.description || "";
    const shorthand = input.shorthand || "";
    const parentId = input.parentId || null;
    const isCategory = input.isCategory ? 1 : 0;
    const isSystem = 0;
    const existing = db2.prepare("SELECT * FROM tags WHERE normalized_name = ? AND type = ?").get(normalized, type);
    if (existing) {
      return existing;
    }
    db2.prepare(`
      INSERT INTO tags (id, name, normalized_name, slug, type, color, description, shorthand, aliases, parent_id, is_category, is_system, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      normalized,
      slug,
      type,
      color,
      description,
      shorthand,
      JSON.stringify([]),
      parentId,
      isCategory,
      isSystem,
      0,
      now2,
      now2
    );
    if (parentId) {
      this.setParent(id, parentId);
    }
    return this.getTag(id);
  }
  updateTag(id, input) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const existing = this.getTag(id);
    if (!existing) {
      throw new Error(`Tag with ID ${id} not found`);
    }
    const name = input.name !== void 0 ? input.name.trim() : existing.name;
    const normalized = name.toLowerCase();
    const type = input.type !== void 0 ? input.type : existing.type;
    const color = input.color !== void 0 ? input.color : existing.color;
    const description = input.description !== void 0 ? input.description : existing.description;
    const shorthand = input.shorthand !== void 0 ? input.shorthand : existing.shorthand;
    const parentId = input.parentId !== void 0 ? input.parentId || null : existing.parent_id;
    const isCategory = input.isCategory !== void 0 ? input.isCategory ? 1 : 0 : existing.is_category;
    db2.prepare(`
      UPDATE tags
      SET name = ?, normalized_name = ?, slug = ?, type = ?, color = ?, description = ?, shorthand = ?, parent_id = ?, is_category = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name,
      normalized,
      normalized,
      type,
      color,
      description,
      shorthand,
      parentId,
      isCategory,
      now2,
      id
    );
    if (input.parentId !== void 0) {
      db2.prepare("DELETE FROM tag_relations WHERE child_tag_id = ? AND relation_type = ?").run(id, "parent");
      if (input.parentId) {
        const relId = `rel-${Math.random().toString(36).substr(2, 9)}`;
        db2.prepare("INSERT INTO tag_relations (id, parent_tag_id, child_tag_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)").run(
          relId,
          input.parentId,
          id,
          "parent",
          now2
        );
      }
    }
    return this.getTag(id);
  }
  deleteTag(id) {
    const db2 = this.getDb();
    db2.transaction(() => {
      db2.prepare("DELETE FROM tag_relations WHERE parent_tag_id = ? OR child_tag_id = ?").run(id, id);
      db2.prepare("DELETE FROM tag_aliases WHERE tag_id = ?").run(id);
      db2.prepare("DELETE FROM asset_tags WHERE tag_id = ?").run(id);
      db2.prepare("DELETE FROM tags WHERE id = ?").run(id);
    })();
  }
  mergeTags(sourceTagId, targetTagId) {
    const db2 = this.getDb();
    if (sourceTagId === targetTagId) return;
    const sourceTag = this.getTag(sourceTagId);
    const targetTag = this.getTag(targetTagId);
    if (!sourceTag || !targetTag) {
      throw new Error("Source or target tag does not exist");
    }
    db2.transaction(() => {
      const assetTags = db2.prepare("SELECT * FROM asset_tags WHERE tag_id = ?").all(sourceTagId);
      const insertOrIgnore = db2.prepare(`
        INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      for (const rel of assetTags) {
        const id = `${rel.asset_id}_${targetTagId}_${rel.source}`;
        insertOrIgnore.run(id, rel.asset_id, targetTagId, rel.source, rel.confidence, rel.status);
      }
      const sourceAliases = db2.prepare("SELECT alias FROM tag_aliases WHERE tag_id = ?").all(sourceTagId);
      for (const entry of sourceAliases) {
        this.createAlias(targetTagId, entry.alias);
      }
      this.deleteTag(sourceTagId);
      this.recalculateUsageCount(targetTagId);
    })();
  }
  listTags(filter) {
    const db2 = this.getDb();
    let query = "SELECT * FROM tags";
    const clauses = [];
    const params = [];
    if (filter?.type) {
      clauses.push("type = ?");
      params.push(filter.type);
    }
    if (filter?.searchQuery) {
      clauses.push("(name LIKE ? OR normalized_name LIKE ? OR aliases LIKE ?)");
      const searchLike = `%${filter.searchQuery.trim().toLowerCase()}%`;
      params.push(searchLike, searchLike, searchLike);
    }
    if (filter?.isCategory !== void 0) {
      clauses.push("is_category = ?");
      params.push(filter.isCategory ? 1 : 0);
    }
    if (clauses.length > 0) {
      query += " WHERE " + clauses.join(" AND ");
    }
    query += " ORDER BY usage_count DESC, name ASC";
    return db2.prepare(query).all(...params);
  }
  searchTags(query) {
    return this.listTags({ searchQuery: query });
  }
  getTagUsageCount(tagId) {
    const db2 = this.getDb();
    const res = db2.prepare("SELECT COUNT(DISTINCT asset_id) as count FROM asset_tags WHERE tag_id = ? AND status = ?").get(tagId, "confirmed");
    return res?.count || 0;
  }
  recalculateUsageCount(tagId) {
    const db2 = this.getDb();
    const usage = this.getTagUsageCount(tagId);
    db2.prepare("UPDATE tags SET usage_count = ? WHERE id = ?").run(usage, tagId);
  }
  createAlias(tagId, alias) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const trimmed = alias.trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed) return;
    const existing = db2.prepare("SELECT * FROM tag_aliases WHERE tag_id = ? AND normalized_alias = ?").get(tagId, normalized);
    if (existing) return;
    const id = `alias-${Math.random().toString(36).substr(2, 9)}`;
    db2.prepare("INSERT INTO tag_aliases (id, tag_id, alias, normalized_alias, created_at) VALUES (?, ?, ?, ?, ?)").run(
      id,
      tagId,
      trimmed,
      normalized,
      now2
    );
    this.syncAliasesJson(tagId);
  }
  removeAlias(tagId, aliasText) {
    const db2 = this.getDb();
    db2.prepare("DELETE FROM tag_aliases WHERE tag_id = ? AND normalized_alias = ?").run(tagId, aliasText.toLowerCase().trim());
    this.syncAliasesJson(tagId);
  }
  syncAliasesJson(tagId) {
    const db2 = this.getDb();
    const aliasesRows = db2.prepare("SELECT alias FROM tag_aliases WHERE tag_id = ? ORDER BY alias ASC").all(tagId);
    const aliasesList = aliasesRows.map((r) => r.alias);
    db2.prepare("UPDATE tags SET aliases = ? WHERE id = ?").run(JSON.stringify(aliasesList), tagId);
  }
  setParent(tagId, parentId) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db2.prepare("DELETE FROM tag_relations WHERE child_tag_id = ? AND relation_type = ?").run(tagId, "parent");
    if (parentId) {
      const id = `rel-${Math.random().toString(36).substr(2, 9)}`;
      db2.prepare("INSERT INTO tag_relations (id, parent_tag_id, child_tag_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)").run(
        id,
        parentId,
        tagId,
        "parent",
        now2
      );
    }
    db2.prepare("UPDATE tags SET parent_id = ?, updated_at = ? WHERE id = ?").run(parentId, now2, tagId);
  }
}
function registerTagIpc() {
  const service = new TagService();
  ipcMain.handle("tag:create", async (_, input) => {
    try {
      const tag = service.createTag(input);
      return { success: true, tag };
    } catch (err) {
      console.error("[IPC] tag:create error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:update", async (_, { id, input }) => {
    try {
      const tag = service.updateTag(id, input);
      return { success: true, tag };
    } catch (err) {
      console.error("[IPC] tag:update error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:delete", async (_, id) => {
    try {
      service.deleteTag(id);
      return { success: true, id };
    } catch (err) {
      console.error("[IPC] tag:delete error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:merge", async (_, { sourceTagId, targetTagId }) => {
    try {
      service.mergeTags(sourceTagId, targetTagId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] tag:merge error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:get", async (_, id) => {
    try {
      const tag = service.getTag(id);
      return { success: true, tag };
    } catch (err) {
      console.error("[IPC] tag:get error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:list", async (_, filter) => {
    try {
      const tags = service.listTags(filter);
      return { success: true, tags };
    } catch (err) {
      console.error("[IPC] tag:list error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:search", async (_, query) => {
    try {
      const tags = service.searchTags(query);
      return { success: true, tags };
    } catch (err) {
      console.error("[IPC] tag:search error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:create-alias", async (_, { tagId, alias }) => {
    try {
      service.createAlias(tagId, alias);
      return { success: true };
    } catch (err) {
      console.error("[IPC] tag:create-alias error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:remove-alias", async (_, { tagId, alias }) => {
    try {
      service.removeAlias(tagId, alias);
      return { success: true };
    } catch (err) {
      console.error("[IPC] tag:remove-alias error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag:set-parent", async (_, { tagId, parentId }) => {
    try {
      service.setParent(tagId, parentId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] tag:set-parent error:", err);
      return { success: false, error: String(err) };
    }
  });
}
class AssetTagService {
  getDb() {
    return getDatabase();
  }
  getTagService() {
    return new TagService();
  }
  addTagToAsset(assetId, tagId, options) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const source = options?.source || "manual";
    const confidence = options?.confidence !== void 0 ? options.confidence : 1;
    const status = options?.status || "confirmed";
    const id = `${assetId}_${tagId}_${source}`;
    db2.transaction(() => {
      const existing = db2.prepare("SELECT status FROM asset_tags WHERE asset_id = ? AND tag_id = ? AND source = ?").get(assetId, tagId, source);
      if (existing) {
        if (existing.status === "confirmed" && status === "pending") {
          return;
        }
        db2.prepare(`
          UPDATE asset_tags SET
            confidence = ?,
            status = ?,
            updated_at = ?
          WHERE asset_id = ? AND tag_id = ? AND source = ?
        `).run(confidence, status, now2, assetId, tagId, source);
      } else {
        db2.prepare(`
          INSERT INTO asset_tags (id, asset_id, tag_id, source, confidence, status, model_name, model_version, raw_value, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          assetId,
          tagId,
          source,
          confidence,
          status,
          options?.modelName || null,
          options?.modelVersion || null,
          options?.rawValue || null,
          options?.createdBy || "user",
          now2,
          now2
        );
      }
      db2.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now2, assetId);
      this.getTagService().recalculateUsageCount(tagId);
    })();
    return this.getRelationById(id);
  }
  removeTagFromAsset(assetId, tagId) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db2.transaction(() => {
      db2.prepare("DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?").run(assetId, tagId);
      db2.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now2, assetId);
      this.getTagService().recalculateUsageCount(tagId);
    })();
  }
  addTagsToAssets(assetIds, tagIds, options) {
    const db2 = this.getDb();
    db2.transaction(() => {
      for (const assetId of assetIds) {
        for (const tagId of tagIds) {
          this.addTagToAsset(assetId, tagId, options);
        }
      }
    })();
  }
  removeTagsFromAssets(assetIds, tagIds) {
    const db2 = this.getDb();
    db2.transaction(() => {
      for (const assetId of assetIds) {
        for (const tagId of tagIds) {
          this.removeTagFromAsset(assetId, tagId);
        }
      }
    })();
  }
  replaceTagForAssets(assetIds, oldTagId, newTagId) {
    const db2 = this.getDb();
    db2.transaction(() => {
      for (const assetId of assetIds) {
        const existingList = db2.prepare("SELECT * FROM asset_tags WHERE asset_id = ? AND tag_id = ?").all(assetId, oldTagId);
        for (const rel of existingList) {
          this.removeTagFromAsset(assetId, oldTagId);
          this.addTagToAsset(assetId, newTagId, {
            source: rel.source,
            confidence: rel.confidence,
            status: rel.status,
            modelName: rel.model_name || void 0,
            modelVersion: rel.model_version || void 0,
            rawValue: rel.raw_value || void 0,
            createdBy: rel.created_by
          });
        }
      }
    })();
  }
  getTagsForAsset(assetId) {
    const db2 = this.getDb();
    return db2.prepare(`
      SELECT at.*, t.name as tag_name, t.type as tag_type, t.color as tag_color
      FROM asset_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.asset_id = ? AND at.status != 'rejected'
      ORDER BY at.status ASC, t.name ASC
    `).all(assetId);
  }
  getAssetsByTag(tagId) {
    const db2 = this.getDb();
    const rows = db2.prepare("SELECT asset_id FROM asset_tags WHERE tag_id = ? AND status = ?").all(tagId, "confirmed");
    return rows.map((r) => r.asset_id);
  }
  confirmAiTag(assetTagId) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const rel = db2.prepare("SELECT * FROM asset_tags WHERE id = ?").get(assetTagId);
    if (rel) {
      db2.transaction(() => {
        db2.prepare("UPDATE asset_tags SET status = ?, confidence = 1.0, updated_at = ? WHERE id = ?").run("confirmed", now2, assetTagId);
        db2.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now2, rel.asset_id);
        const tag = db2.prepare("SELECT name FROM tags WHERE id = ?").get(rel.tag_id);
        if (tag) {
          db2.prepare(`
            UPDATE tag_suggestions 
            SET status = 'confirmed', updated_at = ? 
            WHERE asset_id = ? AND tag_name = ? AND source = ?
          `).run(now2, rel.asset_id, tag.name, rel.source);
        }
        this.getTagService().recalculateUsageCount(rel.tag_id);
      })();
    }
  }
  rejectAiTag(assetTagId) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const rel = db2.prepare("SELECT * FROM asset_tags WHERE id = ?").get(assetTagId);
    if (rel) {
      db2.transaction(() => {
        db2.prepare("UPDATE asset_tags SET status = ?, updated_at = ? WHERE id = ?").run("rejected", now2, assetTagId);
        db2.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now2, rel.asset_id);
        const tag = db2.prepare("SELECT name FROM tags WHERE id = ?").get(rel.tag_id);
        if (tag) {
          db2.prepare(`
            UPDATE tag_suggestions 
            SET status = 'rejected', updated_at = ? 
            WHERE asset_id = ? AND tag_name = ? AND source = ?
          `).run(now2, rel.asset_id, tag.name, rel.source);
        }
        this.getTagService().recalculateUsageCount(rel.tag_id);
      })();
    }
  }
  getRelationById(id) {
    const db2 = this.getDb();
    const rel = db2.prepare("SELECT * FROM asset_tags WHERE id = ?").get(id);
    return rel || null;
  }
}
class MockAiTagService {
  getDb() {
    return getDatabase();
  }
  getTagService() {
    return new TagService();
  }
  getAssetTagService() {
    return new AssetTagService();
  }
  // Generates and inserts mock tag suggestions to SQLite
  generateSuggestionsForAsset(assetId) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db2.prepare("DELETE FROM tag_suggestions WHERE asset_id = ?").run(assetId);
    db2.prepare("DELETE FROM asset_tags WHERE asset_id = ? AND source LIKE 'ai_%'").run(assetId);
    const rawSuggestions = [
      { name: "极简", type: "style", source: "ai_wd_tagger", confidence: 0.88, model: "WD-Tagger-v3" },
      { name: "科技感", type: "style", source: "ai_wd_tagger", confidence: 0.74, model: "WD-Tagger-v3" },
      { name: "黑金", type: "color", source: "ai_florence", confidence: 0.91, model: "Florence-2-Large" },
      { name: "蓝紫色", type: "color", source: "ai_florence", confidence: 0.82, model: "Florence-2-Large" },
      { name: "电商banner", type: "usage", source: "ai_joycaption", confidence: 0.85, model: "JoyCaption-v2" },
      { name: "PPT封面", type: "usage", source: "ai_joycaption", confidence: 0.68, model: "JoyCaption-v2" },
      { name: "左文右图", type: "layout", source: "ai_qwen_vl", confidence: 0.79, model: "Qwen2.5-VL-7B" },
      { name: "大面积留白", type: "layout", source: "ai_qwen_vl", confidence: 0.71, model: "Qwen2.5-VL-7B" },
      { name: "办公场景", type: "scene", source: "ai_wd_tagger", confidence: 0.65, model: "WD-Tagger-v3" }
    ];
    const shuffled = rawSuggestions.sort(() => 0.5 - Math.random());
    const count = 4 + Math.floor(Math.random() * 3);
    const selected = shuffled.slice(0, count);
    const insertSuggestion = db2.prepare(`
      INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `);
    const tagService = this.getTagService();
    const assetTagService = this.getAssetTagService();
    const results = [];
    db2.transaction(() => {
      for (const item of selected) {
        const id = `sug-${Math.random().toString(36).substr(2, 9)}`;
        insertSuggestion.run(
          id,
          assetId,
          item.name,
          item.type,
          item.source,
          item.confidence,
          item.model,
          JSON.stringify(item),
          now2,
          now2
        );
        const tagList = tagService.listTags({ searchQuery: item.name, type: item.type });
        let tagId = "";
        if (tagList.length > 0) {
          tagId = tagList[0].id;
        } else {
          const newTag = tagService.createTag({
            name: item.name,
            type: item.type,
            color: this.getDefaultColorForType(item.type)
          });
          tagId = newTag.id;
        }
        assetTagService.addTagToAsset(assetId, tagId, {
          source: item.source,
          confidence: item.confidence,
          status: "pending",
          modelName: item.model,
          createdBy: "ai"
        });
        results.push({
          id,
          asset_id: assetId,
          tag_name: item.name,
          tag_type: item.type,
          source: item.source,
          confidence: item.confidence,
          status: "pending",
          model_name: item.model,
          created_at: now2,
          updated_at: now2
        });
      }
      db2.prepare(`
        UPDATE assets
        SET ai_tag_status = 'completed',
            ai_tagged_at = ?,
            ai_prompt_status = 'completed',
            ai_prompt = 'A beautiful flat design illustration showing a modern tech environment with minimalist icons and dynamic grids, glowing neon colors, highly detailed, style of premium digital UI art',
            ai_caption = 'A premium modern tech vector graphic featuring high-end digital styling.',
            ai_analysis_status = 'completed',
            ai_analysis_json = ?
        WHERE id = ?
      `).run(
        now2,
        JSON.stringify({
          composition: "Left text layout with wide empty margins on the right",
          colors: ["#0f172a", "#6366f1", "#10b981"],
          elements: ["Icons", "Grid lines", "Glowing blobs"],
          style: "Minimalist Vector Glassmorphism"
        }),
        assetId
      );
    })();
    return results;
  }
  getSuggestionsForAsset(assetId) {
    const db2 = this.getDb();
    return db2.prepare("SELECT * FROM tag_suggestions WHERE asset_id = ?").all(assetId);
  }
  getDefaultColorForType(type) {
    const typeColorMap = {
      style: "bg-indigo-50 text-indigo-700 border border-indigo-200",
      color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      usage: "bg-blue-50 text-blue-700 border border-blue-200",
      layout: "bg-amber-50 text-amber-700 border border-amber-200",
      scene: "bg-rose-50 text-rose-700 border border-rose-200",
      source: "bg-slate-100 text-slate-700 border border-slate-200",
      ai: "bg-purple-50 text-purple-700 border border-purple-200",
      custom: "bg-pink-50 text-pink-700 border border-pink-200"
    };
    return typeColorMap[type] || typeColorMap.custom;
  }
}
function registerAssetTagIpc() {
  const service = new AssetTagService();
  const searchService = new TagSearchService();
  const mockAiService = new MockAiTagService();
  ipcMain.handle("asset-tag:add", async (_, { assetId, tagId, options }) => {
    try {
      const rel = service.addTagToAsset(assetId, tagId, options);
      return { success: true, relation: rel };
    } catch (err) {
      console.error("[IPC] asset-tag:add error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:remove", async (_, { assetId, tagId }) => {
    try {
      service.removeTagFromAsset(assetId, tagId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:remove error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:batch-add", async (_, { assetIds, tagIds, options }) => {
    try {
      service.addTagsToAssets(assetIds, tagIds, options);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:batch-add error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:batch-remove", async (_, { assetIds, tagIds }) => {
    try {
      service.removeTagsFromAssets(assetIds, tagIds);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:batch-remove error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:replace", async (_, { assetIds, oldTagId, newTagId }) => {
    try {
      service.replaceTagForAssets(assetIds, oldTagId, newTagId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:replace error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:list-by-asset", async (_, assetId) => {
    try {
      const relations = service.getTagsForAsset(assetId);
      return { success: true, relations };
    } catch (err) {
      console.error("[IPC] asset-tag:list-by-asset error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:confirm-ai", async (_, assetTagId) => {
    try {
      service.confirmAiTag(assetTagId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:confirm-ai error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("asset-tag:reject-ai", async (_, assetTagId) => {
    try {
      service.rejectAiTag(assetTagId);
      return { success: true };
    } catch (err) {
      console.error("[IPC] asset-tag:reject-ai error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag-search:assets", async (_, queries) => {
    try {
      const assets = searchService.searchAssetsByTags(queries);
      return { success: true, assets };
    } catch (err) {
      console.error("[IPC] tag-search:assets error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag-search:untagged", async () => {
    try {
      const assets = searchService.getUntaggedAssets();
      return { success: true, assets };
    } catch (err) {
      console.error("[IPC] tag-search:untagged error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("tag-search:ai-pending", async () => {
    try {
      const assets = searchService.getAssetsWithPendingAiTags();
      return { success: true, assets };
    } catch (err) {
      console.error("[IPC] tag-search:ai-pending error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("mock-ai:generate-suggestions", async (_, assetId) => {
    try {
      if (process.env.DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI_TAGS !== "1") {
        return {
          success: false,
          error: "Mock AI tag generation is disabled. Start and configure the real AI Worker before running smart tagging."
        };
      }
      const suggestions = mockAiService.generateSuggestionsForAsset(assetId);
      return { success: true, suggestions };
    } catch (err) {
      console.error("[IPC] mock-ai:generate-suggestions error:", err);
      return { success: false, error: String(err) };
    }
  });
}
const EMPTY_QUEUE_STATS = {
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0
};
function readTableStats(db2, tableName) {
  return db2.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM ${tableName}
  `).get();
}
function readAiQueueStats(db2) {
  try {
    const tagStats = readTableStats(db2, "ai_tag_tasks");
    const promptStats = readTableStats(db2, "ai_prompt_tasks");
    const analysisStats = readTableStats(db2, "ai_analysis_tasks");
    return {
      queued: (tagStats?.queued || 0) + (promptStats?.queued || 0) + (analysisStats?.queued || 0),
      running: (tagStats?.running || 0) + (promptStats?.running || 0) + (analysisStats?.running || 0),
      completed: (tagStats?.completed || 0) + (promptStats?.completed || 0) + (analysisStats?.completed || 0),
      failed: (tagStats?.failed || 0) + (promptStats?.failed || 0) + (analysisStats?.failed || 0)
    };
  } catch (_) {
    return { ...EMPTY_QUEUE_STATS };
  }
}
class AiClientService {
  pythonUrl = "http://127.0.0.1:8000";
  pollTimeout = null;
  isPolling = false;
  failureCount = 0;
  getDb() {
    return getDatabase();
  }
  getTagService() {
    return new TagService();
  }
  getAssetTagService() {
    return new AssetTagService();
  }
  startQueueSync() {
    if (this.isPolling) return;
    this.isPolling = true;
    console.log("[AIClient] Starting automatic background task sync poller...");
    this.scheduleNextPoll(3e3);
    try {
      const { app: app2 } = require2("electron");
      app2.on("will-quit", () => {
        this.stopQueueSync();
      });
    } catch (e) {
    }
  }
  stopQueueSync() {
    this.isPolling = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
      console.log("[AIClient] Background task sync poller stopped.");
    }
  }
  scheduleNextPoll(delay) {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    if (!this.isPolling) return;
    this.pollTimeout = setTimeout(async () => {
      await this.executePollCycle();
    }, delay);
  }
  async executePollCycle() {
    try {
      const connected = await this.pollCompletedTasks();
      if (connected) {
        if (this.failureCount > 0) {
          console.log("[AIClient] Python AI Worker service successfully reconnected. Resetting poll rate to 3s.");
        }
        this.failureCount = 0;
        this.scheduleNextPoll(3e3);
      } else {
        this.handlePollFailure();
      }
    } catch (err) {
      this.handlePollFailure();
    }
  }
  handlePollFailure() {
    this.failureCount++;
    let nextDelay = 3e3;
    if (this.failureCount === 1) {
      nextDelay = 3e3;
      console.warn(`[AIClient] Python AI Worker service connection failed (Retry 1). Retrying in 3s.`);
    } else if (this.failureCount === 2) {
      nextDelay = 1e4;
      console.warn(`[AIClient] Python AI Worker service connection failed (Retry 2). Backing off for 10s.`);
    } else {
      nextDelay = 3e4;
    }
    this.scheduleNextPoll(nextDelay);
  }
  notifyRenderer(assetId) {
    try {
      const { BrowserWindow: BrowserWindow2 } = require2("electron");
      BrowserWindow2.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("ai:task-synced", { assetId });
        }
      });
    } catch (err) {
      console.error("[AIClient] Failed to notify renderer:", err);
    }
  }
  /**
   * Enqueues an asset for background batch tagging in Python.
   */
  async enqueueTagging(assetId, filePath, priority = 0, modelsToRun) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const res = await fetch(`${this.pythonUrl}/ai/tag/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath, priority, models_to_run: modelsToRun })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const resolvedModelName = modelsToRun && modelsToRun.length > 0 ? `custom_pipeline:${modelsToRun.join(",")}` : data.model_name || "WD-Tagger-v3";
        db2.prepare(`
          INSERT OR REPLACE INTO ai_tag_tasks (id, asset_id, file_path, status, priority, model_name, retry_count, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', ?, ?, 0, ?, 'pending')
        `).run(data.task_id, assetId, filePath, priority, resolvedModelName, now2);
        db2.prepare("UPDATE assets SET ai_tag_status = ? WHERE id = ?").run("queued", assetId);
        this.notifyRenderer(assetId);
      }
      return data;
    } catch (err) {
      console.error("[AIClient] Enqueue tagging failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Manually trigger batch processing in Python.
   */
  async processBatch() {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/tag/process-batch`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[AIClient] Trigger process batch failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Fetch active loaded models and VRAM usage.
   */
  async getModelsStatus() {
    const db2 = this.getDb();
    const queueStats = readAiQueueStats(db2);
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/status`, { signal: AbortSignal.timeout(1e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        success: true,
        offline: false,
        loaded_models: data.loaded_models,
        gpu_status: data.gpu_status,
        queue_stats: queueStats
      };
    } catch (err) {
      return {
        success: true,
        offline: true,
        loaded_models: {},
        gpu_status: {
          available: false,
          is_mock: false,
          device_name: "Python AI Service Offline",
          total_vram_mb: 0,
          used_vram_mb: 0,
          free_vram_mb: 0,
          utilization_percent: 0,
          error: "Python AI Worker is offline."
        },
        queue_stats: queueStats
      };
    }
  }
  /**
   * Fetches the macOS AI branch worker capability probe without loading models.
   */
  async getMacOSCapabilities() {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/runtime/macos-capabilities`, { signal: AbortSignal.timeout(1e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        success: true,
        offline: false,
        capabilities: data
      };
    } catch (err) {
      return {
        success: true,
        offline: true,
        capabilities: null,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  /**
   * Fetches the Python MPS compatibility signal without loading models.
   */
  async getPythonMpsStatus() {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/python-mps/status`, { signal: AbortSignal.timeout(1e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const compatData = data;
      const errorMessage = typeof compatData.error === "string" ? compatData.error : compatData.error && typeof compatData.error === "object" ? String(compatData.error.message ?? null) : null;
      return {
        success: compatData.success ?? true,
        offline: false,
        compatible: compatData.compatible,
        runtime: compatData.runtime ?? null,
        status: compatData.status,
        diagnostics: compatData.diagnostics ?? {},
        error: errorMessage
      };
    } catch (err) {
      return {
        success: false,
        offline: true,
        compatible: false,
        runtime: null,
        status: "unavailable",
        diagnostics: {},
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  /**
   * Fetches the CLIP/SigLIP ONNX compatibility signal without loading models.
   */
  async getClipSiglipOnnxStatus() {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/clip-siglip-onnx/status`, { signal: AbortSignal.timeout(1e3) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const compatData = data;
      return {
        success: compatData.success ?? true,
        offline: false,
        compatible: compatData.compatible,
        runtime: compatData.runtime ?? null,
        diagnostics: compatData.diagnostics ?? {},
        error: compatData.error?.message ?? null
      };
    } catch (err) {
      return {
        success: false,
        offline: true,
        compatible: false,
        runtime: null,
        diagnostics: {},
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  /**
   * Forcibly release loaded model memory.
   */
  async unloadModels() {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/unload`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[AIClient] Force unload models failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Preview how a given file path would be routed in the VisualRouter.
   */
  async getRoutingPreview(filePath) {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/routing/preview?file_path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[AIClient] Get routing preview failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Triggers manual prompt reversal.
   */
  async generatePrompt(assetId, filePath) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const res = await fetch(`${this.pythonUrl}/ai/prompt/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        db2.prepare(`
          INSERT OR REPLACE INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', 'JoyCaption-v2', ?, 'pending')
        `).run(data.task_id, assetId, filePath, now2);
        db2.prepare("UPDATE assets SET ai_prompt_status = ? WHERE id = ?").run("queued", assetId);
        this.notifyRenderer(assetId);
      }
      return data;
    } catch (err) {
      console.error("[AIClient] Generate prompt failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Triggers manual deep design sweep.
   */
  async generateAnalysis(assetId, filePath) {
    const db2 = this.getDb();
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    try {
      const res = await fetch(`${this.pythonUrl}/ai/analysis/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        db2.prepare(`
          INSERT OR REPLACE INTO ai_analysis_tasks (id, asset_id, file_path, status, model_name, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', 'Qwen2.5-VL', ?, 'pending')
        `).run(data.task_id, assetId, filePath, now2);
        db2.prepare("UPDATE assets SET ai_analysis_status = ? WHERE id = ?").run("queued", assetId);
        this.notifyRenderer(assetId);
      }
      return data;
    } catch (err) {
      console.error("[AIClient] Generate analysis failed:", err);
      return { success: false, error: String(err) };
    }
  }
  /**
   * Periodically queries Python status and synchronizes completed batch tag, prompt, and analysis jobs.
   * Returns true if Python server is online, false otherwise.
   */
  async pollCompletedTasks() {
    const db2 = this.getDb();
    const tagService = this.getTagService();
    const assetTagService = this.getAssetTagService();
    try {
      const checkRes = await fetch(`${this.pythonUrl}/ai/model/status`, { signal: AbortSignal.timeout(1500) });
      if (!checkRes.ok) return false;
    } catch (err) {
      return false;
    }
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const localTagTasks = db2.prepare("SELECT id, asset_id FROM ai_tag_tasks WHERE status IN ('queued', 'running', 'waiting')").all();
    for (const t of localTagTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`);
        if (!res.ok) continue;
        const task = await res.json();
        if (task.status === "running" || task.status === "processing") {
          db2.prepare("UPDATE ai_tag_tasks SET status = 'running' WHERE id = ?").run(t.id);
          db2.prepare("UPDATE assets SET ai_tag_status = 'running' WHERE id = ?").run(t.asset_id);
          this.notifyRenderer(t.asset_id);
        } else if (task.status === "completed" && task.result) {
          const r = task.result;
          db2.transaction(() => {
            db2.prepare(`
              UPDATE ai_tag_tasks
              SET status = 'completed', sync_status = 'synced', synced_at = ?, started_at = ?, completed_at = ?
              WHERE id = ?
            `).run(now2, task.started_at ? new Date(task.started_at * 1e3).toISOString() : null, task.completed_at ? new Date(task.completed_at * 1e3).toISOString() : null, t.id);
            const insertSuggestion = db2.prepare(`
              INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            `);
            for (const item of r.tags || []) {
              const source = item.source || "ai_wd_tagger";
              let modelName = item.model_name;
              if (!modelName) {
                if (source === "ai_ram") {
                  modelName = "RAM++";
                } else if (source === "ai_wd_tagger") {
                  modelName = "WD-Tagger-v3";
                } else if (source === "ai_florence") {
                  modelName = "Florence-2";
                } else if (source === "ai_clip_design") {
                  modelName = "CLIP Classifier";
                } else if (source === "design_rule") {
                  modelName = "DesignRule";
                } else {
                  modelName = "Cooperative-Tagger";
                }
              }
              const sugExists = db2.prepare(`
                SELECT 1 FROM tag_suggestions 
                WHERE asset_id = ? AND tag_name = ? AND source = ? AND model_name = ?
              `).get(t.asset_id, item.name, source, modelName);
              if (!sugExists) {
                const sugId = `sug-${Math.random().toString(36).substr(2, 9)}`;
                insertSuggestion.run(
                  sugId,
                  t.asset_id,
                  item.name,
                  item.type,
                  source,
                  item.confidence,
                  modelName,
                  JSON.stringify(item),
                  now2,
                  now2
                );
              }
              const tagList = tagService.listTags({ searchQuery: item.name, type: item.type });
              let tagId = "";
              if (tagList.length > 0) {
                tagId = tagList[0].id;
              } else {
                const newTag = tagService.createTag({
                  name: item.name,
                  type: item.type,
                  color: "bg-purple-50 text-purple-700 border border-purple-200"
                });
                tagId = newTag.id;
              }
              assetTagService.addTagToAsset(t.asset_id, tagId, {
                source,
                confidence: item.confidence,
                status: "pending",
                modelName,
                createdBy: "ai"
              });
            }
            const assetData = db2.prepare(`
              SELECT ai_caption_is_user_edited, ai_ocr_text FROM assets WHERE id = ?
            `).get(t.asset_id);
            const isUserEdited = assetData?.ai_caption_is_user_edited === 1;
            const existingOcr = assetData?.ai_ocr_text || "";
            let updateCaptionSql = "";
            const params = [];
            if (!isUserEdited && r.caption) {
              updateCaptionSql += `, ai_caption = ?, ai_caption_en = ?, ai_caption_translated_by = ?, ai_caption_source = ?, ai_caption_updated_at = ?`;
              params.push(r.caption, r.caption_en || "", r.caption_translated_by || "none", "ai_florence", now2);
            }
            if (r.ocr_text && r.ocr_text.trim()) {
              updateCaptionSql += `, ai_ocr_text = ?, ai_ocr_source = ?, ai_ocr_updated_at = ?`;
              params.push(r.ocr_text.trim(), "ai_florence_ocr", now2);
            }
            db2.prepare(`
              UPDATE assets
              SET ai_tag_status = 'synced', ai_tagged_at = ?, width = ?, height = ? ${updateCaptionSql}
              WHERE id = ?
            `).run(now2, r.width || 1920, r.height || 1080, ...params, t.asset_id);
          })();
          console.log(`[AIClient] Batch tagging task ${t.id} successfully synced into SQLite library.`);
          this.notifyRenderer(t.asset_id);
        } else if (task.status === "failed") {
          db2.prepare(`
            UPDATE ai_tag_tasks 
            SET status = 'failed', sync_status = 'failed', error_message = ? 
            WHERE id = ?
          `).run(task.error_message || "Inference error on Python AI worker", t.id);
          db2.prepare("UPDATE assets SET ai_tag_status = 'failed' WHERE id = ?").run(t.asset_id);
          this.notifyRenderer(t.asset_id);
        } else if (task.status === "cancelled") {
          db2.prepare("UPDATE ai_tag_tasks SET status = 'cancelled' WHERE id = ?").run(t.id);
          db2.prepare("UPDATE assets SET ai_tag_status = 'not_started' WHERE id = ?").run(t.asset_id);
          this.notifyRenderer(t.asset_id);
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed tagging task ${t.id}:`, err);
      }
    }
    const localAnalysisTasks = db2.prepare("SELECT id, asset_id FROM ai_analysis_tasks WHERE status IN ('queued', 'running', 'processing')").all();
    for (const t of localAnalysisTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`);
        if (!res.ok) continue;
        const task = await res.json();
        if (task.status === "running" || task.status === "processing") {
          db2.prepare("UPDATE ai_analysis_tasks SET status = 'running' WHERE id = ?").run(t.id);
          db2.prepare("UPDATE assets SET ai_analysis_status = 'running' WHERE id = ?").run(t.asset_id);
          this.notifyRenderer(t.asset_id);
        } else if (task.status === "completed" && task.result) {
          const r = task.result;
          db2.transaction(() => {
            db2.prepare(`
              UPDATE ai_analysis_tasks
              SET status = 'completed', sync_status = 'synced', synced_at = ?, started_at = ?, completed_at = ?, result_json = ?
              WHERE id = ?
            `).run(
              now2,
              task.started_at ? new Date(task.started_at * 1e3).toISOString() : null,
              task.completed_at ? new Date(task.completed_at * 1e3).toISOString() : null,
              JSON.stringify(r),
              t.id
            );
            db2.prepare(`
              UPDATE assets
              SET ai_analysis_status = 'synced', 
                  ai_analysis_json = ?,
                  ai_ocr_text = ?,
                  ai_ocr_source = 'ai_qwen_vl',
                  ai_ocr_updated_at = ?
              WHERE id = ?
            `).run(JSON.stringify(r), r.ocr_text || "", now2, t.asset_id);
            const qwenTags = [];
            if (Array.isArray(r.text_tags)) {
              for (const tag of r.text_tags) {
                if (tag && tag.name) {
                  qwenTags.push({
                    name: tag.name,
                    type: "subject",
                    confidence: typeof tag.confidence === "number" ? tag.confidence : 0.9
                  });
                }
              }
            }
            if (Array.isArray(r.design_tags)) {
              for (const tag of r.design_tags) {
                if (tag && tag.name) {
                  qwenTags.push({
                    name: tag.name,
                    type: "layout",
                    confidence: typeof tag.confidence === "number" ? tag.confidence : 0.88
                  });
                }
              }
            }
            const insertSuggestion = db2.prepare(`
              INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'ai_qwen_vl', ?, 'pending', 'Qwen2.5-VL', ?, ?, ?)
            `);
            for (const item of qwenTags) {
              const modelName = "Qwen2.5-VL";
              const source = "ai_qwen_vl";
              const sugExists = db2.prepare(`
                SELECT 1 FROM tag_suggestions 
                WHERE asset_id = ? AND tag_name = ? AND source = ? AND model_name = ?
              `).get(t.asset_id, item.name, source, modelName);
              if (!sugExists) {
                const sugId = `sug-${Math.random().toString(36).substr(2, 9)}`;
                insertSuggestion.run(
                  sugId,
                  t.asset_id,
                  item.name,
                  item.type,
                  item.confidence,
                  JSON.stringify(item),
                  now2,
                  now2
                );
              }
              const tagList = tagService.listTags({ searchQuery: item.name, type: item.type });
              let tagId = "";
              if (tagList.length > 0) {
                tagId = tagList[0].id;
              } else {
                const newTag = tagService.createTag({
                  name: item.name,
                  type: item.type,
                  color: "bg-purple-50 text-purple-700 border border-purple-200"
                });
                tagId = newTag.id;
              }
              assetTagService.addTagToAsset(t.asset_id, tagId, {
                source,
                confidence: item.confidence,
                status: "pending",
                modelName,
                createdBy: "ai"
              });
            }
          })();
          try {
            const assetRow = db2.prepare("SELECT file_path FROM assets WHERE id = ?").get(t.asset_id);
            if (assetRow && assetRow.file_path) {
              (async () => {
                const { ColorPaletteService: ColorPaletteService2 } = await Promise.resolve().then(() => colorPalette_service);
                const paletteService = new ColorPaletteService2();
                await paletteService.refreshTextPaletteFromTextBlocks(t.asset_id, r.text_blocks);
              })().catch((err) => {
                console.error("[AIClient] Failed background color palette extraction on AI analysis completion:", err);
              });
            }
          } catch (colorErr) {
            console.error("[AIClient] Failed to trigger color palette extraction:", colorErr);
          }
          console.log(`[AIClient] Deep analysis task ${t.id} successfully synced into SQLite.`);
          this.notifyRenderer(t.asset_id);
        } else if (task.status === "failed") {
          db2.prepare(`
            UPDATE ai_analysis_tasks
            SET status = 'failed', sync_status = 'failed', error_message = ?
            WHERE id = ?
          `).run(task.error_message || "Qwen-VL design analysis failed", t.id);
          db2.prepare("UPDATE assets SET ai_analysis_status = 'failed' WHERE id = ?").run(t.asset_id);
          this.notifyRenderer(t.asset_id);
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed analysis task ${t.id}:`, err);
      }
    }
    return true;
  }
}
function registerAiClientIpc() {
  const service = new AiClientService();
  service.startQueueSync();
  ipcMain.handle("ai:enqueue-tag", async (_, { assetId, filePath, priority, modelsToRun }) => {
    try {
      return await service.enqueueTagging(assetId, filePath, priority || 0, modelsToRun);
    } catch (err) {
      console.error("[IPC] ai:enqueue-tag error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:process-batch", async () => {
    try {
      return await service.processBatch();
    } catch (err) {
      console.error("[IPC] ai:process-batch error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:model-status", async () => {
    try {
      return await service.getModelsStatus();
    } catch (err) {
      console.error("[IPC] ai:model-status error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:model-unload", async () => {
    try {
      return await service.unloadModels();
    } catch (err) {
      console.error("[IPC] ai:model-unload error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:prompt-generate", async (_, { assetId, filePath }) => {
    try {
      return await service.generatePrompt(assetId, filePath);
    } catch (err) {
      console.error("[IPC] ai:prompt-generate error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:analysis-generate", async (_, { assetId, filePath }) => {
    try {
      return await service.generateAnalysis(assetId, filePath);
    } catch (err) {
      console.error("[IPC] ai:analysis-generate error:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai:routing-preview", async (_, { filePath }) => {
    try {
      return await service.getRoutingPreview(filePath);
    } catch (err) {
      console.error("[IPC] ai:routing-preview error:", err);
      return { success: false, error: String(err) };
    }
  });
}
function registerColorPaletteIpc() {
  const service = new ColorPaletteService();
  ipcMain.handle("assets:extract-palette", async (_, { filePath, textBoxes }) => {
    try {
      return await service.extractPalette(filePath, textBoxes || []);
    } catch (err) {
      console.error("[IPC] assets:extract-palette error:", err);
      throw err;
    }
  });
  ipcMain.handle("assets:trigger-extract-save", async (_, { assetId, filePath }) => {
    try {
      await service.extractAndSavePalette(assetId, filePath);
      return { success: true };
    } catch (err) {
      console.error("[IPC] assets:trigger-extract-save error:", err);
      return { success: false, error: String(err) };
    }
  });
}
const DEFAULT_PROMPT_TEMPLATE_ID = "qwen3vl.design_prompt.v1";
const DEFAULT_PROMPT_REVERSE_MAX_TOKENS = 1536;
const RETRY_PROMPT_REVERSE_MAX_TOKENS = 3072;
const DEFAULT_QWEN3VL_DESIGN_PROMPT = `你是一位专业的 AI 图像提示词专家和高级视觉设计师。

请仔细分析这张设计参考图，并生成一段可复用的图像生成提示词（Prompt）。

请严格以合规的 JSON 格式返回结果，仅包含以下字段，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或解释性文本：
englishPrompt, chineseDescription, shortCaption, styleTags, subjectTags, compositionTags, colorTags, usageTags, negativePromptSuggestion。

分析时请专注于：
- 视觉风格（如扁平插画、写实摄影、奢华黑金、3D渲染等）
- 画面主体与细节特征
- 版式布局与构图方式（如对称、三分法、对角线、居中等）
- 色彩搭配（主色调、辅助色、渐变与对比度）
- 光影调性与照明效果
- 文字区域分布与排版感受
- 图形元素、背景装饰与画面意境
- 商业设计用途建议

要求：
1. 不要简单地罗列物体，请详细描述如何重建这种设计风格。
2. englishPrompt 字段必须为英文（适合 Midjourney/Stable Diffusion 绘图输入），描述画面并包含核心风格词。
3. chineseDescription 字段必须为中文，详尽剖析画面的设计美学与视觉呈现。
4. styleTags、subjectTags、compositionTags、colorTags、usageTags 字段必须全部使用中文标签，不要输出英文标签。
5. 请勿幻想出无法阅读的乱码文字。`;
function normalizePlatformName(value) {
  if (value === "win32" || value === "darwin" || value === "linux") return value;
  return "unknown";
}
function normalizePlatformArch(value) {
  if (value === "x64" || value === "arm64") return value;
  return "unknown";
}
function getPlatformProfile(platform, arch) {
  if (platform === "win32" && arch === "x64") return "windows-x64";
  if (platform === "win32" && arch === "arm64") return "windows-arm64";
  if (platform === "darwin" && arch === "arm64") return "macos-apple-silicon";
  if (platform === "darwin" && arch === "x64") return "macos-intel";
  if (platform === "linux" && arch === "x64") return "linux-x64";
  return "unknown";
}
function detectPlatform(rawPlatform = process.platform, rawArch = process.arch) {
  const platform = normalizePlatformName(rawPlatform);
  const arch = normalizePlatformArch(rawArch);
  const profile = getPlatformProfile(platform, arch);
  return {
    platform,
    arch,
    profile,
    isWindows: platform === "win32",
    isMacOS: platform === "darwin",
    isAppleSilicon: platform === "darwin" && arch === "arm64"
  };
}
function getElectronPath(options, name) {
  try {
    const value = options.getPath?.(name);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}
function resolveManagedPaths(options = {}) {
  const appName = options.appName ?? "DesignAssetManager";
  const userDataDir = getElectronPath(options, "userData") ?? path.join(os.homedir(), appName);
  const tempDir = getElectronPath(options, "temp") ?? path.join(os.tmpdir(), appName);
  const downloadsDir = getElectronPath(options, "downloads") ?? path.join(userDataDir, "downloads");
  return {
    userDataDir,
    configDir: path.join(userDataDir, "config"),
    databaseDir: path.join(userDataDir, "database"),
    logsDir: path.join(userDataDir, "logs"),
    cacheDir: path.join(userDataDir, "cache"),
    runtimeDir: path.join(userDataDir, "runtime"),
    modelsDir: path.join(userDataDir, "models"),
    tempDir,
    downloadsDir
  };
}
function createDefaultExternalHttpRuntimeSettings(kind) {
  const defaults = {
    ollama: {
      healthEndpoint: "/api/tags",
      modelsEndpoint: "/api/tags",
      chatEndpoint: "/api/chat",
      completionsEndpoint: "/api/generate",
      timeoutMs: 5e3
    },
    "lm-studio": {
      healthEndpoint: "/v1/models",
      modelsEndpoint: "/v1/models",
      chatEndpoint: "/v1/chat/completions",
      completionsEndpoint: "/v1/completions",
      timeoutMs: 3e4
    },
    "llama-app": {
      healthEndpoint: "/health",
      modelsEndpoint: "/v1/models",
      chatEndpoint: "/v1/chat/completions",
      completionsEndpoint: "/v1/completions",
      timeoutMs: 3e4
    },
    "custom-http": {
      healthEndpoint: "/health",
      modelsEndpoint: null,
      chatEndpoint: null,
      completionsEndpoint: null,
      timeoutMs: 3e4
    }
  };
  return {
    kind,
    baseUrl: null,
    headers: {},
    authMode: "none",
    ...defaults[kind]
  };
}
function createDefaultPythonWorkerRuntimeSettings() {
  return {
    pythonPath: null,
    scriptPath: null,
    workingDirectory: null,
    host: "127.0.0.1",
    port: 8e3,
    baseUrl: "http://127.0.0.1:8000",
    healthEndpoint: "/health",
    launchArgs: [],
    env: {},
    timeoutMs: 5e3
  };
}
function createDefaultDisabledRuntimeSettings() {
  return {
    id: "disabled-runtime",
    kind: "disabled",
    enabled: false,
    displayName: "Disabled AI Runtime",
    baseUrl: null,
    healthEndpoint: null,
    executablePath: null,
    workingDirectory: null,
    launchArgs: [],
    env: {},
    port: null,
    timeoutMs: 1e3,
    profileId: null,
    metadata: {}
  };
}
function createDefaultAiRuntimeSettings(defaultRuntimeKind = "disabled") {
  const disabledRuntime = createDefaultDisabledRuntimeSettings();
  return {
    activeRuntimeId: disabledRuntime.id,
    runtimes: [disabledRuntime],
    defaultRuntimeKind,
    allowExternalInference: false,
    allowLocalPythonWorker: false,
    healthCheckOnStartup: false,
    metadata: {}
  };
}
const SETTINGS_COMPATIBILITY_TARGET_VERSION = 2;
function defaultRuntimeKindForProfile(runtimeProfile) {
  return "disabled";
}
function runtimeProfileId(runtimeProfile) {
  return typeof runtimeProfile === "object" ? runtimeProfile.id : runtimeProfile;
}
function createSettingsPathDefaults(managedPaths) {
  return {
    managedPaths: {
      userDataDir: managedPaths.userDataDir,
      configDir: managedPaths.configDir,
      databaseDir: managedPaths.databaseDir,
      logsDir: managedPaths.logsDir,
      cacheDir: managedPaths.cacheDir,
      runtimeDir: managedPaths.runtimeDir,
      modelsDir: managedPaths.modelsDir,
      tempDir: managedPaths.tempDir,
      downloadsDir: managedPaths.downloadsDir
    },
    libraryPath: managedPaths.downloadsDir,
    modelRootDir: managedPaths.modelsDir
  };
}
function createSettingsRuntimeDefaults(runtimeProfile) {
  const profileId = runtimeProfileId(runtimeProfile);
  const defaultRuntimeKind = defaultRuntimeKindForProfile();
  return {
    runtimeProfileId: profileId,
    aiRuntimeSettings: createDefaultAiRuntimeSettings(defaultRuntimeKind)
  };
}
function createSettingsDoctorDefaults() {
  return {
    doctorSettings: {
      lastRunAt: null,
      lastOverallStatus: null,
      showInSettings: true,
      dismissedCheckIds: []
    }
  };
}
function createSettingsBootstrapDefaults() {
  return {
    bootstrapSettings: {
      status: "not_initialized",
      mode: "manual",
      selectedProfileId: null,
      recommendedProfileId: null,
      completedAt: null,
      skippedAt: null
    }
  };
}
function createCrossPlatformSettingsDefaults(platformInfo, managedPaths, runtimeProfile) {
  const runtimeDefaults = createSettingsRuntimeDefaults(runtimeProfile);
  const bootstrapDefaults = createSettingsBootstrapDefaults();
  const doctorDefaults = createSettingsDoctorDefaults();
  return {
    schemaVersion: SETTINGS_COMPATIBILITY_TARGET_VERSION,
    platformProfile: platformInfo.profile,
    managedPaths: createSettingsPathDefaults(managedPaths).managedPaths,
    aiRuntimeSettings: runtimeDefaults.aiRuntimeSettings,
    bootstrapSettings: {
      status: bootstrapDefaults.bootstrapSettings.status ?? "not_initialized",
      mode: bootstrapDefaults.bootstrapSettings.mode ?? "manual",
      selectedProfileId: runtimeDefaults.runtimeProfileId ?? null,
      recommendedProfileId: runtimeDefaults.runtimeProfileId ?? null,
      completedAt: bootstrapDefaults.bootstrapSettings.completedAt ?? null,
      skippedAt: bootstrapDefaults.bootstrapSettings.skippedAt ?? null
    },
    doctorSettings: doctorDefaults.doctorSettings
  };
}
function createDefaultLlamaBackendConfig$1() {
  return {
    id: "llama-local-openai",
    name: "Llama local quantized model service",
    type: "llama-openai",
    enabled: false,
    baseUrl: "http://127.0.0.1:8080/v1",
    apiKey: "local",
    defaultModel: "",
    timeoutMs: 12e4,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50,
    notes: "OpenAI-compatible local llama runtime default."
  };
}
function createDefaultPromptReverseSettings$1() {
  return {
    backendMode: "llama-openai",
    selectedNativeModelId: "qwen3-vl-4b-instruct",
    selectedExternalBackendId: "llama-local-openai",
    selectedExternalModel: "",
    maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    maxImageSize: 1024,
    temperature: 0.6,
    topP: 0.9
  };
}
function createLegacyAppSettingsDefaults() {
  return {
    libraryPath: "~/DesignAssetManager/library",
    concurrency: 3,
    delayInterval: 1.5,
    saveOriginalUrl: true,
    autoThumbnail: true,
    enableTextColorPalette: true,
    textDetectionProvider: "none",
    textDetectionTimeoutMs: 15e3,
    maxTextBoxes: 30,
    minTextBoxConfidence: 0.5,
    enableTextColorAnalysis: true,
    textBoxProvider: "easyocr",
    ocrTimeoutMs: 15e3,
    maxTextBoxesPerImage: 30,
    autoInstallAllowed: false,
    lastOcrEnvCheckAt: "",
    cachedOcrEnvStatus: null,
    modelRootDir: path.join(homedir(), "DesignAssetManager", "AIModels"),
    selectedPromptModelId: "qwen3-vl-4b-instruct",
    selectedPromptModelPath: path.join(homedir(), "DesignAssetManager", "AIModels", "qwen", "qwen3-vl-4b-instruct"),
    qwen3vlMaxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    qwen3vlMaxImageSize: 1024,
    qwen3vlTemperature: 0.6,
    qwen3vlTopP: 0.9,
    aiBackends: [createDefaultLlamaBackendConfig$1()],
    promptReverseSettings: createDefaultPromptReverseSettings$1(),
    promptReverseTemplates: [],
    memoryPolicy: {
      clearGpuBeforePromptReverse: "auto",
      forceClearWhenInsufficient: true,
      minFreeVramGBBeforeQwen8B: 10,
      maxGpuMemoryUsagePercent: 92,
      enableGpuMemoryGuard: true,
      enableGpuMemoryPollingDuringInference: true,
      gpuMemoryPollIntervalMs: 1e3
    },
    enable_text_color_palette: true,
    text_detection_provider: "none",
    text_detection_timeout_ms: 3e3,
    max_text_boxes: 30,
    min_text_box_confidence: 0.5
  };
}
function createNewInstallAppSettingsDefaults() {
  const platformInfo = detectPlatform();
  const managedPaths = resolveManagedPaths();
  const crossPlatformDefaults = createCrossPlatformSettingsDefaults(platformInfo, managedPaths);
  return {
    ...createLegacyAppSettingsDefaults(),
    schemaVersion: crossPlatformDefaults.schemaVersion,
    platformProfile: crossPlatformDefaults.platformProfile,
    managedPaths: crossPlatformDefaults.managedPaths,
    aiRuntimeSettings: crossPlatformDefaults.aiRuntimeSettings,
    bootstrapSettings: crossPlatformDefaults.bootstrapSettings,
    doctorSettings: crossPlatformDefaults.doctorSettings
  };
}
const WINDOWS_ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
function sanitizeFilename(input) {
  const sanitized = input.normalize("NFC").replace(WINDOWS_ILLEGAL_FILENAME_CHARS, "_").replace(/[. ]+$/g, "").trim();
  if (!sanitized) return "untitled";
  if (WINDOWS_RESERVED_NAMES.test(sanitized)) return `_${sanitized}`;
  return sanitized;
}
function isInsideDirectory(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return relative === "" || Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}
function ensureSafeJoin(root, ...parts) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...parts);
  if (!isInsideDirectory(resolvedRoot, target)) {
    throw new Error(`Unsafe path join blocked: target is outside managed root.`);
  }
  return target;
}
function assertInsideManagedRoot(root, target) {
  if (!isInsideDirectory(root, target)) {
    throw new Error(`Path is outside managed root.`);
  }
}
async function ensureDirectory(dirPath) {
  await fs$1.mkdir(dirPath, { recursive: true });
}
async function safeRemoveInsideRoot(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget === resolvedRoot) {
    throw new Error(`Refusing to remove managed root itself.`);
  }
  assertInsideManagedRoot(resolvedRoot, resolvedTarget);
  await fs$1.rm(resolvedTarget, { recursive: true, force: true });
}
function normalizeAiRuntimeSettings(settings) {
  const defaults = createDefaultAiRuntimeSettings();
  const runtimes = Array.isArray(settings.runtimes) && settings.runtimes.length > 0 ? settings.runtimes.map((entry) => ({
    ...entry,
    enabled: entry.enabled ?? false,
    launchArgs: entry.launchArgs ?? [],
    env: entry.env ?? {},
    metadata: { ...entry.metadata ?? {} }
  })) : defaults.runtimes;
  return {
    activeRuntimeId: settings.activeRuntimeId ?? runtimes[0]?.id ?? defaults.activeRuntimeId,
    runtimes,
    defaultRuntimeKind: settings.defaultRuntimeKind ?? runtimes[0]?.kind ?? defaults.defaultRuntimeKind,
    allowExternalInference: settings.allowExternalInference ?? false,
    allowLocalPythonWorker: settings.allowLocalPythonWorker ?? false,
    healthCheckOnStartup: settings.healthCheckOnStartup ?? false,
    metadata: {
      ...defaults.metadata ?? {},
      ...settings.metadata ?? {}
    }
  };
}
function isExternalRuntimeKind(kind) {
  return kind === "ollama" || kind === "lm-studio" || kind === "llama-app" || kind === "custom-http";
}
function backendTypeToRuntimeKind(type) {
  if (type === "ollama") return "ollama";
  if (type === "lm-studio") return "lm-studio";
  if (type === "llama-openai") return "llama-app";
  return "custom-http";
}
function mapBackendToSettingsEntry(backend) {
  const kind = backendTypeToRuntimeKind(backend.type);
  const externalHttp = {
    ...createDefaultExternalHttpRuntimeSettings(kind),
    baseUrl: backend.baseUrl,
    timeoutMs: backend.timeoutMs
  };
  return {
    id: backend.id,
    kind,
    enabled: backend.enabled,
    displayName: backend.name,
    baseUrl: backend.baseUrl,
    healthEndpoint: externalHttp.healthEndpoint,
    timeoutMs: backend.timeoutMs,
    externalHttp,
    metadata: {
      legacySource: "aiBackends",
      backendType: backend.type,
      defaultModel: backend.defaultModel
    }
  };
}
function legacyExternalEntry(id, kind, config, legacySource) {
  const externalHttp = {
    ...createDefaultExternalHttpRuntimeSettings(kind),
    ...config,
    kind
  };
  return {
    id: config.id ?? id,
    kind,
    enabled: config.enabled ?? false,
    displayName: config.displayName ?? id,
    baseUrl: externalHttp.baseUrl,
    healthEndpoint: externalHttp.healthEndpoint,
    timeoutMs: externalHttp.timeoutMs,
    externalHttp,
    metadata: { legacySource }
  };
}
function legacyPythonEntry(config) {
  const pythonWorker = {
    ...createDefaultPythonWorkerRuntimeSettings(),
    ...config
  };
  return {
    id: config.id ?? "legacy-python-worker",
    kind: "python-worker",
    enabled: config.enabled ?? false,
    displayName: config.displayName ?? "Legacy Python Worker",
    baseUrl: pythonWorker.baseUrl,
    healthEndpoint: pythonWorker.healthEndpoint,
    executablePath: pythonWorker.pythonPath,
    workingDirectory: pythonWorker.workingDirectory,
    launchArgs: pythonWorker.launchArgs,
    env: pythonWorker.env,
    port: pythonWorker.port,
    timeoutMs: pythonWorker.timeoutMs,
    pythonWorker,
    metadata: { legacySource: "aiWorkerConfig" }
  };
}
function migrateLegacyAiRuntimeSettings(settings) {
  const runtimes = [];
  if (Array.isArray(settings.aiBackends)) {
    runtimes.push(...settings.aiBackends.map(mapBackendToSettingsEntry));
  }
  if (settings.llamaAppConfig) {
    runtimes.push(legacyExternalEntry("legacy-llama-app", "llama-app", settings.llamaAppConfig, "llamaAppConfig"));
  }
  if (settings.externalInference) {
    runtimes.push(legacyExternalEntry("legacy-external-inference", settings.externalInference.kind ?? "custom-http", settings.externalInference, "externalInference"));
  }
  if (settings.aiWorkerConfig) {
    runtimes.push(legacyPythonEntry(settings.aiWorkerConfig));
  }
  const defaults = createDefaultAiRuntimeSettings();
  return normalizeAiRuntimeSettings({
    ...defaults,
    runtimes: runtimes.length > 0 ? runtimes : defaults.runtimes,
    activeRuntimeId: runtimes.find((runtime) => runtime.enabled)?.id ?? defaults.activeRuntimeId,
    defaultRuntimeKind: runtimes.find((runtime) => runtime.enabled)?.kind ?? defaults.defaultRuntimeKind,
    allowExternalInference: runtimes.some((runtime) => runtime.enabled && isExternalRuntimeKind(runtime.kind)),
    allowLocalPythonWorker: runtimes.some((runtime) => runtime.enabled && runtime.kind === "python-worker"),
    metadata: {
      ...defaults.metadata,
      migratedFromLegacy: runtimes.length > 0
    }
  });
}
function mergeAiRuntimeSettingsDefaults(settings) {
  return normalizeAiRuntimeSettings({
    ...createDefaultAiRuntimeSettings(),
    ...settings,
    metadata: {
      ...createDefaultAiRuntimeSettings().metadata,
      ...settings?.metadata
    }
  });
}
function createCompatibilityReport(input) {
  const changes = input.changes ?? [];
  const blockingIssues = input.blockingIssues ?? [];
  return {
    originalVersion: input.originalVersion ?? null,
    targetVersion: input.targetVersion,
    changes,
    warnings: input.warnings ?? [],
    blockingIssues,
    wouldChange: changes.some((change2) => change2.type === "add" || change2.type === "normalize"),
    safeToApplyLater: blockingIssues.length === 0
  };
}
function mergeCompatibilityReports(...reports) {
  const targetVersion = Math.max(...reports.map((report) => report.targetVersion));
  const originalVersions = reports.map((report) => report.originalVersion).filter((version) => typeof version === "number");
  return createCompatibilityReport({
    originalVersion: originalVersions.length > 0 ? Math.min(...originalVersions) : null,
    targetVersion,
    changes: reports.flatMap((report) => report.changes),
    warnings: reports.flatMap((report) => report.warnings),
    blockingIssues: reports.flatMap((report) => report.blockingIssues)
  });
}
function cloneSettings$1(input) {
  return JSON.parse(JSON.stringify(input ?? {}));
}
function originalVersion(input) {
  return typeof input.schemaVersion === "number" ? input.schemaVersion : null;
}
function change(field, type, message) {
  return { field, type, message };
}
function reportFor(input, changes, warnings = [], blockingIssues = []) {
  return createCompatibilityReport({
    originalVersion: originalVersion(input),
    targetVersion: SETTINGS_COMPATIBILITY_TARGET_VERSION,
    changes,
    warnings,
    blockingIssues
  });
}
function detectBlockingIssues(input) {
  const issues = [];
  if (input.managedPaths && typeof input.managedPaths !== "object") {
    issues.push("managedPaths is present but is not an object.");
  }
  if (input.aiRuntimeSettings && typeof input.aiRuntimeSettings !== "object") {
    issues.push("aiRuntimeSettings is present but is not an object.");
  }
  return issues;
}
function dryRunInjectAiRuntimeSettings(input) {
  const settings = cloneSettings$1(input);
  const changes = [];
  if (settings.aiRuntimeSettings) {
    settings.aiRuntimeSettings = mergeAiRuntimeSettingsDefaults(settings.aiRuntimeSettings);
    changes.push(change("aiRuntimeSettings", "preserve", "Existing aiRuntimeSettings would be preserved and normalized."));
  } else {
    settings.aiRuntimeSettings = migrateLegacyAiRuntimeSettings(settings);
    changes.push(change("aiRuntimeSettings", "add", "aiRuntimeSettings would be created from legacy AI settings or safe defaults."));
  }
  return {
    settings,
    report: reportFor(input, changes, [], detectBlockingIssues(input))
  };
}
function dryRunInjectCrossPlatformDefaults(input, options = {}) {
  const settings = cloneSettings$1(input);
  const changes = [];
  if (!settings.schemaVersion) {
    settings.schemaVersion = options.targetVersion ?? SETTINGS_COMPATIBILITY_TARGET_VERSION;
    changes.push(change("schemaVersion", "add", "schemaVersion would be added for future settings compatibility."));
  }
  if (!settings.platformProfile && options.platformProfile) {
    settings.platformProfile = options.platformProfile;
    changes.push(change("platformProfile", "add", "platformProfile would be added from platform detection."));
  }
  const normalizedPaths = dryRunNormalizeManagedPaths(settings, options);
  const merged = normalizedPaths.settings;
  if (options.runtimeProfileId) {
    const bootstrapSettings = {
      ...merged.bootstrapSettings,
      selectedProfileId: merged.bootstrapSettings?.selectedProfileId ?? options.runtimeProfileId,
      recommendedProfileId: merged.bootstrapSettings?.recommendedProfileId ?? options.runtimeProfileId
    };
    merged.bootstrapSettings = bootstrapSettings;
    changes.push(change("bootstrapSettings", "add", "bootstrapSettings would receive runtime profile defaults."));
  }
  if (!merged.doctorSettings) {
    merged.doctorSettings = {
      lastRunAt: null,
      lastOverallStatus: null,
      showInSettings: true,
      dismissedCheckIds: []
    };
    changes.push(change("doctorSettings", "add", "doctorSettings would be added with safe display defaults."));
  }
  return {
    settings: merged,
    report: mergeCompatibilityReports(reportFor(input, changes, [], detectBlockingIssues(input)), normalizedPaths.report)
  };
}
function dryRunNormalizeManagedPaths(input, options = {}) {
  const settings = cloneSettings$1(input);
  const changes = [];
  if (options.managedPaths) {
    settings.managedPaths = {
      ...typeof settings.managedPaths === "object" ? settings.managedPaths : {},
      ...options.managedPaths
    };
    changes.push(change("managedPaths", settings.managedPaths ? "normalize" : "add", "managedPaths would be merged from platform managed paths."));
  } else if (!settings.managedPaths) {
    changes.push(change("managedPaths", "warning", "managedPaths cannot be added without platform managed paths."));
  }
  return {
    settings,
    report: reportFor(input, changes, options.managedPaths ? [] : ["managedPaths were not provided; path defaults are dry-run only."], detectBlockingIssues(input))
  };
}
function dryRunUpgradeSettings(input, options = {}) {
  const withAiRuntime = dryRunInjectAiRuntimeSettings(input);
  const withCrossPlatform = dryRunInjectCrossPlatformDefaults(withAiRuntime.settings, options);
  return {
    settings: withCrossPlatform.settings,
    report: mergeCompatibilityReports(analyzeSettingsCompatibility(input, options), withAiRuntime.report, withCrossPlatform.report)
  };
}
function analyzeSettingsCompatibility(input, options = {}) {
  const changes = [];
  const warnings = [];
  const blockingIssues = detectBlockingIssues(input);
  if (originalVersion(input) !== SETTINGS_COMPATIBILITY_TARGET_VERSION) {
    changes.push(change("schemaVersion", input.schemaVersion ? "normalize" : "add", "Settings schema version would be aligned with the compatibility target."));
  }
  if (!input.platformProfile && options.platformProfile) {
    changes.push(change("platformProfile", "add", "Platform profile can be recorded for future migrations."));
  }
  if (!input.managedPaths && options.managedPaths) {
    changes.push(change("managedPaths", "add", "Managed paths can be added from platform path resolver output."));
  }
  if (!input.aiRuntimeSettings) {
    changes.push(change("aiRuntimeSettings", "add", "AI Runtime settings can be created without deleting legacy AI fields."));
  }
  if (!options.managedPaths) {
    warnings.push("No managedPaths were provided, so path defaults cannot be fully evaluated.");
  }
  return reportFor(input, changes, warnings, blockingIssues);
}
const BACKUP_DIR_NAME = "settings-backups";
function settingsRoot$1(settingsPath) {
  return path.dirname(path.resolve(settingsPath));
}
function backupDir(settingsPath) {
  return path.join(settingsRoot$1(settingsPath), BACKUP_DIR_NAME);
}
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
}
function backupFileName(settingsPath) {
  const parsed = path.parse(settingsPath);
  return `${parsed.name}.${timestamp()}.backup${parsed.ext || ".json"}`;
}
async function createSettingsBackup(settingsPath) {
  const resolvedSettingsPath = path.resolve(settingsPath);
  const root = settingsRoot$1(resolvedSettingsPath);
  assertInsideManagedRoot(root, resolvedSettingsPath);
  const targetDir = backupDir(resolvedSettingsPath);
  assertInsideManagedRoot(root, targetDir);
  await ensureDirectory(targetDir);
  const targetPath = path.join(targetDir, backupFileName(resolvedSettingsPath));
  assertInsideManagedRoot(root, targetPath);
  await fs$1.copyFile(resolvedSettingsPath, targetPath);
  return targetPath;
}
async function restoreSettingsBackup(settingsPath, backupPath) {
  const resolvedSettingsPath = path.resolve(settingsPath);
  const resolvedBackupPath = path.resolve(backupPath);
  const root = settingsRoot$1(resolvedSettingsPath);
  const allowedBackupDir = backupDir(resolvedSettingsPath);
  assertInsideManagedRoot(root, resolvedSettingsPath);
  assertInsideManagedRoot(allowedBackupDir, resolvedBackupPath);
  const tmpPath = `${resolvedSettingsPath}.rollback.${Date.now()}.tmp`;
  assertInsideManagedRoot(root, tmpPath);
  await fs$1.copyFile(resolvedBackupPath, tmpPath);
  await fs$1.rename(tmpPath, resolvedSettingsPath);
}
async function listSettingsBackups(settingsPath) {
  const root = settingsRoot$1(settingsPath);
  const targetDir = backupDir(settingsPath);
  assertInsideManagedRoot(root, targetDir);
  try {
    const entries = await fs$1.readdir(targetDir);
    return entries.filter((entry) => entry.endsWith(".backup.json")).map((entry) => path.join(targetDir, entry)).sort();
  } catch {
    return [];
  }
}
function now$2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function planId() {
  return `settings-migration-${Date.now()}`;
}
function settingsRoot(settingsPath) {
  return path.dirname(path.resolve(settingsPath));
}
function safeSettingsPath(settingsPath) {
  const resolved = path.resolve(settingsPath);
  assertInsideManagedRoot(settingsRoot(resolved), resolved);
  return resolved;
}
function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings ?? {}));
}
function protectUserPaths(nextSettings, currentSettings) {
  return {
    ...nextSettings,
    libraryPath: currentSettings.libraryPath ?? nextSettings.libraryPath,
    modelRootDir: currentSettings.modelRootDir ?? nextSettings.modelRootDir,
    selectedPromptModelPath: currentSettings.selectedPromptModelPath ?? nextSettings.selectedPromptModelPath
  };
}
function disableRealRuntimeDefaults(settings) {
  if (!settings.aiRuntimeSettings) return settings;
  const runtimes = settings.aiRuntimeSettings.runtimes.map((runtime) => {
    if (runtime.kind === "python-worker" || runtime.kind === "ollama" || runtime.kind === "lm-studio" || runtime.kind === "llama-app" || runtime.kind === "custom-http") {
      return { ...runtime, enabled: false };
    }
    return runtime;
  });
  return {
    ...settings,
    aiRuntimeSettings: {
      ...settings.aiRuntimeSettings,
      runtimes,
      allowExternalInference: false,
      allowLocalPythonWorker: false,
      healthCheckOnStartup: false,
      activeRuntimeId: settings.aiRuntimeSettings.activeRuntimeId ?? "disabled-runtime"
    }
  };
}
function sanitizeMigrationResult(nextSettings, currentSettings) {
  return disableRealRuntimeDefaults(protectUserPaths(nextSettings, currentSettings));
}
async function atomicWriteJson(settingsPath, data) {
  const resolvedSettingsPath = safeSettingsPath(settingsPath);
  const root = settingsRoot(resolvedSettingsPath);
  const tmpPath = path.join(root, `.settings-migration.${Date.now()}.tmp`);
  assertInsideManagedRoot(root, tmpPath);
  await fs$1.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}
`, "utf8");
  await fs$1.rename(tmpPath, resolvedSettingsPath);
}
class SettingsMigrationService {
  createMigrationPlan(currentSettings) {
    const original = cloneSettings(currentSettings);
    const dryRunResult = dryRunUpgradeSettings(original);
    dryRunResult.settings = sanitizeMigrationResult(dryRunResult.settings, original);
    const blockingIssues = [...dryRunResult.report.blockingIssues];
    const status = blockingIssues.length > 0 ? "blocked" : "safe_to_apply";
    return {
      id: planId(),
      generatedAt: now$2(),
      sourceVersion: dryRunResult.report.originalVersion,
      targetVersion: dryRunResult.report.targetVersion,
      status,
      changes: dryRunResult.report.changes,
      warnings: dryRunResult.report.warnings,
      blockingIssues,
      backupRequired: true,
      canApply: status === "safe_to_apply",
      canRollback: false,
      dryRunResult
    };
  }
  dryRunFromSettings(currentSettings) {
    return this.createMigrationPlan(currentSettings);
  }
  canApplyMigration(plan) {
    return plan.canApply && plan.status === "safe_to_apply" && plan.blockingIssues.length === 0;
  }
  async applyMigrationFromFile(settingsPath) {
    const resolvedSettingsPath = safeSettingsPath(settingsPath);
    let backupPath = null;
    let plan = null;
    try {
      const data = await fs$1.readFile(resolvedSettingsPath, "utf8");
      const currentSettings = JSON.parse(data);
      plan = this.createMigrationPlan(currentSettings);
      if (!this.canApplyMigration(plan)) {
        return {
          success: false,
          planId: plan.id,
          appliedAt: null,
          backupPath: null,
          settingsPath: resolvedSettingsPath,
          warnings: plan.warnings,
          error: plan.blockingIssues.join("; ") || "Migration is not safe to apply."
        };
      }
      backupPath = await createSettingsBackup(resolvedSettingsPath);
      await atomicWriteJson(resolvedSettingsPath, plan.dryRunResult.settings);
      return {
        success: true,
        planId: plan.id,
        appliedAt: now$2(),
        backupPath,
        settingsPath: resolvedSettingsPath,
        warnings: plan.warnings,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        planId: plan?.id ?? "",
        appliedAt: null,
        backupPath,
        settingsPath: resolvedSettingsPath,
        warnings: plan?.warnings ?? [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async rollbackMigration(settingsPath, backupPath) {
    const resolvedSettingsPath = safeSettingsPath(settingsPath);
    try {
      await restoreSettingsBackup(resolvedSettingsPath, backupPath);
      return {
        success: true,
        rolledBackAt: now$2(),
        restoredFromBackup: path.resolve(backupPath),
        settingsPath: resolvedSettingsPath,
        warnings: [],
        error: null
      };
    } catch (error) {
      return {
        success: false,
        rolledBackAt: null,
        restoredFromBackup: null,
        settingsPath: resolvedSettingsPath,
        warnings: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
function createDefaultLlamaBackendConfig() {
  return {
    id: "llama-local-openai",
    name: "Llama 本地量化模型服务",
    type: "llama-openai",
    enabled: false,
    baseUrl: "http://127.0.0.1:8080/v1",
    apiKey: "local",
    defaultModel: "",
    timeoutMs: 12e4,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50,
    notes: "适用于 llama.cpp / llama-server / llama.app 暴露的 OpenAI-compatible API。"
  };
}
function createDefaultPromptReverseSettings() {
  return {
    backendMode: "llama-openai",
    selectedNativeModelId: "qwen3-vl-4b-instruct",
    selectedExternalBackendId: "llama-local-openai",
    selectedExternalModel: "",
    maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
    maxImageSize: 1024,
    temperature: 0.6,
    topP: 0.9
  };
}
class SettingsService {
  static instance;
  configPath;
  cache = null;
  migrationService = new SettingsMigrationService();
  constructor() {
    const baseDir = path.join(homedir(), "DesignAssetManager");
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.configPath = path.join(baseDir, "settings.json");
  }
  static getInstance() {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }
  getSettingsPath() {
    return this.configPath;
  }
  createMigrationPlan() {
    return this.migrationService.createMigrationPlan(this.getSettings());
  }
  applySettingsMigration() {
    return this.migrationService.applyMigrationFromFile(this.configPath);
  }
  rollbackSettingsMigration(backupPath) {
    return this.migrationService.rollbackMigration(this.configPath, backupPath);
  }
  /**
   * Get all settings (reads from cache or disk).
   */
  getSettings() {
    if (this.cache) return this.cache;
    const defaults = {
      libraryPath: "~/DesignAssetManager/library",
      concurrency: 3,
      delayInterval: 1.5,
      saveOriginalUrl: true,
      autoThumbnail: true,
      // New Text Color Palette default settings
      enableTextColorPalette: true,
      textDetectionProvider: "none",
      textDetectionTimeoutMs: 15e3,
      maxTextBoxes: 30,
      minTextBoxConfidence: 0.5,
      // OCR Enhancements R3
      enableTextColorAnalysis: true,
      textBoxProvider: "easyocr",
      ocrTimeoutMs: 15e3,
      maxTextBoxesPerImage: 30,
      autoInstallAllowed: false,
      lastOcrEnvCheckAt: "",
      cachedOcrEnvStatus: null,
      // Qwen3-VL & AI settings defaults
      modelRootDir: path.join(homedir(), "DesignAssetManager", "AIModels"),
      selectedPromptModelId: "qwen3-vl-4b-instruct",
      selectedPromptModelPath: path.join(homedir(), "DesignAssetManager", "AIModels", "qwen", "qwen3-vl-4b-instruct"),
      qwen3vlMaxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
      qwen3vlMaxImageSize: 1024,
      qwen3vlTemperature: 0.6,
      qwen3vlTopP: 0.9,
      aiBackends: [createDefaultLlamaBackendConfig()],
      promptReverseSettings: createDefaultPromptReverseSettings(),
      promptReverseTemplates: [],
      memoryPolicy: {
        clearGpuBeforePromptReverse: "auto",
        forceClearWhenInsufficient: true,
        minFreeVramGBBeforeQwen8B: 10,
        maxGpuMemoryUsagePercent: 92,
        enableGpuMemoryGuard: true,
        enableGpuMemoryPollingDuringInference: true,
        gpuMemoryPollIntervalMs: 1e3
      },
      // Aliases
      enable_text_color_palette: true,
      text_detection_provider: "none",
      text_detection_timeout_ms: 3e3,
      max_text_boxes: 30,
      min_text_box_confidence: 0.5
    };
    if (!fs.existsSync(this.configPath)) {
      const newInstallDefaults = createNewInstallAppSettingsDefaults();
      this.cache = newInstallDefaults;
      this.saveSettings(newInstallDefaults);
      return newInstallDefaults;
    }
    try {
      const data = fs.readFileSync(this.configPath, "utf8");
      const parsed = JSON.parse(data);
      const enableVal = parsed.enableTextColorPalette ?? parsed.enable_text_color_palette ?? defaults.enableTextColorPalette;
      let providerVal = parsed.textDetectionProvider ?? parsed.text_detection_provider ?? defaults.textDetectionProvider;
      const timeoutVal = parsed.textDetectionTimeoutMs ?? parsed.text_detection_timeout_ms ?? defaults.textDetectionTimeoutMs;
      const maxVal = parsed.maxTextBoxes ?? parsed.max_text_boxes ?? defaults.maxTextBoxes;
      const minVal = parsed.minTextBoxConfidence ?? parsed.min_text_box_confidence ?? defaults.minTextBoxConfidence;
      const unsafeLegacyDefaultProviders = ["paddleocr_detection", "rapidocr_detection", "mock_text_boxes"];
      if (unsafeLegacyDefaultProviders.includes(providerVal) && parsed.hasUserSelectedOcr !== true) {
        console.log(`[SettingsService] Safe legacy default migration: Normalizing unconfigured legacy provider '${providerVal}' to 'none'.`);
        providerVal = "none";
      }
      const enableAnalysisVal = parsed.enableTextColorAnalysis ?? defaults.enableTextColorAnalysis;
      const boxProviderVal = parsed.textBoxProvider ?? defaults.textBoxProvider;
      const ocrTimeoutVal = parsed.ocrTimeoutMs ?? defaults.ocrTimeoutMs;
      const maxBoxesImageVal = parsed.maxTextBoxesPerImage ?? defaults.maxTextBoxesPerImage;
      const autoInstallAllowedVal = parsed.autoInstallAllowed ?? defaults.autoInstallAllowed;
      const lastCheckAtVal = parsed.lastOcrEnvCheckAt ?? defaults.lastOcrEnvCheckAt;
      const cachedEnvVal = parsed.cachedOcrEnvStatus ?? defaults.cachedOcrEnvStatus;
      const modelRootDirVal = parsed.modelRootDir ?? defaults.modelRootDir;
      const selectedPromptModelIdVal = parsed.selectedPromptModelId ?? defaults.selectedPromptModelId;
      const selectedPromptModelPathVal = parsed.selectedPromptModelPath ?? path.join(modelRootDirVal, "qwen", parsed.selectedPromptModelId ?? defaults.selectedPromptModelId ?? "qwen3-vl-4b-instruct");
      const qwen3vlMaxNewTokensVal = parsed.qwen3vlMaxNewTokens ?? defaults.qwen3vlMaxNewTokens;
      const qwen3vlMaxImageSizeVal = parsed.qwen3vlMaxImageSize ?? defaults.qwen3vlMaxImageSize;
      const qwen3vlTemperatureVal = parsed.qwen3vlTemperature ?? defaults.qwen3vlTemperature;
      const qwen3vlTopPVal = parsed.qwen3vlTopP ?? defaults.qwen3vlTopP;
      const memoryPolicyVal = parsed.memoryPolicy ? { ...defaults.memoryPolicy, ...parsed.memoryPolicy } : defaults.memoryPolicy;
      const aiBackendsVal = Array.isArray(parsed.aiBackends) && parsed.aiBackends.length > 0 ? parsed.aiBackends : defaults.aiBackends;
      const promptReverseSettingsVal = parsed.promptReverseSettings ? { ...defaults.promptReverseSettings, ...parsed.promptReverseSettings } : defaults.promptReverseSettings;
      const promptReverseTemplatesVal = Array.isArray(parsed.promptReverseTemplates) ? parsed.promptReverseTemplates : defaults.promptReverseTemplates;
      this.cache = {
        ...defaults,
        ...parsed,
        enableTextColorPalette: enableVal,
        enable_text_color_palette: enableVal,
        textDetectionProvider: providerVal,
        text_detection_provider: providerVal,
        textDetectionTimeoutMs: timeoutVal,
        text_detection_timeout_ms: timeoutVal,
        maxTextBoxes: maxVal,
        max_text_boxes: maxVal,
        minTextBoxConfidence: minVal,
        min_text_box_confidence: minVal,
        hasUserSelectedOcr: parsed.hasUserSelectedOcr ?? false,
        // R3.0
        enableTextColorAnalysis: enableAnalysisVal,
        textBoxProvider: boxProviderVal,
        ocrTimeoutMs: ocrTimeoutVal,
        maxTextBoxesPerImage: maxBoxesImageVal,
        autoInstallAllowed: autoInstallAllowedVal,
        lastOcrEnvCheckAt: lastCheckAtVal,
        cachedOcrEnvStatus: cachedEnvVal,
        // Qwen3-VL
        modelRootDir: modelRootDirVal,
        selectedPromptModelId: selectedPromptModelIdVal,
        selectedPromptModelPath: selectedPromptModelPathVal,
        qwen3vlMaxNewTokens: qwen3vlMaxNewTokensVal,
        qwen3vlMaxImageSize: qwen3vlMaxImageSizeVal,
        qwen3vlTemperature: qwen3vlTemperatureVal,
        qwen3vlTopP: qwen3vlTopPVal,
        aiBackends: aiBackendsVal,
        promptReverseSettings: promptReverseSettingsVal,
        promptReverseTemplates: promptReverseTemplatesVal,
        memoryPolicy: memoryPolicyVal
      };
      return this.cache;
    } catch (e) {
      console.error("[SettingsService] Failed to read settings.json, returning defaults:", e);
      return defaults;
    }
  }
  /**
   * Save settings to disk and update cache.
   */
  saveSettings(settings) {
    const current = this.getSettings();
    const enableVal = settings.enableTextColorPalette ?? settings.enable_text_color_palette ?? current.enableTextColorPalette;
    const providerVal = settings.textDetectionProvider ?? settings.text_detection_provider ?? current.textDetectionProvider;
    const timeoutVal = settings.textDetectionTimeoutMs ?? settings.text_detection_timeout_ms ?? current.textDetectionTimeoutMs;
    const maxVal = settings.maxTextBoxes ?? settings.max_text_boxes ?? current.maxTextBoxes;
    const minVal = settings.minTextBoxConfidence ?? settings.min_text_box_confidence ?? current.minTextBoxConfidence;
    const enableAnalysisVal = settings.enableTextColorAnalysis ?? current.enableTextColorAnalysis;
    const boxProviderVal = settings.textBoxProvider ?? current.textBoxProvider;
    const ocrTimeoutVal = settings.ocrTimeoutMs ?? current.ocrTimeoutMs;
    const maxBoxesImageVal = settings.maxTextBoxesPerImage ?? current.maxTextBoxesPerImage;
    const autoInstallAllowedVal = settings.autoInstallAllowed ?? current.autoInstallAllowed;
    const lastCheckAtVal = settings.lastOcrEnvCheckAt ?? current.lastOcrEnvCheckAt;
    const cachedEnvVal = settings.cachedOcrEnvStatus ?? current.cachedOcrEnvStatus;
    const modelRootDirVal = settings.modelRootDir ?? current.modelRootDir;
    const selectedPromptModelIdVal = settings.selectedPromptModelId ?? current.selectedPromptModelId;
    const selectedPromptModelPathVal = settings.selectedPromptModelPath ?? (settings.modelRootDir ? path.join(modelRootDirVal ?? current.modelRootDir ?? path.join(homedir(), "DesignAssetManager", "AIModels"), "qwen", selectedPromptModelIdVal ?? "qwen3-vl-4b-instruct") : current.selectedPromptModelPath);
    const qwen3vlMaxNewTokensVal = settings.qwen3vlMaxNewTokens ?? current.qwen3vlMaxNewTokens;
    const qwen3vlMaxImageSizeVal = settings.qwen3vlMaxImageSize ?? current.qwen3vlMaxImageSize;
    const qwen3vlTemperatureVal = settings.qwen3vlTemperature ?? current.qwen3vlTemperature;
    const qwen3vlTopPVal = settings.qwen3vlTopP ?? current.qwen3vlTopP;
    const aiBackendsVal = settings.aiBackends ?? current.aiBackends ?? [createDefaultLlamaBackendConfig()];
    const promptReverseSettingsVal = settings.promptReverseSettings ? { ...current.promptReverseSettings ?? createDefaultPromptReverseSettings(), ...settings.promptReverseSettings } : current.promptReverseSettings ?? createDefaultPromptReverseSettings();
    const promptReverseTemplatesVal = settings.promptReverseTemplates ?? current.promptReverseTemplates ?? [];
    const memoryPolicyVal = settings.memoryPolicy ? { ...current.memoryPolicy, ...settings.memoryPolicy } : current.memoryPolicy;
    const updated = {
      ...current,
      ...settings,
      enableTextColorPalette: enableVal,
      enable_text_color_palette: enableVal,
      textDetectionProvider: providerVal,
      text_detection_provider: providerVal,
      textDetectionTimeoutMs: timeoutVal,
      text_detection_timeout_ms: timeoutVal,
      maxTextBoxes: maxVal,
      max_text_boxes: maxVal,
      minTextBoxConfidence: minVal,
      min_text_box_confidence: minVal,
      hasUserSelectedOcr: true,
      // Explicitly mark that the configuration has been manually selected and saved
      // R3.0
      enableTextColorAnalysis: enableAnalysisVal,
      textBoxProvider: boxProviderVal,
      ocrTimeoutMs: ocrTimeoutVal,
      maxTextBoxesPerImage: maxBoxesImageVal,
      autoInstallAllowed: autoInstallAllowedVal,
      lastOcrEnvCheckAt: lastCheckAtVal,
      cachedOcrEnvStatus: cachedEnvVal,
      // Qwen3-VL
      modelRootDir: modelRootDirVal,
      selectedPromptModelId: selectedPromptModelIdVal,
      selectedPromptModelPath: selectedPromptModelPathVal,
      qwen3vlMaxNewTokens: qwen3vlMaxNewTokensVal,
      qwen3vlMaxImageSize: qwen3vlMaxImageSizeVal,
      qwen3vlTemperature: qwen3vlTemperatureVal,
      qwen3vlTopP: qwen3vlTopPVal,
      aiBackends: aiBackendsVal,
      promptReverseSettings: promptReverseSettingsVal,
      promptReverseTemplates: promptReverseTemplatesVal,
      memoryPolicy: memoryPolicyVal
    };
    this.cache = updated;
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), "utf8");
      console.log("[SettingsService] Settings successfully saved to:", this.configPath);
    } catch (e) {
      console.error("[SettingsService] Failed to write settings.json:", e);
    }
    return updated;
  }
}
const settings_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  SettingsService,
  createDefaultLlamaBackendConfig,
  createDefaultPromptReverseSettings
}, Symbol.toStringTag, { value: "Module" }));
const CHANNEL_SETTINGS_LOAD = "settings:load";
const CHANNEL_SETTINGS_SAVE = "settings:save";
function registerSettingsIpc() {
  const service = SettingsService.getInstance();
  ipcMain.handle(CHANNEL_SETTINGS_LOAD, async () => {
    try {
      return service.getSettings();
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_LOAD} error:`, err);
      throw err;
    }
  });
  ipcMain.handle(CHANNEL_SETTINGS_SAVE, async (_, newSettings) => {
    try {
      return service.saveSettings(newSettings);
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_SAVE} error:`, err);
      throw err;
    }
  });
  ipcMain.handle("settings:select-folder", async (_, request) => {
    const result = await dialog.showOpenDialog({
      defaultPath: request?.defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: "" };
    }
    return { canceled: false, path: result.filePaths[0] };
  });
}
function findScriptPath() {
  const starts = [process.cwd()];
  try {
    const moduleDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(new URL(import.meta.url).pathname);
    starts.push(moduleDir);
  } catch {
  }
  for (const start of starts) {
    let current = path.resolve(start);
    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.resolve(current, "scripts", "check-text-ocr-providers.py");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.resolve(process.cwd(), "scripts", "check-text-ocr-providers.py");
}
function resolvePythonExecutable$1() {
  const envs = [
    process.env.DESIGN_ASSET_MANAGER_PYTHON,
    process.env.TEXT_OCR_PYTHON,
    process.env.PYTHON
  ];
  for (const env of envs) {
    if (env && env.trim()) {
      return env.trim();
    }
  }
  return "python";
}
class OcrHealthcheckService {
  timeoutMs = 15e3;
  async checkTextOcrProviders() {
    const scriptPath = findScriptPath();
    if (!fs.existsSync(scriptPath)) {
      return {
        ok: false,
        status: "HEALTHCHECK_SCRIPT_NOT_FOUND",
        error: `Healthcheck script check-text-ocr-providers.py not found at resolved path: ${scriptPath}`
      };
    }
    const pythonExe = resolvePythonExecutable$1();
    const args = [scriptPath];
    console.log(`[OcrHealthcheckService] Spawning python command: ${pythonExe} ${args.join(" ")}`);
    return new Promise((resolve) => {
      let stdoutData = "";
      let stderrData = "";
      let killed = false;
      let child;
      try {
        child = spawn(pythonExe, args);
      } catch (err) {
        console.warn(`[OcrHealthcheckService] Failed to spawn python process synchronously: ${String(err)}`);
        resolve({
          ok: false,
          status: "HEALTHCHECK_PROCESS_ERROR",
          error: `Synchronous spawn failure: ${String(err)}`
        });
        return;
      }
      const timeoutId = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch (e) {
        }
        console.warn(`[OcrHealthcheckService] OCR healthcheck execution timed out after ${this.timeoutMs}ms. Process killed.`);
        resolve({
          ok: false,
          status: "HEALTHCHECK_TIMEOUT",
          error: `Execution timed out after ${this.timeoutMs}ms`
        });
      }, this.timeoutMs);
      child.stdout?.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderrData += chunk.toString();
      });
      child.on("error", (err) => {
        if (killed) return;
        clearTimeout(timeoutId);
        console.warn(`[OcrHealthcheckService] Failed to spawn child process asynchronously: ${String(err)}`);
        resolve({
          ok: false,
          status: "HEALTHCHECK_PROCESS_ERROR",
          error: `Asynchronous process error: ${String(err)}`
        });
      });
      child.on("close", (code) => {
        if (killed) return;
        clearTimeout(timeoutId);
        const trimmedStdout = stdoutData.trim();
        if (!trimmedStdout) {
          console.warn(`[OcrHealthcheckService] Healthcheck script returned empty stdout. Exit code: ${code}. stderr: ${stderrData}`);
          resolve({
            ok: false,
            status: "INVALID_HEALTHCHECK_JSON",
            error: `Script returned empty stdout. Exit code: ${code}. stderr: ${stderrData.trim() || "none"}`
          });
          return;
        }
        try {
          const parsed = JSON.parse(trimmedStdout);
          resolve({
            ok: parsed.ok ?? true,
            status: parsed.status ?? "HEALTHCHECK_COMPLETE",
            schemaVersion: parsed.schemaVersion,
            python: parsed.python,
            providers: parsed.providers,
            runner: parsed.runner,
            recommendation: parsed.recommendation
          });
        } catch (parseErr) {
          console.warn(`[OcrHealthcheckService] Failed to parse healthcheck stdout as JSON: ${String(parseErr)}. Raw output: ${trimmedStdout}`);
          resolve({
            ok: false,
            status: "INVALID_HEALTHCHECK_JSON",
            error: `JSON parse error: ${String(parseErr)}. Raw output: ${trimmedStdout}`
          });
        }
      });
    });
  }
}
const CHANNEL_OCR_HEALTHCHECK_RUN = "ocr-healthcheck:run";
function registerOcrHealthcheckIpc() {
  const service = new OcrHealthcheckService();
  ipcMain.handle(CHANNEL_OCR_HEALTHCHECK_RUN, async () => {
    try {
      console.log(`[IPC] Received OCR healthcheck invoke request: ${CHANNEL_OCR_HEALTHCHECK_RUN}`);
      return await service.checkTextOcrProviders();
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_HEALTHCHECK_RUN} error:`, err);
      return {
        ok: false,
        status: "OCR_HEALTHCHECK_IPC_ERROR",
        error: String(err),
        warnings: []
      };
    }
  });
}
const DEFAULT_LOG_EXTENSION = ".log";
function resolveLogPaths(managedPaths) {
  const logsDir = path.resolve(managedPaths.logsDir);
  return {
    logsDir,
    debugDir: ensureSafeJoin(logsDir, "debug"),
    doctorLogsDir: ensureSafeJoin(logsDir, "doctor"),
    aiRuntimeLogsDir: ensureSafeJoin(logsDir, "ai-runtime"),
    bootstrapLogsDir: ensureSafeJoin(logsDir, "bootstrap"),
    settingsMigrationLogsDir: ensureSafeJoin(logsDir, "settings-migration"),
    legacyLogsDir: ensureSafeJoin(logsDir, "legacy")
  };
}
function resolveDebugLogPath(debugId, options = {}) {
  const managedPaths = requireManagedPaths(options);
  const logPaths = resolveLogPaths(managedPaths);
  const fileName = options.fileName ?? `${sanitizeLogFileName(debugId)}${normalizeExtension(options.extension)}`;
  const target = ensureSafeJoin(logPaths.debugDir, ...sanitizeRelativePath(fileName));
  assertSafeLogPath(target, managedPaths);
  return target;
}
function sanitizeLogFileName(input) {
  const sanitized = sanitizeFilename(input).replace(/[/\\]+/g, "_");
  return sanitized || "log";
}
function assertSafeLogPath(targetPath, managedPaths) {
  const logPaths = resolveLogPaths(managedPaths);
  const resolvedTarget = path.resolve(targetPath);
  assertInsideManagedRoot(logPaths.logsDir, resolvedTarget);
  return {
    path: resolvedTarget,
    logsDir: logPaths.logsDir,
    isInsideLogsDir: true
  };
}
function requireManagedPaths(options) {
  if (!options.managedPaths) {
    throw new Error("managedPaths is required to resolve managed log paths.");
  }
  return options.managedPaths;
}
function normalizeExtension(extension) {
  if (!extension) return DEFAULT_LOG_EXTENSION;
  const sanitized = sanitizeLogFileName(extension);
  return sanitized.startsWith(".") ? sanitized : `.${sanitized}`;
}
function sanitizeRelativePath(input) {
  return input.split(/[/\\]+/).map((segment) => sanitizeLogFileName(segment)).filter((segment) => segment && segment !== "." && segment !== "..");
}
const CHANNEL_OCR_CHECK_ENVIRONMENT = "ocr:check-environment";
const CHANNEL_OCR_INSTALL_EASYOCR = "ocr:install-easyocr";
const CHANNEL_OCR_CANCEL_INSTALL = "ocr:cancel-install";
const CHANNEL_OCR_GET_INSTALL_LOG = "ocr:get-install-log";
const CHANNEL_OCR_INSTALL_LOG_UPDATE = "ocr:install-log";
function getModuleDir() {
  try {
    if (typeof __dirname !== "undefined") {
      return __dirname;
    }
  } catch {
  }
  return null;
}
function pushCandidate(candidates, candidate) {
  if (!candidate || !candidate.trim()) return;
  const normalized = path.resolve(candidate);
  if (!candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}
function pushAiServiceNear(candidates, start) {
  if (!start || !start.trim()) return;
  let current = path.resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    pushCandidate(candidates, path.join(current, "ai-service"));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}
function resolveAiServiceRoot(runtime = {}) {
  const existsSync2 = runtime.existsSync ?? fs.existsSync;
  const candidates = [];
  pushCandidate(candidates, runtime.envAiServiceDir ?? process.env.DESIGN_ASSET_MANAGER_AI_SERVICE_DIR);
  const resourcesPath = runtime.resourcesPath ?? process.resourcesPath;
  const isPackaged = runtime.isPackaged ?? Boolean(process.versions.electron && !process.defaultApp);
  if (isPackaged && resourcesPath) {
    pushCandidate(candidates, path.join(resourcesPath, "ai-service"));
  }
  pushAiServiceNear(candidates, runtime.cwd ?? process.cwd());
  pushAiServiceNear(candidates, runtime.dirname ?? getModuleDir());
  const existing = candidates.find((candidate) => existsSync2(candidate));
  if (existing) {
    return existing;
  }
  if (isPackaged && resourcesPath) {
    return path.join(resourcesPath, "ai-service");
  }
  return path.join(runtime.cwd ?? process.cwd(), "ai-service");
}
function resolveAiServicePath(segments, runtime = {}) {
  return path.join(resolveAiServiceRoot(runtime), ...segments);
}
const aiServicePaths = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  resolveAiServicePath,
  resolveAiServiceRoot
}, Symbol.toStringTag, { value: "Module" }));
function redactDebugMessage(msg) {
  const homeLikeValues = [
    process.env.USERPROFILE,
    process.env.HOME,
    process.env.HOMEPATH
  ].filter((value) => Boolean(value && value.trim()));
  return homeLikeValues.reduce((current, value) => {
    return current.split(value).join("<user-home>");
  }, msg);
}
function writeDebugLog(msg) {
  try {
    const managedPaths = resolveManagedPaths();
    const logPath = resolveDebugLogPath("ocr-dependency", {
      managedPaths,
      fileName: "ocr-dependency.log"
    });
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    fs.appendFileSync(logPath, `[${timestamp2}] ${redactDebugMessage(msg)}
`, "utf8");
  } catch (err) {
  }
}
function findEnvCheckScriptPath() {
  return resolveAiServicePath(["tools", "check_ocr_env.py"]);
}
function searchWindowsPythonPaths() {
  if (process.platform !== "win32") return null;
  const userProfile = process.env.USERPROFILE || process.env.HOMEPATH || "";
  if (!userProfile) return null;
  writeDebugLog("[resolvePythonExecutable] Searching in common Windows programs Python directories...");
  const localProgramsPythonDir = path.join(userProfile, "AppData", "Local", "Programs", "Python");
  if (fs.existsSync(localProgramsPythonDir)) {
    try {
      const dirs = fs.readdirSync(localProgramsPythonDir);
      dirs.sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" }));
      for (const dir of dirs) {
        if (dir.toLowerCase().startsWith("python")) {
          const exePath = path.join(localProgramsPythonDir, dir, "python.exe");
          if (fs.existsSync(exePath)) {
            writeDebugLog(`[resolvePythonExecutable] Found Python in User Programs: ${exePath}`);
            return exePath;
          }
        }
      }
    } catch (err) {
      writeDebugLog(`[resolvePythonExecutable] Error reading local programs Python dir: ${err.message}`);
    }
  }
  const programFilesPythonDir = "C:\\Program Files\\Python";
  if (fs.existsSync(programFilesPythonDir)) {
    try {
      const dirs = fs.readdirSync(programFilesPythonDir);
      dirs.sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" }));
      for (const dir of dirs) {
        if (dir.toLowerCase().startsWith("python")) {
          const exePath = path.join(programFilesPythonDir, dir, "python.exe");
          if (fs.existsSync(exePath)) {
            writeDebugLog(`[resolvePythonExecutable] Found Python in Program Files: ${exePath}`);
            return exePath;
          }
        }
      }
    } catch (err) {
      writeDebugLog(`[resolvePythonExecutable] Error reading Program Files Python dir: ${err.message}`);
    }
  }
  try {
    const rootDirs = fs.readdirSync("C:\\");
    const pyDirs = rootDirs.filter((d) => d.toLowerCase().startsWith("python"));
    pyDirs.sort((a, b) => b.localeCompare(a, void 0, { numeric: true, sensitivity: "base" }));
    for (const dir of pyDirs) {
      const exePath = path.join("C:\\", dir, "python.exe");
      if (fs.existsSync(exePath)) {
        writeDebugLog(`[resolvePythonExecutable] Found Python in C:\\ root: ${exePath}`);
        return exePath;
      }
    }
  } catch (err) {
    writeDebugLog(`[resolvePythonExecutable] Error reading C:\\ root dir: ${err.message}`);
  }
  return null;
}
function resolvePythonExecutable() {
  writeDebugLog("[resolvePythonExecutable] Resolving Python executable...");
  const envs = [
    process.env.DESIGN_ASSET_MANAGER_PYTHON,
    process.env.TEXT_OCR_PYTHON,
    process.env.PYTHON
  ];
  for (const [idx, env] of envs.entries()) {
    if (env && env.trim()) {
      writeDebugLog(`[resolvePythonExecutable] Found env key index ${idx}: ${env}`);
      return env.trim();
    }
  }
  if (process.platform === "win32") {
    try {
      writeDebugLog('[resolvePythonExecutable] platform is win32, running execSync("where python")...');
      const output = execSync("where python", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      writeDebugLog(`[resolvePythonExecutable] "where python" raw output:
${output}`);
      const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.toLowerCase().endsWith("python.exe") && !line.toLowerCase().includes("microsoft\\windowsapps")) {
          writeDebugLog(`[resolvePythonExecutable] WindowsApps bypass resolved: ${line}`);
          return line;
        }
      }
    } catch (e) {
      writeDebugLog(`[resolvePythonExecutable] execSync("where python") failed: ${e?.message || String(e)}`);
    }
    const searchedPath = searchWindowsPythonPaths();
    if (searchedPath) {
      return searchedPath;
    }
  }
  writeDebugLog('[resolvePythonExecutable] Falling back to default "python"');
  return "python";
}
class OcrDependencyService {
  static instance;
  installProcess = null;
  installLogs = "";
  checkTimeoutMs = 15e3;
  constructor() {
  }
  static getInstance() {
    if (!OcrDependencyService.instance) {
      OcrDependencyService.instance = new OcrDependencyService();
    }
    return OcrDependencyService.instance;
  }
  /**
   * Run the check environment Python tool.
   */
  async checkEnvironment() {
    const scriptPath = findEnvCheckScriptPath();
    const pythonExe = resolvePythonExecutable();
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getSettings();
    const defaultPayload = () => ({
      python: {
        available: false,
        version: null,
        path: null
      },
      providers: {
        easyocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy` },
        rapidocr: { installed: false, version: null, available: false },
        paddleocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy` }
      },
      selectedProvider: settings.textBoxProvider ?? "easyocr",
      selectedProviderAvailable: false,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!fs.existsSync(scriptPath)) {
      console.warn(`[OcrDependencyService] Environment check script not found at: ${scriptPath}`);
      return defaultPayload();
    }
    return new Promise((resolve) => {
      let stdoutData = "";
      let killed = false;
      let child;
      try {
        child = spawn(pythonExe, [scriptPath], { shell: false });
      } catch (err) {
        console.warn(`[OcrDependencyService] Failed to spawn python check tool synchronously:`, err);
        resolve(defaultPayload());
        return;
      }
      const timeoutId = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch {
        }
        resolve(defaultPayload());
      }, this.checkTimeoutMs);
      child.stdout?.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });
      child.on("error", () => {
        if (killed) return;
        clearTimeout(timeoutId);
        resolve(defaultPayload());
      });
      child.on("close", (code) => {
        if (killed) return;
        clearTimeout(timeoutId);
        const trimmed = stdoutData.trim();
        if (code !== 0 || !trimmed) {
          resolve(defaultPayload());
          return;
        }
        try {
          const firstBrace = trimmed.indexOf("{");
          const lastBrace = trimmed.lastIndexOf("}");
          if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("No JSON payload found in stdout output.");
          }
          const jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          const isEasyAvailable = parsed.easyocr?.installed === true;
          const isRapidAvailable = parsed.rapidocr?.installed === true;
          const isPaddleAvailable = parsed.paddleocr?.installed === true;
          const pythonVersion = parsed.python?.version ?? "3.11.9";
          const realPythonPath = parsed.python?.executable ?? pythonExe;
          const selectedProvider = settings.textBoxProvider ?? "easyocr";
          let selectedProviderAvailable = false;
          if (selectedProvider === "easyocr") selectedProviderAvailable = isEasyAvailable;
          else if (selectedProvider === "rapidocr") selectedProviderAvailable = isRapidAvailable;
          else if (selectedProvider === "paddleocr") selectedProviderAvailable = isPaddleAvailable;
          else if (selectedProvider === "mock") selectedProviderAvailable = true;
          const payload = {
            python: {
              available: true,
              version: pythonVersion,
              path: realPythonPath
            },
            providers: {
              easyocr: {
                installed: isEasyAvailable,
                version: parsed.easyocr?.version ?? null,
                available: isEasyAvailable,
                installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy`
              },
              rapidocr: {
                installed: isRapidAvailable,
                version: parsed.rapidocr?.version ?? null,
                available: isRapidAvailable
              },
              paddleocr: {
                installed: isPaddleAvailable,
                version: parsed.paddleocr?.version ?? null,
                available: isPaddleAvailable,
                installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy`
              }
            },
            selectedProvider,
            selectedProviderAvailable,
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          settingsService.saveSettings({
            lastOcrEnvCheckAt: payload.checkedAt,
            cachedOcrEnvStatus: payload
          });
          resolve(payload);
        } catch (err) {
          console.warn(`[OcrDependencyService] Failed to parse check environment JSON output:`, err);
          resolve(defaultPayload());
        }
      });
    });
  }
  /**
   * Retrieves the cached environment check payload.
   */
  getCachedOcrEnvironment() {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getSettings();
    if (settings.cachedOcrEnvStatus) {
      return settings.cachedOcrEnvStatus;
    }
    const pythonExe = resolvePythonExecutable();
    return {
      python: {
        available: false,
        version: null,
        path: null
      },
      providers: {
        easyocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy` },
        rapidocr: { installed: false, version: null, available: false },
        paddleocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy` }
      },
      selectedProvider: settings.textBoxProvider ?? "easyocr",
      selectedProviderAvailable: false,
      checkedAt: ""
    };
  }
  /**
   * Spawns an asynchronous python pip installer to install easyocr and other core ocr dependencies.
   * Feeds log output directly to the active web contents and buffers it.
   */
  async installEasyOcr(sender) {
    if (this.installProcess) {
      console.warn(`[OcrDependencyService] Installation already in progress.`);
      return;
    }
    this.installLogs = "";
    const pythonExe = resolvePythonExecutable();
    const args = ["-m", "pip", "install", "easyocr", "opencv-python", "numpy"];
    this.logAndSend(sender, `[SYSTEM] Initiating installation: ${pythonExe} ${args.join(" ")}
`);
    try {
      this.installProcess = spawn(pythonExe, args, { shell: false });
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn pip installer synchronously: ${String(err)}
`);
      this.installProcess = null;
      return;
    }
    this.installProcess.stdout?.on("data", (chunk) => {
      this.logAndSend(sender, chunk.toString());
    });
    this.installProcess.stderr?.on("data", (chunk) => {
      this.logAndSend(sender, chunk.toString());
    });
    this.installProcess.on("error", (err) => {
      this.logAndSend(sender, `
[SYSTEM ERROR] Spawn error occurred: ${String(err)}
`);
    });
    this.installProcess.on("close", (code) => {
      this.installProcess = null;
      if (code === 0) {
        this.logAndSend(sender, `
[SYSTEM] Installation finished successfully (Exit Code: 0).
`);
        this.checkEnvironment().then((newEnv) => {
          this.logAndSend(sender, `[SYSTEM] Auto environment check finished: ${newEnv.providers.easyocr.installed ? "EasyOCR is now INSTALLED" : "EasyOCR is still MISSING"}
`);
        });
      } else {
        this.logAndSend(sender, `
[SYSTEM WARNING] Installation finished with non-zero exit code: ${code}.
`);
      }
    });
  }
  /**
   * Spawns an asynchronous python pip installer to install compressed-tensors.
   * Feeds log output directly to the active web contents and buffers it.
   */
  async installCompressedTensors(sender) {
    if (this.installProcess) {
      console.warn(`[OcrDependencyService] Installation already in progress.`);
      return;
    }
    this.installLogs = "";
    const pythonExe = resolvePythonExecutable();
    const args = ["-m", "pip", "install", "compressed-tensors"];
    this.logAndSend(sender, `[SYSTEM] Initiating installation: ${pythonExe} ${args.join(" ")}
`);
    try {
      this.installProcess = spawn(pythonExe, args, { shell: false });
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn pip installer synchronously: ${String(err)}
`);
      this.installProcess = null;
      return;
    }
    this.installProcess.stdout?.on("data", (chunk) => {
      this.logAndSend(sender, chunk.toString());
    });
    this.installProcess.stderr?.on("data", (chunk) => {
      this.logAndSend(sender, chunk.toString());
    });
    this.installProcess.on("error", (err) => {
      this.logAndSend(sender, `
[SYSTEM ERROR] Spawn error occurred: ${String(err)}
`);
    });
    this.installProcess.on("close", (code) => {
      this.installProcess = null;
      if (code === 0) {
        this.logAndSend(sender, `
[SYSTEM] Installation finished successfully (Exit Code: 0).
`);
      } else {
        this.logAndSend(sender, `
[SYSTEM WARNING] Installation finished with non-zero exit code: ${code}.
`);
      }
    });
  }
  /**
   * Install macOS AI runtime dependencies (torch, transformers, onnxruntime, etc.)
   * through the Python install_macos_ai_deps.py script.
   */
  async installMacOSAiDeps(sender) {
    if (this.installProcess) {
      console.warn("[OcrDependencyService] macOS AI dep installation already in progress.");
      return;
    }
    this.installLogs = "";
    const pythonExe = resolvePythonExecutable();
    const installScript = resolveAiServicePath(["tools", "install_macos_ai_deps.py"]);
    this.logAndSend(sender, `[SYSTEM] Starting macOS AI dependency installation via ${installScript}
`);
    try {
      this.installProcess = spawn(pythonExe, [installScript], { shell: false });
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn macOS AI dep installer: ${String(err)}
`);
      this.installProcess = null;
      return;
    }
    this.installProcess.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      for (const line of text.split("\n").filter(Boolean)) {
        try {
          const evt = JSON.parse(line.trim());
          this.logAndSend(sender, `[${evt.type}] ${evt.message}
`);
        } catch {
          this.logAndSend(sender, text);
        }
      }
    });
    this.installProcess.stderr?.on("data", (chunk) => {
      this.logAndSend(sender, chunk.toString());
    });
    this.installProcess.on("error", (err) => {
      this.logAndSend(sender, `
[SYSTEM ERROR] Spawn error: ${String(err)}
`);
    });
    this.installProcess.on("close", (code) => {
      this.installProcess = null;
      if (code === 0) {
        this.logAndSend(sender, "\n[SYSTEM] macOS AI dependencies installed successfully.\n");
      } else {
        this.logAndSend(sender, `
[SYSTEM WARNING] macOS AI dep install exited with code: ${code}.
`);
      }
    });
  }
  /**
   * Cancel the currently executing installer process.
   */
  cancelInstall() {
    if (!this.installProcess) {
      console.warn(`[OcrDependencyService] No active installation to cancel.`);
      return;
    }
    try {
      this.installProcess.kill("SIGKILL");
      this.installLogs += `
[SYSTEM] Installation cancelled by user.
`;
    } catch (err) {
      console.warn(`[OcrDependencyService] Failed to kill installation process:`, err);
    }
    this.installProcess = null;
  }
  /**
   * Retrieve the accumulated logs.
   */
  getInstallLog() {
    return this.installLogs;
  }
  logAndSend(sender, message) {
    this.installLogs += message;
    if (!sender.isDestroyed()) {
      sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, message);
    }
  }
}
const ocrDependency_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  OcrDependencyService,
  resolvePythonExecutable
}, Symbol.toStringTag, { value: "Module" }));
function registerOcrIpc() {
  const service = OcrDependencyService.getInstance();
  ipcMain.handle(CHANNEL_OCR_CHECK_ENVIRONMENT, async () => {
    try {
      return await service.checkEnvironment();
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_CHECK_ENVIRONMENT} failed:`, err);
      throw err;
    }
  });
  ipcMain.handle(CHANNEL_OCR_INSTALL_EASYOCR, async (event) => {
    try {
      await service.installEasyOcr(event.sender);
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_INSTALL_EASYOCR} failed:`, err);
      throw err;
    }
  });
  ipcMain.handle("ocr:install-compressed-tensors", async (event) => {
    try {
      await service.installCompressedTensors(event.sender);
    } catch (err) {
      console.error(`[IPC] ocr:install-compressed-tensors failed:`, err);
      throw err;
    }
  });
  ipcMain.handle(CHANNEL_OCR_CANCEL_INSTALL, async () => {
    try {
      service.cancelInstall();
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_CANCEL_INSTALL} failed:`, err);
      throw err;
    }
  });
  ipcMain.handle(CHANNEL_OCR_GET_INSTALL_LOG, async () => {
    try {
      return service.getInstallLog();
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_OCR_GET_INSTALL_LOG} failed:`, err);
      throw err;
    }
  });
}
class AiGpuMonitorService {
  pythonExe;
  scriptPath;
  constructor() {
    this.pythonExe = resolvePythonExecutable();
    this.scriptPath = resolveAiServicePath(["tools", "gpu_memory_probe.py"]);
  }
  async getGpuStatus() {
    if (!fs.existsSync(this.scriptPath)) {
      return {
        success: false,
        cudaAvailable: false,
        gpuName: null,
        totalVramGB: 0,
        freeVramGB: 0,
        usedVramGB: 0,
        usagePercent: 0,
        error: "gpu_memory_probe.py script not found"
      };
    }
    return new Promise((resolve) => {
      let stdout = "";
      let killed = false;
      const child = spawn(this.pythonExe, [this.scriptPath], { shell: false });
      const timeout = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch {
        }
        resolve({
          success: false,
          cudaAvailable: false,
          gpuName: null,
          totalVramGB: 0,
          freeVramGB: 0,
          usedVramGB: 0,
          usagePercent: 0,
          error: "GPU probe timeout"
        });
      }, 5e3);
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.on("error", (err) => {
        if (killed) return;
        clearTimeout(timeout);
        resolve({
          success: false,
          cudaAvailable: false,
          gpuName: null,
          totalVramGB: 0,
          freeVramGB: 0,
          usedVramGB: 0,
          usagePercent: 0,
          error: String(err)
        });
      });
      child.on("close", (code) => {
        if (killed) return;
        clearTimeout(timeout);
        if (code !== 0) {
          resolve({
            success: false,
            cudaAvailable: false,
            gpuName: null,
            totalVramGB: 0,
            freeVramGB: 0,
            usedVramGB: 0,
            usagePercent: 0,
            error: `GPU probe script exited with code ${code}`
          });
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e) {
          resolve({
            success: false,
            cudaAvailable: false,
            gpuName: null,
            totalVramGB: 0,
            freeVramGB: 0,
            usedVramGB: 0,
            usagePercent: 0,
            error: `Failed to parse GPU probe output JSON: ${String(e)}`
          });
        }
      });
    });
  }
}
class AiMemoryGuardService {
  constructor(gpuMonitor) {
    this.gpuMonitor = gpuMonitor;
    this.pythonExe = resolvePythonExecutable();
    this.clearScriptPath = resolveAiServicePath(["tools", "clear_gpu_memory.py"]);
  }
  pythonExe;
  clearScriptPath;
  async clearGpuMemory(reason) {
    console.log(`[AiMemoryGuard] Executing GPU VRAM clear (Reason: ${reason})`);
    if (!fs.existsSync(this.clearScriptPath)) {
      return {
        success: false,
        before: null,
        after: null,
        error: "clear_gpu_memory.py script not found"
      };
    }
    return new Promise((resolve) => {
      let stdout = "";
      let killed = false;
      const child = spawn(this.pythonExe, [this.clearScriptPath], { shell: false });
      const timeout = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch {
        }
        resolve({
          success: false,
          before: null,
          after: null,
          error: "GPU VRAM clear timeout"
        });
      }, 8e3);
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.on("error", (err) => {
        if (killed) return;
        clearTimeout(timeout);
        resolve({
          success: false,
          before: null,
          after: null,
          error: String(err)
        });
      });
      child.on("close", (code) => {
        if (killed) return;
        clearTimeout(timeout);
        if (code !== 0) {
          resolve({
            success: false,
            before: null,
            after: null,
            error: `GPU VRAM clear script exited with code ${code}`
          });
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e) {
          resolve({
            success: false,
            before: null,
            after: null,
            error: `Failed to parse GPU VRAM clear output JSON: ${String(e)}`
          });
        }
      });
    });
  }
}
const PROMPT_VLM_MODELS = [
  {
    id: "qwen3-vl-2b-instruct",
    provider: "qwen",
    repoId: "Qwen/Qwen3-VL-2B-Instruct",
    displayName: "Qwen3-VL 2B Instruct",
    task: "prompt_reverse",
    modelFamily: "qwen3-vl",
    modelSize: "2B",
    quantization: "none",
    runtime: "transformers",
    recommendedVramGB: 8,
    minVramGB: 6,
    estimatedMinFreeVramGB: 4,
    estimatedRecommendedFreeVramGB: 6,
    quality: "basic",
    sizeLevel: "small",
    stability: "stable",
    officialReleaseDate: "2025-09-22",
    description: "低显存设备可用，速度极快，反推细节与指令理解较弱。"
  },
  {
    id: "qwen3-vl-4b-instruct",
    provider: "qwen",
    repoId: "Qwen/Qwen3-VL-4B-Instruct",
    displayName: "Qwen3-VL 4B Instruct",
    task: "prompt_reverse",
    modelFamily: "qwen3-vl",
    modelSize: "4B",
    quantization: "none",
    runtime: "transformers",
    recommendedVramGB: 12,
    minVramGB: 10,
    estimatedMinFreeVramGB: 8,
    estimatedRecommendedFreeVramGB: 10,
    quality: "recommended",
    sizeLevel: "medium",
    stability: "stable",
    officialReleaseDate: "2025-10-14",
    description: "质量和显存占用较平衡，适合多数本地用户。推荐作为稳定版高级反推模型。"
  },
  {
    id: "qwen3-vl-8b-instruct",
    provider: "qwen",
    repoId: "Qwen/Qwen3-VL-8B-Instruct",
    displayName: "Qwen3-VL 8B Instruct 原版",
    task: "prompt_reverse",
    modelFamily: "qwen3-vl",
    modelSize: "8B",
    quantization: "none",
    runtime: "transformers",
    recommendedVramGB: 24,
    minVramGB: 16,
    estimatedMinFreeVramGB: 10,
    estimatedRecommendedFreeVramGB: 14,
    quality: "high",
    sizeLevel: "large",
    stability: "gpu-sensitive",
    officialReleaseDate: "2025-10-14",
    description: "高质量反推模型。16GB 显存可尝试，但建议关闭其他 GPU 任务，并启用显存保护。"
  }
];
function getModelRootDir() {
  try {
    const configured = SettingsService.getInstance().getSettings().modelRootDir;
    if (configured && configured.trim()) return configured;
  } catch {
  }
  const appData = app.getPath("userData");
  return path.join(appData, "AIModels");
}
function getModelLocalPath(model) {
  return path.join(getModelRootDir(), model.provider, model.id);
}
function getPythonModelCacheEnv() {
  const root = getModelRootDir();
  return {
    ...process.env,
    HF_HOME: path.join(root, "huggingface"),
    HUGGINGFACE_HUB_CACHE: path.join(root, "huggingface", "hub"),
    TRANSFORMERS_CACHE: path.join(root, "huggingface", "transformers"),
    TORCH_HOME: path.join(root, "torch"),
    EASYOCR_MODULE_PATH: path.join(root, "easyocr"),
    PADDLEOCR_HOME: path.join(root, "paddleocr"),
    XDG_CACHE_HOME: path.join(root, "cache"),
    DESIGN_ASSET_MANAGER_STRICT_REAL_AI: "1"
  };
}
const DATA_URL_REDACTION = "data:image/[redacted];base64,[redacted]";
const PROMPT_REVERSE_FIELDS = [
  "englishPrompt",
  "chineseDescription",
  "shortCaption",
  "styleTags",
  "subjectTags",
  "compositionTags",
  "colorTags",
  "usageTags",
  "negativePromptSuggestion"
];
function normalizeBaseUrl(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "");
}
function createError(code, message, detail, statusCode) {
  return { code, message, detail: sanitizeDetail(detail), statusCode };
}
function sanitizeDetail(detail) {
  if (!detail) return void 0;
  return detail.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]").replace(/"api[_-]?key"\s*:\s*"[^"]+"/gi, '"apiKey":"[redacted]"').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, DATA_URL_REDACTION);
}
function isAbortError(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
function validateConfig(config) {
  if (!config.baseUrl || !config.baseUrl.trim()) {
    return createError("BACKEND_INVALID_BASE_URL", "Base URL 不能为空。");
  }
  try {
    const url = new URL(config.baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return createError("BACKEND_INVALID_BASE_URL", "Base URL 只支持 http 或 https。");
    }
  } catch {
    return createError("BACKEND_INVALID_BASE_URL", "Base URL 格式无效。");
  }
  return null;
}
function getHeaders(config) {
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey && config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }
  return headers;
}
function extractModels(payload) {
  const candidates = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : Array.isArray(payload) ? payload : [];
  return candidates.map((item) => {
    if (typeof item === "string") return { id: item };
    const id = item?.id ?? item?.name ?? item?.model;
    return id ? { id: String(id), name: item?.name ? String(item.name) : void 0 } : null;
  }).filter(Boolean);
}
function extractChatContent(payload) {
  const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? payload?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part?.text ?? "").join("").trim();
  }
  return "";
}
function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
    }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
    }
  }
  return null;
}
function cleanJsonLikeText(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}
function isLikelyTruncatedPromptReverseText(text) {
  const cleaned = cleanJsonLikeText(text);
  if (!cleaned || !/^\s*\{/.test(cleaned)) return false;
  if (!cleaned.includes('"englishPrompt"') && !cleaned.includes('"chineseDescription"')) return false;
  return extractJsonObject(cleaned) === null;
}
function extractQuotedJsonField(text, field) {
  const nextFieldPattern = PROMPT_REVERSE_FIELDS.filter((item) => item !== field).join("|");
  const pattern = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"(?:${nextFieldPattern})"\\s*:|\\s*\\})`);
  const match = text.match(pattern);
  if (!match) return void 0;
  return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "	").trim();
}
function extractArrayJsonField(text, field) {
  const startMatch = text.match(new RegExp(`"${field}"\\s*:\\s*\\[`));
  if (!startMatch || startMatch.index === void 0) return [];
  const start = startMatch.index + startMatch[0].length;
  const rest = text.slice(start);
  const completeEnd = rest.indexOf("]");
  const nextFieldMatch = rest.match(/,\s*"(?:englishPrompt|chineseDescription|shortCaption|styleTags|subjectTags|compositionTags|colorTags|usageTags|negativePromptSuggestion)"\s*:/);
  const endCandidates = [completeEnd, nextFieldMatch?.index].filter((index) => typeof index === "number" && index >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : rest.length;
  const body = rest.slice(0, end);
  return Array.from(body.matchAll(/"((?:\\"|[^"])*)"/g)).map((match) => match[1].replace(/\\"/g, '"').trim()).filter(Boolean);
}
function extractPartialPromptReverseObject(text) {
  const cleaned = cleanJsonLikeText(text);
  const partial = {};
  const englishPrompt = extractQuotedJsonField(cleaned, "englishPrompt");
  if (englishPrompt) partial.englishPrompt = englishPrompt;
  const chineseDescription = extractQuotedJsonField(cleaned, "chineseDescription");
  if (chineseDescription) partial.chineseDescription = chineseDescription;
  const shortCaption = extractQuotedJsonField(cleaned, "shortCaption");
  if (shortCaption) partial.shortCaption = shortCaption;
  const negativePromptSuggestion = extractQuotedJsonField(cleaned, "negativePromptSuggestion");
  if (negativePromptSuggestion) partial.negativePromptSuggestion = negativePromptSuggestion;
  partial.styleTags = extractArrayJsonField(cleaned, "styleTags");
  partial.subjectTags = extractArrayJsonField(cleaned, "subjectTags");
  partial.compositionTags = extractArrayJsonField(cleaned, "compositionTags");
  partial.colorTags = extractArrayJsonField(cleaned, "colorTags");
  partial.usageTags = extractArrayJsonField(cleaned, "usageTags");
  const hasUsefulField = Boolean(
    partial.englishPrompt || partial.chineseDescription || partial.shortCaption || partial.styleTags.length || partial.subjectTags.length || partial.compositionTags.length || partial.colorTags.length || partial.usageTags.length
  );
  return hasUsefulField ? partial : null;
}
function normalizePromptReverseData(text, config, modelId) {
  const parsed = extractJsonObject(text);
  const parsedObject = typeof parsed === "string" ? extractJsonObject(parsed) : parsed;
  const partial = parsedObject && typeof parsedObject === "object" ? null : extractPartialPromptReverseObject(text);
  const src = parsedObject && typeof parsedObject === "object" ? parsedObject : partial ?? {};
  return {
    englishPrompt: String(src.englishPrompt ?? src.prompt ?? text),
    chineseDescription: String(src.chineseDescription ?? src.descriptionZh ?? ""),
    shortCaption: String(src.shortCaption ?? src.caption ?? ""),
    styleTags: Array.isArray(src.styleTags) ? src.styleTags.map(String) : [],
    subjectTags: Array.isArray(src.subjectTags) ? src.subjectTags.map(String) : [],
    compositionTags: Array.isArray(src.compositionTags) ? src.compositionTags.map(String) : [],
    colorTags: Array.isArray(src.colorTags) ? src.colorTags.map(String) : [],
    usageTags: Array.isArray(src.usageTags) ? src.usageTags.map(String) : [],
    negativePromptSuggestion: String(src.negativePromptSuggestion ?? ""),
    rawResponse: text,
    modelId,
    backendId: config.id,
    backendType: config.type
  };
}
async function encodeImageDataUrl(filePath, maxImageSize) {
  const resolvedPath = ImageMetadataService.resolvePath(filePath);
  await fs$1.access(resolvedPath);
  const buffer = await sharp(resolvedPath).rotate().resize({ width: maxImageSize, height: maxImageSize, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
class OpenAICompatibleProvider {
  async healthCheck(config) {
    const startedAt = Date.now();
    const list = await this.listModels(config);
    if (!list.success) {
      return {
        success: false,
        backendId: config.id,
        backendType: config.type,
        latencyMs: Date.now() - startedAt,
        error: list.error
      };
    }
    return {
      success: true,
      backendId: config.id,
      backendType: config.type,
      latencyMs: Date.now() - startedAt,
      models: list.models.map((model) => model.id)
    };
  }
  async listModels(config) {
    const validation = validateConfig(config);
    if (validation) {
      return { success: false, backendId: config.id, models: [], error: validation };
    }
    if (!config.enabled) {
      return {
        success: false,
        backendId: config.id,
        models: [],
        error: createError("BACKEND_DISABLED", "该后端尚未启用。")
      };
    }
    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/models`, {
        method: "GET",
        headers: getHeaders(config),
        signal: AbortSignal.timeout(config.timeoutMs)
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          backendId: config.id,
          models: [],
          error: createError("BACKEND_MODEL_LIST_FAILED", "拉取模型列表失败。", text, response.status)
        };
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        return {
          success: false,
          backendId: config.id,
          models: [],
          error: createError("BACKEND_RESPONSE_PARSE_FAILED", "模型列表响应不是合法 JSON。", text, response.status)
        };
      }
      return { success: true, backendId: config.id, models: extractModels(payload), rawResponse: payload };
    } catch (error) {
      return {
        success: false,
        backendId: config.id,
        models: [],
        error: isAbortError(error) ? createError("BACKEND_TIMEOUT", "连接后端超时。") : createError("BACKEND_CONNECTION_FAILED", "无法连接外部 AI 后端。", String(error?.message ?? error))
      };
    }
  }
  async chat(config, input) {
    const validation = validateConfig(config);
    if (validation) return { success: false, backendId: config.id, error: validation };
    if (!config.enabled) return { success: false, backendId: config.id, error: createError("BACKEND_DISABLED", "该后端尚未启用。") };
    const model = input.model || config.defaultModel;
    if (!model) {
      return { success: false, backendId: config.id, error: createError("BACKEND_MODEL_NOT_SELECTED", "尚未选择模型。") };
    }
    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: getHeaders(config),
        signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({
          model,
          messages: input.messages,
          temperature: input.temperature ?? 0.6,
          top_p: input.topP ?? 0.9,
          max_tokens: input.maxTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS
        })
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          success: false,
          backendId: config.id,
          modelId: model,
          error: createError("BACKEND_CHAT_FAILED", "文本模型调用失败。", text, response.status)
        };
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        return {
          success: false,
          backendId: config.id,
          modelId: model,
          error: createError("BACKEND_RESPONSE_PARSE_FAILED", "Chat 响应不是合法 JSON。", text, response.status)
        };
      }
      return {
        success: true,
        backendId: config.id,
        modelId: model,
        content: extractChatContent(payload),
        rawResponse: payload
      };
    } catch (error) {
      return {
        success: false,
        backendId: config.id,
        modelId: model,
        error: isAbortError(error) ? createError("BACKEND_TIMEOUT", "调用后端超时。") : createError("BACKEND_CONNECTION_FAILED", "无法连接外部 AI 后端。", String(error?.message ?? error))
      };
    }
  }
  async runPromptReverse(config, input) {
    const modelId = input.modelId || config.defaultModel || "";
    const startedAt = Date.now();
    if (!config.capabilities.vision) {
      return this.toPromptResult(config, modelId, startedAt, null, createError("BACKEND_VISION_NOT_SUPPORTED", "当前外部后端未声明支持图片输入。"));
    }
    if (!modelId) {
      return this.toPromptResult(config, modelId, startedAt, null, createError("BACKEND_MODEL_NOT_SELECTED", "尚未选择高级反推模型。"));
    }
    let imageUrl = "";
    try {
      imageUrl = await encodeImageDataUrl(input.filePath, input.maxImageSize ?? 1024);
    } catch (error) {
      return this.toPromptResult(config, modelId, startedAt, null, createError("IMAGE_ENCODE_FAILED", "图片编码失败。", String(error?.message ?? error)));
    }
    const promptText = input.promptTemplateText?.trim() || DEFAULT_QWEN3VL_DESIGN_PROMPT;
    const initialMaxTokens = Math.max(input.maxTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS);
    const retryMaxTokens = Math.max(RETRY_PROMPT_REVERSE_MAX_TOKENS, initialMaxTokens * 2);
    const createChatInput = (maxTokens) => ({
      model: modelId,
      temperature: input.temperature,
      topP: input.topP,
      maxTokens,
      messages: [
        {
          role: "system",
          content: "You are a professional AI image prompt engineer and senior visual designer."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    });
    const chat = await this.chat(config, createChatInput(initialMaxTokens));
    if (!chat.success || !chat.content) {
      return this.toPromptResult(config, modelId, startedAt, null, chat.error ?? createError("PROMPT_REVERSE_FAILED", "高级反推失败。"));
    }
    if (isLikelyTruncatedPromptReverseText(chat.content)) {
      const retry = await this.chat(config, createChatInput(retryMaxTokens));
      if (retry.success && retry.content) {
        return this.toPromptResult(config, modelId, startedAt, normalizePromptReverseData(retry.content, config, modelId), null);
      }
    }
    return this.toPromptResult(config, modelId, startedAt, normalizePromptReverseData(chat.content, config, modelId), null);
  }
  toPromptResult(config, modelId, startedAt, data, error) {
    return {
      success: !error,
      provider: config.type === "llama-openai" ? "prompt.llama-openai" : "prompt.openai-compatible",
      modelId,
      device: "external",
      durationMs: Date.now() - startedAt,
      data,
      error,
      cleared: false
    };
  }
}
const __openAiCompatibleTestUtils = {
  extractModels,
  extractChatContent,
  extractJsonObject,
  isLikelyTruncatedPromptReverseText,
  extractPartialPromptReverseObject,
  normalizePromptReverseData,
  sanitizeDetail
};
class LlamaOpenAIProvider {
  delegate = new OpenAICompatibleProvider();
  getDefaultConfig() {
    return createDefaultLlamaBackendConfig();
  }
  async healthCheck(config) {
    return this.delegate.healthCheck(this.withLlamaType(config));
  }
  async listModels(config) {
    return this.delegate.listModels(this.withLlamaType(config));
  }
  async chat(config, input) {
    return this.delegate.chat(this.withLlamaType(config), input);
  }
  async runPromptReverse(config, input) {
    return this.delegate.runPromptReverse(this.withLlamaType(config), input);
  }
  withLlamaType(config) {
    return { ...config, type: "llama-openai" };
  }
}
function resolvePromptReverseRoute(settings) {
  const mode = settings.promptReverseSettings?.backendMode ?? "llama-openai";
  if (mode === "native-qwen3vl") {
    return { mode, backend: null };
  }
  const backend = resolveExternalBackend(settings.aiBackends ?? [], mode, settings.promptReverseSettings?.selectedExternalBackendId);
  return { mode, backend };
}
function resolveExternalBackend(backends, backendMode, selectedBackendId) {
  const selected = selectedBackendId ? backends.find((backend) => backend.id === selectedBackendId) : backends.find((backend) => backend.type === backendMode);
  if (!selected) return null;
  return { ...selected, type: backendMode === "llama-openai" ? "llama-openai" : selected.type };
}
const QWEN3VL_MEMORY_REQUIREMENTS = {
  "qwen3-vl-2b-instruct": {
    minFreeVramGB: 4,
    recommendedFreeVramGB: 6,
    hardBlockBelowGB: 3
  },
  "qwen3-vl-4b-instruct": {
    minFreeVramGB: 8,
    recommendedFreeVramGB: 10,
    hardBlockBelowGB: 6
  },
  "qwen3-vl-8b-instruct": {
    minFreeVramGB: 10,
    recommendedFreeVramGB: 14,
    hardBlockBelowGB: 8
  },
  "qwen3-vl-8b-instruct-awq-4bit": {
    minFreeVramGB: 7,
    recommendedFreeVramGB: 10,
    hardBlockBelowGB: 5
  },
  "qwen3-vl-8b-instruct-awq-8bit": {
    minFreeVramGB: 9,
    recommendedFreeVramGB: 12,
    hardBlockBelowGB: 7
  }
};
function isLikelyTruncatedPromptReverseResult(result) {
  const rawResponse = result?.data?.rawResponse;
  return typeof rawResponse === "string" && __openAiCompatibleTestUtils.isLikelyTruncatedPromptReverseText(rawResponse);
}
class AiWorkerManager {
  static instance;
  providers = /* @__PURE__ */ new Map();
  gpuMonitor;
  memoryGuard;
  openAiProvider = new OpenAICompatibleProvider();
  llamaProvider = new LlamaOpenAIProvider();
  isProcessing = false;
  constructor() {
    this.gpuMonitor = new AiGpuMonitorService();
    this.memoryGuard = new AiMemoryGuardService(this.gpuMonitor);
  }
  static getInstance() {
    if (!AiWorkerManager.instance) {
      AiWorkerManager.instance = new AiWorkerManager();
    }
    return AiWorkerManager.instance;
  }
  registerProvider(provider) {
    this.providers.set(provider.id, provider);
    console.log(`[AiWorkerManager] Registered provider: ${provider.id} for task ${provider.taskType}`);
  }
  getGpuMonitor() {
    return this.gpuMonitor;
  }
  getMemoryGuard() {
    return this.memoryGuard;
  }
  async runPromptReverse(input) {
    const settings = SettingsService.getInstance().getSettings();
    const promptSettings = settings.promptReverseSettings;
    const route = resolvePromptReverseRoute(settings);
    const backendMode = route.mode;
    if (backendMode === "openai-compatible" || backendMode === "llama-openai") {
      const backend = route.backend;
      if (!backend) {
        return {
          success: false,
          provider: backendMode === "llama-openai" ? "prompt.llama-openai" : "prompt.openai-compatible",
          modelId: promptSettings?.selectedExternalModel ?? "",
          device: "external",
          durationMs: 0,
          data: null,
          error: {
            code: "BACKEND_NOT_CONFIGURED",
            message: "尚未配置外部 AI 后端。"
          },
          cleared: false
        };
      }
      const provider2 = backend.type === "llama-openai" ? this.llamaProvider : this.openAiProvider;
      return provider2.runPromptReverse(backend, {
        assetId: input.assetId,
        filePath: input.filePath,
        modelId: promptSettings?.selectedExternalModel || backend.defaultModel || input.modelId,
        promptTemplateId: input.promptTemplateId ?? DEFAULT_PROMPT_TEMPLATE_ID,
        promptTemplateText: input.promptTemplateText ?? DEFAULT_QWEN3VL_DESIGN_PROMPT,
        maxImageSize: promptSettings?.maxImageSize ?? 1024,
        temperature: promptSettings?.temperature ?? settings.qwen3vlTemperature ?? 0.6,
        topP: promptSettings?.topP ?? settings.qwen3vlTopP ?? 0.9,
        maxTokens: Math.max(promptSettings?.maxNewTokens ?? settings.qwen3vlMaxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS)
      });
    }
    const provider = this.providers.get("provider.prompt.qwen3vl");
    if (!provider) {
      throw new Error("Qwen3-VL provider is not registered.");
    }
    const modelDef = PROMPT_VLM_MODELS.find((m) => m.id === input.modelId);
    if (modelDef && modelDef.runtime === "transformers-compatible-check-required") {
      const compatStatus = settings.modelCompatStatuses?.[input.modelId] ?? "unknown";
      if (compatStatus === "unknown" || compatStatus === "check_required" || compatStatus === "checking") {
        return {
          success: false,
          provider: "prompt.qwen3vl",
          modelId: input.modelId,
          device: "cuda",
          durationMs: 0,
          data: null,
          error: {
            code: "MODEL_COMPAT_NOT_VERIFIED",
            message: `该量化模型首次运行前必须进行兼容性验证！请前往【设置 -> AI模型下载】卡片点击“兼容性验证”。`
          },
          cleared: false
        };
      } else if (compatStatus === "incompatible" || compatStatus === "failed") {
        return {
          success: false,
          provider: "prompt.qwen3vl",
          modelId: input.modelId,
          device: "cuda",
          durationMs: 0,
          data: null,
          error: {
            code: "MODEL_COMPAT_CHECK_FAILED",
            message: `当前环境经检测不支持该量化模型，请前往【设置 -> AI模型下载】改用 Qwen3-VL 4B 稳定版或 Qwen3-VL 8B 原版。`
          },
          cleared: false
        };
      }
    }
    const policy = settings.memoryPolicy || {
      clearGpuBeforePromptReverse: "auto",
      forceClearWhenInsufficient: true,
      maxGpuMemoryUsagePercent: 92
    };
    const req = provider.estimateMemory ? await provider.estimateMemory(input) : { minFreeVramGB: 10, recommendedFreeVramGB: 14 };
    const memLimit = QWEN3VL_MEMORY_REQUIREMENTS[input.modelId] || {
      minFreeVramGB: req.minFreeVramGB,
      recommendedFreeVramGB: req.recommendedFreeVramGB,
      hardBlockBelowGB: 8
    };
    let status = await this.gpuMonitor.getGpuStatus();
    let cleared = false;
    if (status.cudaAvailable) {
      const clearAlways = policy.clearGpuBeforePromptReverse === "always";
      const clearAuto = policy.clearGpuBeforePromptReverse === "auto" && status.freeVramGB < memLimit.recommendedFreeVramGB;
      const clearNeverButNeeded = policy.clearGpuBeforePromptReverse === "never" && status.freeVramGB < memLimit.minFreeVramGB && policy.forceClearWhenInsufficient;
      if (clearAlways || clearAuto || clearNeverButNeeded) {
        console.log(`[AiWorkerManager] GPU VRAM guard triggered clear (Policy strategy: ${policy.clearGpuBeforePromptReverse})`);
        const clearRes = await this.memoryGuard.clearGpuMemory(`Policy strategy: ${policy.clearGpuBeforePromptReverse}`);
        cleared = clearRes.success;
        status = await this.gpuMonitor.getGpuStatus();
      }
      if (status.freeVramGB < memLimit.hardBlockBelowGB || status.usagePercent > policy.maxGpuMemoryUsagePercent) {
        return {
          success: false,
          provider: "prompt.qwen3vl",
          modelId: input.modelId,
          device: "cuda",
          durationMs: 0,
          data: null,
          error: {
            code: "GPU_MEMORY_INSUFFICIENT",
            message: `系统可用显存不足！执行该模型至少需要 ${memLimit.hardBlockBelowGB}GB 的剩余显存，当前仅有 ${status.freeVramGB.toFixed(1)}GB (使用率 ${status.usagePercent}%)。请关闭其他占用显存的任务，或改用 Qwen3-VL 4B / 2B 稳定版本。`
          },
          cleared
        };
      }
    }
    this.isProcessing = true;
    try {
      const initialMaxNewTokens = Math.max(promptSettings?.maxNewTokens ?? settings.qwen3vlMaxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS);
      const retryMaxNewTokens = Math.max(RETRY_PROMPT_REVERSE_MAX_TOKENS, initialMaxNewTokens * 2);
      const executeWithTokens = (maxNewTokens) => provider.execute(input, {
        pythonPath: resolvePythonExecutable(),
        options: {
          maxNewTokens,
          maxImageSize: settings.qwen3vlMaxImageSize ?? 1024,
          temperature: settings.qwen3vlTemperature ?? 0.6,
          topP: settings.qwen3vlTopP ?? 0.9,
          promptTemplateId: input.promptTemplateId ?? DEFAULT_PROMPT_TEMPLATE_ID,
          promptTemplateText: input.promptTemplateText ?? DEFAULT_QWEN3VL_DESIGN_PROMPT,
          timeoutMs: 18e4
          // 3 minutes maximum
        }
      });
      const result = await executeWithTokens(initialMaxNewTokens);
      if (isLikelyTruncatedPromptReverseResult(result)) {
        const retry = await executeWithTokens(retryMaxNewTokens);
        return { ...retry, cleared };
      }
      return { ...result, cleared };
    } finally {
      this.isProcessing = false;
    }
  }
}
class Qwen3vlPromptProvider {
  id = "provider.prompt.qwen3vl";
  taskType = "prompt_reverse.qwen3vl";
  async isAvailable() {
    return true;
  }
  async estimateMemory(input) {
    const id = input.modelId.toLowerCase();
    if (id.includes("2b")) {
      return { minFreeVramGB: 4, recommendedFreeVramGB: 6 };
    } else if (id.includes("4b")) {
      return { minFreeVramGB: 8, recommendedFreeVramGB: 10 };
    } else if (id.includes("awq-4bit")) {
      return { minFreeVramGB: 7, recommendedFreeVramGB: 10 };
    } else if (id.includes("awq-8bit")) {
      return { minFreeVramGB: 9, recommendedFreeVramGB: 12 };
    } else {
      return { minFreeVramGB: 10, recommendedFreeVramGB: 14 };
    }
  }
  async execute(input, context) {
    const workerScript = resolveAiServicePath(["prompt_workers", "qwen3vl_prompt_worker.py"]);
    if (!fs.existsSync(workerScript)) {
      throw new Error(`Worker script not found at ${workerScript}`);
    }
    if (!fs.existsSync(input.modelPath)) {
      throw new Error(`模型物理路径不存在！请在设置的 AI 模型管理中完整下载 Qwen3-VL 模型后再执行。`);
    }
    const modelDef = PROMPT_VLM_MODELS.find((m) => m.id === input.modelId);
    const quantization = modelDef?.quantization ?? "none";
    const runtime = modelDef?.runtime ?? "transformers";
    const repoId = modelDef?.repoId ?? "";
    return new Promise((resolve, reject) => {
      const payload = {
        imagePath: input.filePath,
        modelPath: input.modelPath,
        modelId: input.modelId,
        repoId,
        quantization,
        runtime,
        mode: "design_prompt",
        templateId: context.options?.promptTemplateId ?? "qwen3vl.design_prompt.v1",
        promptTemplateText: context.options?.promptTemplateText,
        options: {
          maxNewTokens: context.options?.maxNewTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          temperature: context.options?.temperature ?? 0.6,
          topP: context.options?.topP ?? 0.9,
          maxImageSize: context.options?.maxImageSize ?? 1024,
          language: "zh-CN"
        }
      };
      let stdout = "";
      let stderr = "";
      let killed = false;
      const child = spawn(context.pythonPath, [workerScript], { shell: false, env: getPythonModelCacheEnv() });
      const timeoutMs = context.options?.timeoutMs ?? 18e4;
      const timeout = setTimeout(() => {
        killed = true;
        try {
          child.kill("SIGKILL");
        } catch {
        }
        reject(new Error("Qwen3-VL 推理超时，已强制杀掉后台进程以防止爆显存/挂起。"));
      }, timeoutMs);
      child.stdin?.write(JSON.stringify(payload) + "\n");
      child.stdin?.end();
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        if (killed) return;
        clearTimeout(timeout);
        reject(err);
      });
      child.on("close", (code) => {
        if (killed) return;
        clearTimeout(timeout);
        let parsedResult = null;
        try {
          const trimmed = stdout.trim();
          if (trimmed) {
            parsedResult = JSON.parse(trimmed);
          }
        } catch (e) {
        }
        if (parsedResult && parsedResult.success === false && parsedResult.error) {
          if (!parsedResult.error.stderr) {
            parsedResult.error.stderr = stderr;
          }
          resolve(parsedResult);
          return;
        }
        if (code !== 0) {
          if (stderr.includes("OutOfMemoryError") || stderr.includes("CUDA out of memory")) {
            resolve({
              success: false,
              provider: "prompt.qwen3vl",
              modelId: input.modelId,
              device: "cuda",
              durationMs: 0,
              data: null,
              error: {
                code: "CUDA_OUT_OF_MEMORY",
                message: "CUDA 显存不足 (Out of Memory)！建议在 AI 设置中调低最大图像尺寸，或将模型切换为低显存需求的 Qwen3-VL 4B / 2B Instruct。",
                stderr
              }
            });
            return;
          }
          resolve({
            success: false,
            provider: "prompt.qwen3vl",
            modelId: input.modelId,
            device: "unknown",
            durationMs: 0,
            data: null,
            error: {
              code: "QWEN3VL_PROMPT_FAILED",
              message: `子进程执行失败 (Exit Code: ${code})。请确认 Python 依赖完整。`,
              stderr
            }
          });
          return;
        }
        if (parsedResult) {
          resolve(parsedResult);
        } else {
          resolve({
            success: false,
            provider: "prompt.qwen3vl",
            modelId: input.modelId,
            device: "unknown",
            durationMs: 0,
            data: null,
            error: {
              code: "JSON_PARSE_FAILED",
              message: `无法解析 Python 输出的 JSON 结果。`,
              stderr: `stdout: ${stdout}
stderr: ${stderr}`
            }
          });
        }
      });
    });
  }
}
function registerAiWorkerIpc() {
  const manager = AiWorkerManager.getInstance();
  manager.registerProvider(new Qwen3vlPromptProvider());
  ipcMain.handle("ai-worker:run-prompt-reverse", async (_, { assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText }) => {
    try {
      const result = await manager.runPromptReverse({ assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText });
      if (result.success && result.data) {
        const db2 = getDatabase();
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        db2.transaction(() => {
          db2.prepare(`
            UPDATE assets 
            SET ai_prompt_status = 'synced', ai_prompt = ?
            WHERE id = ?
          `).run(JSON.stringify(result.data), assetId);
          const taskId = `prompt-task-${Math.random().toString(36).substr(2, 9)}`;
          db2.prepare(`
            INSERT INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, result_prompt, result_caption, created_at, synced_at, sync_status)
            VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, 'synced')
          `).run(taskId, assetId, filePath, modelId, JSON.stringify(result.data), result.data.shortCaption || "", now2, now2);
        })();
      }
      return result;
    } catch (err) {
      console.error("[IPC] ai-worker:run-prompt-reverse failed:", err);
      return {
        success: false,
        provider: "prompt.qwen3vl",
        modelId,
        device: "unknown",
        durationMs: 0,
        data: null,
        error: {
          code: err.code || "UNKNOWN_ERROR",
          message: err.message || String(err)
        }
      };
    }
  });
  ipcMain.handle("ai-worker:get-gpu-status", async () => {
    try {
      return await manager.getGpuMonitor().getGpuStatus();
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai-worker:clear-gpu-memory", async () => {
    try {
      try {
        const { LlamaRuntimeInstallService: LlamaRuntimeInstallService2 } = await Promise.resolve().then(() => llamaRuntimeInstall_service);
        LlamaRuntimeInstallService2.getInstance().stopServer();
      } catch (e) {
      }
      return await manager.getMemoryGuard().clearGpuMemory("User manual trigger");
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("macos-ai:install-deps", async (event) => {
    const { resolvePythonExecutable: resolvePythonExecutable2 } = await Promise.resolve().then(() => ocrDependency_service);
    const { resolveAiServicePath: resolveAiServicePath2 } = await Promise.resolve().then(() => aiServicePaths);
    const pythonExe = resolvePythonExecutable2();
    const installScript = resolveAiServicePath2(["tools", "install_macos_ai_deps.py"]);
    console.log("[macos-ai:install-deps] Running:", pythonExe, installScript);
    return new Promise((resolve) => {
      const child = spawn(pythonExe, [installScript], { shell: false });
      let output = "";
      child.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        if (!event.sender.isDestroyed()) {
          event.sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, text);
        }
      });
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        if (!event.sender.isDestroyed()) {
          event.sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, text);
        }
      });
      child.on("close", (code) => {
        console.log("[macos-ai:install-deps] Exited with code:", code);
        resolve({ success: code === 0, exitCode: code, output: output.slice(-2e3) });
      });
      child.on("error", (err) => {
        console.error("[macos-ai:install-deps] Spawn error:", err.message);
        resolve({ success: false, error: err.message });
      });
    });
  });
}
class AiModelDownloadService {
  static instance;
  activeDownloads = /* @__PURE__ */ new Map();
  constructor() {
  }
  static getInstance() {
    if (!AiModelDownloadService.instance) {
      AiModelDownloadService.instance = new AiModelDownloadService();
    }
    return AiModelDownloadService.instance;
  }
  async startDownload(modelId, sender) {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId);
    if (!model) throw new Error(`Model not found in registry: ${modelId}`);
    if (this.activeDownloads.has(modelId)) {
      console.warn(`[AiModelDownloadService] Download already active for: ${modelId}`);
      return;
    }
    const localDir = getModelLocalPath(model);
    const pythonExe = resolvePythonExecutable();
    const downloadScript = resolveAiServicePath(["tools", "download_hf_model.py"]);
    if (!fs.existsSync(downloadScript)) {
      throw new Error(`Download script not found at: ${downloadScript}`);
    }
    const args = ["--repo-id", model.repoId, "--local-dir", localDir];
    console.log(`[AiModelDownloadService] Launching snapshot download: ${pythonExe} ${downloadScript} ${args.join(" ")}`);
    const child = spawn(pythonExe, [downloadScript, ...args], { shell: false, env: getPythonModelCacheEnv() });
    this.activeDownloads.set(modelId, child);
    child.stdout?.on("data", (chunk) => {
      const chunkStr = chunk.toString();
      const match = chunkStr.match(/(\d+)%\|/);
      if (match) {
        const percentage = parseInt(match[1], 10);
        if (!sender.isDestroyed()) {
          sender.send(`ai-model:download-progress:${modelId}`, {
            type: "progress",
            progress: Math.min(percentage, 99),
            status: `正在下载权重: ${percentage}%`
          });
        }
      }
      const lines = chunkStr.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (!sender.isDestroyed()) {
            sender.send(`ai-model:download-progress:${modelId}`, parsed);
          }
        } catch {
          if (!sender.isDestroyed()) {
            sender.send(`ai-model:download-progress:${modelId}`, { type: "log", message: line });
          }
        }
      }
    });
    child.stderr?.on("data", (chunk) => {
      const chunkStr = chunk.toString();
      const match = chunkStr.match(/(\d+)%\|/);
      if (match) {
        const percentage = parseInt(match[1], 10);
        if (!sender.isDestroyed()) {
          sender.send(`ai-model:download-progress:${modelId}`, {
            type: "progress",
            progress: Math.min(percentage, 99),
            status: `正在下载权重: ${percentage}%`
          });
        }
      }
      if (!sender.isDestroyed()) {
        sender.send(`ai-model:download-progress:${modelId}`, { type: "stderr", message: chunkStr });
      }
    });
    child.on("close", (code) => {
      this.activeDownloads.delete(modelId);
      if (!sender.isDestroyed()) {
        sender.send(`ai-model:download-progress:${modelId}`, {
          type: "exit",
          success: code === 0,
          code
        });
      }
    });
  }
  cancelDownload(modelId) {
    const child = this.activeDownloads.get(modelId);
    if (child) {
      try {
        child.kill("SIGKILL");
      } catch (err) {
        console.warn(`[AiModelDownloadService] Failed to kill child download subprocess:`, err);
      }
      this.activeDownloads.delete(modelId);
      console.log(`[AiModelDownloadService] Cancelled download for: ${modelId}`);
    }
  }
  deleteModel(modelId) {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId);
    if (!model) return;
    const localDir = getModelLocalPath(model);
    if (fs.existsSync(localDir)) {
      try {
        fs.rmSync(localDir, { recursive: true, force: true });
        console.log(`[AiModelDownloadService] Deleted model folder: ${localDir}`);
      } catch (err) {
        console.error(`[AiModelDownloadService] Failed to delete model folder:`, err);
        throw err;
      }
    }
  }
}
function registerAiModelIpc() {
  const service = AiModelDownloadService.getInstance();
  ipcMain.handle("ai-model:list", async () => {
    return PROMPT_VLM_MODELS.map((model) => {
      const localPath = getModelLocalPath(model);
      const isDownloaded = fs.existsSync(localPath) && fs.existsSync(path.join(localPath, "config.json"));
      return {
        ...model,
        localPath,
        isDownloaded
      };
    });
  });
  ipcMain.handle("ai-model:download", async (event, { modelId }) => {
    try {
      await service.startDownload(modelId, event.sender);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai-model:cancel-download", async (_, { modelId }) => {
    service.cancelDownload(modelId);
    return { success: true };
  });
  ipcMain.handle("ai-model:delete", async (_, { modelId }) => {
    try {
      service.deleteModel(modelId);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("ai-model:verify-compatibility", async (_, { modelId }) => {
    const model = PROMPT_VLM_MODELS.find((m) => m.id === modelId);
    if (!model) {
      return {
        success: false,
        compatible: false,
        error: { code: "MODEL_NOT_FOUND", message: `未找到模型注册配置: ${modelId}` }
      };
    }
    const localPath = getModelLocalPath(model);
    const payload = {
      modelPath: localPath,
      modelId: model.id,
      repoId: model.repoId,
      quantization: model.quantization
    };
    const pythonPath = resolvePythonExecutable();
    const scriptPath = resolveAiServicePath(["tools", "check_qwen3vl_model_compat.py"]);
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      const child = spawn(pythonPath, [scriptPath], { shell: false });
      child.stdin?.write(JSON.stringify(payload) + "\n");
      child.stdin?.end();
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        resolve({
          success: false,
          compatible: false,
          error: {
            code: "SUBPROCESS_LAUNCH_FAILED",
            message: `启动兼容性验证脚本失败: ${err.message}`
          }
        });
      });
      child.on("close", (code) => {
        let parsedResult = null;
        try {
          const trimmed = stdout.trim();
          if (trimmed) {
            parsedResult = JSON.parse(trimmed);
          }
        } catch (e) {
        }
        if (parsedResult) {
          resolve(parsedResult);
        } else {
          resolve({
            success: false,
            compatible: false,
            error: {
              code: "JSON_PARSE_FAILED",
              message: `验证程序退出(Exit Code: ${code})，但未能解析其 JSON 输出。`,
              stderr: `stdout: ${stdout}
stderr: ${stderr}`
            }
          });
        }
      });
    });
  });
}
const COOPERATIVE_MODELS = [
  {
    id: "ram-plus",
    provider: "xinyu1205",
    repoId: "xinyu1205/recognize-anything-plus-model",
    displayName: "RAM++ 通用图像标签",
    modelFamily: "ram",
    category: "pth",
    description: "通用图像识别与多标签推理。主体、场景、构图和语义标签的主力模型，建议大多数素材开启。",
    fileSizeEstimate: "~1.4 GB"
  },
  {
    id: "florence-2-large",
    provider: "microsoft",
    repoId: "microsoft/Florence-2-large",
    displayName: "Florence-2 Large 画面描述",
    modelFamily: "florence2",
    category: "transformers",
    description: "图文详细描述、OCR 提取与版面文字分析。设计图、海报、UI 截图场景的主力模型。",
    fileSizeEstimate: "~1.5 GB"
  },
  {
    id: "clip-vit-b-32",
    provider: "laion",
    repoId: "laion/CLIP-ViT-B-32-laion2B-s34B-b79K",
    displayName: "CLIP ViT-B/32 设计分类器",
    modelFamily: "clip",
    category: "transformers",
    description: "零样本设计语义分类与自定义设计词典匹配。风格、排版、视觉构图相似性分类。",
    fileSizeEstimate: "~600 MB"
  },
  {
    id: "wd-vit-tagger-v3",
    provider: "SmilingWolf",
    repoId: "SmilingWolf/wd-vit-tagger-v3",
    displayName: "WD Tagger v3 动漫标签",
    modelFamily: "wd_tagger",
    category: "onnx-csv",
    description: "二次元 / 动漫 / 角色特征提取。仅对动漫和插画素材触发，基于 ONNX Runtime 推理。",
    fileSizeEstimate: "~800 MB"
  }
];
function getCooperativeModelRootDir() {
  try {
    const configured = SettingsService.getInstance().getSettings().modelRootDir;
    if (configured && configured.trim()) return path.join(configured, "cooperative");
  } catch {
  }
  const appData = app.getPath("userData");
  return path.join(appData, "AIModels", "cooperative");
}
function getCooperativeModelLocalPath(model) {
  return path.join(getCooperativeModelRootDir(), model.provider, model.id);
}
function registerCooperativeModelIpc() {
  const activeDownloads = /* @__PURE__ */ new Map();
  ipcMain.handle("cooperative-model:list", async () => {
    return {
      success: true,
      models: COOPERATIVE_MODELS.map((model) => {
        const localPath = getCooperativeModelLocalPath(model);
        let isDownloaded = false;
        try {
          isDownloaded = fs.existsSync(localPath) && fs.readdirSync(localPath).length > 0;
        } catch {
        }
        return { ...model, localPath, isDownloaded };
      })
    };
  });
  ipcMain.handle("cooperative-model:download", async (event, { modelId }) => {
    const model = COOPERATIVE_MODELS.find((m) => m.id === modelId);
    if (!model) return { success: false, error: `Model not found: ${modelId}` };
    const localDir = getCooperativeModelLocalPath(model);
    const pythonExe = resolvePythonExecutable();
    const downloadScript = resolveAiServicePath(["tools", "download_cooperative_hf_model.py"]);
    if (!fs.existsSync(downloadScript)) {
      return { success: false, error: `Download script not found: ${downloadScript}` };
    }
    if (activeDownloads.has(modelId)) return { success: false, error: "Download already in progress" };
    const args = ["--repo-id", model.repoId, "--local-dir", localDir, "--category", model.category];
    const child = spawn(pythonExe, [downloadScript, ...args], {
      shell: false,
      env: getPythonModelCacheEnv()
    });
    activeDownloads.set(modelId, child);
    const sender = event.sender;
    const channel = `cooperative-model:download-progress:${modelId}`;
    child.stdout?.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          parsed.modelId = modelId;
          if (!sender.isDestroyed()) sender.send(channel, parsed);
        } catch {
          if (!sender.isDestroyed()) sender.send(channel, { type: "log", message: line, modelId });
        }
      }
    });
    child.stderr?.on("data", (chunk) => {
      if (!sender.isDestroyed()) {
        sender.send(channel, { type: "stderr", message: chunk.toString(), modelId });
      }
    });
    child.on("close", (code) => {
      activeDownloads.delete(modelId);
      if (!sender.isDestroyed()) {
        sender.send(channel, { type: "exit", success: code === 0, code, modelId });
      }
    });
    child.on("error", (err) => {
      activeDownloads.delete(modelId);
      if (!sender.isDestroyed()) {
        sender.send(channel, {
          type: "error",
          success: false,
          modelId,
          error: { code: "SUBPROCESS_FAILED", message: err.message }
        });
      }
    });
    return { success: true };
  });
  ipcMain.handle("cooperative-model:cancel-download", async (_, { modelId }) => {
    const child = activeDownloads.get(modelId);
    if (child) {
      try {
        child.kill("SIGKILL");
      } catch {
      }
      activeDownloads.delete(modelId);
    }
    return { success: true };
  });
  ipcMain.handle("cooperative-model:delete", async (_, { modelId }) => {
    const model = COOPERATIVE_MODELS.find((m) => m.id === modelId);
    if (!model) return { success: false, error: `Model not found: ${modelId}` };
    const localDir = getCooperativeModelLocalPath(model);
    if (fs.existsSync(localDir)) {
      try {
        fs.rmSync(localDir, { recursive: true, force: true });
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    return { success: true };
  });
}
const CHANNEL_AI_BACKEND_LIST = "ai-backend:list";
const CHANNEL_AI_BACKEND_SAVE = "ai-backend:save";
const CHANNEL_AI_BACKEND_DELETE = "ai-backend:delete";
const CHANNEL_AI_BACKEND_HEALTH_CHECK = "ai-backend:health-check";
const CHANNEL_AI_BACKEND_LIST_MODELS = "ai-backend:list-models";
class AiBackendHealthService {
  openAiProvider = new OpenAICompatibleProvider();
  llamaProvider = new LlamaOpenAIProvider();
  healthCheck(config) {
    return this.providerFor(config).healthCheck(config);
  }
  listModels(config) {
    return this.providerFor(config).listModels(config);
  }
  providerFor(config) {
    return config.type === "llama-openai" ? this.llamaProvider : this.openAiProvider;
  }
}
class AiBackendSettingsService {
  settingsService = SettingsService.getInstance();
  listBackends() {
    const settings = this.settingsService.getSettings();
    const backends = settings.aiBackends && settings.aiBackends.length > 0 ? settings.aiBackends : [createDefaultLlamaBackendConfig()];
    return backends.sort((a, b) => a.priority - b.priority);
  }
  getBackend(id) {
    return this.listBackends().find((backend) => backend.id === id) ?? null;
  }
  saveBackend(config) {
    const backends = this.listBackends();
    const index = backends.findIndex((backend) => backend.id === config.id);
    const next = index >= 0 ? backends.map((backend) => backend.id === config.id ? config : backend) : [...backends, config];
    this.settingsService.saveSettings({ aiBackends: next });
    return next.sort((a, b) => a.priority - b.priority);
  }
  deleteBackend(id) {
    const next = this.listBackends().filter((backend) => backend.id !== id);
    const normalized = next.length > 0 ? next : [createDefaultLlamaBackendConfig()];
    this.settingsService.saveSettings({ aiBackends: normalized });
    return normalized.sort((a, b) => a.priority - b.priority);
  }
}
function registerAiBackendIpc() {
  const settingsService = new AiBackendSettingsService();
  const healthService = new AiBackendHealthService();
  ipcMain.handle(CHANNEL_AI_BACKEND_LIST, async () => {
    return settingsService.listBackends();
  });
  ipcMain.handle(CHANNEL_AI_BACKEND_SAVE, async (_, config) => {
    return settingsService.saveBackend(config);
  });
  ipcMain.handle(CHANNEL_AI_BACKEND_DELETE, async (_, request) => {
    return settingsService.deleteBackend(request.id);
  });
  ipcMain.handle(CHANNEL_AI_BACKEND_HEALTH_CHECK, async (_, request) => {
    const config = request.config ?? settingsService.getBackend(request.backendId);
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        backendType: "custom",
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message: "未找到外部 AI 后端配置。"
        }
      };
    }
    return healthService.healthCheck(config);
  });
  ipcMain.handle(CHANNEL_AI_BACKEND_LIST_MODELS, async (_, request) => {
    const config = request.config ?? settingsService.getBackend(request.backendId);
    if (!config) {
      return {
        success: false,
        backendId: request.backendId,
        models: [],
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message: "未找到外部 AI 后端配置。"
        }
      };
    }
    return healthService.listModels(config);
  });
}
const DEFAULT_LLAMA_RELEASE = {
  tag_name: "b9437",
  assets: [
    {
      name: "llama-b9437-bin-win-cuda-13.3-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cuda-13.3-x64.zip"
    },
    {
      name: "cudart-llama-bin-win-cuda-13.3-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/cudart-llama-bin-win-cuda-13.3-x64.zip"
    },
    {
      name: "llama-b9437-bin-win-cuda-12.4-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cuda-12.4-x64.zip"
    },
    {
      name: "cudart-llama-bin-win-cuda-12.4-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/cudart-llama-bin-win-cuda-12.4-x64.zip"
    },
    {
      name: "llama-b9437-bin-win-vulkan-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-vulkan-x64.zip"
    },
    {
      name: "llama-b9437-bin-win-cpu-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cpu-x64.zip"
    },
    {
      name: "llama-b9437-bin-macos-arm64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-macos-arm64.zip"
    },
    {
      name: "llama-b9437-bin-macos-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-macos-x64.zip"
    },
    {
      name: "llama-b9437-bin-linux-x64.zip",
      browser_download_url: "https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-linux-x64.zip"
    }
  ]
};
const qwen3VlSizes = [
  {
    parameterSize: "2B",
    repoId: "Qwen/Qwen3-VL-2B-Instruct-GGUF",
    filePrefix: "Qwen3VL-2B-Instruct",
    minVramByQuant: { Q4_K_M: 6, Q8_0: 8, F16: 10 },
    sizeByQuant: { Q4_K_M: 1.5, Q8_0: 2.2, F16: 3.9 },
    officialReleaseDate: "2025-09-22",
    reason: "低显存和轻量快速场景，适合先体验本地视觉反推。"
  },
  {
    parameterSize: "4B",
    repoId: "Qwen/Qwen3-VL-4B-Instruct-GGUF",
    filePrefix: "Qwen3VL-4B-Instruct",
    minVramByQuant: { Q4_K_M: 8, Q8_0: 10, F16: 14 },
    sizeByQuant: { Q4_K_M: 3.2, Q8_0: 5.1, F16: 8.9 },
    officialReleaseDate: "2025-10-14",
    reason: "平衡质量与速度，适合作为多数本地视觉反推用户的默认选择。"
  },
  {
    parameterSize: "8B",
    repoId: "Qwen/Qwen3-VL-8B-Instruct-GGUF",
    filePrefix: "Qwen3VL-8B-Instruct",
    minVramByQuant: { Q4_K_M: 12, Q8_0: 16, F16: 24 },
    sizeByQuant: { Q4_K_M: 6.2, Q8_0: 9.6, F16: 17.4 },
    officialReleaseDate: "2025-10-14",
    reason: "高质量视觉理解选择，适合更细致的素材理解与 OCR 场景。"
  }
];
const officialQwen3VlQuants = [
  { quantization: "Q4_K_M", label: "Q4_K_M 省显存" },
  { quantization: "Q8_0", label: "Q8_0 高质量" },
  { quantization: "F16", label: "F16 原始精度" }
];
const QWEN3_VL_GGUF_CANDIDATES = qwen3VlSizes.flatMap(
  (size) => officialQwen3VlQuants.map((quant) => {
    const filename = `${size.filePrefix}-${quant.quantization}.gguf`;
    return {
      id: `qwen3-vl-${size.parameterSize.toLowerCase()}-instruct-${quant.quantization.toLowerCase().replace(/_/g, "-")}`,
      name: `Qwen3-VL ${size.parameterSize} Instruct ${quant.label}`,
      repoId: size.repoId,
      filename,
      url: `https://huggingface.co/${size.repoId}/resolve/main/${filename}`,
      mmprojFilename: `mmproj-${size.filePrefix}-F16.gguf`,
      mmprojUrl: `https://huggingface.co/${size.repoId}/resolve/main/mmproj-${size.filePrefix}-F16.gguf`,
      quantization: quant.quantization,
      parameterSize: size.parameterSize,
      estimatedSizeGB: size.sizeByQuant[quant.quantization],
      recommendedMinVramGB: size.minVramByQuant[quant.quantization],
      supportsVision: true,
      officialReleaseDate: size.officialReleaseDate,
      reason: `${size.reason} 当前档位为 ${quant.label}。`
    };
  })
);
function createHardwareProfile(input = {}) {
  const totalMemoryGB = input.totalMemoryGB ?? Math.round(os.totalmem() / 1024 / 1024 / 1024);
  const recommendedAccelerator = input.recommendedAccelerator ?? recommendAccelerator(input.cudaVersion, input.hasNvidiaGpu);
  return {
    platform: input.platform ?? process.platform,
    arch: input.arch ?? process.arch,
    cpuThreads: input.cpuThreads ?? os.cpus().length,
    totalMemoryGB,
    hasNvidiaGpu: input.hasNvidiaGpu ?? false,
    gpuName: input.gpuName,
    totalVramGB: input.totalVramGB,
    driverVersion: input.driverVersion,
    cudaVersion: input.cudaVersion,
    recommendedAccelerator,
    warnings: input.warnings ?? []
  };
}
function recommendAccelerator(cudaVersion, hasNvidiaGpu = false) {
  if (!hasNvidiaGpu) return process.platform === "win32" ? "vulkan" : "cpu";
  const major = Number((cudaVersion ?? "").split(".")[0]);
  if (major >= 13) return "cuda13";
  if (major >= 12) return "cuda12";
  return "vulkan";
}
function selectModelCandidate(profile) {
  const vram = profile.totalVramGB ?? 0;
  const preferred = vram >= 14 ? "qwen3-vl-8b-instruct-q4-k-m" : vram >= 10 ? "qwen3-vl-4b-instruct-q4-k-m" : "qwen3-vl-2b-instruct-q4-k-m";
  return QWEN3_VL_GGUF_CANDIDATES.find((model) => model.id === preferred) ?? QWEN3_VL_GGUF_CANDIDATES[0];
}
function runtimePatterns(accelerator, platform = process.platform, arch = process.arch) {
  if (platform === "darwin") {
    return arch === "arm64" ? [/^llama-.*bin-macos-arm64\.zip/i, /^llama-.*bin-macos.*arm64.*\.zip/i] : [/^llama-.*bin-macos-x64\.zip/i, /^llama-.*bin-macos.*x64.*\.zip/i];
  }
  if (platform === "linux") {
    return arch === "arm64" ? [/^llama-.*bin-linux-arm64\.zip/i, /^llama-.*bin-linux.*arm64.*\.zip/i] : [/^llama-.*bin-linux-x64\.zip/i, /^llama-.*bin-linux.*x64.*\.zip/i];
  }
  if (accelerator === "cuda13") {
    return [/^llama-.*bin-win-cuda-13[\d.]*-x64\.zip/i, /^llama-.*bin-win-cu13[\d.]*-x64\.zip/i];
  }
  if (accelerator === "cuda12") {
    return [/^llama-.*bin-win-cuda-12[\d.]*-x64\.zip/i, /^llama-.*bin-win-cu12[\d.]*-x64\.zip/i];
  }
  if (accelerator === "vulkan") return [/^llama-.*bin-win-vulkan-x64\.zip/i];
  return [/^llama-.*bin-win-cpu-x64\.zip/i];
}
function cudaRuntimePatterns(accelerator) {
  if (accelerator === "cuda13") {
    return [/^cudart-llama-bin-win-cuda-13[\d.]*-x64\.zip/i, /^cudart-llama-bin-win-cu13[\d.]*-x64\.zip/i];
  }
  if (accelerator === "cuda12") {
    return [/^cudart-llama-bin-win-cuda-12[\d.]*-x64\.zip/i, /^cudart-llama-bin-win-cu12[\d.]*-x64\.zip/i];
  }
  return [];
}
function findAsset(release, patterns) {
  return release.assets.find((asset) => patterns.some((pattern) => pattern.test(asset.name))) ?? null;
}
function applyMirror(asset, releaseTag, manifest) {
  for (const mirror of manifest?.mirrors ?? []) {
    const direct = mirror.files?.[asset.name];
    if (direct) {
      return {
        mirrorUrl: direct,
        sourceRegion: mirror.region,
        checksumSha256: mirror.checksums?.[asset.name],
        verified: Boolean(mirror.checksums?.[asset.name])
      };
    }
    if (mirror.baseUrl) {
      return {
        mirrorUrl: `${mirror.baseUrl.replace(/\/$/, "")}/${releaseTag}/${asset.name}`,
        sourceRegion: mirror.region,
        checksumSha256: mirror.checksums?.[asset.name],
        verified: Boolean(mirror.checksums?.[asset.name])
      };
    }
  }
  return { verified: false };
}
function toRuntimePackage(asset, release, accelerator, role, manifest) {
  return {
    id: `${role}:${asset.name}`,
    role,
    accelerator,
    version: release.tag_name,
    filename: asset.name,
    officialUrl: asset.browser_download_url,
    sizeBytes: asset.size,
    ...applyMirror(asset, release.tag_name, manifest)
  };
}
function createInstallPlan(input) {
  const release = input.release?.assets?.length ? input.release : DEFAULT_LLAMA_RELEASE;
  const accelerator = input.hardware.recommendedAccelerator;
  const runtimeAsset = findAsset(release, runtimePatterns(accelerator, input.hardware.platform, input.hardware.arch));
  if (!runtimeAsset) {
    throw new Error(`未找到适合 ${input.hardware.platform}/${input.hardware.arch}/${accelerator} 的 llama.cpp 安装包。`);
  }
  const packages = [toRuntimePackage(runtimeAsset, release, accelerator, "runtime", input.mirrorManifest)];
  const cudaAsset = findAsset(release, cudaRuntimePatterns(accelerator));
  if (cudaAsset) {
    packages.push(toRuntimePackage(cudaAsset, release, accelerator, "cuda-runtime", input.mirrorManifest));
  }
  const downloadSource = input.downloadSource ?? "hf-mirror";
  const sourceHost = downloadSource === "hf-mirror" ? "https://hf-mirror.com" : "https://huggingface.co";
  const candidates = QWEN3_VL_GGUF_CANDIDATES.map((m) => {
    return {
      ...m,
      url: m.url.replace("https://huggingface.co", sourceHost),
      mmprojUrl: m.mmprojUrl?.replace("https://huggingface.co", sourceHost)
    };
  });
  const modelRaw = selectModelCandidate(input.hardware);
  const model = candidates.find((c) => c.id === modelRaw.id) || candidates[0];
  const modelDir = path.join(input.installRoot, "models", "gguf", model.id);
  const warnings = [...input.hardware.warnings];
  if (!packages.some((item) => item.verified)) {
    warnings.push("安装包未提供 SHA256 校验值；会校验下载完整性，但无法做强来源校验。");
  }
  warnings.push("模型列表仅包含 Qwen3-VL Instruct GGUF；视觉输入需要 LLM GGUF 与 mmproj 文件同时下载。");
  return {
    installId: `llama-${Date.now()}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    runtimeVersion: release.tag_name,
    accelerator,
    runtimePackages: packages,
    modelCandidates: candidates,
    recommendedModel: model,
    installRoot: input.installRoot,
    runtimeDir: path.join(input.installRoot, "runtimes", "llama.cpp", release.tag_name),
    modelDir,
    baseUrl: "http://127.0.0.1:8080/v1",
    warnings,
    downloadSource
  };
}
function sanitizeLlamaLog(value) {
  return value.replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]").replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "[REDACTED_IMAGE_DATA_URL]").replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, "[USER_HOME]");
}
function assertSafeZipEntries(entries, destinationDir) {
  const root = path.resolve(destinationDir);
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, "/");
    if (!normalized || normalized.endsWith("/")) continue;
    if (path.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized) || normalized.includes("../")) {
      throw new Error(`ZIP 包含不安全路径: ${entry}`);
    }
    const target = path.resolve(root, normalized);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`ZIP 解压路径越界: ${entry}`);
    }
  }
}
function listZipEntries(buffer) {
  const eocdSignature = 101010256;
  const centralSignature = 33639248;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("无法解析 ZIP 中央目录。");
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== centralSignature) {
      throw new Error("ZIP 中央目录结构无效。");
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.push(buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
const llamaRuntimePlanner = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_LLAMA_RELEASE,
  QWEN3_VL_GGUF_CANDIDATES,
  assertSafeZipEntries,
  createHardwareProfile,
  createInstallPlan,
  listZipEntries,
  recommendAccelerator,
  sanitizeLlamaLog,
  selectModelCandidate
}, Symbol.toStringTag, { value: "Module" }));
const CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE = "llama-runtime:detect-hardware";
const CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN = "llama-runtime:create-install-plan";
const CHANNEL_LLAMA_RUNTIME_START_INSTALL = "llama-runtime:start-install";
const CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL = "llama-runtime:cancel-install";
const CHANNEL_LLAMA_RUNTIME_GET_STATUS = "llama-runtime:get-status";
const CHANNEL_LLAMA_RUNTIME_START_SERVER = "llama-runtime:start-server";
const CHANNEL_LLAMA_RUNTIME_STOP_SERVER = "llama-runtime:stop-server";
const CHANNEL_LLAMA_RUNTIME_TEST_SERVER = "llama-runtime:test-server";
const llamaRuntimeInstallProgressChannel = (installId) => `llama-runtime:install-progress:${installId}`;
const LLAMA_RELEASES_API = "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest";
class LlamaRuntimeInstallService {
  static instance;
  abortController = null;
  serverProcess = null;
  status = {
    phase: "idle",
    progress: 0,
    message: "尚未开始安装。",
    baseUrl: "http://127.0.0.1:8080/v1"
  };
  static getInstance() {
    if (!LlamaRuntimeInstallService.instance) {
      LlamaRuntimeInstallService.instance = new LlamaRuntimeInstallService();
    }
    return LlamaRuntimeInstallService.instance;
  }
  async detectHardware() {
    if (process.platform === "darwin") {
      return this.detectMacHardware();
    }
    if (process.platform !== "win32") {
      return createHardwareProfile({
        platform: process.platform,
        arch: process.arch,
        cpuThreads: os.cpus().length,
        totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        warnings: ["当前平台将使用 llama.cpp CPU 运行包；如下载源未提供当前架构包，请手动选择已安装的 llama-server。"]
      });
    }
    const warnings = [];
    let gpuName;
    let totalVramGB;
    let driverVersion;
    let cudaVersion;
    try {
      const csv = await this.runCapture("nvidia-smi", ["--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"], 5e3);
      const first = csv.trim().split(/\r?\n/)[0];
      if (first) {
        const [name, memory, driver] = first.split(",").map((part) => part.trim());
        gpuName = name;
        totalVramGB = Math.round(Number(memory) / 1024 * 10) / 10;
        driverVersion = driver;
      }
      const full = await this.runCapture("nvidia-smi", [], 5e3);
      cudaVersion = /CUDA Version:\s*([\d.]+)/i.exec(full)?.[1];
    } catch {
      warnings.push("未检测到可用的 nvidia-smi，将回退到 Vulkan/CPU 安装建议。");
    }
    return createHardwareProfile({
      platform: process.platform,
      arch: process.arch,
      cpuThreads: os.cpus().length,
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      hasNvidiaGpu: Boolean(gpuName),
      gpuName,
      totalVramGB,
      driverVersion,
      cudaVersion,
      warnings
    });
  }
  async detectMacHardware() {
    const warnings = [];
    const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const cpuThreads = os.cpus().length;
    let chipName = os.cpus()[0]?.model || "Apple Silicon / Intel Mac";
    let coreSummary = `${cpuThreads} 线程`;
    let displaySummary = "";
    try {
      const brand = await this.runCapture("sysctl", ["-n", "machdep.cpu.brand_string"], 3e3);
      if (brand.trim()) chipName = brand.trim();
    } catch {
    }
    try {
      const hardware = await this.runCapture("system_profiler", ["SPHardwareDataType"], 8e3);
      const chip = /Chip:\s*(.+)/i.exec(hardware)?.[1]?.trim();
      const processor = /Processor Name:\s*(.+)/i.exec(hardware)?.[1]?.trim();
      const cores = /Total Number of Cores:\s*(.+)/i.exec(hardware)?.[1]?.trim();
      const memory = /Memory:\s*(.+)/i.exec(hardware)?.[1]?.trim();
      chipName = chip || processor || chipName;
      coreSummary = cores || coreSummary;
      if (memory) warnings.push(`检测到统一内存：${memory}。`);
    } catch (err) {
      warnings.push(`无法读取 macOS 硬件详情，将使用 Node/os 基础信息：${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      const displays = await this.runCapture("system_profiler", ["SPDisplaysDataType"], 8e3);
      const chipset = /Chipset Model:\s*(.+)/i.exec(displays)?.[1]?.trim();
      const vram = /VRAM(?: \(Dynamic, Max\))?:\s*(.+)/i.exec(displays)?.[1]?.trim();
      displaySummary = [chipset, vram].filter(Boolean).join(" / ");
    } catch {
    }
    const isAppleSilicon = process.arch === "arm64" || /Apple\s+M\d|Apple\s+Silicon/i.test(chipName);
    const estimatedUnifiedVramGB = isAppleSilicon ? Math.max(4, Math.round(totalMemoryGB * 0.65 * 10) / 10) : void 0;
    const recommendedAccelerator = isAppleSilicon ? "metal" : "cpu";
    return createHardwareProfile({
      platform: process.platform,
      arch: process.arch,
      cpuThreads,
      totalMemoryGB,
      hasNvidiaGpu: false,
      gpuName: displaySummary || `${chipName}${isAppleSilicon ? " 统一内存 GPU" : ""}`,
      totalVramGB: estimatedUnifiedVramGB,
      recommendedAccelerator,
      warnings: [
        `macOS 硬件检测完成：${chipName}，${coreSummary}，系统内存约 ${totalMemoryGB} GB。`,
        ...estimatedUnifiedVramGB ? [`按 Apple 统一内存估算可用于本地推理的显存预算约 ${estimatedUnifiedVramGB} GB。`] : [],
        ...warnings
      ]
    });
  }
  async createInstallPlan(mirrorManifestPath, requestedModelRootDir, downloadSource) {
    const hardware = await this.detectHardware();
    const release = await this.fetchLatestRelease();
    const mirrorManifest = await this.loadMirrorManifest(mirrorManifestPath);
    const modelRootDir = requestedModelRootDir?.trim() || (SettingsService.getInstance().getSettings().modelRootDir ?? path.join(app.getPath("userData"), "AIModels"));
    return createInstallPlan({
      hardware,
      release,
      mirrorManifest,
      installRoot: path.join(modelRootDir, "llama-runtime"),
      downloadSource
    });
  }
  getStatus() {
    return {
      ...this.status,
      serverPid: this.serverProcess?.pid
    };
  }
  async getStatusWithHealth(baseUrl) {
    const status = this.getStatus();
    const health = await this.checkServerHealth(baseUrl ?? status.baseUrl);
    return {
      ...status,
      phase: health.running && status.phase === "idle" ? "complete" : status.phase,
      message: health.running && status.phase === "idle" ? "llama-server 已在本机运行。" : status.message,
      serverRunning: health.running,
      serverModels: health.models,
      serverHealthCheckedAt: (/* @__PURE__ */ new Date()).toISOString(),
      error: health.running ? status.error : status.serverPid ? {
        code: "LLAMA_SERVER_HEALTH_FAILED",
        message: health.error ?? "llama-server process exists but health check failed."
      } : status.error
    };
  }
  async startInstall(plan, sender) {
    if (this.abortController) {
      throw new Error("已有 Llama 安装任务正在运行。");
    }
    this.abortController = new AbortController();
    this.emit(sender, plan.installId, "downloading", 1, "开始安装 Llama 本地服务。");
    try {
      await fs$1.mkdir(plan.runtimeDir, { recursive: true });
      await fs$1.mkdir(plan.modelDir, { recursive: true });
      const cacheDir = path.join(plan.installRoot, "downloads");
      await fs$1.mkdir(cacheDir, { recursive: true });
      for (let i = 0; i < plan.runtimePackages.length; i += 1) {
        const pkg = plan.runtimePackages[i];
        const targetZip = path.join(cacheDir, pkg.filename);
        await this.downloadPackage(pkg, targetZip, sender, plan.installId, 5 + i * 20);
        this.emit(sender, plan.installId, "extracting", 25 + i * 20, `正在解压 ${pkg.role === "runtime" ? "llama.cpp" : "CUDA 运行库"}。`);
        await this.extractZip(targetZip, plan.runtimeDir);
      }
      const modelPath = path.join(plan.modelDir, plan.recommendedModel.filename);
      await this.downloadUrl(
        plan.recommendedModel.mirrorUrl ?? plan.recommendedModel.url,
        plan.recommendedModel.url,
        modelPath,
        plan.recommendedModel.checksumSha256,
        sender,
        plan.installId,
        58,
        `正在下载 ${plan.recommendedModel.name} LLM GGUF。`
      );
      let mmprojPath;
      if (plan.recommendedModel.mmprojFilename && plan.recommendedModel.mmprojUrl) {
        mmprojPath = path.join(plan.modelDir, plan.recommendedModel.mmprojFilename);
        await this.downloadUrl(
          plan.recommendedModel.mmprojUrl,
          plan.recommendedModel.mmprojUrl,
          mmprojPath,
          void 0,
          sender,
          plan.installId,
          78,
          `正在下载 ${plan.recommendedModel.name} 视觉编码器 mmproj。`
        );
      }
      await this.updateLlamaBackend(plan, modelPath);
      this.emit(sender, plan.installId, "complete", 100, "Llama 本地服务安装完成，已写入后端配置。");
      this.status = {
        installId: plan.installId,
        phase: "complete",
        progress: 100,
        message: "Llama 本地服务安装完成。",
        installRoot: plan.installRoot,
        runtimeDir: plan.runtimeDir,
        modelPath,
        mmprojPath,
        baseUrl: plan.baseUrl
      };
      return this.getStatus();
    } catch (err) {
      const phase = this.abortController?.signal.aborted ? "cancelled" : "error";
      this.emit(sender, plan.installId, phase, this.status.progress, phase === "cancelled" ? "安装已取消。" : "安装失败。", {
        code: phase === "cancelled" ? "LLAMA_INSTALL_CANCELLED" : "LLAMA_INSTALL_FAILED",
        message: sanitizeLlamaLog(err?.message ?? String(err))
      });
      this.status = {
        installId: plan.installId,
        phase,
        progress: this.status.progress,
        message: phase === "cancelled" ? "安装已取消。" : "安装失败。",
        installRoot: plan.installRoot,
        runtimeDir: plan.runtimeDir,
        baseUrl: plan.baseUrl,
        error: {
          code: phase === "cancelled" ? "LLAMA_INSTALL_CANCELLED" : "LLAMA_INSTALL_FAILED",
          message: sanitizeLlamaLog(err?.message ?? String(err))
        }
      };
      return this.getStatus();
    } finally {
      this.abortController = null;
    }
  }
  cancelInstall() {
    this.abortController?.abort();
    this.status = { ...this.status, phase: "cancelled", message: "正在取消安装。" };
    return this.getStatus();
  }
  async startServer(plan, modelPath) {
    if (this.serverProcess && !this.serverProcess.killed) {
      return this.getStatus();
    }
    let runtimeDir = plan?.runtimeDir ?? this.status.runtimeDir;
    const ggufPath = modelPath ?? this.status.modelPath;
    if (!runtimeDir) {
      const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir || path.join(app.getPath("userData"), "AIModels");
      const installRoot = path.join(modelRootDir, "llama-runtime");
      const runtimesBaseDir = path.join(installRoot, "runtimes", "llama.cpp");
      if (fs.existsSync(runtimesBaseDir)) {
        try {
          const files = fs.readdirSync(runtimesBaseDir);
          for (const f of files) {
            const fullPath = path.join(runtimesBaseDir, f);
            if (fs.statSync(fullPath).isDirectory() && this.findServerExecutable(fullPath)) {
              runtimeDir = fullPath;
              break;
            }
          }
        } catch (e) {
        }
      }
      if (!runtimeDir) {
        runtimeDir = path.join(installRoot, "runtimes", "llama.cpp", DEFAULT_LLAMA_RELEASE.tag_name);
      }
    }
    if (!runtimeDir || !ggufPath) {
      throw new Error("缺少 llama.cpp 安装目录或 GGUF 模型路径。");
    }
    const exePath = this.findServerExecutable(runtimeDir);
    let mmprojPath = plan?.recommendedModel.mmprojFilename ? path.join(plan.modelDir, plan.recommendedModel.mmprojFilename) : this.status.mmprojPath;
    if (!mmprojPath && ggufPath) {
      const modelDir = path.dirname(ggufPath);
      try {
        if (fs.existsSync(modelDir)) {
          const files = fs.readdirSync(modelDir);
          const mmprojFile = files.find((f) => f.toLowerCase().includes("mmproj") && f.toLowerCase().endsWith(".gguf"));
          if (mmprojFile) {
            mmprojPath = path.join(modelDir, mmprojFile);
          }
        }
      } catch (e) {
      }
    }
    if (!exePath || !fs.existsSync(exePath)) {
      throw new Error(process.platform === "win32" ? "未找到 llama-server.exe，请先完成安装。" : "未找到 llama-server，请先完成安装。");
    }
    if (!fs.existsSync(ggufPath)) {
      throw new Error("未找到 GGUF 模型文件，请先完成模型下载。");
    }
    const args = ["-m", ggufPath];
    if (mmprojPath && fs.existsSync(mmprojPath)) {
      args.push("--mmproj", mmprojPath);
    }
    args.push("--host", "127.0.0.1", "--port", "8080", "-c", "4096", "-ngl", "999");
    if (process.platform !== "win32") {
      try {
        fs.chmodSync(exePath, 493);
      } catch {
      }
    }
    this.serverProcess = spawn(exePath, args, { cwd: runtimeDir, shell: false });
    this.serverProcess.on("exit", () => {
      this.serverProcess = null;
    });
    this.status = {
      ...this.status,
      phase: "starting",
      message: "llama-server 已启动，正在等待服务就绪。",
      runtimeDir,
      modelPath: ggufPath,
      mmprojPath,
      baseUrl: plan?.baseUrl ?? this.status.baseUrl
    };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const result = await this.testServer(this.status.baseUrl);
      if (result.success) {
        this.status = {
          ...this.status,
          phase: "complete",
          message: `llama-server 已启动并通过连接验证：${result.models.join(", ") || "local-model"}。`
        };
        return this.getStatus();
      }
    }
    this.status = {
      ...this.status,
      phase: "error",
      message: "llama-server 已启动，但连接验证超时。",
      error: {
        code: "LLAMA_SERVER_VERIFY_TIMEOUT",
        message: "请稍后手动点击测试连接，或检查模型是否仍在加载。"
      }
    };
    return this.getStatus();
  }
  stopServer() {
    if (this.serverProcess && !this.serverProcess.killed) {
      try {
        this.serverProcess.kill();
      } catch (e) {
      }
      this.serverProcess = null;
    }
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/F", "/IM", "llama-server.exe"], { shell: true });
      } catch (e) {
      }
    }
    this.status = {
      ...this.status,
      phase: "idle",
      message: "llama-server 已停止并释放显存。",
      serverPid: void 0
    };
    return this.getStatus();
  }
  async testServer(baseUrl = "http://127.0.0.1:8080/v1") {
    try {
      const modelsResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
        signal: AbortSignal.timeout(8e3)
      });
      if (!modelsResponse.ok) {
        return { success: false, baseUrl, models: [], chatOk: false, error: { code: "LLAMA_MODELS_FAILED", message: `HTTP ${modelsResponse.status}` } };
      }
      const modelsJson = await modelsResponse.json();
      const models = Array.isArray(modelsJson?.data) ? modelsJson.data.map((item) => String(item.id)).filter(Boolean) : [];
      const chatResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: models[0] ?? "local-model",
          messages: [{ role: "user", content: "Reply with OK." }],
          max_tokens: 8,
          temperature: 0
        }),
        signal: AbortSignal.timeout(15e3)
      });
      return {
        success: chatResponse.ok,
        baseUrl,
        models,
        chatOk: chatResponse.ok,
        error: chatResponse.ok ? void 0 : { code: "LLAMA_CHAT_FAILED", message: `HTTP ${chatResponse.status}` }
      };
    } catch (err) {
      return {
        success: false,
        baseUrl,
        models: [],
        chatOk: false,
        error: {
          code: err?.name === "TimeoutError" ? "LLAMA_SERVER_TIMEOUT" : "LLAMA_SERVER_CONNECTION_FAILED",
          message: sanitizeLlamaLog(err?.message ?? String(err))
        }
      };
    }
  }
  async checkServerHealth(baseUrl = "http://127.0.0.1:8080/v1") {
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    try {
      const modelsResponse = await fetch(`${normalizedBase}/models`, {
        headers: { Authorization: "Bearer local" },
        signal: AbortSignal.timeout(5e3)
      });
      if (!modelsResponse.ok) {
        return { running: false, models: [], error: `HTTP ${modelsResponse.status}` };
      }
      const modelsJson = await modelsResponse.json();
      const models = Array.isArray(modelsJson?.data) ? modelsJson.data.map((item) => String(item.id)).filter(Boolean) : [];
      return { running: true, models };
    } catch (err) {
      return { running: false, models: [], error: sanitizeLlamaLog(err?.message ?? String(err)) };
    }
  }
  async openInstallRoot() {
    const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir ?? path.join(app.getPath("userData"), "AIModels");
    const installRoot = this.status.installRoot ?? path.join(modelRootDir, "llama-runtime");
    await fs$1.mkdir(installRoot, { recursive: true });
    await shell.openPath(installRoot);
  }
  async fetchLatestRelease() {
    try {
      const response = await fetch(LLAMA_RELEASES_API, {
        headers: { "User-Agent": "DesignAssetManager-llama-installer" },
        signal: AbortSignal.timeout(1e4)
      });
      if (!response.ok) return DEFAULT_LLAMA_RELEASE;
      const payload = await response.json();
      return {
        tag_name: payload.tag_name,
        assets: Array.isArray(payload.assets) ? payload.assets.map((asset) => ({
          name: asset.name,
          browser_download_url: asset.browser_download_url,
          size: asset.size
        })) : []
      };
    } catch {
      return DEFAULT_LLAMA_RELEASE;
    }
  }
  async loadMirrorManifest(manifestPath) {
    const candidates = [
      manifestPath,
      process.env.LLAMA_RUNTIME_MIRROR_MANIFEST
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(await fs$1.readFile(candidate, "utf8"));
        if (Array.isArray(parsed.mirrors)) return parsed;
      } catch {
      }
    }
    return void 0;
  }
  runCapture(command, args, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Command timeout"));
      }, timeoutMs);
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else reject(new Error(stderr || `Exit ${code}`));
      });
    });
  }
  async downloadPackage(pkg, targetPath, sender, installId, progressBase) {
    await this.downloadUrl(pkg.mirrorUrl ?? pkg.officialUrl, pkg.officialUrl, targetPath, pkg.checksumSha256, sender, installId, progressBase, `正在下载 ${pkg.filename}。`);
  }
  async downloadUrl(primaryUrl, fallbackUrl, targetPath, checksum, sender, installId, progressBase, message) {
    try {
      await this.downloadOnce(primaryUrl, targetPath, checksum, sender, installId, progressBase, message);
    } catch (err) {
      if (primaryUrl !== fallbackUrl) {
        this.emit(sender, installId, "downloading", progressBase, "镜像下载失败，已回退官方源。");
        await this.downloadOnce(fallbackUrl, targetPath, checksum, sender, installId, progressBase, message);
        return;
      }
      throw err;
    }
  }
  async downloadOnce(url, targetPath, checksum, sender, installId, progressBase, message) {
    const controller = this.abortController;
    if (!controller) throw new Error("安装任务不存在。");
    const formatBytes = (bytes) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };
    if (fs.existsSync(targetPath)) {
      if (checksum) {
        this.emit(sender, installId, "downloading", progressBase, `正在校验已存在的 ${path.basename(targetPath)} 文件...`);
        const isOk = await this.verifyFileChecksum(targetPath, checksum);
        if (isOk) {
          const stats = await fs$1.stat(targetPath).catch(() => null);
          const sizeStr = stats ? ` (${formatBytes(stats.size)})` : "";
          this.emit(sender, installId, "downloading", progressBase + 20, `${message}已存在且校验通过，跳过下载。${sizeStr}`);
          return;
        }
      } else {
        const headResponse = await fetch(url, { method: "HEAD", signal: controller.signal }).catch(() => null);
        if (headResponse && headResponse.ok) {
          const total2 = Number(headResponse.headers.get("content-length") ?? 0);
          if (total2 > 0) {
            const stats = await fs$1.stat(targetPath).catch(() => null);
            if (stats && stats.size === total2) {
              this.emit(sender, installId, "downloading", progressBase + 20, `${message}已存在且大小匹配 (${formatBytes(total2)})，跳过下载。`);
              return;
            }
          }
        }
      }
    }
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`下载失败 HTTP ${response.status}`);
    }
    await fs$1.mkdir(path.dirname(targetPath), { recursive: true });
    const tempPath = `${targetPath}.part`;
    const total = Number(response.headers.get("content-length") ?? 0);
    let downloaded = 0;
    const hash = crypto.createHash("sha256");
    const file = fs.createWriteStream(tempPath);
    const reader = response.body.getReader();
    const startTime = Date.now();
    let lastEmitTime = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          const now22 = Date.now();
          const speed = downloaded / ((now22 - startTime) / 1e3 || 1);
          const formattedSpeed = formatBytes(speed);
          const formattedDownloaded = formatBytes(downloaded);
          const formattedTotal = total > 0 ? formatBytes(total) : "未知大小";
          const detailPercent = total > 0 ? " (100.0%)" : "";
          const progressMsg = `${message}已下载: ${formattedDownloaded} / ${formattedTotal}${detailPercent}，速度: ${formattedSpeed}/s`;
          const percent2 = total > 0 ? progressBase + 20 : progressBase;
          this.emit(sender, installId, "downloading", percent2, progressMsg);
          break;
        }
        if (controller.signal.aborted) throw new Error("安装已取消。");
        const chunk = Buffer.from(value);
        downloaded += chunk.length;
        hash.update(chunk);
        if (!file.write(chunk)) {
          await new Promise((resolve) => file.once("drain", resolve));
        }
        const percent = total > 0 ? progressBase + Math.min(20, Math.round(downloaded / total * 20)) : progressBase;
        const now2 = Date.now();
        if (now2 - lastEmitTime >= 300) {
          lastEmitTime = now2;
          const speed = downloaded / ((now2 - startTime) / 1e3 || 1);
          const formattedSpeed = formatBytes(speed);
          const formattedDownloaded = formatBytes(downloaded);
          const formattedTotal = total > 0 ? formatBytes(total) : "未知大小";
          const detailPercent = total > 0 ? ` (${(downloaded / total * 100).toFixed(1)}%)` : "";
          const progressMsg = `${message}已下载: ${formattedDownloaded} / ${formattedTotal}${detailPercent}，速度: ${formattedSpeed}/s`;
          this.emit(sender, installId, "downloading", percent, progressMsg);
        }
      }
    } finally {
      await new Promise((resolve) => file.end(resolve));
    }
    const digest = hash.digest("hex");
    if (checksum && digest.toLowerCase() !== checksum.toLowerCase()) {
      await fs$1.rm(tempPath, { force: true });
      throw new Error("下载文件 SHA256 校验失败。");
    }
    await fs$1.rename(tempPath, targetPath);
  }
  async verifyFileChecksum(filePath, expectedChecksum) {
    try {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      return new Promise((resolve) => {
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => {
          const digest = hash.digest("hex");
          resolve(digest.toLowerCase() === expectedChecksum.toLowerCase());
        });
        stream.on("error", () => resolve(false));
      });
    } catch {
      return false;
    }
  }
  async extractZip(zipPath, destinationDir) {
    const buffer = await fs$1.readFile(zipPath);
    assertSafeZipEntries(listZipEntries(buffer), destinationDir);
    await fs$1.mkdir(destinationDir, { recursive: true });
    if (process.platform !== "win32") {
      await new Promise((resolve, reject) => {
        const child = spawn("unzip", ["-o", zipPath, "-d", destinationDir], { shell: false });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(sanitizeLlamaLog(stderr || `unzip failed with ${code}`)));
        });
      });
      return;
    }
    await new Promise((resolve, reject) => {
      const powershellCmd = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`;
      const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershellCmd], { shell: false });
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(sanitizeLlamaLog(stderr || `Expand-Archive failed with ${code}`)));
      });
    });
  }
  findServerExecutable(runtimeDir) {
    const executableName = process.platform === "win32" ? "llama-server.exe" : "llama-server";
    const directCandidates = [
      path.join(runtimeDir, executableName),
      path.join(runtimeDir, "bin", executableName),
      path.join(runtimeDir, "build", "bin", executableName)
    ];
    for (const candidate of directCandidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    const stack = [runtimeDir];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.name === executableName) {
          return fullPath;
        }
      }
    }
    return null;
  }
  async updateLlamaBackend(plan, modelPath) {
    const settingsService = SettingsService.getInstance();
    const settings = settingsService.getSettings();
    const defaultBackend = {
      id: "llama-local-openai",
      name: "Llama 本地量化模型服务",
      type: "llama-openai",
      enabled: true,
      baseUrl: plan.baseUrl,
      apiKey: "local",
      defaultModel: path.basename(modelPath),
      timeoutMs: 12e4,
      capabilities: {
        chat: true,
        vision: Boolean(plan.recommendedModel.supportsVision && plan.recommendedModel.mmprojFilename),
        embeddings: false,
        jsonOutput: true,
        modelList: true,
        modelManagement: false
      },
      priority: 50,
      notes: `由 Llama 本地服务安装向导自动配置：${plan.recommendedModel.name}。`
    };
    const current = settings.aiBackends ?? [];
    const next = current.some((backend) => backend.id === defaultBackend.id) ? current.map((backend) => backend.id === defaultBackend.id ? { ...backend, ...defaultBackend } : backend) : [defaultBackend, ...current];
    settingsService.saveSettings({
      modelRootDir: path.dirname(plan.installRoot),
      aiBackends: next,
      promptReverseSettings: {
        ...settings.promptReverseSettings ?? {
          backendMode: "llama-openai",
          maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          maxImageSize: 1024,
          temperature: 0.6,
          topP: 0.9
        },
        backendMode: "llama-openai",
        selectedExternalBackendId: defaultBackend.id,
        selectedExternalModel: defaultBackend.defaultModel
      }
    });
  }
  emit(sender, installId, phase, progress, message, error) {
    const event = {
      installId,
      phase,
      progress,
      message: sanitizeLlamaLog(message),
      error
    };
    this.status = {
      ...this.status,
      installId,
      phase,
      progress,
      message: event.message,
      error
    };
    if (!sender.isDestroyed()) {
      sender.send(llamaRuntimeInstallProgressChannel(installId), event);
    }
  }
}
const llamaRuntimeInstall_service = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LlamaRuntimeInstallService
}, Symbol.toStringTag, { value: "Module" }));
function getDownloadedArtifactState(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return "missing";
  }
  if (fs.existsSync(`${filePath}.aria2`)) {
    return "downloading";
  }
  try {
    return fs.statSync(filePath).size > 0 ? "downloaded" : "missing";
  } catch {
    return "missing";
  }
}
function registerLlamaRuntimeIpc() {
  const service = LlamaRuntimeInstallService.getInstance();
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE, async () => {
    return service.detectHardware();
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN, async (_, request) => {
    return service.createInstallPlan(request?.mirrorManifestPath, request?.modelRootDir, request?.downloadSource);
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_INSTALL, async (event, request) => {
    return service.startInstall(request.plan, event.sender);
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL, async () => {
    return service.cancelInstall();
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_GET_STATUS, async () => {
    const selectedBackend = SettingsService.getInstance().getSettings().aiBackends?.find((backend) => backend.type === "llama-openai" && backend.enabled);
    return service.getStatusWithHealth(selectedBackend?.baseUrl);
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_SERVER, async (_, request) => {
    return service.startServer(request?.plan, request?.modelPath);
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_STOP_SERVER, async () => {
    return service.stopServer();
  });
  ipcMain.handle(CHANNEL_LLAMA_RUNTIME_TEST_SERVER, async (_, request) => {
    return service.testServer(request?.baseUrl);
  });
  ipcMain.handle("llama-runtime:open-install-root", async () => {
    await service.openInstallRoot();
    return { success: true };
  });
  ipcMain.handle("llama-runtime:list-local-models", async () => {
    const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir || path.join(app.getPath("userData"), "AIModels");
    const installRoot = path.join(modelRootDir, "llama-runtime");
    const { QWEN3_VL_GGUF_CANDIDATES: QWEN3_VL_GGUF_CANDIDATES2 } = await Promise.resolve().then(() => llamaRuntimePlanner);
    console.log("[llama-runtime:list-local-models] Using modelRootDir:", modelRootDir);
    console.log("[llama-runtime:list-local-models] Using installRoot:", installRoot);
    return QWEN3_VL_GGUF_CANDIDATES2.map((model) => {
      const modelPath = path.join(installRoot, "models", "gguf", model.id, model.filename);
      const mmprojPath = model.mmprojFilename ? path.join(installRoot, "models", "gguf", model.id, model.mmprojFilename) : "";
      const ggufState = getDownloadedArtifactState(modelPath);
      const mmprojState = mmprojPath ? getDownloadedArtifactState(mmprojPath) : "downloaded";
      const ggufExists = ggufState === "downloaded";
      const mmprojExists = mmprojState === "downloaded";
      const isDownloaded = ggufExists && mmprojExists;
      const isDownloading = ggufState === "downloading" || mmprojState === "downloading";
      console.log(`[llama-runtime:list-local-models] Candidate model: ${model.id}`);
      console.log(`  GGUF path: ${modelPath} (Exists: ${ggufExists})`);
      console.log(`  mmproj path: ${mmprojPath || "None"} (Exists: ${mmprojExists})`);
      console.log(`  Final isDownloaded: ${isDownloaded}`);
      return {
        ...model,
        modelPath,
        isDownloaded,
        isDownloading,
        ggufDownloadState: ggufState,
        mmprojDownloadState: mmprojState
      };
    });
  });
  ipcMain.handle("llama-runtime:health-check", async (_, request) => {
    return service.checkServerHealth(request?.baseUrl);
  });
}
const CHANNEL_DOCTOR_RUN_ALL = "doctor:runAll";
const CHANNEL_DOCTOR_RUN_CHECKS = "doctor:runChecks";
const CHANNEL_DOCTOR_GET_LAST_REPORT = "doctor:getLastReport";
const CHANNEL_DOCTOR_CLEAR_LAST_REPORT = "doctor:clearLastReport";
const CHANNEL_DOCTOR_RUN_CHECK = "doctor:runCheck";
const CHANNEL_DOCTOR_LIST_CHECKS = "doctor:listChecks";
const CHANNEL_DOCTOR_REPAIR_CHECK = "doctor:repairCheck";
class DoctorCacheService {
  lastReport = null;
  lastRunAt = null;
  setLastReport(report) {
    this.lastReport = report;
    this.lastRunAt = report.generatedAt;
  }
  getLastReport() {
    return this.lastReport;
  }
  clear() {
    this.lastReport = null;
    this.lastRunAt = null;
  }
  getLastRunAt() {
    return this.lastRunAt;
  }
  isStale(maxAgeMs) {
    if (!this.lastRunAt) return true;
    const timestamp2 = Date.parse(this.lastRunAt);
    if (!Number.isFinite(timestamp2)) return true;
    return Date.now() - timestamp2 > maxAgeMs;
  }
}
class DoctorLogService {
  logReportSummary(report) {
    console.log(
      `[DoctorService] Report ${report.id} completed with ${report.overallStatus}. Checks: ${report.checks.length}.`
    );
  }
  logCheckFailure(check) {
    console.warn(`[DoctorService] Check ${check.id} reported ${check.status}: ${check.message}`);
  }
  logDoctorError(error) {
    console.error("[DoctorService] Unexpected Doctor service error:", error);
  }
}
const aiWorkerCheck = {
  id: "ai-worker",
  label: "AI Worker reachability",
  async run(context) {
    const startedAt = Date.now();
    const config = context.aiWorkerConfig ?? {
      baseUrl: "http://127.0.0.1:8000",
      healthPath: "/health",
      timeoutMs: Math.min(context.timeoutMs, 2e3)
    };
    const url = `${config.baseUrl.replace(/\/$/, "")}${config.healthPath}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(config.timeoutMs ?? 2e3) });
      return {
        id: this.id,
        label: this.label,
        status: response.ok ? "ok" : "warning",
        message: response.ok ? "AI Worker health endpoint is reachable." : `AI Worker health endpoint returned HTTP ${response.status}.`,
        details: { url, status: response.status },
        fixSuggestion: response.ok ? void 0 : "Start or configure the AI Worker manually; Doctor will not start it.",
        durationMs: Date.now() - startedAt
      };
    } catch (err) {
      return {
        id: this.id,
        label: this.label,
        status: "warning",
        message: "AI Worker health endpoint is not reachable.",
        details: { url, error: err instanceof Error ? err.message : String(err) },
        fixSuggestion: "Start or configure the AI Worker manually; Doctor will not start it.",
        durationMs: Date.now() - startedAt
      };
    }
  }
};
async function defaultImporter(name) {
  return import(name);
}
async function importDependency(name, importer) {
  try {
    await importer(name);
    return { available: true };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function createNativeDepsCheck(importer = defaultImporter) {
  return {
    id: "native-deps",
    label: "Native dependencies",
    async run() {
      const startedAt = Date.now();
      const betterSqlite3 = await importDependency("better-sqlite3", importer);
      const sharp2 = await importDependency("sharp", importer);
      const status = betterSqlite3.available && sharp2.available ? "ok" : "warning";
      return {
        id: this.id,
        label: this.label,
        status,
        message: status === "ok" ? "Native dependencies are importable." : "One or more native dependencies failed to import.",
        details: { betterSqlite3, sharp: sharp2 },
        fixSuggestion: status === "ok" ? void 0 : "Run the project native dependency rebuild/install flow manually; Doctor will not rebuild automatically.",
        durationMs: Date.now() - startedAt
      };
    }
  };
}
const nativeDepsCheck = createNativeDepsCheck();
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    });
    const timeout = options.timeoutMs ? setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs) : null;
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut
      });
    });
  });
}
async function versionFor(command, args, timeoutMs) {
  try {
    const result = await runProcess(command, args, { timeoutMs });
    return {
      available: result.exitCode === 0,
      exitCode: result.exitCode,
      version: (result.stdout || result.stderr).trim(),
      timedOut: result.timedOut
    };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
const nodeCheck = {
  id: "node",
  label: "Node and npm",
  async run(context) {
    const startedAt = Date.now();
    const timeoutMs = Math.min(context.timeoutMs, 5e3);
    const isPackagedElectron = Boolean(process.versions.electron && !process.defaultApp);
    const node = process.versions.node ? {
      available: true,
      version: `v${process.versions.node}`,
      source: isPackagedElectron ? "bundled-electron-node" : "current-process"
    } : await versionFor(process.execPath, ["--version"], timeoutMs);
    const npmExecPath = process.env.npm_execpath;
    const npm = npmExecPath ? await versionFor(process.execPath, [npmExecPath, "--version"], timeoutMs) : isPackagedElectron ? {
      available: true,
      skipped: true,
      reason: "Packaged Electron app uses bundled Node; npm CLI is not required at runtime."
    } : await versionFor(context.platformInfo.isWindows ? "npm.cmd" : "npm", ["--version"], timeoutMs);
    const status = node.available && npm.available ? "ok" : "warning";
    return {
      id: this.id,
      label: this.label,
      status,
      message: status === "ok" ? isPackagedElectron ? "Electron 内置 Node 运行时可用，打包版本不需要用户安装 npm。" : "Node and npm are available." : "Node or npm could not be detected.",
      details: { node, npm },
      fixSuggestion: status === "ok" ? void 0 : "点击一键修复会切换到打包版内置 Node 检测并重新体检；开发环境请确认 npm 在 PATH 中。",
      durationMs: Date.now() - startedAt
    };
  }
};
function resolveCachePaths(managedPaths) {
  const cacheDir = path.resolve(managedPaths.cacheDir);
  const tempDir = path.resolve(managedPaths.tempDir);
  return {
    cacheDir,
    tempDir,
    diagnosticCacheDir: ensureSafeJoin(cacheDir, "diagnostic"),
    thumbnailCacheDir: ensureSafeJoin(cacheDir, "thumbnail"),
    aiRuntimeCacheDir: ensureSafeJoin(cacheDir, "ai-runtime"),
    doctorTempDir: ensureSafeJoin(tempDir, "doctor"),
    bootstrapTempDir: ensureSafeJoin(tempDir, "bootstrap"),
    settingsMigrationTempDir: ensureSafeJoin(tempDir, "settings-migration"),
    testTempDir: ensureSafeJoin(tempDir, "test")
  };
}
function resolveTempPaths(managedPaths) {
  return resolveCachePaths(managedPaths);
}
function assertSafeCachePath(targetPath, managedPaths) {
  const cacheDir = path.resolve(managedPaths.cacheDir);
  const resolvedTarget = path.resolve(targetPath);
  assertInsideManagedRoot(cacheDir, resolvedTarget);
  return {
    path: resolvedTarget,
    rootDir: cacheDir,
    isInsideManagedRoot: true,
    kind: "cache"
  };
}
function assertSafeTempPath(targetPath, managedPaths) {
  const tempDir = path.resolve(managedPaths.tempDir);
  const resolvedTarget = path.resolve(targetPath);
  assertInsideManagedRoot(tempDir, resolvedTarget);
  return {
    path: resolvedTarget,
    rootDir: tempDir,
    isInsideManagedRoot: true,
    kind: "temp"
  };
}
const WINDOWS_DRIVE_PATTERN = /[A-Za-z]:[\\/]/;
const WINDOWS_APPDATA_PATTERN = /(?:^|[\\/])AppData(?:[\\/]|$)/i;
const WINDOWS_BACKSLASH_PATTERN = /\\/;
const MAC_USERS_PATTERN = /^\/Users\//;
const MAC_APPLICATIONS_PATTERN = /^\/Applications(?:\/|$)/;
const MAC_USR_LOCAL_PATTERN = /^\/usr\/local(?:\/|$)/;
const MAC_LIBRARY_PATTERN = /^(?:~\/Library|\/Users\/[^/]+\/Library)(?:\/|$)/;
const ILLEGAL_FILENAME_SEGMENT_CHARS = /[<>:"|?*\x00-\x1F]/;
function detectHardcodedPathPattern(value) {
  const patterns = [];
  const hasWindowsDrive = WINDOWS_DRIVE_PATTERN.test(value);
  const hasWindowsAppData = WINDOWS_APPDATA_PATTERN.test(value);
  const hasWindowsBackslash = WINDOWS_BACKSLASH_PATTERN.test(value);
  const hasMacUsersPath = MAC_USERS_PATTERN.test(value);
  const hasMacApplicationsPath = MAC_APPLICATIONS_PATTERN.test(value);
  const hasMacUsrLocalPath = MAC_USR_LOCAL_PATTERN.test(value);
  const hasMacLibraryPath = MAC_LIBRARY_PATTERN.test(value);
  if (hasWindowsDrive) patterns.push("windows-drive");
  if (hasWindowsAppData) patterns.push("windows-appdata");
  if (hasWindowsBackslash) patterns.push("windows-backslash");
  if (hasMacUsersPath) patterns.push("macos-users");
  if (hasMacApplicationsPath) patterns.push("macos-applications");
  if (hasMacUsrLocalPath) patterns.push("macos-usr-local");
  if (hasMacLibraryPath) patterns.push("macos-library");
  return {
    hasWindowsDrive,
    hasWindowsAppData,
    hasWindowsBackslash,
    hasMacUsersPath,
    hasMacApplicationsPath,
    hasMacUsrLocalPath,
    hasMacLibraryPath,
    patterns
  };
}
async function auditPathSafety(pathValue, options = {}) {
  const key = options.key?.toString() ?? "path";
  const warnings = [];
  const blockingIssues = [];
  const recommendations = [];
  const trimmed = pathValue?.trim() ?? "";
  const isEmpty = trimmed.length === 0;
  const isAbsolute = !isEmpty && (path.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed) || path.posix.isAbsolute(trimmed));
  const hardcodedPatterns = detectHardcodedPathPattern(trimmed);
  const hasPathTraversal = containsPathTraversal(trimmed);
  const hasIllegalFilenameChars = containsIllegalFilenameChars(trimmed);
  const isInsideUserDataDir = !isEmpty && options.userDataDir ? isInsideDirectory(options.userDataDir, trimmed) : null;
  const isInsideManagedRoot = !isEmpty && options.managedRoot ? isInsideDirectory(options.managedRoot, trimmed) : null;
  if (isEmpty) {
    blockingIssues.push(`${key} is empty.`);
  }
  if (!isEmpty && !isAbsolute) {
    warnings.push(`${key} is not an absolute path.`);
    recommendations.push(`Resolve ${key} through path-resolver before use.`);
  }
  if (isInsideUserDataDir === false && !options.allowOutsideUserDataDir) {
    warnings.push(`${key} is outside userDataDir.`);
  }
  if (isInsideManagedRoot === false) {
    blockingIssues.push(`${key} is outside the managed root.`);
  }
  if (hasPathTraversal) {
    blockingIssues.push(`${key} contains path traversal segments.`);
  }
  if (hasIllegalFilenameChars) {
    warnings.push(`${key} contains characters that are illegal in Windows filename segments.`);
  }
  if (hardcodedPatterns.hasWindowsDrive || hardcodedPatterns.hasWindowsAppData || hardcodedPatterns.hasWindowsBackslash) {
    warnings.push(`${key} contains Windows-specific path patterns.`);
  }
  if (hardcodedPatterns.hasMacUsersPath || hardcodedPatterns.hasMacApplicationsPath || hardcodedPatterns.hasMacUsrLocalPath || hardcodedPatterns.hasMacLibraryPath) {
    warnings.push(`${key} contains macOS-specific path patterns.`);
  }
  let isWritable;
  if (options.checkWritable) {
    isWritable = await probeWritablePath(trimmed, options);
    if (!isWritable) {
      warnings.push(`${key} is not writable through the controlled audit probe.`);
      recommendations.push(`Check OS permissions for ${key}.`);
    }
  }
  const status = blockingIssues.length > 0 ? "error" : warnings.length > 0 ? "warning" : "ok";
  return {
    key,
    path: trimmed,
    status,
    isEmpty,
    isAbsolute,
    isInsideUserDataDir,
    isInsideManagedRoot,
    isWritable,
    hasPathTraversal,
    hasIllegalFilenameChars,
    hardcodedPatterns,
    warnings,
    blockingIssues,
    recommendations
  };
}
async function auditManagedPaths(managedPaths, options = {}) {
  const platformInfo = detectPlatform();
  const entries = Object.entries(managedPaths);
  const checkedPaths = await Promise.all(
    entries.map(
      ([key, value]) => auditPathSafety(value, {
        key,
        userDataDir: managedPaths.userDataDir,
        managedRoot: key === "tempDir" || key === "downloadsDir" ? value : managedPaths.userDataDir,
        checkWritable: options.checkWritable,
        writableProbeRoot: options.writableProbeRoot,
        allowOutsideUserDataDir: key === "tempDir" || key === "downloadsDir"
      })
    )
  );
  const warnings = checkedPaths.flatMap((item) => item.warnings);
  const blockingIssues = checkedPaths.flatMap((item) => item.blockingIssues);
  const recommendations = [...new Set(checkedPaths.flatMap((item) => item.recommendations))];
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    platform: platformInfo.platform,
    arch: platformInfo.arch,
    checkedPaths,
    warnings,
    blockingIssues,
    recommendations
  };
}
function summarizeManagedPathAudit(report) {
  return {
    checkedPathCount: report.checkedPaths.length,
    okCount: report.checkedPaths.filter((item) => item.status === "ok").length,
    warningCount: report.checkedPaths.filter((item) => item.status === "warning").length,
    errorCount: report.checkedPaths.filter((item) => item.status === "error").length,
    warnings: report.warnings,
    blockingIssues: report.blockingIssues,
    recommendations: report.recommendations
  };
}
function containsPathTraversal(pathValue) {
  return pathValue.split(/[\\/]+/).some((segment) => segment === "..");
}
function containsIllegalFilenameChars(pathValue) {
  return pathValue.split(/[\\/]+/).some((segment) => {
    if (!segment || segment === "." || segment === "..") return false;
    if (/^[A-Za-z]:$/.test(segment)) return false;
    return ILLEGAL_FILENAME_SEGMENT_CHARS.test(segment);
  });
}
async function probeWritablePath(pathValue, options) {
  if (!pathValue || !options.writableProbeRoot) return false;
  try {
    const probeRoot = path.resolve(options.writableProbeRoot);
    const probeDir = ensureSafeJoin(probeRoot, "managed-path-audit");
    const probeFile = ensureSafeJoin(probeDir, `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    await fs$1.mkdir(probeDir, { recursive: true });
    await fs$1.writeFile(probeFile, "audit", "utf8");
    await fs$1.unlink(probeFile);
    return true;
  } catch {
    return false;
  }
}
async function pathState(pathValue) {
  try {
    const stat = await fs$1.stat(pathValue);
    return { path: pathValue, exists: true, isDirectory: stat.isDirectory() };
  } catch {
    return { path: pathValue, exists: false, isDirectory: false };
  }
}
const pathCheck = {
  id: "path",
  label: "Managed paths",
  async run(context) {
    const startedAt = Date.now();
    const entries = Object.entries(context.managedPaths);
    const paths = Object.fromEntries(
      await Promise.all(entries.map(async ([key, value]) => [key, await pathState(value)]))
    );
    const audit = await auditManagedPaths(context.managedPaths);
    const auditSummary = summarizeManagedPathAudit(audit);
    const logPaths = resolveLogPaths(context.managedPaths);
    const cachePaths = resolveCachePaths(context.managedPaths);
    const tempPaths = resolveTempPaths(context.managedPaths);
    const logPathDiagnostics = {
      logsDir: {
        path: logPaths.logsDir,
        isInsideManagedLogsRoot: assertSafeLogPath(logPaths.logsDir, context.managedPaths).isInsideLogsDir
      },
      debugDir: {
        path: logPaths.debugDir,
        isInsideManagedLogsRoot: assertSafeLogPath(logPaths.debugDir, context.managedPaths).isInsideLogsDir
      }
    };
    const cacheTempDiagnostics = {
      cacheDir: {
        path: cachePaths.cacheDir,
        isInsideManagedCacheRoot: assertSafeCachePath(cachePaths.cacheDir, context.managedPaths).isInsideManagedRoot
      },
      tempDir: {
        path: tempPaths.tempDir,
        isInsideManagedTempRoot: assertSafeTempPath(tempPaths.tempDir, context.managedPaths).isInsideManagedRoot
      },
      diagnosticCacheDir: {
        path: cachePaths.diagnosticCacheDir,
        isInsideManagedCacheRoot: assertSafeCachePath(cachePaths.diagnosticCacheDir, context.managedPaths).isInsideManagedRoot
      },
      testTempDir: {
        path: tempPaths.testTempDir,
        isInsideManagedTempRoot: assertSafeTempPath(tempPaths.testTempDir, context.managedPaths).isInsideManagedRoot
      }
    };
    const status = auditSummary.errorCount > 0 ? "warning" : "ok";
    return {
      id: this.id,
      label: this.label,
      status,
      message: status === "ok" ? "Managed paths resolved." : "Managed paths resolved with blocking audit issues.",
      details: { paths, audit: auditSummary, logPaths: logPathDiagnostics, cacheTempPaths: cacheTempDiagnostics },
      fixSuggestion: status === "ok" ? void 0 : "Review managed path metadata and prefer path-resolver managed directories.",
      durationMs: Date.now() - startedAt
    };
  }
};
async function checkWritable(root, label) {
  const testDir = path.join(root, "doctor-permission-check");
  const testFile = path.join(testDir, `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    assertInsideManagedRoot(root, testDir);
    await ensureDirectory(testDir);
    await fs$1.writeFile(testFile, "doctor", "utf8");
    assertInsideManagedRoot(root, testFile);
    await fs$1.unlink(testFile);
    await safeRemoveInsideRoot(root, testDir);
    return { label, path: root, writable: true };
  } catch (err) {
    return {
      label,
      path: root,
      writable: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
const permissionCheck = {
  id: "permission",
  label: "Managed path permissions",
  async run(context) {
    const startedAt = Date.now();
    const paths = [
      ["userDataDir", context.managedPaths.userDataDir],
      ["logsDir", context.managedPaths.logsDir],
      ["cacheDir", context.managedPaths.cacheDir],
      ["databaseDir", context.managedPaths.databaseDir],
      ["tempDir", context.managedPaths.tempDir]
    ];
    const results = await Promise.all(paths.map(([label, dir]) => checkWritable(dir, label)));
    const logPaths = resolveLogPaths(context.managedPaths);
    const logPathResults = await Promise.all([
      checkWritable(logPaths.logsDir, "logsDir"),
      checkWritable(logPaths.debugDir, "debugDir")
    ]);
    const cachePaths = resolveCachePaths(context.managedPaths);
    const tempPaths = resolveTempPaths(context.managedPaths);
    const cacheTempResults = await Promise.all([
      checkWritable(cachePaths.cacheDir, "cacheDir"),
      checkWritable(tempPaths.tempDir, "tempDir"),
      checkWritable(cachePaths.diagnosticCacheDir, "diagnosticCacheDir"),
      checkWritable(tempPaths.testTempDir, "testTempDir")
    ]);
    const audit = await auditManagedPaths(context.managedPaths, {
      checkWritable: true,
      writableProbeRoot: path.join(context.managedPaths.tempDir, "doctor-managed-path-audit")
    });
    const auditSummary = summarizeManagedPathAudit(audit);
    const status = [...results, ...logPathResults, ...cacheTempResults].every((item) => item.writable) && auditSummary.errorCount === 0 ? "ok" : "warning";
    return {
      id: this.id,
      label: this.label,
      status,
      message: status === "ok" ? "Managed paths are writable." : "One or more managed paths are not writable.",
      details: { paths: results, logPaths: logPathResults, cacheTempPaths: cacheTempResults, audit: auditSummary },
      fixSuggestion: status === "ok" ? void 0 : "Choose writable app-managed directories or fix OS permissions.",
      durationMs: Date.now() - startedAt
    };
  }
};
async function probePort(port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ port, reachable: true, occupied: true }));
    socket.once("timeout", () => finish({ port, reachable: false, occupied: false, timedOut: true }));
    socket.once("error", (err) => {
      finish({ port, reachable: false, occupied: false, code: err.code });
    });
  });
}
const portCheck = {
  id: "port",
  label: "Local service ports",
  async run(context) {
    const startedAt = Date.now();
    const timeoutMs = Math.min(context.timeoutMs, 1500);
    const ports = await Promise.all([8e3, 8080, 11434, 1234].map((port) => probePort(port, timeoutMs)));
    const aiWorkerPort = ports.find((item) => item.port === 8e3);
    const status = aiWorkerPort?.occupied ? "warning" : "warning";
    return {
      id: this.id,
      label: this.label,
      status,
      message: aiWorkerPort?.occupied ? "Default AI Worker port appears occupied." : "Default AI Worker port is not reachable.",
      details: { ports },
      fixSuggestion: aiWorkerPort?.occupied ? "Confirm whether the process on port 8000 is the intended AI Worker." : "Start the AI Worker manually if local AI features are expected.",
      durationMs: Date.now() - startedAt
    };
  }
};
async function defaultCheckCommand(command, args, timeoutMs) {
  try {
    const result = await runProcess(command, args, { timeoutMs });
    return {
      available: result.exitCode === 0,
      exitCode: result.exitCode,
      version: (result.stdout || result.stderr).trim(),
      timedOut: result.timedOut
    };
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function createPythonCheck(checkCommand = defaultCheckCommand) {
  return {
    id: "python",
    label: "Python runtime",
    async run(context) {
      const startedAt = Date.now();
      const timeoutMs = Math.min(context.timeoutMs, 5e3);
      const python = await checkCommand("python", ["--version"], timeoutMs);
      const python3 = await checkCommand("python3", ["--version"], timeoutMs);
      const pyLauncher = context.platformInfo.isWindows ? await checkCommand("py", ["--version"], timeoutMs) : { available: false, skipped: true, reason: "py launcher is Windows-only." };
      const pip = await checkCommand("python", ["-m", "pip", "--version"], timeoutMs);
      const anyPython = python.available || python3.available || pyLauncher.available;
      return {
        id: this.id,
        label: this.label,
        status: anyPython ? "ok" : "warning",
        message: anyPython ? "Python runtime detected." : "Python runtime was not detected.",
        details: { python, python3, pyLauncher, pip },
        fixSuggestion: anyPython ? void 0 : "Configure a managed Python runtime or install Python separately; Doctor will not install it.",
        durationMs: Date.now() - startedAt
      };
    }
  };
}
const pythonCheck = createPythonCheck();
async function getElectronDetails() {
  try {
    const electron = await import("electron");
    const app2 = electron.app;
    return {
      electronImportable: true,
      appAvailable: Boolean(app2),
      packaged: app2 ? app2.isPackaged : null
    };
  } catch (err) {
    return {
      electronImportable: false,
      appAvailable: false,
      packaged: null,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
const systemCheck = {
  id: "system",
  label: "System environment",
  async run(context) {
    const startedAt = Date.now();
    const electron = await getElectronDetails();
    const details = {
      platform: context.platformInfo.platform,
      arch: context.platformInfo.arch,
      profile: context.platformInfo.profile,
      nodeVersion: process.version,
      cwd: process.cwd(),
      electron
    };
    return {
      id: this.id,
      label: this.label,
      status: "ok",
      message: `Detected ${context.platformInfo.profile} on Node ${process.version}.`,
      details,
      durationMs: Date.now() - startedAt
    };
  }
};
const DEFAULT_TIMEOUT_MS = 5e3;
const DEFAULT_DOCTOR_CHECKS = [
  systemCheck,
  pathCheck,
  nodeCheck,
  pythonCheck,
  portCheck,
  nativeDepsCheck,
  aiWorkerCheck,
  permissionCheck
];
function aggregateDoctorStatus(checks) {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "ok";
}
function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
class EnvironmentDoctor {
  checks;
  constructor(checks = DEFAULT_DOCTOR_CHECKS) {
    this.checks = new Map(checks.map((check) => [check.id, check]));
  }
  listChecks() {
    return [...this.checks.values()];
  }
  async runAllChecks(options = {}) {
    return this.runChecks([...this.checks.keys()], options);
  }
  async runCheckById(id, options = {}) {
    const context = this.createContext(options);
    return this.runOne(id, context);
  }
  async runChecks(checkIds, options = {}) {
    const context = this.createContext(options);
    const checks = await Promise.all(checkIds.map((id) => this.runOne(id, context)));
    return {
      id: `doctor-${crypto.randomUUID()}`,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      platform: context.platformInfo.platform,
      arch: context.platformInfo.arch,
      profile: context.platformInfo.profile,
      overallStatus: aggregateDoctorStatus(checks),
      checks
    };
  }
  createContext(options) {
    const platformInfo = options.context?.platformInfo ?? detectPlatform();
    const managedPaths = options.context?.managedPaths ?? resolveManagedPaths();
    return {
      platformInfo,
      managedPaths,
      settingsSnapshot: options.context?.settingsSnapshot,
      aiWorkerConfig: options.context?.aiWorkerConfig ?? {
        baseUrl: "http://127.0.0.1:8000",
        healthPath: "/health",
        timeoutMs: Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 2e3)
      },
      timeoutMs: options.timeoutMs ?? options.context?.timeoutMs ?? DEFAULT_TIMEOUT_MS
    };
  }
  async runOne(id, context) {
    const check = this.checks.get(id);
    const startedAt = Date.now();
    if (!check) {
      return {
        id,
        label: id,
        status: "skipped",
        message: `Doctor check '${id}' is not registered.`,
        durationMs: Date.now() - startedAt
      };
    }
    try {
      return await withTimeout(check.run(context), context.timeoutMs, check.id);
    } catch (err) {
      return {
        id: check.id,
        label: check.label,
        status: "error",
        message: `Doctor check failed: ${err instanceof Error ? err.message : String(err)}`,
        details: { error: err instanceof Error ? err.stack ?? err.message : String(err) },
        durationMs: Date.now() - startedAt
      };
    }
  }
}
class DoctorService {
  static instance;
  doctor;
  cache;
  logger;
  constructor(options = {}) {
    this.doctor = options.doctor ?? new EnvironmentDoctor();
    this.cache = options.cache ?? new DoctorCacheService();
    this.logger = options.logger ?? new DoctorLogService();
  }
  static getInstance() {
    if (!DoctorService.instance) {
      DoctorService.instance = new DoctorService();
    }
    return DoctorService.instance;
  }
  async runAll(options) {
    return this.captureReport(() => this.doctor.runAllChecks(options));
  }
  async runChecks(checkIds, options) {
    return this.captureReport(() => this.doctor.runChecks(checkIds, options));
  }
  async runCheck(checkId, options) {
    const check = await this.doctor.runCheckById(checkId, options);
    if (check.status === "error") {
      this.logger.logCheckFailure(check);
    }
    return check;
  }
  async repairCheck(checkId, options) {
    const repair = await this.applyRepair(checkId);
    const check = await this.runCheck(checkId, options);
    return { check, repair };
  }
  getLastReport() {
    return this.cache.getLastReport();
  }
  clearLastReport() {
    this.cache.clear();
  }
  getLastRunAt() {
    return this.cache.getLastRunAt();
  }
  listChecks() {
    return this.doctor.listChecks();
  }
  async applyRepair(checkId) {
    if (checkId === "path" || checkId === "permission") {
      const managedPaths = resolveManagedPaths();
      await Promise.all(Object.values(managedPaths).map((dir) => ensureDirectory(dir)));
      return {
        checkId,
        action: "ensure-managed-directories",
        changed: true,
        message: "已创建或确认应用托管目录，随后自动重检该项目。"
      };
    }
    if (checkId === "node") {
      return {
        checkId,
        action: "use-bundled-electron-node",
        changed: false,
        message: "已使用软件内置 Electron Node 运行时重新检测；打包版无需用户安装 npm。"
      };
    }
    if (checkId === "native-deps") {
      return {
        checkId,
        action: "verify-packaged-native-dependencies",
        changed: false,
        message: "已重新验证打包内原生依赖；如仍失败，请重新安装最新软件包。"
      };
    }
    if (checkId === "ai-worker" || checkId === "port") {
      return {
        checkId,
        action: "refresh-local-service-state",
        changed: false,
        message: "已刷新本地服务状态；如 AI Worker 未启动，请在 AI 控制台启动或配置对应服务。"
      };
    }
    return {
      checkId,
      action: "rerun-check",
      changed: false,
      message: "该检测项无需写入修复，已自动重检。"
    };
  }
  async captureReport(run) {
    try {
      const report = await run();
      this.cache.setLastReport(report);
      this.logger.logReportSummary(report);
      for (const check of report.checks) {
        if (check.status === "error") {
          this.logger.logCheckFailure(check);
        }
      }
      return report;
    } catch (error) {
      this.logger.logDoctorError(error);
      throw error;
    }
  }
}
function errorResponse(error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
function registerDoctorIpc() {
  const service = DoctorService.getInstance();
  ipcMain.handle(CHANNEL_DOCTOR_RUN_ALL, async (_, request) => {
    try {
      const report = await service.runAll({ timeoutMs: request?.timeoutMs });
      return { success: true, report };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_ALL} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_RUN_CHECKS, async (_, request) => {
    try {
      const report = await service.runChecks(request?.checkIds ?? [], { timeoutMs: request?.timeoutMs });
      return { success: true, report };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_CHECKS} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_RUN_CHECK, async (_, request) => {
    try {
      const check = await service.runCheck(request.checkId, { timeoutMs: request.timeoutMs });
      return { success: true, check };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_RUN_CHECK} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_REPAIR_CHECK, async (_, request) => {
    try {
      const result = await service.repairCheck(request.checkId, { timeoutMs: request.timeoutMs });
      return { success: true, ...result };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_REPAIR_CHECK} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_GET_LAST_REPORT, async () => {
    try {
      return { success: true, report: service.getLastReport() };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_GET_LAST_REPORT} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_CLEAR_LAST_REPORT, async () => {
    try {
      service.clearLastReport();
      return { success: true };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_CLEAR_LAST_REPORT} error:`, err);
      return errorResponse(err);
    }
  });
  ipcMain.handle(CHANNEL_DOCTOR_LIST_CHECKS, async () => {
    try {
      return {
        success: true,
        checks: service.listChecks().map((check) => ({ id: check.id, label: check.label }))
      };
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_DOCTOR_LIST_CHECKS} error:`, err);
      return errorResponse(err);
    }
  });
}
const CHANNEL_AI_RUNTIME_LIST_RUNTIMES = "aiRuntime:listRuntimes";
const CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE = "aiRuntime:getRuntimeState";
const CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME = "aiRuntime:getActiveRuntime";
const CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES = "aiRuntime:getMacOSCapabilities";
const CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS = "aiRuntime:getPythonMpsStatus";
const CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS = "aiRuntime:getClipSiglipOnnxStatus";
const CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME = "aiRuntime:selectActiveRuntime";
const CHANNEL_AI_RUNTIME_START_RUNTIME = "aiRuntime:startRuntime";
const CHANNEL_AI_RUNTIME_STOP_RUNTIME = "aiRuntime:stopRuntime";
const CHANNEL_AI_RUNTIME_RESTART_RUNTIME = "aiRuntime:restartRuntime";
const CHANNEL_AI_RUNTIME_HEALTH_CHECK = "aiRuntime:healthCheck";
const CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL = "aiRuntime:healthCheckAll";
const CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG = "aiRuntime:updateRuntimeConfig";
function platformLaneStatus(platform, arch, preferred) {
  if (platform !== "darwin") return "unavailable";
  if (preferred === "apple-silicon" && arch !== "arm64") return "fallback";
  return "planned";
}
function capability(id, label, status, role, modelFamily, backend) {
  return { id, label, status, role, modelFamily, backend };
}
function createMacOSAiBranchRuntimeMetadata(platform, arch) {
  const isMacOS = platform === "darwin";
  const isAppleSilicon = isMacOS && arch === "arm64";
  const mpsStatus = platformLaneStatus(platform, arch, "apple-silicon");
  const onnxStatus = platformLaneStatus(platform, arch, "macos");
  const llamaStatus = platformLaneStatus(platform, arch, "macos");
  const lanes = [
    {
      id: "python-mps",
      label: "Python MPS Runtime",
      status: mpsStatus,
      summary: "Optional PyTorch MPS route for RAM++, Florence-2, CLIP/SigLIP, with CPU fallback.",
      fallbackCapabilityIds: ["python-mps.cpu-fallback"],
      capabilities: [
        capability("python-mps.ram-plus", "RAM++ optional", isAppleSilicon ? "optional" : mpsStatus, "tagging", "RAM++", "PyTorch MPS"),
        capability("python-mps.florence-2", "Florence-2 optional", isAppleSilicon ? "optional" : mpsStatus, "tagging", "Florence-2", "PyTorch MPS"),
        capability("python-mps.clip-siglip", "CLIP/SigLIP optional", isAppleSilicon ? "optional" : mpsStatus, "embedding", "CLIP/SigLIP", "PyTorch MPS"),
        capability("python-mps.cpu-fallback", "CPU fallback", isMacOS ? "fallback" : "unavailable", "fallback", void 0, "CPU")
      ]
    },
    {
      id: "onnx-runtime",
      label: "ONNX Runtime",
      status: onnxStatus,
      summary: "ONNX lane for WD14, RapidOCR, PaddleOCR ONNX, CLIP/SigLIP ONNX, with CoreML or CPU fallback.",
      fallbackCapabilityIds: ["onnx-runtime.coreml-fallback", "onnx-runtime.cpu-fallback"],
      capabilities: [
        capability("onnx-runtime.wd14", "WD14 Tagger", isMacOS ? "optional" : "unavailable", "tagging", "WD14", "ONNX Runtime"),
        capability("onnx-runtime.rapidocr", "RapidOCR", isMacOS ? "optional" : "unavailable", "ocr", "RapidOCR", "ONNX Runtime"),
        capability("onnx-runtime.paddleocr", "PaddleOCR ONNX", isMacOS ? "planned" : "unavailable", "ocr", "PaddleOCR", "ONNX Runtime"),
        capability("onnx-runtime.clip-siglip", "CLIP/SigLIP ONNX", isMacOS ? "planned" : "unavailable", "embedding", "CLIP/SigLIP", "ONNX Runtime"),
        capability("onnx-runtime.coreml-fallback", "CoreML fallback", isAppleSilicon ? "planned" : "fallback", "fallback", void 0, "CoreML"),
        capability("onnx-runtime.cpu-fallback", "CPU fallback", isMacOS ? "fallback" : "unavailable", "fallback", void 0, "CPU")
      ]
    },
    {
      id: "llama",
      label: "Llama",
      status: llamaStatus,
      summary: "Large vision route for Qwen3-VL GGUF/MLX, Qwen2.5-VL Ollama fallback, and external HTTP fallback.",
      fallbackCapabilityIds: ["llama.qwen25-vl-ollama", "llama.external-http"],
      capabilities: [
        capability("llama.qwen3-vl-gguf", "Qwen3-VL GGUF", isMacOS ? "planned" : "unavailable", "prompt-reverse", "Qwen3-VL", "llama.cpp Metal"),
        capability("llama.qwen3-vl-mlx", "Qwen3-VL MLX", isAppleSilicon ? "planned" : "fallback", "prompt-reverse", "Qwen3-VL", "MLX"),
        capability("llama.qwen25-vl-ollama", "Qwen2.5-VL Ollama fallback", isMacOS ? "fallback" : "unavailable", "prompt-reverse", "Qwen2.5-VL", "Ollama"),
        capability("llama.external-http", "external HTTP fallback", "fallback", "fallback", void 0, "OpenAI-compatible HTTP")
      ]
    }
  ];
  return {
    marker: "macos-ai-branch",
    phase: "skeleton",
    platform,
    arch,
    isCurrentPlatform: isMacOS,
    lanes,
    warnings: [
      "Phase 1 exposes macOS AI branch lanes and route metadata only; it does not claim model downloads or worker probes are complete.",
      "Qwen3-VL large vision should route through llama.cpp Metal, MLX, Ollama fallback, or external HTTP instead of the native CUDA Python path."
    ]
  };
}
function unknownHealthResult(runtimeId, startedAt, message) {
  return {
    runtimeId,
    status: "unknown",
    message,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    durationMs: Date.now() - startedAt
  };
}
class AiRuntimeHealthChecker {
  async runHealthCheck(provider) {
    const startedAt = Date.now();
    try {
      return this.normalizeHealthResult(await provider.healthCheck());
    } catch (error) {
      return {
        ...unknownHealthResult(provider.getConfig().id, startedAt, error instanceof Error ? error.message : "Runtime health check failed"),
        status: "error"
      };
    }
  }
  async runHealthCheckWithTimeout(provider, timeoutMs) {
    const startedAt = Date.now();
    let timeoutHandle;
    try {
      return await Promise.race([
        this.runHealthCheck(provider),
        new Promise((resolve) => {
          timeoutHandle = setTimeout(() => {
            resolve(unknownHealthResult(provider.getConfig().id, startedAt, `Runtime health check timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        })
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
  normalizeHealthResult(result) {
    return {
      runtimeId: result.runtimeId,
      status: result.status ?? "unknown",
      message: result.message || "Runtime health status is unknown",
      details: result.details,
      checkedAt: result.checkedAt || (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Math.max(0, result.durationMs ?? 0)
    };
  }
}
class AiRuntimeProviderRegistry {
  providers = /* @__PURE__ */ new Map();
  registerProvider(provider) {
    this.providers.set(provider.getConfig().id, provider);
  }
  unregisterProvider(runtimeId) {
    return this.providers.delete(runtimeId);
  }
  getProvider(runtimeId) {
    return this.providers.get(runtimeId);
  }
  listProviders() {
    return Array.from(this.providers.values());
  }
  clear() {
    this.providers.clear();
  }
}
function failedState(config, error) {
  return {
    id: config.id,
    kind: config.kind,
    status: "failed",
    healthStatus: "error",
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastError: error instanceof Error ? error.message : String(error),
    pid: null,
    baseUrl: config.baseUrl ?? null,
    metadata: config.metadata
  };
}
function missingState(runtimeId, error) {
  return {
    id: runtimeId,
    kind: "disabled",
    status: "failed",
    healthStatus: "error",
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: error,
    pid: null,
    baseUrl: null
  };
}
function operationFailure(config, error) {
  return {
    success: false,
    state: failedState(config, error),
    error: error instanceof Error ? error.message : String(error)
  };
}
class AiRuntimeManager {
  providers;
  healthChecker;
  activeRuntimeId = null;
  constructor(providers = new AiRuntimeProviderRegistry(), healthChecker = new AiRuntimeHealthChecker()) {
    this.providers = providers;
    this.healthChecker = healthChecker;
  }
  registerProvider(provider) {
    this.providers.registerProvider(provider);
  }
  unregisterProvider(runtimeId) {
    if (this.activeRuntimeId === runtimeId) {
      this.activeRuntimeId = null;
    }
    return this.providers.unregisterProvider(runtimeId);
  }
  getProvider(runtimeId) {
    return this.providers.getProvider(runtimeId);
  }
  listRuntimes() {
    return this.providers.listProviders().map((provider) => provider.getState());
  }
  getRuntimeState(runtimeId) {
    return this.providers.getProvider(runtimeId)?.getState() ?? null;
  }
  async startRuntime(runtimeId) {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.start());
  }
  async stopRuntime(runtimeId) {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.stop());
  }
  async restartRuntime(runtimeId) {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.restart());
  }
  async healthCheck(runtimeId) {
    const provider = this.providers.getProvider(runtimeId);
    if (!provider) {
      return {
        runtimeId,
        status: "error",
        message: `AI runtime provider not found: ${runtimeId}`,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs: 0
      };
    }
    const timeoutMs = provider.getConfig().timeoutMs;
    if (timeoutMs && timeoutMs > 0) {
      return this.healthChecker.runHealthCheckWithTimeout(provider, timeoutMs);
    }
    return this.healthChecker.runHealthCheck(provider);
  }
  async healthCheckAll() {
    const checks = this.providers.listProviders().map((provider) => this.healthCheck(provider.getConfig().id));
    return Promise.all(checks);
  }
  async updateRuntimeConfig(runtimeId, partialConfig) {
    return this.runRuntimeOperation(runtimeId, (provider) => provider.updateConfig(partialConfig));
  }
  selectActiveRuntime(runtimeId) {
    const provider = this.providers.getProvider(runtimeId);
    if (!provider) {
      const error = `AI runtime provider not found: ${runtimeId}`;
      return {
        success: false,
        state: missingState(runtimeId, error),
        error
      };
    }
    this.activeRuntimeId = runtimeId;
    return {
      success: true,
      state: provider.getState()
    };
  }
  getActiveRuntime() {
    if (!this.activeRuntimeId) {
      return null;
    }
    return this.getRuntimeState(this.activeRuntimeId);
  }
  async runRuntimeOperation(runtimeId, operation) {
    const provider = this.providers.getProvider(runtimeId);
    if (!provider) {
      const error = `AI runtime provider not found: ${runtimeId}`;
      return {
        success: false,
        state: missingState(runtimeId, error),
        error
      };
    }
    try {
      return await operation(provider);
    } catch (error) {
      return operationFailure(provider.getConfig(), error);
    }
  }
}
function now$1() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
class DisabledAiRuntimeProvider {
  config;
  state;
  constructor(config = {}) {
    this.config = {
      id: "disabled-ai-runtime",
      kind: "disabled",
      enabled: false,
      displayName: "Disabled AI Runtime",
      baseUrl: null,
      healthEndpoint: null,
      executablePath: null,
      workingDirectory: null,
      launchArgs: [],
      env: {},
      port: null,
      timeoutMs: 1e3,
      platform: "all",
      profileId: null,
      metadata: {},
      ...config
    };
    this.state = this.createDisabledState();
  }
  getConfig() {
    return { ...this.config };
  }
  getState() {
    return { ...this.state };
  }
  async start() {
    this.state = {
      ...this.createDisabledState(),
      lastError: "AI runtime is disabled"
    };
    return {
      success: false,
      state: this.getState(),
      error: "AI runtime is disabled",
      warnings: ["Select an enabled runtime before starting AI features."]
    };
  }
  async stop() {
    this.state = this.createDisabledState();
    return { success: true, state: this.getState(), warnings: ["AI runtime is already disabled."] };
  }
  async restart() {
    return this.start();
  }
  async healthCheck() {
    const checkedAt = now$1();
    this.state = {
      ...this.state,
      healthStatus: "warning",
      lastHealthCheckAt: checkedAt
    };
    return {
      runtimeId: this.config.id,
      status: "warning",
      message: "AI runtime is disabled",
      checkedAt,
      durationMs: 0
    };
  }
  async updateConfig(config) {
    this.config = {
      ...this.config,
      ...config,
      id: this.config.id,
      kind: "disabled",
      enabled: false
    };
    this.state = this.createDisabledState();
    return { success: true, state: this.getState() };
  }
  createDisabledState() {
    return {
      id: this.config.id,
      kind: "disabled",
      status: "disabled",
      healthStatus: "unknown",
      startedAt: null,
      stoppedAt: null,
      lastHealthCheckAt: null,
      lastError: null,
      pid: null,
      baseUrl: this.config.baseUrl ?? null,
      metadata: this.config.metadata
    };
  }
}
class RealAiRuntimeProcessRunner {
  processes = /* @__PURE__ */ new Map();
  nextProcessId = 1e5;
  async spawn(command, args, options) {
    const pid = this.nextProcessId++;
    const processState = {
      pid,
      command,
      args: [...args],
      cwd: options.cwd,
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exitedAt: null,
      exitCode: null,
      signal: null,
      stdoutTail: [],
      stderrTail: []
    };
    this.processes.set(pid, processState);
    void runProcess(command, args, {
      cwd: options.cwd ?? void 0,
      env: options.env,
      timeoutMs: void 0
    }).then((result) => {
      const latest = this.processes.get(pid);
      if (!latest) return;
      latest.exitedAt = (/* @__PURE__ */ new Date()).toISOString();
      latest.exitCode = result.exitCode;
      latest.signal = result.signal;
      latest.stdoutTail = result.stdout ? result.stdout.split(/\r?\n/).filter(Boolean).slice(-20) : [];
      latest.stderrTail = result.stderr ? result.stderr.split(/\r?\n/).filter(Boolean).slice(-20) : [];
    }).catch((error) => {
      const latest = this.processes.get(pid);
      if (!latest) return;
      latest.exitedAt = (/* @__PURE__ */ new Date()).toISOString();
      latest.exitCode = 1;
      latest.signal = null;
      latest.stderrTail = [error instanceof Error ? error.message : "Process runner failed"];
    });
    return cloneProcess(processState);
  }
  async kill(processId) {
    const processState = this.processes.get(processId);
    if (!processState) return false;
    processState.exitedAt = (/* @__PURE__ */ new Date()).toISOString();
    processState.exitCode = processState.exitCode ?? 0;
    processState.signal = processState.signal ?? "SIGTERM";
    return true;
  }
  getProcess(processId) {
    const processState = this.processes.get(processId);
    return processState ? cloneProcess(processState) : null;
  }
  listProcesses() {
    return Array.from(this.processes.values()).map(cloneProcess);
  }
}
function cloneProcess(processState) {
  return {
    ...processState,
    args: [...processState.args],
    stdoutTail: [...processState.stdoutTail],
    stderrTail: [...processState.stderrTail]
  };
}
function buildHealthUrl(config) {
  if (!config.baseUrl || !config.healthEndpoint) {
    return null;
  }
  const normalizedBase = config.baseUrl.replace(/\/+$/, "");
  const normalizedEndpoint = config.healthEndpoint.startsWith("/") ? config.healthEndpoint : `/${config.healthEndpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}
function currentProcessEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry) => typeof entry[1] === "string")
  );
}
function createPythonWorkerLaunchPlan(config) {
  const args = config.scriptPath ? [
    config.scriptPath,
    "--host",
    config.host,
    "--port",
    String(config.port),
    ...config.launchArgs
  ] : [...config.launchArgs];
  const plan = {
    command: config.pythonPath,
    args,
    cwd: config.workingDirectory,
    env: { ...currentProcessEnv(), ...config.env },
    healthUrl: buildHealthUrl(config),
    timeoutMs: config.timeoutMs,
    warnings: [],
    blockingIssues: config.scriptPath ? [] : ["scriptPath is required before a Python worker can be launched."]
  };
  return validatePythonWorkerLaunchPlan(plan);
}
function validatePythonWorkerLaunchPlan(plan) {
  const blockingIssues = [...plan.blockingIssues];
  const warnings = [...plan.warnings];
  if (!plan.command) {
    blockingIssues.push("pythonPath is required before a Python worker can be launched.");
  }
  if (plan.blockingIssues.every((issue) => !issue.includes("scriptPath")) && (plan.args.length === 0 || !plan.args[0])) {
    blockingIssues.push("scriptPath is required before a Python worker can be launched.");
  }
  if (!plan.cwd) {
    warnings.push("workingDirectory is not configured.");
  }
  if (!plan.healthUrl) {
    warnings.push("healthUrl is not configured.");
  }
  return {
    ...plan,
    warnings,
    blockingIssues
  };
}
function createDefaultPythonWorkerRuntimeConfig(config = {}) {
  return {
    runtimeId: "python-worker",
    displayName: "Python AI Worker",
    pythonPath: null,
    scriptPath: null,
    workingDirectory: null,
    host: "127.0.0.1",
    port: 8e3,
    baseUrl: "http://127.0.0.1:8000",
    healthEndpoint: "/health",
    launchArgs: [],
    env: {},
    timeoutMs: 5e3,
    platform: "all",
    profileId: null,
    metadata: {},
    ...config
  };
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function toAiRuntimeConfig(config) {
  return {
    id: config.runtimeId,
    kind: "python-worker",
    enabled: true,
    displayName: config.displayName,
    baseUrl: config.baseUrl,
    healthEndpoint: config.healthEndpoint,
    executablePath: config.pythonPath,
    workingDirectory: config.workingDirectory,
    launchArgs: [...config.launchArgs],
    env: { ...config.env },
    port: config.port,
    timeoutMs: config.timeoutMs,
    platform: config.platform,
    profileId: config.profileId,
    metadata: {
      ...config.metadata,
      pythonWorker: {
        scriptPath: config.scriptPath,
        host: config.host
      }
    }
  };
}
class PythonWorkerRuntimeProvider {
  config;
  state;
  processState = null;
  processRunner;
  constructor(config = {}, processRunner = new RealAiRuntimeProcessRunner()) {
    this.config = createDefaultPythonWorkerRuntimeConfig(config);
    this.processRunner = processRunner;
    this.state = this.createState("idle");
  }
  getConfig() {
    return toAiRuntimeConfig(this.config);
  }
  getPythonConfig() {
    return {
      ...this.config,
      launchArgs: [...this.config.launchArgs],
      env: { ...this.config.env },
      metadata: { ...this.config.metadata ?? {} }
    };
  }
  getState() {
    this.refreshExitedProcessState();
    return { ...this.state };
  }
  async start() {
    const plan = createPythonWorkerLaunchPlan(this.config);
    if (plan.blockingIssues.length > 0 || !plan.command) {
      this.state = {
        ...this.createState("failed"),
        healthStatus: "error",
        lastError: plan.blockingIssues.join("; ")
      };
      return {
        success: false,
        state: this.getState(),
        error: this.state.lastError ?? "Python worker launch plan is blocked.",
        warnings: plan.warnings
      };
    }
    try {
      this.state = this.createState("starting");
      this.processState = await this.processRunner.spawn(plan.command, plan.args, {
        cwd: plan.cwd,
        env: plan.env
      });
      this.state = {
        ...this.createState("running"),
        pid: this.processState.pid
      };
      return {
        success: true,
        state: this.getState(),
        warnings: plan.warnings
      };
    } catch (error) {
      this.state = {
        ...this.createState("failed"),
        healthStatus: "error",
        lastError: error instanceof Error ? error.message : "Python worker process spawn failed"
      };
      return {
        success: false,
        state: this.getState(),
        error: this.state.lastError ?? "Python worker process spawn failed"
      };
    }
  }
  async stop() {
    const processId = this.processState?.pid;
    if (processId !== null && processId !== void 0) {
      await this.processRunner.kill(processId);
      this.processState = this.processRunner.getProcess(processId);
    }
    this.state = this.createState("stopped");
    return { success: true, state: this.getState() };
  }
  async restart() {
    await this.stop();
    return this.start();
  }
  async healthCheck() {
    const startedAt = Date.now();
    const checkedAt = now();
    this.refreshExitedProcessState();
    if (!this.config.baseUrl || !this.config.healthEndpoint) {
      this.state = {
        ...this.state,
        healthStatus: "warning",
        lastHealthCheckAt: checkedAt,
        lastError: "Python worker health endpoint is not configured"
      };
      return {
        runtimeId: this.config.runtimeId,
        status: "warning",
        message: "Python worker health endpoint is not configured",
        checkedAt,
        durationMs: Date.now() - startedAt
      };
    }
    if (this.state.status === "running") {
      this.state = {
        ...this.state,
        healthStatus: "ok",
        lastHealthCheckAt: checkedAt,
        lastError: null
      };
      return {
        runtimeId: this.config.runtimeId,
        status: "ok",
        message: "Python worker process is running",
        checkedAt,
        durationMs: Date.now() - startedAt
      };
    }
    const status = this.state.status === "failed" ? "error" : "warning";
    return {
      runtimeId: this.config.runtimeId,
      status,
      message: `Python worker is ${this.state.status}`,
      checkedAt,
      durationMs: Date.now() - startedAt
    };
  }
  async updateConfig(config) {
    this.config = {
      ...this.config,
      ...config,
      runtimeId: this.config.runtimeId
    };
    this.state = {
      ...this.state,
      baseUrl: this.config.baseUrl,
      metadata: this.getConfig().metadata
    };
    return { success: true, state: this.getState() };
  }
  createState(status) {
    return {
      id: this.config.runtimeId,
      kind: "python-worker",
      status,
      healthStatus: "unknown",
      startedAt: status === "running" ? now() : null,
      stoppedAt: status === "stopped" ? now() : null,
      lastHealthCheckAt: null,
      lastError: null,
      pid: this.processState?.pid ?? null,
      baseUrl: this.config.baseUrl,
      metadata: this.getConfig().metadata
    };
  }
  refreshExitedProcessState() {
    const processId = this.processState?.pid;
    if (processId === null || processId === void 0) {
      return;
    }
    const latestProcess = this.processRunner.getProcess(processId);
    if (!latestProcess) {
      return;
    }
    this.processState = latestProcess;
    if (latestProcess.exitedAt && this.state.status === "running") {
      this.state = {
        ...this.state,
        status: latestProcess.exitCode === 0 ? "unhealthy" : "failed",
        healthStatus: latestProcess.exitCode === 0 ? "warning" : "error",
        lastError: `Python worker process exited with code ${latestProcess.exitCode}`
      };
    }
  }
}
function success$1(data) {
  return { success: true, data };
}
function failure$1(error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
function resolveRuntimePythonExecutable() {
  return process.env.DESIGN_ASSET_MANAGER_PYTHON || process.env.PYTHON || "python3";
}
function createSafeAiRuntimeManager() {
  const manager = new AiRuntimeManager();
  const currentPlatform = process.platform;
  const currentArch = process.arch;
  const macosAiBranchMetadata = createMacOSAiBranchRuntimeMetadata(currentPlatform, currentArch);
  manager.registerProvider(new DisabledAiRuntimeProvider({ id: "disabled-runtime" }));
  manager.registerProvider(new DisabledAiRuntimeProvider({
    id: "macos-ai-branch-runtime",
    displayName: "macOS AI Branch Runtime",
    platform: "darwin",
    profileId: currentPlatform === "darwin" ? currentArch === "arm64" ? "macos-apple-silicon" : "macos-intel" : null,
    metadata: {
      displayName: "macOS AI Branch",
      macosAiBranch: macosAiBranchMetadata
    }
  }));
  manager.registerProvider(new PythonWorkerRuntimeProvider(
    createDefaultPythonWorkerRuntimeConfig({
      runtimeId: "python-worker-runtime",
      displayName: "Python AI Worker Runtime",
      pythonPath: resolveRuntimePythonExecutable(),
      scriptPath: resolveAiServicePath(["app.py"]),
      workingDirectory: resolveAiServiceRoot(),
      env: {
        PYTHONUNBUFFERED: "1",
        DESIGN_ASSET_MANAGER_STRICT_REAL_AI: "1"
      }
    })
  ));
  manager.selectActiveRuntime("disabled-runtime");
  return manager;
}
const aiRuntimeManager = createSafeAiRuntimeManager();
const aiClientService = new AiClientService();
function registerAiRuntimeIpc() {
  ipcMain.handle(CHANNEL_AI_RUNTIME_LIST_RUNTIMES, async () => {
    try {
      return success$1({ runtimes: aiRuntimeManager.listRuntimes() });
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_LIST_RUNTIMES} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE, async (_, request) => {
    try {
      return success$1(aiRuntimeManager.getRuntimeState(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME, async () => {
    try {
      return success$1(aiRuntimeManager.getActiveRuntime());
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES, async () => {
    try {
      return success$1(await aiClientService.getMacOSCapabilities());
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS, async () => {
    try {
      return success$1(await aiClientService.getPythonMpsStatus());
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS, async () => {
    try {
      return success$1(await aiClientService.getClipSiglipOnnxStatus());
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME, async (_, request) => {
    try {
      return success$1(aiRuntimeManager.selectActiveRuntime(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_START_RUNTIME, async (_, request) => {
    try {
      return success$1(await aiRuntimeManager.startRuntime(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_START_RUNTIME} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_STOP_RUNTIME, async (_, request) => {
    try {
      return success$1(await aiRuntimeManager.stopRuntime(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_STOP_RUNTIME} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_RESTART_RUNTIME, async (_, request) => {
    try {
      return success$1(await aiRuntimeManager.restartRuntime(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_RESTART_RUNTIME} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_HEALTH_CHECK, async (_, request) => {
    try {
      return success$1(await aiRuntimeManager.healthCheck(request.runtimeId));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_HEALTH_CHECK} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL, async () => {
    try {
      return success$1(await aiRuntimeManager.healthCheckAll());
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL} error:`, err);
      return failure$1(err);
    }
  });
  ipcMain.handle(CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG, async (_, request) => {
    try {
      return success$1(await aiRuntimeManager.updateRuntimeConfig(request.runtimeId, request.config));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG} error:`, err);
      return failure$1(err);
    }
  });
}
const CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN = "settingsMigration:createPlan";
const CHANNEL_SETTINGS_MIGRATION_DRY_RUN = "settingsMigration:dryRun";
const CHANNEL_SETTINGS_MIGRATION_ANALYZE = "settingsMigration:analyze";
const CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS = "settingsMigration:listBackups";
function success(data) {
  return { success: true, data };
}
function failure(error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
async function readCurrentSettingsSnapshot(settingsPath) {
  try {
    const data = await fs$1.readFile(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    const nodeError = error;
    if (nodeError.code === "ENOENT") {
      return createNewInstallAppSettingsDefaults();
    }
    throw error;
  }
}
async function backupInfo(backupPath) {
  const stat = await fs$1.stat(backupPath);
  return {
    name: path.basename(backupPath),
    createdAt: stat.birthtime?.toISOString?.() ?? null,
    sizeBytes: stat.size
  };
}
function registerSettingsMigrationIpc() {
  const settingsService = SettingsService.getInstance();
  const migrationService = new SettingsMigrationService();
  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, async (_, request) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath());
      return success(migrationService.createMigrationPlan(settings));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN} error:`, err);
      return failure(err);
    }
  });
  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, async (_, request) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath());
      return success(migrationService.dryRunFromSettings(settings));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_DRY_RUN} error:`, err);
      return failure(err);
    }
  });
  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_ANALYZE, async (_, request) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath());
      return success(analyzeSettingsCompatibility(settings));
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_ANALYZE} error:`, err);
      return failure(err);
    }
  });
  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, async (_, request) => {
    try {
      const backupPaths = await listSettingsBackups(settingsService.getSettingsPath());
      const backups = await Promise.all(backupPaths.slice(-(request?.limit ?? backupPaths.length)).map(backupInfo));
      return success({ backups });
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS} error:`, err);
      return failure(err);
    }
  });
}
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
function createWindow() {
  const preloadPath = join(__dirname, "../preload/index.cjs");
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: "Design Asset Manager",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  EmbeddedBrowserManager.getInstance().setMainWindow(mainWindow);
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  try {
    initDatabase();
    console.log("[SQLite] Database successfully loaded.");
    ColorPaletteService.runStartupBatchScanner().catch((err) => {
      console.error("[ColorPaletteService] Failed to launch startup batch scanner:", err);
    });
  } catch (err) {
    console.error("[SQLite] Failed to initialize database:", err);
  }
  if (process.platform === "win32") {
    app.setAppUserModelId("com.antigravity.designassetmanager");
  }
  app.on("browser-window-created", (_, window2) => {
    window2.setMenuBarVisibility(false);
  });
  protocol.handle("local-file", (request) => {
    try {
      let urlPath = request.url.replace("local-file://", "");
      if (urlPath.startsWith("/")) {
        urlPath = urlPath.slice(1);
      }
      const decodedPath = decodeURIComponent(urlPath);
      const absolutePath = ImageMetadataService.resolvePath(decodedPath);
      return net$1.fetch(pathToFileURL(absolutePath).toString());
    } catch (err) {
      console.error("[Protocol] Failed to handle local-file request:", err);
      return new Response("Not Found", { status: 404 });
    }
  });
  setupIpcHandlers();
  createWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
function setupIpcHandlers() {
  registerSiteIpc();
  registerAssetIpc();
  registerDownloadIpc();
  registerSearchIpc();
  registerBrowserIpc();
  registerTagIpc();
  registerAssetTagIpc();
  registerAiClientIpc();
  registerColorPaletteIpc();
  registerSettingsIpc();
  registerOcrHealthcheckIpc();
  registerOcrIpc();
  registerAiWorkerIpc();
  registerAiModelIpc();
  registerCooperativeModelIpc();
  registerAiBackendIpc();
  registerLlamaRuntimeIpc();
  registerDoctorIpc();
  registerAiRuntimeIpc();
  registerSettingsMigrationIpc();
}
export {
  ImageMetadataService as I,
  assertSafeLogPath as a,
  ensureSafeJoin as b,
  getContrastRatio as c,
  getDatabase as d,
  ensureDirectory as e,
  getPythonModelCacheEnv as f,
  getColorDistance as g,
  resolveLogPaths as h,
  resolveManagedPaths as i,
  resolvePythonExecutable as j,
  rgbToHex as k,
  rgbToHsl as l,
  resolveAiServicePath as r,
  sanitizeLogFileName as s
};
