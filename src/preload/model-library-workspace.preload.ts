import {
  CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
  CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE,
  type ModelLibraryWorkspaceApi,
  type ModelLibraryWorkspaceConfigureStorageRequest,
  type ModelLibraryWorkspaceSummaryRequest
} from '../shared/contracts/model-library-workspace.contract'

export interface ModelLibraryWorkspaceIpcInvoker {
  invoke(channel: string, request: unknown): Promise<unknown>
}

export function createModelLibraryWorkspacePreloadApi(
  invoker: ModelLibraryWorkspaceIpcInvoker
): ModelLibraryWorkspaceApi {
  return Object.freeze({
    summarize(request: ModelLibraryWorkspaceSummaryRequest) {
      return invoker.invoke(CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE, request)
    },
    configureStorage(request: ModelLibraryWorkspaceConfigureStorageRequest) {
      return invoker.invoke(
        CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
        request
      )
    }
  })
}
