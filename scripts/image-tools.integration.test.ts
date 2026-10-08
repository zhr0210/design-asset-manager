import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createImageToolsController } from '../src/main/image-tools/image-tools-controller'
import { ORIGINALS_DIRECTORY_NAME } from '../src/main/library-lifecycle/library-layout.internal'
import type { ImageToolOptions } from '../src/shared/contracts/image-tools.contract'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-image-tools-')))
const sourceFile = path.join(root, 'source.png')
const source = await sharp({ create: { width: 96, height: 64, channels: 4, background: '#ff0000' } }).composite([{ input: await sharp({ create: { width: 48, height: 64, channels: 4, background: '#0000ff' } }).png().toBuffer(), left: 48, top: 0 }]).png().toBuffer()
await fs.writeFile(sourceFile, source)
let selectedSources = [sourceFile]
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(root, 'library') }), selectLocalFiles: async () => ({ kind: 'selected', files: selectedSources.map(filePath => ({ filePath })) }) }))
let events = 0
const tools = createImageToolsController({ host, onSaved: () => events++ })
try {
  const create = await host.prepareCreate(); assert.equal(create.kind, 'planned')
  if (create.kind !== 'planned') throw new Error('fixture create failed')
  await host.confirmCreate(create.plan.receipt)
  const copy = await host.prepareAddAssets(); if (copy.kind !== 'planned') throw new Error('fixture copy failed')
  await host.dispatchAddAssets(copy.plan.receipt)
  const asset = (await host.listAssets())[0]
  await host.updateAssetCaption(asset.id, 'Preserve my description')
  const previewBefore = await host.readPreview(asset.id)
  const current = host.inspect()
  const scope = { libraryIdentity: current.identity!, generation: current.generation!, assetId: asset.id }
  const options: ImageToolOptions = { rotation: 90, mirror: false, crop: 'original', maxEdge: 1600 }
  await assert.rejects(tools.prepare('main', { ...scope, options: { ...options, maxEdge: 99999 } }))
  const rotated = await tools.prepare('main', { ...scope, options })
  assert.deepEqual([rotated.width, rotated.height], [64, 96], 'Rotate real pixels without enlarging the source preview.')
  assert.equal((await host.listAssets()).length, 1, 'Preview is not a saved Asset.')
  await assert.rejects(tools.save('card:other', rotated.receipt))
  tools.discard('main', rotated.receipt)
  await assert.rejects(tools.save('main', rotated.receipt))
  const mirrored = await tools.prepare('main', { ...scope, options: { ...options, rotation: 0, mirror: true } })
  const mirrorPixels = await sharp(mirrored.previewBytes).ensureAlpha().raw().toBuffer()
  assert.deepEqual([...mirrorPixels.subarray(0, 4)], [0, 0, 255, 255], 'Mirror must transform pixel content, not only CSS.')
  const square = await tools.prepare('main', { ...scope, options: { ...options, rotation: 0, crop: 'square', maxEdge: 64 } })
  assert.deepEqual([square.width, square.height], [64, 64])
  await assert.rejects(tools.save('main', mirrored.receipt), undefined, 'A newer preview revokes the previous recipe.')
  const saves = await Promise.allSettled([tools.save('main', square.receipt), tools.save('main', square.receipt)])
  assert.equal(saves.filter(item => item.status === 'fulfilled').length, 1)
  const saved = saves.find(item => item.status === 'fulfilled')
  if (!saved || saved.status !== 'fulfilled') throw new Error('fixture save failed')
  const variant = (await host.listAssets()).find(item => item.id === saved.value.assetId)!
  assert.equal(variant.width, 64); assert.equal(variant.height, 64); assert.equal(variant.sourceSiteId, 'image-tools'); assert.equal(variant.aiCaption, '')
  assert.equal(events, 1)
  assert.equal(Buffer.from(await host.readPreview(asset.id)).equals(Buffer.from(previewBefore)), true)
  assert.equal((await fs.readFile(sourceFile)).equals(source), true)
  assert.equal((await host.listAssets()).find(item => item.id === asset.id)?.aiCaption, 'Preserve my description')
  // A large four-quadrant original proves input resolution and post-transform coordinates.
  const block = (color: string) => sharp({ create: { width: 1600, height: 1000, channels: 4, background: color } }).png().toBuffer()
  const large = await sharp({ create: { width: 3200, height: 2000, channels: 4, background: '#ff0000' } }).composite([
    { input: await block('#0000ff'), left: 1600, top: 0 },
    { input: await block('#00ff00'), left: 0, top: 1000 },
    { input: await block('#ffff00'), left: 1600, top: 1000 }
  ]).png().toBuffer()
  const largePath = path.join(root, 'large-original.png'); await fs.writeFile(largePath, large)
  selectedSources = [largePath]
  const largeCopy = await host.prepareAddAssets(); if (largeCopy.kind !== 'planned') throw new Error('large fixture plan failed')
  await host.dispatchAddAssets(largeCopy.plan.receipt)
  const largeAsset = (await host.listAssets()).find(item => item.fileName === 'large-original.png')!
  const largeScope = { ...scope, assetId: largeAsset.id }
  const originalOptions: ImageToolOptions = { rotation: 0, mirror: false, crop: 'original', maxEdge: 8192, source: 'original' }
  const oldRequest = await tools.prepare('main', { ...largeScope, options: { ...options, rotation: 0 } })
  assert.deepEqual([oldRequest.width, oldRequest.height, oldRequest.source], [1600, 1000, 'preview'])
  const wholeOriginal = await tools.prepare('main', { ...largeScope, options: originalOptions })
  assert.deepEqual([wholeOriginal.width, wholeOriginal.height, wholeOriginal.sourceWidth, wholeOriginal.sourceHeight], [3200, 2000, 3200, 2000])
  assert.equal(wholeOriginal.source, 'original')
  const fullSaved = await tools.save('main', wholeOriginal.receipt)
  assert.equal((await host.listAssets()).find(item => item.id === fullSaved.assetId)!.width, 3200)
  assert.equal((await fs.readFile(largePath)).equals(large), true)
  const upperRight = { left: 0.5, top: 0, width: 0.5, height: 0.5 }
  const cropped = await tools.prepare('main', { ...largeScope, options: { ...originalOptions, cropRect: upperRight } })
  assert.deepEqual([cropped.width, cropped.height], [1600, 1000])
  const firstPixel = async (bytes: Uint8Array) => [...(await sharp(bytes).ensureAlpha().raw().toBuffer()).subarray(0, 4)]
  assert.deepEqual(await firstPixel(cropped.previewBytes), [0, 0, 255, 255])
  const orientedCrop = await tools.prepare('main', { ...largeScope, options: { ...originalOptions, rotation: 90, mirror: true, cropRect: { left: 0, top: 0, width: 0.5, height: 0.5 } } })
  assert.deepEqual([orientedCrop.width, orientedCrop.height], [1000, 1600])
  assert.deepEqual(await firstPixel(orientedCrop.previewBytes), [255, 0, 0, 255], 'Clockwise rotation followed by mirror puts original top-left red in the top-left crop.')
  for (const bad of [
    { left: -0.1, top: 0, width: 0.5, height: 1 }, { left: 0.9, top: 0, width: 0.2, height: 1 },
    { left: 0, top: 0, width: 0, height: 1 }, { left: 0, top: NaN, width: 1, height: 1 },
    { left: 0, top: 0, width: 1, height: Infinity }
  ]) await assert.rejects(tools.prepare('main', { ...largeScope, options: { ...originalOptions, cropRect: bad } }))
  await assert.rejects(tools.prepare('main', { ...largeScope, options: { ...originalOptions, crop: 'square', cropRect: upperRight } }))
  await assert.rejects(tools.prepare('main', { ...largeScope, options: { ...originalOptions, source: 'preview' } }))
  await assert.rejects(tools.prepare('main', { ...largeScope, sourceIdentity: 'renderer-cannot-supply', options: originalOptions } as any))

  // Source ownership and a file identity change after review invalidate Original saves.
  const fixtureDb = new Database(path.join(root, 'library', '.dam', 'library.sqlite'))
  const managedRef = fixtureDb.prepare('SELECT c.managed_original_ref AS ref FROM asset_candidates c JOIN promotion_links p ON p.candidate_identity=c.candidate_identity WHERE p.design_asset_identity=?').get(largeAsset.id) as { ref: string }
  const managedPath = path.join(root, 'library', ORIGINALS_DIRECTORY_NAME, managedRef.ref.slice('managed-original:'.length))
  const reviewed = await tools.prepare('main', { ...largeScope, options: originalOptions })
  const originalBytes = await fs.readFile(managedPath)
  await fs.writeFile(managedPath, Buffer.from('changed synthetic original'))
  await assert.rejects(tools.prepare('other', { ...largeScope, options: originalOptions }))
  await fs.writeFile(managedPath, originalBytes)
  await assert.rejects(tools.save('main', reviewed.receipt), undefined, 'Restoring bytes does not restore the frozen file identity.')
  const backup = managedPath + '.fixture-backup'
  await fs.rename(managedPath, backup)
  try {
    await fs.symlink(largePath, managedPath)
    await assert.rejects(tools.prepare('other', { ...largeScope, options: originalOptions }))
  } finally { await fs.unlink(managedPath); await fs.rename(backup, managedPath) }
  fixtureDb.prepare("UPDATE asset_lifecycle SET ownership='referenced' WHERE design_asset_identity=?").run(largeAsset.id)
  try { await assert.rejects(tools.prepare('other', { ...largeScope, options: originalOptions })) }
  finally { fixtureDb.prepare("UPDATE asset_lifecycle SET ownership='managed' WHERE design_asset_identity=?").run(largeAsset.id); fixtureDb.close() }

  let releaseRead!: () => void; let readStarted!: () => void
  const started = new Promise<void>(resolve => { readStarted = resolve })
  const gate = new Promise<void>(resolve => { releaseRead = resolve })
  const serialTools = createImageToolsController({ host: { ...host, readManagedOriginal: async (...args) => { readStarted(); await gate; return host.readManagedOriginal(...args) } }, onSaved: () => {} })
  const pendingOriginal = serialTools.prepare('first', { ...largeScope, options: originalOptions })
  await started
  await assert.rejects(serialTools.prepare('second', { ...largeScope, options: originalOptions }), /另一项原件/)
  serialTools.invalidate(); releaseRead()
  await assert.rejects(pendingOriginal)
  serialTools.invalidate()
  const exifPath = path.join(root, 'oriented.jpg')
  await sharp(source).jpeg().withMetadata({ orientation: 6 }).toFile(exifPath)
  selectedSources = [exifPath]
  const exifCopy = await host.prepareAddAssets(); if (exifCopy.kind !== 'planned') throw new Error('EXIF fixture plan failed')
  await host.dispatchAddAssets(exifCopy.plan.receipt)
  const exifAsset = (await host.listAssets()).find(item => item.fileName === 'oriented.jpg')!
  const exifReview = await tools.prepare('main', { ...scope, assetId: exifAsset.id, options: originalOptions })
  assert.deepEqual([exifReview.sourceWidth, exifReview.sourceHeight, exifReview.width, exifReview.height], [64, 96, 64, 96])
  tools.discard('main', exifReview.receipt)
  const revoked = await tools.prepare('card:old', { ...scope, options }); tools.discardOwner('card:old')
  await assert.rejects(tools.save('card:old', revoked.receipt))
  const stale = await tools.prepare('main', { ...scope, options })
  const trash = await host.prepareTrash({ designAssetIdentity: asset.id, expectedRevision: asset.revision })
  assert.equal(trash.kind, 'planned')
  if (trash.kind === 'planned') await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trash.plan.receipt })
  await assert.rejects(tools.save('main', stale.receipt))
  tools.invalidate(); await host.close(); await host.reopen()
  assert.equal((await host.listAssets()).find(item => item.id === variant.id)?.width, 64)
  await host.close()
  const db = new Database(path.join(root, 'library', '.dam', 'library.sqlite'), { readonly: true })
  try {
    const row = db.prepare('SELECT image_metadata_json AS metadata FROM assets WHERE id=?').get(variant.id) as { metadata: string }
    assert.equal(JSON.parse(row.metadata).sourceAssetId, asset.id)
    assert.equal(JSON.parse(row.metadata).kind, 'controlled-preview-variant')
    const fullMetadata = db.prepare('SELECT image_metadata_json AS metadata FROM assets WHERE id=?').get(fullSaved.assetId) as { metadata: string }
    assert.equal(JSON.parse(fullMetadata.metadata).kind, 'managed-original-variant')
    assert.equal(JSON.parse(fullMetadata.metadata).recipe.source, 'original')
  } finally { db.close() }
  console.log('Image tools passed: legacy previews, full-resolution originals, free crop coordinates, EXIF, source identity/hash/ownership, concurrency, one-shot copies and reopen.')
} finally { tools.invalidate(); await host.close() }
