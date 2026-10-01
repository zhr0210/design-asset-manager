import type Database from 'better-sqlite3'
export const BACKGROUND_OCR_SQL=`CREATE TABLE background_ocr_permission (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision INTEGER NOT NULL CHECK(revision>=0),
 choice INTEGER NOT NULL CHECK(choice IN (0,1)),
 runtime_fingerprint TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE background_ocr_attempts (
 intent_id TEXT PRIMARY KEY REFERENCES background_analysis_intents(id) ON DELETE RESTRICT,
 attempt_id TEXT NOT NULL UNIQUE,
 attempt_generation INTEGER NOT NULL CHECK(attempt_generation>=1),
 intent_revision INTEGER NOT NULL CHECK(intent_revision>=1),
 permission_revision INTEGER NOT NULL CHECK(permission_revision>=1),
 owner_session TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('claimed','sent','succeeded','failed','cancelled','unknown','deferred')),
 runtime_fingerprint TEXT NOT NULL,
 recipe TEXT NOT NULL CHECK(recipe='rapidocr-preview-v1'),
 effect_digest TEXT,
 evidence_id TEXT REFERENCES asset_ocr_evidence(id) ON DELETE RESTRICT,
 saved_revision INTEGER CHECK(saved_revision>=1),
 updated_at TEXT NOT NULL,
 CHECK((state='succeeded' AND effect_digest IS NOT NULL AND evidence_id IS NOT NULL AND saved_revision IS NOT NULL) OR (state!='succeeded' AND effect_digest IS NULL AND evidence_id IS NULL AND saved_revision IS NULL))
);
CREATE INDEX background_ocr_attempts_recent ON background_ocr_attempts(updated_at DESC,intent_id);
CREATE INDEX background_ocr_candidates ON background_analysis_intents(capability,decision,created_at,id);
`
export function applyBackgroundOcrSchema(db:Database.Database){const v=Number(db.pragma('user_version',{simple:true}));if(v===13)return;if(v!==12)throw Error('BACKGROUND_OCR_UPGRADE_REQUIRED');db.exec(BACKGROUND_OCR_SQL);db.prepare("INSERT INTO background_ocr_permission VALUES(1,0,0,'','')").run();db.pragma('user_version=13')}
