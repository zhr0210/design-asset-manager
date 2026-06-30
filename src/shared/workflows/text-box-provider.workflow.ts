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

interface TextBoxProviderExecutionDescriptor {
  providerType: TextBoxExecutionProvider
  isMockProvider: boolean
  skipReason?: ProductTextBoxProviderSkipReason
  isAvailable?: (providers: OcrEnvPayload['providers']) => boolean
}

const PRODUCT_TEXT_BOX_PROVIDER_NORMALIZATION: Record<AppSettings['textBoxProvider'], ProductTextBoxProvider> = {
  none: 'none',
  easyocr: 'easyocr',
  rapidocr: 'rapidocr',
  paddleocr: 'paddleocr',
  mock: 'none'
}

const TEXT_BOX_PROVIDER_EXECUTION_DESCRIPTORS: Record<ProductTextBoxProviderSelection, TextBoxProviderExecutionDescriptor> = {
  none: {
    providerType: 'none',
    isMockProvider: false,
    skipReason: 'provider_none',
    isAvailable: () => false
  },
  easyocr: {
    providerType: 'easyocr_detection',
    isMockProvider: false,
    skipReason: 'easyocr_not_installed',
    isAvailable: (providers) => providers.easyocr.available
  },
  rapidocr: {
    providerType: 'rapidocr_detection',
    isMockProvider: false,
    skipReason: 'rapidocr_not_installed',
    isAvailable: (providers) => providers.rapidocr.available
  },
  paddleocr: {
    providerType: 'paddleocr_detection',
    isMockProvider: false,
    skipReason: 'paddleocr_not_installed',
    isAvailable: (providers) => providers.paddleocr.available
  },
  mock: {
    providerType: 'mock_text_boxes',
    isMockProvider: true
  },
  qwen_vl_text_blocks: {
    providerType: 'qwen_vl_text_blocks',
    isMockProvider: false
  }
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
  const descriptor = TEXT_BOX_PROVIDER_EXECUTION_DESCRIPTORS[provider]
  const isAvailable = descriptor.isAvailable?.(providers) ?? true
  const skipReason = descriptor.skipReason
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
    providerType: descriptor.providerType,
    isMockProvider: descriptor.isMockProvider
  }
}
