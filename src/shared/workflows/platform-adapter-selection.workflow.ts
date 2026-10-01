export interface PlatformAdapterSelectionCandidate {
  platform?: string
}

export interface PlatformAdapterSelectionTarget {
  currentPlatform: string
}

export function platformAdapterMatchesCurrentPlatform(
  candidate: PlatformAdapterSelectionCandidate,
  target: PlatformAdapterSelectionTarget
): boolean {
  const candidatePlatform = candidate.platform
  return !candidatePlatform || String(candidatePlatform) === String(target.currentPlatform)
}
