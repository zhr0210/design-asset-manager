import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import {
  createReleaseExternalGatePlan,
  getReleaseExternalGatePlatformPlan
} from '../src/main/packaging/release-external-gate-plan'

const plan = createReleaseExternalGatePlan()
const manifest = createReleaseEnvironmentManifest()

assert.equal(plan.schemaVersion, 1)
assert.equal(plan.source, 'release-environment-manifest')
assert.equal(plan.status, 'external-action-required')
assert.equal(plan.writesGitHubSettings, false)
assert.equal(plan.readsSecretValues, false)
assert.equal(plan.readsSigningAssets, false)
assert.equal(plan.readsBrandingAssetBytes, false)
assert.equal(plan.emitsLocalPaths, false)
assert.equal(plan.executesWorkflow, false)
assert.equal(plan.publishesRelease, false)
assert.equal(plan.platforms.length, 2)

for (const environment of manifest.environments) {
  const platformPlan = getReleaseExternalGatePlatformPlan(plan, environment.platform)
  assert.equal(platformPlan.environment, environment.environment)
  assert.equal(platformPlan.workflowFileName, environment.workflowFileName)
  assert.deepEqual(platformPlan.supportedArches, environment.supportedArches)
  assert.equal(platformPlan.signingApprovalInput, environment.signingApprovalInput)
  assert.equal(platformPlan.brandingApprovalFile, environment.brandingApprovalFile)
  assert.equal(platformPlan.brandingIconFileName, environment.brandingIconFileName)
  assert.equal(platformPlan.distributionSmoke, environment.requiredDistributionSmoke)
  assert.equal(platformPlan.distributionSmokeEvidenceSource, environment.distributionSmokeEvidenceSource)
  assert.deepEqual(platformPlan.distributionSmokeCheckIds, environment.distributionSmokeCheckIds)

  assert.deepEqual(platformPlan.gates.map((gate) => gate.code), [
    'branding_assets',
    'signing_environment',
    'signed_candidate_workflow',
    'distribution_install_smoke',
    'publish_approval'
  ])
  assert.ok(platformPlan.gates.every((gate) => gate.displayOnly === true))
  assert.ok(platformPlan.gates.every((gate) => gate.executesAction === false))

  const signingGate = platformPlan.gates.find((gate) => gate.code === 'signing_environment')
  assert.ok(signingGate)
  assert.deepEqual(signingGate.requiredSecretNames, environment.requiredSecretNames)
  assert.equal(signingGate.requiredBefore, 'signed_candidate')

  const workflowGate = platformPlan.gates.find((gate) => gate.code === 'signed_candidate_workflow')
  assert.ok(workflowGate)
  assert.deepEqual(workflowGate.requiredSecretNames, environment.requiredSecretNames)
  assert.deepEqual(workflowGate.requiredEvidence, environment.requiredEvidence)
  assert.equal(workflowGate.requiredBefore, 'distribution_ready')

  const installSmokeGate = platformPlan.gates.find((gate) => gate.code === 'distribution_install_smoke')
  assert.ok(installSmokeGate)
  assert.deepEqual(installSmokeGate.requiredEvidence, ['package-smoke'])
  assert.equal(installSmokeGate.requiredBefore, 'distribution_ready')

  const publishGate = platformPlan.gates.find((gate) => gate.code === 'publish_approval')
  assert.ok(publishGate)
  assert.equal(publishGate.requiredBefore, 'publish_ready')
}

const mutableWindowsPlan = getReleaseExternalGatePlatformPlan(plan, 'windows')
mutableWindowsPlan.supportedArches.pop()
mutableWindowsPlan.distributionSmokeCheckIds.pop()
mutableWindowsPlan.gates[0].requiredEvidence.pop()
assert.deepEqual(getReleaseExternalGatePlatformPlan(plan, 'windows').supportedArches, ['x64', 'arm64'])
assert.equal(
  getReleaseExternalGatePlatformPlan(plan, 'windows').distributionSmokeCheckIds.includes('installer-run'),
  true
)
assert.equal(
  getReleaseExternalGatePlatformPlan(plan, 'windows').gates[0].requiredEvidence.includes('release-branding-evidence'),
  true
)

const serialized = JSON.stringify(plan)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const source = await fs.readFile('src/main/packaging/release-external-gate-plan.ts', 'utf8')
assert.match(source, /createReleaseEnvironmentManifest/)
assert.match(source, /releaseTargetPlatformMatches\(item, \{ platform \}\)/)
assert.match(source, /function getReleaseExternalGatePlatformPlan/)
assert.match(source, /function cloneReleaseExternalGatePlatformPlan/)
assert.doesNotMatch(source, /item\.platform === platform/)
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
  packageJson.scripts?.['test-release-external-gate-plan'],
  'node scripts/run-ts-test.mjs scripts/release-external-gate-plan.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-external-gate-plan/)

console.log('release-external-gate-plan passed')
