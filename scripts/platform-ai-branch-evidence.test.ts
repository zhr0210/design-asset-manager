import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPlatformAiBranchEvidence } from '../src/main/services/ai-runtime/platform-ai-branch-evidence.internal'
import type { AiRuntimeOnnxModelLoadProbeResponse, AiRuntimePythonExecutionProbeResponseBase } from '../src/shared/contracts/ai-runtime.contract'
import type { LlamaServerTestResult } from '../src/shared/types/llama-runtime.types'
import type { OcrRealEvidenceProbeResponse } from '../src/shared/types/ocr-real-evidence.types'
import type { PlatformAiBranchStatusResponse, PlatformAiWorkflow } from '../src/shared/types/platform-ai-branch-status.types'
import type { WorkerModelStatusSnapshot } from '../src/shared/types/model-artifact-readiness.types'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'

const checkedAt = '2026-10-01T00:00:00.000Z', checkedAtMs = Date.parse(checkedAt), ttl = 300000
const python: AiRuntimePythonExecutionProbeResponseBase = { success: true, status: 'executed_real', checkedAt, operation: 'tensor_square_sum', resultFinite: true }
const onnx: AiRuntimeOnnxModelLoadProbeResponse = { success: true, status: 'loaded_real', modelFamily: 'wd_tagger', checkedAt, providers: ['synthetic'], inputCount: 1, outputCount: 1 }
const ocr: OcrRealEvidenceProbeResponse = { success: true, status: 'loaded_real', provider: 'rapidocr', operation: 'generated_image_text_detection', generatedFixture: true, downloadsAllowed: false, boxCount: 1, resultFinite: true, attempts: [], checkedAt, durationMs: 1 }
const llama: LlamaServerTestResult = { success: true, baseUrl: 'http://synthetic.invalid', models: ['synthetic'], chatOk: true, visionOk: true, visionInput: 'generated_fixture', checkedAt }
const sources = { currentPlatform: 'darwin' as const, getWorkerModelStatus: async (): Promise<WorkerModelStatusSnapshot | null> => null, getLlamaStatus: () => null, listRuntimes: () => [] }
const statusOf = (status: PlatformAiBranchStatusResponse, workflow: PlatformAiWorkflow) => status.workflows.find(item => item.workflow === workflow)!.status
type Family = 'python' | 'onnx' | 'ocr' | 'llama'
const workflow: Record<Family, PlatformAiWorkflow> = { python: 'ai_tag_task', onnx: 'ai_tag_task', ocr: 'ocr_text_box', llama: 'ai_prompt_task' }
const expected = (family: Family) => family === 'python' ? 'runtime_probe_ready' : 'real_model_path'
function fixture() {
  let time = checkedAtMs
  const module = createPlatformAiBranchEvidence(() => time)
  const record = (family: Family, date = checkedAt) => {
    if (family === 'python') module.record({ kind: family, lane: 'python_mps', probe: { ...python, checkedAt: date } })
    if (family === 'onnx') module.record({ kind: family, requestedFamily: 'wd_tagger', probe: { ...onnx, checkedAt: date } })
    if (family === 'ocr') module.record({ kind: family, probe: { ...ocr, checkedAt: date } })
    if (family === 'llama') module.record({ kind: family, probe: { ...llama, checkedAt: date } })
  }
  return { module, record, read: () => module.readStatus('macos', sources), get time() { return time }, set time(value: number) { time = value } }
}

for (const family of ['python', 'onnx', 'ocr', 'llama'] as const) {
  await test(family + ' records through status, retains exact TTL and can reappear after clock rollback', async () => {
    const f = fixture()
    assert.notEqual(statusOf(await f.read(), workflow[family]), expected(family))
    f.record(family)
    assert.equal(statusOf(await f.read(), workflow[family]), expected(family))
    f.time = checkedAtMs + ttl
    assert.equal(statusOf(await f.read(), workflow[family]), expected(family))
    f.time++
    assert.notEqual(statusOf(await f.read(), workflow[family]), expected(family))
    f.time = checkedAtMs
    assert.equal(statusOf(await f.read(), workflow[family]), expected(family))
  })
  await test(family + ' invalid timestamps replace prior evidence; future timestamps retain existing acceptance', async () => {
    const f = fixture()
    f.record(family); f.record(family, 'invalid')
    assert.notEqual(statusOf(await f.read(), workflow[family]), expected(family))
    f.record(family, new Date(checkedAtMs + ttl).toISOString())
    assert.equal(statusOf(await f.read(), workflow[family]), expected(family))
  })
  await test(family + ' keeps recorded object references rather than cloning', async () => {
    const f = fixture()
    const probe = { ...({ python, onnx, ocr, llama }[family]) }
    if (family === 'python') f.module.record({ kind: family, lane: 'python_mps', probe: probe as typeof python })
    if (family === 'onnx') f.module.record({ kind: family, requestedFamily: 'wd_tagger', probe: probe as typeof onnx })
    if (family === 'ocr') f.module.record({ kind: family, probe: probe as typeof ocr })
    if (family === 'llama') f.module.record({ kind: family, probe: probe as typeof llama })
    assert.equal(statusOf(await f.read(), workflow[family]), expected(family))
    probe.checkedAt = 'invalid'
    assert.notEqual(statusOf(await f.read(), workflow[family]), expected(family))
  })
}

await test('Python lane records are independent and never imply model inference', async () => {
  const f = fixture()
  f.module.record({ kind: 'python', lane: 'python_mps', probe: { ...python } })
  f.module.record({ kind: 'python', lane: 'python_cuda', probe: { ...python, status: 'backend_unavailable', success: false } })
  assert.equal(statusOf(await f.read(), 'ai_tag_task'), 'runtime_probe_ready')
  const windows = await f.module.readStatus('windows', { ...sources, currentPlatform: 'win32' })
  assert.equal(statusOf(windows, 'ai_tag_task'), 'evidence_insufficient')
  f.module.record({ kind: 'python', lane: 'python_cuda', probe: { ...python } })
  assert.equal(statusOf(await f.module.readStatus('windows', { ...sources, currentPlatform: 'win32' }), 'ai_tag_task'), 'runtime_probe_ready')
  assert.ok((await f.read()).workflows.every(item => item.status !== 'real_model_path'))
})

await test('ONNX cache keys use requested family while readiness uses returned family', async () => {
  const f = fixture()
  f.module.record({ kind: 'onnx', requestedFamily: 'wd_tagger', probe: { ...onnx, modelFamily: 'clip' } })
  f.module.record({ kind: 'onnx', requestedFamily: 'clip', probe: { ...onnx } })
  assert.equal(statusOf(await f.read(), 'search_embedding'), 'real_model_path')
  assert.equal(statusOf(await f.read(), 'ai_tag_task'), 'real_model_path')
  f.module.record({ kind: 'onnx', requestedFamily: 'wd_tagger', probe: { ...onnx } })
  assert.notEqual(statusOf(await f.read(), 'search_embedding'), 'real_model_path')
})

await test('resolved failures replace success, retaining existing per-kind mapper policies', async () => {
  const f = fixture()
  for (const family of ['python', 'onnx', 'ocr', 'llama'] as const) f.record(family)
  f.module.record({ kind: 'python', lane: 'python_mps', probe: { ...python, success: false, status: 'execution_failed' } })
  f.module.record({ kind: 'onnx', requestedFamily: 'wd_tagger', probe: { ...onnx, success: false, status: 'load_failed' } })
  f.module.record({ kind: 'ocr', probe: { ...ocr, success: false } })
  f.module.record({ kind: 'llama', probe: { ...llama, visionOk: false } })
  for (const family of ['python', 'onnx', 'ocr', 'llama'] as const) assert.notEqual(statusOf(await f.read(), workflow[family]), expected(family))
  // The existing ONNX mapper intentionally uses status alone.
  f.module.record({ kind: 'onnx', requestedFamily: 'wd_tagger', probe: { ...onnx, success: false } })
  assert.equal(statusOf(await f.read(), 'ai_tag_task'), 'real_model_path')
})

await test('instances remain isolated; latest follows completion order rather than checkedAt order', async () => {
  const f = fixture(), independent = fixture()
  f.record('llama')
  assert.notEqual(statusOf(await independent.read(), 'ai_prompt_task'), 'real_model_path')
  f.module.record({ kind: 'llama', probe: { ...llama, checkedAt: new Date(checkedAtMs - 1000).toISOString(), success: false } })
  assert.notEqual(statusOf(await f.read(), 'ai_prompt_task'), 'real_model_path')
})

await test('only Worker Promise rejection degrades to null; sync and other source failures propagate', async () => {
  const f = fixture()
  f.record('ocr')
  const rejected = await f.module.readStatus('macos', { ...sources, getWorkerModelStatus: () => Promise.reject(Error('synthetic worker rejection')) })
  assert.equal(statusOf(rejected, 'ocr_text_box'), 'real_model_path')
  await assert.rejects(f.module.readStatus('macos', { ...sources, getWorkerModelStatus: () => { throw Error('synthetic worker sync') } }), /worker sync/)
  await assert.rejects(f.module.readStatus('macos', { ...sources, getLlamaStatus: () => { throw Error('synthetic llama') } }), /llama/)
  await assert.rejects(f.module.readStatus('macos', { ...sources, listRuntimes: () => { throw Error('synthetic list') } }), /list/)
})

await test('Worker wait and the second await checkpoint admit later evidence before Runtime and Python reads', async () => {
  const f = fixture(), order: string[] = []
  let resolve!: (value: null) => void
  const pending = new Promise<null>(done => { resolve = done })
  const status = f.module.readStatus('macos', {
    get currentPlatform() { order.push('platform'); return 'darwin' },
    getWorkerModelStatus: () => { order.push('worker'); return pending },
    getLlamaStatus: () => {
      order.push('llama')
      queueMicrotask(() => { order.push('record-python'); f.record('python') })
      return null
    },
    listRuntimes: () => { order.push('runtimes'); return [] }
  })
  assert.deepEqual(order, ['worker'])
  f.record('ocr'); resolve(null)
  const result = await status
  assert.equal(statusOf(result, 'ocr_text_box'), 'real_model_path')
  assert.equal(result.workflows[0].runtimeLanes.find(item => item.lane === 'python_mps')!.status, 'runtime_probe_ready')
  assert.deepEqual(order, ['worker', 'llama', 'record-python', 'platform', 'runtimes'])
})

await test('freshness observations keep original per-kind clock calls and are not one snapshot', async () => {
  let calls = 0
  const module = createPlatformAiBranchEvidence(() => { calls++; return checkedAtMs + (calls === 3 ? ttl + 1 : ttl) })
  module.record({ kind: 'llama', probe: { ...llama } })
  module.record({ kind: 'ocr', probe: { ...ocr } })
  module.record({ kind: 'onnx', requestedFamily: 'wd_tagger', probe: { ...onnx } })
  module.record({ kind: 'onnx', requestedFamily: 'clip', probe: { ...onnx, modelFamily: 'clip' } })
  module.record({ kind: 'python', lane: 'python_mps', probe: { ...python } })
  const status = await module.readStatus('macos', sources)
  assert.equal(calls, 5)
  assert.equal(statusOf(status, 'ai_tag_task'), 'runtime_probe_ready')
  assert.equal(statusOf(status, 'search_embedding'), 'real_model_path')
  assert.equal(statusOf(status, 'ocr_text_box'), 'real_model_path')
  assert.equal(statusOf(status, 'ai_prompt_task'), 'real_model_path')
})

await test('Runtime changes alone do not invalidate fresh model evidence; platform mismatch remains unavailable', async () => {
  const f = fixture()
  f.record('llama')
  const running: AiRuntimeState = { id: 'synthetic-runtime', kind: 'custom-http', status: 'running', healthStatus: 'ok', startedAt: checkedAt, stoppedAt: null, lastHealthCheckAt: checkedAt, lastError: null, pid: null, baseUrl: 'http://synthetic.invalid' }
  assert.equal(statusOf(await f.module.readStatus('macos', { ...sources, listRuntimes: () => [running] }), 'ai_prompt_task'), 'real_model_path')
  const stopped = { ...sources, listRuntimes: () => [] }
  assert.equal(statusOf(await f.module.readStatus('macos', stopped), 'ai_prompt_task'), 'real_model_path')
  const mismatch = await f.module.readStatus('windows', sources)
  assert.ok(mismatch.workflows.every(item => item.status === 'unavailable'))
})

await test('source summaries feed existing readiness rules without treating paths or ready-to-load as inference', async () => {
  const f = fixture()
  const loaded = await f.module.readStatus('macos', {
    ...sources, getWorkerModelStatus: async () => ({ cooperative_models: { wd_tagger: { loaded: true, is_mock: false } } })
  })
  assert.equal(statusOf(loaded, 'ai_tag_task'), 'real_model_path')
  const unverified = await f.module.readStatus('macos', {
    ...sources, getWorkerModelStatus: async () => ({ cooperative_models: { wd_tagger: { loaded: false, readiness: { state: 'ready_to_load' } } } }),
    getLlamaStatus: () => ({ phase: 'idle', progress: 0, message: 'synthetic', baseUrl: 'http://synthetic.invalid', modelPath: '/synthetic/model.gguf', mmprojPath: '/synthetic/vision.gguf' })
  })
  assert.notEqual(statusOf(unverified, 'ai_tag_task'), 'real_model_path')
  assert.notEqual(statusOf(unverified, 'ai_prompt_task'), 'real_model_path')
  assert.equal(JSON.stringify(unverified).includes('/synthetic/'), false)
})
