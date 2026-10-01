import type {OcrCommit} from './asset-ocr.contract'
export interface BackgroundOcrScope {libraryIdentity:string;generation:string}
export interface BackgroundOcrSession extends BackgroundOcrScope {sessionToken:string}
export interface BackgroundOcrPermission extends BackgroundOcrSession {enabled:boolean;expectedRevision:number;expectedSchemaVersion:number;allowUpgrade:boolean;runtimeFingerprint:string}
export type BackgroundOcrAttemptState='claimed'|'sent'|'succeeded'|'failed'|'cancelled'|'unknown'|'deferred'
export interface BackgroundOcrSnapshot {schemaVersion:number;sessionToken:string;permissionRevision:number;authorized:boolean;runtimeFingerprint:string;attempts:Array<{intentId:string;assetId:string;state:BackgroundOcrAttemptState;attemptGeneration:number;interrupted:boolean}>}
/** Main/Host internal capability; never exposed in a renderer response. */
export interface BackgroundOcrClaim extends BackgroundOcrSession {token:string;attemptId:string;intentId:string;assetId:string;runtimeFingerprint:string}
export interface BackgroundOcrReceipt {attemptId:string;intentId:string;evidenceId:string;savedRevision:number}
export interface BackgroundOcrCommit {claim:BackgroundOcrClaim;ocr:OcrCommit}
export interface BackgroundOcrView extends BackgroundOcrSnapshot {reasons:string[];running:boolean}
export interface BackgroundOcrReview {receipt:string;notice:string}
export type BackgroundOcrResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface BackgroundOcrApi {
 read(scope:BackgroundOcrScope):Promise<BackgroundOcrResponse<BackgroundOcrView>>
 prepare(scope:BackgroundOcrScope):Promise<BackgroundOcrResponse<BackgroundOcrReview>>
 confirm(receipt:string):Promise<BackgroundOcrResponse<BackgroundOcrView>>
 discard(receipt:string):Promise<BackgroundOcrResponse<void>>
 revoke(scope:BackgroundOcrScope):Promise<BackgroundOcrResponse<BackgroundOcrView>>
}
