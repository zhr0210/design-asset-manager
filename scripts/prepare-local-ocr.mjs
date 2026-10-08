import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
const root=process.argv[2]
if(!root||!path.isAbsolute(root))throw Error('Pass the absolute, explicitly prepared OCR environment directory')
const relative=process.platform==='win32'?'runtime/Scripts/python.exe':'runtime/bin/python3'
const script=`import json,hashlib,pathlib,importlib.metadata as m,rapidocr_onnxruntime as r
assert m.version('rapidocr-onnxruntime')=='1.4.4'
p=pathlib.Path(r.__file__).resolve().parent/'models'
names={'det':'ch_PP-OCRv4_det_infer.onnx','cls':'ch_ppocr_mobile_v2.0_cls_infer.onnx','rec':'ch_PP-OCRv4_rec_infer.onnx'}
print(json.dumps({k:hashlib.sha256((p/v).read_bytes()).hexdigest() for k,v in names.items()}))`
const hashes=await new Promise((resolve,reject)=>{
  const child=spawn(path.join(root,relative),['-I','-B','-c',script],{windowsHide:true,stdio:['ignore','pipe','ignore']})
  let text=''
  child.stdout.on('data',part=>{text+=part;if(text.length>4000)child.kill()})
  child.once('error',reject)
  child.once('close',code=>{
    if(code!==0)reject(Error('OCR preparation failed: dependencies/model files missing'))
    else{try{resolve(JSON.parse(text))}catch{reject(Error('Invalid model inventory'))}}
  })
})
await fs.writeFile(path.join(root,'ocr-runtime.json'),JSON.stringify({schema:1,engine:'rapidocr-onnxruntime',version:'1.4.4',platform:process.platform,arch:process.arch,pythonRelative:relative,modelSha256:hashes},null,2),{flag:'wx'})
console.log('User-source OCR manifest prepared. Formal UI validation and resource measurement remain required.')
