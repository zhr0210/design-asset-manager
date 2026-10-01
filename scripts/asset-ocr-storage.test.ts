import {createOcrController} from '../src/main/ocr/ocr-controller'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {projectAssetDiscovery} from '../src/shared/workflows/asset-discovery.workflow'
import type {OcrObservation,OcrCommit} from '../src/shared/contracts/asset-ocr.contract'
import {enableVisualAiStorage} from '../src/main/visual-ai/visual-ai-storage'
import {enableWorkSetStorage} from '../src/main/library-lifecycle/work-set.schema'
import {enableOrganizationStorage} from '../src/main/library-lifecycle/library-organization.schema'
import {enableNotebookStorage} from '../src/main/library-lifecycle/asset-notebook.schema'
import {enableDownloadJournal} from '../src/main/managed-download/download-journal.schema'
import {enableIntakeRecoveryStorage} from '../src/main/library-lifecycle/intake-recovery.schema'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-storage-'))),source=path.join(root,'generated.png'),library=path.join(root,'library')
await sharp({create:{width:100,height:100,channels:3,background:'#eee'}}).png().toFile(source)
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}))
try{
 const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error();await host.confirmCreate(plan.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error();await host.dispatchAddAssets(intake.plan.receipt)
 const asset=(await host.listAssets())[0],a=host.inspect(),scope={libraryIdentity:a.identity!,generation:a.generation!,assetId:asset.id}
 const initial=await host.readOcr(scope);assert.equal(initial.requiresUpgrade,true);assert.equal(initial.evidence,null)
 const observation:OcrObservation={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:100,height:100,elapsedMs:1,threshold:.5,blocks:[]}
 const input:OcrCommit={...scope,sessionToken:initial.sessionToken,expectedRevision:0,allowUpgrade:false,evidence:{id:'ocr:empty',assetId:asset.id,assetRevision:asset.revision,sourceRef:asset.thumbnailRef,inputSha256:'d'.repeat(64),createdAt:new Date().toISOString(),observation}}
 await assert.rejects(host.commitOcr(input),/OCR_UPGRADE_REQUIRED/);assert.equal((await host.readOcr(scope)).requiresUpgrade,true)
 const abort=new AbortController();abort.abort();await assert.rejects(host.commitOcr({...input,allowUpgrade:true},abort.signal),/OCR_SCOPE_EXPIRED/)
 await host.updateAssetCaption(asset.id,'User description')
 const empty=await host.commitOcr({...input,allowUpgrade:true});assert.equal(empty.revision,1)
 await host.saveVisualAiEvidence({id:'vision:after-ocr',assetId:asset.id,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,inputSha256:'e'.repeat(64),backendId:'fixture',providerOrigin:'http://127.0.0.1',model:'synthetic',purpose:'analyze',inputScope:'controlled-preview-rgb',recipe:'visual-ai-v1',createdAt:new Date().toISOString(),output:{caption:'Do not replace user description',prompt:'A blank image',ocrText:'hallucinated-word',tags:[]}})
 let projected=(await host.listAssets())[0];assert.equal(projected.aiOcrText,'');assert.equal(projected.aiCaption,'User description');assert.equal(projectAssetDiscovery({assets:[projected],query:'hallucinated-word'}).matches.length,0)
 const recognized={...input,allowUpgrade:true,expectedRevision:1,evidence:{...input.evidence,id:'ocr:text',observation:{...observation,blocks:[{text:'Recognized reference',confidence:.95,polygon:[[0,0],[1,0],[1,1],[0,1]] as Array<[number,number]>}]}}}
 const text=await host.commitOcr(recognized)
 const corrected=await host.correctOcr({...scope,sessionToken:text.sessionToken,expectedRevision:text.revision,evidenceId:text.evidence!.id,text:'My corrected words'})
 await host.saveVisualAiEvidence({id:'vision:dedicated-ocr-only',assetId:asset.id,assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,inputSha256:'f'.repeat(64),backendId:'fixture',providerOrigin:'http://127.0.0.1',model:'synthetic',purpose:'analyze',inputScope:'controlled-preview-rgb',recipe:'visual-ai-v1',createdAt:new Date().toISOString(),output:{caption:'Another model description',prompt:'A geometric reference',ocrText:'',tags:['几何']}})
 const afterVision=(await host.listAssets())[0]
 assert.equal(afterVision.aiOcrText,'My corrected words');assert.equal(afterVision.aiCaption,'User description')
 assert.equal(projectAssetDiscovery({assets:[afterVision],query:'My corrected words'}).matches.length,1)
 await assert.rejects(host.correctOcr({...scope,sessionToken:text.sessionToken,expectedRevision:text.revision,evidenceId:text.evidence!.id,text:'stale overwrite'}),/OCR_RESULT_CONFLICT/)
 const rerun=await host.commitOcr({...recognized,expectedRevision:corrected.revision,evidence:{...recognized.evidence,id:'ocr:rerun'}})
 assert.equal(rerun.editedText,'My corrected words');assert.equal((await host.listAssets())[0].aiOcrText,'My corrected words')
 const reset=await host.correctOcr({...scope,sessionToken:rerun.sessionToken,expectedRevision:rerun.revision,evidenceId:rerun.evidence!.id,text:null});assert.equal(reset.editedText,null)
 await assert.rejects(host.commitOcr({...recognized,expectedRevision:reset.revision,evidence:{...recognized.evidence,id:'ocr:wrong-preview',sourceRef:'preview:other'}}),/OCR_SOURCE_CHANGED/)
 const db=new Database(path.join(library,'.dam','library.sqlite'));try{for(const enable of [enableVisualAiStorage,enableWorkSetStorage,enableOrganizationStorage,enableNotebookStorage,enableDownloadJournal,enableIntakeRecoveryStorage])enable(db);assert.equal(db.pragma('user_version',{simple:true}),8)}finally{db.close()}
 await host.close();await host.reopen();const reopened=await host.readOcr(scope);assert.equal(reopened.evidence?.id,'ocr:rerun');assert.notEqual(reopened.sessionToken,reset.sessionToken)
 await assert.rejects(host.correctOcr({...scope,sessionToken:reset.sessionToken,expectedRevision:reset.revision,evidenceId:reset.evidence!.id,text:'stale session'}),/OCR_SCOPE_EXPIRED/)
 let release:((value:OcrObservation)=>void)|undefined,entered=false,fingerprint='runtime:one'
 const controller=createOcrController({host,runtime:{configure:async()=>{},current:async()=>({label:'isolated fixture',fingerprint,run:async()=>{entered=true;return new Promise<OcrObservation>(resolve=>{release=resolve})}})},changed:()=>{}})
 const wait=async(done:()=>Promise<boolean>)=>{for(let i=0;i<100;i++){if(await done())return;await new Promise(r=>setTimeout(r,5))}throw Error('timed out')}
 const beforeCancel=(await host.readOcr(scope)).revision
 const cancelPlan=await controller.prepare({libraryIdentity:scope.libraryIdentity,generation:scope.generation,assetIds:[asset.id]})
 await controller.run(cancelPlan.receipt);await wait(async()=>entered);controller.cancel();release!(observation)
 await wait(async()=>(await controller.status()).job?.state==='cancelled');assert.equal((await host.readOcr(scope)).revision,beforeCancel)
 const changedPlan=await controller.prepare({libraryIdentity:scope.libraryIdentity,generation:scope.generation,assetIds:[asset.id]});fingerprint='runtime:two';await assert.rejects(controller.run(changedPlan.receipt),/OCR_MODEL_CHANGED/)
 const pendingPlan=await controller.prepare({libraryIdentity:scope.libraryIdentity,generation:scope.generation,assetIds:[asset.id]});controller.invalidate();await assert.rejects(controller.run(pendingPlan.receipt),/OCR_SCOPE_EXPIRED/)
 const trash=await host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:asset.revision});await host.dispatchTrash({kind:'confirm-plan',planReceipt:trash.plan.receipt});await assert.rejects(host.readOcr(scope),/OCR_ASSET_UNAVAILABLE/)
 const trashed=(await host.listTrash())[0];await host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:asset.id,expectedRevision:trashed.revision});assert.equal((await host.readOcr(scope)).evidence?.id,'ocr:rerun');assert.equal((await host.listAssets())[0].aiOcrText,'Recognized reference')
 await assert.rejects(host.commitOcr({...recognized,sessionToken:(await host.readOcr(scope)).sessionToken,expectedRevision:(await host.readOcr(scope)).revision,evidence:{...recognized.evidence,id:'ocr:stale-lifecycle'}}),/OCR_SOURCE_CHANGED/)
 console.log('OCR storage: explicit v8 upgrade, valid empty precedence, user correction protection, revision/session/source/trash boundaries and exact-schema reopen passed')
}finally{await host.close()}
