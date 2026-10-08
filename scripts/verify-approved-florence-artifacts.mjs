import fs from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const plan=JSON.parse(await fs.readFile('docs/product/FLORENCE-EVALUATION-20260920.manifest.json','utf8'))
if(process.argv[2]!=='--verify')console.log(JSON.stringify({state:'review-only',files:plan.wheels.length+plan.modelFiles.length,downloads:0,weightsRead:false}))
else{
 const state=JSON.parse(await fs.readFile('/tmp/dam-approved-florence-state.json','utf8'))
 if(state.verified!==true)throw Error('APPROVED_INSTALL_INCOMPLETE')
 for(const [folder,items]of [[path.join(state.root,'wheels'),plan.wheels],[state.models,plan.modelFiles]])for(const item of items){
  if(path.basename(item.filename)!==item.filename)throw Error('ARTIFACT_PATH_INVALID')
  const file=path.join(folder,item.filename),stat=await fs.stat(file),sha=createHash('sha256'),git=createHash('sha1').update(`blob ${item.bytes}\0`)
  if(stat.size!==item.bytes)throw Error('ARTIFACT_SIZE_INVALID')
  for await(const chunk of createReadStream(file)){sha.update(chunk);git.update(chunk)}
  if(item.sha256?sha.digest('hex')!==item.sha256:git.digest('hex')!==item.gitBlobSha1)throw Error('ARTIFACT_HASH_INVALID')
 }
 console.log(JSON.stringify({state:'verified',files:plan.wheels.length+plan.modelFiles.length,totalBytes:plan.totalBytes}))
}
