import type {TagIntentScope} from './independent-tag-intent.contract'
import type {TagExecutionSnapshot} from './tag-execution.contract'
export type TagDecision='confirm'|'reject'
export interface TagDecisionPrepare extends TagIntentScope {evidenceId:string;tag:string;decision:TagDecision}
export interface TagDecisionCommit extends TagDecisionPrepare {sessionToken:string;expectedSchemaVersion:number;allowUpgrade:boolean}
export interface TagDecisionContext {schemaVersion:number;sessionToken:string;evidenceId:string;tag:string;assetRevision:string;previewGeneration:string;sourceFamily:'visual-ai-v1'|'independent-tags-v1';sourceNormalizationVersion:string}
export interface TagDecisionReview {receipt:string;tag:string;decision:TagDecision;requiresUpgrade:boolean;storageNotice:string;expiresAt:string}
export type TagDecisionResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface TagDecisionApi {prepare(input:TagDecisionPrepare):Promise<TagDecisionResponse<TagDecisionReview>>;confirm(receipt:string):Promise<TagDecisionResponse<TagExecutionSnapshot>>;discard(receipt:string):Promise<TagDecisionResponse<void>>}
export const TAG_DECISION_PREPARE='tag-decision:prepare',TAG_DECISION_CONFIRM='tag-decision:confirm',TAG_DECISION_DISCARD='tag-decision:discard'
export const TAG_DECISION_NORMALIZATION='decision-nfkc-lower-v1'
export function normalizeDecisionLabel(label:string):string{const value=label.trim().normalize('NFKC').toLowerCase();if(!value||value.length>4096)throw Error('TAG_DECISION_LABEL_INVALID');return value}
