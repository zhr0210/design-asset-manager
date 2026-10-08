import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {enableOrganizationStorage} from './library-organization.schema'
export const WORK_SET_SQL=`CREATE TABLE work_sets (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, note TEXT NOT NULL, columns_count INTEGER NOT NULL CHECK(columns_count BETWEEN 1 AND 4),
 revision INTEGER NOT NULL CHECK(revision>0), colors_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE work_set_members (
 set_id TEXT NOT NULL REFERENCES work_sets(id) ON DELETE CASCADE,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 position INTEGER NOT NULL CHECK(position>=0), PRIMARY KEY(set_id,asset_id), UNIQUE(set_id,position)
);
CREATE TABLE work_window_layouts (
 set_id TEXT NOT NULL REFERENCES work_sets(id) ON DELETE CASCADE,
 device_id TEXT NOT NULL, layout_json TEXT NOT NULL, PRIMARY KEY(set_id,device_id)
);`
export function enableWorkSetStorage(db:Database.Database){const v=Number(db.pragma('user_version',{simple:true}));if(isKnownLibrarySchemaVersion(v,7))return;if(![1,2,3,4,5,6].includes(v))throw Error('WORK_SET_SCHEMA_UNSUPPORTED');db.transaction(()=>{enableOrganizationStorage(db);db.exec(WORK_SET_SQL);db.pragma('user_version = 7')})()}
