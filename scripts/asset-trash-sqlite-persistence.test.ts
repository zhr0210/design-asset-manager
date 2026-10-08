import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import {
  AssetTrashError,
  type AssetTrashRelationships
} from '../src/main/library-lifecycle'
import { createSqliteAssetTrashWorkflow } from
  '../src/main/library-lifecycle/sqlite-asset-trash.adapter'
import {
  CREATE_ASSET_TAGS_TABLE,
  CREATE_TAGS_TABLE,
  initializeCaptureIntakeSchema
} from '../src/main/db/schema'
import {
  createManagedRelationships,
  createReferencedRelationships,
  insertAsset,
  registerGovernedAsset,
  tableNames
} from './asset-trash-sqlite-test-support'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(
  path.join(testParent, 'asset-trash-sqlite-')
)
const databasePath = path.join(testRoot, 'tracer.sqlite')
const timestamp = '2026-08-01T00:00:00.000Z'

let database: Database.Database | undefined
let planCounter = 0
let revisionCounter = 1
let clockCounter = 0
let relationshipReads = 0
let relationshipFailure: Error | null = null

const relationships = new Map<string, AssetTrashRelationships>()

function readRelationships(
  designAssetIdentity: string
): AssetTrashRelationships | null {
  relationshipReads += 1
  if (relationshipFailure) throw relationshipFailure
  return relationships.get(designAssetIdentity) ?? null
}

function createWorkflow(
  connection: Database.Database,
  overrides: {
    createPlanReceipt?: () => string
    createRevision?: () => string
    now?: () => string
  } = {}
) {
  return createSqliteAssetTrashWorkflow({
    database: connection,
    relationships: {
      inspectInCurrentTransaction: ({ designAssetIdentity }) =>
        readRelationships(designAssetIdentity)
    },
    createPlanReceipt: overrides.createPlanReceipt ??
      (() => `trash-plan-${++planCounter}`),
    createRevision: overrides.createRevision ??
      (() => `revision-${++revisionCounter}`),
    now: overrides.now ?? (() => new Date(
      Date.parse(timestamp) + (++clockCounter * 1_000)
    ).toISOString())
  })
}

function assertDomainError(
  code: AssetTrashError['code'],
  expectedMessage?: string
): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof AssetTrashError &&
    error.code === code &&
    (expectedMessage === undefined || error.message === expectedMessage)
}

try {
  database = new Database(databasePath)
  database.pragma('foreign_keys = ON')
  initializeCaptureIntakeSchema(database)
  database.exec(CREATE_TAGS_TABLE)
  database.exec(CREATE_ASSET_TAGS_TABLE)

  const tablesBeforeAdapter = tableNames(database)
  const assetsColumnsBefore = database.prepare(
    'PRAGMA table_info(assets)'
  ).all()
  const workflow = createWorkflow(database)
  const addedTables = [...tableNames(database)].filter(
    (name) => !tablesBeforeAdapter.has(name)
  )
  assert.deepEqual(addedTables.sort(), [
    'asset_lifecycle',
    'asset_trash_plans'
  ])
  assert.deepEqual(
    database.prepare('PRAGMA table_info(assets)').all(),
    assetsColumnsBefore
  )
  assert.equal(
    database.prepare('SELECT COUNT(*) AS count FROM asset_lifecycle')
      .get<{ count: number }>()?.count,
    0
  )
  assert.equal(database.pragma('foreign_keys', { simple: true }), 1)

  const malformedSchemaDatabase = new Database(':memory:')
  try {
    initializeCaptureIntakeSchema(malformedSchemaDatabase)
    malformedSchemaDatabase.exec(`
      CREATE TABLE asset_lifecycle (
        record_version INTEGER,
        design_asset_identity TEXT,
        ownership TEXT,
        lifecycle_state TEXT,
        revision TEXT,
        revision_sequence INTEGER,
        previous_revision TEXT,
        last_transition TEXT,
        trashed_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `)
    assert.throws(
      () => createWorkflow(malformedSchemaDatabase),
      assertDomainError('asset-trash-persistence-unavailable')
    )
  } finally {
    malformedSchemaDatabase.close()
  }

  const managedIdentity = 'design-asset-managed'
  const managedRelationships = createManagedRelationships('managed', {
    tagIdentities: ['tag-managed-2', 'tag-managed-1'],
    collectionMembershipIdentities: [
      'collection-membership-managed-2',
      'collection-membership-managed-1'
    ],
    promotion: true
  })
  registerGovernedAsset(
    database,
    relationships,
    managedIdentity,
    'revision-1',
    managedRelationships,
    true
  )

  const initial = await workflow.inspect({
    designAssetIdentity: managedIdentity
  })
  assert.equal(initial.state, 'active')
  assert.equal(initial.revision, 'revision-1')
  assert.deepEqual(initial.tagIdentities, ['tag-managed-1', 'tag-managed-2'])

  const firstPlan = await workflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: managedIdentity,
    expectedRevision: initial.revision
  })
  const stalePlan = await workflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: managedIdentity,
    expectedRevision: initial.revision
  })
  assert.deepEqual(
    await workflow.inspect({ designAssetIdentity: managedIdentity }),
    initial
  )
  assert.equal(
    database.prepare(`
      SELECT lifecycle_state AS state
      FROM asset_lifecycle
      WHERE design_asset_identity = ?
    `).get<{ state: string }>(managedIdentity)?.state,
    'active'
  )

  // An unfinished plan survives a real connection restart.
  database.close()
  database = new Database(databasePath)
  const reopenedWorkflow = createWorkflow(database)
  const trashed = await reopenedWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: firstPlan.plan.receipt
  })
  assert.equal(trashed.state, 'trash')
  assert.equal(trashed.revision, 'revision-2')
  assert.deepEqual(trashed.originalRelationship, initial.originalRelationship)
  assert.equal(trashed.assetSourceIdentity, initial.assetSourceIdentity)
  assert.deepEqual(trashed.tagIdentities, initial.tagIdentities)
  assert.deepEqual(
    trashed.collectionMembershipIdentities,
    initial.collectionMembershipIdentities
  )
  assert.deepEqual(trashed.promotion, initial.promotion)

  await assert.rejects(
    reopenedWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: stalePlan.plan.receipt
    }),
    assertDomainError('asset-trash-plan-stale')
  )

  // Completed receipt replay never consults mutable current relationships.
  const readsBeforeReplay = relationshipReads
  relationshipFailure = new Error(`${testRoot}/projection-must-not-run`)
  assert.deepEqual(
    await reopenedWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: firstPlan.plan.receipt
    }),
    trashed
  )
  assert.equal(relationshipReads, readsBeforeReplay)
  relationshipFailure = null

  const restored = await reopenedWorkflow.dispatch({
    kind: 'restore-design-asset',
    designAssetIdentity: managedIdentity,
    expectedRevision: trashed.revision
  })
  assert.equal(restored.state, 'active')
  assert.equal(restored.revision, 'revision-3')
  assert.equal(restored.trashedAt, null)
  assert.deepEqual(restored.originalRelationship, trashed.originalRelationship)
  assert.deepEqual(restored.tagIdentities, trashed.tagIdentities)
  assert.deepEqual(restored.promotion, trashed.promotion)
  assert.deepEqual(
    await reopenedWorkflow.dispatch({
      kind: 'restore-design-asset',
      designAssetIdentity: managedIdentity,
      expectedRevision: trashed.revision
    }),
    restored
  )

  database.close()
  database = new Database(databasePath)
  const restoredRestartWorkflow = createWorkflow(database)
  assert.deepEqual(
    await restoredRestartWorkflow.inspect({
      designAssetIdentity: managedIdentity
    }),
    restored
  )
  relationshipFailure = new Error(`${testRoot}/restart-replay-must-not-run`)
  assert.deepEqual(
    await restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: firstPlan.plan.receipt
    }),
    trashed
  )
  relationshipFailure = null

  // Two simultaneously open connections share durable plans and observe a
  // coherent committed lifecycle snapshot through their own transactions.
  const livePeerIdentity = 'design-asset-live-peer'
  registerGovernedAsset(
    database,
    relationships,
    livePeerIdentity,
    'revision-live-peer',
    createReferencedRelationships('live-peer')
  )
  const livePeerDatabase = new Database(databasePath)
  try {
    const livePeerWorkflow = createWorkflow(livePeerDatabase)
    const livePeerPlan = await livePeerWorkflow.prepare({
      kind: 'move-design-asset-to-trash',
      designAssetIdentity: livePeerIdentity,
      expectedRevision: 'revision-live-peer'
    })
    const livePeerTrashed = await restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: livePeerPlan.plan.receipt
    })
    assert.deepEqual(
      await livePeerWorkflow.inspect({
        designAssetIdentity: livePeerIdentity
      }),
      livePeerTrashed
    )
  } finally {
    livePeerDatabase.close()
  }

  // A relationship change without a lifecycle revision change invalidates a
  // prepared plan instead of silently retaining the wrong relationship set.
  const relationshipChangeIdentity = 'design-asset-relationship-change'
  registerGovernedAsset(
    database,
    relationships,
    relationshipChangeIdentity,
    'revision-relationship-change',
    createReferencedRelationships('change', ['tag-change-before'])
  )
  const relationshipChangePlan = await restoredRestartWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: relationshipChangeIdentity,
    expectedRevision: 'revision-relationship-change'
  })
  relationships.set(relationshipChangeIdentity, {
    ...relationships.get(relationshipChangeIdentity)!,
    tagIdentities: ['tag-change-after']
  })
  await assert.rejects(
    restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: relationshipChangePlan.plan.receipt
    }),
    assertDomainError('asset-trash-plan-stale')
  )

  // Canonical membership ordering uses a binary total order, not locale
  // collation where distinct Unicode identities can compare equal.
  const unicodeIdentity = 'design-asset-unicode-order'
  const unicodeRelationships = createReferencedRelationships(
    'unicode',
    ['Å', 'Å']
  )
  registerGovernedAsset(
    database,
    relationships,
    unicodeIdentity,
    'revision-unicode-order',
    unicodeRelationships
  )
  const unicodePlan = await restoredRestartWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: unicodeIdentity,
    expectedRevision: 'revision-unicode-order'
  })
  relationships.set(unicodeIdentity, {
    ...unicodeRelationships,
    tagIdentities: [...unicodeRelationships.tagIdentities].reverse()
  })
  assert.equal((await restoredRestartWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: unicodePlan.plan.receipt
  })).state, 'trash')

  // Internal revision sequence prevents an old plan from reviving if an
  // allocator later reuses the same outward revision string (ABA).
  const abaIdentity = 'design-asset-aba'
  registerGovernedAsset(
    database,
    relationships,
    abaIdentity,
    'revision-aba-a',
    createReferencedRelationships('aba')
  )
  const abaTransitionWorkflow = createWorkflow(database, {
    createRevision: () => 'revision-aba-b'
  })
  const abaOldPlan = await abaTransitionWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: abaIdentity,
    expectedRevision: 'revision-aba-a'
  })
  const abaTransitionPlan = await abaTransitionWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: abaIdentity,
    expectedRevision: 'revision-aba-a'
  })
  const abaTrashed = await abaTransitionWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: abaTransitionPlan.plan.receipt
  })
  const abaRestoreWorkflow = createWorkflow(database, {
    createRevision: () => 'revision-aba-a'
  })
  const abaRestored = await abaRestoreWorkflow.dispatch({
    kind: 'restore-design-asset',
    designAssetIdentity: abaIdentity,
    expectedRevision: abaTrashed.revision
  })
  assert.equal(abaRestored.revision, 'revision-aba-a')
  await assert.rejects(
    restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: abaOldPlan.plan.receipt
    }),
    assertDomainError('asset-trash-plan-stale')
  )

  // Force failure after lifecycle CAS but before plan completion. SQLite must
  // roll the lifecycle update back and permit the same plan to be retried.
  const rollbackIdentity = 'design-asset-rollback'
  registerGovernedAsset(
    database,
    relationships,
    rollbackIdentity,
    'revision-rollback',
    createManagedRelationships('rollback')
  )
  const rollbackPlan = await restoredRestartWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: rollbackIdentity,
    expectedRevision: 'revision-rollback'
  })
  database.exec(`
    CREATE TEMP TRIGGER fail_asset_trash_plan_completion
    BEFORE UPDATE OF completed_result_json ON asset_trash_plans
    WHEN NEW.completed_result_json IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, '/private/generated/rollback-sentinel');
    END;
  `)
  await assert.rejects(
    restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: rollbackPlan.plan.receipt
    }),
    assertDomainError(
      'asset-trash-persistence-unavailable',
      'Asset Trash state is temporarily unavailable.'
    )
  )
  assert.equal(
    (await restoredRestartWorkflow.inspect({
      designAssetIdentity: rollbackIdentity
    })).state,
    'active'
  )
  database.exec('DROP TRIGGER fail_asset_trash_plan_completion')
  assert.equal((await restoredRestartWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: rollbackPlan.plan.receipt
  })).state, 'trash')

  // A wall-clock rollback is rejected before lifecycle CAS and receipt
  // completion, so the first response cannot create an unreplayable receipt.
  const clockRollbackIdentity = 'design-asset-clock-rollback'
  registerGovernedAsset(
    database,
    relationships,
    clockRollbackIdentity,
    'revision-clock-rollback',
    createReferencedRelationships('clock-rollback')
  )
  const rollbackTimes = [
    '2026-08-01T01:00:00.000Z',
    '2026-08-01T00:59:59.000Z'
  ]
  const clockRollbackWorkflow = createWorkflow(database, {
    now: () => rollbackTimes.shift() ?? '2026-08-01T00:59:59.000Z'
  })
  const clockRollbackPlan = await clockRollbackWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: clockRollbackIdentity,
    expectedRevision: 'revision-clock-rollback'
  })
  await assert.rejects(
    clockRollbackWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: clockRollbackPlan.plan.receipt
    }),
    assertDomainError('asset-trash-persistence-unavailable')
  )
  assert.equal((await clockRollbackWorkflow.inspect({
    designAssetIdentity: clockRollbackIdentity
  })).state, 'active')
  const clockRecoveryWorkflow = createWorkflow(database, {
    now: () => '2026-08-01T01:00:01.000Z'
  })
  assert.equal((await clockRecoveryWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: clockRollbackPlan.plan.receipt
  })).state, 'trash')

  // Referenced Source ownership is explicit and remains external-untouched.
  const referencedIdentity = 'design-asset-referenced'
  const referencedRelationships = createReferencedRelationships('referenced')
  registerGovernedAsset(
    database,
    relationships,
    referencedIdentity,
    'revision-referenced',
    referencedRelationships
  )
  const referencedPlan = await restoredRestartWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: referencedIdentity,
    expectedRevision: 'revision-referenced'
  })
  assert.equal(referencedPlan.plan.impact.original, 'external-untouched')
  const referencedTrashed = await restoredRestartWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: referencedPlan.plan.receipt
  })
  assert.deepEqual(
    referencedTrashed.originalRelationship,
    referencedRelationships.originalRelationship
  )
  assert.equal(referencedTrashed.promotion, null)

  const restoreRevisionFailureWorkflow = createWorkflow(database, {
    createRevision: () => referencedTrashed.revision
  })
  await assert.rejects(
    restoreRevisionFailureWorkflow.dispatch({
      kind: 'restore-design-asset',
      designAssetIdentity: referencedIdentity,
      expectedRevision: referencedTrashed.revision
    }),
    assertDomainError('design-asset-revision-conflict')
  )
  assert.deepEqual(
    await restoredRestartWorkflow.inspect({
      designAssetIdentity: referencedIdentity
    }),
    referencedTrashed
  )

  // A legacy Asset and even a complete projection cannot synthesize lifecycle
  // authority. Construction, inspect, and prepare perform no backfill.
  const legacyIdentity = 'design-asset-legacy'
  insertAsset(database, legacyIdentity)
  relationships.set(legacyIdentity, createManagedRelationships('legacy'))
  const legacyWorkflow = createWorkflow(database)
  await assert.rejects(
    legacyWorkflow.inspect({ designAssetIdentity: legacyIdentity }),
    assertDomainError('asset-lifecycle-authority-missing')
  )
  await assert.rejects(
    legacyWorkflow.prepare({
      kind: 'move-design-asset-to-trash',
      designAssetIdentity: legacyIdentity,
      expectedRevision: 'legacy-guessed-revision'
    }),
    assertDomainError('asset-lifecycle-authority-missing')
  )
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count
      FROM asset_lifecycle
      WHERE design_asset_identity = ?
    `).get<{ count: number }>(legacyIdentity)?.count,
    0
  )

  // The current hard-delete shape cannot bypass an explicitly governed Asset.
  // Its earlier tag deletion also rolls back when lifecycle RESTRICT rejects
  // the Asset deletion.
  const hardDeleteIdentity = 'design-asset-hard-delete'
  registerGovernedAsset(
    database,
    relationships,
    hardDeleteIdentity,
    'revision-hard-delete',
    createManagedRelationships('hard-delete', {
      tagIdentities: ['tag-hard-delete']
    }),
    true
  )
  assert.throws(
    () => database!.transaction(() => {
      database!.prepare(
        'DELETE FROM asset_tags WHERE asset_id = ?'
      ).run(hardDeleteIdentity)
      database!.prepare('DELETE FROM assets WHERE id = ?')
        .run(hardDeleteIdentity)
    }).immediate(),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code.startsWith('SQLITE_CONSTRAINT')
  )
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM asset_tags WHERE asset_id = ?
    `).get<{ count: number }>(hardDeleteIdentity)?.count,
    1
  )
  assert.equal((await restoredRestartWorkflow.inspect({
    designAssetIdentity: hardDeleteIdentity
  })).state, 'active')

  // Identity allocator failures leave both lifecycle and plan retry state safe.
  const revisionFailureIdentity = 'design-asset-revision-failure'
  registerGovernedAsset(
    database,
    relationships,
    revisionFailureIdentity,
    'revision-fixed',
    createReferencedRelationships('revision-failure')
  )
  const revisionFailureWorkflow = createWorkflow(database, {
    createRevision: () => 'revision-fixed'
  })
  const revisionFailurePlan = await revisionFailureWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: revisionFailureIdentity,
    expectedRevision: 'revision-fixed'
  })
  await assert.rejects(
    revisionFailureWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: revisionFailurePlan.plan.receipt
    }),
    assertDomainError('design-asset-revision-conflict')
  )
  assert.equal((await revisionFailureWorkflow.inspect({
    designAssetIdentity: revisionFailureIdentity
  })).state, 'active')

  // Receipt collisions never overwrite the first durable plan.
  const planConflictIdentity = 'design-asset-plan-conflict'
  registerGovernedAsset(
    database,
    relationships,
    planConflictIdentity,
    'revision-plan-conflict',
    createReferencedRelationships('plan-conflict')
  )
  const planConflictWorkflow = createWorkflow(database, {
    createPlanReceipt: () => 'trash-plan-fixed-conflict'
  })
  await planConflictWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: planConflictIdentity,
    expectedRevision: 'revision-plan-conflict'
  })
  await assert.rejects(
    planConflictWorkflow.prepare({
      kind: 'move-design-asset-to-trash',
      designAssetIdentity: planConflictIdentity,
      expectedRevision: 'revision-plan-conflict'
    }),
    assertDomainError('asset-trash-plan-conflict')
  )

  // Version-valid but altered receipt relationships cannot be replayed as
  // immutable evidence. Restore the fixture after probing the decoder.
  const storedResult = database.prepare(`
    SELECT completed_result_json AS completedResultJson
    FROM asset_trash_plans
    WHERE plan_receipt = ?
  `).get<{ completedResultJson: string }>(firstPlan.plan.receipt)
    ?.completedResultJson
  assert.ok(storedResult)
  const alteredResult = JSON.parse(storedResult) as {
    relationships: { assetSourceIdentity: string }
  }
  alteredResult.relationships.assetSourceIdentity = 'asset-source-altered'
  database.prepare(`
    UPDATE asset_trash_plans
    SET completed_result_json = ?
    WHERE plan_receipt = ?
  `).run(JSON.stringify(alteredResult), firstPlan.plan.receipt)
  await assert.rejects(
    restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: firstPlan.plan.receipt
    }),
    assertDomainError('asset-trash-persistence-unavailable')
  )
  database.prepare(`
    UPDATE asset_trash_plans
    SET completed_result_json = ?
    WHERE plan_receipt = ?
  `).run(storedResult, firstPlan.plan.receipt)
  assert.deepEqual(
    await restoredRestartWorkflow.dispatch({
      kind: 'confirm-plan',
      planReceipt: firstPlan.plan.receipt
    }),
    trashed
  )

  // A closed connection and a projection exception expose only fixed errors.
  relationshipFailure = new AssetTrashError(
    'asset-trash-plan-stale',
    `${testRoot}/sensitive-projection-message`
  )
  await assert.rejects(
    restoredRestartWorkflow.inspect({
      designAssetIdentity: hardDeleteIdentity
    }),
    (error: unknown) =>
      assertDomainError(
        'asset-trash-persistence-unavailable',
        'Asset Trash state is temporarily unavailable.'
      )(error) &&
      error instanceof Error &&
      !error.message.includes(testRoot) &&
      !error.message.includes('/') &&
      !error.message.includes('\\')
  )
  relationshipFailure = null

  const closedWorkflow = createWorkflow(database)
  database.close()
  database = undefined
  await assert.rejects(
    closedWorkflow.inspect({ designAssetIdentity: hardDeleteIdentity }),
    (error: unknown) =>
      assertDomainError(
        'asset-trash-persistence-unavailable',
        'Asset Trash state is temporarily unavailable.'
      )(error) &&
      error instanceof Error &&
      !error.message.includes(testRoot) &&
      !error.message.includes('asset_lifecycle') &&
      !error.message.includes('/') &&
      !error.message.includes('\\')
  )

  console.log('asset-trash-sqlite-persistence passed')
} finally {
  database?.close()
  await fs.rm(testRoot, { recursive: true, force: true })
}
