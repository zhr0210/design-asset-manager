import type { AdmittedModelCatalog } from './model-catalog-admission.tracer'
import type { ModelLibrary } from './model-library'
import type { ModelArtifactByteSource } from './transactional-model-library.tracer'

declare const modelStorageRootTargetBrand: unique symbol
declare const modelStorageRootRefBrand: unique symbol

export interface ModelStorageRootTarget {
  readonly [modelStorageRootTargetBrand]: true
}

export type ModelStorageRootRef = string & {
  readonly [modelStorageRootRefBrand]: true
}

export type ModelStorageAuthorityErrorCode =
  | 'STORAGE_TARGET_INVALID'
  | 'STORAGE_TARGET_UNSAFE'
  | 'STORAGE_TARGET_NOT_EMPTY'
  | 'STORAGE_NOT_PROVISIONED'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_UNSAFE'
  | 'STORAGE_READ_ONLY'
  | 'WRONG_STORAGE_IDENTITY'
  | 'STORAGE_SCHEMA_UNSUPPORTED'
  | 'STORAGE_INTEGRITY_FAILED'
  | 'STORAGE_BUSY'
  | 'RECOVERY_BLOCKED'

export interface ModelStorageAuthorityError {
  readonly code: ModelStorageAuthorityErrorCode
  readonly retry: 'after-user-action' | 'after-session-closes' | 'not-retryable'
}

export type ModelStorageAuthorityResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ModelStorageAuthorityError }

export interface ModelStorageSession {
  readonly library: ModelLibrary
  close(): Promise<void>
}

export interface ModelStorageAuthority {
  provision(target: ModelStorageRootTarget): Promise<ModelStorageAuthorityResult<{
    readonly root: ModelStorageRootRef
  }>>

  open(root: ModelStorageRootRef): Promise<ModelStorageAuthorityResult<{
    readonly session: ModelStorageSession
  }>>
}

export interface CreateModelStorageAuthorityTracerInput {
  readonly rootDirectory: string
  readonly catalog: AdmittedModelCatalog
  readonly byteSource: ModelArtifactByteSource
  readonly createActivityId: () => string
  readonly createStorageRecordId: () => string
  readonly createStorageIdentity: () => string
  /** @internal Real on-disk fault fixture for public-seam tracer tests only. */
  readonly tracerOnlyProvisionedState?:
    | 'model-staging-read-only'
    | 'authority-sqlite-read-only'
    | 'authority-schema-v2'
    | 'authority-integrity-invalid'
    | 'model-control-missing'
  /** @internal Cooperative collision fixture; never part of ModelStorageAuthority. */
  readonly tracerOnlyProvisionCollision?:
    | 'foreign-control-entry'
    | 'foreign-authority-database'
}

export interface ModelStorageAuthorityTracer {
  readonly authority: ModelStorageAuthority
  readonly target: ModelStorageRootTarget
}

export { createModelStorageAuthorityTracer } from './model-storage-authority.internal'
