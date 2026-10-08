import type {TagBatchScope,TagBatchReview,TagBatchResponse} from './tag-batch.contract'
import type {TagExecutionState,TagEffectReceipt} from './tag-execution.contract'
export interface TagRecoveryScope extends TagBatchScope {assetIds:string[]}
export interface TagRecoveryItem {assetId:string;title:string;state:TagExecutionState|'waiting-execution';sourceMatches:boolean;isLatest:boolean;requestGeneration:number;hasReceipt:boolean}
export interface TagRecoveryBatch {requestId:string;backendId:string;model:string;items:TagRecoveryItem[]}
/** Host-only source binding. The renderer receives the reduced TagRecoveryBatch projection. */
export interface TagRecoveryStored extends TagRecoveryBatch {backendBindingSha256:string;items:Array<TagRecoveryItem&{assetRevision:string;previewGeneration:string}>}
export interface TagRecoveryReceipt {receipt:TagEffectReceipt|null;isCurrent:boolean}
export interface TagRecoveryApi {
 list(input:TagRecoveryScope):Promise<TagBatchResponse<TagRecoveryBatch[]>>
 prepare(input:TagRecoveryScope&{requestId:string}):Promise<TagBatchResponse<TagBatchReview>>
 receipt(input:TagBatchScope&{assetId:string;requestId:string}):Promise<TagBatchResponse<TagRecoveryReceipt>>
}
export const TAG_RECOVERY_LIST='tag-recovery:list',TAG_RECOVERY_PREPARE='tag-recovery:prepare',TAG_RECOVERY_RECEIPT='tag-recovery:receipt'
