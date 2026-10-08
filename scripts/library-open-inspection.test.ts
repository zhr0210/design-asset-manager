import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import Database from 'better-sqlite3'
import { CREATE_ASSETS_TABLE, CREATE_TAGS_TABLE, CREATE_ASSET_TAGS_TABLE } from
  '../src/main/db/schema'
import { createExclusiveLibraryLockTracer } from
  '../src/main/library-lifecycle/exclusive-library-lock.tracer'

import {
  createLibraryOpenInspectionTracer,
  type LibraryOpenQualificationAdapter,
  type LibraryOpenQualificationInput
} from
  '../src/main/library-lifecycle/library-open-inspection.tracer'

const CONTROL_APPLICATION_ID = 0x44414d49
const supportedHost = ['darwin','win32'].includes(process.platform)
const manifest = {
  format: 'design-asset-library',
  manifestSchemaVersion: 1,
  libraryIdentity: { lineage: 'lineage-alpha', instance: 'library-alpha' },
  controlStore: { identity: 'control-alpha', schemaVersion: 1 },
  applicationCompatibility: { minimumReaderLevel: 1, writerLevel: 1 },
  managedOriginals: { relativePath: 'Originals' }
}

interface LibraryFixture {
  root: string
  control: string
  manifestFile: string
  databaseFile: string
}

type FixtureEntry = readonly [string, string, string, string, string, string | null]

async function createFixture(name: string): Promise<LibraryFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `dam-library-open-${name}-`))
  const control = path.join(root, '.dam')
  await fs.mkdir(control)
  await fs.mkdir(path.join(root, 'Originals'))
  await fs.mkdir(path.join(root, 'unrelated'))
  await fs.writeFile(path.join(root, 'unrelated', 'sentinel.txt'), 'not an asset to scan')
  const manifestFile = path.join(control, 'library.manifest.json')
  const databaseFile = path.join(control, 'library.sqlite')
  await fs.writeFile(manifestFile, JSON.stringify(manifest))
  const database = new Database(databaseFile)
  try {
    database.pragma(`application_id = ${CONTROL_APPLICATION_ID}`)
    database.pragma('user_version = 1')
    database.exec(`
      CREATE TABLE library_control_identity (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        lineage_identity TEXT NOT NULL,
        library_identity TEXT NOT NULL,
        control_store_identity TEXT NOT NULL,
        library_generation TEXT NOT NULL,
        managed_originals_relative_path TEXT NOT NULL
      ) WITHOUT ROWID;
      CREATE TABLE library_operation_journal (
        operation_identity TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('settled', 'pending', 'ambiguous'))
      ) WITHOUT ROWID;
      INSERT INTO library_control_identity VALUES
        (1, 'lineage-alpha', 'library-alpha', 'control-alpha', 'generation-1', 'Originals');
    `)
  } finally {
    database.close()
  }
  const lock = new Database(path.join(control, 'exclusive-library-lock.sqlite'))
  try {
    lock.pragma('application_id = 1145130316')
    lock.pragma('user_version = 1')
    lock.exec(`CREATE TABLE library_lock_identity (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      schema_version INTEGER NOT NULL CHECK (schema_version = 1),
      library_identity TEXT NOT NULL,
      library_generation TEXT NOT NULL
    ) WITHOUT ROWID`)
    lock.prepare('INSERT INTO library_lock_identity VALUES (1, 1, ?, ?)')
      .run('library-alpha', 'generation-1')
  } finally {
    lock.close()
  }
  return { root, control, manifestFile, databaseFile }
}

async function removeFixture(fixture: LibraryFixture): Promise<void> {
  assert.ok(path.basename(fixture.root).startsWith('dam-library-open-'))
  await fs.rm(fixture.root, { recursive: true, force: true })
}

async function snapshotFixture(root: string): Promise<readonly FixtureEntry[]> {
  const entries: FixtureEntry[] = []
  async function visit(directory: string, prefix = ''): Promise<void> {
    for (const name of (await fs.readdir(directory)).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name
      const absolute = path.join(directory, name)
      const stat = await fs.lstat(absolute, { bigint: true })
      const kind = stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'directory' : 'file'
      const digest = kind === 'file'
        ? createHash('sha256').update(await fs.readFile(absolute)).digest('hex') : null
      entries.push([relative, kind, stat.size.toString(), stat.ino.toString(),
        stat.mtimeNs.toString(), digest])
      if (kind === 'directory') await visit(absolute, relative)
    }
  }
  await visit(root)
  return entries
}

function qualifiedEvidence(
  input: LibraryOpenQualificationInput,
  changes: Record<string, unknown> = {}
) {
  return {
    inspectionIdentity: input.inspectionIdentity,
    generation: input.generation,
    filesystem: {
      kind: 'qualified', scopeIdentity: input.scopeIdentity,
      maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
      atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
    },
    access: 'read-write', lock: 'available', ...changes
  }
}

async function inspectFixture(
  fixture: LibraryFixture,
  inspect: LibraryOpenQualificationAdapter['inspect'] = qualifiedEvidence
) {
  const tracer = createLibraryOpenInspectionTracer({
    libraryRootDirectory: fixture.root,
    libraryControlDirectory: fixture.control,
    qualification: { inspect }
  })
  return tracer.libraryStart.inspect({ kind: 'inspect-candidate', candidate: tracer.candidate })
}

async function coherentFixtureIsInspectedWithoutWrites(): Promise<void> {
  const fixture = await createFixture('coherent')
  try {
    const before = await snapshotFixture(fixture.root)
    const evidenceRequests: unknown[] = []
    const tracer = createLibraryOpenInspectionTracer({
      libraryRootDirectory: fixture.root,
      libraryControlDirectory: fixture.control,
      qualification: {
        inspect(input) {
          evidenceRequests.push(input)
          return qualifiedEvidence(input)
        }
      }
    })
    const result = await tracer.libraryStart.inspect({
      kind: 'inspect-candidate', candidate: tracer.candidate
    })
    assert.deepEqual(result, {
      candidate: tracer.candidate,
      state: supportedHost ? 'compatible' : 'not-assessed',
      reason: supportedHost ? 'candidate-compatible' : 'evidence-not-assessed',
      writeAuthority: 'not-issued'
    })
    assert.equal(Object.isFrozen(result), true)
    assert.deepEqual(Object.keys(tracer.libraryStart), ['inspect'])
    assert.equal(JSON.stringify(result).includes(fixture.root), false)
    // The trusted Main volume adapter receives the exact root; the public result stays path-free.
    if (supportedHost) assert.equal((evidenceRequests[0] as { libraryRootDirectory: string }).libraryRootDirectory, await fs.realpath(fixture.root))
    assert.deepEqual(await snapshotFixture(fixture.root), before)
  } finally {
    await removeFixture(fixture)
  }
}

async function qualificationAndLockStatesRemainConservative(): Promise<void> {
  const fixture = await createFixture('qualification')
  try {
    const cases: ReadonlyArray<readonly [LibraryOpenQualificationAdapter['inspect'], string]> = [
      [(input) => qualifiedEvidence(input, { access: 'read-only' }), 'read-only'],
      [(input) => qualifiedEvidence(input, { lock: 'busy' }), 'busy'],
      [(input) => qualifiedEvidence(input, { lock: 'not-assessed' }), 'not-assessed'],
      [(input) => qualifiedEvidence(input, { access: 'not-assessed' }), 'not-assessed'],
      [() => null, 'not-assessed'],
      [(input) => qualifiedEvidence(input, { filesystem: { kind: 'not-assessed' } }), 'not-assessed'],
      [(input) => qualifiedEvidence(input, {
        filesystem: { kind: 'not-assessed' }, lock: 'busy'
      }), 'busy'],
      [(input) => qualifiedEvidence(input, { filesystem: { kind: 'unsupported' } }), 'unsupported'],
      [(input) => qualifiedEvidence(input, {
        filesystem: { ...qualifiedEvidence(input).filesystem, scopeIdentity: 'wrong-scope' }
      }), 'not-assessed'],
      [(input) => qualifiedEvidence(input, { inspectionIdentity: 'wrong-inspection' }), 'recovery-required'],
      [(input) => qualifiedEvidence(input, { generation: 'wrong-generation' }), 'recovery-required'],
      [(input) => qualifiedEvidence(input, { callerSaysWritable: true }), 'not-assessed'],
      [() => { throw new Error('sensitive-fixture-evidence'); }, 'not-assessed']
    ]
    for (const [qualification, state] of cases) {
      const before = await snapshotFixture(fixture.root)
      const result = await inspectFixture(fixture, qualification)
      assert.equal(result.state, state)
      assert.equal(result.writeAuthority, 'not-issued')
      assert.equal(JSON.stringify(result).includes('sensitive-fixture-evidence'), false)
      assert.deepEqual(await snapshotFixture(fixture.root), before)
    }
  } finally {
    await removeFixture(fixture)
  }
}

function changeDatabase(fixture: LibraryFixture, change: (database: Database.Database) => void): void {
  const database = new Database(fixture.databaseFile)
  try { change(database) } finally { database.close() }
}

function initializeLegacyDatabase(databaseFile: string, invalidRow = false): void {
  const database = new Database(databaseFile)
  try {
    database.exec(CREATE_ASSETS_TABLE + CREATE_TAGS_TABLE + CREATE_ASSET_TAGS_TABLE)
    if (invalidRow) {
      database.exec(`INSERT INTO assets (
        id, title, file_name, file_path, thumbnail_path, source_site_id,
        source_site_name, width, created_at, updated_at
      ) VALUES (
        'fixture-asset', 'fixture', 'fixture.png', 'opaque-fixture-source',
        'opaque-fixture-preview', 'fixture-site', 'fixture-site', NULL, 'fixture-time', 'fixture-time'
      )`)
      // Deliberately corrupt only generated fixture metadata so a row scan
      // observes a NOT NULL violation while schema metadata remains readable.
      database.unsafeMode(true)
      database.pragma('writable_schema = ON')
      database.exec(`UPDATE sqlite_schema SET sql = replace(sql,
        'width INTEGER,', 'width INTEGER NOT NULL,') WHERE name = 'assets'`)
      database.pragma('writable_schema = OFF')
    }
  } finally {
    database.close()
  }
}

async function blockedControlStatesDoNotMutateFixtures(): Promise<void> {
  const cases: ReadonlyArray<readonly [string, (fixture: LibraryFixture) => void | Promise<void>, string]> = [
    ['newer-manifest', (fixture) => fs.writeFile(fixture.manifestFile,
      JSON.stringify({ ...manifest, manifestSchemaVersion: 2 })), 'unsupported'],
    ['invalid-manifest', (fixture) => fs.writeFile(fixture.manifestFile,
      Buffer.from([0xff])), 'recovery-required'],
    ['identity-disagreement', (fixture) => fs.writeFile(fixture.manifestFile,
      JSON.stringify({ ...manifest, libraryIdentity: { lineage: 'lineage-alpha', instance: 'other-library' } })),
      'recovery-required'],
    ['unsafe-binding', (fixture) => fs.writeFile(fixture.manifestFile,
      JSON.stringify({ ...manifest, managedOriginals: { relativePath: '../Originals' } })), 'recovery-required'],
    ['newer-database', (fixture) => changeDatabase(fixture, (database) => database.pragma('user_version = 99')),
      'unsupported'],
    ['wrong-database', (fixture) => changeDatabase(fixture, (database) => database.pragma('application_id = 0')),
      'recovery-required'],
    ['wrong-generation', (fixture) => changeDatabase(fixture, (database) => database.exec(
      "UPDATE library_control_identity SET library_generation = 'generation-2'")), 'recovery-required'],
    ['missing-journal-boundary', (fixture) => changeDatabase(fixture, (database) => database.exec(
      'DROP TABLE library_operation_journal')), 'recovery-required'],
    ['pending-journal', (fixture) => changeDatabase(fixture, (database) => database.exec(
      "INSERT INTO library_operation_journal VALUES ('operation-1', 'pending')")), 'recovery-required'],
    ['ambiguous-journal', (fixture) => changeDatabase(fixture, (database) => database.exec(
      "INSERT INTO library_operation_journal VALUES ('operation-1', 'ambiguous')")), 'recovery-required'],
    ['unknown-schema', (fixture) => changeDatabase(fixture, (database) => database.exec(
      'CREATE TABLE unknown_state (value TEXT)')), 'recovery-required'],
    ['changed-journal-semantics', (fixture) => changeDatabase(fixture, (database) => database.exec(`
      DROP TABLE library_operation_journal;
      CREATE TABLE library_operation_journal (
        operation_identity TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('SETTLED', 'PENDING', 'AMBIGUOUS'))
      ) WITHOUT ROWID
    `)), 'recovery-required'],
    ['corrupt-database', (fixture) => fs.writeFile(fixture.databaseFile,
      Buffer.alloc(512, 0xff)), 'recovery-required'],
    ['missing-manifest', (fixture) => fs.unlink(fixture.manifestFile), 'recovery-required'],
    ['missing-database', (fixture) => fs.unlink(fixture.databaseFile), 'recovery-required'],
    ['missing-lock', (fixture) => fs.unlink(path.join(fixture.control, 'exclusive-library-lock.sqlite')),
      'recovery-required'],
    ['sqlite-journal', (fixture) => fs.writeFile(`${fixture.databaseFile}-journal`, 'unproven-journal'),
      'recovery-required'],
    ['lock-journal', (fixture) => fs.writeFile(
      path.join(fixture.control, 'exclusive-library-lock.sqlite-journal'), 'unproven-lock-journal'),
      'recovery-required'],
    ['wal-mode', (fixture) => changeDatabase(fixture, (database) => database.pragma('journal_mode = WAL')),
      'recovery-required'],
    ['missing-managed-role', (fixture) => fs.rmdir(path.join(fixture.root, 'Originals')), 'unavailable']
  ]
  for (const [name, change, state] of cases) {
    const fixture = await createFixture(name)
    try {
      await change(fixture)
      const before = await snapshotFixture(fixture.root)
      const result = await inspectFixture(fixture)
      assert.equal(result.state, state, name)
      assert.equal(result.writeAuthority, 'not-issued')
      assert.deepEqual(await snapshotFixture(fixture.root), before, name)
    } finally {
      await removeFixture(fixture)
    }
  }
}

async function legacyAndMissingRootsNeverCreatePortableState(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-library-open-legacy-'))
  const control = path.join(root, '.dam')
  const databaseFile = path.join(root, 'design_asset_manager.db')
  const fixture: LibraryFixture = {
    root, control, databaseFile, manifestFile: path.join(control, 'library.manifest.json')
  }
  try {
    const emptyBefore = await snapshotFixture(root)
    assert.equal((await inspectFixture(fixture)).state, 'not-assessed')
    assert.deepEqual(await snapshotFixture(root), emptyBefore)

    initializeLegacyDatabase(databaseFile)
    const legacyBefore = await snapshotFixture(root)
    const result = await inspectFixture(fixture)
    assert.equal(result.state, 'legacy-migration-required')
    assert.equal(result.writeAuthority, 'not-issued')
    assert.deepEqual(await snapshotFixture(root), legacyBefore)

    await fs.mkdir(control)
    const ambiguousBefore = await snapshotFixture(root)
    assert.equal((await inspectFixture(fixture)).state, 'recovery-required')
    assert.deepEqual(await snapshotFixture(root), ambiguousBefore)

    const missing = createLibraryOpenInspectionTracer({
      libraryRootDirectory: path.join(root, 'missing-root'),
      libraryControlDirectory: path.join(root, 'missing-root', '.dam'),
      qualification: { inspect: qualifiedEvidence }
    })
    assert.equal((await missing.libraryStart.inspect({
      kind: 'inspect-candidate', candidate: missing.candidate
    })).state, 'unavailable')
    assert.deepEqual(await snapshotFixture(root), ambiguousBefore)
  } finally {
    await removeFixture(fixture)
  }
}

async function legacyRecognitionDoesNotInspectOrQualifyAssetRows(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-library-open-legacy-schema-'))
  const fixture: LibraryFixture = {
    root, control: path.join(root, '.dam'),
    manifestFile: path.join(root, '.dam', 'library.manifest.json'),
    databaseFile: path.join(root, 'design_asset_manager.db')
  }
  try {
    // The schema is recognizable, but one generated row violates NOT NULL.
    // Schema-only recognition must not run quick_check or claim row integrity;
    // the later migration inventory still has to assess that invalid row.
    initializeLegacyDatabase(fixture.databaseFile, true)
    const before = await snapshotFixture(root)
    assert.equal((await inspectFixture(fixture)).state, 'legacy-migration-required')
    assert.deepEqual(await snapshotFixture(root), before)
  } finally {
    await removeFixture(fixture)
  }
}

async function completePortableAndLegacyCoexistenceIsAmbiguous(): Promise<void> {
  const fixture = await createFixture('complete-mixed-root')
  try {
    initializeLegacyDatabase(path.join(fixture.root, 'design_asset_manager.db'))
    const before = await snapshotFixture(fixture.root)
    assert.equal((await inspectFixture(fixture)).state, 'recovery-required')
    assert.deepEqual(await snapshotFixture(fixture.root), before)
  } finally {
    await removeFixture(fixture)
  }
}

async function changedEvidenceCannotBeCombinedIntoSuccess(): Promise<void> {
  const replacement = await createFixture('replacement-source')
  const changes: ReadonlyArray<readonly [string, (fixture: LibraryFixture) => Promise<void>, readonly string[]]> = [
    ['manifest-changed', (fixture) => fs.writeFile(fixture.manifestFile, JSON.stringify({
      ...manifest, libraryIdentity: { lineage: 'lineage-alpha', instance: 'library-replaced' }
    })), ['.dam/library.manifest.json']],
    ['managed-replaced', async (fixture) => {
      await fs.rename(path.join(fixture.root, 'Originals'), path.join(fixture.root, 'Originals-moved'))
      await fs.mkdir(path.join(fixture.root, 'Originals'))
    }, ['Originals', 'Originals-moved']],
    ['database-replaced', async (fixture) => {
      await fs.rename(fixture.databaseFile, path.join(fixture.control, 'displaced.sqlite'))
      await fs.copyFile(replacement.databaseFile, fixture.databaseFile)
    }, ['.dam', '.dam/library.sqlite', '.dam/displaced.sqlite']],
    ['lock-replaced', async (fixture) => {
      await fs.rename(path.join(fixture.control, 'exclusive-library-lock.sqlite'),
        path.join(fixture.control, 'displaced-lock.sqlite'))
      await fs.copyFile(path.join(replacement.control, 'exclusive-library-lock.sqlite'),
        path.join(fixture.control, 'exclusive-library-lock.sqlite'))
    }, ['.dam', '.dam/exclusive-library-lock.sqlite', '.dam/displaced-lock.sqlite']],
    ['legacy-appeared', (fixture) => fs.writeFile(
      path.join(fixture.root, 'design_asset_manager.db'), 'unproven-late-legacy-evidence'
    ), ['design_asset_manager.db']]
  ]
  try {
    for (const [name, change, changedPaths] of changes) {
      const fixture = await createFixture(name)
      try {
        const before = await snapshotFixture(fixture.root)
        let actorRan = false
        let deniedByOpenFileGuard = false
        const result = await inspectFixture(fixture, async (input) => {
          actorRan = true
          try { await change(fixture) }
          catch (error) {
            if (process.platform === 'win32' && ['EPERM','EBUSY','EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) {
              deniedByOpenFileGuard = true
            }
            throw error
          }
          return qualifiedEvidence(input)
        })
        assert.equal(actorRan, true)
        assert.equal(result.state, deniedByOpenFileGuard ? 'not-assessed' : 'recovery-required', name)
        const after = await snapshotFixture(fixture.root)
        if (deniedByOpenFileGuard) assert.deepEqual(after, before, 'Windows denied replacement without changing the fixture')
        const unchanged = (entries: readonly FixtureEntry[]) => entries.filter((entry) =>
          !changedPaths.includes(entry[0]))
        assert.deepEqual(unchanged(after), unchanged(before),
          'Only the named test actor paths may change; never snapshot the database while its read guard is held.')
      } finally {
        await removeFixture(fixture)
      }
    }
  } finally {
    await removeFixture(replacement)
  }
}

async function cancelledOrForgedRequestsNeverStartObservation(): Promise<void> {
  const fixture = await createFixture('requests')
  try {
    let calls = 0
    const tracer = createLibraryOpenInspectionTracer({
      libraryRootDirectory: fixture.root,
      libraryControlDirectory: fixture.control,
      qualification: { inspect(input) { calls++; return qualifiedEvidence(input) } }
    })
    const before = await snapshotFixture(fixture.root)
    assert.equal((await tracer.libraryStart.inspect({ kind: 'selection-cancelled' })).state,
      'selection-cancelled')
    assert.equal((await tracer.libraryStart.inspect({
      kind: 'inspect-candidate', candidate: Object.freeze({}) as typeof tracer.candidate
    })).reason, 'unknown-candidate')
    const untrusted = {
      kind: 'inspect-candidate' as const, candidate: tracer.candidate, writable: true
    }
    assert.equal((await tracer.libraryStart.inspect(untrusted)).reason, 'invalid-request')
    assert.equal(calls, 0)
    assert.deepEqual(await snapshotFixture(fixture.root), before)
  } finally {
    await removeFixture(fixture)
  }
}

async function linkedOrOversizedControlFilesStayBlocked(): Promise<void> {
  const outside = await createFixture('outside-link')
  try {
    for (const [name, mutate] of [
      ['manifest-link', async (fixture: LibraryFixture) => {
        await fs.unlink(fixture.manifestFile)
        await fs.symlink(outside.manifestFile, fixture.manifestFile)
      }],
      ['database-link', async (fixture: LibraryFixture) => {
        await fs.unlink(fixture.databaseFile)
        await fs.symlink(outside.databaseFile, fixture.databaseFile)
      }],
      ['managed-link', async (fixture: LibraryFixture) => {
        await fs.rmdir(path.join(fixture.root, 'Originals'))
        await fs.symlink(path.join(outside.root, 'Originals'), path.join(fixture.root, 'Originals'), 'dir')
      }],
      ['large-manifest', (fixture: LibraryFixture) => fs.writeFile(fixture.manifestFile,
        Buffer.alloc(16 * 1024 + 1, 0x20))],
      ['large-control-lock', (fixture: LibraryFixture) => fs.truncate(path.join(fixture.control,'exclusive-library-lock.sqlite'), 16 * 1024 * 1024 + 1)]
    ] as const) {
      const fixture = await createFixture(name)
      try {
        await mutate(fixture)
        const before = await snapshotFixture(fixture.root)
        const outsideBefore = await snapshotFixture(outside.root)
        assert.equal((await inspectFixture(fixture)).state, 'recovery-required', name)
        assert.deepEqual(await snapshotFixture(fixture.root), before)
        assert.deepEqual(await snapshotFixture(outside.root), outsideBefore)
      } finally {
        await removeFixture(fixture)
      }
    }
  } finally {
    await removeFixture(outside)
  }
}

function attemptWriterInChild(control: string): string {
  const child = spawnSync(process.execPath, [
    fileURLToPath(import.meta.url), '--child-attempt-inspected-lock', control
  ], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5_000, shell: false
  })
  assert.equal(child.status, 0)
  return child.stdout.trim()
}

async function inspectionNeitherAcquiresNorStealsTheWriterLease(): Promise<void> {
  const fixture = await createFixture('real-lock')
  try {
    const before = await snapshotFixture(fixture.root)
    assert.equal((await inspectFixture(fixture, (input) => {
      assert.equal(attemptWriterInChild(fixture.control), 'acquired')
      return qualifiedEvidence(input)
    })).state, 'compatible', 'An independent actor can acquire while the inspection itself owns no writer lease.')
    assert.deepEqual(await snapshotFixture(fixture.root), before)

    const holder = await createExclusiveLibraryLockTracer({
      controlDirectory: fixture.control, libraryIdentity: 'library-alpha', libraryGeneration: 'generation-1'
    }).acquire()
    assert.equal(holder.kind, 'acquired')
    if (holder.kind !== 'acquired') throw new Error('Expected test writer holder.')
    try {
      assert.equal((await inspectFixture(fixture, (input) =>
        qualifiedEvidence(input, { lock: 'busy' }))).state, 'busy')
      assert.equal(attemptWriterInChild(fixture.control), 'busy',
        'Inspection must not cancel or steal another holder, including via raw file reads.')
    } finally {
      await holder.lock.release()
    }
    assert.deepEqual(await snapshotFixture(fixture.root), before)
  } finally {
    await removeFixture(fixture)
  }
}

async function oversizedDatabaseIsRefusedWithoutLoadingIt(): Promise<void> {
  const fixture = await createFixture('large-database')
  const digest = async () => {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(fixture.databaseFile)) hash.update(chunk)
    return hash.digest('hex')
  }
  try {
    await fs.truncate(fixture.databaseFile, 512 * 1024 * 1024 + 1)
    const before = await digest()
    const metadata = await fs.stat(fixture.databaseFile)
    assert.equal((await inspectFixture(fixture, () => {
      throw Error('Oversized database must be refused before volume qualification')
    })).state, 'recovery-required')
    assert.equal(await digest(), before)
    const after = await fs.stat(fixture.databaseFile)
    assert.equal(after.size, metadata.size)
    assert.equal(after.mtimeMs, metadata.mtimeMs)
  } finally { await removeFixture(fixture) }
}

if (process.argv[2] === '--child-attempt-inspected-lock') {
  const control = process.argv[3]
  if (!control || !path.basename(path.dirname(control)).startsWith('dam-library-open-')) {
    throw new Error('Invalid task fixture child scope.')
  }
  const acquired = await createExclusiveLibraryLockTracer({
    controlDirectory: control, libraryIdentity: 'library-alpha', libraryGeneration: 'generation-1'
  }).acquire()
  if (acquired.kind === 'acquired') await acquired.lock.release()
  process.stdout.write(`${acquired.kind}\n`)
} else {
  await coherentFixtureIsInspectedWithoutWrites()
  if (supportedHost) {
    await qualificationAndLockStatesRemainConservative()
    await blockedControlStatesDoNotMutateFixtures()
    await legacyAndMissingRootsNeverCreatePortableState()
    await legacyRecognitionDoesNotInspectOrQualifyAssetRows()
    await completePortableAndLegacyCoexistenceIsAmbiguous()
    await changedEvidenceCannotBeCombinedIntoSuccess()
    await cancelledOrForgedRequestsNeverStartObservation()
    await linkedOrOversizedControlFilesStayBlocked()
    await oversizedDatabaseIsRefusedWithoutLoadingIt()
    await inspectionNeitherAcquiresNorStealsTheWriterLease()
  }
  console.log(supportedHost ? 'library-open-inspection passed'
    : 'library-open-inspection unqualified host refusal passed; inspection proof not run')
}
