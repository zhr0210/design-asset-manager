import type { DoctorReport } from './doctor.types'
import type { PlatformArch, PlatformName, PlatformProfile } from './platform.types'

export type RuntimeRegistryPackageStatus = 'installed' | 'missing' | 'corrupted' | 'disabled'
export type RuntimeRegistryModelStatus = 'available' | 'missing' | 'corrupted' | 'disabled'

export interface RuntimeRegistryPaths {
  registryPath: string
  runtimeDir: string
  modelsDir: string
  cacheDir: string
  logsDir: string
  databaseDir: string
}

export interface RuntimeRegistryPackage {
  id: string
  version: string
  platform: PlatformName
  arch: PlatformArch
  installedAt: string
  installPath: string
  sha256: string
  status: RuntimeRegistryPackageStatus
}

export interface RuntimeRegistryModel {
  id: string
  version: string
  path: string
  sha256: string
  status: RuntimeRegistryModelStatus
}

export interface RuntimeRegistry {
  schemaVersion: number
  initialized: boolean
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
  createdAt: string
  updatedAt: string
  initializedAt: string | null
  lastDoctorRunAt: string | null
  lastDoctorStatus: DoctorReport['overallStatus'] | null
  selectedProfileId: string | null
  recommendedProfileId: string | null
  paths: RuntimeRegistryPaths
  packages: RuntimeRegistryPackage[]
  models: RuntimeRegistryModel[]
  warnings: string[]
  metadata: Record<string, unknown>
}
