import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import {promisify} from 'node:util'
import {execFile} from 'node:child_process'
import {createManagedGgufPackages} from '../src/main/services/ai-runtime/managed-gguf-packages'
const root=await fs.mkdtemp(path.join(path.resolve('.scratch/macos-migration-20261009/runtime-package-test'),'run-'))
const database=new Database(path.join(root,'isolated-app.sqlite'))
const archive=await fs.readFile('.scratch/macos-migration-20261009/llama-b11429-bin-macos-arm64.tar.gz')
let reads=0
const packages=createManagedGgufPackages({database,root:path.join(root,'packages'),fetch:async(url,options)=>{
 assert.equal(url,'https://github.com/ggml-org/llama.cpp/releases/download/b11429/llama-b11429-bin-macos-arm64.tar.gz')
 assert.equal(options.credentials,'omit');reads++;return new Response(archive,{headers:{'content-length':String(archive.length)}})
},changed(){}})
try {
 await assert.rejects(packages.prepare('cpu',new AbortController().signal),/LOCAL_RUNTIME_PLATFORM_UNSUPPORTED/)
 const binding=await packages.prepare('macos-arm64',new AbortController().signal)
 assert.equal(binding.files.some(f=>f.name==='LLAMA-LICENSE.txt'),true)
 assert.equal(binding.files.some(f=>f.name==='libggml-metal.dylib'),true)
 assert.equal((await fs.lstat(binding.executable)).isSymbolicLink(),false)
 const output=await promisify(execFile)(binding.executable,['--version'],{cwd:binding.root,env:{PATH:binding.root},timeout:10000,maxBuffer:16384})
 console.log(JSON.stringify({type:'internal-real-runtime-dependency-test',release:binding.release,fingerprint:binding.fingerprint,files:binding.files.length,version:(output.stdout+'\n'+output.stderr).trim(),notUserAcceptance:true}))
 const reused=await packages.prepare('macos-arm64',new AbortController().signal)
 assert.equal(reused.fingerprint,binding.fingerprint);assert.equal(reads,1)
 const target=path.join(binding.root,'libggml-metal.dylib'),original=await fs.readFile(target)
 try {await fs.writeFile(target,Buffer.from('dam isolated corruption'));await assert.rejects(packages.prepare('macos-arm64',new AbortController().signal),/MODEL_FILE/)}
 finally {await fs.writeFile(target,original)}
 await packages.prepare('macos-arm64',new AbortController().signal)
 console.log('Verified real fixed Mac archive, safe flattened links, architecture refusal, reuse, corruption refusal and restore passed')
}finally{await packages.drain();database.close()}
