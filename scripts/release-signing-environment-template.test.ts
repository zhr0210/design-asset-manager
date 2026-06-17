import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { createReleaseEnvironmentManifest } from '../src/main/packaging/release-environment-manifest'
import { createReleaseSigningEnvironmentStatus } from '../src/main/packaging/release-signing-environment-status'

const templatePath = 'build/release-signing-environment.example.json'
const templateText = await fs.readFile(templatePath, 'utf8')
const template = JSON.parse(templateText)
const manifest = createReleaseEnvironmentManifest()

assert.equal(template.schemaVersion, 1)
assert.equal(template.source, 'github-environment-status')
assert.equal(Array.isArray(template.environments), true)

for (const manifestEntry of manifest.environments) {
  const templateEntry = template.environments.find(
    (item: { environment?: string }) => item.environment === manifestEntry.environment
  )
  assert.ok(templateEntry, `Missing template entry for ${manifestEntry.environment}`)
  assert.equal(templateEntry.reviewersConfigured, false)
  assert.deepEqual(
    [...templateEntry.requiredSecretNamesPresent].sort(),
    [...manifestEntry.requiredSecretNames].sort()
  )
}

const status = createReleaseSigningEnvironmentStatus(template)
assert.equal(status.status, 'external_action_required')
assert.ok(status.environments.every((environment) =>
  environment.missing.some((item) => item.code === 'github_environment_review')
))
assert.ok(status.environments.every((environment) => environment.missing.length === 1))

const serialized = JSON.stringify(template)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('-----BEGIN'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)
assert.equal(serialized.includes('MACOS_CSC_KEY_PASSWORD='), false)

const statusSerialized = JSON.stringify(status)
assert.equal(statusSerialized.includes('/Users/'), false)
assert.equal(statusSerialized.includes('C:\\Users\\'), false)
assert.equal(statusSerialized.includes('-----BEGIN'), false)

const docs = await fs.readFile('docs/platform/RELEASE_FLOW_GOVERNANCE.md', 'utf8')
assert.match(docs, /release-signing-environment\.example\.json/)
assert.match(docs, /reviewersConfigured: false/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-signing-environment-template'],
  'node scripts/run-ts-test.mjs scripts/release-signing-environment-template.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-signing-environment-template/)

console.log('release-signing-environment-template passed')
