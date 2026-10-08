import fs from 'node:fs/promises'
import { constants as fsConstants, type BigIntStats } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

import type {
  CreateModelStorageAuthorityTracerInput,
  ModelStorageAuthorityErrorCode,
  ModelStorageAuthorityResult,
  ModelStorageAuthorityTracer,
  ModelStorageRootRef,
  ModelStorageSession
} from './model-storage-authority.tracer'
import type {
  InstallReviewedModelArtifactReceipt,
  InstallReviewedModelArtifactRequest,
  ModelLibrary,
  ModelLibraryResult,
  ModelLibrarySummary,
  ModelLibrarySummaryRequest
} from './model-library'
import {
  type InitializedTransactionalModelLibraryStore,
  openExistingTransactionalModelLibraryTracer,
  initializeTransactionalModelLibraryStore,
  validateExistingTransactionalModelLibraryStore
} from './transactional-model-library.internal'

const MODEL_LIBRARY_CONTROL_DIRECTORY = '.model-library'
const STORAGE_AUTHORITY_DATABASE = '.model-storage-authority.sqlite'
const STORAGE_PROVISIONING_CLAIM = '.model-storage-provisioning'
const STORAGE_IDENTITY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@+-]{0,127}$/
const STORAGE_AUTHORITY_APPLICATION_ID = 0x44414d4c
const STORAGE_AUTHORITY_SCHEMA_VERSION = 1
const STORAGE_AUTHORITY_TABLE_SQL = `
  CREATE TABLE model_storage_authority (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    schema_version INTEGER NOT NULL CHECK (schema_version = 1),
    storage_identity TEXT NOT NULL UNIQUE
  ) STRICT
`
const ROOT_DIRECTORY_ENTRIES = [
  MODEL_LIBRARY_CONTROL_DIRECTORY,
  STORAGE_AUTHORITY_DATABASE
] as const

interface ManagedRootIdentity {
  readonly rootDevice: bigint
  readonly rootInode: bigint
  readonly databaseDevice: bigint
  readonly databaseInode: bigint
  readonly controlDevice: bigint
  readonly controlInode: bigint
}

interface OwnedProvisionNode {
  readonly nodePath: string
  readonly kind: 'file' | 'directory'
  readonly device: bigint
  readonly inode: bigint
}

type AuthorityDatabaseInspection =
  | {
      readonly kind: 'current'
      readonly record: {
        readonly schemaVersion: 1
        readonly storageIdentity: string
      }
    }
  | { readonly kind: 'unsupported-schema' }
  | { readonly kind: 'integrity-failed' }

export function createModelStorageAuthorityTracer(
  input: CreateModelStorageAuthorityTracerInput
): ModelStorageAuthorityTracer {
  const rootDirectory = path.resolve(input.rootDirectory)
  const target = Object.freeze({}) as ModelStorageAuthorityTracer['target']

  return Object.freeze({
    target,
    authority: Object.freeze({
      async provision(candidate: typeof target) {
        if (candidate !== target) {
          return failure('STORAGE_TARGET_INVALID', 'not-retryable')
        }
        return provisionModelStorageRoot({
          rootDirectory,
          createStorageIdentity: input.createStorageIdentity,
          tracerOnlyProvisionCollision: input.tracerOnlyProvisionCollision,
          tracerOnlyProvisionedState: input.tracerOnlyProvisionedState
        })
      },

      async open(expectedRoot: ModelStorageRootRef) {
        if (
          typeof expectedRoot !== 'string' ||
          !STORAGE_IDENTITY_PATTERN.test(expectedRoot)
        ) return failure('WRONG_STORAGE_IDENTITY', 'not-retryable')

        const preflight = await inspectExistingRoot(rootDirectory)
        if (!preflight.ok) return preflight.result
        const preflightRecord = inspectAuthorityRecordWithoutLease(rootDirectory)
        if (!preflightRecord.ok) return preflightRecord.result
        if (preflightRecord.record.storageIdentity !== expectedRoot) {
          return failure('WRONG_STORAGE_IDENTITY', 'not-retryable')
        }

        let lease: Database.Database
        try {
          lease = await acquireWriterLease(rootDirectory)
        } catch (error) {
          if (isSqliteBusy(error)) {
            return failure('STORAGE_BUSY', 'after-session-closes')
          }
          return classifyOpenFailure(error)
        }
        const lockedRoot = await inspectExistingRoot(rootDirectory)
        if (!lockedRoot.ok || !sameManagedRootIdentity(preflight.identity, lockedRoot.identity)) {
          releaseWriterLease(lease)
          return lockedRoot.ok
            ? failure('STORAGE_UNSAFE', 'not-retryable')
            : lockedRoot.result
        }
        const inspection = inspectAuthorityDatabase(lease)
        if (inspection.kind === 'integrity-failed') {
          releaseWriterLease(lease)
          return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
        }
        if (inspection.kind === 'unsupported-schema') {
          releaseWriterLease(lease)
          return failure('STORAGE_SCHEMA_UNSUPPORTED', 'after-user-action')
        }
        const record = inspection.record
        if (record.storageIdentity !== expectedRoot) {
          releaseWriterLease(lease)
          return failure('WRONG_STORAGE_IDENTITY', 'not-retryable')
        }

        try {
          const writeAuthorityStillHeld = () => authorityStillHeld(
            lease,
            rootDirectory,
            lockedRoot.identity,
            expectedRoot
          )
          const library = await openExistingTransactionalModelLibraryTracer(
            {
              catalog: input.catalog,
              controlDirectory: path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY),
              byteSource: input.byteSource,
              createActivityId: input.createActivityId,
              createStorageRecordId: input.createStorageRecordId
            },
            writeAuthorityStillHeld
          )
          const recoveryProbe = await library.summarize({ kind: 'library' })
          if (
            !recoveryProbe.ok &&
            recoveryProbe.error.code === 'RECOVERY_BLOCKED'
          ) {
            releaseWriterLease(lease)
            return failure('RECOVERY_BLOCKED', 'after-user-action')
          }
          if (!await writeAuthorityStillHeld()) {
            releaseWriterLease(lease)
            return failure('STORAGE_UNAVAILABLE', 'after-user-action')
          }
          return {
            ok: true as const,
            value: {
              session: createRevocableSession(
                library,
                writeAuthorityStillHeld,
                () => releaseWriterLease(lease)
              )
            }
          }
        } catch {
          releaseWriterLease(lease)
          return failure('RECOVERY_BLOCKED', 'after-user-action')
        }
      }
    })
  })
}

export interface ProvisionModelStorageRootInput {
  readonly rootDirectory: string
  readonly createStorageIdentity: () => string
  readonly tracerOnlyProvisionedState?:
    CreateModelStorageAuthorityTracerInput['tracerOnlyProvisionedState']
  readonly tracerOnlyProvisionCollision?:
    CreateModelStorageAuthorityTracerInput['tracerOnlyProvisionCollision']
}

export interface PreparedModelStorageRoot {
  readonly root: ModelStorageRootRef
  readonly rootDevice: bigint
  readonly rootInode: bigint
  seal(): void
  rollbackOwned(): Promise<void>
}

/** @internal Root-only provisioner used by the product Workspace. */
export async function provisionModelStorageRoot(
  input: ProvisionModelStorageRootInput
): Promise<ModelStorageAuthorityResult<{ readonly root: ModelStorageRootRef }>> {
  const prepared = await prepareModelStorageRoot(input)
  if (!prepared.ok) return prepared
  prepared.value.seal()
  return { ok: true, value: { root: prepared.value.root } }
}

/** @internal Reversible provision held until Registry CAS commits. */
export async function prepareModelStorageRoot(
  input: ProvisionModelStorageRootInput
): Promise<ModelStorageAuthorityResult<PreparedModelStorageRoot>> {
  const rootDirectory = path.resolve(input.rootDirectory)
  let ownedClaim: OwnedProvisionNode | undefined
  let ownedControl: OwnedProvisionNode | undefined
  let ownedDatabase: OwnedProvisionNode | undefined
  let initializedStore: InitializedTransactionalModelLibraryStore | undefined
  let sealed = false
  const rollbackOwned = async (): Promise<void> => {
    if (sealed) return
    if (ownedDatabase) await removeOwnedProvisionNode(ownedDatabase)
    await initializedStore?.rollbackOwned()
    if (ownedControl) await removeOwnedProvisionNode(ownedControl)
    if (ownedClaim) await removeOwnedProvisionNode(ownedClaim)
  }
  try {
    const rootStat = await fs.lstat(rootDirectory, { bigint: true })
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      return failure('STORAGE_TARGET_UNSAFE', 'not-retryable')
    }
    if ((await fs.readdir(rootDirectory)).length !== 0) {
      return failure('STORAGE_TARGET_NOT_EMPTY', 'after-user-action')
    }
    ownedClaim = await createOwnedProvisionFile(
      path.join(rootDirectory, STORAGE_PROVISIONING_CLAIM),
      0o600
    )
    if (!sameTextSet(
      await fs.readdir(rootDirectory),
      [STORAGE_PROVISIONING_CLAIM]
    )) {
      await rollbackOwned()
      return failure('STORAGE_TARGET_NOT_EMPTY', 'after-user-action')
    }
    const storageIdentity = input.createStorageIdentity()
    if (!STORAGE_IDENTITY_PATTERN.test(storageIdentity)) {
      await rollbackOwned()
      return failure('STORAGE_TARGET_UNSAFE', 'not-retryable')
    }
    await applyTracerOnlyProvisionCollision(
      rootDirectory,
      input.tracerOnlyProvisionCollision,
      'before-control'
    )
    ownedControl = await createOwnedProvisionDirectory(
      path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY),
      0o700
    )
    initializedStore = await initializeTransactionalModelLibraryStore(
      ownedControl.nodePath
    )
    await applyTracerOnlyProvisionCollision(
      rootDirectory,
      input.tracerOnlyProvisionCollision,
      'before-database'
    )
    ownedDatabase = await createOwnedProvisionFile(
      path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE),
      0o600
    )
    await provisionAuthorityDatabase(ownedDatabase, storageIdentity)
    if (!sameTextSet(
      await fs.readdir(rootDirectory),
      [...ROOT_DIRECTORY_ENTRIES, STORAGE_PROVISIONING_CLAIM]
    )) {
      await rollbackOwned()
      return failure('STORAGE_TARGET_UNSAFE', 'not-retryable')
    }
    if (!await removeOwnedProvisionNode(ownedClaim)) {
      await rollbackOwned()
      return failure('STORAGE_TARGET_UNSAFE', 'not-retryable')
    }
    ownedClaim = undefined
    if (!await hasExactRootEntries(rootDirectory)) {
      await rollbackOwned()
      return failure('STORAGE_TARGET_UNSAFE', 'not-retryable')
    }
    await applyTracerOnlyProvisionedState(
      rootDirectory,
      input.tracerOnlyProvisionedState
    )
    return {
      ok: true,
      value: Object.freeze({
        root: storageIdentity as ModelStorageRootRef,
        rootDevice: rootStat.dev,
        rootInode: rootStat.ino,
        seal(): void {
          if (sealed) return
          sealed = true
          initializedStore?.seal()
        },
        rollbackOwned
      })
    }
  } catch (error) {
    await rollbackOwned()
    return hasErrorCode(error, 'EEXIST')
      ? failure('STORAGE_TARGET_NOT_EMPTY', 'after-user-action')
      : failure('STORAGE_TARGET_UNSAFE', 'after-user-action')
  }
}

/**
 * @internal Main-only candidate issuer for a user-selected managed root. It
 * verifies the root and its Authority record under the real writer lease so a
 * caller never reads the Authority SQLite or treats a path as identity.
 */
export async function inspectModelStorageRootRef(
  selectedRootDirectory: string
): Promise<ModelStorageAuthorityResult<{
  readonly root: ModelStorageRootRef
  readonly rootDevice: bigint
  readonly rootInode: bigint
  readonly recoveryRequired: boolean
}>> {
  const rootDirectory = path.resolve(selectedRootDirectory)
  const preflight = await inspectExistingRoot(rootDirectory)
  if (!preflight.ok) return preflight.result
  const preflightRecord = inspectAuthorityRecordWithoutLease(rootDirectory)
  if (!preflightRecord.ok) return preflightRecord.result

  let lease: Database.Database
  try {
    lease = await acquireWriterLease(rootDirectory)
  } catch (error) {
    return isSqliteBusy(error)
      ? failure('STORAGE_BUSY', 'after-session-closes')
      : classifyOpenFailure(error)
  }
  try {
    const lockedRoot = await inspectExistingRoot(rootDirectory)
    if (
      !lockedRoot.ok ||
      !sameManagedRootIdentity(preflight.identity, lockedRoot.identity)
    ) {
      return lockedRoot.ok
        ? failure('STORAGE_UNSAFE', 'not-retryable')
        : lockedRoot.result
    }
    const inspection = inspectAuthorityDatabase(lease)
    if (inspection.kind === 'integrity-failed') {
      return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
    }
    if (inspection.kind === 'unsupported-schema') {
      return failure('STORAGE_SCHEMA_UNSUPPORTED', 'after-user-action')
    }
    if (inspection.record.storageIdentity !== preflightRecord.record.storageIdentity) {
      return failure('STORAGE_UNSAFE', 'not-retryable')
    }
    return {
      ok: true,
      value: {
        root: inspection.record.storageIdentity as ModelStorageRootRef,
        rootDevice: lockedRoot.identity.rootDevice,
        rootInode: lockedRoot.identity.rootInode,
        recoveryRequired: await modelStoreRecoveryIsRequired(rootDirectory)
      }
    }
  } catch {
    return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
  } finally {
    releaseWriterLease(lease)
  }
}

/** @internal Read-only Root observation for page/manual status refresh. */
export async function observeModelStorageRootRef(
  selectedRootDirectory: string
): Promise<ModelStorageAuthorityResult<{
  readonly root: ModelStorageRootRef
  readonly rootDevice: bigint
  readonly rootInode: bigint
  readonly recoveryRequired: boolean
}>> {
  const rootDirectory = path.resolve(selectedRootDirectory)
  const beforeRoot = await inspectExistingRoot(rootDirectory)
  if (!beforeRoot.ok) return beforeRoot.result
  const beforeRecord = inspectAuthorityRecordWithoutLease(rootDirectory)
  if (!beforeRecord.ok) return beforeRecord.result
  try {
    const recoveryRequired = await modelStoreRecoveryIsRequired(rootDirectory)
    const afterRecord = inspectAuthorityRecordWithoutLease(rootDirectory)
    if (!afterRecord.ok) return afterRecord.result
    const afterRoot = await inspectExistingRoot(rootDirectory)
    if (
      !afterRoot.ok ||
      !sameManagedRootIdentity(beforeRoot.identity, afterRoot.identity) ||
      beforeRecord.record.storageIdentity !== afterRecord.record.storageIdentity
    ) {
      return afterRoot.ok
        ? failure('STORAGE_UNSAFE', 'not-retryable')
        : afterRoot.result
    }
    return {
      ok: true,
      value: {
        root: afterRecord.record.storageIdentity as ModelStorageRootRef,
        rootDevice: afterRoot.identity.rootDevice,
        rootInode: afterRoot.identity.rootInode,
        recoveryRequired
      }
    }
  } catch {
    return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
  }
}

export interface ModelStorageRootControlLease {
  readonly root: ModelStorageRootRef
  readonly rootDevice: bigint
  readonly rootInode: bigint
  readonly recoveryRequired: boolean
  stillHeld(): Promise<boolean>
  close(): void
}

/** @internal Root-only writer lease held through Registry identity CAS. */
export async function acquireModelStorageRootControlLease(
  selectedRootDirectory: string,
  expectedRoot?: ModelStorageRootRef
): Promise<ModelStorageAuthorityResult<ModelStorageRootControlLease>> {
  const rootDirectory = path.resolve(selectedRootDirectory)
  const preflight = await inspectExistingRoot(rootDirectory)
  if (!preflight.ok) return preflight.result
  const preflightRecord = inspectAuthorityRecordWithoutLease(rootDirectory)
  if (!preflightRecord.ok) return preflightRecord.result
  if (expectedRoot && preflightRecord.record.storageIdentity !== expectedRoot) {
    return failure('WRONG_STORAGE_IDENTITY', 'not-retryable')
  }

  let lease: Database.Database
  try {
    lease = await acquireWriterLease(rootDirectory)
  } catch (error) {
    return isSqliteBusy(error)
      ? failure('STORAGE_BUSY', 'after-session-closes')
      : classifyOpenFailure(error)
  }
  try {
    const lockedRoot = await inspectExistingRoot(rootDirectory)
    if (
      !lockedRoot.ok ||
      !sameManagedRootIdentity(preflight.identity, lockedRoot.identity)
    ) {
      releaseWriterLease(lease)
      return lockedRoot.ok
        ? failure('STORAGE_UNSAFE', 'not-retryable')
        : lockedRoot.result
    }
    const inspection = inspectAuthorityDatabase(lease)
    if (inspection.kind === 'integrity-failed') {
      releaseWriterLease(lease)
      return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
    }
    if (inspection.kind === 'unsupported-schema') {
      releaseWriterLease(lease)
      return failure('STORAGE_SCHEMA_UNSUPPORTED', 'after-user-action')
    }
    if (expectedRoot && inspection.record.storageIdentity !== expectedRoot) {
      releaseWriterLease(lease)
      return failure('WRONG_STORAGE_IDENTITY', 'not-retryable')
    }
    const recoveryRequired = await modelStoreRecoveryIsRequired(rootDirectory)
    let closed = false
    const root = inspection.record.storageIdentity as ModelStorageRootRef
    return {
      ok: true,
      value: Object.freeze({
        root,
        rootDevice: lockedRoot.identity.rootDevice,
        rootInode: lockedRoot.identity.rootInode,
        recoveryRequired,
        stillHeld: () => closed
          ? Promise.resolve(false)
          : authorityStillHeld(lease, rootDirectory, lockedRoot.identity, root),
        close(): void {
          if (closed) return
          closed = true
          releaseWriterLease(lease)
        }
      })
    }
  } catch {
    releaseWriterLease(lease)
    return failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
  }
}

async function modelStoreRecoveryIsRequired(
  rootDirectory: string
): Promise<boolean> {
  const controlDirectory = path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY)
  return (await fs.readdir(path.join(controlDirectory, 'staging'))).length > 0 ||
    (await fs.readdir(path.join(controlDirectory, 'transactions'))).length > 0
}

async function provisionAuthorityDatabase(
  ownedDatabase: OwnedProvisionNode,
  storageIdentity: string
): Promise<void> {
  if (!await ownedProvisionNodeMatches(ownedDatabase)) {
    throw new Error('MODEL_STORAGE_AUTHORITY_DATABASE_REPLACED')
  }
  const database = new Database(ownedDatabase.nodePath, {
    fileMustExist: true,
    timeout: 0
  })
  try {
    database.pragma('journal_mode = DELETE')
    database.pragma('synchronous = FULL')
    database.exec('BEGIN EXCLUSIVE')
    try {
      database.pragma(`application_id = ${STORAGE_AUTHORITY_APPLICATION_ID}`)
      database.pragma(`user_version = ${STORAGE_AUTHORITY_SCHEMA_VERSION}`)
      database.exec(`${STORAGE_AUTHORITY_TABLE_SQL};`)
      database.prepare(`
        INSERT INTO model_storage_authority (
          singleton,
          schema_version,
          storage_identity
        ) VALUES (1, 1, ?)
      `).run(storageIdentity)
      const inspection = inspectAuthorityDatabase(database)
      if (
        inspection.kind !== 'current' ||
        inspection.record.storageIdentity !== storageIdentity
      ) throw new Error('MODEL_STORAGE_AUTHORITY_SCHEMA_INVALID')
      database.exec('COMMIT')
    } catch (error) {
      if (database.inTransaction) database.exec('ROLLBACK')
      throw error
    }
  } finally {
    database.close()
  }
  if (!await ownedProvisionNodeMatches(ownedDatabase)) {
    throw new Error('MODEL_STORAGE_AUTHORITY_DATABASE_REPLACED')
  }
}

async function acquireWriterLease(
  rootDirectory: string
): Promise<Database.Database> {
  const rootStat = await fs.lstat(rootDirectory)
  const databaseFile = path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE)
  const databaseStat = await fs.lstat(databaseFile)
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    !databaseStat.isFile() ||
    databaseStat.isSymbolicLink()
  ) throw new Error('MODEL_STORAGE_ROOT_UNSAFE')

  const database = new Database(databaseFile, {
    fileMustExist: true,
    timeout: 0
  })
  try {
    database.pragma('busy_timeout = 0')
    database.exec('BEGIN IMMEDIATE')
    return database
  } catch (error) {
    database.close()
    throw error
  }
}

function inspectAuthorityDatabase(
  database: Database.Database
): AuthorityDatabaseInspection {
  try {
    if (database.pragma('quick_check', { simple: true }) !== 'ok') {
      return { kind: 'integrity-failed' }
    }
    const applicationId = database.pragma('application_id', { simple: true })
    const schemaVersion = database.pragma('user_version', { simple: true })
    if (
      applicationId !== STORAGE_AUTHORITY_APPLICATION_ID ||
      !Number.isSafeInteger(schemaVersion) ||
      (schemaVersion as number) <= 0
    ) return { kind: 'integrity-failed' }
    if (schemaVersion !== STORAGE_AUTHORITY_SCHEMA_VERSION) {
      return { kind: 'unsupported-schema' }
    }
    const schemaObjects = database.prepare(`
      SELECT type, name, tbl_name AS tableName, sql
      FROM sqlite_schema
      WHERE name NOT LIKE 'sqlite_%'
      ORDER BY type, name
    `).all() as Array<{
      type?: unknown
      name?: unknown
      tableName?: unknown
      sql?: unknown
    }>
    if (
      schemaObjects.length !== 1 ||
      schemaObjects[0].type !== 'table' ||
      schemaObjects[0].name !== 'model_storage_authority' ||
      schemaObjects[0].tableName !== 'model_storage_authority' ||
      typeof schemaObjects[0].sql !== 'string' ||
      normalizeSql(schemaObjects[0].sql) !== normalizeSql(STORAGE_AUTHORITY_TABLE_SQL)
    ) return { kind: 'integrity-failed' }
    const count = database.prepare(`
      SELECT COUNT(*) AS count
      FROM model_storage_authority
    `).get() as { count?: unknown } | undefined
    if (!count || count.count !== 1) return { kind: 'integrity-failed' }
    const row = database.prepare(`
      SELECT
        schema_version AS schemaVersion,
        storage_identity AS storageIdentity
      FROM model_storage_authority
      WHERE singleton = 1
    `).get() as { schemaVersion?: unknown; storageIdentity?: unknown } | undefined
    if (
      !row ||
      !Number.isSafeInteger(row.schemaVersion) ||
      row.schemaVersion !== schemaVersion ||
      typeof row.storageIdentity !== 'string' ||
      !STORAGE_IDENTITY_PATTERN.test(row.storageIdentity)
    ) return { kind: 'integrity-failed' }
    return {
      kind: 'current',
      record: {
        schemaVersion: STORAGE_AUTHORITY_SCHEMA_VERSION,
        storageIdentity: row.storageIdentity
      }
    }
  } catch (error) {
    if (isSqliteBusy(error)) throw error
    return { kind: 'integrity-failed' }
  }
}

function inspectAuthorityRecordWithoutLease(rootDirectory: string):
  | {
      readonly ok: true
      readonly record: { readonly schemaVersion: number; readonly storageIdentity: string }
    }
  | { readonly ok: false; readonly result: ModelStorageAuthorityResult<never> } {
  let database: Database.Database | undefined
  try {
    database = new Database(
      path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE),
      { readonly: true, fileMustExist: true, timeout: 0 }
    )
    const inspection = inspectAuthorityDatabase(database)
    if (inspection.kind === 'integrity-failed') {
      return { ok: false, result: failure('STORAGE_INTEGRITY_FAILED', 'after-user-action') }
    }
    if (inspection.kind === 'unsupported-schema') {
      return { ok: false, result: failure('STORAGE_SCHEMA_UNSUPPORTED', 'after-user-action') }
    }
    return { ok: true, record: inspection.record }
  } catch (error) {
    if (isSqliteBusy(error)) {
      return { ok: false, result: failure('STORAGE_BUSY', 'after-session-closes') }
    }
    return { ok: false, result: classifyOpenFailure(error) }
  } finally {
    if (database?.open) database.close()
  }
}

function releaseWriterLease(database: Database.Database): void {
  try {
    if (database.inTransaction) database.exec('ROLLBACK')
  } catch {
    // Capability revocation is already authoritative. Close remains path-free.
  } finally {
    try {
      if (database.open) database.close()
    } catch {
      // OS process teardown is the final crash-release boundary for this tracer.
    }
  }
}

function createRevocableSession(
  library: ModelLibrary,
  authorityHeld: () => Promise<boolean>,
  release: () => void
): ModelStorageSession {
  let acceptingOperations = true
  let operationTail: Promise<void> = Promise.resolve()
  let closePromise: Promise<void> | undefined
  let released = false
  const releaseOnce = (): void => {
    if (released) return
    released = true
    release()
  }
  const guardedLibrary: ModelLibrary = Object.freeze({
    summarize(
      request: ModelLibrarySummaryRequest
    ): Promise<ModelLibraryResult<ModelLibrarySummary>> {
      return runWhileAuthorityHeld(() => library.summarize(request))
    },

    install(
      request: InstallReviewedModelArtifactRequest
    ): Promise<ModelLibraryResult<InstallReviewedModelArtifactReceipt>> {
      return runWhileAuthorityHeld(() => library.install(request))
    }
  })
  const session: ModelStorageSession = Object.freeze({
    library: guardedLibrary,
    async close(): Promise<void> {
      if (closePromise) return closePromise
      acceptingOperations = false
      closePromise = operationTail.then(() => {
        releaseOnce()
      })
      return closePromise
    }
  })
  return session

  function runWhileAuthorityHeld<T>(
    operation: () => Promise<ModelLibraryResult<T>>
  ): Promise<ModelLibraryResult<T>> {
    if (!acceptingOperations) return Promise.resolve(authorityLost())
    const result = operationTail.then(async () => {
      if (!await authorityHeld()) {
        acceptingOperations = false
        releaseOnce()
        return authorityLost<T>()
      }
      const operationResult = await operation()
      if (
        !operationResult.ok &&
        operationResult.error.code === 'STORAGE_AUTHORITY_LOST'
      ) {
        acceptingOperations = false
        releaseOnce()
      }
      return operationResult
    })
    operationTail = result.then(() => undefined, () => undefined)
    return result
  }
}

function authorityLost<T>(): ModelLibraryResult<T> {
  return {
    ok: false,
    error: {
      code: 'STORAGE_AUTHORITY_LOST',
      retry: 'after-user-action'
    }
  }
}

function failure(
  code: ModelStorageAuthorityErrorCode,
  retry: 'after-user-action' | 'after-session-closes' | 'not-retryable'
): ModelStorageAuthorityResult<never> {
  return { ok: false, error: { code, retry } }
}

function isSqliteBusy(error: unknown): boolean {
  const code = errorCode(error)
  return typeof code === 'string' && (
    code.startsWith('SQLITE_BUSY') ||
    code.startsWith('SQLITE_LOCKED')
  )
}

async function inspectExistingRoot(rootDirectory: string): Promise<
  | { readonly ok: true; readonly identity: ManagedRootIdentity }
  | { readonly ok: false; readonly result: ModelStorageAuthorityResult<never> }
> {
  try {
    const rootStat = await fs.lstat(rootDirectory, { bigint: true })
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      return { ok: false, result: failure('STORAGE_UNSAFE', 'not-retryable') }
    }
    const databaseFile = path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE)
    const controlDirectory = path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY)
    const rootEntries = await fs.readdir(rootDirectory)
    if (rootEntries.length === 0) {
      return {
        ok: false,
        result: failure('STORAGE_NOT_PROVISIONED', 'after-user-action')
      }
    }
    let databaseStat: BigIntStats
    let controlStat: BigIntStats
    try {
      databaseStat = await fs.lstat(databaseFile, { bigint: true })
      controlStat = await fs.lstat(controlDirectory, { bigint: true })
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) {
        return {
          ok: false,
          result: failure('STORAGE_INTEGRITY_FAILED', 'after-user-action')
        }
      }
      throw error
    }
    if (
      !databaseStat.isFile() ||
      databaseStat.isSymbolicLink() ||
      !controlStat.isDirectory() ||
      controlStat.isSymbolicLink() ||
      !await hasExactRootEntries(rootDirectory)
    ) return { ok: false, result: failure('STORAGE_UNSAFE', 'not-retryable') }
    if (
      !ownerDirectoryWriteBitsPresent(rootStat.mode) ||
      !ownerWriteBitsPresent(databaseStat.mode)
    ) {
      return { ok: false, result: failure('STORAGE_READ_ONLY', 'after-user-action') }
    }
    try {
      await fs.access(
        rootDirectory,
        fsConstants.W_OK | fsConstants.X_OK
      )
      await fs.access(databaseFile, fsConstants.W_OK)
      const store = await validateExistingTransactionalModelLibraryStore(
        controlDirectory
      )
      if (!store.writable) {
        return { ok: false, result: failure('STORAGE_READ_ONLY', 'after-user-action') }
      }
    } catch (error) {
      if (isReadOnlyFailure(error)) {
        return { ok: false, result: failure('STORAGE_READ_ONLY', 'after-user-action') }
      }
      return { ok: false, result: failure('STORAGE_INTEGRITY_FAILED', 'after-user-action') }
    }
    return {
      ok: true,
      identity: {
        rootDevice: rootStat.dev,
        rootInode: rootStat.ino,
        databaseDevice: databaseStat.dev,
        databaseInode: databaseStat.ino,
        controlDevice: controlStat.dev,
        controlInode: controlStat.ino
      }
    }
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      return { ok: false, result: failure('STORAGE_UNAVAILABLE', 'after-user-action') }
    }
    if (isReadOnlyFailure(error)) {
      return { ok: false, result: failure('STORAGE_READ_ONLY', 'after-user-action') }
    }
    return { ok: false, result: failure('STORAGE_UNAVAILABLE', 'after-user-action') }
  }
}

async function authorityStillHeld(
  lease: Database.Database,
  rootDirectory: string,
  expected: ManagedRootIdentity,
  expectedRoot: ModelStorageRootRef
): Promise<boolean> {
  if (!lease.open || !lease.inTransaction) return false
  const current = await inspectExistingRoot(rootDirectory)
  if (!current.ok || !sameManagedRootIdentity(expected, current.identity)) return false
  try {
    const inspection = inspectAuthorityDatabase(lease)
    return Boolean(
      inspection.kind === 'current' &&
      inspection.record.storageIdentity === expectedRoot
    )
  } catch {
    return false
  }
}

async function hasExactRootEntries(rootDirectory: string): Promise<boolean> {
  const entries = (await fs.readdir(rootDirectory)).sort(compareText)
  return sameTextSet(entries, ROOT_DIRECTORY_ENTRIES)
}

function sameManagedRootIdentity(
  left: ManagedRootIdentity,
  right: ManagedRootIdentity
): boolean {
  return left.rootDevice === right.rootDevice &&
    left.rootInode === right.rootInode &&
    left.databaseDevice === right.databaseDevice &&
    left.databaseInode === right.databaseInode &&
    left.controlDevice === right.controlDevice &&
    left.controlInode === right.controlInode
}

function ownerWriteBitsPresent(mode: bigint): boolean {
  return (mode & 0o200n) !== 0n
}

function ownerDirectoryWriteBitsPresent(mode: bigint): boolean {
  return (mode & 0o300n) === 0o300n
}

function classifyOpenFailure(error: unknown): ModelStorageAuthorityResult<never> {
  if (isReadOnlyFailure(error)) {
    return failure('STORAGE_READ_ONLY', 'after-user-action')
  }
  if (hasErrorCode(error, 'ENOENT')) {
    return failure('STORAGE_NOT_PROVISIONED', 'after-user-action')
  }
  return failure('STORAGE_UNAVAILABLE', 'after-user-action')
}

function isReadOnlyFailure(error: unknown): boolean {
  if (
    hasErrorCode(error, 'EACCES') ||
    hasErrorCode(error, 'EPERM') ||
    hasErrorCode(error, 'EROFS')
  ) return true
  const code = errorCode(error)
  return typeof code === 'string' && code.startsWith('SQLITE_READONLY')
}

function errorCode(value: unknown): unknown {
  return value !== null && typeof value === 'object' && 'code' in value
    ? (value as { readonly code?: unknown }).code
    : undefined
}

function hasErrorCode(value: unknown, code: string): boolean {
  return value !== null &&
    typeof value === 'object' &&
    'code' in value &&
    (value as { readonly code?: unknown }).code === code
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalizeSql(value: string): string {
  return value
    .trim()
    .replace(/;$/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=])\s*/g, '$1')
}

function sameTextSet(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = [...left].sort(compareText)
  const normalizedRight = [...right].sort(compareText)
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
}

async function createOwnedProvisionFile(
  file: string,
  mode: number
): Promise<OwnedProvisionNode> {
  const handle = await fs.open(file, 'wx', mode)
  try {
    const stat = await handle.stat({ bigint: true })
    if (!stat.isFile()) throw new Error('MODEL_STORAGE_PROVISION_FILE_INVALID')
    await handle.sync()
    return {
      nodePath: file,
      kind: 'file',
      device: stat.dev,
      inode: stat.ino
    }
  } finally {
    await handle.close()
  }
}

async function createOwnedProvisionDirectory(
  directory: string,
  mode: number
): Promise<OwnedProvisionNode> {
  await fs.mkdir(directory, { mode })
  const stat = await fs.lstat(directory, { bigint: true })
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('MODEL_STORAGE_PROVISION_DIRECTORY_INVALID')
  }
  return {
    nodePath: directory,
    kind: 'directory',
    device: stat.dev,
    inode: stat.ino
  }
}

async function ownedProvisionNodeMatches(
  node: OwnedProvisionNode
): Promise<boolean> {
  try {
    const stat = await fs.lstat(node.nodePath, { bigint: true })
    return stat.dev === node.device &&
      stat.ino === node.inode &&
      (node.kind === 'file'
        ? stat.isFile() && !stat.isSymbolicLink()
        : stat.isDirectory() && !stat.isSymbolicLink())
  } catch {
    return false
  }
}

async function removeOwnedProvisionNode(
  node: OwnedProvisionNode
): Promise<boolean> {
  if (!await ownedProvisionNodeMatches(node)) return false
  try {
    if (node.kind === 'file') await fs.unlink(node.nodePath)
    else await fs.rmdir(node.nodePath)
    return true
  } catch {
    return false
  }
}

async function applyTracerOnlyProvisionCollision(
  rootDirectory: string,
  collision: CreateModelStorageAuthorityTracerInput['tracerOnlyProvisionCollision'],
  point: 'before-control' | 'before-database'
): Promise<void> {
  if (collision === 'foreign-control-entry' && point === 'before-control') {
    await fs.mkdir(path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY))
  }
  if (
    collision === 'foreign-authority-database' &&
    point === 'before-database'
  ) {
    await fs.writeFile(
      path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE),
      'foreign fixture',
      { flag: 'wx', mode: 0o600 }
    )
  }
}

async function applyTracerOnlyProvisionedState(
  rootDirectory: string,
  state: CreateModelStorageAuthorityTracerInput['tracerOnlyProvisionedState']
): Promise<void> {
  if (!state) return
  if (state === 'model-staging-read-only') {
    await fs.chmod(
      path.join(rootDirectory, MODEL_LIBRARY_CONTROL_DIRECTORY, 'staging'),
      0o500
    )
    return
  }
  if (state === 'authority-sqlite-read-only') {
    await fs.chmod(path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE), 0o400)
    return
  }
  if (state === 'model-control-missing') {
    const controlDirectory = path.join(
      rootDirectory,
      MODEL_LIBRARY_CONTROL_DIRECTORY
    )
    for (const entry of ['blobs', 'commits', 'staging', 'transactions']) {
      await fs.rmdir(path.join(controlDirectory, entry))
    }
    await fs.rmdir(controlDirectory)
    return
  }
  const database = new Database(
    path.join(rootDirectory, STORAGE_AUTHORITY_DATABASE),
    { fileMustExist: true, timeout: 0 }
  )
  try {
    if (state === 'authority-schema-v2') {
      database.pragma('user_version = 2')
    } else {
      database.exec('CREATE TABLE tracer_only_integrity_fault (value TEXT) STRICT')
    }
  } finally {
    database.close()
  }
}
