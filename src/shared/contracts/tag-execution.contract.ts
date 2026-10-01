import type {TagIntentScope} from './independent-tag-intent.contract'
import type {VisualAiEvidence} from './visual-ai.contract'

export type TagExecutionState = 'running'|'succeeded'|'failed'|'cancelled'|'outcome-unknown'|'paused'|'superseded'
export interface TagExecutionScope extends TagIntentScope {sessionToken:string}
export interface TagExecutionUpgrade extends TagExecutionScope {expectedSchemaVersion:number;allowUpgrade:boolean}
/** Main-only capabilities. attemptToken is never exposed by IPC or persisted. */
export interface TagClaimRequest extends TagExecutionScope {requestId:string;inputSha256:string;origin:'tags-only'|'combined'}
export interface TagAttemptClaim {attemptToken:string;attemptId:string;attemptEpoch:number;requestGeneration:number;leaseIdentity:string}
export interface TagEffectCommit extends TagExecutionScope {requestId:string;attemptToken:string;tags:string[];combinedEvidence?:VisualAiEvidence}
export interface TagEffectReceipt {effectId:string;requestId:string;assetId:string;tagEvidenceId:string|null;historicalOnly:boolean;committedAt:string}
export interface TagCurrentSummary {
 evidenceId:string;assetId:string;requestGeneration:number;sourceFamily:'visual-ai-v1'|'independent-tags-v1';normalizationVersion:string
 model:string;backendId:string;createdAt:string;observedTagCount:number;tags:string[];pendingTags:string[];originalVisualEvidenceId:string|null
}
export interface TagExecutionSnapshot {activeJobs?:TagRunJob[];schemaVersion:number;sessionToken:string;current:TagCurrentSummary|null;jobs:Array<{requestId:string;state:TagExecutionState;attemptEpoch:number;errorCode:string|null}>}
export interface TagAttemptFinish extends TagExecutionScope {requestId:string;attemptToken:string;state:Exclude<TagExecutionState,'running'|'succeeded'|'superseded'>;errorCode?:string}

export interface TagAttemptRef extends TagExecutionScope {requestId:string;attemptToken:string}
export interface TagExecutionRequest {
 requestId:string;assetId:string;assetRevision:string;previewGeneration:string;requestGeneration:number
 backendId:string;model:string;backendBindingSha256:string;recipeId:string;recipeVersion:string
 state:TagExecutionState|'waiting-execution';sourceMatches:boolean
}
export interface TagRunPrepare extends TagIntentScope {requestId:string}
export interface TagRunReview {
 receipt:string;requestId:string;assetId:string;backendName:string;providerOrigin:string;model:string;location:'local'|'external'
 inputDescription:string;storageNotice:string;expiresAt:string;alreadySucceeded:boolean
}
export interface TagRunJob extends TagIntentScope {id:string;requestId:string;state:'queued'|TagExecutionState;error?:string}
export type TagRunResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface TagExecutionApi {
 onChanged(listener:(scope:TagIntentScope)=>void):()=>void
 prepare(input:TagRunPrepare):Promise<TagRunResponse<TagRunReview>>
 discardReview(receipt:string):Promise<TagRunResponse<void>>
 run(receipt:string):Promise<TagRunResponse<TagRunJob>>
 inspect(id:string):Promise<TagRunResponse<TagRunJob>>
 cancel(id:string):Promise<TagRunResponse<TagRunJob>>
 read(scope:TagIntentScope):Promise<TagRunResponse<TagExecutionSnapshot>>
}
export const TAG_EXECUTION_PREPARE='tag-execution:prepare',TAG_EXECUTION_RUN='tag-execution:run',TAG_EXECUTION_INSPECT='tag-execution:inspect',TAG_EXECUTION_CANCEL='tag-execution:cancel',TAG_EXECUTION_READ='tag-execution:read'
