import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'

// Browser plugin is not available. Formal Electron/Playwright uses only an owned profile
// and original Host, replacing directory selections and settings, never real user data.
async function waitForLibraryState(page,state){for(let i=0;i<600;i++){if((await page.evaluate(()=>window.damClient.library.inspect())).state===state)return;await new Promise(r=>setTimeout(r,10))}throw Error('Library state did not settle')}
async function fixture(invalid=false){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-startup-navigation-')))
 const profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry')
 for(const dir of [profile,evidence,entry])await fs.mkdir(dir)
 if(invalid){await fs.mkdir(library);await fs.writeFile(path.join(library,'owned-sentinel.txt'),'generated fixture, not a DAM library')}
 await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-startup-test',type:'module',main:'main.mjs'}))
 await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
 const source=path.join(root,'generated.png');await sharp({create:{width:96,height:64,channels:3,background:'#7799bb'}}).png().toFile(source)
 const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[[source]]}
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
 const app=await electron.launch({timeout:15000,args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}})
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.name));page.setDefaultTimeout(6000)
 await page.setViewportSize({width:1300,height:850});await page.getByTestId('formal-library-canvas').waitFor()
 return {app,page,root,library,errors,close:async()=>{await app.close();assert.equal(await fs.readFile(path.join(evidence,'shutdown-complete'),'utf8'),'complete\n');await fs.rm(root,{recursive:true,force:true})}}
}

await test('fresh unopened home exposes real AI/menu navigation and explains unavailable library views without blocking controls',async()=>{
 const f=await fixture();try{
 const {page}=f;assert.equal((await page.evaluate(()=>window.damClient.library.inspect())).state,'unopened')
  if(process.env.DAM_STARTUP_EVIDENCE){await fs.mkdir(process.env.DAM_STARTUP_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.DAM_STARTUP_EVIDENCE,'unopened-home.png')})}
  await page.getByRole('button',{name:'更多功能菜单',exact:true}).click()
  await page.getByRole('menuitem',{name:'AI 与模型',exact:true}).click()
  await page.getByRole('region',{name:'连接与账号',exact:true}).waitFor()
  await page.getByRole('link',{name:'素材工作区',exact:true}).click()
  for(const name of ['文件夹','工作模式','回收站','全部']){
   await page.getByRole('button',{name,exact:true}).click()
   assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true')
   assert.match(await page.getByRole('region',{name:'资料库管理',exact:true}).innerText(),new RegExp(name))
  }
  assert.equal(await page.getByRole('textbox',{name:'搜索素材',exact:true}).isDisabled(),true)
  await page.getByRole('button',{name:'AI 与模型',exact:true}).click()
  const panel=page.getByRole('region',{name:'连接与账号',exact:true});await panel.waitFor();await panel.getByRole('button',{name:'连接本机服务',exact:true}).click()
  await panel.getByRole('button',{name:'高级连接选项'}).click();await panel.getByLabel('提供方',{exact:true}).selectOption('openai');await panel.getByLabel('认证方式',{exact:true}).selectOption('oauth')
  await panel.getByRole('button',{name:'保存连接',exact:true}).click()
  await page.getByRole('button',{name:'Continue with ChatGPT',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Continue with ChatGPT',exact:true}).isEnabled(),true)
  assert.deepEqual(f.errors,[])
  if(process.env.DAM_STARTUP_EVIDENCE){await fs.mkdir(process.env.DAM_STARTUP_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.DAM_STARTUP_EVIDENCE,'ai-entry.png')})}
 }finally{await f.close()}
})

await test('generated real library create/import/inspect/close keeps the manager hidden and the AI entry clickable',async()=>{
 const f=await fixture();try{
  const {page}=f;await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await waitForLibraryState(page,'ready')
  assert.equal((await page.evaluate(()=>window.damClient.library.inspect())).state,'ready')
  await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click()
  await page.locator('.lc-card-open').first().waitFor();await page.getByRole('button',{name:'关闭资料库管理',exact:true}).click()
  assert.equal(await page.locator('.library-manager').isVisible(),false)
  await page.locator('.lc-card-open').first().click();await page.getByRole('complementary',{name:'素材检查器',exact:true}).waitFor()
  await page.getByRole('button',{name:'AI 与模型',exact:true}).click();await page.getByRole('region',{name:'连接与账号',exact:true}).waitFor()
  await page.getByRole('link',{name:'素材工作区',exact:true}).click();await page.getByRole('link',{name:'资料库管理',exact:true}).click()
  await page.getByTestId('library-close').click();await waitForLibraryState(page,'closed');assert.equal((await page.evaluate(()=>window.damClient.library.inspect())).state,'closed')
  await page.getByRole('button',{name:'更多功能菜单',exact:true}).click();await page.getByRole('menuitem',{name:'设置',exact:true}).click()
  await page.getByRole('link',{name:'返回素材工作区',exact:true}).click();await page.getByRole('button',{name:'AI 与模型',exact:true}).click()
  await page.getByRole('region',{name:'连接与账号',exact:true}).waitFor();assert.deepEqual(f.errors,[])
 }finally{await f.close()}
})

await test('failed real Host open retains recovery state and original bytes but restores account and generated-plan admission',async()=>{
 const f=await fixture(true);try{
  const {page}=f;const initial=(await page.evaluate(()=>window.damClient.aiBackendList()))[0];await page.evaluate(b=>window.damClient.aiBackendSave({...b,enabled:true,baseUrl:'http://127.0.0.1:65531/v1'}),initial);const result=await page.evaluate(()=>window.damClient.library.open());assert.equal(result.success,false)
  assert.equal((await page.evaluate(()=>window.damClient.library.inspect())).state,'recovery-required')
  const backend=(await page.evaluate(()=>window.damClient.aiBackendList()))[0]
  const status=await page.evaluate(b=>window.damClient.aiConnections.setApiKey({backendId:b.id,key:'fixture-no-real-account'}),backend)
  assert.equal(status.configured,true)
  const review=await page.evaluate(async b=>{const saved=(await window.damClient.aiBackendList()).find(v=>v.id===b.id);await window.damClient.aiBackendSave({...saved,enabled:true,defaultModel:'fixture',capabilities:{...saved.capabilities,vision:true}});return window.damClient.aiAcceptance.prepare({connectionRef:b.id,model:'fixture',maxPhysicalRequests:1,maxOutputTokens:512,maxWallClockMs:1000,maxEstimatedCostUsd:0,estimatedCostPerRequestUsd:0})},backend)
  await page.evaluate(receipt=>window.damClient.aiAcceptance.discard(receipt),review.receipt)
  await page.getByRole('button',{name:'打开设置',exact:true}).click();await page.getByRole('link',{name:'返回素材工作区',exact:true}).click()
  await page.getByText('当前素材库未成功打开',{exact:true}).waitFor()
  assert.equal(await fs.readFile(path.join(f.library,'owned-sentinel.txt'),'utf8'),'generated fixture, not a DAM library')
  assert.deepEqual(f.errors,[])
  if(process.env.DAM_STARTUP_EVIDENCE)await page.screenshot({path:path.join(process.env.DAM_STARTUP_EVIDENCE,'recovery-home.png')})
 }finally{await f.close()}
})
