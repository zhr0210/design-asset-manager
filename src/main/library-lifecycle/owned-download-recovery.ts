import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import { MAX_IMAGE_TOOL_BYTES } from '../../shared/contracts/image-tools.contract'
import type { ActiveLibrarySession } from './active-library-session'
import type { SupportedCaptureFormat } from '../capture-intake/capture-intake.types'
import { MANAGED_ORIGINAL_BUCKET, createManagedOriginalName } from '../capture-intake/capture-storage-names'
import { createSharpSystemPreviewAdapter, renderSystemPreview, safePreviewFileName } from '../capture-intake/sharp-system-preview.adapter'
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'
import { importOwnedImage } from './owned-image-intake'

type Binding = { root: string; managed: string; staging: string; previews: string; identity: string; database: Database.Database; session: ActiveLibrarySession }
type Row = {
  batch: string; planItem: string; library: string; name: string; bytes: number; digest: string;
  format: SupportedCaptureFormat; candidate: string; original: string; state: string;
  reference: string | null; preview: string | null; previewGeneration: string | null;
  link: string | null; asset: string | null; lifecycle: string | null; ownership: string | null
}

/** Explicit recovery from a caller-owned intent under the current Library lease; no network or external source access. */
export function recoverOwnedDownload(active: Binding, input: { requestId: string; fileName: string; sourceUrl: string }) {
  return recoverOwnedImage(active, { requestId: input.requestId, fileName: input.fileName, source: { kind: 'download', url: input.sourceUrl } })
}
export async function recoverOwnedImage(active: Binding, input: { requestId: string; fileName: string; source: { kind: 'download'; url: string } | { kind: 'variant'; metadata: Record<string, unknown> } }) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(input.requestId)) throw unavailable()
  if (input.source.kind === 'download') { const url = new URL(input.source.url); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw unavailable() }
  const prefix = input.source.kind === 'download' ? 'download' : 'variant'
  const id = (kind: string) => `${kind}:${prefix}:${input.requestId}:1`
  const assetId = `${prefix}-asset:${input.requestId}`
  const inspect = () => active.database.prepare(`
    SELECT r.batch_identity AS batch,r.plan_item_identity AS planItem,r.active_library_identity AS library,
      r.received_file_name AS name,r.source_bytes AS bytes,r.source_generation AS digest,r.source_format AS format,
      c.candidate_identity AS candidate,c.original_storage_object_identity AS original,c.lifecycle_state AS state,
      c.managed_original_ref AS reference,c.grid_thumbnail_ref AS preview,c.preview_generation_identity AS previewGeneration,
      p.promotion_link_identity AS link,p.design_asset_identity AS asset,l.lifecycle_state AS lifecycle,l.ownership
    FROM capture_requests r JOIN asset_candidates c ON c.capture_request_identity=r.capture_request_identity
    LEFT JOIN promotion_links p ON p.candidate_identity=c.candidate_identity
    LEFT JOIN asset_lifecycle l ON l.design_asset_identity=p.design_asset_identity
    WHERE r.capture_request_identity=? AND r.capture_method='copy-into-library'
  `).get(id('capture-request')) as Row | undefined
  const row = inspect()
  if (!row || row.batch !== id('capture-batch') || row.planItem !== id('plan-item') || row.library !== active.identity ||
    row.candidate !== id('candidate') || row.original !== id('original-storage-object') ||
    !['png', 'jpeg', 'webp'].includes(row.format) || row.name !== `${prefix}-${input.requestId}.${row.format}` ||
    !/^sha256:[a-f0-9]{64}$/.test(row.digest) || !Number.isSafeInteger(row.bytes) || row.bytes <= 0 || row.bytes > MAX_IMAGE_TOOL_BYTES ||
    !['intake', 'active', 'promoted'].includes(row.state)) throw unavailable()
  const relative = `${MANAGED_ORIGINAL_BUCKET}/${createManagedOriginalName(row.name, row.format, row.original)}`
  const reference = `managed-original:${relative}`
  if ((row.state === 'intake' && row.reference !== null) || (row.state !== 'intake' && row.reference !== reference)) throw unavailable()
  if (row.state === 'promoted') {
    if (row.asset !== assetId || row.link !== id('promotion-link') || row.lifecycle !== 'active' || row.ownership !== 'managed' ||
      !row.previewGeneration || !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(row.previewGeneration) || row.preview !== `preview:${row.previewGeneration}`) throw unavailable()
  } else if (row.asset || row.link || row.lifecycle || row.preview || row.previewGeneration ||
    active.database.prepare('SELECT 1 FROM assets WHERE id=?').get(assetId)) throw unavailable()
  if (active.database.prepare('SELECT 1 FROM asset_candidates WHERE managed_original_ref=? AND candidate_identity!=?').get(reference, row.candidate)) throw unavailable()
  await assertExistingDirectoryInsideManagedRoot(active.root, active.staging)
  await assertExistingDirectoryInsideManagedRoot(active.root, active.managed)
  const read = (role: string, relative: string) => readVerifiedOwnedFile({ root: active.root, role, relative, expectedSize: row.bytes, expectedDigest: row.digest.slice('sha256:'.length), maximumBytes: MAX_IMAGE_TOOL_BYTES })
  let stageExists = false
  try { await fs.lstat(path.join(active.staging, row.name)); stageExists = true }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const source = stageExists ? await read(active.staging, row.name) : await read(active.managed, relative)
  if (row.state !== 'intake') await read(active.managed, relative)
  const complete = async (result: { assetId: string }) => {
    if (stageExists) {
      try {
        const current = await read(active.staging, row.name)
        if (current.fileIdentity === source.fileIdentity) await fs.unlink(path.join(active.staging, row.name))
      } catch { /* A committed Asset remains successful; changed or unavailable staging is retained. */ }
    }
    return result
  }
  if (row.state === 'promoted') {
    const expectedPreview = await renderSystemPreview(source.bytes, row.format)
    await readVerifiedOwnedFile({ root: active.root, role: active.previews, relative: safePreviewFileName(row.previewGeneration!, row.format), expectedSize: expectedPreview.length, expectedDigest: createHash('sha256').update(expectedPreview).digest('hex'), maximumBytes: MAX_IMAGE_TOOL_BYTES })
    const metadata = active.database.prepare('SELECT source_site_id AS site, original_url AS url, image_metadata_json AS metadata FROM assets WHERE id=?').get(assetId) as { site: string; url: string | null; metadata: string | null } | undefined
    if (input.source.kind === 'download' ? metadata?.site === 'web-download' && metadata.url === input.source.url : metadata?.site === 'image-tools' && metadata.metadata === JSON.stringify(input.source.metadata)) return complete({ assetId })
    if (metadata?.site !== 'local-file-copy') throw unavailable()
  }
  if (JSON.stringify(inspect()) !== JSON.stringify(row)) throw unavailable()
  const preview = createSharpSystemPreviewAdapter({ createIdentity: () => `capture-attempt:${prefix}-recovery:${input.requestId}`, reuseVerifiedExisting: true, readSource: async () => source.bytes })
  return complete(await importOwnedImage(active, { requestId: input.requestId, fileName: input.fileName, bytes: source.bytes, source: input.source }, preview, () => {}, { resumeAccepted: true }))
}
function unavailable() { return new ActiveLibraryHostError('library-recovery-required', '保留文件或入库记录不匹配，无法安全恢复。') }
