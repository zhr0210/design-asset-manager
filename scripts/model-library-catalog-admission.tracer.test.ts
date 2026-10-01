import assert from 'node:assert/strict'
import {
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject
} from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createInMemoryModelCatalogAdmissionTracer } from '../src/main/model-library/model-catalog-admission.tracer'
import {
  openTransactionalModelLibraryTracer,
  type ModelArtifactByteSource,
  type ModelArtifactSourceEntry
} from '../src/main/model-library/transactional-model-library.tracer'

const FIXTURE_CANONICAL_PAYLOAD = '{"artifacts":[{"checkpointId":"qwen3-vl-4b-instruct","displayName":"Qwen3-VL 4B Q4_K_M","familyId":"qwen3-vl","files":[{"format":"json","path":"tokenizer/tokenizer.json","role":"tokenizer","sha256":"3333333333333333333333333333333333333333333333333333333333333333","sizeBytes":200},{"format":"gguf","path":"weights/model.gguf","role":"weights","sha256":"2222222222222222222222222222222222222222222222222222222222222222","sizeBytes":1000}],"immutableRevision":"sha256:1111111111111111111111111111111111111111111111111111111111111111","manifestId":"qwen3-vl-4b-q4-k-m@2026-08","requiredAcknowledgements":[{"id":"license:qwen3-vl-4b:2026-08","kind":"license","label":"Qwen model license"}],"variantId":"qwen3-vl-4b-instruct-q4-k-m"}],"catalogId":"official-model-catalog","keyId":"test-root-2026","schemaVersion":1,"sequence":"42","trustVerifiedAt":"2026-08-12T00:00:00.000Z"}'
const FIXTURE_PUBLIC_KEY_SPKI_BASE64 = 'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
const FIXTURE_SIGNATURE_BASE64 = 'FzC6cDw2vQnwCI57JMirmQUR1b8+qV+DvbFYebmDt6TJp10DH7ERYO8B85PRiKg8SsPDWYQFjOQoWm1tLDa7BA=='

const fixturePayload = {
  schemaVersion: 1,
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  sequence: '42',
  trustVerifiedAt: '2026-08-12T00:00:00.000Z',
  artifacts: [{
    manifestId: 'qwen3-vl-4b-q4-k-m@2026-08',
    familyId: 'qwen3-vl',
    checkpointId: 'qwen3-vl-4b-instruct',
    variantId: 'qwen3-vl-4b-instruct-q4-k-m',
    displayName: 'Qwen3-VL 4B Q4_K_M',
    immutableRevision: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    files: [{
      path: 'tokenizer/tokenizer.json',
      role: 'tokenizer',
      format: 'json',
      sizeBytes: 200,
      sha256: '3333333333333333333333333333333333333333333333333333333333333333'
    }, {
      path: 'weights/model.gguf',
      role: 'weights',
      format: 'gguf',
      sizeBytes: 1_000,
      sha256: '2222222222222222222222222222222222222222222222222222222222222222'
    }],
    requiredAcknowledgements: [{
      id: 'license:qwen3-vl-4b:2026-08',
      kind: 'license',
      label: 'Qwen model license'
    }]
  }]
}

const fixturePublicKey = createPublicKey({
  key: Buffer.from(FIXTURE_PUBLIC_KEY_SPKI_BASE64, 'base64'),
  format: 'der',
  type: 'spki'
})
assert.equal(
  verify(
    null,
    Buffer.from(FIXTURE_CANONICAL_PAYLOAD, 'utf8'),
    fixturePublicKey,
    Buffer.from(FIXTURE_SIGNATURE_BASE64, 'base64')
  ),
  true,
  'The fixed fixture must be independently valid before exercising the tracer.'
)

const admission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: 'official-model-catalog',
    keyId: 'test-root-2026',
    publicKeySpkiBase64: FIXTURE_PUBLIC_KEY_SPKI_BASE64
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})

const result = admission.admit({
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  payload: fixturePayload,
  signatureBase64: FIXTURE_SIGNATURE_BASE64
})

assert.equal(result.kind, 'admitted')
if (result.kind !== 'admitted') throw new Error('Expected a signed Catalog admission.')
assert.equal(result.catalog.catalogId, 'official-model-catalog')
assert.equal(result.catalog.sequence, '42')
assert.match(result.catalog.binding, /^admission:[a-f0-9]{64}$/)
assert.doesNotMatch(
  JSON.stringify(result),
  /manifestPayload|signature|publicKey|sourceUrl|downloadUrl|credential|authorizationHeader|localPath|filePath|\/Users\//i
)

const reorderedFileSetResult = admission.admit({
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  payload: {
    ...fixturePayload,
    artifacts: fixturePayload.artifacts.map((artifact) => ({
      ...artifact,
      files: [...artifact.files].reverse()
    }))
  },
  signatureBase64: FIXTURE_SIGNATURE_BASE64
})
assert.equal(
  reorderedFileSetResult.kind,
  'admitted',
  'A declared file set must have one canonical signature independent of caller ordering.'
)
if (reorderedFileSetResult.kind !== 'admitted') {
  throw new Error('Expected reordered declared files to preserve admission.')
}
assert.equal(reorderedFileSetResult.catalog.binding, result.catalog.binding)

await withTemporaryRoot('admitted-summary', async (controlDirectory) => {
  const admittedLibrary = await openTransactionalModelLibraryTracer({
    catalog: result.catalog,
    controlDirectory,
    byteSource: unavailableSource(),
    createActivityId: mustNotCreate('activity'),
    createStorageRecordId: mustNotCreate('storage record')
  })
  const admittedSummaryResult = await admittedLibrary.summarize({
    kind: 'artifact',
    artifact: {
      catalogId: 'official-model-catalog',
      manifestId: 'qwen3-vl-4b-q4-k-m@2026-08'
    }
  })
  assert.equal(admittedSummaryResult.ok, true)
  if (!admittedSummaryResult.ok) throw new Error('Expected the admitted artifact summary.')
  assert.equal(admittedSummaryResult.value.artifacts[0].review.state, 'confirmable')
  assert.deepEqual(
    admittedSummaryResult.value.artifacts[0].identity,
    {
      ref: {
        catalogId: 'official-model-catalog',
        manifestId: 'qwen3-vl-4b-q4-k-m@2026-08'
      },
      familyId: 'qwen3-vl',
      checkpointId: 'qwen3-vl-4b-instruct',
      variantId: 'qwen3-vl-4b-instruct-q4-k-m',
      displayName: 'Qwen3-VL 4B Q4_K_M',
      immutableRevision: 'sha256:1111111111111111111111111111111111111111111111111111111111111111'
    }
  )
  assert.equal(JSON.stringify(admittedSummaryResult).includes(controlDirectory), false)
})

await withTemporaryRoot('forged-summary', async (controlDirectory) => {
  const forgedLibrary = await openTransactionalModelLibraryTracer({
    catalog: {
      catalogId: 'official-model-catalog',
      sequence: '42',
      binding: result.catalog.binding
    } as typeof result.catalog,
    controlDirectory,
    byteSource: unavailableSource(),
    createActivityId: mustNotCreate('activity'),
    createStorageRecordId: mustNotCreate('storage record')
  })
  const forgedSummary = await forgedLibrary.summarize({ kind: 'library' })
  assert.equal(forgedSummary.ok, true)
  if (!forgedSummary.ok) throw new Error('Expected a fail-closed forged Catalog projection.')
  assert.deepEqual(forgedSummary.value.artifacts, [])
  assert.equal(JSON.stringify(forgedSummary).includes(controlDirectory), false)
})

assert.deepEqual(admission.admit({
  catalogId: 'unknown-catalog',
  keyId: 'unknown-root',
  payload: fixturePayload,
  signatureBase64: FIXTURE_SIGNATURE_BASE64
}), {
  kind: 'blocked',
  code: 'CATALOG_ROOT_UNRECOGNIZED',
  retry: 'not-retryable'
})
const invalidSignatureResult = admission.admit({
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  payload: fixturePayload,
  signatureBase64: `A${FIXTURE_SIGNATURE_BASE64.slice(1)}`
})
assert.deepEqual(invalidSignatureResult, {
  kind: 'blocked',
  code: 'CATALOG_SIGNATURE_INVALID',
  retry: 'not-retryable'
})
assert.doesNotMatch(
  JSON.stringify(invalidSignatureResult),
  /canonicalPayload|signatureBase64|publicKeySpkiBase64|sourceUrl|credential|localPath|\/Users\//i
)

const sequenceKeyPair = generateKeyPairSync('ed25519')
const sequenceCatalogId = 'sequence-test-catalog'
const sequenceKeyId = 'sequence-test-root'
const sequenceAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: sequenceCatalogId,
    keyId: sequenceKeyId,
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
const sequencePayload = {
  ...fixturePayload,
  catalogId: sequenceCatalogId,
  keyId: sequenceKeyId
}
const sequenceAdmissionResult = sequenceAdmission.admit(
  signTestEnvelope(sequencePayload, sequenceKeyPair.privateKey)
)
assert.equal(sequenceAdmissionResult.kind, 'admitted')
if (sequenceAdmissionResult.kind !== 'admitted') throw new Error('Expected sequence admission.')

const alternatePinnedKeyPair = generateKeyPairSync('ed25519')
const alternatePinnedKeyAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: sequenceCatalogId,
    keyId: sequenceKeyId,
    publicKeySpkiBase64: (alternatePinnedKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
const alternatePinnedKeyResult = alternatePinnedKeyAdmission.admit(
  signTestEnvelope(sequencePayload, alternatePinnedKeyPair.privateKey)
)
assert.equal(alternatePinnedKeyResult.kind, 'admitted')
if (alternatePinnedKeyResult.kind !== 'admitted') throw new Error('Expected alternate root admission.')
assert.notEqual(
  alternatePinnedKeyResult.catalog.binding,
  sequenceAdmissionResult.catalog.binding,
  'An admission binding must include the actual pinned trust root, not only its caller-visible key id.'
)

const switchingIdentityAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: 'getter-catalog-a',
    keyId: 'getter-root-a',
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }, {
    catalogId: 'getter-catalog-b',
    keyId: 'getter-root-b',
    publicKeySpkiBase64: (alternatePinnedKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
const getterCatalogPayload = {
  ...fixturePayload,
  catalogId: 'getter-catalog-b',
  keyId: 'getter-root-b'
}
const getterCatalogEnvelope = signTestEnvelope(
  getterCatalogPayload,
  sequenceKeyPair.privateKey
)
let catalogIdReads = 0
let keyIdReads = 0
const switchingEnvelope = Object.defineProperties({}, {
  catalogId: {
    enumerable: true,
    get: () => ++catalogIdReads === 1 ? 'getter-catalog-a' : 'getter-catalog-b'
  },
  keyId: {
    enumerable: true,
    get: () => ++keyIdReads === 1 ? 'getter-root-a' : 'getter-root-b'
  },
  payload: { enumerable: true, value: getterCatalogPayload },
  signatureBase64: { enumerable: true, value: getterCatalogEnvelope.signatureBase64 }
}) as Parameters<typeof switchingIdentityAdmission.admit>[0]
assert.deepEqual(switchingIdentityAdmission.admit(switchingEnvelope), {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
}, 'An untrusted envelope accessor must not switch identity between root lookup and payload binding.')
assert.equal(catalogIdReads, 0, 'Rejected accessors must not be invoked during envelope validation.')
assert.equal(keyIdReads, 0, 'Rejected accessors must not be invoked during envelope validation.')

let proxyEnvelopeReads = 0
const switchingProxyEnvelope = new Proxy({
  ...getterCatalogEnvelope,
  catalogId: 'getter-catalog-a',
  keyId: 'getter-root-a',
  payload: getterCatalogPayload
}, {
  get(target, property, receiver) {
    if (property === 'catalogId') {
      proxyEnvelopeReads += 1
      return proxyEnvelopeReads === 1 ? 'getter-catalog-a' : 'getter-catalog-b'
    }
    if (property === 'keyId') {
      return proxyEnvelopeReads <= 1 ? 'getter-root-a' : 'getter-root-b'
    }
    return Reflect.get(target, property, receiver)
  }
})
assert.deepEqual(switchingIdentityAdmission.admit(switchingProxyEnvelope), {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
}, 'Admission must consume one descriptor snapshot rather than re-read a Proxy envelope.')
assert.equal(proxyEnvelopeReads, 0, 'A Proxy get trap must not participate in admission decisions.')

const accessorCatalogId = 'accessor-schema-catalog'
const accessorKeyId = 'accessor-schema-root'
const accessorAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: accessorCatalogId,
    keyId: accessorKeyId,
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
const negativeSizePayload = {
  ...fixturePayload,
  catalogId: accessorCatalogId,
  keyId: accessorKeyId,
  artifacts: [{
    ...fixturePayload.artifacts[0],
    files: [{
      ...fixturePayload.artifacts[0].files[1],
      sizeBytes: -1
    }]
  }]
}
const signedNegativeSizeEnvelope = signTestEnvelope(
  negativeSizePayload,
  sequenceKeyPair.privateKey
)
let sizeReads = 0
const accessorFile = Object.defineProperties({}, {
  path: { enumerable: true, value: fixturePayload.artifacts[0].files[1].path },
  role: { enumerable: true, value: 'weights' },
  format: { enumerable: true, value: 'gguf' },
  sizeBytes: {
    enumerable: true,
    get: () => ++sizeReads <= 2 ? 1_000 : -1
  },
  sha256: { enumerable: true, value: fixturePayload.artifacts[0].files[1].sha256 }
})
assert.deepEqual(accessorAdmission.admit({
  ...signedNegativeSizeEnvelope,
  payload: {
    ...negativeSizePayload,
    artifacts: [{ ...negativeSizePayload.artifacts[0], files: [accessorFile] }]
  }
}), {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
}, 'Manifest records must contain stable data properties rather than accessors.')
assert.equal(sizeReads, 0, 'Rejected Manifest accessors must not be invoked during schema validation.')

let artifactArrayReads = 0
const switchingArtifactArray = new Proxy([
  negativeSizePayload.artifacts[0]
], {
  get(target, property, receiver) {
    if (property === '0') {
      artifactArrayReads += 1
      return artifactArrayReads === 1
        ? fixturePayload.artifacts[0]
        : negativeSizePayload.artifacts[0]
    }
    return Reflect.get(target, property, receiver)
  }
})
assert.deepEqual(accessorAdmission.admit({
  ...signedNegativeSizeEnvelope,
  payload: { ...negativeSizePayload, artifacts: switchingArtifactArray }
}), {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
}, 'Declared sets must be captured once without invoking Proxy element reads.')
assert.equal(artifactArrayReads, 0, 'A declared-set Proxy get trap must not participate in admission.')

const rollbackResult = sequenceAdmission.admit(signTestEnvelope({
  ...sequencePayload,
  sequence: '41'
}, sequenceKeyPair.privateKey))
assert.deepEqual(rollbackResult, {
  kind: 'blocked',
  code: 'CATALOG_SEQUENCE_REJECTED',
  retry: 'not-retryable'
})
const equivocationResult = sequenceAdmission.admit(signTestEnvelope({
  ...sequencePayload,
  artifacts: [{
    ...sequencePayload.artifacts[0],
    displayName: 'Conflicting disclosure at the same sequence'
  }]
}, sequenceKeyPair.privateKey))
assert.deepEqual(equivocationResult, {
  kind: 'blocked',
  code: 'CATALOG_SEQUENCE_REJECTED',
  retry: 'not-retryable'
})

const symbolicPayload = {
  ...sequencePayload,
  [Symbol('undeclared-metadata')]: 'must-not-be-ignored'
}
assert.deepEqual(sequenceAdmission.admit(
  signTestEnvelope(symbolicPayload, sequenceKeyPair.privateKey)
), {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
}, 'Exact schema validation must reject undeclared symbol-keyed metadata.')

const executableManifestResult = sequenceAdmission.admit(signTestEnvelope({
  ...sequencePayload,
  sequence: '43',
  artifacts: [{
    ...sequencePayload.artifacts[0],
    files: [{
      path: 'runtime/model.py',
      role: 'runtime-package',
      format: 'python',
      sizeBytes: 300,
      sha256: '4444444444444444444444444444444444444444444444444444444444444444'
    }]
  }]
}, sequenceKeyPair.privateKey))
assert.deepEqual(executableManifestResult, {
  kind: 'blocked',
  code: 'MANIFEST_POLICY_REJECTED',
  retry: 'not-retryable'
})

for (const invalidFiles of [
  [{
    path: '../model.gguf',
    role: 'weights',
    format: 'gguf',
    sizeBytes: 1_000,
    sha256: '5555555555555555555555555555555555555555555555555555555555555555'
  }],
  [{
    path: 'weights/model.gguf',
    role: 'weights',
    format: 'gguf',
    sizeBytes: 1_000,
    sha256: '6666666666666666666666666666666666666666666666666666666666666666'
  }, {
    path: 'WEIGHTS/MODEL.GGUF',
    role: 'weights',
    format: 'gguf',
    sizeBytes: 1_000,
    sha256: '7777777777777777777777777777777777777777777777777777777777777777'
  }],
  [{
    path: 'weights/model.pkl',
    role: 'weights',
    format: 'pickle',
    sizeBytes: 1_000,
    sha256: '8888888888888888888888888888888888888888888888888888888888888888'
  }],
  [{
    path: 'tokenizer/tokenizer.json',
    role: 'tokenizer',
    format: 'json',
    sizeBytes: 200,
    sha256: '9999999999999999999999999999999999999999999999999999999999999999'
  }],
  [{
    path: 'CON.gguf',
    role: 'weights',
    format: 'gguf',
    sizeBytes: 1_000,
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  }],
  [{
    path: 'models/NUL/model.gguf',
    role: 'weights',
    format: 'gguf',
    sizeBytes: 1_000,
    sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  }]
]) {
  const policyResult = sequenceAdmission.admit(signTestEnvelope({
    ...sequencePayload,
    sequence: '43',
    artifacts: [{ ...sequencePayload.artifacts[0], files: invalidFiles }]
  }, sequenceKeyPair.privateKey))
  assert.deepEqual(policyResult, {
    kind: 'blocked',
    code: 'MANIFEST_POLICY_REJECTED',
    retry: 'not-retryable'
  })
}

const trustRemoteCodeResult = sequenceAdmission.admit(signTestEnvelope({
  ...sequencePayload,
  sequence: '43',
  artifacts: [{
    ...sequencePayload.artifacts[0],
    trustRemoteCode: true
  }]
}, sequenceKeyPair.privateKey))
assert.deepEqual(trustRemoteCodeResult, {
  kind: 'blocked',
  code: 'CATALOG_SCHEMA_REJECTED',
  retry: 'not-retryable'
})

const staleAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: sequenceCatalogId,
    keyId: sequenceKeyId,
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-13T00:00:00.001Z')
})
assert.deepEqual(staleAdmission.admit(signTestEnvelope(sequencePayload, sequenceKeyPair.privateKey)), {
  kind: 'waiting',
  code: 'FRESH_TRUST_REQUIRED',
  retry: 'refresh-trust'
})

const staleThenFreshAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: sequenceCatalogId,
    keyId: sequenceKeyId,
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
assert.deepEqual(staleThenFreshAdmission.admit(signTestEnvelope({
  ...sequencePayload,
  sequence: '43',
  trustVerifiedAt: '2026-08-10T00:00:00.000Z'
}, sequenceKeyPair.privateKey)), {
  kind: 'waiting',
  code: 'FRESH_TRUST_REQUIRED',
  retry: 'refresh-trust'
})
assert.equal(
  staleThenFreshAdmission.admit(
    signTestEnvelope(sequencePayload, sequenceKeyPair.privateKey)
  ).kind,
  'admitted',
  'Stale evidence must not raise the accepted sequence floor or block fresher evidence.'
)

assert.throws(
  () => createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: sequenceCatalogId,
      keyId: sequenceKeyId,
      publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
        format: 'der',
        type: 'spki'
      }) as Buffer).toString('base64')
    }, {
      catalogId: sequenceCatalogId,
      keyId: sequenceKeyId,
      publicKeySpkiBase64: (alternatePinnedKeyPair.publicKey.export({
        format: 'der',
        type: 'spki'
      }) as Buffer).toString('base64')
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  }),
  /MODEL_CATALOG_TRUST_ROOT_INVALID/,
  'A configured trust-root address must resolve to exactly one pinned key.'
)
assert.throws(
  () => createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: sequenceCatalogId,
      keyId: 'old-root',
      publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
        format: 'der',
        type: 'spki'
      }) as Buffer).toString('base64')
    }, {
      catalogId: sequenceCatalogId,
      keyId: 'new-root',
      publicKeySpkiBase64: (alternatePinnedKeyPair.publicKey.export({
        format: 'der',
        type: 'spki'
      }) as Buffer).toString('base64')
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  }),
  /MODEL_CATALOG_TRUST_ROOT_INVALID/,
  'Root rotation is out of scope, so one Catalog identity must have exactly one pinned root.'
)

for (const invalidRootIdentity of ['', 'catalog with spaces', 'x'.repeat(129)]) {
  assert.throws(
    () => createInMemoryModelCatalogAdmissionTracer({
      trustRoots: [{
        catalogId: invalidRootIdentity,
        keyId: sequenceKeyId,
        publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
          format: 'der',
          type: 'spki'
        }) as Buffer).toString('base64')
      }],
      nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
    }),
    /MODEL_CATALOG_TRUST_ROOT_INVALID/
  )
}
assert.throws(
  () => createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: sequenceCatalogId,
      keyId: sequenceKeyId,
      publicKeySpkiBase64: 'not-a-canonical-spki-key'
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  }),
  /^Error: MODEL_CATALOG_TRUST_ROOT_INVALID$/,
  'Malformed pinned key material must fail with one stable, path-free configuration error.'
)

const freshnessBoundaryAdmission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: sequenceCatalogId,
    keyId: sequenceKeyId,
    publicKeySpkiBase64: (sequenceKeyPair.publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer).toString('base64')
  }],
  nowEpochMs: () => Date.parse('2026-08-13T00:00:00.000Z')
})
assert.equal(
  freshnessBoundaryAdmission.admit(signTestEnvelope(sequencePayload, sequenceKeyPair.privateKey)).kind,
  'admitted'
)

console.log('model-library-catalog-admission-tracer passed')

function signTestEnvelope(
  payload: Record<string, unknown>,
  privateKey: KeyObject
) {
  if (typeof payload.catalogId !== 'string' || typeof payload.keyId !== 'string') {
    throw new Error('A signed test Catalog needs explicit identities.')
  }
  return {
    catalogId: payload.catalogId,
    keyId: payload.keyId,
    payload,
    signatureBase64: sign(
      null,
      Buffer.from(canonicalJsonForTest(normalizeDeclaredSetsForTest(payload)), 'utf8'),
      privateKey
    ).toString('base64')
  }
}

function normalizeDeclaredSetsForTest(payload: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(payload.artifacts)) return payload
  return {
    ...payload,
    artifacts: payload.artifacts
      .map((artifactValue) => {
        const artifact = artifactValue as Record<string, unknown>
        return {
          ...artifact,
          files: Array.isArray(artifact.files)
            ? [...artifact.files].sort((left, right) =>
                compareFixtureText(
                  String((left as Record<string, unknown>).path),
                  String((right as Record<string, unknown>).path)
                )
              )
            : artifact.files,
          requiredAcknowledgements: Array.isArray(artifact.requiredAcknowledgements)
            ? [...artifact.requiredAcknowledgements].sort((left, right) =>
                compareFixtureText(
                  String((left as Record<string, unknown>).id),
                  String((right as Record<string, unknown>).id)
                )
              )
            : artifact.requiredAcknowledgements
        }
      })
      .sort((left, right) =>
        compareFixtureText(
          String((left as Record<string, unknown>).manifestId),
          String((right as Record<string, unknown>).manifestId)
        )
      )
  }
}

function compareFixtureText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function canonicalJsonForTest(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Unsupported fixture value.')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonForTest).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonForTest(record[key])}`)
    .join(',')}}`
}

function unavailableSource(): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      throw new Error('Catalog admission summary tests must not acquire model bytes.')
    }
  }
}

async function withTemporaryRoot(
  scenario: string,
  run: (controlDirectory: string) => Promise<void>
): Promise<void> {
  const controlDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `dam-admission-${scenario}-`))
  try {
    await run(controlDirectory)
  } finally {
    await fs.rm(controlDirectory, { recursive: true, force: true })
  }
}

function mustNotCreate(kind: string): () => string {
  return () => {
    throw new Error(`A summary-only scenario must not create a ${kind}.`)
  }
}
