import type Database from 'better-sqlite3'

import {
  ASSET_LIFECYCLE_RECORD_VERSION,
  ASSET_TRASH_PLAN_RECORD_VERSION
} from './asset-trash-record-codec'

const CREATE_ASSET_LIFECYCLE_TABLE = `
  CREATE TABLE IF NOT EXISTS asset_lifecycle (
    record_version INTEGER NOT NULL CHECK (
      record_version = ${ASSET_LIFECYCLE_RECORD_VERSION}
    ),
    design_asset_identity TEXT PRIMARY KEY,
    ownership TEXT NOT NULL CHECK (ownership IN ('managed', 'referenced')),
    lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active', 'trash')),
    revision TEXT NOT NULL,
    revision_sequence INTEGER NOT NULL CHECK (revision_sequence >= 0),
    previous_revision TEXT,
    last_transition TEXT NOT NULL CHECK (
      last_transition IN ('registered', 'move-to-trash', 'restore')
    ),
    trashed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (design_asset_identity)
      REFERENCES assets(id) ON DELETE RESTRICT,
    CHECK (
      (lifecycle_state = 'active' AND trashed_at IS NULL) OR
      (lifecycle_state = 'trash' AND trashed_at IS NOT NULL)
    ),
    CHECK (
      (last_transition = 'registered'
        AND lifecycle_state = 'active'
        AND previous_revision IS NULL)
      OR
      (last_transition = 'move-to-trash'
        AND lifecycle_state = 'trash'
        AND previous_revision IS NOT NULL)
      OR
      (last_transition = 'restore'
        AND lifecycle_state = 'active'
        AND previous_revision IS NOT NULL)
    )
  );
`

const CREATE_ASSET_TRASH_PLANS_TABLE = `
  CREATE TABLE IF NOT EXISTS asset_trash_plans (
    record_version INTEGER NOT NULL CHECK (
      record_version = ${ASSET_TRASH_PLAN_RECORD_VERSION}
    ),
    plan_receipt TEXT PRIMARY KEY,
    operation_kind TEXT NOT NULL CHECK (
      operation_kind = 'move-design-asset-to-trash'
    ),
    design_asset_identity TEXT NOT NULL,
    expected_revision TEXT NOT NULL,
    expected_revision_sequence INTEGER NOT NULL CHECK (
      expected_revision_sequence >= 0
    ),
    relationship_digest TEXT NOT NULL,
    plan_state TEXT NOT NULL CHECK (plan_state IN ('planned', 'completed')),
    completed_result_json TEXT,
    result_revision TEXT,
    planned_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (design_asset_identity)
      REFERENCES asset_lifecycle(design_asset_identity) ON DELETE RESTRICT,
    CHECK (
      (plan_state = 'planned'
        AND completed_result_json IS NULL
        AND result_revision IS NULL
        AND completed_at IS NULL)
      OR
      (plan_state = 'completed'
        AND completed_result_json IS NOT NULL
        AND result_revision IS NOT NULL
        AND completed_at IS NOT NULL)
    )
  );
`

export function initializeSqliteAssetTrashSchema(
  database: Database.Database
): void {
  database.pragma('foreign_keys = ON')
  const foreignKeys = database.pragma('foreign_keys', { simple: true })
  if (foreignKeys !== 1) throw new Error('Foreign keys unavailable')
  assertPrimaryKeyColumn(database, 'assets', 'id')

  database.transaction(() => {
    database.exec(CREATE_ASSET_LIFECYCLE_TABLE)
    database.exec(CREATE_ASSET_TRASH_PLANS_TABLE)
    assertExactTableSchema(
      database,
      'asset_lifecycle',
      CREATE_ASSET_LIFECYCLE_TABLE
    )
    assertExactTableSchema(
      database,
      'asset_trash_plans',
      CREATE_ASSET_TRASH_PLANS_TABLE
    )
  }).immediate()
}

function assertExactTableSchema(
  database: Database.Database,
  table: string,
  expectedSql: string
): void {
  const row = database.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(table) as { sql: string } | undefined
  if (!row || normalizeTableSql(row.sql) !== normalizeTableSql(expectedSql)) {
    throw new Error('Unexpected table shape')
  }
}

function normalizeTableSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace('create table if not exists', 'create table')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/;$/u, '')
}

function assertPrimaryKeyColumn(
  database: Database.Database,
  table: string,
  expectedColumn: string
): void {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string
    pk: number
  }>
  if (!rows.some((row) => row.name === expectedColumn && row.pk === 1)) {
    throw new Error('Required table shape unavailable')
  }
}
