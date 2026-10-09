// Actual React component with controlled FileSelection IO; not ordinary UX proof.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { _electron as electron } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-picker-bulk-ui-')))
let app
try {
  await build({
    absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', logLevel: 'silent',
    outfile: path.join(root, 'fixture.js'),
    plugins: [{ name: 'controlled-picker-ports', setup(b) {
      b.onResolve({ filter: /workspace-client$/ }, () => ({ path: 'client', namespace: 'fixture' }))
      b.onResolve({ filter: /ui\.store$/ }, () => ({ path: 'theme', namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'js', contents: args.path === 'client'
        ? 'export const getWorkspaceClient=()=>window.pickerClient'
        : 'export const useUIStore=selector=>selector({theme:"light"})' }))
    }}],
    stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import FileSelectionOverlay from './src/renderer/components/layout/FileSelectionOverlay';
      let listener, gate, calls=[];
      const base={id:'picker:fixture',title:'Controlled file picker',mode:'files',multiple:true,directory:'/public-fixture',directoryId:'directory:root',parentId:null,roots:[],truncated:false};
      let snapshot={...base,entries:[{id:'folder:one',name:'Subfolder',kind:'directory'},{id:'file:one',name:'One.png',kind:'file'},{id:'file:two',name:'Two.png',kind:'file'}]};
      window.pickerClient={files:{pending:async()=>gate?new Promise(resolve=>gate.resolve=()=>{gate=null;resolve(snapshot)}):snapshot,
        onRequested:fn=>{listener=fn;return()=>{}},confirm:async input=>calls.push(input),cancel:async()=>{},browse:async()=>snapshot,createDirectory:async()=>snapshot}};
      window.fixture={calls:()=>structuredClone(calls),next:(mode,multiple,count,truncated=false)=>{snapshot={...base,id:'picker:'+mode+':'+count,mode,multiple,truncated,entries:[{id:'folder:one',name:'Subfolder',kind:'directory'},...Array.from({length:count},(_,i)=>({id:'file:'+i,name:'Image-'+i+'.png',kind:'file'}))]};listener()},
        hold:()=>{gate={};listener()},release:()=>gate.resolve()};
      createRoot(document.getElementById('root')).render(<FileSelectionOverlay/>);
    ` }
  })
  await fs.writeFile(path.join(root, 'index.html'), '<div id="root"></div><script src="fixture.js"></script>')
  await fs.writeFile(path.join(root, 'main.cjs'), `const {app,BrowserWindow,session}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((r,done)=>done({cancel:!r.url.startsWith('file:')}));new BrowserWindow({show:false,width:1200,height:1000,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit())`)
  app = await electron.launch({ args: [path.join(root, 'main.cjs')] })
  const page = await app.firstWindow()
  const selectAll = () => page.getByRole('button', { name: '选择当前列表全部文件', exact: true })
  const confirm = () => page.getByRole('button', { name: '选择文件', exact: true })
  await selectAll().waitFor()
  await selectAll().click()
  await page.getByText('已选择 2 项', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Subfolder', exact: true }).getAttribute('aria-pressed'), 'false')
  await page.getByRole('button', { name: '清除文件选择', exact: true }).click()
  assert.equal(await confirm().isDisabled(), true)
  await selectAll().click()
  await confirm().click()
  assert.deepEqual((await page.evaluate(() => window.fixture.calls()))[0].entries, ['file:one', 'file:two'])

  // A new directory/session invalidates the prior selection; only listed files
  // are submitted, even when Host reports a truncated directory.
  await page.evaluate(() => window.fixture.next('files', true, 2000, true))
  await selectAll().waitFor()
  assert.equal(await confirm().isDisabled(), true)
  await selectAll().click()
  await page.getByText('已选择 2000 项', { exact: true }).waitFor()
  await confirm().click()
  const large = (await page.evaluate(() => window.fixture.calls()))[1]
  assert.equal(large.entries.length, 2000)
  assert.equal(large.entries[0], 'file:0')
  assert.equal(large.entries[1999], 'file:1999')
  assert.equal(large.entries.includes('folder:one'), false)

  await page.evaluate(() => window.fixture.next('files', true, 0))
  await selectAll().waitFor()
  assert.equal(await selectAll().isDisabled(), true)
  await page.evaluate(() => window.fixture.next('files', false, 2))
  await page.getByText('选择一个文件，再确认。', { exact: true }).waitFor()
  assert.equal(await selectAll().count(), 0, 'single-image selection must not get a bulk action')
  await page.evaluate(() => window.fixture.next('directory', true, 2))
  await page.getByRole('button', { name: '选择此文件夹', exact: true }).waitFor()
  assert.equal(await selectAll().count(), 0, 'directory selection must not select child files')
  await page.evaluate(() => window.fixture.next('files', true, 2))
  await selectAll().waitFor()
  await page.evaluate(() => window.fixture.hold())
  await page.getByText('正在处理…', { exact: true }).waitFor()
  assert.equal(await selectAll().isDisabled(), true, 'late session refresh blocks old bulk gestures')
  await page.evaluate(() => window.fixture.release())
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('选择当前列表全部文件') && !button.disabled))
  assert.equal(await confirm().isDisabled(), true)
  console.log('Actual React picker: bulk selects only current bounded file entries in order, clears selection, resets on session changes, handles 2000/truncation, blocks busy refresh, and excludes single-file/directory modes. Controlled IO; ordinary app path separately required.')
} finally {
  await app?.close()
  assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()))
  assert.ok(path.basename(root).startsWith('dam-picker-bulk-ui-'))
  await fs.rm(root, { recursive: true, force: true })
}
