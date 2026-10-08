import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { performance } from 'node:perf_hooks'
import Database from 'better-sqlite3'
import { createManagedVisionRuntime, MANAGED_VISION_ID } from '../../src/main/services/ai-runtime/managed-vision-runtime'
import { createManagedModelLibrary } from '../../src/main/model-library-workspace/managed-model-library'
import { createManagedGgufPackages } from '../../src/main/services/ai-runtime/managed-gguf-packages'
import { createVisualAdmission } from '../../src/main/visual-ai/visual-admission'
import { createNewInstallAppSettingsDefaults } from '../../src/main/services/settings/settings-defaults.builder'
import { createActiveLibraryHost } from '../../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../../src/main/library-lifecycle/production-active-library-dependencies'
import { createBasicAnalysisController } from '../../src/main/background-analysis/basic-analysis-controller'
import { createBackgroundAnalysisController } from '../../src/main/background-analysis/background-analysis-controller'
import { createVisualAiController } from '../../src/main/visual-ai/visual-ai-controller'
import { createTagExecutionController } from '../../src/main/independent-tags/tag-execution-controller'
import { createOcrRuntime } from '../../src/main/ocr/ocr-runtime'
import { createOcrController } from '../../src/main/ocr/ocr-controller'
import { createLocalAiDeviceSampler } from '../../src/main/local-ai-resources/device-sampler'
import { DAM_BUILD_IDENTITY } from '../../src/shared/build-identity.generated'
import type { VisionProvider } from '../../src/main/visual-ai/openai-vision.provider'

// Formal source controllers and actual packaged workers. This is an internal
// soak on the authorized recoverable F copy, never Browser/installed-app proof.
// Read only public model inventory/package and OCR environment rows, no settings
// or credentials. The copied qualifications must survive real offline rechecks.
const base = path.resolve('.scratch/f-release-scale-20261008')
const profile = path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04')
const resources = path.join(base, 'package/win-unpacked/resources')
const root = await fs.mkdtemp(path.join(base, 'soak-'))
const db = new Database(path.join(root, 'app.sqlite'))
const denied = async () => { throw Error('F_SOAK_NETWORK_FORBIDDEN') }
const sampler = createLocalAiDeviceSampler()
await sampler.refresh()
const admission = createVisualAdmission({ devices: sampler.read, policy: { mode: 'normal', reserveFraction: .1 } })
let settings = createNewInstallAppSettingsDefaults()
const runner = path.join(resources, 'ai-service/tools/managed_vision_worker.py')
const packages = createManagedGgufPackages({ database: db, root: path.join(profile, 'managed-gguf-runtime'), fetch: denied, changed() {} })
const models = createManagedModelLibrary({ database: db, root: path.join(profile, 'managed-models'), runner, fetch: denied,
  selectModel: async () => null, selectPython: async () => null,
  reserve: (id, signal) => admission.reserveResident(id, 128 * 1024 ** 2, signal), changed() {}, admission })
const runtime = createManagedVisionRuntime({ database: db, runner, models, ggufPackages: packages, admission,
  settings: { getSettings: () => settings, saveSettings: value => (settings = { ...settings, ...value }) },
  selectModel: async () => null, selectPython: async () => null, changed() {}, refreshDevices: sampler.refresh })
const ocrRuntime = createOcrRuntime({ database: db, runner: path.join(resources, 'ai-service/tools/local_ocr_worker.py'),
  selectRoot: async () => null, reserve: (bytes, signal) => admission.reserveOcr(bytes, signal) })
const source = new Database(path.join(profile, 'app-state/app-state.sqlite'), { readonly: true, fileMustExist: true })
let modelId: string
try {
  db.prepare('INSERT OR REPLACE INTO managed_model_store VALUES(1,?)').run(source.prepare('SELECT identity FROM managed_model_store WHERE singleton=1').pluck().get())
  const row = source.prepare("SELECT id,record FROM managed_model_entries WHERE json_extract(record,'$.artifact.modelId')='qwen3-vl-2b-instruct' AND json_extract(record,'$.artifact.gguf.languageQuantization')='Q4_K_M'").get() as { id: string; record: string } | undefined
  assert.ok(row, 'Actual public model installation required')
  modelId = row.id
  db.prepare('INSERT INTO managed_model_entries VALUES(?,?)').run(row.id, row.record)
  for (const row of source.prepare('SELECT variant,record FROM managed_gguf_packages').all() as Array<{ variant: string; record: string }>)
    db.prepare('INSERT INTO managed_gguf_packages VALUES(?,?)').run(row.variant, row.record)
  const environment = source.prepare('SELECT root FROM local_ocr_runtime WHERE singleton=1').pluck().get()
  assert.equal(typeof environment, 'string')
  db.prepare('INSERT INTO local_ocr_runtime VALUES(1,?)').run(environment)
} finally { source.close() }
let selection: string[] = [], physicalCalls = 0
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected', directory: path.join(base, 'library-10000') }),
  selectLocalFiles: async () => ({ kind: 'selected', files: selection.map(filePath => ({ filePath })) })
}, { admission, backupBundleDirectory: path.join(resources, 'windows-backup-runtime/win32-x64') }))
const provider: VisionProvider = { prepare: (_id, signal) => runtime.prepare(signal),
  invokeOnce: input => { physicalCalls++; return runtime.invokeOnce(input) },
  recoverLocal: runtime.recoverLocal, finishLocalRecovery: runtime.finishLocalRecovery }
const visual = createVisualAiController({ host, settings: () => settings, provider, admission, onChanged() {} })
const tags = createTagExecutionController({ host, settings: () => settings, provider, admission, legacy: visual, changed() {} })
const ocr = createOcrController({ host, runtime: ocrRuntime, reserve: (bytes, signal, priority) => admission.reserveOcr(bytes, signal, priority), changed() {} })
const basic = createBasicAnalysisController({ host, settings: () => settings, provider, admission, tags, ocr, ocrRuntime,
  resourceReadiness: rule => rule.backendId === MANAGED_VISION_ID ? runtime.backgroundReadiness() : undefined,
  upgrade: async () => { throw Error('F_SOAK_REQUIRES_ALREADY_UPGRADED_LIBRARY') }, changed() {} })
const background = createBackgroundAnalysisController({ host, admission, basic,
  // No telemetry value grants model qualification/admission. Unknown platform
  // signals stay unknown; actual admission samples OS RAM and device resources.
  telemetry: () => ({ memory: { kind: 'known', value: { free: os.freemem(), total: os.totalmem() }, sampledAt: performance.now() },
    battery: { kind: 'unknown' }, lowPower: { kind: 'unknown' }, thermal: { kind: 'unknown' }, idle: { kind: 'unknown' }, visible: { kind: 'unknown' }, gpuFree: { kind: 'unknown' } }),
  holdOcr: () => ocr.holdForMaintenance(),
  visuals: { suspendAndDrain: async () => { await Promise.all([basic.suspendAndDrain(), tags.suspendAndDrain(), visual.suspendAndDrain()]) },
    resume: () => { basic.resume(); tags.resume(); visual.resume(); ocr.resume() } } })
const evidence = path.join(base, 'evidence/background-soak.json')
const samples: unknown[] = [], imported: string[] = []
const write = (value: unknown) => fs.writeFile(evidence, JSON.stringify(value, null, 2) + '\n')
let complete = false, began = 0, peakHostRss = 0
try {
  await host.open()
  assert.equal(host.inspect().state, 'ready')
  assert.equal((await host.listAssets()).length, 10000, 'Start from the selected 10000-record candidate')
  await runtime.activateModel(modelId, { mode: 'cpu' })
  assert.equal(runtime.status().state, 'ready', 'Actual installed model image requalification required')
  for (let n = 0; n < 120; n++) {
    if ((await ocrRuntime.current())?.qualification) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.ok((await ocrRuntime.current())?.qualification, 'Actual OCR image qualification required')
  const scope = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation! }
  const current = await host.readBackgroundExecution(scope)
  const review = await background.prepareExecution('main', { ...scope, enabled: true, capabilities: { tags: false, caption: true, ocr: true },
    backendId: MANAGED_VISION_ID, model: runtime.status().model!, dailyCallLimit: 1, expectedRevision: current.policy.revision })
  await background.confirmExecution('main', review.receipt)
  await background.suspendAndDrain()
  began = Date.now()
  const masters = (await fs.readdir(path.join(base, 'public-masters'))).sort()
  assert.equal(masters.length, 3)
  await fs.mkdir(path.join(root, 'sources'))
  // Three spaced batches retain load/idle/reload behaviour without pretending
  // nine filename copies are nine independent quality inputs or 10000 AI calls.
  for (let batch = 0; batch < 3; batch++) {
    while (Date.now() - began < batch * 10 * 60000) await observe()
    selection = []
    for (let n = 0; n < masters.length; n++) {
      const file = path.join(root, 'sources', `F-soak-${batch + 1}-${n + 1}.png`)
      await fs.copyFile(path.join(base, 'public-masters', masters[n]), file, fs.constants.COPYFILE_EXCL)
      selection.push(file)
    }
    const planned = await host.prepareAddAssets()
    assert.equal(planned.kind, 'planned')
    if (planned.kind !== 'planned') throw Error('F_IMPORT_REVIEW_UNAVAILABLE')
    const dispatched = await host.dispatchAddAssets(planned.plan.receipt)
    assert.equal(dispatched.state, 'complete')
    imported.push(...(await host.listAssets()).filter(asset => asset.title.startsWith(`F-soak-${batch + 1}-`)).map(asset => asset.id))
    background.resume()
    await observe()
  }
  while (Date.now() - began < 30 * 60000) await observe()
  await background.suspendAndDrain()
  const snapshot = await host.readBackgroundExecution(scope)
  const outcomes = snapshot.items.filter(item => imported.includes(item.assetId))
  assert.equal(imported.length, 9)
  assert.equal(outcomes.length, 18)
  assert.ok(outcomes.every(item => item.state === 'succeeded'), JSON.stringify(outcomes))
  const outputs = []
  for (const assetId of imported) {
    const captions = await host.readCaptions({ ...scope, assetId }), text = await host.readOcr({ ...scope, assetId })
    assert.ok(captions.length > 0)
    outputs.push({ assetId, caption: captions.at(-1), ocr: text })
  }
  const pause = await background.prepareExecution('main', { ...scope, enabled: false, capabilities: { tags: false, caption: true, ocr: true },
    backendId: MANAGED_VISION_ID, model: runtime.status().model!, dailyCallLimit: 1, expectedRevision: snapshot.policy.revision })
  await background.confirmExecution('main', pause.receipt)
  await runtime.drain()
  await ocrRuntime.suspendAndDrain?.()
  assert.equal(admission.resourceStatus().residentBytes, 0)
  assert.equal(admission.inspect().materialBytes, 0)
  const count = (await host.listAssets()).length
  await host.close(); await host.reopen()
  assert.equal(host.inspect().state, 'ready')
  assert.equal((await host.listAssets()).length, count)
  const reopenedScope = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation! }
  const reopened = await host.readBackgroundExecution(reopenedScope)
  assert.deepEqual(reopened.items.filter(item => imported.includes(item.assetId)), outcomes)
  complete = true
  await write({ build: DAM_BUILD_IDENTITY, passed: true, kind: 'internal production controller/real packaged worker soak; Browser NOT_RUN',
    durationMs: Date.now() - began, count, importedCopies: 9, independentContents: 3, capabilities: ['caption', 'ocr'],
    physicalModelCalls: physicalCalls, cloudCalls: 0, peakHostRss, model: runtime.status().model, outcomes, outputs, samples,
    resource: admission.resourceStatus(), reopensWithoutRetry: true })
} finally {
  await background.suspendAndDrain(); await basic.suspendAndDrain(); await tags.suspendAndDrain(); await visual.suspendAndDrain()
  await ocrRuntime.suspendAndDrain?.(); await runtime.drain(); await host.close(); await sampler.stop()
  admission.invalidate(); db.close()
  if (!complete) await write({ build: DAM_BUILD_IDENTITY, passed: false, durationMs: began ? Date.now() - began : 0,
    kind: 'partial internal soak, not completed', physicalModelCalls: physicalCalls, imported, samples, peakHostRss })
}

async function observe() {
  const start = performance.now()
  const scope = { libraryIdentity: host.inspect().identity!, generation: host.inspect().generation! }
  const page = await host.searchAssetPage({ ...scope, query: 'F-公开-万条-00001', tagScope: 'includes-pending', limit: 100 })
  assert.equal(page.total, 1)
  peakHostRss = Math.max(peakHostRss, process.memoryUsage().rss)
  const execution = await host.readBackgroundExecution(scope)
  samples.push({ elapsedMs: Date.now() - began, queryMs: performance.now() - start, rss: process.memoryUsage().rss,
    physicalCalls, own: execution.items.filter(item => imported.includes(item.assetId)).map(item => ({ capability: item.capability, state: item.state })),
    resource: admission.resourceStatus() })
  await write({ build: DAM_BUILD_IDENTITY, passed: false, state: 'running', elapsedMs: Date.now() - began, imported, samples, peakHostRss })
  await new Promise(resolve => setTimeout(resolve, 10000))
}
