import type { PlatformArch, PlatformName } from './platform.types'

export type AiCapabilityStatus =
  | 'ready'
  | 'optional'
  | 'planned'
  | 'evidence_insufficient'
  | 'dependency_missing'
  | 'fallback'
  | 'unavailable'

export type PlatformAiRuntimeBranchPhase = 'skeleton' | 'worker-probes' | 'model-download' | 'validated'

export interface AiRuntimeCapability {
  id: string
  label: string
  status: AiCapabilityStatus
  role: 'tagging' | 'ocr' | 'embedding' | 'prompt-reverse' | 'fallback'
  modelFamily?: string
  backend?: string
}

export interface PlatformAiRuntimeLaneBase<TLaneId extends string = string> {
  id: TLaneId
  label: string
  status: AiCapabilityStatus
  summary: string
  capabilities: AiRuntimeCapability[]
  fallbackCapabilityIds: string[]
}

export interface PlatformAiBranchRuntimeMetadataBase<TMarker extends string, TLane extends PlatformAiRuntimeLaneBase> {
  marker: TMarker
  phase: PlatformAiRuntimeBranchPhase
  platform: PlatformName
  arch: PlatformArch
  isCurrentPlatform: boolean
  lanes: TLane[]
  warnings: string[]
}

export type PlatformAiBranchRuntimeMetadata = PlatformAiBranchRuntimeMetadataBase<string, PlatformAiRuntimeLaneBase>

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

export interface PlatformAiLaneDisplayCapability {
  id: string
  label: string
  status: AiCapabilityStatus
  backend?: string
  role: string
}

export interface PlatformAiLaneDisplayInput {
  id: string
  label: string
  status: AiCapabilityStatus
  summary: string
  capabilities: PlatformAiLaneDisplayCapability[]
}

export interface PlatformAiWorkerProbeResultBase {
  platform: string
  machine: string
  isMacOS: boolean
  isAppleSilicon: boolean
  phase: 'worker-probes'
  clipSiglipOnnx: AiWorkerCapabilityProbe
  lanes: AiWorkerLaneProbe[]
}

export interface PlatformAiWorkerRuntimeVersionProbe {
  version: string | null
}

export type PlatformAiWorkerProbeWithRuntimeVersions = PlatformAiWorkerProbeResultBase & {
  torch: PlatformAiWorkerRuntimeVersionProbe
  onnxruntime: PlatformAiWorkerRuntimeVersionProbe
}
