import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import {DAM_BUILD_IDENTITY} from '../../src/shared/build-identity.generated'

// Read only explicit public diagnostics and saved effects for the authorized
// coffee sample. Never read settings, account tables or runtime request keys.
const root=path.resolve('.scratch/local-ai-implementation-20261006')
const app=new Database(path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04/app-state/app-state.sqlite'),{readonly:true,fileMustExist:true})
const library=new Database(path.resolve('.scratch/b-model-management-20261006/real-library-01/.dam/library.sqlite'),{readonly:true,fileMustExist:true})
try{
 app.exec('BEGIN');library.exec('BEGIN')
 const stages=app.prepare(`SELECT json_extract(record,'$.buildId') AS buildId,json_extract(record,'$.operationId') AS operationId,
  json_extract(record,'$.stage') AS stage,json_extract(record,'$.startedAt') AS startedAt,json_extract(record,'$.durationMs') AS durationMs,
  json_extract(record,'$.mode') AS mode,json_extract(record,'$.fingerprint') AS fingerprint,
  json_extract(record,'$.outcome') AS outcome FROM ai_stage_diagnostics ORDER BY rowid DESC LIMIT 200`).all() as any[]
 const captions=library.prepare(`SELECT x.attempt_id AS attemptId,x.request_id AS requestId,r.model_name AS model,
  r.recipe,x.input_sha256 AS inputSha256,x.state,json_extract(e.output_json,'$.caption') AS caption,
  json_extract(e.output_json,'$.usage') AS usage,json_extract(e.output_json,'$.physicalCalls') AS physicalCalls
  FROM basic_analysis_attempts x JOIN basic_analysis_requests r USING(request_id) JOIN assets a ON a.id=r.asset_id
  LEFT JOIN basic_analysis_evidence e ON e.request_id=r.request_id WHERE a.title='public-04-coffee' AND r.capability='caption'
  ORDER BY x.updated_at DESC LIMIT 40`).all() as any[]
 const tags=library.prepare(`SELECT x.attempt_id AS attemptId,x.request_id AS requestId,r.model_name AS model,
  r.recipe_id AS recipe,x.input_sha256 AS inputSha256,x.state,e.tags_json AS tags
  FROM independent_tag_executions x JOIN independent_tag_requests r USING(request_id) JOIN assets a ON a.id=x.asset_id
  LEFT JOIN independent_tag_evidence e ON e.request_id=x.request_id AND e.asset_id=x.asset_id
  WHERE a.title='public-04-coffee' ORDER BY x.updated_at DESC LIMIT 40`).all() as any[]
 const paired=stages.filter(s=>s.stage==='inference'&&s.outcome==='returned').flatMap(stage=>{
  const saved=captions.find(c=>c.attemptId===stage.operationId)??tags.find(t=>t.attemptId===stage.operationId)
  return saved?[{...stage,...saved,capability:'caption'in saved?'caption':'tags'}]:[]
 })
 const eight=paired.filter(p=>p.capability==='caption'&&/8B/i.test(p.model)),cpu=eight.find(p=>p.mode==='cpu'),gpu=eight.find(p=>p.mode==='gpu')
 assert.ok(cpu&&gpu,'Retained 8B CPU/GPU stages must map to actual saved caption attempts')
 assert.equal(cpu.state,'succeeded');assert.equal(gpu.state,'succeeded')
 assert.equal(cpu.inputSha256,gpu.inputSha256,'Only the exact same frozen image input is compared')
 assert.equal(cpu.recipe,gpu.recipe)
 const result={at:new Date().toISOString(),auditedFromSourceBuild:DAM_BUILD_IDENTITY.buildId,
  scope:'read-only historical real coffee effects and bounded diagnostic stages; not current-build GUI or a repeated benchmark',
  paired,comparison:{model:cpu.model,capability:'caption',inputSha256:cpu.inputSha256,recipe:cpu.recipe,
   cpu:{buildId:cpu.buildId,durationMs:cpu.durationMs,caption:cpu.caption,usage:cpu.usage},
   gpu:{buildId:gpu.buildId,durationMs:gpu.durationMs,caption:gpu.caption,usage:gpu.usage},
   observedInferenceRatio:cpu.durationMs/gpu.durationMs,replicatesPerPlan:1},
  limits:['Single observed inference stage per plan, excluding cold loading and queue time.',
   'RAM/GPU figures are separately sourced; no process NVML or first-token measurement.',
   'Pruned earlier stages stay unknown; earlier screenshots and dated PROGRESS retain their own build provenance.',
   'Human quality judgments are not inferred from a successful schema or saved effect.']}
 await fs.writeFile(path.join(root,'evidence/performance-non-ui-final.json'),JSON.stringify(result,null,2))
 console.log(JSON.stringify({paired:paired.length,comparison:result.comparison}))
}finally{app.close();library.close()}
