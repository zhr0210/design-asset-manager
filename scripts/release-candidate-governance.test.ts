import assert from 'node:assert/strict'
import { evaluateReleaseCandidate, type ReleaseCandidateChecks } from '../src/main/packaging/release-flow-governance'

const notRunChecks: ReleaseCandidateChecks = {
  build: 'not_run',
  governance: 'not_run',
  artifact: 'not_run',
  checksum: 'not_run',
  packageSmoke: 'not_run',
  installerSmoke: 'not_run',
  signature: 'not_run',
  hardenedRuntime: 'not_run',
  nestedSignatures: 'not_run',
  notarization: 'not_run',
  staple: 'not_run',
  gatekeeper: 'not_run',
  updateMetadata: 'not_run'
}

const blocked = evaluateReleaseCandidate({
  platform: 'windows',
  arch: 'x64',
  checks: notRunChecks,
  explicitPublishApproval: false
})
assert.equal(blocked.stage, 'blocked')
assert.equal(blocked.candidateArtifactAllowed, false)
assert.equal(blocked.publishAllowed, false)
assert.ok(blocked.missing.some((item) => item.code === 'package_smoke'))

const commonPassed: ReleaseCandidateChecks = {
  ...notRunChecks,
  build: 'passed',
  governance: 'passed',
  artifact: 'passed',
  checksum: 'passed',
  packageSmoke: 'passed'
}
const unsignedWindows = evaluateReleaseCandidate({
  platform: 'windows',
  arch: 'arm64',
  checks: commonPassed,
  explicitPublishApproval: false
})
assert.equal(unsignedWindows.stage, 'candidate_ready')
assert.equal(unsignedWindows.candidateArtifactAllowed, true)
assert.equal(unsignedWindows.distributionAllowed, false)
assert.deepEqual(
  unsignedWindows.missing.map((item) => item.code),
  ['installer_smoke', 'signature', 'update_metadata']
)

const distributionWindows = evaluateReleaseCandidate({
  platform: 'windows',
  arch: 'x64',
  checks: {
    ...commonPassed,
    installerSmoke: 'passed',
    signature: 'passed',
    updateMetadata: 'passed'
  },
  explicitPublishApproval: false
})
assert.equal(distributionWindows.stage, 'distribution_ready')
assert.equal(distributionWindows.distributionAllowed, true)
assert.equal(distributionWindows.publishAllowed, false)
assert.deepEqual(distributionWindows.missing.map((item) => item.code), ['publish_approval'])

const publishMac = evaluateReleaseCandidate({
  platform: 'macos',
  arch: 'arm64',
  checks: {
    ...commonPassed,
    installerSmoke: 'passed',
    signature: 'passed',
    hardenedRuntime: 'passed',
    nestedSignatures: 'passed',
    notarization: 'passed',
    staple: 'passed',
    gatekeeper: 'passed',
    updateMetadata: 'passed'
  },
  explicitPublishApproval: true
})
assert.equal(publishMac.stage, 'publish_ready')
assert.equal(publishMac.publishAllowed, true)
assert.deepEqual(publishMac.missing, [])
