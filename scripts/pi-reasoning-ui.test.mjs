import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'

// Synthetic component checks only. This is neither formal Browser CU nor native Desktop acceptance.
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-reasoning-ui-'));let app
try{
 const result=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import Panel from'./src/renderer/components/asset/PiConnectionsPanel';
 window.calls=[];window.listeners=[];window.probeFails=false;window.catalogCalls=0;window.backend={id:'fixture',name:'Luna fixture',type:'openai-compatible',transport:'pi',providerKind:'openai',authMode:'oauth',baseUrl:'https://api.openai.com/v1',defaultModel:'gpt-6-luna',enabled:true,priority:1,timeoutMs:1000,credentialRevision:1,credentialRef:'fixture',capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false}};
 window.damClient={onSettingsChanged:fn=>{window.listeners.push(fn);return()=>window.listeners=window.listeners.filter(f=>f!==fn)},onReconcile:()=>()=>{},aiBackendList:async()=>[structuredClone(window.backend)],aiBackendSave:async b=>{window.backend=structuredClone(b);window.calls.push('save');return[structuredClone(b)]},aiBackendDelete:async()=>{throw Error('not allowed')},aiBackendListModels:async()=>{window.catalogCalls++;await new Promise(r=>setTimeout(r,200));return{success:true,models:[{id:'gpt-6-luna',name:'Luna',reasoningLevels:['off','low','medium','high','xhigh','max']},{id:'gpt-4.1-mini',reasoningLevels:['off']}]};},
 aiConnections:{credentialStatus:async()=>({configured:true,kind:'oauth',revision:1,legacyPresent:false,storageAvailable:true,identityVerified:true,planUsageAuthorized:true}),currentLogin:async()=>null,discardValidation:async()=>{window.calls.push('discard')},prepareValidation:async()=>{window.calls.push('prepare');return{receipt:'fixture-review',notice:'思考强度：'+(window.backend.reasoning??'模型默认')}},confirmValidation:async()=>{window.calls.push('confirm');if(window.probeFails)throw Error('AI_PROVIDER_FAILED');window.backend.modelValidation={model:window.backend.defaultModel,reasoning:window.backend.reasoning,bindingSha256:'synthetic',vision:true,jsonOutput:true,testedAt:'2026-10-05T00:00:00Z',generatedInput:true};for(const fn of window.listeners)fn();return{colourChallengePassed:true,reasoning:window.backend.reasoning}},clearCredential:async()=>{throw Error('not allowed')}}};
 createRoot(document.getElementById('root')).render(<Panel/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'bundle.js'),write:false,logLevel:'silent'})
 for(const f of result.outputFiles)await fs.writeFile(f.path,f.contents)
 await fs.writeFile(path.join(root,'index.html'),'<link rel="stylesheet" href="bundle.css"><div id="root"></div><script src="bundle.js"></script>')
 await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow}=require('electron');for(const n of ['userData','sessionData','logs','crashDumps'])app.setPath(n,${JSON.stringify(root)}+'/'+n);app.whenReady().then(()=>new BrowserWindow({width:1000,height:900,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))}));app.on('window-all-closed',()=>app.quit())`)
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!['ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL','NODE_OPTIONS'].includes(k)&&!k.startsWith('DAM_')))
 app=await electron.launch({args:[path.join(root,'main.cjs')],env});const page=await app.firstWindow();page.setDefaultTimeout(5000)
 const reset=async()=>{await page.goto('file://'+path.join(root,'index.html'));await page.getByRole('button',{name:/Luna fixture/}).click();await page.getByLabel('思考强度').locator('option[value="max"]').waitFor({state:'attached'})}
 await test('Luna auto-catalog finishes loading and exposes exact supported choices without invoking inference',async()=>{
  await reset();assert.deepEqual(await page.getByLabel('思考强度').locator('option').evaluateAll(options=>options.map(o=>o.value)),['','off','low','medium','high','xhigh','max'])
  assert.equal(await page.getByText('正在读取模型支持的思考档位…',{exact:false}).count(),0);assert.deepEqual(await page.evaluate(()=>window.calls),[])
 })
 await test('save/cancel/reselect retain exactly selected strength and unsaved draft never invokes',async()=>{
  await reset();await page.getByLabel('思考强度').selectOption('low');await page.getByRole('button',{name:'保存连接'}).click();assert.equal(await page.evaluate(()=>window.backend.reasoning),'low')
  await page.getByLabel('思考强度').selectOption('high');await page.getByRole('button',{name:'取消修改'}).click();assert.equal(await page.getByLabel('思考强度').inputValue(),'low')
  await page.getByRole('button',{name:/Luna fixture/}).click();assert.equal(await page.getByLabel('思考强度').inputValue(),'low');assert.deepEqual(await page.evaluate(()=>window.calls),['save'])
 })
 await test('unsupported saved choice remains visible; compatible/legacy/unknown model allow only default recovery',async()=>{
  await reset();await page.getByLabel('思考强度').selectOption('max');await page.getByRole('button',{name:'保存连接'}).click()
  await page.getByLabel('模型名称').fill('manual-unknown');assert.equal(await page.getByLabel('思考强度').inputValue(),'max');assert.equal(await page.getByRole('button',{name:'保存连接'}).isDisabled(),true);await page.getByRole('alert').filter({hasText:'不会自动降档'}).waitFor()
  await page.getByLabel('思考强度').selectOption('');assert.equal(await page.getByRole('button',{name:'保存连接'}).isEnabled(),true)
  await page.getByRole('button',{name:'高级连接选项'}).click();await page.getByLabel('提供方').selectOption('openai-compatible');assert.deepEqual(await page.getByLabel('思考强度').locator('option').evaluateAll(options=>options.map(o=>o.value)),[''])
  await page.getByLabel('执行接口').selectOption('legacy');assert.deepEqual(await page.getByLabel('思考强度').locator('option').evaluateAll(options=>options.map(o=>o.value)),['']);assert.deepEqual(await page.evaluate(()=>window.calls),['save'])
 })
 await test('editing effort clears an existing review and prevents stale confirmation',async()=>{
  await reset();await page.getByRole('button',{name:'核对生成图片能力验证'}).click();await page.getByRole('region',{name:'确认模型能力验证'}).waitFor()
  await page.getByLabel('思考强度').selectOption('low');await page.getByRole('region',{name:'确认模型能力验证'}).waitFor({state:'detached'});assert.deepEqual(await page.evaluate(()=>window.calls),['prepare','discard'])
 })
 await test('own capability-save feedback adopts proof without a false external conflict',async()=>{
  await reset();await page.getByLabel('思考强度').selectOption('low');await page.getByRole('button',{name:'保存连接'}).click();await page.getByRole('button',{name:'核对生成图片能力验证'}).click();await page.getByRole('button',{name:'同意发送生成测试图'}).click()
  await page.getByRole('status').filter({hasText:'生成图片与完整 JSON 验证通过'}).waitFor();assert.equal(await page.getByRole('button',{name:'保存连接'}).isEnabled(),true);assert.equal(await page.getByText(/上次模型验证：.*思考强度：低/).count(),1);assert.equal(await page.getByRole('region',{name:'确认模型能力验证'}).count(),0)
  await page.getByLabel('思考强度').selectOption('high');await page.getByRole('status').filter({hasText:'生成图片与完整 JSON 验证通过'}).waitFor({state:'detached'})
 })
 await test('failed probe retires its one-use review and allows a fresh review',async()=>{
  await reset();await page.evaluate(()=>window.probeFails=true);await page.getByRole('button',{name:'核对生成图片能力验证'}).click();await page.getByRole('button',{name:'同意发送生成测试图'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('region',{name:'确认模型能力验证'}).count(),0)
  await page.getByRole('button',{name:'核对生成图片能力验证'}).click();await page.getByRole('region',{name:'确认模型能力验证'}).waitFor();assert.deepEqual(await page.evaluate(()=>window.calls),['prepare','confirm','prepare'])
 })
 await test('rapid cancel/reselect reuses pending and cached native catalog reads',async()=>{
  await page.goto('file://'+path.join(root,'index.html'));await page.getByRole('button',{name:/Luna fixture/}).click()
  for(let i=0;i<3;i++){await page.getByLabel('连接名称').fill('Draft '+i);await page.getByRole('button',{name:'取消修改'}).click()}
  await page.getByLabel('思考强度').locator('option[value="max"]').waitFor({state:'attached'})
  for(let i=0;i<3;i++){await page.getByLabel('思考强度').selectOption('high');await page.getByRole('button',{name:'取消修改'}).click()}
  assert.equal(await page.evaluate(()=>window.catalogCalls),1);assert.equal(await page.getByRole('button',{name:'保存连接'}).isEnabled(),true);assert.equal(await page.getByRole('alert').count(),0)
 })
}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
