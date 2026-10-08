import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-batch-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry'),sources=[]
for(const dir of [profile,evidence,entry])await fs.mkdir(dir)
for(let i=0;i<8;i++){const file=path.join(root,`generated-${i}.png`);await sharp({create:{width:100+i,height:80,channels:3,background:{r:40+i*20,g:90,b:140}}}).png().toFile(file);sources.push(file)}
const hashes=async()=>Promise.all(sources.map(async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex'))),original=await hashes()
await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-generated-batch',version:'0.0.0',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
let calls=0,active=0,peak=0,mode='normal',held=[]
const server=http.createServer(async(req,res)=>{if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return}let text='';for await(const bytes of req){text+=bytes;if(text.length>8*1024*1024){res.destroy();return}}JSON.parse(text);calls++;active++;peak=Math.max(peak,active);res.on('close',()=>active--);const finish=()=>{if(res.destroyed)return;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:calls===3?'invalid':JSON.stringify({tags:['蓝色',`批次${mode}`]})}}]}))};if(mode==='hold'){held.push(finish);return}finish()})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[sources]}
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
let app;const errors=[],until=async(read,done)=>{for(let i=0;i<1000;i++){const r=await read();if(done(r))return r;await new Promise(r=>setTimeout(r,10))}throw Error('Generated batch did not settle')}
try{
 app=await electron.launch({args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}})
 assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(n=>app.getPath(n)))).every(p=>p.startsWith(root+path.sep)))
 const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',()=>errors.push('renderer-error'));await page.setViewportSize({width:1600,height:1100});await page.getByTestId('formal-library-canvas').waitFor()
 await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await until(()=>page.locator('.lc-card').count(),n=>n===8)
 if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
 await page.evaluate(baseUrl=>window.damClient.aiBackendSave({id:'synthetic',name:'隔离批次验证',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),`http://127.0.0.1:${server.address().port}/v1`)
 for(let i=0;i<8;i++)await page.getByRole('checkbox',{name:`选择 generated-${i}`,exact:true}).check()
 await page.locator('.lc-card [id^="asset-card-open-"]').first().click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
 const panel=page.getByRole('region',{name:'批量标签分析',exact:true}),normal=panel.getByRole('button',{name:'分析所选 8 个素材的标签',exact:true}),force=panel.getByRole('button',{name:'强制重新分析标签',exact:true})
 await normal.click();await panel.getByRole('region',{name:'确认批量标签范围'}).waitFor();assert.equal(calls,0);await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'batch-review.png')});await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click()
 await panel.getByText('批次部分完成 · 7/8',{exact:true}).waitFor();assert.equal(calls,8)
 await normal.click();await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await panel.getByText('批次完成 · 8/8',{exact:true}).waitFor();assert.equal(calls,9)
 mode='hold';await force.click();await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await until(()=>held.length,n=>n===1);await panel.getByText(/^generated-\d · 分析中$/).waitFor();await panel.getByRole('button',{name:'取消标签批次',exact:true}).click();await panel.getByText('批次已取消 · 0/8',{exact:true}).waitFor();assert.equal(calls,10);held.forEach(fn=>fn())
 mode='forced';await force.click();await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await panel.getByText('批次完成 · 8/8',{exact:true}).waitFor();assert.equal(calls,18)
 const assets=await page.evaluate(()=>window.damClient.listAssets());assert.equal(assets.length,8);assert.ok(assets.every(a=>a.tagAnalysis.requestGeneration===3&&a.tagAnalysis.tags.includes('批次forced')))
 await normal.click();await panel.getByRole('button',{name:'确认运行标签批次',exact:true}).click();await panel.getByText('批次完成 · 8/8',{exact:true}).waitFor();assert.equal(calls,18)
 await panel.getByLabel('标签批次进度').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'batch-complete.png')});assert.deepEqual(await hashes(),original);assert.deepEqual(errors,[])
 if(process.env.TAG_BATCH_EVIDENCE_DIR){await fs.mkdir(process.env.TAG_BATCH_EVIDENCE_DIR,{recursive:true});for(const n of ['batch-review.png','batch-complete.png'])await fs.copyFile(path.join(evidence,n),path.join(process.env.TAG_BATCH_EVIDENCE_DIR,n))}
 const scope=await page.evaluate(async id=>{const s=await window.damClient.library.inspect();return{libraryIdentity:s.identity,generation:s.generation,assetId:id}},assets[0].id)
 const opening=app.waitForEvent('window');assert.equal((await page.evaluate(s=>window.damClient.assetCard.open(s),scope)).ok,true);const card=await opening;await card.waitForFunction(()=>Boolean(window.tagBatchesAPI))
 assert.equal((await card.evaluate(s=>window.tagBatchesAPI.prepare({...s,assetIds:['foreign'],requestId:'denied',backendId:'synthetic',model:'synthetic-model',forceRerun:false}),scope)).ok,false)
 assert.equal((await card.evaluate(({s,ids})=>window.tagBatchesAPI.prepare({...s,assetIds:ids,requestId:'denied-many',backendId:'synthetic',model:'synthetic-model',forceRerun:false}),{s:scope,ids:assets.map(a=>a.id)})).ok,false)
 const own=await card.evaluate(s=>window.tagBatchesAPI.prepare({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId],requestId:'card-review',backendId:'synthetic',model:'synthetic-model',forceRerun:false}),scope);assert.equal(own.ok,true)
 assert.equal((await page.evaluate(id=>window.damClient.tagBatches.run(id),own.value.receipt)).ok,false);assert.equal((await card.evaluate(id=>window.tagBatchesAPI.discard(id),own.value.receipt)).ok,true);assert.equal(calls,18)
 console.log(JSON.stringify({passed:true,calls,peak,errors,milestones:['formal eight-selection reviewed','partial 7/8','normal resumes one failure','physical running status','cancel skips seven queued','force generation3','normal complete batch zero resend','source unchanged']}))
}finally{held.forEach(fn=>fn());if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
