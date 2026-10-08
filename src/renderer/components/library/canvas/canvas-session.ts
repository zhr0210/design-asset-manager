export interface CanvasLocation {destination:'all'|'folders'|'work'|'trash';folder?:string;ai?:string;palettes?:boolean}
export interface CanvasSession {history:CanvasLocation[];cursor:number;density:number;quick:string[];category:string;scrollTop:number}
let snapshot:{scope:string;value:CanvasSession}|null=null
/** Transient return context; never stores file paths, account state or permanent query history. */
export function holdCanvasSession(scope:string,value:CanvasSession){if(scope.startsWith('['))snapshot={scope,value:structuredClone(value)}}
export function readCanvasSession(scope:string):CanvasSession|null{return snapshot?.scope===scope?structuredClone(snapshot.value):null}
export function clearCanvasSession(){snapshot=null}
