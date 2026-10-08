export type AiStage='prepare-and-wait'|'model-ready'|'model-load'|'inference'|'validate-and-commit'|'index-query'|'cancel-and-release'
export interface AiStageRecord {id:string;buildId:string;operationId:string;stage:AiStage;startedAt:string;durationMs:number;outcome:'returned'|'failed';errorCode:string|null;fingerprint:string|null;mode:string|null;language:'zh'|'en'|'mixed'|null}
