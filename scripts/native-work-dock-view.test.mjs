// Controlled actual Renderer regression, not a physical mouse/drop acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-native-dock-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import WorkSetWindow from './src/renderer/routes/WorkSetWindow';
let snapshot={token:'native:dock-fixture',scope:{libraryIdentity:'library:fixture',generation:'generation:fixture'},set:{id:'work-set:fixture',name:'Fixture native reference',revision:1,assetIds:['asset:alpha','asset:beta'],unavailableIds:[],columns:2},assets:['alpha','beta'].map(id=>({id:'asset:'+id,title:id,revision:'one',thumbnailRef:'fixture',aiCaption:'Fixture caption',tags:[],fileType:'png'})),pinned:true,geometry:{x:200,y:100,width:420,height:640,pinned:true,open:true},theme:'light'};
const calls={handoffs:[],drags:[],actions:[]};let listener,delayed=false,saveDelayed=false,waiting=[],saveWaiter,sequence=0;
const receipt=value=>({success:true,value:{id:'handoff:'+ ++sequence,fileName:'fixture-copy.png',bytes:128,sha256:'a'.repeat(64),kind:value.request.kind,status:'prepared',message:'Controlled copy prepared'}});
const commit=value=>{snapshot={...snapshot,set:{...snapshot.set,...value.value,revision:snapshot.set.revision+1}};listener(snapshot);return{success:true,value:snapshot}};
window.workWindowAPI={inspect:async()=>({success:true,value:snapshot}),onState:fn=>{listener=fn;return()=>{}},act:async value=>{calls.actions.push(value);
 if(value.kind==='dock'){const g=snapshot.geometry;snapshot={...snapshot,geometry:{x:value.edge==='left'?0:1128,y:g.y,width:72,height:160,pinned:g.pinned,open:true,dock:{edge:value.edge,normalBounds:{x:g.x,y:g.y,width:g.width,height:g.height}}}};listener(snapshot)}
 if(value.kind==='undock'){const{dock,...normal}=snapshot.geometry;snapshot={...snapshot,geometry:{...normal,...dock.normalBounds}};listener(snapshot)}
 if(value.kind==='save'){if(saveDelayed)return new Promise(resolve=>saveWaiter={value,resolve});return commit(value)}
 return{success:true,value:snapshot}},notebookRead:async()=>({success:false,error:'Fixture notebook unavailable'}),notebookSave:async()=>({success:false,error:'NOT_USED'}),mediaRead:async()=>({success:false,error:'NOT_USED'}),mediaWrite:async()=>({success:false,error:'NOT_USED'}),mediaCancel:async()=>({success:true,value:{message:'NOT_USED'}}),fileHandoff:async value=>{calls.handoffs.push(value);if(delayed)return new Promise(resolve=>waiting.push({value,resolve}));return receipt(value)},dragFile:async value=>{calls.drags.push(value);return{success:true,value:{message:'已开始原生文件交接；请在接收应用中核对结果。'}}},dragFiles:async()=>({success:false,error:'NOT_USED'})};
window.nativeDraftsAPI={put:async()=>{},remove:async()=>{},ready:async()=>{},acknowledge:async()=>{},onFlush:()=>()=>{},onState:()=>()=>{}};
window.fixture={inspect:()=>structuredClone(calls),waiting:()=>waiting.length,delay:value=>{delayed=value},resolve:()=>{const next=waiting.shift();if(!next)throw Error('NO_PENDING');next.resolve(receipt(next.value))},saveDelay:value=>{saveDelayed=value},saveWaiting:()=>Boolean(saveWaiter),saveResolve:()=>{const next=saveWaiter;saveWaiter=undefined;next.resolve(commit(next.value))},snapshot:()=>structuredClone(snapshot),unmount:()=>rendererRoot.unmount(),newScope:()=>{snapshot={...snapshot,token:'native:new-scope',scope:{libraryIdentity:'library:next',generation:'generation:next'},set:{...snapshot.set,name:'new scope fixture note'}};listener(snapshot)}};const rendererRoot=createRoot(document.getElementById('root'));rendererRoot.render(<WorkSetWindow/>);
`}})
await fs.writeFile(path.join(root,'reference.png'),await sharp({create:{width:8,height:8,channels:3,background:'#446688'}}).png().toBuffer())
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow,protocol,session}=require('electron'),fs=require('node:fs');protocol.registerSchemesAsPrivileged([{scheme:'dam-preview',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((r,done)=>done({cancel:!r.url.startsWith('file:')&&!r.url.startsWith('dam-preview:')}));protocol.handle('dam-preview',()=>new Response(fs.readFileSync(${JSON.stringify(path.join(root,'reference.png'))}),{headers:{'Content-Type':'image/png'}}));new BrowserWindow({show:false,frame:false,width:1000,height:1100,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit())`)
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','ELECTRON_RENDERER_URL'].includes(k)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow();page.setDefaultTimeout(6000)
 const picture=id=>page.getByRole('button',{name:'查看参考 '+id,exact:true})
 const inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const left=()=>page.locator('button').filter({hasText:/^左侧停靠$/})
 const right=()=>page.locator('button').filter({hasText:/^右侧停靠$/})
 const note=()=>page.getByRole('textbox',{name:'工作集名称',exact:true})
 const expand=()=>page.getByRole('button',{name:/^展开工作窗口 /})
 const resize=async(width,height)=>{await app.evaluate(({BrowserWindow},{width,height})=>BrowserWindow.getAllWindows()[0].setSize(width,height),{width,height})}
 await picture('alpha').waitFor();assert.equal(await page.locator('.minimal-prototype').count(),1);assert.equal(await page.locator('.work-dock-tab').count(),0)
 await note().fill('dirty retained draft');await left().click();await expand().waitFor()
 let actions=(await inspect()).actions;assert.deepEqual(actions.find(a=>a.kind==='dock'),{token:'native:dock-fixture',kind:'dock',edge:'left'})
 assert.equal(await note().count(),0);assert.equal(await page.getByText('2份参考 · 未保存',{exact:true}).count(),1)
 await resize(72,160);const compact=await page.locator('.work-dock-tab').boundingBox();assert.equal(Math.round(compact.width),72);assert.equal(Math.round(compact.height),160)
 assert.equal(await page.getByRole('button',{name:/^隐藏 /}).count(),1)
 await expand().click();await resize(1000,1100);await note().waitFor();assert.equal(await note().inputValue(),'dirty retained draft');assert.equal(await page.locator('.minimal-prototype').count(),1)
 assert.deepEqual((await inspect()).actions.find(a=>a.kind==='undock'),{token:'native:dock-fixture',kind:'undock'})
 await right().click();await expand().waitFor();assert.equal((await page.evaluate(()=>window.fixture.snapshot())).geometry.dock.edge,'right');await expand().click();await note().waitFor();assert.equal(await note().inputValue(),'dirty retained draft')
 // Focus and both preparation entry points disable docking without changing native geometry.
 await picture('alpha').click();await page.getByRole('button',{name:'关闭专注模式',exact:true}).waitFor();assert.equal(await left().isDisabled(),true);assert.equal(await right().isDisabled(),true)
 await page.getByRole('button',{name:'关闭专注模式',exact:true}).click();assert.equal(await left().isDisabled(),false)
 await page.evaluate(()=>window.fixture.delay(true));await page.getByRole('button',{name:'准备全部拖出',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1);assert.equal(await left().isDisabled(),true)
 await page.getByRole('button',{name:'停止后续准备',exact:true}).click();await page.evaluate(()=>window.fixture.resolve());await page.getByText('原件副本已准备 · 可拖出',{exact:true}).waitFor();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='左侧停靠').disabled)
 await page.evaluate(()=>window.fixture.delay(false));await page.getByRole('button',{name:'交付 alpha',exact:true}).click()
 const handoffKind=()=>page.getByRole('combobox',{name:'交付内容',exact:true})
 await handoffKind().selectOption('preview');await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.getByText('预览副本已准备 · 可拖出',{exact:true}).waitFor();assert.equal(await page.getByText('原件副本已准备 · 可拖出',{exact:true}).count(),0)
 await handoffKind().selectOption('processed-image');await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.getByText('图像处理副本已准备 · 可拖出',{exact:true}).waitFor()
 await handoffKind().selectOption('compatible-png');await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.getByText('兼容 PNG 副本已准备 · 可拖出',{exact:true}).waitFor()
 await picture('alpha').dispatchEvent('dragstart');await page.getByText('已开始原生文件交接；请在接收应用中核对结果。',{exact:true}).waitFor();assert.equal((await inspect()).drags.length,1)
 await handoffKind().selectOption('original');await page.evaluate(()=>window.fixture.delay(true));await page.getByRole('button',{name:'交付 beta',exact:true}).click();await page.getByRole('button',{name:'准备交付副本',exact:true}).click();await page.waitForFunction(()=>window.fixture.waiting()===1);assert.equal(await right().isDisabled(),true,'single in-flight preparation also blocks docking')
 await page.evaluate(()=>window.fixture.resolve());await page.getByText('原件副本已准备 · 可拖出',{exact:true}).waitFor();assert.equal(await right().isDisabled(),false)
 await page.evaluate(()=>window.fixture.saveDelay(true));await page.getByRole('button',{name:/^保存 /}).click();await page.waitForFunction(()=>window.fixture.saveWaiting());assert.equal(await left().isDisabled(),true);assert.equal(await right().isDisabled(),true)
 await page.evaluate(()=>window.fixture.saveResolve());await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='右侧停靠').disabled)
 await page.evaluate(()=>window.fixture.newScope());await page.waitForFunction(()=>document.querySelector('input[aria-label="工作集名称"]')?.value==='new scope fixture note');await right().click();await expand().waitFor()
 const lastDock=(await inspect()).actions.filter(a=>a.kind==='dock').at(-1);assert.deepEqual(lastDock,{token:'native:new-scope',kind:'dock',edge:'right'})
 await expand().click();await note().waitFor();assert.equal(await note().inputValue(),'new scope fixture note')
 console.log('Actual React docking: token/left-right/undock commands, 72×160 compact DOM, expanded ordinary layout, draft/scope retention, focus/batch/single-preparation/save blockers, original-preview-processed-compatible readiness labels and honest drag feedback. Controlled window/bridge; physical docking qualification separate.')

}finally{await (await app.firstWindow()).evaluate(()=>window.fixture.unmount()).catch(()=>{});await app.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-native-dock-view-'));await fs.rm(root,{recursive:true,force:true})}
