import assert from 'node:assert/strict'
import http from 'node:http'
import { registerAiBackendIpc } from '../src/main/ipc/ai-backend.ipc'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import type { AiBackendConfig } from '../src/shared/types/ai-backend.types'

const requests: string[] = []
let responseMode: 'normal' | 'redirect' | 'invalid' = 'normal'
const server = http.createServer((request, response) => {
  requests.push(`${request.method} ${request.url}`)
  if (responseMode === 'redirect') { response.writeHead(302, { Location: '/redirected' }); response.end(); return }
  if (responseMode === 'invalid') { response.end('not-json'); return }
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({ data: [{ id: 'synthetic-vision' }] }))
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  const address = server.address() as { port: number }
  let settings = createNewInstallAppSettingsDefaults()
  const handlers = new Map<string, Function>()
  registerAiBackendIpc({
    settings: { getSettings: () => settings, saveSettings: patch => { settings = { ...settings, ...patch }; return settings } },
    isTrustedSender: event => (event as any).trusted === true,
    handle: (channel, handler) => { handlers.set(channel, handler) }
  })
  const invoke = (channel: string, body?: unknown, trusted = true) => Promise.resolve().then(() => handlers.get(channel)!({ trusted }, body))
  const originalSettings = JSON.stringify(settings)
  await assert.rejects(invoke('ai-backend:list', undefined, false), /UNTRUSTED_SENDER/)
  const list = await invoke('ai-backend:list')
  list[0].capabilities.vision = !list[0].capabilities.vision
  assert.equal(JSON.stringify(settings), originalSettings, 'Reading configuration must not mutate stored capabilities or priority order.')
  const backend: AiBackendConfig = { id: 'test-backend', name: 'Test model service', type: 'openai-compatible', enabled: true,
    baseUrl: `http://127.0.0.1:${address.port}/v1`, timeoutMs: 5000, priority: 1,
    capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false } }
  await invoke('ai-backend:save', backend)
  assert.equal((await invoke('ai-backend:list'))[0].id, 'test-backend')
  assert.deepEqual(requests, [], 'Configuration changes must not probe or upload.')
  const models = await invoke('ai-backend:list-models', { backendId: backend.id })
  assert.deepEqual(models.models.map((model: { id: string }) => model.id), ['synthetic-vision'])
  const health = await invoke('ai-backend:health-check', { backendId: backend.id })
  assert.equal(health.success, true)
  assert.deepEqual(requests, ['GET /v1/models', 'GET /v1/models'])
  await assert.rejects(invoke('ai-backend:save', { ...backend, baseUrl: 'file:///forbidden' }), /INVALID_BACKEND_URL/)
  await assert.rejects(invoke('ai-backend:health-check', { backendId: backend.id }, false), /UNTRUSTED_SENDER/)
  assert.equal(requests.length, 2)
  responseMode = 'redirect'
  assert.equal((await invoke('ai-backend:health-check', { backendId: backend.id })).success, false)
  assert.equal(requests.includes('GET /redirected'), false, 'A probe must not silently follow a redirect to a new destination.')
  responseMode = 'invalid'
  assert.equal((await invoke('ai-backend:list-models', { backendId: backend.id })).error.code, 'BACKEND_MODEL_LIST_INVALID')
  await invoke('ai-backend:delete', { id: backend.id })
  assert.equal((await invoke('ai-backend:list')).some((entry: AiBackendConfig) => entry.id === backend.id), false)
  assert.equal(settings.concurrency, createNewInstallAppSettingsDefaults().concurrency)
  console.log('AI backend restoration: isolated configuration, trusted calls and loopback GET-only probes passed')
} finally { await new Promise<void>(resolve => server.close(() => resolve())) }
