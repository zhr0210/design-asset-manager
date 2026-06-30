import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { evaluateReleasePublishApproval } from '../src/main/packaging/release-publish-approval'

const validWindows = {
  schemaVersion: 1,
  approvalId: 'release-1.0.0-windows-x64',
  approvedAt: '2026-06-17T00:00:00.000Z',
  platform: 'windows',
  arch: 'x64',
  distributionStage: 'distribution_ready',
  publishApproved: true
}

const approved = evaluateReleasePublishApproval(validWindows, 'windows', 'x64')
assert.equal(approved.schemaVersion, 1)
assert.equal(approved.source, 'release-publish-approval')
assert.equal(approved.requiredFileName, 'release-publish-approval.json')
assert.equal(approved.status, 'approved')
assert.equal(approved.approved, true)
assert.equal(approved.readsSecretValues, false)
assert.equal(approved.emitsLocalPaths, false)
assert.equal(approved.publishesRelease, false)
assert.deepEqual(approved.missing, [])

const missing = evaluateReleasePublishApproval(null, 'windows', 'x64')
assert.equal(missing.status, 'missing')
assert.equal(missing.approved, false)
assert.deepEqual(missing.missing.map((item) => item.code), ['approval_file'])

const platformMismatch = evaluateReleasePublishApproval(validWindows, 'macos', 'x64')
assert.equal(platformMismatch.status, 'platform_mismatch')
assert.equal(platformMismatch.approved, false)
assert.ok(platformMismatch.missing.some((item) => item.code === 'platform'))

const archMismatch = evaluateReleasePublishApproval(validWindows, 'windows', 'arm64')
assert.equal(archMismatch.status, 'arch_mismatch')
assert.equal(archMismatch.approved, false)
assert.ok(archMismatch.missing.some((item) => item.code === 'arch'))

const invalid = evaluateReleasePublishApproval({
  ...validWindows,
  approvalId: '../secret',
  approvedAt: 'not-a-date',
  distributionStage: 'candidate_ready',
  publishApproved: false
}, 'windows', 'x64')
assert.equal(invalid.status, 'invalid')
assert.equal(invalid.approved, false)
assert.ok(invalid.missing.some((item) => item.code === 'approval_id'))
assert.ok(invalid.missing.some((item) => item.code === 'approved_at'))
assert.ok(invalid.missing.some((item) => item.code === 'distribution_stage'))
assert.ok(invalid.missing.some((item) => item.code === 'publish_approval'))

const serialized = JSON.stringify(approved)
assert.equal(serialized.includes('/Users/'), false)
assert.equal(serialized.includes('C:\\Users\\'), false)
assert.equal(serialized.includes('APPLE_APP_SPECIFIC_PASSWORD='), false)
assert.equal(serialized.includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const source = await fs.readFile('src/main/packaging/release-publish-approval.ts', 'utf8')
assert.match(source, /releaseTargetPlatformMatches/)
assert.match(source, /releaseTargetArchMatches/)
assert.doesNotMatch(source, /value\.platform !== platform/)
assert.doesNotMatch(source, /value\.arch !== arch/)
assert.doesNotMatch(
  source,
  /process\.env|\bfs\.|\breadFile\b|\bcreateReadStream\b|\bexecFile\b|\bspawn\b/
)
assert.doesNotMatch(source, /gh\s+workflow|gh\s+release|electron-builder|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const writer = await fs.readFile('scripts/write-release-readiness-summary.ts', 'utf8')
assert.match(writer, /evaluateReleasePublishApproval/)
assert.match(writer, /publish-approval/)
assert.doesNotMatch(writer, /readFile\(.*icon|createReadStream|gh\s+release|notarytool|codesign|signtool/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-publish-approval'],
  'node scripts/run-ts-test.mjs scripts/release-publish-approval.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-publish-approval/)

console.log('release-publish-approval passed')
