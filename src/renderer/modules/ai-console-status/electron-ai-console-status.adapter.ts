import type { PromptVlmModel } from '../../../shared/types/ai-model.types'
import type { GpuStatus } from '../../../shared/types/ai-worker.types'
import type { LlamaInstallStatus } from '../../../shared/types/llama-runtime.types'
import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeIpcResponse,
  AiRuntimeListRuntimesResponse
} from '../../../shared/contracts/ai-runtime.contract'
import type {
  AiConsoleLocalGgufModel,
  AiConsolePlatformStatusAdapter,
  AiConsoleStatusAdapter,
  AiConsoleWorkerStatus
} from './ai-console-status.module'

export interface AiConsoleElectronApi {
  aiModelStatus?: () => Promise<AiConsoleWorkerStatus | null | undefined>
  aiWorkerGetGpuStatus?: () => Promise<GpuStatus | null | undefined>
  aiModelList?: () => Promise<PromptVlmModel[] | null | undefined>
  llamaRuntimeGetStatus?: () => Promise<LlamaInstallStatus | null | undefined>
  llamaRuntimeListLocalModels?: () => Promise<AiConsoleLocalGgufModel[] | null | undefined>
  llamaHealthCheck?: (baseUrl?: string) => Promise<{ running?: boolean } | null | undefined>
  aiRuntime?: AiConsolePlatformStatusAdapter & {
    listRuntimes?: () => Promise<AiRuntimeIpcResponse<AiRuntimeListRuntimesResponse>>
    getClipSiglipOnnxStatus?: () => Promise<AiRuntimeIpcResponse<AiRuntimeClipSiglipOnnxStatusResponse>>
  }
}

export function createElectronAiConsoleStatusAdapter(
  electronApi?: AiConsoleElectronApi | null
): AiConsoleStatusAdapter {
  return {
    available: Boolean(electronApi),
    getRuntimeList: electronApi?.aiRuntime?.listRuntimes
      ? () => electronApi.aiRuntime!.listRuntimes!()
      : undefined,
    getWorkerStatus: electronApi?.aiModelStatus
      ? () => electronApi.aiModelStatus!()
      : undefined,
    getGpuStatus: electronApi?.aiWorkerGetGpuStatus
      ? () => electronApi.aiWorkerGetGpuStatus!()
      : undefined,
    listNativeModels: electronApi?.aiModelList
      ? () => electronApi.aiModelList!()
      : undefined,
    getLlamaStatus: electronApi?.llamaRuntimeGetStatus
      ? () => electronApi.llamaRuntimeGetStatus!()
      : undefined,
    listLocalGgufModels: electronApi?.llamaRuntimeListLocalModels
      ? () => electronApi.llamaRuntimeListLocalModels!()
      : undefined,
    checkLlamaHealth: electronApi?.llamaHealthCheck
      ? (baseUrl) => electronApi.llamaHealthCheck!(baseUrl)
      : undefined,
    getClipSiglipOnnxStatus: electronApi?.aiRuntime?.getClipSiglipOnnxStatus
      ? () => electronApi.aiRuntime!.getClipSiglipOnnxStatus!()
      : undefined,
    getMacOSCapabilities: electronApi?.aiRuntime?.getMacOSCapabilities
      ? () => electronApi.aiRuntime!.getMacOSCapabilities!()
      : undefined,
    getWindowsCapabilities: electronApi?.aiRuntime?.getWindowsCapabilities
      ? () => electronApi.aiRuntime!.getWindowsCapabilities!()
      : undefined,
    getMacOSAiBranchStatus: electronApi?.aiRuntime?.getMacOSAiBranchStatus
      ? () => electronApi.aiRuntime!.getMacOSAiBranchStatus!()
      : undefined,
    getWindowsAiBranchStatus: electronApi?.aiRuntime?.getWindowsAiBranchStatus
      ? () => electronApi.aiRuntime!.getWindowsAiBranchStatus!()
      : undefined,
    getPythonMpsStatus: electronApi?.aiRuntime?.getPythonMpsStatus
      ? () => electronApi.aiRuntime!.getPythonMpsStatus!()
      : undefined,
    getPythonCudaStatus: electronApi?.aiRuntime?.getPythonCudaStatus
      ? () => electronApi.aiRuntime!.getPythonCudaStatus!()
      : undefined
  }
}
