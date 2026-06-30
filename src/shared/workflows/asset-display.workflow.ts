export interface AssetDisplayLike {
  id: string
  title?: string | null
  thumbnailPath?: string | null
  fileUrl?: string | null
  sourceSiteName?: string | null
  width?: number | null
  height?: number | null
  fileType?: string | null
  fileSize?: number | null
  createdAt?: string | null
  tags?: readonly string[] | null
  aiCaption?: string | null
  aiCaptionSource?: string | null
  aiCaptionUpdatedAt?: string | null
  aiCaptionIsUserEdited?: number | boolean | null
}

export interface AssetTagPreviewDisplay {
  visibleTags: string[]
  overflowCount: number
  overflowLabel: string
  hasOverflow: boolean
}

export interface AssetLibraryCardDisplay {
  id: string
  titleLabel: string
  previewSrc: string
  sourceSiteLabel: string
  tagPreview: AssetTagPreviewDisplay
}

export interface AssetDetailDisplay {
  id: string
  titleLabel: string
  previewSrc: string
  sourceSiteLabel: string
  imageSpecLabel: string
  fileSizeLabel: string
  createdDateLabel: string
  fileTypeLabel: string
}

export interface AssetDashboardPreviewDisplay extends AssetLibraryCardDisplay {
  fileSummaryLabel: string
  createdDateLabel: string
}

export interface AssetOriginalViewerDisplay {
  id: string
  titleLabel: string
  previewSrc: string
  metadataLabel: string
  zoomLabel: string
  fitToggleTitle: string
  fitToggleLabel: string
  fitToggleIconKey: 'maximize' | 'minimize'
}

export interface AssetCaptionDisplay {
  id: string
  captionText: string
  hasCaption: boolean
  placeholderLabel: string
  sourceLabel: string
  sourceToneClass: string
  showRestoreAction: boolean
  restoreActionLabel: string
  regenerateActionLabel: string
  editActionLabel: string
  updatedAtLabel: string
  hasUpdatedAt: boolean
}

export function projectAssetLibraryCardDisplay(
  asset: AssetDisplayLike,
  input?: { visibleTagLimit?: number | null }
): AssetLibraryCardDisplay {
  return {
    id: asset.id,
    titleLabel: projectAssetTitle(asset),
    previewSrc: projectAssetPreviewSrc(asset),
    sourceSiteLabel: asset.sourceSiteName || 'Unknown',
    tagPreview: projectAssetTagPreview(asset.tags, input?.visibleTagLimit ?? 3)
  }
}

export function projectAssetDetailDisplay(asset: AssetDisplayLike): AssetDetailDisplay {
  return {
    id: asset.id,
    titleLabel: projectAssetTitle(asset),
    previewSrc: projectAssetPreviewSrc(asset),
    sourceSiteLabel: asset.sourceSiteName || 'Unknown',
    imageSpecLabel: projectAssetImageSpecLabel(asset),
    fileSizeLabel: formatAssetFileSize(asset.fileSize, 2, true),
    createdDateLabel: formatAssetDate(asset.createdAt),
    fileTypeLabel: asset.fileType || 'unknown'
  }
}

export function projectDashboardRecentAssetDisplays(
  assets: readonly AssetDisplayLike[],
  input?: { limit?: number | null }
): AssetDashboardPreviewDisplay[] {
  const limit = typeof input?.limit === 'number' && input.limit >= 0 ? input.limit : 4
  return assets.slice(0, limit).map((asset) => {
    const card = projectAssetLibraryCardDisplay(asset)
    return {
      ...card,
      fileSummaryLabel: `${asset.fileType || 'unknown'} • ${formatAssetFileSize(asset.fileSize, 1, false)}`,
      createdDateLabel: formatAssetDate(asset.createdAt)
    }
  })
}

export function projectAssetOriginalViewerDisplay(
  asset: AssetDisplayLike,
  input: {
    realWidth?: number | null
    realHeight?: number | null
    scaleMode?: 'fit' | 'custom' | null
    scale?: number | null
  }
): AssetOriginalViewerDisplay {
  const scaleMode = input.scaleMode === 'custom' ? 'custom' : 'fit'
  const width = normalizeDimension(input.realWidth ?? asset.width)
  const height = normalizeDimension(input.realHeight ?? asset.height)

  return {
    id: asset.id,
    titleLabel: projectAssetTitle(asset),
    previewSrc: projectAssetPreviewSrc(asset),
    metadataLabel: `${width} x ${height} PX • ${formatAssetFileSize(asset.fileSize, 2, true)} • ${asset.fileType || 'unknown'}`,
    zoomLabel: scaleMode === 'fit' ? '自适应' : formatAssetZoomPercent(input.scale),
    fitToggleTitle: scaleMode === 'fit' ? '切换到原图尺寸 (100%)' : '切换到自适应屏幕',
    fitToggleLabel: scaleMode === 'fit' ? '100% 原图' : '适应屏幕',
    fitToggleIconKey: scaleMode === 'fit' ? 'maximize' : 'minimize'
  }
}

export function projectAssetCaptionDisplay(
  asset: AssetDisplayLike,
  input?: { isRegenerating?: boolean | null }
): AssetCaptionDisplay {
  const isUserEdited = asset.aiCaptionIsUserEdited === true || asset.aiCaptionIsUserEdited === 1
  const captionText = asset.aiCaption?.trim() || ''
  const source = projectAssetCaptionSource(asset.aiCaptionSource, isUserEdited)
  const updatedAtLabel = formatAssetDateTime(asset.aiCaptionUpdatedAt)

  return {
    id: asset.id,
    captionText,
    hasCaption: captionText.length > 0,
    placeholderLabel: '暂无画面描述。点击“重新生成”或“编辑”添加描述。',
    sourceLabel: source.label,
    sourceToneClass: source.toneClass,
    showRestoreAction: isUserEdited,
    restoreActionLabel: '恢复AI描述',
    regenerateActionLabel: input?.isRegenerating ? '生成中...' : '重新生成',
    editActionLabel: '编辑描述',
    updatedAtLabel,
    hasUpdatedAt: updatedAtLabel !== '-'
  }
}

export function projectAssetTagPreview(
  tags?: readonly string[] | null,
  visibleTagLimit = 3
): AssetTagPreviewDisplay {
  const safeTags = Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string' && tag.trim()) : []
  const limit = Math.max(0, Math.floor(visibleTagLimit))
  const visibleTags = safeTags.slice(0, limit)
  const overflowCount = Math.max(0, safeTags.length - visibleTags.length)

  return {
    visibleTags,
    overflowCount,
    overflowLabel: `+${overflowCount}`,
    hasOverflow: overflowCount > 0
  }
}

export function formatAssetFileSize(
  bytes?: number | null,
  decimals = 2,
  includeSpace = true
): string {
  const safeBytes = typeof bytes === 'number' && Number.isFinite(bytes) && bytes >= 0 ? bytes : 0
  const safeDecimals = Math.max(0, Math.floor(decimals))
  const value = (safeBytes / 1024 / 1024).toFixed(safeDecimals)
  return includeSpace ? `${value} MB` : `${value}MB`
}

export function formatAssetDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

export function formatAssetDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export function formatAssetZoomPercent(scale?: number | null): string {
  const safeScale = typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 1
  return `${Math.round(safeScale * 100)}%`
}

function projectAssetTitle(asset: AssetDisplayLike): string {
  return asset.title?.trim() || '未命名素材'
}

function projectAssetPreviewSrc(asset: AssetDisplayLike): string {
  return asset.fileUrl || asset.thumbnailPath || ''
}

function projectAssetImageSpecLabel(asset: AssetDisplayLike): string {
  const width = normalizeDimension(asset.width)
  const height = normalizeDimension(asset.height)
  return `${width} x ${height} (${asset.fileType || 'unknown'})`
}

function projectAssetCaptionSource(source?: string | null, isUserEdited = false): { label: string; toneClass: string } {
  if (isUserEdited) {
    return {
      label: '用户已编辑，AI不会自动覆盖',
      toneClass: 'text-amber-600 font-bold'
    }
  }

  if (source === 'ai_florence') {
    return {
      label: 'Florence-2',
      toneClass: 'text-indigo-600 font-bold'
    }
  }

  return {
    label: '未知',
    toneClass: ''
  }
}

function normalizeDimension(value?: number | null): number | string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : '-'
}
