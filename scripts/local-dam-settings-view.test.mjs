// Actual Settings route + Settings store, with a synthetic WorkspaceClient CAS
// boundary and private Electron profile. This is isolated Renderer regression,
// not formal product Computer Use or real settings/profile acceptance.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-settings-view-')))
const profile=path.join(root,'profile'),fixture=path.join(root,'fixture.js')
await fs.mkdir(profile)
const sourceRoot=process.env.DAM_SETTINGS_VIEW_SOURCE_ROOT
const sourcePath='src/renderer/routes/Settings.tsx'
const source=await fs.readFile(sourceRoot?path.join(sourceRoot,sourcePath):sourcePath,'utf8')
console.log('Settings route '+(sourceRoot?'frozen-source-root':'working-tree')+' sha256='+createHash('sha256').update(source).digest('hex'))
console.log('Settings regression source sha256='+createHash('sha256').update(await fs.readFile(new URL(import.meta.url))).digest('hex'))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:fixture,logLevel:'silent',plugins:[{name:'actual-settings-caller-snapshot',setup(builder){builder.onLoad({filter:/routes[\\/]Settings\.tsx$/},args=>({contents:source,loader:'tsx',resolveDir:path.dirname(args.path)}))}}],stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';
 import{MemoryRouter,Routes,Route,Link}from'react-router-dom';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{WorkspaceConnectionError}from'./src/shared/client/workspace-connection-error';
 import{hasTransientWorkspaceEdits}from'./src/renderer/workspace-edit-guards';
 import'./src/renderer/components/gallery/tokens.css';import'./src/renderer/components/gallery/gallery.css';
 const clone=value=>structuredClone(value),writes=[],selections=[];
 let stored,defaults,loads=0,renderVersion=0,holdWrite=false,pendingWrite=false,releaseWrite=null,failNext=false,loseNextReply=false,failRead=false;
 installWorkspaceClient({
  settingsLoad:async()=>{loads++;if(failRead)throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。');return clone(stored)},
  settingsSave:async(patch,expected)=>{
   writes.push({patch:clone(patch),expected:clone(expected)});
   if(holdWrite){pendingWrite=true;await new Promise(resolve=>releaseWrite=resolve);pendingWrite=false}
   if(failNext){failNext=false;throw Error('SYNTHETIC_SETTINGS_WRITE_FAILED')}
   for(const key of Object.keys(patch))if((stored[key]??null)!==expected[key])throw Error('SYNTHETIC_SETTINGS_CONFLICT');
   stored={...stored,...clone(patch)};
   if(loseNextReply){loseNextReply=false;throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。')}
   return clone(stored);
  },
  settingsSelectFolder:async input=>{selections.push(clone(input));return{canceled:true}}
 });
 Promise.all([import('./src/renderer/routes/Settings'),import('./src/renderer/stores/settings.store')]).then(([component,store])=>{
  const Settings=component.default,useSettingsStore=store.useSettingsStore;
  defaults={...clone(useSettingsStore.getState().settings),libraryPath:'Synthetic/Library/Base',modelRootDir:'Synthetic/Models/Base'};
  stored=clone(defaults);
  const app=createRoot(document.getElementById('root'));
  function App(){return<MemoryRouter initialEntries={['/settings?section=library']}><Routes><Route path='/settings' element={<Settings/>}/><Route path='/library' element={<main><h1>Fixture workspace</h1><Link to='/settings?section=library'>重新打开设置</Link></main>}/></Routes></MemoryRouter>}
  window.fixture={inspect:()=>clone({stored,writes,selections,loads,pendingWrite,editing:hasTransientWorkspaceEdits(),settings:useSettingsStore.getState().settings}),
   remote:async(patch,notify=true)=>{stored={...stored,...clone(patch)};if(notify)await useSettingsStore.getState().loadSettings()},
   hold:()=>{holdWrite=true},release:()=>{holdWrite=false;releaseWrite?.();releaseWrite=null},fail:()=>{failNext=true},loseReply:(failFollowingRead=false)=>{loseNextReply=true;failRead=failFollowingRead},
   reset:async()=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));stored=clone(defaults);writes.length=0;selections.length=0;loads=0;holdWrite=false;pendingWrite=false;releaseWrite=null;failNext=false;loseNextReply=false;failRead=false;useSettingsStore.setState({settings:clone(defaults)});app.render(<App key={++renderVersion}/>)}
  };
 });
`}})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>`)
await fs.writeFile(path.join(root,'main.cjs'),`
 const{app,BrowserWindow,session}=require('electron'),fs=require('node:fs');
 for(const name of ['userData','sessionData','logs','crashDumps']){const directory=${JSON.stringify(profile)}+'/'+name;fs.mkdirSync(directory,{recursive:true});app.setPath(name,directory)}
 app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((request,done)=>done({cancel:!request.url.startsWith('file:')}));const window=new BrowserWindow({show:false,width:1280,height:1100,webPreferences:{contextIsolation:true,nodeIntegration:false}});window.loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit());
`)
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL','NODE_OPTIONS'].includes(key)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow(),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(error.message));await page.waitForFunction(()=>Boolean(window.fixture))
 const pathInput=()=>page.getByRole('textbox',{name:'素材存储路径偏好',exact:true})
 const save=()=>page.getByRole('button',{name:'保存偏好',exact:true})
 const inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const reset=async()=>{await page.evaluate(()=>window.fixture.reset());await pathInput().waitFor();await page.waitForFunction(()=>window.fixture.inspect().loads===1&&!window.fixture.inspect().editing);assert.equal(await pathInput().inputValue(),'Synthetic/Library/Base')}

 await test('clean preference fields follow remote saves without becoming unsaved input',async()=>{
  await reset();await page.evaluate(()=>window.fixture.remote({libraryPath:'Synthetic/Library/Remote',concurrency:6,delayInterval:2.5}))
  await page.waitForFunction(()=>document.querySelector('input[aria-label="素材存储路径偏好"]').value==='Synthetic/Library/Remote')
  assert.equal(await save().isDisabled(),true);assert.equal((await inspect()).editing,false);assert.deepEqual((await inspect()).writes,[])
  await page.getByRole('button',{name:'采集与下载',exact:true}).click()
  assert.equal(await page.getByRole('slider',{name:'并发任务上限',exact:true}).inputValue(),'6')
  assert.equal(await page.getByRole('slider',{name:'请求间隔',exact:true}).inputValue(),'2.5')
 })

 await test('dirty remote conflict preserves input, exposes saved comparison and blocks saving until adoption',async()=>{
  await reset();await pathInput().fill('Synthetic/Library/Local');await page.waitForFunction(()=>window.fixture.inspect().editing)
  await page.evaluate(()=>window.fixture.remote({libraryPath:'Synthetic/Library/Remote',concurrency:6}))
  await page.getByText('另一界面已保存新的偏好，当前输入仍保留。',{exact:true}).waitFor()
  assert.equal(await pathInput().inputValue(),'Synthetic/Library/Local');assert.equal(await save().isDisabled(),true)
  await page.getByText('核对当前已保存偏好',{exact:true}).click()
  await page.getByText('素材存储路径偏好：Synthetic/Library/Remote',{exact:true}).waitFor()
  assert.deepEqual((await inspect()).writes,[]);assert.equal((await inspect()).stored.libraryPath,'Synthetic/Library/Remote')
 })

 await test('explicit adoption keeps local input and commits it using the reviewed current preference as CAS baseline',async()=>{
  await reset();await pathInput().fill('Synthetic/Library/Local');await page.evaluate(()=>window.fixture.remote({libraryPath:'Synthetic/Library/Remote',concurrency:6}))
  await page.getByText('核对当前已保存偏好',{exact:true}).click();await page.getByText('素材存储路径偏好：Synthetic/Library/Remote',{exact:true}).waitFor()
  await page.getByRole('button',{name:'核对后采用当前偏好为基准',exact:true}).click()
  assert.equal(await pathInput().inputValue(),'Synthetic/Library/Local');assert.equal(await save().isEnabled(),true)
  await save().click();await page.getByText('偏好已保存。',{exact:true}).waitFor()
  const state=await inspect();assert.deepEqual(state.writes,[{patch:{libraryPath:'Synthetic/Library/Local'},expected:{libraryPath:'Synthetic/Library/Remote'}}]);assert.equal(state.stored.libraryPath,'Synthetic/Library/Local');assert.equal(state.stored.concurrency,6);assert.equal(state.editing,false)
  await page.getByRole('link',{name:'返回素材工作区',exact:true}).click();await page.getByRole('link',{name:'重新打开设置',exact:true}).click();await pathInput().waitFor();assert.equal(await pathInput().inputValue(),'Synthetic/Library/Local');assert.equal(await save().isDisabled(),true)
 })

 await test('CAS failure reloads the current preference while retaining the entered value and review path',async()=>{
  await reset();await pathInput().fill('Synthetic/Library/Local');await page.evaluate(()=>window.fixture.remote({libraryPath:'Synthetic/Library/ChangedBeforeSave'},false))
  await save().click();await page.getByRole('alert').waitFor()
  await page.getByText('另一界面已保存新的偏好，当前输入仍保留。',{exact:true}).waitFor()
  const failed=await inspect();assert.equal(failed.loads,2);assert.equal(failed.stored.libraryPath,'Synthetic/Library/ChangedBeforeSave');assert.equal(failed.settings.libraryPath,'Synthetic/Library/ChangedBeforeSave');assert.equal(await pathInput().inputValue(),'Synthetic/Library/Local');assert.equal(await save().isDisabled(),true)
  assert.deepEqual(failed.writes,[{patch:{libraryPath:'Synthetic/Library/Local'},expected:{libraryPath:'Synthetic/Library/Base'}}])
  await page.getByRole('button',{name:'核对后采用当前偏好为基准',exact:true}).click();await save().click();await page.getByText('偏好已保存。',{exact:true}).waitFor()
  const saved=await inspect();assert.equal(saved.writes[1].expected.libraryPath,'Synthetic/Library/ChangedBeforeSave');assert.equal(saved.stored.libraryPath,'Synthetic/Library/Local');assert.equal(saved.editing,false)
 })

 await test('return cancels transient editing ownership and reopening reads the saved preference',async()=>{
  await reset();await pathInput().fill('Synthetic/Library/Cancelled');await page.waitForFunction(()=>window.fixture.inspect().editing)
  await page.getByRole('link',{name:'返回素材工作区',exact:true}).click();await page.getByRole('heading',{name:'Fixture workspace',exact:true}).waitFor();await page.waitForFunction(()=>!window.fixture.inspect().editing)
  const cancelled=await inspect();assert.deepEqual(cancelled.writes,[]);assert.equal(cancelled.stored.libraryPath,'Synthetic/Library/Base')
  await page.getByRole('link',{name:'重新打开设置',exact:true}).click();await pathInput().waitFor();assert.equal(await pathInput().inputValue(),'Synthetic/Library/Base');assert.equal(await save().isDisabled(),true)
 })

 await test('input entered during save stays unsaved and the next commit uses the returned saved baseline',async()=>{
  await reset();await pathInput().fill('Synthetic/Library/Submitted');await page.evaluate(()=>window.fixture.hold());await save().click();await page.waitForFunction(()=>window.fixture.inspect().pendingWrite)
  await pathInput().fill('Synthetic/Library/LaterInput');await page.evaluate(()=>window.fixture.release());await page.getByText('偏好已保存。',{exact:true}).waitFor()
  const first=await inspect();assert.equal(first.stored.libraryPath,'Synthetic/Library/Submitted');assert.equal(await pathInput().inputValue(),'Synthetic/Library/LaterInput');assert.equal(first.editing,true);assert.equal(await save().isEnabled(),true)
  assert.deepEqual(first.writes,[{patch:{libraryPath:'Synthetic/Library/Submitted'},expected:{libraryPath:'Synthetic/Library/Base'}}])
  await save().click();await page.waitForFunction(()=>window.fixture.inspect().writes.length===2&&!window.fixture.inspect().editing)
  const final=await inspect();assert.deepEqual(final.writes[1],{patch:{libraryPath:'Synthetic/Library/LaterInput'},expected:{libraryPath:'Synthetic/Library/Submitted'}});assert.equal(final.stored.libraryPath,'Synthetic/Library/LaterInput');assert.equal(await save().isDisabled(),true)
 })
 for(const failedRead of [false,true])await test('a committed preference with a lost receipt stays unknown, including following read failure='+failedRead,async()=>{
  await reset();await pathInput().fill('Synthetic/Library/CommittedBeforeLostResponse');await page.evaluate(failed=>window.fixture.loseReply(failed),failedRead)
  await save().click();await page.getByRole('alert').waitFor()
  const notice=await page.getByRole('alert').innerText();assert.match(notice,/操作结果尚未确认/);assert.match(notice,/检查保存结果，勿重复提交/);assert.equal(notice.includes('偏好未保存'),false)
  const state=await inspect();assert.equal(state.stored.libraryPath,'Synthetic/Library/CommittedBeforeLostResponse');assert.equal(await pathInput().inputValue(),'Synthetic/Library/CommittedBeforeLostResponse');assert.equal(state.writes.length,1)
  if(failedRead)assert.equal(state.editing,true)
  else{await page.getByRole('link',{name:'返回素材工作区',exact:true}).click();await page.getByRole('link',{name:'重新打开设置',exact:true}).click();await pathInput().waitFor();assert.equal(await pathInput().inputValue(),'Synthetic/Library/CommittedBeforeLostResponse');assert.equal((await inspect()).writes.length,1)}
 })
 assert.deepEqual(errors,[],'isolated Settings route must not emit React/runtime errors')
}finally{await app.close();await fs.rm(root,{recursive:true,force:true})}
