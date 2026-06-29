import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import {
  createReleaseReadinessSummary,
  type ReleaseReadinessInput
} from '../src/main/packaging/release-readiness-summary'
import type { ReleaseCandidateChecks } from '../src/main/packaging/release-flow-governance'

const passedChecks: ReleaseCandidateChecks = {
  build: 'passed',
  governance: 'passed',
  artifact: 'passed',
  checksum: 'passed',
  packageSmoke: 'passed',
  branding: 'passed',
  installerSmoke: 'passed',
  signature: 'passed',
  hardenedRuntime: 'passed',
  nestedSignatures: 'passed',
  notarization: 'passed',
  staple: 'passed',
  gatekeeper: 'passed',
  updateMetadata: 'passed'
}

const unsignedWindows: ReleaseReadinessInput = {
  platform: 'windows',
  arch: 'x64',
  checks: {
    ...passedChecks,
    branding: 'not_run',
    installerSmoke: 'not_run',
    signature: 'not_run',
    updateMetadata: 'not_run'
  },
  explicitPublishApproval: false
}

const unsignedMacos: ReleaseReadinessInput = {
  platform: 'macos',
  arch: 'arm64',
  checks: {
    ...passedChecks,
    branding: 'not_run',
    installerSmoke: 'not_run',
    signature: 'not_run',
    hardenedRuntime: 'not_run',
    nestedSignatures: 'not_run',
    notarization: 'not_run',
    staple: 'not_run',
    gatekeeper: 'not_run',
    updateMetadata: 'not_run'
  },
  explicitPublishApproval: false
}

const summary = createReleaseReadinessSummary([unsignedWindows, unsignedMacos])
assert.equal(summary.schemaVersion, 1)
assert.equal(summary.source, 'release-flow-governance')
assert.equal(summary.publishEnabled, false)
assert.equal(summary.readsSecretValues, false)
assert.equal(summary.readsBrandingAssetBytes, false)
assert.equal(summary.emitsLocalPaths, false)
assert.equal(summary.platforms.length, 2)

const windows = summary.platforms.find((item) => item.platform === 'windows')
assert.ok(windows)
assert.equal(windows.arch, 'x64')
assert.equal(windows.stage, 'candidate_ready')
assert.equal(windows.candidateArtifactAllowed, true)
assert.equal(windows.distributionAllowed, false)
assert.equal(windows.publishAllowed, false)
assert.equal(windows.signingEnvironment, 'release-signing-windows')
assert.equal(windows.signingApprovalInput, 'signing_approved')
assert.equal(windows.refGate, 'main-or-version-tag')
assert.deepEqual(windows.requiredSecretNames, ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'])
assert.equal(windows.brandingApprovalFile, 'release-branding.json')
assert.equal(windows.brandingIconFileName, 'icon.ico')
assert.deepEqual(windows.checks, unsignedWindows.checks)
assert.ok(windows.requiredEvidence.includes('release-trust-evidence'))
assert.ok(windows.requiredEvidence.includes('release-branding-evidence'))
assert.ok(windows.blockers.some((item) => item.code === 'signature' && item.phase === 'distribution'))
assert.ok(windows.blockers.some((item) => item.code === 'branding' && item.phase === 'distribution'))
assert.ok(windows.blockers.every((item) => item.severity === 'blocking'))

const macos = summary.platforms.find((item) => item.platform === 'macos')
assert.ok(macos)
assert.equal(macos.arch, 'arm64')
assert.equal(macos.stage, 'candidate_ready')
assert.equal(macos.signingEnvironment, 'release-signing-macos')
assert.deepEqual(macos.requiredSecretNames, [
  'MACOS_CSC_LINK',
  'MACOS_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID'
])
assert.equal(macos.brandingIconFileName, 'icon.icns')
assert.ok(macos.blockers.some((item) => item.code === 'notarization' && item.phase === 'distribution'))
assert.ok(macos.blockers.some((item) => item.code === 'gatekeeper' && item.phase === 'distribution'))

const publishReadyCandidate = createReleaseReadinessSummary([{
  platform: 'windows',
  arch: 'x64',
  checks: passedChecks,
  explicitPublishApproval: false
}]).platforms[0]
assert.equal(publishReadyCandidate.stage, 'distribution_ready')
assert.equal(publishReadyCandidate.distributionAllowed, true)
assert.equal(publishReadyCandidate.publishAllowed, false)
assert.deepEqual(publishReadyCandidate.blockers.map((item) => item.code), ['publish_approval'])
assert.deepEqual(publishReadyCandidate.blockers.map((item) => item.phase), ['publish'])

const blockedCandidate = createReleaseReadinessSummary([{
  platform: 'windows',
  arch: 'x64',
  checks: { ...passedChecks, build: 'failed' },
  explicitPublishApproval: false
}]).platforms[0]
assert.equal(blockedCandidate.stage, 'blocked')
assert.equal(blockedCandidate.candidateArtifactAllowed, false)
assert.ok(blockedCandidate.blockers.some((item) => item.code === 'build' && item.phase === 'candidate'))

const evidenceSummary = createReleaseReadinessSummary([unsignedWindows], 'release-readiness-evidence')
assert.equal(evidenceSummary.source, 'release-readiness-evidence')
assert.deepEqual(evidenceSummary.platforms[0].checks, unsignedWindows.checks)

const source = await fs.readFile('src/main/packaging/release-readiness-summary.ts', 'utf8')
assert.match(source, /getReleasePlatformTarget/)
assert.match(source, /brandingIconFileName: target\.brandingIconFileName/)
assert.doesNotMatch(source, /brandingPreflight\.platforms\.find/)
assert.doesNotMatch(source, /Missing release branding preflight/)
assert.doesNotMatch(source, /process\.env|fs\.|readFile|stat|createReadStream/)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+|\/Users\/[A-Za-z0-9_.-]+/)
