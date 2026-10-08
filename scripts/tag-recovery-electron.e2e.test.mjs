import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-recovery-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry'),sources=[]
for(const dir of [profile,evidence,entry])await fs.mkdir(dir)
for(let i=0;i<3;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:100+i,height:80,channels:3,background:{r:40+i*20,g:90,b:140}}}).png().toFile(file);sources.push(file)}
const hashes=async()=>Promise.all(sources.map(async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex'))),original=await hashes()
await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-generated-batch',version:'0.0.0',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
let calls=0,active=0,peak=0,mode='normal',held=[]
const server=http.createServer(async(req,res)=>{if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return}let text='';for await(const bytes of req){text+=bytes;if(text.length>8*1024*1024){res.destroy();return}}JSON.parse(text);calls++;active++;peak=Math.max(peak,active);res.on('close',()=>active--);const finish=()=>{if(res.destroyed)return;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:calls===2?'invalid':JSON.stringify({tags:['蓝色',`批次${mode}`]})}}]}))};if(mode==='hold'){held.push(finish);return}finish()})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[sources]}
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
let app;const errors=[],until=async(read,done)=>{for(let i=0;i<1000;i++){const r=await read();if(done(r))return r;await new Promise(r=>setTimeout(r,10))}throw Error('Generated batch did not settle')}
const options={args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}}
const start=async()=>{app=await electron.launch(options);assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(n=>app.getPath(n)))).every(p=>p.startsWith(root+path.sep)));const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',()=>errors.push('renderer-error'));await page.setViewportSize({width:1600,height:1100});await page.getByTestId('formal-library-canvas').waitFor();return page}
try{
 let page=await start()
 await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await until(()=>page.locator('.lc-card').count(),n=>n===3)
 if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
 const backend={id:'synthetic',name:'隔离恢复验证',type:'openai-compatible',enabled:true,baseUrl:`http://127.0.0.1:${server.address().port}/v1`,defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}
 await page.evaluate(b=>window.damClient.aiBackendSave(b),backend)
 const scope=await page.evaluate(async()=>{const s=await window.damClient.library.inspect();return{libraryIdentity:s.identity,generation:s.generation,assetIds:(await window.damClient.listAssets()).map(a=>a.id)}})
 const first=await page.evaluate(async s=>{const r=await window.damClient.tagBatches.prepare({...s,requestId:'initial-recovery-batch',backendId:'synthetic',model:'synthetic-model',forceRerun:false});if(!r.ok)throw Error(r.error);return window.damClient.tagBatches.run(r.value.receipt)},scope)
 await until(()=>page.evaluate(id=>window.damClient.tagBatches.inspect(id),first.value.id),r=>r.ok&&r.value.state==='partial');assert.equal(calls,3)
 await app.close();app=null;page=await start();if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click();await page.locator('.lc-card').first().waitFor();assert.equal(calls,3);await page.evaluate(b=>window.damClient.aiBackendSave(b),backend)
 const show=async()=>{if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click();await page.locator('.lc-card [id^="asset-card-open-"]').first().click();await page.getByText('AI 分析与提示词反推',{exact:true}).click();const p=page.getByRole('region',{name:'批量标签分析',exact:true});await p.locator('details[aria-label="已保存标签任务"] summary').click();return p}
 let panel=await show();await panel.getByRole('button',{name:'重新审阅未完成任务',exact:true}).first().click();await panel.getByText(/1 项可继续，2 项复用已保存结果，0 项未知/).waitFor();assert.equal(calls,3)
 await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await panel.getByText('批次完成 · 3/3',{exact:true}).waitFor();assert.equal(calls,4)
 mode='hold';const stopped=await page.evaluate(async s=>{const r=await window.damClient.tagBatches.prepare({...s,requestId:'interrupted-batch',backendId:'synthetic',model:'synthetic-model',forceRerun:true});if(!r.ok)throw Error(r.error);return window.damClient.tagBatches.run(r.value.receipt)},scope);assert.equal(stopped.ok,true);await until(()=>held.length,n=>n===1);assert.equal(calls,5)
 await app.close();app=null;held.forEach(fn=>fn());mode='resumed';page=await start();if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click();await page.locator('.lc-card').first().waitFor();assert.equal(calls,5);await page.evaluate(b=>window.damClient.aiBackendSave(b),backend)
 panel=await show();await panel.getByRole('button',{name:'重新审阅未完成任务',exact:true}).first().click();await panel.getByText(/2 项可继续，0 项复用已保存结果，1 项未知/).waitFor();assert.equal(calls,5)
 await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'recovery-review.png')});await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await panel.getByText('批次部分完成 · 2/3',{exact:true}).waitFor();assert.equal(calls,7)
 const list=await page.evaluate(s=>window.damClient.tagRecovery.list(s),scope);assert.equal(list.ok,true);assert.equal(list.value[0].items.filter(i=>i.state==='outcome-unknown').length,1);assert.equal(list.value[0].items.filter(i=>i.state==='succeeded').length,2)
 await page.evaluate(b=>window.damClient.aiBackendSave({...b,enabled:false}),backend)
 const saved=list.value[0].items.find(i=>i.hasReceipt),receipt=await page.evaluate(({s,id,requestId})=>window.damClient.tagRecovery.receipt({libraryIdentity:s.libraryIdentity,generation:s.generation,assetId:id,requestId}),{s:scope,id:saved.assetId,requestId:list.value[0].requestId});assert.equal(receipt.ok,true);assert.ok(receipt.value.receipt);assert.equal(calls,7)
 await panel.getByLabel('标签批次进度').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'recovery-complete.png')})
 assert.deepEqual(await hashes(),original);assert.deepEqual(errors,[])
 if(process.env.TAG_RECOVERY_EVIDENCE_DIR){await fs.mkdir(process.env.TAG_RECOVERY_EVIDENCE_DIR,{recursive:true});for(const n of ['recovery-review.png','recovery-complete.png'])await fs.copyFile(path.join(evidence,n),path.join(process.env.TAG_RECOVERY_EVIDENCE_DIR,n))}
 const cardScope={libraryIdentity:scope.libraryIdentity,generation:scope.generation,assetId:saved.assetId},opening=app.waitForEvent('window');assert.equal((await page.evaluate(s=>window.damClient.assetCard.open(s),cardScope)).ok,true);const card=await opening;card.on('pageerror',()=>errors.push('card-renderer-error'));await card.waitForFunction(()=>Boolean(window.tagRecoveryAPI))
 const cardList=await card.evaluate(s=>window.tagRecoveryAPI.list({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId]}),cardScope);assert.equal(cardList.ok,true);assert.deepEqual(cardList.value,[])
 const input={...cardScope,requestId:list.value[0].requestId};assert.equal((await card.evaluate(s=>window.tagRecoveryAPI.prepare({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId],requestId:s.requestId}),input)).ok,false)
 assert.equal((await card.evaluate(s=>window.tagRecoveryAPI.receipt({...s,assetId:'foreign'}),input)).ok,false);assert.ok((await card.evaluate(s=>window.tagRecoveryAPI.receipt(s),input)).value.receipt);assert.equal(calls,7);assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,calls,peak,errors,milestones:['restart no auto inference','success2 reused one failure resumed','shutdown unknown preserved','explicit review skips unknown and runs2 unstarted','receipt readable with backend disabled','source hashes unchanged']}))
}finally{held.forEach(fn=>fn());if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
