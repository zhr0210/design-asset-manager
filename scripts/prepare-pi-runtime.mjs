import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import extractZip from 'extract-zip'
const targets={'darwin-arm64':'darwin-arm64.tar.gz','darwin-x64':'darwin-x64.tar.gz','win32-x64':'win-x64.zip','win32-arm64':'win-arm64.zip'},target=process.argv.find(a=>a.startsWith('--target='))?.slice(9)??`${process.platform}-${process.arch}`,version='24.21.0',artifact=targets[target]
if(!artifact)throw Error('Unsupported Pi runtime target')
const file=`node-v${version}-${artifact}`,base=`https://nodejs.org/dist/v${version}/`,root=path.resolve('pi-runtime'),approved=process.argv.includes('--approved')
const checks=await (await fetch(base+'SHASUMS256.txt',{redirect:'error',signal:AbortSignal.timeout(20000)})).text(),hash=checks.split('\n').find(l=>l.endsWith('  '+file))?.split(' ')[0]
if(!/^[a-f0-9]{64}$/.test(hash??''))throw Error('Missing official checksum')
console.log(JSON.stringify({mode:approved?'approved-setup':'review-only',nodeVersion:version,piVersion:'0.99.1',target,source:base+file,sha256:hash,scope:'Pi dependencies and Node only; no models, account login or inference'}))
if(!approved)process.exit(0)
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-install-'))
try{
 const response=await fetch(base+file,{redirect:'error',signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Node download failed');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>100*1024*1024||createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Node archive verification failed');const archive=path.join(temporary,file);await fs.writeFile(archive,bytes)
 let binary,license
 if(target.startsWith('win32')){await extractZip(archive,{dir:temporary});binary=path.join(temporary,`node-v${version}-${target.replace('win32','win')}`,'node.exe');license=path.join(path.dirname(binary),'LICENSE')}
 else{const result=spawnSync('tar',['-xzf',archive,'-C',temporary,`node-v${version}-${target}/bin/node`,`node-v${version}-${target}/LICENSE`],{shell:false,stdio:'ignore'});if(result.status!==0)throw Error('Node extraction failed');binary=path.join(temporary,`node-v${version}-${target}`,'bin/node');license=path.join(temporary,`node-v${version}-${target}`,'LICENSE')}
 const contents=await fs.readFile(binary),directory=path.join(root,'runtime',target);await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,target.startsWith('win32')?'node.exe':'node'),contents,{mode:0o755});await fs.copyFile(license,path.join(directory,'LICENSE'))
 await fs.writeFile(path.join(root,'runtime-artifact.json'),JSON.stringify({schema:1,nodeVersion:version,platform:target.split('-')[0],arch:target.split('-')[1],nodeSha256:createHash('sha256').update(contents).digest('hex'),nodeArchiveSha256:hash,piVersion:'0.99.1'},null,2))
 const npm=process.platform==='win32'?'npm.cmd':'npm',result=spawnSync(npm,['ci','--prefix',root,'--ignore-scripts','--no-audit','--no-fund'],{shell:process.platform==='win32',stdio:'inherit'});if(result.status!==0)throw Error('Pi dependency install failed')
 const seal=spawnSync(process.execPath,['scripts/seal-pi-runtime.mjs'],{shell:false,stdio:'inherit'});if(seal.status!==0)throw Error('Pi release sealing failed')
}finally{await fs.rm(temporary,{recursive:true,force:true})}
