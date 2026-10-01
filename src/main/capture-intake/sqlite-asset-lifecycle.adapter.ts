import type Database from 'better-sqlite3'

import type { CapturePromotionLifecycleSink } from './capture-intake.types'

type Registration = Parameters<CapturePromotionLifecycleSink['registerPromotedAsset']>[0]

/**
 * Named, narrow sink used only by the SQLite Promotion transaction. It does
 * not expose the connection or provide a generic callback to callers.
 */
export function createSqliteCapturePromotionLifecycleSink(
  database: Database.Database,
  createRevision: () => string
): CapturePromotionLifecycleSink {
  const insert = database.prepare(`
    INSERT INTO asset_lifecycle (
      record_version, design_asset_identity, ownership, lifecycle_state,
      revision, revision_sequence, previous_revision, last_transition,
      trashed_at, created_at, updated_at
    ) VALUES (1, ?, ?, 'active', ?, 0, NULL, 'registered', NULL, ?, ?)
  `)
  return Object.freeze({
    registerPromotedAsset(input: Registration) {
      insert.run(
        input.designAssetIdentity,
        input.ownership,
        createRevision(),
        input.committedAt,
        input.committedAt
      )
    }
  })
}
