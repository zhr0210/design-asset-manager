/** Private bounded process-restart ledger, not a public/profile persistence contract. */
import {createHash} from 'node:crypto'
export {CATALOG,canonicalPayload,payloadDigest,resultDigest,RECEIPT_FIELDS,EVENT_FIELDS,token,operationId} from './control-store-effect-profile.tracer.mjs'
export const LIMITS=Object.freeze({snapshotBytes:16384,journalBytes:524288,revisions:32,operations:8,Hstarts:4,Astarts:4,notificationAttempts:4,ipcBytes:32768,pending:2,deadlineMs:5000,callbackMs:1000,caseMs:15000,HrunMs:90000,outerMs:150000,postStopMs:5000,logBytes:262144,fixtures:16})
export const SCOPE_FIELDS=Object.freeze(['instance','session','permissionEpoch','catalogRef','profileId','clientId','libraryIdentity','generation'])
export const STATE_FIELDS=Object.freeze(['format','fixtureId','catalogRef','libraryIdentity','generation','revoked','inference','operations','notification'])
export const OP_FIELDS=Object.freeze(['operationId','scope','payload','payloadDigest','claimAttemptId','status','receipt'])
export const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex')
export const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(k=>Object.hasOwn(value,k))
export const error=code=>Object.assign(new Error(code),{code})
export function initialState(fixtureId){return{format:1,fixtureId,catalogRef:'owned-store-v4',libraryIdentity:'owned-library',generation:'1',revoked:false,inference:{status:'not-started',reservations:0,result:null,resultDigest:null},operations:[],notification:{attempts:0,callbackCalls:0}}}
