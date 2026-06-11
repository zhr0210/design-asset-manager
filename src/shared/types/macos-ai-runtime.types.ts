import type { PlatformArch, PlatformName } from './platform.types'

export type MacOSAiRuntimeLaneId = 'python-mps' | 'onnx-runtime' | 'llama'

export type AiCapabilityStatus =
  | 'ready'
  | 'optional'
  | 'planned'
  | 'evidence_insufficient'
  | 'dependency_missing'
  | 'fallback'
  | 'unavailable'

export interface AiRuntimeCapability {
  id: string
  label: string
  status: AiCapabilityStatus
  role: 'tagging' | 'ocr' | 'embedding' | 'prompt-reverse' | 'fallback'
  modelFamily?: string
  backend?: string
}

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

export interface AiWorkerCapabilityProbe {
  id: string
  label: string
  status: AiCapabilityStatus
  role: 'tagging' | 'ocr' | 'embedding' | 'prompt-reverse' | 'fallback'
  modelFamily?: string
  backend?: string
  version?: string | null
  available?: boolean
  error?: string | null
}

export interface AiWorkerLaneProbe {
  id: string
  label: string
  status: AiCapabilityStatus
  summary: string
  capabilities: AiWorkerCapabilityProbe[]
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
