import type Database from 'better-sqlite3'
import {randomUUID} from 'node:crypto'
import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
import {validateOrganizationWrite,type OrganizationScope,type OrganizationSnapshot,type OrganizationWrite,type LibraryFolder} from '../../shared/contracts/library-organization.contract'
import {enableOrganizationStorage} from './library-organization.schema'
interface Binding {identity:string;generation:string;notebookSession:string;database:Database.Database}
const fail=(message:string):never=>{throw new ActiveLibraryHostError('library-operation-failed',message)}
function requireScope(a:Binding,s:OrganizationScope){if(s.libraryIdentity!==a.identity||s.generation!==a.generation)throw new ActiveLibraryHostError('library-generation-conflict','素材库已变化，请重新读取文件夹。')}
export function readOrganization(a:Binding,s:OrganizationScope):OrganizationSnapshot{
 requireScope(a,s);const db=a.database,v=Number(db.pragma('user_version',{simple:true}));if(v<6)return{folders:[],revision:0,sessionToken:a.notebookSession,requiresUpgrade:true}
 const rows=db.prepare('SELECT id,name,kind,parent_id AS parentId FROM library_folders ORDER BY created_at,id').all() as Omit<LibraryFolder,'assetIds'|'colors'>[]
 const folders=rows.map(f=>({...f,assetIds:[] as string[],colors:[] as LibraryFolder['colors']})),byId=new Map(folders.map(f=>[f.id,f]))
 const members=db.prepare("SELECT f.folder_id AS folderId,f.asset_id AS assetId FROM library_folder_assets f JOIN asset_lifecycle l ON l.design_asset_identity=f.asset_id WHERE l.lifecycle_state='active' ORDER BY f.asset_id").all() as {folderId:string;assetId:string}[]
 for(const m of members)byId.get(m.folderId)?.assetIds.push(m.assetId)
 const colors=db.prepare('SELECT folder_id AS folderId,hex,source_asset_id AS sourceAssetId FROM library_palette_colors ORDER BY created_at,hex').all() as {folderId:string;hex:string;sourceAssetId:string|null}[]
 for(const {folderId,...c}of colors)byId.get(folderId)?.colors.push(c)
 const state=db.prepare('SELECT revision FROM library_organization_state WHERE singleton=1').get() as {revision:number}|undefined;if(!state)fail('分类记录损坏，请检查素材库。')
 return{folders,revision:state!.revision,sessionToken:a.notebookSession,requiresUpgrade:false}
}
export function writeOrganization(a:Binding,input:OrganizationWrite):OrganizationSnapshot{
 const r=validateOrganizationWrite(input);requireScope(a,r);if(r.sessionToken!==a.notebookSession)throw new ActiveLibraryHostError('library-generation-conflict','素材库会话已失效，请刷新文件夹。')
 const db=a.database
 return db.transaction(()=>{
  const snapshot=readOrganization(a,r);if(snapshot.revision!==r.expectedRevision)throw new ActiveLibraryHostError('organization-conflict','文件夹已发生变化。请刷新后重试，当前输入仍保留。')
  if(snapshot.requiresUpgrade&&!r.allowUpgrade)throw new ActiveLibraryHostError('organization-upgrade-required','首次保存文件夹或色板需升级到 v6，旧版应用将无法打开。')
  const c=r.command,folders=snapshot.folders,find=(id:string)=>{const f=folders.find(x=>x.id===id);if(!f)fail('文件夹不存在，请刷新后重试。');return f!}
  const requireParent=(parentId:string|null,kind:string,self?:string)=>{let next=parentId;const visited=new Set<string>();while(next){if(next===self||visited.has(next))fail('不能把文件夹移入自己或子文件夹。');visited.add(next);const p=find(next);if(p.kind!==kind)fail('普通文件夹与色板不能相互嵌套。');next=p.parentId}const depth=(id:string):number=>1+Math.max(0,...folders.filter(f=>f.parentId===id).map(f=>depth(f.id)));if(visited.size+(self?depth(self):1)>20)fail('文件夹层级不能超过20层。')}
  const active=(id:string)=>{if(!db.prepare("SELECT 1 FROM asset_lifecycle WHERE design_asset_identity=? AND lifecycle_state='active'").get(id))fail('素材不可用，请刷新后重试。')}
  const unique=(name:string,parentId:string|null,kind:string,self?:string)=>{if(folders.some(f=>f.id!==self&&f.parentId===parentId&&f.kind===kind&&f.name===name))fail('同一位置已有同名文件夹。')}
  if(c.kind==='create'){if(folders.length>=2000)fail('文件夹数量达到当前上限。');requireParent(c.parentId,c.folderKind);unique(c.name,c.parentId,c.folderKind);c.assetIds?.forEach(active);if(c.color?.sourceAssetId)active(c.color.sourceAssetId)}
  else {const f=find(c.folderId);if(c.kind==='update'){requireParent(c.parentId,f.kind,f.id);unique(c.name,c.parentId,f.kind,f.id)}if(c.kind==='rename')unique(c.name,f.parentId,f.kind,f.id);if(c.kind==='move'){requireParent(c.parentId,f.kind,f.id);unique(f.name,c.parentId,f.kind,f.id)}if(c.kind==='delete'&&folders.some(x=>x.parentId===f.id))fail('请先移走或删除子文件夹；素材不会被删除。');if(c.kind==='add-assets'||c.kind==='remove-assets'){if(f.kind!=='assets')fail('色板不能收录素材成员。');if(c.kind==='add-assets')c.assetIds.forEach(active)}if(c.kind==='add-color'||c.kind==='remove-color'){if(f.kind!=='palette')fail('请选一个色板文件夹。');if(c.kind==='add-color'&&c.sourceAssetId)active(c.sourceAssetId)}}
  enableOrganizationStorage(db)
  const addAssets=(folderId:string,ids:string[])=>{for(const id of ids)db.prepare('INSERT OR IGNORE INTO library_folder_assets(folder_id,asset_id) VALUES(?,?)').run(folderId,id)}
  const addColor=(folderId:string,hex:string,source:string|null)=>{const n=db.prepare('SELECT COUNT(*) AS n FROM library_palette_colors WHERE folder_id=?').get(folderId) as {n:number};if(n.n>=5000&&!db.prepare('SELECT 1 FROM library_palette_colors WHERE folder_id=? AND hex=?').get(folderId,hex))fail('单个色板最多保存5000种颜色。');db.prepare('INSERT OR IGNORE INTO library_palette_colors(folder_id,hex,source_asset_id,created_at) VALUES(?,?,?,?)').run(folderId,hex,source,new Date().toISOString())}
  switch(c.kind){
  case 'create':{const id='folder:'+randomUUID();db.prepare('INSERT INTO library_folders VALUES(?,?,?,?,?)').run(id,c.name,c.folderKind,c.parentId,new Date().toISOString());if(c.assetIds)addAssets(id,c.assetIds);if(c.color)addColor(id,c.color.hex,c.color.sourceAssetId);break}
  case 'update':db.prepare('UPDATE library_folders SET name=?,parent_id=? WHERE id=?').run(c.name,c.parentId,c.folderId);break
  case 'rename':db.prepare('UPDATE library_folders SET name=? WHERE id=?').run(c.name,c.folderId);break
  case 'move':db.prepare('UPDATE library_folders SET parent_id=? WHERE id=?').run(c.parentId,c.folderId);break
  case 'delete':db.prepare('DELETE FROM library_folders WHERE id=?').run(c.folderId);break
  case 'add-assets':addAssets(c.folderId,c.assetIds);break
  case 'remove-assets':for(const id of c.assetIds)db.prepare('DELETE FROM library_folder_assets WHERE folder_id=? AND asset_id=?').run(c.folderId,id);break
  case 'add-color':addColor(c.folderId,c.hex,c.sourceAssetId);break
  case 'remove-color':db.prepare('DELETE FROM library_palette_colors WHERE folder_id=? AND hex=?').run(c.folderId,c.hex);break
  }
  db.prepare('UPDATE library_organization_state SET revision=revision+1 WHERE singleton=1').run();return readOrganization(a,r)
 })()
}
