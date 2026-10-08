import type { AdmittedModelCatalog } from './model-catalog-admission.tracer'
import type { ModelStorageRootRef, ModelStorageSession } from
  './model-storage-authority.tracer'
import type { ModelArtifactByteSource } from './transactional-model-library.tracer'

declare const modelStorageRootCandidateBrand: unique symbol
declare const modelStorageRootRegistrationBrand: unique symbol

export interface ModelStorageRootCandidate {
  readonly [modelStorageRootCandidateBrand]: true
}

export type ModelStorageRootRegistrationRef = string & {
  readonly [modelStorageRootRegistrationBrand]: true
}

export interface ModelStorageRootRegistrySummary {
  readonly revision: number
  readonly current:
    | { readonly state: 'not-configured' }
    | {
        readonly state: 'configured'
        readonly registration: ModelStorageRootRegistrationRef
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
      }
}

export interface ModelStorageRootSelectionConsequences {
  readonly movesModelBytes: false
  readonly deletesModelBytes: false
  readonly performsMigration: false
  readonly activatesModel: false
  readonly startsRuntime: false
  readonly startsInference: false
}

export type ModelStorageRootSelectionReview =
  | {
      readonly state: 'confirmable'
      readonly fingerprint: string
      readonly effect: 'select-first-root' | 'reconnect-current-root'
      readonly consequences: ModelStorageRootSelectionConsequences
    }
  | {
      readonly state: 'blocked'
      readonly reasons: readonly ['MIGRATION_REQUIRED']
    }

export type ModelStorageRootRegistryErrorCode =
  | 'CURRENT_STORAGE_NOT_CONFIGURED'
  | 'CANDIDATE_INVALID'
  | 'SELECTION_REVIEW_REQUIRED'
  | 'SELECTION_REVIEW_STALE'
  | 'SELECTION_CONFIRMATION_REQUIRED'
  | 'CURRENT_SESSION_ACTIVE'
  | 'REGISTRY_SCHEMA_UNSUPPORTED'
  | 'REGISTRY_INTEGRITY_FAILED'
  | 'REGISTRY_READ_ONLY'
  | 'REGISTRY_STORAGE_FAILED'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_UNSAFE'
  | 'STORAGE_READ_ONLY'
  | 'WRONG_STORAGE_IDENTITY'
  | 'STORAGE_SCHEMA_UNSUPPORTED'
  | 'STORAGE_INTEGRITY_FAILED'
  | 'STORAGE_BUSY'
  | 'RECOVERY_BLOCKED'

export interface ModelStorageRootRegistryError {
  readonly code: ModelStorageRootRegistryErrorCode
  readonly retry:
    | 'review-again'
    | 'after-user-action'
    | 'after-session-closes'
    | 'not-retryable'
}

export type ModelStorageRootRegistryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ModelStorageRootRegistryError }

export interface ModelStorageRootRegistryOpenReceipt {
  readonly disposition:
    | 'opened-current'
    | 'selected-first-root'
    | 'reconnected-current-root'
  readonly summary: ModelStorageRootRegistrySummary
  readonly session: ModelStorageSession
}

export interface ModelStorageRootRegistry {
  summarize(
    request: { readonly kind: 'registry' }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootRegistrySummary>>

  summarize(
    request: {
      readonly kind: 'candidate'
      readonly candidate: ModelStorageRootCandidate
    }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootSelectionReview>>

  open(
    request:
      | { readonly kind: 'current' }
      | {
          readonly kind: 'select-reviewed-root'
          readonly candidate: ModelStorageRootCandidate
          readonly reviewFingerprint: string
          readonly decision: 'make-reviewed-model-storage-root-current'
        }
  ): Promise<ModelStorageRootRegistryResult<ModelStorageRootRegistryOpenReceipt>>
}

export interface OpenModelStorageRootRegistryTracerInput {
  readonly controlDirectory: string
  readonly catalog: AdmittedModelCatalog
  readonly byteSource: ModelArtifactByteSource
  readonly createActivityId: () => string
  readonly createStorageRecordId: () => string
  /** @internal Real on-disk Registry fault fixture for public-seam tests only. */
  readonly tracerOnlyRegistryState?:
    | 'registry-database-read-only'
    | 'registry-schema-v2'
    | 'registry-integrity-extra-object'
}

export interface CreateModelStorageRootCandidateTracerInput {
  readonly rootDirectory: string
  readonly root: ModelStorageRootRef
}

export interface ModelStorageRootRegistryTracer {
  readonly registry: ModelStorageRootRegistry
  createCandidate(
    input: CreateModelStorageRootCandidateTracerInput
  ): ModelStorageRootCandidate
}

export { openModelStorageRootRegistryTracer } from
  './model-storage-root-registry.internal'
