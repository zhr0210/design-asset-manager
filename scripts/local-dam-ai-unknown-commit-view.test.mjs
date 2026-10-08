// Actual VisualAiPanel / LibraryDetails; synthetic API only, no Host or inference.
// This Renderer regression is separate from formal Computer Use.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-ai-unknown-commit-view-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase())
const sourceRoot=process.env.DAM_AI_UNKNOWN_COMMIT_SOURCE_ROOT
const sources=new Map(),sha256=value=>createHash('sha256').update(value).digest('hex')
for(const file of ['src/renderer/components/asset/VisualAiPanel.tsx','src/renderer/components/library/canvas/LibraryDetails.tsx']){
 const source=await fs.readFile(sourceRoot?path.join(sourceRoot,file):file,'utf8');sources.set(path.resolve(file).toLowerCase(),source)
 console.log(file+' '+(sourceRoot?'frozen-source-root':'working-tree')+' sha256='+sha256(source))
}
console.log('AI unknown commit regression source sha256='+sha256(await fs.readFile(new URL(import.meta.url))))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',plugins:[{name:'actual-ai-caller-snapshot',setup(builder){builder.onLoad({filter:/\.tsx$/},args=>{const contents=sources.get(path.resolve(args.path).toLowerCase());if(contents!==undefined)return{contents,loader:'tsx',resolveDir:path.dirname(args.path)}})}}],stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{WorkspaceConnectionError}from'./src/shared/client/workspace-connection-error';
 import VisualAiPanel from'./src/renderer/components/asset/VisualAiPanel';import{LibraryDetails}from'./src/renderer/components/library/canvas/LibraryDetails';
 import'./src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),scope={libraryIdentity:'synthetic-library',generation:'synthetic-generation'};
 let mode='run-unknown',runs=0,cancels=0,confirmations=[],job=null;
 const unknown=()=>new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。');
 const backend={id:'synthetic-backend',name:'Synthetic local service',location:'local',defaultModel:'synthetic-model'};
 const asset={id:'asset:one',title:'Synthetic blue asset',fileName:'Synthetic blue asset.png',filePath:'',thumbnailPath:'',sourceSiteId:'',sourceSiteName:'Synthetic source',sourcePageUrl:'',originalUrl:'',width:24,height:16,fileSize:100,fileType:'png',tags:[],aiCaption:'Synthetic caption',createdAt:'2026-10-02T00:00:00Z',visualAi:{evidenceId:'evidence:one',model:'synthetic-model',createdAt:'2026-10-02T00:00:00Z',caption:'Synthetic caption',tags:['blue'],pendingTags:['blue']}};
 const api={backends:async()=>({ok:true,value:[backend]}),results:async()=>({ok:true,value:[]}),
  prepare:async()=>({ok:true,value:{receipt:'synthetic-review',location:'local',backendName:backend.name,providerOrigin:'http://127.0.0.1:1',model:'synthetic-model',assets:[{assetId:'asset:one',title:'Synthetic first'},{assetId:'asset:two',title:'Synthetic second'}],inputDescription:'Controlled synthetic action',storageNotice:'No real model execution'}}),
  discardReview:async()=>({ok:true}),run:async()=>{runs++;if(mode==='run-failed')throw Error('SYNTHETIC_PRIVATE_DIAGNOSTIC');job={id:'synthetic-job',state:'running',items:[]};if(mode==='run-unknown')throw unknown();return{ok:true,value:clone(job)}},
  inspect:async()=>({ok:true,value:clone(job)}),cancel:async()=>{cancels++;job={...job,state:'cancelled'};throw unknown()},
  confirmTag:async input=>{confirmations.push(clone(input));if(mode==='tag-failed')throw Error('SYNTHETIC_PRIVATE_DIAGNOSTIC');throw unknown()}};
 installWorkspaceClient({visualAi:api,library:{previewColors:async()=>({success:true,value:{colors:[]}})}});
 const app=createRoot(document.getElementById('root'));
 window.fixture={inspect:()=>clone({runs,cancels,confirmations,job}),open:async(surface,nextMode)=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));mode=nextMode;runs=0;cancels=0;confirmations=[];job=null;app.render(surface==='visual'?<VisualAiPanel scope={scope} assetIds={['asset:one','asset:two']} onConfigure={()=>{}}/>:<LibraryDetails asset={asset} focus libraryScope={scope}/>)} };
`}})
console.log('AI unknown commit fixture bundle sha256='+sha256(await fs.readFile(path.join(root,'fixture.js'))))
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\';script-src \'self\';style-src \'self\' \'unsafe-inline\';connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],external=[];page.setDefaultTimeout(3500)
 await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(route.request().url());return route.abort()})
 page.on('pageerror',error=>errors.push(error.message));await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture))
 const inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const open=(surface,mode)=>page.evaluate(({surface,mode})=>window.fixture.open(surface,mode),{surface,mode})
 const prepare=async()=>{await page.getByRole('button',{name:'分析 2 个素材',exact:true}).click();await page.getByRole('region',{name:'确认 AI 执行范围',exact:true}).waitFor()}
 const assertUnknown=async(role)=>{const notice=page.getByRole(role).filter({hasText:/操作结果尚未确认|操作未完成|标签未能确认/});await notice.waitFor();const text=await notice.innerText();assert.match(text,/操作结果尚未确认/);assert.match(text,/检查保存结果，勿重复提交/);assert.equal(text.includes('操作未完成'),false);assert.equal(text.includes('请重试'),false)}
 await test('AI execution committed before a lost response stays unknown and is not automatically run twice',async()=>{
  await open('visual','run-unknown');await prepare();await page.getByRole('button',{name:'确认执行',exact:true}).click();await assertUnknown('alert')
  const state=await inspect();assert.equal(state.runs,1);assert.equal(state.job.state,'running');assert.equal(state.cancels,0);assert.equal(await page.getByRole('textbox',{name:'分析模型名称',exact:true}).inputValue(),'synthetic-model')
 })
 await test('AI cancellation committed before a lost response stays unknown instead of inviting another execution',async()=>{
  await open('visual','cancel-unknown');await prepare();await page.getByRole('button',{name:'确认执行',exact:true}).click();await page.getByRole('button',{name:'取消分析',exact:true}).click();await assertUnknown('alert')
  const state=await inspect();assert.equal(state.runs,1);assert.equal(state.cancels,1);assert.equal(state.job.state,'cancelled')
 })
 await test('ordinary AI errors retain safe generic feedback without exposing raw diagnostics',async()=>{
  await open('visual','run-failed');await prepare();await page.getByRole('button',{name:'确认执行',exact:true}).click();await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('alert').innerText(),'操作未完成，请重试。');assert.equal((await page.locator('body').innerText()).includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'),false)
 })
 await test('Inspector tag confirmation committed before a lost response stays unknown and does not confirm twice',async()=>{
  await open('details','tag-unknown');await page.getByRole('button',{name:'确认 AI 标签 blue',exact:true}).click();await assertUnknown('status')
  assert.deepEqual((await inspect()).confirmations,[{...{libraryIdentity:'synthetic-library',generation:'synthetic-generation'},assetId:'asset:one',evidenceId:'evidence:one',tag:'blue'}])
 })
 await test('ordinary Inspector errors keep safe feedback without leaking raw diagnostics',async()=>{
  await open('details','tag-failed');await page.getByRole('button',{name:'确认 AI 标签 blue',exact:true}).click();await page.getByRole('status').filter({hasText:'标签未能确认，请重试。'}).waitFor()
  assert.equal((await page.locator('body').innerText()).includes('SYNTHETIC_PRIVATE_DIAGNOSTIC'),false)
 })
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
