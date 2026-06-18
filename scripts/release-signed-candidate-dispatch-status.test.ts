import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  ReleasePackagingArch,
  ReleasePlatform
} from '../src/main/packaging/release-flow-governance'
import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import { createReleaseSignedCandidateDispatchStatus } from '../src/main/packaging/release-signed-candidate-dispatch-status'
import { createReleaseSigningEnvironmentStatus } from '../src/main/packaging/release-signing-environment-status'

const readySigningEnvironmentStatus = createReleaseSigningEnvironmentStatus({
  schemaVersion: 1,
  source: 'github-environment-status',
  environments: createReleaseEnvironmentManifest().environments.map((environment) => ({
    environment: environment.environment,
    reviewersConfigured: true,
    requiredSecretNamesPresent: [...environment.requiredSecretNames]
  }))
})

const ready = createReleaseSignedCandidateDispatchStatus({
  platform: 'windows',
  arch: 'x64',
  ref: 'refs/heads/main',
  signingApproved: true,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('windows', 'x64')
})
assert.equal(ready.schemaVersion, 1)
assert.equal(ready.source, 'release-signed-candidate-preflight')
assert.equal(ready.displayOnly, true)
assert.equal(ready.writesGitHubSettings, false)
assert.equal(ready.readsSecretValues, false)
assert.equal(ready.readsSigningAssets, false)
assert.equal(ready.readsBrandingAssetBytes, false)
assert.equal(ready.readsCandidateBinaries, false)
assert.equal(ready.emitsLocalPaths, false)
assert.equal(ready.executesWorkflow, false)
assert.equal(ready.publishesRelease, false)
assert.equal(ready.dispatchReady, true)
assert.equal(ready.environment, 'release-signing-windows')
assert.equal(ready.workflowFileName, 'release-signed-candidate.yml')
assert.deepEqual(ready.missing, [])
assert.ok(ready.requiredEvidence.includes('release-signing-environment-status'))
assert.ok(ready.requiredEvidence.includes('release-branding-evidence'))

const macTagReady = createReleaseSignedCandidateDispatchStatus({
  platform: 'macos',
  arch: 'arm64',
  ref: 'refs/tags/v1.0.0',
  signingApproved: true,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('macos', 'arm64')
})
assert.equal(macTagReady.dispatchReady, true)
assert.equal(macTagReady.environment, 'release-signing-macos')
assert.equal(macTagReady.jobName, 'macos-signed-candidate')

const badRef = createReleaseSignedCandidateDispatchStatus({
  platform: 'windows',
  arch: 'x64',
  ref: 'refs/heads/feature',
  signingApproved: true,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('windows', 'x64')
})
assert.equal(badRef.dispatchReady, false)
assert.ok(badRef.missing.some((item) => item.code === 'ref_gate'))

const noApproval = createReleaseSignedCandidateDispatchStatus({
  platform: 'windows',
  arch: 'x64',
  ref: 'refs/heads/main',
  signingApproved: false,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('windows', 'x64')
})
assert.equal(noApproval.dispatchReady, false)
assert.ok(noApproval.missing.some((item) => item.code === 'signing_approval_input'))

const blockedEnvironment = createReleaseSignedCandidateDispatchStatus({
  platform: 'windows',
  arch: 'x64',
  ref: 'refs/heads/main',
  signingApproved: true,
  signingEnvironmentStatus: createReleaseSigningEnvironmentStatus(null),
  brandingEvidence: brandingEvidence('windows', 'x64')
})
assert.equal(blockedEnvironment.dispatchReady, false)
assert.ok(blockedEnvironment.missing.some((item) => item.code === 'signing_environment_status'))

const blockedBranding = createReleaseSignedCandidateDispatchStatus({
  platform: 'windows',
  arch: 'x64',
  ref: 'refs/heads/main',
  signingApproved: true,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('windows', 'x64', 'failed')
})
assert.equal(blockedBranding.dispatchReady, false)
assert.ok(blockedBranding.missing.some((item) => item.code === 'release_branding_evidence'))

const mismatchBranding = createReleaseSignedCandidateDispatchStatus({
  platform: 'macos',
  arch: 'arm64',
  ref: 'refs/heads/main',
  signingApproved: true,
  signingEnvironmentStatus: readySigningEnvironmentStatus,
  brandingEvidence: brandingEvidence('windows', 'x64')
})
assert.equal(mismatchBranding.dispatchReady, false)
assert.ok(mismatchBranding.missing.some((item) => item.code === 'release_branding_evidence'))

const serialized = JSON.stringify(ready)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const root = path.join(process.cwd(), 'dist-temp', 'tests', 'release-signed-candidate-dispatch-status-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })
const signingPath = path.join(root, 'release-signing-environment-status.json')
const brandingPath = path.join(root, 'release-branding-evidence-windows-x64.json')
const readyOutput = path.join(root, 'dispatch-ready.json')
await writeJson(signingPath, readySigningEnvironmentStatus)
await writeJson(brandingPath, brandingEvidence('windows', 'x64'))
assert.equal(await runWriter([
  '--platform=windows',
  '--arch=x64',
  '--ref=refs/heads/main',
  '--signing-approved=true',
  `--signing-environment-status=${signingPath}`,
  `--branding=${brandingPath}`,
  `--output=${readyOutput}`
]), 0)
const readyOutputJson = JSON.parse(await fs.readFile(readyOutput, 'utf8'))
assert.equal(readyOutputJson.dispatchReady, true)
assert.equal(JSON.stringify(readyOutputJson).includes(root), false)

const blockedOutput = path.join(root, 'dispatch-blocked.json')
assert.equal(await runWriter([
  '--platform=windows',
  '--arch=x64',
  '--ref=refs/heads/feature',
  '--signing-approved=true',
  `--signing-environment-status=${signingPath}`,
  `--branding=${brandingPath}`,
  `--output=${blockedOutput}`
]), 1)
assert.equal(JSON.parse(await fs.readFile(blockedOutput, 'utf8')).dispatchReady, false)

const source = await fs.readFile('src/main/packaging/release-signed-candidate-dispatch-status.ts', 'utf8')
const writer = await fs.readFile('scripts/write-release-signed-candidate-dispatch-status.ts', 'utf8')
const wrapper = await fs.readFile('scripts/write-release-signed-candidate-dispatch-status.mjs', 'utf8')
assert.match(source, /createReleaseSignedCandidatePreflight/)
assert.match(writer, /createReleaseSignedCandidateDispatchStatus/)
assert.match(wrapper, /write-release-signed-candidate-dispatch-status\.ts/)
assert.doesNotMatch(source, /process\.env|\bfs\.|\breadFile\b|\bcreateReadStream\b|\bexecFile\b|\bspawn\b|gh\s+api|gh\s+workflow/)
assert.doesNotMatch(writer, /process\.env|secrets\.|createReadStream|gh\s+api|gh\s+secret|gh\s+workflow|gh\s+release|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)
assert.doesNotMatch(writer, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-signed-candidate-dispatch-status'],
  'node scripts/run-ts-test.mjs scripts/release-signed-candidate-dispatch-status.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-signed-candidate-dispatch-status/)

await fs.rm(root, { recursive: true, force: true })
console.log('release-signed-candidate-dispatch-status passed')

function brandingEvidence(
  platform: ReleasePlatform,
  arch: ReleasePackagingArch,
  status: 'passed' | 'failed' = 'passed'
): unknown {
  return {
    schemaVersion: 1,
    platform,
    arch,
    approvalId: 'fixture-branding',
    approvedAt: '2026-06-17',
    checks: [
      { id: 'branding_approval', status, detail: 'fixture' },
      { id: platform === 'windows' ? 'windows_icon' : 'macos_icon', status, detail: 'fixture' },
      { id: 'approved_digest', status, detail: 'fixture' }
    ]
  }
}

async function writeJson(target: string, value: unknown): Promise<void> {
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function runWriter(args: string[]): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-signed-candidate-dispatch-status.mjs',
      ...args
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
