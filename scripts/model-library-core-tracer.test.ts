import assert from 'node:assert/strict'
import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject
} from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  createInMemoryModelCatalogAdmissionTracer,
  type AdmittedModelCatalog
} from '../src/main/model-library/model-catalog-admission.tracer'
import type {
  ModelArtifactAcknowledgement,
  ModelArtifactRevisionRef,
  ModelLibrary
} from '../src/main/model-library/model-library'
import {
  openTransactionalModelLibraryTracer,
  type ModelArtifactByteSource,
  type ModelArtifactSourceEntry
} from '../src/main/model-library/transactional-model-library.tracer'

interface TestFile {
  readonly path: string
  readonly role: string
  readonly format: string
  readonly bytes: Uint8Array
}

interface TestManifest {
  readonly manifestId: string
  readonly familyId: string
  readonly checkpointId: string
  readonly variantId: string
  readonly displayName: string
  readonly immutableRevision: string
  readonly files: readonly TestFile[]
  readonly requiredAcknowledgements: readonly ModelArtifactAcknowledgement[]
}

const modelLicense: ModelArtifactAcknowledgement = {
  id: 'license:qwen3-vl-4b:2026-08',
  kind: 'license',
  label: 'Qwen model license'
}
const artifactFiles: readonly TestFile[] = [{
  path: 'tokenizer/tokenizer.json',
  role: 'tokenizer',
  format: 'json',
  bytes: Buffer.from('{"model":{"type":"BPE"}}', 'utf8')
}, {
  path: 'weights/model.gguf',
  role: 'weights',
  format: 'gguf',
  bytes: createGgufFixture(1)
}]
const artifact: TestManifest = {
  manifestId: 'qwen3-vl-4b-q4-k-m@2026-08',
  familyId: 'qwen3-vl',
  checkpointId: 'qwen3-vl-4b-instruct',
  variantId: 'qwen3-vl-4b-instruct-q4-k-m',
  displayName: 'Qwen3-VL 4B Q4_K_M',
  immutableRevision: `sha256:${'1'.repeat(64)}`,
  files: artifactFiles,
  requiredAcknowledgements: [modelLicense]
}
const artifactRef = refFor(artifact)

await exactReviewedStorageSurvivesReopen()
await rejectedIntentLeavesTheLibraryUnchanged()
await sideBySideStoragePreservesBothIdentitiesWithoutActivation()
await changedDisclosureMakesAnEarlierReviewStale()
await acknowledgementOrderHasOneCanonicalReview()

console.log('model-library-core-tracer passed')

async function exactReviewedStorageSurvivesReopen(): Promise<void> {
  await withTemporaryRoot('exact-review', async (controlDirectory) => {
    const catalog = admitTestCatalog([artifact])
    const library = await openLibrary({
      catalog,
      controlDirectory,
      byteSource: sourceFromEntries(artifact.files),
      createActivityId: () => 'activity-1',
      createStorageRecordId: () => 'verified-storage-1'
    })

    const summaryResult = await library.summarize({
      kind: 'artifact',
      artifact: artifactRef
    })
    assert.equal(summaryResult.ok, true)
    if (!summaryResult.ok) throw new Error('Expected a path-free artifact summary.')

    assert.equal(summaryResult.value.artifacts.length, 1)
    const summary = summaryResult.value.artifacts[0]
    assert.deepEqual(summary.identity, {
      ref: artifactRef,
      familyId: artifact.familyId,
      checkpointId: artifact.checkpointId,
      variantId: artifact.variantId,
      displayName: artifact.displayName,
      immutableRevision: artifact.immutableRevision
    })
    assert.equal(summary.lifecycle.kind, 'catalog-only')
    assert.equal(summary.review.state, 'confirmable')
    if (summary.review.state !== 'confirmable') {
      throw new Error('Expected a confirmable exact-artifact review.')
    }
    assert.match(summary.review.fingerprint, /^review:[a-f0-9]{64}$/)
    assert.deepEqual(summary.review.requiredAcknowledgements, artifact.requiredAcknowledgements)
    const logicalBytes = totalBytes(artifact.files)
    assert.deepEqual(summary.review.storageImpact, {
      logicalBytes,
      alreadyPresentSharedBytes: 0,
      transferRequiredBytes: logicalBytes,
      additionalPhysicalBytes: logicalBytes
    })
    assert.deepEqual(summary.review.consequences, noActivationConsequences())
    assertPathFree(summaryResult.value, controlDirectory)

    const request = {
      artifact: artifactRef,
      reviewFingerprint: summary.review.fingerprint,
      decision: 'install-exact-reviewed-artifact' as const,
      acceptedAcknowledgements: [modelLicense.id]
    }
    const installResult = await library.install(request)
    assert.deepEqual(installResult, {
      ok: true,
      value: {
        disposition: 'new-install',
        activity: {
          activityId: 'activity-1',
          artifact: artifactRef,
          state: 'verified-stored',
          storageRecordId: 'verified-storage-1',
          activationChanged: false
        }
      }
    })
    if (!installResult.ok) throw new Error('Expected exact synthetic bytes to be verified and stored.')

    const storedSummary = await summarizeArtifact(library, artifactRef)
    assert.deepEqual(storedSummary.artifacts[0].lifecycle, {
      kind: 'verified-stored',
      storageRecordId: 'verified-storage-1',
      activeCapabilityAssignments: []
    })
    assert.deepEqual(storedSummary.activities, [installResult.value.activity])
    assertPathFree(storedSummary, controlDirectory)

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const reopenedSummary = await summarizeArtifact(reopened, artifactRef)
    assert.deepEqual(reopenedSummary.artifacts[0].lifecycle, storedSummary.artifacts[0].lifecycle)
    assert.deepEqual(reopenedSummary.activities, storedSummary.activities)

    const replayedInstall = await reopened.install(request)
    assert.deepEqual(replayedInstall, {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: installResult.value.activity
      }
    })
    const replayConflict = await reopened.install({
      ...request,
      acceptedAcknowledgements: [modelLicense.id, 'unexpected:acknowledgement']
    })
    assert.deepEqual(replayConflict, {
      ok: false,
      error: { code: 'IDEMPOTENCY_CONFLICT', retry: 'not-retryable' }
    })
  })
}

async function rejectedIntentLeavesTheLibraryUnchanged(): Promise<void> {
  await withTemporaryRoot('rejected-intent', async (controlDirectory) => {
    const catalog = admitTestCatalog([artifact])
    const rejectedLibrary = await openLibrary({
      catalog,
      controlDirectory,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const rejectedSummary = await summarizeArtifact(rejectedLibrary, artifactRef)
    const exactReview = rejectedSummary.artifacts[0].review
    assert.equal(exactReview.state, 'confirmable')
    if (exactReview.state !== 'confirmable') throw new Error('Expected an exact review.')

    const incompleteAcknowledgement = await rejectedLibrary.install({
      artifact: artifactRef,
      reviewFingerprint: exactReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: []
    })
    assert.deepEqual(incompleteAcknowledgement, {
      ok: false,
      error: { code: 'ACKNOWLEDGEMENT_REQUIRED', retry: 'after-user-action' }
    })
    const missingAcknowledgementField = await rejectedLibrary.install({
      artifact: artifactRef,
      reviewFingerprint: exactReview.fingerprint,
      decision: 'install-exact-reviewed-artifact'
    } as unknown as Parameters<typeof rejectedLibrary.install>[0])
    assert.deepEqual(missingAcknowledgementField, {
      ok: false,
      error: { code: 'ACKNOWLEDGEMENT_REQUIRED', retry: 'after-user-action' }
    })
    const missingConfirmation = await rejectedLibrary.install({
      artifact: artifactRef,
      reviewFingerprint: exactReview.fingerprint,
      acceptedAcknowledgements: [modelLicense.id]
    } as unknown as Parameters<typeof rejectedLibrary.install>[0])
    assert.deepEqual(missingConfirmation, {
      ok: false,
      error: { code: 'CONFIRMATION_REQUIRED', retry: 'review-again' }
    })
    const missingReviewFingerprint = await rejectedLibrary.install({
      artifact: artifactRef,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: [modelLicense.id]
    } as unknown as Parameters<typeof rejectedLibrary.install>[0])
    assert.deepEqual(missingReviewFingerprint, {
      ok: false,
      error: { code: 'REVIEW_STALE', retry: 'review-again' }
    })
    const unexpectedAcknowledgement = await rejectedLibrary.install({
      artifact: artifactRef,
      reviewFingerprint: exactReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: [modelLicense.id, 'unexpected:acknowledgement']
    })
    assert.deepEqual(unexpectedAcknowledgement, {
      ok: false,
      error: { code: 'ACKNOWLEDGEMENT_REQUIRED', retry: 'after-user-action' }
    })

    const unchangedAfterRejection = await rejectedLibrary.summarize({ kind: 'library' })
    assert.equal(unchangedAfterRejection.ok, true)
    if (!unchangedAfterRejection.ok) throw new Error('Expected rejected state to stay observable.')
    assert.equal(unchangedAfterRejection.value.revision, 1)
    assert.equal(unchangedAfterRejection.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.deepEqual(unchangedAfterRejection.value.activities, [])
    assertPathFree(unchangedAfterRejection, controlDirectory)
  })
}

async function sideBySideStoragePreservesBothIdentitiesWithoutActivation(): Promise<void> {
  await withTemporaryRoot('side-by-side', async (controlDirectory) => {
    const sharedTokenizer = testFile(
      'tokenizer/tokenizer.json',
      'tokenizer',
      'json',
      Buffer.from('{"model":{"type":"BPE"},"shared":true}', 'utf8')
    )
    const activeWeights = testFile(
      'weights/model.gguf',
      'weights',
      'gguf',
      createGgufFixture(1)
    )
    const candidateWeights = testFile(
      'weights/model.gguf',
      'weights',
      'gguf',
      createGgufFixture(2)
    )
    const activeArtifact: TestManifest = {
      ...artifact,
      manifestId: 'qwen3-vl-2b-q4-k-m@2026-07',
      checkpointId: 'qwen3-vl-2b-instruct',
      variantId: 'qwen3-vl-2b-instruct-q4-k-m',
      displayName: 'Qwen3-VL 2B Q4_K_M',
      immutableRevision: `sha256:${'4'.repeat(64)}`,
      files: [sharedTokenizer, activeWeights],
      requiredAcknowledgements: []
    }
    const candidateArtifact: TestManifest = {
      ...artifact,
      manifestId: 'qwen3-vl-8b-q4-k-m@2026-08',
      checkpointId: 'qwen3-vl-8b-instruct',
      variantId: 'qwen3-vl-8b-instruct-q4-k-m',
      displayName: 'Qwen3-VL 8B Q4_K_M',
      immutableRevision: `sha256:${'5'.repeat(64)}`,
      files: [sharedTokenizer, candidateWeights],
      requiredAcknowledgements: []
    }
    const activeRef = refFor(activeArtifact)
    const candidateRef = refFor(candidateArtifact)
    const catalog = admitTestCatalog([activeArtifact, candidateArtifact])
    let activitySequence = 0
    let storageSequence = 0
    const library = await openLibrary({
      catalog,
      controlDirectory,
      byteSource: sourceByArtifact(new Map([
        [activeRef.manifestId, activeArtifact.files],
        [candidateRef.manifestId, [candidateWeights]]
      ])),
      createActivityId: () => `activity-side-by-side-${++activitySequence}`,
      createStorageRecordId: () => `verified-storage-side-by-side-${++storageSequence}`
    })

    const activeReview = await confirmableReview(library, activeRef)
    const activeInstall = await library.install({
      artifact: activeRef,
      reviewFingerprint: activeReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: []
    })
    assert.equal(activeInstall.ok, true)
    if (!activeInstall.ok) throw new Error('Expected the first side-by-side artifact.')
    const activeAfterFirstInstall = await summarizeArtifact(library, activeRef)

    const candidateReview = await confirmableReview(library, candidateRef)
    assert.deepEqual(candidateReview.storageImpact, {
      logicalBytes: sharedTokenizer.bytes.byteLength + candidateWeights.bytes.byteLength,
      alreadyPresentSharedBytes: sharedTokenizer.bytes.byteLength,
      transferRequiredBytes: candidateWeights.bytes.byteLength,
      additionalPhysicalBytes: candidateWeights.bytes.byteLength
    })
    const sideBySideInstall = await library.install({
      artifact: candidateRef,
      reviewFingerprint: candidateReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: []
    })
    assert.equal(sideBySideInstall.ok, true)
    if (!sideBySideInstall.ok) throw new Error('Expected the candidate side-by-side artifact.')

    const crossArtifactReplay = await library.install({
      artifact: activeRef,
      reviewFingerprint: candidateReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: []
    })
    assert.deepEqual(crossArtifactReplay, {
      ok: false,
      error: { code: 'IDEMPOTENCY_CONFLICT', retry: 'not-retryable' }
    })

    const sideBySideSummary = await library.summarize({ kind: 'library' })
    assert.equal(sideBySideSummary.ok, true)
    if (!sideBySideSummary.ok) throw new Error('Expected a side-by-side library summary.')
    const activeSummary = sideBySideSummary.value.artifacts.find((item) =>
      sameRef(item.identity.ref, activeRef)
    )
    const candidateSummary = sideBySideSummary.value.artifacts.find((item) =>
      sameRef(item.identity.ref, candidateRef)
    )
    assert.deepEqual(activeSummary?.lifecycle, {
      kind: 'verified-stored',
      storageRecordId: 'verified-storage-side-by-side-1',
      activeCapabilityAssignments: []
    })
    assert.deepEqual(candidateSummary?.lifecycle, {
      kind: 'verified-stored',
      storageRecordId: 'verified-storage-side-by-side-2',
      activeCapabilityAssignments: []
    })
    assert.deepEqual(
      activeSummary?.lifecycle,
      activeAfterFirstInstall.artifacts[0].lifecycle,
      'Storing a second manifest must not rewrite the first manifest identity.'
    )
    assert.equal(sideBySideSummary.value.activities.length, 2)
    assert.equal(
      sideBySideSummary.value.activities.every((activity) => activity.activationChanged === false),
      true
    )

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const reopenedSummary = await reopened.summarize({ kind: 'library' })
    assert.deepEqual(reopenedSummary, sideBySideSummary)
    assertPathFree(reopenedSummary, controlDirectory)
  })
}

async function changedDisclosureMakesAnEarlierReviewStale(): Promise<void> {
  const keyPair = generateKeyPairSync('ed25519')
  await withTemporaryRoot('stale-original', async (originalRoot) => {
    const originalLibrary = await openLibrary({
      catalog: admitTestCatalog([artifact], '42', keyPair),
      controlDirectory: originalRoot,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const originalReview = await confirmableReview(originalLibrary, artifactRef)

    await withTemporaryRoot('stale-altered', async (alteredRoot) => {
      const alteredArtifact: TestManifest = {
        ...artifact,
        displayName: 'Qwen3-VL 4B Q4_K_M · revised disclosure',
        requiredAcknowledgements: [{
          ...modelLicense,
          label: 'Revised Qwen model license disclosure'
        }]
      }
      const alteredLibrary = await openLibrary({
        catalog: admitTestCatalog([alteredArtifact], '43', keyPair),
        controlDirectory: alteredRoot,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record')
      })
      const alteredDisclosureInstall = await alteredLibrary.install({
        artifact: artifactRef,
        reviewFingerprint: originalReview.fingerprint,
        decision: 'install-exact-reviewed-artifact',
        acceptedAcknowledgements: [modelLicense.id]
      })
      assert.deepEqual(alteredDisclosureInstall, {
        ok: false,
        error: { code: 'REVIEW_STALE', retry: 'review-again' }
      })
    })
  })
}

async function acknowledgementOrderHasOneCanonicalReview(): Promise<void> {
  const acknowledgementA: ModelArtifactAcknowledgement = {
    id: 'license:canonical-a',
    kind: 'license',
    label: 'Canonical license'
  }
  const acknowledgementZ: ModelArtifactAcknowledgement = {
    id: 'storage:canonical-z',
    kind: 'storage-impact',
    label: 'Canonical storage impact'
  }
  const keyPair = generateKeyPairSync('ed25519')
  const canonicalCatalog = admitTestCatalog([{
    ...artifact,
    requiredAcknowledgements: [acknowledgementZ, acknowledgementA]
  }], '42', keyPair)
  const reorderedCatalog = admitTestCatalog([{
    ...artifact,
    requiredAcknowledgements: [acknowledgementA, acknowledgementZ]
  }], '42', keyPair)

  await withTemporaryRoot('canonical-review', async (canonicalRoot) => {
    const canonicalLibrary = await openLibrary({
      catalog: canonicalCatalog,
      controlDirectory: canonicalRoot,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const canonicalReview = await confirmableReview(canonicalLibrary, artifactRef)

    await withTemporaryRoot('reordered-review', async (reorderedRoot) => {
      const reorderedLibrary = await openLibrary({
        catalog: reorderedCatalog,
        controlDirectory: reorderedRoot,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record')
      })
      const reorderedSummary = await summarizeArtifact(reorderedLibrary, artifactRef)
      const reorderedReview = reorderedSummary.artifacts[0].review
      assert.equal(reorderedReview.state, 'confirmable')
      if (reorderedReview.state !== 'confirmable') {
        throw new Error('Expected a canonical confirmable review.')
      }
      assert.equal(canonicalReview.fingerprint, reorderedReview.fingerprint)
      assert.deepEqual(
        reorderedReview.requiredAcknowledgements.map((item) => item.id),
        ['license:canonical-a', 'storage:canonical-z']
      )
    })
  })
}

async function openLibrary(input: {
  readonly catalog: AdmittedModelCatalog
  readonly controlDirectory: string
  readonly byteSource: ModelArtifactByteSource
  readonly createActivityId: () => string
  readonly createStorageRecordId: () => string
}): Promise<ModelLibrary> {
  return openTransactionalModelLibraryTracer(input)
}

async function summarizeArtifact(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef
) {
  const result = await library.summarize({ kind: 'artifact', artifact })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('Expected one artifact summary.')
  assert.equal(result.value.artifacts.length, 1)
  return result.value
}

async function confirmableReview(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef
) {
  const summary = await summarizeArtifact(library, artifact)
  const review = summary.artifacts[0].review
  assert.equal(review.state, 'confirmable')
  if (review.state !== 'confirmable') throw new Error('Expected a confirmable review.')
  return review
}

function sourceFromEntries(entries: readonly TestFile[]): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      for (const entry of entries) {
        yield { relativePath: entry.path, bytes: chunks(entry.bytes) }
      }
    }
  }
}

function sourceByArtifact(
  entriesByManifestId: ReadonlyMap<string, readonly TestFile[]>
): ModelArtifactByteSource {
  return {
    async *entries(request): AsyncIterable<ModelArtifactSourceEntry> {
      for (const entry of entriesByManifestId.get(request.artifact.manifestId) ?? []) {
        yield { relativePath: entry.path, bytes: chunks(entry.bytes) }
      }
    }
  }
}

function unavailableSource(): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      throw new Error('Synthetic source must not be used by this scenario.')
    }
  }
}

async function *chunks(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  const split = Math.max(1, Math.floor(bytes.byteLength / 2))
  yield bytes.subarray(0, split)
  if (split < bytes.byteLength) yield bytes.subarray(split)
}

async function withTemporaryRoot(
  scenario: string,
  run: (controlDirectory: string) => Promise<void>
): Promise<void> {
  const controlDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `dam-core-${scenario}-`))
  try {
    await run(controlDirectory)
  } finally {
    await fs.rm(controlDirectory, { recursive: true, force: true })
  }
}

function mustNotCreate(kind: string): () => string {
  return () => {
    throw new Error(`Rejected/replayed work must not create another ${kind}.`)
  }
}

function testFile(
  filePath: string,
  role: string,
  format: string,
  bytes: Uint8Array
): TestFile {
  return { path: filePath, role, format, bytes }
}

function refFor(manifest: TestManifest): ModelArtifactRevisionRef {
  return { catalogId: 'official-model-catalog', manifestId: manifest.manifestId }
}

function totalBytes(files: readonly TestFile[]): number {
  return files.reduce((total, file) => total + file.bytes.byteLength, 0)
}

function noActivationConsequences() {
  return {
    activatesModel: false,
    startsRuntime: false,
    startsInference: false,
    reanalysesAssets: false,
    changesEmbeddingSpace: false,
    authorizesExternalUpload: false
  } as const
}

function createGgufFixture(value: number): Uint8Array {
  const name = Buffer.from('weight', 'utf8')
  const header = Buffer.alloc(24)
  header.write('GGUF', 0, 'ascii')
  header.writeUInt32LE(3, 4)
  header.writeBigUInt64LE(1n, 8)
  header.writeBigUInt64LE(0n, 16)
  const tensor = Buffer.alloc(8 + name.byteLength + 4 + 8 + 4 + 8)
  let offset = 0
  tensor.writeBigUInt64LE(BigInt(name.byteLength), offset)
  offset += 8
  name.copy(tensor, offset)
  offset += name.byteLength
  tensor.writeUInt32LE(1, offset)
  offset += 4
  tensor.writeBigUInt64LE(1n, offset)
  offset += 8
  tensor.writeUInt32LE(0, offset)
  offset += 4
  tensor.writeBigUInt64LE(0n, offset)
  const unpaddedLength = header.byteLength + tensor.byteLength
  const padding = Buffer.alloc((32 - unpaddedLength % 32) % 32)
  const data = Buffer.alloc(4)
  data.writeFloatLE(value, 0)
  return Buffer.concat([header, tensor, padding, data])
}

function admitTestCatalog(
  artifacts: readonly TestManifest[],
  sequence = '42',
  keyPair: { readonly publicKey: KeyObject; readonly privateKey: KeyObject } =
    generateKeyPairSync('ed25519')
): AdmittedModelCatalog {
  const catalogId = 'official-model-catalog'
  const keyId = 'model-library-core-test-root'
  const declaredArtifacts = artifacts.map((item) => ({
    ...item,
    files: item.files.map((file) => ({
      path: file.path,
      role: file.role,
      format: file.format,
      sizeBytes: file.bytes.byteLength,
      sha256: createHash('sha256').update(file.bytes).digest('hex')
    }))
  }))
  const payload = {
    schemaVersion: 1,
    catalogId,
    keyId,
    sequence,
    trustVerifiedAt: '2026-08-12T00:00:00.000Z',
    artifacts: declaredArtifacts
  }
  const canonicalPayload = canonicalJsonForTest({
    ...payload,
    artifacts: declaredArtifacts
      .map((item) => ({
        ...item,
        files: [...item.files].sort((left, right) => compareText(left.path, right.path)),
        requiredAcknowledgements: [...item.requiredAcknowledgements]
          .sort((left, right) => compareText(left.id, right.id))
      }))
      .sort((left, right) => compareText(left.manifestId, right.manifestId))
  })
  const admission = createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId,
      keyId,
      publicKeySpkiBase64: (keyPair.publicKey.export({
        format: 'der',
        type: 'spki'
      }) as Buffer).toString('base64')
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  })
  const result = admission.admit({
    catalogId,
    keyId,
    payload,
    signatureBase64: signTestPayload(canonicalPayload, keyPair.privateKey)
  })
  if (result.kind !== 'admitted') {
    throw new Error(`Expected a test Catalog admission, received ${result.kind}.`)
  }
  return result.catalog
}

function signTestPayload(canonicalPayload: string, privateKey: KeyObject): string {
  return sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64')
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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sameRef(left: ModelArtifactRevisionRef, right: ModelArtifactRevisionRef): boolean {
  return left.catalogId === right.catalogId && left.manifestId === right.manifestId
}

function assertPathFree(value: unknown, privateRoot: string): void {
  const serialized = JSON.stringify(value)
  assert.doesNotMatch(
    serialized,
    /admissionBinding|manifestPayload|signature|publicKey|localPath|filePath|controlDirectory|sourceUrl|downloadUrl|credential|authorizationHeader|parser|subprocess|\/Users\//i
  )
  assert.equal(serialized.includes(privateRoot), false)
}
