import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createPiRuntimeHost} from '../src/main/ai-gateway/pi-runtime-host'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-resources-'))
await test('staged ASAR-external resource layout verifies and starts the fixed worker offline',async()=>{
 const resources=path.join(root,'resources'),target=path.join(resources,'pi-runtime');await fs.mkdir(resources);await fs.cp(path.resolve('pi-runtime'),target,{recursive:true,verbatimSymlinks:true,filter:source=>!source.includes('/runtime-artifact.json')})
 const runtime=createPiRuntimeHost({root:target});const result=await runtime.execute<any[]>({kind:'models',connection:{id:'fixture',providerKind:'anthropic',baseUrl:'https://api.anthropic.com',authMode:'none'}},AbortSignal.timeout(20000));assert.ok(result.length>0);assert.ok(result.every(m=>m.verified===false));assert.equal(runtime.inspect().unknown,0)
 const metadata=path.join(target,'node_modules','.DS_Store');await fs.writeFile(metadata,'synthetic Finder metadata');await runtime.verify();await fs.unlink(metadata);await fs.symlink(path.join(target,'worker.mjs'),metadata);await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.unlink(metadata);await fs.mkdir(metadata);await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.rmdir(metadata)
 const worker=path.join(target,'worker.mjs'),before=await fs.readFile(worker);await fs.appendFile(worker,'\n// synthetic changed entry\n');await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.writeFile(worker,before)
 const shadow=path.join(target,'node_modules/@earendil-works/pi-ai/node_modules/openai');await fs.mkdir(shadow,{recursive:true});await fs.writeFile(path.join(shadow,'package.json'),'{"name":"synthetic-shadow"}');await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.rm(path.join(target,'node_modules/@earendil-works/pi-ai/node_modules'),{recursive:true,force:true})
 const link=path.join(target,'node_modules/synthetic-unsealed-link');await fs.symlink(path.join(target,'node_modules/openai'),link);await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.unlink(link)
 const manifest=path.join(target,'release.json'),original=await fs.readFile(manifest);await fs.appendFile(manifest,' ');await assert.rejects(runtime.verify(),/PI_RUNTIME_CHANGED/);await fs.writeFile(manifest,original)
 const release=JSON.parse(original.toString()),node=path.join(target,release.nodePath);assert.equal(createHash('sha256').update(await fs.readFile(node)).digest('hex'),release.files[release.nodePath]);await fs.rename(node,node+'.fixture');await assert.rejects(runtime.verify());await fs.rename(node+'.fixture',node)
 const packageJson=JSON.parse(await fs.readFile('package.json','utf8'));assert.ok(packageJson.build.extraResources.some((r:any)=>r.to==='pi-runtime'&&r.filter.includes('runtime/**/*')))
})
await fs.rm(root,{recursive:true,force:true})
import {spawnSync} from 'node:child_process'
import {PI_PROVIDER_ENDPOINTS,PI_PROVIDER_AUTH_MODES} from '../src/shared/constants/pi-provider-presets'
await test('UI provider presets match the fixed Pi catalog metadata without authentication or network',()=>{
 const binary=path.resolve('pi-runtime/runtime/darwin-arm64/node'),source=`for(const name of ['openai','anthropic','google','openai-codex','github-copilot']){const module=await import('./pi-runtime/node_modules/@earendil-works/pi-ai/dist/providers/'+name+'.js');const provider=Object.values(module).find(value=>typeof value==='function')();console.log(JSON.stringify({name,endpoint:provider.baseUrl??provider.getModels()[0].baseUrl,auth:Object.keys(provider.auth)}))}`
 const result=spawnSync(binary,['--input-type=module','-e',source],{shell:false,env:{LANG:'en_US.UTF-8'},encoding:'utf8',timeout:20000});assert.equal(result.status,0);for(const line of result.stdout.trim().split('\n')){const r=JSON.parse(line);assert.equal((PI_PROVIDER_ENDPOINTS as any)[r.name],r.endpoint);assert.deepEqual((PI_PROVIDER_AUTH_MODES as any)[r.name].map((v:string)=>v==='api-key'?'apiKey':v),r.auth)}
})
