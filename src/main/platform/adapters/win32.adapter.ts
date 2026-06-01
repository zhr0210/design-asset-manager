import type { PlatformAdapter } from '../../../shared/types/platform.types'
import { assertInsideManagedRoot } from '../filesystem-guard'
import { normalizePath, sanitizeFilename } from '../path-normalizer'
import { detectPlatform } from '../platform-detector'
import { resolveManagedPaths, type PathResolverOptions } from '../path-resolver'

export function createWin32PlatformAdapter(options: PathResolverOptions = {}): PlatformAdapter {
  const detection = detectPlatform('win32')
  return {
    name: 'win32',
    arch: detection.arch,
    profile: detection.profile,
    paths: resolveManagedPaths(options),
    normalizePath,
    sanitizeFilename,
    ensureInsideManagedRoot: assertInsideManagedRoot
  }
}
