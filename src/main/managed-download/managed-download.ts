import type { DownloadIntent, DownloadJournalCommand, DownloadJournalOperation } from '../../shared/contracts/download-journal.contract'
import type { PrepareDownload } from '../../shared/contracts/managed-download.contract'
import { createResumableImageTransfer } from './resumable-image-transfer'
import { randomUUID } from 'node:crypto'
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract'
import type { ManagedDownloadJob, ManagedDownloadReview } from '../../shared/contracts/managed-download.contract'
import type { DownloadService } from '../services/download.service'

type Plan = { review: ManagedDownloadReview; url: string; expires: number; intent?: DownloadIntent }
type Task = { value: ManagedDownloadJob; url: string; abort: AbortController; transfer: ReturnType<typeof createResumableImageTransfer>; running: boolean; retryCount: number; retainedAt: number; intent?: DownloadIntent; completion?: Promise<void> }
export function createManagedDownloads(deps: { host: Pick<ActiveLibraryHost, 'inspect' | 'importDownloadedImage'> & Partial<Pick<ActiveLibraryHost, 'recoverDownloadedImage' | 'downloadJournal'>>; history: Pick<DownloadService, 'saveTask'>; onImported(job: ManagedDownloadJob): void; fetch?: typeof fetch }) {
  const plans = new Map<string, Plan>(); const tasks = new Map<string, Task>(); let active = 0; let authorityEpoch = 0; let draining = false
  const matches = (job: { libraryIdentity: string; generation: string }) => { const scope = deps.host.inspect(); return scope.state === 'ready' && scope.identity === job.libraryIdentity && scope.generation === job.generation }
  const prepareMemory = (input: { url: string; fileName?: string }): ManagedDownloadReview => {
    if (draining) throw new Error('正在关闭或切换素材库。')
    if (!input || typeof input.url !== 'string' || input.url.length > 8192 || Object.keys(input).some(key => !['url', 'fileName'].includes(key))) throw new Error('下载请求无效。')
    const url = new URL(input.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('仅支持不含登录凭据的 HTTP 图片地址。')
    const scope = deps.host.inspect(); if (scope.state !== 'ready' || !scope.identity || !scope.generation) throw new Error('请先打开目标素材库。')
    let name = input.fileName || decodeURIComponent(url.pathname.split('/').pop() || '') || 'download-image'
    name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 160)
    if (!name.trim() || /^\.+$/.test(name)) name = 'download-image'
    for (const [id, plan] of plans) if (plan.expires < Date.now()) plans.delete(id)
    if (plans.size >= 20) throw new Error('待确认下载过多，请先完成已有请求。')
    const review = { receipt: randomUUID(), fileName: name, origin: url.origin, libraryIdentity: scope.identity, generation: scope.generation }
    plans.set(review.receipt, { review, url: url.href, expires: Date.now() + 300000 }); return review
  }
  function prepare(input: { url: string; fileName?: string; persistence?: 'memory' }): ManagedDownloadReview
  function prepare(input: PrepareDownload): ManagedDownloadReview | Promise<ManagedDownloadReview>
  function prepare(input: PrepareDownload): ManagedDownloadReview | Promise<ManagedDownloadReview> {
    if (!input || typeof input !== 'object') throw new Error('下载请求无效。')
    if ('abandonTaskId' in input) {
      if (Object.keys(input).some(key => key !== 'abandonTaskId') || typeof input.abandonTaskId !== 'string') throw new Error('释放请求无效。')
      return preparePersistent(input)
    }
    if ('resumeTaskId' in input) {
      if (Object.keys(input).some(key => key !== 'resumeTaskId') || typeof input.resumeTaskId !== 'string') throw new Error('恢复请求无效。')
      return preparePersistent(input)
    }
    if (Object.keys(input).some(key => !['url', 'fileName', 'persistence'].includes(key)) || (input.persistence !== undefined && !['memory', 'library'].includes(input.persistence))) throw new Error('下载请求无效。')
    if (input.persistence === 'library') return preparePersistent(input)
    return prepareMemory({ url: input.url, ...(input.fileName ? { fileName: input.fileName } : {}) })
  }
  async function journal(command: DownloadJournalCommand) {
    if (!deps.host.downloadJournal) throw new Error('当前环境不支持持久下载。')
    return deps.host.downloadJournal(command)
  }
  async function preparePersistent(input: PrepareDownload): Promise<ManagedDownloadReview> {
    const epoch = authorityEpoch
    const scope = deps.host.inspect()
    if (scope.state !== 'ready' || !scope.generation || !scope.identity) throw new Error('请先打开目标素材库。')
    let intent: DownloadIntent | undefined
    let retainedBytes: number | undefined
    if ('abandonTaskId' in input) {
      if (tasks.get(input.abandonTaskId)?.running) throw new Error('请先取消下载并等待传输停止。')
      const retention = await journal({ kind: 'retention', generation: scope.generation, taskId: input.abandonTaskId })
      intent = retention.intent!; retainedBytes = retention.retainedBytes
      if (retention.captureAccepted && intent.phase !== 'completed') throw new Error('该任务已有入库记录，请先恢复入库，再通过回收站管理素材。')
    }
    if ('resumeTaskId' in input) {
      if (tasks.get(input.resumeTaskId)?.running) throw new Error('下载正在进行。')
      intent = (await journal({ kind: 'read', generation: scope.generation, taskId: input.resumeTaskId })).intent!
      if (intent.phase === 'completed') throw new Error('任务已经完成。')
    }
    const version = (await journal({ kind: 'list', generation: scope.generation })).version
    if (epoch !== authorityEpoch || !matches({ libraryIdentity: scope.identity, generation: scope.generation })) throw new Error('目标资料库已切换。')
    const review = prepareMemory(intent ? { url: intent.request_url, fileName: intent.file_name } : { url: (input as { url: string }).url, ...('fileName' in input && input.fileName ? { fileName: input.fileName } : {}) })
    const persistent: ManagedDownloadReview = { ...review, persistence: 'library', upgradesLibrary: version < 3, ...(intent ? { resumeTaskId: intent.task_id, checkpointBytes: retainedBytes ?? intent.committed_bytes, ...('abandonTaskId' in input ? { action: 'abandon' as const } : {}), recovery: intent.content_sha256 ? 'local' as const : 'network' as const } : {}) }
    plans.set(review.receipt, { ...plans.get(review.receipt)!, review: persistent, intent })
    return structuredClone(persistent)
  }
  const run = (receipt: string) => {
    if (draining) throw new Error('正在关闭或切换素材库。')
    const plan = plans.get(receipt)
    if (plan?.intent && tasks.get(plan.intent.task_id)?.running) throw new Error('下载正在进行。')
    if (!plan || plan.expires < Date.now() || !matches(plan.review)) throw new Error('下载确认已失效，请重新检查目标资料库。')
    if (plan.review.action !== 'abandon' && active >= 3) throw new Error('最多同时执行三个下载，请稍后重试。')
    plans.delete(receipt)
    if (plan.review.action === 'abandon') return abandon(plan)
    const value: ManagedDownloadJob = { id: plan.intent?.task_id ?? randomUUID(), ...plan.review, state: 'queued', receivedBytes: plan.intent?.committed_bytes ?? 0, totalBytes: plan.intent?.total_bytes ?? null }
    delete (value as Partial<ManagedDownloadReview>).receipt
    const task: Task = { value, url: plan.url, abort: new AbortController(), transfer: createResumableImageTransfer(plan.url, deps.fetch), running: false, retryCount: 0, retainedAt: 0, intent: plan.intent }; tasks.set(value.id, task); start(task)
    return structuredClone(value)
  }
  async function abandon(plan: Plan): Promise<ManagedDownloadJob> {
    const intent = plan.intent!
    const result = await journal({ kind: 'abandon', generation: plan.review.generation, taskId: intent.task_id, revision: intent.revision })
    const value: ManagedDownloadJob = { id: intent.task_id, fileName: intent.file_name, origin: plan.review.origin, libraryIdentity: plan.review.libraryIdentity, generation: plan.review.generation, persistence: 'library', state: intent.phase === 'completed' ? 'completed' : 'cancelled', abandoned: intent.phase !== 'completed', receivedBytes: 0, totalBytes: null, retainedBytes: result.retainedBytes, ...(intent.asset_id ? { assetId: intent.asset_id } : {}), ...(result.retainedBytes ? { error: '部分已登记文件无法核验或释放，已保留现场，可再次检查释放。' } : {}) }
    const task = tasks.get(intent.task_id)
    if (task) { task.transfer.discard(); task.value = value }
    else tasks.set(value.id, { value, url: intent.request_url, abort: new AbortController(), transfer: createResumableImageTransfer(intent.request_url, deps.fetch), running: false, retryCount: 0, retainedAt: 0 })
    return structuredClone(value)
  }
  function pruneRetained() {
    const retained = [...tasks.values()].filter(task => !task.running && task.transfer.retainedByteLength() > 0).sort((a, b) => a.retainedAt - b.retainedAt)
    let bytes = retained.reduce((sum, task) => sum + task.transfer.retainedByteLength(), 0)
    for (const task of retained) {
      if (bytes <= 64 * 1024 * 1024) break
      bytes -= task.transfer.retainedByteLength(); task.transfer.discard()
      if (task.value.state === 'failed') task.value.error = '下载中断，临时续传数据已释放。重试会从头下载。'
    }
  }
  function start(task: Task, recovery = false) {
    if (task.running) throw new Error('下载正在进行。')
    active++; task.running = true
    task.completion = (task.value.persistence === 'library' ? transferPersistent(task) : transfer(task, recovery)).finally(() => {
      active--; task.running = false; task.retainedAt = Date.now(); pruneRetained()
      if (tasks.size > 100) for (const [id, old] of tasks) {
        if (tasks.size <= 100) break
        if (!old.running && old !== task) { old.transfer.discard(); tasks.delete(id) }
      }
    })
  }
  async function transferPersistent(task: Task) {
    const job = task.value
    const signal = task.abort.signal
    const timer = setTimeout(() => task.abort.abort(), 120000)
    try {
      signal.throwIfAborted()
      if (!matches(job)) throw new Error('目标资料库已切换。')
      let intent = task.intent ?? (await journal({ kind: 'create', generation: job.generation, taskId: job.id, url: task.url, fileName: job.fileName })).intent!
      const call = async (command: DownloadJournalOperation) => journal({ ...command, generation: job.generation })
      // Revalidate the reviewed revision before any network or import work.
      const checkpoint = await call({ kind: 'read', taskId: job.id, revision: intent.revision })
      if (!intent.content_sha256) {
        job.state = 'downloading'
        const network = createResumableImageTransfer(task.url, deps.fetch, {
          load: async () => ({ bytes: checkpoint.bytes!, etag: intent.identity_encoding ? intent.strong_etag : null, total: intent.total_bytes }),
          reset: async (etag, total) => {
            signal.throwIfAborted()
            intent = (await call({ kind: 'reset', taskId: job.id, revision: intent.revision, etag, total })).intent!
            await call({ kind: 'cleanup', taskId: job.id, revision: intent.revision })
          },
          append: async bytes => {
            signal.throwIfAborted()
            intent = (await call({ kind: 'append', taskId: job.id, revision: intent.revision, epoch: intent.transfer_epoch, offset: intent.committed_bytes, bytes })).intent!
            job.checkpointBytes = intent.committed_bytes
          }
        })
        await network.read(signal, (n, total) => { job.receivedBytes = n; job.totalBytes = total })
        signal.throwIfAborted()
        intent = (await call({ kind: 'downloaded', taskId: job.id, revision: intent.revision })).intent!
      }
      job.recovery = 'local'; job.receivedBytes = intent.committed_bytes; job.totalBytes = intent.total_bytes
      signal.throwIfAborted()
      job.state = 'importing'; job.recovery = 'local'
      const result = await call({ kind: 'import', taskId: job.id, revision: intent.revision })
      job.assetId = result.assetId; job.state = 'completed'; job.error = undefined; job.restored = false
      try { deps.onImported(structuredClone(job)) } catch { /* Notification cannot undo import. */ }
      // Completed bytes can be released only by their trusted journal references.
      job.retainedBytes = (await journal({ kind: 'cleanup', generation: job.generation, taskId: job.id, revision: result.intent!.revision })).retainedBytes
    } catch (error) {
      if (job.state !== 'completed') {
        job.state = job.recovery === 'local' ? 'recovery-required' : signal.aborted ? 'cancelled' : 'failed'
        job.error = error instanceof Error && error.message.startsWith('下载恢复空间已满') ? error.message : job.recovery === 'local' ? '入库尚未完成，可重新检查本地文件并恢复入库。' : '下载已停止。已提交检查点保留在当前库，重新确认后可恢复。'
      }
    } finally {
      clearTimeout(timer)
      try { deps.history.saveTask({ id: `managed-${job.id}`, asset_title: job.fileName, source_site_id: 'web-download', source_site_name: 'Web Capture', download_url: task.url, save_path: '', status: job.state === 'completed' ? 'completed' : 'failed', progress: job.state === 'completed' ? 100 : 0, retry_count: task.retryCount, capture_method: 'web-download', error_message: job.error }) } catch {}
    }
  }
  let discovery: Promise<void> | undefined
  async function discover() {
    if (!deps.host.downloadJournal) return
    if (discovery) return discovery
    discovery = (async () => {
      const epoch = authorityEpoch
      const scope = deps.host.inspect()
      if (scope.state !== 'ready' || !scope.generation || !scope.identity) return
      const saved = await journal({ kind: 'list', generation: scope.generation })
      if (epoch !== authorityEpoch || !matches({ libraryIdentity: scope.identity, generation: scope.generation })) return
      for (const intent of saved.intents ?? []) {
        const old = tasks.get(intent.task_id)
        if (old && matches(old.value)) continue
        const local = !!intent.content_sha256
        const value: ManagedDownloadJob = { id: intent.task_id, fileName: intent.file_name, origin: new URL(intent.request_url).origin, libraryIdentity: scope.identity, generation: scope.generation, persistence: 'library', abandoned: intent.error_code === 'ABANDONED', retainedBytes: intent.error_code === 'ABANDONED' || intent.phase === 'completed' ? (await journal({ kind: 'retention', generation: scope.generation, taskId: intent.task_id })).retainedBytes : undefined, restored: true, recovery: local ? 'local' : 'network', checkpointBytes: intent.committed_bytes, receivedBytes: intent.committed_bytes, totalBytes: intent.total_bytes, state: intent.phase === 'completed' ? 'completed' : intent.error_code === 'ABANDONED' ? 'cancelled' : local ? 'recovery-required' : 'failed' }
        tasks.set(value.id, { value, url: intent.request_url, abort: new AbortController(), transfer: createResumableImageTransfer(intent.request_url, deps.fetch), running: false, retryCount: 0, retainedAt: 0, intent })
      }
    })().finally(() => { discovery = undefined })
    return discovery
  }
  async function transfer(task: Task, recovering: boolean) {
    const job = task.value; const abort = task.abort; job.state = recovering ? 'importing' : 'downloading'; job.error = undefined
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; abort.abort() }, 120000)
    try {
      let result: { assetId: string }
      if (recovering) {
        result = await deps.host.recoverDownloadedImage!({ requestId: job.id, generation: job.generation, fileName: job.fileName, sourceUrl: task.url })
      } else {
        const bytes = await task.transfer.read(abort.signal, (received, total) => { job.receivedBytes = received; job.totalBytes = total })
        if (timedOut) throw new Error('DOWNLOAD_TIMEOUT')
        if (abort.signal.aborted || !matches(job)) { job.state = 'cancelled'; return }
        job.state = 'importing'
        result = await deps.host.importDownloadedImage({ requestId: job.id, generation: job.generation, fileName: job.fileName, sourceUrl: task.url, bytes })
      }
      job.assetId = result.assetId; job.state = 'completed'
      try { deps.onImported(structuredClone(job)) } catch { /* Already imported; notification cannot undo this. */ }
    } catch (error) {
      const recovery = recovering || error && typeof error === 'object' && 'code' in error && error.code === 'library-recovery-required'
      job.state = recovery ? 'recovery-required' : abort.signal.aborted && !timedOut ? 'cancelled' : 'failed'
      if (recovery || !matches(job)) task.transfer.discard()
      job.error = recovery ? '入库中断，已保留文件与记录。可检查并恢复入库；不匹配的文件会继续保留，不会重新下载。' : job.state === 'failed' ? task.transfer.retainedByteLength() > 0 ? '下载中断，已保留本会话的部分数据。重试时会校验来源版本并继续。' : '下载或入库失败。重试将重新下载；请检查直连地址、格式、大小与目标库状态。' : undefined
    }
    finally {
      clearTimeout(timer)
      try { deps.history.saveTask({ id: `managed-${job.id}`, asset_title: job.fileName, source_site_id: 'web-download', source_site_name: 'Web Capture', download_url: task.url, save_path: '', status: job.state === 'completed' ? 'completed' : 'failed', progress: job.state === 'completed' ? 100 : 0, retry_count: task.retryCount, capture_method: 'web-download', error_message: job.error }) } catch { /* A history failure must not falsify the actual import outcome. */ }
    }
  }
  return {
    prepare, run, discover,
    list: () => [...tasks.values()].filter(task => task.value.persistence !== 'library' || matches(task.value)).map(task => structuredClone(task.value)),
    cancel(id: string) { const task = tasks.get(id); if (task?.value.state === 'importing') throw new Error('正在完成入库，完成后可以移入回收站。'); if (!task || !task.running || !['queued', 'downloading'].includes(task.value.state)) throw new Error('当前任务不在下载中。'); task.abort.abort(); return structuredClone(task.value) },
    retry(id: string) {
      const task = tasks.get(id)
      if (!task) throw new Error('找不到本会话任务，请重新准备下载。')
      if (!matches(task.value)) throw new Error('目标资料库已切换或关闭，请重新确认下载目标。')
      if (task.value.persistence === 'library') throw new Error('请重新确认持久任务的恢复操作。')
      const recovery = task.value.state === 'recovery-required'
      if (recovery && !deps.host.recoverDownloadedImage) throw new Error('当前无法恢复此入库任务。')
      if (task.running || !['failed', 'cancelled', 'recovery-required'].includes(task.value.state)) throw new Error('当前任务不能重试。')
      if (active >= 3) throw new Error('最多同时执行三个下载，请稍后重试。')
      task.abort = new AbortController(); task.retryCount++; start(task, recovery); return structuredClone(task.value)
    },
    async drain() { draining = true; this.invalidate(); try { await Promise.allSettled([...tasks.values()].map(task => task.completion)) } finally { draining = false } },
    invalidate() { authorityEpoch++; plans.clear(); for (const task of tasks.values()) { if (task.value.state !== 'importing') task.abort.abort(); task.transfer.discard() } }
  }
}
