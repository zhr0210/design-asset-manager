import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {randomUUID} from 'node:crypto'
import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
import {validateWorkWrite,validateWorkLayout,workId,type WorkScope,type WorkSetCatalog,type WorkSetWrite,type WorkLayoutWrite,type SavedWorkSet,type WorkWindowLayout} from '../../shared/contracts/work-set.contract'
interface Binding{database:Database.Database;identity:string;generation:string;notebookSession:string}
const fail=(message:string):never=>{throw new ActiveLibraryHostError('library-operation-failed',message)}
function scope(a:Binding,s:WorkScope){if(a.identity!==s.libraryIdentity||a.generation!==s.generation)throw new ActiveLibraryHostError('library-generation-conflict','素材库已切换，请重新打开工作集。')}
export function readWorkSets(a:Binding,s:WorkScope,deviceId:string):WorkSetCatalog {
 scope(a,s);workId(deviceId);const db=a.database;if(Number(db.pragma('user_version',{simple:true}))<7)return{sets:[],requiresUpgrade:true,sessionToken:a.notebookSession}
 const rows=db.prepare('SELECT id,name,columns_count AS columns,revision FROM work_sets ORDER BY created_at,id').all() as {id:string;name:string;columns:number;revision:number}[]
 const sets:SavedWorkSet[]=rows.map(r=>({...r,assetIds:[],unavailableIds:[],layout:null})),map=new Map(sets.map(s=>[s.id,s]));
 const members=db.prepare('SELECT m.set_id AS setId,m.asset_id AS assetId,l.lifecycle_state AS state FROM work_set_members m LEFT JOIN asset_lifecycle l ON l.design_asset_identity=m.asset_id ORDER BY m.set_id,m.position').all() as {setId:string;assetId:string;state:string}[]
 for(const m of members){const set=map.get(m.setId);set?.assetIds.push(m.assetId);if(m.state!=='active')set?.unavailableIds.push(m.assetId)}
 const layouts=db.prepare('SELECT set_id AS setId,layout_json AS layout FROM work_window_layouts WHERE device_id=?').all(deviceId) as {setId:string;layout:string}[]
 for(const row of layouts){const set=map.get(row.setId);if(set)set.layout=validateWorkLayout(JSON.parse(row.layout))}
 return{sets,requiresUpgrade:Number(db.pragma('user_version',{simple:true}))<16,sessionToken:a.notebookSession}
}
export function writeWorkSet(a:Binding,input:WorkSetWrite,deviceId:string,layout?:WorkWindowLayout):WorkSetCatalog{
 const r=validateWorkWrite(input);scope(a,r);if(r.sessionToken!==a.notebookSession)throw new ActiveLibraryHostError('library-generation-conflict','工作集会话已失效。')
 const db=a.database;return db.transaction(()=>{const catalog=readWorkSets(a,r,deviceId),c=r.command,previous=c.kind==='create'?undefined:catalog.sets.find(s=>s.id===c.id)
 if(c.kind!=='create'&&(!previous||previous.revision!==c.expectedRevision))throw new ActiveLibraryHostError('work-set-conflict','工作集已变化，请保留草稿并重新读取。')
 if((c.kind==='save'||c.kind==='fork'&&c.move)&&previous!.revision>=Number.MAX_SAFE_INTEGER)fail('工作集修订达到安全上限，未覆盖内容。')
 if(catalog.requiresUpgrade&&!r.allowUpgrade)throw new ActiveLibraryHostError('work-set-upgrade-required','工作集更新需明确升级至 v16并清理历史备注/用色；旧版应用将无法打开。')
 if((c.kind==='create'||c.kind==='fork')&&catalog.sets.length>=200)fail('工作集数量达到当前上限。')
 if(c.kind!=='delete')for(const id of c.value.assetIds){const state=db.prepare('SELECT lifecycle_state AS state FROM asset_lifecycle WHERE design_asset_identity=?').get(id) as {state:string}|undefined;if(!state||(state.state!=='active'&&!previous?.assetIds.includes(id)))fail('部分素材不可用，请刷新选择。')}
 if(Number(db.pragma('user_version',{simple:true}))<16)throw new ActiveLibraryHostError('work-set-upgrade-required','请先完成有备份的工作集退役升级。')
 if(c.kind==='delete')db.prepare('DELETE FROM work_sets WHERE id=?').run(c.id)
 else {if(c.kind==='fork'&&c.value.assetIds.some(id=>!previous!.assetIds.includes(id)))fail('转入新工作集仅支持当前集合成员。');const id=(c.kind==='create'||c.kind==='fork')?'work-set:'+randomUUID():c.id,v=c.value;if(c.kind==='create'||c.kind==='fork')db.prepare('INSERT INTO work_sets(id,name,columns_count,revision,created_at) VALUES(?,?,?,?,?)').run(id,v.name,v.columns,1,new Date().toISOString());else db.prepare('UPDATE work_sets SET name=?,columns_count=?,revision=revision+1 WHERE id=?').run(v.name,v.columns,id)
 if(c.kind==='fork'&&c.move){const retained=previous!.assetIds.filter(id=>!c.value.assetIds.includes(id));db.prepare('DELETE FROM work_set_members WHERE set_id=?').run(c.id);retained.forEach((assetId,i)=>db.prepare('INSERT INTO work_set_members VALUES(?,?,?)').run(c.id,assetId,i));db.prepare('UPDATE work_sets SET revision=revision+1 WHERE id=?').run(c.id)}
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
