import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import { enableDownloadJournal } from '../managed-download/download-journal.schema'

export const INTAKE_RECOVERY_SQL = `CREATE TABLE image_variant_intents (
  request_id TEXT PRIMARY KEY,
  library_identity TEXT NOT NULL,
  file_name TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 33554432),
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  metadata_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','completed')),
  created_at TEXT NOT NULL
);
CREATE TRIGGER image_variant_intent_immutable
BEFORE UPDATE OF request_id,library_identity,file_name,byte_length,sha256,metadata_json ON image_variant_intents
WHEN NEW.request_id != OLD.request_id OR NEW.library_identity != OLD.library_identity OR NEW.file_name != OLD.file_name OR NEW.byte_length != OLD.byte_length OR NEW.sha256 != OLD.sha256 OR NEW.metadata_json != OLD.metadata_json
BEGIN SELECT RAISE(ABORT,'VARIANT_INTENT_IMMUTABLE'); END;`

/** First confirmed variant save only. Ordinary Copy recovery needs no schema upgrade. */
export function enableIntakeRecoveryStorage(db: Database.Database) {
  const version = Number(db.pragma('user_version', { simple: true }))
  if (isKnownLibrarySchemaVersion(version,4)) return
  if (![1,2,3].includes(version)) throw new Error('INTAKE_STORAGE_UNSUPPORTED')
  db.transaction(() => { enableDownloadJournal(db); db.exec(INTAKE_RECOVERY_SQL); db.pragma('user_version = 4') })()
}
