import {randomUUID,createHash} from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {constants} from 'node:fs'
import {memberImageMetadata} from './member-image-metadata'
import {createShelfAutosave} from './shelf-autosave'
import type {ShelfAction,ShelfReply} from './native-shelf-actions'
import {validateWorkMediaScope} from '../../shared/contracts/work-media.contract'
import type { WorkspaceDraftScope } from '../../shared/contracts/workspace-draft.contract'
import type {ActiveLibraryHost} from '../../shared/contracts/active-library.contract'
import {validateWorkScope,validateWorkLayout,validateWorkWrite,validateWorkValue,validateWorkWindowControl,workRecord,workId,workRevision,workClipboardRequestId,type WorkScope,type WorkSetWrite,type WorkSetCatalog,type WorkWindowSnapshot,type WorkWindowAction,type WorkResult,type WorkWindowLayout,type WorkWindowControlState,type WorkWindowControlResult,type WorkClipboardEffect} from '../../shared/contracts/work-set.contract'
import {validateNotebook,type NotebookSaveRequest} from '../../shared/contracts/asset-notebook.contract'
import {visibleWorkBounds,dockWorkBounds,expandedWorkBounds,type WorkArea} from './work-window-bounds'
export interface WorkWindowPort{setWindowMetadata?(value:Pick<WorkWindowLayout,'indicatorColor'|'alwaysShowIndicator'|'currentSpaceOnly'>):void;traceLayoutSave?(layout:WorkWindowLayout):(status:'committed'|'failed')=>void;freeze?(value:boolean):Promise<void>;bindShelfActions?(listener:(action:ShelfAction)=>Promise<ShelfReply>):void;openFocus?(assetId:string):void;closeFocus?():void;feedback?(message:string):void;bindNativeIntents?(listener:(intent:import('./native-shelf-work-window').NativeShelfIntent)=>void):void;showDetail?():void;readFileIcon?(verifiedFile:string):Promise<Uint8Array>;edgeDock?:boolean;configureDock?(layout:WorkWindowLayout,options?:{gestureId?:number;deltaX?:number}):void|Promise<void>;startDragFiles?(files:string[],icon:Uint8Array):void;startDrag?(file:string,icon:Uint8Array):void;publish(value:WorkWindowSnapshot|null):void;show():void;hide():void;destroy():void|Promise<void>;setPinned(value:boolean):void;bounds():WorkWindowLayout;setBounds(value:WorkWindowLayout):void;visible():boolean;isTrusted(event:unknown):boolean}
class ClipboardAttachmentError extends Error{readonly code='CLIPBOARD_ATTACHMENT_INCOMPLETE';constructor(readonly effect:WorkClipboardEffect){super('图片已保存到素材库，但未确认加入工作集；未覆盖现有内容。请在资料库查看该图片并重新加入。')}}
const savedValue=(s:{name:string;columns:number;assetIds:string[]})=>validateWorkValue({name:s.name,columns:s.columns,assetIds:s.assetIds})
interface Entry{nativeCancelActive?:boolean;nativeFrozen?:boolean;nativeCancelEpoch?:number;dropAbort?:AbortController;nativeTransient?:boolean;shelf?:ReturnType<typeof createShelfAutosave>;nativeTasks?:Set<Promise<unknown>>;nativeReceipts?:Map<string,string>;nativeUnknown?:Set<string>;pasteActive?:boolean;clipboardAssets?:Set<string>;fileRetiring?:symbol;notesDirty?:boolean;port:WorkWindowPort;state:WorkWindowSnapshot;sessionToken:string;queue:Promise<unknown>;timer?:ReturnType<typeof setTimeout>}
/** Windows are owned separately; private paths and broad application APIs never enter their preload. */
export function createWorkWindowController(deps:{retireWorkSetDrafts?:(libraryIdentity:string)=>Promise<void>;configureAi?:()=>void;shelfDrafts?:ReturnType<typeof import('./shelf-draft-store').createShelfDraftStore>;memberTools?:ReturnType<typeof import('./work-member-tools').createWorkMemberTools>;readClipboardImage?:()=>Promise<Uint8Array>;media?:ReturnType<typeof import('./work-media-controller').createWorkMediaController>;host:ActiveLibraryHost;deviceId:string;areas:()=>WorkArea[];theme:()=> 'light'|'dark';createWindow:(input:{layout:WorkWindowLayout;changed:()=>void;closed:()=>void;readMetadata?:(id:string)=>Promise<{width:number|null;height:number|null}>;readPreview:(url:string)=>Promise<Uint8Array>;readMedia?:(url:string)=>Promise<{bytes:Uint8Array;type:string}>})=>WorkWindowPort;beforeWorkspaceClose:()=>Promise<()=>void>;changed:()=>void;locate:(scope:WorkScope,setId:string,assetId?:string)=>void;hideMain:()=>void}){
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
 const assertFileIdle=(e:Entry)=>{if(e.pasteActive||e.nativeTasks?.size||fileLifecycle()?.hasActive(fileActor(e)))throw Object.assign(Error('正在准备交付，请完成或取消后再关闭。'),{code:'WORK_OPERATION_ACTIVE'})}
 const assertFileAdmission=(e:Entry)=>{if(e.nativeCancelActive)throw Object.assign(Error('取消仍在等待当前任务退出，尚未接入新操作。'),{code:'WORK_OPERATION_CANCELLING'});if(draining||e.fileRetiring)throw Object.assign(Error('窗口正在退出，未开始新的交付操作。'),{code:'WORK_OPERATION_RETIRING'})}
 const entryUnsaved=(e:Entry)=>Boolean(e.nativeTransient||e.notesDirty||e.state.draft&&JSON.stringify(e.state.draft)!==JSON.stringify(validateWorkValue({name:e.state.set.name,assetIds:e.state.set.assetIds,columns:e.state.set.columns})))
 const controlState=(e:Entry,open=true):WorkWindowControlState=>({id:e.state.set.id,open,pinned:e.port.bounds().pinned,visible:open&&e.port.visible(),hasUnsaved:entryUnsaved(e),...(e.state.layoutError?{layoutError:e.state.layoutError}:{})})
 const invalidate=async()=>{epoch++;const held=[...entries.values()];for(const e of held){e.shelf?.dispose();deps.memberTools?.retire(fileActor(e));clearTimeout(e.timer);e.port.publish(null)};await Promise.all(held.map(async e=>{await deps.media?.revoke(fileActor(e));await e.port.destroy();entries.delete(e.state.set.id)}));deps.changed()}
 const locateEntry=(event:unknown,token?:string)=>{for(const e of entries.values())if(e.port.isTrusted(event)&&(!token||token===e.state.token)){assertCurrent(e);return e}throw Error('UNTRUSTED_WORK_WINDOW')}
 const persist=(e:Entry)=>{const save=async()=>{assertCurrent(e);const layout=validateWorkLayout({...e.port.bounds(),open:true});e.state={...e.state,geometry:layout,pinned:layout.pinned};const receipt=e.port.traceLayoutSave?.(layout);try{await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout},deps.deviceId);assertCurrent(e);receipt?.('committed');e.state={...e.state,geometry:layout,pinned:layout.pinned,layoutError:undefined};e.port.publish(e.state)}catch(error){receipt?.('failed');if(entries.get(e.state.set.id)===e){e.state={...e.state,layoutError:'窗口位置未保存，请重试。'};e.port.publish(e.state)}throw error}finally{deps.changed()}};const task=e.queue.then(save);e.queue=task.catch(()=>{});return task}
 const applyBounds=async(e:Entry,layout:WorkWindowLayout)=>{if(e.port.edgeDock&&e.port.configureDock)await e.port.configureDock(layout);else e.port.setBounds(layout);assertCurrent(e)}
 const geometryChanged=(e:Entry)=>{clearTimeout(e.timer);e.timer=setTimeout(()=>{void(async()=>{assertCurrent(e);const actual=e.port.bounds();if(actual.dock){const target=visibleWorkBounds(actual,deps.areas());if(actual.x!==target.x||actual.y!==target.y||actual.width!==target.width||actual.height!==target.height)await applyBounds(e,target)}await persist(e)})().catch(()=>{})},250)}
 const refreshEntry=async(e:Entry)=>{const before=epoch;const catalog=await deps.host.readWorkSets(e.state.scope,deps.deviceId);if(before!==epoch)return;assertCurrent(e);const set=catalog.sets.find(s=>s.id===e.state.set.id);if(!set){clearTimeout(e.timer);e.shelf?.dispose();deps.memberTools?.retire(fileActor(e));await e.port.destroy();entries.delete(e.state.set.id);return}const assets=(await deps.host.readAssetContext(set.assetIds)).assets;if(before!==epoch)return;assertCurrent(e);if(e.state.set.assetIds.some(id=>!set.assetIds.includes(id)))deps.memberTools?.retire(fileActor(e));e.state={...e.state,set,assets:[...assets]};e.sessionToken=catalog.sessionToken;e.port.publish(e.state)}
 const refresh=async()=>{for(const e of [...entries.values()]){try{await refreshEntry(e)}catch{if(entries.get(e.state.set.id)===e){clearTimeout(e.timer);await e.port.destroy();entries.delete(e.state.set.id)}}}}
 const retireDrafts=async(catalog:WorkSetCatalog,libraryIdentity:string)=>{if(!catalog.requiresUpgrade){deps.shelfDrafts?.retireWorkSetFields(libraryIdentity);await deps.retireWorkSetDrafts?.(libraryIdentity)}}
 const read=(input:unknown)=>result(async()=>{const scope=validateWorkScope(input),catalog=await deps.host.readWorkSets(scope,deps.deviceId);await retireDrafts(catalog,scope.libraryIdentity);if(catalog.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');return catalog})
 const write=(input:unknown)=>result(async()=>{const r=validateWorkWrite(input);if(r.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');const value=await deps.host.writeWorkSet(r,deps.deviceId);await retireDrafts(value,r.libraryIdentity);deps.changed();await refresh();return value})
 const windows=(input:unknown)=>result(async()=>{const scope=validateWorkScope(input);if(!matches(scope))throw Error('STALE_LIBRARY');await Promise.all([...entries.values()].map(e=>e.queue));if(!matches(scope))throw Error('STALE_LIBRARY');return[...entries.values()].map(e=>{assertCurrent(e);return controlState(e)})})
 const control=(input:unknown)=>result(async():Promise<WorkWindowControlResult>=>{const a=validateWorkWindowControl(input);if(!matches(a))throw Error('STALE_LIBRARY');const e=entries.get(a.id);if(!e)throw Object.assign(Error('此工作窗口已关闭，请重新打开。'),{code:'WORK_WINDOW_MISSING'});const retirement=Symbol('workspace-close');if(a.kind==='close'){assertFileIdle(e);assertFileAdmission(e);e.fileRetiring=retirement}let release:(()=>void)|undefined;try{if(a.kind==='close'){await e.port.freeze?.(true);e.nativeFrozen=true;const flushed=await e.shelf?.flush();if(flushed&&!flushed.ok)throw Error(flushed.message)};release=a.kind==='close'?await deps.beforeWorkspaceClose():undefined;const run=async():Promise<WorkWindowControlResult>=>{assertCurrent(e)
  if(a.kind==='close'){
   assertFileIdle(e);if(entryUnsaved(e)){e.port.show();deps.changed();return{status:'review-required',window:controlState(e),message:'此原生窗口有未保存的工作集或笔记，已保留并显示。请在该窗口核对并保存或明确放弃，再关闭。'}}
   clearTimeout(e.timer);const state=controlState(e,false);await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout:{...e.port.bounds(),open:false}},deps.deviceId);assertCurrent(e);e.shelf?.dispose();deps.memberTools?.retire(fileActor(e));await e.port.destroy();entries.delete(e.state.set.id);deps.changed();return{status:'applied',window:state}
  }
  if(a.kind==='pin'){e.port.setPinned(a.pinned);e.state={...e.state,pinned:a.pinned};e.port.publish(e.state)}
  else if(a.kind==='hide')e.port.hide()
  else{await applyBounds(e,visibleWorkBounds(e.port.bounds(),deps.areas()));e.port.show()}
  return{status:'applied',window:controlState(e)}
 };const task=e.queue.then(run);e.queue=task.catch(()=>{});const applied=await task;if(a.kind!=='close'){await persist(e);return{...applied,window:controlState(e)}}return applied}finally{release?.();if(entries.get(e.state.set.id)===e){e.nativeFrozen=false;await e.port.freeze?.(false).catch(()=>{});if(e.fileRetiring===retirement)e.fileRetiring=undefined}}})
 const open=async(input:unknown):Promise<WorkResult<WorkWindowSnapshot>>=>result(async()=>{if(draining)throw Error('LIBRARY_TRANSITION');const r=workRecord(input,['libraryIdentity','generation','id','theme']),scope=validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),id=workId(r.id);if(r.theme!==undefined&&!['light','dark'].includes(String(r.theme)))throw Error('INVALID_THEME');if(!matches(scope))throw Error('STALE_LIBRARY');const existing=entries.get(id);if(existing){assertCurrent(existing);if(r.theme==='light'||r.theme==='dark'){existing.state={...existing.state,theme:r.theme};existing.port.publish(existing.state)}existing.port.show();return existing.state}if(entries.size>=8)throw Error('TOO_MANY_WINDOWS');const before=epoch,catalog=await deps.host.readWorkSets(scope,deps.deviceId),set=catalog.sets.find(s=>s.id===id);if(catalog.sessionToken===retiredSession)throw Error('LIBRARY_TRANSITION');if(!set)throw Error('SET_MISSING');const assets=(await deps.host.readAssetContext(set.assetIds)).assets;if(before!==epoch||!matches(scope)||draining)throw Error('STALE_LIBRARY');if(entries.has(id)){const existing=entries.get(id)!;existing.port.show();return existing.state}
  await retireDrafts(catalog,scope.libraryIdentity)
  const layout={...visibleWorkBounds(set.layout,deps.areas(),entries.size),open:true}
  if(entries.has(id)){const existing=entries.get(id)!;existing.port.show();return existing.state}if(entries.size>=8)throw Error('TOO_MANY_WINDOWS');
  const state:WorkWindowSnapshot={token:randomUUID(),scope,set,assets:[...assets],pinned:layout.pinned,geometry:layout,theme:r.theme==='dark'?'dark':r.theme==='light'?'light':deps.theme()};let entry:Entry
  const port=deps.createWindow({layout,...(set.layout&&!set.layout.presentation?{legacyLayout:set.layout}:{}),readMetadata:async(assetId)=>{assertCurrent(entry);const asset=entry.state.assets.find(a=>a.id===assetId);if(!asset||!entry.state.set.assetIds.includes(assetId)||entry.state.set.unavailableIds.includes(assetId))throw Error('MEMBERSHIP_NOT_GRANTED');const result=await memberImageMetadata(deps.host,asset);assertCurrent(entry);return result},readMedia:async(url)=>{assertCurrent(entry);const u=new URL(url);if(u.protocol!=="dam-workmedia:"||u.host!=="media"||u.search||u.hash||u.username||u.password||u.port)throw Error("INVALID_MEDIA");const p=u.pathname.split("/").filter(Boolean).map(decodeURIComponent);if((p.length!==4&&p.length!==5)||p[0]!==scope.libraryIdentity||p[1]!==scope.generation||p[2]!==id||!entry.state.set.assetIds.includes(p[3])||entry.state.set.unavailableIds.includes(p[3]))throw Error("MEMBERSHIP_NOT_GRANTED");const file=await deps.host.readWorkMediaFile({...scope,setId:id,assetId:p[3],...(p[4]?{frameId:p[4]}:{})});assertCurrent(entry);if(!entry.state.set.assetIds.includes(p[3])||entry.state.set.unavailableIds.includes(p[3]))throw Error("MEMBERSHIP_NOT_GRANTED");return file},readPreview:async(url)=>{assertCurrent(entry);const u=new URL(url);if(u.host!=='preview'||u.search||u.username||u.password||u.port)throw Error('INVALID_PREVIEW');const parts=u.pathname.split('/').filter(Boolean).map(decodeURIComponent);if(parts.length!==3||parts[0]!==scope.libraryIdentity||parts[1]!==scope.generation||!entry.state.set.assetIds.includes(parts[2])||entry.state.set.unavailableIds.includes(parts[2]))throw Error('MEMBERSHIP_NOT_GRANTED');const bytes=await deps.host.readPreview(parts[2]);assertCurrent(entry);if(!entry.state.set.assetIds.includes(parts[2])||entry.state.set.unavailableIds.includes(parts[2]))throw Error('MEMBERSHIP_NOT_GRANTED');return bytes},changed:()=>{if(entry&&entries.get(id)===entry)geometryChanged(entry)},closed:()=>{if(entry&&entries.get(id)===entry){clearTimeout(entry.timer);entry.shelf?.dispose();deps.memberTools?.retire(fileActor(entry));entries.delete(id);deps.changed()}}});if(layout.dock||port.edgeDock){if(!port.configureDock){await port.destroy();throw Object.assign(Error('当前窗口不支持恢复停靠布局。'),{code:'NATIVE_DOCK_UNAVAILABLE'})}try{await port.configureDock(layout)}catch(error){await port.destroy();throw error}}
  if(before!==epoch||!matches(scope)||draining){await port.destroy();throw Error('STALE_LIBRARY')}
  const actual=validateWorkLayout(port.bounds());entry={port,state:{...state,geometry:actual,pinned:actual.pinned},sessionToken:catalog.sessionToken,queue:Promise.resolve()};entries.set(id,entry)
  if(port.bindShelfActions){
   entry.shelf=createShelfAutosave({current:()=>entry.state,hold:(value,revision)=>{assertCurrent(entry);entry.state={...entry.state,draft:value,draftRevision:revision};deps.shelfDrafts?.put({libraryIdentity:entry.state.scope.libraryIdentity,id,revision,value});deps.changed()},feedback:message=>port.feedback?.(message),save:async(value,revision,serial)=>{
    const latest=await deps.host.readWorkSets(entry.state.scope,deps.deviceId);assertCurrent(entry);const current=latest.sets.find(s=>s.id===id);if(!current)throw Error('工作集已不存在，草稿保留。');if(current.revision!==revision){if(JSON.stringify(savedValue(current))===JSON.stringify(value)){entry.state={...entry.state,set:current,draft:undefined,draftRevision:undefined,nativeSaveSerial:serial};deps.shelfDrafts?.clear(scope.libraryIdentity,id,value);port.publish(entry.state);return entry.state}throw Error('工作集已在其他位置更新，当前草稿保留，请核对版本。')}
    const reply=await actEntry(entry,{token:entry.state.token,kind:'save',expectedRevision:revision,value})
    if(!reply.success){const current=await deps.host.readWorkSets(entry.state.scope,deps.deviceId);assertCurrent(entry);const saved=current.sets.find(s=>s.id===id)
     if(!saved||saved.revision<=revision||JSON.stringify(validateWorkValue(savedValue(saved)))!==JSON.stringify(value))throw Error(reply.error+' 草稿保留，请核对后重试。')
     entry.state={...entry.state,set:saved,draft:undefined,draftRevision:undefined}
    }
    deps.shelfDrafts?.clear(entry.state.scope.libraryIdentity,id,value);entry.state={...entry.state,nativeSaveSerial:serial};port.publish(entry.state);return entry.state
   }})
   const recovered=deps.shelfDrafts?.read(scope.libraryIdentity,id);if(recovered){if(JSON.stringify(recovered.value)===JSON.stringify(savedValue(entry.state.set)))deps.shelfDrafts?.clear(scope.libraryIdentity,id,recovered.value);else entry.shelf.recover(recovered.value,recovered.revision)}
   port.bindShelfActions(action=>nativeShelfAction(entry,action))
  }
  port.bindNativeIntents?.(intent=>{
   if(entries.get(id)!==entry||!matches(entry.state.scope))return
   if(intent.kind==='close'){
    void (async()=>{const flushed=await entry.shelf?.flush();if(flushed&&!flushed.ok)return {success:false as const,error:flushed.message??'保存未确认'};return control({...entry.state.scope,id,kind:'close'})})().then(reply=>{
     if(!reply.success){port.feedback?.(reply.error);port.showDetail?.()}else if(reply.value.status==='review-required'){port.feedback?.(reply.value.message??'草稿尚未保存');port.showDetail?.()}
    })
   }else{
    void actEntry(entry,{token:entry.state.token,...intent},true).then(reply=>{if(!reply.success&&reply.code!=='WORK_MOTION_CANCELED'){port.feedback?.(reply.error);port.showDetail?.()}})
   }
  })
  port.publish(entry.state);port.show();deps.changed();await persist(entry);return entry.state
 })
 const restore=(input:unknown)=>result(async()=>{const r=workRecord(input,['libraryIdentity','generation','theme']);if(r.theme!==undefined&&!['light','dark'].includes(String(r.theme)))throw Error('INVALID_THEME');const scope=validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),catalog=await deps.host.readWorkSets(scope,deps.deviceId);let count=0;for(const set of catalog.sets.filter(s=>s.layout?.open)){const opened=await open({...scope,id:set.id,theme:r.theme});if(!opened.success)throw Error('WINDOW_RESTORE_FAILED');count++}return{count}})
 const recover=()=>result(async()=>{for(const e of entries.values()){await applyBounds(e,visibleWorkBounds(e.port.bounds(),deps.areas()));e.port.show();await persist(e)}return{count:entries.size}})
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
  if(!['zip','pdf','ocr-text'].includes(file.kind))return deps.host.readPreview(file.assetId)
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
 const nativeShelfAction=async(e:Entry,action:ShelfAction):Promise<ShelfReply>=>{
  try{
   assertCurrent(e);if(!((action.kind==='edit'||action.kind==='transient')&&!e.nativeFrozen))assertFileAdmission(e)
   if(action.kind==='transient'){e.nativeTransient=action.pending;deps.changed();return{ok:true}}
   if(e.nativeTransient&&action.kind!=='cancel')return{ok:false,message:'请先完成输入法文字输入，窗口与内容保持。'}
   if(action.kind==='edit')return await e.shelf!.edit(action)
   if(action.kind==='review-save'||action.kind==='resolve-save'){
    const catalog=await deps.host.readWorkSets(e.state.scope,deps.deviceId);assertCurrent(e);const saved=catalog.sets.find(s=>s.id===e.state.set.id);if(!saved)throw Error('工作集已不存在，草稿保留。')
    if(action.kind==='review-save')return{ok:true,review:{revision:saved.revision,name:saved.name,count:saved.assetIds.length}}
    if(saved.revision!==action.revision)throw Error('核对期间工作集又有更新，草稿保留，请重新核对。')
    if(e.state.draft?.assetIds.some(id=>!saved.assetIds.includes(id)))throw Error('部分草稿成员已被移出工作集，未覆盖当前引用；请在主界面核对成员。')
    e.state={...e.state,set:saved};return await e.shelf!.rebase(saved.revision)
   }
   if(action.kind==='retry')return await e.shelf!.retry()
   if(action.kind==='cancel'){e.nativeCancelActive=true;try{e.nativeCancelEpoch=(e.nativeCancelEpoch??0)+1;e.dropAbort?.abort();const outcomes=await Promise.allSettled([deps.media?.revoke(fileActor(e)),...e.nativeTasks??[]]);if(outcomes[0].status==='rejected')throw outcomes[0].reason;return{ok:true,message:'已等待当前项返回并停止后续项，已完成副本与入库素材保留。'}}finally{e.nativeCancelActive=false}}
   const flushed=await e.shelf?.flush();if(flushed&&!flushed.ok)return flushed
   const member=(id:string)=>{
    assertCurrent(e)
    if(!e.state.set.assetIds.includes(id))throw Error('该成员已移出当前工作集，未执行操作。')
    if(e.state.set.unavailableIds.includes(id)||!e.state.assets.some(asset=>asset.id===id))throw Error('工作集引用故障：成员无法访问，未跳过或删除引用，请检查资料库。')
   }
   if(action.kind==='focus'){member(action.assetId);e.state={...e.state,focusAssetId:action.assetId,focusRequest:(e.state.focusRequest??0)+1};e.port.publish(e.state);e.port.openFocus?.(action.assetId);return{ok:true}}
   if(action.kind==='paste'){const reply=await actEntry(e,{token:e.state.token,kind:'paste-image',requestId:randomUUID(),expectedRevision:e.state.set.revision});return reply.success?{ok:true}:{ok:false,message:reply.error}}
   const admittedEpoch=e.nativeCancelEpoch??0
   const prepare=async(id:string,kind:import('../../shared/contracts/work-media.contract').WorkHandoffKind,extra:Record<string,unknown>={})=>{
    member(id);if((e.nativeCancelEpoch??0)!==admittedEpoch)throw Error('操作已取消。');if(!deps.media)throw Error('交付模块尚未就绪。')
    const asset=e.state.assets.find(a=>a.id===id)!,current=(await deps.host.readAssetContext([id])).assets[0];member(id);if(!current||current.revision!==asset.revision||current.thumbnailRef!==asset.thumbnailRef)throw Error('素材已变化，请重新读取工作集后操作。');const key=JSON.stringify([id,asset.revision,asset.thumbnailRef,kind,extra])
    e.nativeReceipts??=new Map();e.nativeUnknown??=new Set()
    const cached=e.nativeReceipts.get(key);if(cached){try{await deps.media.files.nativeFile(fileActor(e),cached);member(id);return cached}catch{e.nativeReceipts.delete(key)}}
    if(e.nativeUnknown.has(key))throw Error('上一份副本结果未确认，请核对交付记录，未重复创建。')
    const request={...e.state.scope,setId:e.state.set.id,assetId:id,kind,action:'prepare',...extra}
    let reply;try{reply=await deps.media.handoff(fileActor(e),request)}catch{e.nativeUnknown.add(key);throw Error('副本结果未确认，请核对保留记录。')}
    if(!reply.success)throw Error(reply.error);member(id);e.nativeReceipts.set(key,reply.value.id);return reply.value.id
   }
   const run=async():Promise<ShelfReply>=>{
    assertCurrent(e);if((e.nativeCancelEpoch??0)!==admittedEpoch)throw Error('操作在开始前已取消。')
    if(action.kind==='saved-files'){
     if(!deps.media)throw Error('交付模块未就绪。');const files:NonNullable<ShelfReply['files']>=[];let skipped=0
     for(const assetId of action.assetIds){member(assetId);const scope={...e.state.scope,setId:e.state.set.id,assetId},receipts=await deps.media.files.list(scope)
      for(const receipt of receipts){if(files.length>=64)break;try{await deps.media.files.resumeNative(fileActor(e),scope,receipt.id,previousActor=>{member(assetId);if(previousActor!==fileActor(e)&&[...entries.values()].some(active=>fileActor(active)===previousActor))throw Error('其他窗口仍持有此副本。')});const checked=await deps.media.files.nativeFile(fileActor(e),receipt.id);member(assetId);files.push({id:receipt.id,assetId,fileName:receipt.fileName,file:checked.file})}catch{assertCurrent(e);skipped++}}
     }
     return{ok:true,files,message:files.length?`已恢复 ${files.length} 份原生副本；${skipped} 份已回收、来源变化或仍被其他窗口持有，未恢复。`:'没有可恢复的原生交付副本；已回收、来源变化或其他窗口持有的记录不会交付。'}
    }
    if(action.kind==='receipt-files'){
     if(!deps.media)throw Error('交付模块未就绪。');const files:NonNullable<ShelfReply['files']>=[]
     for(const id of action.ids){const checked=await deps.media.files.nativeFile(fileActor(e),id);member(checked.assetId);const data=await deps.media.files.readFile(id);member(checked.assetId);files.push({id,assetId:checked.assetId,fileName:data.fileName,file:checked.file})}
     return{ok:true,files}
    }
    if(action.kind==='ocr'){
     const check=()=>{if(action.operation==='cancel')assertCurrent(e);else member(action.assetId)};check();if(!deps.memberTools)throw Error('OCR 服务未就绪。')
     const value=await deps.memberTools.call({owner:fileActor(e),scope:e.state.scope,assetId:action.assetId,check},'ocr-'+action.operation,action.receipt?{receipt:action.receipt}:{})
     return{ok:true,value}
    }
    if(action.kind==='reference-set'){
     if(e.state.set.revision!==action.expectedRevision)throw Error('工作集已变化，请重新打开菜单。');action.assetIds.forEach(member)
     if(action.operation==='clear'){
      await deps.host.writeWorkSet({...e.state.scope,sessionToken:e.sessionToken,allowUpgrade:false,command:{kind:'save',id:e.state.set.id,expectedRevision:action.expectedRevision,value:{...savedValue(e.state.set),assetIds:[]}}},deps.deviceId);await refreshEntry(e);deps.changed();return{ok:true,message:'已清空引用，素材原件保留。'}
     }
     if(entries.size>=8)throw Error('最多同时打开8个工作窗口，请先关闭其他窗口。')
     const prior=new Set((await deps.host.readWorkSets(e.state.scope,deps.deviceId)).sets.map(s=>s.id)),value=validateWorkValue({name:action.name,columns:2,assetIds:action.operation==='new'?[]:action.assetIds})
     const intentKey='reference-set:'+JSON.stringify([action.operation,action.expectedRevision,value]);e.nativeUnknown??=new Set()
     if(e.nativeUnknown.has(intentKey))throw Error('上一份新工作集提交未确认，请先在工作模式核对已保存集合，未重复创建。')
     let catalog:WorkSetCatalog
     try{catalog=await deps.host.writeWorkSet({...e.state.scope,sessionToken:e.sessionToken,allowUpgrade:false,command:action.operation==='new'?{kind:'create',value}:{kind:'fork',id:e.state.set.id,expectedRevision:action.expectedRevision,value,move:action.operation==='move'}},deps.deviceId)}catch(error){if(error instanceof Error&&/ACK_UNCERTAIN|SETTLEMENT_FAILED|SETTINGS_RESTORE_FAILED/.test(error.message)){e.nativeUnknown.add(intentKey);throw Error('新工作集提交结果未确认，库与窗口保持；请在工作模式核对保留记录，不会自动或用相同意图重复创建。')}throw error}
     assertCurrent(e);const target=catalog.sets.find(s=>!prior.has(s.id));await refreshEntry(e);deps.changed();if(!target)throw Error('新工作集结果未确认，请核对工作模式，勿重复创建。')
     const shown=await open({...e.state.scope,id:target.id});if(!shown.success)throw Error('新工作集已保存，但窗口未打开，请在工作模式打开该集合。')
     return{ok:true,message:'新工作集已保存并打开。'}
    }
    if(action.kind==='file-action'){
     if(!deps.media)throw Error('交付模块未就绪。');const checked=await deps.media.files.nativeFile(fileActor(e),action.id);member(checked.assetId)
     const value=await deps.media.files.fileAction(fileActor(e),action.id,action.operation,action.destination,()=>{member(checked.assetId);if((e.nativeCancelEpoch??0)!==admittedEpoch)throw Error('操作已取消。')});assertCurrent(e)
     e.nativeReceipts?.clear();return{ok:true,message:value.message}
    }
    if(action.kind==='system-files'){
     const revision=e.state.set.revision;if(revision!==action.expectedRevision)throw Error('工作集已变化，请重新打开菜单。')
     action.assetIds.forEach(member);const files:NonNullable<ShelfReply['files']>=[]
     for(const id of action.assetIds){const receipt=await prepare(id,'original'),checked=await deps.media!.files.nativeFile(fileActor(e),receipt),data=await deps.media!.files.readFile(receipt);member(id);if(e.state.set.revision!==revision)throw Error('准备期间工作集已变化，副本保留，未发出系统请求。');files.push({id:receipt,assetId:id,fileName:data.fileName,file:checked.file})}
     return{ok:true,files}
    }
    if(action.kind==='window-settings'){
     if(!e.port.setWindowMetadata)throw Error('原生窗口设置未就绪。')
     const before=e.port.bounds(),layout=validateWorkLayout({...before,pinned:action.pinned,indicatorColor:action.indicatorColor,alwaysShowIndicator:action.alwaysShowIndicator,currentSpaceOnly:action.currentSpaceOnly,open:true})
     await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout},deps.deviceId);assertCurrent(e)
     e.port.setWindowMetadata(layout);e.port.setPinned(layout.pinned);e.state={...e.state,geometry:layout,pinned:layout.pinned};e.port.publish(e.state);deps.changed();return{ok:true}
    }
    if(action.kind==='promise'){
     member(action.assetId);const receipt=action.receiptId??await prepare(action.assetId,'original')
     const checked=await deps.media!.files.nativeFile(fileActor(e),receipt);member(action.assetId)
     const read=await deps.media!.files.readFile(receipt);member(action.assetId)
     if(checked.assetId!==action.assetId)throw Error('MEMBERSHIP_NOT_GRANTED')
     const target=path.resolve(action.destination),directory=path.dirname(target)
     if(await fs.realpath(directory)!==directory)throw Error('接收位置包含链接，未写入。')
     const handle=await fs.open(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600)
     const identity=await handle.stat({bigint:true});let completed=false
     try{member(action.assetId);await handle.writeFile(read.bytes);await handle.sync();member(action.assetId);completed=true}
     finally{await handle.close();if(!completed){const now=await fs.lstat(target,{bigint:true}).catch(()=>null);if(now?.dev===identity.dev&&now.ino===identity.ino)await fs.unlink(target)}}
     return{ok:true,message:'副本写入完成；请在接收应用核对。'}
    }
    if(action.kind==='handoff'){
     action.assetIds.forEach(member);const receipts:NonNullable<ShelfReply['receipts']>=[],details:string[]=[]
     const targets=['zip','pdf','stitch'].includes(action.handoffKind)?[action.assetIds[0]]:action.assetIds
     try{
      for(const id of targets){const receipt=await prepare(id,action.handoffKind,{...(['zip','pdf','stitch'].includes(action.handoffKind)?{assetIds:action.assetIds}:{}),...(action.imageTransform?{imageTransform:action.imageTransform}:{}),...(action.composition?{composition:action.composition}:{})});await deps.media!.files.nativeFile(fileActor(e),receipt);member(id);const data=await deps.media!.files.readFile(receipt);receipts.push({id:receipt,fileName:data.fileName,assetId:id});details.push(data.message)}
     }catch(error){
      assertCurrent(e)
      const message=error instanceof Error?error.message:'执行结果未确认，请核对保留记录。'
      return{ok:false,message:`本次交付未完成（已完成 ${receipts.length}/${action.assetIds.length} 项）。${message} 原目标与已完成副本保留。`,receipts}
     }
     return{ok:true,message:details.join('\n'),receipts}
    }
    if(action.kind==='members'||action.kind==='drop'){
     const revision=e.state.set.revision;let ids:string[]=[],partial=0
     if(action.kind==='members'){
      if(action.transfer.libraryIdentity!==e.state.scope.libraryIdentity||action.transfer.generation!==e.state.scope.generation)throw Error('不能接入其他库或失效会话的引用。')
      const assets=(await deps.host.readAssetContext(action.transfer.assetIds)).assets;assertCurrent(e)
      ids=assets.map(a=>a.id);partial=action.transfer.assetIds.length-ids.length
     }else{
      const resolved=await deps.host.resolveDroppedAssetReferences?.(action.paths)??{assetIds:[],externalPaths:action.paths};assertCurrent(e);ids=resolved.assetIds
      if(resolved.externalPaths.length+new Set([...e.state.set.assetIds,...ids]).size>200)throw Error('工作集最多200份参考，未开始入库。')
      if(resolved.externalPaths.length){
      if(!deps.host.prepareDroppedAssets||!deps.host.dispatchDroppedAssets)throw Error('当前Host未提供拖入接入。')
      const abort=new AbortController();e.dropAbort=abort
      const plan=await deps.host.prepareDroppedAssets(resolved.externalPaths,abort.signal);assertCurrent(e)
      if(plan.kind!=='planned'||!plan.plan.confirmable)throw Error('没有可接入的文件；支持PNG、JPEG、WebP及适用MP4。')
      const batch=await deps.host.dispatchDroppedAssets(plan.plan.receipt,abort.signal);assertCurrent(e)
      ids=[...ids,...batch.items.flatMap(i=>i.promotion?[i.promotion.designAssetIdentity]:[])];partial=resolved.externalPaths.length-batch.items.filter(i=>i.promotion).length
      }
     }
     if(!ids.length)throw Error('入库未完成，已执行的接入记录保留。')
     const catalog=await deps.host.readWorkSets(e.state.scope,deps.deviceId);assertCurrent(e);const current=catalog.sets.find(s=>s.id===e.state.set.id)
     if(!current||current.revision!==revision)throw Error('素材已接入，但工作集在接入期间变化；未覆盖，请从资料库重新加入。')
     const assetIds=[...new Set([...current.assetIds,...ids])];if(assetIds.length>200)throw Error('素材已接入，但工作集达到200份上限。')
     await deps.host.writeWorkSet({...e.state.scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'save',id:current.id,expectedRevision:revision,value:{...savedValue(current),assetIds}}},deps.deviceId)
     await refreshEntry(e);deps.changed();return{ok:true,message:partial?`已加入${ids.length}份；${partial}份未完成，接入记录保留。`:undefined}
    }
    throw Error('窗口操作未支持。')
   }
   const task=e.queue.then(run);e.queue=task.catch(()=>{});e.nativeTasks??=new Set();e.nativeTasks.add(task)
   try{return await task}finally{e.nativeTasks.delete(task);if(action.kind==='drop')e.dropAbort=undefined}
  }catch(error){return{ok:false,message:error instanceof Error?error.message:'操作未完成，内容保留。'}}
 }
 const inspect=(event:unknown)=>result(()=>{const e=locateEntry(event);return e.shelf?{...e.state,focusOnly:true}:e.state})
 const actEntry=(e:Entry,input:unknown,ownedNativeIntent=false)=>result(async()=>{const a=workRecord(input,['token','kind','expectedRevision','value','pinned','assetId','dirty','discard','edge','requestId',...(ownedNativeIntent?['restore','gestureId','deltaX']:[])]);if(workId(a.token)!==e.state.token)throw Error('UNTRUSTED_WORK_WINDOW');const retirement=Symbol('native-close');const run=async()=>{assertCurrent(e)
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
    const updated=await deps.host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:false,command:{kind:'save',id:saved.id,expectedRevision:revision,value:{name:saved.name,columns:saved.columns,assetIds:[...saved.assetIds,imported]}}},deps.deviceId)
    assertCurrent(e);const set=updated.sets.find(set=>set.id===saved.id);if(!set||!set.assetIds.includes(imported))throw Error('ATTACHMENT_UNCONFIRMED')
    const assets=(await deps.host.readAssetContext(set.assetIds)).assets;assertCurrent(e)
    e.sessionToken=updated.sessionToken;e.state={...e.state,set,assets:[...assets],...(e.state.draft?{draft:undefined,draftRevision:undefined}:{})};e.port.publish(e.state);deps.changed();return e.state
   }catch(error){if(imported)throw new ClipboardAttachmentError({kind:'clipboard-image',assetId:imported,libraryIdentity:scope.libraryIdentity,attachment:'unconfirmed'});throw error}
   finally{e.pasteActive=false}
  }
  else if(a.kind==='close'){workRecord(a,['token','kind','discard']);if(typeof a.discard!=='boolean')throw Error('INVALID_ACTION');assertFileIdle(e);assertFileAdmission(e);if(!a.discard&&entryUnsaved(e))throw Error('UNSAVED_WORK_SET');e.fileRetiring=retirement;clearTimeout(e.timer);await deps.host.writeWorkLayout({...e.state.scope,sessionToken:e.sessionToken,id:e.state.set.id,layout:{...e.port.bounds(),open:false}},deps.deviceId);assertCurrent(e);e.shelf?.dispose();deps.memberTools?.retire(fileActor(e));await e.port.destroy();entries.delete(e.state.set.id);deps.changed()}
  else if(a.kind==='notes-dirty'){workRecord(a,['token','kind','dirty']);if(typeof a.dirty!=='boolean')throw Error('INVALID_ACTION');e.notesDirty=a.dirty;deps.changed()}
  else if(a.kind==='draft'){workRecord(a,['token','kind','expectedRevision','value']);const value=validateWorkValue(a.value);if(value.assetIds.some(id=>!e.state.set.assetIds.includes(id)))throw Error('MEMBERSHIP_NOT_GRANTED');e.state={...e.state,draft:value,draftRevision:workRevision(a.expectedRevision)};deps.changed()}
  else if(a.kind==='discard-draft'){workRecord(a,['token','kind']);e.state={...e.state,draft:undefined,draftRevision:undefined};e.port.publish(e.state);deps.changed()}
  else if(a.kind==='save'){workRecord(a,['token','kind','expectedRevision','value']);const value=validateWorkValue(a.value);if(value.assetIds.some(id=>!e.state.set.assetIds.includes(id)))throw Error('MEMBERSHIP_NOT_GRANTED');const saved=await deps.host.writeWorkSet({...e.state.scope,sessionToken:e.sessionToken,allowUpgrade:false,command:{kind:'save',id:e.state.set.id,expectedRevision:workRevision(a.expectedRevision),value}},deps.deviceId,{...e.port.bounds(),open:true});assertCurrent(e);const set=saved.sets.find(s=>s.id===e.state.set.id)!;if(e.state.set.assetIds.some(id=>!set.assetIds.includes(id)))deps.memberTools?.retire(fileActor(e));e.state={...e.state,set,...(JSON.stringify(e.state.draft)===JSON.stringify(value)?{draft:undefined,draftRevision:undefined}:{})};e.port.publish(e.state);deps.changed()}
  else if(a.kind==='pin'){workRecord(a,['token','kind','pinned']);if(typeof a.pinned!=='boolean')throw Error('INVALID_ACTION');e.port.setPinned(a.pinned);e.state={...e.state,pinned:a.pinned};e.port.publish(e.state)}
  else if(a.kind==='dock'||a.kind==='undock'){
   workRecord(a,a.kind==='dock'?['token','kind','edge',...(ownedNativeIntent?['gestureId','deltaX']:[])]:['token','kind',...(ownedNativeIntent?['restore','gestureId']:[])])
   if(a.kind==='dock'&&a.edge!=='left'&&a.edge!=='right')throw Error('INVALID_DOCK_EDGE')
   assertFileIdle(e);assertFileAdmission(e)
   if(!e.port.configureDock)throw Object.assign(Error('当前窗口不支持原生停靠。'),{code:'NATIVE_DOCK_UNAVAILABLE'})
   const actual=validateWorkLayout(e.port.bounds());if(e.port.edgeDock&&a.kind==='dock'&&actual.presentation==='expanded')throw Object.assign(Error('展开窗口不参与边缘停靠，请先收回小窗。'),{code:'WORK_WINDOW_NOT_DOCKABLE'});let next=a.kind==='dock'?dockWorkBounds(actual,a.edge as 'left'|'right',deps.areas(),e.port.edgeDock?'edge-slide':undefined):expandedWorkBounds(actual,deps.areas())
   if(a.kind==='undock'&&ownedNativeIntent&&a.restore!==undefined){const restore=workRecord(a.restore,['x','y','width','height']);const {dock,...base}=actual;next=visibleWorkBounds(validateWorkLayout({...base,...restore}),deps.areas())}
   clearTimeout(e.timer)
   await e.port.configureDock(next,ownedNativeIntent?{gestureId:a.gestureId as number|undefined,deltaX:a.deltaX as number|undefined}:undefined);assertCurrent(e)
   e.state={...e.state,geometry:validateWorkLayout(e.port.bounds()),pinned:e.port.bounds().pinned};e.port.publish(e.state)
  }
  else if(a.kind==='configure-ai'){workRecord(a,['token','kind']);if(!deps.configureAi)throw Error('AI配置入口未就绪');e.port.closeFocus?.();deps.configureAi()}
  else if(a.kind==='close-focus'){workRecord(a,['token','kind']);e.port.closeFocus?.()}
  else if(a.kind==='hide'){workRecord(a,['token','kind']);e.port.hide()}
  else if(a.kind==='recover'){workRecord(a,['token','kind']);await applyBounds(e,visibleWorkBounds(e.port.bounds(),deps.areas()))}
  else if(a.kind==='add-from-library'){workRecord(a,['token','kind']);deps.locate(e.state.scope,e.state.set.id)}
  else if(a.kind==='locate'){workRecord(a,['token','kind','assetId']);const id=workId(a.assetId);if(!e.state.set.assetIds.includes(id)&&!e.clipboardAssets?.has(id))throw Error('MEMBERSHIP_NOT_GRANTED');deps.locate(e.state.scope,e.state.set.id,id)}
  else throw Error('INVALID_ACTION')
  return e.state
 };const task=e.queue.then(run);e.queue=task.catch(()=>{});try{await task;if(['pin','hide','recover','dock','undock'].includes(String(a.kind)))await persist(e);return e.state}finally{if(a.kind==='close'&&entries.get(e.state.set.id)===e&&e.fileRetiring===retirement)e.fileRetiring=undefined}})
 const act=(event:unknown,input:unknown)=>{
  try{const a=workRecord(input,['token','kind','expectedRevision','value','pinned','assetId','dirty','discard','edge','requestId']);return actEntry(locateEntry(event,workId(a.token)),input)}
  catch(error){return result<WorkWindowSnapshot>(()=>{throw error})}
 }
 const memberTools=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token','assetId','operation','input']),e=locateEntry(event,workId(r.token)),assetId=workId(r.assetId);const check=()=>{assertCurrent(e);if(!e.state.set.assetIds.includes(assetId)||e.state.set.unavailableIds.includes(assetId))throw Error('MEMBERSHIP_NOT_GRANTED')};check();assertFileAdmission(e);if(!deps.memberTools||typeof r.operation!=='string')throw Error('MEMBER_TOOLS_UNAVAILABLE');return deps.memberTools.call({owner:fileActor(e),scope:e.state.scope,assetId,check},r.operation,r.input)})
 const notebookRead=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token','assetId']),e=locateEntry(event,workId(r.token)),assetId=workId(r.assetId);if(!e.state.set.assetIds.includes(assetId))throw Error('MEMBERSHIP_NOT_GRANTED');const value=await deps.host.readNotebook({...e.state.scope,assetId});assertCurrent(e);return value})
 const notebookSave=(event:unknown,input:unknown)=>result(async()=>{const r=workRecord(input,['token','request']),e=locateEntry(event,workId(r.token)),q=workRecord(r.request,['assetId','libraryIdentity','generation','sessionToken','sourceRef','expectedRevision','allowUpgrade','book']);const assetId=workId(q.assetId);if(!e.state.set.assetIds.includes(assetId)||q.libraryIdentity!==e.state.scope.libraryIdentity||q.generation!==e.state.scope.generation||(q.allowUpgrade!==false&&(!e.shelf||q.allowUpgrade!==true))||!Number.isSafeInteger(q.expectedRevision)||Number(q.expectedRevision)<0)throw Error('MEMBERSHIP_NOT_GRANTED');const request:NotebookSaveRequest={...e.state.scope,assetId,sessionToken:workId(q.sessionToken),sourceRef:workId(q.sourceRef),expectedRevision:Number(q.expectedRevision),allowUpgrade:q.allowUpgrade===true,book:validateNotebook(q.book)};const saved=await deps.host.saveNotebook(request);assertCurrent(e);return saved})
 const drain=()=>{
  if(drainPromise)return drainPromise
  draining=true
  const task=(async()=>{
   const held=[...entries.values()];try{await Promise.all(held.map(async e=>{await e.port.freeze?.(true);e.nativeFrozen=true}));}catch(error){await Promise.all(held.map(async e=>{e.nativeFrozen=false;await e.port.freeze?.(false).catch(()=>{})}));throw error};if(held.some(e=>e.nativeTransient))throw Error('原生窗口仍在输入文字，尚未退出。');const saves=await Promise.all(held.map(e=>e.shelf?.flush()));if(saves.some(r=>r&&!r.ok))throw Error('原生工作集保存未确认，窗口与草稿保留。');await Promise.all(held.map(e=>e.queue));const files=fileLifecycle()
   if(files){await Promise.all(held.map(e=>files.cancel(fileActor(e))));await Promise.all(held.map(e=>files.whenIdle(fileActor(e))));for(const e of held)assertFileIdle(e)}
   const a=deps.host.inspect();if(a.state==='ready'&&a.identity&&a.generation){try{retiredSession=(await deps.host.readWorkSets({libraryIdentity:a.identity,generation:a.generation},deps.deviceId)).sessionToken}catch{}}
   await Promise.allSettled(held.filter(e=>entries.get(e.state.set.id)===e).map(e=>persist(e)));await invalidate()
  })()
  drainPromise=task.finally(async()=>{draining=false;drainPromise=null;await Promise.all([...entries.values()].map(async e=>{e.nativeFrozen=false;await e.port.freeze?.(false).catch(()=>{})}))})
  return drainPromise
 }

 const hasUnsaved=()=>[...entries.values()].some(entryUnsaved)
 const isTrusted=(event:unknown)=>{try{locateEntry(event);return true}catch{return false}}
 const permitsDraft=(event:unknown,scope:WorkspaceDraftScope)=>{try{const e=locateEntry(event);return scope.libraryIdentity===e.state.scope.libraryIdentity&&scope.generation===e.state.scope.generation&&(scope.kind==='work-set'?scope.entityId===e.state.set.id:(scope.kind==='work-media'&&e.state.set.assetIds.some(id=>scope.entityId===e.state.set.id+'~'+id&&!e.state.set.unavailableIds.includes(id))||scope.kind==='notebook'&&e.state.set.assetIds.includes(scope.entityId))&&!e.state.set.unavailableIds.includes(scope.entityId))}catch{return false}}
 return{memberTools,nativeMediaRead,nativeMediaWrite,nativeMediaCancel,nativeHandoff,nativeOpenFile,nativeDrag,nativeDragFiles,isTrusted,permitsDraft,hasUnsaved,read,write,windows,control,open,restore,recover,inspect,act,notebookRead,notebookSave,invalidate,refresh,drain,hideMain:()=>result(()=>{if(!entries.size)throw Error('NO_WORK_WINDOWS');entries.values().next().value?.port.show();deps.hideMain();return{count:entries.size}}),count:()=>entries.size}
}
