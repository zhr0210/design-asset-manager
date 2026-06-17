import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  ReleaseCandidateChecks,
  ReleasePackagingArch,
  ReleasePlatform
} from '../src/main/packaging/release-flow-governance'
import { createReleaseEvidenceBundleStatus } from '../src/main/packaging/release-evidence-bundle-status'
import { createReleaseExternalGateStatus } from '../src/main/packaging/release-external-gate-status'
import { createReleaseReadinessSummary } from '../src/main/packaging/release-readiness-summary'

const root = path.join(process.cwd(), 'dist-temp', 'tests', 'release-evidence-bundle-status-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

const windowsDistribution = createExternalGateStatus('windows', 'x64', false)
const macosDistribution = createExternalGateStatus('macos', 'arm64', false)
const distributionBundle = createReleaseEvidenceBundleStatus(
  [windowsDistribution, macosDistribution],
  [{ platform: 'windows', arch: 'x64' }, { platform: 'macos', arch: 'arm64' }]
)
assert.equal(distributionBundle.schemaVersion, 1)
assert.equal(distributionBundle.source, 'release-external-gate-status')
assert.equal(distributionBundle.targetStage, 'distribution_ready')
assert.equal(distributionBundle.displayOnly, true)
assert.equal(distributionBundle.readsSecretValues, false)
assert.equal(distributionBundle.readsSigningAssets, false)
assert.equal(distributionBundle.readsBrandingAssetBytes, false)
assert.equal(distributionBundle.readsCandidateBinaries, false)
assert.equal(distributionBundle.emitsLocalPaths, false)
assert.equal(distributionBundle.executesWorkflow, false)
assert.equal(distributionBundle.publishesRelease, false)
assert.equal(distributionBundle.bundleReady, true)
assert.deepEqual(distributionBundle.summary, {
  requiredPlatforms: 2,
  presentPlatforms: 2,
  satisfiedPlatforms: 2,
  missingPlatforms: 0
})
assert.ok(distributionBundle.platforms.every((platform) => platform.targetSatisfied))
assert.deepEqual(distributionBundle.missing, [])

const publishBundle = createReleaseEvidenceBundleStatus(
  [windowsDistribution, macosDistribution],
  [{ platform: 'windows', arch: 'x64' }, { platform: 'macos', arch: 'arm64' }],
  'publish_ready'
)
assert.equal(publishBundle.bundleReady, false)
assert.equal(publishBundle.summary.satisfiedPlatforms, 0)
assert.deepEqual(publishBundle.missing.map((item) => item.code), [
  'target_stage_not_met',
  'target_stage_not_met'
])
assert.ok(publishBundle.platforms.every((platform) =>
  platform.nextExternalActions.some((action) => action.code === 'publish_approval')
))

const publishReadyBundle = createReleaseEvidenceBundleStatus(
  [createExternalGateStatus('windows', 'x64', true), createExternalGateStatus('macos', 'arm64', true)],
  [{ platform: 'windows', arch: 'x64' }, { platform: 'macos', arch: 'arm64' }],
  'publish_ready'
)
assert.equal(publishReadyBundle.bundleReady, true)
assert.deepEqual(publishReadyBundle.missing, [])

const missingMacosBundle = createReleaseEvidenceBundleStatus(
  [windowsDistribution],
  [{ platform: 'windows', arch: 'x64' }, { platform: 'macos', arch: 'arm64' }]
)
assert.equal(missingMacosBundle.bundleReady, false)
assert.equal(missingMacosBundle.summary.presentPlatforms, 1)
assert.equal(missingMacosBundle.summary.missingPlatforms, 1)
assert.deepEqual(missingMacosBundle.missing.map((item) => item.code), ['missing_external_gate_status'])

await writeStatus(root, windowsDistribution)
await writeStatus(root, macosDistribution)
const cliOutput = path.join(root, 'bundle.json')
assert.equal(await runWriter([
  `--dist-dir=${root}`,
  '--required=windows:x64,macos:arm64',
  '--target-stage=distribution_ready',
  `--output=${cliOutput}`
]), 0)
const cliBundle = JSON.parse(await fs.readFile(cliOutput, 'utf8'))
assert.equal(cliBundle.bundleReady, true)
assert.equal(JSON.stringify(cliBundle).includes(root), false)
assert.equal(JSON.stringify(cliBundle).includes('/Users/'), false)
assert.equal(JSON.stringify(cliBundle).includes('C:\\Users\\'), false)
assert.equal(JSON.stringify(cliBundle).includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(JSON.stringify(cliBundle).includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const cliPublishOutput = path.join(root, 'bundle-publish.json')
assert.equal(await runWriter([
  `--dist-dir=${root}`,
  '--required=windows:x64,macos:arm64',
  '--target-stage=publish_ready',
  `--output=${cliPublishOutput}`
]), 1)
assert.equal(JSON.parse(await fs.readFile(cliPublishOutput, 'utf8')).bundleReady, false)

assert.throws(() =>
  createReleaseEvidenceBundleStatus(
    [windowsDistribution, windowsDistribution],
    [{ platform: 'windows', arch: 'x64' }]
  ),
  /Duplicate release external gate status/
)

const source = await fs.readFile('src/main/packaging/release-evidence-bundle-status.ts', 'utf8')
const writer = await fs.readFile('scripts/write-release-evidence-bundle-status.ts', 'utf8')
const wrapper = await fs.readFile('scripts/write-release-evidence-bundle-status.mjs', 'utf8')
assert.match(wrapper, /write-release-evidence-bundle-status\.ts/)
assert.match(writer, /createReleaseEvidenceBundleStatus/)
assert.doesNotMatch(source, /process\.env|\bfs\.|\breadFile\b|\breaddir\b|\bcreateReadStream\b|\bexecFile\b|\bspawn\b/)
assert.doesNotMatch(writer, /process\.env|secrets\.|readFile\(.*(?:exe|dmg|blockmap|icon)|createReadStream|gh\s+workflow|gh\s+release|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)
assert.doesNotMatch(writer, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-evidence-bundle-status'],
  'node scripts/run-ts-test.mjs scripts/release-evidence-bundle-status.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-evidence-bundle-status/)

await fs.rm(root, { recursive: true, force: true })
console.log('release-evidence-bundle-status passed')

function createExternalGateStatus(
  platform: ReleasePlatform,
  arch: ReleasePackagingArch,
  publishApproved: boolean
) {
  return createReleaseExternalGateStatus(createReleaseReadinessSummary([{
    platform,
    arch,
    checks: passedChecksFor(platform),
    explicitPublishApproval: publishApproved
  }], 'release-readiness-evidence'))
}

function passedChecksFor(platform: ReleasePlatform): ReleaseCandidateChecks {
  return {
    build: 'passed',
    governance: 'passed',
    artifact: 'passed',
    checksum: 'passed',
    packageSmoke: 'passed',
    branding: 'passed',
    installerSmoke: 'passed',
    signature: 'passed',
    hardenedRuntime: platform === 'macos' ? 'passed' : 'not_applicable',
    nestedSignatures: platform === 'macos' ? 'passed' : 'not_applicable',
    notarization: platform === 'macos' ? 'passed' : 'not_applicable',
    staple: platform === 'macos' ? 'passed' : 'not_applicable',
    gatekeeper: platform === 'macos' ? 'passed' : 'not_applicable',
    updateMetadata: 'passed'
  }
}

async function writeStatus(dir: string, status: ReturnType<typeof createExternalGateStatus>): Promise<void> {
  const platform = status.platforms[0]
  assert.ok(platform)
  await fs.writeFile(
    path.join(dir, `release-external-gate-status-${platform.platform}-${platform.arch}.json`),
    `${JSON.stringify(status, null, 2)}\n`,
    'utf8'
  )
}

async function runWriter(args: string[]): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-evidence-bundle-status.mjs',
      ...args
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
