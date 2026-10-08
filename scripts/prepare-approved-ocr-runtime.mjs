// Run only after user approval of RAPIDOCR-EVALUATION-20260920.manifest.json.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
const manifest=JSON.parse(await fs.readFile('docs/product/RAPIDOCR-EVALUATION-20260920.manifest.json','utf8'))
if(process.argv[2]!=='--approved'){
 console.log(JSON.stringify({state:'review-only',packages:manifest.files.length,totalBytes:manifest.totalBytes,downloads:0}));
}else{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-approved-ocr-'))),wheelhouse=path.join(root,'wheels'),runtime=path.join(root,'runtime')
 await fs.mkdir(wheelhouse)
 for(const file of manifest.files){
  const url=new URL(file.url);if(url.protocol!=='https:'||url.hostname!=='files.pythonhosted.org'||path.basename(file.filename)!==file.filename)throw Error('Unapproved artifact source')
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(180000)})
  if(!response.ok||!response.body)throw Error('Artifact download failed')
  const out=await fs.open(path.join(wheelhouse,file.filename),'wx'),hash=createHash('sha256');let size=0
  try{for await(const chunk of response.body){size+=chunk.byteLength;if(size>file.bytes)throw Error('Artifact size mismatch');hash.update(chunk);await out.writeFile(chunk)}}finally{await out.close()}
  if(size!==file.bytes||hash.digest('hex')!==file.sha256)throw Error('Artifact integrity check failed')
  console.log(JSON.stringify({verified:file.package,version:file.version}))
 }
 const run=(cmd,args,env={})=>{const r=spawnSync(cmd,args,{env:{...process.env,...env},encoding:'utf8'});if(r.error||r.status!==0)throw Error('Isolated environment preparation failed; no global install attempted.')}
 run('/usr/bin/python3',['-m','venv','--without-pip',runtime])
 const python=path.join(runtime,'bin','python3')
 run('/opt/homebrew/bin/uv',['pip','install','--python',python,'--no-index','--no-deps',...manifest.files.map(f=>path.join(wheelhouse,f.filename))],{UV_OFFLINE:'1',UV_PYTHON_DOWNLOADS:'never',UV_CACHE_DIR:path.join(root,'uv-cache')})
 // Dependency metadata verification without model load or network calls.
 run('/opt/homebrew/bin/uv',['pip','check','--python',python],{UV_OFFLINE:'1',UV_PYTHON_DOWNLOADS:'never',UV_CACHE_DIR:path.join(root,'uv-cache')})
 const hashCode="import importlib.metadata,hashlib,json; from pathlib import Path; d=Path(importlib.metadata.distribution('rapidocr-onnxruntime').locate_file('rapidocr_onnxruntime/models')); names={'det':'ch_PP-OCRv4_det_infer.onnx','cls':'ch_ppocr_mobile_v2.0_cls_infer.onnx','rec':'ch_PP-OCRv4_rec_infer.onnx'}; print(json.dumps({k:hashlib.sha256((d/n).read_bytes()).hexdigest() for k,n in names.items()}))"
 const hashes=spawnSync(python,['-I','-B','-c',hashCode],{encoding:'utf8'});if(hashes.status!==0)throw Error('Bundled model inventory unavailable')
 await fs.writeFile(path.join(root,'ocr-runtime.json'),JSON.stringify({schema:1,engine:'rapidocr-onnxruntime',version:'1.4.4',platform:process.platform,arch:process.arch,pythonRelative:'runtime/bin/python3',modelSha256:JSON.parse(hashes.stdout)},null,2))
 const state={root,python,manifest:'RAPIDOCR-EVALUATION-20260920.manifest.json',verified:true}
 await fs.writeFile('/tmp/dam-approved-ocr-evaluation-state.json',JSON.stringify(state,null,2))
 console.log(JSON.stringify({state:'installed-isolated',packages:manifest.files.length,modelLoaded:false}))
}
