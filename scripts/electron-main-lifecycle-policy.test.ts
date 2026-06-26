import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  ELECTRON_APP_LIFECYCLE_POLICIES,
  resolveElectronAppLifecyclePolicy
} from '../src/shared/workflows/electron-app-lifecycle.workflow'
import { createElectronMainHostContext } from '../src/main/electron-main-host-context'

assert.deepEqual(ELECTRON_APP_LIFECYCLE_POLICIES, [
  {
    platform: 'win32',
    appUserModelId: 'com.antigravity.designassetmanager',
    quitOnAllWindowsClosed: true
  },
  {
    platform: 'darwin',
    quitOnAllWindowsClosed: false
  },
  {
    platform: 'default',
    quitOnAllWindowsClosed: true
  }
])
assert.deepEqual(resolveElectronAppLifecyclePolicy('win32'), ELECTRON_APP_LIFECYCLE_POLICIES[0])
assert.deepEqual(resolveElectronAppLifecyclePolicy('darwin'), ELECTRON_APP_LIFECYCLE_POLICIES[1])
assert.deepEqual(resolveElectronAppLifecyclePolicy('linux'), ELECTRON_APP_LIFECYCLE_POLICIES[2])
assert.deepEqual(resolveElectronAppLifecyclePolicy('freebsd'), ELECTRON_APP_LIFECYCLE_POLICIES[2])
assert.deepEqual(createElectronMainHostContext({ platform: 'win32' }), { platform: 'win32' })
assert.equal(createElectronMainHostContext().platform, process.platform)

const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const hostContextSource = await fs.readFile('src/main/electron-main-host-context.ts', 'utf8')
const sharedSource = await fs.readFile('src/shared/workflows/electron-app-lifecycle.workflow.ts', 'utf8')

assert.match(mainSource, /createElectronMainHostContext\(\)/)
assert.match(mainSource, /resolveElectronAppLifecyclePolicy\(electronMainHostContext\.platform\)/)
assert.match(mainSource, /app\.setAppUserModelId\(appLifecyclePolicy\.appUserModelId\)/)
assert.match(mainSource, /resolveElectronAppLifecyclePolicy\(electronMainHostContext\.platform\)\.quitOnAllWindowsClosed/)
assert.doesNotMatch(mainSource, /ELECTRON_APP_LIFECYCLE_POLICIES|type ElectronAppLifecyclePolicy|platform: 'win32'|platform: 'darwin'/)
assert.doesNotMatch(mainSource, /process\.platform/)
assert.doesNotMatch(mainSource, /process\.platform\s*={2,3}\s*['"]win32['"]/)
assert.doesNotMatch(mainSource, /process\.platform\s*!={1,2}\s*['"]darwin['"]/)
assert.match(hostContextSource, /platform: input\.platform \?\? process\.platform/)

assert.match(sharedSource, /ELECTRON_APP_LIFECYCLE_POLICIES/)
assert.match(sharedSource, /appUserModelId: 'com\.antigravity\.designassetmanager'/)
assert.doesNotMatch(sharedSource, /from 'electron'|from "electron"|app\.|BrowserWindow/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-electron-main-lifecycle-policy'],
  'node scripts/run-ts-test.mjs scripts/electron-main-lifecycle-policy.test.ts'
)
assert.match(packageJson.scripts?.['ci:test-governance'] ?? '', /test-electron-main-lifecycle-policy/)

console.log('electron-main-lifecycle-policy passed')
