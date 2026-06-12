import type { PlatformAiBranch } from '../shared/types/platform-ai-branch-status.types'
import type { PlatformAiWorkerProbeDiagnosticsInput } from '../shared/types/platform-ai-runtime.types'
import type {
  AiRuntimeIpcResponse,
  AiRuntimeMacOSCapabilitiesResponse,
  AiRuntimePythonCompatibilityStatusResponseBase,
  AiRuntimePythonCudaExecutionProbeResponse,
  AiRuntimePythonCudaStatusResponse,
  AiRuntimePythonExecutionProbeResponseBase,
  AiRuntimePythonMpsExecutionProbeResponse,
  AiRuntimePythonMpsStatusResponse,
  AiRuntimeWindowsCapabilitiesResponse
} from '../shared/contracts/ai-runtime.contract'

export interface PlatformAiCapabilitiesResponse {
  offline: boolean
  capabilities: PlatformAiWorkerProbeDiagnosticsInput | null
  error?: string
}

export interface PlatformAiRuntimeAdapterApi {
  getMacOSCapabilities?: () => Promise<AiRuntimeIpcResponse<AiRuntimeMacOSCapabilitiesResponse>>
  getWindowsCapabilities?: () => Promise<AiRuntimeIpcResponse<AiRuntimeWindowsCapabilitiesResponse>>
  getPythonMpsStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonMpsStatusResponse>>
  getPythonCudaStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCudaStatusResponse>>
  probePythonMpsRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonMpsExecutionProbeResponse>>
  probePythonCudaRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCudaExecutionProbeResponse>>
}

export interface PlatformAiRuntimeRequests {
  getCapabilities?: () => Promise<AiRuntimeIpcResponse<PlatformAiCapabilitiesResponse>>
  getPythonStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCompatibilityStatusResponseBase>>
  probePythonRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonExecutionProbeResponseBase>>
}

export function selectPlatformAiRuntimeRequests(
  api: Required<PlatformAiRuntimeAdapterApi>,
  platformBranch: PlatformAiBranch
): Required<PlatformAiRuntimeRequests>
export function selectPlatformAiRuntimeRequests(
  api: PlatformAiRuntimeAdapterApi,
  platformBranch: PlatformAiBranch
): PlatformAiRuntimeRequests
export function selectPlatformAiRuntimeRequests(
  api: PlatformAiRuntimeAdapterApi,
  platformBranch: PlatformAiBranch
): PlatformAiRuntimeRequests {
  if (platformBranch === 'windows') {
    return {
      getCapabilities: api.getWindowsCapabilities,
      getPythonStatus: api.getPythonCudaStatus,
      probePythonRuntime: api.probePythonCudaRuntime
    }
  }

  return {
    getCapabilities: api.getMacOSCapabilities,
    getPythonStatus: api.getPythonMpsStatus,
    probePythonRuntime: api.probePythonMpsRuntime
  }
}
