import type { PlatformArch, PlatformName } from './platform.types'
import type { RuntimeCapability, RuntimeProfileId } from './runtime-profile.types'

export type RuntimePackageType = 'runtime' | 'model' | 'tool' | 'dependency' | 'metadata'
export type RuntimePackageStatus = 'available' | 'deprecated' | 'disabled' | 'experimental'
export type RuntimePackageRequirementLevel = 'required' | 'optional' | 'recommended'
export type RuntimePackageInstallMode = 'download-only' | 'extract-only' | 'managed-runtime' | 'external-link'
export type RuntimePackageSourceType = 'local' | 'bundled' | 'remote'
export type RuntimePackageSourceAccess = 'filesystem' | 'app-resource' | 'reserved-remote'

export interface RuntimePackageSource {
  id: string
  type: RuntimePackageSourceType
  label: string
  uri: string
  access: RuntimePackageSourceAccess
  enabled: boolean
  trusted: boolean
  networkAccess: 'never' | 'reserved'
  warnings: string[]
  metadata: Record<string, unknown>
}

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

export interface RuntimePackageSourceResolution {
  sources: RuntimePackageSource[]
  activeSources: RuntimePackageSource[]
  reservedRemoteSources: RuntimePackageSource[]
  warnings: string[]
  blockingIssues: string[]
}

export type RuntimePackageDownloadStatus = 'planned' | 'progress' | 'completed' | 'blocked' | 'failed'

export interface RuntimePackageDownloadProgress {
  packageId: string
  status: RuntimePackageDownloadStatus
  downloadedBytes: number
  totalBytes: number
  percent: number
  message: string
}

export interface RuntimePackageChecksumPlan {
  algorithm: 'sha256'
  expectedSha256: string
  verificationRequired: boolean
  blockingIssues: string[]
}

export interface RuntimePackageDownloadPlan {
  packageId: string
  sourceId: string
  url: string
  destinationPath: string
  sizeBytes: number
  checksum: RuntimePackageChecksumPlan
  dryRun: boolean
  warnings: string[]
  blockingIssues: string[]
}

export interface RuntimePackageDownloader {
  createPlan(entry: RuntimePackageEntry, source: RuntimePackageSource, destinationPath: string): RuntimePackageDownloadPlan
  dryRun(plan: RuntimePackageDownloadPlan): Promise<RuntimePackageDownloadProgress[]>
}

export type RuntimePackageVerificationStatus = 'planned' | 'passed' | 'blocked' | 'failed'

export interface RuntimePackageVerificationResult {
  packageId: string
  status: RuntimePackageVerificationStatus
  algorithm: 'sha256'
  expectedSha256: string
  actualSha256: string
  message: string
  blockingIssues: string[]
}

export interface RuntimePackageExtractPlan {
  packageId: string
  archivePath: string
  extractRoot: string
  targetDirectory: string
  dryRun: boolean
  rollbackPlan: RuntimePackageRollbackPlan
  warnings: string[]
  blockingIssues: string[]
}

export interface RuntimePackageRollbackPlan {
  packageId: string
  restorePaths: string[]
  removePaths: string[]
  registryRestoreRequired: boolean
  notes: string[]
}

export interface RuntimePackageExtractor {
  createPlan(packageId: string, archivePath: string, extractRoot: string, targetDirectory: string): RuntimePackageExtractPlan
  dryRun(plan: RuntimePackageExtractPlan): Promise<RuntimePackageDownloadProgress[]>
}

export type RuntimePackageInstallState = 'idle' | 'planned' | 'verifying' | 'extracting' | 'completed' | 'blocked' | 'rolled-back'
export type RuntimePackageInstallEvent = 'createPlan' | 'verify' | 'extract' | 'complete' | 'block' | 'rollback'

export interface RuntimePackageRegistryMetadataPlan {
  packageId: string
  sourceId: string
  installedVersion: string
  installPath: string
  status: 'planned'
  writeRegistry: false
}

export interface RuntimePackageInstallPlan {
  packageId: string
  state: RuntimePackageInstallState
  downloadPlan: RuntimePackageDownloadPlan
  verification: RuntimePackageVerificationResult
  extractPlan: RuntimePackageExtractPlan
  registryMetadata: RuntimePackageRegistryMetadataPlan
  rollbackPlan: RuntimePackageRollbackPlan
  dryRun: true
  warnings: string[]
  blockingIssues: string[]
}
