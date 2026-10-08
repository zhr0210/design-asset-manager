import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {
  captureWindowsBackupConnection,
  recheckWindowsBackupSource,
  requireWindowsBackupSpace,
  validateWindowsBackupSource,
  type WindowsBackupConnectionSnapshot,
  type WindowsBackupSourceEvidence
} from '../src/main/platform/windows-backup-source.internal'

const digest = (image: Buffer) => createHash('sha256').update(image).digest('hex')
const MAX_UINT64 = '18446744073709551615'

/** SQLite is real; native evidence is explicitly synthetic input to the private validator. */
async function fixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-native-target-')))
  const control = path.join(root, '.dam')
  await fs.mkdir(control)
  const file = path.join(control, 'library.sqlite')
  const db = new Database(file, {timeout: 0})
  db.pragma('journal_mode=DELETE')
  db.exec('CREATE TABLE synthetic_source (id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
  db.exec("INSERT INTO synthetic_source VALUES (1, 'before')")
  db.pragma('user_version=1')
  return {
    root, control, file, db,
    snapshot: () => captureWindowsBackupConnection(db, control),
    image: () => db.serialize(),
    close: async () => {
      if (db.open) db.close()
      // The recursive removal target is a resolved, uniquely owned temporary fixture.
      assert.equal(path.dirname(root), temporary)
      assert.ok(path.basename(root).startsWith('dam-native-target-'))
      await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
    }
  }
}

function nativeEvidence(image: Buffer): WindowsBackupSourceEvidence {
  return {
    volume: '4294967295', file: MAX_UINT64, size: String(image.length),
    created: '133900000000000001', written: '133900000000000002', links: 1,
    sha256: digest(image), available: MAX_UINT64, filesystem: 'NTFS'
  }
}

await test('actual DELETE connection and exact serialized image retain 64-bit native evidence', async () => {
  const f = await fixture()
  try {
    const connection = f.snapshot(), image = f.image(), evidence = nativeEvidence(image)
    assert.deepEqual(await fs.readFile(f.file), image, 'serialized snapshot must represent the actual settled source bytes')
    assert.equal(connection.pageSize, 4096)
    assert.ok(connection.pages >= 2)
    assert.equal(connection.schemaVersion, 1)
    assert.ok(connection.dataVersion >= 1)
    assert.equal(BigInt(image.length), BigInt(connection.pages) * BigInt(connection.pageSize))
    const policy = validateWindowsBackupSource(evidence, connection, image)
    assert.equal(policy.backupMaxBytes, BigInt(image.length))
    assert.ok(policy.beforeBackup > policy.beforeDdl)
    requireWindowsBackupSpace(evidence, policy.beforeBackup)
    recheckWindowsBackupSource(evidence, {...evidence}, connection, {...connection}, Buffer.from(image))
    assert.equal(evidence.file, MAX_UINT64, 'native file identity must not round through Number')
    assert.equal(evidence.volume, '4294967295')
  } finally {await f.close()}
})
await test('empty SQLite temp is compatible, populated temp and readonly-scope misuse refuse',async()=>{
  const f=await fixture()
  try{
    f.db.exec('CREATE TEMP TABLE transient_check(id); DROP TABLE transient_check')
    const attached=f.db.pragma('database_list') as Array<{name:string;file:string}>
    assert.ok(attached.some(row=>row.name==='temp'&&row.file===''))
    assert.equal(f.snapshot().schemaVersion,1)
    assert.throws(()=>captureWindowsBackupConnection(f.db,f.control,'readonly-transaction'),/CONNECTION_REFUSED/)
    f.db.exec('CREATE TEMP TABLE forbidden_check(id)')
    assert.throws(f.snapshot,/CONNECTION_REFUSED/)
  }finally{await f.close()}
})

await test('connection qualification refuses memory and a different real database path', async () => {
  const f = await fixture(), memory = new Database(':memory:')
  let wrong: Database.Database | undefined
  try {
    memory.pragma('user_version=1')
    assert.throws(() => captureWindowsBackupConnection(memory, f.control), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    wrong = new Database(path.join(f.control, 'wrong.sqlite'))
    wrong.pragma('user_version=1')
    assert.throws(() => captureWindowsBackupConnection(wrong!, f.control), /BACKUP_SOURCE_CONNECTION_REFUSED/)
  } finally {memory.close(); wrong?.close(); await f.close()}
})

await test('actual connection refuses attached databases and then accepts after detach', async () => {
  const f = await fixture()
  try {
    f.db.prepare('ATTACH DATABASE ? AS extra').run(path.join(f.control, 'extra.sqlite'))
    assert.throws(f.snapshot, /BACKUP_SOURCE_CONNECTION_REFUSED/)
    f.db.exec('DETACH DATABASE extra')
    assert.equal(f.snapshot().schemaVersion, 1)
  } finally {await f.close()}
})

await test('actual connection refuses a live transaction, WAL, and missing schema version', async () => {
  const f = await fixture()
  try {
    f.db.transaction(() => assert.throws(f.snapshot, /BACKUP_SOURCE_CONNECTION_REFUSED/))()
    assert.equal(f.db.inTransaction, false)
    assert.equal(f.db.pragma('journal_mode=WAL', {simple: true}), 'wal')
    assert.throws(f.snapshot, /BACKUP_SOURCE_CONNECTION_REFUSED/)
    f.db.pragma('journal_mode=DELETE')
    f.db.pragma('user_version=0')
    assert.throws(f.snapshot, /BACKUP_SOURCE_CONNECTION_REFUSED/)
  } finally {await f.close()}
})

await test('source evidence rejects non-canonical decimal, unsafe identity, links, filesystem and digest', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    const numericFields = ['volume', 'file', 'size', 'created', 'written', 'available'] as const
    for (const field of numericFields) {
      for (const value of ['', '-1', '01', '1.0', '1e4', ' 1', '1 ', 'UNKNOWN']) {
        assert.throws(() => validateWindowsBackupSource({...evidence, [field]: value}, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/, `${field}=${value}`)
      }
    }
    for (const mutation of [
      {volume: '4294967296'}, {file: '0'}, {created: '0'}, {written: '0'}, {links: 0}, {links: 2},
      {filesystem: 'ReFS'}, {filesystem: 'ntfs'}, {sha256: '0'.repeat(63)},
      {sha256: evidence.sha256.toUpperCase()}
    ]) assert.throws(() => validateWindowsBackupSource({...evidence, ...mutation}, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/)
  } finally {await f.close()}
})

await test('all native numeric fields reject values beyond the unsigned 64-bit boundary', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    for (const field of ['volume', 'file', 'size', 'created', 'written', 'available'] as const) {
      for (const value of ['18446744073709551616', '99999999999999999999']) {
        assert.throws(() => validateWindowsBackupSource({...evidence, [field]: value}, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/, `${field} must fit uint64`)
      }
    }
  } finally {await f.close()}
})

await test('native decimal evidence must remain strings instead of accepting JSON number coercion', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    for (const field of ['volume', 'file', 'size', 'created', 'written', 'available'] as const) {
      const number = field === 'file' ? 1 : Number(evidence[field])
      const malformed = {...evidence, [field]: number} as unknown as WindowsBackupSourceEvidence
      assert.throws(() => validateWindowsBackupSource(malformed, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/, `${field} number must not stand in for a native decimal string`)
    }
    assert.throws(() => requireWindowsBackupSpace({...evidence, available: 100} as unknown as WindowsBackupSourceEvidence, 1n), /BACKUP_SPACE_UNKNOWN/)
  } finally {await f.close()}
})

await test('exact source size must match pages and bounded image, and digest must match all image bytes', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    for (const size of ['0', String(image.length - 1), String(image.length + 1)]) {
      assert.throws(() => validateWindowsBackupSource({...evidence, size}, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/)
    }
    const oversized: WindowsBackupConnectionSnapshot = {...connection, pages: 1025, pageSize: 4096}
    assert.throws(() => validateWindowsBackupSource({...evidence, size: String(1025 * 4096)}, oversized), /BACKUP_SOURCE_EVIDENCE_REFUSED/)
    assert.throws(() => validateWindowsBackupSource(evidence, connection, image.subarray(0, image.length - 1)), /BACKUP_SOURCE_IMAGE_CHANGED/)
    const changed = Buffer.from(image)
    changed[changed.length - 1] ^= 1
    assert.throws(() => validateWindowsBackupSource(evidence, connection, changed), /BACKUP_SOURCE_IMAGE_CHANGED/)
  } finally {await f.close()}
})

await test('source recheck refuses different retained identity, timestamps or full-image digest', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    for (const mutation of [{volume: '4294967294'}, {file: '18446744073709551614'},
      {created: '133900000000000003'}, {written: '133900000000000004'}]) {
      assert.throws(() => recheckWindowsBackupSource(evidence, {...evidence, ...mutation}, connection, connection, image), /BACKUP_SOURCE_CHANGED/)
    }
    const changed = Buffer.from(image)
    changed[changed.length - 1] ^= 1
    assert.throws(() => recheckWindowsBackupSource(evidence, {...evidence, sha256: digest(changed)}, connection, connection, changed), /BACKUP_SOURCE_CHANGED/)
    assert.throws(() => recheckWindowsBackupSource(evidence, {...evidence, size: String(image.length + 1)}, connection, connection, image), /BACKUP_SOURCE_EVIDENCE_REFUSED/)
  } finally {await f.close()}
})

await test('actual second-connection commit changes data_version and cannot reuse previous source qualification', async () => {
  const f = await fixture()
  let writer: Database.Database | undefined
  try {
    const beforeConnection = f.snapshot(), beforeImage = f.image(), before = nativeEvidence(beforeImage)
    writer = new Database(f.file, {fileMustExist: true, timeout: 0})
    writer.prepare('UPDATE synthetic_source SET value = ? WHERE id = 1').run('changed by real second connection')
    writer.close(); writer = undefined
    const afterConnection = f.snapshot(), afterImage = f.image(), after = nativeEvidence(afterImage)
    assert.notEqual(afterConnection.dataVersion, beforeConnection.dataVersion)
    assert.notEqual(digest(afterImage), digest(beforeImage))
    assert.throws(() => recheckWindowsBackupSource(before, after, beforeConnection, afterConnection, afterImage), /BACKUP_SOURCE_CHANGED/)
  } finally {writer?.close(); await f.close()}
})

await test('actual schema version and page-count changes refuse before DDL qualification', async () => {
  const f = await fixture()
  try {
    const beforeConnection = f.snapshot(), before = nativeEvidence(f.image())
    f.db.pragma('user_version=2')
    let afterConnection = f.snapshot(), image = f.image()
    assert.equal(afterConnection.schemaVersion, 2)
    assert.throws(() => recheckWindowsBackupSource(before, nativeEvidence(image), beforeConnection, afterConnection, image), /BACKUP_SOURCE_CHANGED/)
    f.db.exec('CREATE TABLE synthetic_growth (payload BLOB)')
    f.db.prepare('INSERT INTO synthetic_growth VALUES (?)').run(Buffer.alloc(64 * 1024, 7))
    afterConnection = f.snapshot(); image = f.image()
    assert.ok(afterConnection.pages > beforeConnection.pages)
    assert.throws(() => recheckWindowsBackupSource(before, nativeEvidence(image), beforeConnection, afterConnection, image), /BACKUP_SOURCE_CHANGED/)
  } finally {await f.close()}
})

await test('space check accepts exact budget and refuses insufficient or UNKNOWN evidence', async () => {
  const f = await fixture()
  try {
    const image = f.image(), connection = f.snapshot(), evidence = nativeEvidence(image)
    const policy = validateWindowsBackupSource(evidence, connection, image)
    requireWindowsBackupSpace({...evidence, available: String(policy.beforeBackup)}, policy.beforeBackup)
    assert.throws(() => requireWindowsBackupSpace({...evidence, available: String(policy.beforeBackup - 1n)}, policy.beforeBackup), /BACKUP_SPACE_REQUIRED/)
    for (const available of ['UNKNOWN', '', '-1', '01', '1e9']) {
      assert.throws(() => requireWindowsBackupSpace({...evidence, available}, policy.beforeBackup), /BACKUP_SPACE_UNKNOWN/)
    }
    requireWindowsBackupSpace({...evidence, available: String(policy.beforeDdl)}, policy.beforeDdl)
    assert.throws(() => recheckWindowsBackupSource(evidence, {...evidence, available: String(policy.beforeDdl - 1n)}, connection, connection, image), /BACKUP_SPACE_REQUIRED/)
  } finally {await f.close()}
})

await test('space check refuses out-of-range uint64 availability instead of treating it as free space', async () => {
  const f = await fixture()
  try {
    const evidence = nativeEvidence(f.image())
    for (const available of ['18446744073709551616', '99999999999999999999']) {
      assert.throws(() => requireWindowsBackupSpace({...evidence, available}, 1n), /BACKUP_SPACE_UNKNOWN/)
    }
  } finally {await f.close()}
})
