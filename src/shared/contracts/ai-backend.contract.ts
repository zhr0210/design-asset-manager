import type { AiBackendConfig } from '../types/ai-backend.types'

export const CHANNEL_AI_BACKEND_LIST = 'ai-backend:list'
export const CHANNEL_AI_BACKEND_SAVE = 'ai-backend:save'
export const CHANNEL_AI_BACKEND_DELETE = 'ai-backend:delete'
export const CHANNEL_AI_BACKEND_HEALTH_CHECK = 'ai-backend:health-check'
export const CHANNEL_AI_BACKEND_LIST_MODELS = 'ai-backend:list-models'

export type AiBackendSaveRequest = AiBackendConfig
export type AiBackendDeleteRequest = { id: string }
export type AiBackendActionRequest = { backendId: string; config?: AiBackendConfig }

