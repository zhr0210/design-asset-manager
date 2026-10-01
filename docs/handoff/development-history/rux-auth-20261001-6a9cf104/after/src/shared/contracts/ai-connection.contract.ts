export type PiProviderKind='openai-compatible'|'openai'|'anthropic'|'google'|'openai-codex'|'github-copilot'
export type PiAuthMode='none'|'api-key'|'oauth'
export interface AiCredentialStatus {configured:boolean;kind:'api_key'|'oauth'|null;revision:number;storageAvailable:boolean;legacyPresent:boolean;identityVerified?:boolean;planUsageAuthorized?:boolean;expiresAt?:number;requiresRelogin?:boolean}
export interface PiModel {id:string;name:string;input:Array<'text'|'image'>;contextWindow:number;maxTokens:number;source:'catalog'|'service';verified:false}
export type AiLoginPrompt={id:string;message:string}&({type:'text'|'secret'|'manual_code'}|{type:'select';options:Array<{id:string;label:string}>})
export interface AiLoginStatus {id:string;backendId:string;state:'starting'|'interaction'|'completed'|'failed'|'cancelled'|'cancelling'|'denied'|'expired'|'unknown';stage?:import('./ai-auth-state').AuthStage;sequence?:number;errorCode?:string;startedAt?:number;deadlineAt?:number;workerCloseStatus?:'pending'|'confirmed'|'unknown';timeline?:Array<{stage:import('./ai-auth-state').AuthStage;at:number}>;credentialRevisionAtEnd?:number;event?:{type:string;message?:string;url?:string;userCode?:string};prompt?:AiLoginPrompt;planUsageAuthorized?:boolean;error?:string}
export interface AiCapabilityReview {receipt:string;backendId:string;model:string;notice:string}
export interface AiCapabilityResult {model:string;imageRequestAccepted:boolean;structuredOutputValid:boolean;colourChallengePassed:boolean;testedAt:string}
export interface AiConnectionApi {
 prepareValidation(backendId:string):Promise<AiCapabilityReview>
 confirmValidation(receipt:string):Promise<AiCapabilityResult>
 discardValidation(receipt:string):Promise<void>
 credentialStatus(id:string):Promise<AiCredentialStatus>
 setApiKey(input:{backendId:string;key:string}):Promise<AiCredentialStatus>
 migrateCredential(input:{backendId:string;expectedRevision:number}):Promise<AiCredentialStatus>
 clearCredential(id:string):Promise<AiCredentialStatus>
 login(backendId:string):Promise<AiLoginStatus>
 loginStatus(id:string):Promise<AiLoginStatus>
 currentLogin(backendId:string):Promise<AiLoginStatus|null>
 answerLogin(input:{id:string;promptId:string;answer:string}):Promise<void>
 cancelLogin(id:string):Promise<void>
}
