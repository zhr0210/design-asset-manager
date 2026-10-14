import { workRecord, workId } from '../../shared/contracts/work-set.contract'
import type { WorkImageTransform, WorkHandoffKind } from '../../shared/contracts/work-media.contract'

export type ShelfAction =
  {kind:'receipt-files';ids:string[]} |
  {kind:'saved-files';assetIds:string[]} |
  {kind:'reference-set';operation:'clear'|'new'|'copy'|'move';name:string;assetIds:string[];expectedRevision:number} |
  {kind:'ocr';assetId:string;operation:'status'|'prepare'|'run'|'read'|'cancel';receipt?:string} |
  {kind:'file-action';id:string;operation:'copy'|'move'|'rename'|'trash';destination?:string} |
  {kind:'system-files';assetIds:string[];expectedRevision:number} |
  {kind:'window-settings';pinned:boolean;indicatorColor:string|null;alwaysShowIndicator:boolean;currentSpaceOnly:boolean} |
  { kind:'transient'; pending:boolean } |
  { kind:'review-save' } | {kind:'resolve-save'; revision:number} |
  { kind: 'edit'; field: 'name'|'remove'; value: string|string[]; serial:number } |
  { kind: 'retry'|'paste'|'cancel' } |
  { kind: 'focus'; assetId:string } |
  { kind: 'promise'; assetId:string; destination:string; receiptId?:string } |
  { kind: 'drop'; paths:string[] } |
  { kind: 'members'; transfer: { libraryIdentity:string; generation:string; assetIds:string[] } } |
  { kind: 'handoff'; assetIds:string[]; handoffKind:WorkHandoffKind; imageTransform?:WorkImageTransform;composition?:{direction:'vertical'|'horizontal';gap:number} }
export type ShelfReply = { value?:unknown; files?:{id:string;assetId:string;fileName:string;file:string}[]; ok:boolean; message?:string; ack?:number; review?:{revision:number;name:string;count:number}; receipts?:{id:string;fileName:string;assetId:string}[] }
const fail=():never=>{throw Error('NATIVE_SHELF_ACTION_INVALID')}
const ids=(v:unknown,maximum=64)=>{if(!Array.isArray(v)||!v.length||v.length>maximum)fail();const result=(v as unknown[]).map(workId);if(new Set(result).size!==result.length)fail();return result}
/** Applies only to an owned, source-hash-verified child pipe, never Renderer IPC. */
export function parseShelfAction(value:unknown):ShelfAction {
  const r=workRecord(value,['kind','ids','name','receipt','id','operation','expectedRevision','pinned','indicatorColor','alwaysShowIndicator','currentSpaceOnly','revision','pending','field','value','serial','assetId','destination','receiptId','paths','transfer','assetIds','handoffKind','imageTransform','composition'])
  if(r.kind==='saved-files'){workRecord(r,['kind','assetIds']);return{kind:'saved-files',assetIds:ids(r.assetIds)}}
  if(r.kind==='receipt-files'){workRecord(r,['kind','ids']);return{kind:'receipt-files',ids:ids(r.ids)}}
  if(r.kind==='reference-set'){workRecord(r,['kind','operation','name','assetIds','expectedRevision']);if(!['clear','new','copy','move'].includes(String(r.operation))||typeof r.name!=='string'||r.name.length>80||!Number.isSafeInteger(r.expectedRevision)||Number(r.expectedRevision)<1||!Array.isArray(r.assetIds)||r.assetIds.length>200)fail();return{kind:'reference-set',operation:r.operation as 'clear'|'new'|'copy'|'move',name:r.name as string,assetIds:(r.assetIds as unknown[]).map(workId),expectedRevision:Number(r.expectedRevision)}}
  if(r.kind==='ocr'){workRecord(r,['kind','operation','assetId','receipt']);if(!['status','prepare','run','read','cancel'].includes(String(r.operation)))fail();return{kind:'ocr',assetId:workId(r.assetId),operation:r.operation as 'status'|'prepare'|'run'|'read'|'cancel',...(r.receipt?{receipt:workId(r.receipt)}:{})}}
  if(r.kind==='file-action'){workRecord(r,['kind','id','operation','destination']);if(!['copy','move','rename','trash'].includes(String(r.operation))||r.destination!==undefined&&(typeof r.destination!=='string'||!r.destination.startsWith('/')||r.destination.length>4096||r.destination.includes('\0')))fail();return{kind:'file-action',id:workId(r.id),operation:r.operation as 'copy'|'move'|'rename'|'trash',...(r.destination?{destination:r.destination as string}:{})}}
  if(r.kind==='system-files'){workRecord(r,['kind','assetIds','expectedRevision']);if(!Number.isSafeInteger(r.expectedRevision)||Number(r.expectedRevision)<1)fail();return{kind:'system-files',assetIds:ids(r.assetIds),expectedRevision:Number(r.expectedRevision)}}
  if(r.kind==='window-settings'){workRecord(r,['kind','pinned','indicatorColor','alwaysShowIndicator','currentSpaceOnly']);if(['pinned','alwaysShowIndicator','currentSpaceOnly'].some(k=>typeof r[k]!=='boolean')||r.indicatorColor!==null&&(typeof r.indicatorColor!=='string'||!/^#[0-9a-f]{6}$/i.test(r.indicatorColor)))fail();return r as Extract<ShelfAction,{kind:'window-settings'}>}
  if(r.kind==='review-save'){workRecord(r,['kind']);return{kind:'review-save'}}
  if(r.kind==='resolve-save'){workRecord(r,['kind','revision']);if(!Number.isSafeInteger(r.revision)||Number(r.revision)<1)fail();return{kind:'resolve-save',revision:Number(r.revision)}}
  if(r.kind==='transient'){workRecord(r,['kind','pending']);if(typeof r.pending!=='boolean')fail();return{kind:'transient',pending:r.pending as boolean}}
  if(r.kind==='retry'||r.kind==='paste'||r.kind==='cancel'){workRecord(r,['kind']);return{kind:r.kind}}
  if(r.kind==='edit'){
    workRecord(r,['kind','field','value','serial']);if(!Number.isSafeInteger(r.serial)||Number(r.serial)<1||!['name','remove'].includes(String(r.field)))fail()
    if(r.field==='remove'){if(!Array.isArray(r.value)||r.value.length>200||r.value.some(v=>typeof v!=='string'||v.length>256))fail()}
    else if(typeof r.value!=='string'||r.value.length>16000)fail()
    return{kind:'edit',field:r.field as 'name'|'remove',value:r.value as string|string[],serial:Number(r.serial)}
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
    workRecord(r,['kind','assetIds','handoffKind','imageTransform','composition']);if(!['original','preview','compatible-png','processed-image','zip','pdf','stitch','ocr-text'].includes(String(r.handoffKind)))fail()
    return{kind:'handoff',assetIds:ids(r.assetIds),handoffKind:r.handoffKind as WorkHandoffKind,...(r.imageTransform?{imageTransform:r.imageTransform as WorkImageTransform}:{}),...(r.composition?{composition:r.composition as {direction:'vertical'|'horizontal';gap:number}}:{})}
  }
  return fail()
}
