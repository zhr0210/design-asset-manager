export interface TagIntentScope { libraryIdentity: string; generation: string; assetId: string }
export interface TagIntentContext {
  schemaVersion: number; sessionToken: string
  asset: { id: string; revision: string; previewGeneration: string }
}
export interface TagIntentCommit extends TagIntentScope {
  sessionToken: string; expectedSchemaVersion: number; allowUpgrade: boolean
  requestId: string; assetRevision: string; previewGeneration: string
  backendId: string; model: string; backendBindingSha256: string; recipeId: string; recipeVersion: string
}
export interface TagIntentSummary {
  requestId: string; assetId: string; model: string; backendId: string
  requestGeneration: number; state: 'waiting-execution' | 'paused' | 'cancelled' | 'superseded'
  revision: number; createdAt: string; sourceMatches: boolean
}
export interface TagIntentSnapshot { schemaVersion: number; sessionToken: string; requests: TagIntentSummary[] }
export interface TagIntentPrepare extends TagIntentScope { requestId: string; backendId: string; model?: string }
export interface TagIntentReview {
  receipt: string; requestId: string; model: string; backendName: string
  requiresUpgrade: boolean; storageNotice: string; expiresAt: string
}
export type TagIntentResponse<T> = { ok: true; value: T } | { ok: false; error: string }
export interface TagIntentApi {
  prepare(input: TagIntentPrepare): Promise<TagIntentResponse<TagIntentReview>>
  confirm(receipt: string): Promise<TagIntentResponse<TagIntentSummary>>
  read(scope: TagIntentScope): Promise<TagIntentResponse<TagIntentSnapshot>>
}
export const TAG_INTENT_PREPARE = 'independent-tags:prepare'
export const TAG_INTENT_CONFIRM = 'independent-tags:confirm'
export const TAG_INTENT_READ = 'independent-tags:read'
