// Real stock Worker and designated public ModelScope inventory; no active DB writes or UI claim.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {StringDecoder} from 'node:string_decoder'
import {once} from 'node:events'
import Database from 'better-sqlite3'
import {createLocalAiDeviceSampler} from '../src/main/local-ai-resources/device-sampler'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {verifyTransferredFile} from '../src/main/model-library-workspace/model-file-transfer'
import {validateRetrievalVectors} from '../src/main/retrieval-workspace/retrieval-runtime'
import {RETRIEVAL_RESIDENT_BYTES,RETRIEVAL_COMPUTE_BYTES} from '../src/main/retrieval-workspace/retrieval-model-library'
const db=new Database('/Users/meigong/Documents/DAM-public-macos-profile/app-state/app-state.sqlite',{readonly:true,fileMustExist:true})
const row=db.prepare("SELECT json_extract(record,'$.directory') directory,json_extract(record,'$.release') release FROM retrieval_models WHERE json_extract(record,'$.trusted')=1").get() as {directory:string;release:string}|undefined
db.close();assert.ok(row)
const release=JSON.parse(row.release),root=path.join('/Users/meigong/Documents/DAM-public-macos-profile/retrieval-models',row.directory)
const abort=new AbortController(),sampler=createLocalAiDeviceSampler()
await sampler.refresh()
const admission=createVisualAdmission({memory:()=>sampler.memory(),devices:()=>sampler.read(),activity:()=> 'unknown'})
for(const file of release.files)await verifyTransferredFile(path.join(root,file.name),file,abort.signal)
const resident=admission.reserveResident('internal-real-retrieval',RETRIEVAL_RESIDENT_BYTES,abort.signal)
const child=spawn(path.resolve('.scratch/macos-migration-20261009/python/bin/python'),['-I','-B',path.resolve('ai-service/tools/retrieval_worker.py'),root],{stdio:['pipe','pipe','pipe'],env:{LANG:'en_US.UTF-8',OMP_NUM_THREADS:'2'}})
const closed=once(child,'close');child.once('close',()=>resident.release())
let loadedResolve!:(v:any)=>void,loadedReject!:(e:Error)=>void,pending:{id:string;resolve(v:any):void;reject(e:Error):void}|undefined,buffer='',stderr=0,peak=0
const loaded=new Promise<any>((resolve,reject)=>{loadedResolve=resolve;loadedReject=reject}),decoder=new StringDecoder('utf8')
const fail=(code:string)=>{loadedReject(Error(code));pending?.reject(Error(code));child.kill()}
const deadline=setTimeout(()=>fail('RETRIEVAL_INTERNAL_TIMEOUT'),180000)
child.stderr.on('data',bytes=>{stderr+=bytes.length;if(stderr>1024**2)fail('RETRIEVAL_OUTPUT_LIMIT')})
child.on('error',()=>fail('RETRIEVAL_START_FAILED'))
child.stdout.on('data',bytes=>{
 buffer+=decoder.write(bytes);if(Buffer.byteLength(buffer)>1024**2){fail('RETRIEVAL_OUTPUT_LIMIT');return}
 for(let end=buffer.indexOf('\n');end>=0;end=buffer.indexOf('\n')){
  const line=buffer.slice(0,end);buffer=buffer.slice(end+1)
  try {
   const message=JSON.parse(line)
   if(message.metrics){peak=Math.max(peak,message.metrics.peakRamBytes);resident.observe(message.metrics.rssBytes);assert.ok(peak<=RETRIEVAL_RESIDENT_BYTES)}
   if(message.kind==='loaded')loadedResolve(message)
   if(message.kind==='failed')fail('RETRIEVAL_LOAD_FAILED')
   if(message.kind==='result'&&pending?.id===message.id){pending.resolve(message.vectors);pending=undefined}
   if(message.kind==='error'&&pending?.id===message.id){pending.reject(Error(message.code));pending=undefined}
  }catch{fail('RETRIEVAL_PROTOCOL_OR_RESOURCE_FAILED')}
 }
})
const request=(id:string,kind:'images'|'texts',values:string[])=>new Promise<any>((resolve,reject)=>{pending={id,resolve,reject};child.stdin.write(JSON.stringify({id,kind,[kind]:values})+'\n')})
try {
 const readiness=await loaded;assert.equal(readiness.dimension,768)
 const permit=await admission.reserveLocalWork('retrieval',RETRIEVAL_COMPUTE_BYTES,abort.signal)
 try {
  const names=['public-coffee.png','public-astronaut.png','public-page.png'],images=await Promise.all(names.map(async name=>(await fs.readFile(path.join('.scratch/macos-migration-20261009/public-sources',name))).toString('base64')))
  const imageVectors=validateRetrievalVectors(await request('images','images',images),3)
  const queries=['a cup of coffee on a wooden table','一杯放在木桌上的咖啡']
  const textVectors=validateRetrievalVectors(await request('texts','texts',queries),2)
  const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0)
  const ranking=textVectors.map((v,i)=>({query:queries[i],scores:imageVectors.map((image,j)=>({name:names[j],score:dot(v,image)})).sort((a,b)=>b.score-a.score)}))
  for(const result of ranking)assert.equal(result.scores[0].name,'public-coffee.png')
  assert.ok(dot(imageVectors[0],imageVectors[0])>.999)
  const result={kind:'internal-real-CPU-retrieval',repository:release.repository,revision:release.revision,ranking,peakRamBytes:peak,loadMs:readiness.loadMs,dimension:768,userPathAcceptance:false,activeProfileDbWrites:0}
  await fs.writeFile('.scratch/macos-migration-20261009/evidence/macos-real-retrieval-internal.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
 }finally{permit.release()}
 child.stdin.end(JSON.stringify({kind:'stop'})+'\n');await closed
 assert.equal(admission.resourceStatus().residentBytes,0)
 console.log('Real bilingual vectors, same-image cosine and physical release passed; saved user index/UI remain separate')
}finally{clearTimeout(deadline);abort.abort();if(child.exitCode===null&&child.signalCode===null){child.kill();await closed};await sampler.stop()}
