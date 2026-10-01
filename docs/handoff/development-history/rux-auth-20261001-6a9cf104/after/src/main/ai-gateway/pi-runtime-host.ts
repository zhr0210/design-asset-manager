import {knownPiAdmissionCode} from '../../shared/constants/pi-provider-admission'
import {AUTH_WORKER_STAGES,knownAuthError,type AuthStage} from '../../shared/contracts/ai-auth-state'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import os from 'node:os'
import {StringDecoder} from 'node:string_decoder'
import {PI_RUNTIME_RELEASE_SHA256} from './pi-runtime-release'
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex')
export class PiProcessUnconfirmedError extends Error{constructor(readonly released:Promise<void>){super('AI_PROCESS_EXIT_UNCONFIRMED')}}
export function createPiRuntimeHost(input:{root:string;releaseSha256?:string;closeMs?:number;spawn?:typeof spawn}){
 const unknown=new Set<Promise<void>>();let running=0
 const verify=async(signal?:AbortSignal)=>{
  const started=performance.now();let filesRead=0,bytesRead=0
  signal?.throwIfAborted()
  const releaseFile=path.join(input.root,'release.json'),bytes=await fs.readFile(releaseFile);if(sha(bytes)!==(input.releaseSha256??PI_RUNTIME_RELEASE_SHA256))throw Error('PI_RUNTIME_CHANGED')
  const release=JSON.parse(bytes.toString());if(release.platform!==process.platform||release.arch!==process.arch||release.piVersion!=='0.99.1')throw Error('PI_RUNTIME_PLATFORM_UNAVAILABLE')
  const root=await fs.realpath(input.root)
  const actualFiles=new Set<string>(),actualLinks=new Set<string>()
  const walk=async(directory:string):Promise<void>=>{signal?.throwIfAborted();for(const item of await fs.readdir(directory,{withFileTypes:true})){
   signal?.throwIfAborted();if(item.name==='.DS_Store'){if(!item.isFile())throw Error('PI_RUNTIME_CHANGED');continue;}const p=path.join(directory,item.name),relative=path.relative(root,p).split(path.sep).join('/')
   if(item.isSymbolicLink()){
    const target=await fs.readlink(p),resolved=path.resolve(path.dirname(p),target),targetRelative=path.relative(root,resolved).split(path.sep).join('/')
    if(release.symlinks?.[relative]!==target||!resolved.startsWith(root+path.sep)||!(targetRelative in release.files))throw Error('PI_RUNTIME_CHANGED')
    actualLinks.add(relative)
   }else if(item.isDirectory())await walk(p)
   else if(item.isFile()){if(!(relative in release.files))throw Error('PI_RUNTIME_CHANGED');actualFiles.add(relative)}
   else throw Error('PI_RUNTIME_CHANGED')
  }}
  await walk(path.join(root,'node_modules'));await walk(path.dirname(path.join(root,release.nodePath)))
  const sealedTreeFiles=Object.keys(release.files).filter(p=>p.startsWith('node_modules/')||p.startsWith('runtime/'))
  if(actualFiles.size!==sealedTreeFiles.length||actualLinks.size!==Object.keys(release.symlinks??{}).length)throw Error('PI_RUNTIME_CHANGED')
  for(const [relative,hash]of Object.entries(release.files)){
   signal?.throwIfAborted();const p=path.resolve(root,relative);if(!p.startsWith(root+path.sep))throw Error('PI_RUNTIME_CHANGED');const st=await fs.lstat(p);if(!st.isFile()||st.isSymbolicLink()||sha(await fs.readFile(p,{signal}))!==hash)throw Error('PI_RUNTIME_CHANGED');filesRead++;bytesRead+=st.size
  }
  signal?.throwIfAborted();return{verification:{filesRead,bytesRead,elapsedMs:performance.now()-started},node:path.join(root,release.nodePath),worker:path.join(root,'worker.mjs'),version:release.nodeVersion}
 }
 return{
  verify,
  inspect:()=>({unknown:unknown.size,active:running}),
  async execute<T>(request:unknown,signal:AbortSignal,callbacks:{credential?(value:unknown,refresh:boolean,result?:unknown):Promise<void>;authStage?(value:AuthStage):void;interaction?(value:any):void;promptExpired?(id:string):void;prompt?(value:any,answer:(text:string)=>void):void}={}):Promise<T>{
   if(unknown.size)throw Error('AI_PROCESS_EXIT_UNCONFIRMED');if(running>=2)throw Error('PI_RUNTIME_BUSY');running++;let deferred=false
   try{signal.throwIfAborted();const runtime=await verify(signal);signal.throwIfAborted()
   const payload=JSON.stringify(request);if(Buffer.byteLength(payload)>9*1024*1024)throw Error('AI_INPUT_TOO_LARGE')
   const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-worker-'));await fs.chmod(scratch,0o700)
   return await new Promise<T>((resolve,reject)=>{
    const decoder=new StringDecoder('utf8');let ready=false
    let output='',stdoutBytes=0,stderrBytes=0,count=0,pendingCredential:{value:unknown;refresh:boolean}|undefined,result:T|undefined,failure:string|undefined,closed=false,exited=false,settled=false
    let escalation:ReturnType<typeof setTimeout>|undefined,deadline:ReturnType<typeof setTimeout>|undefined,persistence=Promise.resolve(),release!:()=>void
    const released=new Promise<void>(r=>{release=r})
    const child=(input.spawn??spawn)(runtime.node,[runtime.worker],{shell:false,stdio:['pipe','pipe','pipe'],env:{LANG:'en_US.UTF-8',HOME:scratch,TMPDIR:scratch,NODE_NO_WARNINGS:'1'}})
    const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(escalation);clearTimeout(deadline);signal.removeEventListener('abort',cancel);if(error)reject(error);else resolve(result!)}
    const send=(value:unknown)=>{if(!closed&&!exited)child.stdin.write(JSON.stringify(value)+'\n')}
    const stop=(code:string)=>{if(failure||closed||settled)return;failure=code;if(!exited&&child.pid){child.kill('SIGTERM');escalation=setTimeout(()=>{if(!exited&&!closed)child.kill('SIGKILL')},250)};waitClose()}
    const waitClose=()=>{if(deadline)return;deadline=setTimeout(()=>{if(closed)return;child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();unknown.add(released);void released.then(()=>{unknown.delete(released);void fs.rm(scratch,{recursive:true,force:true})});finish(new PiProcessUnconfirmedError(released))},input.closeMs??2250)}
    const cancel=()=>stop('AI_CANCELLED')
    signal.addEventListener('abort',cancel,{once:true})
    child.on('error',()=>{if(!child.pid){closed=true;release();void fs.rm(scratch,{recursive:true,force:true});finish(Error('PI_RUNTIME_UNAVAILABLE'))}else stop('PI_RUNTIME_UNAVAILABLE')})
    child.on('exit',()=>{exited=true;clearTimeout(escalation);waitClose()})
    for(const stream of [child.stdin,child.stdout,child.stderr])stream.on('error',()=>stop('AI_TRANSPORT_FAILED'))
    child.stderr.on('data',(chunk:Buffer)=>{stderrBytes+=chunk.length;if(stderrBytes>1024*1024)stop('AI_TRANSPORT_TOO_LARGE')})
    child.stdout.on('data',(chunk:Buffer)=>{
     stdoutBytes+=chunk.length;if(stdoutBytes>1024*1024){stop('AI_RESPONSE_TOO_LARGE');return}output+=decoder.write(chunk);let index
     while((index=output.indexOf('\n'))>=0){const line=output.slice(0,index);output=output.slice(index+1);if(failure)continue
      try{if(++count>256)throw Error();const message=JSON.parse(line)
       if(message.type==='ready'){if(ready||message.nodeVersion!==runtime.version||message.piVersion!=='0.99.1')throw Error();ready=true}
       else if(message.type==='result'){if(!ready)throw Error();if(result!==undefined)throw Error();result=message.value}
       else if(message.type==='error')stop((['AI_CANCELLED','AI_INPUT_TOO_LARGE','AI_PROTOCOL_INVALID','AI_AUTH_METHOD_MISMATCH'].includes(message.code)||knownAuthError(message.code)||knownPiAdmissionCode(message.code))?message.code:'AI_PROVIDER_FAILED')
       else if(message.type==='auth-stage'){if(!ready||!AUTH_WORKER_STAGES.includes(message.stage))throw Error();callbacks.authStage?.(message.stage)}
       else if(message.type==='credential'){if(!ready||!callbacks.credential)throw Error();if(pendingCredential)throw Error();pendingCredential={value:message.credential,refresh:message.refresh===true}}
       else if(message.type==='interaction'){if(!ready)throw Error();callbacks.interaction?.(message.event)}
       else if(message.type==='prompt-expired'){if(!ready||typeof message.id!=='string'||message.id.length>128)throw Error();callbacks.promptExpired?.(message.id)}
       else if(message.type==='prompt'){if(!ready||!callbacks.prompt)throw Error();callbacks.prompt(message,p=>send({kind:'answer',id:message.id,answer:p}))}
       else throw Error()
      }catch{stop('AI_PROTOCOL_INVALID')}
     }
    })
    child.on('close',async code=>{closed=true;try{if(signal.aborted)failure??='AI_CANCELLED';if(!failure&&(code!==0||!ready||result===undefined||output.trim()))failure='AI_PROVIDER_FAILED';if(pendingCredential&&(pendingCredential.refresh||!failure))persistence=callbacks.credential!(pendingCredential.value,pendingCredential.refresh,result);await persistence;await fs.rm(scratch,{recursive:true,force:true});if(!failure&&(code!==0||!ready||result===undefined||output.trim()))failure='AI_PROVIDER_FAILED';finish(failure?Error(failure):undefined)}catch{finish(Error('AI_CREDENTIAL_PERSIST_FAILED'))}finally{release()}})
    if(signal.aborted)cancel();else send(request)
   })
   }catch(error){if(error instanceof PiProcessUnconfirmedError){deferred=true;void error.released.then(()=>{running--})}throw error}finally{if(!deferred)running--}
  }
 }
}
export type PiRuntimeHost=ReturnType<typeof createPiRuntimeHost>
