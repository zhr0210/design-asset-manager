export type CaptureIdentityKind =
  | 'copy-plan'
  | 'plan-item'
  | 'capture-batch'
  | 'capture-request'
  | 'capture-attempt'
  | 'candidate'
  | 'original-storage-object'
  | 'design-asset'
  | 'promotion-link'

export type SupportedCaptureFormat = 'jpeg' | 'png' | 'webp' | 'mp4'

export type CopyPlanItemEligibility =
  | { kind: 'eligible' }
  | {
      kind: 'excluded'
      code: 'not-a-regular-file' | 'source-unreadable' | 'unsupported-format'
      message: string
    }

export interface CopyIntoLibraryPlanItem {
  planItemIdentity: string
  receivedFileName: string
  sourceScopeLabel: string
  sourceBytes: number
  detectedFormat: SupportedCaptureFormat | null
  eligibility: CopyPlanItemEligibility
}

export interface CopyIntoLibraryPlan {
  receipt: string
  activeLibrary: {
    identity: string
    generation: string
  }
  summary: {
    selectedCount: number
    eligibleCount: number
    excludedCount: number
    sourceBytes: number
    estimatedManagedBytes: number
  }
  items: readonly CopyIntoLibraryPlanItem[]
  confirmable: boolean
}

export type PrepareAddAssetsOutcome =
  | { kind: 'cancelled' }
  | { kind: 'planned'; plan: CopyIntoLibraryPlan }

export interface ConfirmCopyPlanCommand {
  kind: 'confirm-plan'
  planReceipt: string
}

export interface InspectCaptureBatchRequest {
  batchIdentity: string
}

interface CaptureBatchItemIdentities {
  planItemIdentity: string
  captureRequestIdentity: string
  candidateIdentity: string
  originalStorageObjectIdentity: string
}

interface ManagedCandidateSnapshot {
  managedOriginalRef: string
  copyVerification: 'verified'
  sourcePreservation: 'verified'
}

interface ActiveCandidateSnapshot extends ManagedCandidateSnapshot {
  state: 'active'
}

interface PromotedCandidateSnapshot extends ManagedCandidateSnapshot {
  state: 'promoted'
}

export type CaptureBatchItemSnapshot = CaptureBatchItemIdentities & (
  | {
      state: 'intake'
      candidate: { state: 'intake' }
      preview: { state: 'pending' }
    }
  | {
      state: 'active'
      candidate: ActiveCandidateSnapshot
      preview: { state: 'pending' }
    }
  | {
      state: 'promoted'
      candidate: PromotedCandidateSnapshot
      preview: {
        state: 'ready'
        generationIdentity: string
        gridThumbnailRef: string
      }
      promotion: {
        state: 'promoted'
        designAssetIdentity: string
        promotionLinkIdentity: string
      }
    }
)

export interface CaptureBatchSnapshot {
  batchIdentity: string
  activeLibraryIdentity: string
  state: 'running' | 'complete'
  items: readonly CaptureBatchItemSnapshot[]
}

export interface AddAssetsWorkflow {
  prepare(): Promise<PrepareAddAssetsOutcome>
  dispatch(command: ConfirmCopyPlanCommand): Promise<CaptureBatchSnapshot>
  inspect(request: InspectCaptureBatchRequest): Promise<CaptureBatchSnapshot>
}

export type CaptureIntakeErrorCode =
  | 'plan-not-found'
  | 'plan-not-confirmable'
  | 'plan-stale'
  | 'capture-identity-conflict'
  | 'capture-batch-not-found'
  | 'capture-transition-conflict'
  | 'capture-persistence-unavailable'
  | 'source-changed'
  | 'copy-verification-failed'
  | 'managed-storage-failed'
  | 'preview-generation-failed'

export class CaptureIntakeError extends Error {
  constructor(readonly code: CaptureIntakeErrorCode, message: string) {
    super(message)
    this.name = 'CaptureIntakeError'
  }
}

export interface LocalFileSelection {
  filePath: string
}

export type LocalFileSelectionOutcome =
  | { kind: 'cancelled' }
  | { kind: 'selected'; files: readonly LocalFileSelection[] }

export interface ActiveLibraryContext {
  identity: string
  generation: string
  libraryRootDirectory: string
  managedOriginalsDirectory: string
  intakeStagingDirectory: string
  requiredPreviewsDirectory: string
}

export interface SystemPreviewEvidence {
  sourceGeneration: string
  format: SupportedCaptureFormat
}

export type SystemPreviewOutcome =
  | {
      kind: 'ready'
      previewGenerationIdentity: string
      gridThumbnailRef: string
      gridThumbnailPath: string
      evidence: SystemPreviewEvidence
    }
  | {
      kind: 'failed'
    }

export interface GenerateSystemPreviewInput {
  candidateIdentity: string
  sourceGeneration: string
  managedOriginalRef: string
  managedOriginalPath: string
  activeLibrary: ActiveLibraryContext
}

export type CapturePersistenceAcceptance =
  | { kind: 'accepted' }
  | { kind: 'replayed'; snapshot: CaptureBatchSnapshot }

export interface CapturePersistenceAdapter {
  acceptOrReplay(input: {
    batchIdentity: string
    activeLibraryIdentity: string
    items: readonly {
      planItemIdentity: string
      captureRequestIdentity: string
      candidateIdentity: string
      originalStorageObjectIdentity: string
      canonicalEnvelopeDigest: string
      captureMethod: 'copy-into-library'
      receivedFileName: string
      sourceBytes: number
      sourceGeneration: string
      sourceLocatorDigest: string
      format: SupportedCaptureFormat
    }[]
  }): Promise<CapturePersistenceAcceptance>
  commitCandidateActivation(input: {
    captureRequestIdentity: string
    managedOriginalRef: string
  }): Promise<CaptureBatchSnapshot>
  commitReadyPromotion(input: {
    captureRequestIdentity: string
    previewGenerationIdentity: string
    gridThumbnailRef: string
    gridThumbnailPath: string
    designAssetIdentity: string
    promotionLinkIdentity: string
    managedOriginalPath: string
  }): Promise<CaptureBatchSnapshot>
  completeBatch(batchIdentity: string): Promise<CaptureBatchSnapshot>
  inspect(batchIdentity: string): Promise<CaptureBatchSnapshot | null>
}

/** Restricted named sink for atomic lifecycle registration during Promotion. */
export interface CapturePromotionLifecycleSink {
  registerPromotedAsset(input: {
    designAssetIdentity: string
    ownership: 'managed'
    committedAt: string
  }): void
}

export interface ConfirmedCopyPlanItem {
  planItemIdentity: string
  sourcePath: string
  receivedFileName: string
  sourceBytes: number
  sourceDigest: string
  sourceLocatorDigest: string
  sourceModifiedAtMs: number
  sourceGeneration: string
  format: SupportedCaptureFormat
}

export interface ConfirmedCopyPlan {
  receipt: string
  digest: string
  activeLibrary: ActiveLibraryContext
  items: readonly ConfirmedCopyPlanItem[]
}

export interface CaptureGateway {
  start(plan: ConfirmedCopyPlan): Promise<CaptureBatchSnapshot>
  inspect(batchIdentity: string): Promise<CaptureBatchSnapshot | null>
}

export interface CaptureIntakeDependencies {
  inspectVideo?(file:string):Promise<boolean>
  /** Internal explicit recovery only; ordinary plan replay remains read-only. */
  resumeAccepted?: boolean
  selectLocalFiles(): Promise<LocalFileSelectionOutcome>
  resolveActiveLibrary(): Promise<ActiveLibraryContext>
  persistence: CapturePersistenceAdapter
  generateSystemPreview(input: GenerateSystemPreviewInput): Promise<SystemPreviewOutcome>
  createIdentity(kind: CaptureIdentityKind): string
}
