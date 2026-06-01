import type { TextBox, TextDetectionProvider, TextBoxProviderConfig, TextBoxProviderResult } from './text-detection/text-box-provider.types'
import { TextBoxProviderFactory } from './text-detection/text-box-provider.factory'

export type { TextBox, TextDetectionProvider, TextBoxProviderConfig, TextBoxProviderResult }

export class TextBoxProvider {
  private config: TextBoxProviderConfig

  constructor(config?: Partial<TextBoxProviderConfig>) {
    this.config = {
      provider: 'none', // Align to standard default provider of none
      timeoutMs: 3000,
      maxTextBoxes: 30,
      minConfidence: 0.5,
      ...config
    }
  }

  /**
   * Main text box detection orchestrator.
   * Scans image for text bounding box coordinates using configured provider.
   */
  public async detectTextBoxes(imagePath: string, assetId?: string): Promise<TextBoxProviderResult> {
    const providerType = this.config.provider
    console.log(`[TextBoxProvider] Orchestrating text box detection via provider: ${providerType} for ${imagePath}`)

    const warnings: string[] = []
    
    try {
      const activeProvider = TextBoxProviderFactory.createProvider(this.config)
      const boxes = await activeProvider.detect(imagePath, assetId)
      
      const isMock = providerType === 'mock_text_boxes'
      
      return {
        provider: providerType,
        boxes,
        isMock,
        warnings
      }
    } catch (err) {
      console.error(`[TextBoxProvider] Error during text detection:`, err)
      warnings.push(`Detection failed: ${String(err)}`)
      return {
        provider: providerType,
        boxes: [],
        isMock: false,
        warnings
      }
    }
  }
}
