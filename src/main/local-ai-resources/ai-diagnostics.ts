import {randomUUID} from 'node:crypto'
import type Database from 'better-sqlite3'
import type {AiStage,AiStageRecord} from '../../shared/contracts/ai-diagnostics.contract'
export type AiStageSink=(record:Omit<AiStageRecord,'id'|'buildId'>)=>void
export async function measureAiStage<T>(sink:AiStageSink|undefined,operationId:string,stage:AiStage,run:()=>Promise<T>,meta:Partial<Pick<AiStageRecord,'fingerprint'|'mode'|'language'>>={}):Promise<T>{
  const started=performance.now(),startedAt=new Date().toISOString();let errorCode:string|null=null,outcome:AiStageRecord['outcome']='returned'
  try{return await run()}catch(e){outcome='failed';errorCode=e instanceof Error&&/^[A-Z][A-Z_0-9]{0,79}$/.test(e.message)?e.message:'OPERATION_FAILED';throw e}
  finally{try{sink?.({operationId,stage,startedAt,durationMs:Math.round(performance.now()-started),outcome,errorCode,fingerprint:meta.fingerprint??null,mode:meta.mode??null,language:meta.language??null})}catch{/* A diagnostic failure never resends a user operation. */}}
}
export function createAiDiagnostics(database:Database.Database,buildId:string){
  database.exec('CREATE TABLE IF NOT EXISTS ai_stage_diagnostics(id TEXT PRIMARY KEY,record TEXT NOT NULL)')
  const record:AiStageSink=value=>{
    if(!/^[A-Za-z0-9._:~-]{1,256}$/.test(value.operationId)||!Number.isSafeInteger(value.durationMs)||value.durationMs<0||value.fingerprint!==null&&!/^[a-f0-9]{64}$/.test(value.fingerprint))return
    // Explicit fields only: no prompt, query, image, path, account or environment.
    const safe:AiStageRecord={id:randomUUID(),buildId,operationId:value.operationId,stage:value.stage,startedAt:value.startedAt,durationMs:value.durationMs,outcome:value.outcome,errorCode:value.errorCode,fingerprint:value.fingerprint,mode:value.mode,language:value.language}
    database.transaction(()=>{database.prepare('INSERT INTO ai_stage_diagnostics VALUES(?,?)').run(safe.id,JSON.stringify(safe));database.prepare('DELETE FROM ai_stage_diagnostics WHERE rowid NOT IN (SELECT rowid FROM ai_stage_diagnostics ORDER BY rowid DESC LIMIT 200)').run()})()
  }
  return {record,read:():AiStageRecord[]=>database.prepare('SELECT record FROM ai_stage_diagnostics ORDER BY rowid DESC LIMIT 100').all().map(v=>JSON.parse((v as {record:string}).record))}
}
