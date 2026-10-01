import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import fs, { type BigIntStats } from 'node:fs'
import { lstat } from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import type {
  ExclusiveLibraryLockLease,
  ExclusiveLibraryLockRunResult,
  ExclusiveLibraryLockSnapshot
} from './active-library-session'
import {
  openReadonlyLibraryDatabase,
  sqliteRecoverySidecarsAbsent as recoverySidecarsAbsent
} from './readonly-library-database.internal'

const LOCK_DATABASE_FILE = 'exclusive-library-lock.sqlite'
const LOCK_APPLICATION_ID = 0x44414d4c
const LOCK_SCHEMA_VERSION = 1
const OPAQUE_IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u
const LOCK_IDENTITY_TABLE_SQL = `CREATE TABLE library_lock_identity (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  library_identity TEXT NOT NULL,
  library_generation TEXT NOT NULL
) WITHOUT ROWID`

export type ExclusiveLibraryLockStorageInspection = Readonly<
  { kind: 'storage-valid' } | { kind: 'storage-invalid' }
>

export interface AcquiredExclusiveLibraryLock {
  readonly lease: ExclusiveLibraryLockLease
  /**
   * Stops admission immediately and drains existing work. An in-guard call
   * requests revocation but rejects its self-wait; an outside call awaits it.
   */
  release(): Promise<void>
}

export type ExclusiveLibraryLockAcquireResult =
  | Readonly<{ kind: 'acquired'; lock: AcquiredExclusiveLibraryLock }>
  | Readonly<{ kind: 'busy' }>
  | Readonly<{ kind: 'invalid' }>

export interface ExclusiveLibraryLockAuthority {
  inspect(): ExclusiveLibraryLockStorageInspection
  acquire(): Promise<ExclusiveLibraryLockAcquireResult>
}

export interface CreateExclusiveLibraryLockTracerInput {
  controlDirectory: string
  libraryIdentity: string
  libraryGeneration: string
}

/** Main-only creation primitive for a brand-new control directory. */
export function initializeExclusiveLibraryLockStorage(
  controlDirectory: string,
  libraryIdentity: string,
  libraryGeneration: string
): void {
  if (!path.isAbsolute(controlDirectory) || !OPAQUE_IDENTITY.test(libraryIdentity) ||
    !OPAQUE_IDENTITY.test(libraryGeneration)) throw new Error('LOCK_INPUT_INVALID')
  const databaseFile = path.join(controlDirectory, 'exclusive-library-lock.sqlite')
  const descriptor = fs.openSync(databaseFile, 'wx')
  fs.closeSync(descriptor)
  const database = new Database(databaseFile, { fileMustExist: true })
  try {
    database.pragma('journal_mode = DELETE')
    database.pragma('synchronous = FULL')
    database.pragma(`application_id = ${LOCK_APPLICATION_ID}`)
    database.pragma(`user_version = ${LOCK_SCHEMA_VERSION}`)
    database.exec(LOCK_IDENTITY_TABLE_SQL)
    database.prepare(`
      INSERT INTO library_lock_identity (
        singleton, schema_version, library_identity, library_generation
      ) VALUES (1, ?, ?, ?)
    `).run(LOCK_SCHEMA_VERSION, libraryIdentity, libraryGeneration)
  } finally {
    database.close()
  }
}

interface LockStorageBinding {
  readonly controlDirectory: string
  readonly databaseFile: string
  readonly controlNode: NodeIdentity
  readonly databaseNode: NodeIdentity
}

interface NodeIdentity {
  readonly dev: bigint
  readonly ino: bigint
  readonly mode: bigint
  readonly birthtimeNs: bigint
}

/**
 * Main-only Validated Tracer. It opens only an explicitly initialized lock
 * store and is intentionally not exported from the library-lifecycle barrel.
 */
export function createExclusiveLibraryLockTracer(
  input: CreateExclusiveLibraryLockTracerInput
): ExclusiveLibraryLockAuthority {
  // This Tracer has real macOS/POSIX evidence only. In particular, the
  // read-only WAL refusal below must not be inferred for Windows VFSes.
  const configuration = process.platform === 'darwin' ? snapshotInput(input) : undefined
  return Object.freeze({
    inspect(): ExclusiveLibraryLockStorageInspection {
      if (!configuration) return { kind: 'storage-invalid' }
      let database: Database.Database | undefined
      try {
        const binding = bindExistingStorage(configuration.controlDirectory)
        database = openReadGuard(binding, configuration)
        if (!bindingStillMatches(binding)) {
          return { kind: 'storage-invalid' }
        }
        return { kind: 'storage-valid' }
      } catch {
        return { kind: 'storage-invalid' }
      } finally {
        try {
          if (database?.open) database.close()
        } catch {
          // The outward result remains fixed and path-free.
        }
      }
    },
    async acquire(): Promise<ExclusiveLibraryLockAcquireResult> {
      if (!configuration) return { kind: 'invalid' }
      let database: Database.Database | undefined
      let readGuard: Database.Database | undefined
      let binding: LockStorageBinding | undefined
      try {
        binding = bindExistingStorage(configuration.controlDirectory)
        readGuard = openReadGuard(binding, configuration)
        // Keep a real SHARED read transaction across the async node recheck
        // and the writer open. Hot-journal recovery needs EXCLUSIVE and cannot
        // run while this separate connection still holds the read guard.
        const currentNode = nodeIdentity(await lstat(binding.databaseFile, { bigint: true }))
        if (!sameNode(binding.databaseNode, currentNode) || !bindingStillMatches(binding)) {
          return { kind: 'invalid' }
        }
        database = new Database(binding.databaseFile, {
          fileMustExist: true,
          timeout: 0
        })
        database.pragma('busy_timeout = 0')
        database.exec('BEGIN IMMEDIATE')
        if (
          !storageMatches(database, configuration) ||
          !bindingStillMatches(binding)
        ) {
          releaseDatabase(database)
          database = undefined
          return { kind: 'invalid' }
        }
        if (!releaseDatabase(readGuard)) {
          releaseDatabase(database)
          database = undefined
          return { kind: 'invalid' }
        }
        readGuard = undefined
        const lock = createAcquiredLock(database, binding, configuration)
        database = undefined
        return Object.freeze({ kind: 'acquired' as const, lock })
      } catch (error) {
        if (database) releaseDatabase(database)
        return isSqliteBusy(error) && binding && bindingStillMatches(binding)
          ? { kind: 'busy' } : { kind: 'invalid' }
      } finally {
        if (readGuard) releaseDatabase(readGuard)
      }
    }
  })
}

function openReadGuard(
  binding: LockStorageBinding,
  identity: Readonly<{ libraryIdentity: string; libraryGeneration: string }>
): Database.Database {
  const database = openReadonlyLibraryDatabase(binding.databaseFile)
  try {
    if (!storageMatches(database, identity) || !bindingStillMatches(binding)) {
      throw new Error('LOCK_READ_GUARD_INVALID')
    }
    return database
  } catch {
    releaseDatabase(database)
    throw new Error('LOCK_READ_GUARD_INVALID')
  }
}

function createAcquiredLock(
  database: Database.Database,
  binding: LockStorageBinding,
  identity: Readonly<{ libraryIdentity: string; libraryGeneration: string }>
): AcquiredExclusiveLibraryLock {
  const leaseIdentity = `lease:${randomUUID()}`
  let physicalState: 'held' | 'lost' = 'held'
  let acceptingOperations = true
  let releasePromise: Promise<void> | undefined
  const activeOperations = new Set<Promise<unknown>>()
  const guardedContext = new AsyncLocalStorage<{ active: boolean }>()

  const evidenceHeld = (): boolean => {
    if (
      physicalState !== 'held' ||
      !database.open ||
      !database.inTransaction ||
      !bindingStillMatches(binding)
    ) {
      physicalState = 'lost'
      acceptingOperations = false
      return false
    }
    return true
  }
  const snapshot = (): ExclusiveLibraryLockSnapshot => ({
    libraryIdentity: identity.libraryIdentity,
    libraryGeneration: identity.libraryGeneration,
    leaseIdentity,
    state: physicalState
  })
  const lease: ExclusiveLibraryLockLease = Object.freeze({
    inspect(): ExclusiveLibraryLockSnapshot {
      evidenceHeld()
      return snapshot()
    },
    runWhileHeld<T>(
      operation: () => Promise<T>
    ): Promise<ExclusiveLibraryLockRunResult<T>> {
      if (!acceptingOperations || !evidenceHeld()) {
        return Promise.resolve({ kind: 'unavailable' })
      }
      // Record admission before invoking caller work: a callback may itself
      // request release, and that request must drain this very operation.
      const scope = { active: true }
      const running = Promise.resolve().then(
        () => guardedContext.run(scope, async (): Promise<ExclusiveLibraryLockRunResult<T>> => {
          try {
            if (!evidenceHeld()) return { kind: 'unavailable' }
            const value = await operation()
            return evidenceHeld()
              ? { kind: 'completed', value }
              : { kind: 'unavailable' }
          } finally {
            scope.active = false
          }
        })
      )
      activeOperations.add(running)
      void running.then(
        () => activeOperations.delete(running),
        () => activeOperations.delete(running)
      )
      return running
    }
  })
  const lock: AcquiredExclusiveLibraryLock = Object.freeze({
    lease,
    release(): Promise<void> {
      if (!releasePromise) {
        acceptingOperations = false
        releasePromise = (async () => {
          await Promise.allSettled(Array.from(activeOperations))
          physicalState = 'lost'
          guardedContext.disable()
          if (!releaseDatabase(database)) {
            throw new Error('The library lock release could not be confirmed.')
          }
        })()
        void releasePromise.catch(() => undefined)
      }
      if (guardedContext.getStore()?.active) {
        return Promise.reject(new Error(
          'Library lock release cannot be awaited from guarded work.'
        ))
      }
      return releasePromise
    }
  })
  return lock
}

function snapshotInput(input: CreateExclusiveLibraryLockTracerInput):
  | Readonly<CreateExclusiveLibraryLockTracerInput>
  | undefined {
  try {
    const { controlDirectory, libraryIdentity, libraryGeneration } = input
    if (
      typeof controlDirectory !== 'string' ||
      typeof libraryIdentity !== 'string' ||
      typeof libraryGeneration !== 'string' ||
      !OPAQUE_IDENTITY.test(libraryIdentity) ||
      !OPAQUE_IDENTITY.test(libraryGeneration)
    ) return undefined
    return Object.freeze({
      controlDirectory,
      libraryIdentity,
      libraryGeneration
    })
  } catch {
    return undefined
  }
}

function bindExistingStorage(controlDirectory: string): LockStorageBinding {
  if (!path.isAbsolute(controlDirectory)) {
    throw new Error('LOCK_CONTROL_INVALID')
  }
  const canonicalControl = fs.realpathSync(controlDirectory)
  const controlStat = fs.lstatSync(canonicalControl, { bigint: true })
  if (!controlStat.isDirectory() || controlStat.isSymbolicLink()) {
    throw new Error('LOCK_CONTROL_INVALID')
  }
  const databaseFile = path.join(canonicalControl, LOCK_DATABASE_FILE)
  const databaseStat = fs.lstatSync(databaseFile, { bigint: true })
  if (!databaseStat.isFile() || databaseStat.isSymbolicLink()) {
    throw new Error('LOCK_DATABASE_INVALID')
  }
  if (fs.realpathSync(databaseFile) !== databaseFile) {
    throw new Error('LOCK_DATABASE_INVALID')
  }
  if (!recoverySidecarsAbsent(databaseFile)) {
    throw new Error('LOCK_RECOVERY_UNPROVEN')
  }
  return Object.freeze({
    controlDirectory: canonicalControl,
    databaseFile,
    controlNode: nodeIdentity(controlStat),
    databaseNode: nodeIdentity(databaseStat)
  })
}

function bindingStillMatches(binding: LockStorageBinding): boolean {
  try {
    if (!recoverySidecarsAbsent(binding.databaseFile)) return false
    if (fs.realpathSync(binding.controlDirectory) !== binding.controlDirectory) {
      return false
    }
    if (fs.realpathSync(binding.databaseFile) !== binding.databaseFile) {
      return false
    }
    return sameNode(
      binding.controlNode,
      nodeIdentity(fs.lstatSync(binding.controlDirectory, { bigint: true }))
    ) && sameNode(
      binding.databaseNode,
      nodeIdentity(fs.lstatSync(binding.databaseFile, { bigint: true }))
    )
  } catch {
    return false
  }
}

function storageMatches(
  database: Database.Database,
  identity: Readonly<{ libraryIdentity: string; libraryGeneration: string }>
): boolean {
  try {
    if (database.pragma('query_only', { simple: true }) !== (database.readonly ? 1 : 0)) return false
    if (
      database.pragma('application_id', { simple: true }) !== LOCK_APPLICATION_ID ||
      database.pragma('user_version', { simple: true }) !== LOCK_SCHEMA_VERSION ||
      database.pragma('journal_mode', { simple: true }) !== 'delete' ||
      database.pragma('quick_check', { simple: true }) !== 'ok'
    ) return false
    const schema = database.prepare(`
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
      schema.length !== 1 ||
      schema[0].type !== 'table' ||
      schema[0].name !== 'library_lock_identity' ||
      schema[0].tableName !== 'library_lock_identity' ||
      typeof schema[0].sql !== 'string' ||
      normalizeSql(schema[0].sql) !== normalizeSql(LOCK_IDENTITY_TABLE_SQL)
    ) return false
    const rows = database.prepare(`
      SELECT
        singleton,
        schema_version AS schemaVersion,
        library_identity AS libraryIdentity,
        library_generation AS libraryGeneration
      FROM library_lock_identity
    `).all() as Array<{
      singleton?: unknown
      schemaVersion?: unknown
      libraryIdentity?: unknown
      libraryGeneration?: unknown
    }>
    return rows.length === 1 &&
      rows[0].singleton === 1 &&
      rows[0].schemaVersion === LOCK_SCHEMA_VERSION &&
      rows[0].libraryIdentity === identity.libraryIdentity &&
      rows[0].libraryGeneration === identity.libraryGeneration
  } catch {
    return false
  }
}

function releaseDatabase(database: Database.Database): boolean {
  try {
    if (database.inTransaction) database.exec('ROLLBACK')
  } catch {
    // Closing the connection remains the authoritative OS release attempt.
  }
  try {
    if (database.open) database.close()
    return !database.open
  } catch {
    return false
  }
}

function isSqliteBusy(error: unknown): boolean {
  try {
    if (!error || typeof error !== 'object' || !('code' in error)) return false
    const code = Reflect.get(error, 'code')
    return typeof code === 'string' && (
      code.startsWith('SQLITE_BUSY') || code.startsWith('SQLITE_LOCKED')
    )
  } catch {
    return false
  }
}

function nodeIdentity(stat: BigIntStats): NodeIdentity {
  return Object.freeze({
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    birthtimeNs: stat.birthtimeNs
  })
}

function sameNode(left: NodeIdentity, right: NodeIdentity): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.birthtimeNs === right.birthtimeNs
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/gu, ' ').trim().toLowerCase()
}
