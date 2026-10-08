import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {readLibraryManifestDeclaration} from '../src/main/library-lifecycle/library-manifest.tracer'
import {verifyLibraryBackupSnapshot, BACKUP_SNAPSHOT_MAX_BYTES} from '../src/main/library-lifecycle/library-backup-snapshot.internal'
import {prepareWindowsBackupVfs, prepareWindowsBackupVfsConnection, pinWindowsBackupVfsSource, requireWindowsBackupVfsMatch, type WindowsBackupVfsPin} from './fixtures/windows-backup-vfs'
import {prepareWindowsBackupMetadataProbe, openWindowsBackupMetadataProbe, type WindowsBackupMetadataProbe} from './fixtures/windows-backup-metadata-probe'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const originalMarker = 'synthetic-before', changedMarker = 'synthetic-after!'
assert.equal(Buffer.byteLength(originalMarker), Buffer.byteLength(changedMarker))

// Real schema-1 data in an owned root. No existing library is opened, and no
// product Host/UI or external inference service is started.
async function fixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-native-target-immutable-')))
  const directory = path.join(root, 'library'), control = path.join(directory, '.dam')
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({kind: 'selected', directory}),
    selectLocalFiles: async () => ({kind: 'cancelled'})
  }))
  let db: Database.Database | undefined
  try {
    const plan = await host.prepareCreate()
    assert.equal(plan.kind, 'planned')
    if (plan.kind !== 'planned') throw Error('SYNTHETIC_LIBRARY_CREATE_REFUSED')
    await host.confirmCreate(plan.plan.receipt)
    const state = host.inspect(); await host.close()
    const declaration = readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(control, 'library.manifest.json'))))
    assert.equal(declaration.kind, 'compatible')
    if (declaration.kind !== 'compatible') throw Error('SYNTHETIC_MANIFEST_REFUSED')
    const file = path.join(control, 'library.sqlite')
    db = new Database(file, {timeout: 0})
    db.prepare("INSERT INTO library_operation_journal(operation_identity,state) VALUES (?, 'settled')").run(originalMarker)
    const expected = {declaration: declaration.declaration, generation: state.generation!, schemaVersion: 1}
    const database = db
    assert.ok(database.serialize().length <= BACKUP_SNAPSHOT_MAX_BYTES)
    return {root, control, file, db: database, expected,
      verify: (image: Buffer, digest = sha(image)) => verifyLibraryBackupSnapshot(image, {...expected, nativeReadbackSha256: digest}),
      close: async () => {
        if (database.open) database.close()
        assert.equal(await fs.realpath(root), root); assert.equal(path.dirname(root), temporary)
        assert.ok(path.basename(root).startsWith('dam-native-target-immutable-'))
        await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
      }}
  } catch (error) {
    db?.close(); await host.close()
    assert.equal(await fs.realpath(root), root); assert.equal(path.dirname(root), temporary)
    await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
    throw error
  }
}
function observe(scenario: string, result: unknown) {
  console.log(JSON.stringify({immutableBoundary: {scenario, result, productionQualified: false, restoreAllowed: false, sourceWriterIsolationQualified: false}}))
}
function markerOffset(image: Buffer) {
  const bytes = Buffer.from(originalMarker), offset = image.indexOf(bytes)
  assert.ok(offset >= 100, 'Expected one actual SQLite cell beyond the header')
  assert.equal(image.indexOf(bytes, offset + bytes.length), -1)
  return offset
}

await test('a verified serialized snapshot remains detached from a later legitimate source commit', async () => {
  const f = await fixture()
  try {
    const image = f.db.serialize(), digest = sha(image)
    assert.equal(f.verify(image, digest).sha256, digest)
    f.db.transaction(() => f.db.prepare("INSERT INTO library_operation_journal(operation_identity,state) VALUES ('synthetic-later', 'settled')").run())()
    assert.notEqual(sha(f.db.serialize()), digest)
    assert.equal(sha(image), digest)
    assert.equal(f.verify(image, digest).sha256, digest)
    const frozen = new Database(image, {readonly: true})
    try {
      assert.equal(frozen.prepare('SELECT count(*) FROM library_operation_journal').pluck().get(), 1)
      assert.equal(f.db.prepare('SELECT count(*) FROM library_operation_journal').pluck().get(), 2)
    } finally {frozen.close()}
    observe('detached-serialized-image', {classification: 'validated-copy-boundary', sourceChanged: true, snapshotDigestUnchanged: true, diskOrProcessImmutabilityQualified: false,
      runtime: {platform: process.platform, arch: process.arch, electron: process.versions.electron, node: process.versions.node, modules: process.versions.modules, napi: process.versions.napi,
        sqliteVersion: f.db.prepare('SELECT sqlite_version()').pluck().get(), sqliteSourceId: f.db.prepare('SELECT sqlite_source_id()').pluck().get()}})
  } finally {await f.close()}
})

await test('readonly deserialized SQLite owns a copy while its caller Buffer remains mutable', async () => {
  const f = await fixture(); let frozen: Database.Database | undefined
  try {
    const image = f.db.serialize(), digest = sha(image), offset = markerOffset(image)
    frozen = new Database(image, {readonly: true}); frozen.pragma('query_only=ON')
    assert.equal(frozen.prepare('SELECT operation_identity FROM library_operation_journal').pluck().get(), originalMarker)
    Buffer.from(changedMarker).copy(image, offset)
    assert.notEqual(sha(image), digest, 'Readonly SQLite does not freeze its caller Buffer')
    assert.equal(frozen.prepare('SELECT operation_identity FROM library_operation_journal').pluck().get(), originalMarker)
    assert.throws(() => frozen!.exec('DELETE FROM library_operation_journal'), /readonly/)
    assert.throws(() => f.verify(image, digest), /BACKUP_SNAPSHOT_INVALID/)
    const changed = new Database(image, {readonly: true})
    try {assert.equal(changed.prepare('SELECT operation_identity FROM library_operation_journal').pluck().get(), changedMarker)} finally {changed.close()}
    Buffer.from(originalMarker).copy(image, offset)
    assert.equal(f.verify(image, digest).sha256, digest)
    observe('readonly-deserialize-copy', {classification: 'validated-owned-memory-copy', inputBufferMutable: true, openedMemoryImageUnchanged: true, transferOwnershipQualified: false})
  } finally {frozen?.close(); await f.close()}
})

await prepareWindowsBackupVfs()
const preparedProbe = await prepareWindowsBackupMetadataProbe()
console.log(JSON.stringify({immutableProbePreparation: {artifactSha256: preparedProbe.artifact.artifactSha256, sourceSha256: preparedProbe.artifact.sourceSha256, compilerSha256: preparedProbe.artifact.compilerSha256, loadReceipt: preparedProbe.loadReceipt, productionQualified: false}}))

await test('actual MAIN source pin allows an existing writer to change and restore bytes between finite hash observations', async () => {
  const f = await fixture(); let held: WindowsBackupMetadataProbe | undefined, pin: WindowsBackupVfsPin | undefined
  try {
    const image = f.db.serialize(), digest = sha(image), offset = markerOffset(image)
    const opened = openWindowsBackupMetadataProbe({root: f.root, target: f.file, access: 'read-write'})
    assert.equal(opened.opened, true); held = opened.session!
    await prepareWindowsBackupVfsConnection(f.db); pin = await pinWindowsBackupVfsSource(f.db, f.control)
    assert.equal(pin.before.sha256, digest)
    const changed = held.attempt({operation: 'write-data', offset, bytes: Buffer.from(changedMarker)})
    assert.equal(changed.succeeded, true); assert.equal(changed.sameIdentity, true)
    assert.notEqual(sha(await fs.readFile(f.file)), digest)
    const current = new Database(await fs.readFile(f.file), {readonly: true})
    try {assert.equal(current.prepare('SELECT operation_identity FROM library_operation_journal').pluck().get(), changedMarker)} finally {current.close()}
    assert.equal(f.verify(image, digest).sha256, digest, 'Detached image qualifies only its own content')
    assert.equal(held.attempt({operation: 'write-data', offset, bytes: Buffer.from(originalMarker)}).succeeded, true)
    const after = pin.recheck()
    assert.equal(after.sha256, pin.before.sha256)
    assert.equal(after.file, pin.before.file); assert.equal(after.volume, pin.before.volume)
    // This platform's complete evidence changes even though both endpoint
    // digests match. Keep the actual gate refusal alongside the counterexample
    // to digest-only interval claims; do not manufacture timestamp restoration.
    assert.notEqual(after.written, pin.before.written)
    assert.throws(() => requireWindowsBackupVfsMatch(pin!.before, after), /BACKUP_VFS_RETAINED_SOURCE_MISMATCH/)
    assert.deepEqual(await fs.readFile(f.file), image)
    observe('existing-writer-change-restore-between-hashes', {classification: 'known-counterexample-to-interval-immutability', beforeSha256: pin.before.sha256, intermediateSha256: changed.after.fullHash, afterSha256: after.sha256,
      allSourceEvidenceEqual: (['volume', 'file', 'size', 'created', 'written', 'links', 'sha256', 'filesystem'] as const).every(key => pin!.before[key] === after[key]),
      lastWriteMatched: pin.before.written === after.written, completeSourceMatchRefused: true, actualMainVfsArtifact: pin.artifact})
  } finally {pin?.close(); held?.close(); await f.close()}
})

await test('read-only attribute is reversible and does not revoke an already granted data-write handle', async () => {
  const f = await fixture(); let writer: WindowsBackupMetadataProbe | undefined, attributes: WindowsBackupMetadataProbe | undefined
  let originalAttributes = 0
  try {
    const image = f.db.serialize(), digest = sha(image), offset = markerOffset(image)
    const writable = openWindowsBackupMetadataProbe({root: f.root, target: f.file, access: 'read-write'})
    assert.equal(writable.opened, true); writer = writable.session!
    const mutable = openWindowsBackupMetadataProbe({root: f.root, target: f.file, access: 'attributes'})
    assert.equal(mutable.opened, true); attributes = mutable.session!; originalAttributes = Number(attributes.snapshot().attributes)
    const readonly = attributes.attempt({operation: 'set-attributes', attributes: originalAttributes | 1})
    assert.equal(readonly.succeeded, true); assert.equal(Number(attributes.snapshot().attributes) & 1, 1)
    const changed = writer.attempt({operation: 'write-data', offset, bytes: Buffer.from(changedMarker)})
    assert.equal(changed.succeeded, true); assert.notEqual(sha(await fs.readFile(f.file)), digest)
    assert.equal(attributes.attempt({operation: 'set-attributes', attributes: originalAttributes}).succeeded, true)
    assert.equal(Number(attributes.snapshot().attributes) & 1, 0)
    assert.equal(writer.attempt({operation: 'write-data', offset, bytes: Buffer.from(originalMarker)}).succeeded, true)
    assert.deepEqual(await fs.readFile(f.file), image)
    observe('readonly-attribute-existing-writer', {classification: 'known-counterexample-to-immutable-attribute', readonlySet: true, existingWriterSucceeded: true, readonlyRemovedByExistingAttributeHandle: true, DaclOrSeparatePrincipalQualified: false})
  } finally {
    if (attributes) {attributes.attempt({operation: 'set-attributes', attributes: originalAttributes}); attributes.close()}
    writer?.close(); await f.close()
  }
})
