// Controlled actual Renderer regression, not a physical mouse/drop acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-picture-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import WorkSetWindow from './src/renderer/routes/WorkSetWindow';
const snapshot={token:'native:fixture',scope:{libraryIdentity:'library:fixture',generation:'generation:fixture'},set:{id:'work-set:fixture',name:'Fixture native reference',revision:1,assetIds:['asset:alpha','asset:beta'],colors:[],columns:2,note:''},assets:['alpha','beta'].map(id=>({id:'asset:'+id,title:id,aiCaption:'Fixture caption',tags:[],fileType:'png'})),pinned:true,geometry:{x:0,y:0,width:420,height:640,pinned:true,open:true},theme:'light'};
const calls={handoffs:[],drags:[],actions:[]};
window.workWindowAPI={inspect:async()=>({success:true,value:snapshot}),onState:()=>()=>{},act:async value=>{calls.actions.push(value);return{success:true,value:snapshot}},notebookRead:async()=>({success:false,error:'Fixture notebook unavailable'}),notebookSave:async()=>({success:false,error:'NOT_USED'}),mediaRead:async()=>({success:false,error:'NOT_USED'}),mediaWrite:async()=>({success:false,error:'NOT_USED'}),mediaCancel:async()=>({success:true,value:null}),fileHandoff:async value=>{calls.handoffs.push(value);return{success:true,value:{id:'handoff:beta',fileName:'beta copy.png',bytes:128,sha256:'a'.repeat(64),kind:value.request.kind,status:'prepared',message:'Fixture copy prepared'}}},dragFile:async value=>{calls.drags.push(value);return{success:true,value:null}}};
window.nativeDraftsAPI={put:async()=>{},remove:async()=>{},ready:async()=>{},acknowledge:async()=>{},onFlush:()=>()=>{},onState:()=>()=>{}};
window.fixture={inspect:()=>structuredClone(calls)};createRoot(document.getElementById('root')).render(<WorkSetWindow/>);
`}})
await fs.writeFile(path.join(root,'reference.png'),await sharp({create:{width:8,height:8,channels:3,background:'#446688'}}).png().toBuffer())
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow,protocol,session}=require('electron'),fs=require('node:fs');protocol.registerSchemesAsPrivileged([{scheme:'dam-preview',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((r,done)=>done({cancel:!r.url.startsWith('file:')&&!r.url.startsWith('dam-preview:')}));protocol.handle('dam-preview',()=>new Response(fs.readFileSync(${JSON.stringify(path.join(root,'reference.png'))}),{headers:{'Content-Type':'image/png'}}));new BrowserWindow({show:false,width:1000,height:1100,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit())`)
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','ELECTRON_RENDERER_URL'].includes(k)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow();page.setDefaultTimeout(6000)
 const picture=()=>page.getByRole('button',{name:'查看参考 beta',exact:true})
 await picture().waitFor();assert.equal(await picture().getAttribute('draggable'),'true')
 assert.equal(await picture().locator('img').getAttribute('draggable'),'false','never emit private preview URI as default image drag')
 await picture().click();await page.getByRole('button',{name:'关闭专注模式',exact:true}).waitFor();assert.equal((await page.evaluate(()=>window.fixture.inspect())).actions.length,0,'picture preview stays within its native Renderer')
 await page.getByRole('button',{name:'关闭专注模式',exact:true}).click()
 const prevented=await picture().evaluate(el=>!el.dispatchEvent(new Event('dragstart',{bubbles:true,cancelable:true})))
 assert.equal(prevented,true);assert.equal((await page.evaluate(()=>window.fixture.inspect())).handoffs.length,0,'unprepared gesture does not silently copy')
 await page.getByRole('alert').filter({hasText:'请先为这张图片准备交付副本'}).waitFor()
 await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.getByText('Fixture copy prepared',{exact:true}).waitFor()
 await picture().dispatchEvent('dragstart');await page.waitForFunction(()=>window.fixture.inspect().drags.length===1)
 const result=await page.evaluate(()=>window.fixture.inspect());assert.equal(result.handoffs[0].request.assetId,'asset:beta');assert.deepEqual(result.drags[0],{token:'native:fixture',id:'handoff:beta'})
 await page.getByRole('combobox',{name:'交付内容',exact:true}).selectOption('preview');await picture().dispatchEvent('dragstart');assert.equal((await page.evaluate(()=>window.fixture.inspect())).drags.length,1,'variant changes retire stale image drag receipt')
 console.log('Actual native Renderer: local click preview, no preview-URI drag, unprepared gesture only reveals preparation, prepared second-member dispatch and stale variant rejection. Controlled bridge; physical OS drag separately verified.')
}finally{await app.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-picture-view-'));await fs.rm(root,{recursive:true,force:true})}
