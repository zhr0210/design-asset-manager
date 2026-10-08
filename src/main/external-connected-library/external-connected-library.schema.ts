import type Database from 'better-sqlite3';
export const CONNECTED_LIBRARY_SCHEMA_VERSION = 1;
export function initializeExternalConnectedLibrarySchema(database: Database.Database): void {
    database.pragma('foreign_keys = ON');
    database.exec(`
    CREATE TABLE IF NOT EXISTS connected_library_connection (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      record_version INTEGER NOT NULL CHECK (record_version = 1),
      state TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      provider_identity TEXT,
      library_identity TEXT,
      volume_identity TEXT,
      generation TEXT,
      display_name TEXT,
      scope_json TEXT,
      grant_level TEXT NOT NULL,
      capabilities_json TEXT,
      cursor TEXT,
      scan_token TEXT,
      indexing_complete INTEGER NOT NULL CHECK (indexing_complete IN (0, 1)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_library_items (
      item_key TEXT PRIMARY KEY,
      provider_identity TEXT NOT NULL,
      library_identity TEXT NOT NULL,
      provider_item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      extension TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      rating INTEGER NOT NULL,
      annotation TEXT NOT NULL,
      folder_ids_json TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      provider_modified_at INTEGER NOT NULL,
      provider_version TEXT NOT NULL,
      content_fingerprint TEXT,
      preview_ref TEXT,
      original_availability TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL,
      sync_state TEXT NOT NULL,
      base_metadata_json TEXT NOT NULL,
      last_seen_scan TEXT,
      trashed_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(provider_identity, library_identity, provider_item_id)
    );

    CREATE TABLE IF NOT EXISTS connected_library_outbox (
      operation_id TEXT PRIMARY KEY,
      client_receipt TEXT NOT NULL UNIQUE,
      item_key TEXT NOT NULL REFERENCES connected_library_items(item_key) ON DELETE RESTRICT,
      operation_kind TEXT NOT NULL,
      operation_state TEXT NOT NULL,
      generation TEXT NOT NULL,
      expected_provider_version TEXT NOT NULL,
      base_json TEXT NOT NULL,
      desired_json TEXT NOT NULL,
      staged_ref TEXT,
      staged_digest TEXT,
      staged_bytes INTEGER,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_library_conflicts (
      conflict_id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL REFERENCES connected_library_outbox(operation_id) ON DELETE RESTRICT,
      item_key TEXT NOT NULL REFERENCES connected_library_items(item_key) ON DELETE RESTRICT,
      conflict_kind TEXT NOT NULL,
      field_name TEXT,
      conflict_state TEXT NOT NULL,
      local_summary TEXT NOT NULL,
      eagle_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      UNIQUE(operation_id, conflict_kind, field_name)
    );

    CREATE TABLE IF NOT EXISTS connected_library_staging (
      staged_ref TEXT PRIMARY KEY,
      item_key TEXT NOT NULL REFERENCES connected_library_items(item_key) ON DELETE RESTRICT,
      relative_path TEXT NOT NULL UNIQUE,
      content_digest TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      released_at TEXT
    );

    CREATE TABLE IF NOT EXISTS connected_library_receipts (
      receipt TEXT PRIMARY KEY,
      receipt_kind TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_library_events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_kind TEXT NOT NULL,
      item_key TEXT,
      operation_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
    const version = database.pragma('user_version', { simple: true }) as number;
    if (version !== 0 && version !== CONNECTED_LIBRARY_SCHEMA_VERSION)
        throw new Error('CONNECTED_LIBRARY_SCHEMA_UNSUPPORTED');
    database.pragma(`user_version = ${CONNECTED_LIBRARY_SCHEMA_VERSION}`);
}
export function assertExternalConnectedLibrarySchema(database: Database.Database): void {
    if (database.pragma('foreign_keys', { simple: true }) !== 1 || database.pragma('quick_check(1)', { simple: true }) !== 'ok')
        throw new Error('CONNECTED_LIBRARY_SCHEMA_INVALID');
    const required = [
        'connected_library_connection',
        'connected_library_items',
        'connected_library_outbox',
        'connected_library_conflicts',
        'connected_library_staging',
        'connected_library_receipts',
        'connected_library_events'
    ];
    const tables = new Set((database.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all() as Array<{
        name: string;
    }>).map((row) => row.name));
    if (required.some((table) => !tables.has(table)))
        throw new Error('CONNECTED_LIBRARY_SCHEMA_INVALID');
}
