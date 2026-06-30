import type { DoctorReport } from './doctor.types'
import type { AiRuntimeKind } from './ai-runtime.types'
import type { PlatformArch, PlatformName } from './platform.types'
import type { RuntimeRegistry } from './runtime-registry.types'

export type RuntimeProfileId =
  | 'windows-cpu'
  | 'windows-nvidia-cuda'
  | 'macos-apple-silicon'
  | 'macos-intel'
  | 'external-inference-only'
  | 'unknown'

export type RuntimeCapability =
  | 'local-ai-worker'
  | 'external-inference'
  | 'ocr'
  | 'tagging'
  | 'embedding'
  | 'gpu-acceleration'
  | 'python-mps'
  | 'onnx-runtime'
  | 'llama-metal'
  | 'coreml'
  | 'cpu-only'
  | 'model-download'
  | 'runtime-package'

export type RuntimeInferenceMode = 'local-python-worker' | 'external-http' | 'disabled'
export type RuntimeOcrMode = 'local' | 'external' | 'disabled'

export interface RuntimeProfile {
  id: RuntimeProfileId
  label: string
  description: string
  platform: PlatformName | 'all'
  arch: PlatformArch | 'all'
  requirements: string[]
  capabilities: RuntimeCapability[]
  inferenceMode: RuntimeInferenceMode
  ocrMode: RuntimeOcrMode
  recommendedRuntimeKinds: AiRuntimeKind[]
  recommendedPackages: string[]
  optionalPackages: string[]
  warnings: string[]
  fallbackProfileId: RuntimeProfileId | null
  isExperimental: boolean
}

export interface RuntimeProfileRecommendation {
  recommendedProfileId: RuntimeProfileId
  reason: string
  confidence: number
  warnings: string[]
  blockingIssues: string[]
  fallbackProfileId: RuntimeProfileId | null
  canUseLocalAi: boolean
  canUseExternalInference: boolean
  canContinue: boolean
}

export interface RuntimeProfileResolverInput {
  platformInfo: {
    platform: PlatformName
    arch: PlatformArch
  }
  doctorReport: DoctorReport
  runtimeRegistry: RuntimeRegistry
  userPreference?: RuntimeProfileId
  hardwareHints?: {
    nvidiaGpu?: boolean
  }
}
