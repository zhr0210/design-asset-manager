import type { PromptReverseBackendMode } from '../../../shared/types/ai-backend.types'
import type { PromptVlmModel } from '../../../shared/types/ai-model.types'
import type { GpuStatus } from '../../../shared/types/ai-worker.types'
import type { LlamaInstallStatus } from '../../../shared/types/llama-runtime.types'
import type { WorkerModelStatusSnapshot } from '../../../shared/types/model-artifact-readiness.types'
import type { PlatformAiBranch, PlatformAiBranchStatusResponse } from '../../../shared/types/platform-ai-branch-status.types'
import type { PlatformAiWorkerProbeWithRuntimeVersions } from '../../../shared/types/platform-ai-runtime.types'
import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeIpcResponse,
  AiRuntimeListRuntimesResponse
} from '../../../shared/contracts/ai-runtime.contract'
import {
  DEFAULT_PLATFORM_AI_BRANCH,
  type AiRuntimeCompatibilityDisplay,
  type PlatformAiWorkerProbeDiagnosticsDisplay,
  projectPlatformAiWorkerProbeDiagnosticsSelection,
  projectPlatformPythonRuntimeCompatibilityDisplay
} from '../../../shared/workflows/ai-runtime-status.workflow'
import {
  selectCurrentPlatformAiRuntimeRequests,
  type PlatformAiRuntimeAdapterApi
} from '../../platform-ai-runtime.adapter'
import { normalizeAiConsoleGpuStatus } from './ai-console-gpu-status'

export interface AiConsoleStatusRefreshInput {
  backendMode: PromptReverseBackendMode
  llamaBaseUrl?: string
}

export interface AiConsoleWorkerStatus extends WorkerModelStatusSnapshot {
  offline?: boolean
  error?: string
  gpu_status?: unknown
  queue_stats?: {
    queued?: number
    running?: number
    completed?: number
    failed?: number
  }
}

export interface AiConsoleLocalGgufModel {
  id: string
  name: string
  filename: string
  modelPath: string
  isDownloaded?: boolean
  isDownloading?: boolean
  quantization?: string
  parameterSize?: string
  recommendedMinVramGB?: number
  runtime?: string
  stability?: string
  officialReleaseDate?: string
  mmprojFilename?: string
}

export interface AiConsoleStatusBridgeUnavailableSnapshot {
  kind: 'bridge-unavailable'
  aiStatus: {
    offline: true
    error: string
  }
  gpuStatus: null
  modelsList: []
}

export interface AiConsoleStatusUpdatedSnapshot {
  kind: 'updated'
  aiStatus: AiConsoleWorkerStatus | null | undefined
  gpuStatus: GpuStatus | null | undefined
  modelsList: PromptVlmModel[]
  localGgufModels: AiConsoleLocalGgufModel[]
  llamaStatus: LlamaInstallStatus | null | undefined
  llamaRunning: boolean
  platformWorkerProbe: PlatformAiWorkerProbeWithRuntimeVersions | null
  platformProbeDisplay: PlatformAiWorkerProbeDiagnosticsDisplay
  platformWorkerProbeBranch: PlatformAiBranch
  platformBranchStatus: PlatformAiBranchStatusResponse | null
  platformPythonCompatibilityDisplay: AiRuntimeCompatibilityDisplay
  clipSiglipOnnxStatus: AiRuntimeClipSiglipOnnxStatusResponse | null
  gpuSample: {
    usagePercent: number
    freeMb: number
  }
}

export interface AiConsoleStatusUnchangedSnapshot {
  kind: 'unchanged'
  error: {
    message: string
  }
}

export type AiConsoleStatusSnapshot =
  | AiConsoleStatusBridgeUnavailableSnapshot
  | AiConsoleStatusUpdatedSnapshot
  | AiConsoleStatusUnchangedSnapshot

export type AiConsolePlatformStatusAdapter = Omit<
  PlatformAiRuntimeAdapterApi,
  'probePythonMpsRuntime' | 'probePythonCudaRuntime'
>

export interface AiConsoleStatusAdapter extends AiConsolePlatformStatusAdapter {
  available: boolean
  getRuntimeList?: () => Promise<AiRuntimeIpcResponse<AiRuntimeListRuntimesResponse>>
  getWorkerStatus?: () => Promise<AiConsoleWorkerStatus | null | undefined>
  getGpuStatus?: () => Promise<GpuStatus | null | undefined>
  listNativeModels?: () => Promise<PromptVlmModel[] | null | undefined>
  getLlamaStatus?: () => Promise<LlamaInstallStatus | null | undefined>
  listLocalGgufModels?: () => Promise<AiConsoleLocalGgufModel[] | null | undefined>
  getClipSiglipOnnxStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimeClipSiglipOnnxStatusResponse>>
  checkLlamaHealth?: (baseUrl?: string) => Promise<{ running?: boolean } | null | undefined>
}

export interface AiConsoleStatusModule {
  refresh(input: AiConsoleStatusRefreshInput): Promise<AiConsoleStatusSnapshot>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createAiConsoleStatusModule(adapter: AiConsoleStatusAdapter): AiConsoleStatusModule {
  return {
    async refresh(input) {
      if (!adapter.available) {
        return {
          kind: 'bridge-unavailable',
          aiStatus: {
            offline: true,
            error: 'Electron bridge is unavailable in browser preview.'
          },
          gpuStatus: null,
          modelsList: []
        }
      }

      try {
        const runtimeListResponse = adapter.getRuntimeList
          ? await adapter.getRuntimeList().catch(() => null)
          : null
        const currentRuntimes = runtimeListResponse?.success && Array.isArray(runtimeListResponse.data?.runtimes)
          ? runtimeListResponse.data.runtimes
          : []
        const currentPlatformSelection = selectCurrentPlatformAiRuntimeRequests(adapter, currentRuntimes)

        const [status, gpu, models, llama, ggufModels, platformProbeResponse, platformBranchStatusResponse, clipSiglipStatus] = await Promise.all([
          adapter.getWorkerStatus?.().catch((error: unknown): AiConsoleWorkerStatus => ({
            offline: true,
            error: String(error)
          })),
          adapter.getGpuStatus?.().catch(() => null),
          adapter.listNativeModels?.().catch(() => []),
          adapter.getLlamaStatus?.().catch(() => null),
          adapter.listLocalGgufModels?.().catch(() => []),
          currentPlatformSelection?.requests.getCapabilities
            ? currentPlatformSelection.requests.getCapabilities().catch(() => null)
            : Promise.resolve(null),
          currentPlatformSelection?.requests.getBranchStatus
            ? currentPlatformSelection.requests.getBranchStatus().catch(() => null)
            : Promise.resolve(null),
          adapter.getClipSiglipOnnxStatus
            ? adapter.getClipSiglipOnnxStatus().catch(() => null)
            : Promise.resolve(null)
        ])

        const branchStatusData = platformBranchStatusResponse?.data
        const projectedBranchStatus = platformBranchStatusResponse?.success
          && branchStatusData
          && branchStatusData.platformBranch === currentPlatformSelection?.platformBranch
          ? branchStatusData
          : null
        const probeSelection = projectPlatformAiWorkerProbeDiagnosticsSelection({
          platformBranch: currentPlatformSelection?.platformBranch ?? projectedBranchStatus?.platformBranch,
          probe: platformProbeResponse?.success ? platformProbeResponse.data?.capabilities : null
        })
        const getPlatformPythonStatus = currentPlatformSelection?.requests.getPythonStatus
        const platformPythonStatus = status?.offline === false && getPlatformPythonStatus
          ? await getPlatformPythonStatus().catch(() => null)
          : null
        const platformPythonCompatibilityDisplay = status?.offline === false && getPlatformPythonStatus
          ? projectPlatformPythonRuntimeCompatibilityDisplay(
              probeSelection.platformBranch,
              platformPythonStatus?.success ? platformPythonStatus.data : null,
              platformPythonStatus?.success ? platformPythonStatus.data?.error : platformPythonStatus?.error
            )
          : projectPlatformPythonRuntimeCompatibilityDisplay(probeSelection.platformBranch, null)

        let nextLlamaStatus = llama
        let llamaRunning: boolean
        if (input.backendMode === 'llama-openai' && typeof llama?.serverRunning !== 'boolean' && !llama?.serverPid) {
          const health = adapter.checkLlamaHealth
            ? await adapter.checkLlamaHealth(input.llamaBaseUrl).catch(() => ({ running: false }))
            : null
          llamaRunning = Boolean(health?.running)
          if (llamaRunning && llama) {
            nextLlamaStatus = {
              ...llama,
              serverPid: 1,
              phase: 'running'
            } as unknown as LlamaInstallStatus
          }
        } else {
          llamaRunning = Boolean(llama?.serverRunning || llama?.serverPid)
        }

        const workerGpu = normalizeAiConsoleGpuStatus(status?.gpu_status)
        const sample = workerGpu.available ? workerGpu : normalizeAiConsoleGpuStatus(gpu)

        return {
          kind: 'updated',
          aiStatus: status,
          gpuStatus: gpu,
          modelsList: Array.isArray(models) ? models : [],
          localGgufModels: Array.isArray(ggufModels) ? ggufModels : [],
          llamaStatus: nextLlamaStatus,
          llamaRunning,
          platformWorkerProbe: probeSelection.probe,
          platformProbeDisplay: probeSelection.display,
          platformWorkerProbeBranch: probeSelection.platformBranch ?? DEFAULT_PLATFORM_AI_BRANCH,
          platformBranchStatus: projectedBranchStatus,
          platformPythonCompatibilityDisplay,
          clipSiglipOnnxStatus: clipSiglipStatus?.success && clipSiglipStatus.data
            ? clipSiglipStatus.data
            : null,
          gpuSample: {
            usagePercent: sample.usagePercent,
            freeMb: sample.freeMb
          }
        }
      } catch (error) {
        return {
          kind: 'unchanged',
          error: { message: errorMessage(error) }
        }
      }
    }
  }
}
