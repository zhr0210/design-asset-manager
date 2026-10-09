export type AiStage='prepare-and-wait'|'model-ready'|'model-load'|'inference'|'validate-and-commit'|'index-query'|'cancel-and-release'
export const AI_RELEASE_CAUSES=['idle-release','idle-timeout','deactivate','request-cancel','preparation-cancel','observation-failed','protocol-failed','pressure','activation-failed','model-switch','trust-revoked','local-recovery','shutdown'] as const
export type AiReleaseCause=typeof AI_RELEASE_CAUSES[number]
export interface AiReleaseObservation {cause:AiReleaseCause;triggerCode:string|null;pid:number|null;signalRequested:boolean;physicalCloseSeen:boolean;inferenceOperationId:string|null}
export interface AiStageRecord {id:string;buildId:string;operationId:string;stage:AiStage;startedAt:string;durationMs:number;outcome:'returned'|'failed';errorCode:string|null;fingerprint:string|null;mode:string|null;language:'zh'|'en'|'mixed'|null;release?:AiReleaseObservation}
