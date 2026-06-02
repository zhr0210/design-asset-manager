import os from 'os'
import path from 'path'
import type { ManagedPaths } from '../../shared/types/platform.types'

export type ElectronPathName = 'userData' | 'temp' | 'downloads'

export interface PathResolverOptions {
  getPath?: (name: ElectronPathName) => string
  appName?: string
}

function getElectronPath(options: PathResolverOptions, name: ElectronPathName): string | null {
  try {
    const value = options.getPath?.(name)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function resolveManagedPaths(options: PathResolverOptions = {}): ManagedPaths {
  const appName = options.appName ?? 'DesignAssetManager'
  const userDataDir = getElectronPath(options, 'userData') ?? path.join(os.homedir(), appName)
  const tempDir = getElectronPath(options, 'temp') ?? path.join(os.tmpdir(), appName)
  const downloadsDir = getElectronPath(options, 'downloads') ?? path.join(userDataDir, 'downloads')

  return {
    userDataDir,
    configDir: path.join(userDataDir, 'config'),
    databaseDir: path.join(userDataDir, 'database'),
    logsDir: path.join(userDataDir, 'logs'),
    cacheDir: path.join(userDataDir, 'cache'),
    runtimeDir: path.join(userDataDir, 'runtime'),
    modelsDir: path.join(userDataDir, 'models'),
    tempDir,
    downloadsDir
  }
}
