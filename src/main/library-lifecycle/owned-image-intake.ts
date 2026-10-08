import { recordVariantIntent, completeVariantIntent } from './image-variant-intents'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type Database from 'better-sqlite3'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import type { CaptureIdentityKind, GenerateSystemPreviewInput, SystemPreviewOutcome } from '../capture-intake/capture-intake.types'
import { createActiveLibraryCaptureWorkflow, type ActiveLibrarySession } from './active-library-session'
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard'

/** Internal only: the Host must invoke this while holding its exact Library lease. */
export async function importOwnedImage(active: { identity: string; root: string; staging: string; database: Database.Database; session: ActiveLibrarySession }, input: {
  requestId: string; fileName: string; bytes: Uint8Array
  source: { kind: 'download'; url: string } | { kind: 'variant'; metadata: Record<string, unknown> }
}, preview: (input: GenerateSystemPreviewInput) => Promise<SystemPreviewOutcome>, checkSource: () => void = () => {}, options: { resumeAccepted?: boolean } = {}) {
  const fail = () => new ActiveLibraryHostError('library-operation-failed', 'Image intake failed.')
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(input.requestId) || !input.bytes.byteLength || input.bytes.byteLength > 32 * 1024 * 1024) throw fail()
  const prefix = input.source.kind === 'download' ? 'download' : 'variant'
  const assetId = `${prefix}-asset:${input.requestId}`
  const metadata = await sharp(input.bytes, { limitInputPixels: 50_000_000 }).metadata()
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw fail()
  const originalVariant = input.source.kind === 'variant' && input.source.metadata.kind === 'managed-original-variant'
  const updateMetadata = () => active.database.prepare('UPDATE assets SET title=CASE WHEN title=? THEN ? ELSE title END,file_name=CASE WHEN file_name=? THEN ? ELSE file_name END,source_site_id=?,source_site_name=?,original_url=?,capture_method=?,width=?,height=?,image_metadata_json=? WHERE id=?').run(
    `${prefix}-${input.requestId}`, input.fileName.replace(/\.[^.]+$/, ''), `${prefix}-${input.requestId}.${metadata.format}`, input.fileName, prefix === 'download' ? 'web-download' : 'image-tools',
    prefix === 'download' ? 'Web Capture' : originalVariant ? '图片工具 · 原件派生副本' : '图片工具 · 预览副本', input.source.kind === 'download' ? input.source.url : null,
    prefix === 'download' ? 'web-download' : originalVariant ? 'original-variant' : 'preview-variant', metadata.width ?? null, metadata.height ?? null,
    input.source.kind === 'variant' ? JSON.stringify(input.source.metadata) : null, assetId)
  const lifecycle = active.database.prepare('SELECT lifecycle_state AS state FROM asset_lifecycle WHERE design_asset_identity=?').get(assetId) as { state: string } | undefined
  if (lifecycle && lifecycle.state !== 'active') throw fail()
  const existingAsset = active.database.prepare("SELECT 1 FROM assets a JOIN asset_lifecycle l ON l.design_asset_identity=a.id WHERE a.id=? AND l.lifecycle_state='active'").get(assetId)
  if (existingAsset) { checkSource(); updateMetadata(); if (input.source.kind === 'variant') completeVariantIntent(active.database, input.requestId); return { assetId } }
  await assertExistingDirectoryInsideManagedRoot(active.root, active.staging)
  const file = path.join(active.staging, `${prefix}-${input.requestId}.${metadata.format}`)
  try {
    const stageHandle = await fs.open(file, 'wx', 0o600)
    try { await stageHandle.writeFile(input.bytes); await stageHandle.sync() }
    finally { await stageHandle.close() }
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes: 32 * 1024 * 1024, sync: true })
  }
  const verifiedStage = await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes: 32 * 1024 * 1024 })
  if (input.source.kind === 'variant') recordVariantIntent(active.database, active.identity, { ...input, metadata: input.source.metadata })
  let batchIdentity: string | undefined
  const counts = new Map<string, number>()
  const createIdentity = (kind: CaptureIdentityKind) => {
    if (kind === 'design-asset') return assetId
    const count = (counts.get(kind) ?? 0) + 1; counts.set(kind, count)
    const identity = `${kind}:${prefix}:${input.requestId}:${count}`
    if (kind === 'capture-batch') batchIdentity = identity
    return identity
  }
  try {
  const workflow = await createActiveLibraryCaptureWorkflow({ session: active.session, selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: file }] }), generateSystemPreview: preview, createIdentity, resumeAccepted: options.resumeAccepted })
  const prepared = await workflow.prepare()
  if (prepared.kind !== 'planned' || !prepared.plan.confirmable) throw fail()
  checkSource()
    const captured = await workflow.dispatch({ kind: 'confirm-plan', planReceipt: prepared.plan.receipt })
    if (captured.state !== 'complete' || !captured.items.every(item => item.state === 'promoted')) throw fail()
    updateMetadata()
    if (input.source.kind === 'variant') completeVariantIntent(active.database, input.requestId)
  } catch (error) {
    if (input.source.kind === 'variant') throw new ActiveLibraryHostError('library-recovery-required', 'Image variant intake requires recovery.')
    if (batchIdentity) {
      let admitted: boolean
      try { admitted = !!active.database.prepare('SELECT 1 FROM capture_requests WHERE batch_identity=? LIMIT 1').get(batchIdentity) }
      catch { throw new ActiveLibraryHostError('library-recovery-required', 'Image intake outcome requires recovery.') }
      if (admitted) throw new ActiveLibraryHostError('library-recovery-required', 'Image intake requires recovery.')
    }
    throw error
  }
  try {
    const current = await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes: 32 * 1024 * 1024 })
    if (current.fileIdentity === verifiedStage.fileIdentity && JSON.stringify(current.directoryIdentities) === JSON.stringify(verifiedStage.directoryIdentities)) await fs.unlink(file)
  } catch { /* Capture committed: changed or retained staging is not an import failure. */ }
  return { assetId }
}
