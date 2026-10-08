import assert from 'node:assert/strict'
import {spawn, type ChildProcess} from 'node:child_process'
import {createHash} from 'node:crypto'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {build} from 'esbuild'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {applyTagIntentSchema} from '../src/main/independent-tags/tag-intent.schema'
import {captureWindowsBackupConnection, type WindowsBackupSourceEvidence} from '../src/main/platform/windows-backup-source.internal'
import {backupBindingSha256, inspectWindowsBackupRecovery, serializeWindowsBackupBinding, type WindowsBackupBinding} from '../src/main/platform/windows-backup-recovery.internal'
import {inspectWindowsBackupSourceCommit, writeWindowsBackupCommitMarker, type WindowsBackupCommitExpectation} from '../src/main/platform/windows-backup-commit.internal'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const recorded = {sourceCommit: 'recorded-commit', productionQualified: false, restoreAllowed: false}
const unproven = {sourceCommit: 'unproven', productionQualified: false, restoreAllowed: false}
const targetSchemaVersion = 9

/** Real Host-created SQLite. VFS identities here are expressly synthetic validator
 * inputs; the separate native integration proves actual VFS/pinned-handle identity. */
async function fixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-native-target-')))
  const directory = path.join(root, 'library'), control = path.join(directory, '.dam')
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({kind: 'selected', directory}),
    selectLocalFiles: async () => ({kind: 'cancelled'})
  }))
  const plan = await host.prepareCreate()
  assert.equal(plan.kind, 'planned')
  if (plan.kind !== 'planned') throw Error('COMMIT_FIXTURE_CREATE_REFUSED')
  await host.confirmCreate(plan.plan.receipt)
  const state = host.inspect()
  await host.close()
  const declaration = readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(control, 'library.manifest.json'))))
  if (declaration.kind !== 'compatible') throw Error('COMMIT_FIXTURE_MANIFEST_REFUSED')
  const file = path.join(control, 'library.sqlite')
  const db = new Database(file, {fileMustExist: true, timeout: 0})
  db.pragma('journal_mode=DELETE')
  db.pragma('synchronous=FULL')
  db.pragma('foreign_keys=ON')
  const image = db.serialize(), connection = captureWindowsBackupConnection(db, control)
  const source: WindowsBackupSourceEvidence = {
    volume: '42', file: '18446744073709551615', size: String(image.length),
    created: '133000000000000001', written: '133000000000000002', links: 1,
    sha256: sha(image), available: '18446744073709551615', filesystem: 'NTFS'
  }
  const binding: WindowsBackupBinding = {
    format: 1, operation: 'commit-proof-1', library: state.identity!,
    lineage: declaration.declaration.lineageIdentity,
    controlStore: declaration.declaration.controlStoreIdentity, generation: state.generation!,
    source, connection, imageSha256: sha(image)
  }
  const expected: WindowsBackupCommitExpectation = {binding, targetSchemaVersion}
  const readers = new Set<Database.Database>()
  const reader = (options: {readonly?: boolean; queryOnly?: boolean; begin?: boolean} = {}) => {
    const result = new Database(file, {fileMustExist: true, timeout: 0, readonly: options.readonly ?? true})
    result.pragma('synchronous=FULL')
    result.pragma('foreign_keys=ON')
    if (options.queryOnly ?? true) result.pragma('query_only=ON')
    if (options.begin ?? true) result.exec('BEGIN')
    readers.add(result)
    return result
  }
  const currentSource = (connection: Database.Database): WindowsBackupSourceEvidence => ({
    ...source,
    size: String(Number(connection.pragma('page_count', {simple: true})) * Number(connection.pragma('page_size', {simple: true}))),
    written: '133000000000000003', sha256: sha(connection.serialize())
  })
  const inspect = (expectedOverride = expected, sourceOverride: Partial<WindowsBackupSourceEvidence> = {}) => {
    const result = reader()
    try { return inspectWindowsBackupSourceCommit(result, expectedOverride, {...currentSource(result), ...sourceOverride}) }
    finally { result.close(); readers.delete(result) }
  }
  const migrateAndWrite = (database = db, expectation = expected) => {
    applyTagIntentSchema(database)
    database.prepare('INSERT INTO tags(id,name,normalized_name,created_at,updated_at) VALUES(?,?,?,?,?)')
      .run('commit-proof-result', 'synthetic committed result', 'synthetic committed result', 'synthetic', 'synthetic')
    writeWindowsBackupCommitMarker(database, expectation)
  }
  return {root, directory, control, file, db, binding, expected, image, reader, currentSource, inspect, migrateAndWrite,
    close: async () => {
      for (const result of readers) if (result.open) result.close()
      if (db.open) db.close()
      // This resolved removal target is solely the newly created fixture.
      assert.equal(path.dirname(root), temporary)
      assert.ok(path.basename(root).startsWith('dam-native-target-'))
      await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
    }
  }
}

const journal = (db: Database.Database) => db.prepare('SELECT operation_identity, state FROM library_operation_journal ORDER BY operation_identity').all()
const cloneExpected = (expected: WindowsBackupCommitExpectation): WindowsBackupCommitExpectation => structuredClone(expected)
for (const state of ['pending','ambiguous'] as const) await test('unrelated '+state+' journal state refuses writer and recovery proof',async()=>{
  const f=await fixture()
  try{
    f.db.prepare('INSERT INTO library_operation_journal(operation_identity,state) VALUES(?,?)').run('other-operation',state)
    assert.throws(()=>f.db.transaction(()=>f.migrateAndWrite())(),/BACKUP_COMMIT_JOURNAL_REFUSED/)
    assert.equal(f.db.pragma('user_version',{simple:true}),1)
    assert.equal(f.db.prepare("SELECT 1 FROM tags WHERE id='commit-proof-result'").get(),undefined)
    assert.throws(()=>f.inspect(),/BACKUP_COMMIT_JOURNAL_REFUSED/)
    f.db.prepare("UPDATE library_operation_journal SET state='settled'").run()
    f.db.transaction(()=>f.migrateAndWrite())()
    f.db.prepare('UPDATE library_operation_journal SET state=? WHERE operation_identity=?').run(state,'other-operation')
    assert.throws(()=>f.inspect(),/BACKUP_COMMIT_JOURNAL_REFUSED/)
  }finally{await f.close()}
})
await test('illegal unrelated operation identity and overflowing journal refuse recovery without repair',async()=>{
  const f=await fixture()
  try{
    f.db.transaction(()=>f.migrateAndWrite())()
    f.db.prepare("INSERT INTO library_operation_journal(operation_identity,state) VALUES(?,'settled')").run('invalid identity')
    assert.throws(()=>f.inspect(),/BACKUP_COMMIT_JOURNAL_REFUSED/)
    f.db.prepare('DELETE FROM library_operation_journal WHERE operation_identity=?').run('invalid identity')
    const insert=f.db.prepare("INSERT INTO library_operation_journal(operation_identity,state) VALUES(?,'settled')")
    for(let i=0;i<128;i++)insert.run('other:'+i)
    assert.equal(journal(f.db).length,129)
    assert.throws(()=>f.inspect(),/BACKUP_COMMIT_JOURNAL_REFUSED/)
    assert.equal(journal(f.db).length,129,'inspection does not repair or delete source rows')
  }finally{await f.close()}
})

await test('missing source marker is unproven at the captured or target schema, despite finished status claiming commit', async () => {
  const f = await fixture()
  try {
    assert.deepEqual(f.inspect(), unproven)
    const binding = serializeWindowsBackupBinding(f.binding), identity = {
      productionQualified: false, bindingSha256: backupBindingSha256(binding), imageSha256: f.binding.imageSha256
    }
    assert.equal(inspectWindowsBackupRecovery({binding,
      backing: JSON.stringify({phase: 'tracer-backing-up', ...identity}),
      verified: JSON.stringify({phase: 'tracer-target-verified', ...identity}),
      finished: JSON.stringify({phase: 'tracer-finished', ...identity, mainDeclaredCommitted: true}), imageSha256: f.binding.imageSha256
    }, f.binding).sourceCommit, 'unproven')
    f.db.transaction(() => applyTagIntentSchema(f.db))()
    assert.deepEqual(f.inspect(), unproven)
    assert.deepEqual(journal(f.db), [])
  } finally { await f.close() }
})

await test('same real COMMIT persists DDL, user write and exact settled marker across readonly reopen', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    const marker = `backup-proof:v1:${backupBindingSha256(serializeWindowsBackupBinding(f.binding))}:${f.binding.imageSha256}:9`
    assert.deepEqual(journal(f.db), [{operation_identity: marker, state: 'settled'}])
    assert.equal(f.db.pragma('user_version', {simple: true}), 9)
    assert.equal((f.db.prepare("SELECT name FROM tags WHERE id='commit-proof-result'").get() as {name: string}).name, 'synthetic committed result')
    assert.deepEqual(f.inspect(), recorded)
    assert.deepEqual(f.inspect(), recorded, 'the fact survives a second fresh readonly connection')
  } finally { await f.close() }
})

await test('rollback after writing marker atomically removes DDL, business result and marker', async () => {
  const f = await fixture()
  try {
    assert.throws(() => f.db.transaction(() => {f.migrateAndWrite(); throw Error('SYNTHETIC_ROLLBACK_AFTER_MARKER')})(), /SYNTHETIC_ROLLBACK_AFTER_MARKER/)
    assert.equal(f.db.pragma('user_version', {simple: true}), 1)
    assert.equal(f.db.prepare("SELECT 1 FROM sqlite_schema WHERE name='independent_tag_requests'").get(), undefined)
    assert.equal(f.db.prepare("SELECT 1 FROM tags WHERE id='commit-proof-result'").get(), undefined)
    assert.deepEqual(journal(f.db), [])
    assert.deepEqual(f.inspect(), unproven)
  } finally { await f.close() }
})

await test('an acknowledgement failure after actual COMMIT cannot turn the durable marker into rollback', async () => {
  const f = await fixture()
  try {
    assert.throws(() => {f.db.transaction(() => f.migrateAndWrite())(); throw Error('SYNTHETIC_ACK_LOST')}, /SYNTHETIC_ACK_LOST/)
    assert.equal(f.db.inTransaction, false)
    assert.equal(f.db.pragma('user_version', {simple: true}), 9)
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('writer refuses autocommit, readonly connection and duplicate operation marker without inserting a second row', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => applyTagIntentSchema(f.db))()
    assert.throws(() => writeWindowsBackupCommitMarker(f.db, f.expected), /BACKUP_COMMIT_CONNECTION_REFUSED/)
    const readonly = f.reader()
    assert.throws(() => writeWindowsBackupCommitMarker(readonly, f.expected), /BACKUP_COMMIT_CONNECTION_REFUSED/)
    readonly.close()
    assert.deepEqual(journal(f.db), [])
    f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, f.expected))()
    const attached = f.db.pragma('database_list') as Array<{name: string; file: string}>
    assert.equal(attached.filter(value => value.name === 'main' && value.file === f.file).length, 1)
    assert.ok(attached.every(value => value.name === 'main' || value.name === 'temp' && value.file === ''))
    assert.deepEqual(f.db.prepare('SELECT name FROM temp.sqlite_schema').all(), [], 'SQLite schema checks may create its empty internal temp database')
    assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, f.expected))(), /BACKUP_COMMIT_ALREADY_RECORDED/)
    assert.equal(journal(f.db).length, 1)
  } finally { await f.close() }
})

await test('writer refuses a prior marker sharing captured operation digest even if its image or target differs', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => {
      applyTagIntentSchema(f.db)
      const prefix = `backup-proof:v1:${backupBindingSha256(serializeWindowsBackupBinding(f.binding))}:`
      f.db.prepare("INSERT INTO library_operation_journal VALUES (?, 'settled')").run(`${prefix}${'b'.repeat(64)}:10`)
      assert.throws(() => writeWindowsBackupCommitMarker(f.db, f.expected), /BACKUP_COMMIT_ALREADY_RECORDED/)
    })()
    assert.deepEqual(f.inspect(), unproven, 'conflicting text cannot be mistaken for this operation commit')
    assert.equal(journal(f.db).length, 1)
  } finally { await f.close() }
})

await test('wrong operation, full binding, image or target cannot inherit another commit marker', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    for (const mutate of [
      (value: WindowsBackupCommitExpectation) => {value.binding.operation = 'another-operation'},
      (value: WindowsBackupCommitExpectation) => {value.binding.source.written = '133000000000000099'},
      (value: WindowsBackupCommitExpectation) => {value.binding.connection.dataVersion++},
      (value: WindowsBackupCommitExpectation) => {value.binding.imageSha256 = 'b'.repeat(64); value.binding.source.sha256 = value.binding.imageSha256}
    ]) {
      const other = cloneExpected(f.expected); mutate(other)
      assert.deepEqual(f.inspect(other), unproven)
    }
    const otherTarget = {...f.expected, targetSchemaVersion: 10}
    assert.throws(() => f.inspect(otherTarget), /BACKUP_COMMIT_CONNECTION_REFUSED/)
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('source or library identity mismatches refuse commit evidence instead of trusting valid marker text', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    for (const field of ['library', 'lineage', 'controlStore', 'generation'] as const) {
      const other = cloneExpected(f.expected); other.binding[field] += '-wrong'
      assert.throws(() => f.inspect(other), /BACKUP_COMMIT_IDENTITY_REFUSED/, field)
      assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, other))(), /BACKUP_COMMIT_IDENTITY_REFUSED/, field)
    }
    for (const mutation of [{volume: '43'}, {file: '18446744073709551614'}, {created: '133000000000000004'}, {links: 2}, {filesystem: 'ReFS'}]) {
      assert.throws(() => f.inspect(f.expected, mutation), /BACKUP_COMMIT_SOURCE_REFUSED/)
    }
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('present exact marker requires current target schema and settled state', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    for (const version of [1, 8, 10, 14]) {
      f.db.pragma(`user_version=${version}`)
      if (version === 1) assert.throws(() => f.inspect(), {code: 'library-schema-invalid'}, `schema ${version} cannot match actual v9 objects`)
      else assert.throws(() => f.inspect(), /BACKUP_COMMIT_CONNECTION_REFUSED/, `schema ${version}`)
    }
    f.db.pragma('user_version=9')
    for (const state of ['pending', 'ambiguous']) {
      f.db.prepare('UPDATE library_operation_journal SET state=?').run(state)
      assert.throws(() => f.inspect(), /BACKUP_COMMIT_JOURNAL_REFUSED/, state)
    }
    f.db.exec("UPDATE library_operation_journal SET state='settled'")
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('tampered or deleted marker is unproven and does not grant restore even at the target schema', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    const row = journal(f.db)[0] as {operation_identity: string}
    f.db.prepare('UPDATE library_operation_journal SET operation_identity=?').run(row.operation_identity.replace(':9', ':10'))
    assert.deepEqual(f.inspect(), unproven)
    f.db.exec('DELETE FROM library_operation_journal')
    assert.deepEqual(f.inspect(), unproven)
  } finally { await f.close() }
})

await test('reader requires a readonly query-only transaction and a file-backed main connection', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    for (const options of [{readonly: false}, {queryOnly: false}, {begin: false}]) {
      const db = f.reader(options)
      try {assert.throws(() => inspectWindowsBackupSourceCommit(db, f.expected, f.currentSource(db)), /BACKUP_COMMIT_CONNECTION_REFUSED/)}
      finally {db.close()}
    }
    const memory = new Database(f.db.serialize(), {readonly: true})
    try {
      memory.pragma('synchronous=FULL'); memory.pragma('foreign_keys=ON'); memory.pragma('query_only=ON'); memory.exec('BEGIN')
      assert.throws(() => inspectWindowsBackupSourceCommit(memory, f.expected, f.currentSource(memory)), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    } finally {memory.close()}
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('writer refuses WAL, unsafe synchronous, wrong application ID and attached databases', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => applyTagIntentSchema(f.db))()
    const cases = [
      {set: () => f.db.pragma('journal_mode=WAL'), reset: () => f.db.pragma('journal_mode=DELETE'), refusal: /BACKUP_COMMIT_CONNECTION_REFUSED/},
      {set: () => f.db.pragma('synchronous=OFF'), reset: () => f.db.pragma('synchronous=FULL'), refusal: /BACKUP_COMMIT_CONNECTION_REFUSED/},
      {set: () => f.db.pragma('application_id=0'), reset: () => f.db.pragma('application_id=0x44414d49'), refusal: /BACKUP_COMMIT_CONNECTION_REFUSED/},
      {set: () => f.db.prepare('ATTACH DATABASE ? AS extra').run(f.file), reset: () => f.db.exec('DETACH DATABASE extra'), refusal: /BACKUP_SOURCE_CONNECTION_REFUSED/}
    ]
    for (const entry of cases) {
      entry.set()
      try {assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, f.expected))(), entry.refusal)}
      finally {entry.reset()}
      assert.deepEqual(journal(f.db), [])
    }
    f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, f.expected))()
    assert.deepEqual(f.inspect(), recorded)
  } finally { await f.close() }
})

await test('reader rejects unsafe connection settings and attached databases without repairing them', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    const unsafe = f.reader({begin: false})
    unsafe.pragma('synchronous=OFF'); unsafe.exec('BEGIN')
    assert.throws(() => inspectWindowsBackupSourceCommit(unsafe, f.expected, f.currentSource(unsafe)), /BACKUP_COMMIT_CONNECTION_REFUSED/)
    assert.equal(unsafe.pragma('synchronous', {simple: true}), 0)
    unsafe.close()
    const attached = f.reader({begin: false})
    attached.prepare('ATTACH DATABASE ? AS extra').run(f.file); attached.exec('BEGIN')
    assert.throws(() => inspectWindowsBackupSourceCommit(attached, f.expected, f.currentSource(attached)), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    assert.equal((attached.pragma('database_list') as unknown[]).length, 2)
    attached.close()
    f.db.pragma('application_id=0')
    assert.throws(() => f.inspect(), /BACKUP_COMMIT_CONNECTION_REFUSED/)
    assert.equal(f.db.pragma('application_id', {simple: true}), 0)
  } finally { await f.close() }
})

await test('invalid target expectations and malformed captured binding refuse before a marker can be written', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => applyTagIntentSchema(f.db))()
    // v15 is now a supported target. Use the first unsupported version,
    // while retaining captured/nonintegral/invalid expectation coverage.
    for (const value of [0, 1, 16, 9.5, NaN, Infinity]) {
      const other = {...f.expected, targetSchemaVersion: value}
      assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, other))(), /BACKUP_COMMIT_EXPECTATION_REFUSED/)
      assert.throws(() => f.inspect(other), /BACKUP_COMMIT_EXPECTATION_REFUSED/)
    }
    for (const mutate of [
      (value: WindowsBackupCommitExpectation) => {value.binding.operation = '../wrong'},
      (value: WindowsBackupCommitExpectation) => {value.binding.source.sha256 = 'b'.repeat(64)},
      (value: WindowsBackupCommitExpectation) => {Reflect.set(value.binding, 'extra', true)}
    ]) {
      const other = cloneExpected(f.expected); mutate(other)
      assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, other))())
      assert.throws(() => f.inspect(other))
    }
    assert.deepEqual(journal(f.db), [])
  } finally { await f.close() }
})

await test('current source evidence keeps exact uint64 strings and rejects invalid size, numeric coercion and unsafe filesystem', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    const reader = f.reader(), evidence = f.currentSource(reader)
    assert.equal(evidence.file, '18446744073709551615')
    assert.deepEqual(inspectWindowsBackupSourceCommit(reader, f.expected, evidence), recorded)
    for (const field of ['volume', 'file', 'size', 'created', 'written', 'available'] as const) {
      for (const value of [0, '01', '18446744073709551616']) {
        const malformed = {...evidence, [field]: value} as unknown as WindowsBackupSourceEvidence
        assert.throws(() => inspectWindowsBackupSourceCommit(reader, f.expected, malformed), `${field}=${value}`)
      }
    }
    for (const mutation of [{size: String(Number(evidence.size) - 1)}, {sha256: 'BAD'}, {links: 0}, {filesystem: 'ntfs'}]) {
      assert.throws(() => inspectWindowsBackupSourceCommit(reader, f.expected, {...evidence, ...mutation}))
    }
  } finally { await f.close() }
})

await test('a populated temp schema is refused while SQLite internal empty temp remains compatible', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => f.migrateAndWrite())()
    assert.deepEqual(f.inspect(), recorded)
    f.db.exec('CREATE TEMP TABLE synthetic_temp (value TEXT)')
    assert.throws(() => f.db.transaction(() => writeWindowsBackupCommitMarker(f.db, f.expected))(), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    const reader = f.reader({queryOnly: false, begin: false})
    reader.exec('CREATE TEMP TABLE synthetic_temp (value TEXT)')
    reader.pragma('query_only=ON'); reader.exec('BEGIN')
    assert.throws(() => inspectWindowsBackupSourceCommit(reader, f.expected, f.currentSource(reader)), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    assert.deepEqual(f.inspect(), recorded, 'another fresh readonly connection has no unsafe temp objects')
  } finally { await f.close() }
})

for (const existingCount of [127, 128]) await test(`existing journal capacity ${existingCount} preserves the 128-row limit and atomic write`, async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => {
      const insert = f.db.prepare("INSERT INTO library_operation_journal VALUES (?, 'settled')")
      for (let index = 0; index < existingCount; index++) insert.run(`preexisting:${index}`)
    })()
    if (existingCount === 127) {
      f.db.transaction(() => f.migrateAndWrite())()
      assert.equal(journal(f.db).length, 128)
      assert.deepEqual(f.inspect(), recorded)
    } else {
      assert.throws(() => f.db.transaction(() => f.migrateAndWrite())(), /BACKUP_COMMIT_JOURNAL_CAPACITY_REFUSED/)
      assert.equal(f.db.pragma('user_version', {simple: true}), 1)
      assert.equal(f.db.prepare("SELECT 1 FROM tags WHERE id='commit-proof-result'").get(), undefined)
      assert.equal(f.db.prepare("SELECT 1 FROM sqlite_schema WHERE name='independent_tag_requests'").get(), undefined)
      assert.equal(journal(f.db).length, 128)
      assert.deepEqual(f.inspect(), unproven)
    }
  } finally { await f.close() }
})

await test('full schema validation rejects unknown source objects before writing or accepting commit proof', async () => {
  const f = await fixture()
  try {
    assert.throws(() => f.db.transaction(() => {
      applyTagIntentSchema(f.db)
      f.db.exec('CREATE TABLE synthetic_unknown_object (value TEXT)')
      writeWindowsBackupCommitMarker(f.db, f.expected)
    })(), {code: 'library-schema-invalid'})
    assert.equal(f.db.pragma('user_version', {simple: true}), 1)
    assert.deepEqual(journal(f.db), [])
    f.db.transaction(() => f.migrateAndWrite())()
    f.db.exec('CREATE TABLE synthetic_unknown_object (value TEXT)')
    assert.throws(() => f.inspect(), {code: 'library-schema-invalid'})
    assert.ok(f.db.prepare("SELECT 1 FROM sqlite_schema WHERE name='synthetic_unknown_object'").get(), 'inspection must not repair source schema')
  } finally { await f.close() }
})

async function killAtCommitCut(f: Awaited<ReturnType<typeof fixture>>, cut: 'before-commit' | 'after-commit') {
  assert.ok(process.versions.electron, 'crash child must use the existing Electron Node ABI')
  const require = createRequire(path.join(process.cwd(), 'package.json'))
  const outfile = path.join(f.root, 'commit-crash.cjs')
  const built = await build({entryPoints: [path.resolve('scripts/fixtures/windows-backup-commit-crash.ts')],
    bundle: true, platform: 'node', format: 'cjs', target: 'node20', write: false, packages: 'external', logLevel: 'silent',
    plugins: [{name: 'existing-native-sqlite', setup(builder) {
      builder.onResolve({filter: /^better-sqlite3$/u}, () => ({path: require.resolve('better-sqlite3'), external: true}))
    }}]
  })
  assert.equal(built.outputFiles.length, 1)
  await fs.writeFile(outfile, built.outputFiles[0].contents, {flag: 'wx'})
  const configuration = path.join(f.root, 'commit-crash.json')
  await fs.writeFile(configuration, JSON.stringify({root: f.root, file: f.file, cut, binding: f.binding}), {flag: 'wx'})
  f.db.close()
  const child: ChildProcess = spawn(process.execPath, [outfile, configuration], {
    cwd: f.root, env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false
  })
  assert.ok(child.pid)
  let stdout = '', stderr = '', closed = false, terminated = false
  let resolveCut!: () => void, rejectCut!: (error: Error) => void
  const observed = new Promise<void>((resolve, reject) => {resolveCut = resolve; rejectCut = reject})
  child.stdout!.on('data', chunk => {
    stdout += String(chunk)
    if (stdout.length > 8192) {rejectCut(Error('COMMIT_CRASH_OUTPUT_LIMIT')); child.kill('SIGKILL'); return}
    if (stdout.includes(`CUT ${cut}\n`)) resolveCut()
  })
  child.stderr!.on('data', chunk => {
    stderr += String(chunk)
    if (stderr.length > 8192) {rejectCut(Error('COMMIT_CRASH_OUTPUT_LIMIT')); child.kill('SIGKILL')}
  })
  child.on('error', error => rejectCut(error))
  const completion = new Promise<{code: number | null; signal: NodeJS.Signals | null}>(resolve => child.on('close', (code, signal) => {
    closed = true; rejectCut(Error(`COMMIT_CRASH_CLOSED_BEFORE_CUT ${stderr}`)); resolve({code, signal})
  }))
  const timeout = setTimeout(() => {rejectCut(Error('COMMIT_CRASH_CUT_TIMEOUT')); child.kill('SIGKILL')}, 20000)
  try {
    await observed
    assert.equal(closed, false)
    assert.equal(child.exitCode, null)
    terminated = child.kill('SIGKILL')
    assert.equal(terminated, true, 'only this observed live child is terminated')
    const result = await completion
    assert.ok(result.code !== 0 || result.signal !== null, 'crash cut must not be a normal successful exit')
    assert.equal(stderr, '')
    assert.equal(stdout, `CUT ${cut}\n`)
    assert.equal(closed, true)
    return result
  } finally {
    clearTimeout(timeout)
    if (!closed) {child.kill('SIGKILL'); await completion}
  }
}

for (const cut of ['before-commit', 'after-commit'] as const) await test('OWNED child killed at actual SQLite ' + cut + ' cut proves the durable source result', async () => {
  const f = await fixture()
  try {
    await killAtCommitCut(f, cut)
    const reader = f.reader(), committed = cut === 'after-commit'
    assert.equal(reader.pragma('quick_check', {simple: true}), 'ok')
    assert.equal(reader.pragma('user_version', {simple: true}), committed ? 9 : 1)
    assert.equal(Boolean(reader.prepare("SELECT 1 FROM tags WHERE id='crash-cut-result'").get()), committed)
    assert.equal(journal(reader).length, committed ? 1 : 0)
    assert.deepEqual(inspectWindowsBackupSourceCommit(reader, f.expected, f.currentSource(reader)), committed ? recorded : unproven)
    assert.equal(reader.prepare("SELECT 1 FROM sqlite_schema WHERE name='independent_tag_requests'").get() !== undefined, committed)
    await assert.rejects(fs.access(path.join(f.root, 'status-finished.json')), /ENOENT/, 'no process/status acknowledgement exists')
  } finally { await f.close() }
})
