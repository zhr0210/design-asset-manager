import fs from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Lazy, installation-scoped opaque identity. No hardware identity or Renderer projection. */
export function createAiHostIdentityStore(file:string){return{getDeviceId():string{
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700})
 try{fs.writeFileSync(file,JSON.stringify({version:1,deviceId:randomUUID()})+'\n',{flag:'wx',mode:0o600})}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw Error('AI_HOST_ID_UNAVAILABLE')}
 const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>1024)throw Error('AI_HOST_ID_INVALID')
 const value=JSON.parse(fs.readFileSync(file,'utf8'));if(value.version!==1||typeof value.deviceId!=='string'||!uuid.test(value.deviceId))throw Error('AI_HOST_ID_INVALID')
 return value.deviceId.toLowerCase()
}}}
