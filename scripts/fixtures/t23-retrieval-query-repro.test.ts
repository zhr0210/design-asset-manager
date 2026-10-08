import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import Database from 'better-sqlite3'
import {createRetrievalModelLibrary} from '../../src/main/retrieval-workspace/retrieval-model-library'
import {createRetrievalRuntime} from '../../src/main/retrieval-workspace/retrieval-runtime'
import {createVisualAdmission} from '../../src/main/visual-ai/visual-admission'
import {createActiveLibraryHost} from '../../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../../src/main/library-lifecycle/production-active-library-dependencies'

// Diagnostic Runtime seam, actual approved stock model/Python, network denied.
// Only public model inventory/binding is copied; no settings or account tables.
const profile=path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04')
const root=path.resolve('.scratch/local-ai-implementation-20261006/retrieval-query-repro-'+randomUUID())
await fs.mkdir(root)
const source=new Database(path.join(profile,'app-state/app-state.sqlite'),{readonly:true,fileMustExist:true})
const db=new Database(path.join(root,'app.sqlite')),admission=createVisualAdmission({policy:{mode:'normal',reserveFraction:.1}})
for(const row of source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('retrieval_model_store','retrieval_models','retrieval_runtime','retrieval_runner_owner','retrieval_space_bindings')").all() as {sql:string}[])db.exec(row.sql)
db.prepare('INSERT OR REPLACE INTO retrieval_model_store VALUES(1,?)').run(source.prepare('SELECT owner FROM retrieval_model_store WHERE singleton=1').pluck().get())
for(const r of source.prepare('SELECT id,record FROM retrieval_models').all() as any[])db.prepare('INSERT INTO retrieval_models VALUES(?,?)').run(r.id,r.record)
db.prepare('INSERT INTO retrieval_runtime VALUES(1,?)').run(source.prepare('SELECT record FROM retrieval_runtime WHERE singleton=1').pluck().get())
db.prepare('INSERT INTO retrieval_runner_owner VALUES(1,?)').run(source.prepare('SELECT owner FROM retrieval_runner_owner WHERE singleton=1').pluck().get())
for(const r of source.prepare('SELECT space,record FROM retrieval_space_bindings').all() as any[])db.prepare('INSERT INTO retrieval_space_bindings VALUES(?,?)').run(r.space,r.record)
source.close()
const models=createRetrievalModelLibrary({database:db,root:path.join(profile,'retrieval-models'),fetch:async()=>{throw Error('NETWORK_DENIED')},admission,changed(){}})
const runtime=createRetrievalRuntime({database:db,models,runner:path.resolve('out/main/ai-service/tools/retrieval_worker.py'),archiveRoot:path.join(profile,'retrieval-runtimes'),admission,selectPython:async()=>null,changed(){}})
const library=path.join(root,'library')
await fs.cp(path.resolve('.scratch/b-model-management-20261006/real-library-01'),library,{recursive:true,errorOnExist:true,force:false})
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library})},{retrievalRuntime:()=>runtime,admission}))
const attempts:any[]=[],samples:any[]=[]
const sample=setInterval(()=>{samples.push({at:Date.now(),runtime:runtime.status(),resource:admission.resourceStatus()})},2000)
try{
 await host.open();assert.equal(host.inspect().state,'ready')
 const scope={libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!}
 assert.ok(runtime.currentSpace(),'Actual approved model qualification required')
 for(const query of ['一杯咖啡放在木桌上','a cup of coffee on a wooden table','coffee 咖啡杯 wooden table','a cup of coffee on a wooden table']){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000),started=Date.now()
  const queryId=randomUUID(),onAbort=()=>{void host.cancelSemanticQuery(scope,queryId)}
  abort.signal.addEventListener('abort',onAbort,{once:true})
  try{const result=await host.searchSemanticPage({...scope,query,queryId,mode:'semantic',tagScope:'includes-pending',limit:80});assert.equal(result.matches.length,44);attempts.push({query,state:'returned',durationMs:Date.now()-started,top:result.matches.slice(0,3).map(m=>m.asset.title)})}
  catch(error){attempts.push({query,state:'failed',durationMs:Date.now()-started,error:String(error)});throw error}
  finally{clearTimeout(timer);abort.signal.removeEventListener('abort',onAbort);await fs.writeFile(path.join(root,'result.json'),JSON.stringify({scope:'internal real Host/Runtime query feedback loop, not GUI acceptance',attempts,samples},null,2))}
 }
 console.log(JSON.stringify({attempts,evidence:path.relative(process.cwd(),root)}))
}finally{clearInterval(sample);await host.close();await runtime.suspendAndDrain();admission.invalidate();db.close()}
