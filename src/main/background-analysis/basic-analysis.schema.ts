import type Database from 'better-sqlite3'
import { applyTagExecutionSchema } from '../independent-tags/tag-execution.schema'
import { applyTagDecisionSchema } from '../independent-tags/tag-decision.schema'
import { applyBackgroundAnalysisSchema } from './background-analysis.schema'
import { applyBackgroundOcrSchema } from '../background-ocr/background-ocr.schema'

export const BASIC_ANALYSIS_SQL = `CREATE TABLE basic_analysis_requests (
 request_id TEXT PRIMARY KEY,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 capability TEXT NOT NULL CHECK(capability IN ('caption','ocr')),
 asset_revision TEXT NOT NULL,preview_generation TEXT NOT NULL,
 request_generation INTEGER NOT NULL CHECK(request_generation BETWEEN 1 AND 9007199254740991),
 backend_id TEXT NOT NULL,model_name TEXT NOT NULL,binding_sha256 TEXT NOT NULL CHECK(length(binding_sha256)=64),
 recipe TEXT NOT NULL,location TEXT NOT NULL CHECK(location IN ('local','external')),reasoning_json TEXT NOT NULL,created_at TEXT NOT NULL,
 UNIQUE(asset_id,capability,asset_revision,preview_generation,request_generation)
);
CREATE INDEX basic_analysis_requests_asset ON basic_analysis_requests(asset_id,capability,request_generation);
CREATE TRIGGER basic_analysis_request_immutable BEFORE UPDATE ON basic_analysis_requests
BEGIN SELECT RAISE(ABORT,'BASIC_REQUEST_IMMUTABLE'); END;
CREATE TABLE basic_analysis_attempts (
 request_id TEXT PRIMARY KEY REFERENCES basic_analysis_requests(request_id) ON DELETE RESTRICT,
 attempt_id TEXT NOT NULL UNIQUE,attempt_epoch INTEGER NOT NULL CHECK(attempt_epoch>=1),owner_session TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('claimed','sent','succeeded','failed','cancelled','unknown','paused','superseded')),
 input_sha256 TEXT NOT NULL CHECK(length(input_sha256)=64),error_code TEXT,updated_at TEXT NOT NULL
);
CREATE TABLE basic_analysis_evidence (
 id TEXT PRIMARY KEY,request_id TEXT NOT NULL UNIQUE REFERENCES basic_analysis_requests(request_id) ON DELETE RESTRICT,
 output_json TEXT NOT NULL,payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),created_at TEXT NOT NULL
);
CREATE TABLE basic_analysis_current (
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,capability TEXT NOT NULL CHECK(capability IN ('caption','ocr')),
 request_id TEXT NOT NULL REFERENCES basic_analysis_requests(request_id) ON DELETE RESTRICT,
 evidence_id TEXT NOT NULL REFERENCES basic_analysis_evidence(id) ON DELETE RESTRICT,
 PRIMARY KEY(asset_id,capability)
);
CREATE TABLE background_analysis_execution_policy (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 revision INTEGER NOT NULL CHECK(revision>=0),daily_call_limit INTEGER NOT NULL CHECK(daily_call_limit BETWEEN 1 AND 1000),updated_at TEXT NOT NULL
);
CREATE TABLE background_analysis_execution_rules (
 capability TEXT PRIMARY KEY REFERENCES background_analysis_capabilities(capability) ON DELETE RESTRICT,
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),backend_id TEXT NOT NULL,model_name TEXT NOT NULL,
 binding_sha256 TEXT NOT NULL CHECK(length(binding_sha256)=64),location TEXT NOT NULL CHECK(location IN ('local','external')),recipe TEXT NOT NULL
);
CREATE TABLE background_analysis_executions (
 intent_id TEXT PRIMARY KEY REFERENCES background_analysis_intents(id) ON DELETE RESTRICT,
 attempt_id TEXT NOT NULL UNIQUE,attempt_epoch INTEGER NOT NULL CHECK(attempt_epoch>=1),intent_revision INTEGER NOT NULL,
 policy_revision INTEGER NOT NULL,owner_session TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('claimed','sent','succeeded','failed','cancelled','unknown','deferred','abandoned')),
 request_id TEXT,backend_id TEXT NOT NULL,model_name TEXT NOT NULL,binding_sha256 TEXT NOT NULL,
 effect_id TEXT,effect_sha256 TEXT,call_units INTEGER NOT NULL DEFAULT 0 CHECK(call_units BETWEEN 0 AND 2),updated_at TEXT NOT NULL
);
CREATE INDEX background_analysis_executions_recent ON background_analysis_executions(updated_at DESC,intent_id);
CREATE TABLE background_analysis_execution_history (
 attempt_id TEXT PRIMARY KEY,intent_id TEXT NOT NULL REFERENCES background_analysis_intents(id) ON DELETE RESTRICT,
 attempt_epoch INTEGER NOT NULL,state TEXT NOT NULL,request_id TEXT,effect_id TEXT,updated_at TEXT NOT NULL
);
CREATE TABLE background_analysis_call_budget (
 day TEXT PRIMARY KEY,units INTEGER NOT NULL CHECK(units>=0)
);
CREATE TABLE basic_analysis_outbox (
 event_id TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,delivered INTEGER NOT NULL CHECK(delivered IN (0,1)),created_at TEXT NOT NULL
);
`
export function applyBasicAnalysisSchema(db: Database.Database) {
  const version = Number(db.pragma('user_version', { simple: true }))
  if (version === 14 || version === 15) return
  applyTagExecutionSchema(db)
  applyTagDecisionSchema(db)
  applyBackgroundAnalysisSchema(db)
  applyBackgroundOcrSchema(db)
  db.exec(BASIC_ANALYSIS_SQL)
  db.prepare("INSERT INTO background_analysis_execution_policy VALUES(1,0,0,24,'')").run()
  // Existing plan and OCR permission choices do not grant this new continuous execution rule.
  for (const capability of ['tags', 'caption', 'ocr'])
    db.prepare("INSERT INTO background_analysis_execution_rules VALUES(?,0,?,?,?,'local',?)").run(
      capability,
      '',
      '',
      '0'.repeat(64),
      capability === 'ocr'
        ? 'rapidocr-preview-v1'
        : capability === 'tags'
          ? 'independent-tags-v1'
          : 'independent-caption-v1',
    )
  // The old OCR audit becomes actionable here; its old session grant is never restored.
  db.exec(
    `INSERT INTO background_analysis_executions SELECT x.intent_id,x.attempt_id,x.attempt_generation,x.intent_revision,0,x.owner_session,CASE WHEN x.state='claimed' THEN 'deferred' WHEN x.state='sent' THEN 'unknown' ELSE x.state END,NULL,'local-ocr','RapidOCR',x.runtime_fingerprint,x.evidence_id,x.effect_digest,0,x.updated_at FROM background_ocr_attempts x`,
  )
  db.pragma('user_version=14')
}
