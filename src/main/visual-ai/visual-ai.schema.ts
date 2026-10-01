export const VISUAL_AI_TABLE_SQL = `CREATE TABLE visual_ai_evidence (
  id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, asset_revision TEXT NOT NULL,
  preview_generation TEXT NOT NULL, evidence_json TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE)`
export const VISUAL_AI_INDEX_SQL = 'CREATE INDEX visual_ai_evidence_asset ON visual_ai_evidence(asset_id, created_at)'
