import type Database from 'better-sqlite3'
import { VISUAL_AI_TABLE_SQL, VISUAL_AI_INDEX_SQL } from '../visual-ai/visual-ai.schema'
import { DOWNLOAD_JOURNAL_SQL } from '../managed-download/download-journal.schema'
import { INTAKE_RECOVERY_SQL } from '../library-lifecycle/intake-recovery.schema'
import { NOTEBOOK_SQL } from '../library-lifecycle/asset-notebook.schema'
import { ORGANIZATION_SQL } from '../library-lifecycle/library-organization.schema'
import { WORK_SET_SQL } from '../library-lifecycle/work-set.schema'
import { OCR_SQL } from '../ocr/ocr.schema'
import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'

export const TAG_INTENT_SQL = `CREATE TABLE independent_tag_requests (
  request_id TEXT PRIMARY KEY CHECK(length(request_id) BETWEEN 1 AND 256),
  library_identity TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
  backend_id TEXT NOT NULL CHECK(length(backend_id) BETWEEN 1 AND 256),
  model_name TEXT NOT NULL CHECK(length(model_name) BETWEEN 1 AND 256),
  backend_binding_sha256 TEXT NOT NULL CHECK(length(backend_binding_sha256)=64),
  recipe_id TEXT NOT NULL,
  recipe_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE independent_tag_request_items (
  request_id TEXT NOT NULL REFERENCES independent_tag_requests(request_id) ON DELETE RESTRICT,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 7),
  asset_revision TEXT NOT NULL,
  preview_generation TEXT NOT NULL,
  request_generation INTEGER NOT NULL CHECK(request_generation BETWEEN 1 AND 9007199254740991),
  state TEXT NOT NULL CHECK(state IN ('waiting-execution','paused','cancelled','superseded')),
  revision INTEGER NOT NULL CHECK(revision>0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(request_id,asset_id),
  UNIQUE(request_id,position),
  UNIQUE(asset_id,asset_revision,preview_generation,request_generation)
);
CREATE INDEX independent_tag_request_items_asset ON independent_tag_request_items(asset_id,request_generation);
CREATE INDEX independent_tag_request_items_state ON independent_tag_request_items(state,updated_at,request_id);
CREATE TRIGGER independent_tag_request_immutable
BEFORE UPDATE ON independent_tag_requests
BEGIN SELECT RAISE(ABORT,'TAG_REQUEST_IMMUTABLE'); END;
CREATE TRIGGER independent_tag_request_item_identity_immutable
BEFORE UPDATE OF request_id,asset_id,position,asset_revision,preview_generation,request_generation ON independent_tag_request_items
WHEN NEW.request_id != OLD.request_id OR NEW.asset_id != OLD.asset_id OR NEW.position != OLD.position
 OR NEW.asset_revision != OLD.asset_revision OR NEW.preview_generation != OLD.preview_generation OR NEW.request_generation != OLD.request_generation
BEGIN SELECT RAISE(ABORT,'TAG_REQUEST_ITEM_IMMUTABLE'); END;
`

/** Direct historical DDL: one caller-owned source transaction, no nested savepoints. */
export function applyTagIntentSchema(db: Database.Database): void {
  const version = Number(db.pragma('user_version', { simple: true }))
  if (!isKnownLibrarySchemaVersion(version)) throw new Error('TAG_INTENT_SCHEMA_UNSUPPORTED')
  if (version >= 9) return
  if (version < 2) db.exec(VISUAL_AI_TABLE_SQL+';'+VISUAL_AI_INDEX_SQL+';')
  if (version < 3) db.exec(DOWNLOAD_JOURNAL_SQL)
  if (version < 4) db.exec(INTAKE_RECOVERY_SQL)
  if (version < 5) db.exec(NOTEBOOK_SQL)
  if (version < 6) { db.exec(ORGANIZATION_SQL); db.prepare('INSERT INTO library_organization_state VALUES(1,0)').run() }
  if (version < 7) db.exec(WORK_SET_SQL)
  if (version < 8) db.exec(OCR_SQL)
  db.exec(TAG_INTENT_SQL)
  db.pragma('user_version = 9')
}
