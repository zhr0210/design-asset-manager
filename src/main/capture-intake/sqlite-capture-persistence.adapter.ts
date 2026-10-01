import path from 'node:path'

import type Database from 'better-sqlite3'

import { initializeCaptureIntakeSchema } from '../db/schema'
import {
  CaptureIntakeError,
  type CaptureBatchItemSnapshot,
  type CaptureBatchSnapshot,
  type CapturePersistenceAcceptance,
  type CapturePersistenceAdapter,
  type CapturePromotionLifecycleSink,
  type SupportedCaptureFormat
} from './capture-intake.types'

interface AcceptedCaptureRow {
  captureRequestIdentity: string
  batchIdentity: string
  batchItemPosition: number
  activeLibraryIdentity: string
  canonicalEnvelopeDigest: string
  captureMethod: 'copy-into-library'
  planItemIdentity: string
  receivedFileName: string
  sourceBytes: number
  sourceGeneration: string
  sourceLocatorDigest: string
  sourceFormat: SupportedCaptureFormat
  candidateIdentity: string
  originalStorageObjectIdentity: string
}

interface CaptureProjectionRow extends AcceptedCaptureRow {
  lifecycleState: 'intake' | 'active' | 'promoted'
  managedOriginalRef: string | null
  previewGenerationIdentity: string | null
  gridThumbnailRef: string | null
  promotionLinkIdentity: string | null
  designAssetIdentity: string | null
  designAssetRowIdentity: string | null
  designAssetFilePath: string | null
  designAssetThumbnailPath: string | null
  designAssetCaptureMethod: string | null
}

interface PromotionRecord {
  candidateIdentity: string
  lifecycleState: 'intake' | 'active' | 'promoted'
  managedOriginalRef: string | null
  previewGenerationIdentity: string | null
  gridThumbnailRef: string | null
  receivedFileName: string
  sourceBytes: number
  sourceFormat: SupportedCaptureFormat
  captureMethod: 'copy-into-library'
  promotionLinkIdentity: string | null
  designAssetIdentity: string | null
  designAssetFilePath: string | null
  designAssetThumbnailPath: string | null
}

type AcceptanceInput = Parameters<CapturePersistenceAdapter['acceptOrReplay']>[0]
type ActivationInput = Parameters<CapturePersistenceAdapter['commitCandidateActivation']>[0]
type PromotionInput = Parameters<CapturePersistenceAdapter['commitReadyPromotion']>[0]

/**
 * Production persistence Implementation for the Capture Intake persistence
 * Seam. The injected connection keeps database selection in composition code;
 * workflow callers receive only prepare / dispatch / inspect.
 */
export function createSqliteCapturePersistenceAdapter(
  database: Database.Database,
  options: Readonly<{ promotionLifecycle?: CapturePromotionLifecycleSink }> = {}
): CapturePersistenceAdapter {
  try {
    database.pragma('foreign_keys = ON')
    initializeCaptureIntakeSchema(database)
  } catch {
    throw capturePersistenceUnavailable()
  }

  const acceptTransaction = database.transaction(
    (input: AcceptanceInput): 'accepted' | 'replayed' => {
      assertDistinctAcceptance(input)

      const existingRows = input.items.map((item) =>
        findAcceptedCapture(database, item.captureRequestIdentity)
      )
      const existingCount = existingRows.filter(Boolean).length

      if (existingCount > 0) {
        if (
          existingCount !== input.items.length ||
          countBatchItems(database, input.batchIdentity) !== input.items.length
        ) {
          throw captureIdentityConflict()
        }

        for (const [position, item] of input.items.entries()) {
          const row = existingRows[position]
          if (!row || !sameAcceptedCapture(row, input, item, position)) {
            throw captureIdentityConflict()
          }
        }
        return 'replayed'
      }

      if (countBatchItems(database, input.batchIdentity) > 0) {
        throw captureIdentityConflict()
      }

      const now = new Date().toISOString()
      const insertRequest = database.prepare(`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertCandidate = database.prepare(`
        INSERT INTO asset_candidates (
          candidate_identity,
          capture_request_identity,
          original_storage_object_identity,
          lifecycle_state,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'intake', ?, ?)
      `)

      for (const [position, item] of input.items.entries()) {
        insertRequest.run(
          item.captureRequestIdentity,
          input.batchIdentity,
          position,
          input.activeLibraryIdentity,
          item.canonicalEnvelopeDigest,
          item.captureMethod,
          item.planItemIdentity,
          item.receivedFileName,
          item.sourceBytes,
          item.sourceGeneration,
          item.sourceLocatorDigest,
          item.format,
          now
        )
        insertCandidate.run(
          item.candidateIdentity,
          item.captureRequestIdentity,
          item.originalStorageObjectIdentity,
          now,
          now
        )
      }
      return 'accepted'
    }
  )

  const activateTransaction = database.transaction(
    (input: ActivationInput): string => {
      const row = database.prepare(`
        SELECT
          r.batch_identity AS batchIdentity,
          c.lifecycle_state AS lifecycleState,
          c.managed_original_ref AS managedOriginalRef
        FROM capture_requests r
        JOIN asset_candidates c
          ON c.capture_request_identity = r.capture_request_identity
        WHERE r.capture_request_identity = ?
      `).get(input.captureRequestIdentity) as {
        batchIdentity: string
        lifecycleState: 'intake' | 'active' | 'promoted'
        managedOriginalRef: string | null
      } | undefined

      if (!row) throw captureBatchNotFound()
      if (row.lifecycleState !== 'intake') {
        if (row.managedOriginalRef !== input.managedOriginalRef) {
          throw captureTransitionConflict()
        }
        return row.batchIdentity
      }

      const now = new Date().toISOString()
      const result = database.prepare(`
        UPDATE asset_candidates
        SET
          lifecycle_state = 'active',
          managed_original_ref = ?,
          activated_at = ?,
          updated_at = ?
        WHERE capture_request_identity = ? AND lifecycle_state = 'intake'
      `).run(
        input.managedOriginalRef,
        now,
        now,
        input.captureRequestIdentity
      )
      if (result.changes !== 1) throw captureTransitionConflict()
      return row.batchIdentity
    }
  )

  const promoteTransaction = database.transaction(
    (input: PromotionInput): string => {
      const row = findPromotionRecord(database, input.captureRequestIdentity)
      if (!row) throw captureBatchNotFound()
      if (row.lifecycleState === 'intake' || !row.managedOriginalRef) {
        throw captureTransitionConflict()
      }

      const batchIdentity = findBatchIdentity(
        database,
        input.captureRequestIdentity
      )
      if (!batchIdentity) throw captureBatchNotFound()

      if (row.lifecycleState === 'promoted') {
        if (
          row.previewGenerationIdentity !== input.previewGenerationIdentity ||
          row.gridThumbnailRef !== input.gridThumbnailRef ||
          row.designAssetIdentity !== input.designAssetIdentity ||
          row.promotionLinkIdentity !== input.promotionLinkIdentity ||
          row.designAssetFilePath !== input.managedOriginalPath ||
          row.designAssetThumbnailPath !== input.gridThumbnailPath
        ) {
          throw captureTransitionConflict()
        }
        return batchIdentity
      }

      const now = new Date().toISOString()
      database.prepare(`
        INSERT INTO assets (
          id,
          title,
          file_name,
          file_path,
          thumbnail_path,
          source_site_id,
          source_site_name,
          file_size,
          file_type,
          capture_method,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.designAssetIdentity,
        createAssetTitle(row.receivedFileName),
        row.receivedFileName,
        input.managedOriginalPath,
        input.gridThumbnailPath,
        'local-file-copy',
        'Local File',
        row.sourceBytes,
        row.sourceFormat,
        row.captureMethod,
        now,
        now
      )

      const promoted = database.prepare(`
        UPDATE asset_candidates
        SET
          lifecycle_state = 'promoted',
          preview_generation_identity = ?,
          grid_thumbnail_ref = ?,
          promoted_at = ?,
          updated_at = ?
        WHERE candidate_identity = ? AND lifecycle_state = 'active'
      `).run(
        input.previewGenerationIdentity,
        input.gridThumbnailRef,
        now,
        now,
        row.candidateIdentity
      )
      if (promoted.changes !== 1) throw captureTransitionConflict()

      database.prepare(`
        INSERT INTO promotion_links (
          promotion_link_identity,
          candidate_identity,
          design_asset_identity,
          created_at
        ) VALUES (?, ?, ?, ?)
      `).run(
        input.promotionLinkIdentity,
        row.candidateIdentity,
        input.designAssetIdentity,
        now
      )
      options.promotionLifecycle?.registerPromotedAsset({
        designAssetIdentity: input.designAssetIdentity,
        ownership: 'managed',
        committedAt: now
      })
      return batchIdentity
    }
  )

  return {
    async acceptOrReplay(input): Promise<CapturePersistenceAcceptance> {
      try {
        const result = acceptTransaction(input)
        if (result === 'accepted') return { kind: 'accepted' }
        const snapshot = projectBatch(database, input.batchIdentity)
        if (!snapshot) throw captureBatchNotFound()
        return { kind: 'replayed', snapshot }
      } catch (error) {
        if (error instanceof CaptureIntakeError) throw error
        if (isSqliteConstraintError(error)) throw captureIdentityConflict()
        throw capturePersistenceUnavailable()
      }
    },

    async commitCandidateActivation(input): Promise<CaptureBatchSnapshot> {
      try {
        const batchIdentity = activateTransaction(input)
        const snapshot = projectBatch(database, batchIdentity)
        if (!snapshot) throw captureBatchNotFound()
        return snapshot
      } catch (error) {
        if (error instanceof CaptureIntakeError) throw error
        if (isSqliteConstraintError(error)) throw captureTransitionConflict()
        throw capturePersistenceUnavailable()
      }
    },

    async commitReadyPromotion(input): Promise<CaptureBatchSnapshot> {
      try {
        const batchIdentity = promoteTransaction(input)
        const snapshot = projectBatch(database, batchIdentity)
        if (!snapshot) throw captureBatchNotFound()
        return snapshot
      } catch (error) {
        if (error instanceof CaptureIntakeError) throw error
        if (isSqliteConstraintError(error)) throw captureTransitionConflict()
        throw capturePersistenceUnavailable()
      }
    },

    async completeBatch(batchIdentity): Promise<CaptureBatchSnapshot> {
      try {
        const snapshot = projectBatch(database, batchIdentity)
        if (!snapshot) throw captureBatchNotFound()
        if (snapshot.items.some((item) => item.state !== 'promoted')) {
          throw captureTransitionConflict()
        }
        return snapshot
      } catch (error) {
        if (error instanceof CaptureIntakeError) throw error
        throw capturePersistenceUnavailable()
      }
    },

    async inspect(batchIdentity): Promise<CaptureBatchSnapshot | null> {
      try {
        return projectBatch(database, batchIdentity)
      } catch (error) {
        if (error instanceof CaptureIntakeError) throw error
        throw capturePersistenceUnavailable()
      }
    }
  }
}

function findAcceptedCapture(
  database: Database.Database,
  captureRequestIdentity: string
): AcceptedCaptureRow | undefined {
  return database.prepare(`
    SELECT
      r.capture_request_identity AS captureRequestIdentity,
      r.batch_identity AS batchIdentity,
      r.batch_item_position AS batchItemPosition,
      r.active_library_identity AS activeLibraryIdentity,
      r.canonical_envelope_digest AS canonicalEnvelopeDigest,
      r.capture_method AS captureMethod,
      r.plan_item_identity AS planItemIdentity,
      r.received_file_name AS receivedFileName,
      r.source_bytes AS sourceBytes,
      r.source_generation AS sourceGeneration,
      r.source_locator_digest AS sourceLocatorDigest,
      r.source_format AS sourceFormat,
      c.candidate_identity AS candidateIdentity,
      c.original_storage_object_identity AS originalStorageObjectIdentity
    FROM capture_requests r
    JOIN asset_candidates c
      ON c.capture_request_identity = r.capture_request_identity
    WHERE r.capture_request_identity = ?
  `).get(captureRequestIdentity) as AcceptedCaptureRow | undefined
}

function countBatchItems(
  database: Database.Database,
  batchIdentity: string
): number {
  const row = database.prepare(`
    SELECT COUNT(*) AS itemCount
    FROM capture_requests
    WHERE batch_identity = ?
  `).get(batchIdentity) as { itemCount: number }
  return row.itemCount
}

function findBatchIdentity(
  database: Database.Database,
  captureRequestIdentity: string
): string | null {
  const row = database.prepare(`
    SELECT batch_identity AS batchIdentity
    FROM capture_requests
    WHERE capture_request_identity = ?
  `).get(captureRequestIdentity) as { batchIdentity: string } | undefined
  return row?.batchIdentity ?? null
}

function findPromotionRecord(
  database: Database.Database,
  captureRequestIdentity: string
): PromotionRecord | undefined {
  return database.prepare(`
    SELECT
      c.candidate_identity AS candidateIdentity,
      c.lifecycle_state AS lifecycleState,
      c.managed_original_ref AS managedOriginalRef,
      c.preview_generation_identity AS previewGenerationIdentity,
      c.grid_thumbnail_ref AS gridThumbnailRef,
      r.received_file_name AS receivedFileName,
      r.source_bytes AS sourceBytes,
      r.source_format AS sourceFormat,
      r.capture_method AS captureMethod,
      p.promotion_link_identity AS promotionLinkIdentity,
      p.design_asset_identity AS designAssetIdentity,
      a.file_path AS designAssetFilePath,
      a.thumbnail_path AS designAssetThumbnailPath
    FROM capture_requests r
    JOIN asset_candidates c
      ON c.capture_request_identity = r.capture_request_identity
    LEFT JOIN promotion_links p
      ON p.candidate_identity = c.candidate_identity
    LEFT JOIN assets a
      ON a.id = p.design_asset_identity
    WHERE r.capture_request_identity = ?
  `).get(captureRequestIdentity) as PromotionRecord | undefined
}

function projectBatch(
  database: Database.Database,
  batchIdentity: string
): CaptureBatchSnapshot | null {
  const rows = database.prepare(`
    SELECT
      r.capture_request_identity AS captureRequestIdentity,
      r.batch_identity AS batchIdentity,
      r.batch_item_position AS batchItemPosition,
      r.active_library_identity AS activeLibraryIdentity,
      r.canonical_envelope_digest AS canonicalEnvelopeDigest,
      r.capture_method AS captureMethod,
      r.plan_item_identity AS planItemIdentity,
      r.received_file_name AS receivedFileName,
      r.source_bytes AS sourceBytes,
      r.source_generation AS sourceGeneration,
      r.source_locator_digest AS sourceLocatorDigest,
      r.source_format AS sourceFormat,
      c.candidate_identity AS candidateIdentity,
      c.original_storage_object_identity AS originalStorageObjectIdentity,
      c.lifecycle_state AS lifecycleState,
      c.managed_original_ref AS managedOriginalRef,
      c.preview_generation_identity AS previewGenerationIdentity,
      c.grid_thumbnail_ref AS gridThumbnailRef,
      p.promotion_link_identity AS promotionLinkIdentity,
      p.design_asset_identity AS designAssetIdentity,
      a.id AS designAssetRowIdentity,
      a.file_path AS designAssetFilePath,
      a.thumbnail_path AS designAssetThumbnailPath,
      a.capture_method AS designAssetCaptureMethod
    FROM capture_requests r
    JOIN asset_candidates c
      ON c.capture_request_identity = r.capture_request_identity
    LEFT JOIN promotion_links p
      ON p.candidate_identity = c.candidate_identity
    LEFT JOIN assets a
      ON a.id = p.design_asset_identity
    WHERE r.batch_identity = ?
    ORDER BY r.batch_item_position ASC
  `).all(batchIdentity) as CaptureProjectionRow[]

  if (rows.length === 0) return null
  const activeLibraryIdentity = rows[0].activeLibraryIdentity
  if (rows.some((row, position) =>
    row.activeLibraryIdentity !== activeLibraryIdentity ||
    row.batchItemPosition !== position
  )) {
    throw captureTransitionConflict()
  }

  const items = rows.map(projectItem)
  return {
    batchIdentity,
    activeLibraryIdentity,
    state: items.every((item) => item.state === 'promoted')
      ? 'complete'
      : 'running',
    items
  }
}

function projectItem(row: CaptureProjectionRow): CaptureBatchItemSnapshot {
  const identities = {
    planItemIdentity: row.planItemIdentity,
    captureRequestIdentity: row.captureRequestIdentity,
    candidateIdentity: row.candidateIdentity,
    originalStorageObjectIdentity: row.originalStorageObjectIdentity
  }

  if (row.lifecycleState === 'intake') {
    assertNoPromotionEvidence(row)
    if (row.managedOriginalRef) throw captureTransitionConflict()
    return {
      ...identities,
      state: 'intake',
      candidate: { state: 'intake' },
      preview: { state: 'pending' }
    }
  }

  if (!row.managedOriginalRef) throw captureTransitionConflict()
  const managedEvidence = {
    managedOriginalRef: row.managedOriginalRef,
    copyVerification: 'verified' as const,
    sourcePreservation: 'verified' as const
  }
  if (row.lifecycleState === 'active') {
    assertNoPromotionEvidence(row)
    return {
      ...identities,
      state: 'active',
      candidate: { ...managedEvidence, state: 'active' },
      preview: { state: 'pending' }
    }
  }

  if (
    !row.previewGenerationIdentity ||
    !row.gridThumbnailRef ||
    !row.promotionLinkIdentity ||
    !row.designAssetIdentity ||
    row.designAssetRowIdentity !== row.designAssetIdentity ||
    !row.designAssetFilePath ||
    !path.isAbsolute(row.designAssetFilePath) ||
    !row.designAssetThumbnailPath ||
    !path.isAbsolute(row.designAssetThumbnailPath) ||
    row.designAssetCaptureMethod !== row.captureMethod
  ) {
    throw captureTransitionConflict()
  }
  return {
    ...identities,
    state: 'promoted',
    candidate: { ...managedEvidence, state: 'promoted' },
    preview: {
      state: 'ready',
      generationIdentity: row.previewGenerationIdentity,
      gridThumbnailRef: row.gridThumbnailRef
    },
    promotion: {
      state: 'promoted',
      designAssetIdentity: row.designAssetIdentity,
      promotionLinkIdentity: row.promotionLinkIdentity
    }
  }
}

function assertNoPromotionEvidence(row: CaptureProjectionRow): void {
  if (
    row.previewGenerationIdentity ||
    row.gridThumbnailRef ||
    row.promotionLinkIdentity ||
    row.designAssetIdentity ||
    row.designAssetRowIdentity ||
    row.designAssetFilePath ||
    row.designAssetThumbnailPath ||
    row.designAssetCaptureMethod
  ) {
    throw captureTransitionConflict()
  }
}

function assertDistinctAcceptance(input: AcceptanceInput): void {
  if (input.items.length === 0) throw captureIdentityConflict()
  for (const values of [
    input.items.map((item) => item.captureRequestIdentity),
    input.items.map((item) => item.candidateIdentity),
    input.items.map((item) => item.originalStorageObjectIdentity),
    input.items.map((item) => item.planItemIdentity)
  ]) {
    if (new Set(values).size !== values.length) {
      throw captureIdentityConflict()
    }
  }
}

function sameAcceptedCapture(
  row: AcceptedCaptureRow,
  input: AcceptanceInput,
  item: AcceptanceInput['items'][number],
  position: number
): boolean {
  return row.captureRequestIdentity === item.captureRequestIdentity &&
    row.batchIdentity === input.batchIdentity &&
    row.batchItemPosition === position &&
    row.activeLibraryIdentity === input.activeLibraryIdentity &&
    row.canonicalEnvelopeDigest === item.canonicalEnvelopeDigest &&
    row.captureMethod === item.captureMethod &&
    row.planItemIdentity === item.planItemIdentity &&
    row.receivedFileName === item.receivedFileName &&
    row.sourceBytes === item.sourceBytes &&
    row.sourceGeneration === item.sourceGeneration &&
    row.sourceLocatorDigest === item.sourceLocatorDigest &&
    row.sourceFormat === item.format &&
    row.candidateIdentity === item.candidateIdentity &&
    row.originalStorageObjectIdentity === item.originalStorageObjectIdentity
}

function createAssetTitle(receivedFileName: string): string {
  const withoutExtension = receivedFileName.replace(/\.[^.]+$/u, '')
  return withoutExtension || receivedFileName
}

function captureIdentityConflict(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-identity-conflict',
    'The Capture Request Identity conflicts with an accepted capture envelope.'
  )
}

function captureTransitionConflict(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-transition-conflict',
    'The requested Candidate lifecycle transition is not valid.'
  )
}

function captureBatchNotFound(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-batch-not-found',
    'The capture batch is unavailable.'
  )
}

function capturePersistenceUnavailable(): CaptureIntakeError {
  return new CaptureIntakeError(
    'capture-persistence-unavailable',
    'Capture state is temporarily unavailable.'
  )
}

function isSqliteConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = error.code
  return typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT')
}
