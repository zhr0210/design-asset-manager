import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createModelLibraryWorkspace } from
  '../src/main/model-library-workspace/model-library-workspace'
import { createModelLibraryStoragePort } from
  '../src/main/model-library-workspace/model-library-storage-port.internal'

const taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-library-pilot-'))
const controlDirectory = path.join(taskRoot, 'control')
const recommendedParent = path.join(taskRoot, 'recommended-parent')
await fs.mkdir(controlDirectory)
await fs.mkdir(recommendedParent)

try {
  let pickerCalls = 0
  const createStorage = () => createModelLibraryStoragePort({
    controlDirectory,
    location: {
      async select(source) {
        pickerCalls += 1
        assert.equal(source, 'recommended')
        return {
          kind: 'selected' as const,
          parentDirectory: recommendedParent,
          display: {
            volumeName: 'Recommended local storage',
            managedFolderName: 'Design Asset Manager Model Library' as const
          }
        }
      }
    },
    createStorageIdentity: () => 'model-storage-root:workspace-pilot'
  })

  const firstWorkspace = createModelLibraryWorkspace({
    ...fixedCatalogRelease(),
    storage: await createStorage()
  })
  const initial = await firstWorkspace.summarize({ kind: 'page' })
  assert.equal(initial.ok, true)
  if (!initial.ok) throw new Error('Expected initial Model Library summary.')
  assert.deepEqual(initial.value.storage, { state: 'not-configured' })
  assert.equal(pickerCalls, 0)
  assert.deepEqual(await fs.readdir(recommendedParent), [])

  let review = await firstWorkspace.configureStorage({
    kind: 'review-recommended-location'
  })
  assert.equal(review.ok, true)
  if (!review.ok || review.value.state !== 'review-required') {
    throw new Error('Expected a first-root review.')
  }
  assert.equal(pickerCalls, 1)
  assert.deepEqual(await fs.readdir(recommendedParent), [])

  const originalParent = path.join(taskRoot, 'original-reviewed-parent')
  await fs.rename(recommendedParent, originalParent)
  await fs.mkdir(recommendedParent)
  assert.deepEqual(await firstWorkspace.configureStorage({
    kind: 'confirm-reviewed-selection',
    review: review.value.review,
    decision: 'use-reviewed-model-storage-root'
  }), {
    ok: false,
    error: {
      code: 'STORAGE_REVIEW_STALE',
      retry: 'review-again'
    }
  })
  assert.deepEqual(await fs.readdir(recommendedParent), [])
  await fs.rmdir(recommendedParent)
  await fs.rename(originalParent, recommendedParent)

  review = await firstWorkspace.configureStorage({
    kind: 'review-recommended-location'
  })
  assert.equal(review.ok, true)
  if (!review.ok || review.value.state !== 'review-required') {
    throw new Error('Expected a refreshed first-root review.')
  }

  const confirmed = await firstWorkspace.configureStorage({
    kind: 'confirm-reviewed-selection',
    review: review.value.review,
    decision: 'use-reviewed-model-storage-root'
  })
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed))
  if (!confirmed.ok || !('storage' in confirmed.value)) {
    throw new Error('Expected first-root confirmation.')
  }
  assert.equal(confirmed.value.disposition, 'selected-first-root')
  assert.equal(confirmed.value.storage.state, 'configured')
  const registration = confirmed.value.storage.registration
  assert.match(registration, /^model-storage-registration:[a-f0-9]{32}$/)
  assert.equal(confirmed.value.storage.condition, 'available')
  const managedEntries = await fs.readdir(recommendedParent)
  assert.equal(managedEntries.length, 1)
  assert.match(
    managedEntries[0],
    /^Design Asset Manager Model Library-[a-f0-9]{16}$/
  )
  const managedRoot = path.join(recommendedParent, managedEntries[0])

  const unfinishedTransaction = path.join(
    managedRoot,
    '.model-library',
    'transactions',
    'unfinished-test-transaction'
  )
  await fs.writeFile(unfinishedTransaction, 'incomplete')
  const recoveryBlocked = await firstWorkspace.summarize({ kind: 'page' })
  assert.equal(recoveryBlocked.ok, true)
  if (!recoveryBlocked.ok) {
    throw new Error('Expected recovery-blocked storage summary.')
  }
  assert.deepEqual(recoveryBlocked.value.storage, {
    state: 'configured',
    registration,
    condition: 'recovery-blocked',
    location: null
  })
  await fs.rm(unfinishedTransaction)

  const reopenedWorkspace = createModelLibraryWorkspace({
    ...fixedCatalogRelease(),
    storage: await createStorage()
  })
  const reopened = await reopenedWorkspace.summarize({ kind: 'page' })
  assert.equal(reopened.ok, true)
  if (!reopened.ok) throw new Error('Expected a reopened Model Library summary.')
  assert.deepEqual(reopened.value.storage, {
    state: 'configured',
    registration,
    condition: 'available',
    location: null
  })
  assert.equal(pickerCalls, 2)

  let reconnectReview = await reopenedWorkspace.configureStorage({
    kind: 'review-recommended-location'
  })
  assert.equal(reconnectReview.ok, true)
  if (!reconnectReview.ok || reconnectReview.value.state !== 'review-required') {
    throw new Error('Expected a reconnect review.')
  }
  assert.equal(reconnectReview.value.effect, 'reconnect-current-root')
  assert.equal(pickerCalls, 3)

  const reviewedPhysicalRoot = path.join(taskRoot, 'reviewed-physical-root')
  await fs.rename(managedRoot, reviewedPhysicalRoot)
  await fs.cp(reviewedPhysicalRoot, managedRoot, { recursive: true })
  assert.deepEqual(await reopenedWorkspace.configureStorage({
    kind: 'confirm-reviewed-selection',
    review: reconnectReview.value.review,
    decision: 'use-reviewed-model-storage-root'
  }), {
    ok: false,
    error: {
      code: 'STORAGE_UNAVAILABLE',
      retry: 'after-user-action'
    }
  })
  await fs.rm(managedRoot, { recursive: true })
  await fs.rename(reviewedPhysicalRoot, managedRoot)

  reconnectReview = await reopenedWorkspace.configureStorage({
    kind: 'review-recommended-location'
  })
  assert.equal(reconnectReview.ok, true)
  if (!reconnectReview.ok || reconnectReview.value.state !== 'review-required') {
    throw new Error('Expected a refreshed reconnect review.')
  }
  const reconnected = await reopenedWorkspace.configureStorage({
    kind: 'confirm-reviewed-selection',
    review: reconnectReview.value.review,
    decision: 'use-reviewed-model-storage-root'
  })
  assert.equal(reconnected.ok, true, JSON.stringify(reconnected))
  if (!reconnected.ok || !('storage' in reconnected.value)) {
    throw new Error('Expected the current root to reconnect.')
  }
  assert.equal(reconnected.value.disposition, 'reconnected-current-root')
  assert.equal(reconnected.value.storage.registration, registration)
  assert.equal(reconnected.value.storage.condition, 'available')
  assert.equal(pickerCalls, 4)

  const displacedRoot = path.join(taskRoot, 'temporarily-offline-model-root')
  await fs.rename(managedRoot, displacedRoot)
  const unavailableWorkspace = createModelLibraryWorkspace({
    ...fixedCatalogRelease(),
    storage: await createStorage()
  })
  const unavailable = await unavailableWorkspace.summarize({ kind: 'page' })
  assert.equal(unavailable.ok, true)
  if (!unavailable.ok) throw new Error('Expected unavailable storage summary.')
  assert.deepEqual(unavailable.value.storage, {
    state: 'configured',
    registration,
    condition: 'unavailable',
    location: null
  })

  await fs.rename(displacedRoot, managedRoot)
  const restored = await unavailableWorkspace.summarize({ kind: 'page' })
  assert.equal(restored.ok, true)
  if (!restored.ok) throw new Error('Expected restored storage summary.')
  assert.deepEqual(restored.value.storage, {
    state: 'configured',
    registration,
    condition: 'available',
    location: null
  })

  for (const result of [
    initial,
    review,
    confirmed,
    recoveryBlocked,
    reopened,
    reconnectReview,
    reconnected,
    unavailable,
    restored
  ]) {
    const serialized = JSON.stringify(result)
    assert.equal(serialized.includes(taskRoot), false)
    assert.doesNotMatch(
      serialized,
      /path|directory|locator|identity|sqlite|fingerprint|defaultPath/i
    )
  }
} finally {
  await fs.rm(taskRoot, { recursive: true, force: true })
}

console.log('model-library-workspace-storage passed')

function fixedCatalogRelease() {
  return {
    pinnedCatalogTrustRoot: {
      catalogId: 'official-model-catalog',
      keyId: 'test-root-2026',
      publicKeySpkiBase64:
        'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
    },
    bundledCatalog: {
      envelope: {
      catalogId: 'official-model-catalog',
      keyId: 'test-root-2026',
      payload: {
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
      },
      signatureBase64:
        'FzC6cDw2vQnwCI57JMirmQUR1b8+qV+DvbFYebmDt6TJp10DH7ERYO8B85PRiKg8SsPDWYQFjOQoWm1tLDa7BA=='
      },
      releasePin: {
        catalogId: 'official-model-catalog',
        keyId: 'test-root-2026',
        sequence: '42',
        binding:
          'admission:967521dcd48e8359822bae9dc0a951fc7a63df11e828b4754dbe908d9e8e81b2'
      }
    }
  }
}
