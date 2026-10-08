import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { _electron as electron } from 'playwright'

// Isolated renderer regression: no real profile, model, network or library.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-visual-selection-'))
let app
try {
  const bundle = await build({
    stdin: {
      contents: `
        import React, {useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import Panel from './src/renderer/components/asset/VisualAiPanel';
        window.calls=[];
        const cloud={id:'cloud',name:'Cloud fixture',defaultModel:'cloud-model',location:'external'};
        const local={id:'local',name:'Local fixture',defaultModel:'local-model',location:'local',taskModels:{analyze:'local-model',tags:'local-model'}};
        window.choices=[cloud];
        window.damClient={
          visualAi:{backends:async()=>({ok:true,value:window.choices}),results:async()=>({ok:true,value:[]})},
          basicAnalysis:{
            captions:async()=>({ok:true,value:[]}),
            attempts:async()=>({ok:true,value:{sessionToken:'fixture',items:[]}}),
            prepare:async input=>{window.calls.push(input);return{ok:true,value:{receipt:'fixture-review',notice:'Isolated review'}}},
            discard:async()=>({ok:true})
          }
        };
        function App(){
          const [generation,setGeneration]=useState(0);
          return <>
            <button onClick={()=>{window.choices=[cloud,local];setGeneration(v=>v+1)}}>Assign local fixture</button>
            <button onClick={()=>{window.choices=[cloud];setGeneration(v=>v+1)}}>Revoke local fixture</button>
            <button onClick={()=>{window.choices=[{...cloud,taskModels:{analyze:'cloud-assigned'}}];setGeneration(v=>v+1)}}>Assign cloud fixture</button>
            <Panel scope={{libraryIdentity:'fixture',generation:String(generation)}} assetIds={['asset']} onConfigure={()=>{}}/>
          </>;
        }
        createRoot(document.getElementById('root')).render(<App/>);
      `,
      resolveDir: process.cwd(),
      loader: 'tsx'
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: path.join(root, 'bundle.js'),
    write: false,
    logLevel: 'silent'
  })
  await fs.writeFile(path.join(root, 'bundle.js'), bundle.outputFiles[0].contents)
  await fs.writeFile(path.join(root, 'index.html'), '<div id="root"></div><script src="bundle.js"></script>')
  await fs.writeFile(path.join(root, 'main.cjs'), `
    const {app,BrowserWindow}=require('electron');
    for(const name of ['userData','sessionData','logs','crashDumps'])app.setPath(name,${JSON.stringify(root)}+'/'+name);
    app.whenReady().then(()=>new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true}}).loadFile(${JSON.stringify(path.join(root, 'index.html'))}));
    app.on('window-all-closed',()=>app.quit());
  `)
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('DAM_') && !['NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL'].includes(key)))
  app = await electron.launch({ args: [path.join(root, 'main.cjs')], env })
  const page = await app.firstWindow()
  page.setDefaultTimeout(5000)
  const service = page.getByRole('combobox', { name: '分析模型服务' })
  const caption = page.getByRole('button', { name: '仅生成短描述', exact: true })
  const ocr = page.getByRole('button', { name: '仅生成OCR', exact: true })

  await test('unassigned or revoked local default never auto-selects the available cloud service', async () => {
    await service.waitFor()
    assert.equal(await service.inputValue(), '')
    assert.equal(await caption.isDisabled(), true)
    assert.equal(await ocr.isEnabled(), true)
    assert.deepEqual(await page.evaluate(() => window.calls), [])

    await page.getByRole('button', { name: 'Assign local fixture' }).click()
    await page.waitForFunction(() => document.querySelector('select').value === 'local')
    assert.equal(await page.getByRole('textbox', { name: '分析模型名称' }).inputValue(), 'local-model')
    assert.equal(await caption.isEnabled(), true)

    await page.getByRole('button', { name: 'Revoke local fixture' }).click()
    await page.getByText('当前分析默认模型未配置或不可用，请明确选择模型服务。OCR 可独立使用。', { exact: true }).waitFor()
    assert.equal(await service.inputValue(), '')
    assert.equal(await caption.isDisabled(), true)
    assert.equal(await ocr.isEnabled(), true)
    assert.deepEqual(await page.evaluate(() => window.calls), [])
  })

  await test('an explicit cloud selection is passed to the real basic panel, while OCR remains independent', async () => {
    await page.reload()
    await service.waitFor()
    await service.selectOption('cloud')
    await caption.click()
    await page.getByRole('region', { name: '确认基础分析' }).waitFor()
    assert.deepEqual(await page.evaluate(() => window.calls), [{
      libraryIdentity: 'fixture', generation: '0', assetIds: ['asset'],
      capabilities: ['caption'], backendId: 'cloud', model: 'cloud-model'
    }])
    await page.getByRole('button', { name: '取消', exact: true }).click()
    await page.getByRole('button', { name: 'Revoke local fixture' }).click()
    await page.waitForFunction(() => document.querySelector('select').value === '')
    await ocr.click()
    await page.getByRole('region', { name: '确认基础分析' }).waitFor()
    assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), {
      libraryIdentity: 'fixture', generation: '1', assetIds: ['asset'], capabilities: ['ocr']
    })
  })

  await test('a configured cloud default remains available without a forced provider change', async () => {
    await page.reload()
    await page.getByRole('button', { name: 'Assign cloud fixture' }).click()
    await page.waitForFunction(() => document.querySelector('select').value === 'cloud')
    assert.equal(await page.getByRole('textbox', { name: '分析模型名称' }).inputValue(), 'cloud-assigned')
    assert.equal(await caption.isEnabled(), true)
  })
} finally {
  if (app) await app.close()
  const resolved = path.resolve(root)
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
  assert.ok(path.basename(resolved).startsWith('dam-visual-selection-'))
  await fs.rm(resolved, { recursive: true, force: true })
}
