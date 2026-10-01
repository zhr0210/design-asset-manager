import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
await test('formal inspector reuses the independent panel across bulk A-B-A, preserving asset intent scope',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-intent-panel-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry');let app,calls=0
 const server=http.createServer((req,res)=>{calls++;res.writeHead(500);res.end()})
 try{
  for(const dir of [profile,evidence,entry])await fs.mkdir(dir)
  const sources=[];for(const name of ['generated-a','generated-b']){const file=path.join(root,name+'.png');await sharp({create:{width:name.endsWith('a')?100:110,height:80,channels:3,background:'#7799bb'}}).png().toFile(file);sources.push(file)}
  const hash=async()=>Promise.all(sources.map(async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex'))),original=await hash()
  await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-owned-panel-path',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[sources]},env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
  app=await electron.launch({args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}})
  assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(n=>app.getPath(n)))).every(p=>p.startsWith(root+path.sep)))
  const page=await app.firstWindow(),errors=[];page.on('pageerror',()=>errors.push('renderer-error'));page.setDefaultTimeout(15000);await page.setViewportSize({width:1379,height:1042});await page.getByTestId('formal-library-canvas').waitFor()
  await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.getByRole('checkbox',{name:'选择 generated-b',exact:true}).waitFor()
  if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
  await page.evaluate(baseUrl=>window.electronAPI.aiBackendSave({id:'synthetic',name:'Owned fixture',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),`http://127.0.0.1:${server.address().port}/v1`)
  const assets=await page.evaluate(()=>window.electronAPI.listAssets()),a=assets.find(a=>a.title==='generated-a'),b=assets.find(a=>a.title==='generated-b')
  await page.locator(`[id="asset-card-open-${a.id}"]`).click();await page.getByText('AI 分析与提示词反推',{exact:true}).click();const panel=page.locator('[aria-label="独立标签任务"]')
  const save=async()=>{await panel.getByRole('button',{name:'保存独立标签任务',exact:true}).click();await panel.getByRole('button',{name:'确认保存任务',exact:true}).click();await panel.getByRole('button',{name:'分析标签',exact:true}).waitFor()}
  await save();await page.evaluate(()=>{window.__independentPanel=document.querySelector('[aria-label="独立标签任务"]')})
  await page.getByRole('checkbox',{name:'选择 generated-b',exact:true}).check();await page.waitForFunction(()=>!document.querySelector('[aria-label="独立标签任务"]').textContent.includes('任务已保存，待运行'))
  assert.equal(await page.evaluate(()=>window.__independentPanel===document.querySelector('[aria-label="独立标签任务"]')),true,'Bulk selection changes the real child identity without remounting its DOM')
  await save();await page.getByRole('checkbox',{name:'选择 generated-b',exact:true}).uncheck();await panel.getByRole('button',{name:'分析标签',exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>window.__independentPanel===document.querySelector('[aria-label="独立标签任务"]')),true)
  const counts=await page.evaluate(async ids=>{const s=await window.electronAPI.library.inspect();return Promise.all(ids.map(async assetId=>{const r=await window.electronAPI.independentTags.read({libraryIdentity:s.identity,generation:s.generation,assetId});if(!r.ok)throw Error(r.error);return r.value.requests.length}))},[a.id,b.id]);assert.deepEqual(counts,[1,1])
  await panel.getByRole('button',{name:'分析标签',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor();await panel.getByRole('button',{name:'取消运行',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor({state:'detached'})
  assert.equal(calls,0);assert.deepEqual(await hash(),original);assert.deepEqual(errors,[])
  if(process.env.DAM_HARDENING_SCREENSHOT)await page.screenshot({path:process.env.DAM_HARDENING_SCREENSHOT})
 }finally{if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
})
