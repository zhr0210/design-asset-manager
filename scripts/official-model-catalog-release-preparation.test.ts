import assert from 'node:assert/strict'

import { validOfficialModelCatalogReleaseInput } from
  './fixtures/official-model-catalog-release.fixture'
import { prepareOfficialModelCatalogReleaseInput } from
  '../src/main/model-library-workspace/official-model-catalog-release-preparation'

const prepared = prepareOfficialModelCatalogReleaseInput({
  pinnedTrustRoot: validOfficialModelCatalogReleaseInput.pinnedTrustRoot,
  bundledCatalog: validOfficialModelCatalogReleaseInput.bundledCatalog
})

assert.equal(prepared.state, 'ready')
if (prepared.state !== 'ready') throw new Error('Expected ready preparation.')
assert.deepEqual(prepared.candidate, validOfficialModelCatalogReleaseInput)
assert.deepEqual(prepared.summary, {
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
  JSON.stringify(prepared.summary),
  /qwen|path|directory|url|signature|digest|publicKey|artifact|modelName/i
)

const wrongKey = prepareOfficialModelCatalogReleaseInput({
  pinnedTrustRoot: {
    ...validOfficialModelCatalogReleaseInput.pinnedTrustRoot,
    publicKeySpkiBase64:
      'MCowBQYDK2VwAyEAhoyKEYSyDc1AMS2MrjcRpppOXcTAbnjLnnbXrpt5Bes='
  },
  bundledCatalog: validOfficialModelCatalogReleaseInput.bundledCatalog
})
assert.deepEqual(wrongKey, {
  state: 'blocked',
  reason: 'CATALOG_SIGNATURE_INVALID'
})

const accessorInput = Object.defineProperty({}, 'catalogId', {
  enumerable: true,
  get() {
    throw new Error('Accessor must never execute during preparation.')
  }
})
assert.deepEqual(prepareOfficialModelCatalogReleaseInput({
  pinnedTrustRoot: accessorInput,
  bundledCatalog: validOfficialModelCatalogReleaseInput.bundledCatalog
}), {
  state: 'blocked',
  reason: 'RELEASE_INPUT_INVALID'
})

const prototypeKeyInput = {
  ...validOfficialModelCatalogReleaseInput.pinnedTrustRoot,
  ['__proto__']: { polluted: true }
}
assert.deepEqual(prepareOfficialModelCatalogReleaseInput({
  pinnedTrustRoot: prototypeKeyInput,
  bundledCatalog: validOfficialModelCatalogReleaseInput.bundledCatalog
}), {
  state: 'blocked',
  reason: 'RELEASE_INPUT_INVALID'
})
assert.equal(({} as { polluted?: unknown }).polluted, undefined)

console.log('official-model-catalog-release-preparation passed')
