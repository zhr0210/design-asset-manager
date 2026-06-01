import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { AiRuntimeConfig } from '../src/main/services/ai-runtime/ai-runtime.types'
import {
  createDefaultAiRuntimeSettings,
  createDefaultDisabledRuntimeSettings,
  createDefaultExternalHttpRuntimeSettings,
  createDefaultPythonWorkerRuntimeSettings
} from '../src/main/services/ai-runtime/ai-runtime-settings.defaults'
import {
  mapAiRuntimeConfigToSettingsEntry,
  mapSettingsEntryToAiRuntimeConfig,
  mapSettingsToAiRuntimeConfigs,
  mergeAiRuntimeSettingsDefaults,
  migrateLegacyAiRuntimeSettings
} from '../src/main/services/ai-runtime/ai-runtime-settings.mapper'
import {
  getAiRuntimeSettingsWarnings,
  normalizeAiRuntimeSettings,
  validateAiRuntimeSettings,
  validateAiRuntimeSettingsEntry
} from '../src/main/services/ai-runtime/ai-runtime-settings.validator'

const defaults = createDefaultAiRuntimeSettings()
assert.equal(defaults.defaultRuntimeKind, 'disabled')
assert.equal(defaults.allowLocalPythonWorker, false)
assert.equal(defaults.allowExternalInference, false)
assert.equal(defaults.runtimes[0].kind, 'disabled')
assert.equal(defaults.runtimes[0].enabled, false)

assert.equal(createDefaultDisabledRuntimeSettings().kind, 'disabled')
assert.equal(createDefaultExternalHttpRuntimeSettings('custom-http').kind, 'custom-http')
assert.equal(createDefaultPythonWorkerRuntimeSettings().pythonPath, null)

const customHttpConfig = mapSettingsEntryToAiRuntimeConfig({
  id: 'custom-runtime',
  kind: 'custom-http',
  enabled: true,
  displayName: 'Custom Runtime',
  baseUrl: 'http://127.0.0.1:9999',
  healthEndpoint: '/health',
  timeoutMs: 1_000,
  externalHttp: {
    kind: 'custom-http',
    baseUrl: 'http://127.0.0.1:9999',
    healthEndpoint: '/health',
    modelsEndpoint: null,
    chatEndpoint: '/chat',
    completionsEndpoint: null,
    timeoutMs: 1_000,
    headers: {},
    authMode: 'none'
  },
  metadata: { keep: 'yes' }
})
assert.equal(customHttpConfig.kind, 'custom-http')
assert.equal(customHttpConfig.baseUrl, 'http://127.0.0.1:9999')

const pythonConfig = mapSettingsEntryToAiRuntimeConfig({
  id: 'python-runtime',
  kind: 'python-worker',
  enabled: false,
  displayName: 'Python Runtime',
  pythonWorker: {
    pythonPath: 'python',
    scriptPath: 'ai-service/app.py',
    workingDirectory: 'ai-service',
    host: '127.0.0.1',
    port: 8000,
    baseUrl: 'http://127.0.0.1:8000',
    healthEndpoint: '/health',
    launchArgs: ['--dry'],
    env: {},
    timeoutMs: 5_000
  },
  metadata: {}
})
assert.equal(pythonConfig.kind, 'python-worker')
assert.equal(pythonConfig.executablePath, 'python')
assert.equal(pythonConfig.port, 8000)

const reversed = mapAiRuntimeConfigToSettingsEntry({
  id: 'ollama-runtime',
  kind: 'ollama',
  enabled: true,
  displayName: 'Ollama',
  baseUrl: 'http://127.0.0.1:11434',
  healthEndpoint: '/api/tags',
  timeoutMs: 5_000,
  metadata: { externalHttp: { authMode: 'none' } }
} as AiRuntimeConfig)
assert.equal(reversed.kind, 'ollama')
assert.equal(reversed.externalHttp?.baseUrl, 'http://127.0.0.1:11434')

const legacyLlama = migrateLegacyAiRuntimeSettings({
  llamaAppConfig: {
    enabled: true,
    displayName: 'Legacy llama.app',
    baseUrl: 'http://127.0.0.1:8080/v1',
    healthEndpoint: '/v1/models',
    timeoutMs: 10_000,
    authMode: 'none'
  }
} as any)
assert.equal(legacyLlama.runtimes[0].kind, 'llama-app')
assert.equal(legacyLlama.runtimes[0].enabled, true)

const legacyWorker = migrateLegacyAiRuntimeSettings({
  aiWorkerConfig: {
    enabled: true,
    pythonPath: 'python',
    scriptPath: 'ai-service/app.py',
    workingDirectory: 'ai-service'
  }
} as any)
assert.equal(legacyWorker.runtimes[0].kind, 'python-worker')
assert.equal(legacyWorker.allowLocalPythonWorker, true)

const legacyBackendConfigs = mapSettingsToAiRuntimeConfigs({
  aiBackends: [{
    id: 'legacy-backend',
    name: 'Legacy Backend',
    type: 'llama-openai',
    enabled: true,
    baseUrl: 'http://127.0.0.1:8080/v1',
    timeoutMs: 20_000,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50
  }]
} as any)
assert.equal(legacyBackendConfigs[0].kind, 'llama-app')

const preferredNewConfigs = mapSettingsToAiRuntimeConfigs({
  aiRuntimeSettings: {
    activeRuntimeId: 'new-runtime',
    defaultRuntimeKind: 'custom-http',
    allowExternalInference: true,
    allowLocalPythonWorker: false,
    healthCheckOnStartup: false,
    runtimes: [{
      id: 'new-runtime',
      kind: 'custom-http',
      enabled: true,
      displayName: 'New Runtime',
      baseUrl: 'http://127.0.0.1:3333',
      healthEndpoint: '/health',
      timeoutMs: 1_000
    }],
    metadata: { source: 'new' }
  },
  aiBackends: [{
    id: 'legacy-backend',
    name: 'Legacy Backend',
    type: 'ollama',
    enabled: true,
    baseUrl: 'http://127.0.0.1:11434',
    timeoutMs: 5_000,
    capabilities: {
      chat: true,
      vision: false,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 50
  }]
} as any)
assert.equal(preferredNewConfigs.length, 1)
assert.equal(preferredNewConfigs[0].id, 'new-runtime')

const missingId = validateAiRuntimeSettingsEntry({ kind: 'custom-http', displayName: 'Bad' })
assert.equal(missingId.valid, false)
assert.ok(missingId.errors.some((error) => error.includes('id')))

const invalidUrl = validateAiRuntimeSettingsEntry({
  id: 'bad-url',
  kind: 'custom-http',
  displayName: 'Bad URL',
  baseUrl: 'not a url'
})
assert.equal(invalidUrl.valid, false)
assert.ok(invalidUrl.errors.some((error) => error.includes('baseUrl')))

const normalized = normalizeAiRuntimeSettings({
  runtimes: [{
    id: 'metadata-runtime',
    kind: 'mock',
    enabled: false,
    displayName: 'Metadata Runtime',
    metadata: { keep: 'this' }
  }],
  metadata: { outer: 'kept' }
})
assert.deepEqual(normalized.runtimes[0].metadata, { keep: 'this' })
assert.deepEqual(normalized.metadata, { outer: 'kept' })

assert.equal(validateAiRuntimeSettings(normalized).valid, true)
assert.deepEqual(getAiRuntimeSettingsWarnings(normalized), [])
assert.equal(mergeAiRuntimeSettingsDefaults({ metadata: { merged: true } }).metadata?.merged, true)

const mapperSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-settings.mapper.ts', 'utf8')
const defaultsSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-settings.defaults.ts', 'utf8')
const validatorSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-settings.validator.ts', 'utf8')
const combinedSource = [mapperSource, defaultsSource, validatorSource].join('\n')

assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /child_process|execFile\s*\(|runProcess|startRuntime|start\(\)/)
assert.doesNotMatch(combinedSource, /SettingsService|saveSettings|writeFile|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
