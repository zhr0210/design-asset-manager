import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron'
import {
  CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
  CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
  CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST,
  type RuntimePackageExecuteSelectionRequest,
  type RuntimePackageGetExecutionStatusRequest,
  type RuntimePackageIpcResponse
} from '../../shared/contracts/runtime-package.contract'
import { createRuntimePackageIpcHandlers } from '../runtime-package/runtime-package-ipc.handlers'
import { RuntimePackageSessionService } from '../runtime-package/runtime-package-session.service'

const runtimePackageSessionService = new RuntimePackageSessionService()
const runtimePackageIpcHandlers = createRuntimePackageIpcHandlers(runtimePackageSessionService)

const manifestDialogOptions: OpenDialogOptions = {
  title: '选择运行时包清单',
  buttonLabel: '选择清单',
  properties: ['openFile'],
  filters: [{ name: 'Runtime Package Manifest', extensions: ['json'] }]
}

function failure<T>(): RuntimePackageIpcResponse<T> {
  return { success: false }
}

export function registerRuntimePackageIpc(): void {
  ipcMain.handle(CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST, async (event) => {
    try {
      const owner = BrowserWindow.fromWebContents(event.sender)
      const selected = owner
        ? await dialog.showOpenDialog(owner, manifestDialogOptions)
        : await dialog.showOpenDialog(manifestDialogOptions)
      const manifestPath = selected.filePaths[0]
      return runtimePackageIpcHandlers.selectLocalManifest(
        selected.canceled ? null : manifestPath ?? null
      )
    } catch (error) {
      console.error(`[IPC] ${CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST} error:`, error)
      return failure()
    }
  })

  ipcMain.handle(
    CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION,
    async (_, request: RuntimePackageExecuteSelectionRequest) => {
      try {
        return runtimePackageIpcHandlers.executeSelection(request)
      } catch (error) {
        console.error(`[IPC] ${CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION} error:`, error)
        return failure()
      }
    }
  )

  ipcMain.handle(
    CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS,
    async (_, request: RuntimePackageGetExecutionStatusRequest) => {
      try {
        return runtimePackageIpcHandlers.getExecutionStatus(request)
      } catch (error) {
        console.error(`[IPC] ${CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS} error:`, error)
        return failure()
      }
    }
  )
}
