// Controlled actual Renderer regression, not a physical mouse/drop acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-batch-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import WorkSetWindow from './src/renderer/routes/WorkSetWindow';
let snapshot={token:'native:fixture',scope:{libraryIdentity:'library:fixture',generation:'generation:fixture'},set:{id:'work-set:fixture',name:'Fixture native reference',revision:1,assetIds:['asset:alpha','asset:beta'],unavailableIds:[],colors:[],columns:2,note:''},assets:['alpha','beta'].map(id=>({id:'asset:'+id,title:id,revision:'one',thumbnailRef:'preview',aiCaption:'Fixture caption',tags:[],fileType:'png'})),pinned:true,geometry:{x:0,y:0,width:420,height:640,pinned:true,open:true},theme:'light'};
const calls={handoffs:[],drags:[],batches:[],actions:[]};let listener,delayed=false,failAsset='',waiting=[],sequence=0;
const receipt=value=>({success:true,value:{id:'handoff:'+ ++sequence,fileName:'copy.png',bytes:128,sha256:'a'.repeat(64),kind:value.request.kind,status:'prepared',message:'Fixture copy prepared'}});
window.workWindowAPI={inspect:async()=>({success:true,value:snapshot}),onState:fn=>{listener=fn;return()=>{}},act:async value=>{calls.actions.push(value);return{success:true,value:snapshot}},notebookRead:async()=>({success:false,error:'Fixture notebook unavailable'}),notebookSave:async()=>({success:false,error:'NOT_USED'}),mediaRead:async()=>({success:false,error:'NOT_USED'}),mediaWrite:async()=>({success:false,error:'NOT_USED'}),mediaCancel:async()=>({success:true,value:null}),fileHandoff:async value=>{calls.handoffs.push(value);if(delayed)return new Promise((resolve,reject)=>waiting.push({value,resolve,reject}));if(value.request.assetId===failAsset)return{success:false,error:'Fixture preparation rejected'};return receipt(value)},dragFile:async value=>{calls.drags.push(value);return{success:true,value:null}},dragFiles:async value=>{calls.batches.push(value);return{success:true,value:null}}};
window.nativeDraftsAPI={put:async()=>{},remove:async()=>{},ready:async()=>{},acknowledge:async()=>{},onFlush:()=>()=>{},onState:()=>()=>{}};
window.fixture={inspect:()=>structuredClone(calls),waiting:()=>waiting.length,mode:(delay,fail='')=>{delayed=delay;failAsset=fail},resolve:()=>{const next=waiting.shift();if(!next)throw Error('NO_PENDING');next.resolve(receipt(next.value))},reject:()=>{const next=waiting.shift();next.reject(Error('Fixture transport unknown'))},reset:()=>{if(waiting.length)throw Error('PENDING');calls.handoffs=[];calls.drags=[];calls.batches=[];calls.actions=[];delayed=false;failAsset='';snapshot={...snapshot,token:'native:'+ ++sequence,set:{...snapshot.set,assetIds:['asset:alpha','asset:beta'],revision:1}};listener(snapshot)},revoke:()=>{snapshot={...snapshot,set:{...snapshot.set,assetIds:['asset:beta'],revision:2}};listener(snapshot)},replace:()=>{snapshot={...snapshot,token:'native:'+ ++sequence};listener(snapshot)},unmount:()=>rendererRoot.unmount()};const rendererRoot=createRoot(document.getElementById('root'));rendererRoot.render(<WorkSetWindow/>);
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
 const reset=async()=>{await page.evaluate(()=>window.fixture.reset());await picture('alpha').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===0)}
 const ready=()=>page.locator('.work-handoff-item-state.ready')
 await picture('alpha').waitFor()
 await picture('alpha').press('Space');await page.getByRole('button',{name:'关闭专注模式',exact:true}).click()
 await picture('alpha').click({modifiers:['Meta']});await picture('beta').click({modifiers:['Shift']})
 assert.equal(await page.getByRole('checkbox',{name:'选择参考 alpha'}).isChecked(),true);assert.equal(await page.getByRole('checkbox',{name:'选择参考 beta'}).isChecked(),true)
 await page.getByRole('button',{name:'准备所选拖出',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===2)
 assert.deepEqual((await inspect()).handoffs.map(q=>q.request.assetId),['asset:alpha','asset:beta'])
 assert.equal(await page.getByText('原件副本已准备 · 可拖出',{exact:true}).count(),2,'readiness identifies the prepared Original copy for both members')
 await picture('beta').dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().batches.length===1)
 assert.equal((await inspect()).batches[0].ids.length,2)
 await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();assert.equal((await inspect()).handoffs.length,2,'repeated preparation reuses confirmed copies')
 await page.getByRole('button',{name:'拖出全部副本',exact:true}).dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().batches.length===2)
 await page.getByRole('button',{name:'清除选择',exact:true}).click();await picture('beta').dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===1)
 await page.getByRole('textbox',{name:'工作备注'}).focus();await page.getByRole('textbox',{name:'工作备注'}).press('Meta+a');assert.equal(await page.getByRole('checkbox',{name:'选择参考 alpha'}).isChecked(),false,'select-all in textarea preserves text editing')
 await picture('alpha').focus();await picture('alpha').press('Meta+a');assert.equal(await page.getByRole('checkbox',{name:'选择参考 beta'}).isChecked(),true)
 await reset();await page.evaluate(()=>window.fixture.mode(true))
 await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 assert.equal(await page.getByRole('button',{name:'准备全部拖出',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'交付 alpha',exact:true}).click();await page.getByRole('button',{name:'准备交付副本',exact:true}).click()
 assert.equal((await inspect()).handoffs.length,1,'single panel shares in-flight batch copy')
 await page.getByRole('button',{name:'停止后续准备',exact:true}).click();await page.getByText('正在等待当前副本结果；随后停止，已完成副本保留。',{exact:true}).waitFor()
 await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===1)
 await page.getByText('已停止后续准备：1份副本已完成。已完成副本保留。',{exact:true}).waitFor();assert.equal((await inspect()).handoffs.length,1)
 await page.getByRole('button',{name:'交付 alpha',exact:true}).click()
 await reset();await page.evaluate(()=>window.fixture.mode(false,'asset:alpha'))
 await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.getByText('Fixture preparation rejected',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===1)
 assert.equal(await page.getByRole('button',{name:'拖出全部副本',exact:true}).isDisabled(),true)
 await picture('beta').dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===1)
 await page.evaluate(()=>window.fixture.mode(false));await page.getByRole('checkbox',{name:'选择参考 alpha'}).check();await page.getByRole('button',{name:'准备所选拖出',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===2)
 assert.equal((await inspect()).handoffs.length,3,'known failure retries only failed item')
 await reset();await page.evaluate(()=>window.fixture.mode(true));await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 await page.evaluate(()=>window.fixture.revoke());await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>window.fixture.waiting()===1)
 assert.equal(await ready().count(),0,'revoked member receives no ready state')
 await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>document.querySelectorAll('.work-handoff-item-state.ready').length===1)
 await reset();await page.evaluate(()=>window.fixture.mode(true));await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 await page.evaluate(()=>window.fixture.replace());await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>!document.querySelector('.work-handoff-toolbar button')?.disabled)
 assert.equal(await ready().count(),0,'old-token result is never adopted');assert.equal((await inspect()).handoffs.length,1,'token replacement stops later copies')
 await reset();await page.evaluate(()=>window.fixture.mode(true));await page.getByRole('checkbox',{name:'选择参考 alpha'}).check();await page.getByRole('button',{name:'准备所选拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1);await page.evaluate(()=>window.fixture.reject());await page.getByText('交付结果尚未确认；请核对保留记录，暂不重复创建。',{exact:true}).waitFor()
 await page.getByRole('button',{name:'准备所选拖出',exact:true}).click();assert.equal((await inspect()).handoffs.length,1,'unknown transport outcome is not replayed into another copy')
 await reset();await page.evaluate(()=>window.fixture.mode(true));await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 await page.evaluate(()=>window.fixture.unmount());await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>window.fixture.waiting()===0);assert.equal((await inspect()).handoffs.length,1,'unmount stops all later preparation');assert.equal(await page.locator('.native-work-surface').count(),0)
 console.log('Actual React batch Renderer: explicit sequence/cache, Space preview, Cmd/Shift/checkbox/select-all, single and multi drag, visible item failure/retry, stop keeps completed, shared in-flight request, revocation/token/unmount races and unknown-result no replay. Controlled bridge; physical drop separate.')

}finally{await app.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-batch-view-'));await fs.rm(root,{recursive:true,force:true})}
