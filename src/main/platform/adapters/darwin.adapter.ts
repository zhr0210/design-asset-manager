import type { PlatformAdapter } from '../../../shared/types/platform.types'
import { assertInsideManagedRoot } from '../filesystem-guard'
import { normalizePath, sanitizeFilename } from '../path-normalizer'
import { detectPlatform } from '../platform-detector'
import { resolveManagedPaths, type PathResolverOptions } from '../path-resolver'

export function createDarwinPlatformAdapter(options: PathResolverOptions = {}): PlatformAdapter {
  const detection = detectPlatform('darwin')
  return {
    name: 'darwin',
    arch: detection.arch,
    profile: detection.profile,
    paths: resolveManagedPaths(options),
    normalizePath,
    sanitizeFilename,
    ensureInsideManagedRoot: assertInsideManagedRoot
  }
}
