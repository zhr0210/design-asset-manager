import type {
  LibraryStart,
  LibraryStartCandidateReference,
  LibraryStartInspectionRequest,
  LibraryStartInspectionResult,
  LibraryStartDisposition
} from './library-start'
import { snapshotPlainDataRecord } from './plain-data-record.internal'

/** Trusted Main-only read-only Adapter. In this tracer it supplies memory fixtures. */
export interface LibraryStartObservationAdapter {
  observe(): unknown | Promise<unknown>
}

/** Bind one Main-selected scope; this is not a product selection/creation API. */
export function createLibraryStartTracer(adapter: LibraryStartObservationAdapter): Readonly<{
  libraryStart: LibraryStart
  candidate: LibraryStartCandidateReference
}> {
  // Only this constructor issues the nominal ref; runtime admission also checks identity.
  const candidate = Object.freeze({}) as LibraryStartCandidateReference
  const libraryStart: LibraryStart = Object.freeze({
    async inspect(request: LibraryStartInspectionRequest): Promise<LibraryStartInspectionResult> {
      const input = snapshotPlainDataRecord(request, 5)
      if (!input || !(
        (input.kind === 'selection-cancelled' && Object.keys(input).length === 1) ||
        (input.kind === 'inspect-candidate' && Object.keys(input).length === 2 && Object.hasOwn(input, 'candidate'))
      )) {
        return inspectionResult(null, { state: 'not-assessed', reason: 'invalid-request' })
      }
      if (input.kind === 'selection-cancelled') {
        return inspectionResult(null, { state: 'selection-cancelled', reason: 'selection-cancelled' })
      }
      if (input.candidate !== candidate) {
        return inspectionResult(null, { state: 'not-assessed', reason: 'unknown-candidate' })
      }
      try {
        const observation = await adapter.observe()
        return inspectionResult(candidate, classify(observation))
      } catch {
        return inspectionResult(candidate, { state: 'not-assessed', reason: 'observation-failed' })
      }
    }
  })
  return Object.freeze({ libraryStart, candidate })
}

function inspectionResult(
  candidate: LibraryStartCandidateReference | null,
  disposition: LibraryStartDisposition
): LibraryStartInspectionResult {
  return Object.freeze({ candidate, ...disposition, writeAuthority: 'not-issued' })
}

function classify(value: unknown): LibraryStartDisposition {
  const record = snapshotPlainDataRecord(value, 5)
  if (record && Object.keys(record).length === 1) {
    switch (record.kind) {
      case 'legacy': return { state: 'legacy-migration-required', reason: 'legacy-library' }
      case 'missing': return { state: 'creation-required', reason: 'library-missing' }
      case 'unavailable': return { state: 'unavailable', reason: 'candidate-unavailable' }
      case 'not-assessed': return { state: 'not-assessed', reason: 'evidence-not-assessed' }
      case 'manifest-compatible': return { state: 'not-assessed', reason: 'manifest-compatible-evidence-pending' }
      case 'manifest-invalid': return { state: 'recovery-required', reason: 'library-recovery-required' }
      case 'manifest-unsupported': return { state: 'unsupported', reason: 'library-unsupported' }
      case 'filesystem-observed': return { state: 'not-assessed', reason: 'filesystem-observed-evidence-pending' }
      case 'filesystem-capability-not-assessed': return { state: 'not-assessed', reason: 'filesystem-capability-not-assessed' }
      case 'filesystem-invalid': return { state: 'recovery-required', reason: 'library-recovery-required' }
      case 'filesystem-unsupported': return { state: 'unsupported', reason: 'filesystem-unsupported' }
    }
  }
  const facts: Record<string, readonly string[]> = {
    compatibility: ['compatible', 'unsupported', 'not-assessed'],
    integrity: ['intact', 'recovery-required', 'not-assessed'],
    filesystem: ['qualified', 'read-only', 'unsupported', 'unavailable', 'not-assessed'],
    lock: ['available', 'busy', 'not-assessed']
  }
  if (record?.kind === 'portable' && Object.keys(record).length === 5 &&
    Object.entries(facts).every(([key, choices]) => typeof record[key] === 'string' && choices.includes(record[key]))) {
    if (record.filesystem === 'unavailable') return { state: 'unavailable', reason: 'candidate-unavailable' }
    if (record.compatibility === 'unsupported') return { state: 'unsupported', reason: 'library-unsupported' }
    if (record.integrity === 'recovery-required') return { state: 'recovery-required', reason: 'library-recovery-required' }
    if (record.filesystem === 'unsupported') return { state: 'unsupported', reason: 'filesystem-unsupported' }
    if (record.lock === 'busy') return { state: 'busy', reason: 'library-busy' }
    if (Object.values(record).includes('not-assessed')) return { state: 'not-assessed', reason: 'evidence-not-assessed' }
    if (record.filesystem === 'read-only') return { state: 'read-only', reason: 'storage-read-only' }
    return { state: 'compatible', reason: 'candidate-compatible' }
  }
  return { state: 'not-assessed', reason: 'invalid-observation' }
}
