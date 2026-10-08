import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
const root=path.resolve('.scratch/c-search-20261007'),library=path.join(root,'library'),evidence=path.join(root,'evidence')
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex')
const db=new Database(path.join(library,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
try{
 db.exec('BEGIN');assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.deepEqual(db.pragma('foreign_key_check'),[])
 const rows=db.prepare('SELECT id,title,ai_caption,ai_caption_is_user_edited FROM assets ORDER BY id').all() as {id:string;title:string;ai_caption:string;ai_caption_is_user_edited:number}[]
 const protectedRows=rows.filter(row=>!row.title.startsWith('C-search-'))
 const tags=db.prepare("SELECT * FROM asset_tags WHERE status='confirmed' ORDER BY id").all()
 const tables=['basic_analysis_requests','basic_analysis_attempts','basic_analysis_evidence','background_analysis_executions','background_analysis_execution_history']
 const counts:Record<string,unknown>={},executionSignatures:Record<string,string>={}
 for(const table of tables){counts[table]=db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();executionSignatures[table]=sha(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()))}
 // Finish the short SQL snapshot before hashing media asynchronously. A read
 // transaction must not remain held while the live Host performs new work.
 db.exec('ROLLBACK');db.close()
 // Compare the full execution records (including unknown/sent state), not only
 // their counts, with the closed public source used to make this C copy.
 const setup=JSON.parse(await fs.readFile(path.join(root,'setup.json'),'utf8')) as {source:string;sourceDbSha256:string}
 const source=path.resolve(setup.source),allowedSource=path.resolve('.scratch/local-ai-implementation-20261006')
 assert.ok(source.startsWith(allowedSource+path.sep)&&path.basename(source)==='scale-library')
 const sourceFile=path.join(source,'.dam','library.sqlite')
 assert.equal(sha(await fs.readFile(sourceFile)),setup.sourceDbSha256,'The closed public source remains the exact copy baseline')
 const sourceDb=new Database(sourceFile,{readonly:true,fileMustExist:true})
 try{for(const table of tables)assert.equal(executionSignatures[table],sha(JSON.stringify(sourceDb.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())),table+' execution records remain intact, including unknown state')}
 finally{sourceDb.close()}
 const files:Record<string,string>={}
 const walk=async(directory:string)=>{for(const entry of await fs.readdir(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name)
   if(entry.isDirectory())await walk(filename);else if(entry.isFile())files[path.relative(library,filename)]=sha(await fs.readFile(filename))}}
 await walk(path.join(library,'Originals'));await walk(path.join(library,'.dam','required-previews'))
 const baselineFile=path.join(evidence,'library-before.json')
 let baseline:{protectedRows:unknown;tags:unknown;files:Record<string,string>;counts:unknown}|null=null
 try{baseline=JSON.parse(await fs.readFile(baselineFile,'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
 if(!baseline)await fs.writeFile(baselineFile,JSON.stringify({at:new Date().toISOString(),protectedRows,tags,files,counts},null,2))
 else{
   assert.deepEqual(protectedRows,baseline.protectedRows,'All original copied assets, captions and human flags remain intact')
   assert.deepEqual(tags,baseline.tags,'Confirmed original tag relations remain intact')
   for(const [filename,digest]of Object.entries(baseline.files))assert.equal(files[filename],digest,'Original and required preview bytes remain intact')
   assert.deepEqual(counts,baseline.counts,'Search and reopen must not create repeated analysis effects')
 }
 const result={at:new Date().toISOString(),baselineCreated:!baseline,assets:rows.length,protectedAssets:protectedRows.length,protectedFiles:baseline?Object.keys(baseline.files).length:Object.keys(files).length,
  counts,executionSignatures,colourSubjects:rows.filter(row=>/red|blue|双色|红|蓝/i.test(row.title)).map(({id,title})=>({id,title})),cTargets:rows.filter(row=>row.title.startsWith('C-search-')).map(({id,title,ai_caption})=>({id,title,caption:ai_caption})),checks:'integrity/FK, original public-copy metadata, tags, media and complete execution records; readonly'}
 await fs.writeFile(path.join(evidence,baseline?'library-after.json':'library-baseline-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{if(db.open){if(db.inTransaction)db.exec('ROLLBACK');db.close()}}
