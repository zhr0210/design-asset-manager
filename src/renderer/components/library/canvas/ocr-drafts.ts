import type {OcrSnapshot} from '../../../../shared/contracts/asset-ocr.contract'
const drafts=new Map<string,{snapshot:OcrSnapshot;text:string}>()
export const ocrDraftKey=(scope:{libraryIdentity:string;generation:string;assetId:string})=>JSON.stringify([scope.libraryIdentity,scope.generation,scope.assetId])
export const getOcrDraft=(key:string)=>drafts.get(key)
export const holdOcrDraft=(key:string,snapshot:OcrSnapshot,text:string)=>{drafts.set(key,{snapshot,text})}
export const discardOcrDraft=(key:string)=>{drafts.delete(key)}
export const hasUnsavedOcrDrafts=()=>drafts.size>0
export const clearOcrDrafts=()=>drafts.clear()
