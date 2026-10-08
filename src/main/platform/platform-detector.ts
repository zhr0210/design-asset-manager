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
  isAppleSilicon: boolean
}

interface PlatformNameRule {
  platform: PlatformName
  isWindows: boolean
  isMacOS: boolean
}

const PLATFORM_PROFILE_RULES: PlatformProfileRule[] = [
  { platform: 'win32', arch: 'x64', profile: 'windows-x64', isAppleSilicon: false },
  { platform: 'win32', arch: 'arm64', profile: 'windows-arm64', isAppleSilicon: false },
  { platform: 'darwin', arch: 'arm64', profile: 'macos-apple-silicon', isAppleSilicon: true },
  { platform: 'darwin', arch: 'x64', profile: 'macos-intel', isAppleSilicon: false },
  { platform: 'linux', arch: 'x64', profile: 'linux-x64', isAppleSilicon: false }
]

const PLATFORM_NAME_RULES: PlatformNameRule[] = [
  { platform: 'win32', isWindows: true, isMacOS: false },
  { platform: 'darwin', isWindows: false, isMacOS: true },
  { platform: 'linux', isWindows: false, isMacOS: false }
]

const PLATFORM_ARCHES: PlatformArch[] = [
  'x64',
  'arm64'
]

export function normalizePlatformName(value: string): PlatformName {
  return PLATFORM_NAME_RULES.find((rule) => rule.platform === value)?.platform ?? 'unknown'
}

export function normalizePlatformArch(value: string): PlatformArch {
  return PLATFORM_ARCHES.find((arch) => arch === value) ?? 'unknown'
}

function getPlatformProfileRule(platform: PlatformName, arch: PlatformArch): PlatformProfileRule | null {
  return PLATFORM_PROFILE_RULES.find((rule) => {
    return rule.platform === platform && rule.arch === arch
  }) ?? null
}

function getPlatformNameRule(platform: PlatformName): PlatformNameRule {
  return PLATFORM_NAME_RULES.find((rule) => rule.platform === platform) ?? {
    platform: 'unknown',
    isWindows: false,
    isMacOS: false
  }
}

export function getPlatformProfile(platform: PlatformName, arch: PlatformArch): PlatformProfile {
  return getPlatformProfileRule(platform, arch)?.profile ?? 'unknown'
}

export function detectPlatform(rawPlatform = process.platform, rawArch = process.arch): PlatformDetection {
  const platform = normalizePlatformName(rawPlatform)
  const arch = normalizePlatformArch(rawArch)
  const profileRule = getPlatformProfileRule(platform, arch)
  const platformRule = getPlatformNameRule(platform)

  return {
    platform,
    arch,
    profile: profileRule?.profile ?? 'unknown',
    isWindows: platformRule.isWindows,
    isMacOS: platformRule.isMacOS,
    isAppleSilicon: profileRule?.isAppleSilicon ?? false
  }
}
