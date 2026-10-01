import type Database from 'better-sqlite3'

import {
  AssetTrashError,
  createAssetTrashRetention,
  type AssetTrashRelationships,
  type AssetTrashSnapshot,
  type AssetTrashWorkflow
} from './asset-trash'
import {
  ASSET_TRASH_PLAN_RECORD_VERSION,
  decodeCompletedSnapshot,
  decodeLifecycle,
  decodePlan,
  digestRelationships,
  encodeCompletedSnapshot,
  isOpaqueIdentity,
  normalizeRelationships,
  projectSnapshot,
  requireTimestamp,
  type LifecycleRecord,
  type LifecycleRow,
  type PlanRecord,
  type PlanRow
} from './asset-trash-record-codec'
import { initializeSqliteAssetTrashSchema } from
  './sqlite-asset-trash.schema'

export interface AssetTrashRelationshipProjection {
  /**
   * Read synchronously through this exact connection while the Adapter's
   * current transaction is active, or return an immutable transaction-stable
   * projection. Async and second-connection reads are not coherent.
   */
  inspectInCurrentTransaction(input: {
    database: Database.Database
    designAssetIdentity: string
  }): AssetTrashRelationships | null
}

export interface SqliteAssetTrashDependencies {
  database: Database.Database
  relationships: AssetTrashRelationshipProjection
  createPlanReceipt(): string
  createRevision(): string
  now(): string
}

type PrepareInput = Parameters<AssetTrashWorkflow['prepare']>[0]
type DispatchInput = Parameters<AssetTrashWorkflow['dispatch']>[0]
type RestoreInput = Extract<DispatchInput, { kind: 'restore-design-asset' }>

/**
 * SQLite persistence tracer for Asset Trash. The factory is intentionally not
 * re-exported from the Module barrel: production composition must later obtain
 * the connection through the Active Library authority rather than importing a
 * raw-database shortcut.
 */
export function createSqliteAssetTrashWorkflow(
  dependencies: SqliteAssetTrashDependencies
): AssetTrashWorkflow {
  protectPersistence(
    () => initializeSqliteAssetTrashSchema(dependencies.database)
  )

  const prepareTransaction = dependencies.database.transaction(
    (input: PrepareInput) => prepareMoveToTrash(dependencies, input)
  )
  const confirmTransaction = dependencies.database.transaction(
    (planReceipt: string) => confirmMoveToTrash(dependencies, planReceipt)
  )
  const restoreTransaction = dependencies.database.transaction(
    (input: RestoreInput) => restoreFromTrash(dependencies, input)
  )
  const inspectTransaction = dependencies.database.transaction(
    (designAssetIdentity: string) => {
      const lifecycle = requireLifecycle(
        dependencies.database,
        designAssetIdentity
      )
      const relationships = requireRelationships(dependencies, lifecycle)
      return projectSnapshot(lifecycle, relationships)
    }
  )

  return {
    async prepare(input) {
      return protectPersistence(() => prepareTransaction.immediate(input))
    },

    async dispatch(command) {
      if (command.kind === 'restore-design-asset') {
        return protectPersistence(
          () => restoreTransaction.immediate(command)
        )
      }
      return protectPersistence(
        () => confirmTransaction.immediate(command.planReceipt)
      )
    },

    async inspect(request) {
      return protectPersistence(
        () => inspectTransaction.deferred(request.designAssetIdentity)
      )
    }
  }
}

function prepareMoveToTrash(
  dependencies: SqliteAssetTrashDependencies,
  input: PrepareInput
): { kind: 'planned'; plan: {
  receipt: string
  designAssetIdentity: string
  expectedRevision: string
  impact: ReturnType<typeof createAssetTrashRetention>
} } {
  const lifecycle = requireLifecycle(
    dependencies.database,
    input.designAssetIdentity
  )
  assertRevision(lifecycle, input.expectedRevision)
  if (lifecycle.lifecycleState === 'trash') {
    throw new AssetTrashError(
      'asset-already-trashed',
      'The Design Asset is already in Asset Trash.'
    )
  }

  const relationships = requireRelationships(dependencies, lifecycle)
  const receipt = invokeDependency(dependencies.createPlanReceipt)
  if (!isOpaqueIdentity(receipt)) throw planConflict()

  const plannedAt = requireTimestamp(invokeDependency(dependencies.now))
  const inserted = dependencies.database.prepare(`
    INSERT INTO asset_trash_plans (
      record_version,
      plan_receipt,
      operation_kind,
      design_asset_identity,
      expected_revision,
      expected_revision_sequence,
      relationship_digest,
      plan_state,
      completed_result_json,
      result_revision,
      planned_at,
      completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', NULL, NULL, ?, NULL)
    ON CONFLICT(plan_receipt) DO NOTHING
  `).run(
    ASSET_TRASH_PLAN_RECORD_VERSION,
    receipt,
    input.kind,
    lifecycle.designAssetIdentity,
    lifecycle.revision,
    lifecycle.revisionSequence,
    digestRelationships(relationships),
    plannedAt
  )
  if (inserted.changes !== 1) throw planConflict()

  return {
    kind: 'planned',
    plan: {
      receipt,
      designAssetIdentity: lifecycle.designAssetIdentity,
      expectedRevision: lifecycle.revision,
      impact: createAssetTrashRetention(relationships)
    }
  }
}

function confirmMoveToTrash(
  dependencies: SqliteAssetTrashDependencies,
  planReceipt: string
): AssetTrashSnapshot {
  const plan = requirePlan(dependencies.database, planReceipt)

  // Completed receipts are immutable evidence. Replay must not consult current
  // lifecycle state or relationships, including after Restore or restart.
  if (plan.planState === 'completed') {
    return decodeCompletedSnapshot(plan)
  }

  const lifecycle = requireLifecycle(
    dependencies.database,
    plan.designAssetIdentity
  )
  if (
    lifecycle.lifecycleState !== 'active' ||
    lifecycle.revision !== plan.expectedRevision ||
    lifecycle.revisionSequence !== plan.expectedRevisionSequence
  ) {
    throw stalePlan()
  }

  const relationships = requireRelationships(dependencies, lifecycle)
  if (digestRelationships(relationships) !== plan.relationshipDigest) {
    throw stalePlan()
  }

  const nextRevision = createNextRevision(
    lifecycle,
    invokeDependency(dependencies.createRevision)
  )
  const completedAt = requireTimestamp(invokeDependency(dependencies.now))
  if (Date.parse(completedAt) < Date.parse(plan.plannedAt)) {
    throw new Error('Asset Trash clock moved backwards')
  }
  const update = dependencies.database.prepare(`
    UPDATE asset_lifecycle
    SET lifecycle_state = 'trash',
        revision = ?,
        revision_sequence = ?,
        previous_revision = ?,
        last_transition = 'move-to-trash',
        trashed_at = ?,
        updated_at = ?
    WHERE design_asset_identity = ?
      AND lifecycle_state = 'active'
      AND revision = ?
      AND revision_sequence = ?
  `).run(
    nextRevision,
    lifecycle.revisionSequence + 1,
    lifecycle.revision,
    completedAt,
    completedAt,
    lifecycle.designAssetIdentity,
    lifecycle.revision,
    lifecycle.revisionSequence
  )
  if (update.changes !== 1) throw stalePlan()

  const completedLifecycle: LifecycleRecord = {
    ...lifecycle,
    lifecycleState: 'trash',
    revision: nextRevision,
    revisionSequence: lifecycle.revisionSequence + 1,
    previousRevision: lifecycle.revision,
    lastTransition: 'move-to-trash',
    trashedAt: completedAt
  }
  const completedSnapshot = projectSnapshot(
    completedLifecycle,
    relationships
  )
  const completedResultJson = encodeCompletedSnapshot(completedSnapshot)
  const planUpdate = dependencies.database.prepare(`
    UPDATE asset_trash_plans
    SET plan_state = 'completed',
        completed_result_json = ?,
        result_revision = ?,
        completed_at = ?
    WHERE plan_receipt = ? AND plan_state = 'planned'
  `).run(completedResultJson, nextRevision, completedAt, plan.planReceipt)
  if (planUpdate.changes !== 1) throw stalePlan()

  return completedSnapshot
}

function restoreFromTrash(
  dependencies: SqliteAssetTrashDependencies,
  input: RestoreInput
): AssetTrashSnapshot {
  const lifecycle = requireLifecycle(
    dependencies.database,
    input.designAssetIdentity
  )
  if (
    lifecycle.lifecycleState === 'active' &&
    lifecycle.lastTransition === 'restore' &&
    lifecycle.previousRevision === input.expectedRevision
  ) {
    return projectSnapshot(
      lifecycle,
      requireRelationships(dependencies, lifecycle)
    )
  }
  assertRevision(lifecycle, input.expectedRevision)
  if (lifecycle.lifecycleState !== 'trash') {
    throw new AssetTrashError(
      'asset-not-trashed',
      'The Design Asset is not in Asset Trash.'
    )
  }

  const relationships = requireRelationships(dependencies, lifecycle)
  const nextRevision = createNextRevision(
    lifecycle,
    invokeDependency(dependencies.createRevision)
  )
  const updatedAt = requireTimestamp(invokeDependency(dependencies.now))
  const update = dependencies.database.prepare(`
    UPDATE asset_lifecycle
    SET lifecycle_state = 'active',
        revision = ?,
        revision_sequence = ?,
        previous_revision = ?,
        last_transition = 'restore',
        trashed_at = NULL,
        updated_at = ?
    WHERE design_asset_identity = ?
      AND lifecycle_state = 'trash'
      AND revision = ?
      AND revision_sequence = ?
  `).run(
    nextRevision,
    lifecycle.revisionSequence + 1,
    lifecycle.revision,
    updatedAt,
    lifecycle.designAssetIdentity,
    lifecycle.revision,
    lifecycle.revisionSequence
  )
  if (update.changes !== 1) {
    throw new AssetTrashError(
      'design-asset-revision-conflict',
      'The Design Asset revision changed.'
    )
  }

  return projectSnapshot({
    ...lifecycle,
    lifecycleState: 'active',
    revision: nextRevision,
    revisionSequence: lifecycle.revisionSequence + 1,
    previousRevision: lifecycle.revision,
    lastTransition: 'restore',
    trashedAt: null
  }, relationships)
}

function requireLifecycle(
  database: Database.Database,
  designAssetIdentity: string
): LifecycleRecord {
  const asset = database.prepare(`
    SELECT 1 AS present FROM assets WHERE id = ?
  `).get(designAssetIdentity)
  if (!asset) {
    throw new AssetTrashError(
      'design-asset-not-found',
      'The Design Asset is unavailable.'
    )
  }

  const row = database.prepare(`
    SELECT
      record_version AS recordVersion,
      design_asset_identity AS designAssetIdentity,
      ownership,
      lifecycle_state AS lifecycleState,
      revision,
      revision_sequence AS revisionSequence,
      previous_revision AS previousRevision,
      last_transition AS lastTransition,
      trashed_at AS trashedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM asset_lifecycle
    WHERE design_asset_identity = ?
  `).get(designAssetIdentity) as LifecycleRow | undefined
  if (!row) {
    throw new AssetTrashError(
      'asset-lifecycle-authority-missing',
      'The Design Asset has no explicit lifecycle authority.'
    )
  }
  return decodeLifecycle(row)
}

function requirePlan(
  database: Database.Database,
  planReceipt: string
): PlanRecord {
  const row = database.prepare(`
    SELECT
      record_version AS recordVersion,
      plan_receipt AS planReceipt,
      operation_kind AS operationKind,
      design_asset_identity AS designAssetIdentity,
      expected_revision AS expectedRevision,
      expected_revision_sequence AS expectedRevisionSequence,
      relationship_digest AS relationshipDigest,
      plan_state AS planState,
      completed_result_json AS completedResultJson,
      result_revision AS resultRevision,
      planned_at AS plannedAt,
      completed_at AS completedAt
    FROM asset_trash_plans
    WHERE plan_receipt = ?
  `).get(planReceipt) as PlanRow | undefined
  if (!row) {
    throw new AssetTrashError(
      'asset-trash-plan-not-found',
      'The Asset Trash plan is unavailable.'
    )
  }
  return decodePlan(row)
}

function requireRelationships(
  dependencies: SqliteAssetTrashDependencies,
  lifecycle: LifecycleRecord
): AssetTrashRelationships {
  const projected = invokeDependency(() =>
    dependencies.relationships.inspectInCurrentTransaction({
      database: dependencies.database,
      designAssetIdentity: lifecycle.designAssetIdentity
    })
  )
  if (!projected) throw relationshipsUnavailable()

  let relationships: AssetTrashRelationships
  try {
    relationships = normalizeRelationships(projected)
  } catch {
    throw relationshipsUnavailable()
  }
  if (relationships.originalRelationship.kind !== lifecycle.ownership) {
    throw relationshipsUnavailable()
  }
  return relationships
}

function assertRevision(
  lifecycle: LifecycleRecord,
  expectedRevision: string
): void {
  if (lifecycle.revision !== expectedRevision) {
    throw new AssetTrashError(
      'design-asset-revision-conflict',
      'The Design Asset revision changed.'
    )
  }
}

function createNextRevision(
  lifecycle: LifecycleRecord,
  candidate: string
): string {
  if (!isOpaqueIdentity(candidate) || candidate === lifecycle.revision) {
    throw new AssetTrashError(
      'design-asset-revision-conflict',
      'The Design Asset revision could not advance.'
    )
  }
  return candidate
}

function protectPersistence<T>(operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    if (error instanceof AssetTrashError) throw error
    throw persistenceUnavailable()
  }
}

function invokeDependency<T>(operation: () => T): T {
  try {
    return operation()
  } catch {
    // Injected Adapters and allocators are outside this Module's trust
    // boundary. Even a look-alike domain error may contain a private path.
    throw persistenceUnavailable()
  }
}

function relationshipsUnavailable(): AssetTrashError {
  return new AssetTrashError(
    'asset-trash-relationship-unavailable',
    'The Design Asset relationship projection is unavailable.'
  )
}

function persistenceUnavailable(): AssetTrashError {
  return new AssetTrashError(
    'asset-trash-persistence-unavailable',
    'Asset Trash state is temporarily unavailable.'
  )
}

function planConflict(): AssetTrashError {
  return new AssetTrashError(
    'asset-trash-plan-conflict',
    'The Asset Trash plan identity conflicts with an existing plan.'
  )
}

function stalePlan(): AssetTrashError {
  return new AssetTrashError(
    'asset-trash-plan-stale',
    'The Design Asset changed after the Asset Trash plan was created.'
  )
}
