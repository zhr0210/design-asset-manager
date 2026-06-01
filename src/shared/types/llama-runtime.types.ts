export type LlamaRuntimeAccelerator = 'cuda13' | 'cuda12' | 'vulkan' | 'cpu';

export type LlamaInstallPhase =
  | 'idle'
  | 'detecting'
  | 'planning'
  | 'downloading'
  | 'extracting'
  | 'installing'
  | 'starting'
  | 'testing'
  | 'complete'
  | 'cancelled'
  | 'error';

export interface LlamaHardwareProfile {
  platform: NodeJS.Platform | string;
  arch: string;
  cpuThreads: number;
  totalMemoryGB: number;
  hasNvidiaGpu: boolean;
  gpuName?: string;
  totalVramGB?: number;
  driverVersion?: string;
  cudaVersion?: string;
  recommendedAccelerator: LlamaRuntimeAccelerator;
  warnings: string[];
}

export interface LlamaRuntimePackage {
  id: string;
  role: 'runtime' | 'cuda-runtime';
  accelerator: LlamaRuntimeAccelerator;
  version: string;
  filename: string;
  officialUrl: string;
  mirrorUrl?: string;
  sourceRegion?: string;
  checksumSha256?: string;
  verified: boolean;
  sizeBytes?: number;
}

export interface LlamaModelCandidate {
  id: string;
  name: string;
  repoId: string;
  filename: string;
  url: string;
  mmprojFilename?: string;
  mmprojUrl?: string;
  mirrorUrl?: string;
  sourceRegion?: string;
  checksumSha256?: string;
  quantization: string;
  parameterSize: string;
  estimatedSizeGB: number;
  recommendedMinVramGB: number;
  supportsVision: boolean;
  officialReleaseDate?: string;
  reason: string;
}

export interface LlamaInstallPlan {
  installId: string;
  createdAt: string;
  runtimeVersion: string;
  accelerator: LlamaRuntimeAccelerator;
  runtimePackages: LlamaRuntimePackage[];
  modelCandidates: LlamaModelCandidate[];
  recommendedModel: LlamaModelCandidate;
  installRoot: string;
  runtimeDir: string;
  modelDir: string;
  baseUrl: string;
  warnings: string[];
  downloadSource?: 'huggingface' | 'hf-mirror';
}

export interface LlamaInstallProgressEvent {
  installId: string;
  phase: LlamaInstallPhase;
  progress: number;
  message: string;
  detail?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface LlamaInstallStatus {
  installId?: string;
  phase: LlamaInstallPhase;
  progress: number;
  message: string;
  installRoot?: string;
  runtimeDir?: string;
  modelPath?: string;
  mmprojPath?: string;
  baseUrl: string;
  serverPid?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface LlamaServerTestResult {
  success: boolean;
  baseUrl: string;
  models: string[];
  chatOk: boolean;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}
