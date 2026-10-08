import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'

for(const target of [undefined,'win32-x64'])await test('Pi preparation '+(target??'default target')+' is an offline plan with no writes or executable launch',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-offline-plan-'))
 try{
  const script=pathToFileURL(path.resolve('scripts/prepare-pi-runtime.mjs')).href
  const argv=['node','prepare',...(target?['--target='+target]:[])]
  const guard=`globalThis.fetch=()=>{throw Error('TEST_NETWORK_FORBIDDEN')};process.argv=${JSON.stringify(argv)};await import(${JSON.stringify(script)});`
  const run=spawnSync(process.execPath,['--input-type=module','-e',guard],{cwd:root,encoding:'utf8',windowsHide:true})
  assert.equal(run.status,0,run.stderr)
  const plan=JSON.parse(run.stdout);assert.equal(plan.mode,'offline-plan');assert.equal(plan.target,target??process.platform+'-'+process.arch);assert.equal(plan.nodeVersion,'24.21.0');assert.equal(plan.localArtifact,null)
  assert.deepEqual(await fs.readdir(root),[])
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
