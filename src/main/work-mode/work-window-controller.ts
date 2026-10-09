import {randomUUID,createHash} from 'node:crypto'
import {validateWorkMediaScope} from '../../shared/contracts/work-media.contract'
import type { WorkspaceDraftScope } from '../../shared/contracts/workspace-draft.contract'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import {validateWorkScope,validateWorkLayout,validateWorkWrite,validateWorkValue,validateWorkWindowControl,workRecord,workId,workRevision,workClipboardRequestId,type WorkScope,type WorkSetWrite,type WorkSetCatalog,type WorkWindowSnapshot,type WorkWindowAction,type WorkResult,type WorkWindowLayout,type WorkWindowControlState,type WorkWindowControlResult,type WorkClipboardEffect} from '../../shared/contracts/work-set.contract'
import {validateNotebook,type NotebookSaveRequest} from '../../shared/contracts/asset-notebook.contract'
import {visibleWorkBounds,dockWorkBounds,expandedWorkBounds,type WorkArea} from './work-window-bounds'
export interface WorkWindowPort{readFileIcon?(verifiedFile:string):Promise<Uint8Array>;configureDock?(layout:WorkWindowLayout):void;startDragFiles?(files:string[],icon:Uint8Array):void;startDrag?(file:string,icon:Uint8Array):void;publish(value:WorkWindowSnapshot|null):void;show():void;hide():void;destroy():void;setPinned(value:boolean):void;bounds():WorkWindowLayout;setBounds(value:WorkWindowLayout):void;visible():boolean;isTrusted(event:unknown):boolean}
class ClipboardAttachmentError extends Error{readonly code='CLIPBOARD_ATTACHMENT_INCOMPLETE';constructor(readonly effect:WorkClipboardEffect){super('图片已保存到素材库，但未确认加入工作集；未覆盖现有内容。请在资料库查看该图片并重新加入。')}}
interface Entry{pasteActive?:boolean;clipboardAssets?:Set<string>;fileRetiring?:symbol;notesDirty?:boolean;port:WorkWindowPort;state:WorkWindowSnapshot;sessionToken:string;queue:Promise<unknown>;timer?:ReturnType<typeof setTimeout>}
/** Windows are owned separately; private paths and broad application APIs never enter their preload. */
export function createWorkWindowController(deps:{readClipboardImage?:()=>Promise<Uint8Array>;media?:ReturnType<typeof import('./work-media-controller').createWorkMediaController>;host:ActiveLibraryHost;deviceId:string;areas:()=>WorkArea[];theme:()=> 'light'|'dark';createWindow:(input:{layout:WorkWindowLayout;changed:()=>void;closed:()=>void;readPreview:(url:string)=>Promise<Uint8Array>;readMedia?:(url:string)=>Promise<{bytes:Uint8Array;type:string}>})=>WorkWindowPort;beforeWorkspaceClose:()=>Promise<()=>void>;changed:()=>void;locate:(scope:WorkScope,setId:string,assetId?:string)=>void;hideMain:()=>void}){
 const entries=new Map<string,Entry>();let epoch=0;let retiredSession:string|null=null;let draining=false,drainPromise:Promise<void>|null=null
 const result=async<T>(fn:()=>Promise<T>|T):Promise<WorkResult<T>>=>{try{return{success:true,value:await fn()}}catch(e){return{success:false,error:e instanceof Error&&'code'in e?e.message:e instanceof Error&&e.message==='TOO_MANY_WINDOWS'?'最多同时打开8个工作窗口，请先关闭其他工作窗口。':'操作未完成，请重试。',...(e&&typeof e==='object'&&'code'in e?{code:String(e.code)}:{}),...(e instanceof ClipboardAttachmentError?{effect:e.effect}:{})}}}
 const matches=(s:WorkScope)=>{const a=deps.host.inspect();return a.state==='ready'&&a.identity===s.libraryIdentity&&a.generation===s.generation}
 const assertCurrent=(entry:Entry)=>{if(entries.get(entry.state.set.id)!==entry||!matches(entry.state.scope))throw Error('STALE_WORK_WINDOW')}
 const fileActor=(e:Entry)=>'work-native:'+e.state.token
 const fileLifecycle=()=>{
  if(!deps.media)return null
  const media: {hasActive?:(actor:string)=>boolean;revoke?:(actor:string)=>Promise<void>;whenIdle?:(actor:string)=>Promise<void>}=deps.media
  if(!media.hasActive||!media.revoke||!media.whenIdle)throw Object.assign(Error('交付操作状态尚未提供，窗口保留，请稍后重试。'),{code:'WORK_OPERATION_STATUS_UNAVAILABLE'})
  return{hasActive:media.hasActive.bind(media),cancel:media.revoke.bind(media),whenIdle:media.whenIdle.bind(media)}
 }
 const assertFileIdle=(e:Entry)=>{if(e.pasteActive||fileLifecycle()?.hasActive(fileActor(e)))throw Object.assign(Error('正在准备交付，请完成或取消后再关闭。'),{code:'WORK_OPERATION_ACTIVE'})}
 const assertFileAdmission=(e:Entry)=>{if(draining||e.fileRetiring)throw Object.assign(Error('窗口正在退出，未开始新的交付操作。'),{code:'WORK_OPERATION_RETIRING'})}
 const entryUnsaved=(e:Entry)=>Boolean(e.notesDirty||e.state.draft&&JSON.stringify(e.state.draft)!==JSON.stringify(validateWorkValue({name:e.state.set.name,assetIds:e.state.set.assetIds,note:e.state.set.note,colors:e.state.set.colors,columns:e.state.set.columns})))
 const controlState=(e:Entry,open=true):WorkWindowControlState=>({id:e.state.set.id,open,pinned:e.port.bounds().pinned,visible:open&&e.port.visible(),hasUnsaved:entryUnsaved(e),...(e.state.layoutError?{layoutError:e.state.layoutError}:{})})
 const invalidate=()=>{epoch++;for(const e of entries.values()){deps.media?.revoke("work-native:"+e.state.token);clearTimeout(e.timer);e.port.publish(null);e.port.destroy()}entries.clear()}
 const locateEntry=(event:unknown,token?:string)=>{for(const e of entries.values())if(e.port.isTrusted(event)&&(!token||token===e.state.token)){assertCurrent(e);return e}throw Error('UNTRUSTED_WORK_WINDOW')}
 const persist=(e:Entry)=>{const save=async()=>{assertCurrent(e);const layout=validateWorkLayout({...e.port.bounds(),open:true});e.state={...e.state,geometry:layout,pinned:layout.pinned};try{await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout},deps.deviceId);assertCurrent(e);e.state={...e.state,geometry:layout,pinned:layout.pinned,layoutError:undefined};e.port.publish(e.state)}catch(error){if(entries.get(e.state.set.id)===e){e.state={...e.state,layoutError:'窗口位置未保存，请重试。'};e.port.publish(e.state)}throw error}finally{deps.changed()}};const task=e.queue.then(save);e.queue=task.catch(()=>{});return task}
 const geometryChanged=(e:Entry)=>{clearTimeout(e.timer);e.timer=setTimeout(()=>{void(async()=>{assertCurrent(e);const actual=e.port.bounds();if(actual.dock){const target=visibleWorkBounds(actual,deps.areas());if(actual.x!==target.x||actual.y!==target.y||actual.width!==target.width||actual.height!==target.height)e.port.setBounds(target)}await persist(e)})().catch(()=>{})},250)}
 const refreshEntry=async(e:Entry)=>{const before=epoch;const catalog=await deps.host.readWorkSets(e.state.scope,deps.deviceId);if(before!==epoch)return;assertCurrent(e);const set=catalog.sets.find(s=>s.id===e.state.set.id);if(!set){clearTimeout(e.timer);entries.delete(e.state.set.id);e.port.destroy();return}const assets=(await deps.host.readAssetContext(set.assetIds)).assets;if(before!==epoch)return;assertCurrent(e);e.state={...e.state,set,assets:[...assets]};e.sessionToken=catalog.sessionToken;e.port.publish(e.state)}
 const refresh=async()=>{for(const e of [...entries.values()]){try{await refreshEntry(e)}catch{if(entries.get(e.state.set.id)===e){entries.delete(e.state.set.id);clearTimeout(e.timer);e.port.destroy()}}}}
 const read=(input:unknown)=>result(async()=>{const catalog=await deps.host.readWorkSets(validateWorkScope(input),deps.deviceId);if(catalog.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');return catalog})
 const write=(input:unknown)=>result(async()=>{const r=validateWorkWrite(input);if(r.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');const value=await deps.host.writeWorkSet(r,deps.deviceId);deps.changed();await refresh();return value})
 const windows=(input:unknown)=>result(async()=>{const scope=validateWorkScope(input);if(!matches(scope))throw Error('STALE_LIBRARY');await Promise.all([...entries.values()].map(e=>e.queue));if(!matches(scope))throw Error('STALE_LIBRARY');return[...entries.values()].map(e=>{assertCurrent(e);return controlState(e)})})
 const control=(input:unknown)=>result(async():Promise<WorkWindowControlResult>=>{const a=validateWorkWindowControl(input);if(!matches(a))throw Error('STALE_LIBRARY');const e=entries.get(a.id);if(!e)throw Object.assign(Error('此工作窗口已关闭，请重新打开。'),{code:'WORK_WINDOW_MISSING'});const retirement=Symbol('workspace-close');if(a.kind==='close'){assertFileIdle(e);assertFileAdmission(e);e.fileRetiring=retirement}let release:(()=>void)|undefined;try{release=a.kind==='close'?await deps.beforeWorkspaceClose():undefined;const run=async():Promise<WorkWindowControlResult>=>{assertCurrent(e)
  if(a.kind==='close'){
   assertFileIdle(e);if(entryUnsaved(e)){e.port.show();deps.changed();return{status:'review-required',window:controlState(e),message:'此原生窗口有未保存的工作集或笔记，已保留并显示。请在该窗口核对并保存或明确放弃，再关闭。'}}
   clearTimeout(e.timer);const state=controlState(e,false);await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout:{...e.port.bounds(),open:false}},deps.deviceId);assertCurrent(e);entries.delete(e.state.set.id);e.port.destroy();deps.changed();return{status:'applied',window:state}
  }
  if(a.kind==='pin'){e.port.setPinned(a.pinned);e.state={...e.state,pinned:a.pinned};e.port.publish(e.state)}
  else if(a.kind==='hide')e.port.hide()
  else{e.port.setBounds(visibleWorkBounds(e.port.bounds(),deps.areas()));e.port.show()}
  return{status:'applied',window:controlState(e)}
 };const task=e.queue.then(run);e.queue=task.catch(()=>{});const applied=await task;if(a.kind!=='close'){await persist(e);return{...applied,window:controlState(e)}}return applied}finally{release?.();if(entries.get(e.state.set.id)===e&&e.fileRetiring===retirement)e.fileRetiring=undefined}})
 const open=async(input:unknown):Promise<WorkResult<WorkWindowSnapshot>>=>result(async()=>{if(draining)throw Error('LIBRARY_TRANSITION');const r=workRecord(input,['libraryIdentity','generation','id','theme']),scope=validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),id=workId(r.id);if(r.theme!==undefined&&!['light','dark'].includes(String(r.theme)))throw Error('INVALID_THEME');if(!matches(scope))throw Error('STALE_LIBRARY');const existing=entries.get(id);if(existing){assertCurrent(existing);if(r.theme==='light'||r.theme==='dark'){existing.state={...existing.state,theme:r.theme};existing.port.publish(existing.state)}existing.port.show();return existing.state}if(entries.size>=8)throw Error('TOO_MANY_WINDOWS');const before=epoch,catalog=await deps.host.readWorkSets(scope,deps.deviceId),set=catalog.sets.find(s=>s.id===id);if(catalog.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');if(!set)throw Error('SET_MISSING');const assets=(await deps.host.readAssetContext(set.assetIds)).assets;if(before!==epoch||!matches(scope)||draining)throw Error('STALE_LIBRARY');if(entries.has(id)){const existing=entries.get(id)!;existing.port.show();return existing.state}
  const layout={...visibleWorkBounds(set.layout,deps.areas(),entries.size),open:true};await deps.host.writeWorkLayout({...scope,id,sessionToken:catalog.sessionToken,layout},deps.deviceId);if(before!==epoch||!matches(scope)||draining)throw Error('STALE_LIBRARY')
  if(entries.has(id)){const existing=entries.get(id)!;existing.port.show();return existing.state}if(entries.size>=8)throw Error('TOO_MANY_WINDOWS');
  const state:WorkWindowSnapshot={token:randomUUID(),scope,set,assets:[...assets],pinned:layout.pinned,geometry:layout,theme:r.theme==='dark'?'dark':r.theme==='light'?'light':deps.theme()};let entry:Entry
  const port=deps.createWindow({layout,readMedia:async(url)=>{assertCurrent(entry);const u=new URL(url);if(u.protocol!=="dam-workmedia:"||u.host!=="media"||u.search||u.hash||u.username||u.password||u.port)throw Error("INVALID_MEDIA");const p=u.pathname.split("/").filter(Boolean).map(decodeURIComponent);if((p.length!==4&&p.length!==5)||p[0]!==scope.libraryIdentity||p[1]!==scope.generation||p[2]!==id||!entry.state.set.assetIds.includes(p[3])||entry.state.set.unavailableIds.includes(p[3]))throw Error("MEMBERSHIP_NOT_GRANTED");const file=await deps.host.readWorkMediaFile({...scope,setId:id,assetId:p[3],...(p[4]?{frameId:p[4]}:{})});assertCurrent(entry);if(!entry.state.set.assetIds.includes(p[3])||entry.state.set.unavailableIds.includes(p[3]))throw Error("MEMBERSHIP_NOT_GRANTED");return file},readPreview:async(url)=>{assertCurrent(entry);const u=new URL(url);if(u.host!=='preview'||u.search||u.username||u.password||u.port)throw Error('INVALID_PREVIEW');const parts=u.pathname.split('/').filter(Boolean).map(decodeURIComponent);if(parts.length!==3||parts[0]!==scope.libraryIdentity||parts[1]!==scope.generation||!entry.state.set.assetIds.includes(parts[2])||entry.state.set.unavailableIds.includes(parts[2]))throw Error('MEMBERSHIP_NOT_GRANTED');const bytes=await deps.host.readPreview(parts[2]);assertCurrent(entry);if(!entry.state.set.assetIds.includes(parts[2])||entry.state.set.unavailableIds.includes(parts[2]))throw Error('MEMBERSHIP_NOT_GRANTED');return bytes},changed:()=>{if(entry&&entries.get(id)===entry)geometryChanged(entry)},closed:()=>{if(entry&&entries.get(id)===entry){clearTimeout(entry.timer);entries.delete(id)}}});if(layout.dock){if(!port.configureDock){port.destroy();throw Object.assign(Error('当前窗口不支持恢复停靠布局。'),{code:'NATIVE_DOCK_UNAVAILABLE'})}try{port.configureDock(layout)}catch(error){port.destroy();throw error}}
  const actual=validateWorkLayout(port.bounds());entry={port,state:{...state,geometry:actual,pinned:actual.pinned},sessionToken:catalog.sessionToken,queue:Promise.resolve()};entries.set(id,entry);port.publish(entry.state);port.show();deps.changed();await persist(entry);return entry.state
 })
 const restore=(input:unknown)=>result(async()=>{const r=workRecord(input,['libraryIdentity','generation','theme']);if(r.theme!==undefined&&!['light','dark'].includes(String(r.theme)))throw Error('INVALID_THEME');const scope=validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),catalog=await deps.host.readWorkSets(scope,deps.deviceId);let count=0;for(const set of catalog.sets.filter(s=>s.layout?.open)){const opened=await open({...scope,id:set.id,theme:r.theme});if(!opened.success)throw Error('WINDOW_RESTORE_FAILED');count++}return{count}})
 const recover=()=>result(async()=>{for(const e of entries.values()){e.port.setBounds(visibleWorkBounds(e.port.bounds(),deps.areas()));e.port.show();await persist(e)}return{count:entries.size}})
 const scopedMediaEntry=(event:unknown,value:unknown)=>{
  const r=workRecord(value,['token','request']),e=locateEntry(event,workId(r.token)),q=r.request as Record<string,unknown>
  if(!q||typeof q!=='object')throw Error('INVALID_MEDIA_REQUEST')
  const scope=validateWorkMediaScope({libraryIdentity:q.libraryIdentity,generation:q.generation,setId:q.setId,assetId:q.assetId})
  if(scope.libraryIdentity!==e.state.scope.libraryIdentity||scope.generation!==e.state.scope.generation||scope.setId!==e.state.set.id||!e.state.set.assetIds.includes(scope.assetId)||e.state.set.unavailableIds.includes(scope.assetId))throw Error('MEMBERSHIP_NOT_GRANTED')
  return{e,request:r.request}
 }
 const mediaReply=async<T>(reply:Promise<WorkResult<T>>):Promise<T>=>{const value=await reply;if(!value.success)throw Object.assign(Error(value.error),{code:value.code});return value.value}
 const nativeMediaRead=(event:unknown,input:unknown)=>result(async()=>{const {e,request}=scopedMediaEntry(event,input);if(!deps.media)throw Error('MEDIA_UNAVAILABLE');const value=await mediaReply(deps.media.read(request));assertCurrent(e);return value})
 const nativeMediaWrite=(event:unknown,input:unknown)=>result(async()=>{const {e,request}=scopedMediaEntry(event,input);if(!deps.media)throw Error('MEDIA_UNAVAILABLE');const value=await mediaReply(deps.media.write('work-native:'+e.state.token,request));assertCurrent(e);return value})
 const nativeMediaCancel=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token']),e=locateEntry(event,workId(r.token));if(!deps.media)throw Error('MEDIA_UNAVAILABLE');return mediaReply(deps.media.cancel('work-native:'+e.state.token,{}))})
 const nativeHandoff=(event:unknown,input:unknown)=>result(async()=>{const {e,request}=scopedMediaEntry(event,input);assertFileAdmission(e);if(!deps.media)throw Error('MEDIA_UNAVAILABLE');const value=await mediaReply(deps.media.handoff('work-native:'+e.state.token,request));assertCurrent(e);return value})
 const nativeOpenFile=(event:unknown,input:unknown)=>result(async()=>{
  const r=workRecord(input,['token','id']),e=locateEntry(event,workId(r.token));assertFileAdmission(e);if(!deps.media)throw Error('MEDIA_UNAVAILABLE')
  const guard=(scope?:import('../../shared/contracts/work-media.contract').WorkMediaScope)=>{assertCurrent(e);if(scope&&(scope.libraryIdentity!==e.state.scope.libraryIdentity||scope.generation!==e.state.scope.generation||scope.setId!==e.state.set.id||!e.state.set.assetIds.includes(scope.assetId)||e.state.set.unavailableIds.includes(scope.assetId)))throw Error('MEMBERSHIP_NOT_GRANTED')}
  const value=await deps.media.files.openExisting(fileActor(e),workId(r.id),guard);try{assertCurrent(e)}catch{throw Object.assign(Error('系统打开已请求，但当前窗口已结束；副本保留，请先核对接收应用，勿盲目重开。'),{code:'WORK_HANDOFF_OPEN_SCOPE_CHANGED'})}return value
 })
 const nativeIcon=async(e:Entry,file:{file:string;assetId:string;kind:import('../../shared/contracts/work-media.contract').WorkHandoffKind})=>{
  if(file.kind!=='zip')return deps.host.readPreview(file.assetId)
  if(!e.port.readFileIcon)throw Object.assign(Error('当前窗口无法读取归档的系统文件图标，未开始拖出。'),{code:'NATIVE_FILE_ICON_UNAVAILABLE'})
  const icon=await e.port.readFileIcon(file.file)
  if(!icon.byteLength)throw Object.assign(Error('归档的系统文件图标不可用，未开始拖出。'),{code:'NATIVE_FILE_ICON_UNAVAILABLE'})
  return icon
 }
 const nativeDrag=(event:unknown,input:unknown)=>result(async()=>{
  const r=workRecord(input,['token','id']),e=locateEntry(event,workId(r.token)),id=workId(r.id)
  if(!deps.media||!e.port.startDrag)throw Error('NATIVE_DRAG_UNAVAILABLE')
  const actor='work-native:'+e.state.token,files=deps.media.files,selected=await files.nativeFile(actor,id)
  const member=()=>{assertCurrent(e);if(!e.state.set.assetIds.includes(selected.assetId)||e.state.set.unavailableIds.includes(selected.assetId))throw Error('MEMBERSHIP_NOT_GRANTED')}
  member();const icon=await nativeIcon(e,selected)
  // Icon lookup yields. A ZIP reread rechecks every archived source/member.
  const checked=await files.nativeFile(actor,id);member()
  if(checked.file!==selected.file||checked.assetId!==selected.assetId||checked.kind!==selected.kind)throw Error('STALE_HANDOFF')
  e.port.startDrag(selected.file,icon);return{message:'已开始原生文件交接；请在接收应用中核对结果。'}
 })
 const nativeDragFiles=(event:unknown,input:unknown)=>result(async()=>{
  const r=workRecord(input,['token','ids']),e=locateEntry(event,workId(r.token))
  if(!Array.isArray(r.ids)||r.ids.length<1||r.ids.length>64)throw Object.assign(Error('请选择1至64个已准备的交付副本。'),{code:'NATIVE_DRAG_INPUT_INVALID'})
  const ids=r.ids.map(workId)
  if(new Set(ids).size!==ids.length)throw Object.assign(Error('同一个交付副本不能重复拖出。'),{code:'NATIVE_DRAG_INPUT_INVALID'})
  if(!deps.media||!e.port.startDragFiles)throw Object.assign(Error('当前窗口不支持批量原生拖出。'),{code:'NATIVE_DRAG_UNAVAILABLE'})
  const files=deps.media.files,actor='work-native:'+e.state.token
  const assertMember=(assetId:string)=>{assertCurrent(e);if(!e.state.set.assetIds.includes(assetId)||e.state.set.unavailableIds.includes(assetId))throw Error('MEMBERSHIP_NOT_GRANTED')}
  const selected:Awaited<ReturnType<typeof files.nativeFile>>[]=[]
  for(const id of ids){const file=await files.nativeFile(actor,id);assertMember(file.assetId);selected.push(file)}
  const icon=await nativeIcon(e,selected[0])
  // Icon reads yield. Recheck every receipt and member after that read;
  // no OS handoff occurs until the entire batch has passed again.
  for(const [index,id]of ids.entries()){
   const checked=await files.nativeFile(actor,id);assertMember(checked.assetId)
   if(checked.assetId!==selected[index].assetId||checked.file!==selected[index].file||checked.kind!==selected[index].kind)throw Error('STALE_HANDOFF')
  }
  for(const file of selected)assertMember(file.assetId)
  e.port.startDragFiles(selected.map(file=>file.file),icon)
  return{message:'已开始批量原生文件交接；请在接收应用中核对结果。'}
 })
 const inspect=(event:unknown)=>result(()=>locateEntry(event).state)
 const act=(event:unknown,input:unknown)=>result(async()=>{const a=workRecord(input,['token','kind','expectedRevision','value','pinned','assetId','dirty','discard','edge','requestId']),e=locateEntry(event,workId(a.token));const retirement=Symbol('native-close');const run=async()=>{assertCurrent(e)
  if(a.kind==='paste-image'){
   workRecord(a,['token','kind','requestId','expectedRevision']);const nonce=workClipboardRequestId(a.requestId),revision=workRevision(a.expectedRevision)
   assertFileAdmission(e);assertFileIdle(e)
   if(entryUnsaved(e))throw Object.assign(Error('请先保存或明确放弃工作集和笔记草稿，再接入剪贴板图片。'),{code:'WORK_SET_UNSAVED'})
   if(e.state.set.revision!==revision)throw Object.assign(Error('工作集已变化，请重新读取后再接入图片。'),{code:'WORK_SET_CONFLICT'})
   if(e.state.set.assetIds.length>=200)throw Object.assign(Error('工作集已达到200份参考，未读取剪贴板。'),{code:'WORK_SET_CAPACITY'})
   if(!deps.readClipboardImage)throw Object.assign(Error('当前窗口未提供剪贴板图片接入。'),{code:'CLIPBOARD_IMAGE_UNAVAILABLE'})
   const preflight=await deps.host.readWorkSets(e.state.scope,deps.deviceId);assertCurrent(e);const target=preflight.sets.find(set=>set.id===e.state.set.id)
   if(!target||target.revision!==revision)throw Object.assign(Error('工作集已变化，请重新读取后再接入图片。'),{code:'WORK_SET_CONFLICT'})
   if(target.assetIds.length>=200)throw Object.assign(Error('工作集已达到200份参考，未读取剪贴板。'),{code:'WORK_SET_CAPACITY'})
   const scope={...e.state.scope},requestId=createHash('sha256').update(JSON.stringify([scope.libraryIdentity,e.state.set.id,nonce])).digest('hex')
   let imported:string|undefined;e.pasteActive=true
   try{
    const created=await deps.host.importClipboardImageFromReader({...scope,requestId,fileName:`Clipboard-${requestId.slice(0,16)}.png`},deps.readClipboardImage);imported=workId(created.assetId);e.clipboardAssets??=new Set();e.clipboardAssets.add(imported);assertCurrent(e)
    const catalog=await deps.host.readWorkSets(scope,deps.deviceId);assertCurrent(e);const saved=catalog.sets.find(set=>set.id===e.state.set.id)
    if(!saved)throw Error('SET_MISSING')
    if(saved.assetIds.includes(imported)){await refreshEntry(e);return e.state}
    if(saved.revision!==revision||entryUnsaved(e)||saved.assetIds.length>=200)throw Error('ATTACHMENT_CONFLICT')
    const updated=await deps.host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'save',id:saved.id,expectedRevision:revision,value:{name:saved.name,note:saved.note,colors:saved.colors,columns:saved.columns,assetIds:[...saved.assetIds,imported]}}},deps.deviceId)
    assertCurrent(e);const set=updated.sets.find(set=>set.id===saved.id);if(!set||!set.assetIds.includes(imported))throw Error('ATTACHMENT_UNCONFIRMED')
    const assets=(await deps.host.readAssetContext(set.assetIds)).assets;assertCurrent(e)
    e.sessionToken=updated.sessionToken;e.state={...e.state,set,assets:[...assets],...(e.state.draft?{draft:undefined,draftRevision:undefined}:{})};e.port.publish(e.state);deps.changed();return e.state
   }catch(error){if(imported)throw new ClipboardAttachmentError({kind:'clipboard-image',assetId:imported,libraryIdentity:scope.libraryIdentity,attachment:'unconfirmed'});throw error}
   finally{e.pasteActive=false}
  }
  else if(a.kind==='close'){workRecord(a,['token','kind','discard']);if(typeof a.discard!=='boolean')throw Error('INVALID_ACTION');assertFileIdle(e);assertFileAdmission(e);if(!a.discard&&entryUnsaved(e))throw Error('UNSAVED_WORK_SET');e.fileRetiring=retirement;clearTimeout(e.timer);await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout:{...e.port.bounds(),open:false}},deps.deviceId);assertCurrent(e);entries.delete(e.state.set.id);e.port.destroy();deps.changed()}
  else if(a.kind==='notes-dirty'){workRecord(a,['token','kind','dirty']);if(typeof a.dirty!=='boolean')throw Error('INVALID_ACTION');e.notesDirty=a.dirty;deps.changed()}
  else if(a.kind==='draft'){workRecord(a,['token','kind','expectedRevision','value']);const value=validateWorkValue(a.value);if(value.assetIds.some(id=>!e.state.set.assetIds.includes(id)))throw Error('MEMBERSHIP_NOT_GRANTED');e.state={...e.state,draft:value,draftRevision:workRevision(a.expectedRevision)};deps.changed()}
  else if(a.kind==='discard-draft'){workRecord(a,['token','kind']);e.state={...e.state,draft:undefined,draftRevision:undefined};e.port.publish(e.state);deps.changed()}
  else if(a.kind==='save'){workRecord(a,['token','kind','expectedRevision','value']);const value=validateWorkValue(a.value);if(value.assetIds.some(id=>!e.state.set.assetIds.includes(id)))throw Error('MEMBERSHIP_NOT_GRANTED');const saved=await deps.host.writeWorkSet({...e.state.scope,sessionToken:e.sessionToken,allowUpgrade:false,command:{kind:'save',id:e.state.set.id,expectedRevision:workRevision(a.expectedRevision),value}},deps.deviceId,{...e.port.bounds(),open:true});assertCurrent(e);const set=saved.sets.find(s=>s.id===e.state.set.id)!;e.state={...e.state,set,...(JSON.stringify(e.state.draft)===JSON.stringify(value)?{draft:undefined,draftRevision:undefined}:{})};e.port.publish(e.state);deps.changed()}
  else if(a.kind==='pin'){workRecord(a,['token','kind','pinned']);if(typeof a.pinned!=='boolean')throw Error('INVALID_ACTION');e.port.setPinned(a.pinned);e.state={...e.state,pinned:a.pinned};e.port.publish(e.state)}
  else if(a.kind==='dock'||a.kind==='undock'){
   workRecord(a,a.kind==='dock'?['token','kind','edge']:['token','kind'])
   if(a.kind==='dock'&&a.edge!=='left'&&a.edge!=='right')throw Error('INVALID_DOCK_EDGE')
   assertFileIdle(e);assertFileAdmission(e)
   if(!e.port.configureDock)throw Object.assign(Error('当前窗口不支持原生停靠。'),{code:'NATIVE_DOCK_UNAVAILABLE'})
   const actual=validateWorkLayout(e.port.bounds()),next=a.kind==='dock'?dockWorkBounds(actual,a.edge as 'left'|'right',deps.areas()):expandedWorkBounds(actual,deps.areas())
   e.port.configureDock(next)
   e.state={...e.state,geometry:validateWorkLayout(e.port.bounds()),pinned:e.port.bounds().pinned};e.port.publish(e.state)
  }
  else if(a.kind==='hide'){workRecord(a,['token','kind']);e.port.hide()}
  else if(a.kind==='recover'){workRecord(a,['token','kind']);e.port.setBounds(visibleWorkBounds(e.port.bounds(),deps.areas()))}
  else if(a.kind==='add-from-library'){workRecord(a,['token','kind']);deps.locate(e.state.scope,e.state.set.id)}
  else if(a.kind==='locate'){workRecord(a,['token','kind','assetId']);const id=workId(a.assetId);if(!e.state.set.assetIds.includes(id)&&!e.clipboardAssets?.has(id))throw Error('MEMBERSHIP_NOT_GRANTED');deps.locate(e.state.scope,e.state.set.id,id)}
  else throw Error('INVALID_ACTION')
  return e.state
 };const task=e.queue.then(run);e.queue=task.catch(()=>{});try{await task;if(['pin','hide','recover','dock','undock'].includes(String(a.kind)))await persist(e);return e.state}finally{if(a.kind==='close'&&entries.get(e.state.set.id)===e&&e.fileRetiring===retirement)e.fileRetiring=undefined}})
 const notebookRead=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token','assetId']),e=locateEntry(event,workId(r.token)),assetId=workId(r.assetId);if(!e.state.set.assetIds.includes(assetId))throw Error('MEMBERSHIP_NOT_GRANTED');const value=await deps.host.readNotebook({...e.state.scope,assetId});assertCurrent(e);return value})
 const notebookSave=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token','request']),e=locateEntry(event,workId(r.token)),q=workRecord(r.request,['assetId','libraryIdentity','generation','sessionToken','sourceRef','expectedRevision','allowUpgrade','book']);const assetId=workId(q.assetId);if(!e.state.set.assetIds.includes(assetId)||q.libraryIdentity!==e.state.scope.libraryIdentity||q.generation!==e.state.scope.generation||q.allowUpgrade!==false||!Number.isSafeInteger(q.expectedRevision)||Number(q.expectedRevision)<0)throw Error('MEMBERSHIP_NOT_GRANTED');const request:NotebookSaveRequest={...e.state.scope,assetId,sessionToken:workId(q.sessionToken),sourceRef:workId(q.sourceRef),expectedRevision:Number(q.expectedRevision),allowUpgrade:false,book:validateNotebook(q.book)};const saved=await deps.host.saveNotebook(request);assertCurrent(e);return saved})
 const drain=()=>{
  if(drainPromise)return drainPromise
  draining=true
  const task=(async()=>{
   const held=[...entries.values()];await Promise.all(held.map(e=>e.queue));const files=fileLifecycle()
   if(files){await Promise.all(held.map(e=>files.cancel(fileActor(e))));await Promise.all(held.map(e=>files.whenIdle(fileActor(e))));for(const e of held)assertFileIdle(e)}
   const a=deps.host.inspect();if(a.state==='ready'&&a.identity&&a.generation){try{retiredSession=(await deps.host.readWorkSets({libraryIdentity:a.identity,generation:a.generation},deps.deviceId)).sessionToken}catch{}}
   await Promise.allSettled(held.filter(e=>entries.get(e.state.set.id)===e).map(e=>persist(e)));invalidate()
  })()
  drainPromise=task.finally(()=>{draining=false;drainPromise=null})
  return drainPromise
 }

 const hasUnsaved=()=>[...entries.values()].some(entryUnsaved)
 const isTrusted=(event:unknown)=>{try{locateEntry(event);return true}catch{return false}}
 const permitsDraft=(event:unknown,scope:WorkspaceDraftScope)=>{try{const e=locateEntry(event);return scope.libraryIdentity===e.state.scope.libraryIdentity&&scope.generation===e.state.scope.generation&&(scope.kind==='work-set'?scope.entityId===e.state.set.id:(scope.kind==='work-media'&&e.state.set.assetIds.some(id=>scope.entityId===e.state.set.id+'~'+id&&!e.state.set.unavailableIds.includes(id))||scope.kind==='notebook'&&e.state.set.assetIds.includes(scope.entityId))&&!e.state.set.unavailableIds.includes(scope.entityId))}catch{return false}}
 return{nativeMediaRead,nativeMediaWrite,nativeMediaCancel,nativeHandoff,nativeOpenFile,nativeDrag,nativeDragFiles,isTrusted,permitsDraft,hasUnsaved,read,write,windows,control,open,restore,recover,inspect,act,notebookRead,notebookSave,invalidate,refresh,drain,hideMain:()=>result(()=>{if(!entries.size)throw Error('NO_WORK_WINDOWS');entries.values().next().value?.port.show();deps.hideMain();return{count:entries.size}}),count:()=>entries.size}
}
