import { randomUUID } from 'node:crypto'
import path from 'node:path'

import type {
  LibraryCreationPlanner,
  LibraryCreationPlanningReason,
  LibraryCreationPlanningResult,
  LibraryCreationReview,
  LibraryCreationReviewReceipt
} from './library-creation-planner'
import {
  observeLibraryCreationTarget,
  type LibraryCreationTargetObservation
} from './library-creation-target.internal'
import type { LibraryCreationTargetPlatformAdapter } from
  './library-creation-target-platform.internal'
import { libraryPathsHaveHeadroom, readLibraryFilesystemQualification } from './library-filesystem.tracer'
import { encodeLibraryManifestDeclaration } from './library-manifest.tracer'
import { readExactPlainDataRecord } from './plain-data-record.internal'

export interface LibraryCreationQualificationInput {
  readonly targetDirectory: string
  readonly platform: NodeJS.Platform
  readonly scopeIdentity: string
  readonly accessScopeIdentity: string
  readonly targetState: 'missing' | 'empty'
  readonly targetGeneration: string
}

/** Read-only Main qualification; fixtures do not qualify production volumes. */
export interface LibraryCreationQualificationAdapter {
  inspect(input: LibraryCreationQualificationInput): unknown | Promise<unknown>
}

export interface LibraryCreationPlannerTracerInput {
  targetDirectory: string
  managedOriginalsRelativePath?: string
  targetPlatform: LibraryCreationTargetPlatformAdapter
  qualification: LibraryCreationQualificationAdapter
}

interface Configuration {
  readonly targetDirectory: string
  readonly managedOriginalsRelativePath: string
  readonly targetPlatform: LibraryCreationTargetPlatformAdapter
  readonly inspectQualification: LibraryCreationQualificationAdapter['inspect']
}

interface QualifiedEvidence {
  readonly ok: true
  readonly requirements: Readonly<{ requiredBytes: number; safetyReserveBytes: number }>
  readonly capacity: Readonly<{
    availableBytes: number
    remainingAfterCreationBytes: number
    remainingBeyondReserveBytes: number
  }>
  readonly qualificationKey: string
}

interface ActiveReview {
  readonly review: LibraryCreationReview
  readonly targetGeneration: string
  readonly qualificationKey: string
}

/** Main-only planning Tracer; never exported by the Module barrel. */
export function createLibraryCreationPlannerTracer(
  input: LibraryCreationPlannerTracerInput
): LibraryCreationPlanner {
  const configuration = snapshotConfiguration(input)
  let preparationVersion = Object.freeze({})
  let active: ActiveReview | undefined
  return Object.freeze({
    async prepare(request: Parameters<LibraryCreationPlanner['prepare']>[0]): Promise<LibraryCreationPlanningResult> {
      const record = readExactPlainDataRecord(request, ['kind'])
      if (!record || (record.kind !== 'review-target' && record.kind !== 'selection-cancelled')) {
        return blocked('invalid-request')
      }
      const version = Object.freeze({})
      preparationVersion = version
      active = undefined
      if (record.kind === 'selection-cancelled') return Object.freeze({
        state: 'cancelled', confirmable: false, reason: 'selection-cancelled', writeAuthority: 'not-issued'
      })
      if (!configuration) return blocked('invalid-target')
      try {
        const observed = await observeLibraryCreationTarget(
          configuration.targetDirectory, configuration.targetPlatform)
        if (version !== preparationVersion) return blocked('review-superseded')
        if (observed.kind === 'blocked') return blocked(observed.reason)
        const evidence = await qualify(configuration, observed)
        if (version !== preparationVersion) return blocked('review-superseded')
        if (!evidence.ok) return blocked(evidence.reason)
        const current = await observeLibraryCreationTarget(
          configuration.targetDirectory, configuration.targetPlatform)
        if (version !== preparationVersion) return blocked('review-superseded')
        if (current.kind !== 'eligible' || current.targetGeneration !== observed.targetGeneration) {
          return blocked('target-changed')
        }
        const identities = Object.freeze({
          lineageIdentity: `lineage-${randomUUID()}`,
          libraryIdentity: `library-${randomUUID()}`,
          controlStoreIdentity: `control-${randomUUID()}`,
          generation: `generation-${randomUUID()}`
        })
        if (!encodeLibraryManifestDeclaration({
          lineageIdentity: identities.lineageIdentity,
          libraryIdentity: identities.libraryIdentity,
          controlStoreIdentity: identities.controlStoreIdentity,
          managedOriginalsRelativePath: configuration.managedOriginalsRelativePath
        })) return blocked('invalid-manifest-binding')
        const review: LibraryCreationReview = Object.freeze({
          receipt: Object.freeze({}) as LibraryCreationReviewReceipt,
          targetState: observed.targetState,
          identities,
          roles: Object.freeze(['library-control', 'managed-originals', 'required-previews', 'intake-staging'] as const),
          requirements: evidence.requirements,
          collisions: Object.freeze({
            targetNamespace: 'none-detected',
            plannedRoles: 'none-detected',
            onDetection: 'blocks-confirmation'
          }),
          consequences: Object.freeze([
            'creates-library-state-after-confirmation', 'external-sources-unchanged',
            'capacity-not-reserved', 'confirmation-revalidates-target'
          ] as const)
        })
        active = Object.freeze({
          review, targetGeneration: observed.targetGeneration,
          qualificationKey: evidence.qualificationKey
        })
        return ready(review, evidence)
      } catch {
        return blocked('qualification-not-assessed')
      }
    },
    async inspect(request: Parameters<LibraryCreationPlanner['inspect']>[0]): Promise<LibraryCreationPlanningResult> {
      const record = readExactPlainDataRecord(request, ['receipt'])
      if (!record) return blocked('invalid-request')
      const reviewed = active
      const version = preparationVersion
      if (!configuration || !reviewed || reviewed.review.receipt !== record.receipt) {
        return blocked('unknown-review')
      }
      try {
        const observed = await observeLibraryCreationTarget(
          configuration.targetDirectory, configuration.targetPlatform)
        if (reviewed !== active || version !== preparationVersion) return blocked('review-superseded')
        if (observed.kind !== 'eligible' || observed.targetGeneration !== reviewed.targetGeneration) {
          active = undefined
          return blocked('review-stale')
        }
        const evidence = await qualify(configuration, observed)
        if (reviewed !== active || version !== preparationVersion) return blocked('review-superseded')
        if (!evidence.ok || evidence.qualificationKey !== reviewed.qualificationKey) {
          active = undefined
          return blocked(evidence.ok ? 'review-stale' : evidence.reason)
        }
        const current = await observeLibraryCreationTarget(
          configuration.targetDirectory, configuration.targetPlatform)
        if (reviewed !== active || version !== preparationVersion) return blocked('review-superseded')
        if (current.kind !== 'eligible' || current.targetGeneration !== reviewed.targetGeneration) {
          active = undefined
          return blocked('review-stale')
        }
        return ready(reviewed.review, evidence)
      } catch {
        if (reviewed === active) active = undefined
        return blocked('qualification-not-assessed')
      }
    }
  })
}

function snapshotConfiguration(input: LibraryCreationPlannerTracerInput): Configuration | undefined {
  try {
    const targetDirectory = input.targetDirectory
    const managedOriginalsRelativePath = input.managedOriginalsRelativePath ?? 'Originals'
    const targetPlatform = input.targetPlatform
    if (typeof targetDirectory !== 'string' || typeof managedOriginalsRelativePath !== 'string' ||
      typeof targetPlatform.platform !== 'string' ||
      typeof targetPlatform.targetNameIsSupported !== 'function' ||
      typeof targetPlatform.inspectAccess !== 'function') return undefined
    const platformAdapter: LibraryCreationTargetPlatformAdapter = Object.freeze({
      platform: targetPlatform.platform,
      targetNameIsSupported: targetPlatform.targetNameIsSupported.bind(targetPlatform),
      inspectAccess: targetPlatform.inspectAccess.bind(targetPlatform)
    })
    return Object.freeze({ targetDirectory, managedOriginalsRelativePath,
      targetPlatform: platformAdapter,
      inspectQualification: input.qualification.inspect.bind(input.qualification) })
  } catch {
    return undefined
  }
}

async function qualify(
  configuration: Configuration,
  target: LibraryCreationTargetObservation
): Promise<QualifiedEvidence | Readonly<{ ok: false; reason: LibraryCreationPlanningReason }>> {
  let value: unknown
  try {
    value = await configuration.inspectQualification(Object.freeze({
      platform: configuration.targetPlatform.platform, targetDirectory: configuration.targetDirectory, scopeIdentity: target.scopeIdentity,
      accessScopeIdentity: target.accessScopeIdentity, targetState: target.targetState,
      targetGeneration: target.targetGeneration
    }))
  } catch { return { ok: false, reason: 'qualification-not-assessed' } }
  const record = readExactPlainDataRecord(value, [
    'targetGeneration', 'qualificationGeneration', 'filesystem', 'access', 'exclusiveLock', 'capacity'
  ])
  if (!record || record.targetGeneration !== target.targetGeneration ||
    typeof record.qualificationGeneration !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,127}$/u.test(record.qualificationGeneration)) {
    return { ok: false, reason: 'qualification-not-assessed' }
  }
  const filesystem = readLibraryFilesystemQualification(record.filesystem, target.scopeIdentity)
  if (filesystem.kind !== 'qualified') return { ok: false, reason: filesystem.kind === 'unsupported'
    ? 'filesystem-unsupported' : 'qualification-not-assessed' }
  const access = readExactPlainDataRecord(record.access, ['kind', 'scopeIdentity'])
  if (!access || access.scopeIdentity !== target.accessScopeIdentity) {
    return { ok: false, reason: 'qualification-not-assessed' }
  }
  if (access.kind === 'read-only') return { ok: false, reason: 'storage-read-only' }
  if (access.kind !== 'read-write') return { ok: false, reason: 'qualification-not-assessed' }
  if (record.exclusiveLock !== 'qualified') return { ok: false, reason: 'lock-not-qualified' }
  const capacity = readExactPlainDataRecord(record.capacity, [
    'availableBytes', 'requiredBytes', 'safetyReserveBytes'
  ])
  if (!capacity || !safeBytes(capacity.availableBytes, true) ||
    !safeBytes(capacity.requiredBytes, false) || !safeBytes(capacity.safetyReserveBytes, false)) {
    return { ok: false, reason: 'qualification-not-assessed' }
  }
  if (BigInt(capacity.requiredBytes) + BigInt(capacity.safetyReserveBytes) > BigInt(capacity.availableBytes)) {
    return { ok: false, reason: 'capacity-insufficient' }
  }
  const relativePaths = [
    '.dam', configuration.managedOriginalsRelativePath,
    '.dam/library.manifest.json', '.dam/library.sqlite', '.dam/exclusive-library-lock.sqlite',
    '.dam/required-previews', '.dam/intake-staging',
    `${configuration.managedOriginalsRelativePath}/0001/asset--000000000000.webp`
  ]
  const root = { lexical: target.lexicalRoot, real: target.canonicalRoot }
  const paths = relativePaths.map((relative) => ({
    lexical: path.join(root.lexical, relative), real: path.join(root.real, relative)
  }))
  if (Buffer.byteLength(path.basename(root.real).normalize('NFC'), 'utf8') > filesystem.limits.maxComponentUtf8Bytes ||
    !libraryPathsHaveHeadroom(root, paths, filesystem.limits)) {
    return { ok: false, reason: 'path-headroom-insufficient' }
  }
  return Object.freeze({
    ok: true,
    requirements: Object.freeze({ requiredBytes: capacity.requiredBytes, safetyReserveBytes: capacity.safetyReserveBytes }),
    capacity: Object.freeze({ availableBytes: capacity.availableBytes,
      remainingAfterCreationBytes: capacity.availableBytes - capacity.requiredBytes,
      remainingBeyondReserveBytes: capacity.availableBytes - capacity.requiredBytes -
        capacity.safetyReserveBytes }),
    qualificationKey: JSON.stringify([
      record.qualificationGeneration, filesystem.limits,
      capacity.requiredBytes, capacity.safetyReserveBytes
    ])
  })
}

function safeBytes(value: unknown, allowZero: boolean): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1)
}

function blocked(reason: LibraryCreationPlanningReason): LibraryCreationPlanningResult {
  return Object.freeze({ state: 'blocked', reason, confirmable: false, writeAuthority: 'not-issued' })
}

function ready(review: LibraryCreationReview, evidence: QualifiedEvidence): LibraryCreationPlanningResult {
  return Object.freeze({ state: 'ready', confirmable: true, review,
    capacity: evidence.capacity, writeAuthority: 'not-issued' })
}
