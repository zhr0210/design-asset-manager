import type {
  RuntimePackageExecuteSelectionRequest,
  RuntimePackageExecuteSelectionResponse,
  RuntimePackageGetExecutionStatusRequest,
  RuntimePackageGetExecutionStatusResponse,
  RuntimePackageSelectLocalManifestResponse
} from '../../shared/contracts/runtime-package.contract'
import {
  projectRuntimePackageExecutionAcceptance,
  projectRuntimePackageExecutionStatus,
  projectRuntimePackageSelection
} from './runtime-package-session.projector'
import type { RuntimePackageSessionService } from './runtime-package-session.service'

type RuntimePackageSessionBoundary = Pick<
  RuntimePackageSessionService,
  'selectLocalManifest' | 'executeSelection' | 'getExecutionStatus'
>

export interface RuntimePackageIpcHandlers {
  selectLocalManifest: (manifestPath: string | null) => Promise<RuntimePackageSelectLocalManifestResponse>
  executeSelection: (request: RuntimePackageExecuteSelectionRequest) => Promise<RuntimePackageExecuteSelectionResponse>
  getExecutionStatus: (request: RuntimePackageGetExecutionStatusRequest) => RuntimePackageGetExecutionStatusResponse
}

function validOpaqueId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200
}

export function createRuntimePackageIpcHandlers(
  session: RuntimePackageSessionBoundary
): RuntimePackageIpcHandlers {
  return {
    async selectLocalManifest(manifestPath) {
      if (!manifestPath) return { success: false, errorCode: 'SELECTION_CANCELLED' }
      return projectRuntimePackageSelection(await session.selectLocalManifest(manifestPath))
    },

    async executeSelection(request) {
      if (!validOpaqueId(request?.selectionId) || request.confirmed !== true) {
        return { success: false, errorCode: 'CONFIRMATION_REQUIRED' }
      }
      return projectRuntimePackageExecutionAcceptance(await session.executeSelection(request))
    },

    getExecutionStatus(request) {
      if (!validOpaqueId(request?.executionId)) {
        return { success: false, errorCode: 'EXECUTION_NOT_FOUND' }
      }
      return projectRuntimePackageExecutionStatus(session.getExecutionStatus(request.executionId))
    }
  }
}
