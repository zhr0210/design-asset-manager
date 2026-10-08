import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import Database from 'better-sqlite3'

import {
  ActiveLibrarySessionError,
  createActiveLibrarySession,
  type ActiveLibraryStorageBinding,
  type CreateActiveLibrarySessionInput,
  type ExclusiveLibraryLockLease,
  type ExclusiveLibraryLockRunResult,
  type ExclusiveLibraryLockSnapshot
} from '../src/main/library-lifecycle'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(
  path.join(testParent, 'active-library-session-')
)

interface LibraryFixture {
  root: string
  storage: ActiveLibraryStorageBinding
  database: Database.Database
}

async function createLibraryFixture(name: string): Promise<LibraryFixture> {
  const root = path.join(testRoot, name)
  const control = path.join(root, '.control')
  const originals = path.join(root, 'Originals')
  const staging = path.join(control, 'intake-staging')
  const previews = path.join(control, 'required-previews')
  await Promise.all([
    fs.mkdir(staging, { recursive: true }),
    fs.mkdir(previews, { recursive: true }),
    fs.mkdir(originals, { recursive: true })
  ])
  const database = new Database(path.join(control, 'library.sqlite'))
  return {
    root,
    database,
    storage: {
      libraryRootDirectory: root,
      libraryControlDirectory: control,
      managedOriginalsDirectory: originals,
      intakeStagingDirectory: staging,
      requiredPreviewsDirectory: previews
    }
  }
}

const initialLockSnapshot: ExclusiveLibraryLockSnapshot = {
  libraryIdentity: 'library-alpha',
  libraryGeneration: 'generation-1',
  leaseIdentity: 'lease-alpha-1',
  state: 'held'
}
const currentLockSnapshot: ExclusiveLibraryLockSnapshot = {
  ...initialLockSnapshot
}
const matchingLock: ExclusiveLibraryLockLease = {
  // A real Adapter may reuse one mutable snapshot object. The Session must
  // still remember the construction-time lease as an immutable primitive.
  inspect: () => currentLockSnapshot,
  runWhileHeld: (operation) =>
    runWhileSnapshotHeld(currentLockSnapshot, operation)
}

async function runWhileSnapshotHeld<T>(
  snapshot: ExclusiveLibraryLockSnapshot,
  operation: () => Promise<T>
): Promise<ExclusiveLibraryLockRunResult<T>> {
  if (snapshot.state !== 'held') return { kind: 'unavailable' }
  return { kind: 'completed', value: await operation() }
}

function createLock(
  snapshot: ExclusiveLibraryLockSnapshot
): ExclusiveLibraryLockLease {
  return {
    inspect: () => ({ ...snapshot }),
    runWhileHeld: (operation) =>
      runWhileSnapshotHeld(snapshot, operation)
  }
}

let libraryA: LibraryFixture | undefined
let libraryB: LibraryFixture | undefined
const unsafeDatabases: Database.Database[] = []
try {
  libraryA = await createLibraryFixture('library-a')
  libraryB = await createLibraryFixture('library-b')

  const sessionInput = {
    identity: 'library-alpha',
    generation: 'generation-1',
    storage: libraryA.storage,
    database: libraryA.database,
    lock: matchingLock
  }
  const session = createActiveLibrarySession(sessionInput)

  assert.deepEqual(session.inspect(), {
    identity: 'library-alpha',
    generation: 'generation-1',
    state: 'writable'
  })
  assert.equal(JSON.stringify(session.inspect()).includes(testRoot), false)
  assert.equal('run' in session, false)

  const throwingLockInput = {
    identity: 'library-alpha',
    generation: 'generation-1',
    storage: libraryA.storage,
    database: libraryA.database
  }
  Object.defineProperty(throwingLockInput, 'lock', {
    get: () => {
      throw new Error(testRoot)
    }
  })
  assert.throws(
    () => createActiveLibrarySession(
      throwingLockInput as CreateActiveLibrarySessionInput
    ),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid' &&
      !error.message.includes(testRoot)
  )

  assert.throws(
    () => createActiveLibrarySession({
      identity: 'library-alpha',
      generation: 'generation-1',
      storage: libraryA!.storage,
      database: libraryA!.database,
      lock: createLock({
        ...initialLockSnapshot,
        libraryIdentity: 'library-beta'
      })
    }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid' &&
      !error.message.includes(testRoot)
  )

  assert.throws(
    () => createActiveLibrarySession({
      identity: 'library-alpha',
      generation: 'generation-1',
      storage: libraryA!.storage,
      database: libraryB!.database,
      lock: matchingLock
    }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-storage-unsafe' &&
      !error.message.includes(testRoot)
  )

  assert.throws(
    () => createActiveLibrarySession({
      identity: 'library-alpha',
      generation: 'generation-1',
      storage: {
        ...libraryA!.storage,
        requiredPreviewsDirectory: libraryA!.storage.intakeStagingDirectory
      },
      database: libraryA!.database,
      lock: matchingLock
    }),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-storage-unsafe'
  )

  for (const databasePath of [
    path.join(libraryA.storage.intakeStagingDirectory, 'misplaced.sqlite'),
    path.join(libraryA.storage.requiredPreviewsDirectory, 'misplaced.sqlite')
  ]) {
    const unsafeDatabase = new Database(databasePath)
    unsafeDatabases.push(unsafeDatabase)
    assert.throws(
      () => createActiveLibrarySession({
        identity: 'library-alpha',
        generation: 'generation-1',
        storage: libraryA!.storage,
        database: unsafeDatabase,
        lock: matchingLock
      }),
      (error: unknown) =>
        error instanceof ActiveLibrarySessionError &&
        error.code === 'library-storage-unsafe' &&
        !error.message.includes(testRoot)
    )
  }

  currentLockSnapshot.state = 'lost'
  sessionInput.lock = createLock(initialLockSnapshot)
  assert.throws(
    () => session.inspect(),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid' &&
      !error.message.includes(testRoot)
  )

  currentLockSnapshot.state = 'held'
  currentLockSnapshot.leaseIdentity = 'lease-alpha-replaced'
  assert.throws(
    () => session.inspect(),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-lock-invalid'
  )
  Object.assign(currentLockSnapshot, initialLockSnapshot)

  libraryA.database.close()
  assert.throws(
    () => session.inspect(),
    (error: unknown) =>
      error instanceof ActiveLibrarySessionError &&
      error.code === 'library-database-unavailable'
  )

  console.log('active-library-session passed')
} finally {
  for (const database of unsafeDatabases) {
    if (database.open) database.close()
  }
  if (libraryA?.database.open) libraryA.database.close()
  if (libraryB?.database.open) libraryB.database.close()
  await fs.rm(testRoot, { recursive: true, force: true })
}
