export type PlatformName = 'win32' | 'darwin' | 'linux' | 'unknown'

export type PlatformArch = 'x64' | 'arm64' | 'unknown'

export type PlatformProfile =
  | 'windows-x64'
  | 'windows-arm64'
  | 'macos-apple-silicon'
  | 'macos-intel'
  | 'linux-x64'
  | 'unknown'

export interface ManagedPaths {
  userDataDir: string
  configDir: string
  databaseDir: string
  logsDir: string
  cacheDir: string
  runtimeDir: string
  modelsDir: string
  tempDir: string
  downloadsDir: string
}

export interface PlatformAdapter {
  name: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
  paths: ManagedPaths
  normalizePath(input: string): string
  sanitizeFilename(input: string): string
  ensureInsideManagedRoot(root: string, target: string): void
}
