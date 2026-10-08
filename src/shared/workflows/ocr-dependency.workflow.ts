import type { OcrEnvPayload } from '../contracts/ocr-dependency.contract'

export type OcrSelectedProvider = OcrEnvPayload['selectedProvider']
export type OcrProviderAvailabilityInput = OcrEnvPayload['providers']

const OCR_SELECTED_PROVIDER_AVAILABILITY_READERS: Record<
  OcrSelectedProvider,
  (providers: OcrProviderAvailabilityInput) => boolean
> = {
  none: () => false,
  easyocr: (providers) => providers.easyocr.available,
  rapidocr: (providers) => providers.rapidocr.available,
  paddleocr: (providers) => providers.paddleocr.available,
  mock: () => true
}

export function projectOcrSelectedProviderAvailability(
  selectedProvider: OcrSelectedProvider,
  providers: OcrProviderAvailabilityInput
): boolean {
  return OCR_SELECTED_PROVIDER_AVAILABILITY_READERS[selectedProvider](providers)
}
