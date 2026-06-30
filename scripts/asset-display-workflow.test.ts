import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  formatAssetDate,
  formatAssetDateTime,
  formatAssetFileSize,
  formatAssetZoomPercent,
  projectAssetCaptionDisplay,
  projectAssetDetailDisplay,
  projectAssetLibraryCardDisplay,
  projectAssetOriginalViewerDisplay,
  projectAssetTagPreview,
  projectDashboardRecentAssetDisplays
} from '../src/shared/workflows/asset-display.workflow'

const asset = {
  id: 'asset-1',
  title: '  Bookshop Website  ',
  thumbnailPath: 'thumb.jpg',
  fileUrl: 'file.jpg',
  sourceSiteName: 'Pinterest',
  width: 736,
  height: 552,
  fileType: 'JPG',
  fileSize: 3.35 * 1024 * 1024,
  createdAt: '2026-06-04T00:00:00.000Z',
  aiCaption: '  A soft bookshop web design with pastel layout.  ',
  aiCaptionSource: 'ai_florence',
  aiCaptionUpdatedAt: '2026-06-04T12:30:00.000Z',
  aiCaptionIsUserEdited: 0,
  tags: ['Scraped', 'Pinterest.com', 'A4竖版', 'App界面']
}

assert.deepEqual(projectAssetTagPreview(asset.tags, 3), {
  visibleTags: ['Scraped', 'Pinterest.com', 'A4竖版'],
  overflowCount: 1,
  overflowLabel: '+1',
  hasOverflow: true
})
assert.deepEqual(projectAssetTagPreview(['', '  ', 'Valid'], 0), {
  visibleTags: [],
  overflowCount: 1,
  overflowLabel: '+1',
  hasOverflow: true
})

assert.deepEqual(projectAssetLibraryCardDisplay(asset), {
  id: 'asset-1',
  titleLabel: 'Bookshop Website',
  previewSrc: 'file.jpg',
  sourceSiteLabel: 'Pinterest',
  tagPreview: {
    visibleTags: ['Scraped', 'Pinterest.com', 'A4竖版'],
    overflowCount: 1,
    overflowLabel: '+1',
    hasOverflow: true
  }
})

assert.deepEqual(projectAssetDetailDisplay(asset), {
  id: 'asset-1',
  titleLabel: 'Bookshop Website',
  previewSrc: 'file.jpg',
  sourceSiteLabel: 'Pinterest',
  imageSpecLabel: '736 x 552 (JPG)',
  fileSizeLabel: '3.35 MB',
  createdDateLabel: formatAssetDate(asset.createdAt),
  fileTypeLabel: 'JPG'
})

assert.deepEqual(projectAssetDetailDisplay({ id: 'missing' }), {
  id: 'missing',
  titleLabel: '未命名素材',
  previewSrc: '',
  sourceSiteLabel: 'Unknown',
  imageSpecLabel: '- x - (unknown)',
  fileSizeLabel: '0.00 MB',
  createdDateLabel: '-',
  fileTypeLabel: 'unknown'
})

assert.deepEqual(projectAssetOriginalViewerDisplay(asset, {
  realWidth: 1200,
  realHeight: 800,
  scaleMode: 'custom',
  scale: 1.25
}), {
  id: 'asset-1',
  titleLabel: 'Bookshop Website',
  previewSrc: 'file.jpg',
  metadataLabel: '1200 x 800 PX • 3.35 MB • JPG',
  zoomLabel: '125%',
  fitToggleTitle: '切换到自适应屏幕',
  fitToggleLabel: '适应屏幕',
  fitToggleIconKey: 'minimize'
})

assert.deepEqual(projectAssetOriginalViewerDisplay({ id: 'viewer-missing', thumbnailPath: 'fallback.png' }, {
  scaleMode: 'fit'
}), {
  id: 'viewer-missing',
  titleLabel: '未命名素材',
  previewSrc: 'fallback.png',
  metadataLabel: '- x - PX • 0.00 MB • unknown',
  zoomLabel: '自适应',
  fitToggleTitle: '切换到原图尺寸 (100%)',
  fitToggleLabel: '100% 原图',
  fitToggleIconKey: 'maximize'
})

assert.deepEqual(projectAssetCaptionDisplay(asset), {
  id: 'asset-1',
  captionText: 'A soft bookshop web design with pastel layout.',
  hasCaption: true,
  placeholderLabel: '暂无画面描述。点击“重新生成”或“编辑”添加描述。',
  sourceLabel: 'Florence-2',
  sourceToneClass: 'text-indigo-600 font-bold',
  showRestoreAction: false,
  restoreActionLabel: '恢复AI描述',
  regenerateActionLabel: '重新生成',
  editActionLabel: '编辑描述',
  updatedAtLabel: formatAssetDateTime(asset.aiCaptionUpdatedAt),
  hasUpdatedAt: true
})

assert.deepEqual(projectAssetCaptionDisplay({
  ...asset,
  aiCaption: '',
  aiCaptionSource: 'manual',
  aiCaptionUpdatedAt: 'not-a-date',
  aiCaptionIsUserEdited: 1
}, { isRegenerating: true }), {
  id: 'asset-1',
  captionText: '',
  hasCaption: false,
  placeholderLabel: '暂无画面描述。点击“重新生成”或“编辑”添加描述。',
  sourceLabel: '用户已编辑，AI不会自动覆盖',
  sourceToneClass: 'text-amber-600 font-bold',
  showRestoreAction: true,
  restoreActionLabel: '恢复AI描述',
  regenerateActionLabel: '生成中...',
  editActionLabel: '编辑描述',
  updatedAtLabel: '-',
  hasUpdatedAt: false
})

assert.equal(projectAssetCaptionDisplay({ id: 'unknown-caption' }).sourceLabel, '未知')
assert.equal(formatAssetFileSize(asset.fileSize, 1, false), '3.4MB')
assert.equal(formatAssetFileSize(Number.NaN, 2, true), '0.00 MB')
assert.equal(formatAssetDate('not-a-date'), '-')
assert.equal(formatAssetDateTime('not-a-date'), '-')
assert.equal(formatAssetZoomPercent(0.333), '33%')
assert.equal(formatAssetZoomPercent(Number.NaN), '100%')

assert.deepEqual(projectDashboardRecentAssetDisplays([
  asset,
  { ...asset, id: 'asset-2', title: 'Second', fileUrl: null, thumbnailPath: 'second-thumb.jpg', fileSize: 1024 * 1024 },
  { ...asset, id: 'asset-3', title: 'Third' }
], { limit: 2 }).map((item) => ({
  id: item.id,
  titleLabel: item.titleLabel,
  previewSrc: item.previewSrc,
  fileSummaryLabel: item.fileSummaryLabel,
  createdDateLabel: item.createdDateLabel
})), [
  {
    id: 'asset-1',
    titleLabel: 'Bookshop Website',
    previewSrc: 'file.jpg',
    fileSummaryLabel: 'JPG • 3.4MB',
    createdDateLabel: formatAssetDate(asset.createdAt)
  },
  {
    id: 'asset-2',
    titleLabel: 'Second',
    previewSrc: 'second-thumb.jpg',
    fileSummaryLabel: 'JPG • 1.0MB',
    createdDateLabel: formatAssetDate(asset.createdAt)
  }
])

const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')
const gridSource = await fs.readFile('src/renderer/components/library/AssetWaterfallGrid.tsx', 'utf8')
const dashboardSource = await fs.readFile('src/renderer/routes/Dashboard.tsx', 'utf8')
const inspectorSource = await fs.readFile('src/renderer/components/asset/AssetInspectorDrawer.tsx', 'utf8')
const originalViewerSource = await fs.readFile('src/renderer/components/asset/AssetOriginalViewerModal.tsx', 'utf8')
const captionPanelSource = await fs.readFile('src/renderer/components/asset/AssetCaptionPanel.tsx', 'utf8')

assert.match(sharedIndexSource, /asset-display\.workflow/)
assert.match(gridSource, /projectAssetLibraryCardDisplay/)
assert.match(dashboardSource, /projectDashboardRecentAssetDisplays/)
assert.match(inspectorSource, /projectAssetDetailDisplay/)
assert.match(originalViewerSource, /projectAssetOriginalViewerDisplay/)
assert.match(captionPanelSource, /projectAssetCaptionDisplay/)

assert.doesNotMatch(gridSource, /asset\.tags\.slice\(0,\s*3\)/)
assert.doesNotMatch(gridSource, /asset\.tags\.length\s*>\s*3/)
assert.doesNotMatch(gridSource, /\+{asset\.tags\.length - 3}/)
assert.doesNotMatch(dashboardSource, /assets\.slice\(0,\s*4\)/)
assert.doesNotMatch(dashboardSource, /fileSize\s*\/\s*1024\s*\/\s*1024/)
assert.doesNotMatch(dashboardSource, /new Date\(asset\.createdAt\)/)
assert.doesNotMatch(inspectorSource, /selectedAsset\.width}\s*x\s*\{selectedAsset\.height/)
assert.doesNotMatch(inspectorSource, /selectedAsset\.fileSize\s*\/\s*1024\s*\/\s*1024/)
assert.doesNotMatch(inspectorSource, /new Date\(selectedAsset\.createdAt\)/)
assert.doesNotMatch(originalViewerSource, /asset\.fileSize\s*\/\s*1024\s*\/\s*1024/)
assert.doesNotMatch(originalViewerSource, /Math\.round\(scale \* 100\)/)
assert.doesNotMatch(originalViewerSource, /asset\.fileUrl \|\| asset\.thumbnailPath/)
assert.doesNotMatch(captionPanelSource, /new Date\(selectedAsset\.aiCaptionUpdatedAt\)/)
assert.doesNotMatch(captionPanelSource, /selectedAsset\.aiCaptionSource\s*===/)
assert.doesNotMatch(captionPanelSource, /selectedAsset\.aiCaptionIsUserEdited\s*===/)
assert.doesNotMatch(captionPanelSource, /暂无画面描述。点击/)

console.log('asset-display-workflow passed')
