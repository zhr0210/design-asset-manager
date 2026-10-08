declare const libraryCreationReviewBrand: unique symbol

/** Main-issued in-process review identity, not a serializable write token. */
export interface LibraryCreationReviewReceipt {
  readonly [libraryCreationReviewBrand]: true
}

export type LibraryCreationPlanningReason =
  | 'invalid-request' | 'invalid-target' | 'target-unavailable' | 'target-not-empty'
  | 'target-unsafe' | 'target-collision' | 'namespace-not-assessed' | 'target-changed'
  | 'qualification-not-assessed' | 'filesystem-unsupported' | 'storage-read-only'
  | 'lock-not-qualified' | 'capacity-insufficient' | 'path-headroom-insufficient'
  | 'invalid-manifest-binding' | 'unknown-review' | 'review-stale' | 'review-superseded'

export interface LibraryCreationReview {
  readonly receipt: LibraryCreationReviewReceipt
  readonly targetState: 'missing' | 'empty'
  readonly identities: Readonly<{
    lineageIdentity: string
    libraryIdentity: string
    controlStoreIdentity: string
    generation: string
  }>
  readonly roles: readonly ['library-control', 'managed-originals', 'required-previews', 'intake-staging']
  readonly requirements: Readonly<{ requiredBytes: number; safetyReserveBytes: number }>
  readonly collisions: Readonly<{
    targetNamespace: 'none-detected'
    plannedRoles: 'none-detected'
    onDetection: 'blocks-confirmation'
  }>
  readonly consequences: readonly [
    'creates-library-state-after-confirmation', 'external-sources-unchanged',
    'capacity-not-reserved', 'confirmation-revalidates-target'
  ]
}

export type LibraryCreationPlanningResult = Readonly<(
  | {
      state: 'ready'
      confirmable: true
      review: LibraryCreationReview
      capacity: Readonly<{
        availableBytes: number
        remainingAfterCreationBytes: number
        remainingBeyondReserveBytes: number
      }>
    }
  | { state: 'blocked'; confirmable: false; reason: LibraryCreationPlanningReason }
  | { state: 'cancelled'; confirmable: false; reason: 'selection-cancelled' }
) & { writeAuthority: 'not-issued' }>

/** Read-only planning and receipt revalidation; no method confirms or creates. */
export interface LibraryCreationPlanner {
  prepare(request: Readonly<{ kind: 'review-target' } | { kind: 'selection-cancelled' }>):
    Promise<LibraryCreationPlanningResult>
  inspect(request: Readonly<{ receipt: LibraryCreationReviewReceipt }>):
    Promise<LibraryCreationPlanningResult>
}
