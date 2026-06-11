import type { PlatformArch, PlatformName } from './platform.types'
import type { AiCapabilityStatus, AiRuntimeCapability, AiWorkerCapabilityProbe, AiWorkerLaneProbe } from './platform-ai-runtime.types'

export type WindowsAiRuntimeLaneId = 'python-cuda' | 'onnx-runtime' | 'llama'

export interface WindowsAiRuntimeLane {
  id: WindowsAiRuntimeLaneId
  label: string
  status: AiCapabilityStatus
  summary: string
  capabilities: AiRuntimeCapability[]
  fallbackCapabilityIds: string[]
}

export interface WindowsAiBranchRuntimeMetadata {
  marker: 'windows-ai-branch'
  phase: 'skeleton' | 'worker-probes' | 'model-download' | 'validated'
  platform: PlatformName
  arch: PlatformArch
  isCurrentPlatform: boolean
  lanes: WindowsAiRuntimeLane[]
  warnings: string[]
}

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
