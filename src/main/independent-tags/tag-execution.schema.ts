import type Database from 'better-sqlite3'
import {applyTagIntentSchema} from './tag-intent.schema'
export const TAG_EXECUTION_SQL = `CREATE TABLE independent_tag_executions (
 request_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 attempt_epoch INTEGER NOT NULL CHECK(attempt_epoch>=1 AND attempt_epoch<=9007199254740991),
 attempt_id TEXT NOT NULL,
 origin TEXT NOT NULL CHECK(origin IN ('tags-only','combined')),
 state TEXT NOT NULL CHECK(state IN ('running','succeeded','failed','cancelled','outcome-unknown','paused','superseded')),
 input_sha256 TEXT NOT NULL CHECK(length(input_sha256)=64),
 error_code TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(request_id,asset_id),
 FOREIGN KEY(request_id,asset_id) REFERENCES independent_tag_request_items(request_id,asset_id) ON DELETE RESTRICT
);
CREATE TABLE independent_tag_evidence (
 id TEXT PRIMARY KEY,
 request_id TEXT,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 asset_revision TEXT NOT NULL,
 preview_generation TEXT NOT NULL,
 request_generation INTEGER NOT NULL CHECK(request_generation>=0 AND request_generation<=9007199254740991),
 source_family TEXT NOT NULL CHECK(source_family IN ('visual-ai-v1','independent-tags-v1')),
 normalization_version TEXT NOT NULL,
 backend_id TEXT NOT NULL,
 model_name TEXT NOT NULL,
 input_sha256 TEXT NOT NULL CHECK(length(input_sha256)=64),
 tags_json TEXT NOT NULL CHECK(json_valid(tags_json)),
 original_visual_evidence_id TEXT REFERENCES visual_ai_evidence(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL,
 FOREIGN KEY(request_id,asset_id) REFERENCES independent_tag_request_items(request_id,asset_id) ON DELETE RESTRICT
);
CREATE INDEX independent_tag_evidence_asset ON independent_tag_evidence(asset_id,created_at,id);
CREATE TRIGGER independent_tag_evidence_immutable BEFORE UPDATE ON independent_tag_evidence
BEGIN SELECT RAISE(ABORT,'TAG_EVIDENCE_IMMUTABLE'); END;
CREATE TABLE independent_tag_current (
 asset_id TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE RESTRICT,
 asset_revision TEXT NOT NULL,
 preview_generation TEXT NOT NULL,
 evidence_id TEXT NOT NULL UNIQUE REFERENCES independent_tag_evidence(id) ON DELETE RESTRICT,
 request_generation INTEGER NOT NULL CHECK(request_generation>=0 AND request_generation<=9007199254740991)
);
CREATE TABLE independent_tag_effect_receipts (
 request_id TEXT NOT NULL,
 asset_id TEXT NOT NULL,
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
 effect_id TEXT NOT NULL UNIQUE,
 tag_evidence_id TEXT REFERENCES independent_tag_evidence(id) ON DELETE RESTRICT,
 historical_only INTEGER NOT NULL CHECK(historical_only IN (0,1)),
 committed_at TEXT NOT NULL,
 PRIMARY KEY(request_id,asset_id),
 FOREIGN KEY(request_id,asset_id) REFERENCES independent_tag_request_items(request_id,asset_id) ON DELETE RESTRICT
);
CREATE TRIGGER independent_tag_effect_immutable BEFORE UPDATE ON independent_tag_effect_receipts
BEGIN SELECT RAISE(ABORT,'TAG_EFFECT_IMMUTABLE'); END;
CREATE TABLE independent_tag_outbox (
 event_id TEXT PRIMARY KEY,
 effect_id TEXT NOT NULL UNIQUE REFERENCES independent_tag_effect_receipts(effect_id) ON DELETE RESTRICT,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 delivered INTEGER NOT NULL DEFAULT 0 CHECK(delivered IN (0,1)),
 created_at TEXT NOT NULL
);
CREATE INDEX independent_tag_outbox_pending ON independent_tag_outbox(delivered,created_at,event_id);
`

/** Caller owns the migration transaction; never starts nested source savepoints. */
export function applyTagExecutionSchema(db:Database.Database){
 const version=Number(db.pragma('user_version',{simple:true}))
 if(version>=10&&version<=15)return
 if(version<1||version>9||!Number.isInteger(version))throw Error('TAG_EXECUTION_SCHEMA_UNSUPPORTED')
 applyTagIntentSchema(db)
 db.exec(TAG_EXECUTION_SQL)
 db.pragma('user_version = 10')
}
