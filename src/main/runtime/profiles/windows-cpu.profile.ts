import type { RuntimeProfile } from '../runtime-profile.types'

export const windowsCpuProfile: RuntimeProfile = {
  id: 'windows-cpu',
  label: 'Windows CPU',
  description: 'Windows CPU-first profile for local management with optional external inference.',
  platform: 'win32',
  arch: 'x64',
  requirements: ['Windows x64', 'Writable app data paths'],
  capabilities: ['cpu-only', 'external-inference', 'tagging', 'ocr'],
  inferenceMode: 'local-python-worker',
  ocrMode: 'local',
  recommendedRuntimeKinds: ['python-worker', 'custom-http'],
  recommendedPackages: ['ai-worker-core'],
  optionalPackages: ['experimental-runtime'],
  warnings: ['Local AI features may run slowly on CPU-only machines.'],
  fallbackProfileId: 'external-inference-only',
  isExperimental: false
}
