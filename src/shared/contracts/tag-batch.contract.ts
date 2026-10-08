import type {TagIntentCommit,TagIntentSummary} from './independent-tag-intent.contract'
import type {TagRunJob} from './tag-execution.contract'
export interface TagBatchScope {libraryIdentity:string;generation:string}
export interface TagBatchPrepare extends TagBatchScope {assetIds:string[];requestId:string;backendId:string;model:string;forceRerun:boolean}
export interface TagBatchCommit extends Omit<TagIntentCommit,'assetId'|'assetRevision'|'previewGeneration'> {items:Array<{assetId:string;assetRevision:string;previewGeneration:string}>;forceRerun:boolean}
export interface TagBatchSaved {requestId:string;items:TagIntentSummary[]}
export interface TagBatchReview {resumeSummary?:string;receipt:string;requestId:string;assetIds:string[];assets:Array<{assetId:string;title:string}>;backendName:string;providerOrigin:string;model:string;location:'local'|'external';forceRerun:boolean;inputDescription:string;storageNotice:string;expiresAt:string}
export interface TagBatchJob extends TagBatchScope {id:string;requestId:string;state:'queued'|'running'|'completed'|'partial'|'failed'|'cancelled';items:Array<{assetId:string;title:string;state:TagRunJob['state']|'waiting-execution';error?:string}>;error?:string}
export type TagBatchResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface TagBatchApi {prepare(input:TagBatchPrepare):Promise<TagBatchResponse<TagBatchReview>>;run(receipt:string):Promise<TagBatchResponse<TagBatchJob>>;discard(receipt:string):Promise<TagBatchResponse<void>>;inspect(id:string):Promise<TagBatchResponse<TagBatchJob>>;cancel(id:string):Promise<TagBatchResponse<TagBatchJob>>}
export const TAG_BATCH_PREPARE='tag-batch:prepare',TAG_BATCH_RUN='tag-batch:run',TAG_BATCH_DISCARD='tag-batch:discard',TAG_BATCH_INSPECT='tag-batch:inspect',TAG_BATCH_CANCEL='tag-batch:cancel'
