/** Versioned annotations are independent of image bytes and scoped to a held library session. */
export type NotePoint={x:number;y:number}
export type NoteElement={id:string;kind:'pen'|'rect'|'ellipse'|'text'|'sticky';x:number;y:number;width?:number;height?:number;points?:NotePoint[];text?:string;color:string;stroke:number}
export interface NotePage{id:string;name:string;elements:NoteElement[]}
export interface AssetNotebook{pages:NotePage[];active:string|null}
export interface NotebookScope{libraryIdentity:string;generation:string;assetId:string}
export interface NotebookSnapshot{book:AssetNotebook;revision:number;sessionToken:string;sourceRef:string;requiresUpgrade:boolean}
export interface NotebookSaveRequest extends NotebookScope{sessionToken:string;sourceRef:string;expectedRevision:number;allowUpgrade:boolean;book:AssetNotebook}
export const NOTEBOOK_READ='library-notebook:read'
export const NOTEBOOK_SAVE='library-notebook:save'
export const EMPTY_NOTEBOOK:AssetNotebook={pages:[],active:null}
/** Bounded canonical form. Reject malformed/extra fields; never silently drop user marks. */
export function validateNotebook(input:unknown):AssetNotebook {
 const invalid=()=>{throw new Error('NOTEBOOK_INVALID')}
 const record=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))invalid();return v as Record<string,unknown>}
 const id=(v:unknown)=>{if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,127}$/.test(v))invalid();return v as string}
 const number=(v:unknown,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)invalid();return v as number}
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)invalid();return v as string}
 const b=record(input,['pages','active']);if(!Array.isArray(b.pages)||b.pages.length>100)invalid()
 let count=0,points=0;const ids=new Set<string>()
 const pages=(b.pages as unknown[]).map(value=>{const p=record(value,['id','name','elements']);const pageId=id(p.id);if(ids.has(pageId))invalid();ids.add(pageId);if(!Array.isArray(p.elements)||p.elements.length>500)invalid();const elements=new Set<string>();return {id:pageId,name:text(p.name,40),elements:(p.elements as unknown[]).map(value=>{
  if(++count>2000)invalid();const e=record(value,['id','kind','x','y','width','height','points','text','color','stroke']);const elementId=id(e.id);if(elements.has(elementId))invalid();elements.add(elementId)
  if(!['pen','rect','ellipse','text','sticky'].includes(String(e.kind))||typeof e.color!=='string'||!/^#[0-9a-f]{6}$/i.test(e.color))invalid()
  const out:NoteElement={id:elementId,kind:e.kind as NoteElement['kind'],x:number(e.x,1000),y:number(e.y,1000),color:e.color as string,stroke:number(e.stroke,20)}
  if(out.stroke<1)invalid()
  if(e.width!==undefined)out.width=number(e.width,1000);if(e.height!==undefined)out.height=number(e.height,1000)
  if(out.kind==='rect'||out.kind==='ellipse'){if(out.width===undefined||out.height===undefined)invalid()}
  if(e.text!==undefined)out.text=text(e.text,2000)
  if(out.kind==='text'||out.kind==='sticky'){if(!out.text?.trim())invalid()}
  if(e.points!==undefined){if(!Array.isArray(e.points)||e.points.length>2000)invalid();out.points=(e.points as unknown[]).map(v=>{if(++points>50000)invalid();const p=record(v,['x','y']);return{x:number(p.x,1000),y:number(p.y,1000)}})}
  if(out.kind==='pen'&&(!out.points||out.points.length<2))invalid();return out
 })}})
 const active=b.active===null?null:id(b.active);if(active!==null&&!ids.has(active))invalid()
 const result={pages,active};if(JSON.stringify(result).length>2_000_000)invalid();return result
}
