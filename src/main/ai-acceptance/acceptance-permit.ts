import fs from 'node:fs/promises'
import path from 'node:path'
import {createHmac,randomBytes,randomUUID,timingSafeEqual,createHash} from 'node:crypto'
export interface AcceptancePlan{runId:string;connectionRef:string;configurationDigest:string;credentialRevision:number;model:string;origin:string;processingLocation:'local-service'|'external-service';inputDigest:string;generatedOnly:true;allowUserLibrary:false;actions:Array<'analyze'|'reverse'>;maxPhysicalRequests:number;maxOutputTokens:number;maxWallClockMs:number;maxEstimatedCostUsd:number;estimatedCostPerRequestUsd:number;pricingBasis:'owned-synthetic-no-charge'|'documented-estimate';expiresAt:number}
export interface AcceptancePermit{version:1;id:string;plan:AcceptancePlan;approvalSource:'trusted-main-user-action';signature:string}
const canonical=(v:unknown):string=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,JSON.parse(canonical(x))])):v)
export const acceptancePlanDigest=(p:AcceptancePlan)=>createHash('sha256').update(canonical(p)).digest('hex')
export function validateAcceptancePlan(p:AcceptancePlan,now=Date.now()){
 if(!p||Object.keys(p).sort().join('|')!==['runId','connectionRef','configurationDigest','credentialRevision','model','origin','processingLocation','inputDigest','generatedOnly','allowUserLibrary','actions','maxPhysicalRequests','maxOutputTokens','maxWallClockMs','maxEstimatedCostUsd','estimatedCostPerRequestUsd','pricingBasis','expiresAt'].sort().join('|'))throw Error('ACCEPTANCE_PLAN_INVALID')
 if(!p.generatedOnly||p.allowUserLibrary!==false||!p.runId||!p.connectionRef||!p.model||p.model.length>256||![p.configurationDigest,p.inputDigest].every(s=>/^[a-f0-9]{64}$/.test(s))||!Number.isSafeInteger(p.credentialRevision)||p.credentialRevision<0||!Array.isArray(p.actions)||!p.actions.length||p.actions.length>2||new Set(p.actions).size!==p.actions.length||p.actions.some(a=>!['analyze','reverse'].includes(a)))throw Error('ACCEPTANCE_PLAN_INVALID')
 const u=new URL(p.origin);if(u.origin!==p.origin||u.username||u.password||!['http:','https:'].includes(u.protocol)||!['local-service','external-service'].includes(p.processingLocation))throw Error('ACCEPTANCE_TARGET_INVALID')
 if(!Number.isSafeInteger(p.maxPhysicalRequests)||p.maxPhysicalRequests<1||p.maxPhysicalRequests>8||!Number.isSafeInteger(p.maxOutputTokens)||p.maxOutputTokens<1||p.maxOutputTokens>4096||!Number.isSafeInteger(p.maxWallClockMs)||p.maxWallClockMs<1||p.maxWallClockMs>120000||!Number.isFinite(p.expiresAt)||p.expiresAt<=now||p.expiresAt>now+3600000||!Number.isFinite(p.maxEstimatedCostUsd)||p.maxEstimatedCostUsd<0||!Number.isFinite(p.estimatedCostPerRequestUsd)||p.estimatedCostPerRequestUsd<0)throw Error('ACCEPTANCE_BUDGET_INVALID')
 if(p.pricingBasis==='owned-synthetic-no-charge'){if(p.origin!=='http://127.0.0.1:'+u.port||!u.port||p.maxEstimatedCostUsd!==0||p.estimatedCostPerRequestUsd!==0||p.processingLocation!=='local-service')throw Error('ACCEPTANCE_PRICING_INVALID')}
 else if(p.pricingBasis!=='documented-estimate'||p.maxEstimatedCostUsd<=0||p.estimatedCostPerRequestUsd<=0)throw Error('ACCEPTANCE_PRICING_UNKNOWN')
}
/** Main-only issuer. CLI plans have no signing operation or user-source assertion. Cooperative filesystem lock. */
export function createAcceptancePermitStore(directory:string){
 const keyFile=path.join(directory,'issuer.key'),stateFile=path.join(directory,'permits.json'),lock=path.join(directory,'writer.lock');let key:Buffer
 const sign=(v:Omit<AcceptancePermit,'signature'>)=>createHmac('sha256',key).update(canonical(v)).digest('hex')
 const locked=async<T>(action:(rows:Record<string,any>)=>Promise<T>)=>{
  await fs.mkdir(directory,{recursive:true,mode:0o700});const handle=await fs.open(lock,'wx',0o600)
  try{
   if(!key){try{await fs.writeFile(keyFile,randomBytes(32),{flag:'wx',mode:0o600})}catch(e){if((e as any).code!=='EEXIST')throw e}const st=await fs.lstat(keyFile);if(!st.isFile()||st.isSymbolicLink()||st.size!==32)throw Error('ACCEPTANCE_ISSUER_INVALID');key=await fs.readFile(keyFile)}
   let rows:Record<string,any>={};try{const st=await fs.lstat(stateFile);if(!st.isFile()||st.isSymbolicLink()||st.size>1048576)throw Error('ACCEPTANCE_LEDGER_INVALID');rows=JSON.parse(await fs.readFile(stateFile,'utf8'))}catch(e){if((e as any).code!=='ENOENT')throw e}
   const value=await action(rows),tmp=stateFile+'.'+randomUUID();await fs.writeFile(tmp,JSON.stringify(rows),{flag:'wx',mode:0o600});await fs.rename(tmp,stateFile);return value
  }finally{await handle.close();await fs.unlink(lock)}
 }
 const validate=(permit:AcceptancePermit,expected:AcceptancePlan)=>{
  validateAcceptancePlan(permit.plan);if(permit.version!==1||permit.approvalSource!=='trusted-main-user-action'||acceptancePlanDigest(expected)!==acceptancePlanDigest(permit.plan)||!/^[a-f0-9]{64}$/.test(permit.signature))throw Error('ACCEPTANCE_APPROVAL_INVALID')
  const{signature,...value}=permit;if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(value),'hex')))throw Error('ACCEPTANCE_APPROVAL_INVALID')
 }
 return{
  issueForUserAction(plan:AcceptancePlan){validateAcceptancePlan(plan);return locked(async rows=>{const data={version:1 as const,id:randomUUID(),plan:structuredClone(plan),approvalSource:'trusted-main-user-action' as const},permit={...data,signature:sign(data)};rows[permit.id]={digest:acceptancePlanDigest(plan),started:false,spent:0,completed:false,costHeldUsd:0};return permit})},
  begin(permit:AcceptancePermit,expected:AcceptancePlan){return locked(async rows=>{validate(permit,expected);const row=rows[permit.id];if(!row||row.started||row.completed)throw Error('ACCEPTANCE_APPROVAL_CONSUMED');row.started=true;row.startedAt=Date.now();return true})},
  reserveRequest(permit:AcceptancePermit,expected:AcceptancePlan,maxTokens:number){return locked(async rows=>{validate(permit,expected);const row=rows[permit.id];if(!row?.started||row.completed||row.spent>=permit.plan.maxPhysicalRequests||!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>permit.plan.maxOutputTokens||row.costHeldUsd+permit.plan.estimatedCostPerRequestUsd>permit.plan.maxEstimatedCostUsd||Date.now()-row.startedAt>=permit.plan.maxWallClockMs)throw Error('ACCEPTANCE_BUDGET_EXHAUSTED');row.spent++;row.costHeldUsd+=permit.plan.estimatedCostPerRequestUsd;return row.spent})},
  complete(permit:AcceptancePermit,state:'succeeded'|'failed'|'unknown'){return locked(async rows=>{const row=rows[permit.id];if(!row?.started)throw Error('ACCEPTANCE_APPROVAL_INVALID');row.completed=true;row.state=state;return{spent:row.spent,state}})}
 }
}
