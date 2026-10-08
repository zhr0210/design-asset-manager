import assert from 'node:assert/strict'
import { test, mock } from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { createManagedModelLibrary } from '../src/main/model-library-workspace/managed-model-library'
import { inspectVisionModel } from '../src/main/model-library/vision-model-artifact'
import { transferModelFile } from '../src/main/model-library-workspace/model-file-transfer'
import { parseManagedModelAction } from '../src/shared/contracts/managed-model-library.contract'
import { createVisualAdmission } from '../src/main/visual-ai/visual-admission'
import type { PublicModelFetch } from '../src/main/model-library-workspace/huggingface-model-source'

const python = 'C:\\Users\\kilian\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
function publicGgufFixture(architecture: string, type = 0, extent = 8, dataBytes = 32) {
  const u32 = (value: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b }
  const u64 = (value: number) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(value)); return b }
  const str = (value: string) => Buffer.concat([u64(Buffer.byteLength(value)), Buffer.from(value)])
  const header = Buffer.concat([Buffer.from('GGUF'), u32(3), u64(1), u64(1),
    str('general.architecture'), u32(8), str(architecture), str('fixture.weight'), u32(1), u64(extent), u32(type), u64(0)])
  return Buffer.concat([header, Buffer.alloc((32 - header.length % 32) % 32), Buffer.alloc(dataBytes)])
}
async function fixture(publicFetch: PublicModelFetch = async () => { throw Error('UNEXPECTED_NETWORK') }) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-managed-model-tests-')))
  const model = path.join(root, 'source'); await fs.mkdir(model)
  await fs.writeFile(path.join(model, 'config.json'), JSON.stringify({ model_type: 'qwen3_vl', text_config: { hidden_size: 2048, num_hidden_layers: 28 } }))
  for (const name of ['tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json']) await fs.writeFile(path.join(model, name), '{}')
  await fs.writeFile(path.join(model, 'chat_template.json'), JSON.stringify({ chat_template: '{{ messages }}' }))
  const header = Buffer.from(JSON.stringify({ 'fixture.only.not.inference': { dtype: 'F32', shape: [1024 * 1024], data_offsets: [0, 4 * 1024 ** 2] } }))
  const prefix = Buffer.alloc(8); prefix.writeBigUInt64LE(BigInt(header.length))
  await fs.writeFile(path.join(model, 'model.safetensors'), Buffer.concat([prefix, header, Buffer.alloc(4 * 1024 ** 2)]))
  const database = new Database(path.join(root, 'app.sqlite'))
  const runner = path.join(root, 'owned-runner.py')
  await fs.copyFile(path.resolve('out/main/ai-service/tools/managed_vision_worker.py'), runner)
  const admission = createVisualAdmission({ memory: () => ({ free: 60 * 1024 ** 3, total: 64 * 1024 ** 3 }) })
  const makeLibrary = () => createManagedModelLibrary({ database, root: path.join(root, 'owned'), runner,
    selectModel: async () => model, selectPython: async () => python, fetch: publicFetch,
    reserve: (id, signal) => admission.reserveResident(id, 128 * 1024 ** 2, signal), changed() {}, admission })
  const library = makeLibrary()
  return { root, model, runner, database, admission, library, makeLibrary, async close() {
    await library.drain(); database.close()
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('dam-managed-model-tests-'))
    await fs.rm(root, { recursive: true, force: true })
  } }
}

await test('data-only imports require complete companion files and structurally valid weights', async () => {
  const f = await fixture()
  try {
    await fs.unlink(path.join(f.model, 'tokenizer.json'))
    await assert.rejects(f.library.reviewImport('reference'), /LOCAL_MODEL_COMPANION_MISSING/)
    assert.equal(f.library.summary().models.length, 0)
    await fs.writeFile(path.join(f.model, 'tokenizer.json'), '{}')
    await fs.writeFile(path.join(f.model, 'model.safetensors'), 'corrupt')
    await assert.rejects(f.library.reviewImport('reference'), /LOCAL_MODEL_BYTES_REJECTED/)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('a selected complete GGUF bundle installs verified data without Python or runtime qualification and reopens offline', async () => {
  const repository = 'Qwen/Qwen3-VL-2B-Instruct-GGUF', revision = 'a'.repeat(40)
  const files = new Map([
    ['Qwen3VL-2B-Instruct-Q4_K_M.gguf', publicGgufFixture('qwen3vl', 12, 256, 144)],
    ['mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf', publicGgufFixture('clip', 8, 32, 34)],
  ])
  let online = true
  const fetch: PublicModelFetch = async (url) => {
    if (!online) throw Error('OFFLINE_NETWORK_UNAVAILABLE')
    if (url=== 'https://modelscope.cn/api/v1/models/'+repository) return new Response(JSON.stringify({Code:200,Data:{Path:'Qwen',Name:repository.split('/')[1],License:'apache-2.0',IsAccessible:1,IsPublished:1}}))
    if (url.startsWith('https://modelscope.cn/api/v1/models/'+repository+'/repo/files?')) return new Response(JSON.stringify({Code:200,Data:{Files:[...files].map(([name,bytes])=>({
      Path:name,Size:bytes.length,Sha256:createHash('sha256').update(bytes).digest('hex'),Revision:revision,CommittedDate:1,Type:'blob'
    }))}}))
    const name = new URL(url).searchParams.get('FilePath')!
    if (files.has(name)) return new Response(new Uint8Array(files.get(name)!), { headers: { 'content-length': String(files.get(name)!.length) } })
    return new Response('', { status: 404 })
  }
  const f = await fixture(fetch)
  try {
    await f.library.refreshCatalog()
    const bundle = f.library.summary().discovery.find(entry => entry.repository === repository)!.bundles[0]
    assert.ok(bundle)
    const recommendations = f.library.recommendGguf('balanced')
    assert.equal(recommendations[0].bundleId, bundle.id)
    assert.equal(recommendations[0].plans[0].plan.mode, 'cpu')
    assert.equal(recommendations[0].plans[0].fits, true)
    assert.equal(f.library.summary().models.length, 0, 'a recommendation does not install or qualify a model')
    const review = await f.library.reviewGgufInstall(bundle.id)
    assert.equal(review.bytes, 434, 'exact Q4_K block and Q8_0 projector fixture size')
    const receipt = await f.library.confirm(review.review)
    assert.ok(receipt.taskId)
    for (let wait = 0; wait < 200 && f.library.summary().tasks[0].state === 'running'; wait++) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(f.library.summary().tasks[0].state, 'complete', f.library.summary().tasks[0].error ?? '')
    const model = f.library.summary().models[0]
    assert.equal(model.format, 'gguf')
    assert.equal(model.qualifiedAt, null)
    online = false
    const reopened = f.makeLibrary(), config = await reopened.configuration(model.id)
    assert.equal(config.enabled, false)
    assert.equal(config.gguf?.id, bundle.id)
    assert.doesNotThrow(() => reopened.assertTrusted(config))
    await fs.writeFile(path.join(config.root, bundle.files[0].name), 'damaged')
    await assert.rejects(reopened.configuration(model.id), /MODEL_FILE_INTEGRITY_FAILED/)
    assert.equal(reopened.summary().models[0].qualifiedAt, null)
  } finally { await f.close() }
})
await test('failed acquisition admission releases the preparation state and drains pending work', async () => {
  const f = await fixture()
  try {
    const blocked = createManagedModelLibrary({ database: f.database, root: path.join(f.root, 'blocked'),
      runner: path.resolve('out/main/ai-service/tools/managed_vision_worker.py'), selectModel: async () => f.model,
      selectPython: async () => python, fetch: async () => { throw Error('UNEXPECTED_NETWORK') },
      reserve() { throw Error('AI_MEMORY_WAIT') }, changed() {} })
    await assert.rejects(blocked.reviewImport('reference'), /AI_MEMORY_WAIT/)
    assert.equal(blocked.summary().preparing, false)
    await assert.rejects(blocked.refreshCatalog(), /AI_MEMORY_WAIT/)
    assert.equal(blocked.summary().catalogRefreshing, false)
    await blocked.drain()
  } finally { await f.close() }
})
await test('reference import rechecks its review, stays unqualified, persists inventory and protects revocation', async () => {
  const f = await fixture()
  try {
    const original = await inspectVisionModel(f.model), review = await f.library.reviewImport('reference')
    assert.equal(review.additionalBytes, 0)
    const receipt = await f.library.confirm(review.review)
    assert.ok(receipt.modelEntryId)
    const id = receipt.modelEntryId!, config = await f.library.configuration(id)
    assert.equal(config.enabled, false)
    assert.equal(f.library.summary().models[0].qualifiedAt, null)
    const reopened = f.makeLibrary()
    assert.equal(reopened.summary().models.length, 1)
    f.library.setTrust(id, false)
    assert.throws(() => f.library.assertTrusted(config), /MODEL_TRUST_REVOKED/)
    const duplicate = await f.library.reviewImport('reference')
    await assert.rejects(f.library.confirm(duplicate.review), /MODEL_TRUST_REVIEW_REQUIRED/)
    f.library.setTrust(id, true)
    assert.equal(f.library.summary().models[0].qualifiedAt, null)
    f.library.assertTrusted(config)
    assert.equal((await inspectVisionModel(f.model)).artifactFingerprint, original.artifactFingerprint)
  } finally { await f.close() }
})
await test('an installed immutable upstream model reopens offline after source freshness expires without restoring revoked trust', async () => {
  let online = true, denied = false, changedLicense = false, now = Date.now()
  const date = mock.method(Date, 'now', () => now)
  const files = new Map<string, Buffer>(), revision = '1'.repeat(40), repository = 'Qwen/Qwen3-VL-2B-Instruct'
  const fetch: PublicModelFetch = async (url, options) => {
    if (!online) throw Error('OFFLINE_NETWORK_UNAVAILABLE')
    if (denied) return new Response('', { status: 403 })
    assert.equal(options.credentials, 'omit')
    if(url==='https://modelscope.cn/api/v1/models/'+repository)return new Response(JSON.stringify({Code:200,Data:{Path:'Qwen',Name:repository.split('/')[1],License:changedLicense?'changed-license':'apache-2.0',IsAccessible:1,IsPublished:1}}))
    if(url.startsWith('https://modelscope.cn/api/v1/models/'+repository+'/repo/files?'))return new Response(JSON.stringify({Code:200,Data:{Files:[...files].map(([name,bytes])=>({
      Path:name,Size:bytes.length,Sha256:createHash('sha256').update(bytes).digest('hex'),Revision:revision,CommittedDate:1,Type:'blob'
    }))}}))
    if (url.startsWith('https://modelscope.cn/api/v1/models/'+repository+'/repo?')) {
      const bytes = files.get(new URL(url).searchParams.get('FilePath')!)!
      return new Response(new Uint8Array(bytes), { headers: { 'content-length': String(bytes.length) } })
    }
    return new Response('', { status: 404 })
  }
  const f = await fixture(fetch)
  try {
    for (const name of await fs.readdir(f.model)) files.set(name, await fs.readFile(path.join(f.model, name)))
    await f.library.refreshCatalog()
    const review = await f.library.reviewInstall('qwen3-vl-2b-instruct')
    const receipt = await f.library.confirm(review.review)
    for (let wait = 0; wait < 200 && f.library.summary().tasks[0].state === 'running'; wait++) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(f.library.summary().tasks[0].state, 'complete', f.library.summary().tasks[0].error ?? '')
    const id = f.library.summary().models[0].id, before = await f.library.configuration(id)
    now += 48 * 60 * 60 * 1000
    online = false
    const reopened = f.makeLibrary(), candidate = await reopened.configuration(id)
    assert.equal(candidate.fingerprint, before.fingerprint)
    assert.equal(candidate.enabled, false, 'configuration never grants model capability by itself')
    assert.doesNotThrow(() => reopened.assertTrusted(candidate))
    assert.equal(reopened.summary().models[0].sourceFreshness.kind, 'stale')
    await assert.rejects(reopened.refreshSource(id), /MODEL_SOURCE_UNAVAILABLE/)
    assert.doesNotThrow(() => reopened.assertTrusted(candidate), 'source refresh failure does not revoke installed execution trust')
    online = true
    await reopened.refreshSource(id)
    assert.equal(reopened.summary().models[0].sourceFreshness.kind, 'fresh')
    assert.equal(reopened.summary().models[0].qualifiedAt, null, 'online metadata refresh never grants runtime qualification')
    denied = true
    await assert.rejects(reopened.refreshSource(id), /MODEL_MIRROR_UNAVAILABLE/)
    assert.doesNotThrow(() => reopened.assertTrusted(candidate),'an unavailable mirror does not revoke verified installed bytes')
    denied = false
    changedLicense=true
    await assert.rejects(reopened.refreshSource(id),/MODEL_SOURCE_LICENSE_CHANGED/)
    assert.throws(()=>reopened.assertTrusted(candidate),/MODEL_SOURCE_LICENSE_CHANGED/,'known accepted source license change still blocks new execution')
    changedLicense=false
    await reopened.refreshSource(id)
    assert.doesNotThrow(() => reopened.assertTrusted(candidate), 'explicit successful immutable source recheck may clear the source block')
    reopened.setTrust(id, false)
    assert.throws(() => reopened.assertTrusted(candidate), /MODEL_TRUST_REVOKED/)
    await assert.rejects(reopened.configuration(id), /MODEL_TRUST_REVOKED/)
    await assert.rejects(reopened.refreshSource(id), /MODEL_TRUST_REVOKED/)
  } finally { date.mock.restore(); await f.close() }
})
await test('changed reviewed bytes do not add a model or replace the previously imported version', async () => {
  const f = await fixture()
  try {
    await f.library.confirm((await f.library.reviewImport('reference')).review)
    const before = f.library.summary().models
    const review = await f.library.reviewImport('reference')
    await fs.writeFile(path.join(f.model, 'generation_config.json'), '{"max_new_tokens":123}')
    await assert.rejects(f.library.confirm(review.review), /LOCAL_MODEL_CHANGED/)
    assert.deepEqual(f.library.summary().models, before)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('explicit verification rebinds an updated app runner and expires previous execution qualification', async () => {
  const f = await fixture()
  try {
    const receipt = await f.library.confirm((await f.library.reviewImport('reference')).review)
    const before = await f.library.configuration(receipt.modelEntryId!)
    // Simulates an already qualified inventory row at this storage seam only.
    f.library.qualified(before)
    assert.ok(f.library.summary().models[0].qualifiedAt)
    await fs.appendFile(f.runner, '\n# Updated app-owned runner\n')
    const candidate = await f.library.configuration(receipt.modelEntryId!)
    assert.notEqual(candidate.fingerprint, before.fingerprint)
    assert.equal(candidate.artifactFingerprint, before.artifactFingerprint)
    assert.equal(candidate.entryId, before.entryId)
    assert.equal(candidate.enabled, false)
    assert.equal(f.library.summary().models[0].qualifiedAt, null)
    assert.throws(() => f.library.assertTrusted(before), /MODEL_TRUST_REVOKED/)
    f.library.assertTrusted(candidate)
    f.library.setTrust(receipt.modelEntryId!, false)
    await fs.appendFile(f.runner, '# Another app update\n')
    await assert.rejects(f.library.configuration(receipt.modelEntryId!), /MODEL_TRUST_REVOKED/)
    assert.equal(f.library.summary().models[0].qualifiedAt, null)
  } finally { await f.close() }
})
await test('copy import publishes only complete verified bytes, retains source, and reloads without trusting directories', async () => {
  const f = await fixture()
  try {
    const original = await inspectVisionModel(f.model), review = await f.library.reviewImport('managed-copy')
    const receipt = await f.library.confirm(review.review)
    assert.ok(receipt.taskId)
    for (let wait = 0; wait < 100 && f.library.summary().tasks[0].state === 'running'; wait++) await new Promise(resolve => setTimeout(resolve, 20))
    const summary = f.library.summary()
    assert.equal(summary.tasks[0].state, 'complete', summary.tasks[0].error ?? '')
    assert.equal(summary.models.length, 1)
    assert.equal(summary.models[0].ownership, 'managed-copy')
    assert.equal(summary.models[0].qualifiedAt, null)
    assert.equal((await inspectVisionModel(f.model)).artifactFingerprint, original.artifactFingerprint)
    assert.equal(f.makeLibrary().summary().models[0].fingerprint, summary.models[0].fingerprint)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('real file cancellation preserves a partial prefix; explicit resume verifies the complete content', async () => {
  const f = await fixture()
  try {
    const stage = path.join(f.root, 'transfer'); await fs.mkdir(stage)
    const name = 'model.safetensors', bytes = await fs.readFile(path.join(f.model, name))
    const file = { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
    const abort = new AbortController()
    await assert.rejects(transferModelFile({ file, stage, sourceRoot: f.model, signal: abort.signal,
      fetch: async () => { throw Error('UNEXPECTED_NETWORK') }, progress(value) { if (value >= 256 * 1024) abort.abort() } }), /abort/i)
    const partial = await fs.stat(path.join(stage, name + '.part'))
    assert.ok(partial.size > 0 && partial.size < file.bytes)
    await assert.rejects(fs.stat(path.join(stage, name)), { code: 'ENOENT' })
    await transferModelFile({ file, stage, sourceRoot: f.model, signal: new AbortController().signal,
      fetch: async () => { throw Error('UNEXPECTED_NETWORK') }, progress() {} })
    assert.deepEqual(await fs.readFile(path.join(stage, name)), bytes)
    await assert.rejects(fs.stat(path.join(stage, name + '.part')), { code: 'ENOENT' })
  } finally { await f.close() }
})
await test('insufficient disk rejects the acquisition review and preserves original bytes', async () => {
  const f = await fixture(), before = await inspectVisionModel(f.model)
  const budget = mock.method(fs, 'statfs', async () => ({ bavail: 1, bsize: 4096 }) as unknown as Awaited<ReturnType<typeof fs.statfs>>)
  try {
    await assert.rejects(f.library.reviewImport('managed-copy'), /DISK_SPACE_INSUFFICIENT/)
    assert.equal(f.library.summary().models.length, 0); assert.equal(f.library.summary().tasks.length, 0)
    assert.equal((await inspectVisionModel(f.model)).artifactFingerprint, before.artifactFingerprint)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { budget.mock.restore(); await f.close() }
})
await test('rename-before-commit recovery requires the owned marker, exact bytes and explicit resume', async () => {
  const f = await fixture()
  try {
    await f.library.confirm((await f.library.reviewImport('managed-copy')).review)
    for (let wait = 0; wait < 100 && f.library.summary().tasks[0].state === 'running'; wait++) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(f.library.summary().tasks[0].state, 'complete')
    const row = f.database.prepare('SELECT record FROM managed_model_transfers').get() as { record: string }, record = JSON.parse(row.record)
    // Fault injection simulates an unpublished filesystem rename; all files are disposable test-owned fixtures.
    f.database.prepare('DELETE FROM managed_model_entries WHERE id=?').run(record.modelEntryId)
    record.state = 'interrupted'; f.database.prepare('UPDATE managed_model_transfers SET record=? WHERE id=?').run(JSON.stringify(record), record.id)
    const published = path.join(f.root, 'owned/artifacts', record.modelEntryId.replace('model-entry:', '')), marker = path.join(published, '.dam-model-store')
    const identity = await fs.readFile(marker, 'utf8'); await fs.writeFile(marker, 'foreign-owner')
    await assert.rejects(f.library.resume(record.id), /STAGING_UNSAFE/)
    assert.equal(f.library.summary().models.length, 0)
    await fs.writeFile(marker, identity); await f.library.resume(record.id)
    assert.equal(f.library.summary().tasks[0].state, 'complete'); assert.equal(f.library.summary().models[0].qualifiedAt, null)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('Main accepts named decisions, rejects arbitrary paths and caller-supplied qualification', () => {
  assert.deepEqual(parseManagedModelAction({ kind: 'review-install', modelId: 'qwen3-vl-2b-instruct' }), { kind: 'review-install', modelId: 'qwen3-vl-2b-instruct' })
  for (const value of [{ kind: 'review-import', ownership: 'reference', root: 'C:\\private' }, { kind: 'review-install', modelId: 'qwen3-vl-8b-instruct' },
    { kind: 'activate', modelEntryId: 'model-entry:../../elsewhere' }, { kind: 'activate', modelEntryId: 'model-entry:11111111-1111-1111-1111-111111111111', verified: true }])
    assert.throws(() => parseManagedModelAction(value), /MODEL_ACTION_INVALID/)
})
