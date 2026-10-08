/** Owned H worker. Journal only; SQLite access remains sole A through fixed private proxy. */
import {randomUUID} from 'node:crypto'
import {LIMITS,CATALOG,RECEIPT_FIELDS,exact,error,canonicalPayload,payloadDigest,resultDigest} from './control-store-restart-profile.tracer.mjs'
import {openLedger,validReceipt} from './control-store-restart-ledger.tracer.mjs'
const processInstance=randomUUID(),cut=process.env.DAM_RESTART_CUT??'',cuts=['','after-inference-reserve','after-result-save','after-effect-intent','after-effect-response-before-save','after-ack-intent','after-ack-response-before-save']
let ledger,state,sequence=0,busy=false,closing=false,firstRun=false,cutUsed=false,historyReady=false
const pending=new Map(),send=value=>new Promise((resolve,reject)=>{if(!process.connected||Buffer.byteLength(JSON.stringify(value))>LIMITS.ipcBytes)return reject(error('H_CHANNEL_LIMIT'));process.send(value,e=>e?reject(error('H_CHANNEL_UNKNOWN')):resolve())})
function rpc(action,fields={}){if(closing||pending.size>=LIMITS.pending)return Promise.reject(error('H_RPC_REFUSED'));const id='p'+(++sequence);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(error('H_RPC_TIMEOUT_UNKNOWN'))},LIMITS.deadlineMs);pending.set(id,{resolve,reject,timer});void send({kind:'rpc',id,action,fields}).catch(e=>{clearTimeout(timer);pending.delete(id);reject(e)})})}
const projection=()=>({processInstance,inspectionOnly:!firstRun,revoked:state.revoked,inference:structuredClone(state.inference),operations:state.operations.map(o=>({operationId:o.operationId,kind:o.payload.kind,status:o.status,payloadDigest:o.payloadDigest,receipt:o.receipt})),notification:structuredClone(state.notification),ledger:ledger.inspect()})
async function save(){ledger.save(state);const r=await rpc('witness',ledger.inspect());if(r.accepted!==true)throw error('LEDGER_WITNESS_UNKNOWN')}
async function stopAt(point){if(cutUsed||cut!==point)return;cutUsed=true;await send({kind:'cut',point});closing=true;ledger.close();process.disconnect();process.exitCode=0;throw error('H_CONTROLLED_CUT')}
const unresolved=()=>state.operations.some(o=>['pending','unknown'].includes(o.status))
async function commit(payload,claimAttemptId=null){
 ledger.ensureCapacity(2);if(state.operations.length>=LIMITS.operations)throw error('OPERATION_CAPACITY')
 const scope=await rpc('scope'),record={operationId:scope.instance+':'+randomUUID(),scope,payload:canonicalPayload(payload),payloadDigest:payloadDigest(payload),claimAttemptId,status:'pending',receipt:null}
 state.operations.push(record);await save();await stopAt(payload.kind==='effect'?'after-effect-intent':payload.kind==='ack-event'?'after-ack-intent':'unused')
 let response;try{response=await rpc('commit',{operationId:record.operationId,payload:record.payload})}catch(e){record.status='unknown';await save();return{status:'unknown',code:e.code,operationId:record.operationId}}
 await stopAt(payload.kind==='effect'?'after-effect-response-before-save':payload.kind==='ack-event'?'after-ack-response-before-save':'unused')
 if(response.ok===true&&response.outcome==='committed'){record.receipt=response.receipt;if(!validReceipt(record)){record.receipt=null;record.status='unknown';await save();throw error('INVALID_ORIGINAL_RECEIPT')};record.status='committed'}
 else{record.status='unknown';record.receipt=null}
 await save();return{status:record.status,operationId:record.operationId,receipt:record.receipt}
}
async function run(){
 if(!firstRun||state.revoked||state.operations.length||state.inference.status!=='not-started')throw error('RESTART_INFERENCE_REFUSED')
 ledger.ensureCapacity(8);await rpc('grant');const claimed=await commit({kind:'claim',assetId:CATALOG.assetId});if(claimed.status!=='committed')return claimed
 const sent=await commit({kind:'mark-sent',assetId:CATALOG.assetId,claimOperationId:claimed.operationId,claimToken:claimed.receipt.claimToken},claimed.receipt.attemptId);if(sent.status!=='committed')return sent
 ledger.ensureCapacity(4);state.inference={status:'reserved',reservations:1,result:null,resultDigest:null};await save();await stopAt('after-inference-reserve')
 await rpc('stub');state.inference={status:'result',reservations:1,result:'owned-stub-result',resultDigest:resultDigest('owned-stub-result')};await save();await stopAt('after-result-save')
 return commit({kind:'effect',assetId:CATALOG.assetId,claimOperationId:claimed.operationId,claimToken:claimed.receipt.claimToken,result:state.inference.result},claimed.receipt.attemptId)
}
async function recover(){
 firstRun=false;historyReady=false;const responses=[]
 for(const o of state.operations){
  const was=o.status;let r;try{r=await rpc('inspect',{operationId:o.operationId})}catch(e){responses.push({operationId:o.operationId,status:o.status,code:e.code});continue}
  if(r.ok===true&&r.outcome==='committed'){const candidate={...o,receipt:r.receipt};if(!validReceipt(candidate))throw error('RECOVERY_RECEIPT_MISMATCH');if(was==='committed'&&RECEIPT_FIELDS.some(k=>o.receipt[k]!==r.receipt[k]))throw error('IMMUTABLE_RECEIPT_CHANGED');if(was!=='committed'){ledger.ensureCapacity(1);o.receipt=r.receipt;o.status='committed';await save()};responses.push({operationId:o.operationId,status:'committed',historical:true})}
  else if(r.ok===true&&r.outcome==='unknown'&&r.receipt===null){if(was==='committed')throw error('STORAGE_HISTORY_UNCONFIRMED');if(was==='pending'){ledger.ensureCapacity(1);o.status='unknown';await save()};responses.push({operationId:o.operationId,status:o.status,historical:true,missing:true})}
  else throw error('RECOVERY_INSPECTION_UNKNOWN')
 }
 historyReady=!unresolved()&&responses.every(r=>r.status==='committed'&&!r.code);return{status:historyReady?'history-inspected':'recovery-unknown',responses}
}
async function notify(mode){
 if(!['ok','throw','timeout'].includes(mode))throw error('INVALID_CALLBACK_MODE');if(unresolved())return{status:'not-admitted',code:'ACK_OR_EFFECT_UNKNOWN'};if(!historyReady)return{status:'not-admitted',code:'HISTORY_INSPECTION_REQUIRED'}
 ledger.ensureCapacity(4);if(state.notification.attempts>=LIMITS.notificationAttempts)throw error('NOTIFICATION_CAPACITY')
 const r=await rpc('outbox');if(r.ok!==true||!Array.isArray(r.events)||r.events.length>1)throw error('INVALID_OUTBOX')
 if(!r.events.length)return{status:'empty'}
 const v=r.events[0];if(!exact(v,['eventId','effectId','assetId','resultDigest','delivered'])||v.assetId!==CATALOG.assetId||v.delivered!==false||v.eventId!=='event:'+v.effectId||!state.operations.some(o=>o.payload.kind==='effect'&&o.status==='committed'&&['effectId','eventId','resultDigest'].every(k=>o.receipt[k]===v[k])))throw error('UNBOUND_EVENT')
 state.notification.attempts++;await save();state.notification.callbackCalls++;await save();await rpc('callback')
 const callback=()=>{if(mode==='throw')throw error('FIXTURE_CALLBACK_FAILURE');if(mode==='timeout')return new Promise(()=>{})}
 let timer;try{await Promise.race([Promise.resolve().then(callback),new Promise((_,reject)=>{timer=setTimeout(()=>reject(error('CALLBACK_TIMEOUT_UNKNOWN')),LIMITS.callbackMs)})])}catch(e){return{status:'notification-pending',code:e.code??'FIXTURE_CALLBACK_FAILURE'}}finally{clearTimeout(timer)}
 return commit({kind:'ack-event',assetId:CATALOG.assetId,eventId:v.eventId,effectId:v.effectId,resultDigest:v.resultDigest})
}
async function command(m){
 if(!exact(m,['kind','id','verb','fields'])||typeof m.id!=='string'||!exact(m.fields,m.verb==='notify'?['mode']:[]))throw error('INVALID_H_COMMAND')
 let value
 if(m.verb==='run')value=await run()
 else if(m.verb==='recover')value=await recover()
 else if(m.verb==='inspect')value={status:'observed'}
 else if(m.verb==='notify')value=await notify(m.fields.mode)
 else if(m.verb==='revoke'){ledger.ensureCapacity(1);state.revoked=true;await save();await rpc('revoke');value={status:'revoked'}}
 else if(m.verb==='fillRetention'){while(ledger.inspect().revision<LIMITS.revisions){ledger.ensureCapacity(1);await save()};value={status:'capacity-retained'}}
 else if(m.verb==='close'){closing=true;ledger.close();await send({kind:'result',id:m.id,ok:true,value:{status:'closed',projection:projection()},code:null});process.disconnect();return}
 else throw error('UNKNOWN_H_COMMAND')
 await send({kind:'result',id:m.id,ok:true,value:{...value,projection:projection()},code:null})
}
process.on('message',m=>{
 if(!m||Buffer.byteLength(JSON.stringify(m))>LIMITS.ipcBytes){closing=true;process.disconnect();return}
 if(m.kind==='rpc-result'){const p=pending.get(m.id);if(!p||!exact(m,m.ok?['kind','id','ok','value']:['kind','id','ok','code'])){closing=true;process.disconnect();return}pending.delete(m.id);clearTimeout(p.timer);m.ok?p.resolve(m.value):p.reject(error(m.code));return}
 if(m.kind!=='command'||busy||closing){void send({kind:'result',id:m.id??'',ok:false,value:null,code:'H_BUSY_OR_CLOSED'});return}
 busy=true;void command(m).catch(async e=>{if(!closing)await send({kind:'result',id:m.id,ok:false,value:null,code:e.code??'H_UNKNOWN'}).catch(()=>{})}).finally(()=>{busy=false})
})
process.on('disconnect',()=>{closing=true;try{ledger?.close()}catch{};for(const p of pending.values()){clearTimeout(p.timer);p.reject(error('H_CHANNEL_UNKNOWN'))};pending.clear()})
try{
 if(process.argv.length!==4||process.argv[2]!=='--root'||!cuts.includes(cut)||!process.versions.electron||process.env.ELECTRON_RUN_AS_NODE!=='1'||!process.connected)throw error('H_BOOTSTRAP')
 ledger=openLedger({root:process.argv[3],fixtureId:process.env.DAM_RESTART_FIXTURE,expected:JSON.parse(process.env.DAM_RESTART_EXPECTED)});state=ledger.load();firstRun=ledger.inspect().revision===0;historyReady=firstRun
 if(firstRun)await save()
 await send({kind:'ready',processInstance,runtime:{electron:process.versions.electron,node:process.versions.node,abi:process.versions.modules,napi:process.versions.napi,uv:process.versions.uv},projection:projection()})
}catch(e){closing=true;try{ledger?.close()}catch{};await send({kind:'bootstrap-failed',code:e.code??'LEDGER_LOAD_UNKNOWN'}).catch(()=>{});process.disconnect();process.exitCode=2}
