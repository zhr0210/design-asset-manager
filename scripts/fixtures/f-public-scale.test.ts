import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../../src/main/library-lifecycle/production-active-library-dependencies'
import { DAM_BUILD_IDENTITY } from '../../src/shared/build-identity.generated'

// Operational scale through the formal Host; dialog selection is the only test seam.
// All source content is explicitly authorized public material. This is NOT UI acceptance.
const base = path.resolve('.scratch/f-release-scale-20261008')
const source = path.resolve('.scratch/d-work-mode-20261008/library')
const target = path.join(base, 'library-10000')
const sourceFiles = path.join(base, 'sources-10000')
const evidence = path.join(base, 'evidence')
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const write = async (name: string, value: unknown) => fs.writeFile(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n')
await fs.mkdir(evidence, { recursive: true })
assert.ok(target.startsWith(base + path.sep))
let selection: string[] = []
let peakWorkingSet = 0
const sample = () => { peakWorkingSet = Math.max(peakWorkingSet, process.memoryUsage().rss) }
const timer = setInterval(sample, 250)
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: target }),
  selectLocalFiles: async () => ({ kind: 'selected', files: selection.map(filePath => ({ filePath })) })
}))
try {
  const exists = await fs.stat(target).then(() => true, () => false)
  if (!exists) {
    await fs.cp(source, target, { recursive: true, force: false, errorOnExist: true,
      filter: file => !/-wal$|-shm$/.test(file) })
    for (const name of await fs.readdir(path.join(source, '.dam'))) if (name.endsWith('.sqlite')) {
      const original = new Database(path.join(source, '.dam', name), { readonly: true, fileMustExist: true })
      const copied = path.join(target, '.dam', name)
      try { await fs.unlink(copied); await original.backup(copied) } finally { original.close() }
    }
  }
  const db = new Database(path.join(target, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
  const originalCount = Number(db.prepare('SELECT count(*) FROM assets').pluck().get())
  const protectedTables = ['assets','asset_lifecycle','tags','asset_tags','library_folders','library_folder_assets',
    'basic_analysis_requests','basic_analysis_attempts','basic_analysis_evidence','work_sets','work_set_items']
  const protectedRows: Record<string, any[]> = {}
  const tables = new Set((db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as {name:string}[]).map(row => row.name))
  for (const table of protectedTables) if (tables.has(table)) protectedRows[table] = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()
  db.close()
  const baselineFile = path.join(evidence, 'scale-protected-before.json')
  const previous = await fs.readFile(baselineFile, 'utf8').then(JSON.parse, () => null)
  if (!previous) await fs.writeFile(baselineFile, JSON.stringify({ originalCount, rows: protectedRows }, null, 2))
  const baseline = previous ?? { originalCount, rows: protectedRows }
  await fs.mkdir(sourceFiles, { recursive: true })
  const samples = (await fs.readdir('.scratch/e-eagle-20261008/public-imports')).filter(name => name.endsWith('.png')).sort()
  assert.equal(samples.length, 3)
  const master = path.join(base, 'public-masters')
  await fs.mkdir(master, { recursive: true })
  const originals: { name: string; sha256: string; bytes: number }[] = []
  for (const name of samples) {
    const bytes = await fs.readFile(path.join('.scratch/e-eagle-20261008/public-imports', name))
    originals.push({ name, sha256: sha(bytes), bytes: bytes.length })
    await fs.writeFile(path.join(master, name), bytes)
  }
  // Hardlinks are only among disposable F-owned source copies, never to an existing Original.
  const all = []
  const fullCopyMasters = new Set<string>()
  for (let n = 0; n < 10000 - baseline.originalCount; n++) {
    const file = path.join(sourceFiles, `F-公开-万条-${String(n + 1).padStart(5, '0')}-${n % 3}.png`)
    if (!await fs.stat(file).then(() => true, () => false)) {
      const chosen = path.join(master, samples[n % 3])
      if (!fullCopyMasters.has(chosen)) {
        try { await fs.link(chosen, file) }
        catch (error) {
          if (!['UNKNOWN', 'EMLINK', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error
          fullCopyMasters.add(chosen)
          await fs.copyFile(chosen, file, fs.constants.COPYFILE_EXCL)
        }
      } else await fs.copyFile(chosen, file, fs.constants.COPYFILE_EXCL)
    }
    all.push(file)
  }
  await write('scale-sources.json', { totalRecords: 10000, inheritedRecords: baseline.originalCount,
    addedCopies: all.length, addedIndependentContents: 3, originals,
    caveat: 'Filename copies of real public bytes; operational load, not 10000 independent quality samples.' })
  await host.open()
  assert.equal(host.inspect().state, 'ready')
  const start = performance.now()
  let count = (await host.listAssets()).length
  let alreadyAdded = count - baseline.originalCount
  const priorImport = await fs.readFile(path.join(evidence,'scale-import-progress.json'),'utf8').then(JSON.parse,()=>null)
  const importTimings: unknown[] = count === 10000 && priorImport?.count === 10000 ? priorImport.importTimings : []
  while (count < 10000) {
    selection = all.slice(alreadyAdded, alreadyAdded + Math.min(500, 10000 - count))
    const prepareStart = performance.now()
    const plan = await host.prepareAddAssets()
    assert.equal(plan.kind, 'planned')
    if (plan.kind !== 'planned') throw Error('Review unavailable')
    assert.equal(plan.plan.summary.eligibleCount, selection.length)
    const preparedMs = performance.now() - prepareStart
    const dispatchStart = performance.now()
    const result = await host.dispatchAddAssets(plan.plan.receipt)
    assert.equal(result.state, 'complete')
    const dispatchMs = performance.now() - dispatchStart
    count = (await host.listAssets()).length
    alreadyAdded = count - baseline.originalCount
    importTimings.push({ count, preparedMs, dispatchMs, eligible: selection.length })
    sample()
    await write('scale-import-progress.json', { build: DAM_BUILD_IDENTITY, count, importTimings, elapsedMs: performance.now() - start, peakWorkingSet })
    console.log(JSON.stringify({ count, preparedMs: Math.round(preparedMs), dispatchMs: Math.round(dispatchMs), peakMiB: Math.round(peakWorkingSet / 1024 ** 2) }))
  }
  const scope = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation! }
  const query = (text: string, cursor?: string) => host.searchAssetPage({ ...scope, query: text,
    tagScope: 'includes-pending', limit: 100, ...(cursor ? { cursor } : {}) })
  const coldStart = performance.now()
  // Rebuild the disposable derived projection through its formal maintenance API.
  // This rerun measures actual reconstruction, not a warm persisted index labelled cold.
  await host.rebuildSearchIndex()
  const first = await query('F-公开-万条')
  const coldMs = performance.now() - coldStart
  assert.equal(first.total, all.length)
  const warmMs: number[] = [], pageMs: number[] = []
  for (let n = 0; n < 12; n++) {
    const began = performance.now(); const result = await query(`F-公开-万条-${String(n + 1).padStart(5,'0')}`)
    warmMs.push(performance.now() - began); assert.equal(result.total, 1)
  }
  let cursor = first.nextCursor
  const seen = new Set(first.matches.map(match => match.asset.id))
  while (cursor) {
    const began = performance.now(), page = await query('F-公开-万条', cursor)
    pageMs.push(performance.now() - began)
    for (const row of page.matches) { assert.equal(seen.has(row.asset.id), false); seen.add(row.asset.id) }
    cursor = page.nextCursor
  }
  assert.equal(seen.size, all.length)
  await write('scale-query-result.json',{build:DAM_BUILD_IDENTITY,coldMs,warmMs,pageMs,
    fullPaginationCount:seen.size,projectionRebuilt:true})
  await host.close()
  const reopenStart = performance.now()
  await host.reopen()
  assert.equal(host.inspect().state, 'ready', '10000-record library must remain openable')
  assert.equal((await host.listAssets()).length, 10000)
  const reopenMs = performance.now() - reopenStart
  const after = new Database(path.join(target, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
  try {
    assert.equal(after.pragma('integrity_check', { simple: true }), 'ok')
    assert.deepEqual(after.pragma('foreign_key_check'), [])
    for (const [table, rows] of Object.entries(baseline.rows)) {
      const current = after.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()
      assert.deepEqual(current.slice(0, rows.length), rows, table + ' inherited rows preserved')
    }
  } finally { after.close() }
  const p95 = (values: number[]) => [...values].sort((a,b) => a-b)[Math.ceil(values.length * 0.95) - 1]
  const results = { build: DAM_BUILD_IDENTITY, recordCount: count, scope: 'formal Host integration; dialog seam; NOT browser UI',
    coldMs, lexicalWarmP95Ms: p95(warmMs), pageWarmP95Ms: p95(pageMs), warmMs, pageMs, reopenMs,
    importMs: priorImport?.count === 10000 ? priorImport.elapsedMs : performance.now() - start,
    importTimings, peakWorkingSet, dbBytes: (await fs.stat(path.join(target,'.dam/library.sqlite'))).size,
    protectedRowsPreserved: true, integrity: 'ok', mock: false, aiCalls: 0 }
  await write('scale-result.json', results)
  console.log(JSON.stringify(results))
  assert.ok(coldMs <= 120000); assert.ok(p95(warmMs) <= 2000); assert.ok(p95(pageMs) <= 500)
  assert.ok(peakWorkingSet <= 2048 * 1024 ** 2)
} catch (error) {
  await write('scale-failure.json', { build: DAM_BUILD_IDENTITY, code: (error as {code?:string}).code,
    message: (error as Error).message, state: host.inspect(), peakWorkingSet })
  throw error
} finally { clearInterval(timer); await host.close() }
