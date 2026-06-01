import type { PlatformArch, PlatformName } from './platform.types'
import type { RuntimeCapability, RuntimeProfileId } from './runtime-profile.types'

export type RuntimePackageType = 'runtime' | 'model' | 'tool' | 'dependency' | 'metadata'
export type RuntimePackageStatus = 'available' | 'deprecated' | 'disabled' | 'experimental'
export type RuntimePackageRequirementLevel = 'required' | 'optional' | 'recommended'
export type RuntimePackageInstallMode = 'download-only' | 'extract-only' | 'managed-runtime' | 'external-link'

export interface RuntimePackageManifest {
  schemaVersion: number
  manifestVersion: string
  generatedAt: string
  packages: RuntimePackageEntry[]
  profiles: RuntimeProfileId[]
  metadata: Record<string, unknown>
}

export interface RuntimePackageEntry {
  id: string
  name: string
  description: string
  version: string
  type: RuntimePackageType
  status: RuntimePackageStatus
  requirement: RuntimePackageRequirementLevel
  installMode: RuntimePackageInstallMode
  platforms: Array<PlatformName | 'all'>
  arch: Array<PlatformArch | 'all'>
  profiles: RuntimeProfileId[]
  capabilities: RuntimeCapability[]
  url: string
  sha256: string
  sizeBytes: number
  installPathHint: string
  dependencies: string[]
  conflicts: string[]
  provides: string[]
  warnings: string[]
  metadata: Record<string, unknown>
}

export interface RuntimePackageSelection {
  profileId: RuntimeProfileId
  platform: PlatformName
  arch: PlatformArch
  requiredPackages: RuntimePackageEntry[]
  recommendedPackages: RuntimePackageEntry[]
  optionalPackages: RuntimePackageEntry[]
  warnings: string[]
  blockingIssues: string[]
}

export interface RuntimePackageSelectionInput {
  profileId: RuntimeProfileId
  platform: PlatformName
  arch: PlatformArch
  capabilities: RuntimeCapability[]
  includeExperimental?: boolean
  includeDeprecated?: boolean
}
