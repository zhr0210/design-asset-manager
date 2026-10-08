import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import { createVisualAiController } from '../src/main/visual-ai/visual-ai-controller'
import type { VisionInvocation, VisionProvider } from '../src/main/visual-ai/openai-vision.provider'
import type { VisualAiClock } from '../src/main/visual-ai/visual-ai-clock'
import type { VisualAiJob } from '../src/shared/contracts/visual-ai.contract'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'

const output = { caption: '合成蓝色几何图', ocrText: '', prompt: 'A blue geometric composition.', tags: [' 蓝色 ', '蓝色', '几何'] }
const payload = (finish = 'stop', content = JSON.stringify(output)) => ({ choices: [{ finish_reason: finish, message: { content } }] })

class ManualClock implements VisualAiClock {
  private time = Date.parse('2026-09-27T00:00:00Z')
  private timers = new Map<number, { at: number; callback: () => void }>()
  private nextId = 0
  scheduled: number[] = []
  now = () => this.time
  scheduleTimeout = (callback: () => void, delayMs: number) => {
    const id = ++this.nextId
    this.scheduled.push(delayMs)
    this.timers.set(id, { at: this.time + delayMs, callback })
    return () => { this.timers.delete(id) }
  }
  advance(ms: number) {
    this.time += ms
    for (const [id, timer] of this.timers) if (timer.at <= this.time) {
      this.timers.delete(id)
      timer.callback()
    }
  }
  get pending() { return this.timers.size }
}

async function eventually<T>(read: () => T, done: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 300; i++) {
    const value = read()
    if (done(value)) return value
    await new Promise<void>(resolve => setImmediate(resolve))
  }
  throw new Error('Synthetic provider did not reach the expected state')
}

async function withFixture(run: (fixture: {
  host: ReturnType<typeof createActiveLibraryHost>
  ai: ReturnType<typeof createVisualAiController>
  input: { libraryIdentity: string; generation: string; assetIds: string[]; backendId: string; purpose: 'analyze' }
  calls: VisionInvocation[]
  clock: ManualClock
  admission:ReturnType<typeof createVisualAdmission>
  respond: (fn: VisionProvider['invokeOnce']) => void
}) => Promise<void>) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-vision-provider-test-')))
  const source = path.join(root, 'generated.png')
  const bytes = await sharp({ create: { width: 1800, height: 1200, channels: 4, background: '#7799bb' } }).png().toBuffer()
  await fs.writeFile(source, bytes)
  const sourceHash = createHash('sha256').update(bytes).digest('hex')
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(root, 'library') }),
    selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] })
  }))
  const calls: VisionInvocation[] = []
  let respond: VisionProvider['invokeOnce'] = async () => payload()
  const clock = new ManualClock()
  const admission=createVisualAdmission({clock})
  const settings = createNewInstallAppSettingsDefaults()
  settings.aiBackends = [{ id: 'synthetic', name: 'Synthetic', type: 'openai-compatible', enabled: true,
    baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'SYNTHETIC_PROVIDER_KEY', defaultModel: 'synthetic-model', timeoutMs: 1000, priority: 1,
    capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false } }]
  const ai = createVisualAiController({ host, settings: () => settings, clock,admission,
    provider: { invokeOnce: async input => { calls.push(input); return respond(input) } },
    onChanged: () => { throw new Error('Synthetic notification failure after commit') } })
  // A missing injection must fail locally, never contact even a configured loopback service.
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Unexpected HTTP: single-call provider injection was ignored') }
  try {
    const create = await host.prepareCreate(); if (create.kind !== 'planned') throw new Error('Fixture create review missing')
    await host.confirmCreate(create.plan.receipt)
    const intake = await host.prepareAddAssets(); if (intake.kind !== 'planned') throw new Error('Fixture intake review missing')
    await host.dispatchAddAssets(intake.plan.receipt)
    const asset = (await host.listAssets())[0], scope = host.inspect()
    const input = { libraryIdentity: scope.identity!, generation: scope.generation!, assetIds: [asset.id], backendId: 'synthetic', purpose: 'analyze' as const }
    await run({ host, ai, input, calls, clock, admission,respond: fn => { respond = fn } })
    assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash)
  } finally {
    ai.invalidate()
    admission.invalidate()
    await host.close()
    globalThis.fetch = originalFetch
    await fs.rm(root, { recursive: true, force: true })
  }
}

const terminal = (job: VisualAiJob) => !['queued', 'running'].includes(job.state)

await test('injected single-call provider reaches the real Host for analyze and reverse; notifications cannot undo commits', async () => {
  await withFixture(async ({ host, ai, input, calls, clock,admission }) => {
    await host.updateAssetCaption(input.assetIds[0], 'User description')
    for (const purpose of ['analyze', 'reverse'] as const) {
      const before = calls.length
      const review = await ai.prepare('main', { ...input, purpose })
      assert.equal(calls.length, before, 'prepare must not invoke a provider')
      const started = await ai.run('main', review.receipt)
      const done = await eventually(() => ai.inspect('main', started.id), terminal)
      assert.equal(done.state, 'completed', 'Injected provider result must reach real persisted evidence')
      assert.equal(calls.length, before + 1)
      const evidence = (await host.listVisualAiEvidence(input.assetIds[0])).find(item => item.id === done.items[0].evidence?.id)!
      assert.equal(evidence.purpose, purpose)
      assert.equal(evidence.createdAt, new Date(clock.now()).toISOString())
      assert.deepEqual(evidence.output.tags, ['蓝色', '几何'])
      assert.equal((await host.listAssets())[0].aiCaption, 'User description')
      assert.equal(calls.at(-1)!.maxTokens, 1536)
      assert.equal(calls.at(-1)!.temperature, .2)
      assert.match(calls.at(-1)!.userPrompt, purpose === 'reverse' ? /请反推/ : /请分析/)
      const image = await sharp(Buffer.from(calls.at(-1)!.imageDataUrl.split(',')[1], 'base64')).metadata()
      assert.equal(image.format, 'jpeg'); assert.ok(image.width! <= 1024 && image.height! <= 1024)
      assert.equal(admission.inspect().requests,0)
      assert.equal(admission.inspect().receipts,0)
      assert.equal(clock.pending,admission.resourceStatus().preparedCache.entries,'Only cache expiry timers may remain after execution')
    }
    assert.equal((await host.listVisualAiEvidence(input.assetIds[0])).length, 2)
  })
})

await test('one truncated response is retried by the coordinator and committed once without changing user fields', async () => {
  await withFixture(async ({ host, ai, input, calls, clock, respond }) => {
    await host.updateAssetCaption(input.assetIds[0], 'User-owned description')
    const first = await ai.run('main', (await ai.prepare('main', input)).receipt)
    const initial = await eventually(() => ai.inspect('main', first.id), terminal)
    assert.equal(initial.state, 'completed')
    await ai.confirmTag({ ...input, assetId: input.assetIds[0], evidenceId: initial.items[0].evidence!.id, tag: '蓝色' })
    const ocrScope = { libraryIdentity: input.libraryIdentity, generation: input.generation, assetId: input.assetIds[0] }
    const snapshot = await host.readOcr(ocrScope), asset = (await host.listAssets())[0]
    const observed = await host.commitOcr({ ...ocrScope, sessionToken: snapshot.sessionToken, expectedRevision: snapshot.revision, allowUpgrade: true,
      evidence: { id: 'ocr:synthetic', assetId: asset.id, assetRevision: asset.revision, sourceRef: asset.thumbnailRef,
        inputSha256: 'a'.repeat(64), createdAt: new Date(clock.now()).toISOString(),
        observation: { engine: 'rapidocr-onnxruntime', version: '1.4.4', recipe: 'rapidocr-preview-v1',
          modelSha256: { det: 'b'.repeat(64), cls: 'c'.repeat(64), rec: 'd'.repeat(64) },
          width: 100, height: 100, elapsedMs: 1, threshold: .5, blocks: [] } } })
    await host.correctOcr({ ...ocrScope, sessionToken: observed.sessionToken, expectedRevision: observed.revision, evidenceId: observed.evidence!.id, text: 'User-corrected OCR' })
    let attempt = 0
    respond(async () => ++attempt === 1 ? payload('length') : payload())
    const before = calls.length
    const started = await ai.run('main', (await ai.prepare('main', input)).receipt)
    const done = await eventually(() => ai.inspect('main', started.id), terminal)
    assert.equal(done.state, 'completed')
    const invocations = calls.slice(before)
    assert.deepEqual(invocations.map(call => call.maxTokens), [1536, 3072])
    assert.equal(invocations[0].signal, invocations[1].signal)
    assert.equal(invocations[0].imageDataUrl, invocations[1].imageDataUrl)
    assert.equal(invocations[0].endpoint, invocations[1].endpoint)
    assert.equal(invocations[0].model, invocations[1].model)
    assert.match(invocations[1].userPrompt, /不要续写上次结果/)
    assert.equal((await host.listVisualAiEvidence(asset.id)).length, 2, 'Retry creates one complete evidence effect')
    const current = (await host.listAssets())[0]
    assert.equal(current.aiCaption, 'User-owned description')
    assert.equal(current.aiOcrText, 'User-corrected OCR')
    assert.deepEqual(current.tags, ['蓝色'])
    await host.close(); await host.reopen()
    assert.equal((await host.listVisualAiEvidence(asset.id)).length, 2)
    assert.equal((await host.listAssets())[0].aiOcrText, 'User-corrected OCR')
  })
})

await test('invalid or repeatedly truncated provider results preserve the last committed evidence and redact errors', async () => {
  await withFixture(async ({ host, ai, input, calls, respond }) => {
    const seeded = await ai.run('main', (await ai.prepare('main', input)).receipt)
    assert.equal((await eventually(() => ai.inspect('main', seeded.id), terminal)).state, 'completed')
    const failures: Array<{ respond: VisionProvider['invokeOnce']; expectedCalls: number; message: RegExp }> = [
      { respond: async () => payload('length'), expectedCalls: 2, message: /长度上限/ },
      { respond: async () => payload('stop', '{"caption":"missing-fields"}'), expectedCalls: 1, message: /完整有效/ },
      { respond: async () => { throw new Error('AI_HTTP_401') }, expectedCalls: 1, message: /密钥/ },
      { respond: async () => { throw new Error('SYNTHETIC_SECRET raw-response /synthetic/private') }, expectedCalls: 1, message: /分析未完成/ }
    ]
    for (const failure of failures) {
      const before = calls.length
      respond(failure.respond)
      const started = await ai.run('main', (await ai.prepare('main', input)).receipt)
      const done = await eventually(() => ai.inspect('main', started.id), terminal)
      assert.equal(done.state, 'failed'); assert.match(done.items[0].error!, failure.message)
      assert.doesNotMatch(JSON.stringify(done), /SYNTHETIC_SECRET|raw-response|synthetic\/private/)
      assert.equal(calls.length - before, failure.expectedCalls)
      assert.equal((await host.listVisualAiEvidence(input.assetIds[0])).length, 1)
    }
  })
})

await test('controlled time proves the retry shares the original remaining deadline', async () => {
  await withFixture(async ({ host, ai, input, calls, clock, respond }) => {
    respond(async request => {
      if (calls.length === 1) { clock.advance(900); return payload('length') }
      return new Promise((_, reject) => request.signal.addEventListener('abort', () => reject(new Error('aborted synthetic call')), { once: true }))
    })
    const review=await ai.prepare('main',input)
    assert.deepEqual(clock.scheduled,[300000,120000],'Review and retained preparation have separate TTLs')
    assert.equal(clock.pending,2)
    const started = await ai.run('main',review.receipt)
    await eventually(() => calls.length, count => count === 2)
    assert.deepEqual(clock.scheduled,[300000,120000,1000],'Retries receive no second execution deadline')
    assert.equal(clock.pending,2,'One execution deadline and one retained cache expiry remain')
    assert.equal(calls[0].signal, calls[1].signal)
    clock.advance(99)
    assert.equal(ai.inspect('main', started.id).state, 'running')
    clock.advance(1)
    const done = await eventually(() => ai.inspect('main', started.id), terminal)
    assert.equal(done.state, 'failed'); assert.match(done.items[0].error!, /等待时间/)
    assert.equal(calls.length, 2); assert.equal(clock.pending, 1)
    clock.advance(120000);assert.equal(clock.pending,0,'Cache TTL expires independently without another call')
    assert.equal((await host.listVisualAiEvidence(input.assetIds[0])).length, 0)
  })
})

for (const cancellation of ['cancel-job', 'release-owner', 'invalidate-and-reopen'] as const) {
  await test(`${cancellation} rejects a provider response that ignores cancellation`, async () => {
    await withFixture(async ({ host, ai, input, calls, clock, respond,admission }) => {
      let release!: (value: unknown) => void
      respond(async () => new Promise(resolve => { release = resolve }))
      const owner = 'card:synthetic-owner'
      const started = await ai.run(owner, (await ai.prepare(owner, input)).receipt)
      await eventually(() => calls.length, count => count === 1)
      if (cancellation === 'cancel-job') ai.cancel(owner, started.id)
      else if (cancellation === 'release-owner') ai.cancelOwner(owner)
      else {
        ai.invalidate(); await host.close(); await host.reopen()
        assert.equal(host.inspect().generation, input.generation, 'Normal reopen can retain persistent generation')
      }
      assert.equal(calls[0].signal.aborted, true)
      release(payload())
      const done = await eventually(() => ai.inspect('main', started.id), terminal)
      assert.equal(done.state, 'cancelled')
      assert.equal((await host.listVisualAiEvidence(input.assetIds[0])).length, 0)
      assert.equal(clock.pending,admission.resourceStatus().preparedCache.entries)
      admission.releaseIdleMaterials();assert.equal(clock.pending,0)
    })
  })
}

await test('receipt expiry follows the injected clock and never invokes the provider', async () => {
  await withFixture(async ({ ai, input, calls, clock }) => {
    const review = await ai.prepare('main', input)
    clock.advance(300_001)
    await assert.rejects(ai.run('main', review.receipt), /确认已过期/)
    assert.equal(calls.length, 0); assert.equal(clock.pending, 0)
  })
})

await test('public failures and console diagnostics omit provider key, raw response and image payload', async () => {
  await withFixture(async ({ host, ai, input, calls, respond }) => {
    const diagnostics: unknown[][] = []
    const original = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug }
    for (const name of ['log', 'info', 'warn', 'error', 'debug'] as const) console[name] = (...args: unknown[]) => { diagnostics.push(args) }
    try {
      respond(async request => {
        throw new Error(`key=${request.apiKey}; SYNTHETIC_RAW_RESPONSE; image=${request.imageDataUrl}`)
      })
      const started = await ai.run('main', (await ai.prepare('main', input)).receipt)
      const done = await eventually(() => ai.inspect('main', started.id), terminal)
      assert.equal(done.state, 'failed')
      assert.equal(calls.length, 1, 'An unknown provider exception must not add a hidden retry')
      assert.equal(calls[0].apiKey, 'SYNTHETIC_PROVIDER_KEY')
      const exposed = JSON.stringify({ job: done, diagnostics })
      assert.doesNotMatch(exposed, /SYNTHETIC_PROVIDER_KEY|SYNTHETIC_RAW_RESPONSE|data:image/)
      assert.equal(exposed.includes(calls[0].imageDataUrl), false)
      assert.equal((await host.listVisualAiEvidence(input.assetIds[0])).length, 0)
    } finally {
      Object.assign(console, original)
    }
  })
})
