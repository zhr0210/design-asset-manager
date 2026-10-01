export const BASIC_CAPABILITIES=['tags','caption','ocr'] as const
export type BasicCapability=typeof BASIC_CAPABILITIES[number]
export interface BackgroundScope {libraryIdentity:string;generation:string;assetId?:string}
export interface BackgroundPolicy {enabled:boolean;capabilities:Record<BasicCapability,boolean>;revision:number}
export type BackgroundState='waiting'|'user-paused'|'policy-paused'|'cancelled'|'superseded'|'waiting-asset'
export interface BackgroundIntent {id:string;capability:BasicCapability;state:BackgroundState;revision:number}
export interface BackgroundSnapshot {schemaVersion:number;sessionToken:string;policy:BackgroundPolicy;intents:BackgroundIntent[];counts:Array<{capability:BasicCapability;state:BackgroundState;count:number}>}
export interface BackgroundConfig extends BackgroundScope {enabled:boolean;capabilities:Record<BasicCapability,boolean>;expectedRevision:number}
export interface BackgroundConfigCommit extends BackgroundConfig {sessionToken:string;expectedSchemaVersion:number;allowUpgrade:boolean}
export interface BackgroundDecision extends BackgroundScope {assetId:string;id:string;sessionToken:string;expectedRevision:number;action:'pause'|'resume'|'cancel'}
export interface BackgroundReview {receipt:string;notice:string;requiresUpgrade:boolean}
export interface BackgroundView extends BackgroundSnapshot {dispatchAvailable:false;canConfigure:boolean;resourceReasons:string[];availableMemoryMiB:number|null}
export type BackgroundResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface BackgroundAnalysisApi {read(scope:BackgroundScope):Promise<BackgroundResponse<BackgroundView>>;prepare(input:BackgroundConfig):Promise<BackgroundResponse<BackgroundReview>>;confirm(receipt:string):Promise<BackgroundResponse<BackgroundView>>;discard(receipt:string):Promise<BackgroundResponse<void>>;change(input:BackgroundDecision):Promise<BackgroundResponse<BackgroundView>>}
