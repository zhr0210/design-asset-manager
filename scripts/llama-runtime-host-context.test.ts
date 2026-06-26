import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createLlamaRuntimeHostContext } from '../src/main/services/llama-runtime/llama-runtime-host-context'

const injected = createLlamaRuntimeHostContext({
  platform: 'win32',
  arch: 'x64',
  cpuThreads: 16,
  totalMemoryGB: 32,
  cpuModel: 'Synthetic CPU'
})
assert.deepEqual(injected, {
  platform: 'win32',
  arch: 'x64',
  cpuThreads: 16,
  totalMemoryGB: 32,
  cpuModel: 'Synthetic CPU'
})

const defaults = createLlamaRuntimeHostContext()
assert.equal(typeof defaults.platform, 'string')
assert.equal(typeof defaults.arch, 'string')
assert.equal(typeof defaults.cpuThreads, 'number')
assert.equal(typeof defaults.totalMemoryGB, 'number')
assert.equal(typeof defaults.cpuModel, 'string')
assert.ok(defaults.cpuThreads >= 0)
assert.ok(defaults.totalMemoryGB >= 0)

const helperSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-host-context.ts', 'utf8')
const installerSource = await fs.readFile('src/main/services/llama-runtime/llama-runtime-install.service.ts', 'utf8')
assert.match(helperSource, /export function createLlamaRuntimeHostContext/)
assert.match(helperSource, /platform: input\.platform \?\? process\.platform/)
assert.match(helperSource, /arch: input\.arch \?\? process\.arch/)
assert.match(installerSource, /createLlamaRuntimeHostContext/)
assert.match(installerSource, /hostContext\.platform/)
assert.match(installerSource, /hostContext\.arch/)
assert.match(installerSource, /hostContext\.cpuThreads/)
assert.match(installerSource, /hostContext\.totalMemoryGB/)
assert.doesNotMatch(installerSource, /process\.platform/)
assert.doesNotMatch(installerSource, /process\.arch/)
assert.doesNotMatch(installerSource, /os\.cpus|os\.totalmem/)

console.log('llama-runtime-host-context passed')
