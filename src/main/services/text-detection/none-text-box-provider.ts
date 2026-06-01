import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'

export class NoneTextBoxProvider implements ITextBoxProvider {
  public async detect(_imagePath: string, _assetId?: string): Promise<TextBox[]> {
    return []
  }
}
