import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createInMemoryModelCatalogAdmissionTracer } from
  '../src/main/model-library/model-catalog-admission.tracer'
import type { ModelArtifactByteSource, ModelArtifactSourceEntry } from
  '../src/main/model-library/transactional-model-library.tracer'
import { createModelStorageAuthorityTracer } from
  '../src/main/model-library/model-storage-authority.tracer'
import { openModelStorageRootRegistryTracer } from
  '../src/main/model-library/model-storage-root-registry.tracer'

const FIXED_PUBLIC_KEY_SPKI_BASE64 =
  'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
const FIXED_SIGNATURE_BASE64 =
  'FzC6cDw2vQnwCI57JMirmQUR1b8+qV+DvbFYebmDt6TJp10DH7ERYO8B85PRiKg8SsPDWYQFjOQoWm1tLDa7BA=='
const fixedPayload = {
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
    immutableRevision:
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
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

if (process.argv[2] === '--child-first-selection') {
  await participateInConcurrentFirstSelection(
    process.argv[3],
    process.argv[4],
    process.argv[5],
    process.argv[6]
  )
} else {
  await reviewingAFirstRootCandidateDoesNotConfigureTheRegistry()
  await selectingAFirstRootReopensItAcrossRegistryInstances()
  await reconnectingTheSameStorageIdentityKeepsItsRegistration()
  await aDifferentStorageIdentityRequiresMigrationAndCannotBeForcedCurrent()
  await offlineCurrentRemainsRegisteredAndRecovers()
  await forgedAndStaleReviewsFailBeforeAuthorityWork()
  await oneRegistryInstanceOwnsAtMostOneLiveSession()
  await replacementAtSameLocatorIsWrongIdentityNotARebind()
  await busyCurrentRemainsRegisteredUntilWriterCloses()
  await authorityFailureStatesRemainDistinctAndRegistered()
  await registryOwnStoreFailureStatesStayDistinct()
  await independentProcessesPublishOnlyOneFirstSelection()
  await blockedRecoveryObservationRemainsRegisteredAndCanRecover()
  console.log('model-library-root-registry-tracer passed')
}

async function reviewingAFirstRootCandidateDoesNotConfigureTheRegistry(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-registry-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:registry-first-review'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected a provisioned task-temporary root.')

    const tracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const candidate = tracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })

    const empty = {
      ok: true,
      value: {
        revision: 0,
        current: { state: 'not-configured' }
      }
    }
    assert.deepEqual(await tracer.registry.summarize({ kind: 'registry' }), empty)

    const reviewed = await tracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(reviewed.ok, true)
    if (!reviewed.ok) throw new Error('Expected a reviewable first Model Storage Root.')
    const { fingerprint, ...reviewProjection } = reviewed.value
    assert.deepEqual(reviewProjection, {
      state: 'confirmable',
      effect: 'select-first-root',
      consequences: {
        movesModelBytes: false,
        deletesModelBytes: false,
        performsMigration: false,
        activatesModel: false,
        startsRuntime: false,
        startsInference: false
      }
    })
    assert.match(fingerprint, /^model-storage-root-review:[a-f0-9]{64}$/)
    assert.equal(JSON.stringify(reviewed).includes(modelStorageDirectory), false)

    assert.deepEqual(
      await tracer.registry.summarize({ kind: 'registry' }),
      empty,
      'Reviewing a candidate must not select it or mutate the durable Registry.'
    )
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function selectingAFirstRootReopensItAcrossRegistryInstances(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-selection-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:registry-first-selection'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected a provisioned selection root.')

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    assert.deepEqual(await firstTracer.registry.open({ kind: 'current' }), {
      ok: false,
      error: {
        code: 'CURRENT_STORAGE_NOT_CONFIGURED',
        retry: 'after-user-action'
      }
    })

    const candidate = firstTracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })
    const review = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(review.ok, true)
    if (!review.ok || review.value.state !== 'confirmable') {
      throw new Error('Expected a confirmable first-root review.')
    }

    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate,
      reviewFingerprint: review.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok) throw new Error('Expected the exact reviewed root to be selected.')
    assert.equal(selected.value.disposition, 'selected-first-root')
    assert.equal(selected.value.summary.revision, 1)
    assert.equal(selected.value.summary.current.state, 'configured')
    if (selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected a configured Model Storage Root registration.')
    }
    const registration = selected.value.summary.current.registration
    assert.equal(typeof registration, 'string')
    assert.notEqual(registration.length, 0)
    assert.equal(selected.value.summary.current.condition, 'available')
    assert.equal(JSON.stringify(selected).includes(taskRoot), false)
    assert.doesNotMatch(
      JSON.stringify(selected),
      /rootDirectory|controlDirectory|filePath|sqlite|identity/i
    )

    const selectedLibrary = selected.value.session.library
    const selectedCatalogSummary = await selectedLibrary.summarize({ kind: 'library' })
    assert.equal(selectedCatalogSummary.ok, true)
    if (!selectedCatalogSummary.ok) throw new Error('Expected selected Catalog summary.')
    assert.equal(selectedCatalogSummary.value.artifacts.length, 1)
    assert.equal(selectedCatalogSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')

    await selected.value.session.close()
    await selected.value.session.close()
    assert.deepEqual(await selectedLibrary.summarize({ kind: 'library' }), {
      ok: false,
      error: {
        code: 'STORAGE_AUTHORITY_LOST',
        retry: 'after-user-action'
      }
    })

    const reopenedTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const reopened = await reopenedTracer.registry.open({ kind: 'current' })
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected the configured root to reopen.')
    assert.equal(reopened.value.disposition, 'opened-current')
    assert.deepEqual(reopened.value.summary, {
      revision: 1,
      current: {
        state: 'configured',
        registration,
        condition: 'available'
      }
    })
    assert.equal(JSON.stringify(reopened).includes(taskRoot), false)

    const reopenedCatalogSummary = await reopened.value.session.library.summarize({
      kind: 'library'
    })
    assert.deepEqual(reopenedCatalogSummary, selectedCatalogSummary)
    await reopened.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function reconnectingTheSameStorageIdentityKeepsItsRegistration(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-reconnect-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const firstStorageDirectory = path.join(taskRoot, 'model-storage-a')
  const relocatedStorageDirectory = path.join(taskRoot, 'model-storage-relocated')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(firstStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: firstStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:registry-reconnect'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected reconnect root provisioning.')

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const firstCandidate = firstTracer.createCandidate({
      rootDirectory: firstStorageDirectory,
      root: provisioned.value.root
    })
    const firstReview = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate: firstCandidate
    })
    assert.equal(firstReview.ok, true)
    if (!firstReview.ok || firstReview.value.state !== 'confirmable') {
      throw new Error('Expected a confirmable initial-root review.')
    }
    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: firstCandidate,
      reviewFingerprint: firstReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected the initial root registration.')
    }
    const registration = selected.value.summary.current.registration
    await selected.value.session.close()

    await fs.rename(firstStorageDirectory, relocatedStorageDirectory)

    const reconnectTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const relocatedCandidate = reconnectTracer.createCandidate({
      rootDirectory: relocatedStorageDirectory,
      root: provisioned.value.root
    })
    const selectedSummary = {
      revision: 1,
      current: {
        state: 'configured' as const,
        registration,
        condition: 'available' as const
      }
    }
    assert.deepEqual(
      await reconnectTracer.registry.summarize({ kind: 'registry' }),
      { ok: true, value: selectedSummary }
    )

    const reconnectReview = await reconnectTracer.registry.summarize({
      kind: 'candidate',
      candidate: relocatedCandidate
    })
    assert.equal(reconnectReview.ok, true)
    if (!reconnectReview.ok) throw new Error('Expected a same-identity reconnect review.')
    const { fingerprint, ...reviewProjection } = reconnectReview.value
    assert.deepEqual(reviewProjection, {
      state: 'confirmable',
      effect: 'reconnect-current-root',
      consequences: {
        movesModelBytes: false,
        deletesModelBytes: false,
        performsMigration: false,
        activatesModel: false,
        startsRuntime: false,
        startsInference: false
      }
    })
    assert.match(fingerprint, /^model-storage-root-review:[a-f0-9]{64}$/)
    assert.equal(JSON.stringify(reconnectReview).includes(taskRoot), false)
    assert.deepEqual(
      await reconnectTracer.registry.summarize({ kind: 'registry' }),
      { ok: true, value: selectedSummary },
      'Reviewing a relocated same-identity root must not mutate the Registry.'
    )

    const reconnected = await reconnectTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: relocatedCandidate,
      reviewFingerprint: fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(reconnected.ok, true, JSON.stringify(reconnected))
    if (!reconnected.ok) throw new Error('Expected same-identity reconnect.')
    assert.equal(reconnected.value.disposition, 'reconnected-current-root')
    const reconnectedSummary = {
      revision: 2,
      current: {
        state: 'configured' as const,
        registration,
        condition: 'available' as const
      }
    }
    assert.deepEqual(reconnected.value.summary, reconnectedSummary)
    assert.equal(JSON.stringify(reconnected).includes(taskRoot), false)
    const reconnectedCatalog = await reconnected.value.session.library.summarize({
      kind: 'library'
    })
    assert.equal(reconnectedCatalog.ok, true)
    if (!reconnectedCatalog.ok) throw new Error('Expected reconnected Catalog summary.')
    assert.equal(reconnectedCatalog.value.artifacts[0].lifecycle.kind, 'catalog-only')
    await reconnected.value.session.close()

    const restartedTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const restarted = await restartedTracer.registry.open({ kind: 'current' })
    assert.equal(restarted.ok, true, JSON.stringify(restarted))
    if (!restarted.ok) throw new Error('Expected the reconnected root to reopen.')
    assert.equal(restarted.value.disposition, 'opened-current')
    assert.deepEqual(restarted.value.summary, reconnectedSummary)
    assert.equal(JSON.stringify(restarted).includes(taskRoot), false)
    await restarted.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function aDifferentStorageIdentityRequiresMigrationAndCannotBeForcedCurrent(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-migration-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const firstStorageDirectory = path.join(taskRoot, 'model-storage-a')
  const otherStorageDirectory = path.join(taskRoot, 'model-storage-b')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(firstStorageDirectory)
  await fs.mkdir(otherStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const firstAuthority = createModelStorageAuthorityTracer({
      rootDirectory: firstStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:migration-a'
    })
    const otherAuthority = createModelStorageAuthorityTracer({
      rootDirectory: otherStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:migration-b'
    })
    const firstProvisioned = await firstAuthority.authority.provision(firstAuthority.target)
    const otherProvisioned = await otherAuthority.authority.provision(otherAuthority.target)
    assert.equal(firstProvisioned.ok, true)
    assert.equal(otherProvisioned.ok, true)
    if (!firstProvisioned.ok || !otherProvisioned.ok) {
      throw new Error('Expected two independently provisioned roots.')
    }

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const firstCandidate = firstTracer.createCandidate({
      rootDirectory: firstStorageDirectory,
      root: firstProvisioned.value.root
    })
    const firstReview = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate: firstCandidate
    })
    assert.equal(firstReview.ok, true)
    if (!firstReview.ok || firstReview.value.state !== 'confirmable') {
      throw new Error('Expected the first root review.')
    }
    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: firstCandidate,
      reviewFingerprint: firstReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected the first root selection.')
    }
    const registration = selected.value.summary.current.registration
    await selected.value.session.close()

    const otherTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const otherCandidate = otherTracer.createCandidate({
      rootDirectory: otherStorageDirectory,
      root: otherProvisioned.value.root
    })
    const unchangedSummary = {
      revision: 1,
      current: {
        state: 'configured' as const,
        registration,
        condition: 'available' as const
      }
    }
    const beforeReview = await otherTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(beforeReview, { ok: true, value: unchangedSummary })

    const blockedReview = await otherTracer.registry.summarize({
      kind: 'candidate',
      candidate: otherCandidate
    })
    assert.deepEqual(blockedReview, {
      ok: true,
      value: {
        state: 'blocked',
        reasons: ['MIGRATION_REQUIRED']
      }
    })
    const afterReview = await otherTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(afterReview, beforeReview)

    const forcedSelection = await otherTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: otherCandidate,
      reviewFingerprint: `model-storage-root-review:${'a'.repeat(64)}`,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(forcedSelection, {
      ok: false,
      error: {
        code: 'SELECTION_REVIEW_REQUIRED',
        retry: 'review-again'
      }
    })
    assert.deepEqual(
      await otherTracer.registry.summarize({ kind: 'registry' }),
      beforeReview,
      'A forged review must not change the current registration.'
    )

    const current = await otherTracer.registry.open({ kind: 'current' })
    assert.equal(current.ok, true, JSON.stringify(current))
    if (!current.ok) throw new Error('Expected the original root to remain current.')
    assert.equal(current.value.disposition, 'opened-current')
    assert.deepEqual(current.value.summary, unchangedSummary)
    const currentCatalog = await current.value.session.library.summarize({ kind: 'library' })
    assert.equal(currentCatalog.ok, true)
    if (!currentCatalog.ok) throw new Error('Expected the original root Catalog summary.')
    assert.equal(currentCatalog.value.artifacts[0].lifecycle.kind, 'catalog-only')

    for (const result of [
      beforeReview,
      blockedReview,
      afterReview,
      forcedSelection,
      current
    ]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite|identity/i
      )
    }
    await current.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function offlineCurrentRemainsRegisteredAndRecovers(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-offline-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage-a')
  const displacedStorageDirectory = path.join(taskRoot, 'model-storage-displaced')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:offline-recovery'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected offline-recovery root provisioning.')

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const candidate = firstTracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })
    const review = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(review.ok, true)
    if (!review.ok || review.value.state !== 'confirmable') {
      throw new Error('Expected the offline-recovery root review.')
    }
    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate,
      reviewFingerprint: review.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected the offline-recovery root selection.')
    }
    const registration = selected.value.summary.current.registration
    const availableSummary = {
      revision: 1,
      current: {
        state: 'configured' as const,
        registration,
        condition: 'available' as const
      }
    }
    assert.deepEqual(selected.value.summary, availableSummary)
    await selected.value.session.close()

    await fs.rename(modelStorageDirectory, displacedStorageDirectory)

    const offlineTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const unavailable = await offlineTracer.registry.open({ kind: 'current' })
    assert.deepEqual(unavailable, {
      ok: false,
      error: {
        code: 'STORAGE_UNAVAILABLE',
        retry: 'after-user-action'
      }
    })
    const retained = await offlineTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(retained, {
      ok: true,
      value: {
        revision: 1,
        current: {
          state: 'configured',
          registration,
          condition: 'unavailable'
        }
      }
    })

    await fs.rename(displacedStorageDirectory, modelStorageDirectory)

    const recovered = await offlineTracer.registry.open({ kind: 'current' })
    assert.equal(recovered.ok, true, JSON.stringify(recovered))
    if (!recovered.ok) throw new Error('Expected the restored current root to reopen.')
    assert.equal(recovered.value.disposition, 'opened-current')
    assert.deepEqual(recovered.value.summary, availableSummary)
    const recoveredCatalog = await recovered.value.session.library.summarize({
      kind: 'library'
    })
    assert.equal(recoveredCatalog.ok, true)
    if (!recoveredCatalog.ok) throw new Error('Expected the recovered Catalog summary.')
    assert.equal(recoveredCatalog.value.artifacts[0].lifecycle.kind, 'catalog-only')

    for (const result of [unavailable, retained, recovered]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite|identity/i
      )
    }
    await recovered.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function forgedAndStaleReviewsFailBeforeAuthorityWork(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-reviews-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const firstStorageDirectory = path.join(taskRoot, 'model-storage-a')
  const otherStorageDirectory = path.join(taskRoot, 'model-storage-b')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(firstStorageDirectory)
  await fs.mkdir(otherStorageDirectory)

  let sourceReads = 0
  const guardedSource: ModelArtifactByteSource = {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      sourceReads += 1
      throw new Error('Review validation must finish before acquiring model bytes.')
    }
  }

  try {
    const catalog = admitGeneratedCatalog()
    const firstAuthority = createModelStorageAuthorityTracer({
      rootDirectory: firstStorageDirectory,
      catalog,
      byteSource: guardedSource,
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:review-validation-a'
    })
    const otherAuthority = createModelStorageAuthorityTracer({
      rootDirectory: otherStorageDirectory,
      catalog,
      byteSource: guardedSource,
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:review-validation-b'
    })
    const firstProvisioned = await firstAuthority.authority.provision(firstAuthority.target)
    const otherProvisioned = await otherAuthority.authority.provision(otherAuthority.target)
    assert.equal(firstProvisioned.ok, true)
    assert.equal(otherProvisioned.ok, true)
    if (!firstProvisioned.ok || !otherProvisioned.ok) {
      throw new Error('Expected review-validation root provisioning.')
    }

    const tracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: guardedSource,
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const firstCandidate = tracer.createCandidate({
      rootDirectory: firstStorageDirectory,
      root: firstProvisioned.value.root
    })
    const sameIdentityCandidate = tracer.createCandidate({
      rootDirectory: firstStorageDirectory,
      root: firstProvisioned.value.root
    })
    const otherCandidate = tracer.createCandidate({
      rootDirectory: otherStorageDirectory,
      root: otherProvisioned.value.root
    })
    const emptySummary = {
      ok: true as const,
      value: {
        revision: 0,
        current: { state: 'not-configured' as const }
      }
    }
    assert.deepEqual(await tracer.registry.summarize({ kind: 'registry' }), emptySummary)

    const foreignCandidateReview = await tracer.registry.summarize({
      kind: 'candidate',
      candidate: Object.freeze({}) as never
    })
    assert.deepEqual(foreignCandidateReview, {
      ok: false,
      error: {
        code: 'CANDIDATE_INVALID',
        retry: 'not-retryable'
      }
    })
    const copiedCandidate = Object.freeze({ ...firstCandidate }) as never
    const copiedCandidateOpen = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: copiedCandidate,
      reviewFingerprint: `model-storage-root-review:${'c'.repeat(64)}`,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(copiedCandidateOpen, {
      ok: false,
      error: {
        code: 'CANDIDATE_INVALID',
        retry: 'not-retryable'
      }
    })
    assert.deepEqual(await tracer.registry.summarize({ kind: 'registry' }), emptySummary)

    const unissuedReview = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: firstCandidate,
      reviewFingerprint: `model-storage-root-review:${'b'.repeat(64)}`,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(unissuedReview, {
      ok: false,
      error: {
        code: 'SELECTION_REVIEW_REQUIRED',
        retry: 'review-again'
      }
    })
    assert.deepEqual(await tracer.registry.summarize({ kind: 'registry' }), emptySummary)

    const firstReview = await tracer.registry.summarize({
      kind: 'candidate',
      candidate: firstCandidate
    })
    assert.equal(firstReview.ok, true)
    if (!firstReview.ok || firstReview.value.state !== 'confirmable') {
      throw new Error('Expected an issued first-root review.')
    }
    const sameIdentityReview = await tracer.registry.summarize({
      kind: 'candidate',
      candidate: sameIdentityCandidate
    })
    assert.equal(sameIdentityReview.ok, true)
    if (!sameIdentityReview.ok || sameIdentityReview.value.state !== 'confirmable') {
      throw new Error('Expected the second same-identity candidate to be reviewable.')
    }
    assert.notEqual(
      sameIdentityReview.value.fingerprint,
      firstReview.value.fingerprint,
      'Each issued review must remain bound to exactly one candidate capability.'
    )
    const mismatchedReview = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: otherCandidate,
      reviewFingerprint: firstReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(mismatchedReview, {
      ok: false,
      error: {
        code: 'SELECTION_REVIEW_REQUIRED',
        retry: 'review-again'
      }
    })
    assert.deepEqual(await tracer.registry.summarize({ kind: 'registry' }), emptySummary)

    const selected = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: firstCandidate,
      reviewFingerprint: firstReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok) throw new Error('Expected exact first-root review selection.')
    const configuredSummary = selected.value.summary
    assert.equal(configuredSummary.revision, 1)
    assert.equal(configuredSummary.current.state, 'configured')
    await selected.value.session.close()

    const staleReplay = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: firstCandidate,
      reviewFingerprint: firstReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(staleReplay, {
      ok: false,
      error: {
        code: 'SELECTION_REVIEW_STALE',
        retry: 'review-again'
      }
    })
    const sameIdentityReviewAfterSelection = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: sameIdentityCandidate,
      reviewFingerprint: sameIdentityReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.deepEqual(sameIdentityReviewAfterSelection, {
      ok: false,
      error: {
        code: 'SELECTION_REVIEW_STALE',
        retry: 'review-again'
      }
    })
    assert.deepEqual(
      await tracer.registry.summarize({ kind: 'registry' }),
      { ok: true, value: configuredSummary }
    )

    const otherReview = await tracer.registry.summarize({
      kind: 'candidate',
      candidate: otherCandidate
    })
    assert.deepEqual(otherReview, {
      ok: true,
      value: {
        state: 'blocked',
        reasons: ['MIGRATION_REQUIRED']
      }
    })
    assert.deepEqual(
      await tracer.registry.summarize({ kind: 'registry' }),
      { ok: true, value: configuredSummary }
    )

    const current = await tracer.registry.open({ kind: 'current' })
    assert.equal(current.ok, true, JSON.stringify(current))
    if (!current.ok) throw new Error('Expected current-root open after rejected reviews.')
    assert.deepEqual(current.value.summary, configuredSummary)
    assert.equal(sourceReads, 0)

    for (const result of [
      foreignCandidateReview,
      copiedCandidateOpen,
      unissuedReview,
      mismatchedReview,
      staleReplay,
      sameIdentityReviewAfterSelection,
      otherReview,
      current
    ]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite|identity/i
      )
    }
    await current.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function oneRegistryInstanceOwnsAtMostOneLiveSession(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-session-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  let sourceReads = 0
  const guardedSource: ModelArtifactByteSource = {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      sourceReads += 1
      throw new Error('Session ownership must not acquire model bytes.')
    }
  }

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: guardedSource,
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:single-live-session'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected session-ownership root provisioning.')

    const tracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: guardedSource,
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const candidate = tracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })
    const review = await tracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(review.ok, true)
    if (!review.ok || review.value.state !== 'confirmable') {
      throw new Error('Expected session-ownership root review.')
    }
    const selected = await tracer.registry.open({
      kind: 'select-reviewed-root',
      candidate,
      reviewFingerprint: review.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok) throw new Error('Expected the first live Registry session.')

    const secondWhileLive = await tracer.registry.open({ kind: 'current' })
    assert.deepEqual(secondWhileLive, {
      ok: false,
      error: {
        code: 'CURRENT_SESSION_ACTIVE',
        retry: 'after-session-closes'
      }
    })
    assert.equal(JSON.stringify(secondWhileLive).includes(taskRoot), false)

    const oldLibrary = selected.value.session.library
    await selected.value.session.close()
    await selected.value.session.close()
    assert.deepEqual(await oldLibrary.summarize({ kind: 'library' }), {
      ok: false,
      error: {
        code: 'STORAGE_AUTHORITY_LOST',
        retry: 'after-user-action'
      }
    })

    const reopened = await tracer.registry.open({ kind: 'current' })
    assert.equal(reopened.ok, true, JSON.stringify(reopened))
    if (!reopened.ok) throw new Error('Expected open after the live session closes.')
    assert.equal(reopened.value.disposition, 'opened-current')
    assert.deepEqual(reopened.value.summary, selected.value.summary)
    assert.equal(JSON.stringify(reopened).includes(taskRoot), false)
    assert.equal(sourceReads, 0)
    await reopened.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function replacementAtSameLocatorIsWrongIdentityNotARebind(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-replaced-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const selectedStorageDirectory = path.join(taskRoot, 'model-storage')
  const displacedSelectedDirectory = path.join(taskRoot, 'selected-displaced')
  const displacedReplacementDirectory = path.join(taskRoot, 'replacement-displaced')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(selectedStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const selectedAuthority = createModelStorageAuthorityTracer({
      rootDirectory: selectedStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:same-locator-a'
    })
    const selectedProvisioned = await selectedAuthority.authority.provision(
      selectedAuthority.target
    )
    assert.equal(selectedProvisioned.ok, true)
    if (!selectedProvisioned.ok) throw new Error('Expected selected-root provisioning.')

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const selectedCandidate = firstTracer.createCandidate({
      rootDirectory: selectedStorageDirectory,
      root: selectedProvisioned.value.root
    })
    const review = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate: selectedCandidate
    })
    assert.equal(review.ok, true)
    if (!review.ok || review.value.state !== 'confirmable') {
      throw new Error('Expected same-locator selected-root review.')
    }
    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate: selectedCandidate,
      reviewFingerprint: review.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected same-locator selected-root registration.')
    }
    const registration = selected.value.summary.current.registration
    const availableSummary = {
      revision: 1,
      current: {
        state: 'configured' as const,
        registration,
        condition: 'available' as const
      }
    }
    assert.deepEqual(selected.value.summary, availableSummary)
    await selected.value.session.close()

    await fs.rename(selectedStorageDirectory, displacedSelectedDirectory)
    await fs.mkdir(selectedStorageDirectory)
    const replacementAuthority = createModelStorageAuthorityTracer({
      rootDirectory: selectedStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:same-locator-b'
    })
    const replacementProvisioned = await replacementAuthority.authority.provision(
      replacementAuthority.target
    )
    assert.equal(replacementProvisioned.ok, true)
    if (!replacementProvisioned.ok) throw new Error('Expected replacement-root provisioning.')

    const replacementTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const wrongIdentity = await replacementTracer.registry.open({ kind: 'current' })
    assert.deepEqual(wrongIdentity, {
      ok: false,
      error: {
        code: 'WRONG_STORAGE_IDENTITY',
        retry: 'not-retryable'
      }
    })
    const retained = await replacementTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(retained, {
      ok: true,
      value: {
        revision: 1,
        current: {
          state: 'configured',
          registration,
          condition: 'wrong-identity'
        }
      }
    })

    await fs.rename(selectedStorageDirectory, displacedReplacementDirectory)
    await fs.rename(displacedSelectedDirectory, selectedStorageDirectory)

    const restored = await replacementTracer.registry.open({ kind: 'current' })
    assert.equal(restored.ok, true, JSON.stringify(restored))
    if (!restored.ok) throw new Error('Expected the restored selected root to open.')
    assert.equal(restored.value.disposition, 'opened-current')
    assert.deepEqual(restored.value.summary, availableSummary)
    const restoredCatalog = await restored.value.session.library.summarize({
      kind: 'library'
    })
    assert.equal(restoredCatalog.ok, true)
    if (!restoredCatalog.ok) throw new Error('Expected restored selected-root Catalog.')
    assert.equal(restoredCatalog.value.artifacts[0].lifecycle.kind, 'catalog-only')

    for (const result of [wrongIdentity, retained, restored]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite/i
      )
    }
    await restored.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function busyCurrentRemainsRegisteredUntilWriterCloses(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-busy-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  try {
    const catalog = admitGeneratedCatalog()
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:busy-current'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected busy-current root provisioning.')

    const firstTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const candidate = firstTracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })
    const review = await firstTracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(review.ok, true)
    if (!review.ok || review.value.state !== 'confirmable') {
      throw new Error('Expected busy-current root review.')
    }
    const selected = await firstTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate,
      reviewFingerprint: review.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected busy-current root selection.')
    }
    const registration = selected.value.summary.current.registration
    await selected.value.session.close()

    const holderAuthority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: mustNotCreate('storage identity')
    })
    const holder = await holderAuthority.authority.open(provisioned.value.root)
    assert.equal(holder.ok, true)
    if (!holder.ok) throw new Error('Expected an independent writer holder.')

    const busyTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const busy = await busyTracer.registry.open({ kind: 'current' })
    assert.deepEqual(busy, {
      ok: false,
      error: {
        code: 'STORAGE_BUSY',
        retry: 'after-session-closes'
      }
    })
    const retained = await busyTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(retained, {
      ok: true,
      value: {
        revision: 1,
        current: {
          state: 'configured',
          registration,
          condition: 'busy'
        }
      }
    })

    await holder.value.session.close()

    const reopened = await busyTracer.registry.open({ kind: 'current' })
    assert.equal(reopened.ok, true, JSON.stringify(reopened))
    if (!reopened.ok) throw new Error('Expected current-root open after writer close.')
    assert.equal(reopened.value.disposition, 'opened-current')
    assert.deepEqual(reopened.value.summary, {
      revision: 1,
      current: {
        state: 'configured',
        registration,
        condition: 'available'
      }
    })

    for (const result of [busy, retained, reopened]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite|identity/i
      )
    }
    await reopened.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function authorityFailureStatesRemainDistinctAndRegistered(): Promise<void> {
  const scenarios = [{
    fixture: 'authority-sqlite-read-only' as const,
    errorCode: 'STORAGE_READ_ONLY' as const,
    condition: 'read-only' as const
  }, {
    fixture: 'authority-schema-v2' as const,
    errorCode: 'STORAGE_SCHEMA_UNSUPPORTED' as const,
    condition: 'schema-unsupported' as const
  }, {
    fixture: 'authority-integrity-invalid' as const,
    errorCode: 'STORAGE_INTEGRITY_FAILED' as const,
    condition: 'integrity-failed' as const
  }]

  for (const scenario of scenarios) {
    const taskRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `dam-model-root-${scenario.condition}-`)
    )
    const registryControlDirectory = path.join(taskRoot, 'registry-control')
    const modelStorageDirectory = path.join(taskRoot, 'model-storage')
    const displacedStorageDirectory = path.join(taskRoot, 'healthy-displaced')
    await fs.mkdir(registryControlDirectory)
    await fs.mkdir(modelStorageDirectory)

    try {
      const catalog = admitGeneratedCatalog()
      const storageIdentity = `model-storage-root:authority-state-${scenario.condition}`
      const healthyAuthority = createModelStorageAuthorityTracer({
        rootDirectory: modelStorageDirectory,
        catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        createStorageIdentity: () => storageIdentity
      })
      const healthyProvisioned = await healthyAuthority.authority.provision(
        healthyAuthority.target
      )
      assert.equal(healthyProvisioned.ok, true)
      if (!healthyProvisioned.ok) throw new Error('Expected healthy root provisioning.')

      const firstTracer = await openModelStorageRootRegistryTracer({
        controlDirectory: registryControlDirectory,
        catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record')
      })
      const candidate = firstTracer.createCandidate({
        rootDirectory: modelStorageDirectory,
        root: healthyProvisioned.value.root
      })
      const review = await firstTracer.registry.summarize({
        kind: 'candidate',
        candidate
      })
      assert.equal(review.ok, true)
      if (!review.ok || review.value.state !== 'confirmable') {
        throw new Error('Expected healthy authority-state review.')
      }
      const selected = await firstTracer.registry.open({
        kind: 'select-reviewed-root',
        candidate,
        reviewFingerprint: review.value.fingerprint,
        decision: 'make-reviewed-model-storage-root-current'
      })
      assert.equal(selected.ok, true, JSON.stringify(selected))
      if (!selected.ok || selected.value.summary.current.state !== 'configured') {
        throw new Error('Expected healthy authority-state selection.')
      }
      const registration = selected.value.summary.current.registration
      await selected.value.session.close()

      await fs.rename(modelStorageDirectory, displacedStorageDirectory)
      await fs.mkdir(modelStorageDirectory)
      const replacementAuthority = createModelStorageAuthorityTracer({
        rootDirectory: modelStorageDirectory,
        catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        createStorageIdentity: () => storageIdentity,
        tracerOnlyProvisionedState: scenario.fixture
      })
      const replacementProvisioned = await replacementAuthority.authority.provision(
        replacementAuthority.target
      )
      assert.equal(replacementProvisioned.ok, true)
      if (!replacementProvisioned.ok) {
        throw new Error('Expected authority-state replacement provisioning.')
      }

      const failureTracer = await openModelStorageRootRegistryTracer({
        controlDirectory: registryControlDirectory,
        catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record')
      })
      const failure = await failureTracer.registry.open({ kind: 'current' })
      if (failure.ok) await failure.value.session.close()
      assert.deepEqual(failure, {
        ok: false,
        error: {
          code: scenario.errorCode,
          retry: 'after-user-action'
        }
      })
      const retained = await failureTracer.registry.summarize({ kind: 'registry' })
      assert.deepEqual(retained, {
        ok: true,
        value: {
          revision: 1,
          current: {
            state: 'configured',
            registration,
            condition: scenario.condition
          }
        }
      })

      for (const result of [failure, retained]) {
        const serialized = JSON.stringify(result)
        assert.equal(serialized.includes(taskRoot), false)
        assert.doesNotMatch(
          serialized,
          /rootDirectory|controlDirectory|filePath|sqlite|identity/i
        )
      }
    } finally {
      await fs.rm(taskRoot, { recursive: true, force: true })
    }
  }
}

async function blockedRecoveryObservationRemainsRegisteredAndCanRecover(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-root-recovery-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const modelStorageDirectory = path.join(taskRoot, 'model-storage')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(modelStorageDirectory)

  const createSafeTensorsFixture = (lastByte: number): Uint8Array => {
    const headerValue = JSON.stringify({
      weight: { dtype: 'F32', shape: [1], data_offsets: [0, 4] }
    })
    const padding = ' '.repeat((8 - Buffer.byteLength(headerValue, 'utf8') % 8) % 8)
    const header = Buffer.from(`${headerValue}${padding}`, 'utf8')
    const prefix = Buffer.alloc(8)
    prefix.writeBigUInt64LE(BigInt(header.byteLength), 0)
    return Buffer.concat([prefix, header, Buffer.from([0, 0, 128, lastByte])])
  }
  const admitRecoveryCatalog = (manifestId: string, bytes: Uint8Array) => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const payload = {
      schemaVersion: 1,
      catalogId: 'root-registry-recovery-catalog',
      keyId: 'root-registry-recovery-key',
      sequence: '1',
      trustVerifiedAt: '2026-08-13T00:00:00.000Z',
      artifacts: [{
        manifestId,
        familyId: 'root-registry-recovery-family',
        checkpointId: 'root-registry-recovery-checkpoint',
        variantId: 'root-registry-recovery-variant',
        displayName: 'Root Registry Recovery Synthetic Model',
        immutableRevision: `sha256:${'6'.repeat(64)}`,
        files: [{
          path: 'weights/model.safetensors',
          role: 'weights',
          format: 'safetensors',
          sizeBytes: bytes.byteLength,
          sha256: createHash('sha256').update(bytes).digest('hex')
        }],
        requiredAcknowledgements: []
      }]
    }
    const admission = createInMemoryModelCatalogAdmissionTracer({
      trustRoots: [{
        catalogId: payload.catalogId,
        keyId: payload.keyId,
        publicKeySpkiBase64: publicKey.export({
          format: 'der',
          type: 'spki'
        }).toString('base64')
      }],
      nowEpochMs: () => Date.parse('2026-08-13T12:00:00.000Z')
    })
    const decision = admission.admit({
      catalogId: payload.catalogId,
      keyId: payload.keyId,
      payload,
      signatureBase64: sign(
        null,
        Buffer.from(canonicalJson(payload), 'utf8'),
        privateKey
      ).toString('base64')
    })
    assert.equal(decision.kind, 'admitted')
    if (decision.kind !== 'admitted') throw new Error('Expected recovery Catalog admission.')
    return decision.catalog
  }
  const sourceFor = (bytes: Uint8Array): ModelArtifactByteSource => ({
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      async function* chunks(): AsyncIterable<Uint8Array> {
        yield bytes
      }
      yield { relativePath: 'weights/model.safetensors', bytes: chunks() }
    }
  })

  try {
    const installedBytes = createSafeTensorsFixture(63)
    const installedManifestId = 'root-registry-recovery-a@2026-08'
    const installedCatalog = admitRecoveryCatalog(installedManifestId, installedBytes)
    const authority = createModelStorageAuthorityTracer({
      rootDirectory: modelStorageDirectory,
      catalog: installedCatalog,
      byteSource: sourceFor(installedBytes),
      createActivityId: () => 'root-registry-recovery-activity',
      createStorageRecordId: () => 'root-registry-recovery-storage',
      createStorageIdentity: () => 'model-storage-root:registry-recovery'
    })
    const provisioned = await authority.authority.provision(authority.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected recovery root provisioning.')

    const selectingTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog: installedCatalog,
      byteSource: sourceFor(installedBytes),
      createActivityId: () => 'root-registry-recovery-activity',
      createStorageRecordId: () => 'root-registry-recovery-storage'
    })
    const candidate = selectingTracer.createCandidate({
      rootDirectory: modelStorageDirectory,
      root: provisioned.value.root
    })
    const rootReview = await selectingTracer.registry.summarize({
      kind: 'candidate',
      candidate
    })
    assert.equal(rootReview.ok, true)
    if (!rootReview.ok || rootReview.value.state !== 'confirmable') {
      throw new Error('Expected a confirmable recovery-root review.')
    }
    const selected = await selectingTracer.registry.open({
      kind: 'select-reviewed-root',
      candidate,
      reviewFingerprint: rootReview.value.fingerprint,
      decision: 'make-reviewed-model-storage-root-current'
    })
    assert.equal(selected.ok, true, JSON.stringify(selected))
    if (!selected.ok || selected.value.summary.current.state !== 'configured') {
      throw new Error('Expected recovery-root selection.')
    }
    const registration = selected.value.summary.current.registration
    const artifact = {
      catalogId: 'root-registry-recovery-catalog',
      manifestId: installedManifestId
    }
    const artifactSummary = await selected.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(artifactSummary.ok, true)
    if (!artifactSummary.ok) throw new Error('Expected a recovery artifact review.')
    const artifactReview = artifactSummary.value.artifacts[0].review
    assert.equal(artifactReview.state, 'confirmable')
    if (artifactReview.state !== 'confirmable') {
      throw new Error('Expected a confirmable recovery artifact review.')
    }
    const installed = await selected.value.session.library.install({
      artifact,
      reviewFingerprint: artifactReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: []
    })
    assert.equal(installed.ok, true, JSON.stringify(installed))
    await selected.value.session.close()

    const incompatibleBytes = createSafeTensorsFixture(62)
    const incompatibleCatalog = admitRecoveryCatalog(
      'root-registry-recovery-b@2026-08',
      incompatibleBytes
    )
    const incompatibleTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog: incompatibleCatalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const blocked = await incompatibleTracer.registry.open({ kind: 'current' })
    assert.deepEqual(blocked, {
      ok: false,
      error: { code: 'RECOVERY_BLOCKED', retry: 'after-user-action' }
    })
    const retained = await incompatibleTracer.registry.summarize({ kind: 'registry' })
    assert.deepEqual(retained, {
      ok: true,
      value: {
        revision: 1,
        current: {
          state: 'configured',
          registration,
          condition: 'recovery-blocked'
        }
      }
    })

    const exactTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog: installedCatalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const recovered = await exactTracer.registry.open({ kind: 'current' })
    assert.equal(recovered.ok, true, JSON.stringify(recovered))
    if (!recovered.ok) throw new Error('Expected exact Catalog recovery to reopen current.')
    assert.deepEqual(recovered.value.summary, {
      revision: 1,
      current: {
        state: 'configured',
        registration,
        condition: 'available'
      }
    })
    const recoveredArtifact = await recovered.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(recoveredArtifact.ok, true)
    if (!recoveredArtifact.ok) throw new Error('Expected recovered artifact summary.')
    assert.equal(recoveredArtifact.value.artifacts[0].lifecycle.kind, 'verified-stored')

    for (const result of [blocked, retained, recovered, recoveredArtifact]) {
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(taskRoot), false)
      assert.doesNotMatch(
        serialized,
        /rootDirectory|controlDirectory|filePath|sqlite|storageIdentity/i
      )
    }
    await recovered.value.session.close()
  } finally {
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function registryOwnStoreFailureStatesStayDistinct(): Promise<void> {
  const scenarios = [{
    fixture: 'registry-database-read-only' as const,
    error: {
      code: 'REGISTRY_READ_ONLY' as const,
      retry: 'after-user-action' as const
    }
  }, {
    fixture: 'registry-schema-v2' as const,
    error: {
      code: 'REGISTRY_SCHEMA_UNSUPPORTED' as const,
      retry: 'not-retryable' as const
    }
  }, {
    fixture: 'registry-integrity-extra-object' as const,
    error: {
      code: 'REGISTRY_INTEGRITY_FAILED' as const,
      retry: 'not-retryable' as const
    }
  }]

  for (const scenario of scenarios) {
    const taskRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `dam-model-registry-${scenario.fixture}-`)
    )
    const registryControlDirectory = path.join(taskRoot, 'registry-control')
    await fs.mkdir(registryControlDirectory)
    let sourceReads = 0
    const guardedSource: ModelArtifactByteSource = {
      async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
        sourceReads += 1
        throw new Error('Registry store validation must not acquire model bytes.')
      }
    }

    try {
      const catalog = admitGeneratedCatalog()
      const healthyTracer = await openModelStorageRootRegistryTracer({
        controlDirectory: registryControlDirectory,
        catalog,
        byteSource: guardedSource,
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record')
      })
      assert.deepEqual(
        await healthyTracer.registry.summarize({ kind: 'registry' }),
        {
          ok: true,
          value: {
            revision: 0,
            current: { state: 'not-configured' }
          }
        }
      )

      const faultyTracer = await openModelStorageRootRegistryTracer({
        controlDirectory: registryControlDirectory,
        catalog,
        byteSource: guardedSource,
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        tracerOnlyRegistryState: scenario.fixture
      })
      const summarized = await faultyTracer.registry.summarize({ kind: 'registry' })
      assert.deepEqual(summarized, {
        ok: false,
        error: scenario.error
      })
      const opened = await faultyTracer.registry.open({ kind: 'current' })
      if (opened.ok) await opened.value.session.close()
      assert.deepEqual(opened, {
        ok: false,
        error: scenario.error
      })
      assert.equal(sourceReads, 0)

      for (const result of [summarized, opened]) {
        const serialized = JSON.stringify(result)
        assert.equal(serialized.includes(taskRoot), false)
        assert.doesNotMatch(
          serialized,
          /rootDirectory|controlDirectory|filePath|sqlite|identity/i
        )
      }
    } finally {
      await fs.rm(taskRoot, { recursive: true, force: true })
    }
  }
}

async function independentProcessesPublishOnlyOneFirstSelection(): Promise<void> {
  const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-registry-cas-'))
  const registryControlDirectory = path.join(taskRoot, 'registry-control')
  const firstStorageDirectory = path.join(taskRoot, 'model-storage-a')
  const otherStorageDirectory = path.join(taskRoot, 'model-storage-b')
  await fs.mkdir(registryControlDirectory)
  await fs.mkdir(firstStorageDirectory)
  await fs.mkdir(otherStorageDirectory)
  let firstChild: ChildProcess | undefined
  let otherChild: ChildProcess | undefined

  try {
    const catalog = admitFixedCatalog()
    const firstAuthority = createModelStorageAuthorityTracer({
      rootDirectory: firstStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:process-first-a'
    })
    const otherAuthority = createModelStorageAuthorityTracer({
      rootDirectory: otherStorageDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:process-first-b'
    })
    const firstProvisioned = await firstAuthority.authority.provision(firstAuthority.target)
    const otherProvisioned = await otherAuthority.authority.provision(otherAuthority.target)
    assert.equal(firstProvisioned.ok, true)
    assert.equal(otherProvisioned.ok, true)
    if (!firstProvisioned.ok || !otherProvisioned.ok) {
      throw new Error('Expected concurrent first-selection root provisioning.')
    }

    const initializedRegistry = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    assert.deepEqual(
      await initializedRegistry.registry.summarize({ kind: 'registry' }),
      {
        ok: true,
        value: {
          revision: 0,
          current: { state: 'not-configured' }
        }
      }
    )

    firstChild = spawnFirstSelectionChild(
      'A',
      registryControlDirectory,
      firstStorageDirectory,
      firstProvisioned.value.root
    )
    otherChild = spawnFirstSelectionChild(
      'B',
      registryControlDirectory,
      otherStorageDirectory,
      otherProvisioned.value.root
    )
    const firstCapture = captureSelectionChild(firstChild)
    const otherCapture = captureSelectionChild(otherChild)
    await Promise.all([
      firstCapture.waitForLine('REVIEWED:A'),
      otherCapture.waitForLine('REVIEWED:B')
    ])

    firstChild.stdin?.end('SELECT\n')
    otherChild.stdin?.end('SELECT\n')
    await Promise.all([firstCapture.waitForExit(), otherCapture.waitForExit()])
    const firstResult = firstCapture.result()
    const otherResult = otherCapture.result()
    assert.equal(firstResult.exitCode, 0, firstResult.stderr)
    assert.equal(otherResult.exitCode, 0, otherResult.stderr)
    assert.ok(Buffer.byteLength(firstResult.stderr, 'utf8') <= 4_096)
    assert.ok(Buffer.byteLength(otherResult.stderr, 'utf8') <= 4_096)

    const firstLines = strictChildLines(firstResult.stdout)
    const otherLines = strictChildLines(otherResult.stdout)
    assert.equal(firstLines[0], 'REVIEWED:A')
    assert.equal(otherLines[0], 'REVIEWED:B')
    const outcomes = [...firstLines, ...otherLines]
    assert.equal(outcomes.filter((line) => line.startsWith('SELECTED:')).length, 1)
    assert.equal(outcomes.filter((line) => line.startsWith('STALE:')).length, 1)
    assert.equal(
      outcomes.filter((line) => line.startsWith('MIGRATION_REQUIRED:')).length,
      1
    )
    for (const [role, lines] of [
      ['A', firstLines],
      ['B', otherLines]
    ] as const) {
      if (lines.includes(`SELECTED:${role}`)) {
        assert.deepEqual(lines, [`REVIEWED:${role}`, `SELECTED:${role}`])
      } else {
        assert.deepEqual(lines, [
          `REVIEWED:${role}`,
          `STALE:${role}`,
          `MIGRATION_REQUIRED:${role}`
        ])
      }
    }
    assert.equal(firstResult.stdout.includes(taskRoot), false)
    assert.equal(otherResult.stdout.includes(taskRoot), false)

    firstChild = undefined
    otherChild = undefined
    const finalTracer = await openModelStorageRootRegistryTracer({
      controlDirectory: registryControlDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record')
    })
    const current = await finalTracer.registry.open({ kind: 'current' })
    assert.equal(current.ok, true, JSON.stringify(current))
    if (!current.ok) throw new Error('Expected one durable concurrent selection.')
    assert.equal(current.value.disposition, 'opened-current')
    assert.equal(current.value.summary.revision, 1)
    assert.equal(current.value.summary.current.state, 'configured')
    if (current.value.summary.current.state !== 'configured') {
      throw new Error('Expected the concurrently selected registration.')
    }
    assert.equal(current.value.summary.current.condition, 'available')
    const catalogSummary = await current.value.session.library.summarize({ kind: 'library' })
    assert.equal(catalogSummary.ok, true)
    if (!catalogSummary.ok) throw new Error('Expected concurrent-selection Catalog summary.')
    assert.equal(catalogSummary.value.artifacts.length, 1)
    assert.equal(catalogSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.equal(JSON.stringify(current).includes(taskRoot), false)
    await current.value.session.close()
  } finally {
    if (firstChild && firstChild.exitCode === null) firstChild.kill('SIGKILL')
    if (otherChild && otherChild.exitCode === null) otherChild.kill('SIGKILL')
    await fs.rm(taskRoot, { recursive: true, force: true })
  }
}

async function participateInConcurrentFirstSelection(
  role: string | undefined,
  controlDirectory: string | undefined,
  rootDirectory: string | undefined,
  root: string | undefined
): Promise<void> {
  if ((role !== 'A' && role !== 'B') || !controlDirectory || !rootDirectory || !root) {
    throw new Error('CHILD_INPUT_REQUIRED')
  }
  const catalog = admitFixedCatalog()
  const tracer = await openModelStorageRootRegistryTracer({
    controlDirectory,
    catalog,
    byteSource: unavailableSource(),
    createActivityId: mustNotCreate('activity'),
    createStorageRecordId: mustNotCreate('storage record')
  })
  const candidate = tracer.createCandidate({
    rootDirectory,
    root: root as never
  })
  const review = await tracer.registry.summarize({ kind: 'candidate', candidate })
  assert.equal(review.ok, true, JSON.stringify(review))
  if (!review.ok || review.value.state !== 'confirmable') {
    throw new Error('CHILD_REVIEW_FAILED')
  }
  process.stdout.write(`REVIEWED:${role}\n`)
  await waitForSelectSignal()

  const selected = await tracer.registry.open({
    kind: 'select-reviewed-root',
    candidate,
    reviewFingerprint: review.value.fingerprint,
    decision: 'make-reviewed-model-storage-root-current'
  })
  if (selected.ok) {
    assert.equal(selected.value.disposition, 'selected-first-root')
    process.stdout.write(`SELECTED:${role}\n`)
    await selected.value.session.close()
    return
  }
  assert.deepEqual(selected, {
    ok: false,
    error: {
      code: 'SELECTION_REVIEW_STALE',
      retry: 'review-again'
    }
  })
  process.stdout.write(`STALE:${role}\n`)
  assert.deepEqual(
    await tracer.registry.summarize({ kind: 'candidate', candidate }),
    {
      ok: true,
      value: {
        state: 'blocked',
        reasons: ['MIGRATION_REQUIRED']
      }
    }
  )
  process.stdout.write(`MIGRATION_REQUIRED:${role}\n`)
}

function spawnFirstSelectionChild(
  role: 'A' | 'B',
  controlDirectory: string,
  rootDirectory: string,
  root: string
): ChildProcess {
  return spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.url),
      '--child-first-selection',
      role,
      controlDirectory,
      rootDirectory,
      root
    ],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    }
  )
}

function captureSelectionChild(child: ChildProcess) {
  const stdout = child.stdout
  const stderr = child.stderr
  if (!stdout || !stderr) throw new Error('CHILD_CAPTURE_UNAVAILABLE')
  stdout.setEncoding('utf8')
  stderr.setEncoding('utf8')
  let stdoutText = ''
  let stderrText = ''
  stdout.on('data', (chunk: string) => {
    stdoutText += chunk
  })
  stderr.on('data', (chunk: string) => {
    if (Buffer.byteLength(stderrText, 'utf8') < 4_096) stderrText += chunk
  })

  return {
    async waitForLine(expected: string): Promise<void> {
      if (strictChildLines(stdoutText).includes(expected)) return
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => finish(new Error('CHILD_REVIEW_TIMEOUT')), 5_000)
        const onData = () => {
          if (strictChildLines(stdoutText).includes(expected)) finish()
        }
        const onExit = () => finish(new Error(
          `CHILD_EXITED_BEFORE_REVIEW:${stderrText.slice(0, 4_096)}`
        ))
        const finish = (error?: Error) => {
          clearTimeout(timeout)
          stdout.off('data', onData)
          child.off('exit', onExit)
          if (error) reject(error)
          else resolve()
        }
        stdout.on('data', onData)
        child.once('exit', onExit)
      })
    },
    async waitForExit(): Promise<void> {
      if (child.exitCode !== null) return
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          child.kill('SIGKILL')
          reject(new Error('CHILD_SELECTION_TIMEOUT'))
        }, 5_000)
        child.once('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
        child.once('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    },
    result() {
      return {
        exitCode: child.exitCode,
        stdout: stdoutText,
        stderr: stderrText
      }
    }
  }
}

async function waitForSelectSignal(): Promise<void> {
  process.stdin.setEncoding('utf8')
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CHILD_SELECT_TIMEOUT')), 5_000)
    process.stdin.once('data', (text: string) => {
      clearTimeout(timeout)
      if (text.trim() === 'SELECT') resolve()
      else reject(new Error('CHILD_SELECT_INVALID'))
    })
  })
}

function strictChildLines(text: string): string[] {
  return text.split('\n').filter((line) => line.length > 0)
}

function admitFixedCatalog() {
  const admission = createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: fixedPayload.catalogId,
      keyId: fixedPayload.keyId,
      publicKeySpkiBase64: FIXED_PUBLIC_KEY_SPKI_BASE64
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  })
  const decision = admission.admit({
    catalogId: fixedPayload.catalogId,
    keyId: fixedPayload.keyId,
    payload: fixedPayload,
    signatureBase64: FIXED_SIGNATURE_BASE64
  })
  assert.equal(decision.kind, 'admitted')
  if (decision.kind !== 'admitted') throw new Error('Expected fixed signed Catalog.')
  return decision.catalog
}

function admitGeneratedCatalog() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const bytes = Buffer.from('registry-review-fixture', 'utf8')
  const payload = {
    schemaVersion: 1,
    catalogId: 'root-registry-test-catalog',
    keyId: 'root-registry-test-key',
    sequence: '1',
    trustVerifiedAt: '2026-08-13T00:00:00.000Z',
    artifacts: [{
      manifestId: 'root-registry-review@2026-08',
      familyId: 'root-registry-family',
      checkpointId: 'root-registry-checkpoint',
      variantId: 'root-registry-variant',
      displayName: 'Root Registry Synthetic Model',
      immutableRevision: `sha256:${'4'.repeat(64)}`,
      files: [{
        path: 'weights/model.gguf',
        role: 'weights',
        format: 'gguf',
        sizeBytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex')
      }],
      requiredAcknowledgements: []
    }]
  }
  const admission = createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: payload.catalogId,
      keyId: payload.keyId,
      publicKeySpkiBase64: publicKey.export({
        format: 'der',
        type: 'spki'
      }).toString('base64')
    }],
    nowEpochMs: () => Date.parse('2026-08-13T12:00:00.000Z')
  })
  const decision = admission.admit({
    catalogId: payload.catalogId,
    keyId: payload.keyId,
    payload,
    signatureBase64: sign(
      null,
      Buffer.from(canonicalJson(payload), 'utf8'),
      privateKey
    ).toString('base64')
  })
  assert.equal(decision.kind, 'admitted')
  if (decision.kind !== 'admitted') throw new Error('Expected generated signed metadata.')
  return decision.catalog
}

function unavailableSource(): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      throw new Error('Candidate review must not acquire model bytes.')
    }
  }
}

function mustNotCreate(kind: string): () => string {
  return () => {
    throw new Error(`Candidate review must not create a ${kind}.`)
  }
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
