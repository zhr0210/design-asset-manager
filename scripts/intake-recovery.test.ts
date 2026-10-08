import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { assertLibraryDataSchema } from '../src/main/library-lifecycle/library-materialization.internal'
import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'
import { createImageToolsController } from '../src/main/image-tools/image-tools-controller'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-intake-recovery-')))
const library = path.join(root, 'library')
const png = await sharp({ create: { width: 48, height: 32, channels: 3, background: '#448899' } }).png().toBuffer()
const files = [path.join(root, 'one.png'), path.join(root, 'two.jpeg'), path.join(root, 'three.webp')]
await fs.writeFile(files[0], png)
await sharp(png).jpeg().toFile(files[1]); await sharp(png).webp().toFile(files[2])
const digest = async (file: string) => createHash('sha256').update(await fs.readFile(file)).digest('hex')
const before = await Promise.all(files.map(digest))
let selection = files
const makeHost = () => createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'selected', files: selection.map(filePath => ({ filePath })) }) }))
let host = makeHost()
const create = await host.prepareCreate(); if (create.kind !== 'planned') throw new Error('fixture create failed')
await host.confirmCreate(create.plan.receipt)
let db = new Database(path.join(library, '.dam', 'library.sqlite'))
const fault = (sql: string) => db.exec(`CREATE TRIGGER fixture_failure ${sql} BEGIN SELECT RAISE(ABORT,'fixture'); END`)
const clear = () => db.exec('DROP TRIGGER IF EXISTS fixture_failure')
const recovery = async (id: string, selectSource = false) => {
  const review = await host.prepareIntakeRecovery({ id, ...(selectSource ? { selectSource } : {}) })
  if (review.kind === 'cancelled') throw new Error('fixture selection cancelled')
  return review
}
try {
  const plan = await host.prepareAddAssets(); if (plan.kind !== 'planned') throw new Error('fixture copy failed')
  fault('BEFORE UPDATE OF managed_original_ref ON asset_candidates')
  await assert.rejects(host.dispatchAddAssets(plan.plan.receipt)); clear()
  let items = (await host.listIntakeRecovery()).items
  assert.equal(items.length, 3)
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  const published = items.find(i => i.fileName === 'one.png')!
  const prepared = await recovery(published.id)
  assert.equal((await host.listAssets()).length, 0, 'Review is read-only')
  const result = await host.runIntakeRecovery(prepared.receipt)
  await assert.rejects(host.runIntakeRecovery(prepared.receipt))
  assert.equal((await host.listAssets()).length, 1)
  const asset = (await host.listAssets())[0]
  const trash = await host.prepareTrash({ designAssetIdentity: asset.id, expectedRevision: asset.revision })
  await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trash.plan.receipt })
  await assert.rejects(recovery(published.id), 'Promoted/Trash is not a pending intake')
  await host.dispatchTrash({ kind: 'restore-design-asset', designAssetIdentity: asset.id, expectedRevision: (await host.inspectTrash(asset.id)).revision })
  // Not yet published: only explicit, matching reselection can supply the frozen bytes.
  const pending = items.find(i => i.fileName === 'two.jpeg')!
  await assert.rejects(recovery(pending.id))
  selection = [files[0]]; await assert.rejects(recovery(pending.id, true))
  selection = [files[1]]
  const selected = await recovery(pending.id, true)
  const saved = await fs.readFile(files[1]); await fs.writeFile(files[1], 'changed after review')
  await host.runIntakeRecovery(selected.receipt)
  await fs.writeFile(files[1], saved)
  assert.equal((await host.listAssets()).length, 2)
  const third = items.find(i => i.fileName === 'three.webp')!
  selection = [files[2]]
  const stale = await recovery(third.id, true)
  await host.close(); await host.reopen()
  await assert.rejects(host.runIntakeRecovery(stale.receipt))
  fault('BEFORE INSERT ON promotion_links')
  await assert.rejects(host.runIntakeRecovery((await recovery(third.id, true)).receipt)); clear()
  const previewNames = await fs.readdir(path.join(library, '.dam', 'required-previews'))
  await host.runIntakeRecovery((await recovery(third.id)).receipt)
  assert.deepEqual(await fs.readdir(path.join(library, '.dam', 'required-previews')), previewNames, 'Verified deterministic preview reused')
  assert.equal((await host.listIntakeRecovery()).items.length, 0)
  assert.equal(db.pragma('user_version', { simple: true }), 1, 'Ordinary recovery does not upgrade')
  // Transactional v4 upgrade preserves existing assets and v1 schema on rollback.
  assert.throws(() => db.transaction(() => { enableIntakeRecoveryStorage(db); throw new Error('rollback') })())
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  const images = createImageToolsController({ host, onSaved() {} })
  const source = (await host.listAssets())[0]
  const input = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation!, assetId: source.id, options: { rotation: 90 as const, mirror: false, crop: 'original' as const, maxEdge: 640 } }
  const preview = await images.prepare('fixture', input)
  assert.match(preview.storageNotice!, /v4/)
  assert.equal(db.pragma('user_version', { simple: true }), 1, 'Variant preview/cancel does not upgrade')
  images.discard('fixture', preview.receipt)
  const next = await images.prepare('fixture', input)
  fault('BEFORE INSERT ON promotion_links')
  await assert.rejects(images.save('fixture', next.receipt)); clear()
  assert.equal(db.pragma('user_version', { simple: true }), 4)
  assertLibraryDataSchema(db)
  const variant = (await host.listIntakeRecovery()).items.find(i => i.kind === 'variant')!
  assert.ok(variant)
  assert.throws(() => db.prepare("UPDATE image_variant_intents SET metadata_json='{}'").run(), /IMMUTABLE/)
  const captureId = `capture-request:variant:${next.receipt}:1`
  const recordedDigest = db.prepare('SELECT source_generation FROM capture_requests WHERE capture_request_identity=?').get(captureId).source_generation
  db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run('sha256:' + '0'.repeat(64), captureId)
  await assert.rejects(host.runIntakeRecovery((await recovery(variant.id)).receipt), 'Capture bytes must match the durable variant intent')
  db.prepare('UPDATE capture_requests SET source_generation=? WHERE capture_request_identity=?').run(recordedDigest, captureId)
  // A new Host discovers the durable intent and restores its metadata, without rerunning image tools.
  db.close(); await host.close(); host = makeHost(); await host.open(); db = new Database(path.join(library, '.dam', 'library.sqlite'))
  const restored = await host.runIntakeRecovery((await recovery(variant.id)).receipt)
  assert.equal((await host.listAssets()).length, 4)
  const metadata = db.prepare('SELECT source_site_id,image_metadata_json FROM assets WHERE id=?').get(restored.assetId) as any
  assert.equal(metadata.source_site_id, 'image-tools')
  assert.equal(JSON.parse(metadata.image_metadata_json).recipe.rotation, 90)
  assert.equal((await host.listIntakeRecovery()).items.length, 0)
  assert.equal(db.prepare('SELECT state FROM image_variant_intents').get().state, 'completed')
  const secondTools = createImageToolsController({ host, onSaved() {} })
  const metadataReview = await secondTools.prepare('fixture', { ...input, generation: host.inspect().generation! })
  fault('BEFORE UPDATE OF image_metadata_json ON assets')
  await assert.rejects(secondTools.save('fixture', metadataReview.receipt)); clear()
  db.prepare('UPDATE assets SET title=?,file_name=? WHERE id=?').run('User title', 'User filename.png', `variant-asset:${metadataReview.receipt}`)
  await host.runIntakeRecovery((await recovery(`variant:${metadataReview.receipt}`)).receipt)
  const edited = db.prepare('SELECT title,file_name FROM assets WHERE id=?').get(`variant-asset:${metadataReview.receipt}`) as any
  assert.equal(edited.title, 'User title'); assert.equal(edited.file_name, 'User filename.png')
  assert.deepEqual(await Promise.all(files.map(digest)), before, 'All selected sources remain byte-for-byte intact')
  assertLibraryDataSchema(db)
  console.log('Intake recovery passed: Copy publication/reselection/preview/promotion, stale receipt/Trash, v4 rollback, variant metadata and new-Host recovery.')
} finally { clear(); db.close(); await host.close(); await fs.rm(root, { recursive: true, force: true }) }
