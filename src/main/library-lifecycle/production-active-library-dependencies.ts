import path from 'node:path'

import type { ActiveLibraryHostDependencies } from './active-library-host'
import { createNodeLibraryCreationTargetPlatformAdapter } from './library-creation-target-platform.internal'
import { qualifyLocalVolume } from './local-volume-qualification'
import {createVisualAdmission, type VisualAdmission} from '../visual-ai/visual-admission'
import {createWindowsSchemaMaintenanceStorage} from '../platform/windows-schema-backup.internal'

export interface ProductionLibraryDialogAdapter {
  selectLibraryDirectory(): Promise<{ kind: 'cancelled' } | { kind: 'selected'; directory: string }>
  selectLocalFiles(): Promise<{ kind: 'cancelled' } | { kind: 'selected'; files: readonly { filePath: string }[] }>
}

export interface ProductionLibraryPlatformOptions {
  videoRuntime?:import('../work-mode/windows-video-runtime').WorkVideoRuntime
  admission?: VisualAdmission
  retrievalRuntime?:import('./active-library-host').ActiveLibraryHostDependencies['retrievalRuntime']
  backupBundleDirectory?: string
}

/** Shared production dependencies; only the Main dialog adapter is replaceable in tests. */
export function createProductionActiveLibraryHostDependencies(dialog: ProductionLibraryDialogAdapter, platform: ProductionLibraryPlatformOptions = {}): ActiveLibraryHostDependencies {
  const targetPlatform = createNodeLibraryCreationTargetPlatformAdapter()
  return {
    selectLibraryDirectory: dialog.selectLibraryDirectory,
    selectLocalFiles: dialog.selectLocalFiles,
    videoRuntime:platform.videoRuntime,
    targetPlatform,
    resourceAdmission: platform.admission,
    retrievalRuntime:platform.retrievalRuntime,
    schemaMaintenanceStorage: process.platform === 'win32' ? createWindowsSchemaMaintenanceStorage({
      admission: platform.admission ?? createVisualAdmission(), bundleDirectory: platform.backupBundleDirectory
    }) : undefined,
    creationQualification: {
      inspect: async (input) => {
        const access = await targetPlatform.inspectAccess({ directory: input.targetState === 'missing' ? path.dirname(input.targetDirectory) : input.targetDirectory, targetState: input.targetState, nodeMode: 0o755n })
        const volume = await qualifyLocalVolume(input.targetState === 'missing' ? path.dirname(input.targetDirectory) : input.targetDirectory, input.scopeIdentity)
        const filesystem = volume.kind === 'qualified' ? { kind: volume.kind, scopeIdentity: volume.scopeIdentity, maxComponentUtf8Bytes: volume.maxComponentUtf8Bytes, maxCompletePathUtf16Units: volume.maxCompletePathUtf16Units, atomicReplace: volume.atomicReplace, durableCommit: volume.durableCommit, mountBoundary: volume.mountBoundary } : volume
        if (volume.kind !== 'qualified') return { targetGeneration: input.targetGeneration, qualificationGeneration: 'runtime:not-assessed', filesystem, access: { kind: access, scopeIdentity: input.accessScopeIdentity }, exclusiveLock: 'not-assessed', capacity: { availableBytes: 0, requiredBytes: 1, safetyReserveBytes: 1 } }
        return { targetGeneration: input.targetGeneration, qualificationGeneration: volume.qualificationGeneration ?? 'runtime:statfs', filesystem, access: { kind: access, scopeIdentity: input.accessScopeIdentity }, exclusiveLock: 'qualified', capacity: { availableBytes: volume.availableBytes, requiredBytes: 1024 * 1024, safetyReserveBytes: 64 * 1024 * 1024 } }
      }
    },
    openQualification: {
      inspect: async (input) => {
        const volume = await qualifyLocalVolume(input.libraryRootDirectory, input.scopeIdentity)
        const filesystem = volume.kind === 'qualified' ? { kind: volume.kind, scopeIdentity: volume.scopeIdentity, maxComponentUtf8Bytes: volume.maxComponentUtf8Bytes, maxCompletePathUtf16Units: volume.maxCompletePathUtf16Units, atomicReplace: volume.atomicReplace, durableCommit: volume.durableCommit, mountBoundary: volume.mountBoundary } : volume
        if (volume.kind !== 'qualified') return { inspectionIdentity: input.inspectionIdentity, generation: input.generation, filesystem, access: 'not-assessed', lock: 'not-assessed' }
        return { inspectionIdentity: input.inspectionIdentity, generation: input.generation, filesystem, access: 'read-write', lock: 'available' }
      }
    }
  }
}
