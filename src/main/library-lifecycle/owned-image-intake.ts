import {ORIGINALS_DIRECTORY_NAME} from './library-layout.internal'
import {createCanonicalCaptureEnvelopeDigest} from '../capture-intake/capture-gateway'
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

/** Reconcile a previous gesture from durable Copy evidence without reading the current clipboard. */
export async function readCompletedClipboardBytes(active:{identity:string;root:string;staging:string;database:Database.Database},input:{requestId:string;fileName:string}):Promise<Uint8Array|null>{
 const held=active.database.prepare('SELECT r.received_file_name AS fileName,r.source_bytes AS bytes,r.source_generation AS generation,r.source_format AS format,r.source_locator_digest AS locator,r.canonical_envelope_digest AS envelope,c.managed_original_ref AS original,p.design_asset_identity AS assetId,l.lifecycle_state AS state FROM capture_requests r JOIN asset_candidates c ON c.capture_request_identity=r.capture_request_identity LEFT JOIN promotion_links p ON p.candidate_identity=c.candidate_identity LEFT JOIN asset_lifecycle l ON l.design_asset_identity=p.design_asset_identity WHERE r.capture_request_identity=?').get(`capture-request:clipboard:${input.requestId}:1`) as {fileName:string;bytes:number;generation:string;format:string;locator:string;envelope:string;original:string|null;assetId:string|null;state:string|null}|undefined
 const recovery=()=>new ActiveLibraryHostError('library-recovery-required','Clipboard intake outcome requires recovery; the current clipboard was not read.')
 if(!held){try{await fs.lstat(path.join(active.staging,`clipboard-${input.requestId}.png`));throw recovery()}catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT')return null;throw error}}
 if(held.fileName!==input.fileName||held.format!=='png'||!Number.isSafeInteger(held.bytes)||held.bytes<1||held.bytes>96*1024*1024||!/^sha256:[a-f0-9]{64}$/.test(held.generation)||held.envelope!==createCanonicalCaptureEnvelopeDigest({receivedFileName:input.fileName,sourceBytes:held.bytes,sourceGeneration:held.generation,sourceLocatorDigest:held.locator,format:'png'},'clipboard'))throw recovery()
 if(held.assetId!==`clipboard-asset:${input.requestId}`||held.state!=='active'||!held.original?.startsWith('managed-original:'))throw recovery()
 return(await readVerifiedOwnedFile({root:active.root,role:path.join(active.root,ORIGINALS_DIRECTORY_NAME),relative:held.original.slice('managed-original:'.length),expectedSize:held.bytes,expectedDigest:held.generation.slice(7),maximumBytes:96*1024*1024})).bytes
}

/** Internal only: the Host must invoke this while holding its exact Library lease. */
export async function importOwnedImage(active: { identity: string; root: string; staging: string; database: Database.Database; session: ActiveLibrarySession }, input: {
  requestId: string; fileName: string; bytes: Uint8Array
  source: { kind: 'download'; url: string } | { kind: 'variant'; metadata: Record<string, unknown> } | { kind: 'clipboard' }
}, preview: (input: GenerateSystemPreviewInput) => Promise<SystemPreviewOutcome>, checkSource: () => void = () => {}, options: { resumeAccepted?: boolean } = {}) {
  const fail = () => new ActiveLibraryHostError('library-operation-failed', 'Image intake failed.')
  const clipboard=input.source.kind==='clipboard',maximumBytes=(clipboard?96:32)*1024*1024
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(input.requestId) || !input.bytes.byteLength || input.bytes.byteLength > maximumBytes) throw fail()
  const prefix = input.source.kind === 'download' ? 'download' : clipboard?'clipboard':'variant'
  const assetId = `${prefix}-asset:${input.requestId}`
  const metadata = await sharp(input.bytes, { limitInputPixels: clipboard?16_000_000:50_000_000,...(clipboard?{failOn:'warning' as const}:{}) }).metadata()
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw fail()
  if(clipboard){if(metadata.format!=='png'||!metadata.width||!metadata.height||metadata.width*metadata.height>16_000_000||(metadata.pages??1)!==1)throw fail();await sharp(input.bytes,{limitInputPixels:16_000_000,failOn:'warning'}).raw().toBuffer()}
  const sourceHash=createHash('sha256').update(input.bytes).digest('hex');let clipboardRecorded=false
  if(clipboard){
   const held=active.database.prepare('SELECT received_file_name AS fileName,source_bytes AS bytes,source_generation AS generation,source_locator_digest AS locator,source_format AS format,canonical_envelope_digest AS envelope FROM capture_requests WHERE capture_request_identity=?').get(`capture-request:clipboard:${input.requestId}:1`) as {fileName:string;bytes:number;generation:string;locator:string;format:string;envelope:string}|undefined
   clipboardRecorded=Boolean(held)
   if(held&&(held.fileName!==input.fileName||held.bytes!==input.bytes.byteLength||held.generation!=='sha256:'+sourceHash||held.format!=='png'||held.envelope!==createCanonicalCaptureEnvelopeDigest({receivedFileName:input.fileName,sourceBytes:input.bytes.byteLength,sourceGeneration:'sha256:'+sourceHash,sourceLocatorDigest:held.locator,format:'png'},'clipboard')))throw new ActiveLibraryHostError('library-operation-failed','Clipboard request conflicts with its recorded source.')
   if(held&&!active.database.prepare("SELECT 1 FROM assets a JOIN asset_lifecycle l ON l.design_asset_identity=a.id WHERE a.id=? AND l.lifecycle_state='active'").get(assetId))throw new ActiveLibraryHostError('library-recovery-required','Clipboard intake outcome requires recovery; do not automatically replay the request.')
  }
  const originalVariant = input.source.kind === 'variant' && input.source.metadata.kind === 'managed-original-variant'
  const updateMetadata = () => active.database.prepare('UPDATE assets SET title=CASE WHEN title=? THEN ? ELSE title END,file_name=CASE WHEN file_name=? THEN ? ELSE file_name END,source_site_id=?,source_site_name=?,original_url=?,capture_method=?,width=?,height=?,image_metadata_json=? WHERE id=?').run(
    `${prefix}-${input.requestId}`, input.fileName.replace(/\.[^.]+$/, ''), `${prefix}-${input.requestId}.${metadata.format}`, input.fileName, prefix === 'download' ? 'web-download' : clipboard?'clipboard':'image-tools',
    prefix === 'download' ? 'Web Capture' : clipboard?'剪贴板图片':originalVariant ? '图片工具 · 原件派生副本' : '图片工具 · 预览副本', input.source.kind === 'download' ? input.source.url : null,
    prefix === 'download' ? 'web-download' : clipboard?'copy-into-library':originalVariant ? 'original-variant' : 'preview-variant', metadata.width ?? null, metadata.height ?? null,
    input.source.kind === 'variant' ? JSON.stringify(input.source.metadata) : clipboard?JSON.stringify({kind:'clipboard',requestId:input.requestId,requestFileName:input.fileName,sourceSha256:sourceHash,sourceBytes:input.bytes.byteLength,format:'png'}):null, assetId)
  const lifecycle = active.database.prepare('SELECT lifecycle_state AS state FROM asset_lifecycle WHERE design_asset_identity=?').get(assetId) as { state: string } | undefined
  if (lifecycle && lifecycle.state !== 'active') throw fail()
  const existingAsset = active.database.prepare("SELECT 1 FROM assets a JOIN asset_lifecycle l ON l.design_asset_identity=a.id WHERE a.id=? AND l.lifecycle_state='active'").get(assetId)
  if (existingAsset) { checkSource(); if(clipboard){
    if(!clipboardRecorded)throw new ActiveLibraryHostError('library-recovery-required','Clipboard capture authority requires recovery.')
    const original=active.database.prepare('SELECT c.managed_original_ref AS ref FROM asset_candidates c JOIN promotion_links p ON p.candidate_identity=c.candidate_identity WHERE p.design_asset_identity=?').get(assetId) as {ref:string}|undefined
    if(!original||typeof original.ref!=='string'||!original.ref.startsWith('managed-original:'))throw new ActiveLibraryHostError('library-recovery-required','Clipboard original authority requires recovery.')
    await readVerifiedOwnedFile({root:active.root,role:path.join(active.root,ORIGINALS_DIRECTORY_NAME),relative:original.ref.slice('managed-original:'.length),expectedSize:input.bytes.byteLength,expectedDigest:sourceHash,maximumBytes});checkSource()
    const recorded=active.database.prepare('SELECT source_site_id AS site,capture_method AS method,image_metadata_json AS metadata FROM assets WHERE id=?').get(assetId) as {site:string;method:string;metadata:string|null}
    let provenance:Record<string,unknown>;try{provenance=JSON.parse(recorded.metadata||'null')}catch{throw new ActiveLibraryHostError('library-recovery-required','Clipboard source provenance requires recovery.')}
    if(!provenance||recorded.site!=='clipboard'||recorded.method!=='copy-into-library'||provenance.kind!=='clipboard'||provenance.requestId!==input.requestId||provenance.requestFileName!==input.fileName||provenance.sourceSha256!==sourceHash||provenance.sourceBytes!==input.bytes.byteLength||provenance.format!=='png')throw new ActiveLibraryHostError('library-recovery-required','Clipboard source provenance requires recovery.')
  }else updateMetadata(); if (input.source.kind === 'variant') completeVariantIntent(active.database, input.requestId); return { assetId } }
  await assertExistingDirectoryInsideManagedRoot(active.root, active.staging)
  const file = path.join(active.staging, `${prefix}-${input.requestId}.${metadata.format}`)
  try {
    const stageHandle = await fs.open(file, 'wx', 0o600)
    try { await stageHandle.writeFile(input.bytes); await stageHandle.sync() }
    finally { await stageHandle.close() }
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes, sync: true })
  }
  const verifiedStage = await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes })
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
  const workflow = await createActiveLibraryCaptureWorkflow({ session: active.session, sourceKind:clipboard?'clipboard':'local-file',selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: file,...(clipboard?{receivedFileName:input.fileName}:{}) }] }), generateSystemPreview: preview, createIdentity, resumeAccepted: options.resumeAccepted })
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
    const current = await readVerifiedOwnedFile({ root: active.root, role: active.staging, relative: path.basename(file), expectedSize: input.bytes.byteLength, expectedDigest: createHash('sha256').update(input.bytes).digest('hex'), maximumBytes })
    if (current.fileIdentity === verifiedStage.fileIdentity && JSON.stringify(current.directoryIdentities) === JSON.stringify(verifiedStage.directoryIdentities)) await fs.unlink(file)
  } catch { /* Capture committed: changed or retained staging is not an import failure. */ }
  return { assetId }
}
