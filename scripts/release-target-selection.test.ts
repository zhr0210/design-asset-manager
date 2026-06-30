import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import {
  createDefaultReleaseEvidenceBundleRequirements,
  formatReleaseEvidenceBundleRequirements,
  parseReleaseEvidenceBundleRequirements,
  parseReleaseTargetSelection,
  releaseArchChoices,
  releaseEvidenceFileName,
  releaseTargetArchMatches,
  releasePlatformChoices,
  releaseTargetKey,
  releaseTargetPlatformMatches,
  releaseTargetSuffix,
  releaseTargetsMatch
} from '../src/main/packaging/release-target-selection'

assert.deepEqual(releasePlatformChoices(), ['windows', 'macos'])
assert.deepEqual(releaseArchChoices(), ['x64', 'arm64'])

const windows = parseReleaseTargetSelection({ platform: 'windows', arch: 'x64' })
assert.deepEqual(windows, { platform: 'windows', arch: 'x64' })
assert.equal(releaseTargetSuffix(windows), 'windows-x64')
assert.equal(releaseTargetKey(windows), 'windows:x64')
assert.equal(releaseTargetsMatch({ platform: 'windows', arch: 'x64' }, windows), true)
assert.equal(releaseTargetsMatch({ platform: 'windows', arch: 'arm64' }, windows), false)
assert.equal(releaseTargetsMatch({ platform: 'macos', arch: 'x64' }, windows), false)
assert.equal(releaseTargetPlatformMatches({ platform: 'windows' }, windows), true)
assert.equal(releaseTargetPlatformMatches({ platform: 'macos' }, windows), false)
assert.equal(releaseTargetArchMatches({ arch: 'x64' }, windows), true)
assert.equal(releaseTargetArchMatches({ arch: 'arm64' }, windows), false)
assert.equal(
  releaseEvidenceFileName('release-readiness-summary', windows),
  'release-readiness-summary-windows-x64.json'
)

const macos = parseReleaseTargetSelection({ platform: 'macos', arch: 'arm64' })
assert.deepEqual(macos, { platform: 'macos', arch: 'arm64' })
assert.equal(
  releaseEvidenceFileName('release-external-gate-status', macos),
  'release-external-gate-status-macos-arm64.json'
)

assert.deepEqual(
  createDefaultReleaseEvidenceBundleRequirements(),
  [{ platform: 'windows', arch: 'x64' }, { platform: 'macos', arch: 'arm64' }]
)
assert.equal(
  formatReleaseEvidenceBundleRequirements(createDefaultReleaseEvidenceBundleRequirements()),
  'windows:x64,macos:arm64'
)
assert.deepEqual(
  parseReleaseEvidenceBundleRequirements('windows:arm64,macos:x64'),
  [{ platform: 'windows', arch: 'arm64' }, { platform: 'macos', arch: 'x64' }]
)

assert.throws(
  () => parseReleaseTargetSelection({ platform: 'linux', arch: 'x64' }),
  /--platform must be one of: windows, macos/
)
assert.throws(
  () => parseReleaseTargetSelection({ platform: 'windows', arch: 'ia32' }),
  /--arch must be one of: x64, arm64/
)
assert.throws(
  () => parseReleaseEvidenceBundleRequirements(''),
  /--required must include at least one platform:arch entry/
)
assert.throws(
  () => parseReleaseEvidenceBundleRequirements('windows:ia32'),
  /--required arch must be one of: x64, arm64/
)

const helperSource = await fs.readFile('src/main/packaging/release-target-selection.ts', 'utf8')
assert.match(helperSource, /listReleasePlatformTargets/)
assert.match(helperSource, /RELEASE_PACKAGING_ARCHES/)
assert.match(helperSource, /function releaseTargetKey/)
assert.match(helperSource, /function releaseTargetsMatch/)
assert.match(helperSource, /function releaseTargetPlatformMatches/)
assert.match(helperSource, /function releaseTargetArchMatches/)
assert.doesNotMatch(helperSource, /actual\.platform === expected\.platform|actual\.arch === expected\.arch/)
assert.doesNotMatch(helperSource, /process\.env|\bfs\.|\breadFile\b|\breaddir\b|\bcreateReadStream\b/)
assert.doesNotMatch(helperSource, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const writers = [
  'scripts/write-release-readiness-summary.ts',
  'scripts/write-release-external-gate-status.ts',
  'scripts/write-release-signed-candidate-dispatch-status.ts',
  'scripts/write-release-evidence-bundle-status.ts'
]

for (const writerPath of writers) {
  const source = await fs.readFile(writerPath, 'utf8')
  assert.match(source, /release-target-selection/)
  assert.doesNotMatch(source, /\['windows', 'macos'\]/)
  assert.doesNotMatch(source, /\['x64', 'arm64'\]/)
}

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-target-selection'],
  'node scripts/run-ts-test.mjs scripts/release-target-selection.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-target-selection/)

console.log('release-target-selection passed')
