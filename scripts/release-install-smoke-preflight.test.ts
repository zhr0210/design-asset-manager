import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import { createReleaseInstallSmokePreflight } from '../src/main/packaging/release-install-smoke-preflight'

const windows = createReleaseInstallSmokePreflight('windows')
assert.equal(windows.platform, 'windows')
assert.equal(windows.distributionSmoke, 'windows_sandbox_installer_smoke')
assert.equal(windows.evidenceSource, 'package-smoke')
assert.equal(
  windows.packageSmokeCommand,
  'node scripts/package-smoke.mjs --sandbox-install --output=dist-packages/package-smoke-windows-${arch}.json'
)
assert.deepEqual(windows.requiredCheckIds, ['installer-run', 'installer-subfolder', 'installed-exe'])
assert.equal(windows.executionHost, 'windows-sandbox')
assert.equal(windows.disposableInstallRoot, true)
assert.equal(windows.launchUsesIsolatedAppData, true)
assert.equal(windows.writesLocalPaths, false)
assert.equal(windows.readsSigningSecrets, false)

const macos = createReleaseInstallSmokePreflight('macos')
assert.equal(macos.platform, 'macos')
assert.equal(macos.distributionSmoke, 'macos_dmg_install_smoke')
assert.equal(macos.evidenceSource, 'package-smoke')
assert.equal(
  macos.packageSmokeCommand,
  'node scripts/package-smoke.mjs --dmg-install-smoke --output=dist-packages/package-smoke-macos-${arch}.json'
)
assert.deepEqual(macos.requiredCheckIds, ['dmg-mount', 'dmg-copy', 'dmg-installed-launch', 'dmg-detach'])
assert.equal(macos.executionHost, 'macos-host')
assert.equal(macos.disposableInstallRoot, true)
assert.equal(macos.launchUsesIsolatedAppData, true)
assert.equal(macos.writesLocalPaths, false)
assert.equal(macos.readsSigningSecrets, false)

const manifest = createReleaseEnvironmentManifest()
const manifestWindows = manifest.environments.find((item) => item.platform === 'windows')
const manifestMacos = manifest.environments.find((item) => item.platform === 'macos')
assert.ok(manifestWindows)
assert.ok(manifestMacos)
assert.equal(manifestWindows.requiredDistributionSmoke, windows.distributionSmoke)
assert.equal(manifestWindows.distributionSmokeEvidenceSource, windows.evidenceSource)
assert.deepEqual(manifestWindows.distributionSmokeCheckIds, windows.requiredCheckIds)
assert.equal(manifestMacos.requiredDistributionSmoke, macos.distributionSmoke)
assert.equal(manifestMacos.distributionSmokeEvidenceSource, macos.evidenceSource)
assert.deepEqual(manifestMacos.distributionSmokeCheckIds, macos.requiredCheckIds)

const packageSmokeSource = await fs.readFile('scripts/package-smoke.mjs', 'utf8')
assert.match(packageSmokeSource, /--sandbox-install/)
assert.match(packageSmokeSource, /--dmg-install-smoke/)
for (const checkId of [...windows.requiredCheckIds, ...macos.requiredCheckIds]) {
  assert.match(packageSmokeSource, new RegExp(`['"]${escapeRegExp(checkId)}['"]`))
}
assert.match(packageSmokeSource, /disposable install root/i)
assert.match(packageSmokeSource, /Installed application launched with isolated app data\./)

const readinessWriterSource = await fs.readFile('scripts/write-release-readiness-summary.mjs', 'utf8')
for (const checkId of [...windows.requiredCheckIds, ...macos.requiredCheckIds]) {
  assert.match(readinessWriterSource, new RegExp(`['"]${escapeRegExp(checkId)}['"]`))
}
assert.match(readinessWriterSource, /function hasInstallSmoke/)
assert.doesNotMatch(readinessWriterSource, /process\.env|secrets\.|createReadStream/)

const preflightSource = await fs.readFile('src/main/packaging/release-install-smoke-preflight.ts', 'utf8')
assert.doesNotMatch(preflightSource, /process\.env|secrets\.|fs\.|readFile|stat|createReadStream/)
assert.doesNotMatch(preflightSource, /C:\\Users\\[A-Za-z0-9_.-]+|\/Users\/[A-Za-z0-9_.-]+/)

console.log('release-install-smoke-preflight passed')

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
