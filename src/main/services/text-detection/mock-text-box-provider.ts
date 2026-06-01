import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'

export class MockTextBoxProvider implements ITextBoxProvider {
  private config: { minConfidence: number; maxTextBoxes: number }

  constructor(config: { minConfidence: number; maxTextBoxes: number }) {
    this.config = config
  }

  public async detect(imagePath: string, _assetId?: string): Promise<TextBox[]> {
    // Check if running in development or test environment
    let isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    try {
      const electron = await import('electron')
      if (electron && electron.app) {
        isDev = !electron.app.isPackaged || process.env.NODE_ENV === 'development'
      }
    } catch (e) {
      // outside Electron environment (e.g. standard Node.js test runner)
    }

    if (!isDev) {
      console.warn('[MockTextBoxProvider] Security Guard triggered: Mock text box provider is forbidden in production environment!')
      return []
    }

    console.log('[MockTextBoxProvider] Generating realistic mock text boxes for development/testing.')

    const allBoxes: TextBox[] = [
      {
        x: 0.1,
        y: 0.15,
        width: 0.5,
        height: 0.08,
        polygon: [[0.1, 0.15], [0.6, 0.15], [0.6, 0.23], [0.1, 0.23]],
        confidence: 0.92,
        text: 'PROMOTIONAL HEADER'
      },
      {
        x: 0.1,
        y: 0.25,
        width: 0.35,
        height: 0.05,
        polygon: [[0.1, 0.25], [0.45, 0.25], [0.45, 0.30], [0.1, 0.30]],
        confidence: 0.88,
        text: 'Sub title details'
      }
    ]

    return allBoxes
      .filter(b => b.confidence >= this.config.minConfidence)
      .slice(0, this.config.maxTextBoxes)
  }
}
