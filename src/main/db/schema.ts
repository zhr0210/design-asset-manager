// SQLite schemas for the Design Asset Manager

import type Database from 'better-sqlite3'

export const CREATE_SITES_TABLE = `
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
`

export const CREATE_ASSETS_TABLE = `
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
`

export const CREATE_TAGS_TABLE = `
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
`

export const CREATE_ASSET_TAGS_TABLE = `
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
`

export const CREATE_TAG_ALIASES_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_aliases (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`

export const CREATE_TAG_RELATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_relations (
    id TEXT PRIMARY KEY,
    parent_tag_id TEXT NOT NULL,
    child_tag_id TEXT NOT NULL,
    relation_type TEXT DEFAULT 'parent',
    created_at TEXT NOT NULL,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (child_tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`

export const CREATE_TAG_GROUPS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    sort_order INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

export const CREATE_TAG_GROUP_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS tag_group_items (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    sort_order INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES tag_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`

export const CREATE_TAG_SUGGESTIONS_TABLE = `
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
`

export const CREATE_AI_TAG_TASKS_TABLE = `
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
`

export const CREATE_AI_PROMPT_TASKS_TABLE = `
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
`

export const CREATE_AI_ANALYSIS_TASKS_TABLE = `
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
`

export const CREATE_DOWNLOAD_TASKS_TABLE = `
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
`

export const CREATE_CAPTURE_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS capture_requests (
    capture_request_identity TEXT PRIMARY KEY,
    batch_identity TEXT NOT NULL,
    batch_item_position INTEGER NOT NULL CHECK (batch_item_position >= 0),
    active_library_identity TEXT NOT NULL,
    canonical_envelope_digest TEXT NOT NULL,
    capture_method TEXT NOT NULL CHECK (capture_method = 'copy-into-library'),
    plan_item_identity TEXT NOT NULL,
    received_file_name TEXT NOT NULL,
    source_bytes INTEGER NOT NULL CHECK (source_bytes >= 0),
    source_generation TEXT NOT NULL,
    source_locator_digest TEXT NOT NULL,
    source_format TEXT NOT NULL CHECK (source_format IN ('jpeg', 'png', 'webp')),
    created_at TEXT NOT NULL,
    UNIQUE(batch_identity, batch_item_position),
    UNIQUE(batch_identity, plan_item_identity)
  );
`

export const CREATE_ASSET_CANDIDATES_TABLE = `
  CREATE TABLE IF NOT EXISTS asset_candidates (
    candidate_identity TEXT PRIMARY KEY,
    capture_request_identity TEXT NOT NULL UNIQUE,
    original_storage_object_identity TEXT NOT NULL UNIQUE,
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('intake', 'active', 'promoted')),
    managed_original_ref TEXT,
    preview_generation_identity TEXT,
    grid_thumbnail_ref TEXT,
    created_at TEXT NOT NULL,
    activated_at TEXT,
    promoted_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (capture_request_identity)
      REFERENCES capture_requests(capture_request_identity) ON DELETE CASCADE,
    CHECK (
      (lifecycle_state = 'intake'
        AND managed_original_ref IS NULL
        AND preview_generation_identity IS NULL
        AND grid_thumbnail_ref IS NULL
        AND activated_at IS NULL
        AND promoted_at IS NULL)
      OR
      (lifecycle_state = 'active'
        AND managed_original_ref IS NOT NULL
        AND preview_generation_identity IS NULL
        AND grid_thumbnail_ref IS NULL
        AND activated_at IS NOT NULL
        AND promoted_at IS NULL)
      OR
      (lifecycle_state = 'promoted'
        AND managed_original_ref IS NOT NULL
        AND preview_generation_identity IS NOT NULL
        AND grid_thumbnail_ref IS NOT NULL
        AND activated_at IS NOT NULL
        AND promoted_at IS NOT NULL)
    )
  );
`

export const CREATE_PROMOTION_LINKS_TABLE = `
  CREATE TABLE IF NOT EXISTS promotion_links (
    promotion_link_identity TEXT PRIMARY KEY,
    candidate_identity TEXT NOT NULL UNIQUE,
    design_asset_identity TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (candidate_identity)
      REFERENCES asset_candidates(candidate_identity) ON DELETE RESTRICT,
    FOREIGN KEY (design_asset_identity)
      REFERENCES assets(id) ON DELETE RESTRICT
  );
`

const CAPTURE_INTAKE_SCHEMA = [
  CREATE_ASSETS_TABLE,
  CREATE_CAPTURE_REQUESTS_TABLE,
  CREATE_ASSET_CANDIDATES_TABLE,
  CREATE_PROMOTION_LINKS_TABLE
] as const

export function initializeCaptureIntakeSchema(
  database: Database.Database
): void {
  database.transaction(() => {
    for (const statement of CAPTURE_INTAKE_SCHEMA) {
      database.prepare(statement).run()
    }
  })()
}

// Performance enhancing indexes
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(source_site_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_source ON asset_tags(source);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_status ON asset_tags(status);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_confidence ON asset_tags(confidence);`,
  `CREATE INDEX IF NOT EXISTS idx_tag_aliases_tag ON tag_aliases(tag_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tag_suggestions_asset ON tag_suggestions(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);`
]

// Seed data to pre-populate new database
export const SEED_SITES = [
  {
    id: 'tapnow',
    name: 'TapNow',
    base_url: 'https://app.tapnow.ai',
    search_url_template: 'https://app.tapnow.ai/home?q={{keyword}}',
    requires_auth: 1,
    auth_status: 'logged',
    notes: '智能体创意画布 - 设计灵感库'
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    base_url: 'https://unsplash.com',
    search_url_template: 'https://unsplash.com/s/photos/{{keyword}}',
    requires_auth: 0,
    auth_status: 'unlogged',
    notes: '免版权高清创意摄影图片库'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    base_url: 'https://pinterest.com',
    search_url_template: 'https://pinterest.com/search/pins/?q={{keyword}}',
    requires_auth: 1,
    auth_status: 'unlogged',
    notes: '全球创意设计瀑布流社区'
  }
]
