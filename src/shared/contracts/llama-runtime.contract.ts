import type { LlamaInstallPlan } from '../types/llama-runtime.types';

export const CHANNEL_LLAMA_RUNTIME_DETECT_HARDWARE = 'llama-runtime:detect-hardware';
export const CHANNEL_LLAMA_RUNTIME_CREATE_INSTALL_PLAN = 'llama-runtime:create-install-plan';
export const CHANNEL_LLAMA_RUNTIME_START_INSTALL = 'llama-runtime:start-install';
export const CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL = 'llama-runtime:cancel-install';
export const CHANNEL_LLAMA_RUNTIME_GET_STATUS = 'llama-runtime:get-status';
export const CHANNEL_LLAMA_RUNTIME_START_SERVER = 'llama-runtime:start-server';
export const CHANNEL_LLAMA_RUNTIME_STOP_SERVER = 'llama-runtime:stop-server';
export const CHANNEL_LLAMA_RUNTIME_TEST_SERVER = 'llama-runtime:test-server';

export const llamaRuntimeInstallProgressChannel = (installId: string) =>
  `llama-runtime:install-progress:${installId}`;

export interface LlamaCreateInstallPlanRequest {
  mirrorManifestPath?: string;
  modelRootDir?: string;
  downloadSource?: 'huggingface' | 'hf-mirror' | 'production-cdn';
}

export interface LlamaStartInstallRequest {
  plan: LlamaInstallPlan;
}

export interface LlamaServerControlRequest {
  plan?: LlamaInstallPlan;
  baseUrl?: string;
  modelPath?: string;
}
