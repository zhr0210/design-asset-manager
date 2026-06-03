export const CHANNEL_OCR_CHECK_ENVIRONMENT = 'ocr:check-environment'
export const CHANNEL_OCR_INSTALL_EASYOCR = 'ocr:install-easyocr'
export const CHANNEL_OCR_CANCEL_INSTALL = 'ocr:cancel-install'
export const CHANNEL_OCR_GET_INSTALL_LOG = 'ocr:get-install-log'
export const CHANNEL_OCR_INSTALL_LOG_UPDATE = 'ocr:install-log'

export interface OcrEnvProvider {
  installed: boolean
  version: string | null
  available: boolean
  installCommand?: string
}

export interface OcrEnvPayload {
  python: {
    available: boolean
    version: string | null
    path: string | null
  }
  providers: {
    easyocr: OcrEnvProvider
    rapidocr: OcrEnvProvider
    paddleocr: OcrEnvProvider
  }
  selectedProvider: 'none' | 'easyocr' | 'rapidocr' | 'paddleocr' | 'mock'
  selectedProviderAvailable: boolean
  checkedAt: string
}
