import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'

async function fixture(admission?:ReturnType<typeof createVisualAdmission>) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-search-host-'))), library = path.join(root,'library')
  const files = [1,2,3].map(n=>path.join(root,`generated-${n}.png`))
  for (const file of files) await sharp({create:{width:32,height:24,channels:3,background:'#aabbcc'}}).png().toFile(file)
  const sourceBytes = await Promise.all(files.map(file=>fs.readFile(file)))
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async()=>({kind:'selected',directory:library}),
    selectLocalFiles:async()=>({kind:'selected',files:files.map(filePath=>({filePath}))}),
  },{admission}))
  const plan = await host.prepareCreate(); if (plan.kind!=='planned') throw Error('fixture')
  await host.confirmCreate(plan.plan.receipt)
  const add = await host.prepareAddAssets(); if (add.kind!=='planned') throw Error('fixture')
  await host.dispatchAddAssets(add.plan.receipt)
  const scope = {libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!}
  const query = (text:string,limit=100,cursor?:string) => host.searchAssetPage({...scope,query:text,tagScope:'includes-pending',limit,...(cursor?{cursor}:{})})
  return { root,library,host,scope,query,close:async()=>{
    await host.close()
    assert.deepEqual(await Promise.all(files.map(file=>fs.readFile(file))),sourceBytes)
    assert.ok(root.startsWith(path.resolve(os.tmpdir())+path.sep) && path.basename(root).startsWith('dam-search-host-'))
    await fs.rm(root,{recursive:true,force:true})
  } }
}

await test('Host color filtering measures controlled previews, persists coverage and enforces percentage without a model',async()=>{
  const f=await fixture()
  try {
    const input={...f.scope,query:'',tagScope:'includes-pending' as const,limit:1,color:{hex:'#AABBCC',minimumPercentage:99,tolerance:15}}
    const page=await f.host.searchAssetPage(input)
    assert.equal(page.total,3)
    assert.equal(page.matches.length,1)
    assert.equal(page.colors?.measured,3)
    assert.equal(page.colors?.unavailable,0)
    assert.equal(page.matches[0].explanation?.evidence.find(e=>e.kind==='color')?.match,'measured')
    assert.ok(page.matches[0].explanation?.evidence.some(e=>e.label.includes('100.00%')))
    assert.equal((await f.host.searchAssetPage({...input,color:{hex:'#FF0000',minimumPercentage:1,tolerance:15}})).total,0)
    await assert.rejects(f.host.searchAssetPage({...input,color:{...input.color,minimumPercentage:101}}))
    await assert.rejects(f.host.searchAssetPage({...input,color:{...input.color,extra:'not allowed'}}))
    await f.host.close();await f.host.reopen()
    const scope={libraryIdentity:f.host.inspect().identity!,generation:f.host.inspect().generation!}
    const reopened=await f.host.searchAssetPage({...input,...scope,limit:100})
    assert.equal(reopened.total,3);assert.equal(reopened.colors?.measured,3)
    const asset=reopened.matches[0].asset
    const trash=await f.host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:asset.revision})
    if(trash.kind!=='planned')throw Error('fixture')
    await f.host.dispatchTrash({kind:'move-design-asset-to-trash',planReceipt:trash.plan.receipt,designAssetIdentity:asset.id,expectedRevision:asset.revision})
    assert.equal((await f.host.searchAssetPage({...input,...scope,limit:100})).total,2)
  }finally{await f.close()}
})

await test('Host color pages revalidate lifecycle after an awaited resource grant',async()=>{
 let release!:()=>void,entered!:()=>void
 const base=createVisualAdmission(),gate=new Promise<void>(resolve=>{release=resolve})
 const started=new Promise<void>(resolve=>{entered=resolve});let foreground=0
 const admission={...base,reserveLocalWork:async(...args:Parameters<typeof base.reserveLocalWork>)=>{
   const permit=await base.reserveLocalWork(...args)
   if(args[0]==='index'&&args[3]==='foreground'&&++foreground===2){entered();await gate}
   return permit
 }}
 const f=await fixture(admission)
 try{
   const target=(await f.host.listAssets())[0]
   const pending=f.host.searchAssetPage({...f.scope,query:'',tagScope:'includes-pending',limit:100,color:{hex:'#AABBCC',minimumPercentage:99,tolerance:15}})
   await started
   const plan=await f.host.prepareTrash({designAssetIdentity:target.id,expectedRevision:target.revision})
   if(plan.kind!=='planned')throw Error('fixture')
   await f.host.dispatchTrash({kind:'move-design-asset-to-trash',planReceipt:plan.plan.receipt,designAssetIdentity:target.id,expectedRevision:target.revision})
   release()
   const page=await pending
   assert.ok(page.matches.every(match=>match.asset.id!==target.id),'A held colour page must never return an asset trashed while it waits')
   assert.equal(page.matches.length,2)
 }finally{release();await f.close()}
})

await test('a filled color page rechecks earlier hits after a later page-fill iteration waits',async()=>{
 let release!:()=>void,entered!:()=>void,removeMiddle!:()=>Promise<void>
 const gate=new Promise<void>(resolve=>{release=resolve}),started=new Promise<void>(resolve=>{entered=resolve})
 const base=createVisualAdmission();let enabled=false,foreground=0
 const admission={...base,reserveLocalWork:async(...args:Parameters<typeof base.reserveLocalWork>)=>{
   const permit=await base.reserveLocalWork(...args)
   if(enabled&&args[0]==='index'&&args[3]==='foreground'){
     foreground++
     if(foreground===2)await removeMiddle()
     if(foreground===3){entered();await gate}
   }
   return permit
 }}
 const f=await fixture(admission)
 try{
   const order=(await f.query('',100)).matches.map(match=>match.asset)
   const trash=async(asset:typeof order[number])=>{const plan=await f.host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:asset.revision})
     if(plan.kind!=='planned')throw Error('fixture');await f.host.dispatchTrash({kind:'move-design-asset-to-trash',planReceipt:plan.plan.receipt,designAssetIdentity:asset.id,expectedRevision:asset.revision})}
   removeMiddle=()=>trash(order[1]);enabled=true
   const pending=f.host.searchAssetPage({...f.scope,query:'',tagScope:'includes-pending',limit:2,color:{hex:'#AABBCC',minimumPercentage:99,tolerance:15}})
   await started;await trash(order[0]);release()
   const page=await pending
   assert.deepEqual(page.matches.map(match=>match.asset.id),[order[2].id],'The complete page must be current after its last await, including earlier accumulated hits')
 }finally{release();await f.close()}
})

await test('Host text source scopes distinguish names, confirmed aliases and human descriptions; row-only edits retain frozen paging',async()=>{
 const f=await fixture()
 try{
   const first=await f.query('generated',1),remaining=(await f.host.listAssets()).filter(a=>a.id!==first.matches[0].asset.id)
   const id=remaining[0].id
   await f.host.updateAssetCaption(id,'中文咖啡与唯一人工词')
   const input={...f.scope,query:'唯一人工词',tagScope:'includes-pending' as const,limit:100}
   assert.deepEqual((await f.host.searchAssetPage({...input,fields:['description']})).matches.map(m=>m.asset.id),[id])
   assert.equal((await f.host.searchAssetPage({...input,fields:['name']})).matches.length,0)
   const tag=await f.host.createTag({name:'已确认主题'});await f.host.addTagToAsset(id,tag.id);await f.host.createTagAlias(tag.id,'独立别名词')
   assert.equal((await f.host.searchAssetPage({...input,query:'独立别名词',fields:['tags']})).matches.length,1)
   assert.equal((await f.host.searchAssetPage({...input,query:'独立别名词',fields:['ai-tags']})).matches.length,0)
   await assert.rejects(f.host.searchAssetPage({...input,fields:['not-a-field']}))
   const second=await f.query('generated',1,first.nextCursor!)
   const third=second.nextCursor?await f.query('generated',1,second.nextCursor):{matches:[]}
   const matches=[...second.matches,...third.matches]
   assert.equal(matches.length,2,'Updating metadata must refresh rows without silently losing members of an existing snapshot')
   assert.ok(matches.some(m=>m.asset.id===id&&m.asset.aiCaption==='中文咖啡与唯一人工词'))
 }finally{await f.close()}
})

await test('Host search indexes Chinese cross-field edits and aliases, excludes stale hits, and pages a stable query snapshot',async()=>{
  const f = await fixture()
  try {
    const first = await f.query('generated',1)
    assert.equal(first.total,3); assert.equal(first.matches.length,1); assert.ok(first.nextCursor)
    const second = await f.query('generated',1,first.nextCursor!)
    assert.notEqual(first.matches[0].asset.id,second.matches[0].asset.id)
    const id = first.matches[0].asset.id
    await f.host.updateAssetCaption(id,'青绿色咖啡杯放在木桌上')
    const combined = await f.query('咖啡 generated')
    assert.deepEqual(combined.matches.map(match=>match.asset.id),[id])
    assert.ok(combined.matches[0].explanation?.evidence.some(e=>e.kind==='description'))
    const tag = await f.host.createTag({name:'中文标签'})
    await f.host.addTagToAsset(id,tag.id); await f.host.createTagAlias(tag.id,'coffee')
    assert.deepEqual((await f.query('coffee')).matches.map(match=>match.asset.id),[id])
    const frozen = await f.query('coffee',1)
    await f.host.updateAssetCaption(id,'红色杯子'); await f.host.removeTagAlias(tag.id,'coffee')
    assert.equal((await f.query('咖啡')).matches.length,0)
    assert.equal((await f.query('coffee')).matches.length,0)
    const context = (await f.host.readAssetContext([id])).assets[0]
    const trash = await f.host.prepareTrash({designAssetIdentity:id,expectedRevision:context.revision})
    if (trash.kind!=='planned') throw Error('fixture')
    await f.host.dispatchTrash({kind:'move-design-asset-to-trash',planReceipt:trash.plan.receipt,designAssetIdentity:id,expectedRevision:context.revision})
    assert.equal((await f.query('generated')).total,2)
    assert.equal((await f.host.readSearchIndex()).state,'ready')
    await assert.rejects(f.host.searchAssetPage({...f.scope,query:'other',tagScope:'includes-pending',limit:1,cursor:first.nextCursor!}))
    assert.equal(frozen.matches[0].asset.id,id)
    for(let refresh=0;refresh<25;refresh++)assert.equal((await f.query('generated')).total,2,
      'Completed one-page queries must not exhaust the snapshot budget during analysis notifications')
  } finally { await f.close() }
})
await test('Host folder search counts only canonical members and rechecks membership for a later frozen page',async()=>{
 const f=await fixture();try{
   const ids=(await f.host.listAssets()).map(a=>a.id),before=await f.host.readOrganization(f.scope)
   const created=await f.host.writeOrganization({...f.scope,sessionToken:before.sessionToken,expectedRevision:before.revision,allowUpgrade:true,command:{kind:'create',folderKind:'assets',parentId:null,name:'范围',assetIds:ids.slice(0,2)}})
   const folderId=created.folders.find(v=>v.name==='范围')!.id,input={...f.scope,query:'generated',tagScope:'includes-pending' as const,folderId,limit:1}
   const page=await f.host.searchAssetPage(input);assert.equal(page.total,2);assert.ok(page.nextCursor)
   const removed=ids.slice(0,2).find(id=>id!==page.matches[0].asset.id)!
   await f.host.writeOrganization({...f.scope,sessionToken:created.sessionToken,expectedRevision:created.revision,allowUpgrade:false,command:{kind:'remove-assets',folderId,assetIds:[removed]}})
   assert.equal((await f.host.searchAssetPage({...input,cursor:page.nextCursor!})).matches.length,0)
   assert.equal((await f.host.searchAssetPage({...input,limit:100})).total,1)
 }finally{await f.close()}
})

await test('owned derived index generations rebuild and recover corrupted data while source content and ordinary reopen remain usable',async()=>{
  const f=await fixture()
  try {
    const before=await f.query('generated',1), oldGeneration=before.index.indexGeneration
    const rebuilt=await f.host.rebuildSearchIndex()
    assert.equal(rebuilt.state,'ready'); assert.notEqual(rebuilt.indexGeneration,oldGeneration)
    assert.equal((await f.query('generated',1,before.nextCursor!)).matches.length,1)
    await f.host.close(); await f.host.reopen()
    assert.equal((await f.query('generated')).total,3)
    await f.host.close()
    const owner=JSON.parse(await fs.readFile(path.join(f.library,'.dam','.dam-asset-search.json'),'utf8'))
    assert.match(owner.file,/^asset-search-[a-f0-9-]{36}\.sqlite$/)
    const derived=path.resolve(f.library,'.dam',owner.file)
    assert.equal(path.dirname(derived),path.resolve(f.library,'.dam'))
    await fs.writeFile(derived,'controlled corruption of a disposable derived index')
    await f.host.reopen()
    assert.equal((await f.host.listAssets()).length,3)
    assert.equal((await f.query('generated')).total,3)
    assert.equal(await fs.readFile(derived,'utf8'),'controlled corruption of a disposable derived index')
  } finally { await f.close() }
})
