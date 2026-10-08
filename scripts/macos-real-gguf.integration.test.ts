// Explicit Mac internal Adapter execution against the designated public profile.
// Read-only model metadata only; never marks UI acceptance or writes its DB.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {once} from 'node:events'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createManagedGgufPackages} from '../src/main/services/ai-runtime/managed-gguf-packages'
import {launchManagedGguf} from '../src/main/services/ai-runtime/managed-gguf-transport'
import {inspectGgufModel,bindGgufArtifact} from '../src/main/model-library/gguf-model-artifact'
import {createGgufLoadPlan} from '../src/main/local-ai-resources/gguf-load-plan'
import {createLocalAiDeviceSampler} from '../src/main/local-ai-resources/device-sampler'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {readOwnedMacProcessMemory} from '../src/main/platform/macos-owned-memory'
import type {HuggingFaceModelBundle} from '../src/shared/contracts/managed-model-library.contract'
const evidence=path.resolve('.scratch/macos-migration-20261009/evidence')
const installed=new Database('/Users/meigong/Documents/DAM-public-macos-profile/app-state/app-state.sqlite',{readonly:true,fileMustExist:true})
const row=installed.prepare("SELECT json_extract(record,'$.release.gguf') bundle,json_extract(record,'$.artifact.root') root FROM managed_model_entries WHERE json_extract(record,'$.trusted')=1 AND json_extract(record,'$.release.repository')='Qwen/Qwen3-VL-2B-Instruct-GGUF'").get() as {bundle:string;root:string}|undefined
installed.close();assert.ok(row,'ordinary application must have actually installed the designated bundle')
const bundle=JSON.parse(row.bundle) as HuggingFaceModelBundle
assert.equal(bundle.languageQuantization,'Q4_K_M');assert.equal(bundle.projectorQuantization,'Q8_0')
const directory=await fs.mkdtemp(path.resolve('.scratch/macos-migration-20261009/runtime-package-test/real-model-'))
const db=new Database(path.join(directory,'isolated.sqlite')),sampler=createLocalAiDeviceSampler(),control=new AbortController()
const timer=setTimeout(()=>control.abort(),180000)
const admission=createVisualAdmission({memory:()=>sampler.memory(),devices:()=>sampler.read(),activity:()=> 'unknown'})
let resident:ReturnType<typeof admission.reserveModel>|undefined,transport:Awaited<ReturnType<typeof launchManagedGguf>>|undefined
try {
 await sampler.refresh()
 for(let i=0;i<30&&!sampler.read().some(v=>v.id==='0:METAL');i++)await new Promise(r=>setTimeout(r,100))
 const device=sampler.read().find(v=>v.id==='0:METAL');assert.ok(device);assert.equal(device.state,'known')
 const plan=createGgufLoadPlan(bundle,'gpu',device)
 const bytes=await fs.readFile('.scratch/macos-migration-20261009/llama-b11429-bin-macos-arm64.tar.gz')
 const packages=createManagedGgufPackages({database:db,root:path.join(directory,'package'),fetch:async()=>new Response(bytes,{headers:{'content-length':String(bytes.length)}}),changed(){}})
 const binding=await packages.prepare('macos-arm64',control.signal),artifact=await inspectGgufModel(row.root,bundle,control.signal)
 resident=admission.reserveModel('internal-macos-real-model',plan.cost,control.signal)
 transport=await launchManagedGguf({...bindGgufArtifact(artifact),enabled:false,native:{binding,plan,threads:2}},control.signal)
 const closed=once(transport.child,'close');transport.child.once('close',()=>{resident?.release();resident=undefined})
 await transport.ready
 const memory=await readOwnedMacProcessMemory({pid:transport.child.pid!,...transport.launch},path.resolve('build/macos-runtime'))
 resident?.observe(memory.rssBytes,memory.peakRamBytes)
 const permit=await admission.reserveManagedProbe(control.signal)
 try {
  const image=await sharp('.scratch/macos-migration-20261009/public-sources/public-coffee.png').resize({width:640,height:640,fit:'inside'}).jpeg().toBuffer()
  const output=await transport.invoke({systemPrompt:'Describe only visible subjects. Return a JSON object with a caption string.',userPrompt:'用中文简短描述这张公开图片。只输出 JSON，键为 caption。',imageDataUrl:'data:image/jpeg;base64,'+image.toString('base64'),maxTokens:192,signal:control.signal})
  const text=output?.choices?.[0]?.message?.content;assert.equal(typeof text,'string')
  const result=JSON.parse(text);assert.match(result.caption,/咖啡|coffee/i)
  const after=await readOwnedMacProcessMemory({pid:transport.child.pid!,...transport.launch},path.resolve('build/macos-runtime'))
  resident?.observe(after.rssBytes,after.peakRamBytes)
  await fs.writeFile(path.join(evidence,'macos-real-gguf-internal.json'),JSON.stringify({kind:'internal-adapter-real-model-only',repository:bundle.repository,revision:bundle.revision,files:bundle.files.map(({name,bytes,sha256})=>({name,bytes,sha256})),runtime:binding.release,plan,measurement:after,result,userPathAcceptance:false,activeProfileDbWrites:0},null,2))
  console.log(JSON.stringify({kind:'internal-real-Metal-inference',caption:result.caption,measurement:after,userPathAcceptance:false}))
 }finally{permit.release()}
 transport.child.kill('SIGTERM');await closed;await transport.dispose();transport=undefined
 assert.equal(admission.resourceStatus().residentBytes,0)
 console.log('Real designated Qwen 2B Metal Adapter inference and physical release passed; ordinary UI remains separate')
}finally {
 clearTimeout(timer);control.abort()
 if(transport){const child=transport.child;if(child.exitCode===null&&child.signalCode===null){const done=once(child,'close');child.kill('SIGTERM');await done}await transport.dispose().catch(()=>{})}
 await sampler.stop();if(!transport)resident?.release();db.close()
}
