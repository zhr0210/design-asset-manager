import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import type {RetrievalQualification} from '../src/shared/contracts/retrieval-workspace.contract'

const vector=(index:number)=>Array.from({length:768},(_,i)=>i===index?1:0)
const space:RetrievalQualification={fingerprint:'a'.repeat(64),spaceId:'b'.repeat(64),dimension:768,encoding:'float32-le',normalization:'l2',distance:'cosine',
  imageRecipe:'siglip2-rgb-224-v1',textRecipe:'siglip2-original-text-64-v1',testedAt:'2026-10-07T00:00:00Z',peakRamBytes:1000,
  languages:['zh','en','mixed'].map(language=>({language:language as 'zh'|'en'|'mixed',correct:2,total:2}))}

await test('Host canonical image vectors support filtered multilingual fixture queries and stable paging; derived rebuilding and reopening never re-embed',async()=>{
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-retrieval-host-'))),library=path.join(root,'library')
  const sources=['red','blue','green'].map(v=>path.join(root,v+'.png'))
  for(const [i,file] of sources.entries())await sharp({create:{width:100,height:100,channels:3,background:['#ee1010','#1010ee','#10ee10'][i]}}).png().toFile(file)
  const originals=await Promise.all(sources.map(f=>fs.readFile(f)))
  let imageCalls=0,textCalls=0,retrievalAvailable=true
  let imageGate:{entered():void;release:Promise<void>}|undefined
  const admission=createVisualAdmission({policy:{mode:'quiet',reserveFraction:.1}})
  // A deterministic dependency fixture tests Host effects/filtering/recovery;
  // it is never provided by Main and proves no real multilingual model quality.
  const runtime={currentSpace:()=>space,
    embedImages:async(images:Uint8Array[])=>{imageCalls+=images.length;if(imageGate){imageGate.entered();await imageGate.release}return{space,vectors:await Promise.all(images.map(async bytes=>{
      const {channels}=await sharp(bytes).stats();return vector(channels[0].mean>channels[1].mean&&channels[0].mean>channels[2].mean?0:channels[2].mean>channels[1].mean?1:2)}))}},
    embedTexts:async(texts:string[])=>{textCalls+=texts.length;return{space,vectors:texts.map(()=>vector(0))}}}
  const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),
    selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})},{retrievalRuntime:()=>retrievalAvailable?runtime:undefined,admission}))
  const scope=()=>({libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!})
  const query=(text:string,tagQueries?:string[],cursor?:string)=>host.searchSemanticPage({...scope(),query:text,mode:'semantic',tagScope:'includes-pending',tagQueries,limit:1,cursor})
  try{
    const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('fixture');await host.confirmCreate(plan.plan.receipt)
    const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('fixture');await host.dispatchAddAssets(add.plan.receipt)
    const assets=await host.listAssets(),red=assets.find(a=>a.title==='red')!
    await host.startRetrievalGeneration({...scope(),selection:'whole-library'})
    for(let i=0;i<300;i++){const value=await host.readRetrievalCoverage();if(value.jobs[0]?.state==='complete')break;await new Promise(r=>setTimeout(r,10))}
    const initialCoverage=await host.readRetrievalCoverage()
    if(initialCoverage.indexed!==3)process.stdout.write(JSON.stringify({initialCoverage,imageCalls})+'\n')
    assert.equal(initialCoverage.indexed,3);assert.equal(imageCalls,3)
    const first=await query('red 红色');assert.equal(first.matches[0].asset.id,red.id);assert.equal(first.mode,'semantic')
    assert.ok(first.matches[0].explanation?.evidence.some(e=>e.kind==='semantic'));assert.ok(first.nextCursor)
    const second=await query('red 红色',undefined,first.nextCursor!);assert.notEqual(second.matches[0].asset.id,red.id)
    assert.equal(textCalls,1,'Paging the frozen plan must not run the query model again')
    const tag=await host.createTag({name:'保留'});await host.addTagToAsset(red.id,tag.id)
    const filtered=await query('a red object',['tag:保留']);assert.equal(filtered.total,1);assert.equal(filtered.matches[0].asset.id,red.id)
    const colorInput={...scope(),query:'red 红色',mode:'semantic' as const,tagScope:'includes-pending' as const,limit:100,color:{hex:'#1010EE',minimumPercentage:99,tolerance:15}}
    const blueOnly=await host.searchSemanticPage(colorInput)
    assert.equal(blueOnly.total,1);assert.equal(blueOnly.matches[0].asset.title,'blue','Colour is a hard condition, even when the vector query ranks red first')
    assert.equal(blueOnly.colors?.measured,3);assert.equal(blueOnly.colors?.total,3)
    assert.ok(blueOnly.matches[0].explanation?.evidence.some(e=>e.kind==='color'))
    assert.equal((await host.searchSemanticPage({...colorInput,color:{hex:'#FFFFFF',minimumPercentage:99,tolerance:15}})).total,0)
    const org=await host.readOrganization(scope()),folder=await host.writeOrganization({...scope(),sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:true,command:{kind:'create',folderKind:'assets',parentId:null,name:'蓝色范围',assetIds:[assets.find(a=>a.title==='blue')!.id]}})
    const inFolder=await host.searchSemanticPage({...scope(),folderId:folder.folders.find(f=>f.name==='蓝色范围')!.id,query:'a red object',mode:'semantic',tagScope:'includes-pending',limit:100})
    assert.equal(inFolder.total,1);assert.equal(inFolder.matches[0].asset.title,'blue','Semantic ranking cannot widen the explicit folder condition')
    retrievalAvailable=false
    const fallback=await host.searchSemanticPage({...scope(),folderId:folder.folders.find(f=>f.name==='蓝色范围')!.id,query:'red',mode:'semantic',tagScope:'includes-pending',limit:100})
    assert.equal(fallback.mode,'lexical-only')
    assert.equal(fallback.total,0,'An unavailable semantic model must not broaden the chosen folder in lexical fallback')
    assert.deepEqual(fallback.matches,[])
    const fallbackSlot=await admission.reserveLocalWork('index',1,new AbortController().signal)
    const cancelledFallback=host.searchSemanticPage({...scope(),query:'red',mode:'semantic',tagScope:'includes-pending',limit:100,queryId:'cancelled-fallback'})
    const fallbackSettled=cancelledFallback.then(()=>({returned:true}),()=>({returned:false}))
    let fallbackDeadline:ReturnType<typeof setTimeout>|undefined
    try{
      for(let i=0;i<100&&admission.resourceStatus().waiting===0;i++)await new Promise(resolve=>setTimeout(resolve,5))
      assert.ok(admission.resourceStatus().waiting>0)
      await host.cancelSemanticQuery(scope(),'cancelled-fallback')
      const outcome=await Promise.race([fallbackSettled,new Promise<never>((_,reject)=>{fallbackDeadline=setTimeout(()=>reject(Error('Lexical-only fallback must respect query cancellation')),1500)})])
      assert.equal(outcome.returned,false)
    }finally{clearTimeout(fallbackDeadline);fallbackSlot.release();await fallbackSettled}
    retrievalAvailable=true
    const hybridQuery=host.searchSemanticPage({...scope(),query:'red',mode:'hybrid',tagScope:'includes-pending',limit:100,queryId:'single-slot-hybrid'})
    let queryDeadline:ReturnType<typeof setTimeout>|undefined
    try{
      const hybrid=await Promise.race([hybridQuery,new Promise<never>((_,reject)=>{queryDeadline=setTimeout(()=>reject(Error('Hybrid search must complete while only one request slot is available')),1500)})])
      assert.equal(hybrid.matches[0].asset.id,red.id)
      assert.equal(hybrid.matches[0].explanation?.lane,'hybrid')
      assert.equal(admission.resourceStatus().requests,0)
    }finally{
      clearTimeout(queryDeadline)
      await host.cancelSemanticQuery(scope(),'single-slot-hybrid')
      await hybridQuery.catch(()=>{})
    }
    const vectorRegistry=path.join(library,'.dam/.dam-asset-retrieval.json')
    const beforeCancelledIndex=JSON.parse(await fs.readFile(vectorRegistry,'utf8')).index
    const heldSlot=await admission.reserveLocalWork('index',1,new AbortController().signal)
    const cancelled=host.searchSemanticPage({...scope(),query:'red',mode:'semantic',tagScope:'includes-pending',limit:100,queryId:'cancelled-index-admission'})
    const settled=cancelled.then(()=>({returned:true}),()=>({returned:false}))
    try{
      for(let i=0;i<100&&admission.resourceStatus().waiting===0;i++)await new Promise(resolve=>setTimeout(resolve,5))
      assert.ok(admission.resourceStatus().waiting>0)
      await host.cancelSemanticQuery(scope(),'cancelled-index-admission')
      assert.equal((await settled).returned,false)
    }finally{heldSlot.release()}
    await host.rebuildRetrievalIndex()
    assert.notEqual(JSON.parse(await fs.readFile(vectorRegistry,'utf8')).index,beforeCancelledIndex)
    // Windows will refuse this physical rename if an obsolete SQLite reader is
    // still pinned after cancelled admission. Never touch the current index.
    await fs.rename(path.join(library,'.dam',beforeCancelledIndex),path.join(library,'.dam',beforeCancelledIndex+'.retired-check'))
    const generation=first.coverage.indexGeneration
    const rebuilt=await host.rebuildRetrievalIndex();assert.notEqual(rebuilt.indexGeneration,generation);assert.equal(imageCalls,3)
    await host.close();await host.reopen()
    assert.equal((await query('红色画面')).matches[0].asset.id,red.id);assert.equal(imageCalls,3,'Reopening keeps canonical results')
    const canonicalFile=path.join(library,'.dam',JSON.parse(await fs.readFile(vectorRegistry,'utf8')).canonical)
    const savedVectors=()=>{const database=new Database(canonicalFile,{readonly:true,fileMustExist:true})
      try{return database.prepare<[],{space:string;id:string;view:string;input_sha:string;vector:Buffer;created_at:string}>('SELECT * FROM vectors ORDER BY space,id,view').all()
        .map(({vector,...metadata})=>({...metadata,vectorSha256:createHash('sha256').update(vector).digest('hex')}))}finally{database.close()}}
    const canonicalBeforeReuse=savedVectors()
    await host.startRetrievalGeneration({...scope(),selection:'selected',assetIds:[red.id]})
    for(let i=0;i<300;i++){if((await host.readRetrievalCoverage()).jobs[0]?.state==='complete')break;await new Promise(r=>setTimeout(r,10))}
    assert.equal(imageCalls,3,'An unchanged canonical input is reused by an explicit coverage request')
    assert.deepEqual(savedVectors(),canonicalBeforeReuse,'Reusing vectors must preserve the original canonical bytes and generation time')
    const imageQuery={...scope(),query:'',mode:'image' as const,imageAssetId:red.id,tagScope:'includes-pending' as const,limit:1}
    const imagePage=await host.searchSemanticPage(imageQuery)
    assert.ok(imagePage.nextCursor)
    let entered!:()=>void,release!:()=>void
    const enteredPromise=new Promise<void>(resolve=>{entered=resolve})
    imageGate={entered,release:new Promise<void>(resolve=>{release=resolve})}
    const pendingImage=host.searchSemanticPage({...imageQuery,queryId:'source-changed-during-embedding'})
    const pendingResult=pendingImage.then(()=>({returned:true,error:''}),error=>({returned:false,error:String(error)}))
    try{
      await enteredPromise
      const context=(await host.readAssetContext([red.id])).assets[0]
      const trash=await host.prepareTrash({designAssetIdentity:red.id,expectedRevision:context.revision})
      if(trash.kind!=='planned')throw Error('fixture trash')
      await host.dispatchTrash({kind:'move-design-asset-to-trash',planReceipt:trash.plan.receipt,designAssetIdentity:red.id,expectedRevision:context.revision})
      release()
      const outcome=await pendingResult
      assert.equal(outcome.returned,false,'An in-flight image query must reject when its library source is no longer active')
      assert.match(outcome.error,/RETRIEVAL_QUERY_IMAGE_EXPIRED/)
      await assert.rejects(host.searchSemanticPage({...imageQuery,cursor:imagePage.nextCursor!}),/RETRIEVAL_QUERY_IMAGE_EXPIRED/)
    }finally{release();await pendingResult;imageGate=undefined}
  }finally{await host.close();admission.invalidate();assert.deepEqual(await Promise.all(sources.map(f=>fs.readFile(f))),originals);await fs.rm(root,{recursive:true,force:true})}
})
