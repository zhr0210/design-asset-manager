import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import type Database from 'better-sqlite3'
import {runLocalOcr} from './local-ocr-process'
import type {OcrObservation} from '../../shared/contracts/asset-ocr.contract'
export interface OcrRuntimeHandle {label:string;fingerprint:string;run(preview:Uint8Array,signal:AbortSignal):Promise<OcrObservation>}
export interface OcrRuntime {current():Promise<OcrRuntimeHandle|null>;configure():Promise<void>}
/** Runtime selection is explicit. Model execution starts only after the per-batch review. */
export function createOcrRuntime(deps:{database:Database.Database;runner:string;selectRoot():Promise<string|null>}):OcrRuntime{
 deps.database.exec('CREATE TABLE IF NOT EXISTS local_ocr_runtime(singleton INTEGER PRIMARY KEY CHECK(singleton=1),root TEXT NOT NULL)')
 const read=async(root:string):Promise<OcrRuntimeHandle>=>{
  const real=await fs.realpath(root),manifest=await fs.readFile(path.join(real,'ocr-runtime.json'),'utf8')
  if(manifest.length>16000)throw Error('OCR_RUNTIME_INVALID')
  const config=JSON.parse(manifest),relative=process.platform==='win32'?'runtime/Scripts/python.exe':'runtime/bin/python3'
  if(config.schema!==1||config.engine!=='rapidocr-onnxruntime'||config.version!=='1.4.4'||config.platform!==process.platform||config.arch!==process.arch||config.pythonRelative!==relative||!config.modelSha256||!['det','cls','rec'].every(k=>/^[a-f0-9]{64}$/.test(config.modelSha256[k])))throw Error('OCR_RUNTIME_INVALID')
  const python=path.join(real,relative);await fs.access(python)
  const fingerprint=createHash('sha256').update(real+'\n'+manifest).digest('hex')
  return{label:'RapidOCR · 本地 CPU · 中文/英文',fingerprint,run:async(preview,signal)=>{
   const value=await runLocalOcr({python,runner:deps.runner,preview,signal,modelSha256:config.modelSha256})
   if(!['det','cls','rec'].every(k=>value.modelSha256[k as keyof typeof value.modelSha256]===config.modelSha256[k]))throw Error('OCR_MODEL_CHANGED')
   return value
  }}
 }
 return{current:async()=>{const config=deps.database.prepare('SELECT root FROM local_ocr_runtime WHERE singleton=1').get() as {root:string}|undefined;if(!config)return null;try{return await read(config.root)}catch{return null}},configure:async()=>{const root=await deps.selectRoot();if(!root)return;await read(root);deps.database.prepare('INSERT INTO local_ocr_runtime VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET root=excluded.root').run(root)}}
}
