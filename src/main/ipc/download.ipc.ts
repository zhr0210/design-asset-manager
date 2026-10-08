import { DownloadService } from '../services/download.service'
import type Database from 'better-sqlite3'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import type { createManagedDownloads } from '../managed-download/managed-download'
import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'

export function registerDownloadIpc(database: Database.Database, handle: MainIpcHandleRegistrar, executor?: ReturnType<typeof createManagedDownloads>, isTrusted: (event: IpcMainInvokeEvent) => boolean = () => false) {
  const service = new DownloadService(database)
  for (const [channel, operation] of [
    ['download:prepare', (input: any) => executor!.prepare(input)],
    ['download:enqueue', (receipt: string) => executor!.run(receipt)],
    ['download:jobs', async () => { await executor!.discover(); return executor!.list() }],
    ['download:retry', (id: string) => executor!.retry(id)],
    ['download:cancel', (id: string) => executor!.cancel(id)]
  ] as const) handle(channel, async (event, input) => {
    try { if (!isTrusted(event)) throw new Error('没有下载权限。'); if (!executor) throw new Error('下载执行器不可用。'); return { ok: true, value: await operation(input) } }
    catch (error) { return { ok: false, error: error instanceof Error && !/https?:|[/\\]/.test(error.message) ? error.message : '下载请求未能执行。' } }
  })

  handle('download:list', async () => {
    try {
      return service.listTasks()
    } catch (err) {
      console.error('[IPC] download:list error:', err)
      throw err
    }
  })

  handle('download:save', async (_, task: any) => {
    try {
      const saved = service.saveTask(task)
      return { success: true, task: saved }
    } catch (err) {
      console.error('[IPC] download:save error:', err)
      return { success: false, error: String(err) }
    }
  })

  handle('download:clear', async () => {
    try {
      service.clearCompleted()
      return { success: true }
    } catch (err) {
      console.error('[IPC] download:clear error:', err)
      return { success: false, error: String(err) }
    }
  })
}
