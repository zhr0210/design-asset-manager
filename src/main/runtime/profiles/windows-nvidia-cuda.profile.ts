import type { RuntimeProfile } from '../runtime-profile.types'

export const windowsNvidiaCudaProfile: RuntimeProfile = {
  id: 'windows-nvidia-cuda',
  label: 'Windows NVIDIA CUDA',
  description: 'Windows profile that can use a managed CUDA-capable runtime package when available.',
  platform: 'win32',
  arch: 'x64',
  requirements: ['Windows x64', 'NVIDIA GPU hint', 'Writable app data paths'],
  capabilities: ['local-ai-worker', 'external-inference', 'ocr', 'tagging', 'embedding', 'gpu-acceleration', 'runtime-package'],
  inferenceMode: 'local-python-worker',
  ocrMode: 'local',
  recommendedRuntimeKinds: ['python-worker'],
  recommendedPackages: ['ai-worker-core', 'cuda-runtime-hint'],
  optionalPackages: ['cpu-only-legacy-runtime'],
  warnings: ['This profile only describes CUDA runtime package compatibility; it does not install CUDA or inspect drivers deeply.'],
  fallbackProfileId: 'windows-cpu',
  isExperimental: false
}
