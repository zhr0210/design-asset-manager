import type { OcrRealEvidenceProbeResponse } from '../../../shared/types/ocr-real-evidence.types'

const OCR_REAL_EVIDENCE_TTL_MS = 5 * 60 * 1000
let latestOcrRealEvidence: OcrRealEvidenceProbeResponse | null = null

export function recordOcrRealEvidence(result: OcrRealEvidenceProbeResponse): void {
  latestOcrRealEvidence = result
}

export function getFreshOcrRealEvidence(now = Date.now()): OcrRealEvidenceProbeResponse | null {
  if (!latestOcrRealEvidence) return null
  const checkedAt = Date.parse(latestOcrRealEvidence.checkedAt)
  if (!Number.isFinite(checkedAt) || now - checkedAt > OCR_REAL_EVIDENCE_TTL_MS) return null
  return latestOcrRealEvidence
}
