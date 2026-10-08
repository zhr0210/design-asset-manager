import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { test } from 'node:test'

// Bundle both complete retained adapters, replacing only side-effect owners.
// Their bootstrap, DB, settings, model files and real endpoints are never imported.
const handlers = new Map(), errors = [], calls = []
const fixture = {
  handlers, calls, workerStatus: null, workerError: null, llamaError: null,
  python: { success: true, status: 'executed_real', checkedAt: new Date().toISOString(), operation: 'tensor_square_sum', resultFinite: true },
  onnx: { success: true, status: 'loaded_real', modelFamily: 'wd_tagger', checkedAt: new Date().toISOString(), providers: [], inputCount: 1, outputCount: 1 },
  ocr: { success: true, status: 'loaded_real', checkedAt: new Date().toISOString(), provider: 'rapidocr', operation: 'generated_image_text_detection', generatedFixture: true, downloadsAllowed: false, boxCount: 1, resultFinite: true, attempts: [], durationMs: 1 },
  llama: { success: true, baseUrl: 'http://synthetic.invalid', models: ['synthetic'], chatOk: true, visionOk: true, visionInput: 'generated_fixture', checkedAt: new Date().toISOString() },
  probeError: null
}
globalThis.__damBranchIpc = fixture
const stubs = new Map([
  ['electron', `export const ipcMain={handle:(channel,handler)=>globalThis.__damBranchIpc.handlers.set(channel,handler)};export const app={getPath:()=>'/synthetic'};`],
  ['ai-client.service', `export class AiClientService {
    getModelsStatus(){const f=globalThis.__damBranchIpc;return f.workerError?Promise.reject(f.workerError):Promise.resolve(f.workerStatus)}
    async probePythonMpsExecution(){const f=globalThis.__damBranchIpc;if(f.probeError)throw f.probeError;return f.python}
    async probePythonCudaExecution(){return this.probePythonMpsExecution()}
    async probeOnnxModelLoad(family){const f=globalThis.__damBranchIpc;f.calls.push(family);if(f.probeError)throw f.probeError;return f.onnx}
  }`],
  ['ai-runtime-bootstrap', `export function bootstrapAiRuntimeManager(){globalThis.__damBranchIpc.calls.push('synthetic-bootstrap');return {manager:{listRuntimes:()=>[],startRuntime:async()=>({success:true}),stopAllRuntimes:async()=>[]}}}`],
  ['ai-service-paths', `export const resolveAiServiceRoot=()=>'/synthetic';`],
  ['ai-python-runtime.service', `export const resolvePythonExecutable=()=>'/synthetic/python';`],
  ['ai-runtime-host-context', `export const createAiRuntimeHostContext=()=>({platform:'darwin',arch:'arm64',homeDir:'/synthetic'});`],
  ['llama-runtime-install.service', `export class LlamaRuntimeInstallService {static getInstance(){return {
    getStatus:()=>{const f=globalThis.__damBranchIpc;if(f.llamaError)throw f.llamaError;return null},
    testServer:async()=>{const f=globalThis.__damBranchIpc;if(f.probeError)throw f.probeError;return f.llama},
    startServer:async()=>({success:true})
  }}}`],
  ['ocr-real-evidence-probe.factory', `export const createOcrRealEvidenceProbeService=()=>({probe:async()=>{const f=globalThis.__damBranchIpc;if(f.probeError)throw f.probeError;return f.ocr}});`],
  ['settings.service', `export class SettingsService {static getInstance(){return {getSettings:()=>({})}}}`],
  ['llama-runtime-local-models', `export const getDownloadedArtifactState=()=>{throw Error('model access forbidden in synthetic test')};`]
])
await fs.mkdir('dist-temp/tests', { recursive: true })
const outfile = path.resolve('dist-temp/tests/platform-ai-branch-evidence-ipc.mjs')
await build({
  stdin: { contents: `export {registerAiRuntimeIpc} from './src/main/ipc/ai-runtime.ipc.ts'; export {registerLlamaRuntimeIpc} from './src/main/ipc/llama-runtime.ipc.ts';`, resolveDir: process.cwd() },
  outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
  plugins: [{ name: 'synthetic-owners', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => {
      const name = args.path === 'electron' ? 'electron' : path.basename(args.path).replace(/\.ts$/, '')
      if (stubs.has(name)) return { path: name, namespace: 'synthetic-owner' }
    })
    builder.onLoad({ filter: /.*/, namespace: 'synthetic-owner' }, args => ({ contents: stubs.get(args.path), loader: 'js' }))
  } }]
})
const originalError = console.error
console.error = (...args) => { errors.push(args) }
try {
  const adapters = await import(pathToFileURL(outfile).href)
  adapters.registerAiRuntimeIpc(); adapters.registerLlamaRuntimeIpc()
  const invoke = (channel, request) => handlers.get(channel)({}, request)
  const branch = async () => (await invoke('ai-runtime:get-macos-ai-branch-status')).data
  const statusOf = (status, workflow) => status.workflows.find(item => item.workflow === workflow).status

  await test('real retained IPC adapters share Python, ONNX, OCR and Llama evidence without real owners', async () => {
    assert.equal(calls[0], 'synthetic-bootstrap')
    assert.deepEqual(await invoke('aiRuntime:probePythonMpsExecution'), { success: true, data: fixture.python })
    assert.deepEqual(await invoke('aiRuntime:probeOnnxModelLoad'), { success: true, data: fixture.onnx })
    assert.equal(calls.at(-1), 'wd_tagger')
    assert.deepEqual(await invoke('aiRuntime:probeOcrRealEvidence'), { success: true, data: fixture.ocr })
    assert.strictEqual(await invoke('llama-runtime:test-server'), fixture.llama)
    const status = await branch()
    for (const workflow of ['ai_tag_task', 'ai_prompt_task', 'ocr_text_box']) assert.equal(statusOf(status, workflow), 'real_model_path')
  })
  await test('thrown probe preserves prior evidence and uses existing IPC error envelope', async () => {
    fixture.probeError = Error('synthetic probe failure')
    assert.deepEqual(await invoke('aiRuntime:probeOcrRealEvidence'), { success: false, error: 'synthetic probe failure' })
    await assert.rejects(invoke('llama-runtime:test-server'), /synthetic probe failure/)
    assert.equal(statusOf(await branch(), 'ocr_text_box'), 'real_model_path')
    fixture.probeError = null
  })
  await test('resolved failing OCR probe has successful transport envelope and replaces old evidence', async () => {
    fixture.ocr = { ...fixture.ocr, success: false, status: 'artifact_missing', boxCount: 0 }
    assert.deepEqual(await invoke('aiRuntime:probeOcrRealEvidence'), { success: true, data: fixture.ocr })
    assert.notEqual(statusOf(await branch(), 'ocr_text_box'), 'real_model_path')
  })
  await test('ONNX IPC retains requested cache family and returned evidence family', async () => {
    fixture.onnx = { ...fixture.onnx, modelFamily: 'clip' }
    await invoke('aiRuntime:probeOnnxModelLoad', { modelFamily: 'wd_tagger' })
    fixture.onnx = { ...fixture.onnx, modelFamily: 'wd_tagger' }
    await invoke('aiRuntime:probeOnnxModelLoad', { modelFamily: 'clip' })
    assert.equal(statusOf(await branch(), 'search_embedding'), 'real_model_path')
    await invoke('aiRuntime:probeOnnxModelLoad', { modelFamily: 'wd_tagger' })
    assert.notEqual(statusOf(await branch(), 'search_embedding'), 'real_model_path')
  })
  await test('Worker rejection falls back while Llama status error uses existing branch error envelope', async () => {
    fixture.workerError = Error('synthetic worker unavailable')
    assert.equal(statusOf(await branch(), 'ai_prompt_task'), 'real_model_path')
    fixture.llamaError = Error('synthetic llama status failure')
    assert.deepEqual(await invoke('ai-runtime:get-macos-ai-branch-status'), { success: false, error: 'synthetic llama status failure' })
    fixture.llamaError = null
  })
  await test('Llama start does not record an internal probe and Windows platform gate remains intact', async () => {
    const saved = fixture.llama
    fixture.llama = { ...saved, success: false }
    await invoke('llama-runtime:start-server')
    assert.equal(statusOf(await branch(), 'ai_prompt_task'), 'real_model_path')
    const windows = await invoke('ai-runtime:get-windows-ai-branch-status')
    assert.equal(windows.success, true)
    assert.ok(windows.data.workflows.every(item => item.status === 'unavailable'))
    assert.equal(errors.length, 2)
  })
} finally { console.error = originalError; delete globalThis.__damBranchIpc }
