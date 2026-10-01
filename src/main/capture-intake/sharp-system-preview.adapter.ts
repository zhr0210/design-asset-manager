import { createHash } from 'node:crypto'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { assertInsideManagedRoot, ensureDirectoryInsideExistingManagedRoot } from '../platform/filesystem-guard'
import { isInsideDirectory } from '../platform/path-normalizer'
import type {
  CaptureIdentityKind,
  GenerateSystemPreviewInput,
  SystemPreviewOutcome,
  SupportedCaptureFormat
} from './capture-intake.types'

export interface SharpSystemPreviewDependencies {
  /** Recovery-owned deterministic identity only; ordinary creation remains EXCL. */
  reuseVerifiedExisting?: boolean
  readSource?(input: GenerateSystemPreviewInput): Promise<Uint8Array>
  createIdentity(kind: CaptureIdentityKind): string
}

/**
 * Main-only required-preview Adapter. It accepts a path only from the trusted
 * Capture Gateway and publishes a new, format-matching derivative with EXCL.
 */
export function createSharpSystemPreviewAdapter(
  dependencies: SharpSystemPreviewDependencies
): (input: GenerateSystemPreviewInput) => Promise<SystemPreviewOutcome> {
  return async (input) => {
    try {
      const source = dependencies.readSource ? await dependencies.readSource(input) : input.managedOriginalPath
      const format = await detectInputFormat(source)
      if (!format) return { kind: 'failed' }
      const previewGenerationIdentity = dependencies.createIdentity('capture-attempt')
      const fileName = safePreviewFileName(previewGenerationIdentity, format)
      const previewPath = path.join(input.activeLibrary.requiredPreviewsDirectory, fileName)
      assertPreviewPath(input, previewPath)

      await ensureDirectoryInsideExistingManagedRoot(
        input.activeLibrary.libraryRootDirectory,
        input.activeLibrary.requiredPreviewsDirectory
      )
      const output = await renderSystemPreview(source, format)
      try { await fs.writeFile(previewPath, output, { flag: 'wx' }) }
      catch (error) {
        if (!dependencies.reuseVerifiedExisting || (error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        await readVerifiedOwnedFile({ root: input.activeLibrary.libraryRootDirectory, role: input.activeLibrary.requiredPreviewsDirectory, relative: fileName, expectedSize: output.length, expectedDigest: createHash('sha256').update(output).digest('hex'), maximumBytes: 32 * 1024 * 1024 })
      }
      return {
        kind: 'ready',
        previewGenerationIdentity,
        gridThumbnailRef: `preview:${previewGenerationIdentity}`,
        gridThumbnailPath: previewPath,
        evidence: {
          sourceGeneration: input.sourceGeneration,
          format
        }
      }
    } catch {
      return { kind: 'failed' }
    }
  }
}

/** Stable filesystem name for a persisted preview identity (OS-safe). */
export function safePreviewFileName(
  previewGenerationIdentity: string,
  format: SupportedCaptureFormat
): string {
  const extension = format === 'jpeg' ? 'jpg' : format
  const stem = previewGenerationIdentity.replace(/[^A-Za-z0-9._-]/gu, '-')
  return `${stem}.${extension}`
}

async function detectInputFormat(filePath: string | Uint8Array): Promise<SupportedCaptureFormat | null> {
  const metadata = await sharp(filePath, { failOn: 'error' }).metadata()
  if (metadata.format === 'jpeg') return 'jpeg'
  if (metadata.format === 'png') return 'png'
  if (metadata.format === 'webp') return 'webp'
  return null
}

export async function renderSystemPreview(
  sourcePath: string | Uint8Array,
  format: SupportedCaptureFormat
): Promise<Buffer> {
  const pipeline = sharp(sourcePath, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
  if (format === 'jpeg') return pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
  if (format === 'webp') return pipeline.webp({ quality: 88 }).toBuffer()
  return pipeline.png({ compressionLevel: 9 }).toBuffer()
}

function assertPreviewPath(
  input: GenerateSystemPreviewInput,
  previewPath: string
): void {
  const root = path.resolve(input.activeLibrary.libraryRootDirectory)
  const previews = path.resolve(input.activeLibrary.requiredPreviewsDirectory)
  const original = path.resolve(input.managedOriginalPath)
  const preview = path.resolve(previewPath)
  if (preview === original || !isInsideDirectory(root, previews) ||
    !isInsideDirectory(previews, preview) || !isInsideDirectory(root, original)) {
    throw new Error('Preview path escaped its owned storage role.')
  }
  assertInsideManagedRoot(root, preview)
}
