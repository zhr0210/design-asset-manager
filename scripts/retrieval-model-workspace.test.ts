import assert from 'node:assert/strict'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createRetrievalModelLibrary} from '../src/main/retrieval-workspace/retrieval-model-library'

await test('a complete pinned domestic retrieval download survives reopen without execution qualification; corruption cannot be used or silently repaired',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-retrieval-install-')),database=new Database(':memory:')
  const header=Buffer.from(JSON.stringify({weight:{dtype:'F32',shape:[1],data_offsets:[0,4]}})),prefix=Buffer.alloc(8)
  prefix.writeBigUInt64LE(BigInt(header.length))
  const contents=new Map<string,Buffer>([['model.safetensors',Buffer.concat([prefix,header,Buffer.alloc(4)])],
    ['config.json',Buffer.from('{"model_type":"siglip","text_config":{"model_type":"siglip_text_model","vocab_size":256000},"vision_config":{"model_type":"siglip_vision_model"}}')],['preprocessor_config.json',Buffer.from(JSON.stringify({image_processor_type:'SiglipImageProcessor',processor_class:'SiglipProcessor',size:{height:224,width:224},do_resize:true,do_rescale:true,do_normalize:true,image_mean:[.5,.5,.5],image_std:[.5,.5,.5],resample:2,rescale_factor:1/255}))],
    ['tokenizer.json',Buffer.from('{}')],['tokenizer_config.json',Buffer.from('{}')]])
  const files=[...contents].map(([Path,bytes])=>({Type:'blob',Path,Size:bytes.length,Sha256:createHash('sha256').update(bytes).digest('hex'),Revision:'a'.repeat(40),CommittedDate:1}))
  let offline=false,requests=0
  const network=async(url:string,init:RequestInit)=>{
    assert.ok(url.startsWith('https://modelscope.cn/'),'No request may escape the domestic source');requests++
    if(offline)throw Error('NETWORK_UNAVAILABLE')
    const parsed=new URL(url)
    if(parsed.pathname.endsWith('/repo/files'))return Response.json({Code:200,Data:{Files:files}})
    if(parsed.pathname.endsWith('/repo')){
      const bytes=contents.get(parsed.searchParams.get('FilePath')!)!;assert.ok(bytes)
      const range=new Headers(init.headers).get('range'),offset=range?Number(range.match(/\d+/)![0]):0
      return new Response(bytes.subarray(offset),{status:offset?206:200,headers:{'Content-Length':String(bytes.length-offset),...(offset?{'Content-Range':`bytes ${offset}-${bytes.length-1}/${bytes.length}`}:{})}})
    }
    return Response.json({Code:200,Data:{Path:'google',Name:'siglip2-base-patch16-224',License:'apache-2.0',IsAccessible:1,IsPublished:1}})
  }
  const admission=createVisualAdmission({memory:()=>({free:30*1024**3,total:32*1024**3})})
  const dependencies={database,root,fetch:network,admission,changed:()=>{}}
  try{
    const library=createRetrievalModelLibrary(dependencies)
    const review=await library.reviewInstall()
    assert.equal(review.source,'modelscope-cn');assert.equal(review.license,'apache-2.0')
    const started=await library.confirm(review.receipt)
    await library.settle()
    const state=library.summary()
    assert.equal(state.tasks.find(task=>task.id===started.id)!.state,'complete')
    assert.equal(state.models.length,1);assert.equal(state.models[0].qualified,false)
    const id=state.models[0].id
    offline=true;const before=requests
    const reopened=createRetrievalModelLibrary(dependencies)
    const artifact=await reopened.resolve(id,new AbortController().signal)
    assert.equal(requests,before,'Reading complete local bytes never refreshes remote provenance')
    assert.equal(reopened.summary().models[0].qualified,false,'Installation and reopening cannot forge real language/image evidence')
    await fs.writeFile(path.join(artifact.directory,'config.json'),'{"model_type":"other"}')
    await assert.rejects(reopened.resolve(id,new AbortController().signal),/INTEGRITY|CHANGED/)
    assert.equal(reopened.summary().models.length,1,'Failed verification preserves the inventory and prior files')
    assert.equal(admission.resourceStatus().residentBytes,0)
  }finally{admission.invalidate();database.close();await fs.rm(root,{recursive:true,force:true})}
})
