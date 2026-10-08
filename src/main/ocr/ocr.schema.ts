import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'
import type Database from 'better-sqlite3'
import {enableWorkSetStorage} from '../library-lifecycle/work-set.schema'
export const OCR_SQL=`CREATE TABLE asset_ocr_evidence (
 id TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 asset_revision TEXT NOT NULL,source_ref TEXT NOT NULL,input_sha256 TEXT NOT NULL,
 observation_json TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX asset_ocr_evidence_asset ON asset_ocr_evidence(asset_id,created_at);
CREATE TABLE asset_ocr_state (
 asset_id TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE RESTRICT,
 evidence_id TEXT NOT NULL REFERENCES asset_ocr_evidence(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>0),edited_text TEXT
);`
export function enableOcrStorage(db:Database.Database){const version=Number(db.pragma('user_version',{simple:true}));if(isKnownLibrarySchemaVersion(version,8))return;if(![1,2,3,4,5,6,7].includes(version))throw Error('OCR_SCHEMA_UNSUPPORTED');db.transaction(()=>{enableWorkSetStorage(db);db.exec(OCR_SQL);db.pragma('user_version = 8')})()}
