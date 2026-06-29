import type { AppSettings } from '../types/settings.types'

export type ProductTextBoxProvider = Exclude<AppSettings['textBoxProvider'], 'mock'>

const PRODUCT_TEXT_BOX_PROVIDER_NORMALIZATION: Record<AppSettings['textBoxProvider'], ProductTextBoxProvider> = {
  none: 'none',
  easyocr: 'easyocr',
  rapidocr: 'rapidocr',
  paddleocr: 'paddleocr',
  mock: 'none'
}

export function normalizeProductTextBoxProvider(
  provider: AppSettings['textBoxProvider'] | undefined
): ProductTextBoxProvider {
  return PRODUCT_TEXT_BOX_PROVIDER_NORMALIZATION[provider ?? 'none']
}
