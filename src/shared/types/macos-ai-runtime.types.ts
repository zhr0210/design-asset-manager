import type {
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe,
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeLaneBase
} from './platform-ai-runtime.types'

export type MacOSAiRuntimeLaneId = 'python-mps' | 'onnx-runtime' | 'llama'
export type {
  AiCapabilityStatus,
  AiRuntimeCapability,
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe,
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeBranchPhase,
  PlatformAiRuntimeLaneBase
} from './platform-ai-runtime.types'

export interface MacOSAiRuntimeLane extends PlatformAiRuntimeLaneBase<MacOSAiRuntimeLaneId> {}

export interface MacOSAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'macos-ai-branch', MacOSAiRuntimeLane> {}

export interface MacOSAiWorkerProbeResult {
  platform: string
  machine: string
  isMacOS: boolean
  isAppleSilicon: boolean
  phase: 'worker-probes'
  torch: {
    available: boolean
    version: string | null
    mpsBuilt: boolean
    mpsAvailable: boolean
    cpuFallback: boolean
    error: string | null
  }
  onnxruntime: {
    available: boolean
    version: string | null
    providers: string[]
    coremlAvailable: boolean
    cpuAvailable: boolean
    error: string | null
  }
  clipSiglipOnnx: AiWorkerCapabilityProbe
  lanes: AiWorkerLaneProbe[]
}
