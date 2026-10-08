export const MAX_IMAGE_TOOL_BYTES = 32 * 1024 * 1024
export interface ImageToolScope { libraryIdentity: string; generation: string; assetId: string }
export interface ImageCropRect { left: number; top: number; width: number; height: number }
export interface ImageToolOptions {
  source?: 'preview' | 'original'
  /** Normalized coordinates after orientation, rotation and mirror. Requires crop=original. */
  cropRect?: ImageCropRect
  rotation: 0 | 90 | 180 | 270
  mirror: boolean
  crop: 'original' | 'square' | 'portrait' | 'wide'
  maxEdge: number
}
export interface ImageToolRequest extends ImageToolScope { options: ImageToolOptions }
export interface ImageToolReview {
  receipt: string; sourceTitle: string; fileName: string; width: number; height: number
  storageNotice?: string
  previewBytes: Uint8Array; expiresAt: string
  source: 'preview' | 'original'; sourceWidth: number; sourceHeight: number
}
export interface ImageVariantInput extends ImageToolScope {
  requestId: string; sourceRevision: string; previewGeneration: string
  fileName: string; bytes: Uint8Array; options: ImageToolOptions
  /** Main-held fingerprint. Never accepted from the Renderer prepare request. */
  sourceIdentity?: string
}
export type ImageToolResult<T> = { ok: true; value: T } | { ok: false; error: string }
export interface ImageToolsApi {
  prepare(input: ImageToolRequest): Promise<ImageToolResult<ImageToolReview>>
  save(receipt: string): Promise<ImageToolResult<{ assetId: string }>>
  discard(receipt: string): Promise<ImageToolResult<void>>
}
