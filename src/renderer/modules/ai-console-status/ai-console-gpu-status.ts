import type { GpuStatus } from '../../../shared/types/ai-worker.types'

export interface AiConsoleGpuStatusProjection {
  available: boolean
  isMock: boolean
  deviceName: string
  totalMb: number
  usedMb: number
  freeMb: number
  usagePercent: number
  error: string | null
}

interface WorkerGpuStatusEvidence {
  available?: boolean
  is_mock?: boolean
  device_name?: string
  total_vram_mb?: number
  used_vram_mb?: number
  free_vram_mb?: number
  utilization_percent?: number
  error?: string | null
}

export function normalizeAiConsoleGpuStatus(raw: unknown): AiConsoleGpuStatusProjection {
  if (!raw || typeof raw !== 'object') {
    return {
      available: false,
      isMock: false,
      deviceName: 'Unknown GPU',
      totalMb: 0,
      usedMb: 0,
      freeMb: 0,
      usagePercent: 0,
      error: null
    }
  }

  if ('cudaAvailable' in raw || 'totalVramGB' in raw) {
    const gpu = raw as Partial<GpuStatus>
    return {
      available: Boolean(gpu.success && gpu.cudaAvailable),
      isMock: false,
      deviceName: gpu.gpuName || 'Unknown GPU',
      totalMb: Math.round(Number(gpu.totalVramGB || 0) * 1024),
      usedMb: Math.round(Number(gpu.usedVramGB || 0) * 1024),
      freeMb: Math.round(Number(gpu.freeVramGB || 0) * 1024),
      usagePercent: Number(gpu.usagePercent || 0),
      error: gpu.error ?? null
    }
  }

  const workerGpu = raw as WorkerGpuStatusEvidence
  return {
    available: Boolean(workerGpu.available),
    isMock: Boolean(workerGpu.is_mock),
    deviceName: workerGpu.device_name || 'Unknown GPU',
    totalMb: Number(workerGpu.total_vram_mb || 0),
    usedMb: Number(workerGpu.used_vram_mb || 0),
    freeMb: Number(workerGpu.free_vram_mb || 0),
    usagePercent: Number(workerGpu.utilization_percent || 0),
    error: workerGpu.error ?? null
  }
}
