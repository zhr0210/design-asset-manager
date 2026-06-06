import type { PlatformArch, PlatformName } from './platform.types'

export type MacOSAiRuntimeLaneId = 'python-mps' | 'onnx-runtime' | 'llama'

export type MacOSAiCapabilityStatus =
  | 'ready'
  | 'optional'
  | 'planned'
  | 'evidence_insufficient'
  | 'dependency_missing'
  | 'fallback'
  | 'unavailable'

export interface MacOSAiRuntimeCapability {
  id: string
  label: string
  status: MacOSAiCapabilityStatus
  role: 'tagging' | 'ocr' | 'embedding' | 'prompt-reverse' | 'fallback'
  modelFamily?: string
  backend?: string
}

export interface MacOSAiRuntimeLane {
  id: MacOSAiRuntimeLaneId
  label: string
  status: MacOSAiCapabilityStatus
  summary: string
  capabilities: MacOSAiRuntimeCapability[]
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

export interface MacOSAiWorkerCapabilityProbe {
  id: string
  label: string
  status: MacOSAiCapabilityStatus
  role: 'tagging' | 'ocr' | 'embedding' | 'prompt-reverse' | 'fallback'
  modelFamily?: string
  backend?: string
  version?: string | null
  available?: boolean
  error?: string | null
}

export interface MacOSAiWorkerLaneProbe {
  id: string
  label: string
  status: MacOSAiCapabilityStatus
  summary: string
  capabilities: MacOSAiWorkerCapabilityProbe[]
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
  mlx: {
    available: boolean
    version: string | null
    error: string | null
  }
  clipSiglipOnnx: MacOSAiWorkerCapabilityProbe
  lanes: MacOSAiWorkerLaneProbe[]
}
