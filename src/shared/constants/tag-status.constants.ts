/**
 * 🏷️ 标签与 AI 任务状态共享常量、集合与联合类型 (Shared Tag & Task Status Constants & Unions)
 */

// 标签确认状态 (Tag Suggestion and AssetTag status)
export const TAG_STATUS_PENDING = 'pending'
export const TAG_STATUS_CONFIRMED = 'confirmed'
export const TAG_STATUS_REJECTED = 'rejected'

export const TAG_STATUSES = [
  TAG_STATUS_PENDING,
  TAG_STATUS_CONFIRMED,
  TAG_STATUS_REJECTED
] as const

export type TagStatus = typeof TAG_STATUSES[number]

// AI 调度任务状态 (AI tag tasks status)
export const AI_TASK_STATUS_QUEUED = 'queued'
export const AI_TASK_STATUS_RUNNING = 'running'
export const AI_TASK_STATUS_COMPLETED = 'completed'
export const AI_TASK_STATUS_FAILED = 'failed'

export const AI_TASK_STATUSES = [
  AI_TASK_STATUS_QUEUED,
  AI_TASK_STATUS_RUNNING,
  AI_TASK_STATUS_COMPLETED,
  AI_TASK_STATUS_FAILED
] as const

export type AiTaskStatus = typeof AI_TASK_STATUSES[number]
