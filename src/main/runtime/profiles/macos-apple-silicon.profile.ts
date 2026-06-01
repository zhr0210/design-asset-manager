import type { RuntimeProfile } from '../runtime-profile.types'

export const macosAppleSiliconProfile: RuntimeProfile = {
  id: 'macos-apple-silicon',
  label: 'macOS Apple Silicon',
  description: 'macOS arm64 profile for local AI worker or external inference on Apple Silicon.',
  platform: 'darwin',
  arch: 'arm64',
  requirements: ['macOS arm64', 'Writable app data paths'],
  capabilities: ['local-ai-worker', 'external-inference', 'ocr', 'tagging', 'embedding', 'runtime-package'],
  inferenceMode: 'local-python-worker',
  ocrMode: 'local',
  recommendedPackages: ['python-runtime-macos-arm64'],
  optionalPackages: ['metal-friendly-local-runtime'],
  warnings: ['Metal/MPS-friendly behavior is profile metadata only in this phase.'],
  fallbackProfileId: 'external-inference-only',
  isExperimental: false
}
