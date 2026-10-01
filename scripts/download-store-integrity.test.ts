import assert from 'node:assert/strict'
import type { DownloadTask } from '../src/shared/types/download.types'

const writes: string[] = []
const events: string[] = []
let timers = 0
let history: DownloadTask[] = []
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalInterval = globalThis.setInterval
const bridge = {
  listDownloads: async () => history,
  listAssets: async () => [],
  listTags: async () => [],
  tagList: async () => ({ success: true, tags: [] }),
  saveDownload: async () => { writes.push('download'); return { success: true } },
  saveAsset: async () => { writes.push('asset'); return { success: true } },
  getDownloadPathPlan: async () => { writes.push('path-plan'); return {} }
}
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  electronAPI: bridge,
  dispatchEvent: (event: Event) => { events.push(event.type); return true }
} })
globalThis.setInterval = (() => { timers++; return 0 }) as typeof setInterval

try {
  const { useDownloadStore } = await import('../src/renderer/stores/download.store')
  await useDownloadStore.getState().loadDownloads()
  await useDownloadStore.getState().prepareManaged('https://example.invalid/generated.png')
  assert.match(useDownloadStore.getState().loadError!, /不支持下载执行/)
  assert.deepEqual(useDownloadStore.getState().tasks, [])
  assert.deepEqual(useDownloadStore.getState().jobs, [])
  assert.deepEqual(writes, [], 'An unavailable executor must not create records or simulated transfers.')
  assert.deepEqual(events, [])
  assert.equal(timers, 0)
  history = [{
    id: 'history-1', asset_title: 'Old completion', source_site_id: 'fixture',
    download_url: 'https://fixture.invalid/old-history.png', save_path: '', status: 'completed', progress: 100,
    created_at: '2026-01-01', updated_at: '2026-01-01'
  }, {
    id: 'history-2', asset_title: 'Old transfer', source_site_id: 'fixture',
    download_url: '', save_path: '', status: 'downloading', progress: 42,
    created_at: '2026-01-01', updated_at: '2026-01-01'
  }]
  const savedHistory = structuredClone(history)
  await useDownloadStore.getState().loadDownloads()
  assert.equal(useDownloadStore.getState().tasks.length, 2)
  assert.equal(useDownloadStore.getState().tasks[0].historyOnly, true)
  assert.equal(useDownloadStore.getState().tasks[0].thumbnailUrl, '', 'Reading history cannot issue unreviewed image requests')
  assert.equal(useDownloadStore.getState().tasks[0].fileSize, undefined)
  assert.equal(useDownloadStore.getState().activeDownloadsCount, 0)
  await useDownloadStore.getState().retryTask('history-1')
  assert.equal(useDownloadStore.getState().tasks[0].status, 'completed')
  await useDownloadStore.getState().retryTask('unknown')
  assert.deepEqual(history, savedHistory, 'Reading/retrying never rewrites historical records.')
  assert.deepEqual(writes, [])
  assert.equal(timers, 0)
  let listManaged = async (): Promise<any> => ({ ok: true, value: [] })
  let prepareManaged = async (_input: unknown): Promise<any> => ({ ok: false, error: 'fixture unavailable' })
  Object.assign(bridge, { managedDownloads: {
    list: () => listManaged(), prepare: (input: unknown) => prepareManaged(input),
    run: async () => ({ ok: true }), cancel: async () => ({ ok: true }), retry: async () => ({ ok: true })
  } })
  const currentJob = { id: 'managed-1', state: 'downloading', receivedBytes: 64, totalBytes: 128 }
  let completeOldList!: (value: unknown) => void
  listManaged = () => new Promise(resolve => { completeOldList = resolve })
  const oldPoll = useDownloadStore.getState().loadManaged()
  listManaged = async () => ({ ok: true, value: [{ ...currentJob, state: 'completed', receivedBytes: 128 }] })
  await useDownloadStore.getState().loadManaged()
  completeOldList({ ok: true, value: [currentJob] }); await oldPoll
  assert.equal(useDownloadStore.getState().jobs[0].state, 'completed')
  assert.equal(useDownloadStore.getState().activeDownloadsCount, 0)
  listManaged = async () => ({ ok: false, error: 'private fixture details' })
  await useDownloadStore.getState().loadManaged()
  assert.equal(useDownloadStore.getState().jobs[0].state, 'completed')
  assert.equal(useDownloadStore.getState().loadError, '下载状态暂时无法读取。')
  listManaged = async () => ({ ok: true, value: [] })
  await useDownloadStore.getState().loadManaged()
  assert.equal(useDownloadStore.getState().loadError, null)
  let completeOldReview!: (value: unknown) => void
  prepareManaged = () => new Promise(resolve => { completeOldReview = resolve })
  const oldReview = useDownloadStore.getState().prepareManaged('https://fixture.invalid/old.png')
  prepareManaged = async () => ({ ok: true, value: { receipt: 'new-review', fileName: 'new.png' } })
  await useDownloadStore.getState().prepareManaged('https://fixture.invalid/new.png')
  completeOldReview({ ok: true, value: { receipt: 'old-review' } }); await oldReview
  assert.equal(useDownloadStore.getState().review?.receipt, 'new-review')
  prepareManaged = () => new Promise(resolve => { completeOldReview = resolve })
  const dismissed = useDownloadStore.getState().prepareManaged('https://fixture.invalid/dismissed.png')
  assert.equal(useDownloadStore.getState().review, null, 'Preparing a replacement removes the previous confirmable review immediately.')
  useDownloadStore.getState().dismissReview()
  completeOldReview({ ok: true, value: { receipt: 'dismissed-review' } }); await dismissed
  assert.equal(useDownloadStore.getState().review, null)
  let preparedInput: unknown
  prepareManaged = async input => { preparedInput = input; return { ok: true, value: { receipt: 'persistent-review', persistence: 'library', upgradesLibrary: true } } }
  await useDownloadStore.getState().prepareManaged('https://fixture.invalid/persist.png', undefined, 'library')
  assert.deepEqual(preparedInput, { url: 'https://fixture.invalid/persist.png', persistence: 'library' })
  assert.equal(useDownloadStore.getState().review?.upgradesLibrary, true)
  await useDownloadStore.getState().prepareResume('trusted-journal-task')
  assert.deepEqual(preparedInput, { resumeTaskId: 'trusted-journal-task' })
  prepareManaged = () => new Promise(resolve => { completeOldReview = resolve })
  const cancelledResume = useDownloadStore.getState().prepareResume('trusted-journal-task')
  useDownloadStore.getState().dismissReview()
  completeOldReview({ ok: true, value: { receipt: 'cancelled-resume' } }); await cancelledResume
  assert.equal(useDownloadStore.getState().review, null, 'A delayed recovery review cannot undo cancellation')
} finally {
  globalThis.setInterval = originalInterval
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
}
console.log('download-store-integrity passed')
