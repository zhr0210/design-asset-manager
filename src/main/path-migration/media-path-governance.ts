export type MediaPathKind = 'thumbnail' | 'normalized-image'

export interface MediaPathReference {
  kind: MediaPathKind
  assetId: string
  cacheRootId: 'managed-cache'
  relativePath: string
  legacyPathFallback: string | null
}

export interface MediaPathGovernancePlan {
  phase: '14C'
  kind: MediaPathKind
  regenerateFiles: false
  moveLegacyFiles: false
  legacyPathFallback: true
  cacheRootDesign: 'managed-cache'
  reference: MediaPathReference
}

export function createMediaPathReference(kind: MediaPathKind, assetId: string, filename: string, legacyPathFallback: string | null = null): MediaPathReference {
  return {
    kind,
    assetId,
    cacheRootId: 'managed-cache',
    relativePath: `${kind}/${assetId}/${filename}`,
    legacyPathFallback
  }
}

export function createMediaPathGovernancePlan(kind: MediaPathKind, assetId: string, filename: string, legacyPathFallback: string | null = null): MediaPathGovernancePlan {
  return {
    phase: '14C',
    kind,
    regenerateFiles: false,
    moveLegacyFiles: false,
    legacyPathFallback: true,
    cacheRootDesign: 'managed-cache',
    reference: createMediaPathReference(kind, assetId, filename, legacyPathFallback)
  }
}
