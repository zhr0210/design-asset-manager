import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {randomUUID} from 'node:crypto'
import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
import {validateWorkWrite,validateWorkLayout,workId,type WorkScope,type WorkSetCatalog,type WorkSetWrite,type WorkLayoutWrite,type SavedWorkSet,type WorkWindowLayout} from '../../shared/contracts/work-set.contract'
import {enableWorkSetStorage} from './work-set.schema'
interface Binding{database:Database.Database;identity:string;generation:string;notebookSession:string}
const fail=(message:string):never=>{throw new ActiveLibraryHostError('library-operation-failed',message)}
function scope(a:Binding,s:WorkScope){if(a.identity!==s.libraryIdentity||a.generation!==s.generation)throw new ActiveLibraryHostError('library-generation-conflict','素材库已切换，请重新打开工作集。')}
export function readWorkSets(a:Binding,s:WorkScope,deviceId:string):WorkSetCatalog {
 scope(a,s);workId(deviceId);const db=a.database;if(Number(db.pragma('user_version',{simple:true}))<7)return{sets:[],requiresUpgrade:true,sessionToken:a.notebookSession}
 const rows=db.prepare('SELECT id,name,note,columns_count AS columns,revision,colors_json AS colors FROM work_sets ORDER BY created_at,id').all() as {id:string;name:string;note:string;columns:number;revision:number;colors:string}[]
 const sets:SavedWorkSet[]=rows.map(r=>({...r,colors:JSON.parse(r.colors),assetIds:[],unavailableIds:[],layout:null})),map=new Map(sets.map(s=>[s.id,s]));
 const members=db.prepare('SELECT m.set_id AS setId,m.asset_id AS assetId,l.lifecycle_state AS state FROM work_set_members m LEFT JOIN asset_lifecycle l ON l.design_asset_identity=m.asset_id ORDER BY m.set_id,m.position').all() as {setId:string;assetId:string;state:string}[]
 for(const m of members){const set=map.get(m.setId);set?.assetIds.push(m.assetId);if(m.state!=='active')set?.unavailableIds.push(m.assetId)}
 const layouts=db.prepare('SELECT set_id AS setId,layout_json AS layout FROM work_window_layouts WHERE device_id=?').all(deviceId) as {setId:string;layout:string}[]
 for(const row of layouts){const set=map.get(row.setId);if(set)set.layout=validateWorkLayout(JSON.parse(row.layout))}
 return{sets,requiresUpgrade:false,sessionToken:a.notebookSession}
}
export function writeWorkSet(a:Binding,input:WorkSetWrite,deviceId:string,layout?:WorkWindowLayout):WorkSetCatalog{
 const r=validateWorkWrite(input);scope(a,r);if(r.sessionToken!==a.notebookSession)throw new ActiveLibraryHostError('library-generation-conflict','工作集会话已失效。')
 const db=a.database;return db.transaction(()=>{const catalog=readWorkSets(a,r,deviceId),c=r.command,previous=c.kind==='create'?undefined:catalog.sets.find(s=>s.id===c.id)
 if(c.kind!=='create'&&(!previous||previous.revision!==c.expectedRevision))throw new ActiveLibraryHostError('work-set-conflict','工作集已变化，请保留草稿并重新读取。')
 if(catalog.requiresUpgrade&&!r.allowUpgrade)throw new ActiveLibraryHostError('work-set-upgrade-required','首次保存工作集需升级至 v7，旧版应用将无法打开。')
 if(c.kind==='create'&&catalog.sets.length>=200)fail('工作集数量达到当前上限。')
 if(c.kind!=='delete')for(const id of c.value.assetIds){const state=db.prepare('SELECT lifecycle_state AS state FROM asset_lifecycle WHERE design_asset_identity=?').get(id) as {state:string}|undefined;if(!state||(state.state!=='active'&&!previous?.assetIds.includes(id)))fail('部分素材不可用，请刷新选择。')}
 enableWorkSetStorage(db)
 if(c.kind==='delete')db.prepare('DELETE FROM work_sets WHERE id=?').run(c.id)
 else {const id=c.kind==='create'?'work-set:'+randomUUID():c.id,v=c.value;if(c.kind==='create')db.prepare('INSERT INTO work_sets VALUES(?,?,?,?,?,?,?)').run(id,v.name,v.note,v.columns,1,JSON.stringify(v.colors),new Date().toISOString());else db.prepare('UPDATE work_sets SET name=?,note=?,columns_count=?,colors_json=?,revision=revision+1 WHERE id=?').run(v.name,v.note,v.columns,JSON.stringify(v.colors),id)
 db.prepare('DELETE FROM work_set_members WHERE set_id=?').run(id);v.assetIds.forEach((assetId,i)=>db.prepare('INSERT INTO work_set_members VALUES(?,?,?)').run(id,assetId,i))}
 if(layout&&c.kind==='save')writeWorkLayout(a,{...r,id:c.id,layout},deviceId)
 return readWorkSets(a,r,deviceId)
 })()
}
export function writeWorkLayout(a:Binding,r:WorkLayoutWrite,deviceId:string):void{
 scope(a,r);workId(deviceId);workId(r.id);if(r.sessionToken!==a.notebookSession)throw new ActiveLibraryHostError('library-generation-conflict','窗口会话已失效。');const layout=validateWorkLayout(r.layout)
 if(!isKnownLibrarySchemaVersion(Number(a.database.pragma('user_version',{simple:true})),7)||!a.database.prepare('SELECT 1 FROM work_sets WHERE id=?').get(r.id))fail('工作集已不存在。')
 a.database.prepare('INSERT INTO work_window_layouts(set_id,device_id,layout_json) VALUES(?,?,?) ON CONFLICT(set_id,device_id) DO UPDATE SET layout_json=excluded.layout_json').run(r.id,deviceId,JSON.stringify(layout))
}
