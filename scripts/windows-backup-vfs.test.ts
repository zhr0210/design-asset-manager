import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {captureWindowsBackupConnection, validateWindowsBackupSource} from '../src/main/platform/windows-backup-source.internal'
import {pinWindowsBackupVfsSource as pinPreparedWindowsBackupVfsSource, prepareWindowsBackupVfsConnection, prepareWindowsBackupVfs, requireWindowsBackupVfsMatch, type WindowsBackupVfsPin} from './fixtures/windows-backup-vfs'
import {prepareWindowsBackupHelper} from './fixtures/windows-backup-helper-process'
import {runNativeBackupTracer} from './fixtures/windows-backup-native-harness'

async function pinWindowsBackupVfsSource(db: Database.Database, control: string) {
  await prepareWindowsBackupVfsConnection(db)
  return pinPreparedWindowsBackupVfsSource(db, control)
}

async function fixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-native-target-')))
  const control = path.join(root, '.dam'); await fs.mkdir(control)
  const file = path.join(control, 'library.sqlite')
  const db = new Database(file, {timeout: 0}); db.pragma('journal_mode=DELETE')
  db.exec("CREATE TABLE synthetic_source(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO synthetic_source VALUES(1,'before')")
  db.pragma('user_version=1')
  return {root, control, file, db, close: async () => {
    if (db.open) db.close()
    assert.equal(path.dirname(root), temporary); assert.ok(path.basename(root).startsWith('dam-native-target-'))
    await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
  }}
}

await test('VFS runtime refuses implicit compilation before touching source', async () => {
  const f = await fixture()
  try {await assert.rejects(pinWindowsBackupVfsSource(f.db, f.control), /BACKUP_VFS_NOT_PRECOMPILED/)} finally {await f.close()}
})
await prepareWindowsBackupVfs()

await test('actual SQLite main VFS is pinned before serialize with strict native uint64 and byte evidence', async () => {
  const f = await fixture(); let pin: WindowsBackupVfsPin | undefined
  try {
    pin = await pinWindowsBackupVfsSource(f.db, f.control)
    const image = f.db.serialize(), snapshot = captureWindowsBackupConnection(f.db, f.control)
    validateWindowsBackupSource(pin.before, snapshot, image)
    assert.deepEqual(await fs.readFile(f.file), image)
    assert.equal(pin.before.filesystem, 'NTFS'); assert.equal(pin.before.links, 1)
    assert.equal(typeof pin.before.file, 'string'); assert.ok(BigInt(pin.before.file) > 0n)
    assert.equal(Object.keys(pin.artifact).length, 4)
    for (const digest of Object.values(pin.artifact)) assert.match(digest, /^[a-f0-9]{64}$/)
    requireWindowsBackupVfsMatch(pin.before, pin.recheck())
    await assert.rejects(fs.rename(f.file, path.join(f.control, 'replaced.sqlite')), /EBUSY|EPERM|EACCES/)
    await assert.rejects(fs.rename(f.control, path.join(f.root, 'replaced-control')), /EBUSY|EPERM|EACCES/)
    pin.close(); pin.close(); assert.throws(pin.recheck, /already released/)
    f.db.close()
    await fs.rename(f.file, path.join(f.control, 'moved.sqlite'))
    await fs.rename(path.join(f.control, 'moved.sqlite'), f.file)
    await fs.rename(f.control, path.join(f.root, 'released-control'))
    await fs.rename(path.join(f.root, 'released-control'), f.control)
  } finally {pin?.close(); await f.close()}
})

await test('pin permits legitimate SQLite writes while recheck reports their changed settled image', async () => {
  const f = await fixture(); let pin: WindowsBackupVfsPin | undefined
  try {
    pin = await pinWindowsBackupVfsSource(f.db, f.control)
    f.db.transaction(() => f.db.prepare('UPDATE synthetic_source SET value=? WHERE id=1').run('after'))()
    const after = pin.recheck()
    assert.equal(after.file, pin.before.file); assert.equal(after.volume, pin.before.volume)
    assert.notEqual(after.sha256, pin.before.sha256)
    assert.throws(() => requireWindowsBackupVfsMatch(pin!.before, after), /BACKUP_VFS_RETAINED_SOURCE_MISMATCH/)
    validateWindowsBackupSource(after, captureWindowsBackupConnection(f.db, f.control), f.db.serialize())
    assert.equal(f.db.prepare('SELECT value FROM synthetic_source').pluck().get(), 'after')
  } finally {pin?.close(); await f.close()}
})

await test('identical source bytes in another SQLite file cannot stand in for the pinned VFS object', async () => {
  const original = await fixture(), replacement = await fixture()
  let clone: Database.Database | undefined, first: WindowsBackupVfsPin | undefined, second: WindowsBackupVfsPin | undefined
  try {
    replacement.db.close(); await fs.copyFile(original.file, replacement.file)
    clone = new Database(replacement.file, {fileMustExist: true, timeout: 0})
    first = await pinWindowsBackupVfsSource(original.db, original.control)
    second = await pinWindowsBackupVfsSource(clone, replacement.control)
    assert.equal(first.before.sha256, second.before.sha256)
    assert.equal(first.before.size, second.before.size)
    assert.notEqual(first.before.file, second.before.file)
    assert.throws(() => requireWindowsBackupVfsMatch(first!.before, second!.before), /BACKUP_VFS_RETAINED_SOURCE_MISMATCH/)
  } finally {first?.close(); second?.close(); clone?.close(); await replacement.close(); await original.close()}
})

await test('multiple links fail native source qualification and failed pin releases every handle', async () => {
  const f = await fixture(); const alias = path.join(f.control, 'alias.sqlite')
  try {
    await fs.link(f.file, alias)
    await assert.rejects(pinWindowsBackupVfsSource(f.db, f.control), /BACKUP_VFS_SOURCE_KIND_REFUSED/)
    await fs.unlink(alias)
    const pin = await pinWindowsBackupVfsSource(f.db, f.control)
    try {assert.equal(pin.before.links, 1)} finally {pin.close()}
  } finally {await f.close()}
})

await test('ancestor junction is refused even when SQLite has already opened the target object', async () => {
  const f = await fixture(); const linked = path.join(f.root, 'linked-control')
  let alternate: Database.Database | undefined
  try {
    await fs.symlink(f.control, linked, 'junction')
    alternate = new Database(path.join(linked, 'library.sqlite'), {fileMustExist: true, timeout: 0})
    await assert.rejects(pinWindowsBackupVfsSource(alternate, linked), /BACKUP_VFS_PATH_REFUSED/)
    alternate.close(); alternate = undefined; await fs.unlink(linked)
  } finally {alternate?.close(); await f.close()}
})

await test('VFS pin refuses incompatible connection states before native registration', async () => {
  const f = await fixture(); const memory = new Database(':memory:')
  try {
    memory.pragma('user_version=1')
    await assert.rejects(pinWindowsBackupVfsSource(memory, f.control), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    f.db.exec('BEGIN')
    await assert.rejects(pinWindowsBackupVfsSource(f.db, f.control), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    f.db.exec('ROLLBACK')
    f.db.pragma('journal_mode=WAL')
    await assert.rejects(pinWindowsBackupVfsSource(f.db, f.control), /BACKUP_SOURCE_CONNECTION_REFUSED/)
    f.db.pragma('journal_mode=DELETE')
    const pin = await pinWindowsBackupVfsSource(f.db, f.control); pin.close()
  } finally {if(f.db.inTransaction) f.db.exec('ROLLBACK'); memory.close(); await f.close()}
})

await test('SQLite connection close releases retained VFS and path pins automatically', async () => {
  const f = await fixture(); let pin: WindowsBackupVfsPin | undefined
  try {
    pin = await pinWindowsBackupVfsSource(f.db, f.control)
    f.db.close(); pin.close()
    await fs.rename(f.file, path.join(f.control, 'after-close.sqlite'))
    await fs.rename(f.control, path.join(f.root, 'after-close-control'))
  } finally {pin?.close(); await f.close()}
})

await test('readonly recovery transaction can recheck retained VFS; writer transaction stays refused', async () => {
  const f = await fixture(); let pin: WindowsBackupVfsPin | undefined, readonly: Database.Database | undefined
  try {
    pin = await pinWindowsBackupVfsSource(f.db, f.control)
    f.db.exec('BEGIN'); assert.throws(pin.recheck, /BACKUP_SOURCE_CONNECTION_REFUSED/); f.db.exec('ROLLBACK')
    pin.close(); f.db.close()
    readonly = new Database(f.file, {readonly: true, fileMustExist: true, timeout: 0}); readonly.pragma('query_only=ON')
    pin = await pinWindowsBackupVfsSource(readonly, f.control)
    readonly.transaction(() => {
      const evidence = pin!.recheck()
      validateWindowsBackupSource(evidence, captureWindowsBackupConnection(readonly!, f.control, 'readonly-transaction'), readonly!.serialize())
      assert.equal(readonly!.prepare('SELECT value FROM synthetic_source').pluck().get(), 'before')
    })()
  } finally {pin?.close(); readonly?.close(); await f.close()}
})

await prepareWindowsBackupHelper()
await test('VFS-before-serialize pin coexists with retained native source and proves the same exact file', async () => {
  const f = await fixture(); let pin: WindowsBackupVfsPin | undefined
  try {
    pin = await pinWindowsBackupVfsSource(f.db, f.control)
    const image = f.db.serialize(); let observed = false
    const result = await runNativeBackupTracer({directory: f.control, mode: 'source-hold', image,
      onSource: source => {requireWindowsBackupVfsMatch(pin!.before, source); observed=true; return '{"synthetic":true}'},
      whileHeld: async (_hash, recheck) => {
        requireWindowsBackupVfsMatch(pin!.recheck(), await recheck())
        await assert.rejects(fs.rename(f.file, path.join(f.control,'replacement.sqlite')), /EBUSY|EPERM|EACCES/)
        return 0
      }})
    assert.equal(observed,true); assert.equal(result.Reason,'CANCELLED_WHILE_HELD')
    assert.equal(result.ProductionQualified,false)
  } finally {pin?.close(); await f.close()}
})
