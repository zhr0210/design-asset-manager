/**
 * 🤖 共享 AI 任务数据模型定义 (Shared AI Task Types)
 */

export interface AiTagTask {
  id: string
  asset_id: string
  file_path: string
  status: 'queued' | 'running' | 'completed' | 'failed' | string
  priority?: number
  batch_id?: string | null
  model_name?: string | null
  retry_count?: number
  error_message?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  synced_at?: string | null
  sync_status?: 'pending' | 'completed' | 'failed' | string
}

export interface AiPromptTask {
  id: string
  asset_id: string
  file_path: string
  status: 'queued' | 'running' | 'completed' | 'failed' | string
  model_name?: string | null
  result_prompt?: string | null          // 绘画反推 prompt 结果
  result_caption?: string | null         // 高精字幕 caption 结果
  error_message?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  synced_at?: string | null
  sync_status?: 'pending' | 'completed' | 'failed' | string
}

export interface AiAnalysisTask {
  id: string
  asset_id: string
  file_path: string
  status: 'queued' | 'running' | 'completed' | 'failed' | string
  model_name?: string | null
  result_json?: string | null            // Qwen-VL Senior Analysis 结构化 JSON 字符串
  error_message?: string | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  synced_at?: string | null
  sync_status?: 'pending' | 'completed' | 'failed' | string
}

export interface ModelVramStatus {
  model_name: string
  is_loaded: boolean
  backend: string
  keepalive_remaining?: number | null
  vram_footprint_mb?: number
  active_tasks_count?: number
}
