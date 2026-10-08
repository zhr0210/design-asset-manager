export interface ModelArtifactRevisionRef {
  readonly catalogId: string
  readonly manifestId: string
}

export interface ModelArtifactPublicIdentity {
  readonly ref: ModelArtifactRevisionRef
  readonly familyId: string
  readonly checkpointId: string
  readonly variantId: string
  readonly displayName: string
  readonly immutableRevision: string
}

export type ModelArtifactReviewBlockReason =
  | 'MANIFEST_NOT_VERIFIED'
  | 'TRUST_NOT_CURRENT'
  | 'DATA_ONLY_POLICY_NOT_VERIFIED'
  | 'RUNTIME_INCOMPATIBLE'
  | 'STORAGE_UNAVAILABLE'
  | 'ALREADY_VERIFIED_STORED'

export interface ModelArtifactAcknowledgement {
  readonly id: string
  readonly kind: 'license' | 'network-cost' | 'storage-impact' | 'gated-source'
  readonly label: string
}

export interface ModelArtifactStorageImpact {
  readonly logicalBytes: number
  readonly alreadyPresentSharedBytes: number
  readonly transferRequiredBytes: number
  readonly additionalPhysicalBytes: number
}

export interface ModelArtifactInstallConsequences {
  readonly activatesModel: false
  readonly startsRuntime: false
  readonly startsInference: false
  readonly reanalysesAssets: false
  readonly changesEmbeddingSpace: false
  readonly authorizesExternalUpload: false
}

export type ModelArtifactReview =
  | {
      readonly state: 'confirmable'
      readonly fingerprint: string
      readonly requiredAcknowledgements: readonly ModelArtifactAcknowledgement[]
      readonly storageImpact: ModelArtifactStorageImpact
      readonly consequences: ModelArtifactInstallConsequences
    }
  | {
      readonly state: 'blocked' | 'not-required'
      readonly reasons: readonly ModelArtifactReviewBlockReason[]
    }

export type ModelArtifactLifecycle =
  | { readonly kind: 'catalog-only' }
  | {
      readonly kind: 'verified-stored'
      readonly storageRecordId: string
      readonly activeCapabilityAssignments: readonly string[]
    }

export interface ModelArtifactPublicSummary {
  readonly identity: ModelArtifactPublicIdentity
  readonly lifecycle: ModelArtifactLifecycle
  readonly review: ModelArtifactReview
}

export interface ModelLibraryActivitySummary {
  readonly activityId: string
  readonly artifact: ModelArtifactRevisionRef
  readonly state: 'verified-stored'
  readonly storageRecordId: string
  readonly activationChanged: false
}

export interface ModelLibrarySummary {
  readonly revision: number
  readonly artifacts: readonly ModelArtifactPublicSummary[]
  readonly activities: readonly ModelLibraryActivitySummary[]
}

export type ModelLibrarySummaryRequest =
  | { readonly kind: 'library' }
  | {
      readonly kind: 'artifact'
      readonly artifact: ModelArtifactRevisionRef
    }

export type ModelLibraryErrorCode =
  | 'ARTIFACT_NOT_FOUND'
  | 'CONFIRMATION_REQUIRED'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_STALE'
  | 'ACKNOWLEDGEMENT_REQUIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INSTALL_BLOCKED'
  | 'ARTIFACT_BYTES_REJECTED'
  | 'INSTALL_STORAGE_FAILED'
  | 'RECOVERY_BLOCKED'
  | 'STORAGE_AUTHORITY_LOST'

export interface ModelLibraryError {
  readonly code: ModelLibraryErrorCode
  readonly retry: 'review-again' | 'after-user-action' | 'not-retryable'
}

export type ModelLibraryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ModelLibraryError }

export interface InstallReviewedModelArtifactRequest {
  readonly artifact: ModelArtifactRevisionRef
  readonly reviewFingerprint: string
  readonly decision: 'install-exact-reviewed-artifact'
  readonly acceptedAcknowledgements: readonly string[]
}

export interface InstallReviewedModelArtifactReceipt {
  readonly activity: ModelLibraryActivitySummary
  readonly disposition: 'new-install' | 'idempotent-replay'
}

/**
 * Target Model Library core Interface. This tracer is not connected to the
 * application composition root or any public compatibility seam.
 */
export interface ModelLibrary {
  summarize(
    request: ModelLibrarySummaryRequest
  ): Promise<ModelLibraryResult<ModelLibrarySummary>>

  install(
    request: InstallReviewedModelArtifactRequest
  ): Promise<ModelLibraryResult<InstallReviewedModelArtifactReceipt>>
}
