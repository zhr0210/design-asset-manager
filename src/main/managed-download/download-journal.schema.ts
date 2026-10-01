import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'
import type Database from 'better-sqlite3'
import { enableVisualAiStorage } from '../visual-ai/visual-ai-storage'

export const DOWNLOAD_JOURNAL_SQL = `CREATE TABLE managed_download_intents (
  task_id TEXT PRIMARY KEY,
  library_identity TEXT NOT NULL,
  creation_generation TEXT NOT NULL,
  request_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('pending','receiving','downloaded','importing','completed','cancelled','failed','recovery-required')),
  revision INTEGER NOT NULL CHECK(revision >= 0),
  transfer_epoch INTEGER NOT NULL CHECK(transfer_epoch >= 0),
  strong_etag TEXT,
  identity_encoding INTEGER NOT NULL CHECK(identity_encoding IN (0,1)),
  total_bytes INTEGER CHECK(total_bytes BETWEEN 0 AND 33554432),
  committed_bytes INTEGER NOT NULL CHECK(committed_bytes BETWEEN 0 AND 33554432),
  content_sha256 TEXT,
  asset_id TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX managed_download_intents_library ON managed_download_intents(library_identity, phase, updated_at);
CREATE TABLE managed_download_chunks (
  task_id TEXT NOT NULL REFERENCES managed_download_intents(task_id) ON DELETE RESTRICT,
  transfer_epoch INTEGER NOT NULL CHECK(transfer_epoch >= 0),
  start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
  byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 1048576),
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  chunk_identity TEXT NOT NULL UNIQUE,
  PRIMARY KEY(task_id, transfer_epoch, start_offset)
);
CREATE TRIGGER managed_download_intent_identity_immutable
BEFORE UPDATE OF task_id,library_identity,creation_generation,request_url,file_name ON managed_download_intents
WHEN NEW.task_id != OLD.task_id OR NEW.library_identity != OLD.library_identity OR NEW.creation_generation != OLD.creation_generation
  OR NEW.request_url != OLD.request_url OR NEW.file_name != OLD.file_name
BEGIN SELECT RAISE(ABORT,'DOWNLOAD_INTENT_IMMUTABLE'); END;
`

export function enableDownloadJournal(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true })
  if (isKnownLibrarySchemaVersion(version,3)) return
  if (version !== 1 && version !== 2) throw new Error('DOWNLOAD_STORAGE_VERSION_UNSUPPORTED')
  db.transaction(() => {
    enableVisualAiStorage(db)
    db.exec(DOWNLOAD_JOURNAL_SQL)
    db.pragma('user_version = 3')
  })()
}
