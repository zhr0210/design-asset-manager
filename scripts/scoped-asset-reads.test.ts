import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { readAssets, readAssetContext } from '../src/main/library-lifecycle/active-library-asset-queries'
import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-scoped-assets-')))
const source = path.join(root, 'generated.png')
await sharp({ create: { width: 32, height: 24, channels: 3, background: '#227799' } }).png().toFile(source)
const library = path.join(root, 'library')
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] }) }))
const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw new Error('Fixture failed')
await host.confirmCreate(plan.plan.receipt)
const copy = await host.prepareAddAssets(); if (copy.kind !== 'planned') throw new Error('Fixture failed')
await host.dispatchAddAssets(copy.plan.receipt)
const db = new Database(path.join(library, '.dam', 'library.sqlite'))
try {
  const seed = (await host.listAssets())[0]
  const tag = await host.createTag({ name: 'Generated tag' }); await host.createTagAlias(tag.id, 'Generated alias'); await host.addTagToAsset(seed.id, tag.id)
  enableIntakeRecoveryStorage(db)
  const clone = (table: string) => {
    const row = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get() as Record<string, unknown>
    const keys = Object.keys(row)
    const insert = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
    return (overrides: Record<string, unknown>) => insert.run(...keys.map(key => key in overrides ? overrides[key] : row[key]))
  }
  const asset = clone('assets'), request = clone('capture_requests'), candidate = clone('asset_candidates'), promotion = clone('promotion_links'), lifecycle = clone('asset_lifecycle'), relation = clone('asset_tags')
  // Metadata-only scale fixture. These clones are not evidence of 10,000 real imported files.
  db.transaction(() => {
    for (let i = 0; i < 10000; i++) {
      const id = `asset:scale:${i}`, captureId = `capture:scale:${i}`, candidateId = `candidate:scale:${i}`
      asset({ id, title: `Synthetic ${i}`, file_name: `${i}.png` })
      request({ capture_request_identity: captureId, batch_identity: `batch:scale:${i}`, plan_item_identity: `item:scale:${i}`, candidate_identity: candidateId, original_storage_object_identity: `original:scale:${i}` })
      candidate({ candidate_identity: candidateId, capture_request_identity: captureId, original_storage_object_identity: `original:scale:${i}` })
      promotion({ promotion_link_identity: `promotion:scale:${i}`, candidate_identity: candidateId, design_asset_identity: id })
      lifecycle({ design_asset_identity: id })
      relation({ id: `tag:scale:${i}`, asset_id: id })
    }
  })()
  const selected = ['asset:scale:9999', seed.id, 'asset:missing']
  const startAll = performance.now(); const all = readAssets(db); const allMs = performance.now() - startAll
  const startSelected = performance.now(); const context = readAssetContext(db, selected); const selectedMs = performance.now() - startSelected
  assert.equal(all.length, 10001)
  assert.equal(context.schemaVersion, 4)
  assert.deepEqual([...context.assets].sort((a,b) => a.id.localeCompare(b.id)), all.filter(asset => selected.includes(asset.id)).sort((a,b) => a.id.localeCompare(b.id)))
  assert.deepEqual(context.assets[0].tagAliases, ['Generated alias'])
  assert.deepEqual(readAssetContext(db, []).assets, [])
  assert.equal(readAssetContext(db, [seed.id, seed.id]).assets.length, 1)
  assert.throws(() => readAssetContext(db, Array(501).fill(seed.id)))
  assert.throws(() => readAssetContext(db, ["' OR 1=1 --"]))
  // An unrelated invalid alias must not be parsed by a selected-asset action.
  const bad = await host.createTag({ name: 'Unrelated metadata' })
  await host.addTagToAsset('asset:scale:2', bad.id)
  db.prepare('UPDATE tags SET aliases=? WHERE id=?').run('{invalid fixture', bad.id)
  assert.equal((await host.readAssetContext([seed.id])).assets.length, 1)
  assert.throws(() => readAssets(db))
  db.prepare("UPDATE tags SET aliases='[]' WHERE id=?").run(bad.id)
  const selectedAsset = (await host.readAssetContext(['asset:scale:9999'])).assets[0]
  const trash = await host.prepareTrash({ designAssetIdentity: selectedAsset.id, expectedRevision: selectedAsset.revision })
  await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trash.plan.receipt })
  assert.equal((await host.readAssetContext(['asset:scale:9999'])).assets.length, 0)
  await host.close()
  await assert.rejects(host.readAssetContext([seed.id]))
  console.log(JSON.stringify({ result: 'passed', fixtureAssets: 10001, selectedReturned: 2, allMs: Number(allMs.toFixed(2)), selectedMs: Number(selectedMs.toFixed(2)), unrelatedMetadataExcluded: true, realLibrary: false }))
} finally { db.close(); await host.close(); await fs.rm(root, { recursive: true, force: true }) }
