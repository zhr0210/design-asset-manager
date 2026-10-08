import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'

await test('search snapshots and background count caches survive protected schema backups',async()=>{
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-search-schema-')))
  const library=path.join(root,'library'),files=[1,2,3,4].map(n=>path.join(root,`generated-${n}.png`))
  for(const file of files)await sharp({create:{width:32,height:24,channels:3,background:'#aabbcc'}}).png().toFile(file)
  const originalBytes=await Promise.all(files.map(file=>fs.readFile(file)))
  let selection=files.slice(0,3)
  const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory:async()=>({kind:'selected',directory:library}),
    selectLocalFiles:async()=>({kind:'selected',files:selection.map(filePath=>({filePath}))})
  }))
  try{
    const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('fixture create')
    await host.confirmCreate(create.plan.receipt)
    const add=async()=>{const plan=await host.prepareAddAssets();if(plan.kind!=='planned')throw Error('fixture add');await host.dispatchAddAssets(plan.plan.receipt)}
    await add()
    const scope={libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!}
    const query=(cursor?:string)=>host.searchAssetPage({...scope,query:'generated',tagScope:'includes-pending',limit:1,...(cursor?{cursor}:{})})
    const first=await query();assert.equal(first.total,3);assert.ok(first.nextCursor)
    const policy=await host.readBackgroundAnalysis(scope)
    const enabled=await host.configureBackgroundAnalysis({...scope,sessionToken:policy.sessionToken,
      expectedRevision:policy.policy.revision,expectedSchemaVersion:policy.schemaVersion,allowUpgrade:true,
      enabled:true,capabilities:{tags:true,caption:true,ocr:true}})
    assert.equal(enabled.schemaVersion,12)
    // A normal count read installs its own derived cache before the next upgrade.
    assert.equal((await host.readBackgroundAnalysis(scope)).schemaVersion,12)
    const permission=await host.readBackgroundOcr(scope)
    assert.equal((await host.configureBackgroundOcr({...scope,sessionToken:permission.sessionToken,
      expectedRevision:permission.permissionRevision,expectedSchemaVersion:permission.schemaVersion,
      allowUpgrade:true,enabled:true,runtimeFingerprint:'synthetic-domain-only'})).schemaVersion,13)
    const next=await query(first.nextCursor!);assert.equal(next.total,3);assert.equal(next.matches.length,1)
    assert.notEqual(next.matches[0].asset.id,first.matches[0].asset.id)
    selection=[files[3]];await add()
    const counts=(await host.readBackgroundAnalysis(scope)).counts
    for(const capability of ['tags','caption','ocr'])assert.equal(counts.filter(row=>row.capability===capability).reduce((n,row)=>n+row.count,0),1)
    assert.equal((await query()).total,4)
    assert.equal((await host.readSearchIndex()).state,'ready')
    const renewed=await host.readBackgroundOcr(scope)
    await host.configureBackgroundOcr({...scope,sessionToken:renewed.sessionToken,
      expectedRevision:renewed.permissionRevision,expectedSchemaVersion:renewed.schemaVersion,
      allowUpgrade:false,enabled:true,runtimeFingerprint:'synthetic-domain-only'})
    assert.equal((await host.readSearchIndex()).state,'ready','An ordinary permission update must keep the existing search projection ready')
    await host.close();await host.reopen()
    assert.equal((await query()).total,4)
  }finally{
    await host.close()
    assert.deepEqual(await Promise.all(files.map(file=>fs.readFile(file))),originalBytes)
    assert.ok(root.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(root).startsWith('dam-search-schema-'))
    await fs.rm(root,{recursive:true,force:true})
  }
})
