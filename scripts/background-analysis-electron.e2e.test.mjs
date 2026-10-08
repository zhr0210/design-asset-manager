import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
await test('formal plan enrollment, controls, card isolation and reopen remain metadata-only',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-background-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry');let app,calls=0
 const server=http.createServer((req,res)=>{calls++;res.writeHead(500);res.end()})
 try{
  for(const dir of [profile,evidence,entry])await fs.mkdir(dir)
  const sources=[];for(let i=0;i<2;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:'#7799bb'}}).png().toFile(file);sources.push(file)}
  const hashes=async()=>Promise.all(sources.map(async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex'))),original=await hashes()
  await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-background-test',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:sources.map(p=>[p])},env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k))),options={args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}},errors=[]
  const start=async()=>{app=await electron.launch(options);assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(p=>app.getPath(p)))).every(p=>p.startsWith(root+path.sep)));const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',()=>errors.push('renderer-error'));await page.setViewportSize({width:1450,height:1050});await page.getByTestId('formal-library-canvas').waitFor();return page}
  let page=await start()
  await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()
  await page.evaluate(baseUrl=>window.damClient.aiBackendSave({id:'owned-fixture',name:'Synthetic only',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'fixture',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),`http://127.0.0.1:${server.address().port}/v1`)
  const scope=await page.evaluate(async()=>{const s=await window.damClient.library.inspect();return{libraryIdentity:s.identity,generation:s.generation}}),old=(await page.evaluate(()=>window.damClient.listAssets()))[0]
  await page.evaluate(()=>location.hash='/ai-console');const consolePanel=page.getByRole('region',{name:'后台基础分析计划',exact:true});await consolePanel.getByRole('checkbox',{name:'收集新素材分析计划'}).check();await consolePanel.getByRole('button',{name:'保存新素材计划设置'}).click();await consolePanel.getByRole('region',{name:'确认后台计划设置'}).waitFor();assert.equal((await page.evaluate(s=>window.damClient.backgroundAnalysis.read(s),scope)).value.schemaVersion,1)
  await consolePanel.getByRole('button',{name:'确认保存后台计划'}).click();await consolePanel.getByRole('region',{name:'确认后台计划设置'}).waitFor({state:'detached'});assert.equal((await page.evaluate(s=>window.damClient.backgroundAnalysis.read(s),scope)).value.schemaVersion,12)
  if(process.env.BACKGROUND_EVIDENCE_DIR){await fs.mkdir(process.env.BACKGROUND_EVIDENCE_DIR,{recursive:true});await consolePanel.screenshot({path:path.join(process.env.BACKGROUND_EVIDENCE_DIR,'background-console.png')})}
  assert.equal((await page.evaluate(s=>window.damClient.backgroundAnalysis.read(s),{...scope,assetId:old.id})).value.intents.length,0)
  await page.evaluate(()=>location.hash='/library');await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===2)
  if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
  const newer=(await page.evaluate(()=>window.damClient.listAssets())).find(a=>a.id!==old.id),selected={...scope,assetId:newer.id};let value=(await page.evaluate(s=>window.damClient.backgroundAnalysis.read(s),selected)).value;assert.equal(value.intents.length,3);assert.equal(value.dispatchAvailable,false)
  await page.locator(`[id="asset-card-open-${newer.id}"]`).click();await page.getByText('AI 分析与提示词反推',{exact:true}).click();const assetPanel=page.getByRole('region',{name:'素材后台分析计划',exact:true});await assetPanel.getByRole('button',{name:'暂停标签计划'}).click();await assetPanel.getByText('标签 · 已手动暂停',{exact:true}).waitFor()
  if(process.env.BACKGROUND_EVIDENCE_DIR)await assetPanel.screenshot({path:path.join(process.env.BACKGROUND_EVIDENCE_DIR,'background-asset.png')})
  const opening=app.waitForEvent('window');assert.equal((await page.evaluate(s=>window.damClient.assetCard.open(s),selected)).ok,true);const card=await opening;await card.waitForFunction(()=>Boolean(window.backgroundAnalysisAPI));assert.equal((await card.evaluate(s=>window.backgroundAnalysisAPI.read(s),scope)).ok,false);assert.equal((await card.evaluate(s=>window.backgroundAnalysisAPI.read({...s,assetId:'foreign'}),scope)).ok,false);assert.equal((await card.evaluate(s=>window.backgroundAnalysisAPI.read(s),selected)).value.canConfigure,false)
  assert.equal(calls,0);await card.evaluate(async()=>{const r=await window.assetCardAPI.inspect();await window.assetCardAPI.act({token:r.state.token,kind:'close'})}).catch(()=>{})
  await page.getByRole('button',{name:'关闭专注模式',exact:true}).click()
  if(process.env.BACKGROUND_EVIDENCE_DIR){await fs.mkdir(process.env.BACKGROUND_EVIDENCE_DIR,{recursive:true});await assetPanel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.BACKGROUND_EVIDENCE_DIR,'background-plan.png')})}
  await app.close();app=null;page=await start();if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click();await page.locator('.lc-card').first().waitFor()
  value=(await page.evaluate(s=>window.damClient.backgroundAnalysis.read(s),selected)).value;assert.equal(value.intents.find(i=>i.capability==='tags').state,'user-paused');assert.equal(value.intents.length,3);assert.equal(value.dispatchAvailable,false);assert.ok(value.resourceReasons.includes('automatic-executor-not-integrated'));assert.equal(calls,0);assert.deepEqual(await hashes(),original);assert.deepEqual(errors,[])
 }finally{if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
})
