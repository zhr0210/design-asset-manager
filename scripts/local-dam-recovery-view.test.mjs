// Real WorkspaceRecovery and shared ReviewSheet in a private Chromium context.
// Synthetic Client records/local unsent input only; this is isolated component
// verification, not formal product Computer Use or a real Library write.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-recovery-view-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase(),'cleanup is limited to the allocated temporary fixture')
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
 import WorkspaceRecovery from'./src/renderer/components/layout/WorkspaceRecovery';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{useLibraryViewStore}from'./src/renderer/stores/library-view.store';
 import{useAssetStore}from'./src/renderer/stores/asset.store';
 import{holdWorkspaceDraft,clearWorkspaceDraftView,archivedWorkspaceDrafts,forgetArchivedWorkspaceDraft,rememberRecoveredDraft,suspendRecoveredWorkspaceDraft,currentWorkspaceDraft,isWorkspaceDraftLoaded,workspaceDraftStatus}from'./src/renderer/workspace-drafts';
 import'./src/renderer/components/gallery/tokens.css';import'./src/renderer/styles/file-picker.css';
 const scope={libraryIdentity:'library:fixture',generation:'generation:fixture'},saved={id:'asset:fixture',title:'Synthetic asset',description:'Original saved description'},clone=value=>structuredClone(value);
 const original={...scope,kind:'description',entityId:saved.id,value:'Received unsaved description',base:saved.description,id:'draft:fixture',revision:7,updatedAt:1,clientKind:'browser',owned:false,activeElsewhere:false};
 const listeners=new Set(),workspaceListeners=new Set(),calls=[];let records=[],fail=false,lists=0;
 installWorkspaceClient({transitions:{ready:async()=>{}},drafts:{list:async()=>{lists++;return clone(records)},discard:async input=>{calls.push(clone(input));if(fail||!records.some(record=>record.id===input.id&&record.revision===input.revision))throw Error('SYNTHETIC_CHANGED');records=records.filter(record=>record.id!==input.id)},put:async()=>{throw Error('UNEXPECTED_PUT')},remove:async()=>{throw Error('UNEXPECTED_REMOVE')},recover:async()=>{throw Error('UNEXPECTED_RECOVER')}},
  onDraftsChanged:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},onWorkspaceChanged:listener=>{workspaceListeners.add(listener);return()=>workspaceListeners.delete(listener)}
 });
 const app=createRoot(document.getElementById('root')),settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 window.fixture={inspect:()=>clone({records,calls,saved,local:currentWorkspaceDraft(original),loaded:isWorkspaceDraftLoaded(original),draftStatus:workspaceDraftStatus(),archived:archivedWorkspaceDrafts(),listeners:listeners.size+workspaceListeners.size,lists}),fail:value=>{fail=value},
  changed:()=>{records=records.map(record=>({...record,revision:record.revision+1,value:'A newer received draft'}));for(const listener of listeners)listener()},
  changeScope:()=>{records=[];useLibraryViewStore.getState().setScope(JSON.stringify(['library:other','generation:other']))},
  reset:async mode=>{app.render(null);await settle();clearWorkspaceDraftView();for(const draft of archivedWorkspaceDrafts())forgetArchivedWorkspaceDraft(draft);records=mode==='local'?[]:[clone(original)];calls.length=0;fail=false;lists=0;useLibraryViewStore.getState().setScope(JSON.stringify([scope.libraryIdentity,scope.generation]));useAssetStore.setState({assets:[clone(saved)]});
   if(mode==='suspended'){records[0].owned=true;rememberRecoveredDraft(records[0]);suspendRecoveredWorkspaceDraft(records[0])}
   if(mode==='local'){holdWorkspaceDraft({...scope,kind:'description',entityId:saved.id},'Unsent synthetic description',saved.description);clearWorkspaceDraftView()}
   app.render(<MemoryRouter><WorkspaceRecovery/></MemoryRouter>);await settle()
  },unmount:async()=>{app.render(null);await settle()}
 };
`}})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>`)
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[],external=[],nativeDialogs=[]
 page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{nativeDialogs.push(dialog.type());await dialog.dismiss()})
 await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(new URL(route.request().url()).origin);return route.abort()})
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture))
 const reset=async mode=>{await page.evaluate(mode=>window.fixture.reset(mode),mode);await page.getByRole('button',{name:'查看本机草稿',exact:true}).waitFor()}
 const inspect=()=>page.evaluate(()=>window.fixture.inspect())
 const open=async()=>{await page.getByRole('button',{name:'查看本机草稿',exact:true}).click();await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor()}
 const ask=async(local=false)=>{await page.getByRole('button',{name:local?'放弃未送达输入':'放弃暂存草稿',exact:true}).click();await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor()}
 const confirm=()=>page.getByRole('button',{name:'确认放弃草稿',exact:true})
 const originalSaved={id:'asset:fixture',title:'Synthetic asset',description:'Original saved description'}

 await test('received draft discard uses a page review; asking, cancel and Escape send no discard and preserve saved content',async()=>{
  await reset();await open();const before=await inspect();await ask();assert.deepEqual((await inspect()).calls,[]);assert.deepEqual((await inspect()).records,before.records)
  await page.getByRole('button',{name:'保留草稿',exact:true}).click();await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor();assert.deepEqual((await inspect()).records,before.records)
  await ask();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor();const state=await inspect();assert.deepEqual(state.calls,[]);assert.deepEqual(state.records,before.records);assert.deepEqual(state.saved,originalSaved)
 })
 await test('successful explicit discard carries the selected record revision and closes only after it succeeds',async()=>{
  await reset();await open();await ask();await confirm().click();await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor({state:'detached'});await page.getByText('当前素材库没有暂存草稿。',{exact:true}).waitFor()
  const state=await inspect();assert.deepEqual(state.calls.map(({id,revision})=>({id,revision})),[{id:'draft:fixture',revision:7}]);assert.ok(state.calls[0].writerId);assert.ok(state.calls[0].sequence>0);assert.deepEqual(state.records,[]);assert.deepEqual(state.saved,originalSaved)
 })
 await test('failed explicit discard retains its review and draft; a later successful retry removes only the draft',async()=>{
  await reset();await open();await ask();await page.evaluate(()=>window.fixture.fail(true));await confirm().click();await page.getByRole('alert').filter({hasText:'未能处理草稿'}).waitFor()
  assert.equal(await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).isVisible(),true);const failed=await inspect();assert.equal(failed.records[0].value,'Received unsaved description');assert.deepEqual(failed.saved,originalSaved);assert.equal(await confirm().isEnabled(),true)
  await page.evaluate(()=>window.fixture.fail(false));await confirm().click();await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor({state:'detached'});const retried=await inspect();assert.deepEqual(retried.calls.map(({id,revision})=>({id,revision})),[{id:'draft:fixture',revision:7},{id:'draft:fixture',revision:7}]);assert.ok(retried.calls[1].sequence>retried.calls[0].sequence);assert.equal(retried.calls[1].writerId,retried.calls[0].writerId);assert.deepEqual(retried.records,[]);assert.deepEqual(retried.saved,originalSaved)
 })
 await test('discarding this document\'s suspended recovery removes its local editor copy only after Host success',async()=>{
  await reset('suspended');await open();assert.equal((await inspect()).local.value,'Received unsaved description');await ask();await page.getByRole('button',{name:'保留草稿',exact:true}).click();await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor();assert.equal((await inspect()).local.value,'Received unsaved description')
  await ask();await page.evaluate(()=>window.fixture.fail(true));await confirm().click();await page.getByRole('alert').filter({hasText:'未能处理草稿'}).waitFor();assert.equal((await inspect()).local.value,'Received unsaved description')
  await page.evaluate(()=>window.fixture.fail(false));await confirm().click();await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor({state:'detached'});const state=await inspect();assert.deepEqual(state.records,[]);assert.equal(state.local,undefined,'ordinary editor reopen must read the saved value, not the discarded local copy');assert.equal(state.loaded,false);assert.equal(state.draftStatus,'none');assert.deepEqual(state.saved,originalSaved)
 })
 await test('a changed received record keeps the reviewed revision and cannot silently discard the newer draft',async()=>{
  await reset();await open();await ask();const reads=(await inspect()).lists;await page.evaluate(()=>window.fixture.changed());await page.waitForFunction(reads=>window.fixture.inspect().lists>reads,reads);await confirm().click();await page.getByRole('alert').filter({hasText:'未能处理草稿'}).waitFor()
  const state=await inspect();assert.deepEqual(state.calls.map(({id,revision})=>({id,revision})),[{id:'draft:fixture',revision:7}]);assert.equal(state.records[0].revision,8);assert.equal(state.records[0].value,'A newer received draft');assert.deepEqual(state.saved,originalSaved)
 })
 await test('unsent local input is retained on ask/cancel and forgotten only after explicit confirmation without a Host discard',async()=>{
  await reset('local');await open();const before=await inspect();await ask(true);assert.deepEqual((await inspect()).archived,before.archived);await page.getByRole('button',{name:'保留草稿',exact:true}).click();await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor();assert.deepEqual((await inspect()).archived,before.archived)
  await ask(true);await confirm().click();await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor({state:'detached'});const state=await inspect();assert.deepEqual(state.archived,[]);assert.deepEqual(state.calls,[]);assert.deepEqual(state.saved,originalSaved)
 })
 await test('changing Library scope withdraws either stale confirmation without discarding the received or local input',async()=>{
  for(const mode of ['received','local']){await reset(mode);await open();await ask(mode==='local');const before=await inspect();await page.evaluate(()=>window.fixture.changeScope());await page.getByRole('dialog',{name:'放弃这项草稿',exact:true}).waitFor({state:'detached'});assert.equal(await confirm().count(),0);const state=await inspect();assert.deepEqual(state.calls,[]);assert.deepEqual(state.archived,before.archived);assert.deepEqual(state.saved,originalSaved)}
 })
 await page.evaluate(()=>window.fixture.unmount());assert.equal((await inspect()).listeners,0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(nativeDialogs,[])
 await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
