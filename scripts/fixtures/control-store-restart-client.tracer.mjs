/** Test supervisor: owns all A/H directly; no descendants or real profiles. */
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createEffectFixture} from './control-store-effect-client.tracer.mjs'
import {LIMITS,exact,error,canonicalPayload,operationId,sha} from './control-store-restart-profile.tracer.mjs'
import {openLedger} from './control-store-restart-ledger.tracer.mjs'

const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.birthtimeMs===b.birthtimeMs
export async function createRestartFixture(){
 const underlying=await createEffectFixture(),transport=underlying.createHost(),temporary=await fs.realpath(os.tmpdir()),root=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-control-restart-'))),fixtureId=randomUUID()
 const owner=Buffer.from(JSON.stringify({format:1,fixtureId}));await fs.writeFile(path.join(root,'owner.json'),owner,{flag:'wx'});await fs.writeFile(path.join(root,'ledger.jsonl'),Buffer.alloc(0),{flag:'wx'})
 const identities={root:await fs.lstat(root),owner:await fs.lstat(path.join(root,'owner.json')),ledger:await fs.lstat(path.join(root,'ledger.jsonl'))}
 const children=[],calls={stub:0,callbacks:0,rpcs:0,grants:0,commits:0};let expected={bytes:0,head:null},uncertain=false,connection,currentH,lastProjection,Astarts=0,proxyPending=0,inspectionFault=null
 async function checkRoot(){
  if(await fs.realpath(root)!==root||path.dirname(root)!==temporary||!same(identities.root,await fs.lstat(root)))throw error('SUPERVISOR_ROOT_CHANGED')
  if((await fs.readdir(root)).sort().join(',')!=='ledger.jsonl,owner.json')throw error('SUPERVISOR_OBJECT_CHANGED')
  for(const name of ['owner','ledger']){const file=path.join(root,name==='owner'?'owner.json':'ledger.jsonl'),s=await fs.lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||!same(identities[name],s)||await fs.realpath(file)!==file||s.size>(name==='owner'?256:LIMITS.journalBytes))throw error('SUPERVISOR_OBJECT_CHANGED')}
  if(!(await fs.readFile(path.join(root,'owner.json'))).equals(owner))throw error('SUPERVISOR_OWNER_CHANGED')
 }
 const verifyJournal=witness=>{const l=openLedger({root,fixtureId,expected:witness});try{return l.inspect()}finally{l.close()}}
 async function rotateA(cut){if(uncertain||proxyPending)throw error('PROXY_SETTLEMENT_UNKNOWN');if(currentH&&!currentH.exited())throw error('H_STILL_RUNNING');if(connection&&!connection.hasExited())await transport.close();if(Astarts>=LIMITS.Astarts)throw error('A_START_CAPACITY');await transport.connect(cut);connection=transport.connection();Astarts++;return connection}
 async function startH(cut){
  if(currentH&&!currentH.exited())throw error('H_STILL_RUNNING');if(uncertain||proxyPending||!connection||connection.hasExited()||children.length>=LIMITS.Hstarts)throw error('H_START_REFUSED')
  await checkRoot();const cuts=['after-inference-reserve','after-result-save','after-effect-intent','after-effect-response-before-save','after-ack-intent','after-ack-response-before-save'];if(cut&&!cuts.includes(cut))throw error('INVALID_H_CUT')
  const launchAllowsGrant=expected.bytes===0;let grantUsed=false
  const env={ELECTRON_RUN_AS_NODE:'1',DAM_RESTART_FIXTURE:fixtureId,DAM_RESTART_EXPECTED:JSON.stringify(expected)}
  for(const key of ['SystemRoot','SYSTEMROOT','WINDIR','PATH','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];if(cut)env.DAM_RESTART_CUT=cut
  const child=spawn(process.execPath,['--max-old-space-size=64',path.resolve('scripts/fixtures/control-store-restart-host.tracer.mjs'),'--root',root],{env,cwd:process.cwd(),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']})
  let exited=false,exitResult,sequence=0,bytes=0,failed=false,readyResolve,readyReject,resolveExit,cutResolve,cutReject,cutObserved,projection,rpcInFlight=false
  const pending=new Map(),exitPromise=new Promise(r=>{resolveExit=r}),readyPromise=new Promise((r,j)=>{readyResolve=r;readyReject=j}),cutPromise=new Promise((r,j)=>{cutResolve=r;cutReject=j});cutPromise.catch(()=>{})
  function fail(code){if(failed)return;failed=true;for(const p of pending.values()){clearTimeout(p.timer);p.reject(error(code))}pending.clear();readyReject(error(code));cutReject(error(code));child.kill()}
  const send=m=>{if(!exited&&child.connected)child.send(m,e=>{if(e)fail('H_CHANNEL_UNKNOWN')})}
  async function rpc(m){
   if(rpcInFlight||!exact(m,['kind','id','action','fields'])||typeof m.id!=='string'||Buffer.byteLength(JSON.stringify(m))>LIMITS.ipcBytes)throw error('INVALID_H_RPC')
   rpcInFlight=true;proxyPending++;try{
    const f=m.fields;let value
    if(m.action==='witness'&&exact(f,['bytes','head','revision'])&&Number.isSafeInteger(f.bytes)&&f.bytes>=expected.bytes&&f.bytes<=LIMITS.journalBytes&&/^[0-9a-f]{64}$/.test(f.head)&&Number.isSafeInteger(f.revision)&&f.revision>=1&&f.revision<=LIMITS.revisions){await checkRoot();const verified=verifyJournal({bytes:f.bytes,head:f.head});if(verified.revision!==f.revision)throw error('LEDGER_WITNESS_MISMATCH');expected={bytes:f.bytes,head:f.head};value={accepted:true}}
    else if(m.action==='scope'&&exact(f,[]))value=connection.scope()
    else if(m.action==='grant'&&exact(f,[])&&launchAllowsGrant&&!grantUsed){grantUsed=true;calls.grants++;value=await connection.grant()}
    else if(m.action==='commit'&&exact(f,['operationId','payload'])&&operationId(f.operationId)&&canonicalPayload(f.payload)&&(f.payload.kind==='ack-event'||launchAllowsGrant&&grantUsed)){calls.commits++;value=await connection.commit(f.operationId,f.payload)}
    else if(m.action==='inspect'&&exact(f,['operationId'])&&operationId(f.operationId)){value=await connection.inspect(f.operationId);if(inspectionFault==='missing')value={ok:true,outcome:'unknown',receipt:null};else if(inspectionFault==='wrong-digest'&&value.receipt)value={...value,receipt:{...value.receipt,payloadDigest:'0'.repeat(64)}};else if(inspectionFault==='unavailable')throw error('FIXTURE_INSPECTION_UNAVAILABLE')}
    else if(m.action==='outbox'&&exact(f,[]))value=await connection.outbox()
    else if(m.action==='revoke'&&exact(f,[]))value=await connection.revoke()
    else if(m.action==='stub'&&exact(f,[])&&launchAllowsGrant&&grantUsed){calls.stub++;if(calls.stub>1)throw error('STUB_REPLAY');value={observed:true}}
    else if(m.action==='callback'&&exact(f,[])){calls.callbacks++;if(calls.callbacks>LIMITS.notificationAttempts)throw error('CALLBACK_CAPACITY');value={observed:true}}
    else throw error('INVALID_H_RPC')
    if(!['witness','stub','callback'].includes(m.action))calls.rpcs++;send({kind:'rpc-result',id:m.id,ok:true,value})
   }catch(e){send({kind:'rpc-result',id:m.id,ok:false,code:e.code??'RPC_UNKNOWN'})}finally{rpcInFlight=false;proxyPending--}
  }
  child.on('message',m=>{
   if(!m||Buffer.byteLength(JSON.stringify(m))>LIMITS.ipcBytes){fail('H_FRAME_LIMIT');return}
   if(m.kind==='rpc'){void rpc(m).catch(()=>fail('INVALID_H_RPC'));return}
   if(m.kind==='ready'&&exact(m,['kind','processInstance','runtime','projection'])&&typeof m.processInstance==='string'){projection=m.projection;lastProjection=projection;readyResolve(m);return}
   if(m.kind==='bootstrap-failed'&&exact(m,['kind','code'])){readyReject(error(m.code));return}
   if(m.kind==='cut'&&exact(m,['kind','point'])&&m.point===cut&&!cutObserved){cutObserved=m;cutResolve(m);return}
   if(m.kind==='result'&&exact(m,['kind','id','ok','value','code'])&&pending.has(m.id)&&typeof m.ok==='boolean'){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);if(m.ok){if(m.value?.projection){projection=m.value.projection;lastProjection=projection}p.resolve(m.value)}else p.reject(error(m.code));return}
   fail('H_INVALID_RESPONSE')
  })
  child.stdout.on('data',b=>{bytes+=b.length;if(bytes>LIMITS.ipcBytes||b.length)fail('UNEXPECTED_H_STDOUT')});child.stderr.on('data',b=>{bytes+=b.length;if(bytes>LIMITS.ipcBytes)fail('H_LOG_LIMIT')})
  child.on('error',()=>fail('H_SPAWN_FAILED'))
  child.on('close',(code,signal)=>{if(rpcInFlight)uncertain=true;exited=true;exitResult={code,signal,pid:child.pid,stdioBytes:bytes,failed,cut:cutObserved?.point??null};for(const p of pending.values()){clearTimeout(p.timer);p.reject(error('H_EXIT_UNKNOWN'))}pending.clear();readyReject(error('H_EXITED_BEFORE_READY'));cutReject(error('H_EXITED_BEFORE_CUT'));resolveExit(exitResult)})
  const h={exited:()=>exited,projection:()=>projection,observation:()=>exitResult??{status:'NOT_EXITED'},request:(verb,fields={})=>{if(exited||failed||pending.size>=LIMITS.pending)return Promise.reject(error('H_REQUEST_REFUSED'));const id='h'+(++sequence);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{fail('H_ACK_TIMEOUT_UNKNOWN');reject(error('H_ACK_TIMEOUT_UNKNOWN'))},LIMITS.deadlineMs);pending.set(id,{resolve,reject,timer});send({kind:'command',id,verb,fields})})},waitForCut:()=>cutPromise,waitForExit:async()=>{if(exited)return exitResult;let timer;try{return await Promise.race([exitPromise,new Promise((_,reject)=>{timer=setTimeout(()=>{uncertain=true;child.kill();reject(error('H_EXIT_TIMEOUT_UNKNOWN'))},LIMITS.postStopMs)})])}finally{clearTimeout(timer)}},stop:async()=>{if(!exited)child.kill();return h.waitForExit()},close:async()=>{if(!exited)await h.request('close');return h.waitForExit()}}
  h.pid=child.pid;children.push(h);currentH=h
  let timer;try{const ready=await Promise.race([readyPromise,new Promise((_,j)=>{timer=setTimeout(()=>{fail('H_READY_TIMEOUT');j(error('H_READY_TIMEOUT'))},LIMITS.deadlineMs)})]);h.runtime=ready.runtime;h.processInstance=ready.processInstance;return h}catch(e){await h.waitForExit();throw e}finally{clearTimeout(timer)}
 }
 async function mutateJournal(mode){if(currentH&&!currentH.exited())throw error('H_STILL_RUNNING');await checkRoot();const file=path.join(root,'ledger.jsonl');if(mode==='truncate')await fs.truncate(file,Math.max(0,expected.bytes-1));else if(mode==='rollback'){const b=await fs.readFile(file),end=b.lastIndexOf(10,b.length-2);await fs.truncate(file,end+1)}else if(mode==='corrupt'){const handle=await fs.open(file,'r+');try{await handle.write(Buffer.from('!'),0,1,0)}finally{await handle.close()}}else if(mode==='replace'){await fs.rename(file,path.join(root,'original-ledger.jsonl'));await fs.writeFile(file,Buffer.alloc(0),{flag:'wx'})}else if(mode==='missing'){await fs.rename(file,path.join(root,'original-ledger.jsonl'))}else throw error('INVALID_MUTATION')}
 async function dispose({preserve=false}={}){
  for(const h of children)if(!h.exited())try{await h.close()}catch{try{await h.stop()}catch{uncertain=true}}
  if(connection&&!connection.hasExited())try{await transport.close()}catch{try{await connection.dispose()}catch{uncertain=true}}
  const base={ledgerFixtureName:path.basename(root),Hstarts:children.length,Astarts,Hruntime:children.map(h=>h.runtime).filter(Boolean),Hexits:children.map(h=>h.observation()),HprocessInstances:children.map(h=>h.processInstance).filter(Boolean),allHExited:children.every(h=>h.exited()),calls,projection:lastProjection,ledgerWitness:expected,uncertain}
  let valid=false;try{await checkRoot();verifyJournal(expected);valid=proxyPending===0}catch{}
  const authority=await underlying.dispose({preserve:preserve||uncertain||!base.allHExited||!valid});let cleanup='RETAINED'
  if(!preserve&&!uncertain&&base.allHExited&&valid&&authority.cleanup==='REMOVED_OWNED_FIXTURE'){for(const name of ['owner.json','ledger.jsonl']){const st=await fs.lstat(path.join(root,name)),key=name==='owner.json'?'owner':'ledger';if(!same(identities[key],st)||st.isSymbolicLink()||st.nlink!==1)throw error('CLEANUP_OBJECT_CHANGED')};await fs.unlink(path.join(root,'ledger.jsonl'));await fs.unlink(path.join(root,'owner.json'));await fs.rmdir(root);cleanup='REMOVED_OWNED_FIXTURE'}
  return{...base,authority,cleanup}
 }
 return{rotateA,startH,connection:()=>connection,counters:()=>({...calls}),witness:()=>({...expected}),inspectionFault:mode=>{if(![null,'missing','wrong-digest','unavailable'].includes(mode)||proxyPending)throw error('INVALID_INSPECTION_FAULT');inspectionFault=mode},mutateJournal,verifyOwnedJournal:async()=>{if(currentH&&!currentH.exited())throw error('H_STILL_RUNNING');await checkRoot();return verifyJournal(expected)},readAfterExit:()=>underlying.readAfterExit(),dispose}
}
