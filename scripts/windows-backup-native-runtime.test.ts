import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { symlinkSync, mkdirSync, renameSync } from 'node:fs'
import { randomBytes, createHash } from 'node:crypto'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { loadWindowsBackupRuntime } from '../src/main/platform/windows-backup-native/runtime'

const bundleDirectory = path.resolve('build/windows-backup-runtime/win32-x64')
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const op = () => 'tag-intent-' + randomBytes(16).toString('hex')
async function fixture(payloadBytes = 0) {
  const control = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-windows-runtime-test-')))
  const database = new Database(path.join(control, 'library.sqlite'))
  database.exec("CREATE TABLE user_state(id INTEGER PRIMARY KEY, caption TEXT);INSERT INTO user_state VALUES(1,'合成用户编辑');PRAGMA user_version=1")
  if (payloadBytes) {
    database.exec('CREATE TABLE payload(bytes BLOB)')
    database.prepare('INSERT INTO payload(bytes) VALUES(zeroblob(?))').run(payloadBytes)
  }
  let admitted = true
  const runtime = loadWindowsBackupRuntime({ bundleDirectory, assertPermit: () => { assert.equal(admitted, true) } })
  const binding = runtime.bindSource(database, control)
  const image = database.serialize()
  return { control, database, runtime, binding, image, finish: async () => {
    binding.close(); assert.equal(runtime.inspectReleased(), true); database.close(); admitted = false
    assert.equal(path.dirname(control), await fs.realpath(os.tmpdir())); assert.ok(path.basename(control).startsWith('dam-windows-runtime-test-'))
    await fs.rm(control, { recursive: true })
  } }
}

await test('formal Windows Runtime refuses missing bundle and unadmitted preparation', () => {
  let calls = 0
  assert.throws(() => loadWindowsBackupRuntime({ bundleDirectory, assertPermit: () => { calls++; throw Error('NOT_ADMITTED') } }), /NOT_ADMITTED/)
  assert.equal(calls, 1)
  assert.throws(() => loadWindowsBackupRuntime({ bundleDirectory: path.join(bundleDirectory, 'absent'), assertPermit: () => {} }), /ENOENT/)
})

await test('formal admitted Runtime binds actual MAIN, holds native target, reads source and releases all known handles', async context => {
  const f = await fixture(), operation = op()
  try {
    let held = false
    const receipt = await f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => { assert.equal(source.file, f.binding.before.file); assert.equal(source.sha256, sha(f.image)); return JSON.stringify({ operation, source, imageSha256: sha(f.image) }) },
      whileHeld: async (digest, recheck) => {
        held = true; assert.equal(digest, sha(f.image)); assert.equal(f.runtime.inspectReleased(), false)
        assert.equal((await recheck()).sha256, f.binding.recheck().sha256)
        await assert.rejects(fs.rename(path.join(f.control, 'schema-backups'), path.join(f.control, 'blocked-parent')))
        return 1
      } })
    assert.equal(held, true); assert.equal(receipt.Outcome, 'target-verified', receipt.Reason ?? ''); assert.equal(receipt.HandlesReleased, true)
    const target = path.join(f.control, 'schema-backups', operation, 'library.sqlite')
    assert.equal(sha(await fs.readFile(target)), sha(f.image))
    const checked = new Database(target, { readonly: true, fileMustExist: true })
    try { assert.equal(checked.pragma('quick_check', { simple: true }), 'ok'); assert.equal(checked.prepare('SELECT caption FROM user_state').pluck().get(), '合成用户编辑') } finally { checked.close() }
    const status = JSON.parse(await fs.readFile(path.join(path.dirname(target), 'status-finished.json'), 'utf8'))
    assert.equal(status.protocol, 1); assert.equal(status.phase, 'finished'); assert.equal(status.mainDeclaredCommitted, true); assert.equal('productionQualified' in status, false)
    context.diagnostic(JSON.stringify(f.runtime.identity))
  } finally { await f.finish() }
})

await test('formal Runtime shares existing safe backup parent and never overwrites an operation', async () => {
  const f = await fixture(), first = op(), second = op()
  try {
    const run = (operation: string) => f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => JSON.stringify({ operation, source, imageSha256: sha(f.image) }), whileHeld: async () => 1 })
    assert.equal((await run(first)).Outcome, 'target-verified'); assert.equal((await run(second)).Outcome, 'target-verified')
    const file = path.join(f.control, 'schema-backups', first, 'library.sqlite'), before = sha(await fs.readFile(file))
    await assert.rejects(run(first), /RECEIPT_REFUSED/)
    assert.equal(sha(await fs.readFile(file)), before); assert.deepEqual((await fs.readdir(path.join(f.control, 'schema-backups'))).sort(), [first, second].sort())
  } finally { await f.finish() }
})

await test('abort after formal HELD waits for kernel exit while an unresolved callback cannot retain the target', async context => {
  const f = await fixture(), operation = op(), controller = new AbortController()
  let primary: unknown
  try {
    let held = false
    await assert.rejects(f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: controller.signal,
      onSource: source => JSON.stringify({ operation, source, imageSha256: sha(f.image) }), whileHeld: async () => { held = true; controller.abort(Error('TEST_CANCELLED')); return new Promise<number>(() => {}) } }), /TEST_CANCELLED/)
    assert.equal(held, true); assert.equal(sha(await fs.readFile(path.join(f.control, 'schema-backups', operation, 'library.sqlite'))), sha(f.image))
    f.binding.close(); assert.equal(f.runtime.inspectReleased(), true)
    await fs.rename(path.join(f.control, 'schema-backups'), path.join(f.control, 'released-parent'))
  } catch (error) { primary = error; context.diagnostic(JSON.stringify({ phase: 'abort-business', error: String(error) })); throw error }
  finally { try { await f.finish() } catch (error) { context.diagnostic(JSON.stringify({ phase: 'abort-cleanup', error: String(error) })); if (primary) throw new AggregateError([primary, error], 'BUSINESS_AND_CLEANUP_FAILURE'); throw error } }
})

await test('formal backup retains a one MiB initial image while a valid held source transaction grows beyond one MiB', async () => {
  const f = await fixture(), operation = op()
  try {
    const receipt = await f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => JSON.stringify({ operation, source, imageSha256: sha(f.image) }), whileHeld: async (_digest, recheck) => {
        f.database.transaction(() => { f.database.exec('CREATE TABLE growth(bytes BLOB)'); f.database.prepare('INSERT INTO growth(bytes) VALUES(zeroblob(?))').run(1500000) })()
        const current = await recheck()
        assert.ok(BigInt(current.size) > 1048576n); assert.ok(BigInt(current.size) <= 5242880n)
        return 1
      } })
    assert.equal(receipt.Outcome, 'target-verified', receipt.Reason ?? '')
    assert.equal(sha(await fs.readFile(path.join(f.control, 'schema-backups', operation, 'library.sqlite'))), sha(f.image))
    assert.equal(f.database.prepare('SELECT length(bytes) FROM growth').pluck().get(), 1500000)
  } finally { await f.finish() }
})

await test('formal Runtime accepts the exact minimal package bundle and rejects an oversized image before spawning', async () => {
  const packaged = loadWindowsBackupRuntime({ bundleDirectory: path.resolve('build/windows-backup-runtime/package/win32-x64'), assertPermit: () => {} })
  assert.equal(packaged.inspectReleased(), true)
  const f = await fixture()
  try {
    let callback = false
    await assert.rejects(f.runtime.runTarget({ control: f.control, operation: op(), image: Buffer.alloc(4 * 1024**2 + 1), signal: new AbortController().signal,
      onSource: () => { callback = true; return '' }, whileHeld: async () => 1 }), /TARGET_INPUT_REFUSED/)
    assert.equal(callback, false); await assert.rejects(fs.stat(path.join(f.control, 'schema-backups')), { code: 'ENOENT' })
  } finally { await f.finish() }
})

await test('formal native backup reads back a near-four MiB initial SQLite image without changing its source', async () => {
  const payloadBytes = 4 * 1024**2 - 64 * 1024, f = await fixture(payloadBytes), operation = op()
  try {
    assert.ok(f.image.length > 3.9 * 1024**2); assert.ok(f.image.length <= 4 * 1024**2)
    const receipt = await f.runtime.runTarget({control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => {assert.equal(source.sha256, sha(f.image)); return JSON.stringify({operation, source, imageSha256: sha(f.image)})},
      whileHeld: async (_digest, recheck) => {assert.equal((await recheck()).sha256, sha(f.image)); return 1}})
    assert.equal(receipt.Outcome, 'target-verified', receipt.Reason ?? ''); assert.equal(receipt.HandlesReleased, true)
    const target = path.join(f.control, 'schema-backups', operation, 'library.sqlite')
    assert.equal(sha(await fs.readFile(target)), sha(f.image))
    assert.equal(sha(await fs.readFile(path.join(f.control, 'library.sqlite'))), sha(f.image))
    const checked = new Database(target, {readonly: true, fileMustExist: true})
    try {assert.equal(checked.pragma('quick_check', {simple: true}), 'ok'); assert.equal(checked.prepare('SELECT length(bytes) FROM payload').pluck().get(), payloadBytes)}
    finally {checked.close()}
  } finally {await f.finish()}
})

await test('abort rejects a pending logical source request immediately while physical release remains independently awaited', async context => {
  const f = await fixture(), operation = op(), controller = new AbortController()
  let requestSettled = false
  try {
    await assert.rejects(f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: controller.signal,
      onSource: source => JSON.stringify({ operation, source, imageSha256: sha(f.image) }), whileHeld: async (_digest, recheck) => {
        const request = recheck()
        controller.abort(Error('PENDING_SOURCE_CANCELLED'))
        await assert.rejects(request, /PENDING_SOURCE_CANCELLED/)
        requestSettled = true
        return 0
      } }), /PENDING_SOURCE_CANCELLED/)
    assert.equal(requestSettled, true)
    f.binding.close(); assert.equal(f.runtime.inspectReleased(), true)
  } finally { try { await f.finish() } catch (error) { context.diagnostic(JSON.stringify({ phase: 'pending-source-cleanup', error: String(error), requestSettled })); throw error } }
})

await test('formal native target rejects a newly substituted backup-parent junction before outside writes', async () => {
  const f = await fixture(), operation = op()
  const outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-windows-runtime-outside-')))
  await fs.writeFile(path.join(outside, 'sentinel'), 'owned synthetic unchanged')
  const parent = path.join(f.control, 'schema-backups')
  try {
    await assert.rejects(f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => { symlinkSync(outside, parent, 'junction'); return JSON.stringify({ operation, source, imageSha256: sha(f.image) }) }, whileHeld: async () => 1 }), /RECEIPT_REFUSED/)
    assert.deepEqual(await fs.readdir(outside), ['sentinel']); assert.equal(await fs.readFile(path.join(outside, 'sentinel'), 'utf8'), 'owned synthetic unchanged')
  } finally {
    if ((await fs.lstat(parent).catch(() => null))?.isSymbolicLink()) await fs.unlink(parent)
    await f.finish(); assert.ok(path.basename(outside).startsWith('dam-windows-runtime-outside-')); await fs.rm(outside, { recursive: true })
  }
})

await test('formal native target refuses a preexisting operation junction and preserves both namespaces', async () => {
  const f = await fixture(), operation = op()
  const outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-windows-runtime-outside-')))
  await fs.writeFile(path.join(outside, 'sentinel'), 'owned synthetic unchanged')
  const parent = path.join(f.control, 'schema-backups'), slot = path.join(parent, operation)
  try {
    await assert.rejects(f.runtime.runTarget({ control: f.control, operation, image: f.image, signal: new AbortController().signal,
      onSource: source => { mkdirSync(parent); symlinkSync(outside, slot, 'junction'); return JSON.stringify({ operation, source, imageSha256: sha(f.image) }) }, whileHeld: async () => 1 }), /RECEIPT_REFUSED/)
    assert.deepEqual(await fs.readdir(outside), ['sentinel']); assert.equal(await fs.readFile(path.join(outside, 'sentinel'), 'utf8'), 'owned synthetic unchanged')
  } finally {
    if ((await fs.lstat(slot).catch(() => null))?.isSymbolicLink()) await fs.unlink(slot)
    await f.finish(); assert.ok(path.basename(outside).startsWith('dam-windows-runtime-outside-')); await fs.rm(outside, { recursive: true })
  }
})

await test('unused CREATE_NEW journal reservation denies replacement and removes only its unchanged empty object', async () => {
  const f=await fixture(),journal=path.join(f.control,'library.sqlite-journal')
  try {
    f.binding.reserveJournal()
    assert.equal((await fs.stat(journal)).size,0)
    assert.throws(()=>f.binding.reserveJournal(),/JOURNAL_RESERVATION_REFUSED/)
    assert.throws(()=>f.binding.handoffJournal(),/JOURNAL_HANDOFF_REFUSED/)
    await assert.rejects(fs.rename(journal,path.join(f.control,'substituted-journal')))
    assert.equal(sha(await fs.readFile(path.join(f.control,'library.sqlite'))),sha(f.image))
    f.binding.close()
    assert.equal(f.runtime.inspectReleased(),true)
    await assert.rejects(fs.stat(journal),{code:'ENOENT'})
    assert.equal(sha(await fs.readFile(path.join(f.control,'library.sqlite'))),sha(f.image))
  } finally {await f.finish()}
})

await test('journal handoff overlaps SQLite actual win32 handle and observes its successful commit close',async()=>{
  const f=await fixture(),journal=path.join(f.control,'library.sqlite-journal')
  try {
    f.binding.reserveJournal()
    f.database.transaction(()=>{
      f.binding.handoffJournal()
      assert.ok(f.database.inTransaction)
      assert.throws(()=>renameSync(journal,path.join(f.control,'escaped-journal')))
      f.database.exec('CREATE TABLE qualified(id INTEGER);INSERT INTO qualified VALUES(7)')
    })()
    assert.equal(f.database.pragma('user_version',{simple:true}),1)
    assert.equal(f.database.prepare('SELECT id FROM qualified').pluck().get(),7)
    await assert.rejects(fs.stat(journal),{code:'ENOENT'})
    f.binding.close();assert.equal(f.runtime.inspectReleased(),true)
  } finally {await f.finish()}
})

await test('after journal handoff a domain failure rolls back through SQLite actual journal close',async()=>{
  const f=await fixture(),journal=path.join(f.control,'library.sqlite-journal')
  try {
    f.binding.reserveJournal()
    assert.throws(()=>f.database.transaction(()=>{
      f.binding.handoffJournal();f.database.exec('CREATE TABLE rolled_back(id INTEGER)');throw Error('OWNED_DOMAIN_ROLLBACK')
    })(),/OWNED_DOMAIN_ROLLBACK/)
    assert.equal(f.database.prepare("SELECT name FROM sqlite_schema WHERE name='rolled_back'").get(),undefined)
    assert.equal(f.database.pragma('user_version',{simple:true}),1)
    await assert.rejects(fs.stat(journal),{code:'ENOENT'})
    f.binding.close();assert.equal(f.runtime.inspectReleased(),true)
    const again=f.runtime.bindSource(f.database,f.control)
    again.reserveJournal();again.close();assert.equal(f.runtime.inspectReleased(),true)
  } finally {await f.finish()}
})

await test('preexisting journal hardlink is refused before any write and preserves the owned outside file',async()=>{
  const f=await fixture(),journal=path.join(f.control,'library.sqlite-journal'),outside=path.join(f.control,'owned-outside.txt')
  const bytes=Buffer.from('synthetic original remains unchanged')
  try {
    await fs.writeFile(outside,bytes);await fs.link(outside,journal)
    assert.throws(()=>f.binding.reserveJournal(),/JOURNAL_RESERVATION_REFUSED/)
    assert.deepEqual(await fs.readFile(outside),bytes);assert.deepEqual(await fs.readFile(journal),bytes)
    assert.equal((await fs.stat(outside)).nlink,2)
    assert.equal(sha(await fs.readFile(path.join(f.control,'library.sqlite'))),sha(f.image))
  } finally {await f.finish()}
})

await test('preexisting journal junction and WAL sidecar refuse reservation without following or deleting them',async()=>{
  const f=await fixture(),journal=path.join(f.control,'library.sqlite-journal'),outside=path.join(f.control,'owned-outside')
  try {
    await fs.mkdir(outside);await fs.writeFile(path.join(outside,'sentinel'),'unchanged')
    symlinkSync(outside,journal,'junction')
    assert.throws(()=>f.binding.reserveJournal(),/JOURNAL_RESERVATION_REFUSED/)
    assert.equal(await fs.readFile(path.join(outside,'sentinel'),'utf8'),'unchanged')
    await fs.unlink(journal)
    await fs.writeFile(path.join(f.control,'library.sqlite-wal'),'owned preexisting sidecar')
    assert.throws(()=>f.binding.reserveJournal(),/SIDECAR_REFUSED/)
    assert.equal(await fs.readFile(path.join(f.control,'library.sqlite-wal'),'utf8'),'owned preexisting sidecar')
    await assert.rejects(fs.stat(journal),{code:'ENOENT'})
  } finally {
    if((await fs.lstat(journal).catch(()=>null))?.isSymbolicLink())await fs.unlink(journal)
    await f.finish()
  }
})
