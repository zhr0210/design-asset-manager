import type { RuntimeProfile } from '../runtime-profile.types'

export const macosIntelProfile: RuntimeProfile = {
  id: 'macos-intel',
  label: 'macOS Intel',
  description: 'macOS Intel profile biased toward CPU-only or external inference workflows.',
  platform: 'darwin',
  arch: 'x64',
  requirements: ['macOS x64', 'Writable app data paths'],
  capabilities: ['cpu-only', 'external-inference', 'ocr', 'tagging'],
  inferenceMode: 'external-http',
  ocrMode: 'local',
  recommendedPackages: [],
  optionalPackages: ['python-runtime-macos-x64'],
  warnings: ['Local AI can be limited on Intel macOS machines; external inference is the safest fallback.'],
  fallbackProfileId: 'external-inference-only',
  isExperimental: false
}
