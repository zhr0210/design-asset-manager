import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'

const root=path.resolve('.scratch/c-search-20261007'),control=path.join(root,'library','.dam'),evidence=path.join(root,'evidence')
const registry=JSON.parse(await fs.readFile(path.join(control,'.dam-asset-retrieval.json'),'utf8')) as {canonical:string;index:string}
const owned=(name:string,prefix:string)=>{assert.match(name,new RegExp(`^${prefix}-[a-f0-9-]{36}\\.sqlite$`));return path.join(control,name)}
const db=new Database(owned(registry.canonical,'asset-vectors'),{readonly:true,fileMustExist:true})
const index=new Database(owned(registry.index,'asset-vector-index'),{readonly:true,fileMustExist:true})
try{
 assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert.equal(index.pragma('integrity_check',{simple:true}),'ok')
 const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
 const space=String(db.prepare("SELECT value FROM meta WHERE key='active'").pluck().get())
 const rows=db.prepare('SELECT * FROM vectors ORDER BY space,id,view').all(),jobs=db.prepare('SELECT * FROM jobs ORDER BY id').all()
 const result={at:new Date().toISOString(),space,canonicalVectors:rows.length,canonicalSha256:hash(rows),jobsSha256:hash(jobs),jobs:jobs.length,
  running:Number(db.prepare("SELECT COUNT(*) FROM jobs WHERE state='running'").pluck().get()),currentIndexed:Number(index.prepare('SELECT COUNT(*) FROM vectors WHERE space=?').pluck().get(space)),index:registry.index}
 assert.equal(result.running,0);assert.equal(result.currentIndexed,45)
 const baseline=path.join(evidence,'derived-before-reopen.json')
 let before:typeof result|null=null
 try{before=JSON.parse(await fs.readFile(baseline,'utf8'))}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
 if(before){assert.equal(result.space,before.space);assert.equal(result.canonicalSha256,before.canonicalSha256,'Reopen and queries must not silently regenerate persisted vectors');assert.equal(result.jobsSha256,before.jobsSha256,'Reopen must not create or rerun generation jobs')}
 await fs.writeFile(before?path.join(evidence,'derived-after-reopen.json'):baseline,JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{index.close();db.close()}
