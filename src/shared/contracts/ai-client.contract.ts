import { ModelVramStatus } from '../types/ai-task.types'

/**
 * 🤖 AI 智能推理及后台批处理调度通信契约 (Shared AI IPC Contracts)
 */

export const CHANNEL_AI_ENQUEUE_TAG = 'ai:enqueue-tag'
export const CHANNEL_AI_PROCESS_BATCH = 'ai:process-batch'
export const CHANNEL_AI_MODEL_STATUS = 'ai:model-status'
export const CHANNEL_AI_MODEL_UNLOAD = 'ai:model-unload'
export const CHANNEL_AI_PROMPT_GENERATE = 'ai:prompt-generate'
export const CHANNEL_AI_ANALYSIS_GENERATE = 'ai:analysis-generate'
export const CHANNEL_AI_ROUTING_PREVIEW = 'ai:routing-preview'

// IPC 异步反向通知信道 (心跳与 SQLite 同步通知)
export const EVENT_AI_TASK_SYNCED = 'ai:task-synced'

// DTOs
export interface EnqueueTagRequest {
  assetId: string
  filePath: string
  priority?: number
  modelsToRun?: string[]
}

export interface EnqueueTagResponse {
  success: boolean
  taskId?: string
  error?: string
}

export interface ModelStatusResponse {
  success: boolean
  statuses?: ModelVramStatus[]
  error?: string
}

export interface UnloadModelResponse {
  success: boolean
  error?: string
}

export interface PromptGenerateRequest {
  assetId: string
  filePath: string
}

export interface PromptGenerateResponse {
  success: boolean
  taskId?: string
  prompt?: string
  caption?: string
  error?: string
}

export interface AnalysisGenerateRequest {
  assetId: string
  filePath: string
}

export interface AnalysisGenerateResponse {
  success: boolean
  taskId?: string
  analysisJson?: string
  error?: string
}

export interface RoutingPreviewRequest {
  filePath: string
}

export interface RoutingPreviewResponse {
  success: boolean
  category?: string
  confidence?: number
  scores?: Record<string, number>
  error?: string
}
