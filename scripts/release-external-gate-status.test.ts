import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import type { ReleaseCandidateChecks } from '../src/main/packaging/release-flow-governance'
import {
  createReleaseReadinessSummary,
  type ReleaseReadinessInput
} from '../src/main/packaging/release-readiness-summary'
import {
  createReleaseExternalGateStatus,
  listReleaseSignedCandidateEvidenceChecks
} from '../src/main/packaging/release-external-gate-status'

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

const blockedWindows: ReleaseReadinessInput = {
  platform: 'windows',
  arch: 'x64',
  checks: {
    ...passedChecks,
    build: 'failed',
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

const status = createReleaseExternalGateStatus(
  createReleaseReadinessSummary([unsignedWindows, unsignedMacos])
)
assert.equal(status.schemaVersion, 1)
assert.equal(status.source, 'release-readiness-summary')
assert.equal(status.displayOnly, true)
assert.equal(status.writesGitHubSettings, false)
assert.equal(status.readsSecretValues, false)
assert.equal(status.readsSigningAssets, false)
assert.equal(status.readsBrandingAssetBytes, false)
assert.equal(status.emitsLocalPaths, false)
assert.equal(status.executesWorkflow, false)
assert.equal(status.publishesRelease, false)
assert.equal(status.platforms.length, 2)
assert.equal(status.summary.overallStatus, 'blocked_by_signed_candidate')
assert.equal(status.summary.totalGates, 10)
assert.equal(status.summary.satisfiedGates, 0)
assert.equal(status.summary.externalActionRequiredGates, 6)
assert.equal(status.summary.blockedGates, 4)
assert.ok(status.summary.nextExternalActions.some((item) =>
  item.platform === 'windows'
  && item.arch === 'x64'
  && item.code === 'signed_candidate_workflow'
  && item.actor === 'github_actions'
  && item.status === 'external_action_required'
))
assert.ok(status.summary.nextExternalActions.some((item) =>
  item.platform === 'macos'
  && item.arch === 'arm64'
  && item.code === 'distribution_install_smoke'
  && item.status === 'blocked_by_signed_candidate'
))

const windowsCandidate = status.platforms.find((item) => item.platform === 'windows')
assert.ok(windowsCandidate)
assert.equal(windowsCandidate.arch, 'x64')
assert.equal(windowsCandidate.stage, 'candidate_ready')
assert.equal(gateStatus(windowsCandidate, 'branding_assets'), 'external_action_required')
assert.equal(gateStatus(windowsCandidate, 'signing_environment'), 'external_action_required')
assert.equal(gateStatus(windowsCandidate, 'signed_candidate_workflow'), 'external_action_required')
assert.equal(gateStatus(windowsCandidate, 'distribution_install_smoke'), 'blocked_by_signed_candidate')
assert.equal(gateStatus(windowsCandidate, 'publish_approval'), 'blocked_by_distribution')
assert.ok(gateMissing(windowsCandidate, 'branding_assets').some((item) => item.code === 'branding'))
assert.ok(gateMissing(windowsCandidate, 'signed_candidate_workflow').some((item) => item.code === 'signature'))
assert.ok(gateMissing(windowsCandidate, 'signed_candidate_workflow').some((item) => item.code === 'update_metadata'))

const macosCandidate = status.platforms.find((item) => item.platform === 'macos')
assert.ok(macosCandidate)
assert.equal(macosCandidate.arch, 'arm64')
assert.equal(macosCandidate.stage, 'candidate_ready')
assert.equal(gateStatus(macosCandidate, 'signed_candidate_workflow'), 'external_action_required')
assert.ok(gateMissing(macosCandidate, 'signed_candidate_workflow').some((item) => item.code === 'notarization'))
assert.ok(gateMissing(macosCandidate, 'signed_candidate_workflow').some((item) => item.code === 'gatekeeper'))

const blockedStatus = createReleaseExternalGateStatus(
  createReleaseReadinessSummary([blockedWindows])
).platforms[0]
assert.equal(blockedStatus.stage, 'blocked')
assert.equal(gateStatus(blockedStatus, 'signed_candidate_workflow'), 'blocked_by_candidate')
assert.ok(gateMissing(blockedStatus, 'signed_candidate_workflow').some((item) => item.code === 'build'))
assert.equal(gateStatus(blockedStatus, 'distribution_install_smoke'), 'blocked_by_signed_candidate')
assert.equal(gateStatus(blockedStatus, 'publish_approval'), 'blocked_by_distribution')
const blockedSummary = createReleaseExternalGateStatus(
  createReleaseReadinessSummary([blockedWindows])
).summary
assert.equal(blockedSummary.overallStatus, 'blocked_by_candidate')
assert.ok(blockedSummary.nextExternalActions.some((item) => item.status === 'blocked_by_candidate'))

const windowsDistributionStatus = createReleaseExternalGateStatus(
  createReleaseReadinessSummary([{
    platform: 'windows',
    arch: 'x64',
    checks: passedChecks,
    explicitPublishApproval: false
  }])
)
const windowsDistribution = windowsDistributionStatus.platforms[0]
assert.equal(windowsDistribution.stage, 'distribution_ready')
assert.equal(gateStatus(windowsDistribution, 'branding_assets'), 'satisfied')
assert.equal(gateStatus(windowsDistribution, 'signing_environment'), 'satisfied')
assert.equal(gateStatus(windowsDistribution, 'signed_candidate_workflow'), 'satisfied')
assert.equal(gateStatus(windowsDistribution, 'distribution_install_smoke'), 'satisfied')
assert.equal(gateStatus(windowsDistribution, 'publish_approval'), 'external_action_required')
assert.ok(gateMissing(windowsDistribution, 'publish_approval').some((item) => item.code === 'publish_approval'))
assert.equal(windowsDistributionStatus.summary.overallStatus, 'external_action_required')
assert.equal(windowsDistributionStatus.summary.satisfiedGates, 4)
assert.equal(windowsDistributionStatus.summary.externalActionRequiredGates, 1)
assert.equal(windowsDistributionStatus.summary.blockedGates, 0)
assert.deepEqual(
  windowsDistributionStatus.summary.nextExternalActions.map((item) => item.code),
  ['publish_approval']
)

const windowsPublishStatus = createReleaseExternalGateStatus(
  createReleaseReadinessSummary([{
    platform: 'windows',
    arch: 'x64',
    checks: passedChecks,
    explicitPublishApproval: true
  }])
)
const windowsPublish = windowsPublishStatus.platforms[0]
assert.equal(windowsPublish.stage, 'publish_ready')
assert.ok(windowsPublish.gates.every((gate) => gate.status === 'satisfied'))
assert.equal(windowsPublishStatus.summary.overallStatus, 'publish_ready')
assert.equal(windowsPublishStatus.summary.nextExternalActions.length, 0)

assert.deepEqual(
  listReleaseSignedCandidateEvidenceChecks('windows'),
  [
    'build',
    'governance',
    'artifact',
    'checksum',
    'packageSmoke',
    'branding',
    'signature',
    'updateMetadata'
  ]
)
assert.deepEqual(
  listReleaseSignedCandidateEvidenceChecks('macos'),
  [
    'build',
    'governance',
    'artifact',
    'checksum',
    'packageSmoke',
    'branding',
    'signature',
    'hardenedRuntime',
    'nestedSignatures',
    'notarization',
    'staple',
    'gatekeeper',
    'updateMetadata'
  ]
)
const mutableSignedCandidateChecks = listReleaseSignedCandidateEvidenceChecks('macos')
mutableSignedCandidateChecks.pop()
assert.equal(listReleaseSignedCandidateEvidenceChecks('macos').includes('gatekeeper'), true)

const serialized = JSON.stringify(status)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const source = await fs.readFile('src/main/packaging/release-external-gate-status.ts', 'utf8')
assert.match(source, /createReleaseExternalGatePlan/)
assert.match(source, /SIGNED_CANDIDATE_EVIDENCE_CHECKS_BY_PLATFORM/)
assert.match(source, /listReleaseSignedCandidateEvidenceChecks\(summary\.platform\)/)
assert.doesNotMatch(source, /summary\.platform === 'macos'/)
assert.doesNotMatch(source, /checks\.push\('hardenedRuntime'/)
assert.doesNotMatch(
  source,
  /process\.env|\bfs\.|\breadFile\b|\bstat\b|\bcreateReadStream\b|\bexecFile\b|\bspawn\b/
)
assert.doesNotMatch(source, /gh\s+workflow|gh\s+release|electron-builder|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-external-gate-status'],
  'node scripts/run-ts-test.mjs scripts/release-external-gate-status.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-external-gate-status/)

console.log('release-external-gate-status passed')

function gateStatus(
  platform: ReturnType<typeof createReleaseExternalGateStatus>['platforms'][number],
  code: string
): string {
  const gate = platform.gates.find((item) => item.code === code)
  assert.ok(gate, `Missing gate ${code}`)
  return gate.status
}

function gateMissing(
  platform: ReturnType<typeof createReleaseExternalGateStatus>['platforms'][number],
  code: string
): Array<{ code: string }> {
  const gate = platform.gates.find((item) => item.code === code)
  assert.ok(gate, `Missing gate ${code}`)
  return gate.missing
}
