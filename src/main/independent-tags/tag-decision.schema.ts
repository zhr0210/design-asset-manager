import type Database from 'better-sqlite3'
export const TAG_DECISION_SQL=`CREATE TABLE independent_tag_rejections (
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 asset_revision TEXT NOT NULL,
 preview_generation TEXT NOT NULL,
 source_family TEXT NOT NULL CHECK(source_family IN ('visual-ai-v1','independent-tags-v1')),
 source_normalization_version TEXT NOT NULL,
 decision_normalization_version TEXT NOT NULL CHECK(decision_normalization_version='decision-nfkc-lower-v1'),
 normalized_label TEXT NOT NULL CHECK(length(normalized_label) BETWEEN 1 AND 4096),
 evidence_id TEXT NOT NULL REFERENCES independent_tag_evidence(id) ON DELETE RESTRICT,
 label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
 created_at TEXT NOT NULL,
 PRIMARY KEY(asset_id,asset_revision,preview_generation,source_family,source_normalization_version,decision_normalization_version,normalized_label)
);
CREATE TRIGGER independent_tag_rejection_immutable BEFORE UPDATE ON independent_tag_rejections
BEGIN SELECT RAISE(ABORT,'TAG_REJECTION_IMMUTABLE'); END;
`
export function applyTagDecisionSchema(db:Database.Database){const version=Number(db.pragma('user_version',{simple:true}));if(version>=11&&version<=15)return;if(version!==10)throw Error('TAG_DECISION_SCHEMA_UNSUPPORTED');db.exec(TAG_DECISION_SQL);db.pragma('user_version=11')}
