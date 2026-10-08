import { getWorkspaceClient } from '../../workspace-client'
import type {
  ModelLibraryWorkspaceApi,
  ModelLibraryWorkspaceConfigureStorageRequest,
  ModelLibraryWorkspaceSummaryRequest
} from
  '../../../shared/contracts/model-library-workspace.contract'
import {
  createModelLibraryWorkspaceModule,
  type ModelLibraryWorkspaceAdapter,
  type ModelLibraryWorkspaceModule
} from
  './model-library-workspace.module'

export interface ModelLibraryWorkspaceElectronApi {
  readonly modelLibraryWorkspace?: ModelLibraryWorkspaceApi
}

export function createElectronModelLibraryWorkspaceAdapter(
  electronApi: ModelLibraryWorkspaceElectronApi | null | undefined =
    readElectronApi()
): ModelLibraryWorkspaceAdapter | null {
  const workspace = electronApi?.modelLibraryWorkspace
  if (
    !workspace ||
    typeof workspace.summarize !== 'function' ||
    typeof workspace.configureStorage !== 'function'
  ) {
    return null
  }

  return Object.freeze({
    summarize(request: ModelLibraryWorkspaceSummaryRequest) {
      return workspace.summarize(request)
    },
    configureStorage(request: ModelLibraryWorkspaceConfigureStorageRequest) {
      return workspace.configureStorage(request)
    }
  })
}

export function createElectronModelLibraryWorkspaceModule(
  electronApi?: ModelLibraryWorkspaceElectronApi | null
): ModelLibraryWorkspaceModule {
  return createModelLibraryWorkspaceModule(
    createElectronModelLibraryWorkspaceAdapter(electronApi)
  )
}

function readElectronApi(): ModelLibraryWorkspaceElectronApi | null {
  if (typeof window === 'undefined') return null
  return getWorkspaceClient() ?? null
}
