import type { ManagedPaths } from '../../shared/types/platform.types'

export interface CachePaths {
  cacheDir: string
  tempDir: string
  diagnosticCacheDir: string
  thumbnailCacheDir: string
  aiRuntimeCacheDir: string
  doctorTempDir: string
  bootstrapTempDir: string
  settingsMigrationTempDir: string
  testTempDir: string
}

export interface CachePathResolverOptions {
  managedPaths?: ManagedPaths
  fileName?: string
  extension?: string
}

export interface CachePathSafetyResult {
  path: string
  rootDir: string
  isInsideManagedRoot: boolean
  kind: 'cache' | 'temp'
}
