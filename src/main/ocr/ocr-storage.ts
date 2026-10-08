import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'
import {ActiveLibraryHostError} from '../../shared/contracts/active-library.contract'
import type Database from 'better-sqlite3'
import {validateOcrObservation,ocrText,type OcrScope,type OcrSnapshot,type OcrCommit,type OcrCorrection,type OcrEvidence,type OcrSummary} from '../../shared/contracts/asset-ocr.contract'
import {enableOcrStorage} from './ocr.schema'
interface Binding{identity:string;generation:string;notebookSession:string;database:Database.Database}
interface Row{evidence_id:string;revision:number;edited_text:string|null;asset_revision:string;source_ref:string;input_sha256:string;observation_json:string;created_at:string}
const fail=(message:string):never=>{throw new ActiveLibraryHostError('library-operation-failed',message)}
export function requireOcrScope(a:Binding,s:OcrScope){if(!s||s.libraryIdentity!==a.identity||s.generation!==a.generation||typeof s.assetId!=='string'||!s.assetId||s.assetId.length>256)fail('OCR_SCOPE_EXPIRED');const row=a.database.prepare(`SELECT l.revision,c.grid_thumbnail_ref AS sourceRef FROM asset_lifecycle l JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE l.design_asset_identity=? AND l.lifecycle_state='active'`).get(s.assetId) as {revision:string;sourceRef:string}|undefined;if(!row)fail('OCR_ASSET_UNAVAILABLE');return row!}
function row(db:Database.Database,id:string){if(!isKnownLibrarySchemaVersion(Number(db.pragma('user_version',{simple:true})),8))return undefined;return db.prepare(`SELECT s.*,e.asset_revision,e.source_ref,e.input_sha256,e.observation_json,e.created_at FROM asset_ocr_state s JOIN asset_ocr_evidence e ON e.id=s.evidence_id WHERE s.asset_id=?`).get(id) as Row|undefined}
export function readOcr(a:Binding,s:OcrScope):OcrSnapshot{const current=requireOcrScope(a,s),r=row(a.database,s.assetId);let evidence:OcrEvidence|null=null;if(r&&r.source_ref===current.sourceRef)evidence={id:r.evidence_id,assetId:s.assetId,assetRevision:r.asset_revision,sourceRef:r.source_ref,inputSha256:r.input_sha256,createdAt:r.created_at,observation:validateOcrObservation(JSON.parse(r.observation_json))};return{sessionToken:a.notebookSession,revision:r?.revision??0,requiresUpgrade:Number(a.database.pragma('user_version',{simple:true}))<8,evidence,editedText:evidence?r?.edited_text??null:null}}
export function commitOcr(a:Binding,r:OcrCommit,signal?:AbortSignal){return a.database.transaction(()=>{
 const current=requireOcrScope(a,r),before=readOcr(a,r),e=r.evidence
 if(signal?.aborted||r.sessionToken!==a.notebookSession)fail('OCR_SCOPE_EXPIRED')
 if(before.revision!==r.expectedRevision)fail('OCR_RESULT_CONFLICT')
 if(!e||e.assetId!==r.assetId||e.assetRevision!==current.revision||e.sourceRef!==current.sourceRef)fail('OCR_SOURCE_CHANGED')
 if(typeof e.id!=='string'||!/^[a-zA-Z0-9:._-]{1,256}$/.test(e.id)||!/^[a-f0-9]{64}$/.test(e.inputSha256)||!Number.isFinite(Date.parse(e.createdAt)))fail('OCR_RESULT_INVALID')
 const observation=validateOcrObservation(e.observation),previous=row(a.database,r.assetId)
 if(previous?.edited_text!==null&&previous?.edited_text!==undefined&&previous.source_ref!==e.sourceRef)fail('OCR_EDITED_SOURCE_CHANGED')
 if(before.requiresUpgrade&&!r.allowUpgrade)fail('OCR_UPGRADE_REQUIRED')
 enableOcrStorage(a.database)
 a.database.prepare('INSERT INTO asset_ocr_evidence VALUES(?,?,?,?,?,?,?)').run(e.id,r.assetId,e.assetRevision,e.sourceRef,e.inputSha256,JSON.stringify(observation),e.createdAt)
 a.database.prepare('INSERT INTO asset_ocr_state VALUES(?,?,?,?) ON CONFLICT(asset_id) DO UPDATE SET evidence_id=excluded.evidence_id,revision=excluded.revision').run(r.assetId,e.id,before.revision+1,null)
 return readOcr(a,r)
})()}
export function correctOcr(a:Binding,r:OcrCorrection){return a.database.transaction(()=>{
 const current=readOcr(a,r)
 if(r.sessionToken!==a.notebookSession)fail('OCR_SCOPE_EXPIRED')
 if(!current.evidence||current.revision!==r.expectedRevision||current.evidence.id!==r.evidenceId)fail('OCR_RESULT_CONFLICT')
 if(r.text!==null&&(typeof r.text!=='string'||r.text.length>16000))fail('OCR_TEXT_INVALID')
 a.database.prepare('UPDATE asset_ocr_state SET edited_text=?,revision=revision+1 WHERE asset_id=?').run(r.text,r.assetId)
 return readOcr(a,r)
})()}
export function summaryFromOcrRow(r:Row):OcrSummary{const observation=validateOcrObservation(JSON.parse(r.observation_json));const sourceText=ocrText(observation);return{evidenceId:r.evidence_id,revision:r.revision,text:r.edited_text??sourceText,sourceText,edited:r.edited_text!==null,engine:observation.engine,version:observation.version,createdAt:r.created_at,blockCount:observation.blocks.length}}
