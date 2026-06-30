export type OcrRealEvidenceProvider = 'rapidocr' | 'easyocr'

export type OcrRealEvidenceStatus =
  | 'loaded_real'
  | 'artifact_missing'
  | 'dependency_missing'
  | 'inference_failed'

export interface OcrRealEvidenceAttempt {
  provider: OcrRealEvidenceProvider
  status: OcrRealEvidenceStatus
  boxCount: number
  resultFinite: boolean
  errorCode?: string | null
}

export interface OcrRealEvidenceProbeResponse {
  success: boolean
  status: OcrRealEvidenceStatus
  provider: OcrRealEvidenceProvider | null
  operation: 'generated_image_text_detection'
  generatedFixture: true
  downloadsAllowed: false
  boxCount: number
  resultFinite: boolean
  errorCode?: string | null
  attempts: OcrRealEvidenceAttempt[]
  checkedAt: string
  durationMs: number
}
