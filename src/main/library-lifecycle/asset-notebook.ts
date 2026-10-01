import { isKnownLibrarySchemaVersion } from './library-schema-version'
import type Database from 'better-sqlite3'
import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
import {validateNotebook,type NotebookScope,type NotebookSaveRequest,type NotebookSnapshot} from '../../shared/contracts/asset-notebook.contract'
import {enableNotebookStorage} from './asset-notebook.schema'
interface Binding{identity:string;generation:string;notebookSession:string;database:Database.Database}
const fail=(message:string):never=>{throw new ActiveLibraryHostError('library-operation-failed',message)}
function context(active:Binding,scope:NotebookScope,write=false){
 if(scope.libraryIdentity!==active.identity||scope.generation!==active.generation)throw new ActiveLibraryHostError('library-generation-conflict','素材库已切换，请重新打开笔记。')
 const row=active.database.prepare(`SELECT l.lifecycle_state AS state,c.grid_thumbnail_ref AS sourceRef FROM assets a JOIN asset_lifecycle l ON l.design_asset_identity=a.id JOIN promotion_links p ON p.design_asset_identity=a.id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE a.id=?`).get(scope.assetId) as {state:string;sourceRef:string}|undefined
 if(!row||!['active','trash'].includes(row.state)||write&&row.state!=='active')fail('素材不可编辑，笔记未写入。')
 return row!
}
export function readNotebook(active:Binding,scope:NotebookScope):NotebookSnapshot {
 const asset=context(active,scope),version=Number(active.database.pragma('user_version',{simple:true}))
 const row=isKnownLibrarySchemaVersion(version,5)?active.database.prepare('SELECT source_ref,revision,format_version,book_json FROM asset_notebooks WHERE asset_id=?').get(scope.assetId) as {source_ref:string;revision:number;format_version:number;book_json:string}|undefined:undefined
 if(row&&(row.source_ref!==asset.sourceRef||row.format_version!==1))fail('笔记与当前预览版本不一致，请保留笔记并检查素材。')
 let book={pages:[],active:null} as NotebookSnapshot['book'];if(row){try{book=validateNotebook(JSON.parse(row.book_json))}catch{fail('已保存笔记无法读取，未覆盖原有内容。')}}
 return {book,revision:row?.revision||0,sourceRef:asset.sourceRef,sessionToken:active.notebookSession,requiresUpgrade:version<5}
}
export function saveNotebook(active:Binding,input:NotebookSaveRequest):NotebookSnapshot {
 const book=validateNotebook(input.book)
 return active.database.transaction(()=>{
  const asset=context(active,input,true)
  if(input.sessionToken!==active.notebookSession)throw new ActiveLibraryHostError('library-generation-conflict','素材库会话已失效，请重新读取笔记。')
  const current=readNotebook(active,input)
  if(input.sourceRef!==asset.sourceRef||current.revision!==input.expectedRevision)throw new ActiveLibraryHostError('notebook-conflict','笔记已在其他位置修改，当前草稿保留。请重新打开并核对后保存。')
  if(current.requiresUpgrade&&!input.allowUpgrade)throw new ActiveLibraryHostError('notebook-upgrade-required','首次保存需将素材库升级为 v5，旧版应用将无法打开。')
  enableNotebookStorage(active.database)
  active.database.prepare(`INSERT INTO asset_notebooks(asset_id,source_ref,revision,format_version,book_json,updated_at) VALUES(?,?,?,1,?,?) ON CONFLICT(asset_id) DO UPDATE SET revision=excluded.revision,book_json=excluded.book_json,updated_at=excluded.updated_at`).run(input.assetId,asset.sourceRef,current.revision+1,JSON.stringify(book),new Date().toISOString())
  return {...current,book,revision:current.revision+1,requiresUpgrade:false}
 })()
}
