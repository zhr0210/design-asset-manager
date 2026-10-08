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
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-decision-e2e-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence')
await fs.mkdir(profile);await fs.mkdir(evidence)
const source=path.join(root,'generated.png'),maximum=path.join(root,'maximum.png')
await sharp({create:{width:1000,height:800,channels:3,background:'#7799bb'}}).png().toFile(source)
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
 await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()
 if(await page.getByRole('button',{name:'关闭资料库管理'}).count())await page.getByRole('button',{name:'关闭资料库管理'}).click()
 const scope=await page.evaluate(async()=>{const s=await window.damClient.library.inspect(),a=(await window.damClient.listAssets())[0];return{libraryIdentity:s.identity,generation:s.generation,assetId:a.id}})
 await page.evaluate(async({baseUrl,assetId})=>{await window.damClient.aiBackendSave({id:'synthetic',name:'隔离标签验证',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'synthetic-model',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}});await window.damClient.updateAssetCaption(assetId,'人工说明保留')},{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,assetId:scope.assetId})
 await page.locator(`[id="asset-card-open-${scope.assetId}"]`).click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
 const panel=page.getByRole('region',{name:'AI 分析与反推',exact:true})
 await panel.getByRole('button',{name:'保存独立标签任务',exact:true}).click();await panel.getByRole('button',{name:'确认保存任务',exact:true}).click()
 await panel.getByRole('button',{name:'分析标签',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor();assert.equal(calls,0)
 await panel.getByRole('button',{name:'取消运行',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor({state:'detached'});assert.equal(calls,0)
 await panel.getByRole('button',{name:'分析标签',exact:true}).click();await panel.getByRole('region',{name:'确认标签执行范围'}).waitFor()
 await page.screenshot({path:path.join(evidence,'execution-review.png')})
 await panel.getByRole('button',{name:'确认运行标签',exact:true}).click();await panel.getByRole('article',{name:'当前标签建议'}).getByText('蓝色海报',{exact:true}).waitFor()
 assert.equal(calls,1)
 const read=()=>page.evaluate(s=>window.damClient.tagExecution.read(s),scope)
 assert.equal((await read()).value.schemaVersion,10);assert.deepEqual((await read()).value.current.tags,['蓝色海报','几何'])
 await page.screenshot({path:path.join(evidence,'execution-saved.png')});milestones.push('formal-inspector-confirm-to-single-tags-effect-v10')
 // Cross-window choices use the actual Preload and Main owner binding.
 const opening=app.waitForEvent('window');assert.equal((await page.evaluate(s=>window.damClient.assetCard.open(s),scope)).ok,true);const card=await opening;await card.waitForFunction(()=>Boolean(window.tagDecisionsAPI))
 await card.evaluate(()=>{window.__decisionChanges=0;window.tagExecutionAPI.onChanged(()=>window.__decisionChanges++)})
 await panel.getByRole('button',{name:'确认 AI 标签 蓝色海报',exact:true}).click();await until(()=>read(),r=>r.ok&&r.value.current.pendingTags.length===1)
 await page.getByText('还没有标签，可在下方添加，方便再次找回。',{exact:true}).waitFor({state:'detached'});assert.equal((await read()).value.schemaVersion,10);await until(()=>card.evaluate(()=>window.__decisionChanges),n=>n>0)
 let cardRead=await card.evaluate(s=>window.tagExecutionAPI.read(s),scope);assert.deepEqual(cardRead.value.current.pendingTags,['几何'])
 const beforeChoices=calls
 await panel.getByRole('button',{name:'拒绝 AI 标签 几何',exact:true}).click();await panel.getByRole('region',{name:'确认保存标签选择'}).waitFor();assert.equal((await read()).value.schemaVersion,10)
 await panel.getByRole('button',{name:'确认隐藏建议',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'decision-review.png')});await panel.getByRole('button',{name:'确认隐藏建议',exact:true}).click();await until(()=>read(),r=>r.ok&&r.value.schemaVersion===11&&r.value.current.tags.length===1)
 assert.equal(calls,beforeChoices);assert.deepEqual((await card.evaluate(s=>window.tagExecutionAPI.read(s),scope)).value.current.pendingTags,[])
 assert.equal((await card.evaluate(s=>window.tagDecisionsAPI.prepare({...s,assetId:'foreign',evidenceId:'foreign',tag:'几何',decision:'confirm'}),scope)).ok,false)
 const combined=await card.evaluate(async s=>{const r=await window.visualAiAPI.prepare({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId],backendId:'synthetic',purpose:'analyze'});if(!r.ok)throw Error(r.error);return window.visualAiAPI.run(r.value.receipt)},scope)
 assert.equal(combined.ok,true,combined.error);await until(()=>card.evaluate(id=>window.visualAiAPI.inspect(id),combined.value.id),r=>r.ok&&r.value.state==='completed')
 assert.equal((await read()).value.current.sourceFamily,'visual-ai-v1');assert.deepEqual((await read()).value.current.tags,['综合标签'])
 const legacyDenied=await card.evaluate(async s=>{const current=(await window.tagExecutionAPI.read(s)).value.current;return window.visualAiAPI.confirmTag({...s,evidenceId:current.originalVisualEvidenceId,tag:'综合标签'})},scope);assert.equal(legacyDenied.ok,false)
 milestones.push('v11-combined-still-uses-canonical-claim-and-sessionless-confirm-denied')
 const rerun=await page.evaluate(async s=>{const p=await window.damClient.independentTags.prepare({...s,requestId:'same-family-rerun',backendId:'synthetic',model:'synthetic-model'});if(!p.ok)throw Error(p.error);await window.damClient.independentTags.confirm(p.value.receipt);const r=await window.damClient.tagExecution.prepare({...s,requestId:'same-family-rerun'});if(!r.ok)throw Error(r.error);return window.damClient.tagExecution.run(r.value.receipt)},scope)
 assert.equal(rerun.ok,true);await until(()=>page.evaluate(id=>window.damClient.tagExecution.inspect(id),rerun.value.id),r=>r.ok&&r.value.state==='succeeded')
 assert.deepEqual((await read()).value.current.tags,['蓝色海报']);assert.deepEqual((await read()).value.current.pendingTags,[])
 await card.evaluate(async()=>{const r=await window.assetCardAPI.inspect();await window.assetCardAPI.act({token:r.state.token,kind:'close'})}).catch(()=>{})
 await page.getByRole('button',{name:'关闭专注模式',exact:true}).click();await page.getByTestId('asset-quick-look').waitFor({state:'detached'})
 await page.getByRole('textbox',{name:'搜索素材',exact:true}).fill('几何');await until(()=>page.locator('.lc-card').count(),n=>n===0)
 await page.getByRole('textbox',{name:'搜索素材',exact:true}).fill('蓝色海报');await until(()=>page.locator('.lc-card').count(),n=>n===1)
 await page.getByRole('textbox',{name:'搜索素材',exact:true}).fill('')
 await page.getByRole('button',{name:'文件夹',exact:true}).click();await page.getByRole('button',{name:'打开文件夹 全部已分析',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'打开文件夹 几何',exact:true}).count(),0)
 await page.screenshot({path:path.join(evidence,'decision-folders.png')});milestones.push('formal-confirm-reject-v11-same-family-rerun-card-refresh-search-and-folder')
 const beforeRestart=calls;await app.close();app=null;page=await start();if(await page.getByTestId('library-reopen').count())await page.getByTestId('library-reopen').click();else await page.getByTestId('library-open').click();await page.locator('.lc-card').first().waitFor()
 assert.deepEqual((await read()).value.current.tags,['蓝色海报']);assert.deepEqual((await page.evaluate(()=>window.damClient.listAssets()))[0].tags,['蓝色海报']);assert.equal(calls,beforeRestart)
 assert.equal(await sha(source),original);assert.deepEqual(errors,[])
 if(process.env.TAG_DECISION_EVIDENCE_DIR){await fs.mkdir(process.env.TAG_DECISION_EVIDENCE_DIR,{recursive:true});for(const name of ['decision-review.png','decision-folders.png'])await fs.copyFile(path.join(evidence,name),path.join(process.env.TAG_DECISION_EVIDENCE_DIR,name))}
 console.log(JSON.stringify({passed:true,milestones,calls,peak,errors}))
}finally{for(const respond of oldResponses)respond();tagResponse?.();if(app)await app.close();server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true})}
