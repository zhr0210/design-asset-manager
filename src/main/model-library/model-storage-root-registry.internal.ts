import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import { createModelStorageAuthorityTracer } from
  './model-storage-authority.tracer'
import {
  acquireModelStorageRootControlLease,
  inspectModelStorageRootRef,
  observeModelStorageRootRef
} from
  './model-storage-authority.internal'
import type {
  ModelStorageRootRef,
  ModelStorageSession
} from './model-storage-authority.tracer'
import type {
  CreateModelStorageRootCandidateTracerInput,
  ModelStorageRootCandidate,
  ModelStorageRootRegistrationRef,
  ModelStorageRootRegistryErrorCode,
  ModelStorageRootRegistryOpenReceipt,
  ModelStorageRootRegistryResult,
  ModelStorageRootRegistrySummary,
  ModelStorageRootRegistryTracer,
  ModelStorageRootSelectionReview,
  OpenModelStorageRootRegistryTracerInput
} from './model-storage-root-registry.tracer'

const REGISTRY_DATABASE = 'model-storage-root-registry.sqlite'
const REGISTRY_APPLICATION_ID = 0x44414d52
const REGISTRY_SCHEMA_VERSION = 1
const REGISTRY_BUSY_TIMEOUT_MS = 5_000
const REGISTRATION_PATTERN = /^model-storage-registration:[a-f0-9]{32}$/
const STORAGE_IDENTITY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@+-]{0,127}$/
const REVIEW_FINGERPRINT_PATTERN = /^model-storage-root-review:[a-f0-9]{64}$/
const REGISTRY_TABLE_SQL = `
  CREATE TABLE model_storage_root_registry (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    schema_version INTEGER NOT NULL CHECK (schema_version = 1),
    selection_revision INTEGER NOT NULL CHECK (selection_revision >= 0),
    registration_id TEXT,
    trusted_locator TEXT,
    expected_storage_identity TEXT,
    last_observation TEXT NOT NULL CHECK (
      last_observation IN (
        'not-configured', 'not-observed', 'available', 'unavailable',
        'wrong-identity', 'read-only', 'unsafe', 'schema-unsupported',
        'integrity-failed', 'busy', 'recovery-blocked'
      )
    ),
    CHECK (
      (
        selection_revision = 0 AND
        registration_id IS NULL AND
        trusted_locator IS NULL AND
        expected_storage_identity IS NULL AND
        last_observation = 'not-configured'
      ) OR (
        selection_revision > 0 AND
        registration_id IS NOT NULL AND
        trusted_locator IS NOT NULL AND
        expected_storage_identity IS NOT NULL AND
        last_observation <> 'not-configured'
      )
    )
  ) STRICT
`

const NO_SELECTION_CONSEQUENCES = Object.freeze({
  movesModelBytes: false as const,
  deletesModelBytes: false as const,
  performsMigration: false as const,
  activatesModel: false as const,
  startsRuntime: false as const,
  startsInference: false as const
})

interface RootBinding {
  readonly rootDirectory: string
  readonly root: ModelStorageRootRef
}

interface CandidateBinding extends RootBinding {
  readonly issuanceNonce: string
}

interface ReviewRecord {
  readonly candidate: ModelStorageRootCandidate
  readonly binding: CandidateBinding
  readonly revision: number
  readonly effect: 'select-first-root' | 'reconnect-current-root'
  readonly fingerprint: string
}

interface RootControlReviewRecord {
  readonly rootDirectory: string
  readonly root: ModelStorageRootRef
  readonly rootDevice: bigint
  readonly rootInode: bigint
  readonly revision: number
  readonly effect: 'select-first-root' | 'reconnect-current-root'
}

interface ExpectedRootPhysicalIdentity {
  readonly device: bigint
  readonly inode: bigint
}

interface RegistryRecord {
  readonly revision: number
  readonly registration?: ModelStorageRootRegistrationRef
  readonly trustedLocator?: string
  readonly expectedRoot?: ModelStorageRootRef
  readonly observation:
    | 'not-configured'
    | 'not-observed'
    | 'available'
    | 'unavailable'
    | 'wrong-identity'
    | 'read-only'
    | 'unsafe'
    | 'schema-unsupported'
    | 'integrity-failed'
    | 'busy'
    | 'recovery-blocked'
}

interface OwnedRegistryFile {
  readonly file: string
  readonly device: bigint
  readonly inode: bigint
}

export interface ModelStorageRootRegistryControlReview {
  readonly state: 'confirmable'
  readonly review: object
  readonly effect: 'select-first-root' | 'reconnect-current-root'
}

export type ModelStorageRootRegistryControlReviewResult =
  | ModelStorageRootRegistryControlReview
  | {
      readonly state: 'blocked'
      readonly reason: 'MIGRATION_REQUIRED' | 'RECOVERY_BLOCKED'
    }

export interface ModelStorageRootRegistryControl {
  summarize(): Promise<
    ModelStorageRootRegistryResult<ModelStorageRootRegistrySummary>
  >
  observeCurrent(): Promise<
    ModelStorageRootRegistryResult<ModelStorageRootRegistrySummary>
  >
  currentLocatorLeaf(): Promise<ModelStorageRootRegistryResult<
    string | undefined
  >>
  review(
    rootDirectory: string,
    expectedRoot?: ModelStorageRootRef,
    expectedPhysicalIdentity?: ExpectedRootPhysicalIdentity
  ): Promise<ModelStorageRootRegistryResult<
    ModelStorageRootRegistryControlReviewResult
  >>
  confirm(
    review: object
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootRegistrySummary>>
}

export async function openModelStorageRootRegistryTracer(
  input: OpenModelStorageRootRegistryTracerInput
): Promise<ModelStorageRootRegistryTracer> {
  const controlDirectory = path.resolve(input.controlDirectory)
  const databaseFile = path.join(controlDirectory, REGISTRY_DATABASE)
  let initializationError = await initializeOrInspectRegistryStore(
    controlDirectory,
    databaseFile
  )
  if (!initializationError && input.tracerOnlyRegistryState) {
    await applyTracerOnlyRegistryState(
      databaseFile,
      input.tracerOnlyRegistryState
    )
    initializationError = await initializeOrInspectRegistryStore(
      controlDirectory,
      databaseFile
    )
  }
  const candidates = new WeakMap<ModelStorageRootCandidate, CandidateBinding>()
  const reviews = new Map<string, ReviewRecord>()
  const reviewSecret = randomBytes(32)
  let sessionState: 'idle' | 'opening' | 'live' | 'closing' = 'idle'
  let liveSessionToken: object | undefined

  async function summarize(
    request: { readonly kind: 'registry' }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootRegistrySummary>>
  async function summarize(
    request: {
      readonly kind: 'candidate'
      readonly candidate: ModelStorageRootCandidate
    }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootSelectionReview>>
  async function summarize(
    request:
      | { readonly kind: 'registry' }
      | {
          readonly kind: 'candidate'
          readonly candidate: ModelStorageRootCandidate
        }
  ): Promise<ModelStorageRootRegistryResult<
    ModelStorageRootRegistrySummary | ModelStorageRootSelectionReview
  >> {
    if (initializationError) return initializationError
    const before = readRegistryRecord(databaseFile)
    if (!before.ok) return before
    if (request.kind === 'registry') return success(projectSummary(before.value))

    const binding = candidates.get(request.candidate)
    if (!binding) return failure('CANDIDATE_INVALID', 'not-retryable')
    const authority = createAuthority(input, binding)
    const opened = await authority.authority.open(binding.root)
    if (!opened.ok) return mapAuthorityFailure(opened.error.code, opened.error.retry)
    try {
      const after = readRegistryRecord(databaseFile)
      if (!after.ok) return after
      if (!sameSelection(before.value, after.value)) {
        return failure('SELECTION_REVIEW_STALE', 'review-again')
      }
      if (
        before.value.expectedRoot &&
        before.value.expectedRoot !== binding.root
      ) {
        return success(Object.freeze({
          state: 'blocked' as const,
          reasons: Object.freeze(['MIGRATION_REQUIRED'] as const)
        }))
      }
      const effect = before.value.registration
        ? 'reconnect-current-root' as const
        : 'select-first-root' as const
      const fingerprint = createHash('sha256')
        .update(reviewSecret)
        .update('\0')
        .update(binding.root)
        .update('\0')
        .update(binding.issuanceNonce)
        .update('\0')
        .update(String(before.value.revision))
        .update(`\0${effect}`)
        .digest('hex')
      const publicFingerprint = `model-storage-root-review:${fingerprint}`
      const review: ReviewRecord = Object.freeze({
        candidate: request.candidate,
        binding,
        revision: before.value.revision,
        effect,
        fingerprint: publicFingerprint
      })
      reviews.set(publicFingerprint, review)
      trimReviews(reviews)
      return success(Object.freeze({
        state: 'confirmable' as const,
        fingerprint: publicFingerprint,
        effect: review.effect,
        consequences: NO_SELECTION_CONSEQUENCES
      }))
    } finally {
      await opened.value.session.close()
    }
  }

  async function open(
    request:
      | { readonly kind: 'current' }
      | {
          readonly kind: 'select-reviewed-root'
          readonly candidate: ModelStorageRootCandidate
          readonly reviewFingerprint: string
          readonly decision: 'make-reviewed-model-storage-root-current'
        }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootRegistryOpenReceipt>> {
    if (initializationError) return initializationError
    if (sessionState !== 'idle') {
      return failure('CURRENT_SESSION_ACTIVE', 'after-session-closes')
    }
    sessionState = 'opening'
    let candidateSession: ModelStorageSession | undefined
    let published = false
    try {
      if (request.kind === 'current') {
        const current = readRegistryRecord(databaseFile)
        if (!current.ok) return current
        if (
          !current.value.registration ||
          !current.value.trustedLocator ||
          !current.value.expectedRoot
        ) {
          return failure('CURRENT_STORAGE_NOT_CONFIGURED', 'after-user-action')
        }
        const binding: RootBinding = {
          rootDirectory: current.value.trustedLocator,
          root: current.value.expectedRoot
        }
        const opened = await createAuthority(input, binding).authority.open(binding.root)
        if (!opened.ok) {
          updateObservation(
            databaseFile,
            current.value,
            observationForAuthorityFailure(opened.error.code)
          )
          return mapAuthorityFailure(opened.error.code, opened.error.retry)
        }
        candidateSession = opened.value.session
        const confirmed = readRegistryRecord(databaseFile)
        if (!confirmed.ok) return confirmed
        if (!sameSelection(current.value, confirmed.value)) {
          return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
        }
        const observed = updateObservation(databaseFile, confirmed.value, 'available')
        if (!observed.ok) return observed
        if (!observed.value) {
          return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
        }
        const session = wrapSession(candidateSession)
        candidateSession = undefined
        return success({
          disposition: 'opened-current',
          summary: projectSummary({ ...confirmed.value, observation: 'available' }),
          session
        })
      }

      if (
        request.decision !== 'make-reviewed-model-storage-root-current' ||
        typeof request.reviewFingerprint !== 'string'
      ) {
        return failure('SELECTION_CONFIRMATION_REQUIRED', 'review-again')
      }
      if (!REVIEW_FINGERPRINT_PATTERN.test(request.reviewFingerprint)) {
        return failure('SELECTION_REVIEW_REQUIRED', 'review-again')
      }
      const binding = candidates.get(request.candidate)
      if (!binding) return failure('CANDIDATE_INVALID', 'not-retryable')
      const review = reviews.get(request.reviewFingerprint)
      if (
        !review ||
        review.candidate !== request.candidate ||
        review.binding !== binding ||
        review.fingerprint !== request.reviewFingerprint
      ) {
        return failure('SELECTION_REVIEW_REQUIRED', 'review-again')
      }
      const before = readRegistryRecord(databaseFile)
      if (!before.ok) return before
      if (
        before.value.revision !== review.revision ||
        (review.effect === 'select-first-root' && before.value.registration) ||
        (review.effect === 'reconnect-current-root' && (
          !before.value.registration ||
          before.value.expectedRoot !== review.binding.root
        ))
      ) {
        return failure('SELECTION_REVIEW_STALE', 'review-again')
      }

      const opened = await createAuthority(input, binding).authority.open(binding.root)
      if (!opened.ok) return mapAuthorityFailure(opened.error.code, opened.error.retry)
      candidateSession = opened.value.session
      const registration = before.value.registration ??
        `model-storage-registration:${randomBytes(16).toString('hex')}` as
          ModelStorageRootRegistrationRef
      const committed = commitReviewedSelection(databaseFile, review, registration)
      if (!committed.ok) return committed
      published = true
      const session = wrapSession(candidateSession)
      candidateSession = undefined
      return success({
        disposition: review.effect === 'select-first-root'
          ? 'selected-first-root'
          : 'reconnected-current-root',
        summary: projectSummary(committed.value),
        session
      })
    } finally {
      if (candidateSession) await candidateSession.close()
      if (!published && sessionState === 'opening') sessionState = 'idle'
    }
  }

  function wrapSession(session: ModelStorageSession): ModelStorageSession {
    const token = Object.freeze({})
    liveSessionToken = token
    sessionState = 'live'
    let closePromise: Promise<void> | undefined
    return Object.freeze({
      library: session.library,
      close(): Promise<void> {
        closePromise ??= (async () => {
          if (liveSessionToken === token) sessionState = 'closing'
          try {
            await session.close()
          } finally {
            if (liveSessionToken === token) {
              liveSessionToken = undefined
              sessionState = 'idle'
            }
          }
        })()
        return closePromise
      }
    })
  }

  return Object.freeze({
    registry: Object.freeze({ summarize, open }),
    createCandidate(candidateInput: CreateModelStorageRootCandidateTracerInput) {
      const candidate = Object.freeze({}) as ModelStorageRootCandidate
      candidates.set(candidate, Object.freeze({
        rootDirectory: path.resolve(candidateInput.rootDirectory),
        root: candidateInput.root,
        issuanceNonce: randomBytes(32).toString('hex')
      }))
      return candidate
    }
  })
}

/**
 * @internal Storage-configuration control used by the production Workspace.
 * It verifies only empty/recovery-free managed roots and commits Registry
 * identity/CAS state without opening ModelLibrary or reconciling model bytes.
 */
export async function openModelStorageRootRegistryControl(
  selectedControlDirectory: string
): Promise<ModelStorageRootRegistryControl> {
  const controlDirectory = path.resolve(selectedControlDirectory)
  const databaseFile = path.join(controlDirectory, REGISTRY_DATABASE)
  const initializationError = await initializeOrInspectRegistryStore(
    controlDirectory,
    databaseFile
  )
  const reviews = new WeakMap<object, RootControlReviewRecord>()

  return Object.freeze({
    async summarize() {
      if (initializationError) return initializationError
      const record = readRegistryRecord(databaseFile)
      return record.ok ? success(projectSummary(record.value)) : record
    },

    async observeCurrent() {
      if (initializationError) return initializationError
      const current = readRegistryRecord(databaseFile)
      if (!current.ok) return current
      if (
        !current.value.registration ||
        !current.value.trustedLocator ||
        !current.value.expectedRoot
      ) {
        return success(projectSummary(current.value))
      }

      const inspected = await observeModelStorageRootRef(
        current.value.trustedLocator
      )
      const observation: Exclude<
        RegistryRecord['observation'],
        'not-configured'
      > = !inspected.ok
        ? observationForAuthorityFailure(inspected.error.code)
        : inspected.value.root !== current.value.expectedRoot
          ? 'wrong-identity'
          : inspected.value.recoveryRequired
            ? 'recovery-blocked'
            : 'available'
      return success(projectSummary({ ...current.value, observation }))
    },

    async currentLocatorLeaf() {
      if (initializationError) return initializationError
      const current = readRegistryRecord(databaseFile)
      if (!current.ok) return current
      return success(current.value.trustedLocator
        ? path.basename(current.value.trustedLocator)
        : undefined)
    },

    async review(
      rootDirectory: string,
      expectedRoot?: ModelStorageRootRef,
      expectedPhysicalIdentity?: ExpectedRootPhysicalIdentity
    ) {
      if (initializationError) return initializationError
      const before = readRegistryRecord(databaseFile)
      if (!before.ok) return before
      const inspected = await inspectModelStorageRootRef(rootDirectory)
      if (!inspected.ok) {
        return mapAuthorityFailure(
          inspected.error.code,
          inspected.error.retry
        )
      }
      if (
        inspected.value.recoveryRequired ||
        (expectedRoot && inspected.value.root !== expectedRoot) ||
        (expectedPhysicalIdentity && (
          inspected.value.rootDevice !== expectedPhysicalIdentity.device ||
          inspected.value.rootInode !== expectedPhysicalIdentity.inode
        ))
      ) {
        return success({
          state: 'blocked' as const,
          reason: 'RECOVERY_BLOCKED' as const
        })
      }
      const after = readRegistryRecord(databaseFile)
      if (!after.ok) return after
      if (!sameSelection(before.value, after.value)) {
        return failure('SELECTION_REVIEW_STALE', 'review-again')
      }
      if (
        before.value.expectedRoot &&
        before.value.expectedRoot !== inspected.value.root
      ) {
        return success({
          state: 'blocked' as const,
          reason: 'MIGRATION_REQUIRED' as const
        })
      }
      const review = Object.freeze({})
      const effect = before.value.registration
        ? 'reconnect-current-root' as const
        : 'select-first-root' as const
      reviews.set(review, {
        rootDirectory: path.resolve(rootDirectory),
        root: inspected.value.root,
        rootDevice: inspected.value.rootDevice,
        rootInode: inspected.value.rootInode,
        revision: before.value.revision,
        effect
      })
      return success({
        state: 'confirmable' as const,
        review,
        effect
      })
    },

    async confirm(review: object) {
      if (initializationError) return initializationError
      const reviewed = reviews.get(review)
      reviews.delete(review)
      if (!reviewed) return failure('SELECTION_REVIEW_REQUIRED', 'review-again')

      const leased = await acquireModelStorageRootControlLease(
        reviewed.rootDirectory,
        reviewed.root
      )
      if (!leased.ok) {
        return mapAuthorityFailure(
          leased.error.code,
          leased.error.retry
        )
      }
      try {
        if (
          leased.value.rootDevice !== reviewed.rootDevice ||
          leased.value.rootInode !== reviewed.rootInode ||
          leased.value.recoveryRequired ||
          !await leased.value.stillHeld()
        ) {
          return failure('RECOVERY_BLOCKED', 'after-user-action')
        }
        const current = readRegistryRecord(databaseFile)
        if (!current.ok) return current
        if (
          current.value.revision !== reviewed.revision ||
          (reviewed.effect === 'select-first-root' && current.value.registration) ||
          (reviewed.effect === 'reconnect-current-root' && (
            !current.value.registration ||
            current.value.expectedRoot !== reviewed.root
          ))
        ) {
          return failure('SELECTION_REVIEW_STALE', 'review-again')
        }
        if (!await leased.value.stillHeld()) {
          return failure('RECOVERY_BLOCKED', 'after-user-action')
        }

        const registration = current.value.registration ??
          `model-storage-registration:${randomBytes(16).toString('hex')}` as
            ModelStorageRootRegistrationRef
        const committed = commitReviewedSelection(databaseFile, {
          candidate: Object.freeze({}) as ModelStorageRootCandidate,
          binding: {
            rootDirectory: reviewed.rootDirectory,
            root: reviewed.root,
            issuanceNonce: 'root-control'
          },
          revision: reviewed.revision,
          effect: reviewed.effect,
          fingerprint: `model-storage-root-review:${'0'.repeat(64)}`
        }, registration)
        return committed.ok
          ? success(projectSummary(committed.value))
          : committed
      } finally {
        leased.value.close()
      }
    }
  })
}

function createAuthority(
  input: OpenModelStorageRootRegistryTracerInput,
  binding: RootBinding
) {
  return createModelStorageAuthorityTracer({
    rootDirectory: binding.rootDirectory,
    catalog: input.catalog,
    byteSource: input.byteSource,
    createActivityId: input.createActivityId,
    createStorageRecordId: input.createStorageRecordId,
    createStorageIdentity: () => {
      throw new Error('Registry cannot provision Model Storage.')
    }
  })
}

async function initializeOrInspectRegistryStore(
  controlDirectory: string,
  databaseFile: string
): Promise<ModelStorageRootRegistryResult<never> | undefined> {
  try {
    const controlStat = await fs.lstat(controlDirectory, { bigint: true })
    if (!controlStat.isDirectory() || controlStat.isSymbolicLink()) {
      return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
    }
    let databaseStat
    try {
      databaseStat = await fs.lstat(databaseFile, { bigint: true })
    } catch (error) {
      if (!hasErrorCode(error, 'ENOENT')) {
        return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
      }
    }
    if (databaseStat) {
      if (!databaseStat.isFile() || databaseStat.isSymbolicLink()) {
        return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
      }
      if (
        !hasOwnerWriteAndExecute(controlStat.mode) ||
        !hasOwnerWrite(databaseStat.mode)
      ) {
        return failure('REGISTRY_READ_ONLY', 'after-user-action')
      }
      const database = new Database(databaseFile, {
        fileMustExist: true,
        readonly: true
      })
      try {
        const inspected = inspectRegistryDatabase(database)
        if (inspected) return inspected
      } finally {
        try { database.close() } catch { /* Inspection is already complete. */ }
      }
      return proveRegistryWritable(databaseFile)
    }

    return initializeAndPublishRegistryDatabase(
      controlDirectory,
      databaseFile
    )
  } catch {
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  }
}

async function initializeAndPublishRegistryDatabase(
  controlDirectory: string,
  databaseFile: string
): Promise<ModelStorageRootRegistryResult<never> | undefined> {
  const temporaryFile = path.join(
    controlDirectory,
    `.model-storage-root-registry-${randomBytes(16).toString('hex')}.tmp`
  )
  const owned = await createOwnedRegistryFile(temporaryFile)
  const initialized = initializeOwnedRegistryDatabase(temporaryFile)
  if (initialized) {
    await removeOwnedRegistryFile(owned)
    return initialized
  }
  try {
    await fs.link(temporaryFile, databaseFile)
  } catch (error) {
    await removeOwnedRegistryFile(owned)
    if (hasErrorCode(error, 'EEXIST')) {
      return initializeOrInspectRegistryStore(controlDirectory, databaseFile)
    }
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  }
  await removeOwnedRegistryFile(owned)
  return initializeOrInspectRegistryStore(controlDirectory, databaseFile)
}

function initializeOwnedRegistryDatabase(
  databaseFile: string
): ModelStorageRootRegistryResult<never> | undefined {
  let database: Database.Database | undefined
  let published = false
  try {
    database = new Database(databaseFile, { fileMustExist: true })
    database.pragma(`busy_timeout = ${REGISTRY_BUSY_TIMEOUT_MS}`)
    database.pragma('journal_mode = DELETE')
    database.pragma('synchronous = FULL')
    database.exec('BEGIN EXCLUSIVE')
    database.pragma(`application_id = ${REGISTRY_APPLICATION_ID}`)
    database.pragma(`user_version = ${REGISTRY_SCHEMA_VERSION}`)
    database.exec(REGISTRY_TABLE_SQL)
    database.prepare(`
      INSERT INTO model_storage_root_registry (
        singleton, schema_version, selection_revision, registration_id,
        trusted_locator, expected_storage_identity, last_observation
      ) VALUES (1, 1, 0, NULL, NULL, NULL, 'not-configured')
    `).run()
    database.exec('COMMIT')
    published = true
    return inspectRegistryDatabase(database)
  } catch {
    if (database?.inTransaction) {
      try { database.exec('ROLLBACK') } catch { /* Owned file is removed below. */ }
    }
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  } finally {
    try { database?.close() } catch {
      // A published exact Registry remains authoritative despite close failure.
      if (!published) return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
    }
  }
}

async function createOwnedRegistryFile(file: string): Promise<OwnedRegistryFile> {
  const handle = await fs.open(file, 'wx', 0o600)
  try {
    const stat = await handle.stat({ bigint: true })
    if (!stat.isFile()) throw new Error('REGISTRY_FILE_INVALID')
    await handle.sync()
    return { file, device: stat.dev, inode: stat.ino }
  } finally {
    await handle.close()
  }
}

async function removeOwnedRegistryFile(owned: OwnedRegistryFile): Promise<void> {
  try {
    const stat = await fs.lstat(owned.file, { bigint: true })
    if (
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.dev === owned.device &&
      stat.ino === owned.inode
    ) {
      await fs.unlink(owned.file)
    }
  } catch {
    // Never remove a path after ownership can no longer be proven.
  }
}

function inspectRegistryDatabase(
  database: Database.Database
): ModelStorageRootRegistryResult<never> | undefined {
  try {
    const applicationId = Number(database.pragma('application_id', { simple: true }))
    const userVersion = Number(database.pragma('user_version', { simple: true }))
    if (applicationId !== REGISTRY_APPLICATION_ID) {
      return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
    }
    if (userVersion !== REGISTRY_SCHEMA_VERSION) {
      return failure('REGISTRY_SCHEMA_UNSUPPORTED', 'not-retryable')
    }
    if (database.pragma('quick_check', { simple: true }) !== 'ok') {
      return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
    }
    const objects = readSchemaObjects(database)
    if (
      objects.length !== 1 ||
      objects[0]?.type !== 'table' ||
      objects[0]?.name !== 'model_storage_root_registry' ||
      normalizeSql(objects[0]?.sql ?? '') !== normalizeSql(REGISTRY_TABLE_SQL)
    ) {
      return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
    }
    const record = readRegistryRecordFromDatabase(database)
    return record.ok ? undefined : record
  } catch {
    return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
  }
}

function readSchemaObjects(database: Database.Database): Array<{
  readonly type: string
  readonly name: string
  readonly sql: string | null
}> {
  return database.prepare(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all() as Array<{ type: string; name: string; sql: string | null }>
}

function readRegistryRecord(
  databaseFile: string
): ModelStorageRootRegistryResult<RegistryRecord> {
  try {
    const database = new Database(databaseFile, { fileMustExist: true, readonly: true })
    try {
      database.pragma(`busy_timeout = ${REGISTRY_BUSY_TIMEOUT_MS}`)
      return readRegistryRecordFromDatabase(database)
    } finally {
      database.close()
    }
  } catch {
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  }
}

function readRegistryRecordFromDatabase(
  database: Database.Database
): ModelStorageRootRegistryResult<RegistryRecord> {
  const rows = database.prepare(`
    SELECT schema_version AS schemaVersion,
           selection_revision AS revision,
           registration_id AS registration,
           trusted_locator AS trustedLocator,
           expected_storage_identity AS expectedRoot,
           last_observation AS observation
    FROM model_storage_root_registry
    WHERE singleton = 1
  `).all() as Array<Record<string, unknown>>
  if (rows.length !== 1) {
    return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
  }
  return normalizeRegistryRow(rows[0])
}

function normalizeRegistryRow(
  row: Record<string, unknown>
): ModelStorageRootRegistryResult<RegistryRecord> {
  const revision = row.revision
  const schemaVersion = row.schemaVersion
  const registration = row.registration
  const trustedLocator = row.trustedLocator
  const expectedRoot = row.expectedRoot
  const observation = row.observation
  const observations = new Set([
    'not-configured', 'not-observed', 'available', 'unavailable',
    'wrong-identity', 'read-only', 'unsafe', 'schema-unsupported',
    'integrity-failed', 'busy', 'recovery-blocked'
  ])
  if (
    schemaVersion !== REGISTRY_SCHEMA_VERSION ||
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    typeof observation !== 'string' ||
    !observations.has(observation)
  ) {
    return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
  }
  if (revision === 0) {
    if (
      registration !== null ||
      trustedLocator !== null ||
      expectedRoot !== null ||
      observation !== 'not-configured'
    ) {
      return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
    }
    return success({ revision, observation: 'not-configured' })
  }
  if (
    typeof registration !== 'string' ||
    !REGISTRATION_PATTERN.test(registration) ||
    typeof trustedLocator !== 'string' ||
    trustedLocator.length === 0 ||
    trustedLocator.length > 4096 ||
    typeof expectedRoot !== 'string' ||
    !STORAGE_IDENTITY_PATTERN.test(expectedRoot) ||
    observation === 'not-configured'
  ) {
    return failure('REGISTRY_INTEGRITY_FAILED', 'not-retryable')
  }
  return success({
    revision,
    registration: registration as ModelStorageRootRegistrationRef,
    trustedLocator,
    expectedRoot: expectedRoot as ModelStorageRootRef,
    observation: observation as RegistryRecord['observation']
  })
}

function commitReviewedSelection(
  databaseFile: string,
  review: ReviewRecord,
  registration: ModelStorageRootRegistrationRef
): ModelStorageRootRegistryResult<RegistryRecord> {
  let database: Database.Database | undefined
  let committed: RegistryRecord | undefined
  try {
    database = new Database(databaseFile, { fileMustExist: true })
    database.pragma(`busy_timeout = ${REGISTRY_BUSY_TIMEOUT_MS}`)
    database.pragma('synchronous = FULL')
    database.exec('BEGIN IMMEDIATE')
    const current = readRegistryRecordFromDatabase(database)
    if (!current.ok) {
      database.exec('ROLLBACK')
      return current
    }
    const exactCurrent = current.value.revision === review.revision &&
      (review.effect === 'select-first-root'
        ? !current.value.registration
        : Boolean(current.value.registration) &&
          current.value.expectedRoot === review.binding.root)
    if (!exactCurrent) {
      database.exec('ROLLBACK')
      return failure('SELECTION_REVIEW_STALE', 'review-again')
    }
    const nextRevision = review.revision + 1
    const updated = database.prepare(`
          UPDATE model_storage_root_registry
          SET selection_revision = ?,
              registration_id = ?,
              trusted_locator = ?,
              expected_storage_identity = ?,
              last_observation = 'available'
          WHERE singleton = 1
            AND selection_revision = ?
            AND (
              (? = 'select-first-root' AND registration_id IS NULL) OR
              (? = 'reconnect-current-root' AND registration_id = ?
                AND expected_storage_identity = ?)
            )
    `).run(
      nextRevision,
      registration,
      review.binding.rootDirectory,
      review.binding.root,
      review.revision,
      review.effect,
      review.effect,
      registration,
      review.binding.root
    )
    if (updated.changes !== 1) {
      database.exec('ROLLBACK')
      return failure('SELECTION_REVIEW_STALE', 'review-again')
    }
    const intended: RegistryRecord = {
      revision: nextRevision,
      registration,
      trustedLocator: review.binding.rootDirectory,
      expectedRoot: review.binding.root,
      observation: 'available'
    }
    try {
        database.exec('COMMIT')
        committed = intended
    } catch {
      if (database.inTransaction) {
        try { database.exec('ROLLBACK') } catch { /* Failure remains path-free. */ }
        return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
      }
      const durable = readRegistryRecordFromDatabase(database)
      if (!durable.ok || !sameSelection(durable.value, intended)) {
        return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
      }
      committed = intended
    }
    return success(committed)
  } catch {
    if (database?.inTransaction) {
      try { database.exec('ROLLBACK') } catch { /* Failure remains path-free. */ }
    }
    if (committed) return success(committed)
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  } finally {
    try { database?.close() } catch {
      // The durable commit point, not connection cleanup, defines selection.
    }
  }
}

function updateObservation(
  databaseFile: string,
  expected: RegistryRecord,
  observation: Exclude<RegistryRecord['observation'], 'not-configured'>
): ModelStorageRootRegistryResult<boolean> {
  if (
    !expected.registration ||
    !expected.trustedLocator ||
    !expected.expectedRoot
  ) {
    return success(false)
  }
  try {
    const database = new Database(databaseFile, { fileMustExist: true })
    try {
      database.pragma(`busy_timeout = ${REGISTRY_BUSY_TIMEOUT_MS}`)
      const updated = database.prepare(`
        UPDATE model_storage_root_registry
        SET last_observation = ?
        WHERE singleton = 1
          AND selection_revision = ?
          AND registration_id = ?
          AND trusted_locator = ?
          AND expected_storage_identity = ?
      `).run(
        observation,
        expected.revision,
        expected.registration,
        expected.trustedLocator,
        expected.expectedRoot
      )
      return success(updated.changes === 1)
    } finally {
      database.close()
    }
  } catch {
    return failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  }
}

function projectSummary(record: RegistryRecord): ModelStorageRootRegistrySummary {
  if (!record.registration) {
    return Object.freeze({
      revision: record.revision,
      current: Object.freeze({ state: 'not-configured' as const })
    })
  }
  return Object.freeze({
    revision: record.revision,
    current: Object.freeze({
      state: 'configured' as const,
      registration: record.registration,
      condition: record.observation as Exclude<RegistryRecord['observation'], 'not-configured'>
    })
  })
}

function sameSelection(left: RegistryRecord, right: RegistryRecord): boolean {
  return left.revision === right.revision &&
    left.registration === right.registration &&
    left.trustedLocator === right.trustedLocator &&
    left.expectedRoot === right.expectedRoot
}

function trimReviews(reviews: Map<string, ReviewRecord>): void {
  while (reviews.size > 128) {
    const oldest = reviews.keys().next().value as string | undefined
    if (!oldest) return
    reviews.delete(oldest)
  }
}

function success<T>(value: T): ModelStorageRootRegistryResult<T> {
  return { ok: true, value }
}

function failure(
  code: ModelStorageRootRegistryErrorCode,
  retry: 'review-again' | 'after-user-action' | 'after-session-closes' | 'not-retryable'
): { readonly ok: false; readonly error: {
  readonly code: ModelStorageRootRegistryErrorCode
  readonly retry: typeof retry
} } {
  return { ok: false, error: { code, retry } }
}

function mapAuthorityFailure(
  code:
    | 'STORAGE_TARGET_INVALID'
    | 'STORAGE_TARGET_UNSAFE'
    | 'STORAGE_TARGET_NOT_EMPTY'
    | 'STORAGE_NOT_PROVISIONED'
    | 'STORAGE_UNAVAILABLE'
    | 'STORAGE_UNSAFE'
    | 'STORAGE_READ_ONLY'
    | 'WRONG_STORAGE_IDENTITY'
    | 'STORAGE_SCHEMA_UNSUPPORTED'
    | 'STORAGE_INTEGRITY_FAILED'
    | 'STORAGE_BUSY'
    | 'RECOVERY_BLOCKED',
  retry: 'after-user-action' | 'after-session-closes' | 'not-retryable'
): ModelStorageRootRegistryResult<never> {
  if (code === 'STORAGE_TARGET_INVALID') {
    return failure('CANDIDATE_INVALID', 'not-retryable')
  }
  if (code === 'STORAGE_TARGET_UNSAFE') {
    return failure('STORAGE_UNSAFE', retry)
  }
  if (code === 'STORAGE_TARGET_NOT_EMPTY' || code === 'STORAGE_NOT_PROVISIONED') {
    return failure('STORAGE_UNAVAILABLE', 'after-user-action')
  }
  return failure(code, retry)
}

function observationForAuthorityFailure(
  code:
    | 'STORAGE_TARGET_INVALID'
    | 'STORAGE_TARGET_UNSAFE'
    | 'STORAGE_TARGET_NOT_EMPTY'
    | 'STORAGE_NOT_PROVISIONED'
    | 'STORAGE_UNAVAILABLE'
    | 'STORAGE_UNSAFE'
    | 'STORAGE_READ_ONLY'
    | 'WRONG_STORAGE_IDENTITY'
    | 'STORAGE_SCHEMA_UNSUPPORTED'
    | 'STORAGE_INTEGRITY_FAILED'
    | 'STORAGE_BUSY'
    | 'RECOVERY_BLOCKED'
): Exclude<RegistryRecord['observation'], 'not-configured'> {
  if (
    code === 'STORAGE_TARGET_INVALID' ||
    code === 'STORAGE_TARGET_UNSAFE' ||
    code === 'STORAGE_UNSAFE'
  ) return 'unsafe'
  if (
    code === 'STORAGE_TARGET_NOT_EMPTY' ||
    code === 'STORAGE_NOT_PROVISIONED' ||
    code === 'STORAGE_UNAVAILABLE'
  ) return 'unavailable'
  if (code === 'STORAGE_READ_ONLY') return 'read-only'
  if (code === 'WRONG_STORAGE_IDENTITY') return 'wrong-identity'
  if (code === 'STORAGE_SCHEMA_UNSUPPORTED') return 'schema-unsupported'
  if (code === 'STORAGE_INTEGRITY_FAILED') return 'integrity-failed'
  if (code === 'STORAGE_BUSY') return 'busy'
  return 'recovery-blocked'
}

function normalizeSql(value: string): string {
  return value
    .trim()
    .replace(/;$/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=<>])\s*/g, '$1')
}

function proveRegistryWritable(
  databaseFile: string
): ModelStorageRootRegistryResult<never> | undefined {
  let database: Database.Database | undefined
  try {
    database = new Database(databaseFile, { fileMustExist: true })
    database.pragma(`busy_timeout = ${REGISTRY_BUSY_TIMEOUT_MS}`)
    database.exec('BEGIN IMMEDIATE')
    database.exec('ROLLBACK')
    return undefined
  } catch (error) {
    if (database?.inTransaction) {
      try { database.exec('ROLLBACK') } catch { /* Error remains path-free. */ }
    }
    return isReadOnlyError(error)
      ? failure('REGISTRY_READ_ONLY', 'after-user-action')
      : failure('REGISTRY_STORAGE_FAILED', 'after-user-action')
  } finally {
    try { database?.close() } catch { /* The write probe is already complete. */ }
  }
}

async function applyTracerOnlyRegistryState(
  databaseFile: string,
  state: NonNullable<OpenModelStorageRootRegistryTracerInput['tracerOnlyRegistryState']>
): Promise<void> {
  if (state === 'registry-database-read-only') {
    await fs.chmod(databaseFile, 0o400)
    return
  }
  const database = new Database(databaseFile, { fileMustExist: true })
  try {
    if (state === 'registry-schema-v2') {
      database.pragma('user_version = 2')
    } else {
      database.exec('CREATE TABLE tracer_only_registry_fault (value TEXT) STRICT')
    }
  } finally {
    database.close()
  }
}

function hasOwnerWrite(mode: bigint): boolean {
  return (mode & 0o200n) === 0o200n
}

function hasOwnerWriteAndExecute(mode: bigint): boolean {
  return (mode & 0o300n) === 0o300n
}

function isReadOnlyError(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
  return code === 'EACCES' || code === 'EPERM' || code === 'EROFS' ||
    code.startsWith('SQLITE_READONLY')
}

function hasErrorCode(error: unknown, code: string): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}
