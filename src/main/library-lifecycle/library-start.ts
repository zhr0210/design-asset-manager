declare const libraryStartCandidateBrand: unique symbol

/** Main-issued inspection scope, not a serialized IPC ref or write capability. */
export interface LibraryStartCandidateReference {
  readonly [libraryStartCandidateBrand]: true
}

export type LibraryStartInspectionRequest =
  | Readonly<{ kind: 'inspect-candidate'; candidate: LibraryStartCandidateReference }>
  | Readonly<{ kind: 'selection-cancelled' }>

export type LibraryStartDisposition =
  | { state: 'selection-cancelled'; reason: 'selection-cancelled' }
  | { state: 'compatible'; reason: 'candidate-compatible' }
  | { state: 'legacy-migration-required'; reason: 'legacy-library' }
  | { state: 'creation-required'; reason: 'library-missing' }
  | { state: 'unavailable'; reason: 'candidate-unavailable' }
  | { state: 'recovery-required'; reason: 'library-recovery-required' }
  | { state: 'unsupported'; reason: 'library-unsupported' | 'filesystem-unsupported' }
  | { state: 'busy'; reason: 'library-busy' }
  | { state: 'read-only'; reason: 'storage-read-only' }
  | { state: 'not-assessed'; reason: 'evidence-not-assessed' | 'manifest-compatible-evidence-pending' | 'filesystem-observed-evidence-pending' | 'filesystem-capability-not-assessed' | 'invalid-request' | 'unknown-candidate' | 'invalid-observation' | 'observation-failed' }

export type LibraryStartInspectionResult = Readonly<LibraryStartDisposition & {
  candidate: LibraryStartCandidateReference | null
  writeAuthority: 'not-issued'
}>

/** Inspection eligibility only. No method here can create or activate a Library. */
export interface LibraryStart {
  inspect(request: LibraryStartInspectionRequest): Promise<LibraryStartInspectionResult>
}
