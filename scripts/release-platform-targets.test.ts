import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import {
  getReleasePlatformTarget,
  listReleasePlatformTargets,
  RELEASE_PACKAGING_ARCHES
} from '../src/main/packaging/release-flow-governance'
import { createReleaseBrandingPreflight } from '../src/main/packaging/release-branding-preflight'
import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import { createReleaseFlowGovernancePlan } from '../src/main/packaging/release-flow-governance'
import { createReleaseSignedCandidatePreflight } from '../src/main/packaging/release-signed-candidate-preflight'

const targets = listReleasePlatformTargets()
assert.deepEqual(targets.map((target) => target.platform), ['windows', 'macos'])
assert.deepEqual(RELEASE_PACKAGING_ARCHES, ['x64', 'arm64'])

const windows = getReleasePlatformTarget('windows')
assert.equal(windows.packagingTarget, 'windows-nsis')
assert.equal(windows.runnerLabel, 'windows-2022')
assert.equal(windows.distCommand, 'npm run dist:win')
assert.equal(windows.defaultEvidenceBundleArch, 'x64')
assert.equal(windows.signedCandidateEnvironment, 'release-signing-windows')
assert.equal(windows.signedCandidateJobName, 'windows-signed-candidate')
assert.equal(windows.brandingIconFileName, 'icon.ico')
assert.equal(windows.brandingEvidenceIconCheckId, 'windows_icon')
assert.deepEqual(windows.requiredSecretNames, ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'])

const macos = getReleasePlatformTarget('macos')
assert.equal(macos.packagingTarget, 'macos-dmg')
assert.equal(macos.runnerLabel, 'macos-latest')
assert.equal(macos.distCommand, 'npm run dist:mac')
assert.equal(macos.defaultEvidenceBundleArch, 'arm64')
assert.equal(macos.signedCandidateEnvironment, 'release-signing-macos')
assert.equal(macos.signedCandidateJobName, 'macos-signed-candidate')
assert.equal(macos.brandingIconFileName, 'icon.icns')
assert.equal(macos.brandingEvidenceIconCheckId, 'macos_icon')
assert.deepEqual(macos.requiredSecretNames, [
  'MACOS_CSC_LINK',
  'MACOS_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID'
])

const plan = createReleaseFlowGovernancePlan()
for (const target of targets) {
  assert.deepEqual(target.supportedArches, RELEASE_PACKAGING_ARCHES)
  for (const arch of target.supportedArches) {
    assert.ok(plan.matrix.some((entry) =>
      entry.target === target.packagingTarget
      && entry.os === target.runnerLabel
      && entry.arch === arch
      && entry.command === target.distCommand
    ))
  }
}

const environmentManifest = createReleaseEnvironmentManifest()
const brandingPreflight = createReleaseBrandingPreflight()
for (const target of targets) {
  const signedPreflight = createReleaseSignedCandidatePreflight(target.platform, 'x64')
  const environment = environmentManifest.environments.find((item) => item.platform === target.platform)
  const branding = brandingPreflight.platforms.find((item) => item.platform === target.platform)

  assert.ok(environment)
  assert.equal(signedPreflight.environment, target.signedCandidateEnvironment)
  assert.deepEqual(signedPreflight.requiredSecretNames, target.requiredSecretNames)
  assert.equal(environment.environment, target.signedCandidateEnvironment)
  assert.equal(environment.jobName, target.signedCandidateJobName)
  assert.equal(environment.runnerLabel, target.runnerLabel)
  assert.deepEqual(environment.supportedArches, target.supportedArches)
  assert.equal(environment.artifactNamePattern, target.signedCandidateArtifactNamePattern)
  assert.ok(branding)
  assert.equal(branding.iconFileName, target.brandingIconFileName)
}

const filesThatShouldConsumeRegistry = [
  'src/main/packaging/release-signed-candidate-preflight.ts',
  'src/main/packaging/release-environment-manifest.ts',
  'src/main/packaging/release-signed-candidate-dispatch-status.ts',
  'src/main/packaging/release-branding-preflight.ts'
]

for (const file of filesThatShouldConsumeRegistry) {
  const source = await fs.readFile(file, 'utf8')
  assert.match(source, /getReleasePlatformTarget|listReleasePlatformTargets/)
  assert.doesNotMatch(source, /\bplatform\s*===\s*['"]windows['"]\s*\?/)
  assert.doesNotMatch(source, /\bplatform\s*===\s*['"]macos['"]\s*\?/)
  assert.doesNotMatch(source, /'release-signing-windows'\s*:\s*'release-signing-macos'/)
  assert.doesNotMatch(source, /'windows-signed-candidate'\s*:\s*'macos-signed-candidate'/)
}

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-platform-targets'],
  'node scripts/run-ts-test.mjs scripts/release-platform-targets.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-platform-targets/)

console.log('release-platform-targets passed')
