import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createAiClientRuntimeAdapterPlan } from '../src/main/services/ai-client/ai-runtime-adapter'

const mockPlan = createAiClientRuntimeAdapterPlan({
  operation: 'model-status',
  preferredBridge: 'mock',
  runtimeKind: 'mock',
  greySwitchEnabled: true,
  oldChainFallbackEnabled: true
})
assert.equal(mockPlan.useRuntimeBridge, true)
assert.equal(mockPlan.fallbackToOldChain, false)

const externalPlan = createAiClientRuntimeAdapterPlan({
  operation: 'generate-prompt',
  preferredBridge: 'external-http',
  runtimeKind: 'custom-http',
  greySwitchEnabled: true,
  oldChainFallbackEnabled: true
})
assert.equal(externalPlan.useRuntimeBridge, true)
assert.equal(externalPlan.bridge, 'external-http')

const pythonPlan = createAiClientRuntimeAdapterPlan({
  operation: 'enqueue-tagging',
  preferredBridge: 'python-worker',
  runtimeKind: 'python-worker',
  greySwitchEnabled: true,
  oldChainFallbackEnabled: true
})
assert.equal(pythonPlan.useRuntimeBridge, true)
assert.equal(pythonPlan.bridge, 'python-worker')

const disabledGreySwitch = createAiClientRuntimeAdapterPlan({
  operation: 'generate-analysis',
  preferredBridge: 'python-worker',
  runtimeKind: 'python-worker',
  greySwitchEnabled: false,
  oldChainFallbackEnabled: true
})
assert.equal(disabledGreySwitch.useRuntimeBridge, false)
assert.equal(disabledGreySwitch.fallbackToOldChain, true)

const incompatible = createAiClientRuntimeAdapterPlan({
  operation: 'generate-prompt',
  preferredBridge: 'external-http',
  runtimeKind: 'python-worker',
  greySwitchEnabled: true,
  oldChainFallbackEnabled: true
})
assert.equal(incompatible.useRuntimeBridge, false)
assert.equal(incompatible.fallbackToOldChain, true)
assert.ok(incompatible.blockingIssues.some((issue) => issue.includes('not an external HTTP runtime')))

const manifest = JSON.parse(await fs.readFile('.codeindex/ai-client-runtime-adapter.json', 'utf8')) as {
  changesOldAiClientService?: boolean
  databaseAccess?: boolean
  networkAccess?: boolean
  realInference?: boolean
  oldChainFallback?: boolean
}
assert.equal(manifest.changesOldAiClientService, false)
assert.equal(manifest.databaseAccess, false)
assert.equal(manifest.networkAccess, false)
assert.equal(manifest.realInference, false)
assert.equal(manifest.oldChainFallback, true)

const adapterSource = await fs.readFile('src/main/services/ai-client/ai-runtime-adapter.ts', 'utf8')
assert.doesNotMatch(adapterSource, /\bfetch\s*\(|XMLHttpRequest|node:http|node:https/)
assert.doesNotMatch(adapterSource, /better-sqlite3|getDatabase|db\.prepare|src\/main\/db/)
assert.doesNotMatch(adapterSource, /AiClientService|ai-client\.service/)
assert.doesNotMatch(adapterSource, /start\(\)|spawn\s*\(|execFile\s*\(|runPromptReverse/)

const oldClientSource = await fs.readFile('src/main/services/ai-client.service.ts', 'utf8')
assert.match(oldClientSource, /class AiClientService/)
assert.match(oldClientSource, /fetch/)

const doc = await fs.readFile('docs/platform/AI_CLIENT_RUNTIME_ADAPTER.md', 'utf8')
assert.match(doc, /fallbackToOldChain: true/)
assert.match(doc, /Phase 12A/)
