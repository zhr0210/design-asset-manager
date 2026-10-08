// Actual OCR environment settings component; synthetic contract only.
// No scan, model, Python, Host or native picker. This is not formal Computer Use.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-environment-view-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase())
const sourcePath='src/renderer/components/asset/OcrEnvironmentSettings.tsx',sourceRoot=process.env.DAM_OCR_ENVIRONMENT_VIEW_SOURCE_ROOT
const source=await fs.readFile(sourceRoot?path.join(sourceRoot,sourcePath):sourcePath,'utf8'),sha256=value=>createHash('sha256').update(value).digest('hex')
console.log(sourcePath+' '+(sourceRoot?'frozen-source-root':'working-tree')+' sha256='+sha256(source))
console.log('OCR environment regression source sha256='+sha256(await fs.readFile(new URL(import.meta.url))))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',plugins:[{name:'actual-ocr-environment-caller',setup(builder){builder.onLoad({filter:/OcrEnvironmentSettings\.tsx$/},args=>({contents:source,loader:'tsx',resolveDir:path.dirname(args.path)}))}}],stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{WorkspaceConnectionError}from'./src/shared/client/workspace-connection-error';import OcrEnvironmentSettings from'./src/renderer/components/asset/OcrEnvironmentSettings';
 import'./src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value);let current,mode,reads=0,selections=0,release=null;const readReleases=[];
 installWorkspaceClient({assetOcr:{status:async()=>{reads++;const callMode=mode,observed=clone(current);if(callMode.startsWith('read-held'))await new Promise(resolve=>readReleases.push(resolve));if(callMode==='read-failed'||callMode==='read-held-failed')throw Error('SYNTHETIC_PRIVATE_STATUS_DIAGNOSTIC');if(callMode==='read-error'||callMode==='read-held-error')return{ok:false,error:'合成环境状态不可用'};return{ok:true,value:observed}},configure:async()=>{
  selections++;if(mode==='configure-held')await new Promise(resolve=>release=resolve);
  if(mode==='configure-cancel')return{ok:true,value:clone(current)};
  if(mode==='configure-error')return{ok:false,error:'所选合成环境不符合资格'};
  current={configured:true,label:'合成 OCR 验收 · 无真实模型',job:null};
  if(mode==='configure-unknown')throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。');
  return{ok:true,value:clone(current)};
 }}});
 const app=createRoot(document.getElementById('root'));
 window.fixture={inspect:()=>clone({current,mode,reads,selections,pending:Boolean(release),readPending:readReleases.length}),release:()=>{const operation=release;release=null;operation?.()},releaseRead:()=>readReleases.shift()?.(),captureSelectionReply:()=>{window.fixture.heldSelection=release;release=null},open:async(nextMode,configured=false)=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));mode=nextMode;reads=0;selections=0;release=null;current={configured,label:configured?'合成 OCR 已有环境':'尚未选择本地 OCR 环境',job:null};app.render(<OcrEnvironmentSettings/>)} };
`}})
console.log('OCR environment fixture bundle sha256='+sha256(await fs.readFile(path.join(root,'fixture.js'))))
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\';script-src \'self\';style-src \'self\' \'unsafe-inline\';connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[],external=[];page.setDefaultTimeout(3500)
 await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(route.request().url());return route.abort()})
 page.on('pageerror',error=>errors.push(error.message));await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture))
 const section=()=>page.getByRole('region',{name:'本地 OCR 环境',exact:true}),select=()=>section().getByRole('button',{name:'选择可信本地 OCR 环境',exact:true}),inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const settled=()=>page.waitForFunction(()=>{const button=document.querySelector('section[aria-label="本地 OCR 环境"] button');return Boolean(button&&!button.disabled)})
 const open=async(mode,configured=false)=>{await page.evaluate(({mode,configured})=>window.fixture.open(mode,configured),{mode,configured});await select().waitFor();await page.waitForFunction(()=>window.fixture.inspect().reads===1)}
 await test('read status uses configured and public label instead of a nonexistent state property',async()=>{
  await open('configure-success');const text=await section().innerText();assert.match(text,/尚未配置/);assert.match(text,/尚未选择本地 OCR 环境/);assert.equal(text.includes('尚未读取'),false)
  await open('configure-success',true);const configured=await section().innerText();assert.match(configured,/已配置/);assert.match(configured,/合成 OCR 已有环境/);assert.equal((await inspect()).selections,0)
 })
 await test('successful configuration shows the returned configured environment without executing recognition',async()=>{
  await open('configure-success');await select().click();await page.waitForFunction(()=>window.fixture.inspect().current.configured);await settled();assert.equal(await select().isEnabled(),true)
  assert.match(await section().innerText(),/已配置.*合成 OCR 验收 · 无真实模型/);assert.equal((await inspect()).selections,1)
 })
 await test('cancelled configuration retains the existing environment and returns the action to enabled',async()=>{
  await open('configure-cancel',true);await select().click();await page.waitForFunction(()=>window.fixture.inspect().selections===1);assert.match(await section().innerText(),/已配置.*合成 OCR 已有环境/);assert.equal(await select().isEnabled(),true)
  assert.deepEqual((await inspect()).current,{configured:true,label:'合成 OCR 已有环境',job:null});assert.equal(await section().getByRole('alert').count(),0)
 })
 await test('a rejected selection exposes its safe error and retains the current configured result',async()=>{
  await open('configure-error',true);await select().click();await section().getByRole('alert').waitFor();assert.equal(await section().getByRole('alert').innerText(),'所选合成环境不符合资格');assert.match(await section().innerText(),/已配置.*合成 OCR 已有环境/);assert.equal(await select().isEnabled(),true);assert.equal((await inspect()).selections,1)
 })
 await test('unknown reply after configuration preserves outcome guidance and does not claim a failed selection or replay',async()=>{
  await open('configure-unknown');await select().click();await section().getByRole('alert').waitFor();const text=await section().getByRole('alert').innerText()
  assert.match(text,/操作结果尚未确认/);assert.match(text,/检查保存结果，勿重复提交/);assert.equal(text.includes('未能选择环境'),false)
  const state=await inspect();assert.equal(state.current.configured,true);assert.equal(state.selections,1);assert.equal(state.reads,1);assert.equal(await select().isEnabled(),true)
 })
 await test('ordinary state read failures keep safe generic feedback and do not scan or configure',async()=>{
  await open('read-failed');await section().getByRole('alert').waitFor();assert.equal(await section().getByRole('alert').innerText(),'OCR 环境状态暂不可读。');assert.equal((await section().innerText()).includes('SYNTHETIC_PRIVATE_STATUS_DIAGNOSTIC'),false);assert.equal((await inspect()).selections,0)
  await open('read-error');await section().getByRole('alert').waitFor();assert.equal(await section().getByRole('alert').innerText(),'合成环境状态不可用');assert.equal((await inspect()).selections,0)
 })
 await test('pending configuration disables duplicate selection until its own reply settles',async()=>{
  await open('configure-held');await select().click();await page.waitForFunction(()=>window.fixture.inspect().pending);assert.equal(await select().isDisabled(),true);assert.equal((await inspect()).selections,1)
  await page.evaluate(()=>window.fixture.release());await page.waitForFunction(()=>!window.fixture.inspect().pending&&window.fixture.inspect().current.configured);await settled();assert.equal(await select().isEnabled(),true);assert.equal((await inspect()).selections,1)
 })
 await test('late initial status cannot overwrite a newer successful configuration',async()=>{
  await open('read-held');await page.waitForFunction(()=>window.fixture.inspect().readPending===1);await select().click();await settled();assert.match(await section().innerText(),/已配置.*合成 OCR 验收 · 无真实模型/)
  await page.evaluate(()=>window.fixture.releaseRead());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  assert.match(await section().innerText(),/已配置.*合成 OCR 验收 · 无真实模型/);assert.equal((await section().innerText()).includes('尚未配置'),false);assert.equal((await inspect()).selections,1)
 })
 await test('late initial read failure cannot replace a newer successful configuration with a stale alert',async()=>{
  for(const mode of ['read-held-failed','read-held-error']){await open(mode);await page.waitForFunction(()=>window.fixture.inspect().readPending===1);await select().click();await settled();assert.match(await section().innerText(),/已配置.*合成 OCR 验收 · 无真实模型/)
   await page.evaluate(()=>window.fixture.releaseRead());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   assert.equal(await section().getByRole('alert').count(),0);assert.match(await section().innerText(),/已配置.*合成 OCR 验收 · 无真实模型/)
  }
 })
 await test('late unmounted read and configuration do not change a reopened environment session',async()=>{
  await open('read-held');await page.waitForFunction(()=>window.fixture.inspect().readPending===1);await open('configure-success',true);await page.evaluate(()=>window.fixture.releaseRead());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  assert.match(await section().innerText(),/已配置.*合成 OCR 已有环境/);assert.equal(await section().getByRole('alert').count(),0)
  await open('configure-held');await select().click();await page.waitForFunction(()=>window.fixture.inspect().pending);await page.evaluate(()=>window.fixture.captureSelectionReply())
  // Preserve the held reply through a remount; the old hook must not affect the new session.
  await open('configure-success',true);await page.evaluate(()=>window.fixture.heldSelection());await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  assert.match(await section().innerText(),/已配置.*合成 OCR 已有环境/);assert.equal(await select().isEnabled(),true);assert.equal(await section().getByRole('alert').count(),0)
 })
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
