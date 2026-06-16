import type {
  RuntimePackageExecuteSelectionResponse,
  RuntimePackageExecutionSnapshot,
  RuntimePackageGetExecutionStatusResponse,
  RuntimePackageSelectLocalManifestResponse,
  RuntimePackageSessionErrorCode
} from './runtime-package-session.service'
import type {
  RuntimePackageExecutionErrorCode,
  RuntimePackageExecutionStage,
  RuntimePackageInstallMode,
  RuntimePackageType
} from '../../shared/types/runtime-package.types'

export interface RuntimePackageRendererSelection {
  selectionId: string
  packageId: string
  name: string
  version: string
  type: RuntimePackageType
  installMode: RuntimePackageInstallMode
  sizeBytes: number
  expiresAt: string
  warnings: string[]
}

export interface RuntimePackageRendererExecutionResult {
  success: boolean
  packageId: string
  stage: RuntimePackageExecutionStage
  installedVersion?: string
  errorCode?: RuntimePackageExecutionErrorCode
  rolledBack: boolean
}

export interface RuntimePackageRendererExecutionSnapshot {
  executionId: string
  packageId: string
  stage: RuntimePackageExecutionStage
  percent: number
  terminal: boolean
  result?: RuntimePackageRendererExecutionResult
}

export type RuntimePackageRendererResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      errorCode?: RuntimePackageSessionErrorCode
    }

export function projectRuntimePackageSelection(
  response: RuntimePackageSelectLocalManifestResponse
): RuntimePackageRendererResponse<RuntimePackageRendererSelection> {
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
): RuntimePackageRendererResponse<RuntimePackageRendererExecutionSnapshot> {
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
): RuntimePackageRendererResponse<RuntimePackageRendererExecutionSnapshot> {
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
): RuntimePackageRendererExecutionSnapshot {
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
): RuntimePackageRendererResponse<T> {
  return {
    success: false,
    ...(errorCode ? { errorCode } : {})
  }
}
