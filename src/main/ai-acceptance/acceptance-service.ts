import {PiProcessUnconfirmedError} from '../ai-gateway/pi-runtime-host'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID,createHash} from 'node:crypto'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../library-lifecycle/production-active-library-dependencies'
import {createVisualAiController} from '../visual-ai/visual-ai-controller'
import {createVisualAdmission} from '../visual-ai/visual-admission'
import {createNewInstallAppSettingsDefaults} from '../services/settings/settings-defaults.builder'
import {publicBackend} from '../ai-credentials/public-settings'
import {requireBackendInference} from '../../shared/constants/pi-provider-admission'
import {createAcceptancePermitStore,type AcceptancePlan,type AcceptancePermit} from './acceptance-permit'
import type {AiConnectionService} from '../ai-gateway/ai-connection-service'
import type {SettingsServicePort} from '../ipc/settings.ipc'
const hash=(b:unknown)=>createHash('sha256').update(b instanceof Uint8Array?b:typeof b==='string'?b:JSON.stringify(b)).digest('hex')
export function createAcceptanceService(d:{directory:string;settings:SettingsServicePort;connections:AiConnectionService;admission?:ReturnType<typeof createVisualAdmission>;isSynthetic?:boolean}){
 let preparing=0,suspended=false;const preparations=new Set<Promise<void>>(),confirmations=new Set<Promise<void>>()
 const store=createAcceptancePermitStore(path.join(d.directory,'authorization')),reviews=new Map<string,any>(),jobs=new Map<string,any>()
 const backend=(id:string)=>{const b=d.settings.getSettings().aiBackends?.find(b=>b.id===id);if(!b)throw Error('ACCEPTANCE_CONNECTION_MISSING');return structuredClone(b)}
 const dispose=async(row:any)=>{await row.controller.suspendAndDrain();await row.host.close();await fs.rm(row.root,{recursive:true,force:true})}
 return{
  async prepare(input:{connectionRef:string;model:string;maxPhysicalRequests:number;maxOutputTokens:number;maxWallClockMs:number;maxEstimatedCostUsd:number;estimatedCostPerRequestUsd:number}){
   if(suspended||reviews.size+preparing>=2)throw Error('ACCEPTANCE_BUSY');preparing++;let finishPrepare!:()=>void;const pending=new Promise<void>(r=>{finishPrepare=r});preparations.add(pending)
   try{const b=backend(input.connectionRef);requireBackendInference(b)
   if(!b.enabled||!b.capabilities.vision||!input.model?.trim())throw Error('ACCEPTANCE_MODEL_REQUIRED')
   const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-acceptance-generated-'))),image=path.join(root,'generated.png'),library=path.join(root,'library')
   let host:ReturnType<typeof createActiveLibraryHost>|undefined,controller:ReturnType<typeof createVisualAiController>|undefined
   try{
    await sharp({create:{width:96,height:64,channels:3,background:'#7799bb'}}).png().toFile(image)
    host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:image}]})}))
    const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('ACCEPTANCE_CREATE_FAILED');await host.confirmCreate(create.plan.receipt);const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('ACCEPTANCE_ADD_FAILED');await host.dispatchAddAssets(add.plan.receipt)
    const inspect=host.inspect(),asset=(await host.listAssets())[0],scope={libraryIdentity:inspect.identity!,generation:inspect.generation!},id=randomUUID()
    const plan:AcceptancePlan={runId:'acceptance-'+id,connectionRef:b.id,configurationDigest:hash(publicBackend(b)),credentialRevision:b.credentialRevision??0,model:input.model.trim(),origin:new URL(b.baseUrl).origin,processingLocation:['localhost','127.0.0.1','[::1]'].includes(new URL(b.baseUrl).hostname)&&b.processingLocation!=='external-service'?'local-service':'external-service',inputDigest:hash(await fs.readFile(image)),generatedOnly:true,allowUserLibrary:false,actions:['analyze'],maxPhysicalRequests:input.maxPhysicalRequests,maxOutputTokens:input.maxOutputTokens,maxWallClockMs:input.maxWallClockMs,maxEstimatedCostUsd:input.maxEstimatedCostUsd,estimatedCostPerRequestUsd:input.estimatedCostPerRequestUsd,pricingBasis:d.isSynthetic?'owned-synthetic-no-charge':'documented-estimate',expiresAt:Date.now()+300000}
    // Creating this controller does not run inference, read Vault or request a catalog.
    let permit:AcceptancePermit|undefined,unknownRelease:Promise<void>|undefined,errorCode:string|undefined
    const provider={invokeOnce:async(request:any)=>{if(!permit)throw Error('ACCEPTANCE_NO_APPROVAL');if(hash(publicBackend(backend(b.id)))!==plan.configurationDigest)throw Error('ACCEPTANCE_CONNECTION_CHANGED');await store.reserveRequest(permit,plan,request.maxTokens);try{return await d.connections.invokeForAcceptance(request)}catch(error){if(error instanceof PiProcessUnconfirmedError)unknownRelease=error.released;const message=error instanceof Error?error.message:'';errorCode=/^(AI|PI|ACCEPTANCE)_[A-Z0-9_]{1,80}$/.test(message)?message:'AI_INVOKE_FAILED';throw error}}}
    controller=createVisualAiController({host,settings:()=>({...createNewInstallAppSettingsDefaults(),aiBackends:[b]}),provider,admission:d.admission??createVisualAdmission(),onChanged:()=>{}})
    const visualReview=await controller.prepare('main',{...scope,assetIds:[asset.id],backendId:b.id,model:plan.model,purpose:'analyze'})
    if(suspended)throw Error('ACCEPTANCE_SUSPENDED')
    reviews.set(id,{getErrorCode:()=>errorCode,getUnknownRelease:()=>unknownRelease,id,root,host,controller,scope,asset,plan,visualReview,setPermit:(p:AcceptancePermit)=>{permit=p}})
    return{receipt:id,plan,notice:'只发送本应用生成的一张测试图；不读取用户资料库。'+visualReview.inputDescription+' 最多'+plan.maxPhysicalRequests+'次物理推理请求，截断重试也扣预算；费用为估计，不保证真实账单。未知发送不重试、不返还预算。'}
   }catch(error){await controller?.suspendAndDrain();await host?.close();await fs.rm(root,{recursive:true,force:true});throw error}
   }finally{preparing--;preparations.delete(pending);finishPrepare()}
  },
  async confirmForUserAction(id:string){
   if(suspended)throw Error('ACCEPTANCE_SUSPENDED');const row=reviews.get(id);if(!row)throw Error('ACCEPTANCE_REVIEW_EXPIRED');reviews.delete(id)
   let finishConfirm!:()=>void;const pending=new Promise<void>(r=>{finishConfirm=r});confirmations.add(pending)
   try{
    if(hash(publicBackend(backend(row.plan.connectionRef)))!==row.plan.configurationDigest)throw Error('ACCEPTANCE_CONNECTION_CHANGED')
    const permit=await store.issueForUserAction(row.plan);await store.begin(permit,row.plan);row.setPermit(permit)
    if(suspended)throw Error('ACCEPTANCE_SUSPENDED');const job=await row.controller.run('main',row.visualReview.receipt);row.jobId=job.id;row.permit=permit;row.started=Date.now();row.status={id,state:'running',spent:null,output:null,error:null};jobs.set(id,row)
    row.completion=(async()=>{let timer:ReturnType<typeof setTimeout>|undefined,terminalState='unknown';try{
     timer=setTimeout(()=>{void row.controller.cancel('main',job.id)},row.plan.maxWallClockMs)
     let current;for(;;){current=await row.controller.inspect('main',job.id);if(!['queued','running'].includes(current.state))break;await new Promise(r=>setTimeout(r,50))}
     terminalState=row.getUnknownRelease()?'unknown':current.state==='completed'?'succeeded':current.state==='cancelled'?'cancelled':'failed';row.status.output=current.items[0]?.evidence?.output??null;if(terminalState==='failed'){row.status.error=current.items[0]?.error??'本次验收未完成，原资料库保持。';row.status.errorCode=row.getErrorCode()}
     // Reopen actual temporary Host to verify retained evidence and byte-identical generated source.
     if(terminalState==='succeeded'){await row.host.close();await row.host.reopen();row.status.reopenedEvidenceCount=(await row.host.listVisualAiEvidence(row.asset.id)).length;if(hash(await fs.readFile(path.join(row.root,'generated.png')))!==row.plan.inputDigest)throw Error('ACCEPTANCE_INPUT_CHANGED')}
     const receipt=await store.complete(permit,terminalState==='succeeded'?'succeeded':['cancelled','unknown'].includes(terminalState)?'unknown':'failed');row.status.spent=receipt.spent
    }catch{terminalState='unknown';row.status.error='验收未完成；不自动重发或退回预算。';await store.complete(permit,'unknown').catch(()=>{})}finally{clearTimeout(timer);if(row.getUnknownRelease()){row.status.state='unknown';await row.getUnknownRelease()}await dispose(row).catch(()=>{terminalState='unknown'});row.status.state=terminalState;row.disposed=true;for(const[key,value]of jobs)if(jobs.size>100&&value.disposed)jobs.delete(key)}})()
    return{id,state:'running'}
   }catch(error){await dispose(row);throw error}finally{confirmations.delete(pending);finishConfirm()}
  },
  resume(){if(preparing===0&&confirmations.size===0&&[...jobs.values()].every(row=>row.disposed))suspended=false},
  status(id:string){const row=jobs.get(id);if(!row)throw Error('ACCEPTANCE_JOB_MISSING');return structuredClone(row.status)},
  async cancel(id:string){const row=jobs.get(id);if(row?.jobId)await row.controller.cancel('main',row.jobId)},
  async discard(id:string){const row=reviews.get(id);if(row){reviews.delete(id);await dispose(row)}},
  async drain(){suspended=true;let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([(async()=>{await Promise.all([...preparations,...confirmations]);for(const id of [...reviews.keys()]){const row=reviews.get(id);reviews.delete(id);await dispose(row)}await Promise.all([...jobs.values()].map(async row=>{if(row.status.state==='running')await row.controller.cancel('main',row.jobId);await row.controller.suspendAndDrain();await row.completion}))})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('ACCEPTANCE_DRAIN_UNCONFIRMED')),5000)})])}finally{clearTimeout(timer)}}
 }
}
