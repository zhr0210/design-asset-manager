import type { LlamaRuntimeAccelerator } from '../../../shared/types/llama-runtime.types'

export interface LlamaMacHardwareProfileInput {
  arch: string
  chipName: string
  displaySummary?: string
  totalMemoryGB: number
}

export interface LlamaMacHardwareProfileProjection {
  isAppleSilicon: boolean
  gpuName: string
  totalVramGB?: number
  recommendedAccelerator: LlamaRuntimeAccelerator
  unifiedMemoryWarning?: string
}

const APPLE_SILICON_CHIP_PATTERN = /Apple\s+M\d|Apple\s+Silicon/i

export function projectLlamaMacHardwareProfile(input: LlamaMacHardwareProfileInput): LlamaMacHardwareProfileProjection {
  const isAppleSilicon = input.arch === 'arm64' || APPLE_SILICON_CHIP_PATTERN.test(input.chipName)
  const totalVramGB = isAppleSilicon
    ? Math.max(4, Math.round(input.totalMemoryGB * 0.65 * 10) / 10)
    : undefined
  const recommendedAccelerator: LlamaRuntimeAccelerator = isAppleSilicon ? 'metal' : 'cpu'
  const gpuName = input.displaySummary || `${input.chipName}${isAppleSilicon ? ' 统一内存 GPU' : ''}`

  return {
    isAppleSilicon,
    gpuName,
    totalVramGB,
    recommendedAccelerator,
    unifiedMemoryWarning: totalVramGB
      ? `按 Apple 统一内存估算可用于本地推理的显存预算约 ${totalVramGB} GB。`
      : undefined
  }
}
