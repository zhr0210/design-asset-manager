import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkWindowController,type WorkWindowPort} from '../src/main/work-mode/work-window-controller'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createShelfDraftStore} from '../src/main/work-mode/shelf-draft-store'
import {createWorkMemberTools} from '../src/main/work-mode/work-member-tools'
import type {ShelfAction,ShelfReply} from '../src/main/work-mode/native-shelf-actions'
import type {WorkWindowSnapshot,WorkWindowLayout} from '../src/shared/contracts/work-set.contract'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-shelf-controller-'))),library=path.join(root,'library'),first=path.join(root,'first.png'),second=path.join(root,'second.png'),receiver=path.join(root,'receiver')
await fs.mkdir(receiver);await sharp({create:{width:80,height:90,channels:3,background:'#195af0'}}).png().toFile(first);await sharp({create:{width:110,height:70,channels:3,background:'#cdaa99'}}).png().toFile(second)
const original=await fs.readFile(first)
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:first}]})}))
const drafts=createShelfDraftStore(path.join(root,'drafts')),files=createWorkFileHandoffs({host,root:path.join(root,'copies'),open:async()=>'',trash:async()=>{throw Error('NO_TEST_TRASH')}}),media=createWorkMediaController({host,files,changed(){}})
let action:((a:ShelfAction)=>Promise<ShelfReply>)|undefined,state:WorkWindowSnapshot|null=null,layout:WorkWindowLayout={x:20,y:20,width:290,height:310,pinned:true,open:true},focused='',destroyed=false,gateExit=false,releaseExit:(()=>void)|undefined
const owner={},port:WorkWindowPort={bindShelfActions:listener=>{action=listener},publish:s=>{state=s},show(){},hide(){},async destroy(){if(gateExit)await new Promise<void>(resolve=>{releaseExit=resolve});destroyed=true},setPinned(){},bounds:()=>layout,setBounds:b=>{layout=b},configureDock:b=>{layout=b},visible:()=>!destroyed,isTrusted:e=>e===owner,openFocus:id=>{focused=id},feedback(){}}
const memberTools=createWorkMemberTools({host,visual:()=>undefined,ocr:()=>undefined})
const controller=createWorkWindowController({host,memberTools,shelfDrafts:drafts,media,deviceId:'fixture-device',areas:()=>[{x:0,y:0,width:1280,height:800}],theme:()=> 'light',createWindow:()=>port,beforeWorkspaceClose:async()=>()=>{},changed(){},hideMain(){},locate(){}})
try{
 const create=await host.prepareCreate();if(create.kind!=='planned')throw Error('CREATE');await host.confirmCreate(create.plan.receipt)
 const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error('ADD');await host.dispatchAddAssets(add.plan.receipt)
 const asset=(await host.listAssets())[0],p=host.inspect(),scope={libraryIdentity:p.identity!,generation:p.generation!},catalog=await host.readWorkSets(scope,'fixture-device')
 const created=await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Native test',assetIds:[asset.id],note:'original',colors:[],columns:2}}},'fixture-device'),id=created.sets[0].id
 assert.equal((await controller.open({...scope,id})).success,true)
 assert.equal((await action!({kind:'edit',field:'note',value:'autosaved native note',serial:1})).ok,true)
 assert.equal((await action!({kind:'transient',pending:true})).ok,true);assert.equal((await action!({kind:'focus',assetId:asset.id})).ok,false);await assert.rejects(controller.drain());assert.equal((await action!({kind:'transient',pending:false})).ok,true)
 assert.equal((await host.readWorkSets(scope,'fixture-device')).sets[0].note,'autosaved native note');assert.equal(drafts.read(scope.libraryIdentity,id),undefined)
 assert.equal((await action!({kind:'focus',assetId:asset.id})).ok,true);assert.equal(focused,asset.id);const inspected=await controller.inspect(owner);assert.equal(inspected.success&&inspected.value.focusOnly,true);assert.equal(inspected.success&&inspected.value.focusAssetId,asset.id)
 if(!inspected.success)throw Error('INSPECT')
 const memberCall=(operation:string,assetId=asset.id,event:unknown=owner)=>controller.memberTools(event,{token:inspected.value.token,assetId,operation})
 const details=await memberCall('details');assert.equal(details.success,true);if(details.success){const value=details.value as {width:number;height:number;fileName:string};assert.equal(value.width,80);assert.equal(value.height,90);assert.equal(value.fileName,'first.png')}
 const palette=await memberCall('colors');assert.equal(palette.success,true);if(palette.success){const value=palette.value as {colors:{hex:string;percentage:number}[]};assert.equal(value.colors[0].hex,'#195AF0');assert.equal(value.colors.reduce((n,c)=>n+c.percentage,0),100)}
 assert.equal((await memberCall('details','asset:outside')).success,false);assert.equal((await memberCall('details',asset.id,{})).success,false);assert.equal((await memberCall('arbitrary-file-read')).success,false);assert.equal((await memberCall('ai-backends')).success,false);assert.equal((await memberCall('ocr-status')).success,false)
 const destination=path.join(receiver,'first.png');assert.equal((await action!({kind:'promise',assetId:asset.id,destination})).ok,true);assert.deepEqual(await fs.readFile(destination),original)
 assert.equal((await action!({kind:'promise',assetId:asset.id,destination})).ok,false);assert.deepEqual(await fs.readFile(destination),original)
 assert.equal((await action!({kind:'members',transfer:{...scope,assetIds:[asset.id]}})).ok,true);assert.equal((await host.readWorkSets(scope,'fixture-device')).sets[0].assetIds.length,1)
 assert.equal((await action!({kind:'members',transfer:{...scope,generation:'wrong',assetIds:[asset.id]}})).ok,false)
 assert.equal((await action!({kind:'drop',paths:[second]})).ok,true);const set=(await host.readWorkSets(scope,'fixture-device')).sets[0];assert.equal(set.assetIds.length,2)
 const zip=await action!({kind:'handoff',handoffKind:'zip',assetIds:set.assetIds});assert.equal(zip.ok,true);assert.equal(zip.receipts?.length,1)
 const zipped=await action!({kind:'promise',assetId:set.assetIds[0],receiptId:zip.receipts![0].id,destination:path.join(receiver,'references.zip')});assert.equal(zipped.ok,true);assert.equal((await fs.readFile(path.join(receiver,'references.zip'))).subarray(0,2).toString(),'PK')
 assert.equal((await action!({kind:'edit',field:'remove',value:[asset.id],serial:2})).ok,true);assert.equal((await host.readWorkSets(scope,'fixture-device')).sets[0].assetIds.length,1);assert.equal((await host.listAssets()).length,2)
 assert.equal((await action!({kind:'promise',assetId:asset.id,destination:path.join(receiver,'revoked.png')})).ok,false)
 assert.equal((await memberCall('details')).success,false)
 // A real competing Work Set commit must retain the local draft and reject an
 // outdated resolution instead of silently overwriting the newer revision.
 const competing=await host.readWorkSets(scope,'fixture-device'),savedSet=competing.sets.find(s=>s.id===id)!
 const value={name:savedSet.name,assetIds:savedSet.assetIds,note:'other window commit',colors:savedSet.colors,columns:savedSet.columns}
 const changed=await host.writeWorkSet({...scope,sessionToken:competing.sessionToken,allowUpgrade:false,command:{kind:'save',id,expectedRevision:savedSet.revision,value}},'fixture-device')
 assert.equal((await action!({kind:'edit',field:'note',value:'autosaved native note',serial:3})).ok,false)
 assert.equal(drafts.read(scope.libraryIdentity,id)?.value.note,'autosaved native note')
 await assert.rejects(controller.drain())
 const review=await action!({kind:'review-save'});assert.equal(review.ok,true);assert.equal(review.review?.note,'other window commit')
 assert.equal((await action!({kind:'resolve-save',revision:savedSet.revision})).ok,false)
 assert.equal((await host.readWorkSets(scope,'fixture-device')).sets[0].note,'other window commit')
 const newRevision=changed.sets.find(s=>s.id===id)!.revision
 assert.equal((await action!({kind:'resolve-save',revision:newRevision})).ok,true)
 assert.equal(drafts.read(scope.libraryIdentity,id),undefined)
 assert.equal((await host.readWorkSets(scope,'fixture-device')).sets[0].note,'autosaved native note')
 gateExit=true;const closing=controller.control({...scope,id,kind:'close'});while(!releaseExit)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(controller.count(),1);assert.equal(destroyed,false);releaseExit();const closed=await closing;assert.equal(closed.success,true);assert.equal(controller.count(),0)
 await controller.drain();await host.close();await host.open();const now=host.inspect(),reopened=await host.readWorkSets({libraryIdentity:now.identity!,generation:now.generation!},'fixture-device');assert.equal(reopened.sets[0].note,'autosaved native note');assert.equal(reopened.sets[0].assetIds.length,1);assert.deepEqual(await fs.readFile(first),original)
 console.log('Production temporary Library: native autosave/reopen, real revision conflict retains draft/blocks close, stale resolution rejected/current reviewed revision commits, direct first promise bytes, no overwrite, current-scope duplicate reference, external Copy drop, ZIP promise, member revocation and original retention. Controlled OS port, not UI acceptance.')
}finally{await host.close().catch(()=>{});await fs.rm(root,{recursive:true,force:true})}
