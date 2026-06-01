import fs from 'fs'
import path from 'path'
import { homedir } from 'os'
import { ImageMetadataService } from './image-metadata.service'

let sharpInstance: any = null

async function getSharp() {
  if (sharpInstance) return sharpInstance
  try {
    sharpInstance = (await import('sharp') as any).default || (await import('sharp') as any)
    return sharpInstance
  } catch (err) {
    console.warn('[ImageNormalizeService] Failed to dynamically load native sharp module.', err)
    return null
  }
}

export interface NormalizeResult {
  originalPath: string;
  normalizedPath: string;
  thumbnailPath: string;
  originalFormat: string;
  normalizedFormat: 'jpeg' | 'png';
  width: number;
  height: number;
  normalizedWidth: number;
  normalizedHeight: number;
  hasAlpha: boolean;
  colorSpace: string;
  exifOrientationApplied: boolean;
  normalizeStatus: 'completed' | 'failed' | 'skipped';
  processedAt: string;
  errorMessage?: string;
}

export class ImageNormalizeService {
  private static getLibraryDir(): string {
    return path.join(homedir(), 'DesignAssetManager', 'library')
  }

  private static toPortablePath(absolutePath: string): string {
    const home = homedir()
    // Normalize both paths to use forward/backward slashes consistently for matching
    const normalizedAbs = path.normalize(absolutePath)
    const normalizedHome = path.normalize(home)
    if (normalizedAbs.startsWith(normalizedHome)) {
      // Replace home dir with ~ and ensure standard forward slashes for cross-platform DB safety
      const sub = normalizedAbs.slice(normalizedHome.length)
      return ('~' + sub).replace(/\\/g, '/')
    }
    return absolutePath.replace(/\\/g, '/')
  }

  /**
   * Safe helper to create directories recursively.
   */
  private static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  /**
   * Uniformly decodes, rotates, converts to sRGB, manages transparent alpha channels,
   * generates a normalized asset image (max side 2048px), and creates a quick UI thumbnail WebP (max side 512px).
   * 
   * If normalisation fails, it falls back to the original image gracefully without blocking.
   */
  public static async normalize(originalPathInput: string, assetId: string): Promise<NormalizeResult> {
    const now = new Date().toISOString()
    const resolvedOriginal = ImageMetadataService.resolvePath(originalPathInput)
    const basename = path.basename(resolvedOriginal)
    const ext = path.extname(basename).toLowerCase()
    
    const libraryDir = this.getLibraryDir()
    const originalDir = path.join(libraryDir, 'original')
    const normalizedDir = path.join(libraryDir, 'normalized')
    const thumbnailDir = path.join(libraryDir, 'thumbnails')

    this.ensureDir(originalDir)
    this.ensureDir(normalizedDir)
    this.ensureDir(thumbnailDir)

    // Destination of original image under library/original/
    const finalOriginalAbsPath = path.join(originalDir, basename)

    // 1. Relocate/Copy original to original/ subfolder if it's not already there
    try {
      if (resolvedOriginal !== finalOriginalAbsPath) {
        fs.copyFileSync(resolvedOriginal, finalOriginalAbsPath)
        // If the original file was in the root library directory, remove it to keep layout clean
        if (path.dirname(resolvedOriginal) === libraryDir) {
          fs.unlinkSync(resolvedOriginal)
        }
      }
    } catch (moveErr) {
      console.warn(`[ImageNormalizeService] Failed to copy/move original file to original/ folder:`, moveErr)
    }

    const portableOriginal = this.toPortablePath(finalOriginalAbsPath)
    const fallbackResult: NormalizeResult = {
      originalPath: portableOriginal,
      normalizedPath: portableOriginal,
      thumbnailPath: portableOriginal,
      originalFormat: ext.replace('.', '') || 'jpeg',
      normalizedFormat: 'jpeg',
      width: 1920,
      height: 1080,
      normalizedWidth: 1920,
      normalizedHeight: 1080,
      hasAlpha: false,
      colorSpace: 'srgb',
      exifOrientationApplied: false,
      normalizeStatus: 'failed',
      processedAt: now
    }

    // Check if the physical file exists
    if (!fs.existsSync(finalOriginalAbsPath)) {
      fallbackResult.errorMessage = `Original file does not exist on disk at: ${finalOriginalAbsPath}`
      return fallbackResult
    }

    const sharp = await getSharp()
    if (!sharp) {
      fallbackResult.errorMessage = 'Native sharp module could not be loaded'
      return fallbackResult
    }

    try {
      // 2. Read metadata first
      const meta = await sharp(finalOriginalAbsPath).metadata()
      const width = meta.width || 1920
      const height = meta.height || 1080
      const originalFormatStr = meta.format || ext.replace('.', '') || 'jpeg'
      const hasAlpha = !!meta.hasAlpha
      const colorSpace = meta.space || 'srgb'

      // We normalize transparent PNGs to PNG, everything else to JPEG (quality: 92)
      const isTransparentPng = hasAlpha && (originalFormatStr === 'png' || ext === '.png')
      const normalizedFormat: 'jpeg' | 'png' = isTransparentPng ? 'png' : 'jpeg'
      const normalizedFilename = basename.replace(new RegExp(`\\${ext}$`, 'i'), normalizedFormat === 'png' ? '.png' : '.jpg')
      const finalNormalizedAbsPath = path.join(normalizedDir, normalizedFilename)

      // Calculate normalized bounding dimensions (max side 2048)
      let resizeWidth: number | undefined = undefined
      let resizeHeight: number | undefined = undefined
      if (width > 2048 || height > 2048) {
        if (width >= height) {
          resizeWidth = 2048
        } else {
          resizeHeight = 2048
        }
      }

      // 3. Process normalized image
      let sharpPipeline = sharp(finalOriginalAbsPath)
        .rotate() // Apply EXIF rotation

      if (resizeWidth || resizeHeight) {
        sharpPipeline = sharpPipeline.resize(resizeWidth, resizeHeight, { fit: 'inside', withoutEnlargement: true })
      }

      // Try colorspace transform if supported
      try {
        if (typeof sharpPipeline.toColorspace === 'function') {
          sharpPipeline = sharpPipeline.toColorspace('srgb')
        }
      } catch (spaceErr) {
        console.warn('[ImageNormalizeService] Colorspace conversion warning:', spaceErr)
      }

      // Output to file
      if (normalizedFormat === 'png') {
        await sharpPipeline.png({ compressionLevel: 8 }).toFile(finalNormalizedAbsPath)
      } else {
        // Strip alpha transparency if JPEG conversion to avoid dark backgrounds, flattening over white
        if (hasAlpha) {
          sharpPipeline = sharpPipeline.flatten({ background: '#ffffff' })
        }
        await sharpPipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(finalNormalizedAbsPath)
      }

      // 4. Generate UI grid thumbnail (max side 512, format WebP for performance)
      const thumbnailFilename = basename.replace(new RegExp(`\\${ext}$`, 'i'), '.webp')
      const finalThumbnailAbsPath = path.join(thumbnailDir, thumbnailFilename)

      let thumbPipeline = sharp(finalOriginalAbsPath)
        .rotate()
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })

      try {
        if (typeof thumbPipeline.toColorspace === 'function') {
          thumbPipeline = thumbPipeline.toColorspace('srgb')
        }
      } catch (spaceErr) {
        console.warn('[ImageNormalizeService] Thumbnail colorspace conversion warning:', spaceErr)
      }

      if (hasAlpha) {
        thumbPipeline = thumbPipeline.flatten({ background: '#ffffff' })
      }

      await thumbPipeline.webp({ quality: 80 }).toFile(finalThumbnailAbsPath)

      // Fetch normalized dimensions
      const normMeta = await sharp(finalNormalizedAbsPath).metadata()

      return {
        originalPath: portableOriginal,
        normalizedPath: this.toPortablePath(finalNormalizedAbsPath),
        thumbnailPath: this.toPortablePath(finalThumbnailAbsPath),
        originalFormat: originalFormatStr,
        normalizedFormat,
        width,
        height,
        normalizedWidth: normMeta.width || width,
        normalizedHeight: normMeta.height || height,
        hasAlpha,
        colorSpace,
        exifOrientationApplied: true,
        normalizeStatus: 'completed',
        processedAt: now
      }

    } catch (err: any) {
      console.error('[ImageNormalizeService] Normalization process failed. Falling back:', err)
      fallbackResult.errorMessage = err?.message || String(err)
      return fallbackResult
    }
  }

  /**
   * Generates a safe pre-processed sRGB jpeg buffer for ColorThief.
   * - Rotates to match EXIF.
   * - Resizes to maximum 512x512 for high performance.
   * - Converts colorspace to sRGB to eliminate channels shifting.
   * - Flattens any transparency (alpha) over a clean white background (#ffffff).
   * - Returns a stable binary JPEG buffer.
   */
  public static async createPaletteSafeBuffer(imagePath: string): Promise<Buffer> {
    const resolvedPath = ImageMetadataService.resolvePath(imagePath)
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at: ${resolvedPath}`)
    }

    const sharp = await getSharp()
    if (!sharp) {
      throw new Error('Sharp module could not be loaded')
    }

    // Build pipeline
    let pipeline = sharp(resolvedPath)
      .rotate()
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })

    try {
      if (typeof pipeline.toColorspace === 'function') {
        pipeline = pipeline.toColorspace('srgb')
      }
    } catch (_) {}

    // Always flatten transparency to white background so transparent areas do not become dark/black swatches
    pipeline = pipeline.flatten({ background: '#ffffff' })

    // Return high quality jpeg buffer
    return await pipeline.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer()
  }
}
