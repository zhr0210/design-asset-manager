import assert from 'node:assert/strict'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { readFileSync, writeSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import Database from 'better-sqlite3'

import { createExclusiveLibraryLockTracer } from '../src/main/library-lifecycle/exclusive-library-lock.tracer'
import {
  ActiveLibrarySessionError,
  createActiveLibraryCaptureWorkflow,
  createActiveLibrarySession,
  type ActiveLibraryStorageBinding
} from '../src/main/library-lifecycle'

const LOCK_DATABASE_FILE = 'exclusive-library-lock.sqlite'
const LOCK_APPLICATION_ID = 0x44414d4c
const LOCK_SCHEMA_VERSION = 1
const LOCK_IDENTITY_TABLE_SQL = `CREATE TABLE library_lock_identity (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  library_identity TEXT NOT NULL,
  library_generation TEXT NOT NULL
) WITHOUT ROWID`

interface LockFixture {
  readonly rootDirectory: string
  readonly controlDirectory: string
  readonly lockDatabase: string
}

async function createInitializedFixture(
  name: string,
  libraryIdentity = 'library-alpha',
  libraryGeneration = 'generation-1'
): Promise<LockFixture> {
  const rootDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), `dam-library-lock-${name}-`)
  )
  const controlDirectory = path.join(rootDirectory, '.dam')
  const lockDatabase = path.join(controlDirectory, LOCK_DATABASE_FILE)
  await fs.mkdir(controlDirectory)
  const database = new Database(lockDatabase)
  try {
    database.pragma('journal_mode = DELETE')
    database.pragma('synchronous = FULL')
    database.pragma(`application_id = ${LOCK_APPLICATION_ID}`)
    database.pragma(`user_version = ${LOCK_SCHEMA_VERSION}`)
    database.exec(LOCK_IDENTITY_TABLE_SQL)
    database.prepare(`
      INSERT INTO library_lock_identity (
        singleton,
        schema_version,
        library_identity,
        library_generation
      ) VALUES (1, 1, ?, ?)
    `).run(libraryIdentity, libraryGeneration)
  } finally {
    database.close()
  }
  return { rootDirectory, controlDirectory, lockDatabase }
}

async function removeFixture(fixture: LockFixture): Promise<void> {
  const basename = path.basename(fixture.rootDirectory)
  if (!basename.startsWith('dam-library-lock-')) {
    throw new Error('Refusing to remove an unowned lock fixture.')
  }
  await fs.rm(fixture.rootDirectory, { recursive: true, force: true })
}

async function inspectDoesNotMutateInitializedStorage(): Promise<void> {
  const fixture = await createInitializedFixture('inspect')
  try {
    const beforeEntries = await fs.readdir(fixture.controlDirectory)
    const before = await fs.stat(fixture.lockDatabase, { bigint: true })
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })

    assert.deepEqual(authority.inspect(), { kind: 'storage-valid' })
    assert.deepEqual(authority.inspect(), { kind: 'storage-valid' })
    assert.equal(JSON.stringify(authority.inspect()).includes(fixture.rootDirectory), false)

    const afterEntries = await fs.readdir(fixture.controlDirectory)
    const after = await fs.stat(fixture.lockDatabase, { bigint: true })
    assert.deepEqual(afterEntries, beforeEntries)
    assert.equal(after.size, before.size)
    assert.equal(after.mtimeNs, before.mtimeNs)
    assert.equal(after.ino, before.ino)
  } finally {
    await removeFixture(fixture)
  }
}

async function acquireAndReleaseOwnsOneRevocableLease(): Promise<void> {
  const fixture = await createInitializedFixture('acquire')
  try {
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const acquired = await authority.acquire()
    assert.equal(acquired.kind, 'acquired')
    if (acquired.kind !== 'acquired') throw new Error('Expected lock acquisition.')

    const held = acquired.lock.lease.inspect()
    assert.equal(held.libraryIdentity, 'library-alpha')
    assert.equal(held.libraryGeneration, 'generation-1')
    assert.equal(held.state, 'held')
    assert.match(held.leaseIdentity, /^lease:[0-9a-f-]{36}$/u)
    assert.equal(JSON.stringify(held).includes(fixture.rootDirectory), false)
    assert.deepEqual(
      await acquired.lock.lease.runWhileHeld(async () => 'completed-work'),
      { kind: 'completed', value: 'completed-work' }
    )

    await acquired.lock.release()
    await acquired.lock.release()
    assert.deepEqual(acquired.lock.lease.inspect(), { ...held, state: 'lost' })
    assert.deepEqual(
      await acquired.lock.lease.runWhileHeld(async () => 'must-not-run'),
      { kind: 'unavailable' }
    )

    const reacquired = await authority.acquire()
    assert.equal(reacquired.kind, 'acquired')
    if (reacquired.kind !== 'acquired') throw new Error('Expected reacquisition.')
    assert.notEqual(
      reacquired.lock.lease.inspect().leaseIdentity,
      held.leaseIdentity
    )
    await reacquired.lock.release()
  } finally {
    await removeFixture(fixture)
  }
}

async function oneProcessCannotAcquireTheSamePhysicalStoreTwice(): Promise<void> {
  const fixture = await createInitializedFixture('single-process-busy')
  try {
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const holder = await authority.acquire()
    assert.equal(holder.kind, 'acquired')
    if (holder.kind !== 'acquired') throw new Error('Expected first holder.')

    assert.deepEqual(authority.inspect(), { kind: 'storage-valid' })
    assert.deepEqual(await authority.acquire(), { kind: 'busy' })

    await holder.lock.release()
    const next = await authority.acquire()
    assert.equal(next.kind, 'acquired')
    if (next.kind !== 'acquired') throw new Error('Expected next holder.')
    await next.lock.release()
  } finally {
    await removeFixture(fixture)
  }
}

async function missingWrongOrMalformedStorageFailsClosed(): Promise<void> {
  const missingRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dam-library-lock-missing-')
  )
  const missingFixture: LockFixture = {
    rootDirectory: missingRoot,
    controlDirectory: path.join(missingRoot, '.dam'),
    lockDatabase: path.join(missingRoot, '.dam', LOCK_DATABASE_FILE)
  }
  await fs.mkdir(missingFixture.controlDirectory)
  try {
    const missing = createExclusiveLibraryLockTracer({
      controlDirectory: missingFixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    assert.deepEqual(missing.inspect(), { kind: 'storage-invalid' })
    assert.deepEqual(await missing.acquire(), { kind: 'invalid' })
    assert.deepEqual(await fs.readdir(missingFixture.controlDirectory), [])
    for (const invalidBytes of [Buffer.alloc(0), Buffer.from('not-a-lock-store')]) {
      await fs.writeFile(missingFixture.lockDatabase, invalidBytes, { flag: 'wx' })
      assert.deepEqual(missing.inspect(), { kind: 'storage-invalid' })
      assert.deepEqual(await missing.acquire(), { kind: 'invalid' })
      assert.deepEqual(await fs.readFile(missingFixture.lockDatabase), invalidBytes)
      assert.deepEqual(await fs.readdir(missingFixture.controlDirectory), [LOCK_DATABASE_FILE])
      await fs.unlink(missingFixture.lockDatabase)
    }
  } finally {
    await removeFixture(missingFixture)
  }

  const fixture = await createInitializedFixture('invalid')
  try {
    for (const [libraryIdentity, libraryGeneration] of [
      ['library-other', 'generation-1'],
      ['library-alpha', 'generation-2'],
      ['../library-alpha', 'generation-1']
    ] as const) {
      const authority = createExclusiveLibraryLockTracer({
        controlDirectory: fixture.controlDirectory,
        libraryIdentity,
        libraryGeneration
      })
      assert.deepEqual(authority.inspect(), { kind: 'storage-invalid' })
      assert.deepEqual(await authority.acquire(), { kind: 'invalid' })
    }

    const database = new Database(fixture.lockDatabase)
    try {
      database.exec('CREATE TABLE unexpected_authority (value TEXT)')
    } finally {
      database.close()
    }
    const malformed = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    assert.deepEqual(malformed.inspect(), { kind: 'storage-invalid' })
    assert.deepEqual(await malformed.acquire(), { kind: 'invalid' })
  } finally {
    await removeFixture(fixture)
  }
}

async function independentProcessAndPhysicalAliasStayBusy(): Promise<void> {
  const fixture = await createInitializedFixture('process-busy')
  const aliasDirectory = `${fixture.rootDirectory}-alias`
  let child: ChildProcess | undefined
  try {
    await fs.symlink(
      fixture.rootDirectory,
      aliasDirectory,
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    child = spawnLockHolder(fixture.controlDirectory)
    await waitForChildLine(child, 'READY')

    for (const controlDirectory of [
      fixture.controlDirectory,
      path.join(aliasDirectory, '.dam')
    ]) {
      const contender = createExclusiveLibraryLockTracer({
        controlDirectory,
        libraryIdentity: 'library-alpha',
        libraryGeneration: 'generation-1'
      })
      assert.deepEqual(contender.inspect(), { kind: 'storage-valid' })
      const result = await settleWithin(contender.acquire(), 1_000)
      assert.deepEqual(result, { kind: 'busy' })
      assert.equal(JSON.stringify(result).includes(fixture.rootDirectory), false)
    }

    child.stdin?.end('RELEASE\n')
    await waitForChildExit(child)
    child = undefined

    const aliasAuthority = createExclusiveLibraryLockTracer({
      controlDirectory: path.join(aliasDirectory, '.dam'),
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const acquired = await aliasAuthority.acquire()
    assert.equal(acquired.kind, 'acquired')
    if (acquired.kind !== 'acquired') throw new Error('Expected alias acquisition.')
    await acquired.lock.release()
  } finally {
    if (child && child.exitCode === null) child.kill('SIGKILL')
    await fs.unlink(aliasDirectory).catch(() => undefined)
    await removeFixture(fixture)
  }
}

async function abruptProcessExitReleasesTheOsLease(): Promise<void> {
  const fixture = await createInitializedFixture('process-crash')
  let child: ChildProcess | undefined
  try {
    child = spawnLockHolder(fixture.controlDirectory)
    await waitForChildLine(child, 'READY')
    assert.equal(child.kill('SIGKILL'), true)
    await waitForChildTermination(child)
    child = undefined

    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const acquired = await authority.acquire()
    assert.equal(acquired.kind, 'acquired')
    if (acquired.kind !== 'acquired') throw new Error('Expected crash release.')
    await acquired.lock.release()
  } finally {
    if (child && child.exitCode === null) child.kill('SIGKILL')
    await removeFixture(fixture)
  }
}

async function releaseRevokesAdmissionsAndDrainsAcceptedWork(): Promise<void> {
  const fixture = await createInitializedFixture('drain')
  try {
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const acquired = await authority.acquire()
    assert.equal(acquired.kind, 'acquired')
    if (acquired.kind !== 'acquired') throw new Error('Expected drain holder.')

    let markStarted: (() => void) | undefined
    let finishWork: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const finish = new Promise<void>((resolve) => {
      finishWork = resolve
    })
    const admitted = acquired.lock.lease.runWhileHeld(async () => {
      markStarted?.()
      await finish
      return 'settled'
    })
    await started

    let released = false
    const releasing = acquired.lock.release().then(() => {
      released = true
    })
    let rejectedOperationRan = false
    assert.deepEqual(
      await acquired.lock.lease.runWhileHeld(async () => {
        rejectedOperationRan = true
        return 'not-admitted'
      }),
      { kind: 'unavailable' }
    )
    assert.equal(rejectedOperationRan, false)
    await Promise.resolve()
    assert.equal(released, false)
    assert.equal(acquired.lock.lease.inspect().state, 'held')
    assert.deepEqual(await authority.acquire(), { kind: 'busy' })

    finishWork?.()
    assert.deepEqual(await admitted, { kind: 'completed', value: 'settled' })
    await releasing
    assert.equal(released, true)
    assert.equal(acquired.lock.lease.inspect().state, 'lost')
  } finally {
    await removeFixture(fixture)
  }
}

async function releasedAndReplacedLeaseInvalidatesTheOldSession(): Promise<void> {
  const fixture = await createInitializedFixture('session')
  const originals = path.join(fixture.rootDirectory, 'Originals')
  const staging = path.join(fixture.controlDirectory, 'intake-staging')
  const previews = path.join(fixture.controlDirectory, 'required-previews')
  await Promise.all([
    fs.mkdir(originals),
    fs.mkdir(staging),
    fs.mkdir(previews)
  ])
  const database = new Database(path.join(fixture.controlDirectory, 'library.sqlite'))
  try {
    const storage: ActiveLibraryStorageBinding = {
      libraryRootDirectory: fixture.rootDirectory,
      libraryControlDirectory: fixture.controlDirectory,
      managedOriginalsDirectory: originals,
      intakeStagingDirectory: staging,
      requiredPreviewsDirectory: previews
    }
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const first = await authority.acquire()
    assert.equal(first.kind, 'acquired')
    if (first.kind !== 'acquired') throw new Error('Expected first Session lease.')
    const oldLeaseIdentity = first.lock.lease.inspect().leaseIdentity
    const oldSession = createActiveLibrarySession({
      identity: 'library-alpha',
      generation: 'generation-1',
      storage,
      database,
      lock: first.lock.lease
    })
    assert.equal(oldSession.inspect().state, 'writable')

    let markSelectionStarted: (() => void) | undefined
    let finishSelection: (() => void) | undefined
    const selectionStarted = new Promise<void>((resolve) => {
      markSelectionStarted = resolve
    })
    const selectionFinished = new Promise<void>((resolve) => {
      finishSelection = resolve
    })
    const workflow = await createActiveLibraryCaptureWorkflow({
      session: oldSession,
      selectLocalFiles: async () => {
        markSelectionStarted?.()
        await selectionFinished
        return { kind: 'cancelled' }
      },
      generateSystemPreview: async () => {
        throw new Error('Cancelled selection must not generate a preview.')
      },
      createIdentity: () => {
        throw new Error('Cancelled selection must not allocate an identity.')
      }
    })
    const preparing = workflow.prepare()
    await selectionStarted
    const releasing = first.lock.release()
    await assert.rejects(
      workflow.prepare(),
      (error: unknown) =>
        error instanceof ActiveLibrarySessionError &&
        error.code === 'library-lock-invalid'
    )
    finishSelection?.()
    assert.deepEqual(await preparing, { kind: 'cancelled' })
    await releasing
    assert.throws(
      () => oldSession.inspect(),
      (error: unknown) =>
        error instanceof ActiveLibrarySessionError &&
        error.code === 'library-lock-invalid' &&
        !error.message.includes(fixture.rootDirectory)
    )

    const replacement = await authority.acquire()
    assert.equal(replacement.kind, 'acquired')
    if (replacement.kind !== 'acquired') {
      throw new Error('Expected replacement Session lease.')
    }
    assert.notEqual(
      replacement.lock.lease.inspect().leaseIdentity,
      oldLeaseIdentity
    )
    const replacementSession = createActiveLibrarySession({
      identity: 'library-alpha',
      generation: 'generation-1',
      storage,
      database,
      lock: replacement.lock.lease
    })
    assert.equal(replacementSession.inspect().state, 'writable')
    assert.throws(
      () => oldSession.inspect(),
      (error: unknown) =>
        error instanceof ActiveLibrarySessionError &&
        error.code === 'library-lock-invalid'
    )
    await replacement.lock.release()
  } finally {
    if (database.open) database.close()
    await removeFixture(fixture)
  }
}

async function releaseRequestedInsideGuardStillDrainsThatGuard(): Promise<void> {
  const fixture = await createInitializedFixture('reentrant-release')
  let finishWork: (() => void) | undefined
  try {
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const acquired = await authority.acquire()
    assert.equal(acquired.kind, 'acquired')
    if (acquired.kind !== 'acquired') throw new Error('Expected reentrant holder.')
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const finished = new Promise<void>((resolve) => {
      finishWork = resolve
    })
    let selfReleaseError: unknown
    let released = false
    const admitted = acquired.lock.lease.runWhileHeld(async () => {
      try {
        await acquired.lock.release()
      } catch (error) {
        selfReleaseError = error
      }
      markStarted?.()
      await finished
      return 'settled-after-release-request'
    })
    await settleWithin(started, 1_000)
    assert.ok(selfReleaseError instanceof Error)
    assert.equal(
      selfReleaseError.message,
      'Library lock release cannot be awaited from guarded work.'
    )
    const releasing = acquired.lock.release().then(() => {
      released = true
    })
    await Promise.resolve()
    assert.equal(released, false)
    assert.deepEqual(await authority.acquire(), { kind: 'busy' })
    finishWork?.()
    assert.deepEqual(await admitted, {
      kind: 'completed',
      value: 'settled-after-release-request'
    })
    await releasing
    assert.equal(released, true)
  } finally {
    finishWork?.()
    await removeFixture(fixture)
  }
}

async function recoverySidecarsAreNeitherRecoveredNorDeleted(): Promise<void> {
  const fixture = await createInitializedFixture('recovery-sidecar')
  try {
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    const originalDatabase = await fs.readFile(fixture.lockDatabase)
    const unprovenBytes = Buffer.from('unproven-lock-recovery-fixture', 'utf8')
    for (const suffix of ['-journal', '-wal', '-shm']) {
      const sidecar = `${fixture.lockDatabase}${suffix}`
      await fs.writeFile(sidecar, unprovenBytes, { flag: 'wx' })
      assert.deepEqual(authority.inspect(), { kind: 'storage-invalid' })
      assert.deepEqual(await authority.acquire(), { kind: 'invalid' })
      assert.deepEqual(await fs.readFile(fixture.lockDatabase), originalDatabase)
      assert.deepEqual(await fs.readFile(sidecar), unprovenBytes)
      await fs.unlink(sidecar)
    }
  } finally {
    await removeFixture(fixture)
  }
}

async function mutatingConstructorInputCannotRetargetLockAuthority(): Promise<void> {
  const original = await createInitializedFixture('bound-original')
  const other = await createInitializedFixture('bound-other')
  try {
    const input = {
      controlDirectory: original.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    }
    const bound = createExclusiveLibraryLockTracer(input)
    const holder = await createExclusiveLibraryLockTracer(input).acquire()
    assert.equal(holder.kind, 'acquired')
    if (holder.kind !== 'acquired') throw new Error('Expected original holder.')
    try {
      input.controlDirectory = other.controlDirectory
      const contender = await bound.acquire()
      if (contender.kind === 'acquired') await contender.lock.release()
      assert.deepEqual(contender, { kind: 'busy' })
    } finally {
      await holder.lock.release()
    }
  } finally {
    await removeFixture(original)
    await removeFixture(other)
  }
}

async function walModeIsRejectedWithoutSidecarMutation(): Promise<void> {
  const fixture = await createInitializedFixture('unsupported-wal')
  try {
    const database = new Database(fixture.lockDatabase)
    try {
      database.pragma('journal_mode = WAL')
    } finally {
      database.close()
    }
    const before = (await fs.readdir(fixture.controlDirectory)).sort()
    const beforeDatabase = await fs.readFile(fixture.lockDatabase)
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    assert.deepEqual(authority.inspect(), { kind: 'storage-invalid' })
    assert.deepEqual(await authority.acquire(), { kind: 'invalid' })
    assert.deepEqual((await fs.readdir(fixture.controlDirectory)).sort(), before)
    assert.deepEqual(await fs.readFile(fixture.lockDatabase), beforeDatabase)
  } finally {
    await removeFixture(fixture)
  }
}

async function interruptedWriterDuringAcquisitionCannotTriggerRecovery(): Promise<void> {
  const fixture = await createInitializedFixture('acquisition-race')
  try {
    const beforeDatabase = await fs.readFile(fixture.lockDatabase)
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    // Acquisition holds its read transaction across a real asynchronous node
    // recheck. A separate writer may reserve, but cannot commit through it.
    const acquiring = authority.acquire()
    const writer = spawnSync(process.execPath, [
      fileURLToPath(import.meta.url),
      '--child-interrupt-library-lock-write',
      fixture.controlDirectory
    ], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5_000,
      shell: false
    })
    assert.equal(writer.status, 0)
    assert.equal(writer.stdout, 'UNCOMMITTED_JOURNAL\n')
    const journal = `${fixture.lockDatabase}-journal`
    // Only the journal is read here. Opening/closing a raw descriptor for the
    // database while SQLite holds POSIX locks would itself invalidate proof.
    const journalBefore = readFileSync(journal)
    assert.ok(journalBefore.byteLength > 0)
    assert.deepEqual(await acquiring, { kind: 'invalid' })
    assert.deepEqual(await fs.readFile(journal), journalBefore)
    assert.deepEqual(await fs.readFile(fixture.lockDatabase), beforeDatabase)
  } finally {
    await removeFixture(fixture)
  }
}

function interruptLockWriteInChild(controlDirectory: string | undefined): never {
  if (!controlDirectory) process.exit(2)
  const database = new Database(path.join(controlDirectory, LOCK_DATABASE_FILE), {
    fileMustExist: true,
    timeout: 0
  })
  database.exec('BEGIN IMMEDIATE')
  database.prepare(`
    UPDATE library_lock_identity SET library_generation = ? WHERE singleton = 1
  `).run('generation-uncommitted')
  try {
    database.exec('COMMIT')
    process.exit(3)
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) ||
      error.code !== 'SQLITE_BUSY') process.exit(4)
  }
  writeSync(1, 'UNCOMMITTED_JOURNAL\n')
  // Deliberately bypass SQLite close/rollback, just as abrupt process exit
  // would. Only the generated test root is affected.
  process.exit(0)
}

async function unqualifiedPlatformRefusesBeforeOpeningStorage(): Promise<void> {
  const fixture = await createInitializedFixture('unqualified-platform')
  try {
    const before = await fs.readFile(fixture.lockDatabase)
    const authority = createExclusiveLibraryLockTracer({
      controlDirectory: fixture.controlDirectory,
      libraryIdentity: 'library-alpha',
      libraryGeneration: 'generation-1'
    })
    assert.deepEqual(authority.inspect(), { kind: 'storage-invalid' })
    assert.deepEqual(await authority.acquire(), { kind: 'invalid' })
    assert.deepEqual(await fs.readdir(fixture.controlDirectory), [LOCK_DATABASE_FILE])
    assert.deepEqual(await fs.readFile(fixture.lockDatabase), before)
  } finally {
    await removeFixture(fixture)
  }
}

function spawnLockHolder(controlDirectory: string): ChildProcess {
  return spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.url),
      '--child-hold-library-lock',
      controlDirectory,
      'library-alpha',
      'generation-1'
    ],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: false
    }
  )
}

async function holdLibraryLockInChild(
  controlDirectory: string | undefined,
  libraryIdentity: string | undefined,
  libraryGeneration: string | undefined
): Promise<void> {
  if (!controlDirectory || !libraryIdentity || !libraryGeneration) {
    process.exitCode = 2
    return
  }
  const authority = createExclusiveLibraryLockTracer({
    controlDirectory,
    libraryIdentity,
    libraryGeneration
  })
  const acquired = await authority.acquire()
  if (acquired.kind !== 'acquired') {
    process.stdout.write('FAILED\n')
    process.exitCode = 3
    return
  }
  process.stdout.write('READY\n')
  await new Promise<void>((resolve) => {
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk: string) => {
      if (chunk.includes('RELEASE\n')) resolve()
    })
    process.stdin.once('end', resolve)
  })
  await acquired.lock.release()
}

async function waitForChildLine(
  child: ChildProcess,
  expected: string
): Promise<void> {
  const stdout = child.stdout
  if (!stdout) throw new Error('CHILD_STDOUT_UNAVAILABLE')
  stdout.setEncoding('utf8')
  await new Promise<void>((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('CHILD_READY_TIMEOUT')), 5_000)
    const onExit = () => reject(new Error('CHILD_EXITED_BEFORE_READY'))
    child.once('exit', onExit)
    stdout.on('data', (chunk: string) => {
      output += chunk
      if (!output.includes(`${expected}\n`)) return
      clearTimeout(timeout)
      child.off('exit', onExit)
      resolve()
    })
  })
}

async function waitForChildExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    assert.equal(child.exitCode, 0)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CHILD_EXIT_TIMEOUT')), 5_000)
    child.once('exit', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve()
      else reject(new Error('CHILD_EXIT_FAILED'))
    })
  })
}

async function waitForChildTermination(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('CHILD_TERMINATION_TIMEOUT')),
      5_000
    )
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

async function settleWithin<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('LOCK_ATTEMPT_WAITED')), milliseconds)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

if (process.argv[2] === '--child-hold-library-lock') {
  await holdLibraryLockInChild(process.argv[3], process.argv[4], process.argv[5])
} else if (process.argv[2] === '--child-interrupt-library-lock-write') {
  interruptLockWriteInChild(process.argv[3])
} else if (!['darwin', 'win32'].includes(process.platform)) {
  await unqualifiedPlatformRefusesBeforeOpeningStorage()
  console.log('exclusive-library-lock unqualified platform refusal passed; lock proof not run')
} else {
  await inspectDoesNotMutateInitializedStorage()
  await acquireAndReleaseOwnsOneRevocableLease()
  await oneProcessCannotAcquireTheSamePhysicalStoreTwice()
  await missingWrongOrMalformedStorageFailsClosed()
  await independentProcessAndPhysicalAliasStayBusy()
  await abruptProcessExitReleasesTheOsLease()
  await releaseRevokesAdmissionsAndDrainsAcceptedWork()
  await releasedAndReplacedLeaseInvalidatesTheOldSession()
  await releaseRequestedInsideGuardStillDrainsThatGuard()
  await recoverySidecarsAreNeitherRecoveredNorDeleted()
  await mutatingConstructorInputCannotRetargetLockAuthority()
  await walModeIsRejectedWithoutSidecarMutation()
  await interruptedWriterDuringAcquisitionCannotTriggerRecovery()
  console.log('exclusive-library-lock tracer passed')
}
