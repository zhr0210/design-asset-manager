// Recovery navigation across About -> Library and while Library is already
// mounted. Real renderer components run in a private Chromium page with a
// synthetic Workspace Client; this is isolated component verification, not
// formal product Computer Use or access to a real library/profile.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-recovery-navigation-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase(),'fixture cleanup is limited to the allocated temporary directory')
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route}from'react-router-dom';
 import Library from'./src/renderer/routes/Library';import WorkspaceRecovery from'./src/renderer/components/layout/WorkspaceRecovery';
 import{AssetWorkspaceSessionContext}from'./src/renderer/asset-workspace-session.context';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{rememberRecoveredDraft,clearWorkspaceDraftView,currentWorkspaceDraft,takeRecoveredNavigation}from'./src/renderer/workspace-drafts';
 import{useLibraryViewStore}from'./src/renderer/stores/library-view.store';import{useAssetStore}from'./src/renderer/stores/asset.store';import{useSettingsStore}from'./src/renderer/stores/settings.store';
 import'./src/renderer/components/gallery/tokens.css';import'./src/renderer/styles/file-picker.css';
 const identity='library:fixture',generation='generation:fixture',scope={libraryIdentity:identity,generation},scopeKey=JSON.stringify([identity,generation]);
 const saved={id:'work-set:fixture',name:'Saved work set',note:'Saved baseline note',assetIds:['asset:fixture'],colors:['#123456'],columns:2,revision:7,unavailableIds:[],layout:null};
 const baseline={revision:7,value:{name:saved.name,note:saved.note,assetIds:[...saved.assetIds],colors:[...saved.colors],columns:saved.columns}};
 const recovered={...scope,kind:'work-set',entityId:saved.id,value:{...baseline.value,name:'Recovered work set',note:'Recovered unsaved note',assetIds:[...baseline.value.assetIds],colors:[...baseline.value.colors]},base:baseline,id:'draft:fixture',revision:11,updatedAt:1,clientKind:'browser',owned:false,activeElsewhere:false};
 const clone=value=>structuredClone(value);let records=[];const listeners=new Set();
 installWorkspaceClient({transitions:{ready:async()=>{}},drafts:{list:async()=>clone(records),recover:async()=>{const next={...clone(recovered),owned:true};records=[next];return clone(next)},discard:async()=>{},put:async()=>{},remove:async()=>{}},
  onDraftsChanged:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},onWorkspaceChanged:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
  workSets:{read:async()=>({success:true,value:{sets:[clone(saved)],sessionToken:'session:fixture',requiresUpgrade:false}}),onChanged:()=>()=>{},write:async()=>({success:true,value:{sets:[clone(saved)],sessionToken:'session:fixture',requiresUpgrade:false}}),open:async()=>({success:true}),restore:async()=>({success:true}),recover:async()=>({success:true}),hideLibrary:async()=>({success:true})},settings:{get:async()=>({})}});
 const projection={state:'ready',identity,generation};const session={getSnapshot:()=>({projection,error:'',reset:null}),subscribe:()=>()=>{},refresh:async()=>{},receive:async()=>{}};
 const asset={id:'asset:fixture',title:'Synthetic reference',fileName:'reference.png',filePath:'',thumbnailPath:'',sourceSiteId:'',sourceSiteName:'',sourcePageUrl:'',originalUrl:'',width:64,height:64,fileSize:1,fileType:'PNG',dominantColor:'#123456',browserPageTitle:'',captureMethod:'search',aiTagStatus:'not_started',aiTaggedAt:'',aiPromptStatus:'not_started',aiPrompt:'',aiCaption:'',aiCaptionSource:'',aiCaptionUpdatedAt:'',aiCaptionIsUserEdited:0,aiOcrText:'',aiOcrSource:'',aiOcrUpdatedAt:'',aiAnalysisStatus:'not_started',aiAnalysisJson:'',lastTagUpdatedAt:'',color_palette_json:'[]',tags:[],tagAliases:[],createdAt:1};
 const app=createRoot(document.getElementById('root')),settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 function render(pathname){app.render(<MemoryRouter initialEntries={[pathname]}><AssetWorkspaceSessionContext.Provider value={session}><WorkspaceRecovery/><Routes><Route path="/about" element={<main>About fixture</main>}/><Route path="/library" element={<Library/>}/></Routes></AssetWorkspaceSessionContext.Provider></MemoryRouter>)}
 window.fixture={inspect:()=>clone({local:currentWorkspaceDraft({...scope,kind:'work-set',entityId:saved.id}),navigation:takeRecoveredNavigation(identity)}),
  reset:async pathname=>{app.render(null);await settle();clearWorkspaceDraftView();records=[];useLibraryViewStore.getState().setScope(scopeKey);useAssetStore.setState({assets:[clone(asset)],tags:[],selectedAsset:null,assetLoadStatus:'ready',assetLoadError:null,hasLoadedAssets:true});useSettingsStore.setState({loadSettings:async()=>{}});records=[clone(recovered)];render(pathname);await settle()},
  changeScope:()=>useLibraryViewStore.getState().setScope(JSON.stringify(['library:other','generation:other'])),unmount:async()=>{app.render(null);await settle()}}
`}})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'"><div id="root"></div><script src="fixture.js"></script>`)
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[]
 page.setDefaultTimeout(6000);page.on('pageerror',error=>errors.push(error.message))
 await context.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort())
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture))
 const reset=async pathname=>{await page.evaluate(pathname=>window.fixture.reset(pathname),pathname);await page.getByRole('button',{name:'查看本机草稿',exact:true}).waitFor()}
 const openRecovery=async()=>{await page.getByRole('button',{name:'查看本机草稿',exact:true}).click();await page.getByRole('dialog',{name:'本机恢复草稿',exact:true}).waitFor()}
 const recover=async()=>{await page.getByRole('button',{name:'恢复这项草稿',exact:true}).click();await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor()}
 const verifyRecoveredEditor=async()=>{
  assert.equal(await page.getByRole('textbox',{name:'工作集名称',exact:true}).inputValue(),'Recovered work set')
  assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Recovered unsaved note')
  const state=await page.evaluate(()=>window.fixture.inspect())
  assert.deepEqual(state.local.base,{revision:7,value:{name:'Saved work set',note:'Saved baseline note',assetIds:['asset:fixture'],colors:['#123456'],columns:2}},'recovery must preserve the original compare-and-save baseline')
 }

 await test('recovery from About navigates to Library and opens the recovered WorkSet editor with its original baseline',async()=>{
  await reset('/about');await openRecovery();await recover();await verifyRecoveredEditor()
 })
 await test('recovering while Library is already mounted opens the editor',async()=>{
  await reset('/library');await openRecovery();await recover();await verifyRecoveredEditor()
 })
 await test('changing Library scope withdraws an open recovered WorkSet editor',async()=>{
  await reset('/library');await openRecovery();await recover();await verifyRecoveredEditor();await page.evaluate(()=>window.fixture.changeScope())
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor({state:'detached'})
 })
 await page.evaluate(()=>window.fixture.unmount());assert.deepEqual(errors,[],'renderer fixture has no uncaught errors')
 await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
console.log('Isolated WorkSet draft recovery navigation checks passed')
