import assert from 'node:assert/strict'

import { createModelLibraryWorkspace } from
  '../src/main/model-library-workspace/model-library-workspace'

const workspace = createModelLibraryWorkspace({
  bundledCatalog: undefined
})

const summary = await workspace.summarize({ kind: 'page' })

assert.deepEqual(summary, {
  ok: true,
  value: {
    catalog: {
      state: 'unavailable',
      source: 'bundled-official',
      reason: 'BUNDLE_MISSING'
    },
    storage: {
      state: 'not-configured'
    }
  }
})

assert.doesNotMatch(
  JSON.stringify(summary),
  /path|directory|locator|identity|sqlite|signature|digest|url/i
)

const invalidReleaseInputSummary = await createModelLibraryWorkspace({
  bundledCatalog: undefined,
  officialCatalogReleaseState: 'invalid'
}).summarize({ kind: 'page' })
assert.equal(invalidReleaseInputSummary.ok, true)
if (!invalidReleaseInputSummary.ok) {
  throw new Error('Expected an invalid release-input summary.')
}
assert.deepEqual(invalidReleaseInputSummary.value.catalog, {
  state: 'unavailable',
  source: 'bundled-official',
  reason: 'RELEASE_INPUT_INVALID'
})

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

const fixedTrustRoot = {
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  publicKeySpkiBase64:
    'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
}

const fixedBundle = {
    envelope: {
      catalogId: 'official-model-catalog',
      keyId: 'test-root-2026',
      payload: fixedPayload,
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

const verifiedWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle
})

const verifiedSummary = await verifiedWorkspace.summarize({ kind: 'page' })

assert.deepEqual(verifiedSummary, {
  ok: true,
  value: {
    catalog: {
      state: 'available',
      source: 'bundled-official',
      trust: 'release-pinned',
      catalogId: 'official-model-catalog',
      sequence: '42',
      mode: 'read-only',
      families: [{
        familyId: 'qwen3-vl',
        checkpoints: [{
          checkpointId: 'qwen3-vl-4b-instruct',
          variants: [{
            ref: {
              catalogId: 'official-model-catalog',
              manifestId: 'qwen3-vl-4b-q4-k-m@2026-08'
            },
            variantId: 'qwen3-vl-4b-instruct-q4-k-m',
            displayName: 'Qwen3-VL 4B Q4_K_M',
            declaredBytes: 1_200,
            acknowledgementLabels: ['Qwen model license'],
            lifecycle: 'catalog-only',
            installAvailable: false
          }]
        }]
      }]
    },
    storage: {
      state: 'not-configured'
    }
  }
})

assert.doesNotMatch(
  JSON.stringify(verifiedSummary),
  /path|directory|locator|sqlite|signature|publicKey|digest|url|credential/i
)

const unpinnedCatalogSummary = await createModelLibraryWorkspace({
  bundledCatalog: fixedBundle
}).summarize({ kind: 'page' })
assert.equal(unpinnedCatalogSummary.ok, true)
if (!unpinnedCatalogSummary.ok) {
  throw new Error('Expected a fail-closed unpinned Catalog summary.')
}
assert.deepEqual(unpinnedCatalogSummary.value.catalog, {
  state: 'unavailable',
  source: 'bundled-official',
  reason: 'ROOT_UNRECOGNIZED'
})

const wrongPinnedRootSummary = await createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: {
    ...fixedTrustRoot,
    publicKeySpkiBase64:
      'MCowBQYDK2VwAyEAhoyKEYSyDc1AMS2MrjcRpppOXcTAbnjLnnbXrpt5Bes='
  },
  bundledCatalog: fixedBundle
}).summarize({ kind: 'page' })
assert.equal(wrongPinnedRootSummary.ok, true)
if (!wrongPinnedRootSummary.ok) {
  throw new Error('Expected a fail-closed wrong-root Catalog summary.')
}
assert.deepEqual(wrongPinnedRootSummary.value.catalog, {
  state: 'unavailable',
  source: 'bundled-official',
  reason: 'SIGNATURE_INVALID'
})

const aiConsoleSummary = await verifiedWorkspace.summarize({
  kind: 'ai-console'
} as never)

assert.deepEqual(aiConsoleSummary, {
  ok: true,
  value: {
    catalog: {
      state: 'available',
      familyCount: 1,
      variantCount: 1
    },
    storage: {
      state: 'setup-required'
    },
    destination: 'model-library'
  }
})

assert.doesNotMatch(
  JSON.stringify(aiConsoleSummary),
  /artifacts|families|checkpoints|variants|review|configure|install|path|identity/i
)

let passiveStorageSummaryCalls = 0
const passiveAiConsoleWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle,
  storage: {
    async summarize() {
      passiveStorageSummaryCalls += 1
      throw new Error('AI Console must not initialize or probe Model Storage.')
    }
  }
})
assert.deepEqual(await passiveAiConsoleWorkspace.summarize({
  kind: 'ai-console'
}), {
  ok: true,
  value: {
    catalog: {
      state: 'available',
      familyCount: 1,
      variantCount: 1
    },
    storage: { state: 'not-observed' },
    destination: 'model-library'
  }
})
assert.equal(passiveStorageSummaryCalls, 0)

let storageSummaryCalls = 0
let storageConfigurationCalls = 0
const observedWorkspace = createModelLibraryWorkspace({
  bundledCatalog: undefined,
  storage: {
    async summarize() {
      storageSummaryCalls += 1
      return { ok: true as const, value: { state: 'not-configured' as const } }
    },
    async configure() {
      storageConfigurationCalls += 1
      throw new Error('A read summary must not configure storage.')
    }
  }
} as never)

assert.deepEqual(await observedWorkspace.summarize({ kind: 'page' }), summary)
assert.equal(storageSummaryCalls, 1)
assert.equal(storageConfigurationCalls, 0)

let unavailableCatalogReviewCalls = 0
const unavailableCatalogWorkspace = createModelLibraryWorkspace({
  bundledCatalog: undefined,
  storage: {
    async summarize() {
      return { ok: true as const, value: { state: 'not-configured' as const } }
    },
    async reviewLocation() {
      unavailableCatalogReviewCalls += 1
      throw new Error('Missing Catalog must block before location review.')
    }
  }
} as never)
assert.deepEqual(await unavailableCatalogWorkspace.configureStorage({
  kind: 'review-recommended-location'
}), {
  ok: false,
  error: {
    code: 'MODULE_UNAVAILABLE',
    retry: 'not-retryable'
  }
})
assert.equal(unavailableCatalogReviewCalls, 0)

const internalCandidate = Object.freeze({})
let reviewLocationCalls = 0
let confirmLocationCalls = 0
let durableStorageState:
  | { readonly state: 'not-configured' }
  | {
      readonly state: 'configured'
      readonly registration: string
      readonly condition: 'available'
      readonly location: {
        readonly volumeName: string
        readonly managedFolderName: 'Design Asset Manager Model Library'
      }
    } = { state: 'not-configured' }
const storageReviewWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle,
  storage: {
    async summarize() {
      return { ok: true as const, value: durableStorageState }
    },
    async reviewLocation(source: 'recommended' | 'choose-parent') {
      reviewLocationCalls += 1
      assert.equal(source, 'recommended')
      return {
        ok: true as const,
        value: {
          state: 'review-required' as const,
          candidate: internalCandidate,
          effect: 'provision-and-select-first-root' as const,
          location: {
            volumeName: 'Recommended local storage',
            managedFolderName: 'Design Asset Manager Model Library' as const
          }
        }
      }
    },
    async confirmLocation(candidate: object) {
      confirmLocationCalls += 1
      assert.equal(candidate, internalCandidate)
      durableStorageState = {
        state: 'configured',
        registration: 'model-storage-registration:11111111111111111111111111111111',
        condition: 'available',
        location: {
          volumeName: 'Recommended local storage',
          managedFolderName: 'Design Asset Manager Model Library'
        }
      }
      return { ok: true as const, value: durableStorageState }
    }
  }
} as never)

const storageReview = await storageReviewWorkspace.configureStorage({
  kind: 'review-recommended-location'
} as never)
assert.equal(storageReview.ok, true)
if (!storageReview.ok || storageReview.value.state !== 'review-required') {
  throw new Error('Expected a storage review.')
}
const { review, ...storageReviewProjection } = storageReview.value
assert.match(review, /^model-storage-review:[a-f0-9]{64}$/)
assert.deepEqual(storageReviewProjection, {
  state: 'review-required',
  effect: 'provision-and-select-first-root',
  location: {
    volumeName: 'Recommended local storage',
    managedFolderName: 'Design Asset Manager Model Library'
  },
  consequences: {
    provisionsAppOwnedRoot: true,
    updatesDeviceLocalRegistration: true,
    movesModelBytes: false,
    deletesModelBytes: false,
    performsMigration: false,
    importsModels: false,
    installsModels: false,
    activatesModel: false,
    startsRuntime: false,
    startsInference: false
  }
})
assert.equal(reviewLocationCalls, 1)
assert.equal(confirmLocationCalls, 0)
const afterStorageReview = await storageReviewWorkspace.summarize({ kind: 'page' })
assert.equal(afterStorageReview.ok, true)
if (!afterStorageReview.ok) throw new Error('Expected a page after storage review.')
assert.deepEqual(
  afterStorageReview.value.storage,
  { state: 'not-configured' },
  'Reviewing a location must not configure durable storage.'
)
assert.deepEqual(durableStorageState, { state: 'not-configured' })
assert.doesNotMatch(
  JSON.stringify(storageReview),
  /path|directory|locator|identity|sqlite|fingerprint|defaultPath/i
)

const confirmedStorage = await storageReviewWorkspace.configureStorage({
  kind: 'confirm-reviewed-selection',
  review,
  decision: 'use-reviewed-model-storage-root'
} as never)
assert.deepEqual(confirmedStorage, {
  ok: true,
  value: {
    disposition: 'selected-first-root',
    storage: {
      state: 'configured',
      registration: 'model-storage-registration:11111111111111111111111111111111',
      condition: 'available',
      location: {
        volumeName: 'Recommended local storage',
        managedFolderName: 'Design Asset Manager Model Library'
      }
    }
  }
})
assert.equal(confirmLocationCalls, 1)

const configuredPage = await storageReviewWorkspace.summarize({ kind: 'page' })
assert.equal(configuredPage.ok, true)
if (!configuredPage.ok) throw new Error('Expected a configured page summary.')
assert.deepEqual(configuredPage.value.storage, durableStorageState)

assert.deepEqual(await storageReviewWorkspace.summarize({
  kind: 'ai-console'
}), {
  ok: true,
  value: {
    catalog: {
      state: 'available',
      familyCount: 1,
      variantCount: 1
    },
    storage: { state: 'available' },
    destination: 'model-library'
  }
})

assert.deepEqual(await storageReviewWorkspace.configureStorage({
  kind: 'confirm-reviewed-selection',
  review,
  decision: 'use-reviewed-model-storage-root'
} as never), {
  ok: false,
  error: {
    code: 'STORAGE_REVIEW_STALE',
    retry: 'review-again'
  }
})
assert.equal(confirmLocationCalls, 1)

const throwingSummaryWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle,
  storage: {
    async summarize() {
      throw new Error('SECRET:/private/user/model-root')
    }
  }
})
const hiddenSummaryFailure = await throwingSummaryWorkspace.summarize({
  kind: 'page'
})
assert.deepEqual(hiddenSummaryFailure, {
  ok: false,
  error: {
    code: 'STORAGE_UNAVAILABLE',
    retry: 'after-user-action'
  }
})
assert.doesNotMatch(JSON.stringify(hiddenSummaryFailure), /SECRET|private|exception/i)

const throwingReviewWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle,
  storage: {
    async summarize() {
      return { ok: true as const, value: { state: 'not-configured' as const } }
    },
    async reviewLocation() {
      throw new Error('SECRET:/private/user/chosen-parent')
    }
  }
})
const hiddenReviewFailure = await throwingReviewWorkspace.configureStorage({
  kind: 'review-chosen-parent'
})
assert.deepEqual(hiddenReviewFailure, {
  ok: false,
  error: {
    code: 'STORAGE_UNAVAILABLE',
    retry: 'after-user-action'
  }
})
assert.doesNotMatch(JSON.stringify(hiddenReviewFailure), /SECRET|private|exception/i)

const registryFailureWorkspace = createModelLibraryWorkspace({
  pinnedCatalogTrustRoot: fixedTrustRoot,
  bundledCatalog: fixedBundle,
  storage: {
    async summarize() {
      return {
        ok: false as const,
        error: {
          code: 'REGISTRY_INTEGRITY_FAILED' as const,
          retry: 'not-retryable' as const
        }
      }
    }
  }
} as never)
assert.deepEqual(await registryFailureWorkspace.summarize({ kind: 'page' }), {
  ok: false,
  error: {
    code: 'REGISTRY_INTEGRITY_FAILED',
    retry: 'not-retryable'
  }
})

console.log('model-library-workspace passed')
