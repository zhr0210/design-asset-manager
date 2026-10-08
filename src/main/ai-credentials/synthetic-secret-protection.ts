import fs from 'node:fs'
import path from 'node:path'
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto'
import type {SecretProtection} from './credential-vault'
/** Explicit isolated E2E fixture only; never a fallback for unavailable OS encryption. */
export function createSyntheticSecretProtection(directory:string):SecretProtection{
 const file=path.join(directory,'synthetic-vault-key');let key:Buffer
 try{key=fs.readFileSync(file)}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;key=randomBytes(32);fs.writeFileSync(file,key,{flag:'wx',mode:0o600})}
 if(key.length!==32)throw Error('SYNTHETIC_KEY_INVALID')
 return{available:()=>true,encrypt:text=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([cipher.update(text),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes])},decrypt:value=>{const cipher=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));cipher.setAuthTag(value.subarray(12,28));return Buffer.concat([cipher.update(value.subarray(28)),cipher.final()]).toString()}}
}
