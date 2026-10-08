import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'

const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
/** Exact historical input bytes; a Windows checkout representation is verified
 * against Git's own filters instead of weakening the frozen SHA assertion. */
export async function readFrozenLibrarySource(folder:string,manifest:Record<string,string|{sha256:string}>) {
 const result:Record<string,string>={}
 for(const [name,record] of Object.entries(manifest)) {
  assert.match(name,/^[A-Za-z0-9._-]+\.ts$/u)
  const file=path.join(folder,name+'.txt'),relative=path.relative(process.cwd(),file).split(path.sep).join('/')
  assert.match(relative,/^scripts\/fixtures\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.ts\.txt$/u)
  const expected=typeof record==='string'?record:record.sha256,working=await fs.readFile(file)
  assert.match(expected,/^[a-f0-9]{64}$/u)
  let exact=working
  if(sha(working)!==expected) {
   exact=execFileSync('git',['cat-file','blob','HEAD:'+relative],{windowsHide:true,maxBuffer:1048576})
   assert.equal(sha(exact),expected,'The original frozen blob must match the unchanged manifest')
   const checkout=execFileSync('git',['cat-file','--filters','HEAD:'+relative],{windowsHide:true,maxBuffer:1048576})
   assert.deepEqual(working,checkout,'Working fixture changes cannot be hidden by checkout conversion')
  }
  assert.equal(sha(exact),expected)
  result[name]=exact.toString('utf8')
 }
 return result
}
