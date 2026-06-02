import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeProfile, RuntimeProfileId, RuntimeProfileRecommendation, RuntimeProfileResolverInput } from './runtime-profile.types'
import { getProfilesForPlatform, getRuntimeProfile, listRuntimeProfiles } from './runtime-profile-registry'

const BLOCKING_CHECK_IDS = new Set(['path', 'permission', 'system', 'node'])

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
  if (platform === 'win32') return 'windows-cpu'
  if (platform === 'darwin' && arch === 'arm64') return 'macos-apple-silicon'
  if (platform === 'darwin' && arch === 'x64') return 'macos-intel'
  return 'external-inference-only'
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
  if (input.hardwareHints?.nvidiaGpu && input.platformInfo.platform === 'win32') return 'windows-nvidia-cuda'
  return getDefaultRuntimeProfileForPlatform(input.platformInfo.platform, input.platformInfo.arch)
}

function buildReason(platform: PlatformName, arch: PlatformArch, profile: RuntimeProfile, blocking: string[]) {
  if (blocking.length > 0) return `Blocking Doctor issues require a conservative fallback profile for ${platform}/${arch}.`
  if (profile.id === 'windows-nvidia-cuda') return 'Windows NVIDIA hint is present, so the CUDA-capable profile is the best metadata match.'
  if (profile.id === 'windows-cpu') return 'Windows without a GPU hint defaults to the CPU profile.'
  if (profile.id === 'macos-apple-silicon') return 'macOS arm64 maps to the Apple Silicon profile.'
  if (profile.id === 'macos-intel') return 'macOS x64 maps to the Intel profile with external inference fallback.'
  return 'External inference only was selected or is the safest fallback.'
}

export function listKnownRuntimeProfilesForResolver(): RuntimeProfile[] {
  return listRuntimeProfiles()
}
