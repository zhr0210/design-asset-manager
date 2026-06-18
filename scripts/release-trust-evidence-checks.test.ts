import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const helperUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'release-trust-evidence-checks.mjs')).href
const helper = await import(helperUrl) as {
  RELEASE_TRUST_CHECK_IDS: Record<string, string>
  RELEASE_TRUST_READINESS_CHECK_KEYS: string[]
  listReleaseTrustReadinessBindings: (platform: string) => Array<{ checkKey: string, evidenceCheckId: string }>
  listReleaseTrustEvidenceCheckIds: (platform: string) => string[]
}

assert.deepEqual(helper.RELEASE_TRUST_READINESS_CHECK_KEYS, [
  'signature',
  'hardenedRuntime',
  'nestedSignatures',
  'notarization',
  'staple',
  'gatekeeper'
])
assert.deepEqual(helper.listReleaseTrustReadinessBindings('windows'), [
  { checkKey: 'signature', evidenceCheckId: 'signature' }
])
assert.deepEqual(helper.listReleaseTrustReadinessBindings('macos'), [
  { checkKey: 'signature', evidenceCheckId: 'signature' },
  { checkKey: 'hardenedRuntime', evidenceCheckId: 'hardened_runtime' },
  { checkKey: 'nestedSignatures', evidenceCheckId: 'nested_signatures' },
  { checkKey: 'notarization', evidenceCheckId: 'notarization' },
  { checkKey: 'staple', evidenceCheckId: 'staple' },
  { checkKey: 'gatekeeper', evidenceCheckId: 'gatekeeper' }
])
assert.deepEqual(helper.listReleaseTrustEvidenceCheckIds('windows'), [
  'artifact_checksum',
  'blockmap_checksum',
  'signature'
])
assert.deepEqual(helper.listReleaseTrustEvidenceCheckIds('macos'), [
  'artifact_checksum',
  'blockmap_checksum',
  'signature',
  'nested_signatures',
  'hardened_runtime',
  'notarization',
  'staple',
  'gatekeeper',
  'dmg_integrity'
])
assert.throws(
  () => helper.listReleaseTrustReadinessBindings('linux'),
  /Unsupported release trust platform: linux/
)

const verifierSource = await fs.readFile('scripts/verify-release-trust.mjs', 'utf8')
assert.match(verifierSource, /release-trust-evidence-checks\.mjs/)
assert.match(verifierSource, /RELEASE_TRUST_CHECK_IDS/)
assert.doesNotMatch(verifierSource, /passed\('signature'|failed\('signature'|passed\('hardened_runtime'|failed\('hardened_runtime'/)

const writerSource = await fs.readFile('scripts/write-release-readiness-summary.ts', 'utf8')
assert.match(writerSource, /listReleaseTrustReadinessBindings/)
assert.match(writerSource, /RELEASE_TRUST_READINESS_CHECK_KEYS/)
assert.doesNotMatch(writerSource, /hardenedRuntime:\s*platform === 'macos'/)
assert.doesNotMatch(writerSource, /nestedSignatures:\s*platform === 'macos'/)
assert.doesNotMatch(writerSource, /notarization:\s*platform === 'macos'/)
assert.doesNotMatch(writerSource, /staple:\s*platform === 'macos'/)
assert.doesNotMatch(writerSource, /gatekeeper:\s*platform === 'macos'/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-trust-evidence-checks'],
  'node scripts/run-ts-test.mjs scripts/release-trust-evidence-checks.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-trust-evidence-checks/)

console.log('release-trust-evidence-checks passed')
