import { getDatabase } from '../db'

export interface DbDownloadTask {
  id: string
  asset_title: string
  source_site_id: string
  source_site_name?: string
  source_page_url?: string
  download_url: string
  save_path: string
  status: string
  progress: number
  error_message?: string
  retry_count: number
  browser_page_title?: string
  capture_method?: string
  created_at: string
  updated_at: string
}

export class DownloadService {
  private getDb() {
    return getDatabase()
  }

  public listTasks(): DbDownloadTask[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM download_tasks ORDER BY created_at DESC').all() as DbDownloadTask[]
  }

  public saveTask(task: Omit<DbDownloadTask, 'created_at' | 'updated_at'>): DbDownloadTask {
    const db = this.getDb()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM download_tasks WHERE id = ?').get(task.id) as DbDownloadTask | undefined

    if (existing) {
      db.prepare(`
        UPDATE download_tasks
        SET asset_title = ?, source_site_id = ?, source_site_name = ?, source_page_url = ?, download_url = ?, save_path = ?,
            status = ?, progress = ?, error_message = ?, retry_count = ?, browser_page_title = ?, capture_method = ?, updated_at = ?
        WHERE id = ?
      `).run(
        task.asset_title,
        task.source_site_id,
        task.source_site_name || null,
        task.source_page_url || null,
        task.download_url,
        task.save_path,
        task.status,
        task.progress,
        task.error_message || null,
        task.retry_count,
        task.browser_page_title || null,
        task.capture_method || 'search',
        now,
        task.id
      )
      return {
        ...existing,
        ...task,
        updated_at: now
      }
    } else {
      db.prepare(`
        INSERT INTO download_tasks (id, asset_title, source_site_id, source_site_name, source_page_url, download_url, save_path, status, progress, error_message, retry_count, browser_page_title, capture_method, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        task.id,
        task.asset_title,
        task.source_site_id,
        task.source_site_name || null,
        task.source_page_url || null,
        task.download_url,
        task.save_path,
        task.status,
        task.progress,
        task.error_message || null,
        task.retry_count,
        task.browser_page_title || null,
        task.capture_method || 'search',
        now,
        now
      )
      return {
        ...task,
        created_at: now,
        updated_at: now
      }
    }
  }

  public clearCompleted(): void {
    const db = this.getDb()
    db.prepare("DELETE FROM download_tasks WHERE status = 'completed'").run()
  }
}
