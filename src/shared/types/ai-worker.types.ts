export interface GpuStatus {
  success: boolean;
  cudaAvailable: boolean;
  gpuName: string | null;
  totalVramGB: number;
  freeVramGB: number;
  usedVramGB: number;
  usagePercent: number;
  torch?: {
    allocatedGB: number;
    reservedGB: number;
  } | null;
  processes?: Array<{
    pid: number;
    name: string;
    usedMemoryGB: number;
  }> | null;
  error?: string | null;
}

export interface ClearGpuMemoryResult {
  success: boolean;
  before: { allocatedGB: number; reservedGB: number; freeGB: number; totalGB: number } | null;
  after: { allocatedGB: number; reservedGB: number; freeGB: number; totalGB: number } | null;
  error?: string | null;
}
