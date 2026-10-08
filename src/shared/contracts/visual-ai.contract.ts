export const CHANNEL_VISUAL_AI_PREPARE = 'visual-ai:prepare'
export const CHANNEL_VISUAL_AI_RUN = 'visual-ai:run'
export const CHANNEL_VISUAL_AI_INSPECT = 'visual-ai:inspect'
export const CHANNEL_VISUAL_AI_CANCEL = 'visual-ai:cancel'
export const CHANNEL_VISUAL_AI_RESULTS = 'visual-ai:results'
export const CHANNEL_VISUAL_AI_BACKENDS = 'visual-ai:backends'
export const CHANNEL_VISUAL_AI_CONFIRM_TAG = 'visual-ai:confirm-tag'
export const EVENT_VISUAL_AI_UPDATED = 'visual-ai:updated'

/** Current, revision-matched evidence for browsing. Suggestions stay separate from confirmed tags. */
export interface VisualAiSummary {
  evidenceId: string
  model: string
  createdAt: string
  caption: string
  prompt: string
  ocrText: string
  tags: string[]
  pendingTags: string[]
}
export interface VisualAiScope { libraryIdentity: string; generation: string }
export type VisualAiPurpose = 'analyze' | 'reverse'
export interface VisualAiOutput { caption: string; ocrText: string; prompt: string; tags: string[] }
export interface AiExecutionUsage {inputTokens:number|null;outputTokens:number|null;costEstimateUsd:number|null;source:'pi-catalog-estimate'|'unpriced'}
export interface VisualAiEvidence {
  reasoning?:import('../workflows/ai-reasoning.workflow').AiReasoningLevel
  usage?:AiExecutionUsage
  id: string; assetId: string; assetRevision: string; previewGeneration: string; inputSha256: string
  upstreamEvidenceId?:string;processingLocation?:'local-service'|'external-service'
  backendId: string; providerOrigin: string; model: string; purpose: VisualAiPurpose
  inputScope: 'controlled-preview-rgb'; recipe: 'visual-ai-v1'; createdAt: string; output: VisualAiOutput
}
export interface VisualAiPrepareRequest extends VisualAiScope { assetIds: string[]; backendId: string; model?: string; refineEvidenceId?:string; purpose: VisualAiPurpose }
export interface VisualAiReview {
  receipt: string; backendName: string; providerOrigin: string; model: string; location: 'local' | 'external'
  purpose: VisualAiPurpose; assets: Array<{ id: string; title: string }>; inputScope: 'controlled-preview-rgb'
  inputDescription: string; storageNotice: string; expiresAt: string
}
export interface VisualAiJob extends VisualAiScope {
  id: string; state: 'queued' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled'
  items: Array<{ assetId: string; state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; evidence?: VisualAiEvidence; error?: string }>
}
export type VisualAiResponse<T> = { ok: true; value: T } | { ok: false; error: string }
export interface VisualAiBackendChoice { id: string; name: string; defaultModel: string; taskModels?:Partial<Record<'analyze'|'reverse'|'tags',string>>; location: 'local' | 'external' }
export interface VisualAiApi {
  backends(): Promise<VisualAiResponse<VisualAiBackendChoice[]>>
  prepare(input: VisualAiPrepareRequest): Promise<VisualAiResponse<VisualAiReview>>
  discardReview(receipt:string):Promise<VisualAiResponse<void>>
  run(receipt: string): Promise<VisualAiResponse<VisualAiJob>>
  inspect(jobId: string): Promise<VisualAiResponse<VisualAiJob>>
  cancel(jobId: string): Promise<VisualAiResponse<VisualAiJob>>
  results(scope: VisualAiScope & { assetId: string }): Promise<VisualAiResponse<VisualAiEvidence[]>>
  confirmTag(scope: VisualAiScope & { assetId: string; evidenceId: string; tag: string }): Promise<VisualAiResponse<void>>
}
