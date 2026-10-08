import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash,randomUUID} from 'node:crypto'
import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process'
import {StringDecoder} from 'node:string_decoder'
import type Database from 'better-sqlite3'
import sharp from 'sharp'
import {bindPythonDependencies} from '../services/ai-runtime/python-environment-binding'
import type {VisualAdmission,ResidencyPermit} from '../visual-ai/visual-admission'
import {RETRIEVAL_RESIDENT_BYTES,RETRIEVAL_COMPUTE_BYTES,publicCode,type RetrievalArtifact,type RetrievalModelLibrary} from './retrieval-model-library'
import type {RetrievalQualification,RetrievalWorkspaceStatus} from '../../shared/contracts/retrieval-workspace.contract'
import {createRetrievalRunnerArchive} from './retrieval-runner-archive'

const dot=(a:number[],b:number[])=>a.reduce((sum,value,i)=>sum+value*b[i],0)
export function validateRetrievalVectors(value:unknown,count:number):number[][] {
  if(!Array.isArray(value)||value.length!==count)throw Error('RETRIEVAL_VECTOR_INVALID')
  for(const vector of value){if(!Array.isArray(vector)||vector.length!==768||vector.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('RETRIEVAL_VECTOR_INVALID')
    const norm=Math.sqrt(dot(vector,vector));if(Math.abs(norm-1)>.002)throw Error('RETRIEVAL_VECTOR_INVALID')}
  return value
}
interface Binding {python:string;modelId:string|null;fingerprint:string|null}
export function createRetrievalRuntime(d:{database:Database.Database;runner:string;archiveRoot?:string;models:RetrievalModelLibrary;admission:VisualAdmission;selectPython():Promise<string|null>;changed():void}) {
  d.database.exec('CREATE TABLE IF NOT EXISTS retrieval_runtime(singleton INTEGER PRIMARY KEY CHECK(singleton=1),record TEXT NOT NULL)')
  d.database.exec('CREATE TABLE IF NOT EXISTS retrieval_validation_reports(id TEXT PRIMARY KEY,record TEXT NOT NULL)')
  const archive=d.archiveRoot?createRetrievalRunnerArchive(d.database,d.archiveRoot):undefined
  let activeRunner=d.runner
  const binding=():Binding|null=>{const row=d.database.prepare('SELECT record FROM retrieval_runtime WHERE singleton=1').pluck().get();return typeof row==='string'?JSON.parse(row):null}
  const save=(value:Binding)=>d.database.prepare('INSERT INTO retrieval_runtime VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET record=excluded.record').run(JSON.stringify(value))
  let state:RetrievalWorkspaceStatus['runtime']['state']=binding()?'inactive':'unconfigured',error:string|null=null,
    child:ChildProcessWithoutNullStreams|undefined,resident:ResidencyPermit|undefined,active:RetrievalArtifact|undefined,
    peakRamBytes:number|null=null,loadMs:number|null=null,fingerprint:string|null=null,
    pending:{id:string;count:number;resolve(v:number[][]):void;reject(e:Error):void}|undefined,
    closing=Promise.resolve(),closeResolve:(()=>void)|undefined,activation:Promise<void>|undefined,
    stopTimer:ReturnType<typeof setTimeout>|undefined,idleTimer:ReturnType<typeof setTimeout>|undefined,
    suspended=false,validating=false,validationAbort:AbortController|undefined
  const stamps=new Map<string,string>()
  const status=():RetrievalWorkspaceStatus['runtime']=>({state,modelId:binding()?.modelId??null,spaceId:active?.qualification?.spaceId??null,error,peakRamBytes,loadMs,pythonSelected:Boolean(binding()?.python)})
  const currentSpace=():RetrievalQualification|null=>{const c=binding();if(!c?.fingerprint||!c.modelId||suspended)return null
    const model=d.models.summary().models.find(v=>v.id===c.modelId&&v.trusted)
    return model?.qualification?.fingerprint===c.fingerprint?model.qualification:null}
  const changed=()=>d.changed()
  const releaseIncrement=(permit:{release():void})=>{if(child&&state==='unknown')void closing.then(()=>permit.release());else permit.release()}
  function touch(){clearTimeout(idleTimer);if(child&&state==='ready'&&!pending&&!validating){const mode=d.admission.resourceStatus().policy.mode
    idleTimer=setTimeout(()=>{void stop().catch(()=>{})},mode==='quiet'?0:mode==='accelerated'?300000:45000);idleTimer.unref?.()}}
  function observed(metrics:any){if(!Number.isSafeInteger(metrics?.rssBytes)||!Number.isSafeInteger(metrics?.peakRamBytes)||metrics.rssBytes<1||metrics.peakRamBytes<metrics.rssBytes)throw Error('RETRIEVAL_RESOURCE_INVALID')
    peakRamBytes=Math.max(peakRamBytes??0,metrics.peakRamBytes);resident?.observe(metrics.rssBytes)
    if(peakRamBytes>RETRIEVAL_RESIDENT_BYTES)throw Error('RETRIEVAL_RESOURCE_ESTIMATE_EXCEEDED')}
  async function stamp(file:string){const s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink())throw Error('LOCAL_MODEL_CHANGED');return `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`}
  async function runtimeFingerprint(python:string,artifact:RetrievalArtifact,signal:AbortSignal,runner=d.runner) {
    const digest=createHash('sha256').update('siglip2-cpu-f32-224-original-text64-l2-v1').update(artifact.artifactFingerprint)
    digest.update(await fs.readFile(python)).update(await fs.readFile(runner))
    await bindPythonDependencies(python,digest,['torch-','transformers-','numpy-','pillow-','tokenizers-','psutil-'],signal)
    return digest.digest('hex')
  }
  async function stop(){
    clearTimeout(idleTimer)
    if(!child)return
    const owned=child;state='stopping';changed()
    try{owned.stdin.end(JSON.stringify({kind:'stop'})+'\n')}catch{/* Only close proves release. */}
    stopTimer=setTimeout(()=>{try{owned.kill()}catch{}},250);stopTimer.unref?.()
    let cancel:ReturnType<typeof setTimeout>|undefined
    await Promise.race([closing,new Promise<void>(resolve=>{cancel=setTimeout(resolve,2500)})]);clearTimeout(cancel)
    if(child===owned){state='unknown';error='RETRIEVAL_PROCESS_EXIT_UNCONFIRMED';resident?.markUnconfirmed();changed();throw Error(error)}
  }
  async function start(artifact:RetrievalArtifact,python:string,signal:AbortSignal,runner=d.runner) {
    if(child){if(active?.id===artifact.id&&fingerprint===await runtimeFingerprint(python,artifact,signal,runner)&&state==='ready')return;await stop()}
    signal.throwIfAborted();if(child)throw Error('RETRIEVAL_PROCESS_EXIT_UNCONFIRMED')
    if(suspended)throw Error('VISUAL_ADMISSION_SUSPENDED')
    fingerprint=await runtimeFingerprint(python,artifact,signal,runner);activeRunner=runner
    resident=d.admission.reserveResident('retrieval-runtime',RETRIEVAL_RESIDENT_BYTES,signal)
    active=artifact;peakRamBytes=null;loadMs=null;state='loading';error=null;changed()
    let loadedResolve!:()=>void,loadedReject!:(error:Error)=>void
    const loaded=new Promise<void>((resolve,reject)=>{loadedResolve=resolve;loadedReject=reject})
    closing=new Promise<void>(resolve=>{closeResolve=resolve})
    const owned=spawn(python,['-I','-B',runner,artifact.directory],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,LANG:'en_US.UTF-8',OMP_NUM_THREADS:'2'}})
    child=owned
    const decoder=new StringDecoder('utf8');let output='',stderr=0
    const fail=(code:string)=>{error=code;state='failed';loadedReject(Error(code));pending?.reject(Error(code));pending=undefined;try{owned.kill()}catch{};changed()}
    owned.on('error',()=>fail('RETRIEVAL_RUNTIME_UNAVAILABLE'))
    owned.stdin.on('error',()=>fail('RETRIEVAL_STREAM_FAILED'));owned.stdout.on('error',()=>fail('RETRIEVAL_STREAM_FAILED'));owned.stderr.on('error',()=>fail('RETRIEVAL_STREAM_FAILED'))
    owned.stderr.on('data',(chunk:Buffer)=>{stderr+=chunk.length;if(stderr>1024**2)fail('RETRIEVAL_OUTPUT_TOO_LARGE')})
    owned.stdout.on('data',(chunk:Buffer)=>{
      output+=decoder.write(chunk);if(Buffer.byteLength(output)>1024**2){fail('RETRIEVAL_OUTPUT_TOO_LARGE');return}
      for(;;){const end=output.indexOf('\n');if(end<0)break;const line=output.slice(0,end);output=output.slice(end+1)
        try{const message=JSON.parse(line);if(message.metrics)observed(message.metrics)
          if(message.kind==='loaded'){if(message.dimension!==768||!Number.isSafeInteger(message.loadMs))throw Error('RETRIEVAL_SPACE_UNSUPPORTED');loadMs=message.loadMs;state='ready';loadedResolve()}
          else if(message.kind==='result'&&pending&&pending.id===message.id){const p=pending,vectors=validateRetrievalVectors(message.vectors,p.count);pending=undefined;p.resolve(vectors)}
          else if(message.kind==='error'&&pending&&pending.id===message.id){const p=pending;pending=undefined;p.reject(Error(publicCode(Error(message.code))))}
          else if(message.kind==='failed')fail('RETRIEVAL_RUNTIME_FAILED')
          else if(message.kind!=='metrics')throw Error('RETRIEVAL_PROTOCOL_FAILED')
        }catch(e){fail(publicCode(e))}
      }
    })
    owned.on('close',()=>{
      clearTimeout(stopTimer);clearTimeout(idleTimer);if(child===owned){child=undefined;resident?.release();resident=undefined;active=undefined;stamps.clear();state=error?'failed':'inactive'}
      loadedReject(Error(error??'RETRIEVAL_RUNTIME_EXITED'));pending?.reject(Error(error??'RETRIEVAL_RUNTIME_EXITED'));pending=undefined;closeResolve?.();changed()
    })
    let timeout:ReturnType<typeof setTimeout>|undefined
    const abort=()=>{fail('RETRIEVAL_CANCELLED')}
    signal.addEventListener('abort',abort,{once:true})
    try{await Promise.race([loaded,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('RETRIEVAL_LOAD_TIMEOUT')),120000)})]);signal.throwIfAborted()
      for(const file of [python,runner,...artifact.release.files.map(f=>path.join(artifact.directory,f.name))])stamps.set(file,await stamp(file))
      changed()
    }catch(e){error=publicCode(e);await stop();throw e}
    finally{clearTimeout(timeout);signal.removeEventListener('abort',abort)}
  }
  async function request(kind:'texts'|'images',values:string[],signal:AbortSignal) {
    if(!child||state!=='ready'||pending||signal.aborted)throw Error('RETRIEVAL_RUNTIME_BUSY')
    clearTimeout(idleTimer)
    const owned=child
    const result=new Promise<number[][]>((resolve,reject)=>{
      const id=randomUUID();pending={id,count:values.length,resolve,reject}
      try{owned.stdin.write(JSON.stringify({kind,id,[kind]:values})+'\n')}catch{pending=undefined;reject(Error('RETRIEVAL_STREAM_FAILED'))}
    })
    const abort=()=>{void stop().catch(()=>{});pending?.reject(Error('RETRIEVAL_CANCELLED'));pending=undefined}
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()
    try{const value=await result;signal.throwIfAborted();return value}finally{signal.removeEventListener('abort',abort);touch()}
  }
  async function current(signal:AbortSignal,requestedSpace?:string):Promise<RetrievalArtifact> {
    const c=binding();if(!c?.modelId||!c.fingerprint||suspended)throw Error('RETRIEVAL_NOT_QUALIFIED')
    // Trust is checked anew even when weights remain resident.
    const archived=requestedSpace?await archive?.resolve(requestedSpace):null
    const model=d.models.summary().models.find(v=>archived?v.id===archived.binding.modelId:requestedSpace?v.qualification?.spaceId===requestedSpace:v.id===c.modelId)
    const qualification=archived?.binding.qualification??model?.qualification
    if(!model?.trusted||!qualification||!requestedSpace&&qualification.fingerprint!==c.fingerprint)throw Error('RETRIEVAL_NOT_QUALIFIED')
    const expected=qualification.fingerprint,modelId=model.id,python=archived?.binding.python??c.python,runner=archived?.runner??d.runner
    const preserve=async(artifact:RetrievalArtifact)=>archive&&!archived?archive.preserve({modelId,python,artifactFingerprint:artifact.artifactFingerprint,qualification},d.runner,signal):runner
    if(child&&active?.id===modelId&&active.qualification?.spaceId===qualification.spaceId&&state==='ready'){
      for(const [file,prior] of stamps)if(await stamp(file)!==prior){await stop();throw Error('LOCAL_MODEL_CHANGED')}
      if(await runtimeFingerprint(python,active,signal,activeRunner)!==expected){await stop();throw Error('LOCAL_MODEL_CHANGED')}
      await preserve(active)
      return active
    }
    if(activation){await activation;signal.throwIfAborted();return current(signal,requestedSpace)}
    const task=(async()=>{const artifact=await d.models.resolve(modelId,signal)
      if(archived&&archived.binding.artifactFingerprint!==artifact.artifactFingerprint)throw Error('LOCAL_MODEL_CHANGED')
      artifact.qualification=qualification
      if(await runtimeFingerprint(python,artifact,signal,runner)!==expected)throw Error('LOCAL_MODEL_CHANGED')
      const pinned=await preserve(artifact)
      if(await runtimeFingerprint(python,artifact,signal,pinned)!==expected)throw Error('LOCAL_MODEL_CHANGED')
      await start(artifact,python,signal,pinned)})()
    activation=task
    try{await task;return active!}finally{if(activation===task)activation=undefined}
  }
  const queue=new Set<AbortController>()
  let tail=Promise.resolve()
  async function embed(kind:'texts'|'images',values:string[],signal:AbortSignal,priority:'foreground'|'background'='foreground',spaceId?:string) {
    if(values.length<1||values.length>8||values.some(v=>typeof v!=='string'||v.length<1||v.length>(kind==='texts'?4096:6*1024**2)))throw Error('RETRIEVAL_INPUT_INVALID')
    if(queue.size>=4)throw Error('RETRIEVAL_RUNTIME_BUSY')
    const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();queue.add(controller)
    let release!:()=>void;const before=tail;tail=new Promise<void>(r=>{release=r})
    try{await before;controller.signal.throwIfAborted();const artifact=await current(controller.signal,spaceId)
      const permit=await d.admission.reserveLocalWork('retrieval',RETRIEVAL_COMPUTE_BYTES,controller.signal,priority)
      try{return {vectors:await request(kind,values,controller.signal),space:artifact.qualification!}}
      catch(e){if(child&&(controller.signal.aborted||state==='failed'))await stop();throw e}
      finally{releaseIncrement(permit)}
    }finally{release();queue.delete(controller);signal.removeEventListener('abort',cancel);touch()}
  }
  const api={
    status,currentSpace,
    async selectRuntime(){if(activation||pending||validating)throw Error('RETRIEVAL_RUNTIME_BUSY');const python=await d.selectPython();if(!python)return
      const real=await fs.realpath(python);if(!path.isAbsolute(real))throw Error('RETRIEVAL_RUNTIME_UNAVAILABLE')
      await stop();const prior=binding();save({python:real,modelId:prior?.modelId??null,fingerprint:null});state='inactive';changed()},
    async verifyUse(id:string){
      const c=binding();if(!c?.python)throw Error('RETRIEVAL_PYTHON_REQUIRED')
      if(validating||activation||pending||queue.size)throw Error('RETRIEVAL_RUNTIME_BUSY')
      const prior=c;validating=true;validationAbort=new AbortController();const deadline=setTimeout(()=>validationAbort?.abort(),120000)
      const signal=validationAbort.signal;state='checking';error=null;changed()
      let compute:{release():void}|undefined
      try{
        const artifact=await d.models.resolve(id,signal);await start(artifact,c.python,signal)
        compute=await d.admission.reserveLocalWork('retrieval',RETRIEVAL_COMPUTE_BYTES,signal)
        const images:Buffer[]=[]
        for(const [name,sha] of [['astronaut.jpg','e54bf41617611bb18a83e8b8dd5ab49ac32b6b9fa25be5b507343da78ea29b9c'],['flag.jpg','80c6f7565f45f9e51c4c0e288521136dad77e14c4b739af746c46858ecda4ead']]){
          const bytes=await fs.readFile(path.join(path.dirname(d.runner),'retrieval_probe',name));if(createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('RETRIEVAL_PROBE_CHANGED');images.push(bytes)
        }
        const imageVectors=await request('images',images.map(v=>v.toString('base64')),signal)
        const languages:RetrievalQualification['languages']=[],subjectScores:Record<string,number[][]>={}
        for(const [language,texts] of [['zh',['一名身穿橙色太空服的宇航员','红白蓝三色的荷兰国旗']],['en',['an astronaut wearing an orange space suit','the red white blue flag of the Netherlands']],['mixed',['宇航员 astronaut portrait','荷兰 red white blue flag']]] as const){
          const textVectors=await request('texts',[...texts],signal)
          subjectScores[language]=textVectors.map(v=>imageVectors.map(image=>dot(v,image)))
          const correct=textVectors.filter((v,i)=>dot(v,imageVectors[i])>dot(v,imageVectors[1-i])).length
          languages.push({language,correct,total:2})
        }
        const imageChecks={correct:imageVectors.filter((v,i)=>dot(v,v)>dot(v,imageVectors[1-i])).length,total:2}
        const additionalChecks:RetrievalQualification['languages']=[],colourScores:Record<string,number[][]>={}
        const colours=await Promise.all(['#ed1010','#1010ed'].map(color=>sharp({create:{width:224,height:224,channels:3,background:color}}).jpeg().toBuffer()))
        const colourVectors=await request('images',colours.map(v=>v.toString('base64')),signal)
        for(const [language,texts] of [['zh',['一张纯红色的图片','一张纯蓝色的图片']],['en',['a solid red image','a solid blue image']],['mixed',['红色 red image','蓝色 blue image']]] as const){
          const vectors=await request('texts',[...texts],signal);colourScores[language]=vectors.map(v=>colourVectors.map(image=>dot(v,image)))
          additionalChecks.push({language,correct:vectors.filter((v,i)=>dot(v,colourVectors[i])>dot(v,colourVectors[1-i])).length,total:2})
        }
        d.database.prepare('INSERT INTO retrieval_validation_reports VALUES(?,?)').run(randomUUID(),JSON.stringify({fingerprint,modelId:id,testedAt:new Date().toISOString(),recipe:'public-subjects-and-colour-report-v1',languages,imageChecks,additionalChecks,subjectScores,colourScores}))
        d.database.prepare('DELETE FROM retrieval_validation_reports WHERE rowid NOT IN (SELECT rowid FROM retrieval_validation_reports ORDER BY rowid DESC LIMIT 20)').run()
        if(languages.some(v=>v.correct!==v.total))throw Error('RETRIEVAL_CAPABILITY_FAILED')
        if(imageChecks.correct!==imageChecks.total)throw Error('RETRIEVAL_CAPABILITY_FAILED')
        const qualification:RetrievalQualification={fingerprint:fingerprint!,spaceId:createHash('sha256').update(fingerprint!+'siglip2-768-l2-cosine-v1').digest('hex'),dimension:768,
          encoding:'float32-le',normalization:'l2',distance:'cosine',imageRecipe:'siglip2-rgb-224-v1',textRecipe:'siglip2-original-text-64-v1',languages,
          validationRecipe:'public-subjects-and-colour-report-v1',imageChecks,additionalChecks,testedAt:new Date().toISOString(),peakRamBytes:peakRamBytes!}
        signal.throwIfAborted()
        const pinned=await archive?.preserve({modelId:id,python:c.python,artifactFingerprint:artifact.artifactFingerprint,qualification},d.runner,signal)
        if(await runtimeFingerprint(c.python,artifact,signal,pinned??d.runner)!==qualification.fingerprint)throw Error('LOCAL_MODEL_CHANGED')
        signal.throwIfAborted();d.models.recordQualification(id,qualification);artifact.qualification=qualification;active=artifact
        save({python:c.python,modelId:id,fingerprint:fingerprint!});state='ready';error=null;changed()
      }catch(e){error=publicCode(e);await stop();save(prior);state='failed';changed();throw e}
      finally{if(compute)releaseIncrement(compute)
        clearTimeout(deadline);validating=false;validationAbort=undefined;touch()}
    },
    cancelValidation(){validationAbort?.abort()},
    embedTexts:(texts:string[],signal:AbortSignal,priority?:'foreground'|'background',spaceId?:string)=>embed('texts',texts,signal,priority,spaceId),
    embedImages:(images:Uint8Array[],signal:AbortSignal,priority?:'foreground'|'background',spaceId?:string)=>embed('images',images.map(v=>Buffer.from(v).toString('base64')),signal,priority,spaceId),
    async releaseIdle(){if(pending||activation||validating||queue.size)return false;await stop();return true},
    async rebalance(){if(d.admission.resourceStatus().pressure&&!pending&&!activation&&!validating&&!queue.size)await stop()},
    async suspendAndDrain(){suspended=true;validationAbort?.abort();for(const controller of queue)controller.abort();await activation?.catch(()=>{});await tail;await stop()},
    resume(){suspended=false},
    async revoke(id:string){d.models.trust(id,false);archive?.revoke(id);if(binding()?.modelId===id||active?.id===id){validationAbort?.abort();for(const controller of queue)controller.abort();await stop()}},
  }
  const pressureTimer=setInterval(()=>{void api.rebalance().catch(()=>{})},2000);pressureTimer.unref?.()
  return api
}
export type RetrievalRuntime=ReturnType<typeof createRetrievalRuntime>
