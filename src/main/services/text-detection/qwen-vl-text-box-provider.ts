import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'
import { getDatabase } from '../../db'

// Internal lightweight parsing helper to prevent static circular dependency with color-palette.service
function localParseTextBoxes(textBlocks: any[] | null | undefined): any[] {
  if (!textBlocks || !Array.isArray(textBlocks)) return []
  const results: any[] = []
  for (const block of textBlocks) {
    if (!block) continue
    
    // If block has "box" array [ymin, xmin, ymax, xmax]
    if (Array.isArray(block.box) && block.box.length === 4) {
      const box = block.box
      const ymin = Number(box[0] ?? 0)
      const xmin = Number(box[1] ?? 0)
      const ymax = Number(box[2] ?? 0)
      const xmax = Number(box[3] ?? 0)
      
      const isNormalized1000 = ymin > 1.1 || xmin > 1.1 || ymax > 1.1 || xmax > 1.1
      const scale = isNormalized1000 ? 1000 : 1
      
      const y = ymin / scale
      const x = xmin / scale
      const h = Math.max(0, ymax - ymin) / scale
      const w = Math.max(0, xmax - xmin) / scale
      
      results.push({ x, y, w, h, text: block.text || '' })
    } 
    // If block already has x, y, w, h properties
    else if (block.x !== undefined || block.left !== undefined) {
      results.push(block)
    }
  }
  return results
}

export class QwenVlTextBoxProvider implements ITextBoxProvider {
  public async detect(_imagePath: string, assetId?: string): Promise<TextBox[]> {
    if (!assetId) return []
    try {
      const db = getDatabase()
      const row = db.prepare('SELECT ai_analysis_json FROM assets WHERE id = ?').get(assetId) as { ai_analysis_json?: string } | undefined
      if (row && row.ai_analysis_json) {
        const analysis = JSON.parse(row.ai_analysis_json)
        if (analysis && Array.isArray(analysis.text_blocks)) {
          const parsed = localParseTextBoxes(analysis.text_blocks)
          return parsed.map((box: any) => {
            const w = box.w ?? box.width ?? 0
            const h = box.h ?? box.height ?? 0
            const x = box.x ?? 0
            const y = box.y ?? 0
            return {
              x,
              y,
              width: w,
              height: h,
              polygon: box.polygon ?? [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
              confidence: box.confidence ?? 0.95,
              text: box.text ?? ''
            }
          })
        }
      }
    } catch (e) {
      console.error('[QwenVlTextBoxProvider] Failed to fetch Qwen-VL text blocks from DB:', e)
    }
    return []
  }
}
