import type { AiCapabilityStatus, AiRuntimeCapability } from '../types/platform-ai-runtime.types'
import type { PlatformArch, PlatformName } from '../types/platform.types'

export function createAiRuntimeCapability(
  id: string,
  label: string,
  status: AiCapabilityStatus,
  role: AiRuntimeCapability['role'],
  modelFamily?: string,
  backend?: string
): AiRuntimeCapability {
  return { id, label, status, role, modelFamily, backend }
}

export function isPlatformName(platform: PlatformName, expectedPlatform: PlatformName): boolean {
  return platform === expectedPlatform
}

export function currentPlatformFallbackStatus(isCurrentPlatform: boolean): AiCapabilityStatus {
  return isCurrentPlatform ? 'fallback' : 'unavailable'
}

export function currentPlatformEvidenceStatus(isCurrentPlatform: boolean): AiCapabilityStatus {
  return isCurrentPlatform ? 'evidence_insufficient' : 'unavailable'
}

export function currentPlatformLaneStatus(input: {
  isCurrentPlatform: boolean
  arch?: PlatformArch
  requiredArch?: PlatformArch
}): AiCapabilityStatus {
  if (!input.isCurrentPlatform) return 'unavailable'
  if (input.requiredArch && input.arch !== input.requiredArch) return 'fallback'
  return currentPlatformEvidenceStatus(input.isCurrentPlatform)
}
