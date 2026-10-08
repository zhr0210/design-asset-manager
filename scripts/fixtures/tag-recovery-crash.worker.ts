import path from 'node:path'
import fs from 'node:fs/promises'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../../src/main/library-lifecycle/production-active-library-dependencies'
const [root,cut,url]=process.argv.slice(2)
if(!path.basename(root).startsWith('dam-tag-recovery-')||!['before-claim','after-claim','after-sent','after-response','after-commit','after-ack','during-transaction'].includes(cut)||!url.startsWith('http://127.0.0.1:'))throw Error('Invalid owned fixture')
const library=path.join(root,'library'),host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library})}))
await host.open();const asset=(await host.listAssets())[0],state=host.inspect(),scope={libraryIdentity:state.identity!,generation:state.generation!,assetId:asset.id},session=await host.readTagIntentContext(scope)
const marker=()=>{process.stdout.write(JSON.stringify({cut,ready:true})+'\n');setInterval(()=>{},1000)}
const ref={...scope,sessionToken:session.sessionToken,requestId:'batch-one',inputSha256:'a'.repeat(64),origin:'tags-only' as const}
if(cut==='before-claim'){marker()}else{
 const claim={...ref,...await host.claimTagExecution(ref)}
 if(cut==='after-claim'){marker()}else{
  await host.markTagExecutionSent(claim)
  if(cut==='after-sent'){marker()}else{
   // Owned loopback records the response cut. No real image or external provider is used.
   const response=await fetch(url,{method:'POST',body:JSON.stringify({fixture:'generated-response-cut'})});if(!response.ok)throw Error('Owned fixture response failed');await response.json()
   if(cut==='after-response'){marker()}else if(cut==='during-transaction'){
    const db=new Database(path.join(library,'.dam','library.sqlite'));db.pragma('cache_size=1');db.pragma('cache_spill=ON');db.exec('BEGIN IMMEDIATE');db.prepare('UPDATE assets SET ai_caption=? WHERE id=?').run('generated interrupted transaction '.repeat(5000),asset.id)
    await fs.stat(path.join(library,'.dam','library.sqlite-journal'));marker()
   }else{
    await host.commitTagExecution({...claim,tags:['已保存标签']})
    if(cut==='after-ack')for(const event of await host.readTagOutbox(ref))await host.ackTagOutbox(ref,event.eventId)
    marker()
   }
  }
 }
}
