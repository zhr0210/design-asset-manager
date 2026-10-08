import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { createActiveLibraryHost } from '../../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../../src/main/library-lifecycle/production-active-library-dependencies'
import { DAM_BUILD_IDENTITY } from '../../src/shared/build-identity.generated'

const base = path.resolve('.scratch/f-release-scale-20261008')
const completed = JSON.parse(await fs.readFile(path.join(base, 'evidence/background-soak.json'), 'utf8'))
assert.equal(completed.passed, true, 'Soak must finish and release its Host before final verification')
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(base, 'library-10000') }),
  selectLocalFiles: async () => ({ kind: 'cancelled' })
}))
let peakRss = 0
const timer = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss) }, 100)
try {
  await host.open(); assert.equal(host.inspect().state, 'ready')
  assert.equal((await host.listAssets()).length, 10009)
  const scope = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation! }
  const query = (text: string, cursor?: string) => host.searchAssetPage({ ...scope, query: text,
    tagScope: 'includes-pending', limit: 100, ...(cursor ? { cursor } : {}) })
  const start = performance.now()
  await host.rebuildSearchIndex()
  const first = await query('F-公开-万条')
  const coldMs = performance.now() - start
  assert.equal(first.total, 9834)
  const warmMs = [], pageMs = []
  for (let n = 0; n < 12; n++) {
    const start = performance.now(), result = await query('F-公开-万条-' + String(n + 1).padStart(5, '0'))
    warmMs.push(performance.now() - start); assert.equal(result.total, 1)
  }
  const seen = new Set(first.matches.map(row => row.asset.id))
  let cursor = first.nextCursor
  while (cursor) {
    const start = performance.now(), page = await query('F-公开-万条', cursor)
    pageMs.push(performance.now() - start)
    for (const row of page.matches) { assert.equal(seen.has(row.asset.id), false); seen.add(row.asset.id) }
    cursor = page.nextCursor
  }
  assert.equal(seen.size, 9834)
  await host.close()
  const startReopen = performance.now()
  await host.reopen(); assert.equal(host.inspect().state, 'ready')
  assert.equal((await host.listAssets()).length, 10009)
  const reopenMs = performance.now() - startReopen
  const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1]
  assert.ok(coldMs <= 120000); assert.ok(p95(warmMs) <= 2000); assert.ok(p95(pageMs) <= 500)
  assert.ok(peakRss <= 2048 * 1024 ** 2)
  const result = { build: DAM_BUILD_IDENTITY, kind: 'final-source production Host; not Browser or installed UI',
    records: 10009, coldMs, warmP95Ms: p95(warmMs), pageP95Ms: p95(pageMs), fullPagination: seen.size,
    reopenMs, peakRss, aiCalls: 0, originalBusinessCount: completed.physicalModelCalls }
  await fs.writeFile(path.join(base, 'evidence/final-scale-result.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { clearInterval(timer); await host.close() }
