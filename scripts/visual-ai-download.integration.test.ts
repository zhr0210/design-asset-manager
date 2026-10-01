import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createVisualAiController } from '../src/main/visual-ai/visual-ai-controller'
import { createManagedDownloads } from '../src/main/managed-download/managed-download'
import { createAppStorage } from '../src/main/app-storage/app-storage'
import { ActiveLibraryHostError } from '../src/shared/contracts/active-library.contract'
import { DownloadService } from '../src/main/services/download.service'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-ai-download-integration-')))
const source = path.join(root, 'source.png')
const png = await sharp({ create: { width: 1800, height: 1200, channels: 4, background: '#7799bb' } }).png().toBuffer()
await fs.writeFile(source, png)
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(root, 'library') }), selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] }) }))
const created = await host.prepareCreate(); assert.equal(created.kind, 'planned')
if (created.kind !== 'planned') throw new Error('create failed')
await host.confirmCreate(created.plan.receipt)
const copied = await host.prepareAddAssets(); if (copied.kind !== 'planned') throw new Error('copy failed')
await host.dispatchAddAssets(copied.plan.receipt)
const asset = (await host.listAssets())[0]
await host.updateAssetCaption(asset.id, 'User-owned description')
let mode: 'normal' | 'invalid' | 'slow' | 'truncated' | 'recover' | 'cancel-retry' | 'unauthorized' | 'context-limit' = 'recover'
let aiCalls = 0; let downloads = 0; let observedImages = false
let observedWidth = 0; let observedHeight = 0; let retryStarted = false; let attempt = 0
const server = http.createServer(async (request, response) => {
  if (request.url === '/image.png') {
    downloads++; response.setHeader('Content-Length', png.length); response.end(png); return
  }
  if (request.url === '/slow.png') {
    downloads++; response.setHeader('Content-Length', png.length); response.write(png.subarray(0, 8))
    const timer = setTimeout(() => response.end(png.subarray(8)), 800)
    request.on('close', () => clearTimeout(timer)); return
  }
  if (request.url !== '/v1/chat/completions' || request.method !== 'POST') { response.writeHead(404); response.end(); return }
  aiCalls++; const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk))
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  observedImages = body.messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,')
  const preview = await sharp(Buffer.from(body.messages[1].content[1].image_url.url.split(',')[1], 'base64')).metadata()
  observedWidth = preview.width!; observedHeight = preview.height!
  if (mode === 'unauthorized' || mode === 'context-limit') { response.writeHead(mode === 'unauthorized' ? 401 : 400); response.end('synthetic private diagnostic'); return }
  response.setHeader('Content-Type', 'application/json')
  if ((mode === 'recover' || mode === 'cancel-retry') && attempt++ === 0) {
    response.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"caption":"partial' } }] })); return
  }
  if (mode === 'cancel-retry') { response.write('{'); retryStarted = true; return }
  const finish = () => response.end(JSON.stringify({ choices: [{ finish_reason: mode === 'truncated' ? 'length' : 'stop', message: { content: mode === 'invalid' ? 'invalid' : JSON.stringify({ caption: 'AI description', ocrText: 'VISIBLE TEXT', prompt: 'A blue minimal composition.', tags: ['蓝色', '构图'] }) } }] }))
  if (mode === 'slow') setTimeout(finish, 500); else finish()
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
let settings = createNewInstallAppSettingsDefaults()
settings.aiBackends = [{ id: 'synthetic-vision', name: 'Synthetic vision service', type: 'openai-compatible', enabled: true, baseUrl: `${origin}/v1`, defaultModel: 'synthetic-model', timeoutMs: 5000, priority: 1, capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false } }]
const ai = createVisualAiController({ host, settings: () => settings, onChanged: () => {} })
const appStorage = createAppStorage(path.join(root, 'app'))
const downloader = createManagedDownloads({ host, history: new DownloadService(appStorage.database), onImported: () => {} })
try {
  const current = host.inspect(); const scope = { libraryIdentity: current.identity!, generation: current.generation! }
  const input = { ...scope, assetIds: [asset.id], backendId: 'synthetic-vision', purpose: 'reverse' as const }
  await assert.rejects(ai.prepare('main', { ...input, assetIds: Array.from({ length: 9 }, (_, i) => `asset-${i}`) }))
  const revokedPlan = await ai.prepare('card:closed', input)
  ai.cancelOwner('card:closed')
  await assert.rejects(ai.run('card:closed', revokedPlan.receipt))
  const changedPlan = await ai.prepare('main', input)
  settings = { ...settings, aiBackends: settings.aiBackends!.map(backend => ({ ...backend, defaultModel: 'changed-model' })) }
  await assert.rejects(ai.run('main', changedPlan.receipt))
  const review = await ai.prepare('main', input)
  assert.equal(aiCalls, 0, 'Preparing/reviewing must never transmit images.')
  assert.match(review.storageNotice, /v2/)
  assert.match(review.inputDescription, /1024/)
  assert.match(review.inputDescription, /自动重试一次/)
  await assert.rejects(ai.run('different-owner', review.receipt))
  const started = await ai.run('main', review.receipt)
  await assert.rejects(ai.run('main', review.receipt), undefined, 'A confirmation must not send twice.')
  const completed = await eventually(() => ai.inspect('main', started.id), job => !['running','queued'].includes(job.state))
  assert.equal(completed.state, 'completed'); assert.equal(observedImages, true); assert.equal(aiCalls, 2)
  assert.ok(observedWidth <= 1024 && observedHeight <= 1024)
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1, 'Only the complete retry is committed.')
  const evidence = (await host.listVisualAiEvidence(asset.id))[0]
  assert.equal(evidence.output.prompt, 'A blue minimal composition.')
  assert.equal(evidence.inputScope, 'controlled-preview-rgb')
  assert.equal((await host.listAssets())[0].aiCaption, 'User-owned description')
  assert.equal((await host.listAssets())[0].aiOcrText, 'VISIBLE TEXT')
  assert.deepEqual((await host.listAssets())[0].visualAi?.pendingTags, ['蓝色','构图'])
  assert.equal((await host.listAssets())[0].visualAi?.prompt, 'A blue minimal composition.')
  assert.deepEqual((await host.listAssets())[0].tags, [], 'AI tags remain suggestions until confirmed.')
  await ai.confirmTag({ ...scope, assetId: asset.id, evidenceId: evidence.id, tag: '蓝色' })
  await ai.confirmTag({ ...scope, assetId: asset.id, evidenceId: evidence.id, tag: '蓝色' })
  assert.deepEqual((await host.listAssets())[0].tags, ['蓝色'])
  assert.equal((await host.listTags()).length, 1)
  assert.deepEqual((await host.listAssets())[0].visualAi?.pendingTags,['构图'])
  assert.deepEqual((await host.listAssets())[0].visualAi?.tags,['蓝色','构图'])
  const projectionDb = new Database(path.join(root,'library','.dam','library.sqlite'))
  try {
    projectionDb.prepare('UPDATE visual_ai_evidence SET preview_generation=? WHERE id=?').run('stale-preview',evidence.id)
    assert.equal((await host.listAssets())[0].visualAi,undefined)
    assert.equal((await host.listVisualAiEvidence(asset.id)).length,0)
    await assert.rejects(ai.confirmTag({...scope,assetId:asset.id,evidenceId:evidence.id,tag:'构图'}))
    projectionDb.prepare('UPDATE visual_ai_evidence SET preview_generation=? WHERE id=?').run(evidence.previewGeneration,evidence.id)
  } finally { projectionDb.close() }
  mode = 'truncated'
  const callsBeforeTruncation = aiCalls
  const limitedPlan = await ai.prepare('main', input)
  const limitedJob = await ai.run('main', limitedPlan.receipt)
  const limited = await eventually(() => ai.inspect('main', limitedJob.id), job => job.state === 'failed')
  assert.ok(limited.items[0].error?.includes('\u957f\u5ea6\u4e0a\u9650'))
  assert.equal(aiCalls - callsBeforeTruncation, 2)
  assert.equal((await host.listVisualAiEvidence(asset.id)).length,1,'Truncated generation cannot overwrite the last complete result.')
  mode = 'invalid'
  const invalidPlan = await ai.prepare('main', input)
  const invalidJob = await ai.run('main', invalidPlan.receipt)
  assert.equal((await eventually(() => ai.inspect('main', invalidJob.id), job => job.state === 'failed')).state, 'failed')
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1, 'Invalid output is not committed as empty success.')
  for (const [failure, message] of [['unauthorized', /密钥/], ['context-limit', /上下文容量/]] as const) {
    mode = failure
    const previousCalls = aiCalls
    const plan = await ai.prepare('main', input)
    const job = await ai.run('main', plan.receipt)
    const result = await eventually(() => ai.inspect('main', job.id), item => item.state === 'failed')
    assert.match(result.items[0].error!, message)
    assert.doesNotMatch(result.items[0].error!, /private diagnostic/)
    assert.equal(aiCalls - previousCalls, 1)
    assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1)
  }
  mode = 'cancel-retry'; attempt = 0
  const retryPlan = await ai.prepare('main', input)
  const retryJob = await ai.run('main', retryPlan.receipt)
  await eventually(() => retryStarted, Boolean)
  ai.cancel('main', retryJob.id)
  await eventually(() => ai.inspect('main', retryJob.id), job => job.state === 'cancelled')
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1, 'Cancellation during retry must not write partial evidence.')
  attempt = 0; retryStarted = false
  settings = { ...settings, aiBackends: settings.aiBackends!.map(backend => ({ ...backend, timeoutMs: 1000 })) }
  const timedPlan = await ai.prepare('main', input)
  const timedJob = await ai.run('main', timedPlan.receipt)
  const timed = await eventually(() => ai.inspect('main', timedJob.id), job => job.state === 'failed')
  assert.equal(retryStarted, true)
  assert.match(timed.items[0].error!, /等待时间/)
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1, 'A timed-out retry must not write partial evidence.')
  settings = { ...settings, aiBackends: settings.aiBackends!.map(backend => ({ ...backend, timeoutMs: 5000 })) }
  mode = 'slow'
  const cancelPlan = await ai.prepare('main', input)
  const cancelJob = await ai.run('main', cancelPlan.receipt)
  ai.cancel('main', cancelJob.id)
  await eventually(() => ai.inspect('main', cancelJob.id), job => job.state === 'cancelled')
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1)
  const cancelledSignal = new AbortController(); cancelledSignal.abort()
  await assert.rejects(host.saveVisualAiEvidence({ ...evidence, id: 'cancelled-before-storage' }, cancelledSignal.signal))
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1)
  mode = 'normal'
  const downloadPlan = downloader.prepare({ url: `${origin}/image.png` })
  assert.equal(downloads, 0, 'Preparing a download does not transfer bytes.')
  const download = downloader.run(downloadPlan.receipt)
  await assert.rejects(async () => downloader.run(downloadPlan.receipt))
  const imported = await eventually(() => downloader.list().find(job => job.id === download.id)!, job => ['completed','failed'].includes(job.state))
  assert.equal(imported.state, 'completed', imported.error)
  assert.equal(imported.receivedBytes, png.length)
  assert.equal((await host.listAssets()).length, 2)
  assert.ok((await host.readPreview(imported.assetId!)).length > 0)
  const cancelled = downloader.run(downloader.prepare({ url: `${origin}/slow.png` }).receipt)
  await eventually(() => downloader.list().find(job => job.id === cancelled.id)!, job => job.receivedBytes > 0)
  downloader.cancel(cancelled.id)
  await eventually(() => downloader.list().find(job => job.id === cancelled.id)!, job => job.state === 'cancelled')
  assert.equal((await host.listAssets()).length, 2)
  downloader.retry(cancelled.id)
  const retried = await eventually(() => downloader.list().find(job => job.id === cancelled.id)!, job => ['completed','failed'].includes(job.state))
  assert.equal(retried.state, 'completed', retried.error)
  assert.equal((await host.listAssets()).length, 3, 'Retry imports exactly once with the same task identity.')
  await assert.rejects(async () => downloader.retry(cancelled.id))
  const recoveryDownloads = createManagedDownloads({ host: { inspect: host.inspect, importDownloadedImage: async () => { throw new ActiveLibraryHostError('library-recovery-required', 'Synthetic interrupted Capture') } }, history: new DownloadService(appStorage.database), onImported: () => assert.fail('Partial Capture must not emit import success') })
  const recoveryJob = recoveryDownloads.run(recoveryDownloads.prepare({ url: `${origin}/image.png` }).receipt)
  await eventually(() => recoveryDownloads.list().find(job => job.id === recoveryJob.id)!, job => job.state === 'recovery-required')
  assert.throws(() => recoveryDownloads.retry(recoveryJob.id), undefined, 'A partial Capture cannot be blindly retried.')
  assert.equal((await host.listAssets()).length, 3)
  // A real Capture failure after admission must not be advertised as an ordinary retry.
  let recoverableJobId = ''
  let transfersBeforeRecovery = 0
  const faultDb = new Database(path.join(root, 'library', '.dam', 'library.sqlite'))
  try {
    faultDb.exec("CREATE TRIGGER reject_activation BEFORE UPDATE OF managed_original_ref ON asset_candidates BEGIN SELECT RAISE(ABORT, 'synthetic activation fault'); END")
    const interrupted = downloader.run(downloader.prepare({ url: `${origin}/image.png` }).receipt)
    const failedCapture = await eventually(() => downloader.list().find(job => job.id === interrupted.id)!, job => ['failed', 'recovery-required'].includes(job.state))
    assert.equal(failedCapture.state, 'recovery-required')
    assert.equal((faultDb.prepare('SELECT COUNT(*) AS count FROM capture_requests WHERE capture_request_identity=?').get(`capture-request:download:${interrupted.id}:1`) as { count: number }).count, 1)
    recoverableJobId = interrupted.id; transfersBeforeRecovery = downloads
    downloader.retry(interrupted.id)
    await eventually(() => downloader.list().find(job => job.id === interrupted.id)!, job => job.state === 'recovery-required')
    assert.equal(downloads, transfersBeforeRecovery)
    assert.equal((await host.listAssets()).length, 3)
  } finally { faultDb.exec('DROP TRIGGER reject_activation'); faultDb.close() }
  downloader.retry(recoverableJobId)
  const recovered = await eventually(() => downloader.list().find(job => job.id === recoverableJobId)!, job => ['completed', 'recovery-required'].includes(job.state))
  assert.equal(recovered.state, 'completed', recovered.error)
  assert.equal(downloads, transfersBeforeRecovery, 'Recovery must not make another HTTP request.')
  assert.equal((await host.listAssets()).length, 4)
  const stale = downloader.prepare({ url: `${origin}/image.png` })
  ai.invalidate(); downloader.invalidate(); await host.close(); await host.reopen()
  assert.equal((await host.listAssets()).find(item=>item.id===asset.id)?.visualAi?.prompt,'A blue minimal composition.')
  assert.equal((await host.listVisualAiEvidence(asset.id)).length, 1, 'v2 reopens and keeps evidence.')
  assert.equal((await host.listAssets()).find(item => item.id === asset.id)?.aiCaption, 'User-owned description')
  await assert.rejects(async () => downloader.run(stale.receipt))
  const newerDb = new Database(path.join(root, 'library', '.dam', 'library.sqlite'))
  enableIntakeRecoveryStorage(newerDb); newerDb.close()
  const newerReview = await ai.prepare('main', input)
  assert.match(newerReview.storageNotice, /保持已有库版本/)
  assert.doesNotMatch(newerReview.storageNotice, /升级到 v2/)
  assert.equal((await fs.readFile(source)).equals(png), true)
  console.log('Visual AI and downloads: confirmed HTTP execution, durable evidence, manual-state protection, cancellation, Capture promotion and v2 reopen passed')
} finally { ai.invalidate(); downloader.invalidate(); await host.close(); appStorage.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }

async function eventually<T>(read: () => T, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 300; i++) { const value = read(); if (done(value)) return value; await new Promise(resolve => setTimeout(resolve, 20)) }
  throw new Error('Timed out waiting for terminal state')
}
