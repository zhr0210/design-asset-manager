// Formal Main/preload/UI against generated data only. No model or HTTP inference.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-intent-electron-')))
const profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),source=path.join(root,'generated.png')
await fs.mkdir(evidence);await fs.mkdir(profile)
await sharp({create:{width:640,height:480,channels:3,background:'#7799bb'}}).png().toFile(source)
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex'),original=await sha(source)
let requests=0,app
const server=http.createServer((_req,res)=>{requests++;res.writeHead(500);res.end()})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[[source]]}
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('DAM_')&&key!=='ELECTRON_RUN_AS_NODE'))
const options={args:['.','--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}}
const milestones=[],errors=[]
const start=async()=>{
  app=await electron.launch(options)
  const locations=await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(p=>app.getPath(p)))
  assert.ok(locations.every(p=>p.startsWith(root+path.sep)))
  const page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',()=>errors.push('renderer-error'))
  await page.setViewportSize({width:1379,height:1042});await page.getByTestId('formal-library-canvas').waitFor()
  return page
}
try {
  let page=await start()
  await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click()
  await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()
  if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
  const scope=await page.evaluate(async()=>{const s=await window.electronAPI.library.inspect(),a=(await window.electronAPI.listAssets())[0];return{libraryIdentity:s.identity,generation:s.generation,assetId:a.id}})
  const read=()=>page.evaluate(s=>window.electronAPI.independentTags.read(s),scope)
  assert.equal((await read()).value.schemaVersion,1)
  const configured=await page.evaluate(baseUrl=>window.electronAPI.aiBackendSave({id:'tag-fixture',name:'隔离任务验证',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'fixture-vision',timeoutMs:1000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),`http://127.0.0.1:${server.address().port}/v1`)
  assert.notEqual(configured?.success,false)
  await page.locator(`[id="asset-card-open-${scope.assetId}"]`).click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
  const panel=page.getByRole('region',{name:'AI 分析与反推',exact:true})
  await panel.getByRole('button',{name:'保存独立标签任务',exact:true}).click()
  await panel.getByRole('region',{name:'确认保存标签任务'}).waitFor()
  assert.equal((await read()).value.schemaVersion,1);assert.equal(requests,0)
  await page.screenshot({path:path.join(evidence,'intent-review.png')})
  await panel.getByRole('button',{name:'确认保存任务',exact:true}).click()
  await panel.getByText('任务已保存，标签执行待启用 · fixture-vision',{exact:true}).waitFor()
  const saved=await read();assert.equal(saved.ok,true);assert.equal(saved.value.schemaVersion,9);assert.equal(saved.value.requests.length,1)
  await page.screenshot({path:path.join(evidence,'intent-saved.png')})
  milestones.push('formal-ui-review-zero-upgrade-confirm-single-persistent-intent')
  // Untrusted frames cannot read intents; authentic cross-owner receipts are tested below.
  const denied=await app.evaluate(async({ipcMain})=>ipcMain._invokeHandlers.get('independent-tags:read')({sender:{id:-1},senderFrame:null},{}))
  assert.equal(denied.ok,false);milestones.push('untrusted-frame-denied')
  const opening=app.waitForEvent('window')
  assert.equal((await page.evaluate(s=>window.electronAPI.assetCard.open(s),scope)).ok,true)
  const card=await opening;await card.waitForFunction(()=>Boolean(window.independentTagsAPI))
  assert.equal((await card.evaluate(s=>window.independentTagsAPI.read({...s,assetId:'not-current-card'}),scope)).ok,false)
  const mainReview=await page.evaluate(s=>window.electronAPI.independentTags.prepare({...s,backendId:'tag-fixture',requestId:'main-not-card'}),scope)
  assert.equal(mainReview.ok,true)
  assert.equal((await card.evaluate(receipt=>window.independentTagsAPI.confirm(receipt),mainReview.value.receipt)).ok,false)
  const cardReview=await card.evaluate(s=>window.independentTagsAPI.prepare({...s,backendId:'tag-fixture',requestId:'card-request'}),scope)
  assert.equal(cardReview.ok,true)
  assert.equal((await page.evaluate(receipt=>window.electronAPI.independentTags.confirm(receipt),cardReview.value.receipt)).ok,false)
  assert.equal((await card.evaluate(receipt=>window.independentTagsAPI.confirm(receipt),cardReview.value.receipt)).ok,true)
  await card.evaluate(async()=>{const current=await window.assetCardAPI.inspect();await window.assetCardAPI.act({token:current.state.token,kind:'close'})}).catch(()=>{})
  await page.getByTestId('asset-quick-look').waitFor()
  await page.keyboard.press('Escape');await page.getByTestId('asset-quick-look').waitFor({state:'detached'})
  await panel.getByRole('button',{name:'重新读取任务',exact:true}).click()
  await page.waitForFunction(s=>window.electronAPI.independentTags.read(s).then(r=>r.value.requests.length===2),scope)
  milestones.push('formal-card-preload-scope-and-owner-receipts-isolated')
  await app.close();app=null;page=await start()
  if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click()
  await page.locator('.lc-card').first().waitFor()
  const restored=await read();assert.equal(restored.ok,true);assert.equal(restored.value.requests.length,2);assert.ok(restored.value.requests.some(r=>r.requestId===saved.value.requests[0].requestId))
  assert.notEqual(restored.value.sessionToken,saved.value.sessionToken)
  assert.equal(await sha(source),original);assert.equal(requests,0);assert.deepEqual(errors,[])
  milestones.push('process-restart-v9-reopens-original-unchanged-no-inference')
  await fs.writeFile(path.join(evidence,'RESULT.json'),JSON.stringify({passed:true,milestones,requests,errors},null,2))
  // Only generated fixtures; retain screenshots in the caller's evidence directory if requested.
  if(process.env.TAG_INTENT_EVIDENCE_DIR){await fs.mkdir(process.env.TAG_INTENT_EVIDENCE_DIR,{recursive:true});for(const name of ['intent-review.png','intent-saved.png','RESULT.json'])await fs.copyFile(path.join(evidence,name),path.join(process.env.TAG_INTENT_EVIDENCE_DIR,name))}
  console.log(JSON.stringify({passed:true,milestones,requests,errors}))
} finally {
  if(app)await app.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true})
}
