import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createReleaseBrandingPreflight } from '../src/main/packaging/release-branding-preflight'

const preflight = createReleaseBrandingPreflight()
assert.equal(preflight.schemaVersion, 1)
assert.equal(preflight.approvalFileName, 'release-branding.json')
assert.equal(preflight.defaultElectronIconAllowed, false)
assert.equal(preflight.emitsIconDigest, false)
assert.equal(preflight.readsIconPixels, false)
assert.deepEqual(preflight.requiredChecks, [
  'branding_approval',
  'platform_icon_container',
  'approved_digest'
])
assert.deepEqual(preflight.platforms.map((item) => item.iconFileName), ['icon.ico', 'icon.icns'])
assert.deepEqual(preflight.platforms.map((item) => item.iconFormat), ['ico', 'icns'])
assert.ok(preflight.requiredApprovalFields.includes('icons.windows.sha256'))
assert.ok(preflight.requiredApprovalFields.includes('icons.macos.sha256'))

const verifier = await fs.readFile('scripts/verify-release-branding.mjs', 'utf8')
assert.match(verifier, /release-branding\.json/)
assert.match(verifier, /icon\.ico/)
assert.match(verifier, /icon\.icns/)
assert.match(verifier, /branding_approval/)
assert.match(verifier, /approved_digest/)
assert.match(verifier, /releaseScriptEvidenceFileName\('release-branding-evidence'/)
assert.doesNotMatch(verifier, /console\.log\(.*actualDigest|digest\(icns\)|digest\(ico\)/)

const signedWorkflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
assert.match(signedWorkflow, /verify-release-branding\.mjs/)
assert.match(signedWorkflow, /build\/release-branding\.json/)
assert.match(signedWorkflow, /release-branding-evidence-\*\.json/)
assert.doesNotMatch(signedWorkflow, /default Electron icon|electron\.icns|electron\.ico/i)
