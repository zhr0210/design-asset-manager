import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'

import { MAX_IMAGE_TOOL_BYTES as MAX_IMAGE_SOURCE_BYTES } from '../../shared/contracts/image-tools.contract'

type Binding = { root: string; managed: string; database: Database.Database }
type OriginalRow = { reference: string; sourceGeneration: string; sourceBytes: number; revision: string; preview: string }

/** Main only. Caller holds the exact Active Library lease throughout this read. */
export async function readManagedOriginal(active: Binding, assetId: string, revision: string, preview: string): Promise<{ bytes: Uint8Array; identity: string }> {
  const inspect = () => active.database.prepare(`
    SELECT c.managed_original_ref AS reference, r.source_generation AS sourceGeneration,
      r.source_bytes AS sourceBytes, l.revision, c.grid_thumbnail_ref AS preview
    FROM asset_lifecycle l JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity
    JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
    JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity
    WHERE l.design_asset_identity=? AND l.lifecycle_state='active' AND l.ownership='managed'
  `).get(assetId) as OriginalRow | undefined
  const row = inspect()
  if (!row || row.revision !== revision || row.preview !== preview ||
    !row.reference?.startsWith('managed-original:') || !/^sha256:[a-f0-9]{64}$/.test(row.sourceGeneration) ||
    !Number.isSafeInteger(row.sourceBytes) || row.sourceBytes <= 0 || row.sourceBytes > MAX_IMAGE_SOURCE_BYTES) throw unavailable()
  const checked = await readVerifiedOwnedFile({
    root: active.root, role: active.managed, relative: row.reference.slice('managed-original:'.length),
    expectedSize: row.sourceBytes, expectedDigest: row.sourceGeneration.slice('sha256:'.length), maximumBytes: MAX_IMAGE_SOURCE_BYTES
  }).catch(() => { throw unavailable() })
  if (JSON.stringify(inspect()) !== JSON.stringify(row)) throw unavailable()
  const identity = createHash('sha256').update(JSON.stringify([row, checked.fileIdentity, checked.directoryIdentities])).digest('hex')
  return { bytes: checked.bytes, identity }
}

function unavailable() { return new ActiveLibraryHostError('library-operation-failed', '受管原件不可用或已变化，请重新检查素材。') }
