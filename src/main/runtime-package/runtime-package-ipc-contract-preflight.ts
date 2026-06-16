export type RuntimePackageIpcChannel =
  | 'runtime-package:select-local-manifest'
  | 'runtime-package:execute-selection'
  | 'runtime-package:get-execution-status'

export interface RuntimePackageIpcContractPreflight {
  status: 'pending-approval'
  channels: RuntimePackageIpcChannel[]
  version: 'v1'
  transport: 'ipc-invoke'
  progressModel: 'polling'
  progressEvent: false
  cancellation: false
  mainOwnsNativeDialog: true
  rendererSuppliesPaths: false
  rendererReceivesPaths: false
  sharedPublicContractRegistered: false
  selectionFields: string[]
  executionSnapshotFields: string[]
  executionResultFields: string[]
  failureFields: string[]
  excludedFields: string[]
}

export function createRuntimePackageIpcContractPreflight(): RuntimePackageIpcContractPreflight {
  return {
    status: 'pending-approval',
    channels: [
      'runtime-package:select-local-manifest',
      'runtime-package:execute-selection',
      'runtime-package:get-execution-status'
    ],
    version: 'v1',
    transport: 'ipc-invoke',
    progressModel: 'polling',
    progressEvent: false,
    cancellation: false,
    mainOwnsNativeDialog: true,
    rendererSuppliesPaths: false,
    rendererReceivesPaths: false,
    sharedPublicContractRegistered: false,
    selectionFields: [
      'selectionId',
      'packageId',
      'name',
      'version',
      'type',
      'installMode',
      'sizeBytes',
      'expiresAt',
      'warnings'
    ],
    executionSnapshotFields: [
      'executionId',
      'packageId',
      'stage',
      'percent',
      'terminal',
      'result'
    ],
    executionResultFields: [
      'success',
      'packageId',
      'stage',
      'installedVersion',
      'errorCode',
      'rolledBack'
    ],
    failureFields: ['success', 'errorCode'],
    excludedFields: [
      'absolutePath',
      'manifestPath',
      'archivePath',
      'installPath',
      'stagingPath',
      'archiveFileName',
      'sha256',
      'message',
      'progress',
      'rollbackPlan',
      'rawSession',
      'rawExecutorResult'
    ]
  }
}
