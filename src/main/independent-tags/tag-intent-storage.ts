import type Database from 'better-sqlite3'
import { createHash } from 'node:crypto'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import type { TagIntentScope, TagIntentContext, TagIntentCommit, TagIntentSummary, TagIntentSnapshot } from '../../shared/contracts/independent-tag-intent.contract'
import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'

export interface TagIntentBinding { identity: string; generation: string; notebookSession: string; database: Database.Database }
export const tagIntentFail = (code: string): never => { throw new ActiveLibraryHostError('library-operation-failed', code) }
export function tagIntentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(value)) return tagIntentFail('TAG_INTENT_INPUT_INVALID')
  return value
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\x00-\x1f]/.test(value)) return tagIntentFail('TAG_INTENT_INPUT_INVALID')
  return value
}
export function readTagIntentContext(a: TagIntentBinding, scope: TagIntentScope): TagIntentContext {
  if (!scope || scope.libraryIdentity !== a.identity || scope.generation !== a.generation) return tagIntentFail('TAG_INTENT_SCOPE_EXPIRED')
  const assetId = tagIntentId(scope.assetId), version = Number(a.database.pragma('user_version', { simple: true }))
  if (!isKnownLibrarySchemaVersion(version)) return tagIntentFail('TAG_INTENT_SCHEMA_UNSUPPORTED')
  const asset = a.database.prepare(`SELECT l.design_asset_identity AS id,l.revision,c.grid_thumbnail_ref AS previewGeneration
    FROM asset_lifecycle l JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity
    JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
    WHERE l.design_asset_identity=? AND l.lifecycle_state='active'`).get(assetId) as TagIntentContext['asset'] | undefined
  if (!asset) return tagIntentFail('TAG_INTENT_ASSET_UNAVAILABLE')
  return { schemaVersion: version, sessionToken: a.notebookSession, asset }
}
export function validateTagIntentCommit(a: TagIntentBinding, input: TagIntentCommit, signal?: AbortSignal): TagIntentContext {
  if((a.database.prepare('SELECT file_type FROM assets WHERE id=?').get(input.assetId) as {file_type:string}|undefined)?.file_type==='mp4')return tagIntentFail('视频不参与整图分析，请先明确选择参考帧。')
  const context = readTagIntentContext(a, input)
  if (input.sessionToken !== a.notebookSession || signal?.aborted) return tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
  tagIntentId(input.requestId); tagIntentId(input.backendId); text(input.model)
  if (!isKnownLibrarySchemaVersion(input.expectedSchemaVersion) || typeof input.allowUpgrade !== 'boolean' ||
    !/^[a-f0-9]{64}$/.test(input.backendBindingSha256) ||
    (input.recipeId !== 'independent-tags-v1' && !(context.schemaVersion>=10 && input.recipeId==='visual-ai-v1')) || input.recipeVersion !== '1') return tagIntentFail('TAG_INTENT_INPUT_INVALID')
  if (context.asset.revision !== input.assetRevision || context.asset.previewGeneration !== input.previewGeneration) return tagIntentFail('TAG_INTENT_SOURCE_CHANGED')
  return context
}
export function tagIntentPayloadDigest(input: TagIntentCommit): string {
  return createHash('sha256').update(JSON.stringify([input.libraryIdentity,input.assetId,input.assetRevision,input.previewGeneration,
    input.backendId,input.model,input.backendBindingSha256,input.recipeId,input.recipeVersion])).digest('hex')
}
export function readTagIntentSummaries(a: TagIntentBinding, scope: TagIntentScope, requestId?: string): TagIntentSummary[] {
  const current = readTagIntentContext(a, scope)
  if (current.schemaVersion < 9) return []
  const rows = a.database.prepare(`SELECT r.request_id AS requestId,i.asset_id AS assetId,r.model_name AS model,r.backend_id AS backendId,
    i.request_generation AS requestGeneration,i.state,i.revision,r.created_at AS createdAt,i.asset_revision,i.preview_generation
    FROM independent_tag_requests r JOIN independent_tag_request_items i ON i.request_id=r.request_id
    WHERE r.library_identity=? AND i.asset_id=? ${requestId ? 'AND r.request_id=?' : "AND r.recipe_id='independent-tags-v1'"}
    ORDER BY r.created_at DESC,r.request_id DESC LIMIT 50`).all(a.identity,scope.assetId,...(requestId ? [requestId] : [])) as Array<TagIntentSummary & { asset_revision: string; preview_generation: string }>
  return rows.map(({ asset_revision, preview_generation, ...row }) => ({ ...row, sourceMatches: asset_revision === current.asset.revision && preview_generation === current.asset.previewGeneration }))
}
export function readTagIntents(a: TagIntentBinding, scope: TagIntentScope): TagIntentSnapshot {
  const c = readTagIntentContext(a, scope)
  return { schemaVersion: c.schemaVersion, sessionToken: c.sessionToken, requests: readTagIntentSummaries(a, scope) }
}
/** Scope/session/content must be validated by the Host before this receipt lookup. */
export function existingTagIntent(a: TagIntentBinding, input: TagIntentCommit): TagIntentSummary | undefined {
  if (Number(a.database.pragma('user_version', { simple: true })) < 9) return undefined
  const row = a.database.prepare('SELECT payload_sha256 FROM independent_tag_requests WHERE request_id=?').get(input.requestId) as { payload_sha256: string } | undefined
  if (!row) return undefined
  if (row.payload_sha256 !== tagIntentPayloadDigest(input)) return tagIntentFail('TAG_INTENT_REQUEST_CONFLICT')
  const result = readTagIntentSummaries(a,input,input.requestId)[0]
  if (!result) return tagIntentFail('TAG_INTENT_REQUEST_CONFLICT')
  return result
}
/** Called only in the Host's synchronous write transaction after schema verification. */
export function insertTagIntent(a: TagIntentBinding, input: TagIntentCommit): TagIntentSummary {
  const existing = existingTagIntent(a,input); if (existing) return existing
  const maximum = a.database.prepare(`SELECT COALESCE(MAX(request_generation),0) AS value FROM independent_tag_request_items
    WHERE asset_id=? AND asset_revision=? AND preview_generation=?`).get(input.assetId,input.assetRevision,input.previewGeneration) as { value: number }
  if (!Number.isSafeInteger(maximum.value) || maximum.value >= Number.MAX_SAFE_INTEGER) return tagIntentFail('TAG_INTENT_GENERATION_EXHAUSTED')
  const now = new Date().toISOString()
  a.database.prepare('INSERT INTO independent_tag_requests VALUES(?,?,?,?,?,?,?,?,?)').run(input.requestId,a.identity,tagIntentPayloadDigest(input),input.backendId,input.model,input.backendBindingSha256,input.recipeId,input.recipeVersion,now)
  a.database.prepare("INSERT INTO independent_tag_request_items VALUES(?,?,0,?,?,?,'waiting-execution',1,?)").run(input.requestId,input.assetId,input.assetRevision,input.previewGeneration,maximum.value+1,now)
  return readTagIntentSummaries(a,input,input.requestId)[0]
}
