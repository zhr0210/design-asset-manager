import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const entitlements = await fs.readFile('build/entitlements.mac.plist', 'utf8')
const packageManifest = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  build?: {
    mac?: {
      hardenedRuntime?: boolean
      entitlements?: string
      entitlementsInherit?: string
    }
  }
}

assert.equal(packageManifest.build?.mac?.hardenedRuntime, true)
assert.equal(packageManifest.build?.mac?.entitlements, 'build/entitlements.mac.plist')
assert.equal(packageManifest.build?.mac?.entitlementsInherit, 'build/entitlements.mac.plist')
assert.match(entitlements, /com\.apple\.security\.cs\.allow-jit/)
assert.match(entitlements, /com\.apple\.security\.cs\.allow-unsigned-executable-memory/)
assert.doesNotMatch(entitlements, /allow-dyld-environment-variables/)
assert.doesNotMatch(entitlements, /allow-dyld-shared-cache/)
assert.doesNotMatch(entitlements, /disable-library-validation/)
assert.doesNotMatch(entitlements, /disable-executable-page-protection/)
