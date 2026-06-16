import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

type Platform = 'windows' | 'macos'
type Arch = 'x64' | 'arm64'
type Check = { id: string, status: 'passed' | 'failed' | 'skipped', detail: string }

const root = path.join(process.cwd(), 'dist-temp', 'release-readiness-writer-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

const windowsStatic = await createFixture('windows-static', 'windows', 'x64', {
  packageSmokeChecks: [{ id: 'installer', status: 'passed', detail: 'fixture' }]
})
const windowsStaticSummary = await runAndRead(windowsStatic)
const windowsStaticPlatform = windowsStaticSummary.platforms[0]
assert.equal(windowsStaticPlatform.platform, 'windows')
assert.equal(windowsStaticPlatform.arch, 'x64')
assert.equal(windowsStaticPlatform.stage, 'candidate_ready')
assert.equal(windowsStaticPlatform.candidateArtifactAllowed, true)
assert.equal(windowsStaticPlatform.distributionAllowed, false)
assert.equal(windowsStaticPlatform.publishAllowed, false)
assert.equal(windowsStaticPlatform.checks.packageSmoke, 'passed')
assert.equal(windowsStaticPlatform.checks.installerSmoke, 'failed')
assert.deepEqual(windowsStaticPlatform.blockers.map((item: { code: string }) => item.code), ['installer_smoke'])

const windowsInstall = await createFixture('windows-install', 'windows', 'x64', {
  packageSmokeChecks: [
    { id: 'installer', status: 'passed', detail: 'fixture' },
    { id: 'installer-run', status: 'passed', detail: 'fixture' },
    { id: 'installer-subfolder', status: 'passed', detail: 'fixture' },
    { id: 'installed-exe', status: 'passed', detail: 'fixture' }
  ]
})
const windowsInstallSummary = await runAndRead(windowsInstall)
const windowsInstallPlatform = windowsInstallSummary.platforms[0]
assert.equal(windowsInstallPlatform.stage, 'distribution_ready')
assert.equal(windowsInstallPlatform.distributionAllowed, true)
assert.equal(windowsInstallPlatform.publishAllowed, false)
assert.deepEqual(windowsInstallPlatform.blockers.map((item: { code: string }) => item.code), ['publish_approval'])
assert.equal(JSON.stringify(windowsInstallSummary).includes(root), false)

const windowsPublishSummary = await runAndRead(windowsInstall, true)
assert.equal(windowsPublishSummary.platforms[0].stage, 'publish_ready')
assert.deepEqual(windowsPublishSummary.platforms[0].blockers, [])

const macosStatic = await createFixture('macos-static', 'macos', 'arm64', {
  packageSmokeChecks: [{ id: 'dmg', status: 'passed', detail: 'fixture' }]
})
const macosStaticPlatform = (await runAndRead(macosStatic)).platforms[0]
assert.equal(macosStaticPlatform.platform, 'macos')
assert.equal(macosStaticPlatform.arch, 'arm64')
assert.equal(macosStaticPlatform.stage, 'candidate_ready')
assert.equal(macosStaticPlatform.checks.packageSmoke, 'passed')
assert.equal(macosStaticPlatform.checks.installerSmoke, 'failed')
assert.deepEqual(macosStaticPlatform.blockers.map((item: { code: string }) => item.code), ['installer_smoke'])

const macosInstall = await createFixture('macos-install', 'macos', 'arm64', {
  packageSmokeChecks: [
    { id: 'dmg', status: 'passed', detail: 'fixture' },
    { id: 'dmg-mount', status: 'passed', detail: 'fixture' },
    { id: 'dmg-copy', status: 'passed', detail: 'fixture' },
    { id: 'dmg-installed-launch', status: 'passed', detail: 'fixture' },
    { id: 'dmg-detach', status: 'passed', detail: 'fixture' }
  ]
})
const macosInstallPlatform = (await runAndRead(macosInstall)).platforms[0]
assert.equal(macosInstallPlatform.stage, 'distribution_ready')
assert.equal(macosInstallPlatform.checks.signature, 'passed')
assert.equal(macosInstallPlatform.checks.hardenedRuntime, 'passed')
assert.equal(macosInstallPlatform.checks.nestedSignatures, 'passed')
assert.equal(macosInstallPlatform.checks.notarization, 'passed')
assert.equal(macosInstallPlatform.checks.staple, 'passed')
assert.equal(macosInstallPlatform.checks.gatekeeper, 'passed')
assert.deepEqual(macosInstallPlatform.blockers.map((item: { code: string }) => item.code), ['publish_approval'])

const macosPublishSummary = await runAndRead(macosInstall, true)
assert.equal(macosPublishSummary.platforms[0].stage, 'publish_ready')
assert.deepEqual(macosPublishSummary.platforms[0].blockers, [])

const failedBranding = await createFixture('failed-branding', 'windows', 'x64', {
  brandingChecks: [{ id: 'branding_approval', status: 'failed', detail: 'fixture' }],
  packageSmokeChecks: [
    { id: 'installer', status: 'passed', detail: 'fixture' },
    { id: 'installer-run', status: 'passed', detail: 'fixture' },
    { id: 'installer-subfolder', status: 'passed', detail: 'fixture' },
    { id: 'installed-exe', status: 'passed', detail: 'fixture' }
  ]
})
const failedBrandingPlatform = (await runAndRead(failedBranding)).platforms[0]
assert.equal(failedBrandingPlatform.stage, 'candidate_ready')
assert.ok(failedBrandingPlatform.blockers.some((item: { code: string }) => item.code === 'branding'))
assert.equal(failedBrandingPlatform.checks.branding, 'failed')

const missingChecksum = await createFixture('missing-checksum', 'windows', 'x64', {
  checksums: false,
  packageSmokeChecks: [
    { id: 'installer', status: 'passed', detail: 'fixture' },
    { id: 'installer-run', status: 'passed', detail: 'fixture' },
    { id: 'installer-subfolder', status: 'passed', detail: 'fixture' },
    { id: 'installed-exe', status: 'passed', detail: 'fixture' }
  ]
})
const missingChecksumOutput = path.join(missingChecksum.distDir, 'readiness.json')
assert.equal(await runWriter(missingChecksum, missingChecksumOutput), 1)
const blocked = JSON.parse(await fs.readFile(missingChecksumOutput, 'utf8')).platforms[0]
assert.equal(blocked.stage, 'blocked')
assert.equal(blocked.candidateArtifactAllowed, false)
assert.ok(blocked.blockers.some((item: { code: string }) => item.code === 'build'))

const source = await fs.readFile('scripts/write-release-readiness-summary.mjs', 'utf8')
assert.doesNotMatch(source, /process\.env|secrets\.|readFile\(.*icon|createReadStream/)

await fs.rm(root, { recursive: true, force: true })

async function createFixture(
  name: string,
  platform: Platform,
  arch: Arch,
  options: {
    checksums?: boolean
    packageSmokeChecks: Check[]
    brandingChecks?: Check[]
    trustChecks?: Check[]
  }
): Promise<{ distDir: string, platform: Platform, arch: Arch }> {
  const distDir = path.join(root, name)
  await fs.mkdir(distDir, { recursive: true })
  const artifactName = platform === 'windows'
    ? 'Design Asset Manager Setup 1.0.0.exe'
    : 'Design Asset Manager-1.0.0-arm64.dmg'

  if (options.checksums !== false) {
    await writeJson(distDir, `release-checksums-${platform}-${arch}.json`, {
      schemaVersion: 1,
      platform,
      arch,
      artifacts: [
        { fileName: artifactName, sizeBytes: 100, sha256: 'a'.repeat(64) },
        { fileName: `${artifactName}.blockmap`, sizeBytes: 20, sha256: 'b'.repeat(64) }
      ]
    })
  }
  await writeJson(distDir, `release-update-metadata-${platform}-${arch}.json`, {
    schemaVersion: 1,
    platform,
    arch,
    artifact: {
      fileName: artifactName,
      sizeBytes: 100,
      sha256: 'a'.repeat(64),
      blockmap: {
        fileName: `${artifactName}.blockmap`,
        sizeBytes: 20,
        sha256: 'b'.repeat(64)
      }
    }
  })
  await writeJson(distDir, `release-trust-evidence-${platform}-${arch}.json`, {
    schemaVersion: 1,
    platform,
    arch,
    checks: options.trustChecks ?? trustChecksFor(platform)
  })
  await writeJson(distDir, `release-branding-evidence-${platform}-${arch}.json`, {
    schemaVersion: 1,
    platform,
    arch,
    checks: options.brandingChecks ?? [
      { id: 'branding_approval', status: 'passed', detail: 'fixture' },
      { id: platform === 'windows' ? 'windows_icon' : 'macos_icon', status: 'passed', detail: 'fixture' },
      { id: 'approved_digest', status: 'passed', detail: 'fixture' }
    ]
  })
  await writeJson(distDir, `package-smoke-${platform}-${arch}.json`, {
    generatedAt: '2026-06-16T00:00:00.000Z',
    checks: options.packageSmokeChecks,
    artifacts: {}
  })

  return { distDir, platform, arch }
}

function trustChecksFor(platform: Platform): Check[] {
  if (platform === 'windows') {
    return [{ id: 'signature', status: 'passed', detail: 'fixture' }]
  }

  return [
    { id: 'signature', status: 'passed', detail: 'fixture' },
    { id: 'hardened_runtime', status: 'passed', detail: 'fixture' },
    { id: 'nested_signatures', status: 'passed', detail: 'fixture' },
    { id: 'notarization', status: 'passed', detail: 'fixture' },
    { id: 'staple', status: 'passed', detail: 'fixture' },
    { id: 'gatekeeper', status: 'passed', detail: 'fixture' }
  ]
}

async function writeJson(distDir: string, fileName: string, value: unknown): Promise<void> {
  await fs.writeFile(path.join(distDir, fileName), JSON.stringify(value, null, 2))
}

async function runAndRead(
  fixture: { distDir: string, platform: Platform, arch: Arch },
  publishApproved = false
): Promise<any> {
  const output = path.join(fixture.distDir, publishApproved ? 'readiness-publish-ready.json' : 'readiness.json')
  assert.equal(await runWriter(fixture, output, publishApproved), 0)
  return JSON.parse(await fs.readFile(output, 'utf8'))
}

async function runWriter(
  fixture: { distDir: string, platform: Platform, arch: Arch },
  output: string,
  publishApproved = false
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-readiness-summary.mjs',
      `--platform=${fixture.platform}`,
      `--arch=${fixture.arch}`,
      '--governance=passed',
      `--dist-dir=${fixture.distDir}`,
      `--output=${output}`,
      `--publish-approved=${publishApproved ? 'true' : 'false'}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
