import type {
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeLaneBase,
  PlatformAiWorkerProbeResultBase
} from './platform-ai-runtime.types'

export type MacOSAiRuntimeLaneId = 'python-mps' | 'onnx-runtime' | 'llama'
export type {
  AiCapabilityStatus,
  AiRuntimeCapability,
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe,
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeBranchPhase,
  PlatformAiRuntimeLaneBase,
  PlatformAiWorkerProbeResultBase
} from './platform-ai-runtime.types'

export interface MacOSAiRuntimeLane extends PlatformAiRuntimeLaneBase<MacOSAiRuntimeLaneId> {}

export interface MacOSAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'macos-ai-branch', MacOSAiRuntimeLane> {}

export interface MacOSAiWorkerProbeResult extends PlatformAiWorkerProbeResultBase {
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
}
