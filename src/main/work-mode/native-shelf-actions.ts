import { workRecord, workId } from '../../shared/contracts/work-set.contract'
import type { WorkImageTransform, WorkHandoffKind } from '../../shared/contracts/work-media.contract'

export type ShelfAction =
  { kind:'transient'; pending:boolean } |
  { kind:'review-save' } | {kind:'resolve-save'; revision:number} |
  { kind: 'edit'; field: 'name'|'note'|'colors'|'remove'; value: string|string[]; serial:number } |
  { kind: 'retry'|'paste'|'cancel' } |
  { kind: 'focus'; assetId:string } |
  { kind: 'promise'; assetId:string; destination:string; receiptId?:string } |
  { kind: 'drop'; paths:string[] } |
  { kind: 'members'; transfer: { libraryIdentity:string; generation:string; assetIds:string[] } } |
  { kind: 'handoff'; assetIds:string[]; handoffKind:WorkHandoffKind; imageTransform?:WorkImageTransform }
export type ShelfReply = { ok:boolean; message?:string; ack?:number; review?:{revision:number;name:string;note:string;count:number}; receipts?:{id:string;fileName:string;assetId:string}[] }
const fail=():never=>{throw Error('NATIVE_SHELF_ACTION_INVALID')}
const ids=(v:unknown,maximum=64)=>{if(!Array.isArray(v)||!v.length||v.length>maximum)fail();const result=(v as unknown[]).map(workId);if(new Set(result).size!==result.length)fail();return result}
/** Applies only to an owned, source-hash-verified child pipe, never Renderer IPC. */
export function parseShelfAction(value:unknown):ShelfAction {
  const r=workRecord(value,['kind','revision','pending','field','value','serial','assetId','destination','receiptId','paths','transfer','assetIds','handoffKind','imageTransform'])
  if(r.kind==='review-save'){workRecord(r,['kind']);return{kind:'review-save'}}
  if(r.kind==='resolve-save'){workRecord(r,['kind','revision']);if(!Number.isSafeInteger(r.revision)||Number(r.revision)<1)fail();return{kind:'resolve-save',revision:Number(r.revision)}}
  if(r.kind==='transient'){workRecord(r,['kind','pending']);if(typeof r.pending!=='boolean')fail();return{kind:'transient',pending:r.pending as boolean}}
  if(r.kind==='retry'||r.kind==='paste'||r.kind==='cancel'){workRecord(r,['kind']);return{kind:r.kind}}
  if(r.kind==='edit'){
    workRecord(r,['kind','field','value','serial']);if(!Number.isSafeInteger(r.serial)||Number(r.serial)<1||!['name','note','colors','remove'].includes(String(r.field)))fail()
    if(r.field==='colors'||r.field==='remove'){if(!Array.isArray(r.value)||r.value.length>200||r.value.some(v=>typeof v!=='string'||v.length>256))fail()}
    else if(typeof r.value!=='string'||r.value.length>16000)fail()
    return{kind:'edit',field:r.field as 'name'|'note'|'colors'|'remove',value:r.value as string|string[],serial:Number(r.serial)}
  }
  if(r.kind==='focus'){workRecord(r,['kind','assetId']);return{kind:'focus',assetId:workId(r.assetId)}}
  if(r.kind==='promise'){
    workRecord(r,['kind','assetId','destination','receiptId']);if(typeof r.destination!=='string'||!r.destination.startsWith('/')||r.destination.length>4096||r.destination.includes('\0'))fail()
    return{kind:'promise',assetId:workId(r.assetId),destination:r.destination as string,...(r.receiptId?{receiptId:workId(r.receiptId)}:{})}
  }
  if(r.kind==='drop'){
    workRecord(r,['kind','paths']);if(!Array.isArray(r.paths)||!r.paths.length||r.paths.length>200||r.paths.some(p=>typeof p!=='string'||!p.startsWith('/')||p.includes('\0')||p.length>4096))fail()
    return{kind:'drop',paths:r.paths as string[]}
  }
  if(r.kind==='members'){workRecord(r,['kind','transfer']);const t=workRecord(r.transfer,['libraryIdentity','generation','assetIds']);return{kind:'members',transfer:{libraryIdentity:workId(t.libraryIdentity),generation:workId(t.generation),assetIds:ids(t.assetIds,200)}}}
  if(r.kind==='handoff'){
    workRecord(r,['kind','assetIds','handoffKind','imageTransform']);if(!['original','preview','compatible-png','processed-image','zip'].includes(String(r.handoffKind)))fail()
    return{kind:'handoff',assetIds:ids(r.assetIds),handoffKind:r.handoffKind as WorkHandoffKind,...(r.imageTransform?{imageTransform:r.imageTransform as WorkImageTransform}:{})}
  }
  return fail()
}
