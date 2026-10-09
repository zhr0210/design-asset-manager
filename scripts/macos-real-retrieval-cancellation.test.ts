// Opt-in installed-environment regression. Reads only model inventory metadata;
// all runtime/qualification writes use a disposable database, never the profile.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import {createRetrievalModelLibrary} from '../src/main/retrieval-workspace/retrieval-model-library'
import {createRetrievalRuntime} from '../src/main/retrieval-workspace/retrieval-runtime'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'

const profile=process.env.DAM_TEST_RETRIEVAL_PROFILE
assert.ok(profile,'DAM_TEST_RETRIEVAL_PROFILE must name the designated installed public profile')
const source=new Database(path.join(profile,'app-state/app-state.sqlite'),{readonly:true,fileMustExist:true})
const model=source.prepare("SELECT id,record FROM retrieval_models WHERE json_extract(record,'$.trusted')=1 LIMIT 1").get() as {id:string;record:string}
const owner=source.prepare('SELECT owner FROM retrieval_model_store WHERE singleton=1').pluck().get()
source.close();assert.ok(model);assert.equal(typeof owner,'string')
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-retrieval-cancel-')))
const db=new Database(path.join(root,'test.sqlite'))
// This test measures cancellation, not OS memory pressure. It must reach the
// real worker even when unrelated applications are open; no readiness is faked.
const admission=createVisualAdmission({memory:()=>({free:16*1024**3,total:24*1024**3})})
db.exec('CREATE TABLE retrieval_model_store(singleton INTEGER PRIMARY KEY,owner TEXT NOT NULL)')
db.prepare('INSERT INTO retrieval_model_store VALUES(1,?)').run(owner)
const models=createRetrievalModelLibrary({database:db,root:path.join(profile,'retrieval-models'),admission,
  fetch:async()=>{throw Error('NO_NETWORK_EXPECTED')},changed(){}})
const inventory=JSON.parse(model.record);inventory.qualification=null
db.prepare('INSERT INTO retrieval_models VALUES(?,?)').run(model.id,JSON.stringify(inventory))
const runtime=createRetrievalRuntime({database:db,models,admission,runner:path.resolve('ai-service/tools/retrieval_worker.py'),
  selectPython:async()=>path.resolve('.scratch/macos-migration-20261009/python/bin/python'),changed(){}})
try{
  await runtime.selectRuntime()
  await runtime.verifyUse(model.id) // Real subject, bilingual, mixed and image challenges.
  const image=await fs.readFile('.scratch/macos-migration-20261009/public-sources/public-astronaut.png')
  const abort=new AbortController()
  const request=runtime.embedImages(Array.from({length:8},()=>image),abort.signal)
  const timer=setTimeout(()=>abort.abort(),50)
  try{await assert.rejects(request,/RETRIEVAL_CANCELLED|AbortError|aborted/)}finally{clearTimeout(timer)}
  await runtime.releaseIdle()
  assert.equal(runtime.status().state,'inactive')
  assert.equal(runtime.status().error,null,'intentional cancellation must not become a stream failure')
  assert.equal(admission.resourceStatus().residentBytes,0,'release requires actual worker close')
  const recovered=await runtime.embedTexts(['一名宇航员'],new AbortController().signal)
  assert.equal(recovered.vectors[0].length,768)
  assert.equal(runtime.status().state,'ready')
  await runtime.releaseIdle()
  assert.equal(runtime.status().error,null)
  assert.equal(admission.resourceStatus().residentBytes,0)
  console.log('Actual qualification, in-flight cancellation, physical release and subsequent query passed; no active profile DB writes')
}finally{
  await runtime.suspendAndDrain();await models.drain();db.close()
  assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()))
  assert.ok(path.basename(root).startsWith('dam-retrieval-cancel-'))
  await fs.rm(root,{recursive:true,force:true})
}
