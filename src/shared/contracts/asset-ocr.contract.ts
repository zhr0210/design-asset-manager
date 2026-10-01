/** A dedicated recognition result. Empty recognition is valid; failure is never represented as empty. */
export interface OcrBlock {text:string;confidence:number;polygon:Array<[number,number]>}
export interface OcrObservation {
 engine:'rapidocr-onnxruntime';version:'1.4.4';recipe:'rapidocr-preview-v1'
 modelSha256:{det:string;cls:string;rec:string}
 width:number;height:number;elapsedMs:number;threshold:number;blocks:OcrBlock[]
}
export function validateOcrObservation(input:unknown):OcrObservation {
 const fail=():never=>{throw Error('OCR_RESULT_INVALID')}
 if(!input||typeof input!=='object'||Array.isArray(input))return fail()
 const r=input as OcrObservation
 if(r.engine!=='rapidocr-onnxruntime'||r.version!=='1.4.4'||r.recipe!=='rapidocr-preview-v1'||
   !Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<1||r.height<1||r.width>1600||r.height>1600||
   !Number.isFinite(r.elapsedMs)||r.elapsedMs<0||r.elapsedMs>120000||r.threshold!==.5||
   !r.modelSha256||!['det','cls','rec'].every(k=>/^[a-f0-9]{64}$/.test(r.modelSha256[k as keyof typeof r.modelSha256]))||
   !Array.isArray(r.blocks)||r.blocks.length>500)return fail()
 let chars=0
 const blocks=r.blocks.map(b=>{
  if(!b||typeof b.text!=='string'||!b.text.trim()||b.text.length>2000||!Number.isFinite(b.confidence)||b.confidence<r.threshold||b.confidence>1||!Array.isArray(b.polygon)||b.polygon.length!==4)return fail()
  chars+=b.text.length;if(chars>16000)return fail()
  const polygon=b.polygon.map(p=>{if(!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))return fail();return [p[0],p[1]] as [number,number]})
  const area=Math.abs(polygon.reduce((sum,p,i)=>sum+p[0]*polygon[(i+1)%4][1]-polygon[(i+1)%4][0]*p[1],0));if(area<1e-10)return fail()
  return{text:b.text,confidence:b.confidence,polygon}
 })
 return{engine:r.engine,version:r.version,recipe:r.recipe,modelSha256:{det:r.modelSha256.det,cls:r.modelSha256.cls,rec:r.modelSha256.rec},width:r.width,height:r.height,elapsedMs:r.elapsedMs,threshold:.5,blocks}
}
export const ocrText=(result:OcrObservation)=>result.blocks.map(b=>b.text).join('\n')

export interface OcrScope {libraryIdentity:string;generation:string;assetId:string}
export interface OcrEvidence {id:string;assetId:string;assetRevision:string;sourceRef:string;inputSha256:string;createdAt:string;observation:OcrObservation}
export interface OcrSummary {evidenceId:string;revision:number;text:string;sourceText:string;edited:boolean;engine:string;version:string;createdAt:string;blockCount:number}
export interface OcrSnapshot {sessionToken:string;revision:number;requiresUpgrade:boolean;evidence:OcrEvidence|null;editedText:string|null}
export interface OcrCommit extends OcrScope {sessionToken:string;expectedRevision:number;allowUpgrade:boolean;evidence:OcrEvidence}
export interface OcrCorrection extends OcrScope {sessionToken:string;expectedRevision:number;evidenceId:string;text:string|null}
export interface OcrJob {id:string;libraryIdentity:string;generation:string;state:'running'|'completed'|'partial'|'failed'|'cancelled';items:Array<{assetId:string;state:'queued'|'running'|'completed'|'failed'|'cancelled';error?:string}>}
export interface OcrReview {receipt:string;count:number;requiresUpgrade:boolean;runtimeLabel:string}
export type OcrResponse<T>={ok:true;value:T}|{ok:false;error:string}
export interface OcrStatus {configured:boolean;label:string;job:OcrJob|null}
export interface OcrApi {
 status():Promise<OcrResponse<OcrStatus>>
 configure():Promise<OcrResponse<OcrStatus>>
 read(scope:OcrScope):Promise<OcrResponse<OcrSnapshot>>
 prepare(input:Omit<OcrScope,'assetId'>&{assetIds:string[]}):Promise<OcrResponse<OcrReview>>
 run(receipt:string):Promise<OcrResponse<OcrJob>>
 cancel():Promise<OcrResponse<OcrJob|null>>
 correct(input:OcrCorrection):Promise<OcrResponse<OcrSnapshot>>
 onChanged(listener:(scope:OcrScope)=>void):()=>void
}
export const OCR_STATUS='asset-ocr:status',OCR_CONFIGURE='asset-ocr:configure',OCR_READ='asset-ocr:read',OCR_PREPARE='asset-ocr:prepare',OCR_RUN='asset-ocr:run',OCR_CANCEL='asset-ocr:cancel',OCR_CORRECT='asset-ocr:correct',OCR_CHANGED='asset-ocr:changed'
