import type {ActiveLibraryAssetProjection} from './active-library.contract'
import type {OrganizationScope} from './library-organization.contract'
import type {NotebookSaveRequest,NotebookSnapshot} from './asset-notebook.contract'
export type WorkScope=OrganizationScope
export interface WorkSetValue {name:string;assetIds:string[];columns:number}
export interface WorkWindowBounds{x:number;y:number;width:number;height:number}
export interface WorkWindowLayout extends WorkWindowBounds{indicatorColor?:string|null;alwaysShowIndicator?:boolean;currentSpaceOnly?:boolean;pinned:boolean;open:boolean;presentation?:'compact'|'expanded';expansion?:{edge:'center'|'left'|'right';compactBounds:WorkWindowBounds};dock?:{edge:'left'|'right';normalBounds:WorkWindowBounds;style?:'edge-slide'}}
export interface SavedWorkSet extends WorkSetValue {id:string;revision:number;unavailableIds:string[];layout:WorkWindowLayout|null}
export interface WorkSetCatalog {sets:SavedWorkSet[];sessionToken:string;requiresUpgrade:boolean}
export interface WorkSetWrite extends WorkScope {sessionToken:string;allowUpgrade:boolean;command:{kind:'fork';id:string;expectedRevision:number;value:WorkSetValue;move:boolean}|{kind:'create';value:WorkSetValue}|{kind:'save';id:string;expectedRevision:number;value:WorkSetValue}|{kind:'delete';id:string;expectedRevision:number}}
export interface WorkLayoutWrite extends WorkScope {sessionToken:string;id:string;layout:WorkWindowLayout}
export interface WorkWindowSnapshot {token:string;scope:WorkScope;set:SavedWorkSet;assets:ActiveLibraryAssetProjection[];pinned:boolean;geometry:WorkWindowLayout;layoutError?:string;theme:'light'|'dark';draft?:WorkSetValue;draftRevision?:number;nativeSaveSerial?:number;focusAssetId?:string;focusRequest?:number;focusOnly?:boolean}
/** Workspace control never grants a native window token or its private draft. */
export interface WorkWindowControlState {id:string;open:boolean;pinned:boolean;visible:boolean;hasUnsaved:boolean;layoutError?:string}
export type WorkWindowControlInput=WorkScope & {id:string} & ({kind:'pin';pinned:boolean}|{kind:'hide'|'recover'|'close'})
export interface WorkWindowControlResult {status:'applied'|'review-required';window:WorkWindowControlState;message?:string}
export interface WorkClipboardEffect{kind:'clipboard-image';assetId:string;libraryIdentity:string;attachment:'unconfirmed'}
export type WorkResult<T>={success:true;value:T}|{success:false;error:string;code?:string;effect?:WorkClipboardEffect}
export type WorkWindowAction={token:string}&({kind:'paste-image';requestId:string;expectedRevision:number}|{kind:'close';discard:boolean}|{kind:'notes-dirty';dirty:boolean}|{kind:'save'|'draft';expectedRevision:number;value:WorkSetValue}|{kind:'pin';pinned:boolean}|{kind:'dock';edge:'left'|'right'}|{kind:'undock'}|{kind:'configure-ai'|'close-focus'|'hide'|'recover'|'add-from-library'|'discard-draft'}|{kind:'locate';assetId:string})
export interface WorkWindowApi {
 member?(input:{token:string;assetId:string;operation:string;input?:unknown}):Promise<WorkResult<unknown>>
 mediaRead(input:{token:string;request:import('./work-media.contract').WorkMediaScope}):Promise<WorkResult<import('./work-media.contract').WorkMediaSnapshot>>
 mediaWrite(input:{token:string;request:import('./work-media.contract').WorkMediaWrite}):Promise<WorkResult<import('./work-media.contract').WorkMediaSnapshot>>
 mediaCancel(input:{token:string}):Promise<WorkResult<{message:string}>>
 fileHandoff(input:{token:string;request:import('./work-media.contract').WorkHandoffRequest}):Promise<WorkResult<import('./work-media.contract').WorkHandoffReceipt>>
 openFile(input:{token:string;id:string}):Promise<WorkResult<import('./work-media.contract').WorkHandoffReceipt>>
 dragFiles(input:{token:string;ids:string[]}):Promise<WorkResult<{message:string}>>
 dragFile(input:{token:string;id:string}):Promise<WorkResult<{message:string}>>
 inspect():Promise<WorkResult<WorkWindowSnapshot>>;act(action:WorkWindowAction):Promise<WorkResult<WorkWindowSnapshot>>;onState(listener:(state:WorkWindowSnapshot|null)=>void):()=>void;notebookRead(input:{token:string;assetId:string}):Promise<WorkResult<NotebookSnapshot>>;notebookSave(input:{token:string;request:NotebookSaveRequest}):Promise<WorkResult<NotebookSnapshot>>
}
export const WORK_SET_READ='work-sets:read',WORK_SET_WRITE='work-sets:write',WORK_WINDOW_OPEN='work-windows:open',WORK_WINDOW_RESTORE='work-windows:restore',WORK_WINDOW_RECOVER='work-windows:recover',WORK_WINDOW_HIDE_MAIN='work-windows:hide-main',WORK_WINDOW_INSPECT='work-window:inspect',WORK_WINDOW_ACTION='work-window:action',WORK_WINDOW_NOTE_READ='work-window:note-read',WORK_WINDOW_NOTE_SAVE='work-window:note-save',WORK_WINDOW_STATE='work-window:state',WORK_SETS_CHANGED='work-sets:changed',WORK_LOCATE='work-sets:locate'
export const WORK_WINDOWS_LIST='work-windows:list',WORK_WINDOWS_CONTROL='work-windows:control'
const invalid=():never=>{throw Error('WORK_SET_INPUT_INVALID')}
export function workRecord(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))return invalid();return v as Record<string,unknown>}
export function workId(v:unknown){if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(v))return invalid();return v}
export function workRevision(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<1)return invalid();return Number(v)}
export function validateWorkScope(v:unknown):WorkScope {const r=workRecord(v,['libraryIdentity','generation']);return{libraryIdentity:workId(r.libraryIdentity),generation:workId(r.generation)}}
export function validateWorkWindowControl(v:unknown):WorkWindowControlInput {const r=workRecord(v,['libraryIdentity','generation','id','kind','pinned']),scope=validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),id=workId(r.id);if(r.kind==='pin'){if(typeof r.pinned!=='boolean')return invalid();return{...scope,id,kind:'pin',pinned:r.pinned}}if(r.kind==='hide'||r.kind==='recover'||r.kind==='close'){workRecord(r,['libraryIdentity','generation','id','kind']);return{...scope,id,kind:r.kind}}return invalid()}
export function validateWorkValue(v:unknown):WorkSetValue {
 const r=workRecord(v,['name','assetIds','columns'])
 if(typeof r.name!=='string'||!r.name.trim()||r.name.trim().length>80||/[\x00-\x1f]/.test(r.name)||!Array.isArray(r.assetIds)||r.assetIds.length>200||!Number.isInteger(r.columns)||Number(r.columns)<1||Number(r.columns)>4)return invalid()
 const ids=r.assetIds.map(workId);if(new Set(ids).size!==ids.length)return invalid()
 return{name:r.name.trim(),assetIds:ids,columns:Number(r.columns)}
}
export function validateWorkWrite(v:unknown):WorkSetWrite {const r=workRecord(v,['libraryIdentity','generation','sessionToken','allowUpgrade','command']),c=workRecord(r.command,['kind','id','expectedRevision','value','move']);if(typeof r.allowUpgrade!=='boolean')return invalid();let command:WorkSetWrite['command'];if(c.kind==='create'){workRecord(c,['kind','value']);command={kind:'create',value:validateWorkValue(c.value)}}else if(c.kind==='fork'){workRecord(c,['kind','id','expectedRevision','value','move']);if(typeof c.move!=='boolean')return invalid();command={kind:'fork',id:workId(c.id),expectedRevision:workRevision(c.expectedRevision),value:validateWorkValue(c.value),move:c.move}}else if(c.kind==='save'){workRecord(c,['kind','id','expectedRevision','value']);command={kind:'save',id:workId(c.id),expectedRevision:workRevision(c.expectedRevision),value:validateWorkValue(c.value)}}else if(c.kind==='delete'){workRecord(c,['kind','id','expectedRevision']);command={kind:'delete',id:workId(c.id),expectedRevision:workRevision(c.expectedRevision)}}else return invalid();return{...validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),sessionToken:workId(r.sessionToken),allowUpgrade:r.allowUpgrade,command}}
export function validateWorkLayout(v:unknown):WorkWindowLayout {
 const r=workRecord(v,['x','y','width','height','pinned','open','dock','presentation','expansion','indicatorColor','alwaysShowIndicator','currentSpaceOnly'])
 const bounds=(value:unknown,minWidth:number,minHeight:number):WorkWindowBounds=>{
  const b=workRecord(value,['x','y','width','height'])
  for(const k of ['x','y','width','height'])if(typeof b[k]!=='number'||!Number.isFinite(b[k])||Math.abs(Number(b[k]))>100000)return invalid()
  if(Number(b.width)<minWidth||Number(b.height)<minHeight||Number(b.width)>5000||Number(b.height)>5000)return invalid()
  return{x:Math.round(Number(b.x)),y:Math.round(Number(b.y)),width:Math.round(Number(b.width)),height:Math.round(Number(b.height))}
 }
 let dock:WorkWindowLayout['dock']
 if(r.dock!==undefined){const d=workRecord(r.dock,['edge','normalBounds','style']);if(d.edge!=='left'&&d.edge!=='right'||d.style!==undefined&&d.style!=='edge-slide')return invalid();dock={edge:d.edge,normalBounds:bounds(d.normalBounds,d.style==='edge-slide'?220:290,d.style==='edge-slide'?240:310),...(d.style==='edge-slide'?{style:'edge-slide' as const}:{})}}
 if(typeof r.pinned!=='boolean'||typeof r.open!=='boolean')return invalid()
 if(r.presentation!==undefined&&r.presentation!=='compact'&&r.presentation!=='expanded')return invalid()
 const compactDock=dock&&dock.style!=='edge-slide'
 const nativeCompact=r.presentation==='compact'
 const actual=bounds({x:r.x,y:r.y,width:r.width,height:r.height},compactDock?72:nativeCompact?220:r.presentation==='expanded'?220:290,compactDock?160:nativeCompact?240:r.presentation==='expanded'?160:310)
 if(compactDock&&(actual.width!==72||actual.height!==160))return invalid()
 if(dock?.style==='edge-slide'&&(r.presentation!=='compact'||actual.width!==dock.normalBounds.width||actual.height!==dock.normalBounds.height))return invalid()
 let expansion:WorkWindowLayout['expansion']
 if(r.expansion!==undefined){const a=workRecord(r.expansion,['edge','compactBounds']);if(r.presentation!=='expanded'||dock||!['center','left','right'].includes(String(a.edge)))return invalid();const compactBounds=bounds(a.compactBounds,220,240);if(compactBounds.width!==220||compactBounds.height!==240)return invalid();expansion={edge:a.edge as 'center'|'left'|'right',compactBounds}}
 if(r.indicatorColor!==undefined&&r.indicatorColor!==null&&(typeof r.indicatorColor!=='string'||!/^#[0-9A-F]{6}$/i.test(r.indicatorColor)))return invalid()
 for(const k of ['alwaysShowIndicator','currentSpaceOnly'])if(r[k]!==undefined&&typeof r[k]!=='boolean')return invalid()
 return{...actual,...(r.indicatorColor!==undefined?{indicatorColor:r.indicatorColor as string|null}:{}),...(r.alwaysShowIndicator!==undefined?{alwaysShowIndicator:r.alwaysShowIndicator as boolean}:{}),...(r.currentSpaceOnly!==undefined?{currentSpaceOnly:r.currentSpaceOnly as boolean}:{}),...(expansion?{expansion}:{}),pinned:r.pinned,open:r.open,...(r.presentation?{presentation:r.presentation as 'compact'|'expanded'}:{}),...(dock?{dock}:{})}
}

export function workClipboardRequestId(value:unknown):string{if(typeof value!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(value))return invalid();return value}

/** Recovery journals alone may read old content. Public writes remain strict. */
export function projectRetiredWorkSetDraft(value:unknown):unknown {
 if(!value||typeof value!=='object'||Array.isArray(value))return value
 const {note:_note,colors:_colors,...retained}=value as Record<string,unknown>
 return retained
}
