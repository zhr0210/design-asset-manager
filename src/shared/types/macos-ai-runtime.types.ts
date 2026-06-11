import type { PlatformArch, PlatformName } from './platform.types'
import type {
  AiCapabilityStatus,
  AiRuntimeCapability,
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe
} from './platform-ai-runtime.types'

export type MacOSAiRuntimeLaneId = 'python-mps' | 'onnx-runtime' | 'llama'
export type {
  AiCapabilityStatus,
  AiRuntimeCapability,
  AiWorkerCapabilityProbe,
  AiWorkerLaneProbe
} from './platform-ai-runtime.types'

export interface MacOSAiRuntimeLane {
  id: MacOSAiRuntimeLaneId
  label: string
  status: AiCapabilityStatus
  summary: string
  capabilities: AiRuntimeCapability[]
  fallbackCapabilityIds: string[]
}

export interface MacOSAiBranchRuntimeMetadata {
  marker: 'macos-ai-branch'
  phase: 'skeleton' | 'worker-probes' | 'model-download' | 'validated'
  platform: PlatformName
  arch: PlatformArch
  isCurrentPlatform: boolean
  lanes: MacOSAiRuntimeLane[]
  warnings: string[]
}

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
