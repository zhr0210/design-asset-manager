export const CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE =
  'model-library-workspace:summarize'
export const CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE =
  'model-library-workspace:configure-storage'

export type ModelLibraryWorkspaceSummaryRequest =
  | { readonly kind: 'page' }
  | { readonly kind: 'ai-console' }

export type ModelLibraryWorkspaceConfigureStorageRequest =
  | { readonly kind: 'review-recommended-location' }
  | { readonly kind: 'review-chosen-parent' }
  | {
      readonly kind: 'confirm-reviewed-selection'
      readonly review: string
      readonly decision: 'use-reviewed-model-storage-root'
    }

export interface ModelLibraryWorkspaceApi {
  summarize(request: ModelLibraryWorkspaceSummaryRequest): Promise<unknown>
  configureStorage(
    request: ModelLibraryWorkspaceConfigureStorageRequest
  ): Promise<unknown>
}
