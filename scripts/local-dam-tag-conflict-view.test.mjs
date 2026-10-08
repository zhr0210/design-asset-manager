// Formal TagManager route in isolated Chromium; synthetic Tag CAS boundary.
// This verifies the conflict interaction, not formal product Computer Use.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-tag-conflict-view-')))
assert.equal(path.dirname(root).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
await build({ absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: path.join(root, 'fixture.js'), logLevel: 'silent', stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
 import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
 import {installWorkspaceClient} from './src/renderer/workspace-client';
 import {hasTransientWorkspaceEdits} from './src/renderer/workspace-edit-guards';
 import './src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),writes=[];
 const original={id:'tag:one',name:'Original tag',type:'custom',color:'bg-slate-100 text-slate-700 border border-slate-200',persistedColor:null,aliases:[],parentId:null,assetCount:1};let saved=clone(original);
 installWorkspaceClient({library:{inspect:async()=>({state:'ready',identity:'library:fixture',generation:'generation:fixture'})}});
 Promise.all([import('./src/renderer/routes/TagManagerPage'),import('./src/renderer/stores/asset.store')]).then(([component,store])=>{
  const Page=component.default,asset=store.useAssetStore,app=createRoot(document.getElementById('root'));
  const metadata=tag=>({name:tag.name,type:tag.type,color:tag.persistedColor});
  asset.setState({loadTags:async()=>asset.setState({tags:[clone(saved)],tagLoadError:null}),updateTag:async(id,input,expected)=>{
   writes.push(clone({id,input,expected}));if(JSON.stringify(metadata(saved))!==JSON.stringify(expected))throw Error('SYNTHETIC_TAG_CONFLICT');
   saved={...saved,...clone(input),persistedColor:input.color};asset.setState({tags:[clone(saved)]});return clone(saved);
  }});
  window.fixture={inspect:()=>clone({saved,writes,dirty:hasTransientWorkspaceEdits()}),remote:(patch,notify=true)=>{saved={...saved,...clone(patch)};if(notify)asset.setState({tags:[clone(saved)]})},
   reset:async(patch={})=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));saved={...clone(original),...clone(patch)};writes.length=0;asset.setState({tags:[clone(saved)]});app.render(<MemoryRouter><Page/></MemoryRouter>)}};
 });
` } })
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const page = await context.newPage(), errors = [], external = []
  page.setDefaultTimeout(6000)
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', route => { if (route.request().url().startsWith('file:')) return route.continue(); external.push(route.request().url()); return route.abort() })
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href)
  await page.waitForFunction(() => Boolean(window.fixture))
  const reset = async (patch = {}) => { await page.evaluate(value => window.fixture.reset(value), patch); await page.getByRole('button', { name: '编辑标签 Original tag', exact: true }).click() }
  const inspect = () => page.evaluate(() => window.fixture.inspect())
  const name = () => page.getByRole('textbox', { name: '标签名称', exact: true })
  const save = () => page.getByRole('button', { name: '保存标签', exact: true })
  const adopt = () => page.getByRole('button', { name: '核对后采用当前标签为基准', exact: true })
  await test('empty persisted color keeps an unchanged displayed form clean while CAS retains its raw baseline', async () => {
    await reset({ persistedColor: '' })
    await page.waitForFunction(() => !window.fixture.inspect().dirty)
    await name().fill('Changed input'); await page.waitForFunction(() => window.fixture.inspect().dirty)
    await name().fill('Original tag'); await page.waitForFunction(() => !window.fixture.inspect().dirty)
    await save().click(); await page.getByRole('dialog', { name: '编辑标签', exact: true }).waitFor({ state: 'detached' })
    assert.equal((await inspect()).writes[0].expected.color, '')
  })
  await test('explicit adoption of an empty raw color preserves clean unchanged displayed input', async () => {
    await reset(); await page.waitForFunction(() => !window.fixture.inspect().dirty)
    await page.evaluate(() => window.fixture.remote({ persistedColor: '' }))
    await adopt().click(); await page.waitForFunction(() => !window.fixture.inspect().dirty)
    assert.equal(await name().inputValue(), 'Original tag')
    await save().click(); await page.getByRole('dialog', { name: '编辑标签', exact: true }).waitFor({ state: 'detached' })
    assert.equal((await inspect()).writes[0].expected.color, '')
  })
  await test('remote metadata is compared; explicit adoption keeps local input and saves with the reviewed baseline', async () => {
    await reset(); await name().fill('My retained input')
    await page.evaluate(() => window.fixture.remote({ name: 'Peer saved tag', type: 'peer-category', persistedColor: 'bg-blue-100 text-blue-700 border border-blue-200', color: 'bg-blue-100 text-blue-700 border border-blue-200' }))
    await adopt().waitFor(); await save().click(); assert.deepEqual((await inspect()).writes, [])
    await page.getByText('核对当前已保存的标签', { exact: true }).click(); assert.equal(await page.getByRole('dialog',{name:'编辑标签',exact:true}).locator('dd').nth(0).innerText(),'Peer saved tag')
    await adopt().click(); assert.equal(await name().inputValue(), 'My retained input')
    await save().click(); await page.getByRole('dialog', { name: '编辑标签', exact: true }).waitFor({ state: 'detached' })
    const state = await inspect(); assert.equal(state.saved.name, 'My retained input'); assert.deepEqual(state.writes[0].expected, { name: 'Peer saved tag', type: 'peer-category', color: 'bg-blue-100 text-blue-700 border border-blue-200' })
  })
  await test('a second peer save invalidates the adopted baseline without losing input', async () => {
    await reset(); await name().fill('My second input'); await page.evaluate(() => window.fixture.remote({ name: 'Peer first' })); await adopt().click()
    await page.evaluate(() => window.fixture.remote({ name: 'Peer second' })); await adopt().waitFor(); await save().click(); assert.deepEqual((await inspect()).writes, []); assert.equal(await name().inputValue(), 'My second input')
    await adopt().click(); await save().click(); await page.getByRole('dialog', { name: '编辑标签', exact: true }).waitFor({ state: 'detached' }); assert.equal((await inspect()).writes[0].expected.name, 'Peer second')
  })
  await test('missed notification retains input on CAS failure and offers an explicit reread/adopt path', async () => {
    await reset(); await name().fill('Input despite missed event'); await page.evaluate(() => window.fixture.remote({ name: 'Saved without event' }, false)); await save().click()
    await page.getByRole('alert').filter({hasText:'SYNTHETIC_TAG_CONFLICT'}).waitFor(); assert.equal(await name().inputValue(), 'Input despite missed event')
    assert.equal((await inspect()).writes[0].expected.color, null, 'a null persisted color is kept as the original baseline')
    await page.getByRole('button', { name: '重新读取已保存的标签', exact: true }).click(); await adopt().click(); assert.equal(await name().inputValue(), 'Input despite missed event')
    await save().click(); await page.getByRole('dialog', { name: '编辑标签', exact: true }).waitFor({ state: 'detached' }); const state = await inspect(); assert.equal(state.writes.length, 2); assert.equal(state.writes[1].expected.name, 'Saved without event'); assert.equal(state.saved.name, 'Input despite missed event')
  })
  assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close()
} finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }) }
