// Isolated React/Client regression; generated references and a private Electron
// profile only. This does not constitute formal product Computer Use acceptance.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import sharp from 'sharp'
import {_electron as electron} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-work-reference-')))
const profile=path.join(root,'profile'),fixture=path.join(root,'fixture.js')
await fs.mkdir(profile)
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:fixture,logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React,{useState}from'react';import{createRoot}from'react-dom/client';
 import{WorkSetReferenceView}from'./src/renderer/components/library/canvas/WorkSetReferenceView';
 import{useWorkSets}from'./src/renderer/components/library/canvas/useWorkSets';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{rememberRecoveredDraft,clearWorkspaceDraftView,flushWorkspaceDrafts,isWorkspaceDraftLoaded,currentWorkspaceDraft}from'./src/renderer/workspace-drafts';
 import'./src/renderer/components/gallery/tokens.css';import'./src/renderer/components/gallery/gallery.css';
 const scope={libraryIdentity:'library:fixture',generation:'generation:fixture'},id='work-set:fixture';
 const original={name:'Reference set',note:'Saved note',assetIds:['asset:alpha','asset:beta','asset:gamma'],colors:['#112233'],columns:2};
 const assets=['Alpha','Beta','Gamma','Delta'].map(title=>({id:'asset:'+title.toLowerCase(),title,fileUrl:'dam-preview://fixture/'+title.toLowerCase(),tags:[],fileType:'png',sourceSiteName:'Synthetic fixture'}));
 const clone=v=>structuredClone(v),key=s=>JSON.stringify([s.libraryIdentity,s.generation,s.kind,s.entityId]),draftScope={...scope,kind:'work-set',entityId:id};
 const drafts=new Map(),writes=[],controls=[],opened=[],previews=[],located=[],listeners=new Set();
 let revision=0,closed=0,renderVersion=0,catalog,holdWrite=false,releaseWrite=null,pendingWrite=false,native=[];
 const catalogFor=(rev=7,value=original)=>({sets:[{...clone(value),id,revision:rev,unavailableIds:[],layout:null}],sessionToken:'session:fixture',requiresUpgrade:false});
 catalog=catalogFor();
 const notify=()=>{for(const listener of listeners)listener()};
 installWorkspaceClient({transitions:{ready:async()=>{}},drafts:{put:async input=>{const record={...clone(input),id:'draft:fixture',revision:++revision,updatedAt:1,clientKind:'browser',owned:true,activeElsewhere:false};drafts.set(key(input),record);return clone(record)},remove:async input=>{drafts.delete(key(input))},list:async()=>clone([...drafts.values()])},workSets:{
  read:async input=>({success:true,value:clone(catalog)}),
  write:async input=>{writes.push(clone(input));if(holdWrite){pendingWrite=true;await new Promise(resolve=>releaseWrite=resolve);pendingWrite=false}const command=input.command;if(command.kind==='save'){const current=catalog.sets.find(set=>set.id===command.id);if(!current||current.revision!==command.expectedRevision)return{success:false,error:'SYNTHETIC_WORK_SET_CONFLICT'};catalog={...catalog,sets:catalog.sets.map(set=>set.id===command.id?{...set,...clone(command.value),revision:set.revision+1}:set)}}else if(command.kind==='create'){catalog={...catalog,sets:[...catalog.sets,{...clone(command.value),id:'work-set:copy',revision:1,unavailableIds:[],layout:null}]}}else throw Error('DELETE_MUST_NOT_BE_CALLED');return{success:true,value:clone(catalog)}},
  open:async input=>{opened.push(clone(input));return{success:true,value:null}},restore:async()=>({success:true,value:null}),recover:async()=>({success:true,value:null}),hideLibrary:async()=>({success:true,value:null}),
  windows:async input=>({success:true,value:clone(native)}),
  control:async input=>{controls.push(clone(input));const value=native.find(window=>window.id===input.id);if(!value)return{success:false,error:'SYNTHETIC_WINDOW_MISSING'};if(input.kind==='pin')value.pinned=input.pinned;if(input.kind==='hide')value.visible=false;if(input.kind==='recover')value.visible=true;if(input.kind==='close')value.open=false;return{success:true,value:{status:'applied',window:clone(value)}}},
  onChanged:listener=>{listeners.add(listener);return()=>listeners.delete(listener)}
 }});
 const app=createRoot(document.getElementById('root'));let reopen=()=>{};
 function App(){const [open,setOpen]=useState(true),model=useWorkSets({state:'ready',identity:scope.libraryIdentity,generation:scope.generation},'stable');reopen=()=>setOpen(true);return model.catalog&&open?<WorkSetReferenceView id={id} model={model} assets={assets} close={()=>{closed++;setOpen(false)}} preview={(asset,orderedIds)=>previews.push({id:asset.id,orderedIds:clone(orderedIds)})} locate={asset=>located.push(asset.id)}/>:null}
 window.fixture={flush:flushWorkspaceDrafts,inspect:()=>clone({drafts:[...drafts.values()],writes,controls,opened,previews,located,closed,catalog,assetIds:assets.map(asset=>asset.id),pendingWrite,loaded:isWorkspaceDraftLoaded(draftScope),local:currentWorkspaceDraft(draftScope)}),
  remote:()=>{const current=catalog.sets.find(set=>set.id===id);catalog=catalogFor(current.revision+2,{...current,note:'Saved by other client'});notify()},removeTarget:()=>{catalog={...catalog,sets:[]};notify()},reopen:()=>reopen(),hold:()=>{holdWrite=true},release:()=>{holdWrite=false;releaseWrite?.();releaseWrite=null},
  reset:async mode=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));await flushWorkspaceDrafts();clearWorkspaceDraftView();drafts.clear();writes.length=0;controls.length=0;opened.length=0;previews.length=0;located.length=0;closed=0;holdWrite=false;releaseWrite=null;pendingWrite=false;catalog=catalogFor();native=mode==='native'?[{id,open:true,pinned:false,visible:true,hasUnsaved:false}]:[];
   if(mode==='recovered'||mode==='recovered-clean'){const record={...draftScope,value:{...clone(original),note:mode==='recovered-clean'?'Old saved baseline':'Recovered input'},base:{revision:3,value:{...clone(original),note:'Old saved baseline'}},id:'draft:fixture',revision:1,updatedAt:1,clientKind:'browser',owned:true,activeElsewhere:false};drafts.set(key(record),clone(record));rememberRecoveredDraft(record)}
   app.render(<App key={++renderVersion}/>)}
 };
`}})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src dam-preview:; connect-src 'none'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>`)
const png=await sharp({create:{width:8,height:8,channels:3,background:'#446688'}}).png().toBuffer()
await fs.writeFile(path.join(root,'reference.png'),png)
await fs.writeFile(path.join(root,'main.cjs'),`
 const{app,BrowserWindow,session,protocol}=require('electron'),fs=require('node:fs');
 protocol.registerSchemesAsPrivileged([{scheme:'dam-preview',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 for(const name of ['userData','sessionData','logs','crashDumps']){const directory=${JSON.stringify(profile)}+'/'+name;fs.mkdirSync(directory,{recursive:true});app.setPath(name,directory)}
 app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((request,done)=>done({cancel:!request.url.startsWith('file:')&&!request.url.startsWith('dam-preview://fixture/')}));protocol.handle('dam-preview',()=>new Response(fs.readFileSync(${JSON.stringify(path.join(root,'reference.png'))}),{headers:{'Content-Type':'image/png'}}));const window=new BrowserWindow({show:false,width:1280,height:1100,webPreferences:{contextIsolation:true,nodeIntegration:false}});window.loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit());
`)
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL','NODE_OPTIONS'].includes(key)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow(),errors=[],nativeDialogs=[];page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{nativeDialogs.push(dialog.type());await dialog.dismiss()});await page.waitForFunction(()=>Boolean(window.fixture))
 const reset=async mode=>{await page.evaluate(mode=>window.fixture.reset(mode),mode);await page.getByRole('dialog').waitFor();await page.getByRole('textbox',{name:'工作备注',exact:true}).waitFor()}
 const inspect=async()=>{await page.evaluate(()=>window.fixture.flush());return page.evaluate(()=>window.fixture.inspect())}
 const note=()=>page.getByRole('textbox',{name:'工作备注',exact:true})
 const save=()=>page.getByRole('button',{name:'保存 Reference set',exact:true})
 const originalValue={name:'Reference set',note:'Saved note',assetIds:['asset:alpha','asset:beta','asset:gamma'],colors:['#112233'],columns:2}

 await test('shared reference panel shows multiple real fixture previews; reorder/remove only affect references',async()=>{
  await reset();assert.equal(await page.locator('.reference-item').count(),3);await page.waitForFunction(()=>[...document.querySelectorAll('.reference-picture img')].every(image=>image.naturalWidth===8))
  await page.getByRole('button',{name:'前移 Beta',exact:true}).click();await page.getByRole('button',{name:'从 Reference set 移除 Alpha',exact:true}).click()
  await page.getByRole('button',{name:'添加参考',exact:true}).click();await page.getByRole('button',{name:'添加参考 Delta',exact:true}).click()
  const state=await inspect();assert.deepEqual(state.drafts[0].value.assetIds,['asset:beta','asset:gamma','asset:delta']);assert.deepEqual(state.assetIds,['asset:alpha','asset:beta','asset:gamma','asset:delta']);assert.deepEqual(state.writes,[])
  await page.getByRole('button',{name:'查看参考 Beta',exact:true}).click();assert.deepEqual((await inspect()).previews,[{id:'asset:beta',orderedIds:['asset:beta','asset:gamma','asset:delta']}])
 })
 await test('save carries the original expected revision and accepts the catalog returned by the real model hook',async()=>{
  await reset();await note().fill('Explicit save');await save().click();await page.getByText('已保存工作集',{exact:true}).waitFor()
  const state=await inspect();assert.deepEqual(state.writes,[{libraryIdentity:'library:fixture',generation:'generation:fixture',sessionToken:'session:fixture',allowUpgrade:false,command:{kind:'save',id:'work-set:fixture',expectedRevision:7,value:{...originalValue,note:'Explicit save'}}}]);assert.equal(state.catalog.sets[0].revision,8);assert.deepEqual(state.drafts,[])
 })
 await test('dirty edits keep their baseline on remote updates; only explicit adoption permits the later revision',async()=>{
  await reset();await note().fill('Local dirty input');await page.evaluate(()=>window.fixture.remote());await page.getByText('工作集已在另一界面修改。页面草稿仍保留。',{exact:true}).waitFor()
  assert.equal(await note().inputValue(),'Local dirty input');assert.equal((await inspect()).drafts[0].base.revision,7);await save().click();assert.deepEqual((await inspect()).writes,[])
  await page.getByText('核对当前已保存内容',{exact:true}).click();await page.getByText('Saved by other client',{exact:true}).waitFor();await page.getByRole('button',{name:'核对后采用当前工作集为基准',exact:true}).click();assert.equal(await note().inputValue(),'Local dirty input')
  const adopted=await inspect();assert.equal(adopted.drafts[0].base.revision,9);assert.equal(adopted.drafts[0].base.value.note,'Saved by other client');await save().click();await page.getByText('已保存工作集',{exact:true}).waitFor();assert.equal((await inspect()).writes[0].command.expectedRevision,9)
 })
 await test('recovered input preserves its older baseline until reviewed explicit adoption',async()=>{
  await reset('recovered');assert.equal(await note().inputValue(),'Recovered input');await note().fill('Further recovered edit');const before=await inspect();assert.equal(before.drafts[0].base.revision,3);assert.equal(before.drafts[0].base.value.note,'Old saved baseline');await save().click();assert.deepEqual((await inspect()).writes,[])
  await page.getByRole('button',{name:'核对后采用当前工作集为基准',exact:true}).click();await save().click();await page.getByText('已保存工作集',{exact:true}).waitFor();const state=await inspect();assert.equal(state.writes[0].command.expectedRevision,7);assert.equal(state.writes[0].command.value.note,'Further recovered edit');assert.deepEqual(state.drafts,[])
 })
 await test('a recovered value equal to its old baseline still requires an explicit recovery choice',async()=>{
  await reset('recovered-clean');const before=await inspect();assert.equal(before.drafts.length,1,'mounting a recovered record must not remove it merely because its input equals its older baseline');assert.equal(before.drafts[0].base.revision,3);assert.equal(before.drafts[0].value.note,'Old saved baseline');assert.equal(await note().inputValue(),'Old saved baseline','clean recovery must not automatically adopt a newer catalog')
  await page.getByText('工作集已在另一界面修改。页面草稿仍保留。',{exact:true}).waitFor();await save().click();assert.deepEqual((await inspect()).writes,[])
  await page.getByText('核对当前已保存内容',{exact:true}).click();await page.getByText('Saved note',{exact:true}).waitFor();await page.getByRole('button',{name:'核对后采用当前工作集为基准',exact:true}).click();assert.equal(await note().inputValue(),'Old saved baseline');await save().click();await page.getByText('已保存工作集',{exact:true}).waitFor();const saved=await inspect();assert.equal(saved.writes[0].command.expectedRevision,7);assert.equal(saved.writes[0].command.value.note,'Old saved baseline');assert.deepEqual(saved.drafts,[],'only the explicit successful commit clears the recovered record')
 })
 await test('a deleted target cannot save normally and explicit Save As creates the preserved value',async()=>{
  await reset();await note().fill('Unsaved deleted-target input');await page.evaluate(()=>window.fixture.removeTarget());await page.getByText('原工作集已不存在或暂不可用，页面草稿仍保留。',{exact:true}).waitFor();await save().click();assert.deepEqual((await inspect()).writes,[])
  await page.getByRole('button',{name:'另存工作集',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});const state=await inspect();assert.deepEqual(state.writes[0].command,{kind:'create',value:{...originalValue,name:'Reference set 副本',note:'Unsaved deleted-target input'}});assert.deepEqual(state.drafts,[]);assert.equal(state.closed,1);assert.equal(state.catalog.sets[0].id,'work-set:copy');assert.equal(state.assetIds.length,4)
 })
 await test('return flushes and suspends the draft; reopening retains input and original baseline',async()=>{
  await reset();await note().fill('Return-and-reopen input');await page.getByRole('button',{name:'返回工作模式',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});const suspended=await inspect();assert.equal(suspended.closed,1);assert.equal(suspended.loaded,false);assert.equal(suspended.drafts[0].value.note,'Return-and-reopen input');assert.equal(suspended.drafts[0].base.revision,7)
  await page.evaluate(()=>window.fixture.reopen());await page.getByRole('dialog').waitFor();assert.equal(await note().inputValue(),'Return-and-reopen input');assert.equal((await inspect()).drafts[0].base.revision,7)
 })
 await test('native controls use only the scoped windows/control seam and retain page edits',async()=>{
  await reset('native');await note().fill('Browser draft beside native window');await page.getByRole('button',{name:'开启置顶 Reference set',exact:true}).click();await page.getByRole('button',{name:'取消置顶 Reference set',exact:true}).waitFor();await page.getByRole('button',{name:'隐藏 Reference set',exact:true}).click();await page.getByText('桌面窗口已隐藏',{exact:true}).waitFor();await page.getByRole('button',{name:'找回桌面窗口',exact:true}).click();await page.getByText('桌面窗口可见',{exact:true}).waitFor();await page.getByRole('button',{name:'关闭桌面窗口',exact:true}).click();await page.getByRole('button',{name:'开启置顶 Reference set',exact:true}).waitFor({state:'detached'});const state=await inspect();assert.deepEqual(state.controls.map(command=>command.kind),['pin','hide','recover','close']);for(const command of state.controls){assert.equal(command.libraryIdentity,'library:fixture');assert.equal(command.generation,'generation:fixture');assert.equal(command.id,'work-set:fixture');assert.equal('token'in command,false)}assert.equal(state.drafts[0].value.note,'Browser draft beside native window');assert.deepEqual(state.writes,[])
 })
 await test('editing during save keeps a new draft based on the returned committed revision',async()=>{
  await reset();await note().fill('Submitted note');await page.evaluate(()=>window.fixture.hold());await save().click();await page.waitForFunction(()=>window.fixture.inspect().pendingWrite);await note().fill('New input during save');await page.evaluate(()=>window.fixture.release());await page.getByText('此次保存已完成，新编辑尚未保存。',{exact:true}).waitFor();const state=await inspect();assert.equal(state.catalog.sets[0].note,'Submitted note');assert.equal(state.drafts[0].value.note,'New input during save');assert.equal(state.drafts[0].base.revision,8);await save().click();await page.getByText('已保存工作集',{exact:true}).waitFor();assert.equal((await inspect()).writes[1].command.expectedRevision,8)
 })
 await test('editing during Save As never discards the later unsaved input',async()=>{
  await reset();await note().fill('Submitted copy note');await page.evaluate(()=>window.fixture.hold());await page.getByRole('button',{name:'另存工作集',exact:true}).click();await page.waitForFunction(()=>window.fixture.inspect().pendingWrite);await note().fill('New input during Save As');await page.evaluate(()=>window.fixture.release());await page.waitForFunction(()=>!window.fixture.inspect().pendingWrite);await new Promise(resolve=>setTimeout(resolve,20));const state=await inspect();assert.equal(state.catalog.sets.find(set=>set.id==='work-set:copy').note,'Submitted copy note');assert.ok(state.drafts.some(draft=>draft.value.note==='New input during Save As'),'Save As must preserve input entered after its snapshot rather than removing the source draft and closing it')
 })
 await test('locating a reference flushes and closes before delivering the selected asset',async()=>{
  await reset();await note().fill('Draft before locate');await page.getByRole('button',{name:'在资料库检查',exact:true}).first().click();await page.getByRole('dialog').waitFor({state:'detached'});await page.waitForFunction(()=>window.fixture.inspect().located.length===1);const state=await inspect();assert.deepEqual(state.located,['asset:alpha']);assert.equal(state.drafts[0].value.note,'Draft before locate');assert.equal(state.loaded,false)
 })
 await test('discard review cannot save or remove input until explicit confirmation; cancel and Escape preserve it',async()=>{
  await reset();await note().fill('Retain this page draft');const before=await inspect()
  await page.getByRole('button',{name:'放弃页面草稿',exact:true}).click();await page.getByRole('alertdialog',{name:'放弃页面草稿',exact:true}).waitFor()
  assert.deepEqual((await inspect()).drafts,before.drafts);assert.deepEqual((await inspect()).writes,[])
  await page.keyboard.press('Control+s');assert.deepEqual((await inspect()).writes,[],'save shortcut is blocked while discard is being reviewed')
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await note().inputValue(),'Retain this page draft');assert.deepEqual((await inspect()).drafts,before.drafts)
  await page.getByRole('button',{name:'放弃页面草稿',exact:true}).click();await page.getByRole('alertdialog',{name:'放弃页面草稿',exact:true}).waitFor();await page.keyboard.press('Escape')
  assert.equal(await note().inputValue(),'Retain this page draft');const cancelled=await inspect();assert.equal(cancelled.closed,0);assert.deepEqual(cancelled.drafts,before.drafts);assert.deepEqual(cancelled.catalog,before.catalog);assert.deepEqual(cancelled.writes,[])
 })
 await test('confirmed discard restores the saved version and removes only the page draft without a library write',async()=>{
  await reset('recovered');const before=await inspect();await page.getByRole('button',{name:'放弃页面草稿',exact:true}).click();await page.getByRole('button',{name:'确认放弃页面草稿',exact:true}).click()
  assert.equal(await note().inputValue(),'Saved note');const discarded=await inspect();assert.deepEqual(discarded.drafts,[]);assert.deepEqual(discarded.catalog,before.catalog);assert.deepEqual(discarded.writes,[]);assert.equal(discarded.closed,0);assert.equal(discarded.loaded,false)
 })
 await test('confirmed discard of a missing target closes the preserved editor without creating or deleting saved content',async()=>{
  await reset();await note().fill('Missing target draft');await page.evaluate(()=>window.fixture.removeTarget());await page.getByText('原工作集已不存在或暂不可用，页面草稿仍保留。',{exact:true}).waitFor();const before=await inspect()
  await page.getByRole('button',{name:'放弃页面草稿',exact:true}).click();await page.getByRole('button',{name:'确认放弃页面草稿',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'})
  const discarded=await inspect();assert.deepEqual(discarded.drafts,[]);assert.deepEqual(discarded.catalog,before.catalog);assert.deepEqual(discarded.writes,[]);assert.equal(discarded.closed,1);assert.deepEqual(discarded.assetIds,before.assetIds)
 })
 assert.deepEqual(errors,[],'isolated view must not emit React/runtime errors')
 assert.deepEqual(nativeDialogs,[],'all discard decisions must use the page confirmation')
}finally{await app.close();await fs.rm(root,{recursive:true,force:true})}
