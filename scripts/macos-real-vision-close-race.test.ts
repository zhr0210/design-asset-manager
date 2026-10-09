// Actual installed model/binary and qualification. Only post-close disposal and
// delivery of TERM are delayed; no fabricated readiness or active-profile writes.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import Database from 'better-sqlite3'
import {createManagedVisionRuntime} from '../src/main/services/ai-runtime/managed-vision-runtime'
import {createManagedModelLibrary} from '../src/main/model-library-workspace/managed-model-library'
import {createManagedGgufPackages} from '../src/main/services/ai-runtime/managed-gguf-packages'
import {launchManagedGguf} from '../src/main/services/ai-runtime/managed-gguf-transport'
import {createLocalAiDeviceSampler} from '../src/main/local-ai-resources/device-sampler'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
import {createAiDiagnostics} from '../src/main/local-ai-resources/ai-diagnostics'
import {PiProcessUnconfirmedError} from '../src/main/ai-gateway/pi-runtime-host'

const profile=process.env.DAM_TEST_VISION_PROFILE
assert.ok(profile,'Name the designated installed public profile')
// The bundled test has the same adjacent-resource lookup as the built Main.
const resources=path.join(path.dirname(fileURLToPath(import.meta.url)),'macos-runtime')
await fs.mkdir(resources,{recursive:true})
for(const file of ['owned-memory','video'])try{await fs.copyFile(path.resolve('build/macos-runtime',file),path.join(resources,file),fs.constants.COPYFILE_EXCL)}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e}
const source=new Database(path.join(profile,'app-state/app-state.sqlite'),{readonly:true,fileMustExist:true})
const entry=source.prepare("SELECT id,record FROM managed_model_entries WHERE json_extract(record,'$.trusted')=1 AND json_extract(record,'$.release.repository')='Qwen/Qwen3-VL-2B-Instruct-GGUF' LIMIT 1").get() as {id:string;record:string}
const identity=source.prepare('SELECT identity FROM managed_model_store WHERE singleton=1').pluck().get()
const packageRecord=source.prepare("SELECT record FROM managed_gguf_packages WHERE variant='macos-arm64'").pluck().get()
source.close();assert.ok(entry);assert.equal(typeof packageRecord,'string')
const configuration=JSON.parse(entry.record).configuration
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-owned-close-race-')))
const db=new Database(path.join(root,'isolated.sqlite'))
const diagnostics=createAiDiagnostics(db,'real-owned-trace-test');
const sampler=createLocalAiDeviceSampler();await sampler.refresh()
const admission=createVisualAdmission({memory:()=>sampler.memory(),devices:()=>sampler.read()})
let settings=createNewInstallAppSettingsDefaults()
db.exec('CREATE TABLE managed_model_store(singleton INTEGER PRIMARY KEY,identity TEXT NOT NULL)')
db.prepare('INSERT INTO managed_model_store VALUES(1,?)').run(identity)
const models=createManagedModelLibrary({database:db,root:path.join(profile,'managed-models'),runner:path.resolve('ai-service/tools/managed_vision_worker.py'),
  fetch:async()=>{throw Error('NO_NETWORK_EXPECTED')},selectModel:async()=>null,selectPython:async()=>null,
  reserve:(id,signal)=>admission.reserveResident(id,256*1024**2,signal),changed(){},admission})
db.prepare('INSERT INTO managed_model_entries VALUES(?,?)').run(entry.id,entry.record)
const packageRoot=path.join(root,'packages')
await fs.mkdir(packageRoot)
await fs.copyFile(path.join(path.dirname(path.dirname(configuration.native.binding.root)),'.dam-native-runtime-store'),path.join(packageRoot,'.dam-native-runtime-store'))
// Binding root contains the official runtime, not the private request directories.
const published=path.join(packageRoot,path.basename(path.dirname(configuration.native.binding.root)))
await fs.mkdir(published)
await fs.copyFile(path.join(path.dirname(configuration.native.binding.root),'.dam-native-runtime-store'),path.join(published,'.dam-native-runtime-store'))
await fs.cp(configuration.native.binding.root,path.join(published,path.basename(configuration.native.binding.root)),{recursive:true})
const packages=createManagedGgufPackages({database:db,root:packageRoot,fetch:async()=>{throw Error('NO_NETWORK_EXPECTED')}})
db.prepare('INSERT INTO managed_gguf_packages VALUES(?,?)').run('macos-arm64',packageRecord)
let enterCleanup!:()=>void,releaseCleanup!:()=>void,cleanupDone!:()=>void
const entered=new Promise<void>(r=>enterCleanup=r),gate=new Promise<void>(r=>releaseCleanup=r),disposed=new Promise<void>(r=>cleanupDone=r)
const launches:Array<Awaited<ReturnType<typeof launchManagedGguf>>>=[]
const runtime=createManagedVisionRuntime({database:db,admission,models,ggufPackages:packages,diagnostics:diagnostics.record,
  runner:path.resolve('ai-service/tools/managed_vision_worker.py'),settings:{getSettings:()=>settings,saveSettings:n=>(settings={...settings,...n})},
  selectModel:async()=>null,selectPython:async()=>null,changed(){},launchGguf:async(c,s)=>{
    const actual=await launchManagedGguf(c,s);launches.push(actual)
    if(launches.length!==1)return actual
    return{...actual,dispose:async()=>{enterCleanup();await gate;try{await actual.dispose()}finally{cleanupDone()}}}
  }})
let firstStop:Promise<boolean>|undefined
let restoreKill:(()=>void)|undefined
try{
  await runtime.activateModel(entry.id,{mode:'cpu'})
  assert.equal(runtime.status().state,'ready')
  const prepared = await runtime.prepare(new AbortController().signal)
  assert.equal(await runtime.releaseIdle(),false,'a queued consumer keeps its preparation protection')
  assert.equal(typeof prepared,'function','preparation must return an owned release, independent of later transport signals')
  if(typeof prepared === 'function') prepared()
  firstStop=runtime.releaseIdle();await entered
  assert.equal(launches[0].child.exitCode!==null||launches[0].child.signalCode!==null,true)
  const stopped=await Promise.race([firstStop.then(()=>true),new Promise<boolean>(r=>setTimeout(()=>r(false),1500))])
  assert.equal(stopped,true,'physical close must resolve its own stop before delayed filesystem cleanup')
  const firstTrace=diagnostics.read().find(r=>r.release)?.release!;assert.equal(firstTrace.cause,'idle-release');assert.equal(firstTrace.pid,launches[0].child.pid);assert.equal(firstTrace.physicalCloseSeen,true)
  await runtime.activateModel(entry.id,{mode:'cpu'})
  assert.equal(runtime.status().state,'ready')
  const second=launches[1].child,originalKill=second.kill.bind(second)
  // Actual process stays alive to prove that a cleanup callback cannot confirm
  // another process's exit. Its original signal delivery is restored below.
  second.kill=()=>true;restoreKill=()=>{second.kill=originalKill}
  const nextStop=runtime.releaseIdle().catch(e=>e)
  releaseCleanup();await disposed
  const result=await nextStop
  assert.ok(result instanceof PiProcessUnconfirmedError)
  const pendingTrace=diagnostics.read().find(r=>r.release?.pid===second.pid)?.release!;assert.equal(pendingTrace.cause,'idle-release');assert.equal(pendingTrace.signalRequested,true);assert.equal(pendingTrace.physicalCloseSeen,false)
  assert.equal(runtime.status().state,'unknown')
  assert.ok(admission.resourceStatus().residentBytes>0,'an alive replacement keeps its real memory reservation')
  process.kill(second.pid!,0)
  restoreKill();restoreKill=undefined;originalKill('SIGTERM');await result.released
  assert.equal(admission.resourceStatus().residentBytes,0)
  assert.equal(diagnostics.read().find(r=>r.release?.pid===second.pid)?.release?.physicalCloseSeen,true,'late physical close is recorded separately from the timeout')
  console.log('Real qualification twice; owned close separated from delayed disposal; replacement alive/unknown retained until actual close. No active profile DB writes.')
}finally{
  restoreKill?.();releaseCleanup();await firstStop?.catch(()=>{})
  await runtime.drain();await packages.drain();await models.drain();await sampler.stop();db.close()
  assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-owned-close-race-'))
  await fs.rm(root,{recursive:true,force:true})
}
