export interface VisualAnalysisTextBackground {
  hex: string
  sourceCount: number
  sourceCountLabel: string
}

export interface VisualAnalysisThemePill {
  code: string
  label: string
  className: string
}

export interface VisualAnalysisDominantColor {
  hex: string
  family: string
  rgbLabel: string
}

export interface VisualAnalysisImageSwatch {
  hex: string
  rgb: ColorTriplet
  hsl: ColorTriplet
  percentage: number
  percentageLabel: string
  role: string
  roleLabel: string
  family: string
  isDark: boolean
  textColor: string
  rgbValueLabel: string
  rgbCopyValue: string
  hslValueLabel: string
  hslCopyValue: string
  cssVariable: string
  contrastLabel?: string
  confidenceLabel?: string
  textBoxesLabel?: string
}

export type VisualAnalysisTextColorState = 'none' | 'skipped' | 'failed' | 'success'

export interface VisualAnalysisTextForegroundSwatch extends VisualAnalysisImageSwatch {}

export interface VisualAnalysisTextColorPanel {
  state: VisualAnalysisTextColorState
  message: string
  warnings: string[]
  showTextPalette: boolean
  foregroundSwatches: VisualAnalysisTextForegroundSwatch[]
  background: VisualAnalysisTextBackground | null
  provider: string
  durationMs: number
  detectedTextBoxCount: number
  durationMsLabel: string
  detectedTextBoxCountLabel: string
}

export interface VisualAnalysisTextInsightSummary {
  hasOcrText: boolean
  ocrTextLength: number
  ocrSource: string
  ocrUpdatedAt: string
  textBoxCount: number
  processedTextBoxCount: number
  readabilityAverage: number | null
  readabilityLabel: string
  shouldShow: boolean
  ocrTextLengthLabel: string
  textBoxRatioLabel: string
}

export interface VisualAnalysisSnapshot {
  hasPalette: boolean
  imagePalette: PersistedImagePalette | null
  textPalette: PersistedTextPalette | null
  themes: PersistedColorThemes | null
  imageSwatches: PersistedColorSwatch[]
  imageSwatchesForDisplay: VisualAnalysisImageSwatch[]
  themePills: VisualAnalysisThemePill[]
  dominantColor: VisualAnalysisDominantColor | null
  textSwatches: PersistedColorSwatch[]
  textForegrounds: PersistedColorSwatch[]
  textBackground: VisualAnalysisTextBackground | null
  textStatus: string
  textProvider: string
  textDurationMs: number
  detectedTextBoxCount: number
  isTextSuccess: boolean
  textColorPanel: VisualAnalysisTextColorPanel
  textInsightSummary: VisualAnalysisTextInsightSummary
}

export function parseVisualAnalysisPalette(input: unknown): PersistedColorPalettePayload | null {
  if (!input) return null
  if (isRecord(input)) return input
  if (typeof input !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(input)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function createVisualAnalysisSnapshot(input: {
  colorPaletteJson?: unknown
  ocrText?: string | null
  ocrSource?: string | null
  ocrUpdatedAt?: string | null
}): VisualAnalysisSnapshot {
  const palette = parseVisualAnalysisPalette(input.colorPaletteJson)
  const imagePalette = palette?.image_palette ?? null
  const textPalette = palette?.text_palette ?? null
  const imageSwatches = swatchArrayOrEmpty(imagePalette?.colors ?? imagePalette?.swatches)
  const textSwatches = swatchArrayOrEmpty(textPalette?.colors ?? textPalette?.swatches)
  const textBackground = projectTextBackground(textPalette, textSwatches)
  const textStatus = stringOrFallback(textPalette?.status || textPalette?.textColorStatus, 'none')
  const textProvider = stringOrFallback(textPalette?.provider, 'unknown')
  const textDurationMs = finiteNumberOrFallback(textPalette?.duration_ms, 180)
  const detectedTextBoxCount = finiteNumberOrFallback(textPalette?.detected_text_box_count, 0)
  const textForegrounds = textSwatches.filter((swatch) => swatch.role !== 'text_background')
  const isTextSuccess = textPalette?.status === 'success' || textPalette?.textColorStatus === 'success' || textStatus === 'completed'

  return {
    hasPalette: Boolean(palette),
    imagePalette,
    textPalette,
    themes: imagePalette?.themes ?? null,
    imageSwatches,
    imageSwatchesForDisplay: imageSwatches.map(projectImageSwatch),
    themePills: projectThemePills(imagePalette?.themes),
    dominantColor: projectDominantColor(imagePalette?.dominant),
    textSwatches,
    textForegrounds,
    textBackground,
    textStatus,
    textProvider,
    textDurationMs,
    detectedTextBoxCount,
    isTextSuccess,
    textColorPanel: projectTextColorPanel({
      textPalette,
      textStatus,
      textForegrounds,
      textBackground,
      textProvider,
      textDurationMs,
      detectedTextBoxCount,
      isTextSuccess
    }),
    textInsightSummary: projectTextInsightSummary({
      textPalette,
      ocrText: input.ocrText,
      ocrSource: input.ocrSource,
      ocrUpdatedAt: input.ocrUpdatedAt
    })
  }
}

function projectThemePills(themes?: PersistedColorThemes): VisualAnalysisThemePill[] {
  if (!themes) return []

  const pillDefinitions: Array<[string, string, string, boolean]> = [
    ['warm', '暖色调', 'bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20', Boolean(themes.isWarm)],
    ['cool', '冷色调', 'bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20', Boolean(themes.isCool)],
    ['neutral', '中性色', 'bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20', Boolean(themes.isNeutral)],
    ['high_saturation', '高饱和', 'bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20', Boolean(themes.isHighSaturation)],
    ['low_saturation', '低饱和', 'bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20', Boolean(themes.isLowSaturation)],
    ['black_gold', '黑金配色', 'bg-yellow-600/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20', Boolean(themes.hasBlackGold)],
    ['blue_purple_gradient', '蓝紫渐变', 'bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20', Boolean(themes.hasBluePurpleGradient)],
    ['red_orange_tone', '红橙色调', 'bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20', Boolean(themes.hasRedOrangeTone)],
    ['dark_background', '深色背景', 'bg-black/30 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800', themes.backgroundType === 'dark'],
    ['light_background', '浅色背景', 'bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/10', themes.backgroundType === 'light']
  ]

  return pillDefinitions
    .filter(([, , , enabled]) => enabled)
    .map(([code, label, className]) => ({ code, label, className }))
}

function projectDominantColor(dominant?: PersistedColorSwatch): VisualAnalysisDominantColor | null {
  if (!dominant?.hex) return null
  return {
    hex: dominant.hex,
    family: dominant.family || '未知',
    rgbLabel: Array.isArray(dominant.rgb) ? dominant.rgb.join(', ') : ''
  }
}

function projectImageSwatch(color: PersistedColorSwatch): VisualAnalysisImageSwatch {
  return projectSwatchDisplay(color, color.percentage ?? 10)
}

function projectTextColorPanel(input: {
  textPalette: PersistedTextPalette | null
  textStatus: string
  textForegrounds: PersistedColorSwatch[]
  textBackground: VisualAnalysisTextBackground | null
  textProvider: string
  textDurationMs: number
  detectedTextBoxCount: number
  isTextSuccess: boolean
}): VisualAnalysisTextColorPanel {
  const warnings = arrayOrEmpty(input.textPalette?.warnings).map((warning) => String(warning))
  const durationMsLabel = `${input.textDurationMs}ms`
  const detectedTextBoxCountLabel = `${input.detectedTextBoxCount} 框`

  if (input.textStatus === 'skipped') {
    return {
      state: 'skipped',
      message: projectTextSkipMessage(input.textPalette?.skipReason),
      warnings,
      showTextPalette: false,
      foregroundSwatches: [],
      background: input.textBackground,
      provider: input.textProvider,
      durationMs: input.textDurationMs,
      detectedTextBoxCount: input.detectedTextBoxCount,
      durationMsLabel,
      detectedTextBoxCountLabel
    }
  }

  if (input.textStatus === 'failed') {
    return {
      state: 'failed',
      message: '文字颜色分析失败',
      warnings,
      showTextPalette: false,
      foregroundSwatches: [],
      background: input.textBackground,
      provider: input.textProvider,
      durationMs: input.textDurationMs,
      detectedTextBoxCount: input.detectedTextBoxCount,
      durationMsLabel,
      detectedTextBoxCountLabel
    }
  }

  const foregroundSwatches = input.textForegrounds.map(projectTextForegroundSwatch)
  const showTextPalette = input.isTextSuccess && foregroundSwatches.length > 0 && !input.textPalette?.isMock

  return {
    state: showTextPalette ? 'success' : 'none',
    message: showTextPalette ? '文字设计配色' : '',
    warnings,
    showTextPalette,
    foregroundSwatches,
    background: input.textBackground,
    provider: input.textProvider,
    durationMs: input.textDurationMs,
    detectedTextBoxCount: input.detectedTextBoxCount,
    durationMsLabel,
    detectedTextBoxCountLabel
  }
}

function projectTextSkipMessage(skipReason?: string): string {
  switch (skipReason) {
    case 'paddleocr_not_installed':
      return '文字颜色分析已跳过：PaddleOCR 未安装'
    case 'rapidocr_not_installed':
      return '文字颜色分析已跳过：RapidOCR 未安装'
    case 'disabled_by_user':
    case 'provider_none':
      return '文字颜色分析已关闭'
    case 'no_text_detected':
      return '文字颜色分析已跳过：未检测到任何文字'
    default:
      return '文字颜色分析已跳过'
  }
}

function projectTextForegroundSwatch(color: PersistedColorSwatch): VisualAnalysisTextForegroundSwatch {
  const percentage = color.percentage
    ?? Math.round((typeof color.confidence === 'number' ? color.confidence : 0) * 100)
  return projectSwatchDisplay(color, percentage)
}

function projectSwatchDisplay(color: PersistedColorSwatch, percentageInput: unknown): VisualAnalysisImageSwatch {
  const rgb = normalizeColorTriplet(color.rgb)
  const hsl = normalizeColorTriplet(color.hsl)
  const percentage = normalizePercentage(percentageInput)
  const role = typeof color.role === 'string' && color.role ? color.role : 'swatch'
  const lightness = hsl[2]
  const contrastWhite = finiteNumberOrNull(color.contrastWhite)
  const contrastBlack = finiteNumberOrNull(color.contrastBlack)
  const confidence = finiteNumberOrNull(color.confidence)
  const sourceBoxes = finiteNumberOrNull(color.from_boxes ?? color.fromBoxes ?? color.sourceCount)
  const hex = typeof color.hex === 'string' ? color.hex : '#000000'

  return {
    hex,
    rgb,
    hsl,
    percentage,
    percentageLabel: `${percentage}%`,
    role,
    roleLabel: projectSwatchRoleLabel(role),
    family: typeof color.family === 'string' ? color.family : '',
    isDark: lightness < 45,
    textColor: lightness > 50 ? '#000000' : '#FFFFFF',
    rgbValueLabel: rgb.join(', '),
    rgbCopyValue: `rgb(${rgb.join(', ')})`,
    hslValueLabel: `${hsl[0]}°, ${hsl[1]}%, ${hsl[2]}%`,
    hslCopyValue: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
    cssVariable: `--color-${role}: ${hex};`,
    contrastLabel: contrastWhite !== null && contrastBlack !== null
      ? `${contrastWhite}:${contrastBlack}`
      : undefined,
    confidenceLabel: confidence === null
      ? undefined
      : `${normalizePercentage(confidence * 100)}%`,
    textBoxesLabel: sourceBoxes === null ? undefined : `${Math.max(0, Math.round(sourceBoxes))} 个`
  }
}

function projectSwatchRoleLabel(role: string): string {
  switch (role) {
    case 'background':
      return '主背景色'
    case 'primary':
      return '主色调'
    case 'secondary':
      return '辅助色'
    case 'accent':
      return '点缀色'
    default:
      return '配色'
  }
}

function normalizeColorTriplet(value: unknown): ColorTriplet {
  if (!Array.isArray(value)) return [0, 0, 0]
  return [0, 1, 2].map((index) => {
    const number = Number(value[index])
    return Number.isFinite(number) ? number : 0
  }) as ColorTriplet
}

function normalizePercentage(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function projectTextInsightSummary(input: {
  textPalette: PersistedTextPalette | null
  ocrText?: string | null
  ocrSource?: string | null
  ocrUpdatedAt?: string | null
}): VisualAnalysisTextInsightSummary {
  const ocrText = typeof input.ocrText === 'string' ? input.ocrText.trim() : ''
  const textBoxes = textBoxArrayOrEmpty(input.textPalette?.text_boxes ?? input.textPalette?.textBoxes)
  const textBoxCount = Number(input.textPalette?.detected_text_box_count ?? textBoxes.length ?? 0)
  const processedTextBoxCount = Number(input.textPalette?.processed_text_box_count ?? textBoxCount)
  const readabilityAverage = projectReadabilityAverage(input.textPalette, textBoxes)
  const hasOcrText = ocrText.length > 0

  const finalTextBoxCount = Number.isFinite(textBoxCount) ? textBoxCount : 0
  const finalProcessedTextBoxCount = Number.isFinite(processedTextBoxCount) ? processedTextBoxCount : 0

  return {
    hasOcrText,
    ocrTextLength: ocrText.length,
    ocrSource: input.ocrSource || input.textPalette?.provider || 'unknown',
    ocrUpdatedAt: input.ocrUpdatedAt || '',
    textBoxCount: finalTextBoxCount,
    processedTextBoxCount: finalProcessedTextBoxCount,
    readabilityAverage,
    readabilityLabel: readabilityAverage === null ? '证据不足' : `${Math.round(readabilityAverage * 100)}%`,
    shouldShow: hasOcrText || finalTextBoxCount > 0 || readabilityAverage !== null,
    ocrTextLengthLabel: hasOcrText ? `${ocrText.length} 字符` : '无',
    textBoxRatioLabel: `${finalTextBoxCount} / ${finalProcessedTextBoxCount}`
  }
}

function projectReadabilityAverage(
  textPalette: PersistedTextPalette | null,
  textBoxes: PersistedTextBox[]
): number | null {
  const direct = textPalette?.readabilityAverage ?? textPalette?.readability_average
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return Math.max(0, Math.min(1, direct))
  }

  const scores = textBoxes
    .map((box) => box?.readability_score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (scores.length === 0) return null

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return Math.max(0, Math.min(1, average))
}

function projectTextBackground(
  textPalette: PersistedTextPalette | null,
  textSwatches: PersistedColorSwatch[]
): VisualAnalysisTextBackground | null {
  const textBgSwatch = textSwatches.find((swatch) => swatch.role === 'text_background')
  if (textBgSwatch?.hex) {
    const sourceCount = finiteNumberOrFallback(
      textBgSwatch.from_boxes ?? textBgSwatch.fromBoxes ?? textBgSwatch.sourceCount,
      1
    )
    return {
      hex: textBgSwatch.hex,
      sourceCount,
      sourceCountLabel: `分析自 ${sourceCount} 个提取的文字框`
    }
  }

  const backgroundColors = stringArrayOrEmpty(textPalette?.background_colors)
  if (backgroundColors[0]) {
    const sourceCount = finiteNumberOrFallback(textPalette?.processed_text_box_count, 1)
    return {
      hex: backgroundColors[0],
      sourceCount,
      sourceCountLabel: `分析自 ${sourceCount} 个提取的文字框`
    }
  }

  return null
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function swatchArrayOrEmpty(value: unknown): PersistedColorSwatch[] {
  return arrayOrEmpty(value).filter(isRecord)
}

function textBoxArrayOrEmpty(value: unknown): PersistedTextBox[] {
  return arrayOrEmpty(value).filter(isRecord)
}

function stringArrayOrEmpty(value: unknown): string[] {
  return arrayOrEmpty(value).filter((item): item is string => typeof item === 'string')
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback
}

function finiteNumberOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
import type {
  ColorTriplet,
  PersistedColorPalettePayload,
  PersistedColorSwatch,
  PersistedColorThemes,
  PersistedImagePalette,
  PersistedTextBox,
  PersistedTextPalette
} from '../types/color-palette.types'
