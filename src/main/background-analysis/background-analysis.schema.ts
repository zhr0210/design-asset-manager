import type Database from 'better-sqlite3'
export const BACKGROUND_ANALYSIS_SQL=`CREATE TABLE background_analysis_policy (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 revision INTEGER NOT NULL CHECK(revision>=0)
);
CREATE TABLE background_analysis_capabilities (
 capability TEXT PRIMARY KEY CHECK(capability IN ('tags','caption','ocr')),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1))
);
CREATE TABLE background_analysis_intents (
 id TEXT PRIMARY KEY,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 source_generation TEXT NOT NULL,
 preview_generation TEXT NOT NULL,
 capability TEXT NOT NULL REFERENCES background_analysis_capabilities(capability) ON DELETE RESTRICT,
 recipe_version TEXT NOT NULL CHECK(recipe_version='baseline-overview-v1'),
 decision TEXT NOT NULL CHECK(decision IN ('active','user-paused','cancelled')),
 revision INTEGER NOT NULL CHECK(revision>=1),
 created_at TEXT NOT NULL,
 UNIQUE(asset_id,source_generation,preview_generation,capability,recipe_version)
);
CREATE INDEX background_analysis_intents_asset ON background_analysis_intents(asset_id,capability);
CREATE TRIGGER background_analysis_identity_immutable BEFORE UPDATE OF id,asset_id,source_generation,preview_generation,capability,recipe_version,created_at ON background_analysis_intents
BEGIN SELECT RAISE(ABORT,'BACKGROUND_IDENTITY_IMMUTABLE'); END;
CREATE TRIGGER background_analysis_enroll AFTER INSERT ON asset_lifecycle
WHEN NEW.lifecycle_state='active' AND NEW.last_transition='registered' AND NEW.ownership='managed'
BEGIN
 INSERT OR IGNORE INTO background_analysis_intents
 SELECT 'bga:'||lower(hex(randomblob(16))),NEW.design_asset_identity,r.source_generation,c.preview_generation_identity,k.capability,'baseline-overview-v1','active',1,NEW.created_at
 FROM promotion_links p JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
 JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity
 CROSS JOIN background_analysis_policy policy CROSS JOIN background_analysis_capabilities k
 WHERE p.design_asset_identity=NEW.design_asset_identity AND c.lifecycle_state='promoted' AND c.preview_generation_identity IS NOT NULL
 AND policy.singleton=1 AND policy.enabled=1 AND k.enabled=1;
END;
`
export function applyBackgroundAnalysisSchema(db:Database.Database){const version=Number(db.pragma('user_version',{simple:true}));if(version===12||version===13)return;if(version!==11)throw Error('BACKGROUND_SCHEMA_UNSUPPORTED');db.exec(BACKGROUND_ANALYSIS_SQL);db.prepare('INSERT INTO background_analysis_policy VALUES(1,0,0)').run();for(const cap of ['tags','caption','ocr'])db.prepare('INSERT INTO background_analysis_capabilities VALUES(?,1)').run(cap);db.pragma('user_version=12')}
