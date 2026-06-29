import type { TextBox } from '../../../shared/types/color-palette.types'
import type { TextBoxExecutionProvider } from '../../../shared/workflows/text-box-provider.workflow'
export type { TextBox }

export type TextDetectionProvider = TextBoxExecutionProvider

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
