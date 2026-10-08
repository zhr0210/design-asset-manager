import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'

const root=path.resolve('.scratch/c-search-20261007'),library=path.join(root,'schema-ui-library')
const db=new Database(path.join(library,'.dam','library.sqlite'),{readonly:true,fileMustExist:true})
try{
 assert.equal(db.pragma('integrity_check',{simple:true}),'ok')
 assert.deepEqual(db.pragma('foreign_key_check'),[])
 assert.equal(db.pragma('user_version',{simple:true}),14)
 assert.equal(db.prepare('SELECT COUNT(*) FROM assets').pluck().get(),1)
 const counts:Record<string,unknown>={}
 for(const table of ['basic_analysis_requests','basic_analysis_attempts','basic_analysis_evidence','background_analysis_intents','background_analysis_executions']){
  counts[table]=db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();assert.equal(counts[table],0,'No backfill or analysis during schema coordination acceptance')
 }
 const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),hashes:string[]=[]
 const walk=async(p:string)=>{for(const f of await fs.readdir(p,{withFileTypes:true})){const q=path.join(p,f.name);if(f.isDirectory())await walk(q);else if(f.isFile())hashes.push(sha(await fs.readFile(q)))}}
 db.close()
 await walk(path.join(library,'Originals'))
 assert.deepEqual(hashes,['51564e1c293b9a32de7364dca129d63b005ceaa9ed7ea1357e55cf2f5da8d22d'])
 const result={at:new Date().toISOString(),scope:'ordinary Browser first-search then v12 plan/v14 OCR-rule enable; read-only confirmation',schema:14,assets:1,counts,sourceBytesPreserved:true}
 await fs.writeFile(path.join(root,'evidence/schema-after-search-readback.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{if(db.open)db.close()}
