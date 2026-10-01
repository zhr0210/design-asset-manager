import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {_electron as electron} from 'playwright'
import {build} from 'esbuild'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-intent-ui-'));let app
try{
 const bundle=await build({stdin:{contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import Panel from './src/renderer/components/asset/IndependentTagIntentPanel';
 window.intents=[];window.executions=[];window.discarded=[];window.runs=[];
 window.independentTagsAPI={read:async input=>({ok:true,value:{requests:[{requestId:'request:'+input.assetId,sourceMatches:true,state:'waiting-execution',model:'fixture-model'}]}}),prepare:input=>new Promise(resolve=>window.intents.push({input,resolve})),confirm:async()=>({ok:true,value:{}})};
 window.tagExecutionAPI={onChanged:()=>()=>{},read:async()=>({ok:true,value:{schemaVersion:9,current:null,jobs:[]}}),prepare:input=>new Promise(resolve=>window.executions.push({input,resolve})),discardReview:async id=>{window.discarded.push(id);return{ok:true}},run:async id=>{window.runs.push(id);return{ok:true,value:{id:'never',state:'queued'}}}};
 function App(){const[id,setId]=useState('a'),[shown,setShown]=useState(true);return <><button onClick={()=>setId(id==='a'?'b':'a')}>切换素材</button><button onClick={()=>setShown(!shown)}>卸载面板</button>{shown&&<Panel scope={{libraryIdentity:'generated',generation:'one'}} assetId={id} backendId="synthetic" model="fixture-model"/>}</>};createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'silent'})
 await fs.writeFile(path.join(root,'bundle.js'),bundle.outputFiles[0].contents);await fs.writeFile(path.join(root,'index.html'),'<div id="root"></div><script src="bundle.js"></script>')
 await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow}=require('electron');for(const name of ['userData','sessionData','logs','crashDumps'])app.setPath(name,${JSON.stringify(root)}+'/'+name);app.whenReady().then(()=>{new BrowserWindow({width:700,height:700,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit());`)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
 app=await electron.launch({args:[path.join(root,'main.cjs')],env});const page=await app.firstWindow();page.setDefaultTimeout(5000)
 await test('actual independent panel A-B-A rejects old review and old finally cannot unlock the new operation',async()=>{
  await page.reload();const button=page.getByRole('button',{name:'保存独立标签任务',exact:true});await button.click();await page.waitForFunction(()=>window.intents.length===1)
  await page.getByRole('button',{name:'切换素材',exact:true}).click();await page.waitForFunction(()=>!document.querySelectorAll('button')[2].disabled)
  await page.getByRole('button',{name:'切换素材',exact:true}).click();await button.click();await page.waitForFunction(()=>window.intents.length===2)
  await page.evaluate(async()=>{window.intents[0].resolve({ok:true,value:{receipt:'old-a',backendName:'OLD_A_MUST_NOT_SHOW',model:'old',storageNotice:'fixture'}});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
  assert.equal(await page.getByText('OLD_A_MUST_NOT_SHOW',{exact:false}).count(),0,'Old A must not replace the current review')
  assert.equal(await button.isDisabled(),true,'Old finally must not unlock the second A operation')
  await page.evaluate(()=>window.intents[1].resolve({ok:true,value:{receipt:'new-a',backendName:'NEW_A_REVIEW',model:'new',storageNotice:'fixture'}}));await page.getByText('NEW_A_REVIEW',{exact:false}).waitFor();assert.equal(await button.isDisabled(),false)
 })
 for(const action of ['切换素材','卸载面板'])await test(`a late execution receipt after ${action} is discarded once without running`,async()=>{
  await page.reload();await page.getByRole('button',{name:'分析标签',exact:true}).click();await page.waitForFunction(()=>window.executions.length===1);await page.getByRole('button',{name:action,exact:true}).click()
  await page.evaluate(async()=>{window.executions[0].resolve({ok:true,value:{receipt:'late-execution',backendName:'fixture',model:'fixture',providerOrigin:'owned',inputDescription:'fixture',storageNotice:'fixture'}});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
  assert.deepEqual(await page.evaluate(()=>window.discarded),['late-execution']);assert.deepEqual(await page.evaluate(()=>window.runs),[]);assert.equal(await page.getByRole('region',{name:'确认标签执行范围'}).count(),0)
 })
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
