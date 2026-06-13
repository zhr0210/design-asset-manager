import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const mainSource = await fs.readFile('src/main/index.ts', 'utf8')

assert.match(mainSource, /type ElectronAppLifecyclePolicy/)
assert.match(mainSource, /const ELECTRON_APP_LIFECYCLE_POLICIES: ElectronAppLifecyclePolicy\[\] = \[/)
assert.match(mainSource, /platform: 'win32'[\s\S]*appUserModelId: 'com\.antigravity\.designassetmanager'[\s\S]*quitOnAllWindowsClosed: true/)
assert.match(mainSource, /platform: 'darwin'[\s\S]*quitOnAllWindowsClosed: false/)
assert.match(mainSource, /function resolveElectronAppLifecyclePolicy\(platform: NodeJS\.Platform \| string = process\.platform\): ElectronAppLifecyclePolicy/)
assert.match(mainSource, /app\.setAppUserModelId\(appLifecyclePolicy\.appUserModelId\)/)
assert.match(mainSource, /resolveElectronAppLifecyclePolicy\(\)\.quitOnAllWindowsClosed/)
assert.doesNotMatch(mainSource, /process\.platform\s*={2,3}\s*['"]win32['"]/)
assert.doesNotMatch(mainSource, /process\.platform\s*!={1,2}\s*['"]darwin['"]/)
