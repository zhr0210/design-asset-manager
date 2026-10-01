import type { AdmittedModelCatalog } from './model-catalog-admission.tracer'
import type { ModelArtifactRevisionRef } from './model-library'

export interface ModelArtifactSourceEntry {
  readonly relativePath: string
  readonly bytes: AsyncIterable<Uint8Array>
}

export interface ModelArtifactByteSource {
  entries(request: {
    readonly artifact: ModelArtifactRevisionRef
    readonly requiredRelativePaths: readonly string[]
  }): AsyncIterable<ModelArtifactSourceEntry>
}

export interface OpenTransactionalModelLibraryTracerInput {
  readonly catalog: AdmittedModelCatalog
  readonly controlDirectory: string
  readonly byteSource: ModelArtifactByteSource
  readonly createActivityId: () => string
  readonly createStorageRecordId: () => string
  /** @internal Tracer-only abrupt interruption; never part of ModelLibrary. */
  readonly simulateInterruption?: 'before-commit' | 'after-commit'
}

export { openTransactionalModelLibraryTracer } from './transactional-model-library.internal'
