import type {
  RuntimePackageExecuteSelectionResponse,
  RuntimePackageExecutionSnapshot,
  RuntimePackageGetExecutionStatusResponse,
  RuntimePackageSelectLocalManifestResponse
} from './runtime-package-session.service'
import type {
  RuntimePackageExecutionSnapshotPreview,
  RuntimePackageIpcResponse,
  RuntimePackageSelectionPreview,
  RuntimePackageSessionErrorCode
} from '../../shared/contracts/runtime-package.contract'

export function projectRuntimePackageSelection(
  response: RuntimePackageSelectLocalManifestResponse
): RuntimePackageIpcResponse<RuntimePackageSelectionPreview> {
  if (!response.success || !response.selection) {
    return projectFailure(response.errorCode)
  }

  const selection = response.selection
  return {
    success: true,
    data: {
      selectionId: selection.selectionId,
      packageId: selection.packageId,
      name: selection.name,
      version: selection.version,
      type: selection.type,
      installMode: selection.installMode,
      sizeBytes: selection.sizeBytes,
      expiresAt: selection.expiresAt,
      warnings: [...selection.warnings]
    }
  }
}

export function projectRuntimePackageExecutionAcceptance(
  response: RuntimePackageExecuteSelectionResponse
): RuntimePackageIpcResponse<RuntimePackageExecutionSnapshotPreview> {
  if (!response.accepted || !response.execution) {
    return projectFailure(response.errorCode)
  }

  return {
    success: true,
    data: projectExecutionSnapshot(response.execution)
  }
}

export function projectRuntimePackageExecutionStatus(
  response: RuntimePackageGetExecutionStatusResponse
): RuntimePackageIpcResponse<RuntimePackageExecutionSnapshotPreview> {
  if (!response.success || !response.execution) {
    return projectFailure(response.errorCode)
  }

  return {
    success: true,
    data: projectExecutionSnapshot(response.execution)
  }
}

function projectExecutionSnapshot(
  snapshot: RuntimePackageExecutionSnapshot
): RuntimePackageExecutionSnapshotPreview {
  return {
    executionId: snapshot.executionId,
    packageId: snapshot.packageId,
    stage: snapshot.stage,
    percent: snapshot.percent,
    terminal: snapshot.terminal,
    ...(snapshot.result
      ? {
          result: {
            success: snapshot.result.success,
            packageId: snapshot.result.packageId,
            stage: snapshot.result.stage,
            ...(snapshot.result.installedVersion !== undefined
              ? { installedVersion: snapshot.result.installedVersion }
              : {}),
            ...(snapshot.result.errorCode ? { errorCode: snapshot.result.errorCode } : {}),
            rolledBack: snapshot.result.rolledBack
          }
        }
      : {})
  }
}

function projectFailure<T>(
  errorCode: RuntimePackageSessionErrorCode | undefined
): RuntimePackageIpcResponse<T> {
  return {
    success: false,
    ...(errorCode ? { errorCode } : {})
  }
}
