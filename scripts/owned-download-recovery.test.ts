import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createSqliteCapturePromotionLifecycleSink } from '../src/main/capture-intake/sqlite-asset-lifecycle.adapter'
import { CONTROL_DIRECTORY_NAME, ORIGINALS_DIRECTORY_NAME, PREVIEW_DIRECTORY_NAME, STAGING_DIRECTORY_NAME } from '../src/main/library-lifecycle/library-layout.internal'
import { createManagedOriginalName, MANAGED_ORIGINAL_BUCKET } from '../src/main/capture-intake/capture-storage-names'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-owned-recovery-')))
const library = path.join(root, 'library')
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'cancelled' }) }))
const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw new Error('fixture create failed')
await host.confirmCreate(plan.plan.receipt)
const db = new Database(path.join(library, CONTROL_DIRECTORY_NAME, 'library.sqlite'))
const bytes = await sharp({ create: { width: 96, height: 64, channels: 4, background: '#4488cc' } }).png().toBuffer()
const input = (requestId: string) => ({ requestId, generation: host.inspect().generation!, fileName: `${requestId}.png`, sourceUrl: `https://fixture.invalid/${requestId}.png`, bytes })
const stage = (id: string) => path.join(library, CONTROL_DIRECTORY_NAME, STAGING_DIRECTORY_NAME, `download-${id}.png`)
const original = (id: string) => path.join(library, ORIGINALS_DIRECTORY_NAME, MANAGED_ORIGINAL_BUCKET, createManagedOriginalName(`download-${id}.png`, 'png', `original-storage-object:download:${id}:1`))
const recover = (id: string) => host.recoverDownloadedImage(input(id))
const createFault = (sql: string) => db.exec(`CREATE TRIGGER fixture_failure ${sql} BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END`)
const clearFault = () => db.exec('DROP TRIGGER IF EXISTS fixture_failure')
const expectRecovery = (promise: Promise<unknown>) => assert.rejects(promise, (error: any) => error?.code === 'library-recovery-required')
try {
  // Accepted request, no published Original yet: use only the verified owned staging.
  const bucket = path.join(library, ORIGINALS_DIRECTORY_NAME, MANAGED_ORIGINAL_BUCKET)
  await fs.writeFile(bucket, 'fixture blocker')
  await expectRecovery(host.importDownloadedImage(input('before-publication')))
  await fs.unlink(bucket)
  const first = await recover('before-publication')
  assert.equal(first.assetId, 'download-asset:before-publication')
  assert.equal((await fs.readFile(original('before-publication'))).equals(bytes), true)
  await assert.rejects(fs.stat(stage('before-publication')), { code: 'ENOENT' })

  // Published Original but failed activation: recovery must not overwrite the existing file.
  createFault('BEFORE UPDATE OF managed_original_ref ON asset_candidates')
  await expectRecovery(host.importDownloadedImage(input('activation')))
  clearFault()
  const originalBefore = await fs.stat(original('activation'), { bigint: true })
  const second = await recover('activation')
  const originalAfter = await fs.stat(original('activation'), { bigint: true })
  assert.equal(originalAfter.ino, originalBefore.ino); assert.equal(originalAfter.mtimeNs, originalBefore.mtimeNs)
  assert.equal((await host.listAssets()).length, 2)
  assert.deepEqual(await recover('activation'), second)
  assert.equal((await host.listAssets()).length, 2)

  // Preview failure leaves an activated candidate. Existing files and all other assets survive.
  const previews = path.join(library, CONTROL_DIRECTORY_NAME, PREVIEW_DIRECTORY_NAME)
  const previewBackup = path.join(root, 'preview-fixture-backup')
  await fs.rename(previews, previewBackup); await fs.writeFile(previews, 'fixture blocker')
  try { await expectRecovery(host.importDownloadedImage(input('preview'))) }
  finally { await fs.unlink(previews); await fs.rename(previewBackup, previews) }
  await recover('preview')
  assert.equal((await host.listAssets()).length, 3)

  // Promotion retry uses one deterministic recovery preview; it does not accumulate a file per retry.
  createFault('BEFORE INSERT ON promotion_links')
  await expectRecovery(host.importDownloadedImage(input('promotion')))
  const beforeOrdinaryReplay = await fs.readdir(previews)
  await expectRecovery(host.importDownloadedImage(input('promotion')))
  assert.deepEqual(await fs.readdir(previews), beforeOrdinaryReplay, 'Ordinary replay must not implicitly resume a partial Capture.')
  await expectRecovery(recover('promotion'))
  const previewsAfterFirstRetry = await fs.readdir(previews)
  await expectRecovery(recover('promotion'))
  assert.deepEqual(await fs.readdir(previews), previewsAfterFirstRetry)
  clearFault(); await recover('promotion')
  assert.equal((await host.listAssets()).length, 4)

  // Metadata finalization can fail after Promotion. Preserve edits and do not promote twice.
  createFault('BEFORE UPDATE OF image_metadata_json ON assets')
  await expectRecovery(host.importDownloadedImage(input('metadata')))
  clearFault()
  const metadataAsset = (await host.listAssets()).find(asset => asset.id === 'download-asset:metadata')!
  await host.updateAssetCaption(metadataAsset.id, 'Keep this user description')
  const tag = await host.createTag({ name: 'Keep this tag' }); await host.addTagToAsset(metadataAsset.id, tag.id)
  await recover('metadata')
  assert.equal((await host.listAssets()).length, 5)
  assert.equal((await host.listAssets()).find(asset => asset.id === metadataAsset.id)!.aiCaption, 'Keep this user description')
  assert.equal((await host.listAssetTags(metadataAsset.id))[0].tagId, tag.id)
  await assert.rejects(fs.stat(stage('metadata')), { code: 'ENOENT' })
  db.prepare("UPDATE assets SET title='User title',file_name='User file.png' WHERE id=?").run(metadataAsset.id)
  await recover('metadata')
  assert.equal((await host.listAssets()).find(asset => asset.id === metadataAsset.id)!.title, 'User title')

  // Corrupted or linked staging is retained and never replaced by a download or another local file.
  createFault('BEFORE UPDATE OF managed_original_ref ON asset_candidates')
  await expectRecovery(host.importDownloadedImage(input('corruption')))
  clearFault()
  await fs.writeFile(stage('corruption'), 'changed fixture bytes')
  await assert.rejects(recover('corruption'))
  assert.equal((await fs.readFile(stage('corruption'))).toString(), 'changed fixture bytes')
  await fs.unlink(stage('corruption')); await fs.symlink(original('corruption'), stage('corruption'))
  await assert.rejects(recover('corruption'))
  assert.equal((await fs.lstat(stage('corruption'))).isSymbolicLink(), true)
  await fs.unlink(stage('corruption'))
  // Missing input staging can be reconstructed from the independently verified published Original.
  await recover('corruption')
  assert.equal((await host.listAssets()).length, 6)

  // A conflicting Original is never overwritten, even when staging is intact.
  createFault('BEFORE UPDATE OF managed_original_ref ON asset_candidates')
  await expectRecovery(host.importDownloadedImage(input('original-conflict')))
  clearFault()
  db.transaction(() => {
    db.prepare("INSERT INTO assets(id,title,file_name,file_path,thumbnail_path,source_site_id,source_site_name,created_at,updated_at) VALUES(?,'Do not overwrite','sentinel.png','','','fixture','fixture',?,?)").run('download-asset:original-conflict', new Date().toISOString(), new Date().toISOString())
    createSqliteCapturePromotionLifecycleSink(db, () => 'revision:sentinel').registerPromotedAsset({ designAssetIdentity: 'download-asset:original-conflict', ownership: 'managed', committedAt: new Date().toISOString() })
  })()
  await assert.rejects(recover('original-conflict'))
  assert.equal((db.prepare('SELECT title FROM assets WHERE id=?').get('download-asset:original-conflict') as { title: string }).title, 'Do not overwrite')
  db.prepare('DELETE FROM asset_lifecycle WHERE design_asset_identity=?').run('download-asset:original-conflict')
  db.prepare('DELETE FROM assets WHERE id=?').run('download-asset:original-conflict')
  await fs.writeFile(original('original-conflict'), 'conflicting fixture')
  await assert.rejects(recover('original-conflict'))
  assert.equal((await fs.readFile(original('original-conflict'))).toString(), 'conflicting fixture')
  assert.equal((await host.listAssets()).length, 6)

  createFault('BEFORE UPDATE OF managed_original_ref ON asset_candidates')
  await expectRecovery(host.importDownloadedImage(input('missing-files')))
  clearFault()
  await fs.unlink(stage('missing-files')); await fs.unlink(original('missing-files'))
  await assert.rejects(recover('missing-files'))
  assert.equal((await host.listAssets()).length, 6)

  // No ledger, other Library metadata, stale generation and trashed results are not recoverable.
  await assert.rejects(recover('unknown'))
  await assert.rejects(host.recoverDownloadedImage({ ...input('activation'), generation: 'generation:stale' }))
  const priorLibrary = db.prepare('SELECT active_library_identity AS id FROM capture_requests WHERE capture_request_identity=?').get('capture-request:download:original-conflict:1') as { id: string }
  db.prepare('UPDATE capture_requests SET active_library_identity=? WHERE capture_request_identity=?').run('library:other', 'capture-request:download:original-conflict:1')
  await assert.rejects(recover('original-conflict'))
  db.prepare('UPDATE capture_requests SET active_library_identity=? WHERE capture_request_identity=?').run(priorLibrary.id, 'capture-request:download:original-conflict:1')
  const asset = (await host.listAssets()).find(asset => asset.id === second.assetId)!
  const trash = await host.prepareTrash({ designAssetIdentity: asset.id, expectedRevision: asset.revision })
  if (trash.kind !== 'planned') throw new Error('fixture trash plan failed')
  await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trash.plan.receipt })
  await assert.rejects(recover('activation'))
  assert.equal((await host.listAssets()).length, 5)
  assert.equal((await fs.readFile(original('activation'))).equals(bytes), true)
  await host.close(); await host.reopen()
  assert.equal((await host.listAssets()).length, 5)
  for (const format of ['jpeg', 'webp'] as const) {
    const encoded = await sharp(bytes)[format]().toBuffer()
    const spec = { ...input(`metadata-${format}`), fileName: `recovered.${format}`, bytes: encoded }
    createFault('BEFORE UPDATE OF image_metadata_json ON assets')
    await expectRecovery(host.importDownloadedImage(spec)); clearFault()
    const recovered = await host.recoverDownloadedImage(spec)
    assert.equal((await sharp(await host.readPreview(recovered.assetId)).metadata()).format, format)
  }
  console.log('Owned download recovery passed: publication/activation/preview/promotion/metadata faults, stable retries, preserved edits, corrupt/link/missing files, no duplicates, scope and Trash boundaries.')
} finally { clearFault(); db.close(); await host.close() }
