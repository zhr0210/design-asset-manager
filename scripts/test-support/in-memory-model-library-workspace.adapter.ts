import type {
  ModelLibraryWorkspaceAdapter
} from '../../src/renderer/modules/model-library-workspace/model-library-workspace.module'

export interface InMemoryModelLibraryWorkspaceAdapterOptions {
  readonly summarize: ModelLibraryWorkspaceAdapter['summarize']
  readonly configureStorage?: ModelLibraryWorkspaceAdapter['configureStorage']
}

export function createInMemoryModelLibraryWorkspaceAdapter(
  options: InMemoryModelLibraryWorkspaceAdapterOptions
): ModelLibraryWorkspaceAdapter {
  return Object.freeze({ ...options })
}
