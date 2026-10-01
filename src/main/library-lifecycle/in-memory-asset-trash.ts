import {
  AssetTrashError,
  cloneAssetTrashSnapshot,
  createAssetTrashRetention,
  createAssetTrashSnapshot,
  type AssetPromotionHistory,
  type AssetTrashPlan,
  type AssetTrashSnapshot,
  type AssetTrashWorkflow,
  type OriginalAssetRelationship
} from './asset-trash'

export interface InMemoryAssetTrashSeed {
  designAssetIdentity: string
  revision: string
  originalRelationship: OriginalAssetRelationship
  assetSourceIdentity: string
  tagIdentities: readonly string[]
  collectionMembershipIdentities: readonly string[]
  promotion: AssetPromotionHistory | null
}

export interface InMemoryAssetTrashDependencies {
  assets: readonly InMemoryAssetTrashSeed[]
  createPlanReceipt(): string
  createRevision(): string
  now(): string
}

interface AssetTrashRecord extends InMemoryAssetTrashSeed {
  state: 'active' | 'trash'
  trashedAt: string | null
  previousRevision: string | null
  lastTransition: 'registered' | 'move-to-trash' | 'restore'
  revisionSequence: number
}

interface StoredTrashPlan {
  designAssetIdentity: string
  expectedRevision: string
  expectedRevisionSequence: number
  completedSnapshot: AssetTrashSnapshot | null
}

/**
 * Non-production Implementation used to prove the recoverable Asset Trash
 * lifecycle before any SQLite schema or existing delete behavior changes.
 */
export function createInMemoryAssetTrashWorkflow(
  dependencies: InMemoryAssetTrashDependencies
): AssetTrashWorkflow {
  const assets = new Map<string, AssetTrashRecord>()
  const plans = new Map<string, StoredTrashPlan>()

  for (const seed of dependencies.assets) {
    if (assets.has(seed.designAssetIdentity)) {
      throw new AssetTrashError(
        'design-asset-revision-conflict',
        'The Design Asset lifecycle seed is ambiguous.'
      )
    }
    assets.set(seed.designAssetIdentity, {
      ...seed,
      originalRelationship: { ...seed.originalRelationship },
      tagIdentities: [...seed.tagIdentities],
      collectionMembershipIdentities: [
        ...seed.collectionMembershipIdentities
      ],
      promotion: seed.promotion ? { ...seed.promotion } : null,
      state: 'active',
      trashedAt: null,
      previousRevision: null,
      lastTransition: 'registered',
      revisionSequence: 0
    })
  }

  return {
    async prepare(input) {
      const asset = requireAsset(assets, input.designAssetIdentity)
      assertRevision(asset, input.expectedRevision)
      if (asset.state === 'trash') {
        throw new AssetTrashError(
          'asset-already-trashed',
          'The Design Asset is already in Asset Trash.'
        )
      }

      const receipt = dependencies.createPlanReceipt()
      if (plans.has(receipt)) {
        throw new AssetTrashError(
          'asset-trash-plan-conflict',
          'The Asset Trash plan identity conflicts with an existing plan.'
        )
      }
      plans.set(receipt, {
        designAssetIdentity: asset.designAssetIdentity,
        expectedRevision: asset.revision,
        expectedRevisionSequence: asset.revisionSequence,
        completedSnapshot: null
      })
      return {
        kind: 'planned' as const,
        plan: {
          receipt,
          designAssetIdentity: asset.designAssetIdentity,
          expectedRevision: asset.revision,
          impact: createAssetTrashRetention(asset)
        }
      }
    },

    async dispatch(command) {
      if (command.kind === 'restore-design-asset') {
        const asset = requireAsset(assets, command.designAssetIdentity)
        if (
          asset.state === 'active' &&
          asset.lastTransition === 'restore' &&
          asset.previousRevision === command.expectedRevision
        ) {
          return projectAsset(asset)
        }
        assertRevision(asset, command.expectedRevision)
        if (asset.state !== 'trash') {
          throw new AssetTrashError(
            'asset-not-trashed',
            'The Design Asset is not in Asset Trash.'
          )
        }
        const nextRevision = createNextRevision(asset, dependencies)
        asset.previousRevision = asset.revision
        asset.lastTransition = 'restore'
        asset.revisionSequence += 1
        asset.state = 'active'
        asset.trashedAt = null
        asset.revision = nextRevision
        return projectAsset(asset)
      }

      const plan = plans.get(command.planReceipt)
      if (!plan) {
        throw new AssetTrashError(
          'asset-trash-plan-not-found',
          'The Asset Trash plan is unavailable.'
        )
      }
      const asset = requireAsset(assets, plan.designAssetIdentity)
      if (plan.completedSnapshot) {
        return cloneAssetTrashSnapshot(plan.completedSnapshot)
      }
      if (
        asset.state !== 'active' ||
        asset.revision !== plan.expectedRevision ||
        asset.revisionSequence !== plan.expectedRevisionSequence
      ) {
        throw new AssetTrashError(
          'asset-trash-plan-stale',
          'The Design Asset changed after the Asset Trash plan was created.'
        )
      }

      const nextRevision = createNextRevision(asset, dependencies)
      const trashedAt = dependencies.now()
      asset.previousRevision = asset.revision
      asset.lastTransition = 'move-to-trash'
      asset.revisionSequence += 1
      asset.state = 'trash'
      asset.trashedAt = trashedAt
      asset.revision = nextRevision
      const completedSnapshot = projectAsset(asset)
      plan.completedSnapshot = completedSnapshot
      return cloneAssetTrashSnapshot(completedSnapshot)
    },

    async inspect(request) {
      return projectAsset(requireAsset(assets, request.designAssetIdentity))
    }
  }
}

function requireAsset(
  assets: Map<string, AssetTrashRecord>,
  designAssetIdentity: string
): AssetTrashRecord {
  const asset = assets.get(designAssetIdentity)
  if (!asset) {
    throw new AssetTrashError(
      'design-asset-not-found',
      'The Design Asset is unavailable.'
    )
  }
  return asset
}

function assertRevision(asset: AssetTrashRecord, expectedRevision: string): void {
  if (asset.revision !== expectedRevision) {
    throw new AssetTrashError(
      'design-asset-revision-conflict',
      'The Design Asset revision changed.'
    )
  }
}

function createNextRevision(
  asset: AssetTrashRecord,
  dependencies: InMemoryAssetTrashDependencies
): string {
  const nextRevision = dependencies.createRevision()
  if (!nextRevision || nextRevision === asset.revision) {
    throw new AssetTrashError(
      'design-asset-revision-conflict',
      'The Design Asset revision could not advance.'
    )
  }
  return nextRevision
}

function projectAsset(asset: AssetTrashRecord): AssetTrashSnapshot {
  return createAssetTrashSnapshot({
    designAssetIdentity: asset.designAssetIdentity,
    revision: asset.revision,
    state: asset.state,
    ownership: asset.originalRelationship.kind,
    trashedAt: asset.trashedAt
  }, asset)
}
