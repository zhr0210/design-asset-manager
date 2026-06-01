/**
 * 🎨 共享色卡与色彩分析数据模型 (Shared Color Palette Types)
 */

export interface TextBox {
  x: number
  y: number
  width: number
  height: number
  polygon?: [number, number][]           // 二维多边形坐标对 [[x,y], [x,y], ...]
  confidence: number
  text?: string                          // 识别出来的文字内容
  color?: string | null                  // 文本前景色 (Hex Code)
  background_color?: string | null       // 文本背景色 (Hex Code)
  readability_score?: number             // 可读性对比度评分
  box?: [number, number, number, number] // Legacy: Bounding box [ymin, xmin, ymax, xmax] 或 [x, y, w, h]
}

export interface ExtractedColor {
  hex: string                            // 十六进制颜色代码 (e.g. #FF5733)
  ratio: number                          // 占比比例 (0.0 到 1.0)
  rgb: [number, number, number]          // RGB 数值分量
  family?: string                        // 归属的色系名称 (如 红色, 蓝色)
}

export interface ColorExtractionResult {
  dominantColor: string                  // 图像主导色 Hex Code
  palette: string[]                      // 提取出的主色卡色值 Hex Code 列表
  extractedColors: ExtractedColor[]      // 包含占比细节的色彩列表
  textBoxes?: TextBox[]                  // 包含色彩与背景可读性分析的文本框体
  readabilityAverage?: number            // 整体排版可读性平均值
}
