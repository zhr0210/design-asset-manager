import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pythonPackageRoots,bindPythonDependencies} from '../src/main/services/ai-runtime/python-environment-binding'
import {createGgufLoadPlan,ggufDeviceReady} from '../src/main/local-ai-resources/gguf-load-plan'
import type {HuggingFaceModelBundle} from '../src/shared/contracts/managed-model-library.contract'
import type {AiDeviceResourceSample} from '../src/shared/contracts/local-ai-resources.contract'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-python-binding-'))
try {
 const env=path.join(root,'environment'), bin=path.join(env,process.platform==='win32'?'Scripts':'bin')
 const packages=path.join(env,process.platform==='win32'?'Lib/site-packages':'lib/python3.12/site-packages')
 await fs.mkdir(bin,{recursive:true});await fs.mkdir(path.join(packages,'torch-2.7.0.dist-info'),{recursive:true})
 await fs.writeFile(path.join(env,'pyvenv.cfg'),'home = '+root+'\nversion = 3.12.11\ninclude-system-site-packages = false\n')
 const exe=path.join(bin,process.platform==='win32'?'python.exe':'python3')
 if(process.platform==='win32')await fs.writeFile(exe,'fixture executable')
 else await fs.symlink(process.execPath,exe)
 await fs.writeFile(path.join(packages,'torch-2.7.0.dist-info/RECORD'),'fixture installed metadata')
 assert.equal((await pythonPackageRoots(exe)).packages[0],packages)
 const a=createHash('sha256');await bindPythonDependencies(exe,a,['torch-']);const before=a.digest('hex')
 await fs.writeFile(path.join(packages,'torch-2.7.0.dist-info/RECORD'),'changed installed metadata')
 const b=createHash('sha256');await bindPythonDependencies(exe,b,['torch-']);assert.notEqual(b.digest('hex'),before)
 await assert.rejects(bindPythonDependencies(exe,createHash('sha256'),['missing-']),/LOCAL_DEPENDENCY_MISSING/)
 const device:AiDeviceResourceSample={id:'0:METAL',name:'Apple M4',topology:'shared',source:'macos-system',state:'known',sampledAt:Date.now(),totalBytes:24*1024**3,freeBytes:12*1024**3}
 const bundle={id:'fixture',size:'2B',variant:'Instruct',bytes:1536*1024**2,files:[{name:'language.gguf',bytes:1200*1024**2},{name:'mmproj-fixture.gguf',bytes:336*1024**2}]} as HuggingFaceModelBundle
 const gpu=createGgufLoadPlan(bundle,'gpu',device),hybrid=createGgufLoadPlan(bundle,'hybrid',device)
 assert.equal(gpu.deviceBackend,'metal');assert.deepEqual(gpu.cost.gpuBytes,{})
 assert.ok(gpu.cost.ramBytes>=bundle.bytes+gpu.components.kv+gpu.components.workspace)
 assert.equal(gpu.cost.ramBytes,hybrid.cost.ramBytes,'Unified allocations share a single conservative RAM pool')
 assert.equal(ggufDeviceReady(device),true);assert.equal(ggufDeviceReady({...device,state:'stale'}),false)
 assert.throws(()=>createGgufLoadPlan(bundle,'gpu',{...device,topology:'unknown'}),/AI_DEVICE_UNKNOWN/)
 console.log('macOS migration: venv selection, metadata drift, missing deps and one unified memory pool passed')
} finally {await fs.rm(root,{recursive:true,force:true})}
