import type { AiCapabilityStatus, AiRuntimeCapability } from '../types/platform-ai-runtime.types'
import type { PlatformName } from '../types/platform.types'

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
