import {validateNotebook} from '../../../../shared/contracts/asset-notebook.contract'
import { holdWorkspaceDraft, removeWorkspaceDraft, recoveredWorkspaceDraft, suspendRecoveredWorkspaceDraft } from '../../../workspace-drafts'
import type {NotebookAdapter} from '../../gallery/FocusView'
import type {Notebook} from '../../gallery/focus-notes'
import type {NotebookSnapshot,NotebookScope,NotebookSaveRequest} from '../../../../shared/contracts/asset-notebook.contract'
interface Result<T>{success:boolean;value?:T;code?:string;error?:string}
interface Api{notebookRead:(scope:NotebookScope)=>Promise<Result<NotebookSnapshot>>;notebookSave:(input:NotebookSaveRequest)=>Promise<Result<NotebookSnapshot>>}
/** One library view session. No localStorage, filesystem paths or image bytes. */
export function createNotebookSession(scope:{libraryIdentity:string;generation:string},getApi:()=>Api|undefined):NotebookAdapter & {dispose():void;hasUnsaved():boolean;hasTransient():boolean} {
 let transient=false;let live=true,books:Notebook={};const snapshots=new Map<string,NotebookSnapshot>(),pending=new Map<string,Promise<Notebook>>()
 const reconciliations=new Map<string,symbol>()
 const assertLive=()=>{if(!live)throw Error('素材库已关闭，旧笔记会话不可保存。')}
 const unwrap=(r:Result<NotebookSnapshot>)=>{assertLive();if(!r?.success||!r.value){const error=new Error(r?.error||'笔记服务暂不可用，请重试。');Object.assign(error,{code:r?.code});throw error}return r.value}
 const dirty=(id:string)=>{if(!books[id])return false;try{return JSON.stringify(validateNotebook(books[id]))!==JSON.stringify(snapshots.get(id)?.book&&validateNotebook(snapshots.get(id)!.book))}catch{return true}}
 const draftScope=(id:string)=>({...scope,kind:'notebook' as const,entityId:id})
 const checkpoint=(id:string)=>{const base=snapshots.get(id);if(!base)return;if(dirty(id))holdWorkspaceDraft(draftScope(id),books[id],{revision:base.revision,sourceRef:base.sourceRef,book:base.book});else removeWorkspaceDraft(draftScope(id))}
 return {
  setTransient:value=>{transient=value},
  load:()=>books,dirty:(id?:string)=>id?dirty(id):Object.keys(books).some(dirty),
  hold:next=>{assertLive();books=next;for(const id of Object.keys(books))checkpoint(id)},
  ensure:async(id:string)=>{assertLive();if(snapshots.has(id)&&dirty(id))return books;const existing=pending.get(id);if(existing)return existing
   const task=(async()=>{const api=getApi();if(!api)throw Error('笔记服务暂不可用，请重试。');const snapshot=unwrap(await api.notebookRead({...scope,assetId:id}));const recovered=recoveredWorkspaceDraft(draftScope(id));if(recovered){const base=recovered.base as {revision:number;sourceRef:string;book:NotebookSnapshot['book']};if(base.sourceRef!==snapshot.sourceRef){suspendRecoveredWorkspaceDraft(draftScope(id));throw Error('预览版本已变化，恢复草稿仍保留，暂不可合并。');}snapshots.set(id,{...snapshot,revision:base.revision,book:validateNotebook(base.book)});books={...books,[id]:validateNotebook(recovered.value)}}else{snapshots.set(id,snapshot);books={...books,[id]:snapshot.book}}return books})()
   pending.set(id,task);try{return await task}finally{pending.delete(id)}
  },
  requiresUpgrade:(id:string)=>snapshots.get(id)?.requiresUpgrade===true,
  save:async(_next:Notebook,id?:string,allowUpgrade=false)=>{assertLive();if(!id||!snapshots.has(id))throw Error('请先完成笔记读取。');const snapshot=snapshots.get(id)!,book=structuredClone(books[id]);const api=getApi();if(!api)throw Error('笔记服务暂不可用，请重试。')
   reconciliations.delete(id)
   const saved=unwrap(await api.notebookSave({...scope,assetId:id,book,sessionToken:snapshot.sessionToken,sourceRef:snapshot.sourceRef,expectedRevision:snapshot.revision,allowUpgrade}));snapshots.set(id,saved);if(!saved.requiresUpgrade)for(const value of snapshots.values())value.requiresUpgrade=false
   // New edits made during the request stay in books and therefore remain dirty.
   checkpoint(id)
  },
  reconcile:async(id:string)=>{assertLive();const api=getApi(),previous=snapshots.get(id);if(!api||!books[id]||!previous)throw Error('请先读取笔记。');const operation=Symbol();reconciliations.set(id,operation);const latest=unwrap(await api.notebookRead({...scope,assetId:id}));if(reconciliations.get(id)!==operation||snapshots.get(id)!==previous)throw Error('较新的笔记操作已取代本次核对，当前草稿仍保留。');if(latest.sourceRef!==previous.sourceRef)throw Error('预览版本已变化，草稿保留，暂不能合并。');
   const draft=books[id]
   const changed=draft.pages.filter(page=>JSON.stringify(page)!==JSON.stringify(previous.book.pages.find(p=>p.id===page.id)));const copies=changed.map(p=>({...p,id:crypto.randomUUID(),name:(p.name.slice(0,32)+'（冲突草稿）').slice(0,40)}));
   const merged=validateNotebook({pages:[...latest.book.pages,...copies],active:copies[0]?.id||latest.book.active});books={...books,[id]:merged};snapshots.set(id,latest);checkpoint(id);return books
  },
  saveLabel:'笔记已保存到当前素材库；原图未改变。',
  hasUnsaved:()=>transient||Object.keys(books).some(dirty),
  hasTransient:()=>transient,
  dispose:()=>{live=false;books={};snapshots.clear();pending.clear();reconciliations.clear()}
 }
}

let current:{key:string;session:ReturnType<typeof createNotebookSession>}|undefined
export function libraryNotebookSession(scope:{libraryIdentity:string;generation:string},getApi:()=>Api|undefined){
 if(!scope.libraryIdentity||!scope.generation)return createNotebookSession(scope,getApi)
 const key=JSON.stringify(scope);if(current?.key===key)return current.session
 clearLibraryNotebookSession();const session=createNotebookSession(scope,getApi);current={key,session};return session
}
export function hasUnsavedLibraryNotes(){return current?.session.hasUnsaved()===true}
export function hasTransientLibraryNotes(){return current?.session.hasTransient()===true}
export function clearLibraryNotebookSession(){current?.session.dispose();current=undefined}
