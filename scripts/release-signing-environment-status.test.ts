import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import { createReleaseSigningEnvironmentStatus } from '../src/main/packaging/release-signing-environment-status'

const manifest = createReleaseEnvironmentManifest()
const readyEvidence = {
  schemaVersion: 1,
  source: 'github-environment-status',
  environments: manifest.environments.map((environment) => ({
    environment: environment.environment,
    reviewersConfigured: true,
    requiredSecretNamesPresent: [...environment.requiredSecretNames].reverse()
  }))
}

const ready = createReleaseSigningEnvironmentStatus(readyEvidence)
assert.equal(ready.schemaVersion, 1)
assert.equal(ready.source, 'release-environment-manifest')
assert.equal(ready.displayOnly, true)
assert.equal(ready.writesGitHubSettings, false)
assert.equal(ready.readsSecretValues, false)
assert.equal(ready.readsSigningAssets, false)
assert.equal(ready.readsBrandingAssetBytes, false)
assert.equal(ready.emitsLocalPaths, false)
assert.equal(ready.executesWorkflow, false)
assert.equal(ready.publishesRelease, false)
assert.equal(ready.status, 'ready')
assert.equal(ready.environments.length, 2)
assert.ok(ready.environments.every((environment) => environment.status === 'ready'))
assert.ok(ready.environments.every((environment) =>
  environment.secretValuesPolicy === 'names_only_never_read'
))
assert.ok(ready.environments.some((environment) =>
  environment.platform === 'windows'
  && environment.environment === 'release-signing-windows'
  && environment.requiredSecretNames.includes('WINDOWS_CSC_LINK')
))
assert.ok(ready.environments.some((environment) =>
  environment.platform === 'macos'
  && environment.environment === 'release-signing-macos'
  && environment.requiredSecretNames.includes('APPLE_TEAM_ID')
))

const missingReviewEvidence = {
  schemaVersion: 1,
  source: 'github-environment-status',
  environments: manifest.environments.map((environment) => ({
    environment: environment.environment,
    reviewersConfigured: environment.platform !== 'windows',
    requiredSecretNamesPresent: [...environment.requiredSecretNames]
  }))
}
const missingReview = createReleaseSigningEnvironmentStatus(missingReviewEvidence)
assert.equal(missingReview.status, 'external_action_required')
assert.ok(missingReview.environments.find((environment) =>
  environment.platform === 'windows'
)?.missing.some((item) => item.code === 'github_environment_review'))

const missingSecretEvidence = {
  schemaVersion: 1,
  source: 'github-environment-status',
  environments: manifest.environments.map((environment) => ({
    environment: environment.environment,
    reviewersConfigured: true,
    requiredSecretNamesPresent: environment.requiredSecretNames.slice(1)
  }))
}
const missingSecret = createReleaseSigningEnvironmentStatus(missingSecretEvidence)
assert.equal(missingSecret.status, 'external_action_required')
assert.ok(missingSecret.environments.every((environment) =>
  environment.missing.some((item) => item.code === 'secret_name')
))

const missingEvidence = createReleaseSigningEnvironmentStatus(null)
assert.equal(missingEvidence.status, 'external_action_required')
assert.ok(missingEvidence.environments.every((environment) =>
  environment.missing.some((item) => item.code === 'environment_status')
))

const serialized = JSON.stringify(ready)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const root = path.join(process.cwd(), 'dist-temp', 'tests', 'release-signing-environment-status-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })
const evidencePath = path.join(root, 'release-signing-environment-evidence.json')
const readyOutputPath = path.join(root, 'release-signing-environment-status.json')
await fs.writeFile(evidencePath, `${JSON.stringify(readyEvidence, null, 2)}\n`, 'utf8')
assert.equal(await runWriter([
  `--evidence=${evidencePath}`,
  `--output=${readyOutputPath}`
]), 0)
const readyOutput = JSON.parse(await fs.readFile(readyOutputPath, 'utf8'))
assert.equal(readyOutput.status, 'ready')
assert.equal(JSON.stringify(readyOutput).includes(root), false)

const blockedOutputPath = path.join(root, 'blocked-status.json')
await fs.writeFile(evidencePath, `${JSON.stringify(missingSecretEvidence, null, 2)}\n`, 'utf8')
assert.equal(await runWriter([
  `--evidence=${evidencePath}`,
  `--output=${blockedOutputPath}`
]), 1)
assert.equal(JSON.parse(await fs.readFile(blockedOutputPath, 'utf8')).status, 'external_action_required')

const source = await fs.readFile('src/main/packaging/release-signing-environment-status.ts', 'utf8')
const writer = await fs.readFile('scripts/write-release-signing-environment-status.ts', 'utf8')
const wrapper = await fs.readFile('scripts/write-release-signing-environment-status.mjs', 'utf8')
assert.match(source, /createReleaseEnvironmentManifest/)
assert.match(writer, /createReleaseSigningEnvironmentStatus/)
assert.match(wrapper, /write-release-signing-environment-status\.ts/)
assert.doesNotMatch(source, /process\.env|\bfs\.|\breadFile\b|\bcreateReadStream\b|\bexecFile\b|\bspawn\b|gh\s+api|gh\s+secret/)
assert.doesNotMatch(writer, /process\.env|secrets\.|createReadStream|gh\s+api|gh\s+secret|gh\s+workflow|gh\s+release|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)
assert.doesNotMatch(writer, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-signing-environment-status'],
  'node scripts/run-ts-test.mjs scripts/release-signing-environment-status.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-signing-environment-status/)

await fs.rm(root, { recursive: true, force: true })
console.log('release-signing-environment-status passed')

async function runWriter(args: string[]): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-signing-environment-status.mjs',
      ...args
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
