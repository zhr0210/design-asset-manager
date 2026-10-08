import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {enableNotebookStorage} from './asset-notebook.schema'
export const ORGANIZATION_SQL=`CREATE TABLE library_organization_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL CHECK(revision>=0)
);
CREATE TABLE library_folders (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('assets','palette')),
 parent_id TEXT REFERENCES library_folders(id) ON DELETE RESTRICT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX library_folder_names ON library_folders(COALESCE(parent_id,''),kind,name);
CREATE TABLE library_folder_assets (
 folder_id TEXT NOT NULL REFERENCES library_folders(id) ON DELETE CASCADE,
 asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
 PRIMARY KEY(folder_id,asset_id)
);
CREATE INDEX library_folder_asset_lookup ON library_folder_assets(asset_id);
CREATE TABLE library_palette_colors (
 folder_id TEXT NOT NULL REFERENCES library_folders(id) ON DELETE CASCADE,
 hex TEXT NOT NULL, source_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(folder_id,hex)
);`
export function enableOrganizationStorage(db:Database.Database){const v=Number(db.pragma('user_version',{simple:true}));if(isKnownLibrarySchemaVersion(v,6))return;if(![1,2,3,4,5].includes(v))throw Error('ORGANIZATION_SCHEMA_UNSUPPORTED');db.transaction(()=>{enableNotebookStorage(db);db.exec(ORGANIZATION_SQL);db.prepare('INSERT INTO library_organization_state VALUES(1,0)').run();db.pragma('user_version = 6')})()}
