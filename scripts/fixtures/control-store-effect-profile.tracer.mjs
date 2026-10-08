/** Fixed bounded synthetic effect/outbox protocol; not a product/domain contract. */
import {createHash} from 'node:crypto'
import {PROFILE as WIRE_PROFILE} from './control-store-protocol-wire.tracer.mjs'
export {encodeFrame,createFrameDecoder} from './control-store-protocol-wire.tracer.mjs'
export {exact,identifier,operationIdentifier} from './control-store-facade-profile.tracer.mjs'
export const PROFILE=Object.freeze({...WIRE_PROFILE,receipts:16,deadlineMs:5000})
export const CATALOG=Object.freeze({catalogRef:'owned-store-v4',materialRef:'owned-material-v4',profileId:'owned-profile',clientId:'owned-client',libraryIdentity:'owned-library',generation:'1',assetId:'owned-asset'})
export const FEATURES=Object.freeze(['claim-sent-effect','atomic-receipt-outbox','catalog-reference','quiesce-resume-fence','notification-ack'])
export const RECEIPT_FIELDS=Object.freeze(['operationId','payloadDigest','instance','session','permissionEpoch','catalogRef','profileId','clientId','libraryIdentity','generation','assetId','kind','claimOperationId','claimToken','attemptId','state','effects','result','resultDigest','effectId','eventId','delivered'])
export const EVENT_FIELDS=Object.freeze(['eventId','effectId','assetId','resultDigest','delivered'])
export const token=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v)
export const operationId=v=>typeof v==='string'&&v.length<=200&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[A-Za-z0-9._:-]+$/.test(v)
export const text=v=>typeof v==='string'&&Buffer.byteLength(v,'utf8')<=PROFILE.textBytes&&Buffer.from(v,'utf8').toString('utf8')===v
export const digest=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v)
export const eventId=v=>typeof v==='string'&&v.startsWith('event:')&&token(v.slice(6))
export const resultDigest=v=>text(v)?createHash('sha256').update(v,'utf8').digest('hex'):null
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
export function canonicalPayload(v){
 if(exact(v,['kind','assetId'])&&v.kind==='claim'&&v.assetId===CATALOG.assetId)return{kind:v.kind,assetId:v.assetId}
 if(exact(v,['kind','assetId','claimOperationId','claimToken'])&&v.kind==='mark-sent'&&v.assetId===CATALOG.assetId&&operationId(v.claimOperationId)&&token(v.claimToken))return{kind:v.kind,assetId:v.assetId,claimOperationId:v.claimOperationId,claimToken:v.claimToken}
 if(exact(v,['kind','assetId','claimOperationId','claimToken','result'])&&v.kind==='effect'&&v.assetId===CATALOG.assetId&&operationId(v.claimOperationId)&&token(v.claimToken)&&text(v.result))return{kind:v.kind,assetId:v.assetId,claimOperationId:v.claimOperationId,claimToken:v.claimToken,result:v.result}
 if(exact(v,['kind','assetId','eventId','effectId','resultDigest'])&&v.kind==='ack-event'&&v.assetId===CATALOG.assetId&&eventId(v.eventId)&&token(v.effectId)&&v.eventId==='event:'+v.effectId&&digest(v.resultDigest))return{kind:v.kind,assetId:v.assetId,eventId:v.eventId,effectId:v.effectId,resultDigest:v.resultDigest}
 return null
}
export function payloadDigest(v){const p=canonicalPayload(v);return p?createHash('sha256').update(JSON.stringify(p)).digest('hex'):null}
