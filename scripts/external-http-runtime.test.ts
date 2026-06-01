import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { AiRuntimeManager } from '../src/main/services/ai-runtime/ai-runtime-manager'
import { MockAiRuntimeHttpClient } from '../src/main/services/ai-runtime/http/mock-ai-runtime-http-client'
import { ExternalHttpRuntimeProvider } from '../src/main/services/ai-runtime/providers/external-http-runtime.provider'
import {
  createCustomHttpRuntimeConfig,
  createLlamaAppRuntimeConfig,
  createLmStudioRuntimeConfig,
  createOllamaRuntimeConfig
} from '../src/main/services/ai-runtime/providers/external-http-runtime-presets'

const ollama = createOllamaRuntimeConfig()
assert.equal(ollama.kind, 'ollama')
assert.equal(ollama.metadata?.defaultPort, 11434)

const lmStudio = createLmStudioRuntimeConfig()
assert.equal(lmStudio.kind, 'lm-studio')
assert.equal(lmStudio.metadata?.defaultPort, 1234)

const llamaApp = createLlamaAppRuntimeConfig()
assert.equal(llamaApp.kind, 'llama-app')
assert.equal(llamaApp.metadata?.defaultPort, 8080)

const custom = createCustomHttpRuntimeConfig({ runtimeId: 'custom-test', baseUrl: 'http://127.0.0.1:7654' })
assert.equal(custom.kind, 'custom-http')

const client = new MockAiRuntimeHttpClient()
client.registerResponse('GET', 'http://127.0.0.1:7654/health', { status: 200, body: { status: 'ok' } })
const provider = new ExternalHttpRuntimeProvider(custom, client)

const started = await provider.start()
assert.equal(started.success, true)
assert.equal(started.state.status, 'running')
assert.equal(started.state.pid, null)

const healthy = await provider.healthCheck()
assert.equal(healthy.status, 'ok')
assert.equal(client.getHistory().length, 1)
assert.equal(client.getHistory()[0].url, 'http://127.0.0.1:7654/health')

const stopped = await provider.stop()
assert.equal(stopped.success, true)
assert.equal(stopped.state.status, 'stopped')
assert.equal(stopped.state.pid, null)

const timeoutClient = new MockAiRuntimeHttpClient()
timeoutClient.registerTimeout('GET', 'http://127.0.0.1:7655/health')
const timeoutProvider = new ExternalHttpRuntimeProvider(createCustomHttpRuntimeConfig({
  runtimeId: 'timeout-runtime',
  baseUrl: 'http://127.0.0.1:7655'
}), timeoutClient)
assert.equal((await timeoutProvider.healthCheck()).status, 'warning')

const refusedClient = new MockAiRuntimeHttpClient()
refusedClient.registerConnectionRefused('GET', 'http://127.0.0.1:7656/health')
const refusedProvider = new ExternalHttpRuntimeProvider(createCustomHttpRuntimeConfig({
  runtimeId: 'refused-runtime',
  baseUrl: 'http://127.0.0.1:7656'
}), refusedClient)
assert.equal((await refusedProvider.healthCheck()).status, 'warning')

const errorClient = new MockAiRuntimeHttpClient()
errorClient.registerResponse('GET', 'http://127.0.0.1:7657/health', { status: 500, body: { error: 'bad' } })
const errorProvider = new ExternalHttpRuntimeProvider(createCustomHttpRuntimeConfig({
  runtimeId: 'error-runtime',
  baseUrl: 'http://127.0.0.1:7657'
}), errorClient)
assert.equal((await errorProvider.healthCheck()).status, 'error')

const missingBaseUrlProvider = new ExternalHttpRuntimeProvider(createCustomHttpRuntimeConfig({
  runtimeId: 'missing-base-url',
  baseUrl: null
}))
assert.equal((await missingBaseUrlProvider.healthCheck()).status, 'warning')

const updated = await provider.updateConfig({
  displayName: 'Updated Custom Runtime',
  baseUrl: 'http://127.0.0.1:7658',
  metadata: { changed: true }
})
assert.equal(updated.success, true)
assert.equal(provider.getExternalConfig().displayName, 'Updated Custom Runtime')
assert.equal(provider.getExternalConfig().baseUrl, 'http://127.0.0.1:7658')
assert.deepEqual(provider.getExternalConfig().metadata, { changed: true })

const manager = new AiRuntimeManager()
manager.registerProvider(provider)
assert.equal(manager.listRuntimes().length, 1)
assert.equal(manager.listRuntimes()[0].id, 'custom-test')

const allHealthClient = new MockAiRuntimeHttpClient()
allHealthClient.registerResponse('GET', 'http://127.0.0.1:7659/health', { status: 200 })
manager.registerProvider(new ExternalHttpRuntimeProvider(createCustomHttpRuntimeConfig({
  runtimeId: 'custom-health-all',
  baseUrl: 'http://127.0.0.1:7659'
}), allHealthClient))
const allHealth = await manager.healthCheckAll()
assert.equal(allHealth.length, 2)
assert.ok(allHealth.some((result) => result.runtimeId === 'custom-health-all'))

const providerSource = await fs.readFile('src/main/services/ai-runtime/providers/external-http-runtime.provider.ts', 'utf8')
const presetsSource = await fs.readFile('src/main/services/ai-runtime/providers/external-http-runtime-presets.ts', 'utf8')
const mockClientSource = await fs.readFile('src/main/services/ai-runtime/http/mock-ai-runtime-http-client.ts', 'utf8')
const combinedSource = [providerSource, presetsSource, mockClientSource].join('\n')

assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /child_process|spawn\s*\(|execFile\s*\(|process-runner|runProcess/)
assert.doesNotMatch(combinedSource, /ai-client|settings|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
