import type {
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeLaneBase,
  PlatformAiWorkerProbeDiagnosticsInput
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

export interface MacOSAiWorkerProbeResult extends PlatformAiWorkerProbeDiagnosticsInput {
  torch: PlatformAiWorkerProbeDiagnosticsInput['torch'] & {
    mpsBuilt: boolean
    mpsAvailable: boolean
  }
  onnxruntime: PlatformAiWorkerProbeDiagnosticsInput['onnxruntime'] & {
    coremlAvailable: boolean
  }
}
