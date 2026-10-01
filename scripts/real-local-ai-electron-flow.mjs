import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
export async function exerciseRealLocalAi(page,evidence){
 const endpoint=process.env.DAM_REAL_LOCAL_AI_ENDPOINT,model=process.env.DAM_REAL_LOCAL_AI_MODEL
 const url=new URL(endpoint||'http://invalid');if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.port!=='18080'||!model||url.username||url.password)throw Error('Real evaluation requires the approved loopback model')
 const all=page.getByRole('button',{name:'全部',exact:true});await all.click()
 const rows=await page.evaluate(()=>window.electronAPI.listAssets()),poster=rows.find(a=>a.title==='sample-2'),blank=rows.find(a=>a.title==='ocr-blank');assert.ok(poster&&blank)
 await page.evaluate(async({baseUrl,model})=>window.electronAPI.aiBackendSave({id:'real-qwen-acceptance',name:'Qwen 本地验收',type:'llama-openai',enabled:true,baseUrl,defaultModel:model,timeoutMs:120000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),{baseUrl:endpoint,model})
 const get=async(id)=>(await page.evaluate(()=>window.electronAPI.listAssets())).find(a=>a.id===id)
 const scope=await page.evaluate(()=>window.electronAPI.library.inspect()),binding={libraryIdentity:scope.identity,generation:scope.generation}
 await page.locator(`[id="asset-card-open-${poster.id}"]`).click()
 const ocr=page.getByRole('region',{name:'专用文字识别',exact:true})
 await ocr.getByRole('button',{name:'识别文字',exact:true}).click();await ocr.getByRole('button',{name:'确认识别并保存'}).click();await ocr.getByText(/OCR 识别完成/).waitFor()
 await ocr.getByRole('button',{name:'修订识别文字'}).click();await ocr.getByRole('textbox',{name:'修订识别文字'}).fill('验收 OCR 保留 2026');await ocr.getByRole('button',{name:'保存文字修订'}).click()
 await page.waitForFunction(async id=>(await window.electronAPI.listAssets()).find(a=>a.id===id)?.ocr?.text==='验收 OCR 保留 2026',poster.id)
 await page.getByTitle('编辑描述',{exact:true}).click();await page.getByPlaceholder('请输入画面描述...').fill('验收手工描述保持不变');await page.getByRole('button',{name:'保存',exact:true}).click()
 const records=[]
 async function analyze(asset){
  await page.getByText('AI 分析与提示词反推',{exact:true}).click()
  const panel=page.getByRole('region',{name:'AI 分析与反推',exact:true});await panel.getByRole('combobox',{name:'分析模型服务'}).selectOption('real-qwen-acceptance')
  await panel.getByRole('button',{name:'分析 1 个素材',exact:true}).click();await panel.getByRole('region',{name:'确认 AI 执行范围'}).waitFor()
  const before=(await get(asset.id)).ocr,started=Date.now()
  await panel.getByRole('button',{name:'确认执行',exact:true}).click()
  await page.waitForFunction(()=>{const text=document.querySelector('.visual-ai-job')?.textContent;return text&&/分析完成|部分完成|分析失败|已取消/.test(text)},undefined,{timeout:150000})
  const after=await get(asset.id),jobText=await panel.locator('.visual-ai-job').innerText()
  assert.deepEqual(after.ocr,before,'A real visual-model write cannot overwrite dedicated recognition or corrections')
  records.push({fixture:asset.title,elapsedMs:Date.now()-started,jobText,jobCompleted:/^分析完成/.test(jobText),hasVisualEvidence:!!after.visualAi,ocrProtected:true,visualOutput:after.visualAi||null,effectiveOcrText:after.ai_ocr_text})
  return after
 }
 const analyzed=await analyze(poster)
 assert.equal(analyzed.ai_caption,'验收手工描述保持不变')
 assert.equal(analyzed.ai_ocr_text,'验收 OCR 保留 2026')
 await page.getByRole('button',{name:'关闭素材详情'}).click();await page.getByRole('textbox',{name:'搜索素材'}).fill('验收 OCR 保留');await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);assert.match(await page.locator('.lc-match').innerText(),/OCR/);await page.getByRole('textbox',{name:'搜索素材'}).fill('')
 let realTagFolderVerified=false,promptSearchVerified=false
 if(analyzed.visualAi?.tags?.length){const tag=analyzed.visualAi.tags[0];await page.getByRole('button',{name:'文件夹',exact:true}).click();await page.getByRole('button',{name:'打开文件夹 '+tag,exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);assert.equal(await page.locator('.lc-card').first().getAttribute('data-asset-id'),poster.id);realTagFolderVerified=true
  const token=analyzed.visualAi.prompt.match(/[a-z]{4,}/gi)?.find(word=>!analyzed.visualAi.tags.some(tag=>tag.toLowerCase().includes(word.toLowerCase())));if(token){await page.getByRole('textbox',{name:'搜索素材'}).fill(token);await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);await page.waitForFunction(()=>document.querySelector('.lc-match')?.textContent.includes('反推提示词'));promptSearchVerified=true}
  await all.click()
 }
 await page.locator(`[id="asset-card-open-${blank.id}"]`).click();assert.equal((await get(blank.id)).ocr.text,'');await analyze(blank);assert.equal((await get(blank.id)).ai_ocr_text,'')
 // Exercise cancellation against the actual local service; it must not commit a late result.
 const beforeCancel=await page.evaluate(s=>window.electronAPI.visualAi.results(s),{...binding,assetId:poster.id})
 const plan=await page.evaluate(s=>window.electronAPI.visualAi.prepare(s),{...binding,assetIds:[poster.id],backendId:'real-qwen-acceptance',model,purpose:'analyze'});assert.equal(plan.ok,true)
 const job=await page.evaluate(receipt=>window.electronAPI.visualAi.run(receipt),plan.value.receipt);assert.equal(job.ok,true)
 await page.waitForTimeout(150);await page.evaluate(id=>window.electronAPI.visualAi.cancel(id),job.value.id)
 await page.waitForFunction(async id=>{const r=await window.electronAPI.visualAi.inspect(id);return r.ok&&!['queued','running'].includes(r.value.state)},job.value.id,{timeout:150000})
 const stopped=await page.evaluate(id=>window.electronAPI.visualAi.inspect(id),job.value.id);assert.equal(stopped.value.state,'cancelled')
 const afterCancel=await page.evaluate(s=>window.electronAPI.visualAi.results(s),{...binding,assetId:poster.id});assert.deepEqual(afterCancel,beforeCancel)
 await page.screenshot({path:path.join(evidence,'real-local-ai-with-ocr.png')})
 const report={realLocalInference:true,generatedOnly:true,model,records,cancelledWithoutCommit:true,manualCaptionProtected:true,dedicatedOcrProtected:true,validEmptyProtected:true,realTagFolderVerified,promptSearchVerified,qualityVerdict:'requires-human-review',allVisualJobsCompleted:records.every(r=>r.jobCompleted&&r.hasVisualEvidence)}
 await fs.writeFile(path.join(evidence,'real-local-ai-report.json'),JSON.stringify(report,null,2))
 assert.equal(report.allVisualJobsCompleted,true,'Both actual visual jobs must complete; prior evidence or successful protection checks cannot hide an inference failure')
 await page.getByRole('button',{name:'关闭素材详情'}).click();await all.click()
 return{posterId:poster.id,blankId:blank.id,report}
}
export async function verifyRealLocalAiRestored(page,saved){
 const rows=await page.evaluate(()=>window.electronAPI.listAssets());assert.equal(rows.find(a=>a.id===saved.posterId).ai_caption,'验收手工描述保持不变');assert.equal(rows.find(a=>a.id===saved.posterId).ai_ocr_text,'验收 OCR 保留 2026');assert.equal(rows.find(a=>a.id===saved.blankId).ai_ocr_text,'')
}
