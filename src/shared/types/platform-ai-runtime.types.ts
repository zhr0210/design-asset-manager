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
