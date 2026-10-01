import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import {build} from 'esbuild'
import sharp from 'sharp'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-execution-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence')
await fs.mkdir(profile);await fs.mkdir(evidence)
const source=path.join(root,'generated.png'),maximum=path.join(root,'maximum.png')
await sharp({create:{width:1000,height:800,channels:3,background:'#7799bb'}}).png().toFile(source)
await sharp({create:{width:8000,height:6250,channels:4,background:'#7799bb88'}}).png().toFile(maximum)
const sha=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex'),original=await sha(source)
const probe=path.resolve('dist-temp/tests/main-runtime.probe.cjs')
await build({entryPoints:['scripts/fixtures/admission-runtime/main-runtime.probe.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:probe,logLevel:'silent'})
const entry=path.join(root,'entry');await fs.mkdir(entry)
await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-generated-integration',version:'0.0.0',type:'module',main:'main.mjs'}))
await fs.writeFile(path.join(entry,'probe-install.cjs'),`globalThis.__damAdmissionProbe=require(${JSON.stringify(probe)});`)
await fs.writeFile(path.join(entry,'main.mjs'),`import './probe-install.cjs';\nimport ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};\n`)
let calls=0,concurrent=0,peak=0,mode='normal',oldResponses=[],tagResponse
const server=http.createServer(async(req,res)=>{
 if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return}
 let text='';for await(const chunk of req){text+=chunk;if(text.length>8*1024*1024){res.destroy();return}}
 const body=JSON.parse(text),isTags=body.messages[0].content.includes('标签助手');calls++;concurrent++;peak=Math.max(peak,concurrent)
 let settled=false;res.on('close',()=>{if(!settled){settled=true;concurrent--}})
 const finish=output=>{if(res.writableEnded||res.destroyed)return;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]}))}
 if(!isTags&&mode==='cross'){oldResponses.push(()=>finish({caption:'迟到完整描述',ocrText:'',prompt:'Historical complete prompt',tags:['迟到旧标签']}));return}
 if(isTags&&mode==='cancel'){tagResponse=()=>finish({tags:['不应保存']});return}
 finish(isTags?{tags:mode==='cross'?['最新标签']:['蓝色海报','几何']}:{caption:'综合描述',ocrText:'',prompt:'Complete prompt',tags:['综合标签']})
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[[source]]}
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','ELECTRON_RENDERER_URL'].includes(k)))
const options={args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}}
let app;const milestones=[],errors=[]
const start=async()=>{app=await electron.launch(options);const roots=await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(p=>app.getPath(p)));assert.ok(roots.every(p=>p.startsWith(root+path.sep)));const p=await app.firstWindow();p.setDefaultTimeout(15000);p.on('pageerror',()=>errors.push('renderer-error'));await p.setViewportSize({width:1379,height:1042});await p.getByTestId('formal-library-canvas').waitFor();return p}
const until=async(read,predicate)=>{for(let i=0;i<500;i++){const v=await read();if(predicate(v))return v;await new Promise(r=>setTimeout(r,10))}throw Error('Synthetic test did not settle')}
try{
 let page=await start()
 const runtime=await app.evaluate(async(_electron,{maximum})=>globalThis.__damAdmissionProbe.exercise(maximum),{probe,maximum})
 assert.equal(runtime.returnedToZero,true);console.log(JSON.stringify({stage:'formal-main-admission-probe',...runtime}));milestones.push('real-electron-main-codec-50M-pixels-and-frozen-budget-release')
 await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()
 if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
 const scope=await page.evaluate(async()=>{const s=await window.electronAPI.library.inspect(),a=(await window.electronAPI.listAssets())[0];return{libraryIdentity:s.identity,generation:s.generation,assetId:a.id}})
 await page.evaluate(async({baseUrl,assetId})=>{await window.electronAPI.aiBackendSave({id:'synthetic',name:'隔离标签验证',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}});await window.electronAPI.updateAssetCaption(assetId,'人工说明保留')},{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,assetId:scope.assetId})
 await page.locator(`[id="asset-card-open-${scope.assetId}"]`).click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
 const panel=page.getByRole('region',{name:'AI 分析与反推',exact:true})
 await panel.getByRole('button',{name:'保存独立标签任务',exact:true}).click();await panel.getByRole('button',{name:'确认保存任务',exact:true}).click()
 await panel.getByRole('button',{name:'分析标签',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor();assert.equal(calls,0)
 await panel.getByRole('button',{name:'取消运行',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor({state:'detached'});assert.equal(calls,0)
 await panel.getByRole('button',{name:'分析标签',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor()
 await page.screenshot({path:path.join(evidence,'execution-review.png')})
 await panel.getByRole('button',{name:'确认运行标签',exact:true}).click();await panel.getByRole('article',{name:'当前标签建议'}).getByText('蓝色海报',{exact:true}).waitFor()
 assert.equal(calls,1)
 const read=()=>page.evaluate(s=>window.electronAPI.tagExecution.read(s),scope)
 assert.equal((await read()).value.schemaVersion,10);assert.deepEqual((await read()).value.current.tags,['蓝色海报','几何'])
 await page.screenshot({path:path.join(evidence,'execution-saved.png')});milestones.push('formal-inspector-confirm-to-single-tags-effect-v10')
 // Two real windows exercise coexistence through the actual Main singleton.
 mode='cross'
 await panel.getByRole('button',{name:'分析 1 个素材',exact:true}).click();await panel.getByRole('button',{name:'确认执行',exact:true}).click();await until(()=>oldResponses.length,n=>n===1)
 const opening=app.waitForEvent('window');assert.equal((await page.evaluate(s=>window.electronAPI.assetCard.open(s),scope)).ok,true);const card=await opening;await card.waitForFunction(()=>Boolean(window.tagExecutionAPI))
 const secondOld=await card.evaluate(async s=>{const r=await window.visualAiAPI.prepare({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId],backendId:'synthetic',purpose:'reverse'});if(!r.ok)throw Error(r.error);return window.visualAiAPI.run(r.value.receipt)},scope)
 assert.equal(secondOld.ok,true);await until(()=>oldResponses.length,n=>n===2)
 const saved=await card.evaluate(async s=>{const r=await window.independentTagsAPI.prepare({...s,requestId:'card-new-request',backendId:'synthetic',model:'synthetic-model'});if(!r.ok)throw Error(r.error);return window.independentTagsAPI.confirm(r.value.receipt)},scope);assert.equal(saved.ok,true)
 const job=await card.evaluate(async s=>{const r=await window.tagExecutionAPI.prepare({...s,requestId:'card-new-request'});if(!r.ok)throw Error(r.error);return window.tagExecutionAPI.run(r.value.receipt)},scope);assert.equal(job.ok,true)
 await new Promise(r=>setTimeout(r,100));assert.equal(calls,3,'Third physical request waits for the shared two-slot budget');assert.equal((await card.evaluate(id=>window.tagExecutionAPI.inspect(id),job.value.id)).value.state,'queued');oldResponses[0]()
 const finished=await until(()=>card.evaluate(id=>window.tagExecutionAPI.inspect(id),job.value.id),r=>r.ok&&!['queued','running'].includes(r.value.state));assert.equal(finished.value.state,'succeeded')
 assert.equal(peak,2);oldResponses[1]();await until(()=>card.evaluate(id=>window.visualAiAPI.inspect(id),secondOld.value.id),r=>r.ok&&!['running','queued'].includes(r.value.state));await panel.getByText('分析完成 · 1/1',{exact:true}).waitFor()
 assert.deepEqual((await read()).value.current.tags,['最新标签'])
 const asset=await page.evaluate(id=>window.electronAPI.listAssets().then(rows=>rows.find(a=>a.id===id)),scope.assetId)
 assert.equal(asset.ai_caption,'人工说明保留');assert.deepEqual(asset.tagAnalysis.tags,['最新标签']);assert.deepEqual(asset.visualAi.tags,['迟到旧标签'])
 const denied=await card.evaluate(s=>window.tagExecutionAPI.read({...s,assetId:'not-current-card'}),scope);assert.equal(denied.ok,false)
 await card.evaluate(async()=>{const r=await window.assetCardAPI.inspect();await window.assetCardAPI.act({token:r.state.token,kind:'close'})}).catch(()=>{})
 await page.getByTestId('asset-quick-look').waitFor();await page.keyboard.press('Escape');await page.getByTestId('asset-quick-look').waitFor({state:'detached'})
 milestones.push('main-combined-card-tags-shared-two-slots-late-history-no-current-takeover')
 mode='cancel'
 const cancelled=await page.evaluate(async s=>{const saved=await window.electronAPI.independentTags.prepare({...s,requestId:'cancel-request',backendId:'synthetic',model:'synthetic-model'});if(!saved.ok)throw Error(saved.error);await window.electronAPI.independentTags.confirm(saved.value.receipt);const r=await window.electronAPI.tagExecution.prepare({...s,requestId:'cancel-request'});if(!r.ok)throw Error(r.error);return window.electronAPI.tagExecution.run(r.value.receipt)},scope)
 assert.equal(cancelled.ok,true);await until(()=>tagResponse,Boolean);await page.evaluate(id=>window.electronAPI.tagExecution.cancel(id),cancelled.value.id)
 const stopped=await until(()=>page.evaluate(id=>window.electronAPI.tagExecution.inspect(id),cancelled.value.id),r=>r.ok&&!['queued','running'].includes(r.value.state));assert.equal(stopped.value.state,'outcome-unknown');tagResponse()
 assert.deepEqual((await read()).value.current.tags,['最新标签']);const beforeRestart=calls
 await app.close();app=null;page=await start();if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click();await page.locator('.lc-card').first().waitFor()
 const restored=await read();assert.deepEqual(restored.value.current.tags,['最新标签']);assert.equal(restored.value.jobs.find(j=>j.requestId==='cancel-request').state,'outcome-unknown');assert.equal(calls,beforeRestart)
 assert.equal(await sha(source),original);assert.deepEqual(errors,[]);milestones.push('cancel-no-late-effect-restart-requires-confirmation-no-resend')
 if(process.env.TAG_EXECUTION_EVIDENCE_DIR){await fs.mkdir(process.env.TAG_EXECUTION_EVIDENCE_DIR,{recursive:true});for(const name of ['execution-review.png','execution-saved.png'])await fs.copyFile(path.join(evidence,name),path.join(process.env.TAG_EXECUTION_EVIDENCE_DIR,name))}
 console.log(JSON.stringify({passed:true,milestones,calls,peak,errors,runtime}))
}finally{for(const respond of oldResponses)respond();tagResponse?.();if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
