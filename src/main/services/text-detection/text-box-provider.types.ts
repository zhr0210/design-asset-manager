import type { TextBox } from '../../../shared/types/color-palette.types'
export type { TextBox }

export type TextDetectionProvider = 'easyocr_detection' | 'rapidocr_detection' | 'qwen_vl_text_blocks' | 'mock_text_boxes' | 'none'

export interface TextBoxProviderConfig {
  provider: TextDetectionProvider
  timeoutMs: number
  maxTextBoxes: number
  minConfidence: number
}

export interface TextBoxProviderResult {
  provider: TextDetectionProvider
  boxes: TextBox[]
  isMock: boolean
  warnings: string[]
}

export interface ITextBoxProvider {
  detect(imagePath: string, assetId?: string): Promise<TextBox[]>
}
