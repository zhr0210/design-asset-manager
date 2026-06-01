import { TextBox, ColorExtractionResult } from '../types/color-palette.types'

/**
 * 🎨 图像色彩提取及文本框分析通信契约 (Shared Color Palette IPC Contracts)
 */

export const CHANNEL_COLOR_EXTRACT_PALETTE = 'assets:extract-palette'
export const CHANNEL_COLOR_TRIGGER_EXTRACT_SAVE = 'assets:trigger-extract-save'

// DTOs
export interface ExtractColorPaletteRequest {
  filePath: string
  textBoxes?: TextBox[]
}

export interface ExtractColorPaletteResponse {
  success: boolean
  result?: ColorExtractionResult
  error?: string
}

export interface TriggerExtractSaveRequest {
  assetId: string
  filePath: string
}

export interface TriggerExtractSaveResponse {
  success: boolean
  dominantColor?: string
  palette?: string[]
  error?: string
}
