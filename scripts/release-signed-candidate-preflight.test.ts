import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  createReleaseSignedCandidatePreflight,
  type ReleaseSignedCandidateEvidence
} from '../src/main/packaging/release-signed-candidate-preflight'

const windows = createReleaseSignedCandidatePreflight('windows', 'x64')
assert.equal(windows.environment, 'release-signing-windows')
assert.equal(windows.refGate, 'main-or-version-tag')
assert.equal(windows.signingApprovalInput, 'signing_approved')
assert.deepEqual(windows.requiredSecretNames, ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'])
assert.equal(windows.publishEnabled, false)
assert.equal(windows.readsSecretValues, false)

const macos = createReleaseSignedCandidatePreflight('macos', 'arm64')
assert.equal(macos.environment, 'release-signing-macos')
assert.deepEqual(macos.requiredSecretNames, [
  'MACOS_CSC_LINK',
  'MACOS_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID'
])
assertRequiredEvidence(macos.requiredEvidence)

const workflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
for (const secret of windows.requiredSecretNames) assert.match(workflow, new RegExp(secret))
for (const secret of macos.requiredSecretNames) assert.match(workflow, new RegExp(secret))
assert.match(workflow, /environment: release-signing-windows/)
assert.match(workflow, /environment: release-signing-macos/)
assert.match(workflow, /inputs\.signing_approved/)
assert.match(workflow, /refs\/heads\/main/)
assert.match(workflow, /startsWith\(github\.ref, 'refs\/tags\/v'\)/)
assert.match(workflow, /release-checksums-\*\.json/)
assert.match(workflow, /release-update-metadata-\*\.json/)
assert.match(workflow, /release-trust-evidence-\*\.json/)
assert.match(workflow, /release-branding-evidence-\*\.json/)
assert.match(workflow, /npm run package:smoke/)
assert.doesNotMatch(workflow, /contents: write|gh release|create-release|--publish always|npm publish/i)

const preflightSource = await fs.readFile('src/main/packaging/release-signed-candidate-preflight.ts', 'utf8')
assert.doesNotMatch(preflightSource, /process\.env|secrets\.|CSC_LINK:|APPLE_ID:/)

function assertRequiredEvidence(evidence: ReleaseSignedCandidateEvidence[]): void {
  assert.deepEqual(evidence, [
    'release-checksums',
    'release-update-metadata',
    'release-trust-evidence',
    'release-branding-evidence',
    'package-smoke'
  ])
}
