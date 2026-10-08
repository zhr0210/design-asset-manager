export const BASIC_CAPABILITIES=['tags','caption','ocr'] as const
export type BasicCapability=typeof BASIC_CAPABILITIES[number]
export interface BackgroundScope {libraryIdentity:string;generation:string;assetId?:string}
export interface BackgroundPolicy {enabled:boolean;capabilities:Record<BasicCapability,boolean>;revision:number}
export type BackgroundState='waiting'|'user-paused'|'policy-paused'|'cancelled'|'superseded'|'waiting-asset'|'running'|'succeeded'|'failed'|'unknown'|'abandoned'
export interface BackgroundIntent {id:string;capability:BasicCapability;state:BackgroundState;revision:number}
export interface BackgroundSnapshot {schemaVersion:number;sessionToken:string;policy:BackgroundPolicy;intents:BackgroundIntent[];counts:Array<{capability:BasicCapability;state:BackgroundState;count:number}>}
export interface BackgroundConfig extends BackgroundScope {enabled:boolean;capabilities:Record<BasicCapability,boolean>;expectedRevision:number}
export interface BackgroundConfigCommit extends BackgroundConfig {sessionToken:string;expectedSchemaVersion:number;allowUpgrade:boolean}
export interface BackgroundDecision extends BackgroundScope {assetId:string;id:string;sessionToken:string;expectedRevision:number;action:'pause'|'resume'|'cancel'}
export interface BackgroundReview {receipt:string;notice:string;requiresUpgrade:boolean}
export interface BackgroundExecutionRule {capability:BasicCapability;enabled:boolean;backendId:string;model:string;bindingSha256:string;location:'local'|'external';recipe:string}
export interface BackgroundExecutionPolicy {enabled:boolean;revision:number;dailyCallLimit:number;rules:BackgroundExecutionRule[]}
export interface BackgroundExecutionItem {intentId:string;assetId:string;assetTitle?:string;capability:BasicCapability;attemptId:string;attemptEpoch:number;state:string;requestId:string|null;effectId:string|null;updatedAt:string;interrupted:boolean}
export interface BackgroundExecutionConfiguration extends BackgroundScope {sessionToken:string;expectedRevision:number;expectedPlanRevision:number;policy:Omit<BackgroundExecutionPolicy,'revision'>;allowUpgrade:boolean}
/** Host-private claim. Stored sessions and attempt ids are audit, never bearer authority. */
export interface BackgroundExecutionClaim extends BackgroundScope {assetId:string;sessionToken:string;token:string;intentId:string;attemptId:string;attemptEpoch:number;intentRevision:number;policyRevision:number;assetRevision:string;previewGeneration:string;rule:BackgroundExecutionRule}
export interface BackgroundExecutionSnapshot {policy:BackgroundExecutionPolicy;items:BackgroundExecutionItem[];history?:BackgroundExecutionItem[];budgetUsed:number}
export interface BackgroundExecutionPrepare extends BackgroundScope {enabled:boolean;capabilities:Record<BasicCapability,boolean>;backendId?:string;model?:string;dailyCallLimit:number;expectedRevision:number}
export interface BackgroundRecoveryDecision extends BackgroundScope {sessionToken:string;intentId:string;attemptId:string;action:'reconcile'|'keep'|'abandon'|'rerun'}
export interface BackgroundView extends BackgroundSnapshot {dispatchAvailable:boolean;canConfigure:boolean;resourceReasons:string[];availableMemoryMiB:number|null;execution?:BackgroundExecutionSnapshot;capabilityReadiness?:Array<{capability:BasicCapability;ready:boolean;reason:string}>}
export type BackgroundResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface BackgroundAnalysisApi {read(scope:BackgroundScope):Promise<BackgroundResponse<BackgroundView>>;prepare(input:BackgroundConfig):Promise<BackgroundResponse<BackgroundReview>>;confirm(receipt:string):Promise<BackgroundResponse<BackgroundView>>;discard(receipt:string):Promise<BackgroundResponse<void>>;change(input:BackgroundDecision):Promise<BackgroundResponse<BackgroundView>>;prepareExecution(input:BackgroundExecutionPrepare):Promise<BackgroundResponse<BackgroundReview>>;confirmExecution(receipt:string):Promise<BackgroundResponse<BackgroundView>>;recover(input:BackgroundRecoveryDecision):Promise<BackgroundResponse<BackgroundView>>}
