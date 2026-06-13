import type {
  MacOSAiBranchRuntimeMetadata,
  MacOSAiRuntimeLane
} from '../types/macos-ai-runtime.types'
import type { AiCapabilityStatus } from '../types/platform-ai-runtime.types'
import type { PlatformArch, PlatformName } from '../types/platform.types'
import {
  createAiRuntimeCapability as capability,
  currentPlatformEvidenceStatus,
  currentPlatformFallbackStatus,
  isPlatformName
} from './platform-ai-runtime-metadata.constants'

function platformLaneStatus(platform: PlatformName, arch: PlatformArch, preferred: 'apple-silicon' | 'macos'): AiCapabilityStatus {
  const isCurrentPlatform = isPlatformName(platform, 'darwin')
  if (!isCurrentPlatform) return 'unavailable'
  if (preferred === 'apple-silicon' && arch !== 'arm64') return 'fallback'
  return currentPlatformEvidenceStatus(isCurrentPlatform)
}

export function createMacOSAiBranchRuntimeMetadata(platform: PlatformName, arch: PlatformArch): MacOSAiBranchRuntimeMetadata {
  const isCurrentPlatform = isPlatformName(platform, 'darwin')
  const mpsStatus = platformLaneStatus(platform, arch, 'apple-silicon')
  const onnxStatus = platformLaneStatus(platform, arch, 'macos')
  const llamaStatus = platformLaneStatus(platform, arch, 'macos')
  const platformFallbackStatus = currentPlatformFallbackStatus(isCurrentPlatform)

  const lanes: MacOSAiRuntimeLane[] = [
    {
      id: 'python-mps',
      label: 'Python MPS Runtime',
      status: mpsStatus,
      summary: 'Optional PyTorch MPS route for RAM++, Florence-2, CLIP/SigLIP, with CPU fallback.',
      fallbackCapabilityIds: ['python-mps.cpu-fallback'],
      capabilities: [
        capability('python-mps.ram-plus', 'RAM++ optional', mpsStatus, 'tagging', 'RAM++', 'PyTorch MPS'),
        capability('python-mps.florence-2', 'Florence-2 optional', mpsStatus, 'tagging', 'Florence-2', 'PyTorch MPS'),
        capability('python-mps.clip-siglip', 'CLIP/SigLIP optional', mpsStatus, 'embedding', 'CLIP/SigLIP', 'PyTorch MPS'),
        capability('python-mps.cpu-fallback', 'CPU fallback', platformFallbackStatus, 'fallback', undefined, 'CPU')
      ]
    },
    {
      id: 'onnx-runtime',
      label: 'ONNX Runtime',
      status: onnxStatus,
      summary: 'ONNX lane for WD14, RapidOCR, PaddleOCR ONNX, CLIP/SigLIP ONNX, with CoreML or CPU fallback.',
      fallbackCapabilityIds: ['onnx-runtime.coreml-fallback', 'onnx-runtime.cpu-fallback'],
      capabilities: [
        capability('onnx-runtime.wd14', 'WD14 Tagger', onnxStatus, 'tagging', 'WD14', 'ONNX Runtime'),
        capability('onnx-runtime.rapidocr', 'RapidOCR', onnxStatus, 'ocr', 'RapidOCR', 'ONNX Runtime'),
        capability('onnx-runtime.paddleocr', 'PaddleOCR ONNX', onnxStatus, 'ocr', 'PaddleOCR', 'ONNX Runtime'),
        capability('onnx-runtime.clip-siglip', 'CLIP/SigLIP ONNX', onnxStatus, 'embedding', 'CLIP/SigLIP', 'ONNX Runtime'),
        capability('onnx-runtime.coreml-fallback', 'CoreML fallback', onnxStatus, 'fallback', undefined, 'CoreML'),
        capability('onnx-runtime.cpu-fallback', 'CPU fallback', platformFallbackStatus, 'fallback', undefined, 'CPU')
      ]
    },
    {
      id: 'llama',
      label: 'Llama',
      status: llamaStatus,
      summary: 'Large vision route for Qwen3-VL GGUF, Qwen2.5-VL Ollama fallback, and external HTTP fallback.',
      fallbackCapabilityIds: ['llama.qwen25-vl-ollama', 'llama.external-http'],
      capabilities: [
        capability('llama.qwen3-vl-gguf', 'Qwen3-VL GGUF', llamaStatus, 'prompt-reverse', 'Qwen3-VL', 'llama.cpp Metal'),
        capability('llama.qwen25-vl-ollama', 'Qwen2.5-VL Ollama fallback', platformFallbackStatus, 'prompt-reverse', 'Qwen2.5-VL', 'Ollama'),
        capability('llama.external-http', 'external HTTP fallback', 'fallback', 'fallback', undefined, 'OpenAI-compatible HTTP')
      ]
    }
  ]

  return {
    marker: 'macos-ai-branch',
    phase: 'skeleton',
    platform,
    arch,
    isCurrentPlatform,
    lanes,
    warnings: [
      'Phase 1 exposes macOS AI branch lanes and route metadata only; it does not claim model downloads or worker probes are complete.',
      'Qwen3-VL large vision should route through llama.cpp Metal, Ollama fallback, or external HTTP instead of the native CUDA Python path.'
    ]
  }
}
