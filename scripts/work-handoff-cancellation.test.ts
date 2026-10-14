import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {randomBytes,createHash} from 'node:crypto'
import sharp from 'sharp'
import archiver from 'archiver'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {createWorkFileHandoffs} from '../src/main/work-mode/work-file-handoff'
import {createWorkMediaController} from '../src/main/work-mode/work-media-controller'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import type {WorkHandoffRequest} from '../src/shared/contracts/work-media.contract'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-handoff-cancel-'))),library=path.join(root,'library'),sources=[path.join(root,'first.png'),path.join(root,'second.png')]
for(const file of sources)await sharp(randomBytes(1024*1024*3),{raw:{width:1024,height:1024,channels:3}}).png().toFile(file)
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),sourceBytes=await Promise.all(sources.map(file=>fs.readFile(file)))
const host=createActiveLibraryHost(createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:sources.map(filePath=>({filePath}))})}))
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done});return{promise,resolve}}
const until=async(check:()=>boolean)=>{const end=Date.now()+10000;while(!check()){if(Date.now()>end)throw Error('CANCEL_TEST_BARRIER_TIMEOUT');await new Promise<void>(resolve=>setImmediate(resolve))}}
const watch=<T>(p:Promise<T>)=>p.then(value=>({status:'fulfilled' as const,value}),reason=>({status:'rejected' as const,reason}))
try{
 const creation=await host.prepareCreate();if(creation.kind!=='planned')throw Error('CREATE');await host.confirmCreate(creation.plan.receipt)
 const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('INTAKE');await host.dispatchAddAssets(intake.plan.receipt)
 const assets=await host.listAssets(),ids=sources.map(file=>assets.find(a=>a.fileName===path.basename(file))!.id),current=host.inspect(),scope={libraryIdentity:current.identity!,generation:current.generation!},device='device:cancel-test'
 const catalog=await host.readWorkSets(scope,device),set=(await host.writeWorkSet({...scope,sessionToken:catalog.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Cancellation public fixtures',assetIds:ids,columns:2,}}},device)).sets[0]
 const original=(assetId=ids[0]):WorkHandoffRequest=>({...scope,setId:set.id,assetId,kind:'original',action:'prepare'}),zip:WorkHandoffRequest={...scope,setId:set.id,assetId:ids[0],assetIds:ids,kind:'zip',action:'prepare'}
 const admission=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3})}),handoffRoot=path.join(root,'copies');let opens=0
 const options={host,admission,root:handoffRoot,open:async()=>{opens++;return ''},trash:async()=>{throw Error('NOT_USED')}}
 const finishedFiles=createWorkFileHandoffs(options),completed=await finishedFiles.prepare('completed',original());await finishedFiles.cancel('completed')
 assert.deepEqual(Buffer.from((await finishedFiles.readFile(completed.id)).bytes),sourceBytes[0]);assert.equal(finishedFiles.hasActive('completed'),false)
 // Current and queued jobs are registered at arrival. Cancel cannot release the
 // running Host read or another actor's job before their actual promises settle.
 const entered=deferred(),release=deferred();let gated=false,previewReads=0
 const heldHost={...host,readWorkMediaFile:async(input:Parameters<typeof host.readWorkMediaFile>[0])=>{if(!gated){gated=true;entered.resolve();await release.promise}return host.readWorkMediaFile(input)},readPreview:async(id:string)=>{previewReads++;return host.readPreview(id)}}
 const files=createWorkFileHandoffs({...options,host:heldHost})
 const running=watch(files.prepare('owner',original())),queued=watch(files.prepare('owner',{...original(),kind:'preview'})),foreign=watch(files.prepare('foreign',original(ids[1])))
 assert.equal(files.hasActive('owner'),true);assert.equal(files.hasActive('foreign'),true);await entered.promise
 let cancellationReturned=false;const cancelling=files.cancel('owner').then(value=>{cancellationReturned=true;return value})
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(cancellationReturned,false);assert.equal(files.hasActive('owner'),true);assert.equal(admission.resourceStatus().materialBytes,512*1024**2)
 release.resolve();const [runningReply,queuedReply,foreignReply]=await Promise.all([running,queued,foreign]);await cancelling
 assert.equal(runningReply.status,'rejected');if(runningReply.status==='rejected')assert.equal(runningReply.reason.code,'WORK_HANDOFF_CANCELLED')
 assert.equal(queuedReply.status,'rejected');if(queuedReply.status==='rejected')assert.equal(queuedReply.reason.code,'WORK_HANDOFF_CANCELLED')
 assert.equal(foreignReply.status,'fulfilled');assert.equal(previewReads,0,'cancelled queued preview must not execute');assert.equal(files.hasActive('owner'),false)
 assert.equal(admission.resourceStatus().materialBytes,0)
 // Actual Governor waiter is cancelled with its same signal, leaving the
 // independently owned blocking permit intact.
 const quiet=createVisualAdmission({memory:()=>({free:8*1024**3,total:16*1024**3}),policy:{mode:'quiet',reserveFraction:0.1}})
 const blocker=await quiet.reserveLocalWork('media',512*1024**2,new AbortController().signal),waitingFiles=createWorkFileHandoffs({...options,admission:quiet})
 const waiting=watch(waitingFiles.prepare('waiting',original()));await until(()=>quiet.inspect().waiting===1);assert.equal(waitingFiles.hasActive('waiting'),true)
 await waitingFiles.cancel('waiting');const waitingReply=await waiting;assert.equal(waitingReply.status,'rejected');if(waitingReply.status==='rejected')assert.equal(waitingReply.reason.code,'WORK_HANDOFF_CANCELLED')
 assert.equal(quiet.inspect().waiting,0);assert.equal(quiet.resourceStatus().materialBytes,512*1024**2);blocker.release();assert.equal(quiet.resourceStatus().materialBytes,0)
 // Observe, do not fake, the actual archiver instance supplied to production.
 const factory=archiver as unknown as {create:(...args:any[])=>any},realCreate=factory.create,started=deferred();let streamClosed=false,streamFinished=false,heldAtClose=0,activeAtClose=false,instances=0
 const zipFiles=createWorkFileHandoffs(options)
 factory.create=(...args:any[])=>{const stream=realCreate(...args);instances++;stream.once('data',()=>started.resolve());stream.once('finish',()=>{streamFinished=true});stream.once('close',()=>{streamClosed=true;heldAtClose=admission.resourceStatus().materialBytes;activeAtClose=zipFiles.hasActive('zip-owner')});return stream}
 try{
  const zipRunning=watch(zipFiles.prepare('zip-owner',zip)),zipQueued=watch(zipFiles.prepare('zip-owner',zip));await started.promise
  const zipCancellation=zipFiles.cancel('zip-owner');assert.equal(zipFiles.hasActive('zip-owner'),true);assert.equal(admission.resourceStatus().materialBytes,512*1024**2)
  const [activeReply,pendingReply]=await Promise.all([zipRunning,zipQueued]);await zipCancellation
  for(const reply of [activeReply,pendingReply]){assert.equal(reply.status,'rejected');if(reply.status==='rejected')assert.equal(reply.reason.code,'WORK_HANDOFF_CANCELLED')}
  assert.equal(instances,1);assert.equal(streamFinished,true);assert.equal(streamClosed,true);assert.equal(heldAtClose,512*1024**2);assert.equal(activeAtClose,true);assert.equal(zipFiles.hasActive('zip-owner'),false);assert.equal(admission.resourceStatus().materialBytes,0)
 }finally{factory.create=realCreate}
 // Sharp has no owned ChildProcess. Cancellation waits the actual completion
 // Promise, including this explicit reply-delay barrier, before permit release.
 const sharpProto=sharp.prototype as any,realToBuffer=sharpProto.toBuffer,sharpStarted=deferred(),sharpRelease=deferred();let intercepted=false
 const imageFiles=createWorkFileHandoffs(options)
 sharpProto.toBuffer=function(...args:any[]){const answer=realToBuffer.apply(this,args);if(intercepted)return answer;intercepted=true;sharpStarted.resolve();return answer.then(async(value:any)=>{await sharpRelease.promise;return value})}
 try{
  const image=watch(imageFiles.prepare('image-owner',{...original(),kind:'processed-image',imageTransform:{format:'webp',quality:85,stripMetadata:true}}));await sharpStarted.promise
  let cancelDone=false;const cancelImage=imageFiles.cancel('image-owner').then(()=>{cancelDone=true});await new Promise<void>(resolve=>setImmediate(resolve))
  assert.equal(cancelDone,false);assert.equal(imageFiles.hasActive('image-owner'),true);assert.equal(admission.resourceStatus().materialBytes,512*1024**2)
  sharpRelease.resolve();const imageReply=await image;await cancelImage;assert.equal(imageReply.status,'rejected');if(imageReply.status==='rejected')assert.equal(imageReply.reason.code,'WORK_HANDOFF_CANCELLED')
 }finally{sharpProto.toBuffer=realToBuffer}
 // Cancel during real owned partial write removes only that call's incomplete
 // material; a cancellation after the final receipt fsync/close keeps success.
 const realOpen=fs.open,baseline=(await fs.readdir(handoffRoot)).sort(),partialFiles=createWorkFileHandoffs(options);let partialCancel:Promise<unknown>|undefined,partialFired=false
 fs.open=(async(...args:any[])=>{const handle=await(realOpen as any)(...args);if(!partialFired&&String(args[0]).startsWith(handoffRoot+path.sep)&&String(args[0]).endsWith('原件副本.png')&&args[1]==='wx'){partialFired=true;return new Proxy(handle,{get(target,key){if(key==='writeFile')return async(value:Uint8Array)=>{await target.writeFile(value.subarray(0,16));partialCancel=partialFiles.cancel('partial-owner')};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}})}return handle})as typeof fs.open
 try{const partial=await watch(partialFiles.prepare('partial-owner',{...original(),action:'open'}));await partialCancel;assert.equal(partial.status,'rejected');if(partial.status==='rejected'){assert.equal(partial.reason.code,'WORK_HANDOFF_CANCELLED');assert.match(partial.reason.message,/已回收本次不完整/)}assert.deepEqual((await fs.readdir(handoffRoot)).sort(),baseline)}finally{fs.open=realOpen}
 const lateFiles=createWorkFileHandoffs(options);let lateCancel:Promise<unknown>|undefined,lateFired=false
 fs.open=(async(...args:any[])=>{const handle=await(realOpen as any)(...args);if(!lateFired&&String(args[0]).startsWith(handoffRoot+path.sep)&&path.basename(String(args[0]))==='receipt.json'&&args[1]==='wx'){lateFired=true;return new Proxy(handle,{get(target,key){if(key==='close')return async()=>{await target.close();lateCancel=lateFiles.cancel('late-owner')};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}})}return handle})as typeof fs.open
 try{const late=await lateFiles.prepare('late-owner',{...original(),action:'open'});await lateCancel;assert.equal(late.status,'prepared');assert.match(late.message,/副本已完成.*未自动打开/);assert.deepEqual(Buffer.from((await lateFiles.readFile(late.id)).bytes),sourceBytes[0]);assert.equal((await fs.readdir(handoffRoot)).length,baseline.length+1)}finally{fs.open=realOpen}
 assert.equal(opens,0)
 // Formal media cancellation bridges to files and waits the held Host Promise.
 const mediaStarted=deferred(),mediaRelease=deferred();let mediaGated=false
 const mediaHost={...host,readWorkMediaFile:async(input:Parameters<typeof host.readWorkMediaFile>[0])=>{if(!mediaGated){mediaGated=true;mediaStarted.resolve();await mediaRelease.promise}return host.readWorkMediaFile(input)}}
 const mediaFiles=createWorkFileHandoffs({...options,host:mediaHost}),media=createWorkMediaController({host:mediaHost,files:mediaFiles,changed(){}})
 const mediaHandoff=media.handoff('media-owner',original());await mediaStarted.promise;let mediaCancelDone=false;const mediaCancelled=media.cancel('media-owner',{}).then(result=>{mediaCancelDone=true;return result})
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(mediaCancelDone,false);assert.equal(media.hasActive('media-owner'),true);mediaRelease.resolve()
 const reply=await mediaHandoff;assert.equal(reply.success,false);if(!reply.success)assert.equal(reply.code,'WORK_HANDOFF_CANCELLED');assert.equal((await mediaCancelled).success,true);assert.equal(media.hasActive('media-owner'),false)
 // Owned video-write controller lifecycle: defer a real Host call, not a fake
 // successful video response. This PNG source is correctly rejected by Host.
 const mediaStatus=await host.workMediaStatus(scope);await host.enableWorkMedia({...scope,...mediaStatus,allowUpgrade:true,expectedSchemaVersion:mediaStatus.schemaVersion})
 const writeEntered=deferred(),writeRelease=deferred();let observedVideoSignal:AbortSignal|undefined
 const writeHost={...host,writeWorkMedia:async(input:Parameters<typeof host.writeWorkMedia>[0],signal?:AbortSignal)=>{observedVideoSignal=signal;writeEntered.resolve();await writeRelease.promise;return host.writeWorkMedia(input,signal)}}
 const videoMedia=createWorkMediaController({host:writeHost,files:finishedFiles,changed(){}}),snapshot=await host.readWorkMedia({...scope,setId:set.id,assetId:ids[0]})
 const write=videoMedia.write('video-owner',{...scope,setId:set.id,assetId:ids[0],sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision,command:{kind:'capture',requestId:'capture:owned-cancel-test',requestedTicks:0}})
 await writeEntered.promise;let revokeFinished=false;const revoked=videoMedia.revoke('video-owner').then(()=>{revokeFinished=true})
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(observedVideoSignal?.aborted,true);assert.equal(revokeFinished,false);assert.equal(videoMedia.hasActive('video-owner'),true)
 writeRelease.resolve();assert.equal((await write).success,false);await revoked;assert.equal(videoMedia.hasActive('video-owner'),false)
 for(const[index,file]of sources.entries())assert.equal(sha(await fs.readFile(file)),sha(sourceBytes[index]));assert.deepEqual(Buffer.from((await finishedFiles.readFile(completed.id)).bytes),sourceBytes[0]);assert.equal(admission.resourceStatus().materialBytes,0);assert.equal(admission.inspect().requests,0)
 console.log('PASS: production Copy/Host/SQLite current and queued actor cancellation; foreign owner retained; actual Governor waiter cancellation; actual ZIP finish/close before material permit/job release; Sharp completion barrier; owned partial rollback; late completed copy retained with no auto-open; formal media cancellation/revoke joins file/write job; originals/completed copies preserved. Observer/gates are explicit internal lifecycle regressions, not GUI or ChildProcess evidence; the real Host rejects the PNG video-write fixture.')
}finally{await host.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-handoff-cancel-'));await fs.rm(root,{recursive:true,force:true})}
