import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-bg-ocr-ui-'));let app
try{
 const result=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Panel from './src/renderer/components/asset/BackgroundOcrPanel';
 window.ticks=[];window.setInterval=fn=>{window.ticks.push(fn);return window.ticks.length};window.clearInterval=()=>{};
 window.ready=true;window.delay=false;window.reads=[];window.discarded=[];window.saved={schemaVersion:13,sessionToken:'one',permissionRevision:1,authorized:true,runtimeFingerprint:'synthetic',attempts:[],reasons:[],running:false};
 window.damClient={library:{inspect:async()=>({state:window.ready?'ready':'closed',identity:'library',generation:'generation'})},backgroundOcr:{read:async()=>{const value=structuredClone(window.saved);if(window.delay)return new Promise(resolve=>window.reads.push(()=>resolve({ok:true,value})));return{ok:true,value}},prepare:async()=>new Promise(resolve=>window.resolvePrepare=()=>resolve({ok:true,value:{receipt:'late',notice:'fixture'}})),confirm:async()=>({ok:false,error:'synthetic authorization failed'}),discard:async id=>{window.discarded.push(id);return{ok:true}},revoke:async()=>{window.saved.authorized=false;window.saved.permissionRevision++;return{ok:true,value:structuredClone(window.saved)}}}};
 createRoot(document.getElementById('root')).render(<Panel/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',platform:'browser',outfile:path.join(root,'bundle.js'),write:false,logLevel:'silent'})
 for(const output of result.outputFiles)await fs.writeFile(output.path,output.contents);await fs.writeFile(path.join(root,'index.html'),'<link rel="stylesheet" href="bundle.css"><div id="root"></div><script src="bundle.js"></script>');await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow}=require('electron');for(const n of ['userData','sessionData','logs','crashDumps'])app.setPath(n,${JSON.stringify(root)}+'/'+n);app.whenReady().then(()=>new BrowserWindow({width:700,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadFile(${JSON.stringify(path.join(root,'index.html'))}));app.on('window-all-closed',()=>app.quit());`)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)));app=await electron.launch({args:[path.join(root,'main.cjs')],env});const page=await app.firstWindow();page.setDefaultTimeout(5000);const reset=async()=>{await page.goto('file://'+path.join(root,'index.html'));await page.getByRole('button',{name:'核对后台 OCR 授权'}).waitFor()}
 await test('late authorization review after library close is discarded',async()=>{
  await reset();await page.getByRole('button',{name:'核对后台 OCR 授权'}).click();await page.waitForFunction(()=>Boolean(window.resolvePrepare));await page.evaluate(()=>{window.ready=false;window.ticks.at(-1)()});await page.getByText('请先打开资料库。',{exact:true}).waitFor();await page.evaluate(async()=>{window.resolvePrepare();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.deepEqual(await page.evaluate(()=>window.discarded),['late']);assert.equal(await page.getByRole('button',{name:'确认授权后台 OCR'}).count(),0)
 })
 await test('stale authorized poll cannot undo a completed revocation',async()=>{
  await reset();await page.evaluate(()=>{window.delay=true;window.ticks.at(-1)()});await page.waitForFunction(()=>window.reads.length===1);await page.getByRole('button',{name:'撤销后台 OCR 许可'}).click();await page.getByText('本次开库尚未授权',{exact:false}).waitFor();await page.evaluate(async()=>{window.reads[0]();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.equal(await page.getByText('本次开库已授权',{exact:false}).count(),0)
 })
 await test('confirmation failure remains visible after successful status refresh',async()=>{
  await reset();await page.getByRole('button',{name:'核对后台 OCR 授权'}).click();await page.waitForFunction(()=>Boolean(window.resolvePrepare));await page.evaluate(()=>window.resolvePrepare());await page.getByRole('button',{name:'确认授权后台 OCR'}).click();await page.getByRole('alert').filter({hasText:'synthetic authorization failed'}).waitFor();await page.evaluate(()=>window.ticks.at(-1)());assert.equal(await page.getByText('synthetic authorization failed',{exact:true}).count(),1)
 })
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
