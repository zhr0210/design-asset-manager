import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { CONTROL_DIRECTORY_NAME, STAGING_DIRECTORY_NAME } from '../src/main/library-lifecycle/library-layout.internal'
import { initializeLibraryDataSchema, assertLibraryDataSchema } from '../src/main/library-lifecycle/library-materialization.internal'
import { initializeLibraryControlStore } from '../src/main/library-lifecycle/library-open-control-store.internal'
import { enableDownloadJournal } from '../src/main/managed-download/download-journal.schema'
import { enableVisualAiStorage } from '../src/main/visual-ai/visual-ai-storage'
import { createManagedDownloads } from '../src/main/managed-download/managed-download'
import type { DownloadJournalOperation, DownloadIntent } from '../src/shared/contracts/download-journal.contract'

const childRoot = process.env.DAM_DOWNLOAD_RESTART_FIXTURE
if (childRoot) {
  const root = await fs.realpath(childRoot)
  assert.ok(path.basename(root).startsWith('dam-download-restart-'))
  const library = path.join(root, 'library')
  const bytes = await fs.readFile(path.join(root, 'generated.png'))
  const changedBytes = await sharp({ create: { width: 48, height: 32, channels: 3, background: '#445566' } }).png().toBuffer()
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'cancelled' }) }))
  const first = process.env.DAM_DOWNLOAD_RESTART_PHASE === 'first'
  if (first) { const plan = await host.prepareCreate(); assert.equal(plan.kind, 'planned'); if (plan.kind === 'planned') await host.confirmCreate(plan.plan.receipt) }
  else await host.open()
  const generation = host.inspect().generation!
  const journal = (cmd: DownloadJournalOperation) => host.downloadJournal({ ...cmd, generation })
  const db = new Database(path.join(library, CONTROL_DIRECTORY_NAME, 'library.sqlite'))
  let requests = 0
  const split = Math.floor(bytes.length / 2)
  const executor = createManagedDownloads({ host, history: { saveTask() {} }, onImported() {}, fetch: (async (_url, init) => {
    requests++
    if (first) {
      let reads = 0
      return new Response(new ReadableStream({ pull(controller) { if (!reads++) controller.enqueue(bytes.subarray(0, split)); else controller.error(new Error('synthetic disconnect')) } }), { headers: { etag: '"fixture-v1"', 'content-length': String(bytes.length) } })
    }
    assert.equal((init!.headers as Record<string, string>).Range, `bytes=${split}-`)
    assert.equal((init!.headers as Record<string, string>)['If-Range'], '"fixture-v1"')
    if (String(_url).endsWith('/changed.png')) return new Response(changedBytes, { headers: { etag: '"fixture-v2"', 'content-length': String(changedBytes.length) } })
    return new Response(bytes.subarray(split), { status: 206, headers: { etag: '"fixture-v1"', 'content-length': String(bytes.length - split), 'content-range': `bytes ${split}-${bytes.length - 1}/${bytes.length}` } })
  }) as typeof fetch })
  try {
    if (first) {
      executor.prepare({ url: 'https://fixture.invalid/memory.png' })
      const review = await executor.prepare({ url: 'https://fixture.invalid/network.png', persistence: 'library' })
      assert.equal(review.upgradesLibrary, true)
      assert.equal(db.pragma('user_version', { simple: true }), 1, 'Preparation/cancellation is read-only')
      assert.equal(requests, 0)
      const task = executor.run(review.receipt)
      await until(() => executor.list().some(t => t.id === task.id && t.state === 'failed'))
      await executor.drain()
      assert.equal(db.pragma('user_version', { simple: true }), 3)
      assertLibraryDataSchema(db)
      const saved = (await journal({ kind: 'read', taskId: task.id })).intent!
      assert.equal(saved.committed_bytes, split)
      const changedReview = await executor.prepare({ url: 'https://fixture.invalid/changed.png', persistence: 'library' })
      const changedTask = executor.run(changedReview.receipt)
      await until(() => executor.list().some(t => t.id === changedTask.id && t.state === 'failed'))
      await executor.drain()
      await fs.writeFile(path.join(root, 'task.json'), JSON.stringify({ id: task.id, changedId: changedTask.id, receipt: review.receipt }))
      // Complete bytes before Capture and a second interrupted Capture both survive process exit.
      for (const id of ['local-ready', 'local-capture']) {
        let intent = (await journal({ kind: 'create', taskId: id, url: `https://fixture.invalid/${id}.png`, fileName: `${id}.png` })).intent!
        intent = (await journal({ kind: 'reset', taskId: id, revision: intent.revision, etag: null, total: bytes.length })).intent!
        intent = (await journal({ kind: 'append', taskId: id, revision: intent.revision, epoch: intent.transfer_epoch, offset: 0, bytes })).intent!
        intent = (await journal({ kind: 'downloaded', taskId: id, revision: intent.revision })).intent!
        if (id === 'local-capture') {
          db.exec("CREATE TRIGGER fixture_failure BEFORE INSERT ON promotion_links BEGIN SELECT RAISE(ABORT,'synthetic'); END")
          await assert.rejects(journal({ kind: 'import', taskId: id, revision: intent.revision }))
          db.exec('DROP TRIGGER fixture_failure')
        }
      }
      const tag = await host.createTag({ name: 'Preserve on restart' })
      assert.ok(tag.id)
    } else {
      assert.equal(db.pragma('user_version', { simple: true }), 3)
      assertLibraryDataSchema(db)
      enableVisualAiStorage(db); assert.equal(db.pragma('user_version', { simple: true }), 3)
      const saved = JSON.parse(await fs.readFile(path.join(root, 'task.json'), 'utf8'))
      assert.throws(() => executor.run(saved.receipt))
      await executor.discover()
      assert.equal(executor.list().length, 4)
      assert.equal(requests, 0, 'Opening/discovering must never request network')
      assert.throws(() => executor.retry(saved.id), /确认/)
      const stale = await executor.prepare({ resumeTaskId: saved.id })
      db.prepare('UPDATE managed_download_intents SET revision=revision+1 WHERE task_id=?').run(saved.id)
      executor.run(stale.receipt)
      await until(() => executor.list().some(t => t.id === saved.id && t.state === 'failed'))
      assert.equal(requests, 0, 'Stale checkpoint review cannot authorize network')
      await assert.rejects(executor.prepare({ resumeTaskId: 'arbitrary-app-history-id' }))
      for (const id of ['local-ready', 'local-capture', saved.id, saved.changedId]) {
        const review = await executor.prepare({ resumeTaskId: id })
        assert.equal(review.recovery, id.startsWith('local-') ? 'local' : 'network')
        executor.run(review.receipt)
        await until(() => executor.list().some(t => t.id === id && ['completed', 'failed', 'recovery-required'].includes(t.state)))
        assert.equal(executor.list().find(t => t.id === id)?.state, 'completed')
      }
      assert.equal(requests, 2)
      assert.equal((await host.listAssets()).length, 4)
      assert.equal((await host.listTags()).length, 1)
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assets WHERE source_site_id='web-download' AND original_url LIKE 'https://fixture.invalid/%'").get().n, 4)
      assert.equal(db.prepare("SELECT COUNT(*) AS n FROM managed_download_intents WHERE phase='completed'").get().n, 4)
      await executor.drain()
      const changed = db.prepare('SELECT transfer_epoch,committed_bytes,content_sha256 FROM managed_download_intents WHERE task_id=?').get(saved.changedId)
      assert.equal(changed.transfer_epoch, 2)
      assert.equal(changed.committed_bytes, changedBytes.length)
      assert.equal(db.prepare('SELECT width,height FROM assets WHERE id=?').get(`download-asset:${saved.changedId}`).width, 48)
      const asset = (await host.listAssets())[0]
      await host.updateAssetCaption(asset.id, 'User description survives v3 AI')
      await host.saveVisualAiEvidence({ id: 'v3-evidence', assetId: asset.id, assetRevision: asset.revision, previewGeneration: asset.thumbnailRef, inputSha256: 'synthetic', backendId: 'synthetic', providerOrigin: 'https://fixture.invalid', model: 'synthetic', purpose: 'analyze', inputScope: 'controlled-preview-rgb', recipe: 'visual-ai-v1', createdAt: new Date().toISOString(), output: { caption: 'AI caption', ocrText: 'V3 OCR', prompt: '', tags: [] } })
      assert.equal((await host.listVisualAiEvidence(asset.id))[0].id, 'v3-evidence')
      const projected = (await host.listAssets()).find(item => item.id === asset.id)!
      assert.equal(projected.aiCaption, 'User description survives v3 AI')
      assert.equal(projected.aiOcrText, 'V3 OCR')
      const trash = await host.prepareTrash({ designAssetIdentity: asset.id, expectedRevision: asset.revision })
      await host.dispatchTrash({ kind: 'confirm-plan', planReceipt: trash.plan.receipt })
      await assert.rejects(executor.prepare({ resumeTaskId: asset.id.replace('download-asset:', '') }))
      assert.equal((await host.listAssets()).length, 3, 'Completed tasks cannot resurrect Trash')
    }
  } finally { await executor.drain(); db.close(); await host.close() }
  console.log(`persistent download process ${first ? 'one' : 'two'} passed`)
} else {
  await verifyJournalFaults()
  // Real v1/v2 schema transaction rollback, data/AI preservation, exact schema and unknown version refusal.
  for (const version of [1, 2]) {
    const db = new Database(':memory:'); db.pragma('foreign_keys = ON')
    initializeLibraryControlStore(db, { lineageIdentity: 'lineage:test', libraryIdentity: 'library:test', controlStoreIdentity: 'control:test', generation: 'generation:test', managedOriginalsRelativePath: 'originals' })
    initializeLibraryDataSchema(db)
    if (version === 2) enableVisualAiStorage(db)
    const before = db.prepare("SELECT type,name,sql FROM sqlite_schema ORDER BY name").all()
    assert.throws(() => db.transaction(() => { enableDownloadJournal(db); throw new Error('cancel transaction') })())
    assert.equal(db.pragma('user_version', { simple: true }), version)
    assert.deepEqual(db.prepare("SELECT type,name,sql FROM sqlite_schema ORDER BY name").all(), before)
    enableDownloadJournal(db); assertLibraryDataSchema(db)
    db.pragma('user_version = 5'); assert.throws(() => assertLibraryDataSchema(db)); db.close()
  }
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-download-restart-')))
  try {
    const pixels = Buffer.alloc(256 * 256 * 3)
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 31 + (i >> 8) * 97) % 256
    await sharp(pixels, { raw: { width: 256, height: 256, channels: 3 } }).png().toFile(path.join(root, 'generated.png'))
    for (const phase of ['first', 'second']) await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, DAM_DOWNLOAD_RESTART_FIXTURE: root, DAM_DOWNLOAD_RESTART_PHASE: phase }, stdio: 'inherit' })
      child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`child ${phase} exited ${code}`)))
    })
    console.log('persistent-download: schema and actual process restart passed')
  } finally { await fs.rm(root, { recursive: true, force: true }) }
}
async function until(predicate: () => boolean) {
  const end = Date.now() + 10000
  while (!predicate()) { if (Date.now() > end) throw new Error('Synthetic download did not settle'); await new Promise(resolve => setTimeout(resolve, 20)) }
}

async function verifyJournalFaults() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-download-journal-faults-')))
  const library = path.join(root, 'library')
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'cancelled' }) }))
  const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw new Error('fixture failed')
  await host.confirmCreate(plan.plan.receipt)
  const db = new Database(path.join(library, CONTROL_DIRECTORY_NAME, 'library.sqlite'))
  const dir = path.join(library, CONTROL_DIRECTORY_NAME, STAGING_DIRECTORY_NAME, 'download-recovery')
  const generation = host.inspect().generation!
  const command = (cmd: DownloadJournalOperation) => host.downloadJournal({ ...cmd, generation })
  const read = () => command({ kind: 'read', taskId: 'faults' })
  const data = Buffer.from('generated synthetic byte sequence')
  try {
    let row = (await command({ kind: 'create', taskId: 'faults', url: 'https://fixture.invalid/test.png', fileName: 'test.png' })).intent!
    for (const field of ['task_id', 'library_identity', 'creation_generation', 'request_url', 'file_name']) assert.throws(() => db.prepare(`UPDATE managed_download_intents SET ${field}='changed'`).run(), /IMMUTABLE/)
    await assert.rejects(host.downloadJournal({ kind: 'read', taskId: 'faults', generation: 'stale' }))
    await assert.rejects(command({ kind: 'read', taskId: 'not-in-this-library' }))
    row = (await command({ kind: 'reset', taskId: 'faults', revision: row.revision, etag: '"v1"', total: data.length * 2 })).intent!
    const append = (revision = row.revision, epoch = row.transfer_epoch, offset = row.committed_bytes, bytes = data) => command({ kind: 'append', taskId: 'faults', revision, epoch, offset, bytes })
    await assert.rejects(append(row.revision - 1))
    await assert.rejects(append(row.revision, row.transfer_epoch - 1))
    await assert.rejects(append(row.revision, row.transfer_epoch, 1))
    await assert.rejects(append(row.revision, row.transfer_epoch, 0, Buffer.alloc(1024 * 1024 + 1)))
    // Bytes are durable before DB publication; DB failure leaves an unreferenced file and offset zero.
    db.exec("CREATE TRIGGER fixture_fault BEFORE INSERT ON managed_download_chunks BEGIN SELECT RAISE(ABORT,'fixture'); END")
    await assert.rejects(append()); db.exec('DROP TRIGGER fixture_fault')
    assert.equal((await read()).intent!.committed_bytes, 0)
    const unpublished = (await fs.readdir(dir))[0]
    assert.ok(unpublished)
    row = (await append()).intent!
    assert.equal(row.committed_bytes, data.length)
    assert.equal((await read()).bytes!.length, data.length)
    assert.equal((await fs.readdir(dir)).length, 2, 'Retransmitting an unpublished tail must not overwrite or get stuck on it')
    const published = db.prepare('SELECT chunk_identity FROM managed_download_chunks WHERE task_id=?').get('faults').chunk_identity
    const file = path.join(dir, published)
    await fs.writeFile(file, Buffer.alloc(data.length, 65))
    await assert.rejects(read()); await fs.writeFile(file, data)
    const external = path.join(root, 'synthetic-external'); await fs.writeFile(external, data)
    await fs.unlink(file); await fs.symlink(external, file); await assert.rejects(read()); await fs.unlink(file)
    await fs.link(external, file); await assert.rejects(read()); await fs.unlink(file); await fs.writeFile(file, data)
    row = (await command({ kind: 'reset', taskId: 'faults', revision: row.revision, etag: '"v2"', total: data.length })).intent!
    assert.equal((await read()).bytes!.length, 0, 'Old epoch never becomes a new-version prefix')
    await command({ kind: 'cleanup', taskId: 'faults', revision: row.revision })
    assert.deepEqual(await fs.readdir(dir), [unpublished], 'Only known retired chunks are removed')
    assert.deepEqual(await fs.readFile(external), data)
    // Sparse unknown owned file counts against quota; no eviction to make room.
    const quotaFile = path.join(dir, 'unknown-fixture-budget')
    const large = await fs.open(quotaFile, 'wx'); await large.truncate(256 * 1024 * 1024); await large.close()
    await assert.rejects(append(), /空间已满/)
    assert.equal((await read()).intent!.committed_bytes, 0)
    await fs.unlink(quotaFile)
    row = (await append()).intent!
    row = (await command({ kind: 'downloaded', taskId: 'faults', revision: row.revision })).intent!
    assert.ok(row.content_sha256)
    await assert.rejects(command({ kind: 'reset', taskId: 'faults', revision: row.revision, etag: '"v3"', total: data.length }))
    assertLibraryDataSchema(db)
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#334455' } }).png().toBuffer()
    await host.importDownloadedImage({ requestId: 'collision', generation, fileName: 'old.png', sourceUrl: 'https://fixture.invalid/old.png', bytes: png })
    db.prepare("UPDATE assets SET title='Keep user title' WHERE id='download-asset:collision'").run()
    // Deliberately corrupt only this synthetic ledger to exercise refusal, never repair it.
    db.pragma('foreign_keys = OFF')
    db.prepare("DELETE FROM capture_requests WHERE capture_request_identity='capture-request:download:collision:1'").run()
    db.pragma('foreign_keys = ON')
    let collision = (await command({ kind: 'create', taskId: 'collision', url: 'https://fixture.invalid/new.png', fileName: 'new.png' })).intent!
    collision = (await command({ kind: 'reset', taskId: 'collision', revision: collision.revision, etag: null, total: png.length })).intent!
    collision = (await command({ kind: 'append', taskId: 'collision', revision: collision.revision, epoch: collision.transfer_epoch, offset: 0, bytes: png })).intent!
    collision = (await command({ kind: 'downloaded', taskId: 'collision', revision: collision.revision })).intent!
    await assert.rejects(command({ kind: 'import', taskId: 'collision', revision: collision.revision }))
    assert.equal(db.prepare("SELECT title FROM assets WHERE id='download-asset:collision'").get().title, 'Keep user title')
    console.log('persistent journal: immutable intent, CAS, unpublished tail, corruption, links, quota and epoch cleanup passed')
  } finally { db.close(); await host.close(); await fs.rm(root, { recursive: true, force: true }) }
}
