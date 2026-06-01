/**
 * 📥 共享下载管理数据模型定义 (Shared Download Types)
 */

export interface DownloadTask {
  id: string
  asset_title: string
  source_site_id: string
  source_site_name?: string | null
  source_page_url?: string | null
  download_url: string
  save_path: string
  status: 'waiting' | 'downloading' | 'completed' | 'failed' | string
  progress?: number                      // 0 到 100
  error_message?: string | null
  retry_count?: number
  browser_page_title?: string | null
  capture_method?: string | null
  created_at: string
  updated_at: string
}
