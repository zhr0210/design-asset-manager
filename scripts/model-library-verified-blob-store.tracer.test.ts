import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  createInMemoryModelCatalogAdmissionTracer,
  type AdmittedModelCatalog
} from '../src/main/model-library/model-catalog-admission.tracer'
import type {
  InstallReviewedModelArtifactRequest,
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

interface TestArtifact {
  readonly manifestId: string
  readonly files: readonly TestFile[]
  readonly displayName?: string
}

interface OnnxExternalTensorFixture {
  readonly name: string
  readonly location: string
  readonly offset: number
  readonly length: number
  readonly dimensions?: readonly number[]
  readonly dataType?: number
  readonly externalData?: readonly OnnxExternalDataFixtureEntry[]
  readonly dataLocation?: number | null
  readonly rawData?: Uint8Array
}

interface OnnxExternalDataFixtureEntry {
  readonly key: string
  readonly value: string
}

interface CountedSource {
  readonly source: ModelArtifactByteSource
  readonly calls: () => number
}

const ACKNOWLEDGEMENT = 'license:synthetic-model:2026-08'
const PATH_FREE_PATTERN = /localPath|filePath|controlDirectory|sourceUrl|downloadUrl|credential|authorizationHeader|parser|subprocess|\/Users\//i

await validSafeTensorsTransactionSurvivesReopen()
await invalidSourceFileSetsAndBytesFailClosed()
await structurallyInvalidResignedManifestFailsClosed()
await validGgufAndOnnxFixturesReachVerifiedStorage()
await validOnnxExternalDataSurvivesReopenAndReplay()
await invalidOnnxExternalDataPackagesFailClosed()
await multipleOnnxTensorsShareOneExternalBlobExactly()
await sharedBytesAreStoredOnceWithoutMergingArtifactIdentity()
await staleConcurrentInstanceRecognizesTheDurableCommit()
await interruptedTransactionsReconcileAroundTheCommitPoint()
await rejectedIntentAndReplayDoNotAcquireBytes()

console.log('model-library verified Blob Store behavior passed')

async function validSafeTensorsTransactionSurvivesReopen(): Promise<void> {
  await withTemporaryRoot('valid-safetensors', async (controlDirectory) => {
    const weights = createSafeTensorsFixture()
    const files = [testFile('weights/model.safetensors', 'weights', 'safetensors', weights)]
    const artifact = artifactRef('synthetic-safetensors@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files }])
    const library = await openLibrary({ catalog, controlDirectory, source: sourceFromEntries(files) })
    const initial = await review(library, artifact)
    assert.deepEqual(initial.storageImpact, {
      logicalBytes: weights.byteLength,
      alreadyPresentSharedBytes: 0,
      transferRequiredBytes: weights.byteLength,
      additionalPhysicalBytes: weights.byteLength
    })

    const request = installRequest(artifact, initial.fingerprint)
    const install = await library.install(request)
    assert.equal(install.ok, true)
    if (!install.ok) throw new Error('Expected verified synthetic storage.')
    assert.equal(install.value.disposition, 'new-install')
    assert.equal(install.value.activity.state, 'verified-stored')
    assert.equal(install.value.activity.activationChanged, false)
    await assertVerifiedStored(library, artifact, 'verified-storage-1')

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      source: unavailableSource(),
      createActivityId: () => { throw new Error('Replay must not create an activity.') },
      createStorageRecordId: () => { throw new Error('Replay must not create storage.') }
    })
    await assertVerifiedStored(reopened, artifact, 'verified-storage-1')
    const replay = await reopened.install(request)
    assert.deepEqual(replay, {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: install.value.activity
      }
    })
  })
}

async function invalidSourceFileSetsAndBytesFailClosed(): Promise<void> {
  const expected = createSafeTensorsFixture()
  const declared = testFile('weights/model.safetensors', 'weights', 'safetensors', expected)
  const sameLengthTamper = Buffer.from(expected)
  sameLengthTamper[sameLengthTamper.byteLength - 1] ^= 0xff
  const shortened = expected.subarray(0, expected.byteLength - 1)

  const scenarios: ReadonlyArray<{
    readonly name: string
    readonly entries: readonly TestFile[]
  }> = [
    {
      name: 'changed-digest',
      entries: [{ ...declared, bytes: sameLengthTamper }]
    },
    {
      name: 'changed-size',
      entries: [{ ...declared, bytes: shortened }]
    },
    {
      name: 'missing-entry',
      entries: []
    },
    {
      name: 'extra-entry',
      entries: [
        declared,
        testFile('unexpected/readme.txt', 'metadata', 'text', Buffer.from('extra'))
      ]
    },
    {
      name: 'duplicate-entry',
      entries: [declared, declared]
    },
    {
      name: 'case-colliding-entry',
      entries: [declared, { ...declared, path: 'Weights/model.safetensors' }]
    }
  ]

  for (const scenario of scenarios) {
    await withTemporaryRoot(scenario.name, async (controlDirectory) => {
      const artifact = artifactRef(`synthetic-${scenario.name}@2026-08`)
      const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [declared] }])
      const library = await openLibrary({
        catalog,
        controlDirectory,
        source: sourceFromEntries(scenario.entries)
      })
      await assertByteFailureLeavesCatalogOnly(library, artifact, controlDirectory)
    })
  }
}

async function structurallyInvalidResignedManifestFailsClosed(): Promise<void> {
  await withTemporaryRoot('invalid-resigned-structure', async (controlDirectory) => {
    const invalidButExactlyDeclared = Buffer.alloc(32, 0)
    const files = [testFile(
      'weights/invalid.safetensors',
      'weights',
      'safetensors',
      invalidButExactlyDeclared
    )]
    const artifact = artifactRef('synthetic-invalid-structure@2026-08')
    // admitCatalog signs this exact digest and size. Signature admission must not
    // substitute for bounded validation of the declared data container.
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files }])
    const library = await openLibrary({ catalog, controlDirectory, source: sourceFromEntries(files) })
    await assertByteFailureLeavesCatalogOnly(library, artifact, controlDirectory)
  })
}

async function validGgufAndOnnxFixturesReachVerifiedStorage(): Promise<void> {
  const fixtures: ReadonlyArray<{ readonly name: string; readonly file: TestFile }> = [
    {
      name: 'gguf',
      file: testFile('weights/model.gguf', 'weights', 'gguf', createGgufFixture())
    },
    {
      name: 'onnx',
      file: testFile('weights/model.onnx', 'weights', 'onnx', createOnnxFixture())
    }
  ]

  for (const fixture of fixtures) {
    await withTemporaryRoot(`valid-${fixture.name}`, async (controlDirectory) => {
      const artifact = artifactRef(`synthetic-${fixture.name}@2026-08`)
      const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [fixture.file] }])
      const library = await openLibrary({
        catalog,
        controlDirectory,
        source: sourceFromEntries([fixture.file])
      })
      const currentReview = await review(library, artifact)
      const result = await library.install(installRequest(artifact, currentReview.fingerprint))
      assert.equal(result.ok, true, `Expected the tiny ${fixture.name} envelope to be accepted.`)
      await assertVerifiedStored(library, artifact, 'verified-storage-1')
    })
  }
}

async function validOnnxExternalDataSurvivesReopenAndReplay(): Promise<void> {
  await withTemporaryRoot('valid-onnx-external-data', async (controlDirectory) => {
    const externalBytes = Buffer.from([0, 0, 128, 63])
    const files = [
      testFile(
        'weights/model.onnx',
        'weights',
        'onnx',
        createOnnxExternalDataFixture([{
          name: 'external_weight',
          location: 'model.onnx.data',
          offset: 0,
          length: externalBytes.byteLength
        }])
      ),
      testFile(
        'weights/model.onnx.data',
        'onnx-external-data',
        'binary',
        externalBytes
      )
    ]
    const artifact = artifactRef('synthetic-onnx-external-data@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files }])
    const library = await openLibrary({
      catalog,
      controlDirectory,
      source: sourceFromEntries(files)
    })
    const currentReview = await review(library, artifact)
    const request = installRequest(artifact, currentReview.fingerprint)
    const install = await library.install(request)
    assert.equal(install.ok, true, 'Exact admitted ONNX external data should be stored.')
    if (!install.ok) throw new Error('Expected exact ONNX external-data storage.')
    await assertVerifiedStored(library, artifact, install.value.activity.storageRecordId)

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      source: unavailableSource(),
      createActivityId: () => { throw new Error('Reopen must reuse the durable activity.') },
      createStorageRecordId: () => { throw new Error('Reopen must reuse durable storage.') }
    })
    await assertVerifiedStored(reopened, artifact, install.value.activity.storageRecordId)
    assert.deepEqual(await reopened.install(request), {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: install.value.activity
      }
    })
  })
}

async function invalidOnnxExternalDataPackagesFailClosed(): Promise<void> {
  const fourBytes = Buffer.from([0, 0, 128, 63])
  const eightBytes = Buffer.from([0, 0, 128, 63, 0, 0, 0, 64])
  const nineBytes = Buffer.alloc(9)
  const scenarios: ReadonlyArray<{
    readonly name: string
    readonly files: readonly TestFile[]
  }> = [
    {
      name: 'onnx-external-location-traversal',
      files: [
        testFile(
          'weights/model.onnx',
          'weights',
          'onnx',
          createOnnxExternalDataFixture([{
            name: 'weight',
            location: '../model.onnx.data',
            offset: 0,
            length: fourBytes.byteLength
          }])
        ),
        testFile('weights/model.onnx.data', 'onnx-external-data', 'binary', fourBytes)
      ]
    },
    {
      name: 'onnx-external-target-is-not-admitted',
      files: [
        testFile(
          'weights/model.onnx',
          'weights',
          'onnx',
          createOnnxExternalDataFixture([{
            name: 'weight',
            location: 'not-admitted.data',
            offset: 0,
            length: fourBytes.byteLength
          }])
        )
      ]
    },
    {
      name: 'onnx-external-offset-is-out-of-bounds',
      files: [
        testFile(
          'weights/model.onnx',
          'weights',
          'onnx',
          createOnnxExternalDataFixture([{
            name: 'weight',
            location: 'model.onnx.data',
            offset: 2,
            length: fourBytes.byteLength
          }])
        ),
        testFile('weights/model.onnx.data', 'onnx-external-data', 'binary', fourBytes)
      ]
    },
    {
      name: 'onnx-external-length-disagrees-with-tensor-shape',
      files: [
        testFile(
          'weights/model.onnx',
          'weights',
          'onnx',
          createOnnxExternalDataFixture([{
            name: 'weight',
            location: 'model.onnx.data',
            offset: 0,
            length: eightBytes.byteLength,
            dimensions: [1]
          }])
        ),
        testFile('weights/model.onnx.data', 'onnx-external-data', 'binary', eightBytes)
      ]
    },
    {
      name: 'onnx-external-data-is-orphaned',
      files: [
        testFile('weights/model.onnx', 'weights', 'onnx', createOnnxFixture()),
        testFile('weights/model.onnx.data', 'onnx-external-data', 'binary', fourBytes)
      ]
    },
    {
      name: 'onnx-external-metadata-key-is-duplicated',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        externalData: [
          ...createOnnxExternalDataEntries({
            location: 'model.onnx.data',
            offset: 0,
            length: fourBytes.byteLength
          }),
          { key: 'location', value: 'model.onnx.data' }
        ]
      }], fourBytes)
    },
    {
      name: 'onnx-external-metadata-key-is-unknown',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        externalData: [
          ...createOnnxExternalDataEntries({
            location: 'model.onnx.data',
            offset: 0,
            length: fourBytes.byteLength
          }),
          { key: 'checksum', value: 'untrusted-metadata' }
        ]
      }], fourBytes)
    },
    {
      name: 'onnx-external-data-location-is-missing',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        dataLocation: null
      }], fourBytes)
    },
    {
      name: 'onnx-external-data-location-is-not-external',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        dataLocation: 0
      }], fourBytes)
    },
    {
      name: 'onnx-external-tensor-also-contains-raw-data',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        rawData: fourBytes
      }], fourBytes)
    },
    {
      name: 'onnx-external-location-case-does-not-match-admitted-file',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'Model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength
      }], fourBytes)
    },
    {
      name: 'onnx-external-offset-is-not-canonical-decimal',
      files: createOnnxExternalPackageFixture([{
        name: 'weight',
        location: 'model.onnx.data',
        offset: 0,
        length: fourBytes.byteLength,
        externalData: [
          { key: 'location', value: 'model.onnx.data' },
          { key: 'offset', value: '00' },
          { key: 'length', value: '4' }
        ]
      }], fourBytes)
    },
    {
      name: 'onnx-external-tensor-ranges-overlap',
      files: createOnnxExternalPackageFixture([
        { name: 'first_weight', location: 'model.onnx.data', offset: 0, length: 4 },
        { name: 'second_weight', location: 'model.onnx.data', offset: 2, length: 4 }
      ], eightBytes)
    },
    {
      name: 'onnx-external-tensor-ranges-leave-a-gap',
      files: createOnnxExternalPackageFixture([
        { name: 'first_weight', location: 'model.onnx.data', offset: 0, length: 4 },
        { name: 'second_weight', location: 'model.onnx.data', offset: 5, length: 4 }
      ], nineBytes)
    }
  ]

  for (const scenario of scenarios) {
    await withTemporaryRoot(scenario.name, async (controlDirectory) => {
      const artifact = artifactRef(`synthetic-${scenario.name}@2026-08`)
      const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: scenario.files }])
      const library = await openLibrary({
        catalog,
        controlDirectory,
        source: sourceFromEntries(scenario.files)
      })
      await assertByteFailureLeavesCatalogOnly(library, artifact, controlDirectory)
    })
  }
}

async function multipleOnnxTensorsShareOneExternalBlobExactly(): Promise<void> {
  await withTemporaryRoot('onnx-shared-external-blob', async (controlDirectory) => {
    const externalBytes = Buffer.from([0, 0, 128, 63, 0, 0, 0, 64])
    const files = [
      testFile(
        'weights/model.onnx',
        'weights',
        'onnx',
        createOnnxExternalDataFixture([
          { name: 'first_weight', location: 'model.onnx.data', offset: 0, length: 4 },
          { name: 'second_weight', location: 'model.onnx.data', offset: 4, length: 4 }
        ])
      ),
      testFile(
        'weights/model.onnx.data',
        'onnx-external-data',
        'binary',
        externalBytes
      )
    ]
    const artifact = artifactRef('synthetic-onnx-shared-external-blob@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files }])
    const library = await openLibrary({
      catalog,
      controlDirectory,
      source: sourceFromEntries(files)
    })
    const currentReview = await review(library, artifact)
    const install = await library.install(installRequest(artifact, currentReview.fingerprint))
    assert.equal(
      install.ok,
      true,
      'Non-overlapping tensors that exactly cover one external Blob should be stored.'
    )
    if (!install.ok) throw new Error('Expected exact shared ONNX external-data storage.')
    await assertVerifiedStored(library, artifact, install.value.activity.storageRecordId)
  })
}

async function sharedBytesAreStoredOnceWithoutMergingArtifactIdentity(): Promise<void> {
  await withTemporaryRoot('shared-blob', async (controlDirectory) => {
    const sharedWeights = createSafeTensorsFixture()
    const sharedFile = testFile('weights/model.safetensors', 'weights', 'safetensors', sharedWeights)
    const firstRef = artifactRef('shared-first@2026-08')
    const secondRef = artifactRef('shared-second@2026-08')
    const catalog = admitCatalog([
      { manifestId: firstRef.manifestId, displayName: 'First identity', files: [sharedFile] },
      { manifestId: secondRef.manifestId, displayName: 'Second identity', files: [sharedFile] }
    ])
    const counted = countedSource([sharedFile])
    let activitySequence = 0
    let storageSequence = 0
    const library = await openLibrary({
      catalog,
      controlDirectory,
      source: counted.source,
      createActivityId: () => `activity-shared-${++activitySequence}`,
      createStorageRecordId: () => `verified-shared-${++storageSequence}`
    })

    const firstReview = await review(library, firstRef)
    const firstInstall = await library.install(installRequest(firstRef, firstReview.fingerprint))
    assert.equal(firstInstall.ok, true)
    if (!firstInstall.ok) throw new Error('Expected first shared artifact storage.')
    assert.equal(counted.calls(), 1)

    const firstAfterInstall = await artifactSummary(library, firstRef)
    const secondReview = await review(library, secondRef)
    assert.deepEqual(secondReview.storageImpact, {
      logicalBytes: sharedWeights.byteLength,
      alreadyPresentSharedBytes: sharedWeights.byteLength,
      transferRequiredBytes: 0,
      additionalPhysicalBytes: 0
    })
    const secondInstall = await library.install(installRequest(secondRef, secondReview.fingerprint))
    assert.equal(secondInstall.ok, true)
    if (!secondInstall.ok) throw new Error('Expected second manifest to reference shared bytes.')
    assert.equal(counted.calls(), 1, 'Already verified shared bytes must not be acquired again.')
    assert.notEqual(
      secondInstall.value.activity.storageRecordId,
      firstInstall.value.activity.storageRecordId,
      'Sharing bytes must not merge artifact storage identity.'
    )

    const firstAfterSecondInstall = await artifactSummary(library, firstRef)
    assert.deepEqual(firstAfterSecondInstall.artifacts[0].lifecycle, firstAfterInstall.artifacts[0].lifecycle)
    assert.deepEqual(firstAfterSecondInstall.activities, firstAfterInstall.activities)
  })
}

async function staleConcurrentInstanceRecognizesTheDurableCommit(): Promise<void> {
  await withTemporaryRoot('stale-concurrent-instance', async (controlDirectory) => {
    const file = testFile(
      'weights/model.safetensors',
      'weights',
      'safetensors',
      createSafeTensorsFixture()
    )
    const artifact = artifactRef('stale-concurrent-instance@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [file] }])
    const first = await openLibrary({
      catalog,
      controlDirectory,
      source: sourceFromEntries([file])
    })
    const second = await openLibrary({
      catalog,
      controlDirectory,
      source: unavailableSource(),
      createActivityId: () => { throw new Error('A stale replay must reuse the durable activity.') },
      createStorageRecordId: () => { throw new Error('A stale replay must reuse durable storage.') }
    })

    const firstReview = await review(first, artifact)
    const secondReview = await review(second, artifact)
    assert.equal(
      secondReview.fingerprint,
      firstReview.fingerprint,
      'Instances opened from the same empty durable state must review the same install.'
    )
    const request = installRequest(artifact, firstReview.fingerprint)
    const firstInstall = await first.install(request)
    assert.equal(firstInstall.ok, true)
    if (!firstInstall.ok) throw new Error('Expected the first instance to commit storage.')

    const staleReplay = await second.install(request)
    assert.deepEqual(staleReplay, {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: firstInstall.value.activity
      }
    })

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      source: unavailableSource(),
      createActivityId: () => { throw new Error('Reopen must not create another activity.') },
      createStorageRecordId: () => { throw new Error('Reopen must not create storage.') }
    })
    await assertVerifiedStored(reopened, artifact, firstInstall.value.activity.storageRecordId)
  })
}

async function interruptedTransactionsReconcileAroundTheCommitPoint(): Promise<void> {
  await withTemporaryRoot('interrupted-before-commit', async (controlDirectory) => {
    const file = testFile(
      'weights/model.safetensors',
      'weights',
      'safetensors',
      createSafeTensorsFixture()
    )
    const artifact = artifactRef('interrupted-before-commit@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [file] }])
    const interrupted = await openLibrary({
      catalog,
      controlDirectory,
      source: sourceFromEntries([file]),
      simulateInterruption: 'before-commit'
    })
    const currentReview = await review(interrupted, artifact)
    await assert.rejects(() => interrupted.install(installRequest(artifact, currentReview.fingerprint)))

    const reopened = await openLibrary({ catalog, controlDirectory, source: unavailableSource() })
    const summary = await artifactSummary(reopened, artifact)
    assert.deepEqual(summary.artifacts[0].lifecycle, { kind: 'catalog-only' })
    assert.deepEqual(summary.activities, [])
    assertPathFree(summary, controlDirectory)
  })

  await withTemporaryRoot('interrupted-after-commit', async (controlDirectory) => {
    const file = testFile(
      'weights/model.safetensors',
      'weights',
      'safetensors',
      createSafeTensorsFixture()
    )
    const artifact = artifactRef('interrupted-after-commit@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [file] }])
    const interrupted = await openLibrary({
      catalog,
      controlDirectory,
      source: sourceFromEntries([file]),
      simulateInterruption: 'after-commit'
    })
    const currentReview = await review(interrupted, artifact)
    const request = installRequest(artifact, currentReview.fingerprint)
    await assert.rejects(() => interrupted.install(request))

    const reopened = await openLibrary({
      catalog,
      controlDirectory,
      source: unavailableSource(),
      createActivityId: () => { throw new Error('Recovery must reuse the committed activity.') },
      createStorageRecordId: () => { throw new Error('Recovery must reuse committed storage.') }
    })
    await assertVerifiedStored(reopened, artifact, 'verified-storage-1')
    const replay = await reopened.install(request)
    assert.equal(replay.ok, true)
    if (!replay.ok) throw new Error('Expected replay of the recovered commit.')
    assert.equal(replay.value.disposition, 'idempotent-replay')
    assert.equal(replay.value.activity.activityId, 'activity-verified-1')
    assertPathFree(replay, controlDirectory)
  })
}

async function rejectedIntentAndReplayDoNotAcquireBytes(): Promise<void> {
  await withTemporaryRoot('source-boundary', async (controlDirectory) => {
    const file = testFile(
      'weights/model.safetensors',
      'weights',
      'safetensors',
      createSafeTensorsFixture()
    )
    const artifact = artifactRef('source-boundary@2026-08')
    const catalog = admitCatalog([{ manifestId: artifact.manifestId, files: [file] }])
    const counted = countedSource([file])
    const library = await openLibrary({ catalog, controlDirectory, source: counted.source })
    const currentReview = await review(library, artifact)
    const request = installRequest(artifact, currentReview.fingerprint)

    const invalidIntent = await library.install({
      ...request,
      decision: 'not-the-confirmed-install-intent'
    } as InstallReviewedModelArtifactRequest)
    assert.deepEqual(invalidIntent, {
      ok: false,
      error: { code: 'CONFIRMATION_REQUIRED', retry: 'review-again' }
    })
    assert.equal(counted.calls(), 0)

    const installed = await library.install(request)
    assert.equal(installed.ok, true)
    assert.equal(counted.calls(), 1)
    const replay = await library.install(request)
    assert.equal(replay.ok, true)
    if (!replay.ok) throw new Error('Expected an idempotent replay.')
    assert.equal(replay.value.disposition, 'idempotent-replay')
    assert.equal(counted.calls(), 1, 'Idempotent replay must not reacquire bytes.')
  })
}

async function assertByteFailureLeavesCatalogOnly(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef,
  privateRoot: string
): Promise<void> {
  const currentReview = await review(library, artifact)
  const result = await library.install(installRequest(artifact, currentReview.fingerprint))
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'ARTIFACT_BYTES_REJECTED', retry: 'after-user-action' }
  })
  const summary = await artifactSummary(library, artifact)
  assert.deepEqual(summary.artifacts[0].lifecycle, { kind: 'catalog-only' })
  assert.deepEqual(summary.activities, [])
  assertPathFree(result, privateRoot)
  assertPathFree(summary, privateRoot)
}

async function assertVerifiedStored(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef,
  storageRecordId: string
): Promise<void> {
  const summary = await artifactSummary(library, artifact)
  assert.deepEqual(summary.artifacts[0].lifecycle, {
    kind: 'verified-stored',
    storageRecordId,
    activeCapabilityAssignments: []
  })
  assert.equal(summary.activities.length, 1)
  assert.equal(summary.activities[0].activationChanged, false)
  assert.doesNotMatch(JSON.stringify(summary), PATH_FREE_PATTERN)
}

async function artifactSummary(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef
) {
  const result = await library.summarize({ kind: 'artifact', artifact })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('Expected an artifact summary.')
  assert.equal(result.value.artifacts.length, 1)
  return result.value
}

async function review(
  library: ModelLibrary,
  artifact: ModelArtifactRevisionRef
): Promise<{
  readonly fingerprint: string
  readonly storageImpact: {
    readonly logicalBytes: number
    readonly alreadyPresentSharedBytes: number
    readonly transferRequiredBytes: number
    readonly additionalPhysicalBytes: number
  }
}> {
  const summary = await artifactSummary(library, artifact)
  const projectedReview = summary.artifacts[0].review
  assert.equal(projectedReview.state, 'confirmable')
  if (projectedReview.state !== 'confirmable') throw new Error('Expected a confirmable review.')
  return {
    fingerprint: projectedReview.fingerprint,
    storageImpact: projectedReview.storageImpact
  }
}

function installRequest(
  artifact: ModelArtifactRevisionRef,
  reviewFingerprint: string
): InstallReviewedModelArtifactRequest {
  return {
    artifact,
    reviewFingerprint,
    decision: 'install-exact-reviewed-artifact',
    acceptedAcknowledgements: [ACKNOWLEDGEMENT]
  }
}

async function openLibrary(input: {
  readonly catalog: AdmittedModelCatalog
  readonly controlDirectory: string
  readonly source: ModelArtifactByteSource
  readonly createActivityId?: () => string
  readonly createStorageRecordId?: () => string
  readonly simulateInterruption?: 'before-commit' | 'after-commit'
}): Promise<ModelLibrary> {
  return openTransactionalModelLibraryTracer({
    catalog: input.catalog,
    controlDirectory: input.controlDirectory,
    byteSource: input.source,
    createActivityId: input.createActivityId ?? (() => 'activity-verified-1'),
    createStorageRecordId: input.createStorageRecordId ?? (() => 'verified-storage-1'),
    simulateInterruption: input.simulateInterruption
  })
}

function sourceFromEntries(entries: readonly TestFile[]): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      // Deliberately untrusted: yield exactly what the synthetic source owns.
      // Filtering by requested paths here would conceal extra/case-colliding input.
      for (const entry of entries) {
        yield { relativePath: entry.path, bytes: chunks(entry.bytes) }
      }
    }
  }
}

function countedSource(entries: readonly TestFile[]): CountedSource {
  let callCount = 0
  return {
    source: {
      async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
        callCount += 1
        for (const entry of entries) {
          yield { relativePath: entry.path, bytes: chunks(entry.bytes) }
        }
      }
    },
    calls: () => callCount
  }
}

function unavailableSource(): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      throw new Error('Synthetic source must not be used.')
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
  const controlDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `dam-model-${scenario}-`))
  try {
    await run(controlDirectory)
  } finally {
    await fs.rm(controlDirectory, { recursive: true, force: true })
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

function artifactRef(manifestId: string): ModelArtifactRevisionRef {
  return { catalogId: 'official-model-catalog', manifestId }
}

function createSafeTensorsFixture(): Uint8Array {
  const headerValue = JSON.stringify({
    weight: { dtype: 'F32', shape: [1], data_offsets: [0, 4] }
  })
  const padding = ' '.repeat((8 - Buffer.byteLength(headerValue, 'utf8') % 8) % 8)
  const header = Buffer.from(`${headerValue}${padding}`, 'utf8')
  const prefix = Buffer.alloc(8)
  prefix.writeBigUInt64LE(BigInt(header.byteLength), 0)
  return Buffer.concat([prefix, header, Buffer.from([0, 0, 128, 63])])
}

function createGgufFixture(): Uint8Array {
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
  return Buffer.concat([header, tensor, padding, Buffer.from([0, 0, 128, 63])])
}

function createOnnxFixture(): Uint8Array {
  const tensor = Buffer.concat([
    protobufVarintField(1, 1),
    protobufVarintField(2, 1),
    protobufBytesField(8, Buffer.from('weight', 'utf8')),
    protobufBytesField(9, Buffer.from([0, 0, 128, 63]))
  ])
  const graph = protobufBytesField(5, tensor)
  return Buffer.concat([
    protobufVarintField(1, 8),
    protobufBytesField(7, graph)
  ])
}

function createOnnxExternalDataFixture(
  tensors: readonly OnnxExternalTensorFixture[]
): Uint8Array {
  const graph = Buffer.concat(tensors.map((tensor) => protobufBytesField(
    5,
    createOnnxExternalTensorFixture(tensor)
  )))
  return Buffer.concat([
    protobufVarintField(1, 8),
    protobufBytesField(7, graph)
  ])
}

function createOnnxExternalPackageFixture(
  tensors: readonly OnnxExternalTensorFixture[],
  externalBytes: Uint8Array
): readonly TestFile[] {
  return [
    testFile(
      'weights/model.onnx',
      'weights',
      'onnx',
      createOnnxExternalDataFixture(tensors)
    ),
    testFile(
      'weights/model.onnx.data',
      'onnx-external-data',
      'binary',
      externalBytes
    )
  ]
}

function createOnnxExternalTensorFixture(input: OnnxExternalTensorFixture): Buffer {
  const dimensions = input.dimensions ?? [1]
  const externalData = input.externalData ?? createOnnxExternalDataEntries(input)
  const rawData = input.rawData === undefined
    ? []
    : [protobufBytesField(9, input.rawData)]
  const dataLocation = input.dataLocation === null
    ? []
    : [protobufVarintField(14, input.dataLocation ?? 1)]
  return Buffer.concat([
    ...dimensions.map((dimension) => protobufVarintField(1, dimension)),
    protobufVarintField(2, input.dataType ?? 1),
    protobufBytesField(8, Buffer.from(input.name, 'utf8')),
    ...rawData,
    ...externalData.map((entry) => protobufBytesField(
      13,
      createOnnxExternalDataEntry(entry.key, entry.value)
    )),
    ...dataLocation
  ])
}

function createOnnxExternalDataEntries(
  input: Pick<OnnxExternalTensorFixture, 'location' | 'offset' | 'length'>
): readonly OnnxExternalDataFixtureEntry[] {
  return [
    { key: 'location', value: input.location },
    { key: 'offset', value: String(input.offset) },
    { key: 'length', value: String(input.length) }
  ]
}

function createOnnxExternalDataEntry(key: string, value: string): Buffer {
  return Buffer.concat([
    protobufBytesField(1, Buffer.from(key, 'utf8')),
    protobufBytesField(2, Buffer.from(value, 'utf8'))
  ])
}

function protobufVarintField(fieldNumber: number, value: number): Buffer {
  return Buffer.concat([encodeVarint(fieldNumber << 3), encodeVarint(value)])
}

function protobufBytesField(fieldNumber: number, value: Uint8Array): Buffer {
  return Buffer.concat([
    encodeVarint((fieldNumber << 3) | 2),
    encodeVarint(value.byteLength),
    value
  ])
}

function encodeVarint(value: number): Buffer {
  const bytes: number[] = []
  let remaining = value
  do {
    let byte = remaining & 0x7f
    remaining = Math.floor(remaining / 128)
    if (remaining > 0) byte |= 0x80
    bytes.push(byte)
  } while (remaining > 0)
  return Buffer.from(bytes)
}

function admitCatalog(artifacts: readonly TestArtifact[]): AdmittedModelCatalog {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const now = Date.parse('2026-08-12T00:00:00.000Z')
  const payload = {
    schemaVersion: 1,
    catalogId: 'official-model-catalog',
    keyId: 'official-root-2026',
    sequence: '1',
    trustVerifiedAt: new Date(now).toISOString(),
    artifacts: artifacts.map((artifact, index) => ({
      manifestId: artifact.manifestId,
      familyId: 'synthetic-family',
      checkpointId: `synthetic-checkpoint-${index + 1}`,
      variantId: artifact.manifestId,
      displayName: artifact.displayName ?? artifact.manifestId,
      immutableRevision: `sha256:${String(index + 1).repeat(64).slice(0, 64)}`,
      files: artifact.files.map((file) => ({
        path: file.path,
        role: file.role,
        format: file.format,
        sizeBytes: file.bytes.byteLength,
        sha256: createHash('sha256').update(file.bytes).digest('hex')
      })),
      requiredAcknowledgements: [{
        id: ACKNOWLEDGEMENT,
        kind: 'license',
        label: 'Synthetic fixture license'
      }]
    }))
  }
  const admission = createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: payload.catalogId,
      keyId: payload.keyId,
      publicKeySpkiBase64: publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    }],
    nowEpochMs: () => now
  })
  const decision = admission.admit({
    catalogId: payload.catalogId,
    keyId: payload.keyId,
    payload,
    signatureBase64: signCanonical(privateKey, payload)
  })
  assert.equal(decision.kind, 'admitted')
  if (decision.kind !== 'admitted') throw new Error('Expected a signed fixture Catalog.')
  return decision.catalog
}

function signCanonical(privateKey: KeyObject, payload: unknown): string {
  return sign(null, Buffer.from(canonicalJson(payload), 'utf8'), privateKey).toString('base64')
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Unsupported fixture value.')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function assertPathFree(value: unknown, privateRoot: string): void {
  const serialized = JSON.stringify(value)
  assert.doesNotMatch(serialized, PATH_FREE_PATTERN)
  assert.equal(serialized.includes(privateRoot), false)
}
