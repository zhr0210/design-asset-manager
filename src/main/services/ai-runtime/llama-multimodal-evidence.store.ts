import type { LlamaServerTestResult } from '../../../shared/types/llama-runtime.types'

const LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000
let latestLlamaMultimodalProbe: LlamaServerTestResult | null = null

export function recordLlamaMultimodalProbe(result: LlamaServerTestResult): void {
  latestLlamaMultimodalProbe = result
}

export function getFreshLlamaMultimodalProbe(now = Date.now()): LlamaServerTestResult | null {
  if (!latestLlamaMultimodalProbe) return null
  const checkedAt = Date.parse(latestLlamaMultimodalProbe.checkedAt)
  if (!Number.isFinite(checkedAt) || now - checkedAt > LLAMA_MULTIMODAL_EVIDENCE_TTL_MS) return null
  return latestLlamaMultimodalProbe
}
