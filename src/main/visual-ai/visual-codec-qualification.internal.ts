import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'

interface CodecRuntime {platform:string;arch:string;node:string;electron?:string;modules?:string;sharp:string;vips:string}
/** Exact qualified combinations; shared with the owned worker, never supplied by a client. */
export function isVisualCodecRuntimeQualified(runtime:CodecRuntime):boolean {
 return runtime.sharp==='0.34.5'&&runtime.vips==='8.17.3'&&(
  (runtime.platform==='darwin'&&runtime.arch==='arm64')||
  (runtime.platform==='win32'&&runtime.arch==='x64'&&runtime.node==='20.16.0'&&runtime.electron==='30.5.1'&&runtime.modules==='123'))
}
export const WINDOWS_CODEC_ARTIFACTS={
 'sharp-win32-x64.node':'afc813593f255968ddae8f1d66557e0f96484bb374606e4eb2267a7dbc7cb25a',
 'libvips-cpp-8.17.3.dll':'f1b3c3eeea1b6a8292a69d78dd2cd1debacb9951cabdd9217a57e34137570cd1'
} as const
const localRequire=createRequire(typeof __filename==='string'?__filename:import.meta.url)
/** Hash installed codec dependencies each time; version changes/tampering revoke qualification. */
export async function requireVisualCodecQualification():Promise<void> {
 try {
  const sharp=localRequire('sharp')
  if(!isVisualCodecRuntimeQualified({platform:process.platform,arch:process.arch,node:process.versions.node,electron:process.versions.electron,modules:process.versions.modules,sharp:sharp.versions.sharp,vips:sharp.versions.vips}))throw Error()
  if(process.platform==='win32'){
   const directory=path.dirname(localRequire.resolve('@img/sharp-win32-x64/sharp.node'))
   for(const [name,expected] of Object.entries(WINDOWS_CODEC_ARTIFACTS)){
    const file=path.join(directory,name),stat=await fs.lstat(file)
    if(!stat.isFile()||stat.isSymbolicLink()||createHash('sha256').update(await fs.readFile(file)).digest('hex')!==expected)throw Error()
   }
  }
 }catch{throw Error('VISUAL_CODEC_UNQUALIFIED')}
}
