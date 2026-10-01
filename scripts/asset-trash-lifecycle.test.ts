import assert from 'node:assert/strict'

import {
  AssetTrashError,
  createInMemoryAssetTrashWorkflow
} from '../src/main/library-lifecycle'

let planCounter = 0
let revisionCounter = 1
const workflow = createInMemoryAssetTrashWorkflow({
  assets: [{
    designAssetIdentity: 'design-asset-1',
    revision: 'revision-1',
    originalRelationship: {
      kind: 'managed',
      managedOriginalIdentity: 'managed-original-1',
      originalStorageObjectIdentity: 'original-storage-object-1'
    },
    assetSourceIdentity: 'asset-source-1',
    tagIdentities: ['tag-1', 'tag-2'],
    collectionMembershipIdentities: [
      'collection-membership-1',
      'collection-membership-2'
    ],
    promotion: {
      candidateIdentity: 'candidate-1',
      promotionLinkIdentity: 'promotion-link-1'
    }
  }],
  createPlanReceipt: () => `trash-plan-${++planCounter}`,
  createRevision: () => `revision-${++revisionCounter}`,
  now: () => '2026-08-01T00:00:00.000Z'
})

const initial = await workflow.inspect({
  designAssetIdentity: 'design-asset-1'
})
assert.equal(initial.state, 'active')
assert.equal(initial.revision, 'revision-1')
assert.equal(initial.ownership, 'managed')

const firstPlan = await workflow.prepare({
  kind: 'move-design-asset-to-trash',
  designAssetIdentity: 'design-asset-1',
  expectedRevision: initial.revision
})
const stalePlan = await workflow.prepare({
  kind: 'move-design-asset-to-trash',
  designAssetIdentity: 'design-asset-1',
  expectedRevision: initial.revision
})

// Planning is a zero-lifecycle-write operation.
assert.deepEqual(
  await workflow.inspect({ designAssetIdentity: 'design-asset-1' }),
  initial
)
assert.deepEqual(firstPlan.plan.impact, {
  recoverable: true,
  assetRecord: 'retained',
  tagRelations: 'retained',
  original: 'retained',
  promotionHistory: 'retained'
})

const trashed = await workflow.dispatch({
  kind: 'confirm-plan',
  planReceipt: firstPlan.plan.receipt
})
assert.equal(trashed.state, 'trash')
assert.equal(trashed.designAssetIdentity, initial.designAssetIdentity)
assert.equal(trashed.revision, 'revision-2')
assert.deepEqual(trashed.originalRelationship, initial.originalRelationship)
assert.equal(trashed.assetSourceIdentity, initial.assetSourceIdentity)
assert.deepEqual(trashed.tagIdentities, ['tag-1', 'tag-2'])
assert.deepEqual(
  trashed.collectionMembershipIdentities,
  initial.collectionMembershipIdentities
)
assert.deepEqual(trashed.promotion, {
  candidateIdentity: 'candidate-1',
  promotionLinkIdentity: 'promotion-link-1',
  state: 'retained'
})
assert.deepEqual(trashed.retention, firstPlan.plan.impact)
assert.equal(trashed.trashedAt, '2026-08-01T00:00:00.000Z')

// Replaying the completed confirmation is idempotent.
assert.deepEqual(
  await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: firstPlan.plan.receipt
  }),
  trashed
)

await assert.rejects(
  workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: stalePlan.plan.receipt
  }),
  (error: unknown) =>
    error instanceof AssetTrashError &&
    error.code === 'asset-trash-plan-stale'
)

const restored = await workflow.dispatch({
  kind: 'restore-design-asset',
  designAssetIdentity: 'design-asset-1',
  expectedRevision: trashed.revision
})
assert.equal(restored.state, 'active')
assert.equal(restored.designAssetIdentity, initial.designAssetIdentity)
assert.equal(restored.revision, 'revision-3')
assert.equal(restored.trashedAt, null)
assert.deepEqual(restored.originalRelationship, trashed.originalRelationship)
assert.equal(restored.assetSourceIdentity, trashed.assetSourceIdentity)
assert.deepEqual(restored.tagIdentities, trashed.tagIdentities)
assert.deepEqual(
  restored.collectionMembershipIdentities,
  trashed.collectionMembershipIdentities
)
assert.deepEqual(restored.promotion, trashed.promotion)
assert.deepEqual(restored.retention, trashed.retention)

// A completed receipt always replays its immutable completion result, even
// after a later Restore advances the current Design Asset lifecycle.
assert.deepEqual(
  await workflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: firstPlan.plan.receipt
  }),
  trashed
)
assert.deepEqual(
  await workflow.inspect({ designAssetIdentity: 'design-asset-1' }),
  restored
)

// A lost Restore response can be retried with the original Trash revision.
assert.deepEqual(
  await workflow.dispatch({
    kind: 'restore-design-asset',
    designAssetIdentity: 'design-asset-1',
    expectedRevision: trashed.revision
  }),
  restored
)

await assert.rejects(
  workflow.dispatch({
    kind: 'restore-design-asset',
    designAssetIdentity: 'design-asset-1',
    expectedRevision: restored.revision
  }),
  (error: unknown) =>
    error instanceof AssetTrashError && error.code === 'asset-not-trashed'
)

await assert.rejects(
  workflow.inspect({ designAssetIdentity: 'missing-asset' }),
  (error: unknown) =>
    error instanceof AssetTrashError &&
    error.code === 'design-asset-not-found' &&
    !error.message.includes('/') &&
    !error.message.includes('\\')
)

const revisionFailureWorkflow = createInMemoryAssetTrashWorkflow({
  assets: [{
    designAssetIdentity: 'design-asset-revision-failure',
    revision: 'revision-fixed',
    originalRelationship: {
      kind: 'referenced',
      referencedSourceIdentity: 'referenced-source-revision-failure',
      sourceGenerationIdentity: 'source-generation-revision-failure'
    },
    assetSourceIdentity: 'asset-source-revision-failure',
    tagIdentities: [],
    collectionMembershipIdentities: [],
    promotion: null
  }],
  createPlanReceipt: () => 'trash-plan-revision-failure',
  createRevision: () => 'revision-fixed',
  now: () => '2026-08-01T00:00:00.000Z'
})
const revisionFailurePlan = await revisionFailureWorkflow.prepare({
  kind: 'move-design-asset-to-trash',
  designAssetIdentity: 'design-asset-revision-failure',
  expectedRevision: 'revision-fixed'
})
await assert.rejects(
  revisionFailureWorkflow.dispatch({
    kind: 'confirm-plan',
    planReceipt: revisionFailurePlan.plan.receipt
  }),
  (error: unknown) =>
    error instanceof AssetTrashError &&
    error.code === 'design-asset-revision-conflict'
)
assert.equal(
  (await revisionFailureWorkflow.inspect({
    designAssetIdentity: 'design-asset-revision-failure'
  })).state,
  'active'
)

const planConflictWorkflow = createInMemoryAssetTrashWorkflow({
  assets: [{
    designAssetIdentity: 'design-asset-plan-conflict',
    revision: 'revision-plan-conflict',
    originalRelationship: {
      kind: 'referenced',
      referencedSourceIdentity: 'referenced-source-plan-conflict',
      sourceGenerationIdentity: 'source-generation-plan-conflict'
    },
    assetSourceIdentity: 'asset-source-plan-conflict',
    tagIdentities: [],
    collectionMembershipIdentities: [],
    promotion: null
  }],
  createPlanReceipt: () => 'trash-plan-conflict',
  createRevision: () => 'revision-plan-conflict-next',
  now: () => '2026-08-01T00:00:00.000Z'
})
await planConflictWorkflow.prepare({
  kind: 'move-design-asset-to-trash',
  designAssetIdentity: 'design-asset-plan-conflict',
  expectedRevision: 'revision-plan-conflict'
})
await assert.rejects(
  planConflictWorkflow.prepare({
    kind: 'move-design-asset-to-trash',
    designAssetIdentity: 'design-asset-plan-conflict',
    expectedRevision: 'revision-plan-conflict'
  }),
  (error: unknown) =>
    error instanceof AssetTrashError &&
    error.code === 'asset-trash-plan-conflict'
)

console.log('asset-trash-lifecycle passed')
