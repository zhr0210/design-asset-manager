import type { AppSettings } from '../types/settings.types'
import type { OcrEnvPayload } from '../contracts/ocr-dependency.contract'

export type ProductTextBoxProvider = Exclude<AppSettings['textBoxProvider'], 'mock'>
export type ProductTextBoxProviderSelection = AppSettings['textBoxProvider'] | 'qwen_vl_text_blocks'
export type TextBoxExecutionProvider =
  | 'easyocr_detection'
  | 'rapidocr_detection'
  | 'paddleocr_detection'
  | 'qwen_vl_text_blocks'
  | 'mock_text_boxes'
  | 'none'
export type ProductTextBoxProviderSkipReason =
  | 'provider_none'
  | 'easyocr_not_installed'
  | 'rapidocr_not_installed'
  | 'paddleocr_not_installed'

export type ProductTextBoxProviderExecutionPlan =
  | {
    action: 'skip'
    detectionProvider: ProductTextBoxProviderSelection
    textStatus: 'skipped'
    skipReason: ProductTextBoxProviderSkipReason
  }
  | {
    action: 'run'
    detectionProvider: ProductTextBoxProviderSelection
    providerType: TextBoxExecutionProvider
    isMockProvider: boolean
  }

const PRODUCT_TEXT_BOX_PROVIDER_NORMALIZATION: Record<AppSettings['textBoxProvider'], ProductTextBoxProvider> = {
  none: 'none',
  easyocr: 'easyocr',
  rapidocr: 'rapidocr',
  paddleocr: 'paddleocr',
  mock: 'none'
}

const TEXT_BOX_EXECUTION_PROVIDER_BY_PRODUCT_PROVIDER: Record<ProductTextBoxProviderSelection, TextBoxExecutionProvider> = {
  none: 'none',
  easyocr: 'easyocr_detection',
  rapidocr: 'rapidocr_detection',
  paddleocr: 'paddleocr_detection',
  mock: 'mock_text_boxes',
  qwen_vl_text_blocks: 'qwen_vl_text_blocks'
}

const TEXT_BOX_PROVIDER_UNAVAILABLE_SKIP_REASONS: Partial<Record<ProductTextBoxProviderSelection, ProductTextBoxProviderSkipReason>> = {
  easyocr: 'easyocr_not_installed',
  rapidocr: 'rapidocr_not_installed',
  paddleocr: 'paddleocr_not_installed'
}

const TEXT_BOX_PROVIDER_AVAILABILITY_READERS: Partial<Record<
  ProductTextBoxProviderSelection,
  (providers: OcrEnvPayload['providers']) => boolean
>> = {
  easyocr: (providers) => providers.easyocr.available,
  rapidocr: (providers) => providers.rapidocr.available,
  paddleocr: (providers) => providers.paddleocr.available
}

export function normalizeProductTextBoxProvider(
  provider: AppSettings['textBoxProvider'] | undefined
): ProductTextBoxProvider {
  return PRODUCT_TEXT_BOX_PROVIDER_NORMALIZATION[provider ?? 'none']
}

export function projectProductTextBoxProviderExecutionPlan(
  provider: ProductTextBoxProviderSelection,
  providers: OcrEnvPayload['providers']
): ProductTextBoxProviderExecutionPlan {
  if (provider === 'none') {
    return {
      action: 'skip',
      detectionProvider: 'none',
      textStatus: 'skipped',
      skipReason: 'provider_none'
    }
  }

  const isAvailable = TEXT_BOX_PROVIDER_AVAILABILITY_READERS[provider]?.(providers) ?? true
  const skipReason = TEXT_BOX_PROVIDER_UNAVAILABLE_SKIP_REASONS[provider]
  if (!isAvailable && skipReason) {
    return {
      action: 'skip',
      detectionProvider: provider,
      textStatus: 'skipped',
      skipReason
    }
  }

  return {
    action: 'run',
    detectionProvider: provider,
    providerType: TEXT_BOX_EXECUTION_PROVIDER_BY_PRODUCT_PROVIDER[provider],
    isMockProvider: provider === 'mock'
  }
}
