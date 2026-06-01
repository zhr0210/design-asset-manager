import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../types/ai-runtime.types'

export const CHANNEL_AI_RUNTIME_LIST_RUNTIMES = 'aiRuntime:listRuntimes'
export const CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE = 'aiRuntime:getRuntimeState'
export const CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME = 'aiRuntime:getActiveRuntime'
export const CHANNEL_AI_RUNTIME_SELECT_ACTIVE_RUNTIME = 'aiRuntime:selectActiveRuntime'
export const CHANNEL_AI_RUNTIME_START_RUNTIME = 'aiRuntime:startRuntime'
export const CHANNEL_AI_RUNTIME_STOP_RUNTIME = 'aiRuntime:stopRuntime'
export const CHANNEL_AI_RUNTIME_RESTART_RUNTIME = 'aiRuntime:restartRuntime'
export const CHANNEL_AI_RUNTIME_HEALTH_CHECK = 'aiRuntime:healthCheck'
export const CHANNEL_AI_RUNTIME_HEALTH_CHECK_ALL = 'aiRuntime:healthCheckAll'
export const CHANNEL_AI_RUNTIME_UPDATE_RUNTIME_CONFIG = 'aiRuntime:updateRuntimeConfig'

export interface AiRuntimeListRuntimesResponse {
  runtimes: AiRuntimeState[]
}

export interface AiRuntimeGetStateRequest {
  runtimeId: string
}

export interface AiRuntimeSelectActiveRequest {
  runtimeId: string
}

export interface AiRuntimeOperationRequest {
  runtimeId: string
}

export interface AiRuntimeHealthCheckRequest {
  runtimeId: string
}

export interface AiRuntimeUpdateConfigRequest {
  runtimeId: string
  config: Partial<AiRuntimeConfig>
}

export interface AiRuntimeIpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type AiRuntimeStateResponse = AiRuntimeState | null
export type AiRuntimeActiveRuntimeResponse = AiRuntimeState | null
export type AiRuntimeOperationResponse = AiRuntimeOperationResult
export type AiRuntimeHealthCheckResponse = AiRuntimeHealthResult
export type AiRuntimeHealthCheckAllResponse = AiRuntimeHealthResult[]
