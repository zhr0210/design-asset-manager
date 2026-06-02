import type { PlatformArch, PlatformName, PlatformProfile } from '../../shared/types/platform.types'

export interface PlatformDetection {
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
  isWindows: boolean
  isMacOS: boolean
  isAppleSilicon: boolean
}

export function normalizePlatformName(value: string): PlatformName {
  if (value === 'win32' || value === 'darwin' || value === 'linux') return value
  return 'unknown'
}

export function normalizePlatformArch(value: string): PlatformArch {
  if (value === 'x64' || value === 'arm64') return value
  return 'unknown'
}

export function getPlatformProfile(platform: PlatformName, arch: PlatformArch): PlatformProfile {
  if (platform === 'win32' && arch === 'x64') return 'windows-x64'
  if (platform === 'win32' && arch === 'arm64') return 'windows-arm64'
  if (platform === 'darwin' && arch === 'arm64') return 'macos-apple-silicon'
  if (platform === 'darwin' && arch === 'x64') return 'macos-intel'
  if (platform === 'linux' && arch === 'x64') return 'linux-x64'
  return 'unknown'
}

export function detectPlatform(rawPlatform = process.platform, rawArch = process.arch): PlatformDetection {
  const platform = normalizePlatformName(rawPlatform)
  const arch = normalizePlatformArch(rawArch)
  const profile = getPlatformProfile(platform, arch)

  return {
    platform,
    arch,
    profile,
    isWindows: platform === 'win32',
    isMacOS: platform === 'darwin',
    isAppleSilicon: platform === 'darwin' && arch === 'arm64'
  }
}
