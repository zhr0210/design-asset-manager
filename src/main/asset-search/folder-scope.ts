import type Database from 'better-sqlite3'
import {readAssets} from '../library-lifecycle/active-library-asset-queries'
import {assetInAiFolder} from '../../shared/workflows/ai-folders.workflow'
/** Host-owned membership, checked again before returning frozen search hits. */
export function searchFolderMembers(database:Database.Database,folderId:string|undefined,ids:readonly string[],aiFolderId?:string):Set<string>{
 if(!ids.length)return new Set()
 let members=new Set(ids)
 if(folderId){
  if(!database.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='library_folder_assets'").get())return new Set()
  members=new Set((database.prepare(`SELECT asset_id AS id FROM library_folder_assets WHERE folder_id=? AND asset_id IN (${ids.map(()=>'?').join(',')})`).all(folderId,...ids) as {id:string}[]).map(v=>v.id))
 }
 if(aiFolderId)members=new Set(readAssets(database,[...members]).filter(asset=>assetInAiFolder(asset,aiFolderId)).map(asset=>asset.id))
 return members
}
