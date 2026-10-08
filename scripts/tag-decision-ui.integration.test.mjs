import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {_electron as electron} from 'playwright'
import {build} from 'esbuild'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-choice-ui-'));let app
try{
 const bundle=await build({stdin:{contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import Controls from './src/renderer/components/asset/TagDecisionControls';
 window.discarded=[];window.tagDecisionsAPI={prepare:input=>new Promise(resolve=>{window.resolveChoice=()=>resolve({ok:true,value:{receipt:input.assetId,tag:'标签',decision:'confirm',requiresUpgrade:false}})}),confirm:async receipt=>({ok:true,value:{current:{...summary,assetId:receipt,pendingTags:[]}}}),discard:async receipt=>{window.discarded.push(receipt);return{ok:true}}};
 const summary={evidenceId:'evidence',assetId:'a',pendingTags:['标签'],tags:['标签'],observedTagCount:1};function App(){const[id,setId]=useState('a');return <><button onClick={()=>setId(id==='a'?'b':'a')}>切换素材</button><Controls scope={{libraryIdentity:'generated',generation:'generated',assetId:id}} summary={{...summary,assetId:id,evidenceId:id}}/></>};createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'iife',platform:'browser',write:false,logLevel:'silent'})
 await fs.writeFile(path.join(root,'bundle.js'),bundle.outputFiles[0].contents);await fs.writeFile(path.join(root,'index.html'),'<div id="root"></div><script src="bundle.js"></script>')
 await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow}=require('electron');for(const name of ['userData','sessionData','logs','crashDumps'])app.setPath(name,${JSON.stringify(root)}+'/'+name);app.whenReady().then(()=>{new BrowserWindow({width:600,height:400,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit());`)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
 app=await electron.launch({args:[path.join(root,'main.cjs')],env});const page=await app.firstWindow();const confirm=page.getByRole('button',{name:'确认 AI 标签 标签',exact:true})
 await confirm.click();assert.equal(await confirm.isDisabled(),true);await page.evaluate(()=>{window.resolveA=window.resolveChoice});await page.getByRole('button',{name:'切换素材',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[aria-label="确认 AI 标签 标签"]').disabled)
 await page.getByRole('button',{name:'切换素材',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[aria-label="确认 AI 标签 标签"]').disabled)
 await confirm.click();await page.evaluate(()=>window.resolveA());await page.waitForFunction(()=>window.discarded.includes('a'));assert.equal(await confirm.isDisabled(),true,'stale completion must not release the new operation')
 await page.evaluate(()=>window.resolveChoice());await page.getByText('标签已确认。',{exact:true}).waitFor();assert.equal(await confirm.count(),0)
 console.log(JSON.stringify({passed:true,scope:'isolated production React component with fake decision API; no Host qualification',assertions:['A-B-A identity epoch reset','late receipt discard','old finally cannot unlock new operation','new identity decision succeeds']}))
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
