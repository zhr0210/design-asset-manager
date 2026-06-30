import type { PlatformAiBranch } from '../shared/types/platform-ai-branch-status.types'
import type { PlatformAiBranchStatusResponse } from '../shared/types/platform-ai-branch-status.types'
import type { PlatformAiWorkerProbeDiagnosticsInput } from '../shared/types/platform-ai-runtime.types'
import type { AiRuntimeState } from '../shared/types/ai-runtime.types'
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
import {
  getCurrentPlatformAiBranchRuntime,
  resolvePlatformAiBranch
} from '../shared/workflows/ai-runtime-status.workflow'

export interface PlatformAiCapabilitiesResponse {
  offline: boolean
  capabilities: PlatformAiWorkerProbeDiagnosticsInput | null
  error?: string
}

export interface PlatformAiRuntimeAdapterApi {
  getMacOSCapabilities?: () => Promise<AiRuntimeIpcResponse<AiRuntimeMacOSCapabilitiesResponse>>
  getWindowsCapabilities?: () => Promise<AiRuntimeIpcResponse<AiRuntimeWindowsCapabilitiesResponse>>
  getMacOSAiBranchStatus?: () => Promise<AiRuntimeIpcResponse<PlatformAiBranchStatusResponse>>
  getWindowsAiBranchStatus?: () => Promise<AiRuntimeIpcResponse<PlatformAiBranchStatusResponse>>
  getPythonMpsStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonMpsStatusResponse>>
  getPythonCudaStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCudaStatusResponse>>
  probePythonMpsRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonMpsExecutionProbeResponse>>
  probePythonCudaRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCudaExecutionProbeResponse>>
}

export interface PlatformAiRuntimeRequests {
  getCapabilities?: () => Promise<AiRuntimeIpcResponse<PlatformAiCapabilitiesResponse>>
  getBranchStatus?: () => Promise<AiRuntimeIpcResponse<PlatformAiBranchStatusResponse>>
  getPythonStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonCompatibilityStatusResponseBase>>
  probePythonRuntime?: () => Promise<AiRuntimeIpcResponse<AiRuntimePythonExecutionProbeResponseBase>>
}

interface PlatformAiRuntimeRequestMethods {
  capabilities: 'getMacOSCapabilities' | 'getWindowsCapabilities'
  branchStatus: 'getMacOSAiBranchStatus' | 'getWindowsAiBranchStatus'
  pythonStatus: 'getPythonMpsStatus' | 'getPythonCudaStatus'
  pythonRuntimeProbe: 'probePythonMpsRuntime' | 'probePythonCudaRuntime'
}

const PLATFORM_AI_RUNTIME_REQUEST_METHODS: Record<PlatformAiBranch, PlatformAiRuntimeRequestMethods> = {
  macos: {
    capabilities: 'getMacOSCapabilities',
    branchStatus: 'getMacOSAiBranchStatus',
    pythonStatus: 'getPythonMpsStatus',
    pythonRuntimeProbe: 'probePythonMpsRuntime'
  },
  windows: {
    capabilities: 'getWindowsCapabilities',
    branchStatus: 'getWindowsAiBranchStatus',
    pythonStatus: 'getPythonCudaStatus',
    pythonRuntimeProbe: 'probePythonCudaRuntime'
  }
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
  const methods = PLATFORM_AI_RUNTIME_REQUEST_METHODS[platformBranch]

  return {
    getCapabilities: api[methods.capabilities],
    getBranchStatus: api[methods.branchStatus],
    getPythonStatus: api[methods.pythonStatus],
    probePythonRuntime: api[methods.pythonRuntimeProbe]
  }
}

export interface CurrentPlatformAiRuntimeRequestSelection {
  platformBranch: PlatformAiBranch
  requests: PlatformAiRuntimeRequests
}

interface RequiredCurrentPlatformAiRuntimeRequestSelection {
  platformBranch: PlatformAiBranch
  requests: Required<PlatformAiRuntimeRequests>
}

export function selectCurrentPlatformAiRuntimeRequests(
  api: Required<PlatformAiRuntimeAdapterApi>,
  runtimes: AiRuntimeState[]
): RequiredCurrentPlatformAiRuntimeRequestSelection | null
export function selectCurrentPlatformAiRuntimeRequests(
  api: PlatformAiRuntimeAdapterApi,
  runtimes: AiRuntimeState[]
): CurrentPlatformAiRuntimeRequestSelection | null
export function selectCurrentPlatformAiRuntimeRequests(
  api: PlatformAiRuntimeAdapterApi,
  runtimes: AiRuntimeState[]
): CurrentPlatformAiRuntimeRequestSelection | null {
  const currentBranch = getCurrentPlatformAiBranchRuntime(runtimes)
  if (!currentBranch) return null

  const platformBranch = resolvePlatformAiBranch(currentBranch)
  return {
    platformBranch,
    requests: selectPlatformAiRuntimeRequests(api, platformBranch)
  }
}
