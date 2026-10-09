import type {ActiveLibraryAssetProjection} from './active-library.contract'
import type {OrganizationScope} from './library-organization.contract'
import type {NotebookSaveRequest,NotebookSnapshot} from './asset-notebook.contract'
export type WorkScope=OrganizationScope
export interface WorkSetValue {name:string;assetIds:string[];note:string;colors:string[];columns:number}
export interface WorkWindowBounds{x:number;y:number;width:number;height:number}
export interface WorkWindowLayout extends WorkWindowBounds{pinned:boolean;open:boolean;dock?:{edge:'left'|'right';normalBounds:WorkWindowBounds}}
export interface SavedWorkSet extends WorkSetValue {id:string;revision:number;unavailableIds:string[];layout:WorkWindowLayout|null}
export interface WorkSetCatalog {sets:SavedWorkSet[];sessionToken:string;requiresUpgrade:boolean}
export interface WorkSetWrite extends WorkScope {sessionToken:string;allowUpgrade:boolean;command:{kind:'create';value:WorkSetValue}|{kind:'save';id:string;expectedRevision:number;value:WorkSetValue}|{kind:'delete';id:string;expectedRevision:number}}
export interface WorkLayoutWrite extends WorkScope {sessionToken:string;id:string;layout:WorkWindowLayout}
export interface WorkWindowSnapshot {token:string;scope:WorkScope;set:SavedWorkSet;assets:ActiveLibraryAssetProjection[];pinned:boolean;geometry:WorkWindowLayout;layoutError?:string;theme:'light'|'dark';draft?:WorkSetValue;draftRevision?:number}
/** Workspace control never grants a native window token or its private draft. */
export interface WorkWindowControlState {id:string;open:boolean;pinned:boolean;visible:boolean;hasUnsaved:boolean;layoutError?:string}
export type WorkWindowControlInput=WorkScope & {id:string} & ({kind:'pin';pinned:boolean}|{kind:'hide'|'recover'|'close'})
export interface WorkWindowControlResult {status:'applied'|'review-required';window:WorkWindowControlState;message?:string}
export type WorkResult<T>={success:true;value:T}|{success:false;error:string;code?:string}
export type WorkWindowAction={token:string}&({kind:'close';discard:boolean}|{kind:'notes-dirty';dirty:boolean}|{kind:'save'|'draft';expectedRevision:number;value:WorkSetValue}|{kind:'pin';pinned:boolean}|{kind:'dock';edge:'left'|'right'}|{kind:'undock'}|{kind:'hide'|'recover'|'add-from-library'|'discard-draft'}|{kind:'locate';assetId:string})
export interface WorkWindowApi {
 mediaRead(input:{token:string;request:import('./work-media.contract').WorkMediaScope}):Promise<WorkResult<import('./work-media.contract').WorkMediaSnapshot>>
 mediaWrite(input:{token:string;request:import('./work-media.contract').WorkMediaWrite}):Promise<WorkResult<import('./work-media.contract').WorkMediaSnapshot>>
 mediaCancel(input:{token:string}):Promise<WorkResult<{message:string}>>
 fileHandoff(input:{token:string;request:import('./work-media.contract').WorkHandoffRequest}):Promise<WorkResult<import('./work-media.contract').WorkHandoffReceipt>>
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
export function validateWorkValue(v:unknown):WorkSetValue {const r=workRecord(v,['name','assetIds','note','colors','columns']);if(typeof r.name!=='string'||!r.name.trim()||r.name.trim().length>80||/[\x00-\x1f]/.test(r.name)||typeof r.note!=='string'||r.note.length>16000||!Array.isArray(r.assetIds)||r.assetIds.length>200||!Array.isArray(r.colors)||r.colors.length>64||!Number.isInteger(r.columns)||Number(r.columns)<1||Number(r.columns)>4)return invalid();const ids=r.assetIds.map(workId);if(new Set(ids).size!==ids.length)return invalid();const colors=r.colors.map(c=>{if(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))return invalid();return c.toUpperCase()});return{name:r.name.trim(),assetIds:ids,note:r.note,colors:[...new Set(colors)],columns:Number(r.columns)}}
export function validateWorkWrite(v:unknown):WorkSetWrite {const r=workRecord(v,['libraryIdentity','generation','sessionToken','allowUpgrade','command']),c=workRecord(r.command,['kind','id','expectedRevision','value']);if(typeof r.allowUpgrade!=='boolean')return invalid();let command:WorkSetWrite['command'];if(c.kind==='create'){workRecord(c,['kind','value']);command={kind:'create',value:validateWorkValue(c.value)}}else if(c.kind==='save'){workRecord(c,['kind','id','expectedRevision','value']);command={kind:'save',id:workId(c.id),expectedRevision:workRevision(c.expectedRevision),value:validateWorkValue(c.value)}}else if(c.kind==='delete'){workRecord(c,['kind','id','expectedRevision']);command={kind:'delete',id:workId(c.id),expectedRevision:workRevision(c.expectedRevision)}}else return invalid();return{...validateWorkScope({libraryIdentity:r.libraryIdentity,generation:r.generation}),sessionToken:workId(r.sessionToken),allowUpgrade:r.allowUpgrade,command}}
export function validateWorkLayout(v:unknown):WorkWindowLayout {
 const r=workRecord(v,['x','y','width','height','pinned','open','dock'])
 const bounds=(value:unknown,minWidth:number,minHeight:number):WorkWindowBounds=>{
  const b=workRecord(value,['x','y','width','height'])
  for(const k of ['x','y','width','height'])if(typeof b[k]!=='number'||!Number.isFinite(b[k])||Math.abs(Number(b[k]))>100000)return invalid()
  if(Number(b.width)<minWidth||Number(b.height)<minHeight||Number(b.width)>5000||Number(b.height)>5000)return invalid()
  return{x:Math.round(Number(b.x)),y:Math.round(Number(b.y)),width:Math.round(Number(b.width)),height:Math.round(Number(b.height))}
 }
 let dock:WorkWindowLayout['dock']
 if(r.dock!==undefined){const d=workRecord(r.dock,['edge','normalBounds']);if(d.edge!=='left'&&d.edge!=='right')return invalid();dock={edge:d.edge,normalBounds:bounds(d.normalBounds,290,310)}}
 if(typeof r.pinned!=='boolean'||typeof r.open!=='boolean')return invalid()
 const actual=bounds({x:r.x,y:r.y,width:r.width,height:r.height},dock?72:290,dock?160:310)
 if(dock&&(actual.width!==72||actual.height!==160))return invalid()
 return{...actual,pinned:r.pinned,open:r.open,...(dock?{dock}:{})}
}
