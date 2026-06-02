export interface AssetLibraryPathSample {
  assetId: string
  filePath: string | null | undefined
  thumbnailPath?: string | null
}

export interface AssetLibraryPathGovernanceReport {
  phase: '14A'
  dryRunOnly: true
  autoMoveFiles: false
  autoDeleteFiles: false
  autoUpdateFilePath: false
  assetsScanned: number
  missingFileReportShape: Array<{ assetId: string; pathPresent: boolean; existenceCheckDeferred: true }>
  remapSuggestions: Array<{ assetId: string; suggestedAction: 'review-library-root' | 'skip-empty-path'; reason: string }>
}

export function createAssetLibraryPathGovernanceReport(samples: AssetLibraryPathSample[]): AssetLibraryPathGovernanceReport {
  return {
    phase: '14A',
    dryRunOnly: true,
    autoMoveFiles: false,
    autoDeleteFiles: false,
    autoUpdateFilePath: false,
    assetsScanned: samples.length,
    missingFileReportShape: samples.map((sample) => ({
      assetId: sample.assetId,
      pathPresent: Boolean(sample.filePath?.trim()),
      existenceCheckDeferred: true
    })),
    remapSuggestions: samples.map((sample) => ({
      assetId: sample.assetId,
      suggestedAction: sample.filePath?.trim() ? 'review-library-root' : 'skip-empty-path',
      reason: sample.filePath?.trim()
        ? 'Path can be evaluated in a future user-confirmed remap dry-run.'
        : 'No path value is available to remap.'
    }))
  }
}
