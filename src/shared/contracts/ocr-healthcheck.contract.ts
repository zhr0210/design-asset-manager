export const CHANNEL_OCR_HEALTHCHECK_RUN = 'ocr-healthcheck:run'

export interface OcrHealthcheckRequest {}

export interface OcrHealthcheckResponse {
  ok: boolean
  status: string
  schemaVersion?: string
  python?: unknown
  providers?: unknown
  runner?: unknown
  recommendation?: unknown
  error?: string
  warnings?: string[]
}
