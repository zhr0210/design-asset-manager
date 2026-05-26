import { ipcMain } from 'electron'
import { DownloadService } from '../services/download.service'

export function registerDownloadIpc() {
  const service = new DownloadService()

  ipcMain.handle('download:list', async () => {
    try {
      return service.listTasks()
    } catch (err) {
      console.error('[IPC] download:list error:', err)
      throw err
    }
  })

  ipcMain.handle('download:save', async (_, task: any) => {
    try {
      const saved = service.saveTask(task)
      return { success: true, task: saved }
    } catch (err) {
      console.error('[IPC] download:save error:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('download:clear', async () => {
    try {
      service.clearCompleted()
      return { success: true }
    } catch (err) {
      console.error('[IPC] download:clear error:', err)
      return { success: false, error: String(err) }
    }
  })
}
