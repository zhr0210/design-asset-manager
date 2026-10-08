import type Database from 'better-sqlite3'
/** Host-owned membership, checked again before returning frozen search hits. */
export function searchFolderMembers(database:Database.Database,folderId:string|undefined,ids:readonly string[]):Set<string>{
 if(!folderId)return new Set(ids)
 if(!ids.length||!database.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='library_folder_assets'").get())return new Set()
 return new Set((database.prepare(`SELECT asset_id AS id FROM library_folder_assets WHERE folder_id=? AND asset_id IN (${ids.map(()=>'?').join(',')})`).all(folderId,...ids) as {id:string}[]).map(v=>v.id))
}
