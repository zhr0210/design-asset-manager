/** Explicit local evaluation of an externally supplied, already authorized eight-file manifest.
 * Private previews/results stay beside that manifest; stdout contains aggregate metrics only.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { runVisionRequest } from '../src/main/visual-ai/openai-vision.transport'
import type { AiBackendConfig } from '../src/shared/types/ai-backend.types'

assert.equal(process.env.DAM_AUTHORIZED_AI_EXECUTE, '1', 'Explicit authorized evaluation opt-in required')
const root = await fs.realpath(process.env.DAM_AUTHORIZED_AI_ROOT || '')
const model = process.env.DAM_LOCAL_AI_MODEL || ''
assert.match(model, /^[a-zA-Z0-9_-]+$/, 'Evaluation alias must be a safe local filename component')
const context = Number(process.env.DAM_EVAL_CONTEXT || 8192)
assert.ok(context === 4096 || context === 8192, 'Use an explicit comparison context')
const purpose = process.env.DAM_EVAL_PURPOSE === 'reverse' ? 'reverse' : 'analyze'
assert.ok(!process.env.DAM_EVAL_PURPOSE || ['analyze', 'reverse'].includes(process.env.DAM_EVAL_PURPOSE), 'Unknown evaluation purpose')
const outputStem = `${model}-ctx${context}${purpose === 'reverse' ? '-reverse' : ''}`
const endpoint = new URL(process.env.DAM_LOCAL_AI_ENDPOINT || '')
assert.ok(model && endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1' && !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash, 'Explicit loopback model required')
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'))
assert.equal(manifest.scope, 'user-authorized-eight-files-2026-09-23')
assert.deepEqual(manifest.assets.map((a: { alias: string }) => a.alias), ['P', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'])
const backend: AiBackendConfig = { id: 'authorized-evaluation', name: 'Local authorized evaluation', type: 'llama-openai', enabled: true, baseUrl: endpoint.href, defaultModel: model, timeoutMs: 120_000, priority: 1, capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: false, modelManagement: false } }
const digest = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const rows: Array<Record<string, unknown>> = []
let requests = 0
const originalFetch = globalThis.fetch
// Observe only request count; do not log bodies, images, credentials or paths.
globalThis.fetch = (...args) => { requests++; return originalFetch(...args) }
try {
  for (const asset of manifest.assets) {
    assert.equal(path.basename(asset.previewFile), asset.previewFile)
    const preview = await fs.readFile(path.join(root, asset.previewFile))
    assert.ok(digest(preview) === asset.previewSha256, 'Authorized preview checksum mismatch')
    const jpeg = await sharp(preview, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer()
    const started = performance.now(), before = requests
    const row: Record<string, unknown> = { alias: asset.alias, status: 'failed' }
    try {
      const output = await runVisionRequest({ backend, model, purpose, jpeg, signal: AbortSignal.timeout(120_000) })
      const chinese = (s: string) => /[\u3400-\u9fff]/.test(s)
      Object.assign(row, { status: 'completed', output, captionLength: output.caption.length, chineseCaption: chinese(output.caption), promptWordCount: output.prompt.trim().split(/\s+/).length, tagCount: output.tags.length, chineseTags: output.tags.filter(chinese).length, ocrEmpty: output.ocrText === '' })
    } catch (error) {
      row.error = error instanceof Error && /^AI_[A-Z0-9_]+$/.test(error.message) ? error.message : error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name) ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED'
    }
    row.elapsedMs = Math.round(performance.now() - started); row.requests = requests - before
    rows.push(row)
    await fs.writeFile(path.join(root, `${outputStem}-private-results.json`), JSON.stringify({ model, context, purpose, pipeline: 'formal transport; matching 1024/JPEG85 preprocessing from authorized 1600 previews', rows }), { mode: 0o600 })
    const { output, ...publicRow } = row
    console.log(JSON.stringify(publicRow))
  }
  const sourcesUnchanged = (await Promise.all(manifest.assets.map(async (a: { sourcePath: string; sourceSha256: string }) => digest(await fs.readFile(a.sourcePath)) === a.sourceSha256))).every(Boolean)
  assert.equal(sourcesUnchanged, true)
  const publicRows = rows.map(({ output, ...row }) => row)
  const report = { model, scope: manifest.scope, context, purpose, seed: 42, generatedFixtures: false, privateOutputsExcluded: true, sourcesUnchanged, qualityVerdict: 'requires-private-factual-review', rows: publicRows }
  await fs.writeFile(path.join(root, `${outputStem}-metrics.json`), JSON.stringify(report, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ completed: rows.filter(r => r.status === 'completed').length, total: rows.length, requests, sourcesUnchanged }))
} finally { globalThis.fetch = originalFetch }
