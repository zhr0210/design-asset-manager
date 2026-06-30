import type { RuntimeProfile } from '../runtime-profile.types'

export const macosAppleSiliconProfile: RuntimeProfile = {
  id: 'macos-apple-silicon',
  label: 'macOS Apple Silicon',
  description: 'macOS arm64 profile for the macOS AI branch: Python MPS, ONNX Runtime, llama.cpp Metal, and external fallback.',
  platform: 'darwin',
  arch: 'arm64',
  requirements: ['macOS arm64', 'Writable app data paths'],
  capabilities: ['local-ai-worker', 'external-inference', 'ocr', 'tagging', 'embedding', 'runtime-package', 'python-mps', 'onnx-runtime', 'llama-metal', 'coreml', 'cpu-only'],
  inferenceMode: 'local-python-worker',
  ocrMode: 'local',
  recommendedRuntimeKinds: ['python-worker', 'llama-app', 'ollama', 'custom-http'],
  recommendedPackages: ['python-mps-runtime', 'onnx-runtime', 'llama-metal-runtime'],
  optionalPackages: ['qwen3-vl-gguf', 'qwen2.5-vl-ollama-fallback'],
  warnings: ['Phase 1 exposes macOS AI branch metadata; Worker probes and model downloads are implemented in later phases.'],
  fallbackProfileId: 'external-inference-only',
  isExperimental: false
}
