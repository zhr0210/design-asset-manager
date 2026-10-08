import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createManagedVisionRuntime } from '../src/main/services/ai-runtime/managed-vision-runtime'
import { createVisualAdmission } from '../src/main/visual-ai/visual-admission'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'

// Negative qualification only: disposable invalid model files, actual trusted
// installed Python and the candidate's bundled runner. No positive readiness fixture.
const python = 'C:\\Users\\kilian\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
async function fixture() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-vision-negative-')))
  const model = path.join(root, 'model')
  await fs.mkdir(model)
  await fs.writeFile(path.join(model, 'config.json'), JSON.stringify({ model_type: 'qwen3_vl', text_config: { hidden_size: 2560, num_hidden_layers: 36 } }))
  for (const name of ['tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json']) await fs.writeFile(path.join(model, name), '{}')
  await fs.writeFile(path.join(model, 'chat_template.json'), JSON.stringify({ chat_template: '{{ messages }}' }))
  // These are invalid-model/actual-exit tests, not desktop-memory tests. An
  // unrelated open application must not prevent reaching the negative check.
  // No positive model qualification is supplied by this memory fixture.
  const db = new Database(path.join(root, 'app.sqlite')), admission = createVisualAdmission({policy:{mode:'normal',reserveFraction:.05},
    memory:()=>({free:48*1024**3,total:64*1024**3})})
  let settings = createNewInstallAppSettingsDefaults()
  const runtime = createManagedVisionRuntime({ database: db, admission, runner: path.resolve('out/main/ai-service/tools/managed_vision_worker.py'),
    settings: { getSettings: () => settings, saveSettings: value => (settings = { ...settings, ...value }) } as any,
    selectModel: async () => model, selectPython: async () => python, changed() {} })
  return { root, model, db, admission, runtime, close: async () => {
    await runtime.drain(); db.close()
    assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('dam-vision-negative-'))
    await fs.rm(root, { recursive: true, force: true })
  } }
}
async function structurallyValidNegativeWeights(file: string) {
  const header = Buffer.from(JSON.stringify({ 'not.a.real.qwen.tensor': { dtype: 'F32', shape: [1], data_offsets: [0, 4] } }))
  const prefix = Buffer.alloc(8); prefix.writeBigUInt64LE(BigInt(header.length))
  await fs.writeFile(file, Buffer.concat([prefix, header, Buffer.alloc(4)]))
}
await test('missing weights and remote-code declarations never create a trusted execution configuration', async () => {
  const f = await fixture()
  try {
    await assert.rejects(f.runtime.configure(), /LOCAL_MODEL_INVALID/)
    assert.equal(f.db.prepare('SELECT COUNT(*) FROM managed_vision_runtime').pluck().get(), 0)
    await fs.writeFile(path.join(f.model, 'config.json'), JSON.stringify({ model_type: 'qwen3_vl', auto_map: { AutoModel: 'modeling.CustomModel' }, text_config: { hidden_size: 2560, num_hidden_layers: 36 } }))
    await assert.rejects(f.runtime.configure(), /LOCAL_MODEL_UNSUPPORTED/)
    assert.equal(f.db.prepare('SELECT COUNT(*) FROM managed_vision_runtime').pluck().get(), 0)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('changed imported bytes revoke the binding before model residency or worker startup', async () => {
  const f = await fixture()
  try {
    const weights = path.join(f.model, 'model.safetensors')
    await structurallyValidNegativeWeights(weights)
    await f.runtime.configure()
    const before = f.db.prepare('SELECT configuration FROM managed_vision_runtime').pluck().get()
    const changed = await fs.open(weights, 'r+'); try { const stat = await changed.stat(); await changed.write(Buffer.from([255]), 0, 1, stat.size - 1) } finally { await changed.close() }
    await assert.rejects(f.runtime.activate(), /LOCAL_MODEL_CHANGED/)
    assert.equal(f.db.prepare('SELECT configuration FROM managed_vision_runtime').pluck().get(), before)
    assert.equal(f.runtime.status().state, 'failed')
    assert.equal(f.runtime.status().executionId, null)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
  } finally { await f.close() }
})
await test('actual bundled worker failure cannot qualify corrupt weights and drains its real process before release', async () => {
  const f = await fixture()
  try {
    await structurallyValidNegativeWeights(path.join(f.model, 'model.safetensors'))
    await f.runtime.configure()
    await assert.rejects(f.runtime.activate(), /LOCAL_RUNTIME_START_FAILED|LOCAL_RUNTIME_EXITED/)
    await f.runtime.drain()
    assert.notEqual(f.runtime.status().state, 'ready')
    assert.equal(f.runtime.status().executionId, null)
    assert.equal(f.admission.resourceStatus().residentBytes, 0)
    assert.equal(JSON.parse(String(f.db.prepare('SELECT configuration FROM managed_vision_runtime').pluck().get())).enabled, false)
  } finally { await f.close() }
})
