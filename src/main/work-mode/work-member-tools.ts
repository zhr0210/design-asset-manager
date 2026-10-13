import type { ActiveLibraryHost } from '../../shared/contracts/active-library.contract'
import {workRecord,workId,type WorkScope} from '../../shared/contracts/work-set.contract'
import type {createVisualAiController} from '../visual-ai/visual-ai-controller'
import type {createOcrController} from '../ocr/ocr-controller'
import {measurePreviewColors} from '../library-lifecycle/measure-preview-colors'
import {memberImageMetadata} from './member-image-metadata'

/** No Workspace client is installed in a preview. Each call is confined to one member. */
export function createWorkMemberTools(deps:{host:ActiveLibraryHost;visual:()=>ReturnType<typeof createVisualAiController>|undefined;ocr:()=>ReturnType<typeof createOcrController>|undefined}) {
 const receipts=new Map<string,{owner:string;assetId:string;kind:'ai'|'ocr'}>(),jobs=new Map<string,{owner:string;assetId:string;kind:'ai'|'ocr'}>()
 const call=async(c:{owner:string;scope:WorkScope;assetId:string;check:()=>void},operation:string,input:unknown)=>{
  c.check();const visual=deps.visual(),ocr=deps.ocr(),scope={...c.scope,assetId:c.assetId},q=input??{}
  const owned=(id:unknown,kind:'ai'|'ocr',source=receipts)=>{const key=workId(id),record=source.get(key);if(record?.owner!==c.owner||record.assetId!==c.assetId||record.kind!==kind)throw Error('此操作不属于当前素材窗口。');return key}
  let result:unknown
  if(operation==='details'){const asset=(await deps.host.readAssetContext([c.assetId])).assets[0];if(!asset)throw Error('素材不可用');let dimensions={width:asset.width,height:asset.height};try{dimensions=await memberImageMetadata(deps.host,asset)}catch{/* Unknown source dimensions stay unknown. */}result={...asset,...dimensions}}
  else if(operation==='colors')result=await measurePreviewColors(await deps.host.readPreview(c.assetId))
  else if(operation==='ai-backends'){if(!visual)throw Error('AI服务未就绪');result=visual.backends()}
  else if(operation==='ai-results'){if(!visual)throw Error('AI服务未就绪');result=await deps.host.listVisualAiEvidence(c.assetId)}
  else if(operation==='ai-prepare'){
   if(!visual)throw Error('AI服务未就绪');const p=workRecord(q,['backendId','model','purpose']);if(typeof p.backendId!=='string'||!['analyze','reverse'].includes(String(p.purpose))||p.model!==undefined&&typeof p.model!=='string')throw Error('AI参数无效')
   const r=await visual.prepare(c.owner,{...c.scope,assetIds:[c.assetId],backendId:p.backendId,model:p.model as string|undefined,purpose:p.purpose as 'analyze'|'reverse'});receipts.set(r.receipt,{owner:c.owner,assetId:c.assetId,kind:'ai'});result=r
  }else if(operation==='ai-discard'){if(!visual)throw Error('AI服务未就绪');const p=workRecord(q,['receipt']);visual.discardReview(c.owner,owned(p.receipt,'ai'));result=null}
  else if(operation==='ai-run'){if(!visual)throw Error('AI服务未就绪');const p=workRecord(q,['receipt']);const r=await visual.run(c.owner,owned(p.receipt,'ai'));jobs.set(r.id,{owner:c.owner,assetId:c.assetId,kind:'ai'});result=r}
  else if(operation==='ai-inspect'||operation==='ai-cancel'){if(!visual)throw Error('AI服务未就绪');const p=workRecord(q,['id']),id=owned(p.id,'ai',jobs);result=operation==='ai-inspect'?visual.inspect(c.owner,id):visual.cancel(c.owner,id)}
  else if(operation==='ai-confirm-tag'){if(!visual)throw Error('AI服务未就绪');const p=workRecord(q,['evidenceId','tag']);if(typeof p.tag!=='string')throw Error('标签无效');await deps.host.confirmVisualAiTag(c.assetId,workId(p.evidenceId),p.tag);result=null}
  else if(operation==='ocr-status'){if(!ocr)throw Error('OCR服务未就绪');const status=await ocr.status();result={...status,job:status.job&&jobs.get(status.job.id)?.owner===c.owner?status.job:null}}
  else if(operation==='ocr-read'){if(!ocr)throw Error('OCR服务未就绪');result=await ocr.read(scope)}
  else if(operation==='ocr-prepare'){if(!ocr)throw Error('OCR服务未就绪');const r=await ocr.prepare({...c.scope,assetIds:[c.assetId]});receipts.set(r.receipt,{owner:c.owner,assetId:c.assetId,kind:'ocr'});result=r}
  else if(operation==='ocr-run'){if(!ocr)throw Error('OCR服务未就绪');const p=workRecord(q,['receipt']);const r=await ocr.run(owned(p.receipt,'ocr'));jobs.set(r.id,{owner:c.owner,assetId:c.assetId,kind:'ocr'});result=r}
  else if(operation==='ocr-cancel'){if(!ocr)throw Error('OCR服务未就绪');const job=(await ocr.status()).job;if(job&&jobs.get(job.id)?.owner!==c.owner)throw Error('不能取消其他窗口的OCR操作。');result=await ocr.cancel()}
  else if(operation==='ocr-correct'){if(!ocr)throw Error('OCR服务未就绪');const p=workRecord(q,['sessionToken','expectedRevision','evidenceId','text']);result=await ocr.correct({...scope,sessionToken:workId(p.sessionToken),expectedRevision:Number(p.expectedRevision),evidenceId:workId(p.evidenceId),text:p.text as string|null})}
  else throw Error('当前窗口未提供此素材操作。')
  c.check();return result
 }
 return{call,retire:(owner:string)=>{deps.visual()?.cancelOwner(owner);const ownedJobs=new Set([...jobs].filter(([,j])=>j.owner===owner&&j.kind==='ocr').map(([id])=>id));void deps.ocr()?.status().then(status=>{if(status.job&&ownedJobs.has(status.job.id))void deps.ocr()?.cancel()}).catch(()=>{});for(const[key,r]of receipts)if(r.owner===owner)receipts.delete(key);for(const[key,r]of jobs)if(r.owner===owner)jobs.delete(key)}}
}
