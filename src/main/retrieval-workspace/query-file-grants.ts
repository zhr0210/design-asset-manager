import fs from 'node:fs/promises'
import {constants} from 'node:fs'
import path from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import type {VisualAdmission} from '../visual-ai/visual-admission'
import type {RetrievalScope,QueryFileReview} from '../../shared/contracts/retrieval-workspace.contract'
import {readBoundedPreviewBytes} from '../library-lifecycle/bounded-preview-reader'
export function createQueryFileGrants(d:{admission:VisualAdmission;select():Promise<string|null>;
  current():{state:string;identity:string|null;generation:string|null}}) {
  interface Grant {owner:string;scope:RetrievalScope;bytes:Uint8Array;sha:string;expires:number;users:number;valid:boolean;permit:{release():void};timer:ReturnType<typeof setTimeout>}
  const grants=new Map<string,Grant>()
  const validScope=(scope:RetrievalScope)=>{const c=d.current();return c.state==='ready'&&c.identity===scope.libraryIdentity&&c.generation===scope.generation}
  const revoke=(id:string,grant:Grant)=>{grants.delete(id);grant.valid=false;clearTimeout(grant.timer);if(!grant.users){grant.bytes=new Uint8Array();grant.permit.release()}}
  const prune=()=>{for(const [id,grant] of grants)if(grant.expires<Date.now()||!validScope(grant.scope))revoke(id,grant)}
  return {
    async select(owner:string,scope:RetrievalScope):Promise<QueryFileReview|null>{
      prune();if(!validScope(scope))throw Error('RETRIEVAL_QUERY_IMAGE_EXPIRED')
      const file=await d.select();if(!file)return null
      if(!validScope(scope))throw Error('RETRIEVAL_QUERY_IMAGE_EXPIRED')
      if(grants.size>=4)throw Error('RETRIEVAL_QUERY_BUSY')
      const signal=AbortSignal.timeout(60000),permit=await d.admission.reserveLocalWork('retrieval',32*1024**2,signal)
      let reader:fs.FileHandle|undefined,bytes:Buffer
      try{
        if(!['.png','.jpg','.jpeg','.webp'].includes(path.extname(file).toLowerCase()))throw Error('RETRIEVAL_IMAGE_UNSUPPORTED')
        const before=await fs.lstat(file)
        if(!before.isFile()||before.isSymbolicLink()||before.size<1||before.size>4*1024**2)throw Error('RETRIEVAL_QUERY_FILE_TOO_LARGE')
        reader=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
        const held=await reader.stat();if(held.ino!==before.ino||held.dev!==before.dev||held.size!==before.size)throw Error('RETRIEVAL_SOURCE_CHANGED')
        bytes=Buffer.from(await readBoundedPreviewBytes(reader,4*1024**2));const after=await reader.stat(),named=await fs.lstat(file)
        if(bytes.length!==before.size||after.mtimeMs!==held.mtimeMs||after.ctimeMs!==held.ctimeMs||named.isSymbolicLink()||named.ino!==held.ino||named.dev!==held.dev||!validScope(scope))throw Error('RETRIEVAL_SOURCE_CHANGED')
      }finally{await reader?.close();permit.release()}
      const material=d.admission.retainQueryMaterial(bytes!.length),id='query-file:'+randomUUID(),expires=Date.now()+300000
      const grant:Grant={owner,scope:{...scope},bytes:bytes!,sha:createHash('sha256').update(bytes!).digest('hex'),expires,users:0,valid:true,permit:material,timer:undefined!}
      grant.timer=setTimeout(()=>revoke(id,grant),300000);grant.timer.unref?.();grants.set(id,grant)
      return {grant:id,name:path.basename(file),bytes:bytes!.length,expiresAt:expires,inputSha256:grant.sha}
    },
    async use<T>(owner:string,scope:RetrievalScope,id:string,action:(bytes:Uint8Array)=>Promise<T>):Promise<T>{
      prune();const grant=grants.get(id)
      if(!grant||grant.owner!==owner||grant.scope.libraryIdentity!==scope.libraryIdentity||grant.scope.generation!==scope.generation||!validScope(scope))throw Error('RETRIEVAL_QUERY_IMAGE_EXPIRED')
      grant.users++
      try{
        const result=await action(grant.bytes)
        if(!grant.valid||grant.expires<=Date.now()||!validScope(grant.scope))throw Error('RETRIEVAL_QUERY_IMAGE_EXPIRED')
        return result
      }finally{grant.users--;if(!grant.users&&!grant.valid){grant.bytes=new Uint8Array();grant.permit.release()}}
    },
    release(owner:string,id:string){const grant=grants.get(id);if(grant?.owner===owner)revoke(id,grant)},
    revoke(owner:string){for(const [id,grant] of grants)if(grant.owner===owner)revoke(id,grant)},
    clear(){for(const [id,grant] of grants)revoke(id,grant)},
  }
}
export type QueryFileGrants=ReturnType<typeof createQueryFileGrants>
