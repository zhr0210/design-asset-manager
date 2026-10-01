import type Database from 'better-sqlite3'

import type { AssetTrashRelationships } from
  '../src/main/library-lifecycle'

const TIMESTAMP = '2026-08-01T00:00:00.000Z'

export function insertAsset(
  connection: Database.Database,
  designAssetIdentity: string
): void {
  connection.prepare(`
    INSERT INTO assets (
      id,
      title,
      file_name,
      file_path,
      thumbnail_path,
      source_site_id,
      source_site_name,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    designAssetIdentity,
    `Fixture ${designAssetIdentity}`,
    `${designAssetIdentity}.png`,
    `/generated/${designAssetIdentity}.png`,
    `/generated/${designAssetIdentity}-thumbnail.png`,
    'fixture-source',
    'Generated Fixture',
    TIMESTAMP,
    TIMESTAMP
  )
}

export function createManagedRelationships(
  fixture: string,
  options: {
    tagIdentities?: readonly string[]
    collectionMembershipIdentities?: readonly string[]
    promotion?: boolean
  } = {}
): AssetTrashRelationships {
  return {
    originalRelationship: {
      kind: 'managed',
      managedOriginalIdentity: `managed-original-${fixture}`,
      originalStorageObjectIdentity: `original-storage-object-${fixture}`
    },
    assetSourceIdentity: `asset-source-${fixture}`,
    tagIdentities: options.tagIdentities ?? [],
    collectionMembershipIdentities:
      options.collectionMembershipIdentities ?? [],
    promotion: options.promotion
      ? {
          candidateIdentity: `candidate-${fixture}`,
          promotionLinkIdentity: `promotion-link-${fixture}`
        }
      : null
  }
}

export function createReferencedRelationships(
  fixture: string,
  tagIdentities: readonly string[] = []
): AssetTrashRelationships {
  return {
    originalRelationship: {
      kind: 'referenced',
      referencedSourceIdentity: `referenced-source-${fixture}`,
      sourceGenerationIdentity: `source-generation-${fixture}`
    },
    assetSourceIdentity: `asset-source-${fixture}`,
    tagIdentities,
    collectionMembershipIdentities: [],
    promotion: null
  }
}

export function registerGovernedAsset(
  connection: Database.Database,
  projections: Map<string, AssetTrashRelationships>,
  designAssetIdentity: string,
  revision: string,
  projection: AssetTrashRelationships,
  persistExistingRelations = false
): void {
  insertAsset(connection, designAssetIdentity)
  projections.set(designAssetIdentity, projection)
  insertLifecycleAuthority(
    connection,
    designAssetIdentity,
    projection.originalRelationship.kind,
    revision
  )
  if (!persistExistingRelations) return
  for (const tagIdentity of projection.tagIdentities) {
    insertTagRelation(connection, designAssetIdentity, tagIdentity)
  }
  if (projection.promotion) {
    insertPromotionHistory(
      connection,
      designAssetIdentity,
      projection.promotion.candidateIdentity,
      projection.promotion.promotionLinkIdentity
    )
  }
}

export function tableNames(connection: Database.Database): Set<string> {
  const rows = connection.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}

function insertLifecycleAuthority(
  connection: Database.Database,
  designAssetIdentity: string,
  ownership: 'managed' | 'referenced',
  revision: string
): void {
  connection.prepare(`
    INSERT INTO asset_lifecycle (
      record_version,
      design_asset_identity,
      ownership,
      lifecycle_state,
      revision,
      revision_sequence,
      previous_revision,
      last_transition,
      trashed_at,
      created_at,
      updated_at
    ) VALUES (1, ?, ?, 'active', ?, 0, NULL, 'registered', NULL, ?, ?)
  `).run(designAssetIdentity, ownership, revision, TIMESTAMP, TIMESTAMP)
}

function insertTagRelation(
  connection: Database.Database,
  designAssetIdentity: string,
  tagIdentity: string
): void {
  connection.prepare(`
    INSERT INTO tags (
      id, name, normalized_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    tagIdentity,
    `Fixture ${tagIdentity}`,
    tagIdentity,
    TIMESTAMP,
    TIMESTAMP
  )
  connection.prepare(`
    INSERT INTO asset_tags (
      id, asset_id, tag_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    `asset-tag-${designAssetIdentity}-${tagIdentity}`,
    designAssetIdentity,
    tagIdentity,
    TIMESTAMP,
    TIMESTAMP
  )
}

function insertPromotionHistory(
  connection: Database.Database,
  designAssetIdentity: string,
  candidateIdentity: string,
  promotionLinkIdentity: string
): void {
  const captureRequestIdentity = `capture-request-${designAssetIdentity}`
  connection.prepare(`
    INSERT INTO capture_requests (
      capture_request_identity,
      batch_identity,
      batch_item_position,
      active_library_identity,
      canonical_envelope_digest,
      capture_method,
      plan_item_identity,
      received_file_name,
      source_bytes,
      source_generation,
      source_locator_digest,
      source_format,
      created_at
    ) VALUES (?, ?, 0, ?, ?, 'copy-into-library', ?, ?, 1, ?, ?, 'png', ?)
  `).run(
    captureRequestIdentity,
    `batch-${designAssetIdentity}`,
    'library-fixture',
    `digest-${designAssetIdentity}`,
    `plan-item-${designAssetIdentity}`,
    `${designAssetIdentity}.png`,
    `source-generation-${designAssetIdentity}`,
    `locator-digest-${designAssetIdentity}`,
    TIMESTAMP
  )
  connection.prepare(`
    INSERT INTO asset_candidates (
      candidate_identity,
      capture_request_identity,
      original_storage_object_identity,
      lifecycle_state,
      managed_original_ref,
      preview_generation_identity,
      grid_thumbnail_ref,
      created_at,
      activated_at,
      promoted_at,
      updated_at
    ) VALUES (?, ?, ?, 'promoted', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    candidateIdentity,
    captureRequestIdentity,
    `original-storage-object-${designAssetIdentity}`,
    `managed-original:${designAssetIdentity}`,
    `preview-generation-${designAssetIdentity}`,
    `preview:${designAssetIdentity}`,
    TIMESTAMP,
    TIMESTAMP,
    TIMESTAMP,
    TIMESTAMP
  )
  connection.prepare(`
    INSERT INTO promotion_links (
      promotion_link_identity,
      candidate_identity,
      design_asset_identity,
      created_at
    ) VALUES (?, ?, ?, ?)
  `).run(
    promotionLinkIdentity,
    candidateIdentity,
    designAssetIdentity,
    TIMESTAMP
  )
}
