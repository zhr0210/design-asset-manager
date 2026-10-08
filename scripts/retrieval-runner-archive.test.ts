import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import Database from 'better-sqlite3'
import {createRetrievalRunnerArchive} from '../src/main/retrieval-workspace/retrieval-runner-archive'
import type {RetrievalQualification} from '../src/shared/contracts/retrieval-workspace.contract'
await test('owned worker byte preservation survives replacement and denies corruption/cancelled publication without granting any model qualification',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-runner-archive-'))),db=new Database(':memory:'),script=path.join(root,'shipped.py')
 // Storage dependency fixture only: 0/2 and no runtime/model registration.
 const qualification:RetrievalQualification={fingerprint:'a'.repeat(64),spaceId:'b'.repeat(64),dimension:768,encoding:'float32-le',normalization:'l2',distance:'cosine',imageRecipe:'siglip2-rgb-224-v1',textRecipe:'siglip2-original-text-64-v1',testedAt:'2026-10-07T00:00:00Z',peakRamBytes:1,languages:['zh','en','mixed'].map(language=>({language:language as 'zh'|'en'|'mixed',correct:0,total:2}))}
 try{await fs.writeFile(script,'# shipped storage fixture 1\n')
  const store=createRetrievalRunnerArchive(db,path.join(root,'owned')),input={modelId:'not-an-installed-model',python:'not-an-executable',artifactFingerprint:'c'.repeat(64),qualification}
  const pinned=await store.preserve(input,script)
  await fs.writeFile(script,'# shipped storage fixture 2\n')
  assert.equal(await fs.readFile((await store.resolve(qualification.spaceId))!.runner,'utf8'),'# shipped storage fixture 1\n')
  const abort=new AbortController();abort.abort();await assert.rejects(store.preserve({...input,qualification:{...qualification,spaceId:'d'.repeat(64)}},script,abort.signal))
  assert.equal(await store.resolve('d'.repeat(64)),null)
  await fs.writeFile(pinned,'# changed\n');await assert.rejects(store.resolve(qualification.spaceId),/LOCAL_MODEL_CHANGED/)
  store.revoke(input.modelId);assert.equal(await store.resolve(qualification.spaceId),null)
 }finally{db.close();assert.ok(root.startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(root,{recursive:true,force:true})}
})
