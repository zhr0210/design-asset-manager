// Actual OCR configuration surfaces and shared Client event bridge with synthetic contracts.
// No Host, database, model, Python or native picker. This is not formal Computer Use.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-runtime-status-view-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase())
const sourceRoot=process.env.DAM_OCR_RUNTIME_STATUS_SOURCE_ROOT
const callers=['src/renderer/components/asset/OcrEnvironmentSettings.tsx','src/renderer/components/library/canvas/DedicatedOcrPanel.tsx']
const sha256=value=>createHash('sha256').update(value).digest('hex'),sources=new Map()
for(const caller of callers){const source=await fs.readFile(sourceRoot?path.join(sourceRoot,caller):caller,'utf8');sources.set(path.basename(caller),source);console.log(caller+' '+(sourceRoot?'frozen-source-root':'working-tree')+' sha256='+sha256(source))}
console.log('OCR runtime status regression source sha256='+sha256(await fs.readFile(new URL(import.meta.url))))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',plugins:[{name:'actual-ocr-runtime-callers',setup(builder){builder.onLoad({filter:/(OcrEnvironmentSettings|DedicatedOcrPanel)\.tsx$/},args=>({contents:sources.get(path.basename(args.path)),loader:'tsx',resolveDir:path.dirname(args.path)}))}}],stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';import{createWorkspaceClient}from'./src/shared/client/workspace-client';
 import{OCR_RUNTIME_CHANGED}from'./src/shared/contracts/asset-ocr.contract';
 import{WorkspaceConnectionError}from'./src/shared/client/workspace-connection-error';
 import{currentWorkspaceDraft,flushWorkspaceDrafts}from'./src/renderer/workspace-drafts';
 import{getOcrDraft,ocrDraftKey}from'./src/renderer/components/library/canvas/ocr-drafts';
 import OcrEnvironmentSettings from'./src/renderer/components/asset/OcrEnvironmentSettings';import{DedicatedOcrPanel}from'./src/renderer/components/library/canvas/DedicatedOcrPanel';
 import'./src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),scope={libraryIdentity:'library:runtime-status',generation:'generation:runtime-status',assetId:'asset:runtime-status'},draftScope={...scope,kind:'ocr',entityId:scope.assetId};
 const evidence={id:'evidence:runtime-status',assetId:scope.assetId,assetRevision:'asset-revision:one',sourceRef:'source:fixture',inputSha256:'1'.repeat(64),createdAt:'2026-10-02T00:00:00.000Z',observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'2'.repeat(64),cls:'3'.repeat(64),rec:'4'.repeat(64)},width:100,height:100,elapsedMs:1,threshold:.5,blocks:[{text:'Synthetic original recognition',confidence:.9,polygon:[[0,0],[1,0],[1,1],[0,1]]}]}};
 const snapshot={sessionToken:'session:runtime-status',revision:1,requiresUpgrade:false,evidence,editedText:null},asset={id:scope.assetId,title:'Synthetic runtime status asset',ocr:{evidenceId:evidence.id,revision:1,text:'Synthetic original recognition',sourceText:'Synthetic original recognition',edited:false,engine:'rapidocr-onnxruntime',version:'1.4.4',createdAt:evidence.createdAt,blockCount:1}};
 let runtime={configured:false,label:'尚未选择本地 OCR 环境',job:null},statusReads=0,dataReads=0,selections=0,runs=0,unmounted=false,holdStatuses=0,failStatuses=0,loseSelectionReply=false,slowRunning=false,statusInFlight=0,maxStatusInFlight=0;const pendingStatuses=[],listeners=new Map(),commands=[],writes=[];
 const emit=(channel)=>{for(const listener of listeners.get(channel)??[])listener({},undefined)};
 const client=createWorkspaceClient({invoke:async(channel,...args)=>{commands.push(channel);
  if(channel==='asset-ocr:status'){statusReads++;const observed=clone(runtime);if(failStatuses){failStatuses--;throw Error('SYNTHETIC_PRIVATE_STATUS_ERROR')}if(holdStatuses){holdStatuses--;return new Promise(resolve=>pendingStatuses.push({observed,resolve}))}if(slowRunning&&statusReads>2){statusInFlight++;maxStatusInFlight=Math.max(maxStatusInFlight,statusInFlight);await new Promise(resolve=>setTimeout(resolve,900));statusInFlight--;observed.job={...observed.job,state:'completed',items:[{assetId:scope.assetId,state:'completed'}]}}return{ok:true,value:observed}}
  if(channel==='asset-ocr:read'){dataReads++;return{ok:true,value:clone(snapshot)}}
  if(channel==='asset-ocr:configure'){selections++;runtime={configured:true,label:'合成 OCR 新配置 · 无真实模型',job:null};emit(OCR_RUNTIME_CHANGED);if(loseSelectionReply){loseSelectionReply=false;throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。')}return{ok:true,value:clone(runtime)}}
  if(channel==='asset-ocr:prepare')return{ok:true,value:{receipt:'review:synthetic',count:1,requiresUpgrade:false,runtimeLabel:runtime.label}};
  if(channel==='asset-ocr:run'){runs++;runtime={...runtime,job:{id:'job:synthetic-run',libraryIdentity:scope.libraryIdentity,generation:scope.generation,state:'running',items:[{assetId:scope.assetId,state:'running'}]}};return{ok:true,value:clone(runtime.job)}}
  if(channel==='asset-ocr:correct'){writes.push(clone(args[0]));return{ok:false,error:'合成状态测试不提交文字'}}
  if(channel==='drafts:put')return args[0];if(channel==='drafts:remove')return{success:true};if(channel==='workspace:ready')return;
  throw Error('UNEXPECTED_SYNTHETIC_OPERATION');
 },on:(channel,listener)=>{const current=listeners.get(channel)??new Set();current.add(listener);listeners.set(channel,current)},removeListener:(channel,listener)=>listeners.get(channel)?.delete(listener)});
 installWorkspaceClient(client);const app=createRoot(document.getElementById('root'));
 window.fixture={inspect:()=>clone({runtime,statusReads,dataReads,selections,runs,commands,writes,pendingStatuses:pendingStatuses.length,runtimeListeners:listeners.get(OCR_RUNTIME_CHANGED)?.size??0,unmounted,statusInFlight,maxStatusInFlight,ocrDraft:getOcrDraft(ocrDraftKey(scope))??null,workspaceDraft:currentWorkspaceDraft(draftScope)??null}),
  flush:()=>flushWorkspaceDrafts(),holdNextStatuses:()=>{holdStatuses+=2},failNextStatuses:()=>{failStatuses+=2},loseNextSelectionReply:()=>{loseSelectionReply=true},peer:(configured,label)=>{runtime={configured,label,job:null};emit(OCR_RUNTIME_CHANGED)},
  releaseStatuses:()=>{for(const operation of pendingStatuses.splice(0).reverse())operation.resolve({ok:true,value:clone(operation.observed)})},
  mount:({held=false,statusFailure=false,slow=false})=>{holdStatuses=held?2:0;failStatuses=statusFailure?2:0;if(slow){slowRunning=true;runtime={configured:true,label:'合成 OCR 慢状态 · 无真实模型',job:{id:'job:synthetic',libraryIdentity:scope.libraryIdentity,generation:scope.generation,state:'running',items:[{assetId:scope.assetId,state:'running'}]}}}app.render(<><OcrEnvironmentSettings/><DedicatedOcrPanel asset={asset} scope={scope}/></>)},unmount:()=>{unmounted=true;app.render(null)}
 };
`}})
console.log('OCR runtime status fixture bundle sha256='+sha256(await fs.readFile(path.join(root,'fixture.js'))))
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\';script-src \'self\';style-src \'self\' \'unsafe-inline\';connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1200,height:900}}),errors=[],external=[]
 await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(route.request().url());return route.abort()})
 const withPanels=async(run,options={})=>{const page=await context.newPage();page.setDefaultTimeout(3500);page.on('pageerror',error=>errors.push(error.message));try{
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture));await page.evaluate(options=>window.fixture.mount(options),options);await page.waitForFunction(()=>window.fixture.inspect().statusReads===2&&window.fixture.inspect().dataReads===1)
  const env=()=>page.getByRole('region',{name:'本地 OCR 环境',exact:true}),detail=()=>page.getByRole('region',{name:'专用文字识别',exact:true}),input=()=>detail().getByRole('textbox',{name:'修订识别文字',exact:true}),inspect=()=>page.evaluate(()=>window.fixture.inspect()),rendered=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),flush=()=>page.evaluate(()=>window.fixture.flush())
  const edit=async(text)=>{await detail().getByRole('button',{name:'修订识别文字',exact:true}).click();await input().fill(text);await flush()}
  await run({page,env,detail,input,inspect,rendered,flush,edit})
 }finally{await page.close()}}
 await test('peer runtime configuration updates both actual surfaces through the dedicated shared Client event',async()=>withPanels(async({page,env,detail,inspect,rendered})=>{
  assert.match(await env().innerText(),/尚未配置/);assert.equal(await detail().getByRole('button',{name:'重新识别文字',exact:true}).isDisabled(),true)
  await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 对端配置 · 无真实模型'));await rendered()
  assert.match(await env().innerText(),/已配置.*合成 OCR 对端配置 · 无真实模型/);assert.equal(await detail().getByRole('button',{name:'重新识别文字',exact:true}).isEnabled(),true)
  const state=await inspect();assert.equal(state.statusReads,4);assert.equal(state.dataReads,1);assert.equal(state.selections,0);assert.deepEqual(state.writes,[]);assert.equal(state.runtimeListeners,2)
 }))
 await test('late initial status cannot overwrite peer configuration or change an existing correction draft',async()=>withPanels(async({page,env,detail,input,inspect,rendered,edit,flush})=>{
  await edit('Draft retained across initial status and runtime event');const before=await inspect();await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 当前配置 · 无真实模型'));await rendered()
  await page.evaluate(()=>window.fixture.releaseStatuses());await rendered();await flush();const state=await inspect()
  assert.match(await env().innerText(),/已配置.*合成 OCR 当前配置 · 无真实模型/);assert.equal((await detail().innerText()).includes('选择已安装且可信的 OCR 环境'),false);assert.equal(await input().inputValue(),before.ocrDraft.text)
  assert.deepEqual(state.ocrDraft.base,before.ocrDraft.base);assert.equal(state.ocrDraft.mismatch,false);assert.deepEqual(state.workspaceDraft.base,before.workspaceDraft.base);assert.equal(state.workspaceDraft.value,before.workspaceDraft.value);assert.equal(state.dataReads,1);assert.deepEqual(state.writes,[])
 },{held:true}))
 await test('reverse runtime status replies preserve the latest environment and the correction baseline',async()=>withPanels(async({page,env,detail,input,inspect,rendered,edit,flush})=>{
  await edit('Correction survives reversed runtime status replies');const before=await inspect();await page.evaluate(()=>{window.fixture.holdNextStatuses();window.fixture.peer(false,'合成 OCR 旧环境')});await page.waitForFunction(()=>window.fixture.inspect().pendingStatuses===2)
  await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 最新环境 · 无真实模型'));await rendered();await page.evaluate(()=>window.fixture.releaseStatuses());await rendered();await flush();const state=await inspect()
  assert.match(await env().innerText(),/已配置.*合成 OCR 最新环境 · 无真实模型/);assert.equal((await detail().innerText()).includes('选择已安装且可信的 OCR 环境'),false);assert.equal(await input().inputValue(),before.ocrDraft.text)
  assert.deepEqual(state.ocrDraft.base,before.ocrDraft.base);assert.equal(state.ocrDraft.mismatch,false);assert.equal(state.workspaceDraft.value,before.workspaceDraft.value);assert.equal(state.dataReads,1);assert.equal(state.selections,0);assert.deepEqual(state.writes,[])
 }))
 await test('configuration publication before its reply restores the initiating action and rejects older status on both surfaces',async()=>{
  for(const target of ['environment','detail'])await withPanels(async({page,env,detail,inspect,rendered})=>{
   const action=target==='environment'?env().getByRole('button',{name:'选择可信本地 OCR 环境',exact:true}):detail().getByRole('button',{name:'选择本地 OCR 环境',exact:true});await action.click();await rendered();await page.evaluate(()=>window.fixture.releaseStatuses());await rendered()
   assert.match(await env().innerText(),/已配置.*合成 OCR 新配置 · 无真实模型/);assert.equal(await action.isEnabled(),true);assert.equal(await detail().getByRole('button',{name:'重新识别文字',exact:true}).isEnabled(),true)
   const state=await inspect();assert.equal(state.selections,1);assert.equal(state.dataReads,1);assert.deepEqual(state.writes,[]);assert.equal(await env().getByRole('alert').count(),0);assert.equal(await detail().getByRole('alert').count(),0)
  },{held:true})
 })
 await test('unmounted surfaces remove runtime listeners and perform no further status reads',async()=>withPanels(async({page,inspect,rendered})=>{
  const before=await inspect();await page.evaluate(()=>window.fixture.unmount());await rendered();await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 卸载后环境'));await rendered();const after=await inspect()
  assert.equal(after.runtimeListeners,0);assert.equal(after.statusReads,before.statusReads);assert.equal(after.dataReads,before.dataReads);assert.deepEqual(after.writes,[])
 }))
 await test('a runtime event before a lost configuration reply does not erase unknown-outcome guidance or replay the selection',async()=>{
  for(const target of ['environment','detail'])await withPanels(async({page,env,detail,inspect,rendered})=>{
   await page.evaluate(()=>window.fixture.loseNextSelectionReply());const region=target==='environment'?env():detail(),action=target==='environment'?region.getByRole('button',{name:'选择可信本地 OCR 环境',exact:true}):region.getByRole('button',{name:'选择本地 OCR 环境',exact:true});await action.click();await rendered()
   const alerts=await region.getByRole('alert').allTextContents();assert.equal(alerts.length,1);assert.match(alerts[0],/操作结果尚未确认/);assert.match(alerts[0],/检查保存结果，勿重复提交/);assert.equal(alerts[0].includes('未能选择环境'),false);assert.equal(await action.isEnabled(),true)
   assert.match(await env().innerText(),/已配置.*合成 OCR 新配置 · 无真实模型/);await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 后续读取 · 无真实模型'));await rendered();assert.match(await region.getByRole('alert').innerText(),/操作结果尚未确认/)
   await page.evaluate(()=>{window.fixture.failNextStatuses();window.fixture.peer(true,'合成 OCR 读取失败 · 无真实模型')});await rendered();assert.match(await region.getByRole('alert').innerText(),/操作结果尚未确认/);assert.match(await region.getByRole('alert').innerText(),/检查保存结果，勿重复提交/);const state=await inspect();assert.equal(state.selections,1);assert.equal(state.dataReads,1);assert.deepEqual(state.writes,[])
  })
 })
 await test('slow status polling settles before the next poll and eventually shows the completed job',async()=>withPanels(async({detail,inspect})=>{
  await detail().getByText('OCR 识别中 · 0/1',{exact:true}).waitFor();await detail().getByText('OCR 识别完成 · 1/1',{exact:true}).waitFor({timeout:2600})
  assert.equal(await detail().getByRole('button',{name:'选择本地 OCR 环境',exact:true}).isEnabled(),true);const state=await inspect();assert.equal(state.maxStatusInFlight,1);assert.equal(state.statusInFlight,0);assert.equal(state.dataReads,1);assert.equal(state.selections,0);assert.deepEqual(state.writes,[])
 },{slow:true}))
 await test('a successful environment reread clears its old read error without changing the saved runtime',async()=>withPanels(async({page,env,rendered,inspect})=>{
  assert.equal(await env().getByRole('alert').innerText(),'OCR 环境状态暂不可读。');await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 恢复读取 · 无真实模型'));await rendered();assert.equal(await env().getByRole('alert').count(),0);assert.match(await env().innerText(),/已配置.*合成 OCR 恢复读取 · 无真实模型/);assert.equal((await inspect()).selections,0)
 },{statusFailure:true}))
 await test('a status reply captured before confirmed run cannot hide the running job or its cancel action',async()=>withPanels(async({page,detail,rendered,inspect})=>{
  await page.evaluate(()=>window.fixture.peer(true,'合成 OCR 运行入口 · 无真实模型'));await rendered();await page.evaluate(()=>{window.fixture.holdNextStatuses();window.fixture.peer(true,'合成 OCR 运行入口 · 无真实模型')});await page.waitForFunction(()=>window.fixture.inspect().pendingStatuses===2)
  await detail().getByRole('button',{name:'重新识别文字',exact:true}).click();await detail().getByRole('button',{name:'确认识别并保存',exact:true}).click();await detail().getByText('OCR 识别中 · 0/1',{exact:true}).waitFor();await page.evaluate(()=>window.fixture.releaseStatuses());await rendered()
  assert.equal(await detail().getByText('OCR 识别中 · 0/1',{exact:true}).count(),1);assert.equal(await detail().getByRole('button',{name:'取消 OCR 批次',exact:true}).isEnabled(),true);assert.equal(await detail().getByRole('button',{name:'选择本地 OCR 环境',exact:true}).isDisabled(),true)
  const state=await inspect();assert.equal(state.runs,1);assert.equal(state.dataReads,1);assert.deepEqual(state.writes,[])
 }))
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
