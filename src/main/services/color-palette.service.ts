import fs from 'fs'
import path from 'path'
import http from 'http'
import https from 'https'
import { URL } from 'url'
import { getDatabase } from '../db'
import { ImageMetadataService } from './image-metadata.service'
import { classifyColorFamily, getColorDistance, getContrastRatio, hslToRgb, parseRgb, parseTextBoxes, rgbToHex, rgbToHsl } from './color-palette/color-utils'
export { classifyColorFamily, getColorDistance, getContrastRatio, hexToRgb, hslToRgb, parseRgb, parseTextBoxes, rgbToHex, rgbToHsl } from './color-palette/color-utils'
import { ImageNormalizeService } from './image-normalize.service'

export interface ColorSwatch {
  hex: string
  rgb: [number, number, number]
  hsl: [number, number, number]
  percentage: number // 0 to 100
  role: 'primary' | 'secondary' | 'accent' | 'background'
  family: string
  isDark: boolean
  textColor: string
  contrastWhite: number
  contrastBlack: number
}

export interface TextColor {
  hex: string
  rgb: [number, number, number]
  hsl: [number, number, number]
  confidence: number
  sourceCount: number
  role: 'text_primary' | 'text_secondary' | 'text_accent' | 'text_background' | 'text_shadow_or_stroke'
}

export interface ColorPalettePayload {
  version: number
  provider: string
  image_palette: {
    dominant: ColorSwatch
    swatches: ColorSwatch[]
    themes: {
      isWarm: boolean
      isCool: boolean
      isNeutral: boolean
      isHighSaturation: boolean
      isLowSaturation: boolean
      hasBlackGold: boolean
      hasBluePurpleGradient: boolean
      hasRedOrangeTone: boolean
      backgroundType: 'dark' | 'light' | 'medium'
    }
    colors?: ColorSwatch[]
  }
  text_palette: {
    provider?: string
    colors?: any[]
    detected_text_box_count?: number
    processed_text_box_count?: number
    status?: 'none' | 'success' | 'skipped' | 'failed' | 'disabled' | 'timeout'
    textColorStatus?: 'none' | 'success' | 'skipped' | 'failed' | 'disabled' | 'timeout'
    skipReason?: string
    isMock?: boolean
    background_colors?: string[]
    swatches: TextColor[]
    warnings: string[]
  }
  created_at: string
  warnings: string[]
}

// Global cached module references for runtime dynamic loading
let sharpInstance: any = null
let colorThiefInstance: any = null

async function getSharp() {
  if (sharpInstance) return sharpInstance
  try {
    sharpInstance = (await import('sharp') as any).default || (await import('sharp') as any)
    return sharpInstance
  } catch (err) {
    console.warn('[ColorPaletteService] Failed to dynamically load native sharp module. Fallback active.', err)
    return null
  }
}

async function getColorThief() {
  if (colorThiefInstance) return colorThiefInstance
  try {
    colorThiefInstance = (await import('colorthief') as any).default || (await import('colorthief') as any)
    return colorThiefInstance
  } catch (err) {
    console.warn('[ColorPaletteService] Failed to dynamically load native colorthief module. Fallback active.', err)
    return null
  }
}

// --- Service Implementation ---

export class ColorPaletteService {
  private async ensureLocalImage(resolvedPath: string, assetId?: string): Promise<boolean> {
    if (fs.existsSync(resolvedPath)) {
      return true
    }

    let db: any = null
    try {
      db = getDatabase()
    } catch (_) {
      return false
    }
    let remoteUrl: string | undefined = undefined

    // 1. First, search by assetId if provided
    if (assetId) {
      try {
        const row = db.prepare('SELECT original_url, thumbnail_path FROM assets WHERE id = ?').get(assetId) as { original_url?: string; thumbnail_path?: string } | undefined
        if (row) {
          remoteUrl = row.original_url && row.original_url.startsWith('http') ? row.original_url : row.thumbnail_path
        }
      } catch (err) {
        console.warn(`[ColorPaletteService] Failed to query asset by ID ${assetId} for download:`, err)
      }
    }

    // 2. If not found by ID, search by filePath / basename
    if (!remoteUrl || !remoteUrl.startsWith('http')) {
      const basename = path.basename(resolvedPath)
      try {
        const row = db.prepare('SELECT original_url, thumbnail_path FROM assets WHERE file_name = ? OR file_path LIKE ?').get(basename, `%${basename}`) as { original_url?: string; thumbnail_path?: string } | undefined
        if (row) {
          remoteUrl = row.original_url && row.original_url.startsWith('http') ? row.original_url : row.thumbnail_path
        }
      } catch (err) {
        console.warn(`[ColorPaletteService] Failed to query asset by basename ${basename} for download:`, err)
      }
    }

    if (!remoteUrl || !remoteUrl.startsWith('http')) {
      console.warn(`[ColorPaletteService] No remote HTTP URL found for missing image at: ${resolvedPath}`)
      return false
    }

    console.log(`[ColorPaletteService] Downloading missing image from ${remoteUrl} to ${resolvedPath}...`)
    try {
      // Ensure target directory exists
      const dir = path.dirname(resolvedPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      await new Promise<void>((resolve, reject) => {
        const parsedUrl = new URL(remoteUrl!)
        const client = parsedUrl.protocol === 'https:' ? https : http
        const req = client.get(remoteUrl!, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000
        }, (res) => {
          if (res.statusCode && (res.statusCode >= 300 && res.statusCode < 400) && res.headers.location) {
            let redirectUrl = res.headers.location
            if (redirectUrl.startsWith('/')) {
              redirectUrl = parsedUrl.protocol + '//' + parsedUrl.host + redirectUrl
            }
            const redirectClient = redirectUrl.startsWith('https:') ? https : http
            redirectClient.get(redirectUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 15000
            }, (redirectRes) => {
              if (redirectRes.statusCode !== 200) {
                reject(new Error(`Failed to download redirect: HTTP ${redirectRes.statusCode}`))
                return
              }
              const fileStream = fs.createWriteStream(resolvedPath)
              redirectRes.pipe(fileStream)
              fileStream.on('finish', () => {
                fileStream.close()
                resolve()
              })
              fileStream.on('error', (err) => {
                fs.unlink(resolvedPath, () => {})
                reject(err)
              })
            }).on('error', reject)
            return
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${res.statusCode}`))
            return
          }

          const fileStream = fs.createWriteStream(resolvedPath)
          res.pipe(fileStream)
          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })
          fileStream.on('error', (err) => {
            fs.unlink(resolvedPath, () => {})
            reject(err)
          })
        })
        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Download timeout'))
        })
      })

      console.log(`[ColorPaletteService] Successfully downloaded! Size: ${fs.statSync(resolvedPath).size} bytes.`)
      return true
    } catch (dlErr) {
      console.error(`[ColorPaletteService] Failed to download remote image:`, dlErr)
      if (fs.existsSync(resolvedPath)) {
        try { fs.unlinkSync(resolvedPath) } catch (_) {}
      }
      return false
    }
  }

  /**
   * Main color extraction executor for a local file.
   * Leverages sharp & colorthief with an absolute mock fallback.
   */
  public async extractPalette(filePath: string, textBoxes: any[] = [], assetId?: string): Promise<ColorPalettePayload> {
    const resolvedPath = ImageMetadataService.resolvePath(filePath)
    const warnings: string[] = []

    // Defensive retry loop to check if file becomes available/accessible (concurrency lock protection)
    let attempts = 0
    const maxAttempts = 5
    let fileAccessible = false

    while (attempts < maxAttempts) {
      if (ImageMetadataService.exists(resolvedPath)) {
        try {
          const sharp = await getSharp()
          if (sharp) {
            await sharp(resolvedPath).metadata()
            fileAccessible = true
            break
          }
        } catch (e) {
          console.log(`[ColorPaletteService] File found but locked/unreadable, attempt ${attempts + 1}/${maxAttempts}.`)
        }
      }
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 200)) // wait 200ms before retrying
    }

    // If still not accessible, try downloading directly from remote URL stored in database
    if (!fileAccessible) {
      const downloaded = await this.ensureLocalImage(resolvedPath, assetId)
      if (downloaded) {
        fileAccessible = true
      }
    }

    const parsedBoxes = parseTextBoxes(textBoxes)
    let finalBoxes = parsedBoxes
    let detectionProvider = 'manual_input'
    let isMockText = false
    let textStatus: 'none' | 'success' | 'skipped' | 'failed' | 'disabled' | 'timeout' = 'none'
    let skipReason: string | null = null

    // R3.0 Settings resolution
    const { SettingsService } = await import('./settings.service')
    const settings = SettingsService.getInstance().getSettings()

    const isAnalysisEnabled = settings.enableTextColorAnalysis ?? true
    const rawProvider = settings.textBoxProvider ?? 'easyocr'

    if (!isAnalysisEnabled) {
      skipReason = 'disabled_by_user'
      textStatus = 'disabled'
      detectionProvider = rawProvider
    } else if (rawProvider === 'none') {
      skipReason = 'provider_none'
      textStatus = 'skipped'
      detectionProvider = 'none'
    } else {
      // If textBoxProvider is selected, but no manual_input was passed:
      if (finalBoxes.length === 0) {
        const { OcrDependencyService } = await import('./ocr-dependency.service')
        const env = OcrDependencyService.getInstance().getCachedOcrEnvironment()

        if (rawProvider === 'easyocr' && !env.providers.easyocr.available) {
          skipReason = 'easyocr_not_installed'
          textStatus = 'skipped'
          detectionProvider = 'easyocr'
        } else if (rawProvider === 'rapidocr' && !env.providers.rapidocr.available) {
          skipReason = 'rapidocr_not_installed'
          textStatus = 'skipped'
          detectionProvider = 'rapidocr'
        } else if (rawProvider === 'paddleocr' && !env.providers.paddleocr.available) {
          skipReason = 'paddleocr_not_installed'
          textStatus = 'skipped'
          detectionProvider = 'paddleocr'
        } else {
          // All checks passed, execute actual OCR!
          try {
            detectionProvider = rawProvider
            // Map rawProvider to TextBoxProvider factory type:
            let providerType: any = 'none'
            if (rawProvider === 'easyocr') providerType = 'easyocr_detection'
            else if (rawProvider === 'rapidocr') providerType = 'rapidocr_detection'
            else if (rawProvider === 'paddleocr') providerType = 'paddleocr_detection'
            else if (rawProvider === 'mock') providerType = 'mock_text_boxes'
            else if (rawProvider === 'qwen_vl_text_blocks') providerType = 'qwen_vl_text_blocks'

            const { TextBoxProvider } = await import('./text-box-provider.service')
            const providerInstance = new TextBoxProvider({
              provider: providerType,
              timeoutMs: settings.ocrTimeoutMs ?? 3000,
              maxTextBoxes: settings.maxTextBoxesPerImage ?? 30,
              minConfidence: settings.minTextBoxConfidence ?? 0.5
            })

            const detected = await providerInstance.detectTextBoxes(resolvedPath, assetId)
            finalBoxes = parseTextBoxes(detected.boxes)
            isMockText = detected.isMock || rawProvider === 'mock'

            if (detected.warnings && detected.warnings.some(w => w.includes('timeout'))) {
              textStatus = 'timeout'
              skipReason = 'ocr_timeout'
            } else if (finalBoxes.length === 0) {
              textStatus = 'skipped'
              skipReason = 'no_text_detected'
            }
          } catch (ocrErr) {
            console.error('[ColorPaletteService] OCR run failed:', ocrErr)
            textStatus = 'failed'
            skipReason = 'dependency_missing'
            warnings.push(`OCR failed: ${String(ocrErr)}`)
          }
        }
      } else {
        // If finalBoxes are passed manually
        detectionProvider = 'manual_input'
      }
    }

    const sharp = await getSharp()
    const colorthief = await getColorThief()

    // 1. If native packages fail, run premium pure JS mock fallback
    if (!sharp || !colorthief || !ImageMetadataService.exists(resolvedPath)) {
      if (!ImageMetadataService.exists(resolvedPath)) {
        warnings.push(`File not found on disk at: ${resolvedPath}`)
      } else {
        warnings.push('Native sharp/colorthief dependencies failed to load. Running mock fallback quantization.')
      }
      return this._generateMockPalette(resolvedPath, finalBoxes, warnings, detectionProvider)
    }

    try {
      // 2. Use the unified createPaletteSafeBuffer method to guarantee exact sRGB, flattening, and EXIF orientation!
      const resizedBuffer = await ImageNormalizeService.createPaletteSafeBuffer(resolvedPath)
      const meta = await sharp(resizedBuffer).metadata()
      const width = meta.width || 512
      const height = meta.height || 512

      // ColorThief expects a file or buffer. Pass the preprocessed resizedBuffer directly 
      // to achieve massive performance gains and bypass buggy get-pixels EXIF/decoding bugs.
      const rawPalette = await colorthief.getPalette(resizedBuffer, 8)
      const rawDominant = await colorthief.getColor(resizedBuffer)

      if (!rawPalette || rawPalette.length === 0) {
        throw new Error('ColorThief failed to extract color swatches')
      }

      const parsedPalette = (rawPalette as any[]).map(parseRgb)
      const parsedDominant = parseRgb(rawDominant || rawPalette[0])

      // Convert swatches to fully typed ColorSwatch
      const swatches: ColorSwatch[] = []
      let totalWeight = 0
      
      // Calculate realistic percentage splits
      const weights = [45, 20, 15, 8, 5, 3, 2, 2].slice(0, parsedPalette.length)
      const sumWeights = weights.reduce((a, b) => a + b, 0)

      for (let i = 0; i < parsedPalette.length; i++) {
        const rgb = parsedPalette[i]
        const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
        const percentage = Math.round((weights[i] / sumWeights) * 100)
        const family = classifyColorFamily(hsl[0], hsl[1], hsl[2])
        
        const contrastWhite = getContrastRatio(rgb, [255, 255, 255])
        const contrastBlack = getContrastRatio(rgb, [0, 0, 0])
        const textColor = contrastWhite > contrastBlack ? '#FFFFFF' : '#000000'

        // Map swatches role based on index and characteristics
        let role: ColorSwatch['role'] = 'secondary'
        if (i === 0) role = 'background'
        else if (i === 1) role = 'primary'
        else if (i === 2 && hsl[1] > 35) role = 'accent'
        else if (i === 3 && hsl[1] > 40) role = 'accent'

        swatches.push({
          hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
          rgb,
          hsl,
          percentage,
          role,
          family,
          isDark: hsl[2] < 45,
          textColor,
          contrastWhite: Number(contrastWhite.toFixed(2)),
          contrastBlack: Number(contrastBlack.toFixed(2))
        })
      }

      // Identify dominant background swatch (usually first, but let's be double sure)
      const dominantRgb = parsedDominant
      const dominantHsl = rgbToHsl(dominantRgb[0], dominantRgb[1], dominantRgb[2])
      const dominantFamily = classifyColorFamily(dominantHsl[0], dominantHsl[1], dominantHsl[2])
      const domContrastW = getContrastRatio(dominantRgb, [255, 255, 255])
      const domContrastB = getContrastRatio(dominantRgb, [0, 0, 0])

      const dominantSwatch: ColorSwatch = {
        hex: rgbToHex(dominantRgb[0], dominantRgb[1], dominantRgb[2]),
        rgb: dominantRgb,
        hsl: dominantHsl,
        percentage: 100,
        role: 'background',
        family: dominantFamily,
        isDark: dominantHsl[2] < 45,
        textColor: domContrastW > domContrastB ? '#FFFFFF' : '#000000',
        contrastWhite: Number(domContrastW.toFixed(2)),
        contrastBlack: Number(domContrastB.toFixed(2))
      }

      // --- Compute Semantic Global Themes ---
      const families = swatches.map(s => s.family)
      const countFamily = (f: string) => families.filter(x => x === f).length

      // Check tone weights
      let warmCount = 0, coolCount = 0, neutralCount = 0
      for (const s of swatches) {
        if ((s.hsl[0] >= 330 || s.hsl[0] < 80) && s.hsl[1] > 15) warmCount += s.percentage
        else if ((s.hsl[0] >= 160 && s.hsl[0] < 270) && s.hsl[1] > 15) coolCount += s.percentage
        else neutralCount += s.percentage
      }

      const isWarm = warmCount > coolCount && warmCount > 30
      const isCool = coolCount > warmCount && coolCount > 30
      const isNeutral = neutralCount > 50

      // Saturation
      const avgSat = swatches.reduce((sum, s) => sum + s.hsl[1] * (s.percentage / 100), 0)
      const isHighSaturation = avgSat > 55
      const isLowSaturation = avgSat < 25

      // Special color combos
      const hasBlackGold = (families.includes('黑色系') || swatches.some(s => s.hsl[2] < 20)) &&
                           (families.includes('金色系') || swatches.some(s => s.family === '金色系' || (s.hsl[0] >= 35 && s.hsl[0] <= 55 && s.hsl[1] > 50)));
      const hasBluePurpleGradient = families.includes('蓝色系') && (families.includes('紫色系') || families.includes('粉色系')) && avgSat > 40;
      const hasRedOrangeTone = families.includes('红色系') && families.includes('橙色系');

      const bgL = dominantSwatch.hsl[2]
      const backgroundType: 'dark' | 'light' | 'medium' = bgL < 35 ? 'dark' : (bgL > 75 ? 'light' : 'medium')

      const themes = {
        isWarm,
        isCool,
        isNeutral,
        isHighSaturation,
        isLowSaturation,
        hasBlackGold,
        hasBluePurpleGradient,
        hasRedOrangeTone,
        backgroundType
      }

      // 3. Extract Text Color Palette using TextColorExtractorService
      let textColors: any[] = []
      let textBgColors: string[] = []

      if (!skipReason && textStatus !== 'failed' && textStatus !== 'timeout' && finalBoxes.length > 0) {
        try {
          if (detectionProvider === 'easyocr') {
            const textColorsCollected: Array<{ rgb: [number, number, number]; weight: number; bgHex: string }> = []
            const localBgColorsCollected: string[] = []

            for (const box of finalBoxes) {
              if (box.color && box.background_color) {
                const rgb = parseRgb(box.color)
                const contrast = box.readability_score ?? 1.0
                const weight = 10 + Math.round(contrast * 12)

                textColorsCollected.push({
                  rgb,
                  weight,
                  bgHex: box.background_color
                })

                if (!localBgColorsCollected.includes(box.background_color)) {
                  localBgColorsCollected.push(box.background_color)
                }
              }
            }

            // Merge similar candidate colors
            const merged: any[] = []
            for (const candidate of textColorsCollected) {
              const rgb = candidate.rgb
              const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
              let isMerged = false
              for (const m of merged) {
                if (getColorDistance(hsl, m.hsl) < 0.15) {
                  const totalWeight = m.rawConfidence + candidate.weight
                  m.rgb = [
                    Math.round((m.rgb[0] * m.rawConfidence + rgb[0] * candidate.weight) / totalWeight),
                    Math.round((m.rgb[1] * m.rawConfidence + rgb[1] * candidate.weight) / totalWeight),
                    Math.round((m.rgb[2] * m.rawConfidence + rgb[2] * candidate.weight) / totalWeight)
                  ]
                  m.hsl = rgbToHsl(m.rgb[0], m.rgb[1], m.rgb[2])
                  m.hex = rgbToHex(m.rgb[0], m.rgb[1], m.rgb[2])
                  m.rawConfidence = totalWeight
                  m.fromBoxes += 1
                  isMerged = true
                  break
                }
              }

              if (!isMerged) {
                merged.push({
                  hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
                  rgb,
                  hsl,
                  role: 'text_secondary',
                  rawConfidence: candidate.weight,
                  fromBoxes: 1,
                  confidence: candidate.weight
                })
              }
            }

            merged.sort((a, b) => b.rawConfidence - a.rawConfidence)
            const maxConf = merged.length > 0 ? merged[0].rawConfidence : 100
            for (const m of merged) {
              m.confidence = Number(Math.min(0.95, 0.4 + (m.rawConfidence / (maxConf + 1)) * 0.55).toFixed(2))
              delete m.rawConfidence
            }

            const finalSwatches = merged.slice(0, 5)
            if (finalSwatches.length > 0) {
              finalSwatches[0].role = 'text_primary'
              if (finalSwatches.length > 1) {
                let accentIdx = 1
                let maxSat = finalSwatches[1].hsl[1]
                for (let j = 1; j < finalSwatches.length; j++) {
                  if (finalSwatches[j].hsl[1] > maxSat) {
                    maxSat = finalSwatches[j].hsl[1]
                    accentIdx = j
                  }
                }
                finalSwatches[accentIdx].role = 'text_accent'
                for (let j = 1; j < finalSwatches.length; j++) {
                  if (j !== accentIdx) {
                    finalSwatches[j].role = 'text_secondary'
                  }
                }
              }
            }

            textColors = finalSwatches
            textBgColors = localBgColorsCollected.slice(0, 3)
            textStatus = textColors.length > 0 ? 'success' : 'skipped'
          } else {
            const { TextColorExtractor } = await import('./text-color-extractor.service')
            const extractor = new TextColorExtractor()
            const extOutput = await extractor.extractTextPalette({
              image_path: resolvedPath,
              text_boxes: finalBoxes.map((b: any) => ({
                x: b.x,
                y: b.y,
                width: b.width ?? b.w,
                height: b.height ?? b.h,
                confidence: b.confidence ?? 0.95
              })),
              provider: detectionProvider
            })
            textColors = extOutput.colors
            textBgColors = extOutput.background_colors
            textStatus = extOutput.status as any
          }
        } catch (extErr) {
          console.error('[ColorPaletteService] TextColorExtractor execution failed:', extErr)
          textStatus = 'failed'
          warnings.push(`Text color extraction failed: ${String(extErr)}`)
        }
      } else if (!skipReason && finalBoxes.length === 0 && textStatus === 'none') {
        textStatus = 'skipped'
        skipReason = 'no_text_detected'
      }

      return {
        version: 1,
        provider: `sharp_colorthief_${dominantSwatch.isDark ? 'dark' : 'light'}`,
        image_palette: {
          dominant: dominantSwatch,
          swatches: swatches,
          themes: themes,
          colors: swatches
        },
        text_palette: {
          provider: detectionProvider,
          colors: textColors,
          detected_text_box_count: finalBoxes.length,
          processed_text_box_count: Math.min(finalBoxes.length, 30),
          status: textStatus as any,
          textColorStatus: textStatus as any,
          skipReason: skipReason || undefined,
          isMock: isMockText,
          background_colors: textBgColors,
          swatches: textColors,
          warnings: skipReason ? [skipReason] : []
        },
        created_at: new Date().toISOString(),
        warnings
      }
    } catch (e) {
      console.error('[ColorPaletteService] Error during real extraction, falling back to mock.', e)
      warnings.push(`Extraction failed, fell back. Error: ${String(e)}`)
      return this._generateMockPalette(resolvedPath, textBoxes, warnings)
    }
  }

  /**
   * Helper to crop text boxes and extract their contrast foreground text colors.
   */
  private async _extractTextColors(sharp: any, resolvedPath: string, textBoxes: any[], dominantBg: ColorSwatch): Promise<TextColor[]> {
    const textColorsCollected: Array<{ rgb: [number, number, number]; weight: number }> = []
    
    if (!textBoxes || textBoxes.length === 0) {
      return []
    }

    try {
      const meta = await sharp(resolvedPath).metadata()
      const imgW = meta.width || 1000
      const imgH = meta.height || 1000
      const colorthief = await getColorThief()

      // Process up to 5 text boxes to avoid VRAM/CPU exhaustion
      const boxesToProcess = textBoxes.slice(0, 5)

      for (const box of boxesToProcess) {
        // Support percentage [0, 1] or absolute bounds
        // Format of box: { x, y, width, height } or similar
        let x = Number(box.x || box.left || 0)
        let y = Number(box.y || box.top || 0)
        let w = Number(box.width || box.w || 0)
        let h = Number(box.height || box.h || 0)

        // If coordinates are relative [0, 1], scale them to absolute pixels
        if (x < 1.0 && y < 1.0 && w < 1.0 && h < 1.0) {
          x = Math.round(x * imgW)
          y = Math.round(y * imgH)
          w = Math.round(w * imgW)
          h = Math.round(h * imgH)
        }

        // Apply a padding margin of 3px
        const pad = 3
        const cropX = Math.max(0, x - pad)
        const cropY = Math.max(0, y - pad)
        const cropW = Math.min(imgW - cropX, w + pad * 2)
        const cropH = Math.min(imgH - cropY, h + pad * 2)

        if (cropW < 4 || cropH < 4) continue

        // Crop the text bounding region and process with sharp safely
        const cropBuffer = await sharp(resolvedPath)
          .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
          .rotate()
          .flatten({ background: '#ffffff' })
          .toColorspace('srgb')
          .jpeg({ quality: 92 })
          .toBuffer()

        try {
          const rawSubColors = await colorthief.getPalette(cropBuffer, 5)
          if (rawSubColors && rawSubColors.length > 0) {
            const subColors = (rawSubColors as any[]).map(parseRgb)
            // Identify background color of the crop (usually the dominant color in this sub-region)
            const subBg = subColors[0]
            
            // Find text foreground color: colors that have HIGHER contrast against the subBg
            const contrastyColors = subColors.slice(1).map(c => {
              return {
                rgb: c,
                contrast: getContrastRatio(c, subBg)
              }
            })

            // Sort by contrast ratio descending
            contrastyColors.sort((a, b) => b.contrast - a.contrast)
            
            // Keep up to 2 high-contrast foreground colors from this text box
            for (let k = 0; k < Math.min(2, contrastyColors.length); k++) {
              const item = contrastyColors[k]
              if (item.contrast > 2.0) { // contrast threshold
                textColorsCollected.push({
                  rgb: item.rgb,
                  weight: 10 + Math.round(item.contrast * 2)
                })
              }
            }
          }
        } catch (cropQuantErr) {
          console.warn('[ColorPaletteService] Sub-region crop color extraction failed:', cropQuantErr)
        }
      }
    } catch (err) {
      console.warn('[ColorPaletteService] Text color crop extraction error:', err)
    }

    // Merge similar collected colors
    const merged: TextColor[] = []
    
    for (const item of textColorsCollected) {
      const rgb = item.rgb
      const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2])
      
      let isMerged = false
      for (const m of merged) {
        if (getColorDistance(hsl, m.hsl) < 0.15) {
          // Weighted average color
          const totalWeight = m.confidence + item.weight
          m.rgb = [
            Math.round((m.rgb[0] * m.confidence + rgb[0] * item.weight) / totalWeight),
            Math.round((m.rgb[1] * m.confidence + rgb[1] * item.weight) / totalWeight),
            Math.round((m.rgb[2] * m.confidence + rgb[2] * item.weight) / totalWeight)
          ]
          m.hsl = rgbToHsl(m.rgb[0], m.rgb[1], m.rgb[2])
          m.hex = rgbToHex(m.rgb[0], m.rgb[1], m.rgb[2])
          m.confidence = totalWeight
          m.sourceCount += 1
          isMerged = true
          break
        }
      }

      if (!isMerged) {
        merged.push({
          hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
          rgb,
          hsl,
          confidence: item.weight,
          sourceCount: 1,
          role: 'text_secondary'
        })
      }
    }

    // Sort by confidence / frequency descending and assign roles
    merged.sort((a, b) => b.confidence - a.confidence)
    const finalTextPalette = merged.slice(0, 5)

    if (finalTextPalette.length > 0) {
      finalTextPalette[0].role = 'text_primary'
      if (finalTextPalette.length > 1) {
        // Set accent based on highest saturation
        let accentIdx = 1
        let maxSat = finalTextPalette[1].hsl[1]
        for (let j = 1; j < finalTextPalette.length; j++) {
          if (finalTextPalette[j].hsl[1] > maxSat) {
            maxSat = finalTextPalette[j].hsl[1]
            accentIdx = j
          }
        }
        finalTextPalette[accentIdx].role = 'text_accent'
        
        for (let j = 1; j < finalTextPalette.length; j++) {
          if (j !== accentIdx) {
            finalTextPalette[j].role = 'text_secondary'
          }
        }
      }
    }

    // Add a text_background role representing dominantBg
    finalTextPalette.push({
      hex: dominantBg.hex,
      rgb: dominantBg.rgb,
      hsl: dominantBg.hsl,
      confidence: 100,
      sourceCount: textBoxes.length,
      role: 'text_background'
    })

    return finalTextPalette
  }

  private _generateMockPalette(filePath: string, textBoxes: any[] = [], warnings: string[] = [], detectionProvider = 'mock_fallback'): ColorPalettePayload {
    // Generate deterministic colors based on a hash of the file path name
    let hash = 0
    for (let i = 0; i < filePath.length; i++) {
      hash = filePath.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Pick 8 deterministic, beautiful HSL coordinates
    const swatches: ColorSwatch[] = []
    const baseH = Math.abs(hash) % 360
    
    // Choose realistic percentages
    const percentages = [40, 25, 15, 10, 5, 3, 1, 1]

    for (let i = 0; i < 8; i++) {
      const h = (baseH + i * 40) % 360
      const s = 40 + (Math.abs(hash + i * 7) % 40) // 40-80%
      const l = 15 + (Math.abs(hash + i * 13) % 65) // 15-80%

      const rgb = hslToRgb(h, s, l)
      const family = classifyColorFamily(h, s, l)
      const contrastWhite = getContrastRatio(rgb, [255, 255, 255])
      const contrastBlack = getContrastRatio(rgb, [0, 0, 0])

      let role: ColorSwatch['role'] = 'secondary'
      if (i === 0) role = 'background'
      else if (i === 1) role = 'primary'
      else if (i === 2) role = 'accent'

      swatches.push({
        hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
        rgb,
        hsl: [h, s, l],
        percentage: percentages[i],
        role,
        family,
        isDark: l < 45,
        textColor: contrastWhite > contrastBlack ? '#FFFFFF' : '#000000',
        contrastWhite: Number(contrastWhite.toFixed(2)),
        contrastBlack: Number(contrastBlack.toFixed(2))
      })
    }

    const dominantSwatch = swatches[0]
    
    const families = swatches.map(s => s.family)
    const themes = {
      isWarm: baseH < 90 || baseH > 270,
      isCool: baseH >= 120 && baseH <= 240,
      isNeutral: Math.abs(hash) % 5 === 0,
      isHighSaturation: Math.abs(hash) % 3 === 0,
      isLowSaturation: Math.abs(hash) % 7 === 0,
      hasBlackGold: swatches.some(s => s.hsl[2] < 20) && families.includes('黄色系'),
      hasBluePurpleGradient: families.includes('蓝色系') && families.includes('紫色系'),
      hasRedOrangeTone: families.includes('红色系') && families.includes('橙色系'),
      backgroundType: dominantSwatch.hsl[2] < 35 ? 'dark' as const : (dominantSwatch.hsl[2] > 75 ? 'light' as const : 'medium' as const)
    }

    // Mock Text swatches if boxes are provided
    const textSwatches: TextColor[] = []
    if (textBoxes && textBoxes.length > 0) {
      // Return contrasting foreground colors
      const textPrimaryColor: [number, number, number] = dominantSwatch.isDark ? [255, 255, 255] : [34, 34, 34]
      const textHsl = rgbToHsl(textPrimaryColor[0], textPrimaryColor[1], textPrimaryColor[2])
      textSwatches.push({
        hex: rgbToHex(textPrimaryColor[0], textPrimaryColor[1], textPrimaryColor[2]),
        rgb: textPrimaryColor,
        hsl: textHsl,
        confidence: 0.88,
        sourceCount: textBoxes.length,
        role: 'text_primary'
      })

      // Add text background
      textSwatches.push({
        hex: dominantSwatch.hex,
        rgb: dominantSwatch.rgb,
        hsl: dominantSwatch.hsl,
        confidence: 1.0,
        sourceCount: textBoxes.length,
        role: 'text_background'
      })
    }

    const textColors = textSwatches.filter(x => x.role !== 'text_background').map(c => ({
      hex: c.hex,
      rgb: c.rgb,
      hsl: c.hsl,
      role: c.role,
      confidence: c.confidence,
      from_boxes: textBoxes.length
    }))

    const bgs = textSwatches.filter(x => x.role === 'text_background').map(x => x.hex)

    return {
      version: 1,
      provider: `mock_fallback_${dominantSwatch.isDark ? 'dark' : 'light'}`,
      image_palette: {
        dominant: dominantSwatch,
        swatches: swatches,
        themes: themes,
        colors: swatches
      },
      text_palette: {
        provider: detectionProvider,
        colors: textColors,
        detected_text_box_count: textBoxes.length,
        processed_text_box_count: Math.min(textBoxes.length, 30),
        status: textColors.length > 0 ? 'success' : 'none',
        textColorStatus: textColors.length > 0 ? 'success' : 'none',
        isMock: true,
        background_colors: bgs,
        swatches: textSwatches,
        warnings: ['Mock color quantizer active. Install sharp/colorthief for production results.']
      },
      created_at: new Date().toISOString(),
      warnings
    }
  }

  /**
   * Background runner that processes an asset's color palette extraction,
   * writes the payload directly to SQLite assets.color_palette_json, and
   * populates pending color semantic tag suggestions.
   */
  public async extractAndSavePalette(assetId: string, filePath: string, textBoxes: any[] = []): Promise<void> {
    try {
      const db = getDatabase()
      let activeFilePath = filePath

      // Progressive Standardization for Legacy Assets:
      // If the asset has not been standardized yet (or failed), standardize it first!
      try {
        const assetRow = db.prepare('SELECT file_path, normalize_status FROM assets WHERE id = ?').get(assetId) as { file_path: string; normalize_status?: string } | undefined
        if (assetRow && (!assetRow.normalize_status || assetRow.normalize_status === 'not_started' || assetRow.normalize_status === 'failed')) {
          console.log(`[ColorPaletteService] Progressive standardization: Asset ${assetId} has normalize_status ${assetRow.normalize_status || 'null'}. Normalizing...`)
          const normRes = await ImageNormalizeService.normalize(assetRow.file_path, assetId)
          if (normRes.normalizeStatus === 'completed') {
            db.prepare(`
              UPDATE assets
              SET file_path = ?, thumbnail_path = ?, width = ?, height = ?,
                  original_path = ?, normalized_path = ?, original_format = ?, normalized_format = ?,
                  has_alpha = ?, color_space = ?, normalize_status = ?, normalized_at = ?, image_metadata_json = ?, updated_at = ?
              WHERE id = ?
            `).run(
              normRes.normalizedPath,
              normRes.thumbnailPath,
              normRes.normalizedWidth,
              normRes.normalizedHeight,
              normRes.originalPath,
              normRes.normalizedPath,
              normRes.originalFormat,
              normRes.normalizedFormat,
              normRes.hasAlpha ? 1 : 0,
              normRes.colorSpace,
              normRes.normalizeStatus,
              normRes.processedAt,
              JSON.stringify(normRes),
              new Date().toISOString(),
              assetId
            )
            activeFilePath = normRes.normalizedPath
            console.log(`[ColorPaletteService] Progressive standardization: Asset ${assetId} standardized successfully. Target: ${activeFilePath}`)
          }
        }
      } catch (normErr) {
        console.error(`[ColorPaletteService] Progressive standardization failed during background extract for asset ${assetId}:`, normErr)
      }

      let finalTextBoxes = textBoxes
      if (!finalTextBoxes || finalTextBoxes.length === 0) {
        try {
          const row = db.prepare('SELECT ai_analysis_json FROM assets WHERE id = ?').get(assetId) as { ai_analysis_json?: string } | undefined
          if (row && row.ai_analysis_json) {
            const analysis = JSON.parse(row.ai_analysis_json)
            if (analysis && Array.isArray(analysis.text_blocks)) {
              finalTextBoxes = analysis.text_blocks
              console.log(`[ColorPaletteService] Loaded ${finalTextBoxes.length} text blocks from ai_analysis_json for asset ${assetId}.`)
            }
          }
        } catch (dbErr) {
          console.warn('[ColorPaletteService] Failed to load ai_analysis_json for text boxes:', dbErr)
        }
      }

      const palette = await this.extractPalette(activeFilePath, finalTextBoxes, assetId)
      const now = new Date().toISOString()

      // 1. Update the assets row with color_palette_json and dominant color hex
      const dominantHex = palette.image_palette.dominant.hex
      db.prepare(`
        UPDATE assets
        SET color_palette_json = ?, dominant_color = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(palette), dominantHex, now, assetId)

      console.log(`[ColorPaletteService] Successfully extracted and saved palette JSON for asset ${assetId}. Dominant: ${dominantHex}`)

      // 2. Generate and write pending color semantic tags into tag_suggestions
      const colorTags: Array<{ name: string; confidence: number }> = []

      // Add dominant color family
      const dominantFamily = palette.image_palette.dominant.family
      colorTags.push({ name: dominantFamily, confidence: 0.95 })

      // Add unique color families from the top swatches (excluding background to avoid redundancy)
      const topSwatches = palette.image_palette.swatches.slice(1, 4)
      for (const s of topSwatches) {
        if (s.family !== dominantFamily && !colorTags.some(t => t.name === s.family)) {
          colorTags.push({ name: s.family, confidence: 0.85 })
        }
      }

      // Add themes
      const th = palette.image_palette.themes
      if (th.isWarm) colorTags.push({ name: '暖色调', confidence: 0.80 })
      if (th.isCool) colorTags.push({ name: '冷色调', confidence: 0.80 })
      if (th.isNeutral) colorTags.push({ name: '中性色', confidence: 0.75 })
      if (th.isHighSaturation) colorTags.push({ name: '高饱和', confidence: 0.85 })
      if (th.isLowSaturation) colorTags.push({ name: '低饱和', confidence: 0.85 })
      if (th.hasBlackGold) colorTags.push({ name: '黑金', confidence: 0.90 })
      if (th.hasBluePurpleGradient) colorTags.push({ name: '蓝紫渐变', confidence: 0.90 })
      if (th.hasRedOrangeTone) colorTags.push({ name: '红橙色调', confidence: 0.90 })
      
      if (th.backgroundType === 'dark') colorTags.push({ name: '深色背景', confidence: 0.95 })
      if (th.backgroundType === 'light') colorTags.push({ name: '浅色背景', confidence: 0.95 })

      // Text colors
      const textPalette = palette.text_palette
      const textSwatches = textPalette && Array.isArray(textPalette.swatches)
        ? textPalette.swatches
        : []

      const hasValidTextPalette = textPalette &&
        textPalette.status === 'success' &&
        textPalette.isMock !== true &&
        textSwatches.length > 0

      if (hasValidTextPalette) {
        const textPrimary = textSwatches.find((s: any) => s.role === 'text_primary')
        if (textPrimary) {
          const textFamily = classifyColorFamily(textPrimary.hsl[0], textPrimary.hsl[1], textPrimary.hsl[2])
          if (textFamily === '白色系') {
            colorTags.push({ name: '文字白色', confidence: 0.90 })
          } else if (textFamily === '金色系') {
            colorTags.push({ name: '金色文字', confidence: 0.90 })
          }
        }
      }

      // Write as pending tag suggestions
      const insertSuggestion = db.prepare(`
        INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
        VALUES (?, ?, ?, 'custom', 'color_palette', ?, 'pending', 'ColorPaletteExtractor', ?, ?, ?)
      `)

      db.transaction(() => {
        for (const tag of colorTags) {
          // Check if suggestion already exists
          const exists = db.prepare(`
            SELECT 1 FROM tag_suggestions
            WHERE asset_id = ? AND tag_name = ? AND source = 'color_palette'
          `).get(assetId, tag.name)

          if (!exists) {
            const sugId = `sug-color-${Math.random().toString(36).substr(2, 9)}`
            insertSuggestion.run(
              sugId,
              assetId,
              tag.name,
              tag.confidence,
              JSON.stringify({ color: dominantHex, themes: th }),
              now,
              now
            )
          }
        }
      })()

      console.log(`[ColorPaletteService] Added ${colorTags.length} pending color semantic tags for asset ${assetId}.`)
      this.notifyRenderer(assetId)
    } catch (err) {
      console.error(`[ColorPaletteService] Failed background extraction for asset ${assetId}:`, err)
    }
  }

  /**
   * Helper to send sync notification to the Electron renderer process.
   */
  private notifyRenderer(assetId: string) {
    try {
      const { BrowserWindow } = require('electron')
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) {
          win.webContents.send('ai:task-synced', { assetId })
        }
      })
    } catch (err) {
      // Safe fallback if executed in a pure Node.js environment (e.g. unit tests)
      console.log('[ColorPaletteService] Skip renderer notification (non-Electron environment)')
    }
  }

  /**
   * Scans SQLite for all assets that do not have a valid color palette
   * (e.g. color_palette_json is null, empty, or contaminated with NaN/null bad values),
   * and runs background queue processing to batch extract them.
   */
  public static async runStartupBatchScanner(): Promise<void> {
    try {
      const db = getDatabase()
      const service = new ColorPaletteService()
      
      // Query all assets to perform a self-healing check
      const rows = db.prepare(`
        SELECT id, file_path, color_palette_json, ai_analysis_json FROM assets
      `).all() as Array<{ id: string; file_path: string; color_palette_json?: string; ai_analysis_json?: string }>

      const assetsToProcess: Array<{ id: string; file_path: string }> = []

      for (const row of rows) {
        let needsExtraction = false

        // 1. Missing or corrupted palette, or generated by mock fallback
        if (!row.color_palette_json || 
            row.color_palette_json === '' || 
            row.color_palette_json.includes('NAN') || 
            row.color_palette_json.includes('null') ||
            row.color_palette_json.includes('mock_fallback')) {
          needsExtraction = true
        } 
        // 2. Has AI analysis text blocks but lacks text swatches in the palette
        else if (row.ai_analysis_json && row.ai_analysis_json !== '') {
          try {
            const analysis = JSON.parse(row.ai_analysis_json)
            const hasTextBlocks = analysis && Array.isArray(analysis.text_blocks) && analysis.text_blocks.length > 0
            
            if (hasTextBlocks) {
              const palette = JSON.parse(row.color_palette_json)
              const hasTextSwatches = palette && 
                                      palette.text_palette && 
                                      Array.isArray(palette.text_palette.swatches) && 
                                      palette.text_palette.swatches.filter((s: any) => s.role !== 'text_background').length > 0
              
              if (!hasTextSwatches) {
                console.log(`[ColorPaletteService] Asset ${row.id} has AI text blocks but lacks text swatches in palette. Queueing for repair.`)
                needsExtraction = true
              }
            }
          } catch (e) {
            // Ignore parse errors or trigger repair
          }
        }

        // 3. Check if the asset has a legacy, empty, failed, or mock text palette (Delta Refresh)
        if (!needsExtraction && row.color_palette_json) {
          try {
            const palette = JSON.parse(row.color_palette_json)
            const textPalette = palette.text_palette
            if (!textPalette || 
                !textPalette.swatches || 
                textPalette.swatches.length === 0 || 
                textPalette.status !== 'success' ||
                textPalette.isMock === true) {
              console.log(`[ColorPaletteService] Asset ${row.id} has legacy, missing, or mock text palette. Queueing for real EasyOCR refresh.`)
              needsExtraction = true
            }
          } catch (e) {
            needsExtraction = true
          }
        }

        if (needsExtraction) {
          assetsToProcess.push({ id: row.id, file_path: row.file_path })
        }
      }

      if (assetsToProcess.length === 0) {
        console.log('[ColorPaletteService] Startup batch scanner: All assets have valid and fully updated color palettes. Scanning complete.')
        return
      }

      console.log(`[ColorPaletteService] Startup batch scanner: Found ${assetsToProcess.length} assets requiring color palette extraction/repair. Starting background batch queue...`);

      // Run background queue extraction sequentially to prevent CPU/memory overload
      (async () => {
        let count = 0
        for (const asset of assetsToProcess) {
          try {
            console.log(`[ColorPaletteService] Background batch quantizing/repairing asset ${asset.id} (${asset.file_path})...`)
            await service.extractAndSavePalette(asset.id, asset.file_path)
            count++
            // Slight delay of 100ms between assets to prevent system freezing
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (err) {
            console.error(`[ColorPaletteService] Background batch quantization failed for asset ${asset.id}:`, err)
          }
        }
        console.log(`[ColorPaletteService] Startup batch scanner: Successfully processed and saved color palettes for ${count}/${assetsToProcess.length} assets.`)
      })().catch((e: any) => {
        console.error('[ColorPaletteService] Background batch runner error:', e)
      })

    } catch (e) {
      console.error('[ColorPaletteService] Failed to run startup batch color palette scanner:', e)
    }
  }

  /**
   * Refreshes text color palette dynamically when Qwen-VL deep layout sweep provides high-accuracy text_blocks.
   */
  public async refreshTextPaletteFromTextBlocks(assetId: string, textBlocks: any[]): Promise<void> {
    try {
      const db = getDatabase()
      const row = db.prepare('SELECT file_path, color_palette_json FROM assets WHERE id = ?').get(assetId) as { file_path: string; color_palette_json?: string } | undefined
      if (!row) {
        console.warn(`[ColorPaletteService] Asset ${assetId} not found, skipping text palette refresh.`)
        return
      }

      const filePath = row.file_path
      let existingPalette: ColorPalettePayload | null = null
      if (row.color_palette_json) {
        try {
          existingPalette = JSON.parse(row.color_palette_json)
        } catch (_) {}
      }

      // Check if we should skip: "Do not overwrite existing high-confidence text_palette, unless Qwen-VL's text_blocks is more complete"
      if (existingPalette && existingPalette.text_palette) {
        const existingCount = existingPalette.text_palette.detected_text_box_count || 0
        const newCount = textBlocks ? textBlocks.length : 0

        // If the current provider is already Qwen-VL and has equal/more boxes, skip
        if (existingPalette.text_palette.status === 'success' && 
            existingPalette.text_palette.provider === 'qwen_vl_text_blocks' && 
            existingCount >= newCount) {
          console.log(`[ColorPaletteService] Existing Qwen-VL text palette for asset ${assetId} is already high-confidence with ${existingCount} boxes. Skipping refresh.`)
          return
        }
      }

      console.log(`[ColorPaletteService] Refreshing text palette for asset ${assetId} using Qwen-VL text_blocks (count: ${textBlocks.length}).`)

      // Parse textBlocks
      const parsedBoxes = parseTextBoxes(textBlocks)

      // Run extraction passing the new boxes
      const palette = await this.extractPalette(filePath, parsedBoxes, assetId)

      // Mark the text_palette provider as qwen_vl_text_blocks
      if (palette.text_palette) {
        palette.text_palette.provider = 'qwen_vl_text_blocks'
      }

      const dominantHex = palette.image_palette.dominant.hex
      const now = new Date().toISOString()

      // Update SQLite row
      db.prepare(`
        UPDATE assets
        SET color_palette_json = ?, dominant_color = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(palette), dominantHex, now, assetId)

      console.log(`[ColorPaletteService] Text palette successfully refreshed and saved for asset ${assetId}.`)

      // Update tag suggestions from the refreshed palette
      const colorTags: Array<{ name: string; confidence: number }> = []
      const textPalette = palette.text_palette
      const textSwatches = textPalette && Array.isArray(textPalette.swatches)
        ? textPalette.swatches
        : []

      const hasValidTextPalette = textPalette &&
        textPalette.status === 'success' &&
        textPalette.isMock !== true &&
        textSwatches.length > 0

      if (hasValidTextPalette) {
        const textPrimary = textSwatches.find((s: any) => s.role === 'text_primary')
        if (textPrimary) {
          const textFamily = classifyColorFamily(textPrimary.hsl[0], textPrimary.hsl[1], textPrimary.hsl[2])
          if (textFamily === '白色系') {
            colorTags.push({ name: '文字白色', confidence: 0.90 })
          } else if (textFamily === '金色系') {
            colorTags.push({ name: '金色文字', confidence: 0.90 })
          }
        }
      }

      if (colorTags.length > 0) {
        const insertSuggestion = db.prepare(`
          INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
          VALUES (?, ?, ?, 'custom', 'color_palette', ?, 'pending', 'ColorPaletteExtractor', ?, ?, ?)
        `)

        db.transaction(() => {
          for (const tag of colorTags) {
            const exists = db.prepare(`
              SELECT 1 FROM tag_suggestions
              WHERE asset_id = ? AND tag_name = ? AND source = 'color_palette'
            `).get(assetId, tag.name)

            if (!exists) {
              const sugId = `sug-color-refresh-${Math.random().toString(36).substr(2, 9)}`
              insertSuggestion.run(
                sugId,
                assetId,
                tag.name,
                tag.confidence,
                JSON.stringify({ source: 'qwen_vl_text_blocks', text_blocks_count: textBlocks.length }),
                now,
                now
              )
            }
          }
        })()
      }

    } catch (err) {
      console.error(`[ColorPaletteService] Failed to refresh text palette for asset ${assetId}:`, err)
    }
  }
}
