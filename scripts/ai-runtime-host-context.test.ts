import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createAiRuntimeHostContext } from '../src/main/services/ai-runtime/ai-runtime-host-context'

const injected = createAiRuntimeHostContext({
  platform: 'win32',
  arch: 'x64',
  homeDir: 'C:\\Users\\Synthetic'
})
assert.deepEqual(injected, {
  platform: 'win32',
  arch: 'x64',
  homeDir: 'C:\\Users\\Synthetic'
})

const defaults = createAiRuntimeHostContext()
assert.equal(typeof defaults.platform, 'string')
assert.equal(typeof defaults.arch, 'string')
assert.equal(typeof defaults.homeDir, 'string')
assert.ok(defaults.homeDir.length > 0)

const helperSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-host-context.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/ai-runtime.ipc.ts', 'utf8')
assert.match(helperSource, /export function createAiRuntimeHostContext/)
assert.match(helperSource, /platform: input\.platform \?\? process\.platform as PlatformName/)
assert.match(helperSource, /arch: input\.arch \?\? process\.arch as PlatformArch/)
assert.match(helperSource, /homeDir: input\.homeDir \?\? os\.homedir\(\)/)
assert.match(ipcSource, /const aiRuntimeHostContext = createAiRuntimeHostContext\(\)/)
assert.match(ipcSource, /platform: aiRuntimeHostContext\.platform/)
assert.match(ipcSource, /arch: aiRuntimeHostContext\.arch/)
assert.match(ipcSource, /homeDir: aiRuntimeHostContext\.homeDir/)
assert.match(ipcSource, /currentPlatform: aiRuntimeHostContext\.platform/)
assert.doesNotMatch(ipcSource, /process\.platform|process\.arch|os\.homedir/)

console.log('ai-runtime-host-context passed')
