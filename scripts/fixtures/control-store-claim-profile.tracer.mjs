/** Fixed test-only claim profile. No production/public contract or model execution. */
import {createHash} from 'node:crypto'
import {PROFILE as WIRE_PROFILE} from './control-store-protocol-wire.tracer.mjs'
export {encodeFrame,createFrameDecoder} from './control-store-protocol-wire.tracer.mjs'
export {exact,identifier,operationIdentifier} from './control-store-facade-profile.tracer.mjs'
export const PROFILE=Object.freeze({...WIRE_PROFILE,receipts:16,deadlineMs:5000})
export const CATALOG=Object.freeze({catalogRef:'owned-store-v3',materialRef:'owned-material-v3',profileId:'owned-profile',clientId:'owned-client',libraryIdentity:'owned-library',generation:'1',assetId:'owned-asset'})
export const FEATURES=Object.freeze(['claim-sent','atomic-receipt','catalog-reference','quiesce-resume-fence'])
export const RECEIPT_FIELDS=Object.freeze(['operationId','payloadDigest','instance','session','permissionEpoch','catalogRef','profileId','clientId','libraryIdentity','generation','assetId','kind','claimOperationId','claimToken','attemptId','state','effects'])
const operationId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[A-Za-z0-9._:-]+$/.test(value)&&value.length<=200
const token=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
export function canonicalPayload(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null
 const keys=Object.keys(value)
 if(value.kind==='claim'&&keys.length===2&&keys.includes('assetId')&&value.assetId===CATALOG.assetId)return{kind:'claim',assetId:CATALOG.assetId}
 if(value.kind==='mark-sent'&&keys.length===4&&['kind','assetId','claimOperationId','claimToken'].every(k=>Object.hasOwn(value,k))&&value.assetId===CATALOG.assetId&&operationId(value.claimOperationId)&&token(value.claimToken))return{kind:'mark-sent',assetId:CATALOG.assetId,claimOperationId:value.claimOperationId,claimToken:value.claimToken}
 return null
}
export function payloadDigest(value){const p=canonicalPayload(value);return p?createHash('sha256').update(JSON.stringify(p)).digest('hex'):null}
