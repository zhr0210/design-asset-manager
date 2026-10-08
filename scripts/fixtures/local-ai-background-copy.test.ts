import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import Database from 'better-sqlite3'

// Setup only: a recoverable copy of the explicitly authorized public Library.
// No profile, settings, authentication or executable requests are copied/read.
const parent=path.resolve('.scratch/local-ai-implementation-20261006')
const source=path.resolve('.scratch/b-model-management-20261006/real-library-01')
const root=path.join(parent,'background-'+randomUUID()),library=path.join(root,'library'),sources=path.join(root,'sources')
assert.equal(path.dirname(root),parent)
await fs.mkdir(root)
await fs.cp(source,library,{recursive:true,force:false,errorOnExist:true,filter:async file=>{
  const stat=await fs.lstat(file);assert.equal(stat.isSymbolicLink(),false)
  return !/-wal$|-shm$/.test(file)
}})
const sourceControl=path.join(source,'.dam'),control=path.join(library,'.dam')
for(const name of await fs.readdir(sourceControl))if(name.endsWith('.sqlite')){
  const original=new Database(path.join(sourceControl,name),{readonly:true,fileMustExist:true})
  const target=path.join(control,name);assert.equal(path.dirname(target),control)
  await fs.unlink(target)
  try{await original.backup(target)}finally{original.close()}
}
const db=new Database(path.join(control,'library.sqlite'),{readonly:true,fileMustExist:true})
await fs.mkdir(sources)
const files=[]
try{
  assert.equal(db.pragma('integrity_check',{simple:true}),'ok')
  for(const [title,filename] of [['public-04-coffee','T14-coffee.png'],['public-08-wood','T14-wood.jpg'],['public-06-page','T14-page.png']]){
    const entry=(await fs.readdir(path.join(source,'Originals','bucket-0001'))).find(name=>name.startsWith(title+'-'))!
    assert.ok(entry)
    const bytes=await fs.readFile(path.join(source,'Originals','bucket-0001',entry))
    await fs.writeFile(path.join(sources,filename),bytes,{flag:'wx'})
    files.push({title,filename,sha256:createHash('sha256').update(bytes).digest('hex')})
  }
  const result={root,library,sources,scope:'authorized public recoverable copy only',assets:db.prepare('SELECT count(*) FROM assets').pluck().get(),files}
  await fs.writeFile(path.join(root,'setup.json'),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
}finally{db.close()}
