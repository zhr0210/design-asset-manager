import path from 'node:path'
import {createActiveLibraryHost} from '../../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../../src/main/library-lifecycle/production-active-library-dependencies'
const [root,cut]=process.argv.slice(2)
if(!path.basename(root).startsWith('dam-bg-ocr-')||!['before-claim','after-claim','after-sent','after-commit'].includes(cut))throw Error('Invalid fixture')
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:path.join(root,'library')})}))
await host.open();const s=host.inspect(),scope={libraryIdentity:s.identity!,generation:s.generation!},view=await host.readBackgroundOcr(scope)
await host.configureBackgroundOcr({...scope,sessionToken:view.sessionToken,expectedRevision:view.permissionRevision,expectedSchemaVersion:13,allowUpgrade:false,enabled:true,runtimeFingerprint:'synthetic-runtime'})
const marker=()=>{process.stdout.write(JSON.stringify({cut,ready:true})+'\n');setInterval(()=>{},1000)}
if(cut==='before-claim')marker()
else{
 const claim=(await host.claimBackgroundOcr({...scope,sessionToken:view.sessionToken,runtimeFingerprint:'synthetic-runtime'}))!
 if(cut==='after-claim')marker()
 else{await host.markBackgroundOcrSent(claim);if(cut==='after-sent')marker()
 else{const asset=(await host.listAssets()).find(a=>a.id===claim.assetId)!,ocr=await host.readOcr({...scope,assetId:asset.id});await host.commitBackgroundOcr({claim,ocr:{...scope,assetId:asset.id,sessionToken:ocr.sessionToken,expectedRevision:ocr.revision,allowUpgrade:false,evidence:{id:'ocr:'+claim.attemptId,assetId:asset.id,assetRevision:asset.revision,sourceRef:asset.thumbnailRef,inputSha256:'d'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}}}});marker()}}
}
