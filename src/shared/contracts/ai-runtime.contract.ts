import type { AiRuntimeConfig, AiRuntimeHealthResult, AiRuntimeOperationResult, AiRuntimeState } from '../types/ai-runtime.types'
import type { MacOSAiWorkerProbeResult } from '../types/macos-ai-runtime.types'
import type { PlatformAiBranchStatusResponse } from '../types/platform-ai-branch-status.types'

export const CHANNEL_AI_RUNTIME_LIST_RUNTIMES = 'aiRuntime:listRuntimes'
export const CHANNEL_AI_RUNTIME_GET_RUNTIME_STATE = 'aiRuntime:getRuntimeState'
export const CHANNEL_AI_RUNTIME_GET_ACTIVE_RUNTIME = 'aiRuntime:getActiveRuntime'
export const CHANNEL_AI_RUNTIME_GET_MACOS_CAPABILITIES = 'aiRuntime:getMacOSCapabilities'
export const CHANNEL_AI_RUNTIME_GET_MACOS_AI_BRANCH_STATUS = 'ai-runtime:get-macos-ai-branch-status'
export const CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS = 'ai-runtime:get-windows-ai-branch-status'
export const CHANNEL_AI_RUNTIME_GET_PYTHON_MPS_STATUS = 'aiRuntime:getPythonMpsStatus'
export const CHANNEL_AI_RUNTIME_GET_CLIP_SIGLIP_ONNX_STATUS = 'aiRuntime:getClipSiglipOnnxStatus'
export const CHANNEL_AI_RUNTIME_PROBE_ONNX_MODEL_LOAD = 'aiRuntime:probeOnnxModelLoad'
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

export interface AiRuntimeMacOSCapabilitiesResponse {
  offline: boolean
  capabilities: MacOSAiWorkerProbeResult | null
  error?: string
}

export type AiRuntimePlatformAiBranchStatusResponse = PlatformAiBranchStatusResponse

export interface AiRuntimePythonMpsStatusResponse {
  success: boolean
  compatible: boolean
  runtime?: string | null
  status: 'optional' | 'planned' | 'unavailable'
  diagnostics: Record<string, unknown>
  error?: string | null
}

export interface AiRuntimeClipSiglipOnnxStatusResponse {
  success: boolean
  compatible: boolean
  runtime?: string | null
  diagnostics: Record<string, unknown>
  error?: string | null
}

export interface AiRuntimeOnnxModelLoadProbeResponse {
  success: boolean
  modelFamily: 'wd_tagger'
  status: 'loaded_real' | 'artifact_missing' | 'artifact_invalid' | 'dependency_missing' | 'load_failed' | 'unsupported'
  checkedAt: string
  providers: string[]
  inputCount: number
  outputCount: number
  errorCode?: string | null
  errorType?: string | null
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
