import type {
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe,
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeLaneBase
} from './platform-ai-runtime.types'

export type WindowsAiRuntimeLaneId = 'python-cuda' | 'onnx-runtime' | 'llama'

export interface WindowsAiRuntimeLane extends PlatformAiRuntimeLaneBase<WindowsAiRuntimeLaneId> {}

export interface WindowsAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'windows-ai-branch', WindowsAiRuntimeLane> {}

export interface WindowsAiWorkerProbeResult {
  platform: string
  machine: string
  isMacOS: boolean
  isAppleSilicon: boolean
  phase: 'worker-probes'
  torch: {
    available: boolean
    version: string | null
    cudaBuilt: boolean
    cudaAvailable: boolean
    cpuFallback: boolean
    error: string | null
  }
  onnxruntime: {
    available: boolean
    version: string | null
    providers: string[]
    cudaAvailable: boolean
    dmlAvailable: boolean
    cpuAvailable: boolean
    error: string | null
  }
  clipSiglipOnnx: AiWorkerCapabilityProbe
  lanes: AiWorkerLaneProbe[]
}
