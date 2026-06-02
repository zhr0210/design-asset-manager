import type { DoctorReport } from '../../shared/types/doctor.types'
import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeProfile, RuntimeProfileId } from './runtime-profile.types'
import { externalInferenceOnlyProfile } from './profiles/external-inference-only.profile'
import { macosAppleSiliconProfile } from './profiles/macos-apple-silicon.profile'
import { macosIntelProfile } from './profiles/macos-intel.profile'
import { windowsCpuProfile } from './profiles/windows-cpu.profile'
import { windowsNvidiaCudaProfile } from './profiles/windows-nvidia-cuda.profile'

const profiles: RuntimeProfile[] = [
  windowsCpuProfile,
  windowsNvidiaCudaProfile,
  macosAppleSiliconProfile,
  macosIntelProfile,
  externalInferenceOnlyProfile
]

export function listRuntimeProfiles(): RuntimeProfile[] {
  return [...profiles]
}

export function getRuntimeProfile(id: RuntimeProfileId): RuntimeProfile | null {
  return profiles.find((profile) => profile.id === id) ?? null
}

export function getProfilesForPlatform(platform: PlatformName, arch: PlatformArch): RuntimeProfile[] {
  return profiles.filter((profile) => {
    const platformMatches = profile.platform === 'all' || profile.platform === platform
    const archMatches = profile.arch === 'all' || profile.arch === arch || profile.arch === 'unknown'
    return platformMatches && archMatches
  })
}

export function getFallbackProfile(profileId: RuntimeProfileId): RuntimeProfile | null {
  const profile = getRuntimeProfile(profileId)
  return profile?.fallbackProfileId ? getRuntimeProfile(profile.fallbackProfileId) : null
}

export function isRuntimeProfileSupported(profile: RuntimeProfile, doctorReport: DoctorReport): boolean {
  const blockingIds = new Set(['path', 'permission', 'system', 'node'])
  return !doctorReport.checks.some((check) => check.status === 'error' && blockingIds.has(check.id))
}
