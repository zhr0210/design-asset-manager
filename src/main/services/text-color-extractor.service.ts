import fs from 'fs'
import { ImageMetadataService } from './image-metadata.service'
import { ensureDirectory } from '../platform/filesystem-guard'
import { assertSafeLogPath, resolveLogPaths, sanitizeLogFileName } from '../platform/log-path-resolver'
import { ensureSafeJoin } from '../platform/path-normalizer'
import { resolveManagedPaths } from '../platform/path-resolver'
import { 
  parseRgb, 
  rgbToHsl, 
  rgbToHex, 
  getContrastRatio, 
  classifyColorFamily, 
  getColorDistance 
} from './color-palette.service'

// Dynamic imports
let sharpInstance: any = null

async function getSharp() {
  if (sharpInstance) return sharpInstance
  try {
    sharpInstance = (await import('sharp') as any).default || (await import('sharp') as any)
    return sharpInstance
  } catch (err) {
    return null
  }
}

function resolveManagedDebugDir(runId: string): string {
  let getPath: ((name: 'userData' | 'temp' | 'downloads') => string) | undefined
  try {
    const { app } = require('electron')
    if (app?.getPath) {
      getPath = (name) => app.getPath(name)
    }
  } catch {
    // Ignore: outside Electron environment (e.g., standard unit tests)
  }

  const managedPaths = resolveManagedPaths({ getPath })
  const logPaths = resolveLogPaths(managedPaths)
  const debugDir = ensureSafeJoin(logPaths.debugDir, 'text-palette', sanitizeLogFileName(runId))
  assertSafeLogPath(debugDir, managedPaths)
  return debugDir
}

// Development mode checker
let isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
try {
  const { app } = require('electron')
  if (app) {
    isDev = !app.isPackaged || process.env.NODE_ENV === 'development'
  }
} catch (e) {
  // Ignore: outside Electron environment (e.g., standard unit tests)
}

export interface ExtractorInputBox {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface TextExtractorInput {
  image_path: string
  text_boxes: ExtractorInputBox[]
  provider?: string
}

export interface ExtractedTextColor {
  hex: string
  rgb: [number, number, number]
  hsl: [number, number, number]
  role: 'text_primary' | 'text_secondary' | 'text_accent' | 'text_background' | 'text_shadow_or_stroke'
  confidence: number
  fromBoxes: number
  evidence?: {
    foregroundPixelCount: number
    backgroundHex: string
    contrastRatio: number
  }
}

export interface TextExtractorOutput {
  colors: ExtractedTextColor[]
  status: 'success' | 'none' | 'failed' | 'skipped'
  provider: string
  background_colors: string[]
  warnings: string[]
}

export class TextColorExtractor {
  /**
   * Main text color palette extraction logic using edge background sampling and contrast partitioning.
   */
  public async extractTextPalette(input: TextExtractorInput): Promise<TextExtractorOutput> {
    const warnings: string[] = []
    const resolvedPath = ImageMetadataService.resolvePath(input.image_path)
    const providerName = input.provider || 'unknown_detection'

    // Verify file existence
    if (!ImageMetadataService.exists(resolvedPath)) {
      return {
        colors: [],
        status: 'failed',
        provider: providerName,
        background_colors: [],
        warnings: [`File not found at: ${resolvedPath}`]
      }
    }

    const sharp = await getSharp()
    if (!sharp) {
      warnings.push('Native sharp module not loaded. Text color extraction skipped.')
      return {
        colors: [],
        status: 'skipped',
        provider: providerName,
        background_colors: [],
        warnings
      }
    }

    try {
      // 1. Load image metadata
      const meta = await sharp(resolvedPath).metadata()
      const imgW = meta.width || 1024
      const imgH = meta.height || 1024

      // Filter and limit boxes: max 30 boxes
      const boxesToProcess = input.text_boxes
        .filter(box => {
          // Rule: Bounding box too small -> Skip
          const minSize = 4
          const w = box.width < 1.0 ? box.width * imgW : box.width
          const h = box.height < 1.0 ? box.height * imgH : box.height
          if (w < minSize || h < minSize) return false

          // Rule: Confidence too low -> Skip
          if (box.confidence < 0.3) return false

          return true
        })
        .slice(0, 30) // Rule: Process max 30 boxes

      if (boxesToProcess.length === 0) {
        return {
          colors: [],
          status: 'none',
          provider: providerName,
          background_colors: [],
          warnings: ['No valid text boxes detected for processing.']
        }
      }

      const textColorsCollected: Array<{
        rgb: [number, number, number]
        hsl: [number, number, number]
        weight: number
        bgHex: string
        fgCount: number
        contrast: number
      }> = []
      const localBgColorsCollected: Array<string> = []

      // Setup developer visualization canvas if in Dev mode
      let maskCanvas: Uint8Array | null = null
      if (isDev) {
        maskCanvas = new Uint8Array(imgW * imgH * 3) // Black background
      }

      const debugBoxesRecords: any[] = []

      // 2. Loop and crop regions
      for (const [boxIndex, box] of boxesToProcess.entries()) {
        let x = Number(box.x)
        let y = Number(box.y)
        let w = Number(box.width)
        let h = Number(box.height)
        const originalBox = { x, y, width: w, height: h }

        // Convert relative coordinates [0, 1] to absolute pixels
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
        const expandedBox = { x: cropX, y: cropY, width: cropW, height: cropH }

        if (cropW < 4 || cropH < 4) {
          debugBoxesRecords.push({
            index: boxIndex,
            box,
            confidence: box.confidence ?? null,
            originalBox,
            expandedBox,
            localBgHex: null,
            fgCount: 0,
            foregroundRatio: null,
            contrast: null,
            selectedColorHex: null,
            skipped: true,
            skippedReason: 'Cropped area too small',
            clusterCount: 0,
            status: 'skipped'
          })
          continue
        }

        // Perform crop
        const cropBuffer = await sharp(resolvedPath)
          .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
          .removeAlpha()
          .toBuffer()

        // Extract raw pixels for precise contrast calculation
        const { data: rawPixels, info: cropInfo } = await sharp(cropBuffer)
          .raw()
          .toBuffer({ resolveWithObject: true })

        const cropWVal = cropInfo.width
        const cropHVal = cropInfo.height

        // 3. Edge-sampling background estimation
        const edgePixels: Array<[number, number, number]> = []
        for (let cy = 0; cy < cropHVal; cy++) {
          for (let cx = 0; cx < cropWVal; cx++) {
            if (cy === 0 || cy === cropHVal - 1 || cx === 0 || cx === cropWVal - 1) {
              const idx = (cy * cropWVal + cx) * 3
              edgePixels.push([rawPixels[idx], rawPixels[idx + 1], rawPixels[idx + 2]])
            }
          }
        }

        // Cluster edge pixels to find the most common border background color
        const edgeGroups: Array<{ rgb: [number, number, number]; count: number }> = []
        for (const rgb of edgePixels) {
          let found = false
          for (const g of edgeGroups) {
            const dist = Math.sqrt(
              Math.pow(g.rgb[0] - rgb[0], 2) +
              Math.pow(g.rgb[1] - rgb[1], 2) +
              Math.pow(g.rgb[2] - rgb[2], 2)
            )
            if (dist < 15) {
              g.rgb[0] = Math.round((g.rgb[0] * g.count + rgb[0]) / (g.count + 1))
              g.rgb[1] = Math.round((g.rgb[1] * g.count + rgb[1]) / (g.count + 1))
              g.rgb[2] = Math.round((g.rgb[2] * g.count + rgb[2]) / (g.count + 1))
              g.count++
              found = true
              break
            }
          }
          if (!found) {
            edgeGroups.push({ rgb: [...rgb], count: 1 })
          }
        }
        edgeGroups.sort((a, b) => b.count - a.count)
        const localBgRgb = edgeGroups.length > 0 ? edgeGroups[0].rgb : ([255, 255, 255] as [number, number, number])
        const localBgHex = rgbToHex(localBgRgb[0], localBgRgb[1], localBgRgb[2])
        const localBgHsl = rgbToHsl(localBgRgb[0], localBgRgb[1], localBgRgb[2])

        if (!localBgColorsCollected.includes(localBgHex)) {
          localBgColorsCollected.push(localBgHex)
        }

        // 4. Foreground contrast extraction mask
        const fgPixels: Array<[number, number, number]> = []
        for (let cy = 0; cy < cropHVal; cy++) {
          for (let cx = 0; cx < cropWVal; cx++) {
            const idx = (cy * cropWVal + cx) * 3
            const r = rawPixels[idx]
            const g = rawPixels[idx + 1]
            const b = rawPixels[idx + 2]
            const rgbVal: [number, number, number] = [r, g, b]

            const contrast = getContrastRatio(rgbVal, localBgRgb)
            const hslVal = rgbToHsl(r, g, b)
            const distance = getColorDistance(hslVal, localBgHsl)

            // High contrast (>= 3.0) and high HSL color distance (>= 0.18) represents foreground
            if (contrast >= 3.0 && distance >= 0.18) {
              fgPixels.push(rgbVal)

              if (isDev && maskCanvas) {
                const absX = cropX + cx
                const absY = cropY + cy
                if (absX < imgW && absY < imgH) {
                  const canvasIdx = (absY * imgW + absX) * 3
                  maskCanvas[canvasIdx] = 255     // White pixel mask
                  maskCanvas[canvasIdx + 1] = 255
                  maskCanvas[canvasIdx + 2] = 255
                }
              }
            }
          }
        }

        // Skip box if foreground representation is too sparse (less than 15 pixels)
        const foregroundRatio = cropWVal * cropHVal > 0 ? Number((fgPixels.length / (cropWVal * cropHVal)).toFixed(4)) : null
        if (fgPixels.length < 15) {
          debugBoxesRecords.push({
            index: boxIndex,
            box,
            confidence: box.confidence ?? null,
            originalBox,
            expandedBox,
            localBgHex,
            fgCount: fgPixels.length,
            foregroundPixelCount: fgPixels.length,
            foregroundRatio,
            contrast: null,
            selectedColorHex: null,
            skipped: true,
            skippedReason: 'Foreground pixel count too low (< 15)',
            clusterCount: 0,
            status: 'skipped',
            reason: 'Foreground pixel count too low (< 15)'
          })
          continue
        }

        // 5. Cluster foreground pixels to capture text colors
        const localFgGroups: Array<{ rgb: [number, number, number]; count: number }> = []
        for (const rgb of fgPixels) {
          let found = false
          const hslVal = rgbToHsl(rgb[0], rgb[1], rgb[2])
          for (const g of localFgGroups) {
            const gHsl = rgbToHsl(g.rgb[0], g.rgb[1], g.rgb[2])
            if (getColorDistance(hslVal, gHsl) < 0.15) {
              g.rgb[0] = Math.round((g.rgb[0] * g.count + rgb[0]) / (g.count + 1))
              g.rgb[1] = Math.round((g.rgb[1] * g.count + rgb[1]) / (g.count + 1))
              g.rgb[2] = Math.round((g.rgb[2] * g.count + rgb[2]) / (g.count + 1))
              g.count++
              found = true
              break
            }
          }
          if (!found) {
            localFgGroups.push({ rgb: [...rgb], count: 1 })
          }
        }
        localFgGroups.sort((a, b) => b.count - a.count)
        const selectedColorHex = localFgGroups[0] ? rgbToHex(localFgGroups[0].rgb[0], localFgGroups[0].rgb[1], localFgGroups[0].rgb[2]) : null
        const selectedContrast = localFgGroups[0] ? Number(getContrastRatio(localFgGroups[0].rgb, localBgRgb).toFixed(2)) : null

        // Collect high-contrast text color candidates
        for (let k = 0; k < Math.min(3, localFgGroups.length); k++) {
          const item = localFgGroups[k]
          const itemHsl = rgbToHsl(item.rgb[0], item.rgb[1], item.rgb[2])
          const contrast = getContrastRatio(item.rgb, localBgRgb)

          textColorsCollected.push({
            rgb: item.rgb,
            hsl: itemHsl,
            weight: item.count + Math.round(contrast * 12),
            bgHex: localBgHex,
            fgCount: fgPixels.length,
            contrast: contrast
          })
        }

        debugBoxesRecords.push({
          index: boxIndex,
          box,
          confidence: box.confidence ?? null,
          originalBox,
          expandedBox,
          localBgHex,
          fgCount: fgPixels.length,
          foregroundPixelCount: fgPixels.length,
          foregroundRatio,
          contrast: selectedContrast,
          selectedColorHex,
          skipped: false,
          skippedReason: null,
          clusterCount: localFgGroups.length,
          status: 'success',
          clustering: localFgGroups.slice(0, 3).map(g => ({
            hex: rgbToHex(g.rgb[0], g.rgb[1], g.rgb[2]),
            count: g.count
          }))
        })
      }

      // 6. Merge similar candidate colors globally
      const merged: ExtractedTextColor[] = []

      for (const candidate of textColorsCollected) {
        const rgb = candidate.rgb
        const hsl = candidate.hsl

        let isMerged = false
        for (const m of merged) {
          if (getColorDistance(hsl, m.hsl) < 0.15) {
            const totalWeight = m.confidence + candidate.weight
            m.rgb = [
              Math.round((m.rgb[0] * m.confidence + rgb[0] * candidate.weight) / totalWeight),
              Math.round((m.rgb[1] * m.confidence + rgb[1] * candidate.weight) / totalWeight),
              Math.round((m.rgb[2] * m.confidence + rgb[2] * candidate.weight) / totalWeight)
            ]
            m.hsl = rgbToHsl(m.rgb[0], m.rgb[1], m.rgb[2])
            m.hex = rgbToHex(m.rgb[0], m.rgb[1], m.rgb[2])
            m.confidence = totalWeight
            m.fromBoxes += 1
            if (m.evidence && candidate.fgCount > m.evidence.foregroundPixelCount) {
              m.evidence = {
                foregroundPixelCount: candidate.fgCount,
                backgroundHex: candidate.bgHex,
                contrastRatio: Number(candidate.contrast.toFixed(2))
              }
            }
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
            confidence: candidate.weight,
            fromBoxes: 1,
            evidence: {
              foregroundPixelCount: candidate.fgCount,
              backgroundHex: candidate.bgHex,
              contrastRatio: Number(candidate.contrast.toFixed(2))
            }
          })
        }
      }

      // Sort by confidence/frequency descending
      merged.sort((a, b) => b.confidence - a.confidence)

      // Normalize confidence value to float [0.4, 0.95]
      const maxConf = merged.length > 0 ? merged[0].confidence : 100
      for (const m of merged) {
        m.confidence = Number(Math.min(0.95, 0.4 + (m.confidence / (maxConf + 1)) * 0.55).toFixed(2))
      }

      // Limit to maximum 5 colors and assign roles
      const finalSwatches = merged.slice(0, 5)
      if (finalSwatches.length > 0) {
        finalSwatches[0].role = 'text_primary'
        if (finalSwatches.length > 1) {
          // Identify highest saturated as accent
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

      const finalBgs = localBgColorsCollected.slice(0, 3)

      // 7. Write developer debug overlay files in dev environment
      if (isDev) {
        try {
          const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const createdAt = new Date().toISOString()
          const debugDir = resolveManagedDebugDir(runId)
          await ensureDirectory(debugDir)
          const generatedFiles: string[] = []
          const missingFiles: string[] = []

          // A: text_boxes_overlay.png
          const svgRects = boxesToProcess.map(box => {
            let bx = box.x
            let by = box.y
            let bw = box.width
            let bh = box.height
            if (bx < 1.0 && by < 1.0 && bw < 1.0 && bh < 1.0) {
              bx = bx * imgW
              by = by * imgH
              bw = bw * imgW
              bh = bh * imgH
            }
            return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#22C55E" stroke-width="3"/>`
          }).join('\n')
          const svgOverlay = `<svg width="${imgW}" height="${imgH}">${svgRects}</svg>`
          
          await sharp(resolvedPath)
            .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
            .png()
            .toFile(ensureSafeJoin(debugDir, 'text_boxes_overlay.png'))
          generatedFiles.push('text_boxes_overlay.png')

          // B: text_foreground_mask_overlay.png
          if (maskCanvas) {
            await sharp(maskCanvas, { raw: { width: imgW, height: imgH, channels: 3 } })
              .png()
              .toFile(ensureSafeJoin(debugDir, 'text_foreground_mask_overlay.png'))
            generatedFiles.push('text_foreground_mask_overlay.png')
          } else {
            missingFiles.push('text_foreground_mask_overlay.png')
          }

          // C: text_palette_debug.json
          const finalStatus = finalSwatches.length > 0 ? 'success' : 'skipped'
          const debugPayload = {
            runId,
            createdAt,
            imagePath: resolvedPath,
            imageWidth: imgW ?? null,
            imageHeight: imgH ?? null,
            provider: providerName || 'unknown',
            isMock: false,
            status: finalStatus,
            warnings,
            thresholds: {
              paddingPx: 3,
              minCropSizePx: 4,
              minForegroundPixels: 15,
              minContrastRatio: 3.0,
              minHslDistance: 0.18,
              foregroundClusterDistance: 0.15,
              maxTextBoxes: 30,
              maxOutputColors: 5
            },
            detectedTextBoxCount: input.text_boxes.length,
            processedTextBoxCount: debugBoxesRecords.filter(record => !record.skipped).length,
            skippedTextBoxCount: debugBoxesRecords.filter(record => record.skipped).length,
            boxesProcessedCount: boxesToProcess.length,
            swatchesExtractedCount: finalSwatches.length,
            boxesDetails: debugBoxesRecords,
            finalSwatches
          }
          fs.writeFileSync(
            ensureSafeJoin(debugDir, 'text_palette_debug.json'),
            JSON.stringify(debugPayload, null, 2),
            'utf8'
          )
          generatedFiles.push('text_palette_debug.json')

          const manifestPayload = {
            runId,
            createdAt,
            files: [
              'text_boxes_overlay.png',
              'text_foreground_mask_overlay.png',
              'text_palette_debug.json'
            ],
            generatedFiles,
            missingFiles,
            notes: 'Development-only text color debug artifacts.'
          }
          fs.writeFileSync(
            ensureSafeJoin(debugDir, 'manifest.json'),
            JSON.stringify(manifestPayload, null, 2),
            'utf8'
          )
          console.log(`[TextColorExtractor] Debug visuals successfully saved to: ${debugDir}`)
        } catch (debugErr) {
          console.warn('[TextColorExtractor] Failed to write debug overlay files:', debugErr)
        }
      }

      return {
        colors: finalSwatches,
        status: finalSwatches.length > 0 ? 'success' : 'skipped',
        provider: providerName,
        background_colors: finalBgs,
        warnings
      }
    } catch (e) {
      warnings.push(`Text extraction failed: ${String(e)}`)
      return {
        colors: [],
        status: 'failed',
        provider: providerName,
        background_colors: [],
        warnings
      }
    }
  }
}
