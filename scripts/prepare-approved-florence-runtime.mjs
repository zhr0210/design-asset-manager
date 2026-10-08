// Requires explicit approval of the fixed Florence model/runtime plan. Default is read-only review.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
const manifest=JSON.parse(await fs.readFile('docs/product/FLORENCE-EVALUATION-20260920.manifest.json','utf8'))
if(process.argv[2]!=='--approved')console.log(JSON.stringify({state:'review-only',bytes:manifest.totalBytes,modelFiles:manifest.modelFiles.length,wheels:manifest.wheels.length,downloads:0}))
else{
 if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('PLAN_REQUIRES_MACOS_ARM64')
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-approved-florence-'))),wheels=path.join(root,'wheels'),models=path.join(root,'models'),runtime=path.join(root,'runtime')
 await fs.mkdir(wheels);await fs.mkdir(models)
 await fs.writeFile('/tmp/dam-approved-florence-state.json',JSON.stringify({root,models,phase:'downloading',verified:false}))
 for(const [folder,files]of [[wheels,manifest.wheels],[models,manifest.modelFiles]])for(const file of files){
  if(path.basename(file.filename)!==file.filename)throw Error('ARTIFACT_PATH_INVALID')
  const url=new URL(file.url);if(url.protocol!=='https:'||!['huggingface.co','files.pythonhosted.org'].includes(url.hostname))throw Error('ARTIFACT_SOURCE_INVALID')
  const dest=path.join(folder,file.filename),sha=createHash('sha256'),git=createHash('sha1').update(`blob ${file.bytes}\0`)
  if(file.bytes>128*1024*1024&&file.sha256){
   const chunkSize=64*1024*1024,segments=[]
   for(let start=0;start<file.bytes;start+=chunkSize)segments.push({start,end:Math.min(start+chunkSize,file.bytes)-1})
   let next=0
   const fetchSegment=async()=>{while(next<segments.length){const {start,end}=segments[next++],segment=dest+'.range-'+start,expected=end-start+1;let completed=false
    for(let attempt=0;attempt<3&&!completed;attempt++){
     try{const res=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(1800000)})
      if(res.status!==206||res.headers.get('content-range')!==`bytes ${start}-${end}/${file.bytes}`||!res.body)throw Error('ARTIFACT_RANGE_INVALID')
      let n=0;const out=await fs.open(segment+'.part','w')
      try{for await(const bytes of res.body){n+=bytes.length;if(n>expected)throw Error('ARTIFACT_RANGE_INVALID');await out.writeFile(bytes)}}finally{await out.close()}
      if(n!==expected)throw Error('ARTIFACT_RANGE_INVALID');await fs.rename(segment+'.part',segment);completed=true
     }catch(error){if(attempt===2)throw error}
    }
   }}
   await Promise.all(Array.from({length:Math.min(8,segments.length)},fetchSegment))
   const out=await fs.open(dest+'.complete','wx')
   try{for(const {start}of segments){const bytes=await fs.readFile(dest+'.range-'+start);sha.update(bytes);git.update(bytes);await out.writeFile(bytes)}}finally{await out.close()}
   const digest=sha.digest('hex');if(digest!==file.sha256)throw Error('ARTIFACT_HASH_INVALID')
   await fs.rename(dest+'.complete',dest)
   for(const {start}of segments)await fs.unlink(dest+'.range-'+start)
   file.verifiedSha256=digest;console.log(JSON.stringify({verified:file.filename,segments:segments.length}));continue
  }
  const response=await fetch(url,{signal:AbortSignal.timeout(1800000)});if(!response.ok||!response.body)throw Error('ARTIFACT_DOWNLOAD_FAILED')
  const output=await fs.open(dest,'wx');let bytes=0
  try{for await(const chunk of response.body){bytes+=chunk.byteLength;if(bytes>file.bytes)throw Error('ARTIFACT_SIZE_INVALID');sha.update(chunk);git.update(chunk);await output.writeFile(chunk)}}finally{await output.close()}
  const digest=sha.digest('hex');if(bytes!==file.bytes||(file.sha256?digest!==file.sha256:git.digest('hex')!==file.gitBlobSha1))throw Error('ARTIFACT_HASH_INVALID')
  file.verifiedSha256=digest;console.log(JSON.stringify({verified:file.filename}))
 }
 const run=(command,args)=>{const r=spawnSync(command,args,{encoding:'utf8',env:{...process.env,UV_OFFLINE:'1',UV_PYTHON_DOWNLOADS:'never',UV_CACHE_DIR:path.join(root,'uv-cache')}});if(r.error||r.status!==0)throw Error('ISOLATED_INSTALL_FAILED')}
 run('/usr/bin/python3',['-m','venv','--without-pip',runtime]);const python=path.join(runtime,'bin','python3')
 run('/opt/homebrew/bin/uv',['pip','install','--python',python,'--no-index','--no-deps',...manifest.wheels.map(f=>path.join(wheels,f.filename))])
 run('/opt/homebrew/bin/uv',['pip','check','--python',python])
 await fs.writeFile(path.join(root,'verified-manifest.json'),JSON.stringify(manifest,null,2))
 await fs.writeFile('/tmp/dam-approved-florence-state.json',JSON.stringify({root,models,python,verified:true},null,2))
 console.log(JSON.stringify({state:'installed-isolated',modelLoaded:false}))
}
