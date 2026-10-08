import { createHash } from 'node:crypto'

import {
  createAssetTrashSnapshot,
  type AssetPromotionHistory,
  type AssetTrashRelationships,
  type AssetTrashSnapshot,
  type OriginalAssetRelationship
} from './asset-trash'

export const ASSET_LIFECYCLE_RECORD_VERSION = 1
export const ASSET_TRASH_PLAN_RECORD_VERSION = 1
export const ASSET_TRASH_RESULT_VERSION = 1

export interface LifecycleRow {
  recordVersion: number
  designAssetIdentity: string
  ownership: string
  lifecycleState: string
  revision: string
  revisionSequence: number
  previousRevision: string | null
  lastTransition: string
  trashedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LifecycleRecord {
  designAssetIdentity: string
  ownership: 'managed' | 'referenced'
  lifecycleState: 'active' | 'trash'
  revision: string
  revisionSequence: number
  previousRevision: string | null
  lastTransition: 'registered' | 'move-to-trash' | 'restore'
  trashedAt: string | null
}

export interface PlanRow {
  recordVersion: number
  planReceipt: string
  operationKind: string
  designAssetIdentity: string
  expectedRevision: string
  expectedRevisionSequence: number
  relationshipDigest: string
  planState: string
  completedResultJson: string | null
  resultRevision: string | null
  plannedAt: string
  completedAt: string | null
}

export interface PlanRecord extends Omit<PlanRow,
  'recordVersion' | 'operationKind' | 'planState'> {
  planState: 'planned' | 'completed'
}

interface CompletedResultRecord {
  recordVersion: 1
  designAssetIdentity: string
  revision: string
  ownership: 'managed' | 'referenced'
  relationships: AssetTrashRelationships
  trashedAt: string
}

export function normalizeRelationships(input: unknown): AssetTrashRelationships {
  if (!isRecord(input)) throw new Error('Invalid relationships')
  const originalRelationship = normalizeOriginalRelationship(
    input.originalRelationship
  )
  const assetSourceIdentity = requireOpaqueIdentity(input.assetSourceIdentity)
  const tagIdentities = normalizeIdentitySet(input.tagIdentities)
  const collectionMembershipIdentities = normalizeIdentitySet(
    input.collectionMembershipIdentities
  )
  const promotion = normalizePromotion(input.promotion)
  return {
    originalRelationship,
    assetSourceIdentity,
    tagIdentities,
    collectionMembershipIdentities,
    promotion
  }
}

export function digestRelationships(
  relationships: AssetTrashRelationships
): string {
  return createHash('sha256')
    .update(JSON.stringify(relationships))
    .digest('hex')
}

export function projectSnapshot(
  lifecycle: LifecycleRecord,
  relationships: AssetTrashRelationships
): AssetTrashSnapshot {
  return createAssetTrashSnapshot({
    designAssetIdentity: lifecycle.designAssetIdentity,
    revision: lifecycle.revision,
    state: lifecycle.lifecycleState,
    ownership: lifecycle.ownership,
    trashedAt: lifecycle.trashedAt
  }, relationships)
}

export function encodeCompletedSnapshot(snapshot: AssetTrashSnapshot): string {
  const result: CompletedResultRecord = {
    recordVersion: ASSET_TRASH_RESULT_VERSION,
    designAssetIdentity: snapshot.designAssetIdentity,
    revision: snapshot.revision,
    ownership: snapshot.ownership,
    relationships: {
      originalRelationship: { ...snapshot.originalRelationship },
      assetSourceIdentity: snapshot.assetSourceIdentity,
      tagIdentities: [...snapshot.tagIdentities],
      collectionMembershipIdentities: [
        ...snapshot.collectionMembershipIdentities
      ],
      promotion: snapshot.promotion
        ? {
            candidateIdentity: snapshot.promotion.candidateIdentity,
            promotionLinkIdentity: snapshot.promotion.promotionLinkIdentity
          }
        : null
    },
    trashedAt: requireTimestamp(snapshot.trashedAt)
  }
  return JSON.stringify(result)
}

export function decodeCompletedSnapshot(plan: PlanRecord): AssetTrashSnapshot {
  if (
    plan.completedResultJson === null ||
    plan.resultRevision === null ||
    plan.completedAt === null
  ) {
    throw new Error('Invalid completed plan')
  }

  const parsed: unknown = JSON.parse(plan.completedResultJson)
  if (!isRecord(parsed) || parsed.recordVersion !== ASSET_TRASH_RESULT_VERSION) {
    throw new Error('Unknown Asset Trash result version')
  }
  const designAssetIdentity = requireOpaqueIdentity(
    parsed.designAssetIdentity
  )
  const revision = requireOpaqueIdentity(parsed.revision)
  const ownership = parsed.ownership
  if (ownership !== 'managed' && ownership !== 'referenced') {
    throw new Error('Invalid completed ownership')
  }
  const relationships = normalizeRelationships(parsed.relationships)
  const trashedAt = requireTimestamp(parsed.trashedAt)
  if (
    designAssetIdentity !== plan.designAssetIdentity ||
    revision !== plan.resultRevision ||
    ownership !== relationships.originalRelationship.kind ||
    trashedAt !== plan.completedAt ||
    digestRelationships(relationships) !== plan.relationshipDigest
  ) {
    throw new Error('Completed result does not match its plan')
  }

  return projectSnapshot({
    designAssetIdentity,
    ownership,
    lifecycleState: 'trash',
    revision,
    revisionSequence: plan.expectedRevisionSequence + 1,
    previousRevision: plan.expectedRevision,
    lastTransition: 'move-to-trash',
    trashedAt
  }, relationships)
}

export function decodeLifecycle(row: LifecycleRow): LifecycleRecord {
  if (row.recordVersion !== ASSET_LIFECYCLE_RECORD_VERSION) {
    throw new Error('Unknown lifecycle version')
  }
  const designAssetIdentity = requireOpaqueIdentity(row.designAssetIdentity)
  const revision = requireOpaqueIdentity(row.revision)
  if (!Number.isInteger(row.revisionSequence) || row.revisionSequence < 0) {
    throw new Error('Invalid lifecycle revision sequence')
  }
  const previousRevision = row.previousRevision === null
    ? null
    : requireOpaqueIdentity(row.previousRevision)
  if (row.ownership !== 'managed' && row.ownership !== 'referenced') {
    throw new Error('Invalid lifecycle ownership')
  }
  if (row.lifecycleState !== 'active' && row.lifecycleState !== 'trash') {
    throw new Error('Invalid lifecycle state')
  }
  if (
    row.lastTransition !== 'registered' &&
    row.lastTransition !== 'move-to-trash' &&
    row.lastTransition !== 'restore'
  ) {
    throw new Error('Invalid lifecycle transition')
  }
  requireTimestamp(row.createdAt)
  requireTimestamp(row.updatedAt)
  if (row.lifecycleState === 'trash') requireTimestamp(row.trashedAt)
  if (row.lifecycleState === 'active' && row.trashedAt !== null) {
    throw new Error('Invalid lifecycle timestamp')
  }
  if (
    (row.lastTransition === 'registered' && previousRevision !== null) ||
    (row.lastTransition !== 'registered' && previousRevision === null) ||
    (row.lastTransition === 'move-to-trash' && row.lifecycleState !== 'trash') ||
    (row.lastTransition === 'restore' && row.lifecycleState !== 'active')
  ) {
    throw new Error('Invalid lifecycle transition state')
  }
  return {
    designAssetIdentity,
    ownership: row.ownership,
    lifecycleState: row.lifecycleState,
    revision,
    revisionSequence: row.revisionSequence,
    previousRevision,
    lastTransition: row.lastTransition,
    trashedAt: row.trashedAt
  }
}

export function decodePlan(row: PlanRow): PlanRecord {
  if (
    row.recordVersion !== ASSET_TRASH_PLAN_RECORD_VERSION ||
    row.operationKind !== 'move-design-asset-to-trash' ||
    !isOpaqueIdentity(row.planReceipt) ||
    !isOpaqueIdentity(row.designAssetIdentity) ||
    !isOpaqueIdentity(row.expectedRevision) ||
    !Number.isInteger(row.expectedRevisionSequence) ||
    row.expectedRevisionSequence < 0 ||
    !/^[a-f0-9]{64}$/u.test(row.relationshipDigest) ||
    (row.planState !== 'planned' && row.planState !== 'completed')
  ) {
    throw new Error('Invalid Asset Trash plan')
  }
  requireTimestamp(row.plannedAt)
  const isCompleted = row.planState === 'completed'
  if (
    isCompleted !== (row.completedResultJson !== null) ||
    isCompleted !== (row.resultRevision !== null) ||
    isCompleted !== (row.completedAt !== null)
  ) {
    throw new Error('Invalid Asset Trash plan completion')
  }
  if (row.resultRevision !== null) requireOpaqueIdentity(row.resultRevision)
  if (row.completedAt !== null) requireTimestamp(row.completedAt)
  if (
    row.resultRevision === row.expectedRevision ||
    (row.completedAt !== null &&
      Date.parse(row.completedAt) < Date.parse(row.plannedAt))
  ) {
    throw new Error('Invalid Asset Trash plan completion evidence')
  }
  return {
    planReceipt: row.planReceipt,
    designAssetIdentity: row.designAssetIdentity,
    expectedRevision: row.expectedRevision,
    expectedRevisionSequence: row.expectedRevisionSequence,
    relationshipDigest: row.relationshipDigest,
    planState: row.planState,
    completedResultJson: row.completedResultJson,
    resultRevision: row.resultRevision,
    plannedAt: row.plannedAt,
    completedAt: row.completedAt
  }
}

export function isOpaqueIdentity(input: unknown): input is string {
  return typeof input === 'string' &&
    input.length > 0 &&
    input.length <= 256 &&
    input.trim() === input &&
    !/[\\/\0\r\n]/u.test(input)
}

export function requireTimestamp(input: unknown): string {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.length > 64 ||
    /[\\/\0\r\n]/u.test(input) ||
    !Number.isFinite(Date.parse(input))
  ) {
    throw new Error('Invalid timestamp')
  }
  return input
}

function normalizeOriginalRelationship(input: unknown): OriginalAssetRelationship {
  if (!isRecord(input)) throw new Error('Invalid Original relationship')
  if (input.kind === 'managed') {
    return {
      kind: 'managed',
      managedOriginalIdentity: requireOpaqueIdentity(
        input.managedOriginalIdentity
      ),
      originalStorageObjectIdentity: requireOpaqueIdentity(
        input.originalStorageObjectIdentity
      )
    }
  }
  if (input.kind === 'referenced') {
    return {
      kind: 'referenced',
      referencedSourceIdentity: requireOpaqueIdentity(
        input.referencedSourceIdentity
      ),
      sourceGenerationIdentity: requireOpaqueIdentity(
        input.sourceGenerationIdentity
      )
    }
  }
  throw new Error('Invalid Original relationship kind')
}

function normalizePromotion(input: unknown): AssetPromotionHistory | null {
  if (input === null) return null
  if (!isRecord(input)) throw new Error('Invalid promotion')
  return {
    candidateIdentity: requireOpaqueIdentity(input.candidateIdentity),
    promotionLinkIdentity: requireOpaqueIdentity(
      input.promotionLinkIdentity
    )
  }
}

function normalizeIdentitySet(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error('Invalid identity set')
  const identities = input.map(requireOpaqueIdentity)
  if (new Set(identities).size !== identities.length) {
    throw new Error('Duplicate identity')
  }
  return identities.sort((left, right) => {
    if (left === right) return 0
    return left < right ? -1 : 1
  })
}

function requireOpaqueIdentity(input: unknown): string {
  if (!isOpaqueIdentity(input)) throw new Error('Invalid opaque identity')
  return input
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}
