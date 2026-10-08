import { isBrowserContext } from '../local-host/client-context'
import {
  CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
  CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE
} from '../../shared/contracts/model-library-workspace.contract'
import {
  createModelLibraryWorkspaceIpcHandlers,
  type CreateModelLibraryWorkspaceIpcHandlersInput
} from './model-library-workspace.handlers'
import type { MainIpcHandleRegistrar } from './ipc-registrar'

export { createModelLibraryWorkspaceIpcHandlers } from
  './model-library-workspace.handlers'

export function registerModelLibraryWorkspaceIpc(
  input: CreateModelLibraryWorkspaceIpcHandlersInput,
  handle: MainIpcHandleRegistrar
): void {
  const handlers = createModelLibraryWorkspaceIpcHandlers(input)
  handle(
    CHANNEL_MODEL_LIBRARY_WORKSPACE_SUMMARIZE,
    (event, request: unknown) => handlers.summarize(isBrowserContext(event) ? event.id : event.sender.id, request)
  )
  handle(
    CHANNEL_MODEL_LIBRARY_WORKSPACE_CONFIGURE_STORAGE,
    (event, request: unknown) => handlers.configureStorage(isBrowserContext(event) ? event.id : event.sender.id, request)
  )
}
