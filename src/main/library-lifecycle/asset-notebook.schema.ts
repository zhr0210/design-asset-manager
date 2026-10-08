import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {enableIntakeRecoveryStorage} from './intake-recovery.schema'
export const NOTEBOOK_SQL=`CREATE TABLE asset_notebooks (
  asset_id TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE RESTRICT,
  source_ref TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  format_version INTEGER NOT NULL CHECK(format_version = 1),
  book_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`
/** Called inside the first explicit, confirmed save transaction, never during a read/open. */
export function enableNotebookStorage(db:Database.Database){
 const version=Number(db.pragma('user_version',{simple:true}));if(isKnownLibrarySchemaVersion(version,5))return
 if(![1,2,3,4].includes(version))throw Error('NOTEBOOK_SCHEMA_UNSUPPORTED')
 db.transaction(()=>{enableIntakeRecoveryStorage(db);db.exec(NOTEBOOK_SQL);db.pragma('user_version = 5')})()
}
