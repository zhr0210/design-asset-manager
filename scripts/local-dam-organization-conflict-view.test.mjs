// Actual OrganizationModal + useLibraryOrganization in isolated Chromium.
// The synthetic Client models peer revisions and CAS; this is not formal CU.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-organization-conflict-view-')))
assert.equal(path.dirname(root).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
await build({ absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: path.join(root, 'fixture.js'), logLevel: 'silent', stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {installWorkspaceClient} from './src/renderer/workspace-client';
 import './src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),writes=[],reads=[];
 const original={revision:1,sessionToken:'session:organization',requiresUpgrade:false,folders:[
  {id:'folder:one',name:'Original folder',kind:'assets',parentId:'parent:one',assetIds:['asset:one'],colors:[]},
  {id:'parent:one',name:'Original parent',kind:'assets',parentId:null,assetIds:[],colors:[]},
  {id:'parent:two',name:'Another parent',kind:'assets',parentId:null,assetIds:[],colors:[]},
  {id:'palette:one',name:'Original palette',kind:'palette',parentId:null,assetIds:[],colors:[{hex:'#112233',sourceAssetId:null}]}
 ]};let saved=clone(original),failNext=false,notifyPeer=()=>{};
 installWorkspaceClient({library:{organizationRead:async input=>{reads.push(clone(input));return{success:true,value:clone(saved)}},
  organizationWrite:async input=>{
   writes.push(clone(input));
   if(input.libraryIdentity!=='library:fixture'||input.generation!=='generation:fixture'||input.sessionToken!==saved.sessionToken)return{success:false,error:'SYNTHETIC_SCOPE_EXPIRED'};
   if(input.expectedRevision!==saved.revision)return{success:false,error:'SYNTHETIC_ORGANIZATION_CONFLICT'};
   if(failNext){failNext=false;return{success:false,error:'SYNTHETIC_SAVE_FAILED'}}
   const command=input.command,folder=saved.folders.find(value=>value.id===command.folderId);
   if(!folder)return{success:false,error:'目标文件夹已不存在，请重新核对。'};
   if(command.kind==='update')Object.assign(folder,{name:command.name,parentId:command.parentId});
   else if(command.kind==='add-assets')folder.assetIds=[...new Set([...folder.assetIds,...command.assetIds])];
   else if(command.kind==='add-color')folder.colors=[...folder.colors,{hex:command.hex,sourceAssetId:command.sourceAssetId}];
   else return{success:false,error:'SYNTHETIC_COMMAND_DENIED'};
   saved.revision++;return{success:true,value:clone(saved)};
  }}});
 Promise.all([import('./src/renderer/components/library/canvas/OrganizationModal'),import('./src/renderer/components/library/canvas/useLibraryOrganization')]).then(([component,hook])=>{
  const {OrganizationModal}=component,{useLibraryOrganization}=hook,app=createRoot(document.getElementById('root'));
  const authority={state:'ready',identity:'library:fixture',generation:'generation:fixture'};
  function App(){const [epoch,setEpoch]=useState(0),[intent,setIntent]=useState(null),model=useLibraryOrganization(authority,epoch);notifyPeer=()=>setEpoch(value=>value+1);
   return <><output data-testid="snapshot-revision">{model.snapshot?.revision??-1}</output>
    <button disabled={model.loading||!model.snapshot} onClick={()=>setIntent({kind:'edit',folderId:'folder:one'})}>编辑文件夹</button>
    <button disabled={model.loading||!model.snapshot} onClick={()=>setIntent({kind:'color',sourceAssetId:'asset:one'})}>收藏颜色</button>
    <button disabled={model.loading||!model.snapshot} onClick={()=>setIntent({kind:'assign',assetIds:['asset:two']})}>加入文件夹</button>
    {intent&&<OrganizationModal model={model} intent={intent} close={()=>setIntent(null)}/>}</>;
  }
  window.fixture={inspect:()=>clone({saved,writes,reads}),failNext:()=>{failNext=true},
   peer:(folderId,patch,notify=false)=>{const folder=saved.folders.find(value=>value.id===folderId);Object.assign(folder,clone(patch));saved.revision++;if(notify)notifyPeer()},
   deletePeer:(folderId,notify=false)=>{saved.folders=saved.folders.filter(value=>value.id!==folderId);saved.revision++;if(notify)notifyPeer()},
   reset:async()=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));saved=clone(original);writes.length=0;reads.length=0;failNext=false;app.render(<App/>)}
  };
 });
` } })
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const page = await context.newPage(), errors = [], external = []
  page.setDefaultTimeout(3500)
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', route => { if (route.request().url().startsWith('file:')) return route.continue(); external.push(route.request().url()); return route.abort() })
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href)
  await page.waitForFunction(() => Boolean(window.fixture))
  const inspect = () => page.evaluate(() => window.fixture.inspect())
  const dialog = () => page.getByRole('dialog')
  const name = () => dialog().getByRole('textbox', { name: '文件夹名称', exact: true })
  const parent = () => dialog().getByRole('combobox', { name: '上级文件夹', exact: true })
  const target = () => dialog().getByRole('combobox', { name: '目标文件夹', exact: true })
  const save = (label = '保存文件夹') => dialog().getByRole('button', { name: label, exact: true })
  const refresh = () => dialog().getByRole('button', { name: '刷新文件夹后重试', exact: true })
  const adopt = () => dialog().getByRole('button', { name: '核对后采用当前整理结果为基准', exact: true })
  const revision = value => page.waitForFunction(value => document.querySelector('[data-testid="snapshot-revision"]').textContent === String(value), value)
  const reset = async (entry = '编辑文件夹') => { await page.evaluate(() => window.fixture.reset()); await revision(1); await page.getByRole('button', { name: entry, exact: true }).click() }
  const compare = async text => { await dialog().getByText('核对当前已保存的整理结果', { exact: true }).click(); await dialog().getByText(text, { exact: true }).waitFor() }
  const closeAfterSave = () => dialog().waitFor({ state: 'detached' })
  const assertRetainedEdit = async expectedName => { assert.equal(await name().inputValue(), expectedName); assert.equal(await parent().inputValue(), 'parent:two') }

  await test('stale Organization CAS rejection keeps input; refresh requires explicit review/adoption before saving the new revision', async () => {
    await reset(); await name().fill('My retained folder'); await parent().selectOption('parent:two')
    await page.evaluate(() => window.fixture.peer('folder:one', { name: 'Peer saved folder', parentId: null }))
    await save().click(); await dialog().getByRole('alert').filter({ hasText: 'SYNTHETIC_ORGANIZATION_CONFLICT' }).waitFor()
    assert.equal((await inspect()).writes[0].expectedRevision, 1); await assertRetainedEdit('My retained folder')
    await refresh().click(); await revision(2); await assertRetainedEdit('My retained folder')
    assert.equal((await inspect()).writes.length, 1, 'refresh must not retry the rejected write')
    await compare('Peer saved folder')
    if (await save().isEnabled()) await save().click()
    assert.equal((await inspect()).writes.length, 1, 'unreviewed newer organization must not be submitted')
    await adopt().click(); await assertRetainedEdit('My retained folder'); await save().click(); await closeAfterSave()
    const state = await inspect(); assert.equal(state.writes.length, 2); assert.equal(state.writes[1].expectedRevision, 2)
    assert.equal(state.writes[1].sessionToken, 'session:organization'); assert.equal(state.saved.revision, 3)
    assert.deepEqual(state.writes[1].command, { kind: 'update', folderId: 'folder:one', name: 'My retained folder', parentId: 'parent:two' })
    assert.equal(state.saved.folders.find(folder => folder.id === 'folder:one').name, 'My retained folder')
  })

  await test('a second peer revision invalidates an adopted Organization baseline and requires another explicit adoption', async () => {
    await reset(); await name().fill('Input across two peers'); await parent().selectOption('parent:two')
    await page.evaluate(() => window.fixture.peer('folder:one', { name: 'First peer folder' }, true)); await revision(2)
    await compare('Original parent / First peer folder'); await adopt().click(); await assertRetainedEdit('Input across two peers')
    await page.evaluate(() => window.fixture.peer('folder:one', { name: 'Second peer folder' }, true)); await revision(3)
    if (await save().isEnabled()) await save().click()
    assert.deepEqual((await inspect()).writes, [], 'adopting revision 2 cannot authorize a revision 3 save')
    await assertRetainedEdit('Input across two peers'); await compare('Original parent / Second peer folder'); await adopt().click()
    await save().click(); await closeAfterSave(); const state = await inspect()
    assert.equal(state.writes[0].expectedRevision, 3); assert.equal(state.saved.folders.find(folder => folder.id === 'folder:one').name, 'Input across two peers')
  })

  await test('an Organization save error retains input and a normal retry uses the same reviewed revision', async () => {
    await reset(); await name().fill('Input survives save failure'); await parent().selectOption('parent:two')
    await page.evaluate(() => window.fixture.failNext()); await save().click()
    await dialog().getByRole('alert').filter({ hasText: 'SYNTHETIC_SAVE_FAILED' }).waitFor(); await assertRetainedEdit('Input survives save failure')
    assert.equal((await inspect()).saved.revision, 1); await refresh().click(); await revision(1); await assertRetainedEdit('Input survives save failure')
    await save().click(); await closeAfterSave(); const state = await inspect()
    assert.deepEqual(state.writes.map(write => write.expectedRevision), [1, 1]); assert.equal(state.saved.revision, 2)
  })

  await test('Organization adoption retains chosen palette/hex and chosen asset-assignment target', async () => {
    for (const entry of ['收藏颜色', '加入文件夹']) {
      const color = entry === '收藏颜色', folderId = color ? 'palette:one' : 'folder:one', peerName = color ? 'Peer palette' : 'Peer assignment folder'
      await reset(entry); await target().selectOption(folderId)
      if (color) await dialog().getByRole('textbox', { name: '颜色代码', exact: true }).fill('#A1B2C3')
      await page.evaluate(({ folderId, peerName }) => window.fixture.peer(folderId, { name: peerName }, true), { folderId, peerName }); await revision(2)
      await compare(color ? peerName : `Original parent / ${peerName}`); await adopt().click(); assert.equal(await target().inputValue(), folderId)
      if (color) assert.equal(await dialog().getByRole('textbox', { name: '颜色代码', exact: true }).inputValue(), '#A1B2C3')
      await save(color ? '保存颜色' : '加入文件夹').click(); await closeAfterSave(); const state = await inspect()
      assert.equal(state.writes[0].expectedRevision, 2); assert.equal(state.writes[0].command.folderId, folderId)
      if (color) assert.deepEqual(state.writes[0].command, { kind: 'add-color', folderId, hex: '#A1B2C3', sourceAssetId: 'asset:one' })
      else { assert.deepEqual(state.writes[0].command.assetIds, ['asset:two']); assert.deepEqual(state.saved.folders.find(folder => folder.id === folderId).assetIds, ['asset:one', 'asset:two']) }
    }
  })

  await test('adopting a peer deletion never changes an existing-folder intent into creation', async () => {
    await reset(); await name().fill('Input after peer deletion'); await page.evaluate(() => window.fixture.deletePeer('folder:one', true)); await revision(2)
    await adopt().click()
    if (await save().isEnabled()) await save().click()
    await dialog().getByRole('alert').filter({ hasText: /文件夹.*不存在/ }).waitFor()
    assert.equal(await name().inputValue(), 'Input after peer deletion')
    const state = await inspect(); assert.ok(state.writes.every(write => write.command.kind !== 'create')); assert.equal(state.saved.revision, 2)
    assert.equal(state.saved.folders.some(folder => folder.id === 'folder:one' || folder.name === 'Input after peer deletion'), false)
  })
  assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close()
} finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }) }
