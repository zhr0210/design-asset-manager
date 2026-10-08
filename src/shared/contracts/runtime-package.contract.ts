import type {
  RuntimePackageExecutionErrorCode,
  RuntimePackageExecutionStage,
  RuntimePackageInstallMode,
  RuntimePackageType
} from '../types/runtime-package.types'

export const CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST = 'runtime-package:select-local-manifest'
export const CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION = 'runtime-package:execute-selection'
export const CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS = 'runtime-package:get-execution-status'

export type RuntimePackageSessionErrorCode =
  | 'CONFIRMATION_REQUIRED'
  | 'MANIFEST_INVALID'
  | 'MANIFEST_UNREADABLE'
  | 'PACKAGE_NOT_FOUND'
  | 'PACKAGE_NOT_SELECTABLE'
  | 'ARCHIVE_INVALID'
  | 'ARCHIVE_MISSING'
  | 'CHECKSUM_MISMATCH'
  | 'SELECTION_EXPIRED'
  | 'EXECUTION_NOT_FOUND'
  | 'EXECUTION_FAILED'

export type RuntimePackageIpcErrorCode = RuntimePackageSessionErrorCode | 'SELECTION_CANCELLED'

export interface RuntimePackageSelectionPreview {
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

export interface RuntimePackageExecutionResultPreview {
  success: boolean
  packageId: string
  stage: RuntimePackageExecutionStage
  installedVersion?: string
  errorCode?: RuntimePackageExecutionErrorCode
  rolledBack: boolean
}

export interface RuntimePackageExecutionSnapshotPreview {
  executionId: string
  packageId: string
  stage: RuntimePackageExecutionStage
  percent: number
  terminal: boolean
  result?: RuntimePackageExecutionResultPreview
}

export interface RuntimePackageExecuteSelectionRequest {
  selectionId: string
  confirmed: boolean
}

export interface RuntimePackageGetExecutionStatusRequest {
  executionId: string
}

export type RuntimePackageIpcResponse<T> =
  | { success: true; data: T }
  | { success: false; errorCode?: RuntimePackageIpcErrorCode }

export type RuntimePackageSelectLocalManifestResponse = RuntimePackageIpcResponse<RuntimePackageSelectionPreview>
export type RuntimePackageExecuteSelectionResponse = RuntimePackageIpcResponse<RuntimePackageExecutionSnapshotPreview>
export type RuntimePackageGetExecutionStatusResponse = RuntimePackageIpcResponse<RuntimePackageExecutionSnapshotPreview>
