import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createManagedDownloads } from '../src/main/managed-download/managed-download'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-download-client-')))
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(root, 'library') }),
  selectLocalFiles: async () => ({ kind: 'cancelled' })
}))
let intakeFailure: unknown, imported = 0
const image = await sharp({ create: { width: 360, height: 240, channels: 3, background: '#d69a6b' } }).png().toBuffer()
const downloads = createManagedDownloads({
  host: { inspect: host.inspect, importDownloadedImage: async request => {
    try { return await host.importDownloadedImage(request) } catch (error) { intakeFailure = error; throw error }
  } }, history: { saveTask: () => undefined }, onImported: () => { imported++ },
  fetch: async () => new Response(image, { headers: { 'Content-Type': 'image/png', 'Content-Length': String(image.byteLength), ETag: '"fixture-v1"' } })
})
try {
  const create = await host.prepareCreate()
  assert.equal(create.kind, 'planned'); if (create.kind !== 'planned') throw Error('fixture create')
  await host.confirmCreate(create.plan.receipt)
  const plan = downloads.prepare({ url: 'https://fixture.invalid/test-image.png' })
  const job = downloads.run(plan.receipt)
  assert.ok('id' in job)
  for (let attempt = 0; attempt < 100 && ['queued', 'downloading', 'importing'].includes(downloads.list()[0].state); attempt++) await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(downloads.list()[0].state, 'completed', intakeFailure instanceof Error ? intakeFailure.message : 'formal intake must complete')
  assert.equal(imported, 1)
  assert.equal((await host.listAssets()).length, 1)
} finally { await downloads.drain(); await host.close() }
console.log('PASS managed download passes real production Copy intake and persisted library projection')
