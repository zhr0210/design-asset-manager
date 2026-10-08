import type {
  PlatformAiBranchRuntimeMetadataBase,
  PlatformAiRuntimeLaneBase,
  PlatformAiWorkerProbeDiagnosticsInput
} from './platform-ai-runtime.types'

export type WindowsAiRuntimeLaneId = 'python-cuda' | 'onnx-runtime' | 'llama'

export interface WindowsAiRuntimeLane extends PlatformAiRuntimeLaneBase<WindowsAiRuntimeLaneId> {}

export interface WindowsAiBranchRuntimeMetadata extends PlatformAiBranchRuntimeMetadataBase<'windows-ai-branch', WindowsAiRuntimeLane> {}

export interface WindowsAiWorkerProbeResult extends PlatformAiWorkerProbeDiagnosticsInput {
  torch: PlatformAiWorkerProbeDiagnosticsInput['torch'] & {
    cudaBuilt: boolean
    cudaAvailable: boolean
  }
  onnxruntime: PlatformAiWorkerProbeDiagnosticsInput['onnxruntime'] & {
    cudaAvailable: boolean
    dmlAvailable: boolean
  }
}
