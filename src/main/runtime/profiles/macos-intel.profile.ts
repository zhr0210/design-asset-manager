import type { RuntimeProfile } from '../runtime-profile.types'

export const macosIntelProfile: RuntimeProfile = {
  id: 'macos-intel',
  label: 'macOS Intel',
  description: 'macOS Intel profile biased toward ONNX/CPU and external inference workflows.',
  platform: 'darwin',
  arch: 'x64',
  requirements: ['macOS x64', 'Writable app data paths'],
  capabilities: ['cpu-only', 'external-inference', 'ocr', 'tagging', 'onnx-runtime'],
  inferenceMode: 'external-http',
  ocrMode: 'local',
  recommendedRuntimeKinds: ['custom-http', 'ollama'],
  recommendedPackages: [],
  optionalPackages: ['cpu-ocr-runtime', 'onnx-runtime', 'qwen2.5-vl-ollama-fallback'],
  warnings: ['Local AI can be limited on Intel macOS machines; ONNX/CPU and external inference are the safest fallbacks.'],
  fallbackProfileId: 'external-inference-only',
  isExperimental: false
}
