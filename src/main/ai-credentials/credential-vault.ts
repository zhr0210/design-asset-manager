import fs from 'node:fs/promises'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
export type StoredCredential={type:'api_key';key:string}|{type:'oauth';access:string;refresh:string;expires:number;[key:string]:unknown}
export interface SecretProtection {available():boolean;encrypt(text:string):Buffer;decrypt(value:Buffer):string}
interface Row {revision:number;value:string|null;kind:'api_key'|'oauth'|null;pending?:boolean;previous?:Row|null}
/** Main owns the storage. The only public read is metadata; no ordinary settings secret projection. */
export function createCredentialVault(input:{file:string;protection:SecretProtection}){
 let tail:Promise<unknown>=Promise.resolve()
 const locked=<T>(fn:()=>Promise<T>):Promise<T>=>{const p=tail.then(fn,fn);tail=p.catch(()=>{});return p}
 const read=async():Promise<Record<string,Row>>=>{
  try{const st=await fs.lstat(input.file);if(!st.isFile()||st.isSymbolicLink()||st.size>1024*1024)throw Error('AI_VAULT_INVALID');const v=JSON.parse(await fs.readFile(input.file,'utf8'));if(v.schema!==1||!v.rows||typeof v.rows!=='object')throw Error('AI_VAULT_INVALID');return v.rows}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return{};throw Error('AI_VAULT_UNAVAILABLE')}
 }
 const write=async(rows:Record<string,Row>)=>{
  await fs.mkdir(path.dirname(input.file),{recursive:true,mode:0o700});const temp=input.file+'.'+randomUUID()+'.tmp'
  try{const text=JSON.stringify({schema:1,rows});if(Buffer.byteLength(text)>1024*1024)throw Error('AI_VAULT_TOO_LARGE');await fs.writeFile(temp,text,{flag:'wx',mode:0o600});await fs.rename(temp,input.file)}finally{await fs.rm(temp,{force:true})}
 }
 const select=(r:Row|undefined,revision?:number)=>r?.pending&&revision!==undefined&&r.previous?.revision===revision?r.previous:!r?.previous&&r?.pending&&revision===0?undefined:r
 const status=(r:Row|undefined)=>({configured:!!r?.value,kind:r?.kind??null,revision:r?.revision??0,storageAvailable:input.protection.available()})
 const requireId=(id:string)=>{if(!/^[a-zA-Z0-9][a-zA-Z0-9._:~-]{0,255}$/.test(id))throw Error('AI_CREDENTIAL_INVALID')}
 return{
  status:(id:string,revision?:number)=>locked(async()=>{requireId(id);const row=select((await read())[id],revision),result=status(row);if(row?.kind!=='oauth'||!row.value||!result.storageAvailable)return result;try{const c=JSON.parse(input.protection.decrypt(Buffer.from(row.value,'base64')));const identityVerified=c.registration==='dam-siwc-v1'&&c.identity?.issuer==='https://auth.openai.com'&&c.identity?.clientId===c.clientId&&typeof c.identity?.subject==='string';const expiresAt=Number.isFinite(c.expires)?c.expires:undefined;return{...result,identityVerified,planUsageAuthorized:identityVerified&&c.planUsageAuthorized===true&&typeof c.access==='string'&&c.access.length>0&&Array.isArray(c.scopes)&&c.scopes.includes('resource.invoke')&&c.scopes.includes('chatgpt.tokens.use.direct'),expiresAt,requiresRelogin:!identityVerified||expiresAt===undefined||expiresAt<=Date.now()}}catch{return{...result,identityVerified:false,planUsageAuthorized:false,requiresRelogin:true}}}),
  resolve:(id:string,revision?:number)=>locked(async()=>{
   requireId(id);const r=select((await read())[id],revision);if(revision!==undefined&&(r?.revision??0)!==revision)throw Error('AI_CREDENTIAL_CHANGED');if(!r?.value)return undefined;if(!input.protection.available())throw Error('AI_SECRET_STORAGE_UNAVAILABLE');try{return JSON.parse(input.protection.decrypt(Buffer.from(r.value,'base64'))) as StoredCredential}catch{throw Error('AI_VAULT_UNAVAILABLE')}
  }),
  set:(id:string,credential:StoredCredential,expectedRevision?:number,refresh=false,persist?:(revision:number)=>void)=>locked(async()=>{
   requireId(id);if(!input.protection.available())throw Error('AI_SECRET_STORAGE_UNAVAILABLE')
   if(!credential||credential.type==='api_key'&&(!credential.key||credential.key.length>65536)||credential.type==='oauth'&&(!Number.isFinite(credential.expires)||(!credential.access||!credential.refresh)&&!(credential.registration==='dam-siwc-v1'&&credential.identity&&typeof credential.identity==='object'&&(credential.identity as any).issuer==='https://auth.openai.com'&&(credential.identity as any).clientId===credential.clientId&&typeof credential.idToken==='string'))||!['api_key','oauth'].includes(credential.type))throw Error('AI_CREDENTIAL_INVALID')
   if(credential.type==='oauth'&&credential.planUsageAuthorized===true&&(!credential.access||!Array.isArray(credential.scopes)||!credential.scopes.includes('resource.invoke')||!credential.scopes.includes('chatgpt.tokens.use.direct')))throw Error('AI_CREDENTIAL_INVALID')
   if(Buffer.byteLength(JSON.stringify(credential))>65536)throw Error('AI_CREDENTIAL_INVALID');const rows=await read(),r=select(rows[id],expectedRevision);if(expectedRevision!==undefined&&(r?.revision??0)!==expectedRevision)throw Error('AI_CREDENTIAL_CHANGED');const revision=(r?.revision??0)+(refresh?0:1);if(!Number.isSafeInteger(revision))throw Error('AI_CREDENTIAL_INVALID');const next:Row={revision,kind:credential.type,value:input.protection.encrypt(JSON.stringify(credential)).toString('base64')};rows[id]=persist?{...next,pending:true,previous:r??null}:next;await write(rows);try{persist?.(revision)}catch(error){if(r)rows[id]=r;else delete rows[id];try{await write(rows)}catch{throw Error('AI_CREDENTIAL_RECOVERY_REQUIRED')}throw error}if(persist){rows[id]=next;try{await write(rows)}catch{/* Pending encrypted row resolves by the persisted settings revision on restart. */}}return status(next)
  }),
  clear:(id:string,persist?:(revision:number)=>void,expectedRevision?:number)=>locked(async()=>{requireId(id);const rows=await read(),old=select(rows[id],expectedRevision);if(expectedRevision!==undefined&&(old?.revision??0)!==expectedRevision)throw Error('AI_CREDENTIAL_CHANGED');const next:Row={revision:(old?.revision??0)+1,kind:null,value:null};rows[id]=persist?{...next,pending:true,previous:old??null}:next;await write(rows);try{persist?.(next.revision)}catch(error){if(old)rows[id]=old;else delete rows[id];try{await write(rows)}catch{throw Error('AI_CREDENTIAL_RECOVERY_REQUIRED')}throw error}if(persist){rows[id]=next;try{await write(rows)}catch{}}return status(next)})
 }
}
export type CredentialVault=ReturnType<typeof createCredentialVault>
