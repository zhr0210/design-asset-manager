import { randomBytes } from 'node:crypto'

import type { SignedModelCatalogEnvelope } from
  '../model-library/model-catalog-admission.tracer'
import { projectBundledOfficialCatalog } from
  './bundled-official-model-catalog.internal'

export type ModelLibraryWorkspaceResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false
      readonly error: {
        readonly code:
          | 'MODULE_UNAVAILABLE'
          | 'STORAGE_REVIEW_INVALID'
          | 'STORAGE_REVIEW_STALE'
          | 'STORAGE_UNAVAILABLE'
          | 'STORAGE_BUSY'
          | 'REGISTRY_INTEGRITY_FAILED'
          | 'REGISTRY_SCHEMA_UNSUPPORTED'
          | 'REGISTRY_READ_ONLY'
        readonly retry:
          | 'review-again'
          | 'after-user-action'
          | 'after-session-closes'
          | 'not-retryable'
      }
    }

export interface BundledOfficialCatalogReleasePin {
  readonly catalogId: string
  readonly keyId: string
  readonly sequence: string
  readonly binding: string
}

export interface OfficialCatalogPinnedTrustRoot {
  readonly catalogId: string
  readonly keyId: string
  readonly publicKeySpkiBase64: string
}

export interface BundledOfficialCatalogPackage {
  readonly envelope: SignedModelCatalogEnvelope
  readonly releasePin: BundledOfficialCatalogReleasePin
}

export interface OfficialCatalogVariantSummary {
  readonly ref: {
    readonly catalogId: string
    readonly manifestId: string
  }
  readonly variantId: string
  readonly displayName: string
  readonly declaredBytes: number
  readonly acknowledgementLabels: readonly string[]
  readonly lifecycle: 'catalog-only'
  readonly installAvailable: false
}

export interface OfficialCatalogCheckpointSummary {
  readonly checkpointId: string
  readonly variants: readonly OfficialCatalogVariantSummary[]
}

export interface OfficialCatalogFamilySummary {
  readonly familyId: string
  readonly checkpoints: readonly OfficialCatalogCheckpointSummary[]
}

export type OfficialCatalogSummary =
  | {
      readonly state: 'available'
      readonly source: 'bundled-official'
      readonly trust: 'release-pinned'
      readonly catalogId: string
      readonly sequence: string
      readonly mode: 'read-only'
      readonly families: readonly OfficialCatalogFamilySummary[]
    }
  | {
      readonly state: 'unavailable'
      readonly source: 'bundled-official'
      readonly reason:
        | 'BUNDLE_MISSING'
        | 'RELEASE_INPUT_INVALID'
        | 'ROOT_UNRECOGNIZED'
        | 'SIGNATURE_INVALID'
        | 'SCHEMA_REJECTED'
        | 'POLICY_REJECTED'
        | 'RELEASE_PIN_REJECTED'
    }

export interface ModelStorageLocationDisplay {
  readonly volumeName: string
  readonly managedFolderName: 'Design Asset Manager Model Library'
}

export type ModelStorageSummary =
  | {
      readonly state: 'not-configured'
    }
  | {
      readonly state: 'configured'
      readonly registration: string
      readonly condition:
        | 'not-observed'
        | 'available'
        | 'unavailable'
        | 'wrong-identity'
        | 'read-only'
        | 'unsafe'
        | 'schema-unsupported'
        | 'integrity-failed'
        | 'busy'
        | 'recovery-blocked'
      readonly location: ModelStorageLocationDisplay | null
    }

export type ModelStorageReviewEffect =
  | 'provision-and-select-first-root'
  | 'reconnect-current-root'

export type ModelStoragePortReview =
  | { readonly state: 'cancelled' }
  | {
      readonly state: 'blocked'
      readonly reason: 'MIGRATION_REQUIRED' | 'STORAGE_UNAVAILABLE'
    }
  | {
      readonly state: 'review-required'
      readonly candidate: object
      readonly effect: ModelStorageReviewEffect
      readonly location: ModelStorageLocationDisplay
    }

export type ModelStoragePortConfirmation =
  | { readonly ok: true; readonly value: ModelStorageSummary }
  | {
      readonly ok: false
      readonly error: {
        readonly code:
          | 'STORAGE_REVIEW_STALE'
          | 'STORAGE_UNAVAILABLE'
          | 'STORAGE_BUSY'
        readonly retry:
          | 'review-again'
          | 'after-user-action'
          | 'after-session-closes'
      }
    }

export type ModelStoragePortResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false
      readonly error: {
        readonly code:
          | 'STORAGE_UNAVAILABLE'
          | 'STORAGE_BUSY'
          | 'REGISTRY_INTEGRITY_FAILED'
          | 'REGISTRY_SCHEMA_UNSUPPORTED'
          | 'REGISTRY_READ_ONLY'
        readonly retry:
          | 'after-user-action'
          | 'after-session-closes'
          | 'not-retryable'
      }
    }

export interface ModelLibraryStoragePort {
  summarize(): Promise<ModelStoragePortResult<ModelStorageSummary>>
  reviewLocation?(
    source: 'recommended' | 'choose-parent'
  ): Promise<ModelStoragePortResult<ModelStoragePortReview>>
  confirmLocation?(candidate: object): Promise<ModelStoragePortConfirmation>
}

export type ModelStorageReviewRef = string & {
  readonly __modelStorageReview: true
}

export type ModelStorageSelectionReview =
  | { readonly state: 'cancelled' }
  | {
      readonly state: 'blocked'
      readonly reason: 'MIGRATION_REQUIRED' | 'STORAGE_UNAVAILABLE'
    }
  | {
      readonly state: 'review-required'
      readonly review: ModelStorageReviewRef
      readonly effect: ModelStorageReviewEffect
      readonly location: ModelStorageLocationDisplay
      readonly consequences: {
        readonly provisionsAppOwnedRoot: true
        readonly updatesDeviceLocalRegistration: true
        readonly movesModelBytes: false
        readonly deletesModelBytes: false
        readonly performsMigration: false
        readonly importsModels: false
        readonly installsModels: false
        readonly activatesModel: false
        readonly startsRuntime: false
        readonly startsInference: false
      }
    }

export type ModelLibraryStorageRequest =
  | { readonly kind: 'review-recommended-location' }
  | { readonly kind: 'review-chosen-parent' }
  | {
      readonly kind: 'confirm-reviewed-selection'
      readonly review: ModelStorageReviewRef
      readonly decision: 'use-reviewed-model-storage-root'
    }

export interface ModelStorageConfigurationReceipt {
  readonly disposition:
    | 'selected-first-root'
    | 'reconnected-current-root'
  readonly storage: Extract<ModelStorageSummary, { state: 'configured' }>
}

export type ModelStorageConfigurationResult =
  | ModelStorageSelectionReview
  | ModelStorageConfigurationReceipt

const STORAGE_CONFIGURATION_CONSEQUENCES = Object.freeze({
  provisionsAppOwnedRoot: true as const,
  updatesDeviceLocalRegistration: true as const,
  movesModelBytes: false as const,
  deletesModelBytes: false as const,
  performsMigration: false as const,
  importsModels: false as const,
  installsModels: false as const,
  activatesModel: false as const,
  startsRuntime: false as const,
  startsInference: false as const
})

export interface ModelLibraryPageSummary {
  readonly catalog: OfficialCatalogSummary
  readonly storage: ModelStorageSummary
}

export interface ModelLibraryAiConsoleSummary {
  readonly catalog:
    | {
        readonly state: 'available'
        readonly familyCount: number
        readonly variantCount: number
      }
    | {
        readonly state: 'unavailable'
      }
  readonly storage:
    | { readonly state: 'setup-required' }
    | { readonly state: 'not-observed' }
    | { readonly state: 'available' }
    | {
        readonly state: 'attention-required'
        readonly condition: Exclude<
          Extract<ModelStorageSummary, { state: 'configured' }>['condition'],
          'not-observed' | 'available'
        >
      }
  readonly destination: 'model-library'
}

export interface ModelLibraryWorkspace {
  summarize(
    request: { readonly kind: 'page' }
  ): Promise<ModelLibraryWorkspaceResult<ModelLibraryPageSummary>>

  summarize(
    request: { readonly kind: 'ai-console' }
  ): Promise<ModelLibraryWorkspaceResult<ModelLibraryAiConsoleSummary>>

  configureStorage(
    request: ModelLibraryStorageRequest
  ): Promise<ModelLibraryWorkspaceResult<ModelStorageConfigurationResult>>
}

export interface CreateModelLibraryWorkspaceInput {
  readonly officialCatalogReleaseState?: 'missing' | 'invalid' | 'candidate'
  readonly pinnedCatalogTrustRoot?: OfficialCatalogPinnedTrustRoot
  readonly bundledCatalog?: BundledOfficialCatalogPackage
  readonly storage?: ModelLibraryStoragePort
}

export function createModelLibraryWorkspace(
  input: CreateModelLibraryWorkspaceInput
): ModelLibraryWorkspace {
  const storageReviews = new Map<
    ModelStorageReviewRef,
    { readonly candidate: object; readonly effect: ModelStorageReviewEffect }
  >()
  let bundledCatalogProjection: OfficialCatalogSummary | undefined
  let lastStorageSummary: ModelStorageSummary | undefined

  const readBundledCatalog = (): OfficialCatalogSummary => {
    if (input.officialCatalogReleaseState === 'invalid') {
      return Object.freeze({
        state: 'unavailable',
        source: 'bundled-official',
        reason: 'RELEASE_INPUT_INVALID'
      })
    }
    bundledCatalogProjection ??= projectBundledOfficialCatalog(
      input.pinnedCatalogTrustRoot,
      input.bundledCatalog
    )
    return bundledCatalogProjection
  }
  async function summarize(
    request: { readonly kind: 'page' }
  ): Promise<ModelLibraryWorkspaceResult<ModelLibraryPageSummary>>
  async function summarize(
    request: { readonly kind: 'ai-console' }
  ): Promise<ModelLibraryWorkspaceResult<ModelLibraryAiConsoleSummary>>
  async function summarize(
    request: { readonly kind: 'page' | 'ai-console' }
  ): Promise<ModelLibraryWorkspaceResult<
    ModelLibraryPageSummary | ModelLibraryAiConsoleSummary
  >> {
    try {
      const catalog = readBundledCatalog()
      if (request.kind === 'ai-console') {
        const catalogSummary: ModelLibraryAiConsoleSummary['catalog'] =
          catalog.state === 'available'
            ? {
                state: 'available',
                familyCount: catalog.families.length,
                variantCount: catalog.families.reduce(
                  (familyTotal, family) => familyTotal +
                    family.checkpoints.reduce(
                      (checkpointTotal, checkpoint) =>
                        checkpointTotal + checkpoint.variants.length,
                      0
                    ),
                  0
                )
              }
            : { state: 'unavailable' }
        return {
          ok: true,
          value: {
            catalog: catalogSummary,
            storage: lastStorageSummary
              ? projectAiConsoleStorage(lastStorageSummary)
              : input.storage
                ? { state: 'not-observed' }
                : { state: 'setup-required' },
            destination: 'model-library'
          }
        }
      }
      const storageResult = input.storage
        ? await input.storage.summarize()
        : {
            ok: true as const,
            value: { state: 'not-configured' as const }
          }
      if (!storageResult.ok) return storageResult
      const storage = storageResult.value
      lastStorageSummary = storage
      return {
        ok: true,
        value: {
          catalog,
          storage
        }
      }
    } catch {
      return workspaceFailure('STORAGE_UNAVAILABLE', 'after-user-action')
    }
  }

  async function configureStorage(
    request: ModelLibraryStorageRequest
  ): Promise<ModelLibraryWorkspaceResult<ModelStorageConfigurationResult>> {
    try {
      if (readBundledCatalog().state !== 'available') {
      return {
        ok: false,
        error: {
          code: 'MODULE_UNAVAILABLE',
          retry: 'not-retryable'
        }
      }
    }
    if (request.kind === 'confirm-reviewed-selection') {
      const reviewed = storageReviews.get(request.review)
      if (!reviewed || request.decision !== 'use-reviewed-model-storage-root') {
        return {
          ok: false,
          error: {
            code: 'STORAGE_REVIEW_STALE',
            retry: 'review-again'
          }
        }
      }
      if (!input.storage?.confirmLocation) {
        return {
          ok: false,
          error: {
            code: 'MODULE_UNAVAILABLE',
            retry: 'not-retryable'
          }
        }
      }
      storageReviews.delete(request.review)
      const confirmed = await input.storage.confirmLocation(reviewed.candidate)
      if (!confirmed.ok) return confirmed
      const storage = confirmed.value
      if (storage.state !== 'configured') {
        return {
          ok: false,
          error: {
            code: 'MODULE_UNAVAILABLE',
            retry: 'not-retryable'
          }
        }
      }
      lastStorageSummary = storage
      return {
        ok: true,
        value: {
          disposition: reviewed.effect === 'provision-and-select-first-root'
            ? 'selected-first-root'
            : 'reconnected-current-root',
          storage
        }
      }
    }
    if (!input.storage?.reviewLocation) {
      return {
        ok: false,
        error: {
          code: 'MODULE_UNAVAILABLE',
          retry: 'not-retryable'
        }
      }
    }
    const source = request.kind === 'review-recommended-location'
      ? 'recommended' as const
      : 'choose-parent' as const
    const reviewedResult = await input.storage.reviewLocation(source)
    if (!reviewedResult.ok) return reviewedResult
    const reviewed = reviewedResult.value
    if (reviewed.state !== 'review-required') return { ok: true, value: reviewed }

    const review = `model-storage-review:${randomBytes(32).toString('hex')}` as
      ModelStorageReviewRef
    storageReviews.set(review, {
      candidate: reviewed.candidate,
      effect: reviewed.effect
    })
    while (storageReviews.size > 32) {
      const oldest = storageReviews.keys().next().value as
        ModelStorageReviewRef | undefined
      if (!oldest) break
      storageReviews.delete(oldest)
    }
      return {
        ok: true,
        value: {
          state: 'review-required',
          review,
          effect: reviewed.effect,
          location: reviewed.location,
          consequences: STORAGE_CONFIGURATION_CONSEQUENCES
        }
      }
    } catch {
      return workspaceFailure('STORAGE_UNAVAILABLE', 'after-user-action')
    }
  }

  return Object.freeze({ summarize, configureStorage })
}

function projectAiConsoleStorage(
  storage: ModelStorageSummary
): ModelLibraryAiConsoleSummary['storage'] {
  if (storage.state === 'not-configured') return { state: 'setup-required' }
  if (storage.condition === 'not-observed') return { state: 'not-observed' }
  if (storage.condition === 'available') return { state: 'available' }
  return {
    state: 'attention-required',
    condition: storage.condition
  }
}

function workspaceFailure(
  code: Extract<ModelLibraryWorkspaceResult<never>, { ok: false }>['error']['code'],
  retry: Extract<ModelLibraryWorkspaceResult<never>, { ok: false }>['error']['retry']
): Extract<ModelLibraryWorkspaceResult<never>, { ok: false }> {
  return { ok: false, error: { code, retry } }
}
