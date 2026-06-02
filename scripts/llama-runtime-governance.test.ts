import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createLlamaRuntimeGovernancePlan } from '../src/main/services/llama-runtime/llama-runtime-governance'

const winPlan = createLlamaRuntimeGovernancePlan('win32')
assert.equal(winPlan.phase, '12B')
assert.equal(winPlan.externalInferencePreferred, true)
assert.equal(winPlan.autoDownload, false)
assert.equal(winPlan.autoInstall, false)
assert.equal(winPlan.autoStart, false)
assert.equal(winPlan.preferredMode, 'external-inference')
assert.ok(winPlan.adapters.some((adapter) => adapter.id === 'external-openai-compatible'))
assert.ok(winPlan.adapters.some((adapter) => adapter.id === 'windows-llama-cpp'))
assert.ok(winPlan.adapters.every((adapter) => adapter.autoDownload === false))
assert.ok(winPlan.adapters.every((adapter) => adapter.autoInstall === false))
assert.ok(winPlan.adapters.every((adapter) => adapter.autoStart === false))
assert.ok(winPlan.adapters.every((adapter) => adapter.healthCheck.userInitiatedOnly === true))

const macPlan = createLlamaRuntimeGovernancePlan('darwin')
assert.ok(macPlan.adapters.some((adapter) => adapter.id === 'macos-llama-app'))
assert.ok(!macPlan.adapters.some((adapter) => adapter.id === 'windows-llama-cpp'))

const linuxPlan = createLlamaRuntimeGovernancePlan('linux')
assert.deepEqual(linuxPlan.adapters.map((adapter) => adapter.id), ['external-openai-compatible'])

const manifest = JSON.parse(await fs.readFile('.codeindex/llama-runtime-governance.json', 'utf8')) as {
  readOnlyAudit?: boolean
  externalInferencePreferred?: boolean
  autoDownload?: boolean
  autoInstall?: boolean
  autoStart?: boolean
  privacy?: { containsRealUserPaths?: boolean }
}
assert.equal(manifest.readOnlyAudit, true)
assert.equal(manifest.externalInferencePreferred, true)
assert.equal(manifest.autoDownload, false)
assert.equal(manifest.autoInstall, false)
assert.equal(manifest.autoStart, false)
assert.equal(manifest.privacy?.containsRealUserPaths, false)

const governanceSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-governance.ts', 'utf8')
assert.doesNotMatch(governanceSource, /fetch\s*\(|spawn\s*\(|execSync\s*\(|downloadOnce|startInstall|startServer|saveSettings/)
assert.doesNotMatch(governanceSource, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const installerSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-install.service.ts', 'utf8')
assert.match(installerSource, /llama-server\.exe/)
assert.match(installerSource, /downloadPackage|downloadUrl/)

const doc = await fs.readFile('docs/platform/LLAMA_RUNTIME_GOVERNANCE.md', 'utf8')
assert.match(doc, /autoDownload: false/)
assert.match(doc, /llama\.app/)
assert.match(doc, /Phase 13A/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
