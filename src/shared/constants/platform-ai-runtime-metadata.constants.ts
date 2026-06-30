import type {
  AiCapabilityStatus,
  AiRuntimeCapability,
  PlatformAiWorkerProbeResultBase
} from '../types/platform-ai-runtime.types'
import type { PlatformAiBranch } from '../types/platform-ai-branch-status.types'
import type { PlatformArch, PlatformName } from '../types/platform.types'
import { platformAdapterMatchesCurrentPlatform } from '../workflows/platform-adapter-selection.workflow'

export const PLATFORM_AI_BRANCH_PLATFORMS: Record<PlatformAiBranch, PlatformName> = {
  macos: 'darwin',
  windows: 'win32'
} as const

export interface PlatformAiWorkerProbeConnectionMarker {
  platformMarkers?: readonly string[]
  macOSFlag?: 'isMacOS'
}

export const PLATFORM_AI_WORKER_PROBE_CONNECTION_MARKERS: Record<PlatformAiBranch, PlatformAiWorkerProbeConnectionMarker> = {
  macos: {
    macOSFlag: 'isMacOS'
  },
  windows: {
    platformMarkers: ['win32', 'windows']
  }
} as const

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
  return platformAdapterMatchesCurrentPlatform({ platform }, { currentPlatform: expectedPlatform })
}

export function isPlatformAiBranchCurrentPlatform(platformBranch: PlatformAiBranch, currentPlatform: PlatformName): boolean {
  return isPlatformName(currentPlatform, PLATFORM_AI_BRANCH_PLATFORMS[platformBranch])
}

export function isPlatformAiWorkerProbeConnectionMarker(
  platformBranch: PlatformAiBranch,
  probe: Pick<PlatformAiWorkerProbeResultBase, 'platform' | 'isMacOS'>
): boolean {
  const marker = PLATFORM_AI_WORKER_PROBE_CONNECTION_MARKERS[platformBranch]
  return Boolean(
    marker.platformMarkers?.includes(probe.platform)
      || (marker.macOSFlag === 'isMacOS' && probe.isMacOS)
  )
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
