export type AssetTrashErrorCode =
  | 'design-asset-not-found'
  | 'design-asset-revision-conflict'
  | 'asset-lifecycle-authority-missing'
  | 'asset-trash-relationship-unavailable'
  | 'asset-trash-persistence-unavailable'
  | 'asset-trash-plan-not-found'
  | 'asset-trash-plan-conflict'
  | 'asset-trash-plan-stale'
  | 'asset-already-trashed'
  | 'asset-not-trashed'

export class AssetTrashError extends Error {
  constructor(readonly code: AssetTrashErrorCode, message: string) {
    super(message)
    this.name = 'AssetTrashError'
  }
}

export interface AssetPromotionHistory {
  candidateIdentity: string
  promotionLinkIdentity: string
}

export type OriginalAssetRelationship =
  | {
      kind: 'managed'
      managedOriginalIdentity: string
      originalStorageObjectIdentity: string
    }
  | {
      kind: 'referenced'
      referencedSourceIdentity: string
      sourceGenerationIdentity: string
    }

export interface AssetTrashRelationships {
  originalRelationship: OriginalAssetRelationship
  assetSourceIdentity: string
  tagIdentities: readonly string[]
  collectionMembershipIdentities: readonly string[]
  promotion: AssetPromotionHistory | null
}

export interface AssetTrashPlan {
  receipt: string
  designAssetIdentity: string
  expectedRevision: string
  impact: {
    recoverable: true
    assetRecord: 'retained'
    tagRelations: 'retained'
    original: 'retained' | 'external-untouched'
    promotionHistory: 'retained' | 'not-applicable'
  }
}

export interface AssetTrashSnapshot extends AssetTrashRelationships {
  designAssetIdentity: string
  revision: string
  state: 'active' | 'trash'
  ownership: 'managed' | 'referenced'
  promotion: (AssetPromotionHistory & { state: 'retained' }) | null
  retention: AssetTrashPlan['impact']
  trashedAt: string | null
}

export interface AssetTrashWorkflow {
  prepare(input: {
    kind: 'move-design-asset-to-trash'
    designAssetIdentity: string
    expectedRevision: string
  }): Promise<{ kind: 'planned'; plan: AssetTrashPlan }>
  dispatch(command:
    | { kind: 'confirm-plan'; planReceipt: string }
    | {
        kind: 'restore-design-asset'
        designAssetIdentity: string
        expectedRevision: string
      }
  ): Promise<AssetTrashSnapshot>
  inspect(request: {
    designAssetIdentity: string
  }): Promise<AssetTrashSnapshot>
}

export interface AssetTrashLifecycleProjection {
  designAssetIdentity: string
  revision: string
  state: 'active' | 'trash'
  ownership: 'managed' | 'referenced'
  trashedAt: string | null
}

export function createAssetTrashRetention(
  relationships: AssetTrashRelationships
): AssetTrashPlan['impact'] {
  return {
    recoverable: true,
    assetRecord: 'retained',
    tagRelations: 'retained',
    original: relationships.originalRelationship.kind === 'managed'
      ? 'retained'
      : 'external-untouched',
    promotionHistory: relationships.promotion
      ? 'retained'
      : 'not-applicable'
  }
}

export function cloneAssetTrashSnapshot(
  snapshot: AssetTrashSnapshot
): AssetTrashSnapshot {
  return {
    ...snapshot,
    originalRelationship: { ...snapshot.originalRelationship },
    tagIdentities: [...snapshot.tagIdentities],
    collectionMembershipIdentities: [
      ...snapshot.collectionMembershipIdentities
    ],
    promotion: snapshot.promotion ? { ...snapshot.promotion } : null,
    retention: { ...snapshot.retention }
  }
}

export function createAssetTrashSnapshot(
  lifecycle: AssetTrashLifecycleProjection,
  relationships: AssetTrashRelationships
): AssetTrashSnapshot {
  return {
    ...lifecycle,
    originalRelationship: { ...relationships.originalRelationship },
    assetSourceIdentity: relationships.assetSourceIdentity,
    tagIdentities: [...relationships.tagIdentities],
    collectionMembershipIdentities: [
      ...relationships.collectionMembershipIdentities
    ],
    promotion: relationships.promotion
      ? { ...relationships.promotion, state: 'retained' }
      : null,
    retention: createAssetTrashRetention(relationships)
  }
}
