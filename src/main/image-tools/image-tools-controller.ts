import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract'
import type { ImageCropRect, ImageToolOptions, ImageToolRequest, ImageToolReview, ImageVariantInput } from '../../shared/contracts/image-tools.contract'
import { MAX_IMAGE_TOOL_BYTES as MAX_IMAGE_SOURCE_BYTES } from '../../shared/contracts/image-tools.contract'

const MAX_IMAGE_PIXELS = 50_000_000
type Plan = { owner: string; review: ImageToolReview; input: ImageVariantInput; abort: AbortController }
export function createImageToolsController(deps: {
  host: Pick<ActiveLibraryHost, 'inspect' | 'readAssetContext' | 'readPreview' | 'readManagedOriginal' | 'saveImageVariant'>
  onSaved(scope: { libraryIdentity: string; generation: string; assetId: string }): void
}) {
  const plans = new Map<string, Plan>()
  const pending = new Map<string, AbortController>()
  const saving = new Set<Plan>()
  let originalBusy = false
  const matches = (scope: ImageToolRequest | ImageVariantInput) => {
    const current = deps.host.inspect()
    return current.state === 'ready' && current.identity === scope.libraryIdentity && current.generation === scope.generation
  }
  const discardOwner = (owner: string) => {
    pending.get(owner)?.abort()
    for (const [id, plan] of plans) if (plan.owner === owner) { plan.abort.abort(); plans.delete(id) }
    for (const plan of saving) if (plan.owner === owner) plan.abort.abort()
  }
  return {
    async prepare(owner: string, request: ImageToolRequest): Promise<ImageToolReview> {
      if (!request || Object.keys(request).some(key => !['libraryIdentity', 'generation', 'assetId', 'options'].includes(key)) || typeof request.assetId !== 'string' || !validOptions(request.options) || !matches(request)) throw new Error('素材或工具参数不可用，请重新选择。')
      for (const [id, plan] of plans) if (Date.parse(plan.review.expiresAt) < Date.now()) plans.delete(id)
      if (pending.has(owner)) throw new Error('预览正在生成，请稍后重试。')
      const source = request.options.source ?? 'preview'
      if (source === 'original' && originalBusy) throw new Error('另一项原件处理正在进行，请稍后重试。')
      discardOwner(owner)
      if (pending.size + plans.size + saving.size >= 4) throw new Error('请先完成其他图片工具操作。')
      const abort = new AbortController(); pending.set(owner, abort)
      const scope = structuredClone(request)
      if (source === 'original') originalBusy = true
      try {
        const asset = (await deps.host.readAssetContext([scope.assetId])).assets.find(item => item.id === scope.assetId)
        if (!asset) throw new Error('当前素材不可用。')
        const original = source === 'original' ? await deps.host.readManagedOriginal(asset.id, asset.revision, asset.thumbnailRef) : null
        const bytes = source === 'original' ? original!.bytes : await deps.host.readPreview(asset.id)
        if (bytes.byteLength > MAX_IMAGE_SOURCE_BYTES) throw new Error('图片超过 32 MB 限制。')
        const output = await transformImage(bytes, scope.options, abort.signal).catch(() => {
          throw new Error(abort.signal.aborted ? '图片处理已取消。' : '图片无法处理，请检查格式、文件完整性和 5000 万像素上限。')
        })
        if (output.data.length > MAX_IMAGE_SOURCE_BYTES) throw new Error('PNG 副本超过 32 MB，请减小最长边或裁剪范围。')
        if (abort.signal.aborted || !matches(scope)) throw new Error('素材已变化，请重新生成预览。')
        const currentContext = await deps.host.readAssetContext([scope.assetId])
        const currentAsset = currentContext.assets.find(item => item.id === scope.assetId)
        if (!currentAsset || currentAsset.revision !== asset.revision || currentAsset.thumbnailRef !== asset.thumbnailRef) throw new Error('素材已变化，请重新生成预览。')
        const storageVersion = currentContext.schemaVersion
        const receipt = randomUUID()
        const stem = asset.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 100) || 'image'
        const review: ImageToolReview = {
          storageNotice: storageVersion < 4 ? '保存副本会将素材库升级到 v4，旧版应用无法打开。处理参数与恢复意图保留在当前库；取消预览不升级。' : '副本处理参数和恢复意图保留在当前库，入库中断后可到资料库的入库恢复继续。',
          receipt, sourceTitle: asset.title, source, sourceWidth: output.sourceWidth, sourceHeight: output.sourceHeight,
          fileName: `${stem}-${source === 'original' ? '原件派生副本' : '预览副本'}.png`,
          width: output.info.width, height: output.info.height, previewBytes: new Uint8Array(output.data),
          expiresAt: new Date(Date.now() + 300_000).toISOString()
        }
        plans.set(receipt, { owner, review, abort, input: {
          ...scope, requestId: receipt, fileName: review.fileName, bytes: output.data,
          sourceRevision: asset.revision, previewGeneration: asset.thumbnailRef,
          ...(original ? { sourceIdentity: original.identity } : {})
        } })
        return structuredClone(review)
      } finally {
        if (pending.get(owner) === abort) pending.delete(owner)
        if (source === 'original') originalBusy = false
      }
    },
    async save(owner: string, receipt: string) {
      const plan = plans.get(receipt)
      if (!plan || plan.owner !== owner || Date.parse(plan.review.expiresAt) < Date.now() || !matches(plan.input)) throw new Error('预览已失效，请重新生成。')
      const original = plan.input.options.source === 'original'
      if (original && originalBusy) throw new Error('另一项原件处理正在进行，请稍后保存。')
      if (original) originalBusy = true
      plans.delete(receipt); saving.add(plan)
      try {
        const result = await deps.host.saveImageVariant(plan.input, plan.abort.signal)
        try { deps.onSaved({ libraryIdentity: plan.input.libraryIdentity, generation: plan.input.generation, assetId: result.assetId }) } catch { /* Notification cannot undo a committed write. */ }
        return result
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'library-recovery-required') throw new Error('副本入库中断，已保留恢复记录，可到资料库的“入库恢复”继续。')
        throw new Error('副本未能保存，请检查资料库和素材状态。')
      } finally { saving.delete(plan); if (original) originalBusy = false }
    },
    discard(owner: string, receipt: string) { const plan = plans.get(receipt); if (plan?.owner === owner) { plan.abort.abort(); plans.delete(receipt) } },
    discardOwner,
    invalidate() { for (const abort of pending.values()) abort.abort(); for (const plan of saving) plan.abort.abort(); plans.clear() }
  }
}

function validOptions(value: ImageToolOptions) {
  return value && !Array.isArray(value) && Object.keys(value).every(key => ['rotation', 'mirror', 'crop', 'maxEdge', 'source', 'cropRect'].includes(key)) &&
    [0, 90, 180, 270].includes(value.rotation) && typeof value.mirror === 'boolean' &&
    (value.source === undefined || ['preview', 'original'].includes(value.source)) &&
    ['original', 'square', 'portrait', 'wide'].includes(value.crop) && Number.isInteger(value.maxEdge) && value.maxEdge >= 64 && value.maxEdge <= (value.source === 'original' ? 8192 : 1600) &&
    (value.cropRect === undefined || (value.crop === 'original' && validRect(value.cropRect)))
}
function validRect(rect: ImageCropRect) {
  return rect && !Array.isArray(rect) && Object.keys(rect).length === 4 && Object.keys(rect).every(key => ['left', 'top', 'width', 'height'].includes(key)) &&
    [rect.left, rect.top, rect.width, rect.height].every(value => typeof value === 'number' && Number.isFinite(value)) &&
    rect.left >= 0 && rect.top >= 0 && rect.width > 0 && rect.height > 0 && rect.left < 1 && rect.top < 1 &&
    rect.left + rect.width <= 1 + 1e-9 && rect.top + rect.height <= 1 + 1e-9
}

async function transformImage(bytes: Uint8Array, options: ImageToolOptions, signal: AbortSignal) {
  const check = () => { if (signal.aborted) throw new Error('图片处理已取消。') }
  check()
  // Separate materialization makes EXIF, quarter-turn and mirror order explicit.
  let raster = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).rotate().raw().toBuffer({ resolveWithObject: true })
  const sourceWidth = raster.info.width; const sourceHeight = raster.info.height
  check()
  if (options.rotation) raster = await sharp(raster.data, { raw: raster.info }).rotate(options.rotation).raw().toBuffer({ resolveWithObject: true })
  check()
  if (options.mirror && options.cropRect) raster = await sharp(raster.data, { raw: raster.info }).flop().raw().toBuffer({ resolveWithObject: true })
  check()
  let pipeline = sharp(raster.data, { raw: raster.info })
  if (options.cropRect) {
    const rect = options.cropRect
    const left = Math.floor(rect.left * raster.info.width); const top = Math.floor(rect.top * raster.info.height)
    const width = Math.min(raster.info.width - left, Math.max(1, Math.round(rect.width * raster.info.width)))
    const height = Math.min(raster.info.height - top, Math.max(1, Math.round(rect.height * raster.info.height)))
    pipeline = pipeline.extract({ left, top, width, height })
  } else if (options.crop !== 'original') {
    const ratio = { square: 1, portrait: 4 / 5, wide: 16 / 9 }[options.crop]
    const width = Math.min(raster.info.width, Math.max(1, Math.round(raster.info.height * ratio)))
    const height = Math.min(raster.info.height, Math.max(1, Math.round(width / ratio)))
    pipeline = pipeline.extract({ left: Math.floor((raster.info.width - width) / 2), top: Math.floor((raster.info.height - height) / 2), width, height })
  }
  // Preserve the previous preset-crop/mirror order for requests without cropRect.
  if (options.mirror && !options.cropRect) pipeline = pipeline.flop()
  const output = await pipeline.resize({ width: options.maxEdge, height: options.maxEdge, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true })
  check()
  return { ...output, sourceWidth, sourceHeight }
}
