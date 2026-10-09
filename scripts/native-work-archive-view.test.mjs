// Controlled actual Renderer regression, not a physical mouse/drop acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-archive-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import WorkSetWindow from './src/renderer/routes/WorkSetWindow';
let snapshot={token:'native:archive-fixture',scope:{libraryIdentity:'library:fixture',generation:'generation:fixture'},set:{id:'work-set:fixture',name:'Fixture native reference',revision:1,assetIds:['asset:alpha','asset:beta'],unavailableIds:[],colors:[],columns:2,note:''},assets:['alpha','beta'].map(id=>({id:'asset:'+id,title:id,revision:'one',thumbnailRef:'fixture',aiCaption:'Fixture caption',tags:[],fileType:'png'})),pinned:true,geometry:{x:0,y:0,width:420,height:640,pinned:true,open:true},theme:'light'};
const calls={handoffs:[],drags:[],cancels:[],actions:[]};let listener,delayed=false,waiting=[],cancelWaiting=[],sequence=0;
const receipt=value=>{const zip=value.request.kind==='zip',id='handoff:'+ ++sequence;return{success:true,value:{id,fileName:zip?'fixture-'+sequence+'.zip':'image-copy.png',bytes:128,sha256:'a'.repeat(64),kind:value.request.kind,status:'prepared',message:zip?'Controlled ZIP prepared; source originals preserved':'Controlled image prepared',...(zip?{archive:{count:value.request.assetIds.length,items:value.request.assetIds.map(id=>({fileName:id.slice(6)+'.png',bytes:64,sha256:'a'.repeat(64)}))}}:{})}}};
window.workWindowAPI={inspect:async()=>({success:true,value:snapshot}),onState:fn=>{listener=fn;return()=>{}},act:async value=>{calls.actions.push(value);return{success:true,value:snapshot}},notebookRead:async()=>({success:false,error:'Fixture notebook unavailable'}),notebookSave:async()=>({success:false,error:'NOT_USED'}),mediaRead:async()=>({success:false,error:'NOT_USED'}),mediaWrite:async()=>({success:false,error:'NOT_USED'}),mediaCancel:async value=>{calls.cancels.push(value);return new Promise(resolve=>cancelWaiting.push(resolve))},fileHandoff:async value=>{calls.handoffs.push(value);if(delayed&&value.request.kind==='zip')return new Promise((resolve,reject)=>waiting.push({value,resolve,reject}));return receipt(value)},dragFile:async value=>{calls.drags.push(value);return{success:true,value:{message:'已开始原生文件交接；请在接收应用中核对结果。'}}},dragFiles:async()=>({success:false,error:'NOT_USED'})};
window.nativeDraftsAPI={put:async()=>{},remove:async()=>{},ready:async()=>{},acknowledge:async()=>{},onFlush:()=>()=>{},onState:()=>()=>{}};
window.fixture={inspect:()=>structuredClone(calls),waiting:()=>waiting.length,delay:value=>{delayed=value},resolve:()=>{const next=waiting.shift();if(!next)throw Error('NO_PENDING');next.resolve(receipt(next.value))},reject:()=>{const next=waiting.shift();next.reject(Error('Controlled transport unknown'))},resolveCancel:message=>{const next=cancelWaiting.shift();if(!next)throw Error('NO_CANCEL_PENDING');next({success:true,value:{message}})},sourceChange:()=>{snapshot={...snapshot,assets:snapshot.assets.map(a=>({...a,revision:a.revision+'-next'}))};listener(snapshot)},newToken:()=>{snapshot={...snapshot,token:'native:archive-'+ ++sequence};listener(snapshot)},unmount:()=>rendererRoot.unmount()};const rendererRoot=createRoot(document.getElementById('root'));rendererRoot.render(<WorkSetWindow/>);
`}})
await fs.writeFile(path.join(root,'reference.png'),await sharp({create:{width:8,height:8,channels:3,background:'#446688'}}).png().toBuffer())
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow,protocol,session}=require('electron'),fs=require('node:fs');protocol.registerSchemesAsPrivileged([{scheme:'dam-preview',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((r,done)=>done({cancel:!r.url.startsWith('file:')&&!r.url.startsWith('dam-preview:')}));protocol.handle('dam-preview',()=>new Response(fs.readFileSync(${JSON.stringify(path.join(root,'reference.png'))}),{headers:{'Content-Type':'image/png'}}));new BrowserWindow({show:false,width:1000,height:1100,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit())`)
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','ELECTRON_RENDERER_URL'].includes(k)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow();page.setDefaultTimeout(6000)
 const picture=id=>page.getByRole('button',{name:'查看参考 '+id,exact:true})
 const inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const zipRequests=async()=>(await inspect()).handoffs.filter(q=>q.request.kind==='zip')
 const zipPrepare=()=>page.getByRole('button',{name:'准备 ZIP 归档',exact:true})
 const zipDrag=()=>page.getByRole('button',{name:'拖动 ZIP 到接收应用',exact:true})
 const close=()=>page.getByRole('button',{name:'关闭工作窗口 Fixture native reference',exact:true})
 await picture('alpha').waitFor();await page.getByRole('button',{name:'交付 beta',exact:true}).click();await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.getByText('原件副本已准备 · 可拖出',{exact:true}).waitFor()
 await picture('beta').dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===1);const imageDrag=(await inspect()).drags[0]
 await page.getByText('按参考顺序归档 2 份原件副本。未加密；原件保持。每批最多64份，输入及输出各不超过96 MiB。',{exact:true}).waitFor()
 await zipPrepare().click();await zipDrag().waitFor();const firstZip=(await zipRequests())[0]
 assert.deepEqual(firstZip,{token:'native:archive-fixture',request:{libraryIdentity:'library:fixture',generation:'generation:fixture',setId:'work-set:fixture',assetId:'asset:alpha',assetIds:['asset:alpha','asset:beta'],kind:'zip',action:'prepare'}})
 assert.equal(new Set(firstZip.request.assetIds).size,firstZip.request.assetIds.length)
 await zipDrag().dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===2);const zipId=(await inspect()).drags[1].id;assert.notEqual(zipId,imageDrag.id);assert.equal((await inspect()).drags[1].token,'native:archive-fixture')
 await zipPrepare().click();assert.equal((await zipRequests()).length,1,'same ordered targets reuse their confirmed archive')
 await picture('beta').dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===3);assert.deepEqual((await inspect()).drags[2],imageDrag,'archive never replaces member-image drag receipt')
 await page.getByRole('checkbox',{name:'选择参考 beta',exact:true}).check();assert.equal(await zipDrag().count(),0);await zipPrepare().click();await zipDrag().waitFor();assert.deepEqual((await zipRequests())[1].request.assetIds,['asset:beta']);assert.equal((await zipRequests())[1].request.assetId,'asset:beta')
 await zipDrag().dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===4);assert.notEqual((await inspect()).drags[3].id,zipId,'different target list receives its own archive')
 await page.getByRole('checkbox',{name:'选择参考 beta',exact:true}).uncheck();await zipDrag().waitFor();await zipDrag().dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===5);assert.equal((await inspect()).drags[4].id,zipId);assert.equal((await zipRequests()).length,2)
 // Cancel confirmation never releases busy until the original preparation returns.
 await page.evaluate(()=>window.fixture.sourceChange());await page.evaluate(()=>window.fixture.delay(true));await zipPrepare().click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 assert.equal(await close().isDisabled(),true);assert.equal(await page.getByRole('button',{name:'左侧停靠',exact:true}).isDisabled(),true)
 const pendingPrepare=page.getByRole('button',{name:'正在准备 ZIP…',exact:true});assert.equal(await pendingPrepare.isDisabled(),true);await pendingPrepare.dispatchEvent('click');assert.equal((await zipRequests()).length,3,'no repeated parallel ZIP request')
 await page.getByRole('button',{name:'取消 ZIP 准备',exact:true}).click();await page.getByRole('button',{name:'正在确认取消…',exact:true}).waitFor();assert.deepEqual((await inspect()).cancels[0],{token:'native:archive-fixture'})
 await page.getByRole('button',{name:'正在确认取消…',exact:true}).dispatchEvent('click');assert.equal((await inspect()).cancels.length,1)
 await page.evaluate(()=>window.fixture.resolveCancel('Controlled cancellation response received'));assert.equal(await close().isDisabled(),true,'cancel response alone is not preparation completion');assert.equal(await pendingPrepare.isDisabled(),true)
 await page.evaluate(()=>window.fixture.resolve());await zipDrag().waitFor();assert.equal(await close().isDisabled(),false)
 // Unknown transport stops replay; a source fingerprint change retires late old results.
 await page.evaluate(()=>window.fixture.sourceChange());await zipPrepare().click();await page.waitForFunction(()=>window.fixture.waiting()===1);await page.evaluate(()=>window.fixture.reject());await page.getByRole('alert').filter({hasText:'归档结果未确认'}).waitFor()
 assert.equal(await zipPrepare().isDisabled(),true);await zipPrepare().dispatchEvent('click');assert.equal((await zipRequests()).length,4,'unknown result never automatically creates another archive')
 await page.evaluate(()=>window.fixture.sourceChange());await zipPrepare().click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 await page.evaluate(()=>window.fixture.sourceChange());assert.equal(await close().isDisabled(),true,'key change keeps ownership while original action is in flight')
 await page.evaluate(()=>window.fixture.resolve());await zipPrepare().waitFor();assert.equal(await zipDrag().count(),0,'old-key receipt does not appear on new source fingerprint');assert.equal(await close().isDisabled(),false)
 await page.evaluate(()=>window.fixture.delay(false));await zipPrepare().click();await zipDrag().waitFor();assert.equal((await zipRequests()).length,6)
 await page.evaluate(()=>window.fixture.newToken());await zipPrepare().waitFor();assert.equal(await zipDrag().count(),0);await zipPrepare().click();await zipDrag().waitFor();await zipDrag().dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===6)
 assert.match((await inspect()).drags[5].token,/^native:archive-/)
 console.log('Actual native archive React: ordered unique members and anchor/token, visible unencrypted96MiB/64 budget, same-target cache/different-target isolation, independent member-image receipt, original ZIP drag id, no parallel request, busy through cancel response until final preparation, unknown no replay, source-key late receipt retirement and fresh-token scope. Controlled bridge; stream/OS qualification separate.')

}finally{await (await app.firstWindow()).evaluate(()=>window.fixture.unmount()).catch(()=>{});await app.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-archive-view-'));await fs.rm(root,{recursive:true,force:true})}
