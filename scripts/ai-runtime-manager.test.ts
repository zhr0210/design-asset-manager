import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { AiRuntimeManager } from '../src/main/services/ai-runtime/ai-runtime-manager'
import { DisabledAiRuntimeProvider } from '../src/main/services/ai-runtime/providers/disabled-ai-runtime.provider'
import { MockAiRuntimeProvider } from '../src/main/services/ai-runtime/providers/mock-ai-runtime.provider'
import type { AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeProvider, AiRuntimeState } from '../src/main/services/ai-runtime/ai-runtime.types'
import { listRuntimeProfiles } from '../src/main/runtime/runtime-profile-registry'

const manager = new AiRuntimeManager()
const mock = new MockAiRuntimeProvider({ id: 'mock-runtime', baseUrl: 'http://127.0.0.1:9999' })
manager.registerProvider(mock)

assert.equal(manager.listRuntimes().length, 1)
assert.equal(manager.listRuntimes()[0].id, 'mock-runtime')

const started = await manager.startRuntime('mock-runtime')
assert.equal(started.success, true)
assert.equal(started.state.status, 'running')

const healthy = await manager.healthCheck('mock-runtime')
assert.equal(healthy.status, 'ok')

const stopped = await manager.stopRuntime('mock-runtime')
assert.equal(stopped.success, true)
assert.equal(stopped.state.status, 'stopped')

const restarted = await manager.restartRuntime('mock-runtime')
assert.equal(restarted.success, true)
assert.equal(restarted.state.status, 'running')

const disabled = new DisabledAiRuntimeProvider({ id: 'disabled-runtime' })
manager.registerProvider(disabled)

const disabledStart = await manager.startRuntime('disabled-runtime')
assert.equal(disabledStart.success, false)
assert.equal(disabledStart.state.status, 'disabled')

const disabledHealth = await manager.healthCheck('disabled-runtime')
assert.equal(disabledHealth.status, 'warning')

const selected = manager.selectActiveRuntime('mock-runtime')
assert.equal(selected.success, true)
assert.equal(manager.getActiveRuntime()?.id, 'mock-runtime')

assert.equal(manager.unregisterProvider('mock-runtime'), true)
assert.equal(manager.getRuntimeState('mock-runtime'), null)
assert.equal(manager.getActiveRuntime(), null)

function failedProviderState(): AiRuntimeState {
  return {
    id: 'throwing-runtime',
    kind: 'mock',
    status: 'idle',
    healthStatus: 'unknown',
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: null,
    pid: null,
    baseUrl: null
  }
}

class ThrowingProvider implements AiRuntimeProvider {
  getConfig() {
    return {
      id: 'throwing-runtime',
      kind: 'mock' as const,
      enabled: true,
      displayName: 'Throwing Runtime'
    }
  }

  getState() {
    return failedProviderState()
  }

  async start(): Promise<AiRuntimeOperationResult> {
    throw new Error('start failed')
  }

  async stop(): Promise<AiRuntimeOperationResult> {
    throw new Error('stop failed')
  }

  async restart(): Promise<AiRuntimeOperationResult> {
    throw new Error('restart failed')
  }

  async healthCheck(): Promise<AiRuntimeHealthResult> {
    throw new Error('health failed')
  }

  async updateConfig(): Promise<AiRuntimeOperationResult> {
    throw new Error('update failed')
  }
}

manager.registerProvider(new ThrowingProvider())
const failedStart = await manager.startRuntime('throwing-runtime')
assert.equal(failedStart.success, false)
assert.equal(failedStart.state.status, 'failed')

const failedHealth = await manager.healthCheck('throwing-runtime')
assert.equal(failedHealth.status, 'error')

const allHealth = await manager.healthCheckAll()
assert.equal(allHealth.length, 2)
assert.ok(allHealth.some((result) => result.runtimeId === 'disabled-runtime'))
assert.ok(allHealth.some((result) => result.runtimeId === 'throwing-runtime'))

const updateManager = new AiRuntimeManager()
const updateMock = new MockAiRuntimeProvider({ id: 'update-runtime' })
updateManager.registerProvider(updateMock)
const updated = await updateManager.updateRuntimeConfig('update-runtime', {
  displayName: 'Updated Runtime',
  baseUrl: 'http://127.0.0.1:7777',
  metadata: { source: 'test' }
})
assert.equal(updated.success, true)
assert.equal(updateMock.getConfig().displayName, 'Updated Runtime')
assert.equal(updateMock.getConfig().baseUrl, 'http://127.0.0.1:7777')
assert.deepEqual(updateMock.getConfig().metadata, { source: 'test' })

const profiles = listRuntimeProfiles()
assert.deepEqual(profiles.find((profile) => profile.id === 'windows-cpu')?.recommendedRuntimeKinds, ['python-worker', 'custom-http'])
assert.deepEqual(profiles.find((profile) => profile.id === 'windows-nvidia-cuda')?.recommendedRuntimeKinds, ['python-worker'])
assert.deepEqual(profiles.find((profile) => profile.id === 'macos-apple-silicon')?.recommendedRuntimeKinds, ['python-worker', 'llama-app', 'ollama', 'custom-http'])
assert.ok(profiles.find((profile) => profile.id === 'macos-apple-silicon')?.capabilities.includes('python-mps'))
assert.ok(profiles.find((profile) => profile.id === 'macos-apple-silicon')?.capabilities.includes('onnx-runtime'))
assert.ok(!profiles.find((profile) => profile.id === 'macos-apple-silicon')?.capabilities.includes('mlx'))
assert.deepEqual(profiles.find((profile) => profile.id === 'macos-intel')?.recommendedRuntimeKinds, ['custom-http', 'ollama'])
assert.deepEqual(profiles.find((profile) => profile.id === 'external-inference-only')?.recommendedRuntimeKinds, ['custom-http'])

const managerSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-manager.ts', 'utf8')
const healthCheckerSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-health-checker.ts', 'utf8')
const providerSources = await Promise.all([
  fs.readFile('src/main/services/ai-runtime/providers/mock-ai-runtime.provider.ts', 'utf8'),
  fs.readFile('src/main/services/ai-runtime/providers/disabled-ai-runtime.provider.ts', 'utf8')
])
const combinedRuntimeSource = [managerSource, healthCheckerSource, ...providerSources].join('\n')

assert.doesNotMatch(combinedRuntimeSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedRuntimeSource, /child_process|spawn\s*\(|execFile\s*\(|process-runner|runProcess/)
assert.doesNotMatch(combinedRuntimeSource, /ai-client|settings|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
