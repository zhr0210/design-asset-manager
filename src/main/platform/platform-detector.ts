import type { PlatformArch, PlatformName, PlatformProfile } from '../../shared/types/platform.types'

export interface PlatformDetection {
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
  isWindows: boolean
  isMacOS: boolean
  isAppleSilicon: boolean
}

interface PlatformProfileRule {
  platform: PlatformName
  arch: PlatformArch
  profile: PlatformProfile
}

const PLATFORM_PROFILE_RULES: PlatformProfileRule[] = [
  { platform: 'win32', arch: 'x64', profile: 'windows-x64' },
  { platform: 'win32', arch: 'arm64', profile: 'windows-arm64' },
  { platform: 'darwin', arch: 'arm64', profile: 'macos-apple-silicon' },
  { platform: 'darwin', arch: 'x64', profile: 'macos-intel' },
  { platform: 'linux', arch: 'x64', profile: 'linux-x64' }
]

export function normalizePlatformName(value: string): PlatformName {
  if (value === 'win32' || value === 'darwin' || value === 'linux') return value
  return 'unknown'
}

export function normalizePlatformArch(value: string): PlatformArch {
  if (value === 'x64' || value === 'arm64') return value
  return 'unknown'
}

export function getPlatformProfile(platform: PlatformName, arch: PlatformArch): PlatformProfile {
  return PLATFORM_PROFILE_RULES.find((rule) => {
    return rule.platform === platform && rule.arch === arch
  })?.profile ?? 'unknown'
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
