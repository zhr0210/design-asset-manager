import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  formatDownloadFileSize,
  normalizeDownloadStatus,
  normalizeProgress,
  projectDownloadQueueRowDisplay,
  projectDownloadSearchActionDisplay,
  projectDownloadTaskStatusDisplay,
  projectDownloadTaskSummaryDisplay
} from '../src/shared/workflows/download-status.workflow'

assert.equal(normalizeDownloadStatus('completed'), 'completed')
assert.equal(normalizeDownloadStatus('failed'), 'failed')
assert.equal(normalizeDownloadStatus('downloading'), 'downloading')
assert.equal(normalizeDownloadStatus('waiting'), 'waiting')
assert.equal(normalizeDownloadStatus('unknown'), 'waiting')
assert.equal(normalizeDownloadStatus(null), 'waiting')

assert.deepEqual(projectDownloadTaskStatusDisplay('completed'), {
  normalizedStatus: 'completed',
  label: '已完成',
  badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  iconKey: 'check',
  iconClass: 'text-emerald-500',
  progressClass: 'bg-emerald-500',
  isActive: false,
  isCompleted: true,
  isFailed: false
})

assert.deepEqual(projectDownloadTaskStatusDisplay('failed'), {
  normalizedStatus: 'failed',
  label: '失败',
  badgeClass: 'bg-rose-50 text-rose-600 border border-rose-100',
  iconKey: 'alert',
  iconClass: 'text-rose-500',
  progressClass: 'bg-rose-500',
  isActive: false,
  isCompleted: false,
  isFailed: true
})

assert.deepEqual(projectDownloadTaskStatusDisplay('downloading'), {
  normalizedStatus: 'downloading',
  label: '下载中',
  badgeClass: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  iconKey: 'loader',
  iconClass: 'text-brand-500 animate-spin',
  progressClass: 'bg-brand-500',
  isActive: true,
  isCompleted: false,
  isFailed: false
})

assert.deepEqual(projectDownloadTaskStatusDisplay('waiting'), {
  normalizedStatus: 'waiting',
  label: '排队等待',
  badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
  iconKey: 'clock',
  iconClass: 'text-slate-400',
  progressClass: 'bg-brand-500',
  isActive: true,
  isCompleted: false,
  isFailed: false
})

assert.deepEqual(projectDownloadSearchActionDisplay(null), {
  disabled: false,
  label: '抓取下载',
  iconKey: 'download',
  buttonClass: 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
})
assert.deepEqual(projectDownloadSearchActionDisplay('completed'), {
  disabled: true,
  label: '已在库中',
  iconKey: 'image',
  buttonClass: 'bg-slate-100 text-slate-500'
})
assert.deepEqual(projectDownloadSearchActionDisplay('failed'), {
  disabled: true,
  label: '下载中...',
  iconKey: 'clock',
  buttonClass: 'bg-brand-50 text-brand-600'
})

assert.deepEqual(projectDownloadTaskSummaryDisplay([
  { status: 'waiting' },
  { status: 'downloading' },
  { status: 'completed' },
  { status: 'failed' }
]), {
  activeCount: 2,
  completedCount: 1,
  isDownloading: true,
  topbarLabel: '下载中',
  emptyQueueLabel: '当前没有任何下载队列任务',
  emptyQueueDetail: '您在“素材搜索”中发起的下载项目会在本队列中显示进度。'
})

assert.deepEqual(projectDownloadQueueRowDisplay({
  id: 'task-1',
  assetTitle: '  Poster Mockup  ',
  sourceSiteName: 'TapNow',
  thumbnailUrl: 'thumb.jpg',
  fileSize: 2.5 * 1024 * 1024,
  progress: 66.6,
  status: 'downloading'
}), {
  id: 'task-1',
  titleLabel: 'Poster Mockup',
  sourceSiteLabel: 'TapNow',
  thumbnailSrc: 'thumb.jpg',
  fileSizeLabel: '2.50 MB',
  hasFileSize: true,
  progressPercent: 67,
  progressLabel: '67%',
  status: projectDownloadTaskStatusDisplay('downloading')
})

assert.deepEqual(projectDownloadQueueRowDisplay({
  id: null,
  assetTitle: ' ',
  sourceSiteName: '',
  thumbnailUrl: null,
  fileSize: 0,
  progress: 120,
  status: 'unknown'
}), {
  id: '',
  titleLabel: '未命名下载',
  sourceSiteLabel: 'Unknown',
  thumbnailSrc: '',
  fileSizeLabel: '',
  hasFileSize: false,
  progressPercent: 100,
  progressLabel: '100%',
  status: projectDownloadTaskStatusDisplay('unknown')
})

assert.equal(normalizeProgress(Number.NaN), 0)
assert.equal(normalizeProgress(-10), 0)
assert.equal(normalizeProgress(45.4), 45)
assert.equal(formatDownloadFileSize(1024 * 1024), '1.00 MB')
assert.equal(formatDownloadFileSize(-1), '')

const downloadQueueSource = await fs.readFile('src/renderer/routes/DownloadQueue.tsx', 'utf8')
const searchSource = await fs.readFile('src/renderer/routes/Search.tsx', 'utf8')
const sidebarSource = await fs.readFile('src/renderer/components/layout/Sidebar.tsx', 'utf8')
const topbarSource = await fs.readFile('src/renderer/components/layout/Topbar.tsx', 'utf8')
const dashboardSource = await fs.readFile('src/renderer/routes/Dashboard.tsx', 'utf8')
const downloadStoreSource = await fs.readFile('src/renderer/stores/download.store.ts', 'utf8')
const sharedIndexSource = await fs.readFile('src/shared/index.ts', 'utf8')

assert.match(downloadQueueSource, /projectDownloadTaskSummaryDisplay/)
assert.match(downloadQueueSource, /projectDownloadQueueRowDisplay/)
assert.match(searchSource, /projectDownloadSearchActionDisplay/)
assert.match(sidebarSource, /projectDownloadTaskSummaryDisplay/)
assert.match(topbarSource, /projectDownloadTaskSummaryDisplay/)
assert.match(dashboardSource, /projectDownloadTaskSummaryDisplay/)
assert.match(downloadStoreSource, /projectDownloadTaskSummaryDisplay/)
assert.match(sharedIndexSource, /download-status\.workflow/)

for (const source of [downloadQueueSource, searchSource, sidebarSource, topbarSource, dashboardSource]) {
  assert.doesNotMatch(source, /status\s*===\s*['"]completed['"]/)
  assert.doesNotMatch(source, /status\s*===\s*['"]failed['"]/)
  assert.doesNotMatch(source, /status\s*===\s*['"]downloading['"]/)
  assert.doesNotMatch(source, /status\s*===\s*['"]waiting['"]/)
  assert.doesNotMatch(source, /status\s*!==\s*null/)
}

assert.doesNotMatch(downloadQueueSource, /fileSize\s*\/\s*1024\s*\/\s*1024/)
assert.doesNotMatch(downloadQueueSource, /task\.progress}%/)
assert.doesNotMatch(downloadQueueSource, /task\.assetTitle/)
assert.doesNotMatch(downloadQueueSource, /task\.sourceSiteName/)

console.log('download-status-workflow passed')
