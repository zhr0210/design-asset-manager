import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createManagedDownloads } from '../src/main/managed-download/managed-download'
import type { DownloadJournalOperation } from '../src/shared/contracts/download-journal.contract'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-download-space-')))
const library = path.join(root, 'library')
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }), selectLocalFiles: async () => ({ kind: 'cancelled' }) }))
const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw new Error('fixture failed')
await host.confirmCreate(plan.plan.receipt)
const db = new Database(path.join(library, '.dam', 'library.sqlite'))
const dir = path.join(library, '.dam', 'intake-staging', 'download-recovery')
const command = (op: DownloadJournalOperation) => host.downloadJournal({ ...op, generation: host.inspect().generation! })
let requests = 0
const downloads = createManagedDownloads({ host, history: { saveTask() {} }, onImported() {}, fetch: (async () => { requests++; throw new Error('No network allowed') }) as typeof fetch })
const bytes = Buffer.alloc(128, 7)
async function admit(id: string, data = bytes) {
  let intent = (await command({ kind: 'create', taskId: id, url: `https://fixture.invalid/${id}.png`, fileName: `${id}.png` })).intent!
  intent = (await command({ kind: 'reset', taskId: id, revision: intent.revision, etag: '"fixture"', total: data.length * 2 })).intent!
  return (await command({ kind: 'append', taskId: id, revision: intent.revision, epoch: intent.transfer_epoch, offset: 0, bytes: data })).intent!
}
try {
  let intent = await admit('pending')
  enableIntakeRecoveryStorage(db)
  assert.equal(db.pragma('user_version', { simple: true }), 4)
  assert.deepEqual(Buffer.from((await command({ kind: 'read', taskId: 'pending' })).bytes!), bytes, 'v3 to v4 preserves download checkpoints')
  await fs.writeFile(path.join(dir, 'unknown-fixture'), 'preserve unknown')
  await downloads.discover()
  const stale = await downloads.prepare({ abandonTaskId: 'pending' })
  assert.equal(stale.action, 'abandon'); assert.equal(stale.checkpointBytes, bytes.length)
  assert.equal((await command({ kind: 'retention', taskId: 'pending' })).retainedBytes, bytes.length, 'Review/cancel releases nothing')
  intent = (await command({ kind: 'append', taskId: 'pending', revision: intent.revision, epoch: intent.transfer_epoch, offset: bytes.length, bytes })).intent!
  await assert.rejects(Promise.resolve().then(() => downloads.run(stale.receipt)))
  const review = await downloads.prepare({ abandonTaskId: 'pending' })
  const abandoned = await downloads.run(review.receipt)
  assert.equal(abandoned.abandoned, true); assert.equal(abandoned.retainedBytes, 0)
  assert.deepEqual(await fs.readdir(dir), ['unknown-fixture'])
  await assert.rejects(downloads.prepare({ resumeTaskId: 'pending' }))
  assert.throws(() => downloads.run(review.receipt))
  assert.equal(requests, 0)
  // A mismatching known file is not deleted; repeated explicit cleanup may release it after repair.
  const conflict = await admit('conflict')
  const name = db.prepare("SELECT chunk_identity FROM managed_download_chunks WHERE task_id='conflict'").get().chunk_identity
  await fs.writeFile(path.join(dir, name), Buffer.alloc(bytes.length, 9))
  const retained = await downloads.run((await downloads.prepare({ abandonTaskId: 'conflict' })).receipt)
  assert.equal(retained.abandoned, true); assert.equal(retained.retainedBytes, bytes.length)
  assert.deepEqual(await fs.readFile(path.join(dir, name)), Buffer.alloc(bytes.length, 9))
  await assert.rejects(command({ kind: 'reset', taskId: 'conflict', revision: conflict.revision + 1, etag: '"v2"', total: 256 }))
  await fs.writeFile(path.join(dir, name), bytes)
  assert.equal((await downloads.run((await downloads.prepare({ abandonTaskId: 'conflict' })).receipt)).retainedBytes, 0)
  assert.equal(await fs.readFile(path.join(dir, 'unknown-fixture'), 'utf8'), 'preserve unknown')
  // Once Capture owns a partial transaction, abandoning transfer bytes must not discard its recovery path.
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#556677' } }).png().toBuffer()
  let captured = await admit('captured', png)
  captured = (await command({ kind: 'reset', taskId: 'captured', revision: captured.revision, etag: null, total: png.length })).intent!
  captured = (await command({ kind: 'append', taskId: 'captured', revision: captured.revision, epoch: captured.transfer_epoch, offset: 0, bytes: png })).intent!
  captured = (await command({ kind: 'downloaded', taskId: 'captured', revision: captured.revision })).intent!
  db.exec("CREATE TRIGGER fixture_failure BEFORE UPDATE OF managed_original_ref ON asset_candidates BEGIN SELECT RAISE(ABORT,'fixture'); END")
  await assert.rejects(command({ kind: 'import', taskId: 'captured', revision: captured.revision })); db.exec('DROP TRIGGER fixture_failure')
  await assert.rejects(downloads.prepare({ abandonTaskId: 'captured' }), /先恢复入库/)
  assert.ok((await command({ kind: 'retention', taskId: 'captured' })).retainedBytes! > 0)
  await downloads.drain(); await host.close(); await host.reopen()
  const reopened = createManagedDownloads({ host, history: { saveTask() {} }, onImported() {} })
  await reopened.discover()
  assert.deepEqual(reopened.list().map(job => job.id), ['captured'], 'Released abandoned tasks stay retired across reopen')
  assert.equal(requests, 0)
  console.log('Download space management passed: reviewed abandonment, stale CAS, known-file-only release, conflict retention/retry, Capture refusal and reopen.')
} finally { await downloads.drain(); db.close(); await host.close(); await fs.rm(root, { recursive: true, force: true }) }
