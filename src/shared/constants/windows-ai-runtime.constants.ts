import type {
  WindowsAiBranchRuntimeMetadata,
  WindowsAiRuntimeLane
} from '../types/windows-ai-runtime.types'
import type { AiCapabilityStatus } from '../types/platform-ai-runtime.types'
import type { PlatformArch, PlatformName } from '../types/platform.types'
import {
  createAiRuntimeCapability as capability,
  currentPlatformEvidenceStatus,
  currentPlatformFallbackStatus,
  isPlatformName
} from './platform-ai-runtime-metadata.constants'

function platformLaneStatus(platform: PlatformName): AiCapabilityStatus {
  return currentPlatformEvidenceStatus(isPlatformName(platform, 'win32'))
}

export function createWindowsAiBranchRuntimeMetadata(platform: PlatformName, arch: PlatformArch): WindowsAiBranchRuntimeMetadata {
  const isCurrentPlatform = isPlatformName(platform, 'win32')
  const cudaStatus = platformLaneStatus(platform)
  const onnxStatus = platformLaneStatus(platform)
  const llamaStatus = platformLaneStatus(platform)
  const platformFallbackStatus = currentPlatformFallbackStatus(isCurrentPlatform)

  const lanes: WindowsAiRuntimeLane[] = [
    {
      id: 'python-cuda',
      label: 'Python CUDA Runtime',
      status: cudaStatus,
      summary: 'Optional PyTorch CUDA route for RAM++, Florence-2, CLIP/SigLIP, with CPU fallback.',
      fallbackCapabilityIds: ['python-cuda.cpu-fallback'],
      capabilities: [
        capability('python-cuda.ram-plus', 'RAM++ optional', cudaStatus, 'tagging', 'RAM++', 'PyTorch CUDA'),
        capability('python-cuda.florence-2', 'Florence-2 optional', cudaStatus, 'tagging', 'Florence-2', 'PyTorch CUDA'),
        capability('python-cuda.clip-siglip', 'CLIP/SigLIP optional', cudaStatus, 'embedding', 'CLIP/SigLIP', 'PyTorch CUDA'),
        capability('python-cuda.cpu-fallback', 'CPU fallback', platformFallbackStatus, 'fallback', undefined, 'CPU')
      ]
    },
    {
      id: 'onnx-runtime',
      label: 'ONNX Runtime',
      status: onnxStatus,
      summary: 'ONNX lane for WD14, RapidOCR, PaddleOCR ONNX, CLIP/SigLIP ONNX, with CUDA or DirectML fallback.',
      fallbackCapabilityIds: ['onnx-runtime.cuda-fallback', 'onnx-runtime.dml-fallback', 'onnx-runtime.cpu-fallback'],
      capabilities: [
        capability('onnx-runtime.wd14', 'WD14 Tagger', onnxStatus, 'tagging', 'WD14', 'ONNX Runtime'),
        capability('onnx-runtime.rapidocr', 'RapidOCR', onnxStatus, 'ocr', 'RapidOCR', 'ONNX Runtime'),
        capability('onnx-runtime.paddleocr', 'PaddleOCR ONNX', onnxStatus, 'ocr', 'PaddleOCR', 'ONNX Runtime'),
        capability('onnx-runtime.clip-siglip', 'CLIP/SigLIP ONNX', onnxStatus, 'embedding', 'CLIP/SigLIP', 'ONNX Runtime'),
        capability('onnx-runtime.cuda-fallback', 'CUDA fallback', onnxStatus, 'fallback', undefined, 'CUDA'),
        capability('onnx-runtime.dml-fallback', 'DirectML fallback', onnxStatus, 'fallback', undefined, 'DirectML'),
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
        capability('llama.qwen3-vl-gguf', 'Qwen3-VL GGUF', llamaStatus, 'prompt-reverse', 'Qwen3-VL', 'llama.cpp CUDA'),
        capability('llama.qwen25-vl-ollama', 'Qwen2.5-VL Ollama fallback', platformFallbackStatus, 'prompt-reverse', 'Qwen2.5-VL', 'Ollama'),
        capability('llama.external-http', 'external HTTP fallback', 'fallback', 'fallback', undefined, 'OpenAI-compatible HTTP')
      ]
    }
  ]

  return {
    marker: 'windows-ai-branch',
    phase: 'skeleton',
    platform,
    arch,
    isCurrentPlatform,
    lanes,
    warnings: [
      'Phase 1 exposes Windows AI branch lanes and route metadata only; it does not claim model downloads or worker probes are complete.',
      'Qwen3-VL large vision should route through llama.cpp CUDA, Ollama fallback, or external HTTP instead of the native Python path.'
    ]
  }
}
