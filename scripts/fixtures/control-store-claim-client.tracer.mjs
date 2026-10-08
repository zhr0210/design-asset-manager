/** Owned synthetic H: no product imports, no SQLite writer, no OS authority claim. */
import fs from 'node:fs/promises'
import {lstatSync,realpathSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {PROFILE,CATALOG,FEATURES,encodeFrame,createFrameDecoder,canonicalPayload,payloadDigest,RECEIPT_FIELDS} from './control-store-claim-profile.tracer.mjs'

const require=createRequire(import.meta.url)
const fail=(code,phase='unknown')=>Object.assign(new Error(code),{code,phase})
const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.birthtimeMs===b.birthtimeMs
const clone=v=>structuredClone(v)
const receiptFields=RECEIPT_FIELDS
const allowedNoEffect=new Set(['CLAIM_BUSY','NOT_CLAIMED','RECEIPT_CAPACITY'])

export async function createClaimFixture(){
 const temporary=await fs.realpath(os.tmpdir()),root=await fs.realpath(await fs.mkdtemp(path.join(temporary,'dam-control-claim-'))),rootStat=await fs.lstat(root),nonce=randomUUID()
 const ownerBytes=Buffer.from(JSON.stringify({format:3,nonce})),bindingBytes=Buffer.from(JSON.stringify({...CATALOG,layoutVersion:3}))
 await fs.writeFile(path.join(root,'owner.json'),ownerBytes,{flag:'wx'})
 await fs.mkdir(path.join(root,'control'));await fs.mkdir(path.join(root,'material'))
 await fs.writeFile(path.join(root,'material','binding.json'),bindingBytes,{flag:'wx'})
 const ownerIdentity=await fs.lstat(path.join(root,'owner.json')),bindingIdentity=await fs.lstat(path.join(root,'material','binding.json'))
 const directoryStats=new Map([['control',await fs.lstat(path.join(root,'control'))],['material',await fs.lstat(path.join(root,'material'))]])
 const children=new Set(),observations=[];let readers=0,uncertain=false,hostCreated=false,storeIdentity,hostRef

 async function unchangedMarker(file,identity,expected,maximum){
  let handle
  try{const before=await fs.lstat(file);if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.size>maximum||!same(identity,before))return false
   handle=await fs.open(file,'r');const opened=await handle.stat();if(!same(before,opened)||opened.size>maximum)return false
   const bytes=Buffer.alloc(maximum+1);let count=0
   while(count<bytes.length){const read=await handle.read(bytes,count,bytes.length-count,count);if(!read.bytesRead)break;count+=read.bytesRead}
   const after=await handle.stat(),leaf=await fs.lstat(file)
   return count<=maximum&&count===after.size&&same(opened,after)&&same(identity,leaf)&&!leaf.isSymbolicLink()&&leaf.nlink===1&&bytes.subarray(0,count).equals(expected)
  }catch{return false}finally{if(handle)await handle.close()}
 }

 function readAfterExit(operationId){
  if([...children].some(c=>!c.hasExited()))throw fail('FIXTURE_CHILD_STILL_RUNNING')
  if(uncertain)throw fail('FIXTURE_EXIT_UNKNOWN')
  const filename=path.join(root,'control','store.sqlite'),stat=lstatSync(filename)
  if(!storeIdentity||!same(storeIdentity,stat)||!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||realpathSync.native(filename)!==filename)throw fail('FIXTURE_STORE_OBJECT_CHANGED')
  const Database=require('better-sqlite3'),db=new Database(filename,{readonly:true,fileMustExist:true,timeout:0});readers++
  try{db.pragma('query_only=ON');return db.transaction(()=>({
   attempt:db.prepare('SELECT asset_id AS assetId,claim_operation_id AS claimOperationId,claim_token AS claimToken,attempt_id AS attemptId,state,effects FROM fixture_attempt').get()??null,
   receipt:operationId?db.prepare('SELECT operation_id AS operationId,payload_digest AS payloadDigest,kind,state,effects FROM fixture_receipts WHERE operation_id=?').get(operationId)??null:null,
   receipts:db.prepare('SELECT count(*) AS count FROM fixture_receipts').get().count,integrity:db.pragma('integrity_check',{simple:true})
  }))()}finally{db.close();readers--}
 }

 async function startConnection(cut,onUnavailable){
  if([...children].some(c=>!c.hasExited())||uncertain)throw fail('FIXTURE_AUTHORITY_NOT_SETTLED','before-send')
  if(!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1')throw fail('ELECTRON_NODE_REQUIRED','before-send')
  const cuts=['before-claim','after-claim','after-sent','late-after-claim','late-after-sent','after-quiesce','after-resume','late-after-quiesce','mismatched-sent']
  if(cut&&!cuts.includes(cut))throw fail('INVALID_PRIVATE_CUT','before-send')
  const env={ELECTRON_RUN_AS_NODE:'1',DAM_CLAIM_BOOTSTRAP:nonce}
  for(const key of ['SystemRoot','SYSTEMROOT','WINDIR','PATH','TEMP','TMP'])if(process.env[key])env[key]=process.env[key]
  if(cut)env.DAM_CLAIM_CUT=cut
  const child=spawn(process.execPath,['--max-old-space-size=64',path.resolve('scripts/fixtures/control-store-claim.tracer.mjs'),'--root',root],{env,cwd:process.cwd(),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe','ipc']})
  let exited=false,exitResult,instance,session,permissionEpoch,sequence=0,stderrBytes=0,failed=false,cutEvent,releasedCut=false,normalClosing=false,invalidResponseObserved=false,engineeringStop=false
  const pending=new Map(),cutWaiters=new Set();let resolveExit
  const exitPromise=new Promise(resolve=>{resolveExit=resolve})
  function rejectPending(code){if(!failed){failed=true;onUnavailable(code)}for(const w of pending.values()){clearTimeout(w.timer);w.reject(fail(code))}pending.clear()}
  function stopFailed(code){rejectPending(code);engineeringStop=true;child.kill()}
  const decoder=createFrameDecoder(reply=>{
   if(typeof reply.id!=='string'||typeof reply.ok!=='boolean'||!pending.has(reply.id)){invalidResponseObserved=true;stopFailed('INVALID_OR_UNMATCHED_RESPONSE');return}
   const w=pending.get(reply.id);pending.delete(reply.id);clearTimeout(w.timer);w.resolve(reply)
  },()=>{invalidResponseObserved=true;stopFailed('INVALID_RESPONSE_FRAME')})
  child.stdout.on('data',b=>decoder.push(b));child.stdout.on('end',()=>decoder.end())
  child.stderr.on('data',b=>{stderrBytes+=b.length;if(stderrBytes>PROFILE.frameBytes)stopFailed('STDERR_LIMIT')})
  child.stdin.on('error',()=>rejectPending('CHANNEL_WRITE_FAILED'));child.on('error',()=>rejectPending('AUTHORITY_SPAWN_FAILED'))
  child.on('message',m=>{
   if(m?.kind!=='cut'||m.point!==cut||cutEvent||!(m.operationId===null||typeof m.operationId==='string')){stopFailed('INVALID_PRIVATE_CUT');return}
   cutEvent={point:m.point,operationId:m.operationId};for(const w of cutWaiters){clearTimeout(w.timer);w.resolve(clone(cutEvent))}cutWaiters.clear()
  })
  child.on('close',(code,signal)=>{exited=true;exitResult={code,signal,stderrBytes,channelRetired:failed,invalidResponseObserved,engineeringStop,normalClosing};if(!normalClosing||pending.size)rejectPending('AUTHORITY_EXITED_ACK_UNKNOWN');else onUnavailable('ORDERLY_CLOSE');for(const w of cutWaiters){clearTimeout(w.timer);w.reject(fail('AUTHORITY_EXITED_BEFORE_CUT'))}cutWaiters.clear();resolveExit(exitResult)})
  function request(action,fields={}){
   if(exited||failed)return Promise.reject(fail('CHANNEL_CLOSED','before-send'))
   if(pending.size>=PROFILE.pendingFrames)return Promise.reject(fail('PENDING_LIMIT','before-send'))
   const id='r'+(++sequence);let bytes
   try{bytes=encodeFrame({v:1,id,sequence,action,...fields})}catch{return Promise.reject(fail('REQUEST_FRAME_LIMIT','before-send'))}
   if(child.stdin.writableLength+bytes.length>PROFILE.frameBytes*PROFILE.pendingFrames)return Promise.reject(fail('SEND_CAPACITY','before-send'))
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>stopFailed('ACK_TIMEOUT_UNKNOWN'),PROFILE.deadlineMs);pending.set(id,{resolve,reject,timer});child.stdin.write(bytes,e=>{if(e)rejectPending('CHANNEL_WRITE_FAILED')})})
  }
  const scope=()=>({instance,session,permissionEpoch,catalogRef:CATALOG.catalogRef,profileId:CATALOG.profileId,clientId:CATALOG.clientId,libraryIdentity:CATALOG.libraryIdentity,generation:CATALOG.generation})
  const requireOk=r=>{if(r.ok!==true)throw fail(r.code??'PROTOCOL_REFUSED');return r}
  const connection={
   hasExited:()=>exited,scope:()=>({...scope()}),exitObservation:()=>exited?{...exitResult}:{status:'NOT_EXITED'},
   raw:(action,fields={})=>request(action,{...(action==='hello'?{}:action==='attach'?{instance}:scope()),...fields}),
   rawBytes:bytes=>child.stdin.write(bytes),commit:(operationId,payload)=>request('commitIntent',{...scope(),operationId,payload}),
   inspect:operationId=>request('inspectOperation',{...scope(),operationId}),read:()=>request('readAttempt',scope()),
   grant:async()=>{const previous=permissionEpoch,r=requireOk(await request('grant',scope()));if(r.applied!==true||r.permissionEpoch!==previous+1)throw fail('INVALID_GRANT_ACK');permissionEpoch=r.permissionEpoch;return r},
   revoke:async()=>{const previous=permissionEpoch,r=requireOk(await request('revoke',scope()));if(r.applied!==true||r.permissionEpoch!==previous+1||!Number.isSafeInteger(r.fence)||r.fence<1)throw fail('INVALID_REVOKE_ACK');permissionEpoch=r.permissionEpoch;return r},
   suspend:async()=>{const previous=permissionEpoch,r=requireOk(await request('quiesce',scope()));if(r.applied!==true||r.suspended!==true||r.permissionEpoch!==previous+1||!Number.isSafeInteger(r.fence)||r.fence<1)throw fail('INVALID_QUIESCE_ACK');permissionEpoch=r.permissionEpoch;return r},
   resume:async()=>{const previous=permissionEpoch,r=requireOk(await request('resume',scope()));if(r.applied!==true||r.suspended!==false||r.permissionEpoch!==previous+1||!Number.isSafeInteger(r.fence)||r.fence<1)throw fail('INVALID_RESUME_ACK');permissionEpoch=r.permissionEpoch;return r},
   waitForCut:()=>{if(cutEvent)return Promise.resolve(clone(cutEvent));if(exited)return Promise.reject(fail('AUTHORITY_EXITED_BEFORE_CUT'));return new Promise((resolve,reject)=>{const w={resolve,reject};w.timer=setTimeout(()=>{cutWaiters.delete(w);stopFailed('CUT_TIMEOUT');reject(fail('CUT_TIMEOUT'))},PROFILE.deadlineMs);cutWaiters.add(w)})},
   releaseCut:()=>{if(!['late-after-claim','late-after-sent','late-after-quiesce'].includes(cut)||!cutEvent||releasedCut)throw fail('CUT_NOT_RELEASABLE');releasedCut=true;return new Promise((resolve,reject)=>child.send({kind:'release-cut'},e=>e?reject(fail('CUT_RELEASE_FAILED')):resolve()))},
   waitForExit:async()=>{if(exited)return exitResult;let timer;try{return await Promise.race([exitPromise,new Promise((_,reject)=>{timer=setTimeout(()=>{uncertain=true;stopFailed('EXIT_TIMEOUT_UNKNOWN');reject(fail('EXIT_TIMEOUT_UNKNOWN'))},PROFILE.deadlineMs)})])}finally{clearTimeout(timer)}},
   stopAtCut:async()=>{if(!cutEvent)throw fail('CUT_NOT_OBSERVED');rejectPending('AUTHORITY_EXITED_ACK_UNKNOWN');engineeringStop=true;child.kill();return connection.waitForExit()},
   close:async()=>{if(exited)return exitResult;const r=requireOk(await request('close',scope()));if(r.database!=='closed')throw fail('CLOSE_NOT_ACKNOWLEDGED');normalClosing=true;return connection.waitForExit()},
   dispose:async()=>{if(!exited){rejectPending('OWNED_ENGINEERING_STOP');engineeringStop=true;child.kill()}return connection.waitForExit()}
  }
  children.add(connection)
  try{
   const hello=requireOk(await request('hello',{major:1,features:FEATURES}));instance=hello.instance
   if(typeof instance!=='string'||hello.major!==1||!hello.runtime||JSON.stringify(hello.features)!==JSON.stringify(FEATURES))throw fail('INVALID_HELLO')
   observations.push(hello.runtime)
   const attached=requireOk(await request('attach',{instance,catalogRef:CATALOG.catalogRef,materialRef:CATALOG.materialRef,profileId:CATALOG.profileId,clientId:CATALOG.clientId}))
   session=attached.session;permissionEpoch=attached.permissionEpoch
   if(typeof session!=='string'||permissionEpoch!==0||attached.catalogRef!==CATALOG.catalogRef||attached.libraryIdentity!==CATALOG.libraryIdentity||attached.generation!==CATALOG.generation)throw fail('INVALID_ATTACH')
   const currentStore=await fs.lstat(path.join(root,'control','store.sqlite'));if(!currentStore.isFile()||currentStore.isSymbolicLink()||currentStore.nlink!==1||(storeIdentity&&!same(storeIdentity,currentStore)))throw fail('FIXTURE_STORE_OBJECT_CHANGED');storeIdentity??=currentStore
   return connection
  }catch(e){await connection.dispose();throw e}
 }

 function createHost(){
  if(hostCreated)throw fail('FIXTURE_HOST_ALREADY_CREATED');hostCreated=true
  let connection,state='closed',epoch=0,authorized=false,revoked=false,shuttingDown=false,suspended=false,fence='not-requested',fenceUnknown=false,resourceUnknown=false,running=false,stubCalls=0
  const holds=new Map(),operations=new Map(),events=[],inferred=new Set()
  const unknown=()=>[...operations.values()].filter(o=>o.status==='unknown').length
  const canSend=()=>state==='ready'&&connection&&!connection.hasExited()&&authorized&&!revoked&&!shuttingDown&&!suspended&&!holds.size&&!fenceUnknown&&!resourceUnknown&&!unknown()
  function event(value){if(events.length>=128)throw fail('EVENT_CAPACITY');events.push(value)}
  async function boundedDrain(callback){let timer;try{return await Promise.race([Promise.resolve().then(callback),new Promise((_,reject)=>{timer=setTimeout(()=>{retire('DRAIN_TIMEOUT');reject(fail('DRAIN_TIMEOUT_UNKNOWN'))},1000)})])}finally{clearTimeout(timer)}}
  function retire(reason){epoch++;authorized=false;state=reason==='ORDERLY_CLOSE'?'closed':'recovery-required';if(fence==='pending'||fence==='resume-pending'){fence='unknown';fenceUnknown=true}event('epoch-retired')}
  const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v)
  function validReceipt(receipt,record){
   if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||Object.keys(receipt).length!==receiptFields.length||receiptFields.some(k=>!Object.hasOwn(receipt,k)))return false
   if(['instance','session','permissionEpoch','catalogRef','profileId','clientId','libraryIdentity','generation'].some(k=>receipt[k]!==record.scope[k]))return false
   if(receipt.operationId!==record.operationId||receipt.payloadDigest!==record.digest||receipt.assetId!==CATALOG.assetId||receipt.kind!==record.payload.kind||!uuid(receipt.attemptId)||!uuid(receipt.claimToken))return false
   return record.payload.kind==='claim'?receipt.claimOperationId===record.operationId&&receipt.state==='claimed'&&receipt.effects===1:
    receipt.claimOperationId===record.payload.claimOperationId&&receipt.claimToken===record.payload.claimToken&&receipt.attemptId===record.claimAttemptId&&receipt.state==='sent'&&receipt.effects===2
  }
  async function execute(payload,claimAttemptId){
   if(!canSend())return{status:'not-admitted',code:'LOCAL_SEND_GATE_CLOSED'}
   if(operations.size>=PROFILE.receipts)return{status:'not-admitted',code:'LOCAL_OPERATION_CAPACITY'}
   const canonical=canonicalPayload(payload);if(!canonical)return{status:'not-admitted',code:'INVALID_PAYLOAD'}
   const operationId=connection.scope().instance+':'+randomUUID(),record={operationId,payload:canonical,digest:payloadDigest(canonical),scope:connection.scope(),epoch,claimAttemptId,status:'pending'}
   operations.set(operationId,record);event(canonical.kind+'-sent-to-A')
   let reply
   try{reply=await connection.commit(operationId,canonical)}catch(e){record.status=e.phase==='before-send'?'not-admitted':'unknown';return{status:record.status,code:e.code,operationId}}
   if(reply.ok!==true){if(reply.outcome==='verified-no-effect'&&allowedNoEffect.has(reply.code)){record.status='verified-no-effect';return{status:record.status,code:reply.code,operationId}}record.status='unknown';retire('UNCONFIRMED_REFUSAL');return{status:'unknown',code:'UNCONFIRMED_REFUSAL',operationId}}
   if(reply.outcome!=='committed'||!validReceipt(reply.receipt,record)){record.status='unknown';retire('INVALID_RECEIPT');await connection.dispose();return{status:'unknown',code:'INVALID_RECEIPT',operationId}}
   record.status='committed';record.receipt=clone(reply.receipt);event(canonical.kind+'-acknowledged')
   return{status:'committed',operationId,current:record.epoch===epoch&&state==='ready',receipt:clone(reply.receipt)}
  }
  const h={
   inspect:()=>({state,identity:CATALOG.libraryIdentity,generation:CATALOG.generation,authorityEpoch:epoch,businessAuthorized:authorized,businessAdmission:Boolean(canSend()),holds:holds.size,shuttingDown,revoked,suspended,fence,fenceUnknown,resourceUnknown,unknownOperations:unknown(),stubCalls}),
   events:()=>[...events],operations:()=>[...operations.values()].map(r=>({operationId:r.operationId,kind:r.payload.kind,status:r.status})),
   connect:async cut=>{if(connection&&!connection.hasExited())throw fail('FIXTURE_AUTHORITY_NOT_SETTLED');epoch++;authorized=false;state='recovery-required';let candidate
    candidate=await startConnection(cut,reason=>{if(connection===candidate)retire(reason)});connection=candidate
    const observed=await connection.read();if(observed.ok!==true||observed.attempt?.assetId!==CATALOG.assetId){await connection.dispose();throw fail('INVALID_READINESS')}
    state='ready';event('inspection-ready');return h.inspect()},
   authorize:async()=>{if(state!=='ready'||!connection||revoked||shuttingDown||suspended||fenceUnknown||holds.size||resourceUnknown||unknown())throw fail('LOCAL_AUTHORIZATION_BLOCKED','before-send')
    const captured=epoch;try{const r=await connection.grant();if(captured!==epoch)throw fail('LOCAL_SCOPE_CHANGED');authorized=true;event('explicit-grant');return r}catch(e){retire('GRANT_UNKNOWN');throw e}},
   hold:kind=>{if(!['cycle','maintenance','shutdown'].includes(kind)||holds.size>=PROFILE.pendingFrames)throw fail('INVALID_LOCAL_HOLD','before-send');if(kind==='shutdown')shuttingDown=true
    const token=Symbol(kind);holds.set(token,kind);event(kind+'-hold');let released=false;return()=>{if(!released){released=true;holds.delete(token);event(kind+'-release')}}},
   setResourceUnknown:value=>{if(typeof value!=='boolean')throw fail('INVALID_RESOURCE_STATE');resourceUnknown=value},
   invalidate:()=>retire('LOCAL_SCOPE_CHANGED'),
   quiesce:async()=>{if(!connection||state!=='ready'||revoked||fenceUnknown)throw fail('LOCAL_QUIESCE_REFUSED','before-send');authorized=false;epoch++;suspended=true;fence='pending';fenceUnknown=true;event('A-fence-requested')
    const captured=epoch;try{const r=await connection.suspend();if(captured!==epoch)throw fail('LOCAL_SCOPE_CHANGED');fence='acknowledged';fenceUnknown=false;event('A-fence-acknowledged');return r}catch(e){fence='unknown';fenceUnknown=true;state='recovery-required';throw e}},
   resume:async()=>{if(!connection||state!=='ready'||revoked||shuttingDown||holds.size||!suspended||fenceUnknown||unknown())throw fail('LOCAL_RESUME_REFUSED','before-send');authorized=false;fence='resume-pending';fenceUnknown=true;epoch++;event('A-resume-requested')
    const captured=epoch;try{const r=await connection.resume();if(captured!==epoch)throw fail('LOCAL_SCOPE_CHANGED');suspended=false;fence='resume-acknowledged';fenceUnknown=false;event('A-resume-acknowledged');return r}catch(e){fence='unknown';fenceUnknown=true;state='recovery-required';throw e}},
   coordinate:async({kind='cycle',workDrain,downloadDrain,aiDrain,signal}={})=>{
    if(!['cycle','maintenance','shutdown'].includes(kind)||typeof workDrain!=='function'||typeof downloadDrain!=='function'||typeof aiDrain!=='function')throw fail('INVALID_COORDINATOR','before-send')
    const captured=epoch;let release
    const check=()=>{signal?.throwIfAborted();if(captured!==epoch)throw fail('DRAIN_SCOPE_CHANGED','before-send');if(!canSend())throw fail('DRAIN_ADMISSION_CLOSED','before-send')}
    try{check();event('work-drain-start');await boundedDrain(()=>{check();return workDrain()});check();event('work-drain-done');event('download-drain-start');await boundedDrain(()=>{check();return downloadDrain()});check();event('download-drain-done')
     release=h.hold(kind);await h.quiesce();const fencedEpoch=epoch;signal?.throwIfAborted();event('dependent-drain-start');await boundedDrain(aiDrain);signal?.throwIfAborted();if(fencedEpoch!==epoch)throw fail('DRAIN_SCOPE_CHANGED');event('dependent-drain-done');return{status:'quiesced',release}
    }catch(e){release?.();throw e}},
   revoke:async()=>{if(!connection||state!=='ready'||revoked||fenceUnknown)throw fail('LOCAL_REVOKE_REFUSED','before-send');authorized=false;revoked=true;epoch++;fence='pending';fenceUnknown=true
    try{const r=await connection.revoke();fence='acknowledged';fenceUnknown=false;return r}catch(e){fence='unknown';fenceUnknown=true;state='recovery-required';throw e}},
   runStub:async({signal}={})=>{
    if(running)return{status:'not-admitted',code:'LOCAL_ATTEMPT_BUSY',stubCalls};if(!canSend())return{status:'not-admitted',code:'LOCAL_SEND_GATE_CLOSED',stubCalls}
    running=true;let stage='claim',claimOperationId,sentOperationId
    try{signal?.throwIfAborted();const claim=await execute({kind:'claim',assetId:CATALOG.assetId});claimOperationId=claim.operationId
     if(claim.status!=='committed')return{...claim,stage,claimOperationId,stubCalls};signal?.throwIfAborted()
     if(!claim.current||!canSend())return{status:'stopped-before-inference',stage,claimOperationId,stubCalls}
     stage='mark-sent';const sent=await execute({kind:'mark-sent',assetId:CATALOG.assetId,claimOperationId,claimToken:claim.receipt.claimToken},claim.receipt.attemptId);sentOperationId=sent.operationId
     if(sent.status!=='committed')return{...sent,stage,claimOperationId,sentOperationId,stubCalls};signal?.throwIfAborted()
     if(!sent.current||!canSend()||inferred.has(sent.receipt.attemptId))return{status:'stopped-before-inference',stage,claimOperationId,sentOperationId,stubCalls}
     inferred.add(sent.receipt.attemptId);stubCalls++;event('stub-inference');return{status:'stub-inferred',claimOperationId,sentOperationId,stubCalls}
    }catch(e){if(signal?.aborted)return{status:'aborted',stage,claimOperationId,sentOperationId,stubCalls};throw e}finally{running=false}},
   inspectOutcome:async operationId=>{const record=operations.get(operationId);if(!record)throw fail('UNTRACKED_OPERATION','before-send');if(!connection||connection.hasExited())throw fail('INSPECTION_UNAVAILABLE','before-send')
    const captured=epoch;let r;try{r=await connection.inspect(operationId)}catch{if(record.status!=='committed')record.status='unknown';return{status:record.status,operationId,current:false}}
    if(captured!==epoch||r.ok===true&&r.outcome==='unknown'&&r.receipt===null){if(record.status!=='committed')record.status='unknown';return{status:record.status,operationId,current:false}}
    if(r.ok!==true||r.outcome!=='committed'||!validReceipt(r.receipt,record)){if(record.status!=='committed')record.status='unknown';retire('INVALID_INSPECTION');await connection.dispose();return{status:record.status,operationId,current:false}}
    record.status='committed';record.receipt=clone(r.receipt);event('historical-status-known');return{status:'committed',operationId,current:record.epoch===epoch,receipt:clone(r.receipt)}},
   connection:()=>connection,
   close:async()=>{authorized=false;epoch++;state='closed';if(!connection)return null;return connection.close()}
  }
  hostRef=h;return h
 }

 async function dispose({preserve=false}={}){
  for(const c of children)if(!c.hasExited())try{await c.dispose()}catch{uncertain=true}
  const base={fixtureName:path.basename(root),authorities:children.size,allExited:[...children].every(c=>c.hasExited()),readers,uncertain,hProjection:hostRef?.inspect(),observations,exits:[...children].map(c=>c.exitObservation())}
  if(preserve||!base.allExited||readers||uncertain)return{...base,cleanup:'RETAINED'}
  const now=await fs.lstat(root);if(now.isSymbolicLink()||!same(rootStat,now)||await fs.realpath(root)!==root||path.dirname(root)!==temporary)return{...base,cleanup:'RETAINED_ROOT_CHANGED'}
  if(!await unchangedMarker(path.join(root,'owner.json'),ownerIdentity,ownerBytes,256))return{...base,cleanup:'RETAINED_OWNER_CHANGED'}
  if(!await unchangedMarker(path.join(root,'material','binding.json'),bindingIdentity,bindingBytes,2048))return{...base,cleanup:'RETAINED_MATERIAL_CHANGED'}
  const rootNames=(await fs.readdir(root)).sort();if(rootNames.join(',')!=='control,material,owner.json')return{...base,cleanup:'RETAINED_UNKNOWN_OBJECT'}
  const files=[]
  for(const name of ['control','material']){
   const dir=path.join(root,name),st=await fs.lstat(dir);if(!st.isDirectory()||st.isSymbolicLink()||!same(directoryStats.get(name),st)||await fs.realpath(dir)!==dir)return{...base,cleanup:'RETAINED_DIRECTORY_CHANGED'}
   const allowed=new Set(name==='control'?['store.sqlite','store.sqlite-journal']:['binding.json'])
   for(const entry of await fs.readdir(dir)){const file=path.join(dir,entry),s=await fs.lstat(file);if(!allowed.has(entry)||!s.isFile()||s.isSymbolicLink()||s.nlink!==1)return{...base,cleanup:'RETAINED_UNKNOWN_OBJECT'};if(entry==='store.sqlite'&&(!storeIdentity||!same(storeIdentity,s)))return{...base,cleanup:'RETAINED_STORE_CHANGED'};files.push({file,stat:s})}
  }
  const ownerFile=path.join(root,'owner.json'),ownerStat=await fs.lstat(ownerFile);if(!ownerStat.isFile()||ownerStat.isSymbolicLink()||ownerStat.nlink!==1)return{...base,cleanup:'RETAINED_OWNER_CHANGED'};files.push({file:ownerFile,stat:ownerStat})
  for(const e of files)if(!same(e.stat,await fs.lstat(e.file)))return{...base,cleanup:'RETAINED_OBJECT_CHANGED'}
  for(const name of ['control','material'])if(!same(directoryStats.get(name),await fs.lstat(path.join(root,name))))return{...base,cleanup:'RETAINED_DIRECTORY_CHANGED'}
  if(!same(rootStat,await fs.lstat(root)))return{...base,cleanup:'RETAINED_ROOT_CHANGED'}
  for(const e of files)await fs.unlink(e.file)
  await fs.rmdir(path.join(root,'control'));await fs.rmdir(path.join(root,'material'));await fs.rmdir(root)
  return{...base,cleanup:'REMOVED_OWNED_FIXTURE'}
 }
 return{createHost,readAfterExit,dispose}
}
