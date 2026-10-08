import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import Database from 'better-sqlite3'

// Engineering setup only. Exact authorized public contents; no App/profile or
// credentials. Failure experiments are restricted to new recoverable copies.
const parent=path.resolve('.scratch/local-ai-implementation-20261006')
const source=path.resolve('.scratch/b-model-management-20261006/real-library-01')
const root=path.join(parent,'recovery-'+randomUUID())
assert.equal(path.dirname(root),parent)
await fs.mkdir(root)
async function copyLibrary(name:string){
 const destination=path.join(root,name)
 await fs.cp(source,destination,{recursive:true,force:false,errorOnExist:true,filter:async file=>{
  const stat=await fs.lstat(file);assert.equal(stat.isSymbolicLink(),false)
  return !/-wal$|-shm$/.test(file)
 }})
 const control=path.join(source,'.dam'),out=path.join(destination,'.dam')
 for(const name of await fs.readdir(control))if(name.endsWith('.sqlite')){
  const db=new Database(path.join(control,name),{readonly:true,fileMustExist:true})
  const target=path.join(out,name);assert.equal(path.dirname(target),out)
  await fs.unlink(target)
  try{await db.backup(target)}finally{db.close()}
 }
 const db=new Database(path.join(out,'library.sqlite'),{readonly:true,fileMustExist:true})
 try{assert.equal(db.pragma('integrity_check',{simple:true}),'ok')}finally{db.close()}
 return destination
}
const damaged=await copyLibrary('damaged-index-library'),scale=await copyLibrary('scale-library')
const control=path.join(damaged,'.dam')
const text=JSON.parse(await fs.readFile(path.join(control,'.dam-asset-search.json'),'utf8'))
const vector=JSON.parse(await fs.readFile(path.join(control,'.dam-asset-retrieval.json'),'utf8'))
for(const filename of [text.file,vector.index]){
 assert.match(filename,/^(asset-search|asset-vector-index)-[a-f0-9-]{36}\.sqlite$/)
 const target=path.resolve(control,filename);assert.equal(path.dirname(target),control)
 await fs.writeFile(target,Buffer.from('intentional derived-index damage on an authorized copy only'))
}
const canonical=new Database(path.join(control,vector.canonical),{readonly:true,fileMustExist:true})
let spaces
try{assert.equal(canonical.pragma('integrity_check',{simple:true}),'ok');spaces=canonical.prepare('SELECT space,count(*) AS vectors FROM vectors GROUP BY space').all()}finally{canonical.close()}
const originals=path.join(source,'Originals','bucket-0001')
const filename=(await fs.readdir(originals)).find(n=>n.startsWith('public-04-coffee-'))!
assert.ok(filename)
const bytes=await fs.readFile(path.join(originals,filename)),sha256=createHash('sha256').update(bytes).digest('hex')
const scaleSources=path.join(root,'scale-sources');await fs.mkdir(scaleSources)
for(let n=1;n<=120;n++)await fs.writeFile(path.join(scaleSources,`规模-咖啡-${String(n).padStart(3,'0')}.png`),bytes,{flag:'wx'})
const result={scope:'authorized public library recoverable copies only',root,damaged,scale,scaleSources,scaleCopies:120,sourceSha256:sha256,spaces,
 scaleMeaning:'120 filename copies of one actual public coffee image; pagination fixture, not independent quality samples',damage:'derived text/vector indexes only; canonical vectors and source metadata remain valid'}
await fs.writeFile(path.join(root,'setup.json'),JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
