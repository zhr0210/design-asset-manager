import { isKnownLibrarySchemaVersion } from './library-schema-version'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import type { IntakeRecoveryItem, IntakeRecoveryState } from '../../shared/contracts/intake-recovery.contract'
import type { SupportedCaptureFormat } from '../capture-intake/capture-intake.types'
import type { ActiveLibrarySession } from './active-library-session'
import { createManagedOriginalName, MANAGED_ORIGINAL_BUCKET } from '../capture-intake/capture-storage-names'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'
import { ensureDirectoryInsideExistingManagedRoot } from '../platform/filesystem-guard'
import { createSharpSystemPreviewAdapter } from '../capture-intake/sharp-system-preview.adapter'
import { createSqliteCapturePersistenceAdapter } from '../capture-intake/sqlite-capture-persistence.adapter'
import { createSqliteCapturePromotionLifecycleSink } from '../capture-intake/sqlite-asset-lifecycle.adapter'
import { readVariantIntent, completeVariantIntent, type VariantIntent } from './image-variant-intents'
import { recoverOwnedImage } from './owned-download-recovery'
import { importOwnedImage } from './owned-image-intake'

type Binding = { root: string; managed: string; staging: string; previews: string; identity: string; generation: string; database: Database.Database; session: ActiveLibrarySession }
type CopyRow = { id: string; name: string; bytes: number; digest: string; format: SupportedCaptureFormat; candidate: string; original: string; state: 'intake' | 'active' | 'promoted'; reference: string | null; asset: string | null }
export interface PreparedIntake { item: IntakeRecoveryItem; fingerprint: string; bytes: Uint8Array }
const sha = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const failure = () => new ActiveLibraryHostError('library-recovery-required', '入库记录或文件不匹配，已保留现场。原件未发布时，请重新选择匹配的原文件。')

export function listIntakeRecovery(active: Binding): IntakeRecoveryState {
  const version = Number(active.database.pragma('user_version', { simple: true }))
  const rows = active.database.prepare(`SELECT r.capture_request_identity AS id,r.received_file_name AS fileName,r.source_bytes AS bytes,c.lifecycle_state AS state
    FROM capture_requests r JOIN asset_candidates c ON c.capture_request_identity=r.capture_request_identity
    WHERE r.active_library_identity=? AND r.capture_method='copy-into-library' AND c.lifecycle_state!='promoted'
    AND r.capture_request_identity NOT LIKE 'capture-request:download:%' AND r.capture_request_identity NOT LIKE 'capture-request:variant:%'
    ORDER BY r.capture_request_identity`).all(active.identity) as Array<Omit<IntakeRecoveryItem,'kind'>>
  const variants = isKnownLibrarySchemaVersion(version,4) ? active.database.prepare("SELECT request_id AS id,file_name AS fileName,byte_length AS bytes FROM image_variant_intents WHERE library_identity=? AND state='pending' ORDER BY created_at").all(active.identity) as Array<{ id: string; fileName: string; bytes: number }> : []
  return { version, items: [...rows.map(r => ({ ...r, kind: 'copy' as const })), ...variants.map(v => ({ ...v, id: `variant:${v.id}`, kind: 'variant' as const, state: 'variant-pending' as const }))] }
}

export async function prepareIntakeRecovery(active: Binding, id: string, selectedFile?: string): Promise<PreparedIntake> {
  const item = listIntakeRecovery(active).items.find(i => i.id === id)
  if (!item || item.bytes < 1) throw failure()
  if (item.bytes > 32 * 1024 * 1024) throw new ActiveLibraryHostError('library-operation-failed', '当前恢复支持不超过 32 MB 的图片；较大文件与记录继续保留。')
  if (item.kind === 'variant') {
    if (selectedFile) throw failure()
    const row = variant(active, id)
    let bytes: Uint8Array
    const relative = `variant-${row.request_id}.png`
    try { await fs.lstat(path.join(active.staging, relative)); bytes = await read(active, active.staging, relative, row.byte_length, row.sha256) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const name = `${MANAGED_ORIGINAL_BUCKET}/${createManagedOriginalName(relative, 'png', `original-storage-object:variant:${row.request_id}:1`)}`
      bytes = await read(active, active.managed, name, row.byte_length, row.sha256)
    }
    return { item, fingerprint: sha(JSON.stringify(row)), bytes }
  }
  const row = copy(active, id)
  let bytes: Uint8Array
  if (selectedFile) {
    if (row.state !== 'intake' || path.basename(selectedFile) !== row.name || await fs.realpath(selectedFile) !== selectedFile) throw failure()
    bytes = await read(active, path.dirname(selectedFile), path.basename(selectedFile), row.bytes, row.digest.slice(7), path.dirname(selectedFile))
  } else bytes = await read(active, active.managed, originalName(row), row.bytes, row.digest.slice(7))
  return { item, fingerprint: sha(JSON.stringify(row)), bytes }
}

export async function runIntakeRecovery(active: Binding, plan: PreparedIntake) {
  const { item } = plan
  if (item.kind === 'variant') {
    const intent = variant(active, item.id)
    if (sha(JSON.stringify(intent)) !== plan.fingerprint || sha(plan.bytes) !== intent.sha256) throw failure()
    const source = { kind: 'variant' as const, metadata: JSON.parse(intent.metadata_json) as Record<string, unknown> }
    const admitted = active.database.prepare('SELECT source_generation,source_bytes FROM capture_requests WHERE capture_request_identity=?').get(`capture-request:variant:${intent.request_id}:1`) as { source_generation: string; source_bytes: number } | undefined
    if (admitted && (admitted.source_generation !== `sha256:${intent.sha256}` || admitted.source_bytes !== intent.byte_length)) throw failure()
    if (!admitted && active.database.prepare('SELECT 1 FROM assets WHERE id=? UNION ALL SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=?').get(`variant-asset:${intent.request_id}`, `variant-asset:${intent.request_id}`)) throw failure()
    const result = admitted ? await recoverOwnedImage(active, { requestId: intent.request_id, fileName: intent.file_name, source }) : await importOwnedImage(active, { requestId: intent.request_id, fileName: intent.file_name, bytes: plan.bytes, source }, createSharpSystemPreviewAdapter({ createIdentity: () => `capture-attempt:variant-recovery:${intent.request_id}` }))
    completeVariantIntent(active.database, intent.request_id)
    return result
  }
  const row = copy(active, item.id)
  if (sha(JSON.stringify(row)) !== plan.fingerprint || sha(plan.bytes) !== row.digest.slice(7)) throw failure()
  const relative = originalName(row)
  const target = path.join(active.managed, relative)
  try { await fs.lstat(target); await read(active, active.managed, relative, row.bytes, row.digest.slice(7)) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || row.state !== 'intake') throw error
    await ensureDirectoryInsideExistingManagedRoot(active.root, path.dirname(target))
    const temp = path.join(active.staging, `recovery-${randomUUID()}.part`)
    // Publish a complete, frozen copy without overwriting another file. Unknown attempts remain untouched.
    const handle = await fs.open(temp, 'wx', 0o600)
    try { await handle.writeFile(plan.bytes); await handle.sync() } finally { await handle.close() }
    await read(active, active.staging, path.basename(temp), row.bytes, row.digest.slice(7))
    await fs.link(temp, target)
    await fs.unlink(temp)
  }
  await read(active, active.managed, relative, row.bytes, row.digest.slice(7))
  const persistence = createSqliteCapturePersistenceAdapter(active.database, { promotionLifecycle: createSqliteCapturePromotionLifecycleSink(active.database, () => `revision:${randomUUID()}`) })
  await persistence.commitCandidateActivation({ captureRequestIdentity: row.id, managedOriginalRef: `managed-original:${relative}` })
  const preview = await createSharpSystemPreviewAdapter({ createIdentity: () => `capture-attempt:recovery:${sha(row.id)}`, reuseVerifiedExisting: true, readSource: async () => plan.bytes })({ candidateIdentity: row.candidate, sourceGeneration: row.digest, managedOriginalRef: `managed-original:${relative}`, managedOriginalPath: target, activeLibrary: { identity: active.identity, generation: active.generation, libraryRootDirectory: active.root, managedOriginalsDirectory: active.managed, intakeStagingDirectory: active.staging, requiredPreviewsDirectory: active.previews } })
  if (preview.kind !== 'ready') throw failure()
  await read(active, active.managed, relative, row.bytes, row.digest.slice(7))
  const assetId = `recovered-asset:${sha(row.id)}`
  await persistence.commitReadyPromotion({ captureRequestIdentity: row.id, previewGenerationIdentity: preview.previewGenerationIdentity, gridThumbnailRef: preview.gridThumbnailRef, gridThumbnailPath: preview.gridThumbnailPath, designAssetIdentity: assetId, promotionLinkIdentity: `promotion-link:recovery:${sha(row.id)}`, managedOriginalPath: target })
  return { assetId }
}
function copy(active: Binding, id: string): CopyRow {
  const row = active.database.prepare(`SELECT r.capture_request_identity AS id,r.received_file_name AS name,r.source_bytes AS bytes,r.source_generation AS digest,r.source_format AS format,c.candidate_identity AS candidate,c.original_storage_object_identity AS original,c.lifecycle_state AS state,c.managed_original_ref AS reference,p.design_asset_identity AS asset
    FROM capture_requests r JOIN asset_candidates c ON c.capture_request_identity=r.capture_request_identity LEFT JOIN promotion_links p ON p.candidate_identity=c.candidate_identity
    WHERE r.capture_request_identity=? AND r.active_library_identity=? AND r.capture_method='copy-into-library'`).get(id, active.identity) as CopyRow | undefined
  if (!row || id.startsWith('capture-request:download:') || id.startsWith('capture-request:variant:') || row.asset || !['intake','active'].includes(row.state) || !['png','jpeg','webp'].includes(row.format) || !/^sha256:[a-f0-9]{64}$/.test(row.digest) || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > 32 * 1024 * 1024 || (row.state === 'intake' ? row.reference !== null : row.reference !== `managed-original:${originalName(row)}`)) throw failure()
  return row
}
function originalName(row: CopyRow) { return `${MANAGED_ORIGINAL_BUCKET}/${createManagedOriginalName(row.name, row.format, row.original)}` }
function variant(active: Binding, id: string): VariantIntent {
  const row = readVariantIntent(active.database, active.identity, id.slice('variant:'.length))
  if (!row || row.state !== 'pending' || !/^[a-zA-Z0-9-]{1,100}$/.test(row.request_id)) throw failure()
  return row
}
function read(active: Binding, role: string, relative: string, size: number, digest: string, root = active.root) {
  return readVerifiedOwnedFile({ root, role, relative, expectedSize: size, expectedDigest: digest, maximumBytes: 32 * 1024 * 1024 }).then(result => result.bytes)
}
