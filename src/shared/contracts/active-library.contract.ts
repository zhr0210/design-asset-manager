import type {BackgroundOcrScope,BackgroundOcrSession,BackgroundOcrSnapshot,BackgroundOcrPermission,BackgroundOcrClaim,BackgroundOcrCommit,BackgroundOcrReceipt} from './background-ocr.contract'
import type {BasicRequest,BasicClaim,BasicScope,CaptionEvidence,CaptionOutput,BasicAttempts,BasicRecovery} from './basic-analysis.contract'
import type {BackgroundExecutionConfiguration,BackgroundExecutionClaim,BackgroundExecutionSnapshot,BackgroundRecoveryDecision} from './background-analysis.contract'
import type {BackgroundScope,BackgroundSnapshot,BackgroundConfigCommit,BackgroundDecision} from './background-analysis.contract'
import type {TagRecoveryScope,TagRecoveryStored,TagRecoveryReceipt} from './tag-recovery.contract'
import type {TagBatchCommit,TagBatchSaved} from './tag-batch.contract'
import type {TagDecisionPrepare,TagDecisionCommit,TagDecisionContext} from './tag-decision.contract'
import type {TagExecutionUpgrade,TagClaimRequest,TagAttemptClaim,TagEffectCommit,TagEffectReceipt,TagAttemptFinish,TagExecutionSnapshot,TagAttemptRef,TagExecutionRequest} from './tag-execution.contract'
import type {WorkScope,WorkSetCatalog,WorkSetWrite,WorkLayoutWrite,WorkWindowLayout} from './work-set.contract'
import type {OrganizationScope,OrganizationSnapshot,OrganizationWrite,MeasuredPreviewColors} from './library-organization.contract'
import type {NotebookScope, NotebookSnapshot, NotebookSaveRequest} from './asset-notebook.contract'
import type { IntakeRecoveryState, IntakeRecoveryReview } from './intake-recovery.contract'
import type { DownloadJournalCommand, DownloadJournalResult } from './download-journal.contract'
import type { ImageVariantInput } from './image-tools.contract'
import type { VisualAiEvidence } from './visual-ai.contract'
import type { TagIntentScope, TagIntentContext, TagIntentCommit, TagIntentSummary, TagIntentSnapshot } from './independent-tag-intent.contract'
/** Public, path-free state projection for the Main-owned Active Library Host. */
export type ActiveLibraryHostState =
  | 'unopened'
  | 'opening'
  | 'ready'
  | 'quiescing'
  | 'closed'
  | 'recovery-required'

export type ActiveLibraryHostErrorCode =
  | 'work-set-conflict'
  | 'work-set-upgrade-required'
  | 'organization-conflict'
  | 'organization-upgrade-required'
  | 'notebook-conflict'
  | 'notebook-upgrade-required'
  | 'library-not-open'
  | 'library-opening'
  | 'library-quiescing'
  | 'library-closed'
  | 'library-recovery-required'
  | 'library-lock-invalid'
  | 'library-generation-conflict'
  | 'library-identity-conflict'
  | 'library-schema-invalid'
  | 'library-target-invalid'
  | 'library-target-not-empty'
  | 'library-plan-not-found'
  | 'library-receipt-stale'
  | 'library-operation-failed'

export class ActiveLibraryHostError extends Error {
  constructor(readonly code: ActiveLibraryHostErrorCode, message: string) {
    super(message)
    this.name = 'ActiveLibraryHostError'
  }
}

export interface ActiveLibraryHostProjection {
  state: ActiveLibraryHostState
  identity: string | null
  generation: string | null
}

export interface ActiveLibraryAssetProjection {
  id: string
  revision: string
  title: string
  fileName: string
  sourceSiteId: string
  sourceSiteName: string
  width: number | null
  height: number | null
  fileSize: number | null
  fileType: string | null
  thumbnailRef: string
  tags: readonly string[]
  tagAliases?: readonly string[]
  createdAt: string
  aiCaption: string
  aiCaptionSource?: string
  aiCaptionUpdatedAt?: string
  aiCaptionIsUserEdited: boolean
  ocr?: import('./asset-ocr.contract').OcrSummary
  aiOcrText?: string
  tagAnalysis?:import('./tag-execution.contract').TagCurrentSummary|null
  visualAi?: import('./visual-ai.contract').VisualAiSummary
}

export interface ActiveLibraryTagProjection {
  id: string
  name: string
  type: string
  color: string | null
  usageCount: number
  aliases?: readonly string[]
  parentId?: string | null
  isSystem?: boolean
}

export interface ActiveLibraryTrashEntryProjection {
  id: string
  revision: string
  state: 'active' | 'trash'
  ownership: 'managed' | 'referenced'
  trashedAt: string | null
  thumbnailRef: string | null
}

export interface CreateLibraryPlanProjection {
  receipt: string
  targetState: 'missing' | 'empty'
  identity: string
  generation: string
  roles: readonly ['library-control', 'managed-originals', 'required-previews', 'intake-staging']
  confirmable: true
}

export interface CreateLibraryResult {
  identity: string
  generation: string
}

export interface ActiveLibraryTagInput {
  name: string
  type?: string
  color?: string
}

export interface ActiveLibraryCopyPlan {
  receipt: string
  activeLibrary: { identity: string; generation: string }
  summary: {
    selectedCount: number
    eligibleCount: number
    excludedCount: number
    sourceBytes: number
    estimatedManagedBytes: number
  }
  items: readonly ActiveLibraryCopyPlanItem[]
  confirmable: boolean
}

export interface ActiveLibraryCopyPlanItem {
  planItemIdentity: string
  receivedFileName: string
  sourceScopeLabel: string
  sourceBytes: number
  detectedFormat: 'jpeg' | 'png' | 'webp' | 'mp4' | null
  eligibility: { kind: 'eligible' } | {
    kind: 'excluded'
    code: 'not-a-regular-file' | 'source-unreadable' | 'unsupported-format'
    message: string
  }
}

export type ActiveLibraryCapturePrepareResponse =
  | { kind: 'cancelled' }
  | { kind: 'planned'; plan: ActiveLibraryCopyPlan }

export interface ActiveLibraryCaptureBatchSnapshot {
  batchIdentity: string
  activeLibraryIdentity: string
  state: 'running' | 'complete'
  items: readonly ActiveLibraryCaptureBatchItem[]
}

export interface ActiveLibraryCaptureBatchItem {
  planItemIdentity: string
  captureRequestIdentity: string
  candidateIdentity: string
  originalStorageObjectIdentity: string
  state: 'intake' | 'active' | 'promoted'
  candidate: { state: 'intake' } | { state: 'active' | 'promoted'; managedOriginalRef: string; copyVerification: 'verified'; sourcePreservation: 'verified' }
  preview: { state: 'pending' } | { state: 'ready'; generationIdentity: string; gridThumbnailRef: string }
  promotion?: { state: 'promoted'; designAssetIdentity: string; promotionLinkIdentity: string }
}

export interface ActiveLibraryTrashPlan {
  receipt: string
  designAssetIdentity: string
  expectedRevision: string
  impact: {
    recoverable: true
    assetRecord: 'retained'
    tagRelations: 'retained'
    original: 'retained' | 'external-untouched'
    promotionHistory: 'retained' | 'not-applicable'
  }
}

export interface ActiveLibraryTrashSnapshot {
  designAssetIdentity: string
  revision: string
  state: 'active' | 'trash'
  ownership: 'managed' | 'referenced'
  trashedAt: string | null
  tagIdentities: readonly string[]
}

export interface LibraryTrashPrepareRequest {
  kind: 'move-design-asset-to-trash'
  designAssetIdentity: string
  expectedRevision: string
}

export type LibraryTrashDispatchCommand =
  | { kind: 'confirm-plan'; planReceipt: string }
  | { kind: 'restore-design-asset'; designAssetIdentity: string; expectedRevision: string }

export interface LibraryTrashInspectRequest {
  designAssetIdentity: string
}

export interface LibraryMediaReadPreviewRequest {
  assetId: string
  libraryIdentity: string
  generation: string
}

export interface ActiveLibraryAssetContext { schemaVersion: number; assets: readonly ActiveLibraryAssetProjection[] }

export interface ActiveLibraryHost {
  workMediaStatus(scope:WorkScope):Promise<{schemaVersion:number;sessionToken:string}>
  enableWorkMedia(input:WorkScope&{sessionToken:string;allowUpgrade:boolean;expectedSchemaVersion:number}):Promise<void>
  readWorkMedia(input:import('./work-media.contract').WorkMediaScope):Promise<import('./work-media.contract').WorkMediaSnapshot>
  writeWorkMedia(input:import('./work-media.contract').WorkMediaWrite,signal?:AbortSignal):Promise<import('./work-media.contract').WorkMediaSnapshot>
  readWorkMediaFile(input:import('./work-media.contract').WorkMediaFile):Promise<{bytes:Uint8Array;type:string;fileName:string;sourceGeneration:string}>
  readOcr(scope:import('./asset-ocr.contract').OcrScope):Promise<import('./asset-ocr.contract').OcrSnapshot>
  commitOcr(input:import('./asset-ocr.contract').OcrCommit,signal?:AbortSignal):Promise<import('./asset-ocr.contract').OcrSnapshot>
  correctOcr(input:import('./asset-ocr.contract').OcrCorrection):Promise<import('./asset-ocr.contract').OcrSnapshot>
  readWorkSets(scope:WorkScope,deviceId:string):Promise<WorkSetCatalog>
  writeWorkSet(input:WorkSetWrite,deviceId:string,layout?:WorkWindowLayout):Promise<WorkSetCatalog>
  writeWorkLayout(input:WorkLayoutWrite,deviceId:string):Promise<void>
  measurePreviewColors(scope:OrganizationScope & {assetId:string}):Promise<MeasuredPreviewColors>
  readOrganization(scope:OrganizationScope):Promise<OrganizationSnapshot>
  writeOrganization(input:OrganizationWrite):Promise<OrganizationSnapshot>
  readNotebook(scope:NotebookScope):Promise<NotebookSnapshot>
  saveNotebook(input:NotebookSaveRequest):Promise<NotebookSnapshot>
  /** Main-only bounded metadata lookup; no new Renderer channel or write authority. */
  readAssetContext(ids: readonly string[]): Promise<ActiveLibraryAssetContext>
  readTagIntentContext(scope: TagIntentScope): Promise<TagIntentContext>
  readTagIntents(scope: TagIntentScope): Promise<TagIntentSnapshot>
  readBackgroundOcr(input:BackgroundOcrScope):Promise<BackgroundOcrSnapshot>
  configureBackgroundOcr(input:BackgroundOcrPermission,signal?:AbortSignal):Promise<BackgroundOcrSnapshot>
  revokeBackgroundOcr():void
  claimBackgroundOcr(input:BackgroundOcrSession&{runtimeFingerprint:string}):Promise<BackgroundOcrClaim|null>
  markBackgroundOcrSent(input:BackgroundOcrClaim):Promise<void>
  commitBackgroundOcr(input:BackgroundOcrCommit,signal?:AbortSignal):Promise<BackgroundOcrReceipt>
  finishBackgroundOcr(input:BackgroundOcrClaim,state:'failed'|'cancelled'|'unknown'|'deferred'):Promise<void>
  readBackgroundAnalysis(input:BackgroundScope):Promise<BackgroundSnapshot>
  enableBasicAnalysis(input:BackgroundScope&{sessionToken:string;expectedSchemaVersion:number;allowUpgrade:boolean},signal?:AbortSignal):Promise<void>
  beginBasicRequest(input:BasicRequest):Promise<BasicRequest&{requestGeneration:number}>
  claimBasicAnalysis(input:BasicRequest&{inputSha256:string}):Promise<BasicClaim>
  markBasicAnalysisSent(input:BasicClaim,background?:BackgroundExecutionClaim):Promise<void>
  commitCaption(input:BasicClaim,caption:string|CaptionOutput,signal?:AbortSignal,background?:BackgroundExecutionClaim):Promise<CaptionEvidence>
  finishBasicAnalysis(input:BasicClaim,state:'failed'|'cancelled'|'unknown'|'paused'):Promise<void>
  readCaptions(scope:BasicScope):Promise<CaptionEvidence[]>
  readBasicAttempts(scope:BasicScope):Promise<BasicAttempts>
  recoverBasicAnalysis(input:BasicRecovery):Promise<BasicAttempts>
  readBackgroundExecution(scope:BackgroundScope):Promise<BackgroundExecutionSnapshot>
  configureBackgroundExecution(input:BackgroundExecutionConfiguration,signal?:AbortSignal):Promise<BackgroundExecutionSnapshot>
  claimBackgroundExecution(input:BackgroundScope&{sessionToken:string;capability:string}):Promise<BackgroundExecutionClaim|null>
  attachBackgroundRequest(claim:BackgroundExecutionClaim,requestId:string):Promise<void>
  markBackgroundExecutionSent(claim:BackgroundExecutionClaim):Promise<void>
  finishBackgroundExecution(claim:BackgroundExecutionClaim,state:'failed'|'cancelled'|'unknown'|'deferred'):Promise<void>
  recoverBackgroundExecution(input:BackgroundRecoveryDecision):Promise<BackgroundExecutionSnapshot>
  configureBackgroundAnalysis(input:BackgroundConfigCommit,signal?:AbortSignal):Promise<BackgroundSnapshot>
  changeBackgroundIntent(input:BackgroundDecision,signal?:AbortSignal):Promise<BackgroundSnapshot>
  readTagRecovery(input:TagRecoveryScope,allowRelated:boolean,requestId?:string):Promise<TagRecoveryStored[]>
  readTagEffectReceipt(input:import('./tag-execution.contract').TagExecutionScope&{requestId:string}):Promise<TagRecoveryReceipt>
  saveTagBatch(input:TagBatchCommit,signal?:AbortSignal):Promise<TagBatchSaved>
  saveTagIntent(input: TagIntentCommit, signal?: AbortSignal): Promise<TagIntentSummary>
  downloadJournal(command: DownloadJournalCommand): Promise<DownloadJournalResult>
  listIntakeRecovery(): Promise<IntakeRecoveryState>
  prepareIntakeRecovery(input: { id: string; selectSource?: boolean }): Promise<IntakeRecoveryReview | { kind: 'cancelled' }>
  runIntakeRecovery(receipt: string): Promise<{ assetId: string }>
  inspect(): ActiveLibraryHostProjection
  prepareCreate(): Promise<
    | { kind: 'cancelled' }
    | { kind: 'planned'; plan: CreateLibraryPlanProjection }
  >
  confirmCreate(receipt: string): Promise<CreateLibraryResult>
  open(): Promise<CreateLibraryResult | { kind: 'cancelled' }>
  reopen(): Promise<CreateLibraryResult>
  close(): Promise<void>
  prepareAddAssets(): Promise<ActiveLibraryCapturePrepareResponse>
  dispatchAddAssets(planReceipt: string): Promise<ActiveLibraryCaptureBatchSnapshot>
  inspectCapture(batchIdentity: string): Promise<ActiveLibraryCaptureBatchSnapshot>
  listAssets(): Promise<readonly ActiveLibraryAssetProjection[]>
  searchAssets(queries: readonly string[]): Promise<readonly ActiveLibraryAssetProjection[]>
  searchAssetPage(input: import('./asset-search.contract').AssetSearchRequest): Promise<import('./asset-search.contract').AssetSearchPage>
  readRetrievalCoverage():Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  startRetrievalGeneration(input:import('./retrieval-workspace.contract').RetrievalGenerationRequest):Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  pauseRetrievalGeneration(scope:import('./retrieval-workspace.contract').RetrievalScope,id:string):Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  resumeRetrievalGeneration(scope:import('./retrieval-workspace.contract').RetrievalScope,id:string):Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  searchSemanticPage(input:import('./retrieval-workspace.contract').AssetSemanticSearchRequest,owner?:string,external?:Uint8Array):Promise<import('./retrieval-workspace.contract').AssetSemanticSearchPage>
  cancelSemanticQuery(scope:import('./retrieval-workspace.contract').RetrievalScope,queryId:string,owner?:string):Promise<void>
  rebuildRetrievalIndex():Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  switchRetrievalSpace(scope:import('./retrieval-workspace.contract').RetrievalScope,id:string):Promise<import('./retrieval-workspace.contract').RetrievalCoverage>
  suspendRetrievalWork():void
  cancelSemanticOwner(owner:string):void
  readSearchIndex(): Promise<import('./asset-search.contract').AssetSearchIndexStatus>
  rebuildSearchIndex(): Promise<import('./asset-search.contract').AssetSearchIndexStatus>
  listTags(): Promise<readonly ActiveLibraryTagProjection[]>
  searchTags(query: string): Promise<readonly ActiveLibraryTagProjection[]>
  getTag(tagId: string): Promise<ActiveLibraryTagProjection | null>
  listTrash(): Promise<readonly ActiveLibraryTrashEntryProjection[]>
  readPreview(designAssetIdentity: string): Promise<Uint8Array>
  readVisualSession(scope:import('./visual-ai.contract').VisualAiScope):Promise<{sessionToken:string;leaseIdentity:string}>
  readVisualPreview(input:import('./tag-execution.contract').TagExecutionScope&{assetRevision:string;previewGeneration:string}):Promise<Uint8Array>
  /** Main-only image tool reader; not exposed as a Preload channel. */
  readManagedOriginal(assetId: string, revision: string, previewGeneration: string): Promise<{ bytes: Uint8Array; identity: string }>
  importDownloadedImage(input: { requestId: string; generation: string; fileName: string; sourceUrl: string; bytes: Uint8Array }): Promise<{ assetId: string }>
  /** Main-only: resume a previously admitted download without another HTTP request. */
  recoverDownloadedImage(input: { requestId: string; generation: string; fileName: string; sourceUrl: string }): Promise<{ assetId: string }>
  saveImageVariant(input: ImageVariantInput, signal?: AbortSignal): Promise<{ assetId: string }>
  /** Main-only authority-cycle gate; its release cannot release another cycle. */
  holdBusinessAdmission():()=>void
  readTagDecisionContext(input:TagDecisionPrepare):Promise<TagDecisionContext>
  decideTag(input:TagDecisionCommit,signal?:AbortSignal):Promise<TagExecutionSnapshot>
  enableTagExecution(input:TagExecutionUpgrade,signal?:AbortSignal):Promise<void>
  claimTagExecution(input:TagClaimRequest):Promise<TagAttemptClaim>
  markTagExecutionSent(input:TagAttemptRef):Promise<void>
  commitTagExecution(input:TagEffectCommit,signal?:AbortSignal):Promise<TagEffectReceipt>
  finishTagExecution(input:TagAttemptFinish):Promise<void>
  readTagExecutionRequest(scope:import('./independent-tag-intent.contract').TagIntentScope,requestId:string):Promise<TagExecutionRequest>
  readTagOutbox(scope:import('./visual-ai.contract').VisualAiScope&{sessionToken:string}):Promise<Array<{eventId:string;assetId:string}>>
  ackTagOutbox(scope:import('./visual-ai.contract').VisualAiScope&{sessionToken:string},eventId:string):Promise<void>
  readTagExecution(scope:import('./independent-tag-intent.contract').TagIntentScope):Promise<TagExecutionSnapshot>
  enableVisualAi(): Promise<void>
  saveVisualAiEvidence(evidence: VisualAiEvidence, signal?: AbortSignal): Promise<void>
  listVisualAiEvidence(assetId: string): Promise<VisualAiEvidence[]>
  confirmVisualAiTag(assetId: string, evidenceId: string, tag: string): Promise<void>
  createTag(input: ActiveLibraryTagInput): Promise<ActiveLibraryTagProjection>
  updateTag(tagId: string, input: Pick<ActiveLibraryTagInput, 'name' | 'type' | 'color'>, expected?: Pick<ActiveLibraryTagProjection, 'name' | 'type' | 'color'>): Promise<ActiveLibraryTagProjection>
  createTagAlias(tagId: string, alias: string): Promise<void>
  removeTagAlias(tagId: string, alias: string): Promise<void>
  setTagParent(tagId: string, parentId: string | null, expectedParentId?: string | null): Promise<void>
  addTagToAsset(assetId: string, tagId: string): Promise<void>
  removeTagFromAsset(assetId: string, tagId: string): Promise<void>
  batchAddTagsToAssets(assetIds: readonly string[], tagIds: readonly string[]): Promise<void>
  batchRemoveTagsFromAssets(assetIds: readonly string[], tagIds: readonly string[]): Promise<void>
  replaceTagForAssets(assetIds: readonly string[], oldTagId: string, newTagId: string): Promise<void>
  listAssetTags(assetId: string): Promise<readonly { id: string; tagId: string; tagName: string; status: string }[]>
  updateAssetCaption(assetId: string, caption: string, expectedCaption?: string): Promise<void>
  resetAssetCaptionEdited(assetId: string): Promise<void>
  prepareTrash(input: {
    designAssetIdentity: string
    expectedRevision: string
  }): Promise<{ kind: 'planned'; plan: ActiveLibraryTrashPlan }>
  dispatchTrash(command:
    | { kind: 'confirm-plan'; planReceipt: string }
    | { kind: 'restore-design-asset'; designAssetIdentity: string; expectedRevision: string }
  ): Promise<ActiveLibraryTrashSnapshot>
  inspectTrash(designAssetIdentity: string): Promise<ActiveLibraryTrashSnapshot>
}

/** Contract-only aliases for future path-free IPC handlers. */
export type ActiveLibraryTrashPrepareResponse = { kind: 'planned'; plan: ActiveLibraryTrashPlan }
export type ActiveLibraryCapturePlan = ActiveLibraryCopyPlan

export const CHANNEL_LIBRARY_CREATE_PREPARE = 'library:create:prepare'
export const CHANNEL_LIBRARY_INSPECT = 'library:inspect'
export const CHANNEL_LIBRARY_CREATE_CONFIRM = 'library:create:confirm'
export const CHANNEL_LIBRARY_OPEN = 'library:open'
export const CHANNEL_LIBRARY_CLOSE = 'library:close'
export const CHANNEL_LIBRARY_REOPEN = 'library:reopen'
export const CHANNEL_LIBRARY_ADD_PREPARE = 'library:add:prepare'
export const CHANNEL_LIBRARY_ADD_DISPATCH = 'library:add:dispatch'
export const CHANNEL_LIBRARY_ADD_INSPECT = 'library:add:inspect'
export const CHANNEL_LIBRARY_MEDIA_READ_PREVIEW = 'library:media:read-preview'
export const CHANNEL_LIBRARY_TRASH_PREPARE = 'library-trash:prepare'
export const CHANNEL_LIBRARY_TRASH_DISPATCH = 'library-trash:dispatch'
export const CHANNEL_LIBRARY_TRASH_INSPECT = 'library-trash:inspect'
export const CHANNEL_LIBRARY_TRASH_LIST = 'library-trash:list'
