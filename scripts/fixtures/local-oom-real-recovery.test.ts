import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
import Database from 'better-sqlite3'
import {createManagedVisionRuntime,MANAGED_VISION_ID} from '../../src/main/services/ai-runtime/managed-vision-runtime'
import {launchManagedGguf} from '../../src/main/services/ai-runtime/managed-gguf-transport'
import {createManagedGgufPackages} from '../../src/main/services/ai-runtime/managed-gguf-packages'
import {createManagedModelLibrary} from '../../src/main/model-library-workspace/managed-model-library'
import {createVisualAdmission} from '../../src/main/visual-ai/visual-admission'
import {createLocalAiDeviceSampler} from '../../src/main/local-ai-resources/device-sampler'
import {createBasicAnalysisController} from '../../src/main/background-analysis/basic-analysis-controller'
import {createNewInstallAppSettingsDefaults} from '../../src/main/services/settings/settings-defaults.builder'
import {createActiveLibraryHost} from '../../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../../src/main/library-lifecycle/production-active-library-dependencies'
import {createAiDiagnostics} from '../../src/main/local-ai-resources/ai-diagnostics'
import {DAM_BUILD_IDENTITY} from '../../src/shared/build-identity.generated'

// Explicitly authorized public content, actual installed/qualified model data,
// isolated App DB and recoverable Library copy. This injects ONE owned GPU OOM;
// the lower plan, model response, Host effect and release are real. Main never
// supplies this launcher. No credentials, request keys or settings are read.
const profile=path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04')
const sourceLibrary=path.resolve('.scratch/b-model-management-20261006/real-library-01')
const evidenceRoot=path.resolve('.scratch/local-ai-implementation-20261006')
const root=path.join(evidenceRoot,'oom-fault-'+randomUUID()),library=path.join(root,'library')
assert.equal(path.dirname(root),evidenceRoot)
await fs.mkdir(root);await fs.cp(sourceLibrary,library,{recursive:true,errorOnExist:true,force:false})
const source=new Database(path.join(profile,'app-state/app-state.sqlite'),{readonly:true,fileMustExist:true}),db=new Database(path.join(root,'app.sqlite'))
const diagnostics=createAiDiagnostics(db,'owned-real-oom-fault-test')
const denied=async()=>{throw Error('NETWORK_DENIED_IN_FAULT_TEST')}
const sampler=createLocalAiDeviceSampler();await sampler.refresh()
const admission=createVisualAdmission({devices:sampler.read,policy:{mode:'normal',reserveFraction:.1}})
let settings=createNewInstallAppSettingsDefaults(),faults=0,physicalCalls=0,basic:ReturnType<typeof createBasicAnalysisController>|undefined
const packages=createManagedGgufPackages({database:db,root:path.join(profile,'managed-gguf-runtime'),fetch:denied,changed(){}})
const models=createManagedModelLibrary({database:db,root:path.join(profile,'managed-models'),runner:path.resolve('out/main/ai-service/tools/managed_vision_worker.py'),fetch:denied,
 selectModel:async()=>null,selectPython:async()=>null,reserve:(id,signal)=>admission.reserveResident(id,128*1024**2,signal),changed(){},admission})
// Copy only public inventory and package tables; never copy the App database.
db.prepare('INSERT OR REPLACE INTO managed_model_store VALUES(1,?)').run(source.prepare('SELECT identity FROM managed_model_store WHERE singleton=1').pluck().get())
const row=source.prepare("SELECT id,record FROM managed_model_entries WHERE json_extract(record,'$.artifact.modelId')='qwen3-vl-2b-instruct' AND json_extract(record,'$.artifact.gguf.languageQuantization')='Q4_K_M'").get() as {id:string;record:string}|undefined
if(!row)throw Error('REAL_QUALIFIED_MODEL_REQUIRED')
db.prepare('INSERT INTO managed_model_entries VALUES(?,?)').run(row.id,row.record)
for(const r of source.prepare('SELECT variant,record FROM managed_gguf_packages').all() as Array<{variant:string;record:string}>)db.prepare('INSERT INTO managed_gguf_packages VALUES(?,?)').run(r.variant,r.record)
source.close()
const runtime=createManagedVisionRuntime({database:db,runner:path.resolve('out/main/ai-service/tools/managed_vision_worker.py'),models,ggufPackages:packages,admission,
 settings:{getSettings:()=>settings,saveSettings:value=>(settings={...settings,...value})} as any,selectModel:async()=>null,selectPython:async()=>null,changed(){},refreshDevices:sampler.refresh,
 launchGguf:async(c,signal)=>{const owned=await launchManagedGguf(c,signal);return {...owned,invoke:async input=>{if(input.outputContract==='caption-v1'&&c.native?.plan.mode==='gpu'&&faults===0){faults++;throw Error('LOCAL_OOM')}return owned.invoke(input)}}}})
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library})}))
try{
 await host.open();assert.equal(host.inspect().state,'ready')
 if(!models.verifiedConfigurations(row.id).some(c=>c.native?.plan.mode==='cpu'))await runtime.activateModel(row.id,{mode:'cpu'})
 assert.ok(models.verifiedConfigurations(row.id).some(c=>c.native?.plan.mode==='cpu'),'The lower plan must pass actual image qualification before the fault')
 await runtime.activateModel(row.id,{mode:'gpu',deviceId:sampler.read().find(d=>d.state==='known')!.id})
 const scope={libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!},asset=(await host.listAssets()).find(a=>a.title==='public-04-coffee')!
 const provider={prepare:async(_id:string,signal:AbortSignal)=>runtime.prepare(signal),invokeOnce:async(input:any)=>{physicalCalls++;return runtime.invokeOnce(input)},recoverLocal:runtime.recoverLocal,finishLocalRecovery:runtime.finishLocalRecovery}
 basic=createBasicAnalysisController({diagnostics:diagnostics.record,host,settings:()=>settings,provider,admission,tags:{} as any,ocr:{} as any,ocrRuntime:{} as any,changed(){},upgrade:async(input,signal)=>{if((await host.readAssetContext([])).schemaVersion<14)await host.enableBasicAnalysis(input,signal)}})
 const review=await basic.prepare('owned-fault-test',{...scope,assetIds:[asset.id],capabilities:['caption'],backendId:MANAGED_VISION_ID,model:runtime.status().model!})
 const job=await basic.run('owned-fault-test',review.receipt)
 for(let n=0;n<2400;n++){const current=basic.inspect('owned-fault-test',job.id);if(!['queued','running'].includes(current.state))break;await new Promise(r=>setTimeout(r,50))}
 const result=basic.inspect('owned-fault-test',job.id)
 if(result.state!=='completed')console.log(JSON.stringify({faults,physicalCalls,runtimeError:runtime.status().error,stages:diagnostics.read(),audit:db.prepare('SELECT record FROM local_oom_recovery ORDER BY rowid DESC LIMIT 1').pluck().get()}))
 assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(faults,1);assert.equal(physicalCalls,2)
 const saved=await host.readCaptions({...scope,assetId:asset.id});assert.ok(saved.at(-1)?.caption.includes('咖啡'))
 const audit=JSON.parse(String(db.prepare('SELECT record FROM local_oom_recovery ORDER BY rowid DESC LIMIT 1').pluck().get()))
 assert.equal(audit.state,'retry-response-received');assert.equal(audit.toMode,'cpu');assert.equal(audit.physicalCalls,2)
 await basic.suspendAndDrain();await runtime.drain();assert.equal(admission.resourceStatus().residentBytes,0)
 await host.close();await host.reopen();assert.equal((await host.readCaptions({...scope,assetId:asset.id})).length,saved.length)
 await fs.writeFile(path.join(root,'result.json'),JSON.stringify({candidateBuild:DAM_BUILD_IDENTITY.buildId,scope:'internal real model/Host acceptance seam, not a visible user path',fault:'one injected owned GPU OOM',model:runtime.status().model,result,saved,audit,physicalCalls,resource:admission.resourceStatus()},null,2))
 console.log(JSON.stringify({result:'REAL_LOWER_PLAN_AND_SAVED_RESPONSE',physicalCalls,model:runtime.status().model,caption:saved.at(-1)?.caption,auditState:audit.state,evidence:path.relative(process.cwd(),root)}))
}finally{await basic?.suspendAndDrain();await runtime.drain();await host.close();admission.invalidate();await sampler.stop();db.close()}
