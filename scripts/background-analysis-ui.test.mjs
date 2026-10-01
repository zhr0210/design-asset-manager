import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-background-ui-'));let app
try{
 const result=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Panel from './src/renderer/components/asset/BackgroundAnalysisPanel';
 window.ticks=[];window.setInterval=fn=>{window.ticks.push(fn);return window.ticks.length};window.clearInterval=()=>{};
 window.ready=true;window.delay=false;window.reads=[];window.discarded=[];window.saved={schemaVersion:12,sessionToken:'one',policy:{enabled:true,capabilities:{tags:true,caption:true,ocr:true},revision:1},intents:[{id:'intent',capability:'tags',revision:1,state:'waiting'}],counts:[],dispatchAvailable:false,canConfigure:true,resourceReasons:['automatic-executor-not-integrated'],availableMemoryMiB:null};
 window.electronAPI={library:{inspect:async()=>({state:window.ready?'ready':'closed',identity:'library',generation:'generation'})},backgroundAnalysis:{read:async()=>{const value=structuredClone(window.saved);if(window.delay)return new Promise(resolve=>window.reads.push(()=>resolve({ok:true,value})));return{ok:true,value}},prepare:async()=>new Promise(resolve=>window.resolvePrepare=()=>resolve({ok:true,value:{receipt:'late',notice:'fixture'}})),discard:async id=>{window.discarded.push(id);return{ok:true}},change:async()=>{window.saved.intents[0]={...window.saved.intents[0],revision:2,state:'user-paused'};return{ok:true,value:structuredClone(window.saved)}}}};
 const asset=new URLSearchParams(location.search).has('asset');createRoot(document.getElementById('root')).render(<Panel {...(asset?{scope:{libraryIdentity:'library',generation:'generation'},assetId:'a'}:{})}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',platform:'browser',outfile:path.join(root,'bundle.js'),write:false,logLevel:'silent'})
 for(const output of result.outputFiles)await fs.writeFile(output.path,output.contents);await fs.writeFile(path.join(root,'index.html'),'<link rel="stylesheet" href="bundle.css"><div id="root"></div><script src="bundle.js"></script>');await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow}=require('electron');for(const n of ['userData','sessionData','logs','crashDumps'])app.setPath(n,${JSON.stringify(root)}+'/'+n);app.whenReady().then(()=>new BrowserWindow({width:700,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadFile(${JSON.stringify(path.join(root,'index.html'))}));app.on('window-all-closed',()=>app.quit());`)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)));app=await electron.launch({args:[path.join(root,'main.cjs')],env});const page=await app.firstWindow();page.setDefaultTimeout(5000)
 await test('stale poll cannot undo a successful user pause',async()=>{
  await page.goto('file://'+path.join(root,'index.html')+'?asset');await page.getByRole('button',{name:'暂停标签计划'}).waitFor();await page.evaluate(()=>{window.delay=true;window.ticks.at(-1)()});await page.waitForFunction(()=>window.reads.length===1);await page.getByRole('button',{name:'暂停标签计划'}).click();await page.getByText('标签 · 已手动暂停',{exact:true}).waitFor()
  await page.evaluate(async()=>{window.reads[0]();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.equal(await page.getByText('标签 · 已手动暂停',{exact:true}).count(),1)
 })
 await test('nonready library revokes a pending policy review and discards its late receipt',async()=>{
  await page.goto('file://'+path.join(root,'index.html'));await page.getByRole('button',{name:'保存新素材计划设置'}).click();await page.waitForFunction(()=>Boolean(window.resolvePrepare));await page.evaluate(()=>{window.ready=false;window.ticks.at(-1)()});await page.getByText('请先打开资料库。',{exact:true}).waitFor()
  await page.evaluate(async()=>{window.resolvePrepare();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.deepEqual(await page.evaluate(()=>window.discarded),['late'])
 })
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
