// SQLite schemas for the Design Asset Manager

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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

export const CREATE_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`

export const CREATE_ASSET_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`

export const CREATE_DOWNLOAD_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS download_tasks (
    id TEXT PRIMARY KEY,
    asset_title TEXT NOT NULL,
    source_site_id TEXT NOT NULL,
    source_page_url TEXT,
    download_url TEXT NOT NULL,
    save_path TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

// Performance enhancing indexes
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(source_site_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);`,
  `CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);`,
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
