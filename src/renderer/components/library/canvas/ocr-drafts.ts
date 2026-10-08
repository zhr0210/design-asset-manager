import type {OcrSnapshot} from '../../../../shared/contracts/asset-ocr.contract'
import {holdWorkspaceDraft,removeWorkspaceDraft} from '../../../workspace-drafts'
interface OcrDraftBase { revision:number; evidenceId?:string }
const drafts=new Map<string,{snapshot:OcrSnapshot;text:string;base:OcrDraftBase;mismatch:boolean}>()
export const ocrDraftKey=(scope:{libraryIdentity:string;generation:string;assetId:string})=>JSON.stringify([scope.libraryIdentity,scope.generation,scope.assetId])
export const getOcrDraft=(key:string)=>drafts.get(key)
const scopeOf=(key:string)=>{const [libraryIdentity,generation,entityId]=JSON.parse(key);return{libraryIdentity,generation,entityId,kind:'ocr' as const}}
const baseOf=(snapshot:OcrSnapshot):OcrDraftBase=>({revision:snapshot.revision,evidenceId:snapshot.evidence?.id})
const differs=(base:OcrDraftBase,snapshot:OcrSnapshot)=>base.revision!==snapshot.revision||base.evidenceId!==snapshot.evidence?.id
export const restoreOcrDraft=(key:string,snapshot:OcrSnapshot,text:string,base:OcrDraftBase)=>{drafts.set(key,{snapshot,text,base:structuredClone(base),mismatch:differs(base,snapshot)});holdWorkspaceDraft(scopeOf(key),text,base)}
export const holdOcrDraft=(key:string,snapshot:OcrSnapshot,text:string)=>{const retained=drafts.get(key);const base=retained?.base??baseOf(snapshot);drafts.set(key,{snapshot,text,base,mismatch:retained?.mismatch??differs(base,snapshot)});holdWorkspaceDraft(scopeOf(key),text,base)}
export const updateOcrDraftMismatch=(key:string,snapshot:OcrSnapshot)=>{const retained=drafts.get(key);if(retained)retained.mismatch=differs(retained.base,snapshot);return retained?.mismatch??false}
export const adoptOcrDraftBaseline=(key:string,snapshot:OcrSnapshot,text:string)=>restoreOcrDraft(key,snapshot,text,baseOf(snapshot))
export const discardOcrDraft=(key:string)=>{drafts.delete(key);removeWorkspaceDraft(scopeOf(key))}
export const hasUnsavedOcrDrafts=()=>drafts.size>0
export const clearOcrDrafts=()=>drafts.clear()
