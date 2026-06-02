import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { MockAiRuntimeHttpClient } from '../src/main/services/ai-runtime/http/mock-ai-runtime-http-client'
import {
  createExternalHttpManualHealthCheckPlan,
  runExternalHttpManualHealthCheck
} from '../src/main/services/ai-runtime/providers/external-http-manual-health-check'
import {
  createCustomHttpRuntimeConfig,
  createLlamaAppRuntimeConfig,
  createLmStudioRuntimeConfig,
  createOllamaRuntimeConfig
} from '../src/main/services/ai-runtime/providers/external-http-runtime-presets'

const presets = [
  createOllamaRuntimeConfig({ baseUrl: 'http://127.0.0.1:11434' }),
  createLmStudioRuntimeConfig({ baseUrl: 'http://127.0.0.1:1234' }),
  createLlamaAppRuntimeConfig({ baseUrl: 'http://127.0.0.1:8080' }),
  createCustomHttpRuntimeConfig({ runtimeId: 'custom-manual', baseUrl: 'http://127.0.0.1:7654' })
]

const client = new MockAiRuntimeHttpClient()
for (const preset of presets) {
  const url = `${preset.baseUrl}${preset.healthEndpoint}`
  client.registerResponse('GET', url, { status: 200, body: { ok: true } })
}

for (const preset of presets) {
  const request = {
    runtimeId: preset.runtimeId,
    kind: preset.kind,
    baseUrl: preset.baseUrl,
    healthEndpoint: preset.healthEndpoint,
    timeoutMs: preset.timeoutMs,
    headers: preset.headers,
    userInitiated: true
  }
  const plan = createExternalHttpManualHealthCheckPlan(request)
  assert.equal(plan.userInitiated, true)
  assert.equal(plan.blockingIssues.length, 0)
  assert.match(plan.url ?? '', /^http:\/\/127\.0\.0\.1/)

  const result = await runExternalHttpManualHealthCheck(request, client)
  assert.equal(result.status, 'ok')
}
assert.equal(client.getHistory().length, 4)

const blockedClient = new MockAiRuntimeHttpClient()
const blocked = await runExternalHttpManualHealthCheck({
  runtimeId: 'blocked',
  kind: 'custom-http',
  baseUrl: 'http://127.0.0.1:9999',
  healthEndpoint: '/health',
  timeoutMs: 100,
  userInitiated: false
}, blockedClient)
assert.equal(blocked.status, 'warning')
assert.match(blocked.message, /explicit user action/)
assert.equal(blockedClient.getHistory().length, 0)

const missingBasePlan = createExternalHttpManualHealthCheckPlan({
  runtimeId: 'missing-base',
  kind: 'custom-http',
  baseUrl: null,
  healthEndpoint: '/health',
  timeoutMs: 100,
  userInitiated: true
})
assert.ok(missingBasePlan.blockingIssues.some((issue) => issue.includes('baseUrl')))

const timeoutClient = new MockAiRuntimeHttpClient()
timeoutClient.registerTimeout('GET', 'http://127.0.0.1:7777/health')
const timeout = await runExternalHttpManualHealthCheck({
  runtimeId: 'timeout',
  kind: 'custom-http',
  baseUrl: 'http://127.0.0.1:7777',
  healthEndpoint: '/health',
  timeoutMs: 100,
  userInitiated: true
}, timeoutClient)
assert.equal(timeout.status, 'warning')

const manifest = JSON.parse(await fs.readFile('.codeindex/external-http-manual-health-check.json', 'utf8')) as {
  autoNetworkAccess?: boolean
  requiresUserInitiated?: boolean
  startsService?: boolean
  supportedKinds?: string[]
}
assert.equal(manifest.autoNetworkAccess, false)
assert.equal(manifest.requiresUserInitiated, true)
assert.equal(manifest.startsService, false)
assert.deepEqual(manifest.supportedKinds, ['ollama', 'lm-studio', 'llama-app', 'custom-http'])

const source = await fs.readFile('src/main/services/ai-runtime/providers/external-http-manual-health-check.ts', 'utf8')
assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|node:http|node:https|createConnection|createServer/)
assert.doesNotMatch(source, /child_process|spawn\s*\(|execFile\s*\(|process-runner|runProcess/)
assert.doesNotMatch(source, /SettingsService|saveSettings|RuntimeRegistry|runtime-registry|better-sqlite3|src\/main\/db/)

const doc = await fs.readFile('docs/platform/EXTERNAL_HTTP_MANUAL_HEALTH_CHECK.md', 'utf8')
assert.match(doc, /userInitiated: true/)
assert.match(doc, /MockAiRuntimeHttpClient/)
assert.match(doc, /Phase 11B/)
