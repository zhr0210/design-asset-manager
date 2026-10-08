import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createAddAssetsWorkflow, createInMemoryCapturePersistenceAdapter } from '../src/main/capture-intake'

// Focused prepare-only regression. Real public bytes, no import or fake product success.
const source = path.resolve('.scratch/e-eagle-20261008/public-imports/public-04-coffee-qqzcl635t2eg.png')
const before = await fs.readFile(source)
let concurrent = 0, peak = 0
const originalOpen = fs.open
fs.open = async (...args: Parameters<typeof fs.open>) => {
  concurrent++; peak = Math.max(peak, concurrent)
  try {
    const handle = await originalOpen(...args)
    const close = handle.close.bind(handle)
    handle.close = async () => { try { await close() } finally { concurrent-- } }
    await new Promise(resolve => setTimeout(resolve, 2))
    return handle
  } catch (error) { concurrent--; throw error }
}
try {
  const workflow = createAddAssetsWorkflow({
    selectLocalFiles: async () => ({ kind: 'selected', files: Array.from({ length: 256 }, () => ({ filePath: source })) }),
    resolveActiveLibrary: async () => ({ identity: 'library:prepare-only', generation: 'generation:prepare-only',
      libraryRootDirectory: path.dirname(source), managedOriginalsDirectory: path.dirname(source),
      intakeStagingDirectory: path.dirname(source), requiredPreviewsDirectory: path.dirname(source) }),
    createIdentity: kind => `${kind}:${randomUUID()}`,
    persistence: createInMemoryCapturePersistenceAdapter(),
    generateSystemPreview: async () => { throw Error('PREPARE_ONLY_MUST_NOT_DISPATCH') }
  })
  const result = await workflow.prepare()
  assert.equal(result.kind, 'planned')
  if (result.kind !== 'planned') throw Error('Expected reviewed plan')
  assert.equal(result.plan.summary.eligibleCount, 256)
  assert.equal(result.plan.items.length, 256)
  assert.ok(peak <= 8, `Large selection must bound simultaneous file checks; observed ${peak}`)
  assert.equal(concurrent, 0)
  console.log(JSON.stringify({ result: 'PASS', peakFileChecks: peak, planned: 256, kind: 'prepare-only regression' }))
} finally {
  fs.open = originalOpen
  assert.deepEqual(await fs.readFile(source), before)
}
