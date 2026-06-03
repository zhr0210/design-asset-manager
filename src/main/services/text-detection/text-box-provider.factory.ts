import { ITextBoxProvider, TextBoxProviderConfig } from './text-box-provider.types'
import { EasyOcrColorTextBoxProvider } from './easyocr-text-box-provider'
import { RapidOcrTextBoxProvider } from './rapidocr-text-box-provider'
import { PaddleOcrColorTextBoxProvider } from './paddleocr-text-box-provider'
import { QwenVlTextBoxProvider } from './qwen-vl-text-box-provider'
import { MockTextBoxProvider } from './mock-text-box-provider'
import { NoneTextBoxProvider } from './none-text-box-provider'

export class TextBoxProviderFactory {
  public static createProvider(config: TextBoxProviderConfig): ITextBoxProvider {
    const providerType = config.provider

    switch (providerType) {
      case 'easyocr_detection':
        return new EasyOcrColorTextBoxProvider({
          timeoutMs: config.timeoutMs,
          minConfidence: config.minConfidence,
          maxTextBoxes: config.maxTextBoxes
        })
      case 'rapidocr_detection':
        return new RapidOcrTextBoxProvider({
          timeoutMs: config.timeoutMs,
          minConfidence: config.minConfidence,
          maxTextBoxes: config.maxTextBoxes
        })
      case 'paddleocr_detection':
        return new PaddleOcrColorTextBoxProvider({
          timeoutMs: config.timeoutMs,
          minConfidence: config.minConfidence,
          maxTextBoxes: config.maxTextBoxes
        })
      case 'qwen_vl_text_blocks':
        return new QwenVlTextBoxProvider()
      case 'mock_text_boxes':
        return new MockTextBoxProvider({
          minConfidence: config.minConfidence,
          maxTextBoxes: config.maxTextBoxes
        })
      case 'none':
      default:
        return new NoneTextBoxProvider()
    }
  }
}
