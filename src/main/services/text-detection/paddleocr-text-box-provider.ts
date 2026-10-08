import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'

export const PADDLEOCR_LOCAL_ONLY_ADAPTER_UNAVAILABLE = 'PADDLEOCR_LOCAL_ONLY_ADAPTER_UNAVAILABLE'

export class PaddleOcrColorTextBoxProvider implements ITextBoxProvider {
  constructor(_config: { timeoutMs: number; minConfidence: number; maxTextBoxes: number }) {}

  public async detect(_imagePath: string, _assetId?: string): Promise<TextBox[]> {
    throw new Error(PADDLEOCR_LOCAL_ONLY_ADAPTER_UNAVAILABLE)
  }
}
