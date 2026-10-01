import fs from 'node:fs'
import path from 'node:path'

import type Database from 'better-sqlite3'

import {
  createAddAssetsWorkflow,
  createSqliteCapturePersistenceAdapter,
  type AddAssetsWorkflow,
  type CaptureIdentityKind,
  type GenerateSystemPreviewInput,
  type LocalFileSelectionOutcome,
  type SystemPreviewOutcome
} from '../capture-intake'
import type { CapturePromotionLifecycleSink } from '../capture-intake/capture-intake.types'
import { isInsideDirectory } from '../platform/path-normalizer'

const activeLibrarySessionBrand: unique symbol = Symbol('active-library-session')
const composeActiveLibraryCapture: unique symbol = Symbol(
  'compose-active-library-capture'
)

export type ActiveLibrarySessionErrorCode =
  | 'library-authority-invalid'
  | 'library-lock-invalid'
  | 'library-storage-unsafe'
  | 'library-database-unavailable'

export class ActiveLibrarySessionError extends Error {
  constructor(
    readonly code: ActiveLibrarySessionErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ActiveLibrarySessionError'
  }
}

export interface ActiveLibraryStorageBinding {
  libraryRootDirectory: string
  libraryControlDirectory: string
  managedOriginalsDirectory: string
  intakeStagingDirectory: string
  requiredPreviewsDirectory: string
}

export interface ExclusiveLibraryLockSnapshot {
  libraryIdentity: string
  libraryGeneration: string
  leaseIdentity: string
  state: 'held' | 'lost'
}

export type ExclusiveLibraryLockRunResult<T> =
  | { kind: 'completed'; value: T }
  | { kind: 'unavailable' }

/**
 * Live lease capability. runWhileHeld keeps the exact lease from being
 * released or replaced until the supplied asynchronous operation settles.
 */
export interface ExclusiveLibraryLockLease {
  inspect(): ExclusiveLibraryLockSnapshot
  runWhileHeld<T>(
    operation: () => Promise<T>
  ): Promise<ExclusiveLibraryLockRunResult<T>>
}

interface ActiveLibraryBinding {
  readonly identity: string
  readonly generation: string
  readonly storage: Readonly<ActiveLibraryStorageBinding>
  readonly database: Database.Database
}

export interface ActiveLibrarySessionProjection {
  identity: string
  generation: string
  state: 'writable'
}

export interface ActiveLibrarySession {
  readonly [activeLibrarySessionBrand]: true
  inspect(): ActiveLibrarySessionProjection
}

export interface ActiveLibraryCaptureDependencies {
  resumeAccepted?: boolean
  session: ActiveLibrarySession
  selectLocalFiles(): Promise<LocalFileSelectionOutcome>
  generateSystemPreview(
    input: GenerateSystemPreviewInput
  ): Promise<SystemPreviewOutcome>
  createIdentity(kind: CaptureIdentityKind): string
}

interface ActiveLibrarySessionImplementation extends ActiveLibrarySession {
  [composeActiveLibraryCapture](
    dependencies: Omit<ActiveLibraryCaptureDependencies, 'session'>
  ): Promise<AddAssetsWorkflow>
}

export interface CreateActiveLibrarySessionInput {
  identity: string
  generation: string
  storage: ActiveLibraryStorageBinding
  database: Database.Database
  lock: ExclusiveLibraryLockLease
  promotionLifecycle?: CapturePromotionLifecycleSink
}

/**
 * Creates the main-process capability that binds one inspected Library's
 * identity, storage roles, SQLite connection, and exclusive-write evidence.
 * The path-bearing binding remains inside the capability; outward callers use
 * inspect() and operation-specific composition factories.
 */
export function createActiveLibrarySession(
  input: CreateActiveLibrarySessionInput
): ActiveLibrarySession {
  assertOpaqueAuthority(input.identity, input.generation)
  const { inspectLock, runWhileHeld } = bindExclusiveLibraryLock(input)
  const initialLeaseIdentity = inspectMatchingLock(
    input.identity,
    input.generation,
    inspectLock
  ).leaseIdentity

  const storage = validateStorageBinding(input.storage, input.database)
  const binding: ActiveLibraryBinding = Object.freeze({
    identity: input.identity,
    generation: input.generation,
    storage,
    database: input.database
  })
  const projection: ActiveLibrarySessionProjection = Object.freeze({
    identity: input.identity,
    generation: input.generation,
    state: 'writable'
  })
  const assertCurrentAuthority = (): void => {
    const currentLock = inspectMatchingLock(
      binding.identity,
      binding.generation,
      inspectLock
    )
    if (currentLock.leaseIdentity !== initialLeaseIdentity) {
      throwInvalidLock()
    }
    assertWritableDatabase(binding.database)
  }
  const runGuarded = async <T>(
    operation: () => T | Promise<T>
  ): Promise<T> => {
    const operationFailure = Symbol('active-library-operation-failure')
    let failed = false
    let failure: unknown
    let result: ExclusiveLibraryLockRunResult<T>
    try {
      result = await runWhileHeld(async () => {
        try {
          assertCurrentAuthority()
          const value = await operation()
          assertCurrentAuthority()
          return value
        } catch (error) {
          failed = true
          failure = error
          throw operationFailure
        }
      })
    } catch (error) {
      if (error === operationFailure && failed) throw failure
      throwInvalidLock()
    }
    return readCompletedLockResult(result)
  }

  const session: ActiveLibrarySessionImplementation = Object.freeze({
    [activeLibrarySessionBrand]: true as const,
    inspect: () => {
      assertCurrentAuthority()
      return { ...projection }
    },
    async [composeActiveLibraryCapture](
      dependencies: Omit<ActiveLibraryCaptureDependencies, 'session'>
    ): Promise<AddAssetsWorkflow> {
      const workflow = await runGuarded(() =>
        createAddAssetsWorkflow({
          selectLocalFiles: dependencies.selectLocalFiles,
          resolveActiveLibrary: async () => createCaptureContext(binding),
        persistence: createSqliteCapturePersistenceAdapter(binding.database, {
          promotionLifecycle: input.promotionLifecycle
        }),
          generateSystemPreview: dependencies.generateSystemPreview,
          createIdentity: dependencies.createIdentity,
          resumeAccepted: dependencies.resumeAccepted
        })
      )

      const captureInterface: AddAssetsWorkflow = {
        prepare: () => runGuarded(() => workflow.prepare()),
        dispatch: (command) =>
          runGuarded(() => workflow.dispatch(command)),
        inspect: (request) =>
          runGuarded(() => workflow.inspect(request))
      }
      return Object.freeze(captureInterface)
    }
  })
  return session
}

function readCompletedLockResult<T>(
  result: ExclusiveLibraryLockRunResult<T>
): T {
  try {
    if (result.kind === 'completed') return result.value
  } catch {
    // Malformed Adapter output maps to the fixed authority error below.
  }
  throwInvalidLock()
}

function bindExclusiveLibraryLock(input: CreateActiveLibrarySessionInput): {
  inspectLock: () => ExclusiveLibraryLockSnapshot
  runWhileHeld: <T>(
    operation: () => Promise<T>
  ) => Promise<ExclusiveLibraryLockRunResult<T>>
} {
  try {
    const lock = input.lock
    return {
      inspectLock: lock.inspect.bind(lock),
      runWhileHeld: lock.runWhileHeld.bind(lock)
    }
  } catch {
    throwInvalidLock()
  }
}

/**
 * Composes the existing path-free Capture Interface without exposing the
 * Session's database or storage binding to a generic callback.
 */
export function createActiveLibraryCaptureWorkflow(
  dependencies: ActiveLibraryCaptureDependencies
): Promise<AddAssetsWorkflow> {
  const { session, ...captureDependencies } = dependencies
  if (!(composeActiveLibraryCapture in session)) {
    throw new ActiveLibrarySessionError(
      'library-authority-invalid',
      'The inspected library authority is invalid.'
    )
  }
  return (session as ActiveLibrarySessionImplementation)[
    composeActiveLibraryCapture
  ](captureDependencies)
}

function assertOpaqueAuthority(identity: string, generation: string): void {
  if (!isOpaqueIdentity(identity) || !isOpaqueIdentity(generation)) {
    throw new ActiveLibrarySessionError(
      'library-authority-invalid',
      'The inspected library authority is invalid.'
    )
  }
}

function inspectMatchingLock(
  identity: string,
  generation: string,
  inspectLock: () => ExclusiveLibraryLockSnapshot
): ExclusiveLibraryLockSnapshot {
  let snapshot: ExclusiveLibraryLockSnapshot
  try {
    snapshot = inspectLock()
  } catch {
    throwInvalidLock()
  }
  if (
    snapshot.state !== 'held' ||
    snapshot.libraryIdentity !== identity ||
    snapshot.libraryGeneration !== generation ||
    !isOpaqueIdentity(snapshot.leaseIdentity)
  ) {
    throwInvalidLock()
  }
  return snapshot
}

function createCaptureContext(binding: ActiveLibraryBinding) {
  return {
    identity: binding.identity,
    generation: binding.generation,
    libraryRootDirectory: binding.storage.libraryRootDirectory,
    managedOriginalsDirectory: binding.storage.managedOriginalsDirectory,
    intakeStagingDirectory: binding.storage.intakeStagingDirectory,
    requiredPreviewsDirectory: binding.storage.requiredPreviewsDirectory
  }
}

function throwInvalidLock(): never {
  throw new ActiveLibrarySessionError(
    'library-lock-invalid',
    'The inspected library does not hold matching write authority.'
  )
}

function validateStorageBinding(
  storage: ActiveLibraryStorageBinding,
  database: Database.Database
): Readonly<ActiveLibraryStorageBinding> {
  try {
    assertWritableDatabase(database)
    if (database.memory || !path.isAbsolute(database.name)) {
      throw new Error('The database is not a persistent Library database.')
    }

    const libraryRootDirectory = realDirectory(storage.libraryRootDirectory)
    const libraryControlDirectory = realDirectory(
      storage.libraryControlDirectory
    )
    const managedOriginalsDirectory = realDirectory(
      storage.managedOriginalsDirectory
    )
    const intakeStagingDirectory = realDirectory(
      storage.intakeStagingDirectory
    )
    const requiredPreviewsDirectory = realDirectory(
      storage.requiredPreviewsDirectory
    )
    const databasePath = fs.realpathSync(database.name)

    if (
      !isStrictlyInside(libraryRootDirectory, libraryControlDirectory) ||
      !isStrictlyInside(libraryRootDirectory, managedOriginalsDirectory) ||
      !isStrictlyInside(libraryControlDirectory, intakeStagingDirectory) ||
      !isStrictlyInside(libraryControlDirectory, requiredPreviewsDirectory) ||
      !isStrictlyInside(libraryControlDirectory, databasePath) ||
      isInsideDirectory(intakeStagingDirectory, databasePath) ||
      isInsideDirectory(requiredPreviewsDirectory, databasePath) ||
      directoriesOverlap(libraryControlDirectory, managedOriginalsDirectory) ||
      directoriesOverlap(intakeStagingDirectory, requiredPreviewsDirectory)
    ) {
      throw new Error('The Library storage roles are not independent.')
    }

    return Object.freeze({
      libraryRootDirectory,
      libraryControlDirectory,
      managedOriginalsDirectory,
      intakeStagingDirectory,
      requiredPreviewsDirectory
    })
  } catch (error) {
    if (error instanceof ActiveLibrarySessionError) throw error
    throw new ActiveLibrarySessionError(
      'library-storage-unsafe',
      'The inspected library storage binding is unsafe.'
    )
  }
}

function assertWritableDatabase(database: Database.Database): void {
  if (!database.open || database.readonly) {
    throw new ActiveLibrarySessionError(
      'library-database-unavailable',
      'The active library database is unavailable.'
    )
  }
}

function realDirectory(directory: string): string {
  if (!path.isAbsolute(directory)) {
    throw new Error('Library storage paths must be absolute.')
  }
  const resolved = fs.realpathSync(directory)
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error('Library storage role is not a directory.')
  }
  return resolved
}

function isStrictlyInside(root: string, target: string): boolean {
  return root !== target && isInsideDirectory(root, target)
}

function directoriesOverlap(left: string, right: string): boolean {
  return isInsideDirectory(left, right) || isInsideDirectory(right, left)
}

function isOpaqueIdentity(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(value)
}
