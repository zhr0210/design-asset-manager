import type {
  CooperativeWorkerModelStatus,
  WorkerModelStatusSnapshot
} from '../types/model-artifact-readiness.types'
import type { AssetTaggingModelId } from '../workflows/asset-tagging.workflow'

export const CHANNEL_AI_ENQUEUE_TAG = 'ai:enqueue-tag'
export const CHANNEL_AI_PROCESS_BATCH = 'ai:process-batch'
export const CHANNEL_AI_MODEL_STATUS = 'ai:model-status'
export const CHANNEL_AI_MODEL_UNLOAD = 'ai:model-unload'
export const CHANNEL_AI_ROUTING_PREVIEW = 'ai:routing-preview'

export const EVENT_AI_TASK_SYNCED = 'ai:task-synced'

export interface EnqueueTagRequest {
  assetId: string
  filePath: string
  priority?: number
  modelsToRun?: AssetTaggingModelId[]
}

export interface EnqueueTagResponse {
  success: boolean
  message?: string
  task_id?: string
  status?: string
  model_name?: string
  error?: string
}

export interface ProcessBatchResponse {
  success: boolean
  message?: string
  processed_count?: number
  error?: string
}

export interface AiQueueStats {
  queued: number
  running: number
  completed: number
  failed: number
}

export interface WorkerGpuStatus {
  available?: boolean
  is_mock?: boolean
  device_name?: string
  total_vram_mb?: number
  used_vram_mb?: number
  free_vram_mb?: number
  utilization_percent?: number
  error?: string
  [key: string]: unknown
}

export interface ModelStatusResponse extends WorkerModelStatusSnapshot {
  success: boolean
  offline: boolean
  loaded_models: Record<string, unknown>
  cooperative_models: Record<string, CooperativeWorkerModelStatus>
  gpu_status: WorkerGpuStatus
  queue_stats: AiQueueStats
  error?: string
}

export interface UnloadModelResponse {
  success: boolean
  message?: string
  unloaded_models?: string[]
  error?: string
}

export interface RoutingPreviewRequest {
  filePath: string
}

export interface RoutingPreviewResponse {
  success?: boolean
  file_path?: string
  routing_result?: {
    asset_type?: string
    confidence?: number
    [key: string]: unknown
  }
  error?: string
}

export interface AiTaskSyncedEvent {
  assetId: string
}
