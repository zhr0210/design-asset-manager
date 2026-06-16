import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'

const manifest = createReleaseEnvironmentManifest()

assert.equal(manifest.schemaVersion, 1)
assert.equal(manifest.source, 'release-preflight')
assert.equal(manifest.writesGitHubSettings, false)
assert.equal(manifest.readsSecretValues, false)
assert.equal(manifest.readsSigningAssets, false)
assert.equal(manifest.readsBrandingAssetBytes, false)
assert.equal(manifest.emitsLocalPaths, false)
assert.equal(manifest.environments.length, 2)

const windows = manifest.environments.find((item) => item.platform === 'windows')
assert.ok(windows)
assert.equal(windows.environment, 'release-signing-windows')
assert.equal(windows.workflowFileName, 'release-signed-candidate.yml')
assert.equal(windows.jobName, 'windows-signed-candidate')
assert.equal(windows.runnerLabel, 'windows-2022')
assert.deepEqual(windows.supportedArches, ['x64', 'arm64'])
assert.equal(windows.refGate, 'main-or-version-tag')
assert.deepEqual(windows.approvalGates, [
  'github_environment_review',
  'workflow_dispatch_signing_approval'
])
assert.equal(windows.signingApprovalInput, 'signing_approved')
assert.deepEqual(windows.requiredSecretNames, ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'])
assert.equal(windows.secretValuesPolicy, 'names_only_never_read')
assert.equal(windows.requiredDistributionSmoke, 'windows_sandbox_installer_smoke')
assert.equal(windows.distributionSmokeEvidenceSource, 'package-smoke')
assert.deepEqual(windows.distributionSmokeCheckIds, ['installer-run', 'installer-subfolder', 'installed-exe'])
assert.equal(windows.brandingApprovalFile, 'release-branding.json')
assert.equal(windows.brandingIconFileName, 'icon.ico')
assert.equal(windows.artifactNamePattern, 'design-asset-manager-windows-${arch}-signed-candidate')
assert.equal(windows.publishEnabled, false)
assert.equal(windows.repositoryPermissions, 'contents:read')

const macos = manifest.environments.find((item) => item.platform === 'macos')
assert.ok(macos)
assert.equal(macos.environment, 'release-signing-macos')
assert.equal(macos.jobName, 'macos-signed-candidate')
assert.equal(macos.runnerLabel, 'macos-latest')
assert.deepEqual(macos.requiredSecretNames, [
  'MACOS_CSC_LINK',
  'MACOS_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID'
])
assert.equal(macos.requiredDistributionSmoke, 'macos_dmg_install_smoke')
assert.equal(macos.distributionSmokeEvidenceSource, 'package-smoke')
assert.deepEqual(macos.distributionSmokeCheckIds, ['dmg-mount', 'dmg-copy', 'dmg-installed-launch', 'dmg-detach'])
assert.equal(macos.brandingIconFileName, 'icon.icns')
assert.equal(macos.artifactNamePattern, 'design-asset-manager-macos-${arch}-signed-candidate')

for (const entry of manifest.environments) {
  assert.ok(entry.requiredEvidence.includes('release-checksums'))
  assert.ok(entry.requiredEvidence.includes('release-update-metadata'))
  assert.ok(entry.requiredEvidence.includes('release-trust-evidence'))
  assert.ok(entry.requiredEvidence.includes('release-branding-evidence'))
  assert.ok(entry.requiredEvidence.includes('release-readiness-summary'))
  assert.ok(entry.requiredEvidence.includes('package-smoke'))
}

const workflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
for (const entry of manifest.environments) {
  assert.match(workflow, new RegExp(`environment: ${entry.environment}`))
  assert.match(workflow, new RegExp(`${entry.jobName}:`))
  assert.match(workflow, new RegExp(`runs-on: ${entry.runnerLabel}`))
  assert.match(workflow, /permissions:\s*\n\s*contents: read/)
  assert.match(workflow, /inputs\.signing_approved/)
  for (const secret of entry.requiredSecretNames) assert.match(workflow, new RegExp(secret))
}
assert.match(workflow, /refs\/heads\/main/)
assert.match(workflow, /startsWith\(github\.ref, 'refs\/tags\/v'\)/)
assert.match(workflow, /release-readiness-summary-\*\.json/)
assert.doesNotMatch(workflow, /contents: write|gh release|create-release|--publish always|npm publish/i)

const source = await fs.readFile('src/main/packaging/release-environment-manifest.ts', 'utf8')
assert.doesNotMatch(source, /process\.env|secrets\.|fs\.|readFile|stat|createReadStream/)
assert.doesNotMatch(source, /CSC_LINK:|APPLE_ID:|APPLE_APP_SPECIFIC_PASSWORD:/)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+|\/Users\/[A-Za-z0-9_.-]+/)

console.log('release-environment-manifest passed')
