import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createPublicModelFetch } from '../src/main/model-library-workspace/electron-public-model-network'
import { discoverHuggingFaceModels, HF_MODEL_SCOPE } from '../src/main/model-library-workspace/huggingface-model-discovery'
import { sourceRelease, verifyUpstreamRelease, openUpstreamFile } from '../src/main/model-library-workspace/huggingface-model-source'
import { transferModelFile } from '../src/main/model-library-workspace/model-file-transfer'
import type { HuggingFaceDiscoveryEntry } from '../src/shared/contracts/managed-model-library.contract'
const json=(Data:unknown)=>new Response(JSON.stringify({Code:200,Data}))
const info=(repo:string,license='apache-2.0')=>json({Path:repo.split('/')[0],Name:repo.split('/')[1],License:license,IsAccessible:1,IsPublished:1})
const rows=(files:Array<{name:string;bytes:number;sha256:string}>,revision='a'.repeat(40))=>json({Files:files.map(file=>({Path:file.name,Size:file.bytes,Sha256:file.sha256,Revision:revision,CommittedDate:1,Type:'blob'}))})
const repoOf=(url:string)=>new URL(url).pathname.replace(/^\/api\/v1\/models\//,'').replace(/\/repo\/files$/,'')
await test('registered scope covers six Qwen sizes and variants; Chinese immutable metadata assembles only complete selected GGUF bundles',async()=>{
  const official=HF_MODEL_SCOPE.filter(scope=>scope.repository.startsWith('Qwen/Qwen3-VL-')&&!/Embedding|Reranker/.test(scope.repository))
  for(const size of ['2B','4B','8B','32B','30B-A3B','235B-A22B'])for(const variant of ['Instruct','Thinking'])for(const suffix of ['','-FP8','-GGUF'])
    assert.ok(official.some(scope=>scope.repository==='Qwen/Qwen3-VL-'+size+'-'+variant+suffix))
  const files=[
    {name:'Qwen3VL-4B-Instruct-Q4_K_M-00001-of-00002.gguf',bytes:100,sha256:'b'.repeat(64)},
    {name:'Qwen3VL-4B-Instruct-Q4_K_M-00002-of-00002.gguf',bytes:110,sha256:'c'.repeat(64)},
    {name:'mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf',bytes:40,sha256:'d'.repeat(64)},
    {name:'Qwen3VL-4B-Instruct-Q6_K-00001-of-00002.gguf',bytes:140,sha256:'e'.repeat(64)},
    {name:'imatrix.gguf',bytes:15,sha256:'f'.repeat(64)},
  ]
  const entries:HuggingFaceDiscoveryEntry[]=[]
  await discoverHuggingFaceModels(async(url,options)=>{
    assert.equal(new URL(url).hostname,'modelscope.cn');assert.equal(options.credentials,'omit')
    const repo=repoOf(url)
    return url.includes('/repo/files?')?rows(repo==='Qwen/Qwen3-VL-4B-Instruct-GGUF'?files:[]):info(repo)
  },new AbortController().signal,entry=>entries.push(entry))
  assert.equal(entries.length,HF_MODEL_SCOPE.length)
  const model=entries.find(entry=>entry.repository==='Qwen/Qwen3-VL-4B-Instruct-GGUF')!
  assert.equal(model.sourceKind,'official');assert.equal(model.catalogProvider,'modelscope-cn')
  assert.equal(model.bundles.length,1);assert.equal(model.bundles[0].bytes,250)
  assert.equal(model.bundles[0].languageQuantization,'Q4_K_M');assert.equal(model.bundles[0].files.length,3)
  assert.equal(model.bundles[0].support,'managed-gguf')
  assert.equal('qualifiedAt' in model.bundles[0],false,'download support never qualifies inference')
  assert.ok(model.files.every(file=>file.downloadUrl?.startsWith('https://modelscope.cn/')))
})
await test('a missing Chinese mirror stays local, and wrong whole hashes cannot grant source verification',async()=>{
  const entries:HuggingFaceDiscoveryEntry[]=[]
  await discoverHuggingFaceModels(async url=>url.includes('SmilingWolf')?new Response('',{status:403}):
    url.includes('/repo/files?')?rows([{name:'data.onnx',bytes:100,sha256:'b'.repeat(64)}]):info(repoOf(url)),
    new AbortController().signal,entry=>entries.push(entry))
  assert.equal(entries.length,HF_MODEL_SCOPE.length)
  assert.equal(entries.find(v=>v.id==='wd-vit-tagger-v3')!.state,'unavailable')
  assert.equal(entries.find(v=>v.id==='wd-vit-tagger-v3')!.error,'MODEL_MIRROR_UNAVAILABLE')
  assert.equal(entries.find(v=>v.id==='qwen3-vl-2b-instruct')!.error,'MODEL_SOURCE_REVOKED')
  const release=sourceRelease('qwen3-vl-2b-instruct')
  await assert.rejects(verifyUpstreamRelease(release,async url=>url.includes('/repo/files?')?rows(
    release.files.map(f=>({...f,sha256:'f'.repeat(64)}))):info(release.repository),new AbortController().signal),/MODEL_MIRROR_FILE_UNAVAILABLE/)
})
await test('unapproved redirects and false resumed ranges cannot publish model data',async()=>{
  const release=sourceRelease('qwen3-vl-2b-instruct'),signal=new AbortController().signal
  await assert.rejects(openUpstreamFile(release,release.files[0],0,async url=>url.includes('/repo/files?')?rows(release.files):
    new Response(null,{status:302,headers:{location:'https://attacker.example/file'}}),signal),/REDIRECT_REJECTED/)
  const stage=await fs.mkdtemp(path.join(os.tmpdir(),'dam-cn-range-test-'))
  try{
    const content=Buffer.from('public-file-content'),file={name:'model.safetensors',bytes:content.length,sha256:createHash('sha256').update(content).digest('hex')}
    await fs.writeFile(path.join(stage,file.name+'.part'),content.subarray(0,5))
    const request=async(url:string,options:RequestInit)=>{
      if(url.includes('/repo/files?'))return rows([file])
      assert.equal(new Headers(options.headers).get('Range'),'bytes=5-')
      return new Response(content.subarray(5),{status:206,headers:{'content-range':'bytes 0-'+(file.bytes-1)+'/'+file.bytes}})
    }
    await assert.rejects(transferModelFile({file,stage,release,signal,progress(){},fetch:request}),/RANGE_REJECTED/)
    await assert.rejects(fs.stat(path.join(stage,file.name)),{code:'ENOENT'})
    await transferModelFile({file,stage,release,signal,progress(){},fetch:async url=>url.includes('/repo/files?')?rows([file]):new Response(content)})
    assert.deepEqual(await fs.readFile(path.join(stage,file.name)),content)
  }finally{
    assert.ok(path.resolve(stage).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(stage).startsWith('dam-cn-range-test-'))
    await fs.rm(stage,{recursive:true,force:true})
  }
})
await test('Electron only follows approved Chinese storage hosts and sends no session credentials',async()=>{
  for(const allowed of [true,false]){
    let followed=false,aborted=false
    const request=Object.assign(new EventEmitter(),{setHeader(){},abort(){aborted=true},followRedirect(){followed=true},end(){
      queueMicrotask(()=>{
        request.emit('redirect',307,'GET',allowed?'https://cdn-lfs-cn-1.modelscope.cn/object':'https://huggingface.co/model')
        if(!followed)return
        const incoming=Object.assign(new EventEmitter(),{headers:{'content-type':'application/json'},statusCode:200})
        request.emit('response',incoming);incoming.emit('data',Buffer.from('{"public":true}'));incoming.emit('end')
      })
    }})
    const fetch=createPublicModelFetch(options=>{
      assert.equal(options.credentials,'omit');assert.equal(options.useSessionCookies,false);assert.equal(options.redirect,'manual')
      return request as unknown as Electron.ClientRequest
    })
    const work=fetch('https://modelscope.cn/api/v1/models/Qwen/model/repo',{credentials:'omit',redirect:'manual',signal:new AbortController().signal})
    if(allowed){assert.deepEqual(await(await work).json(),{public:true});assert.equal(aborted,false)}
    else{await assert.rejects(work,/REDIRECT_REJECTED/);assert.equal(aborted,true);assert.equal(followed,false)}
  }
})
