import assert from 'node:assert/strict'

import { evaluateOfficialModelCatalogRelease } from
  '../src/main/model-library-workspace/official-model-catalog.release'
import { validOfficialModelCatalogReleaseInput as validReleaseInput } from
  './fixtures/official-model-catalog-release.fixture'

const absent = evaluateOfficialModelCatalogRelease({
  schemaVersion: 1,
  pinnedTrustRoot: null,
  bundledCatalog: null
})

assert.deepEqual(absent, {
  schemaVersion: 1,
  state: 'blocked',
  reason: 'RELEASE_INPUT_MISSING',
  candidateAllowed: false,
  readsSigningSecrets: false,
  usesNetwork: false,
  readsModelBytes: false,
  containsSensitiveMaterial: false
})
assert.doesNotMatch(
  JSON.stringify(absent),
  /path|directory|url|signature|digest|publicKey|artifact|modelName/i
)

const ready = evaluateOfficialModelCatalogRelease(validReleaseInput)
assert.deepEqual(ready, {
  schemaVersion: 1,
  state: 'ready',
  catalogId: 'official-model-catalog',
  sequence: '42',
  familyCount: 1,
  checkpointCount: 1,
  variantCount: 1,
  candidateAllowed: true,
  readsSigningSecrets: false,
  usesNetwork: false,
  readsModelBytes: false,
  containsSensitiveMaterial: false
})
assert.doesNotMatch(
  JSON.stringify(ready),
  /qwen|path|directory|url|signature|digest|publicKey|artifact|modelName/i
)

assert.equal(blockedReason({
  ...validReleaseInput,
  pinnedTrustRoot: null
}), 'RELEASE_INPUT_INVALID')
assert.equal(blockedReason({
  ...validReleaseInput,
  unexpected: true
}), 'RELEASE_INPUT_INVALID')
assert.equal(blockedReason({
  ...validReleaseInput,
  pinnedTrustRoot: {
    ...validReleaseInput.pinnedTrustRoot,
    publicKeySpkiBase64:
      'MCowBQYDK2VwAyEAhoyKEYSyDc1AMS2MrjcRpppOXcTAbnjLnnbXrpt5Bes='
  }
}), 'CATALOG_SIGNATURE_INVALID')
assert.equal(blockedReason({
  ...validReleaseInput,
  bundledCatalog: {
    ...validReleaseInput.bundledCatalog,
    releasePin: {
      ...validReleaseInput.bundledCatalog.releasePin,
      sequence: '41'
    }
  }
}), 'CATALOG_RELEASE_PIN_REJECTED')

function blockedReason(input: unknown): string {
  const evaluation = evaluateOfficialModelCatalogRelease(input)
  assert.equal(evaluation.state, 'blocked')
  if (evaluation.state !== 'blocked') throw new Error('Expected blocked release input.')
  return evaluation.reason
}

console.log('official-model-catalog-release-gate passed')
