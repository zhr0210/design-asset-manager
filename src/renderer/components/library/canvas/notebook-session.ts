import {validateNotebook} from '../../../../shared/contracts/asset-notebook.contract'
import type {NotebookAdapter} from '../../gallery/FocusView'
import type {Notebook} from '../../gallery/focus-notes'
import type {NotebookSnapshot,NotebookScope,NotebookSaveRequest} from '../../../../shared/contracts/asset-notebook.contract'
interface Result<T>{success:boolean;value?:T;code?:string;error?:string}
interface Api{notebookRead:(scope:NotebookScope)=>Promise<Result<NotebookSnapshot>>;notebookSave:(input:NotebookSaveRequest)=>Promise<Result<NotebookSnapshot>>}
/** One library view session. No localStorage, filesystem paths or image bytes. */
export function createNotebookSession(scope:{libraryIdentity:string;generation:string},getApi:()=>Api|undefined):NotebookAdapter & {dispose():void;hasUnsaved():boolean} {
 let transient=false;let live=true,books:Notebook={};const snapshots=new Map<string,NotebookSnapshot>(),pending=new Map<string,Promise<Notebook>>()
 const assertLive=()=>{if(!live)throw Error('素材库已关闭，旧笔记会话不可保存。')}
 const unwrap=(r:Result<NotebookSnapshot>)=>{assertLive();if(!r?.success||!r.value){const error=new Error(r?.error||'笔记服务暂不可用，请重试。');Object.assign(error,{code:r?.code});throw error}return r.value}
 const dirty=(id:string)=>{if(!books[id])return false;try{return JSON.stringify(validateNotebook(books[id]))!==JSON.stringify(snapshots.get(id)?.book&&validateNotebook(snapshots.get(id)!.book))}catch{return true}}
 return {
  setTransient:value=>{transient=value},
  load:()=>books,dirty:(id?:string)=>id?dirty(id):Object.keys(books).some(dirty),
  hold:next=>{assertLive();books=next},
  ensure:async(id:string)=>{assertLive();if(snapshots.has(id)&&dirty(id))return books;const existing=pending.get(id);if(existing)return existing
   const task=(async()=>{const api=getApi();if(!api)throw Error('笔记服务暂不可用，请重试。');const snapshot=unwrap(await api.notebookRead({...scope,assetId:id}));snapshots.set(id,snapshot);books={...books,[id]:snapshot.book};return books})()
   pending.set(id,task);try{return await task}finally{pending.delete(id)}
  },
  requiresUpgrade:(id:string)=>snapshots.get(id)?.requiresUpgrade===true,
  save:async(_next:Notebook,id?:string,allowUpgrade=false)=>{assertLive();if(!id||!snapshots.has(id))throw Error('请先完成笔记读取。');const snapshot=snapshots.get(id)!,book=structuredClone(books[id]);const api=getApi();if(!api)throw Error('笔记服务暂不可用，请重试。')
   const saved=unwrap(await api.notebookSave({...scope,assetId:id,book,sessionToken:snapshot.sessionToken,sourceRef:snapshot.sourceRef,expectedRevision:snapshot.revision,allowUpgrade}));snapshots.set(id,saved);if(!saved.requiresUpgrade)for(const value of snapshots.values())value.requiresUpgrade=false
   // New edits made during the request stay in books and therefore remain dirty.
  },
  reconcile:async(id:string)=>{assertLive();const api=getApi(),draft=books[id],previous=snapshots.get(id);if(!api||!draft||!previous)throw Error('请先读取笔记。');const latest=unwrap(await api.notebookRead({...scope,assetId:id}));if(latest.sourceRef!==previous.sourceRef)throw Error('预览版本已变化，草稿保留，暂不能合并。');
   const changed=draft.pages.filter(page=>JSON.stringify(page)!==JSON.stringify(previous.book.pages.find(p=>p.id===page.id)));const copies=changed.map(p=>({...p,id:crypto.randomUUID(),name:(p.name.slice(0,32)+'（冲突草稿）').slice(0,40)}));
   const merged=validateNotebook({pages:[...latest.book.pages,...copies],active:copies[0]?.id||latest.book.active});books={...books,[id]:merged};snapshots.set(id,latest);return books
  },
  saveLabel:'笔记已保存到当前素材库；原图未改变。',
  hasUnsaved:()=>transient||Object.keys(books).some(dirty),
  dispose:()=>{live=false;books={};snapshots.clear();pending.clear()}
 }
}

let current:{key:string;session:ReturnType<typeof createNotebookSession>}|undefined
export function libraryNotebookSession(scope:{libraryIdentity:string;generation:string},getApi:()=>Api|undefined){
 if(!scope.libraryIdentity||!scope.generation)return createNotebookSession(scope,getApi)
 const key=JSON.stringify(scope);if(current?.key===key)return current.session
 clearLibraryNotebookSession();const session=createNotebookSession(scope,getApi);current={key,session};return session
}
export function hasUnsavedLibraryNotes(){return current?.session.hasUnsaved()===true}
export function clearLibraryNotebookSession(){current?.session.dispose();current=undefined}
