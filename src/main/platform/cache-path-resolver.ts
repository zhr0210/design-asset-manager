import path from 'path'
import type { ManagedPaths } from '../../shared/types/platform.types'
import { assertInsideManagedRoot } from './filesystem-guard'
import { ensureSafeJoin, sanitizeFilename } from './path-normalizer'
import type { CachePathResolverOptions, CachePathSafetyResult, CachePaths } from './cache-path-resolver.types'

const DEFAULT_CACHE_EXTENSION = '.cache'
const DEFAULT_TEMP_EXTENSION = '.tmp'

export function resolveCachePaths(managedPaths: ManagedPaths): CachePaths {
  const cacheDir = path.resolve(managedPaths.cacheDir)
  const tempDir = path.resolve(managedPaths.tempDir)
  return {
    cacheDir,
    tempDir,
    diagnosticCacheDir: ensureSafeJoin(cacheDir, 'diagnostic'),
    thumbnailCacheDir: ensureSafeJoin(cacheDir, 'thumbnail'),
    aiRuntimeCacheDir: ensureSafeJoin(cacheDir, 'ai-runtime'),
    doctorTempDir: ensureSafeJoin(tempDir, 'doctor'),
    bootstrapTempDir: ensureSafeJoin(tempDir, 'bootstrap'),
    settingsMigrationTempDir: ensureSafeJoin(tempDir, 'settings-migration'),
    testTempDir: ensureSafeJoin(tempDir, 'test')
  }
}

export function resolveTempPaths(managedPaths: ManagedPaths): CachePaths {
  return resolveCachePaths(managedPaths)
}

export function resolveServiceCachePath(serviceId: string, options: CachePathResolverOptions = {}): string {
  const managedPaths = requireManagedPaths(options)
  const paths = resolveCachePaths(managedPaths)
  const fileName = options.fileName ?? `${sanitizeCacheKey(serviceId)}${normalizeExtension(options.extension, DEFAULT_CACHE_EXTENSION)}`
  const target = ensureSafeJoin(paths.cacheDir, ...sanitizeRelativePath(fileName))
  assertSafeCachePath(target, managedPaths)
  return target
}

export function resolveServiceTempPath(serviceId: string, options: CachePathResolverOptions = {}): string {
  const managedPaths = requireManagedPaths(options)
  const paths = resolveTempPaths(managedPaths)
  const fileName = options.fileName ?? `${sanitizeCacheKey(serviceId)}${normalizeExtension(options.extension, DEFAULT_TEMP_EXTENSION)}`
  const target = ensureSafeJoin(paths.tempDir, ...sanitizeRelativePath(fileName))
  assertSafeTempPath(target, managedPaths)
  return target
}

export function sanitizeCacheKey(input: string): string {
  const sanitized = sanitizeFilename(input).replace(/[/\\]+/g, '_')
  return sanitized || 'cache'
}

export function assertSafeCachePath(targetPath: string, managedPaths: ManagedPaths): CachePathSafetyResult {
  const cacheDir = path.resolve(managedPaths.cacheDir)
  const resolvedTarget = path.resolve(targetPath)
  assertInsideManagedRoot(cacheDir, resolvedTarget)
  return {
    path: resolvedTarget,
    rootDir: cacheDir,
    isInsideManagedRoot: true,
    kind: 'cache'
  }
}

export function assertSafeTempPath(targetPath: string, managedPaths: ManagedPaths): CachePathSafetyResult {
  const tempDir = path.resolve(managedPaths.tempDir)
  const resolvedTarget = path.resolve(targetPath)
  assertInsideManagedRoot(tempDir, resolvedTarget)
  return {
    path: resolvedTarget,
    rootDir: tempDir,
    isInsideManagedRoot: true,
    kind: 'temp'
  }
}

function requireManagedPaths(options: CachePathResolverOptions): ManagedPaths {
  if (!options.managedPaths) {
    throw new Error('managedPaths is required to resolve managed cache/temp paths.')
  }
  return options.managedPaths
}

function normalizeExtension(extension: string | undefined, fallback: string): string {
  if (!extension) return fallback
  const sanitized = sanitizeCacheKey(extension)
  return sanitized.startsWith('.') ? sanitized : `.${sanitized}`
}

function sanitizeRelativePath(input: string): string[] {
  return input
    .split(/[/\\]+/)
    .map((segment) => sanitizeCacheKey(segment))
    .filter((segment) => segment && segment !== '.' && segment !== '..')
}
