import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {randomBytes,createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-drop-cancel-'))),library=path.join(root,'library')
const bytes=await sharp(randomBytes(512*512*3),{raw:{width:512,height:512,channels:3}}).png().toBuffer(),digest=createHash('sha256').update(bytes).digest('hex')
const sources=Array.from({length:24},(_,i)=>path.join(root,`generated-${i}.png`));await Promise.all(sources.map(file=>fs.writeFile(file,bytes)))
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'cancelled'})}))
let observer:Database.Database|undefined,timer:ReturnType<typeof setInterval>|undefined
try{
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('CREATE');await host.confirmCreate(create.plan.receipt)
 const pre=new AbortController();pre.abort();await assert.rejects(host.prepareDroppedAssets!(sources,pre.signal));assert.equal((await host.listAssets()).length,0)
 const plan=await host.prepareDroppedAssets!(sources);if(plan.kind!=='planned')throw Error('PREPARE')
 observer=new Database(path.join(library,'.dam/library.sqlite'),{readonly:true,fileMustExist:true});const count=observer.prepare('SELECT count(*) AS n FROM promotion_links')
 const abort=new AbortController();timer=setInterval(()=>{if(Number((count.get() as {n:number}).n)>0)abort.abort()},5)
 const result=await host.dispatchDroppedAssets!(plan.plan.receipt,abort.signal);clearInterval(timer);timer=undefined
 const completed=result.items.filter(item=>item.state==='promoted').length
 assert.ok(abort.signal.aborted);assert.ok(completed>0&&completed<sources.length,`${completed}/${sources.length}`);assert.equal(result.state,'running');assert.equal((await host.listAssets()).length,completed)
 // Ordinary replay is a readback of the admitted partial batch, not a blind restart.
 const replay=await host.dispatchDroppedAssets!(plan.plan.receipt);assert.equal(replay.items.filter(i=>i.state==='promoted').length,completed)
 for(const file of sources)assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),digest)
 console.log(`Production temp Library: pre-cancel has no effects; cancellation observed after real promotion stops subsequent items (${completed}/24 completed); partial journal and originals retained; replay does not restart the batch.`)
}finally{if(timer)clearInterval(timer);observer?.close();await host.close().catch(()=>{});await fs.rm(root,{recursive:true,force:true})}
