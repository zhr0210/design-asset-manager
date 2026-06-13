import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeProfile, RuntimeProfileId, RuntimeProfileRecommendation, RuntimeProfileResolverInput } from './runtime-profile.types'
import { getProfilesForPlatform, getRuntimeProfile, listRuntimeProfiles } from './runtime-profile-registry'

const BLOCKING_CHECK_IDS = new Set(['path', 'permission', 'system', 'node'])

interface RuntimeProfilePlatformRule {
  platform: PlatformName
  arch?: PlatformArch
  profileId: RuntimeProfileId
}

interface RuntimeProfileHardwareRule {
  profileId: RuntimeProfileId
  matches: (input: RuntimeProfileResolverInput) => boolean
}

const DEFAULT_RUNTIME_PROFILE_RULES: RuntimeProfilePlatformRule[] = [
  { platform: 'win32', profileId: 'windows-cpu' },
  { platform: 'darwin', arch: 'arm64', profileId: 'macos-apple-silicon' },
  { platform: 'darwin', arch: 'x64', profileId: 'macos-intel' }
]

const HARDWARE_RUNTIME_PROFILE_RULES: RuntimeProfileHardwareRule[] = [
  {
    profileId: 'windows-nvidia-cuda',
    matches: (input) => Boolean(input.hardwareHints?.nvidiaGpu && input.platformInfo.platform === 'win32')
  }
]

const RUNTIME_PROFILE_REASON_MESSAGES: Partial<Record<RuntimeProfileId, string>> = {
  'windows-nvidia-cuda': 'Windows NVIDIA hint is present, so the CUDA-capable profile is the best metadata match.',
  'windows-cpu': 'Windows without a GPU hint defaults to the CPU profile.',
  'macos-apple-silicon': 'macOS arm64 maps to the Apple Silicon profile.',
  'macos-intel': 'macOS x64 maps to the Intel profile with external inference fallback.',
  'external-inference-only': 'External inference only was selected or is the safest fallback.'
}

function checkStatus(input: RuntimeProfileResolverInput, id: string, status: 'warning' | 'error') {
  return input.doctorReport.checks.some((check) => check.id === id && check.status === status)
}

function blockingIssues(input: RuntimeProfileResolverInput): string[] {
  return input.doctorReport.checks
    .filter((check) => check.status === 'error' && BLOCKING_CHECK_IDS.has(check.id))
    .map((check) => `${check.label}: ${check.message}`)
}

function warningMessages(input: RuntimeProfileResolverInput): string[] {
  return input.doctorReport.checks
    .filter((check) => check.status === 'warning')
    .map((check) => `${check.label}: ${check.message}`)
}

export function getDefaultRuntimeProfileForPlatform(platform: PlatformName, arch: PlatformArch): RuntimeProfileId {
  return DEFAULT_RUNTIME_PROFILE_RULES.find((rule) => {
    return rule.platform === platform && (rule.arch === undefined || rule.arch === arch)
  })?.profileId ?? 'external-inference-only'
}

export function rankRuntimeProfiles(input: RuntimeProfileResolverInput): RuntimeProfile[] {
  const candidates = getProfilesForPlatform(input.platformInfo.platform, input.platformInfo.arch)
  const preferredId = resolvePreferredProfileId(input)
  return candidates.sort((a, b) => {
    if (a.id === preferredId) return -1
    if (b.id === preferredId) return 1
    return a.id.localeCompare(b.id)
  })
}

export function explainRuntimeProfileRecommendation(input: RuntimeProfileResolverInput): string {
  return resolveRuntimeProfileRecommendation(input).reason
}

export function resolveRuntimeProfileRecommendation(input: RuntimeProfileResolverInput): RuntimeProfileRecommendation {
  const warnings = warningMessages(input)
  const blocking = blockingIssues(input)
  const preferredProfileId = resolvePreferredProfileId(input)
  const profile = getRuntimeProfile(preferredProfileId) ?? getRuntimeProfile('external-inference-only')!
  let confidence = 0.85

  if (input.userPreference === 'external-inference-only') {
    confidence = 0.95
  }
  if (checkStatus(input, 'python', 'warning')) {
    confidence -= 0.2
  }
  if (checkStatus(input, 'ai-worker', 'warning') || checkStatus(input, 'port', 'warning')) {
    confidence -= 0.05
  }

  const fallbackProfileId = blocking.length > 0 || checkStatus(input, 'python', 'warning') ? 'external-inference-only' : profile.fallbackProfileId
  const recommendedProfileId = blocking.length > 0 ? 'external-inference-only' : preferredProfileId
  const recommendedProfile = getRuntimeProfile(recommendedProfileId) ?? profile

  return {
    recommendedProfileId,
    reason: buildReason(input.platformInfo.platform, input.platformInfo.arch, recommendedProfile, blocking),
    confidence: Math.max(0.1, Math.min(1, confidence)),
    warnings,
    blockingIssues: blocking,
    fallbackProfileId,
    canUseLocalAi: recommendedProfile.inferenceMode === 'local-python-worker' && blocking.length === 0 && !checkStatus(input, 'python', 'warning'),
    canUseExternalInference: recommendedProfile.capabilities.includes('external-inference'),
    canContinue: blocking.length === 0
  }
}

function resolvePreferredProfileId(input: RuntimeProfileResolverInput): RuntimeProfileId {
  if (input.userPreference === 'external-inference-only') return 'external-inference-only'
  const hardwareRule = HARDWARE_RUNTIME_PROFILE_RULES.find((rule) => rule.matches(input))
  if (hardwareRule) return hardwareRule.profileId
  return getDefaultRuntimeProfileForPlatform(input.platformInfo.platform, input.platformInfo.arch)
}

function buildReason(platform: PlatformName, arch: PlatformArch, profile: RuntimeProfile, blocking: string[]) {
  if (blocking.length > 0) return `Blocking Doctor issues require a conservative fallback profile for ${platform}/${arch}.`
  return RUNTIME_PROFILE_REASON_MESSAGES[profile.id] ?? RUNTIME_PROFILE_REASON_MESSAGES['external-inference-only']!
}

export function listKnownRuntimeProfilesForResolver(): RuntimeProfile[] {
  return listRuntimeProfiles()
}
